import dotenv from 'dotenv';
ec65c183cb2215faf013e92871a8e51afec43dc0
import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import jwt from 'jsonwebtoken';
import { MongoClient } from 'mongodb';
import nodemailer from 'nodemailer';
import { randomBytes, randomInt, randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, '..');

dotenv.config({ path: path.join(projectRoot, '.env') });

const dbPath = path.join(__dirname, 'db.json');
const port = process.env.PORT || 3001;
const saltRounds = 10;
const jwtExpiresIn = process.env.JWT_EXPIRES_IN || '7d';

if (!process.env.MONGODB_URI) {
  console.error('MONGODB_URI is not set in .env');
  process.exit(1);
}

if (!process.env.JWT_SECRET) {
  console.error('JWT_SECRET is not set in .env');
  process.exit(1);
}

const client = new MongoClient(process.env.MONGODB_URI);

let users;
let products;
let messages;
let discountSpins;

const DISCOUNT_SEGMENTS = [
  { label: '5% OFF', percent: 5, weight: 30 },
  { label: '10% OFF', percent: 10, weight: 25 },
  { label: '15% OFF', percent: 15, weight: 20 },
  { label: '20% OFF', percent: 20, weight: 12 },
  { label: 'Free Shipping', percent: 0, weight: 8 },
  { label: '25% OFF', percent: 25, weight: 5 }
];

let emailTransporter;

async function connectDatabase() {
  await client.connect();
  const db = client.db();
  users = db.collection('users');
  products = db.collection('products');
  messages = db.collection('messages');
  discountSpins = db.collection('discountSpins');
  await seedIfEmpty();
  await migratePlainTextPasswords();
  await migrateCustomerRoles();
  console.log(`Connected to MongoDB database "${db.databaseName}"`);
}

async function seedIfEmpty() {
  if ((await products.countDocuments()) > 0) {
    return;
  }

  const seed = JSON.parse(await readFile(dbPath, 'utf8'));

  if (seed.users?.length) {
    await users.insertMany(seed.users);
  }
  if (seed.products?.length) {
    await products.insertMany(seed.products);
  }
  if (seed.messages?.length) {
    await messages.insertMany(seed.messages);
  }

  console.log('Seeded database from server/db.json');
}

function withoutPassword(user) {
  const { password, ...safeUser } = user;
  return safeUser;
}

function isBcryptHash(password) {
  return typeof password === 'string' && /^\$2[aby]\$\d{2}\$/.test(password);
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function migratePlainTextPasswords() {
  let migratedCount = 0;
  const cursor = users.find({ password: { $exists: true, $type: 'string' } });

  for await (const user of cursor) {
    if (isBcryptHash(user.password)) {
      continue;
    }

    const hashedPassword = await bcrypt.hash(user.password, saltRounds);
    await users.updateOne({ _id: user._id }, { $set: { password: hashedPassword } });
    migratedCount += 1;
  }

  if (migratedCount > 0) {
    console.log(`Migrated ${migratedCount} user password(s) to bcrypt hashes`);
  }
}

async function migrateCustomerRoles() {
  const result = await users.updateMany({ role: 'customer' }, { $set: { role: 'admin' } });

  if (result.modifiedCount > 0) {
    console.log(`Migrated ${result.modifiedCount} customer account(s) to admin role`);
  }
}

function signToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role
    },
    process.env.JWT_SECRET,
    { expiresIn: jwtExpiresIn }
  );
}

function authResponse(user) {
  return {
    token: signToken(user),
    user: withoutPassword(user)
  };
}

function authenticateToken(req, res, next) {
  const [scheme, token] = String(req.headers.authorization || '').split(' ');

  if (scheme !== 'Bearer' || !token) {
    res.status(401).json({ message: 'Authentication token is required' });
    return;
  }

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ message: 'Invalid or expired authentication token' });
  }
}

function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') {
    res.status(403).json({ message: 'Admin access is required' });
    return;
  }

  next();
}

function pickDiscountSegment() {
  const totalWeight = DISCOUNT_SEGMENTS.reduce((total, segment) => total + segment.weight, 0);
  let ticket = randomInt(totalWeight);

  for (const [index, segment] of DISCOUNT_SEGMENTS.entries()) {
    if (ticket < segment.weight) {
      return { segment, index };
    }
    ticket -= segment.weight;
  }

  return {
    segment: DISCOUNT_SEGMENTS[0],
    index: 0
  };
}

function buildDiscountCode({ label, percent }) {
  const prefix = percent > 0 ? `NT${percent}` : label.replace(/\W+/g, '').toUpperCase().slice(0, 8);
  return `${prefix}-${randomBytes(3).toString('hex').toUpperCase()}`;
}

function getEmailTransporter() {
  if (emailTransporter) {
    return emailTransporter;
  }

  const { SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS } = process.env;

  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
    throw new Error('SMTP email settings are not fully configured in .env');
  }

  emailTransporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: String(SMTP_SECURE).toLowerCase() === 'true',
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS
    }
  });

  return emailTransporter;
}

async function verifyEmailOnStartup() {
  try {
    await getEmailTransporter().verify();
    console.log('Email transporter is ready');
  } catch (error) {
    emailTransporter = null;
    console.warn(`Email transporter is not ready: ${error.message}`);
  }
}

async function sendDiscountEmail({ to, code, segment }) {
  const transporter = getEmailTransporter();
  const from = process.env.DISCOUNT_FROM_EMAIL || process.env.SMTP_USER;
  const discountText = segment.label === 'Free Shipping'
    ? 'free shipping'
    : `${segment.percent}% off`;

  await transporter.sendMail({
    from,
    to,
    subject: 'Your NovaTech discount code',
    text: [
      `Thanks for spinning the NovaTech reward wheel.`,
      `You won ${discountText}.`,
      `Your discount code is: ${code}`,
      `Use it before checkout.`
    ].join('\n')
  });
}

const app = express();

app.use(cors());
app.use(express.json());

app.get('/api/products', async (req, res) => {
  const query = String(req.query.query || '').toLowerCase();
  const category = String(req.query.category || '');
  const sort = String(req.query.sort || 'featured');
  const page = Number(req.query.page || 1);
  const limit = Number(req.query.limit || 6);

  let items = await products.find().toArray();

  if (query) {
    items = items.filter((product) =>
      [product.name, product.category, product.summary, product.description].join(' ').toLowerCase().includes(query)
    );
  }

  if (category) {
    items = items.filter((product) => product.category === category);
  }

  if (sort === 'price-asc') items.sort((a, b) => a.price - b.price);
  if (sort === 'price-desc') items.sort((a, b) => b.price - a.price);
  if (sort === 'likes-desc') items.sort((a, b) => b.likes - a.likes);

  const total = items.length;
  const start = (page - 1) * limit;

  res.json({ items: items.slice(start, start + limit), total, page, limit });
});

app.get('/api/products/:id', async (req, res) => {
  const product = await products.findOne({ id: req.params.id });

  if (!product) {
    res.status(404).json({ message: 'Product not found' });
    return;
  }

  res.json(product);
});

app.post('/api/products', authenticateToken, requireAdmin, async (req, res) => {
  const product = {
    id: randomUUID(),
    likes: 0,
    ...req.body
  };

  await products.insertOne(product);
  res.status(201).json(product);
});

app.put('/api/products/:id', authenticateToken, requireAdmin, async (req, res) => {
  const result = await products.findOneAndUpdate(
    { id: req.params.id },
    { $set: req.body },
    { returnDocument: 'after' }
  );

  if (!result) {
    res.status(404).json({ message: 'Product not found' });
    return;
  }

  res.json(result);
});

app.delete('/api/products/:id', authenticateToken, requireAdmin, async (req, res) => {
  const result = await products.deleteOne({ id: req.params.id });

  if (result.deletedCount === 0) {
    res.status(404).json({ message: 'Product not found' });
    return;
  }

  res.json({ ok: true });
});

app.post('/api/products/:id/like', async (req, res) => {
  const product = await products.findOneAndUpdate(
    { id: req.params.id },
    { $inc: { likes: 1 } },
    { returnDocument: 'after' }
  );

  if (!product) {
    res.status(404).json({ message: 'Product not found' });
    return;
  }

  res.json(product);
});

app.post('/api/auth/login', async (req, res) => {
  const email = normalizeEmail(req.body.email);
  const password = String(req.body.password || '');

  if (!email || !password) {
    res.status(401).json({ message: 'Invalid email or password' });
    return;
  }

  const user = await users.findOne({ email });
  const passwordMatches = user?.password ? await bcrypt.compare(password, user.password) : false;

  if (!passwordMatches) {
    res.status(401).json({ message: 'Invalid email or password' });
    return;
  }

  res.json(authResponse(user));
});

app.post('/api/auth/register', async (req, res) => {
  const name = String(req.body.name || '').trim();
  const email = normalizeEmail(req.body.email);
  const password = String(req.body.password || '');

  if (!name || !isValidEmail(email) || password.length < 6) {
    res.status(400).json({ message: 'Name, valid email, and password of at least 6 characters are required' });
    return;
  }

  const existing = await users.findOne({ email });

  if (existing) {
    res.status(409).json({ message: 'Email is already registered' });
    return;
  }

  // Store only bcrypt hashes so raw passwords are never persisted.
  const hashedPassword = await bcrypt.hash(password, saltRounds);
  const user = {
    id: randomUUID(),
    name,
    email,
    password: hashedPassword,
    role: 'admin',
  };

  await users.insertOne(user);
  res.status(201).json(authResponse(user));
});

app.post('/api/admin/create-admin', authenticateToken, requireAdmin, async (req, res) => {
  const name = String(req.body.name || '').trim();
  const email = normalizeEmail(req.body.email);
  const password = String(req.body.password || '');

  if (!name || !isValidEmail(email) || password.length < 6) {
    res.status(400).json({ message: 'Name, valid email, and password of at least 6 characters are required' });
    return;
  }

  const existing = await users.findOne({ email });

  if (existing) {
    res.status(409).json({ message: 'Email is already registered' });
    return;
  }

  const user = {
    id: randomUUID(),
    name,
    email,
    password: await bcrypt.hash(password, saltRounds),
    role: 'admin'
  };

  await users.insertOne(user);
  res.status(201).json(withoutPassword(user));
});

app.post('/api/messages', async (req, res) => {
  const message = {
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    ...req.body
  };

  await messages.insertOne(message);
  res.status(201).json(message);
});

app.post('/api/discounts/spin', async (req, res) => {
  const { segment, index } = pickDiscountSegment();
  const spinId = randomUUID();

  const spinRecord = {
    id: spinId,
    segmentIndex: index,
    discountLabel: segment.label,
    discountPercent: segment.percent,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    claimed: false
  };

  await discountSpins.insertOne(spinRecord);

  const sectionAngle = 360 / DISCOUNT_SEGMENTS.length;
  const stopAngle = 360 - (index * sectionAngle + sectionAngle / 2);

  res.status(201).json({
    spinId,
    segmentIndex: index,
    discountLabel: segment.label,
    discountPercent: segment.percent,
    stopAngle
  });
});

app.post('/api/discounts/claim', async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const spinId = String(req.body.spinId || '');

  if (!spinId) {
    res.status(400).json({ message: 'Missing spin ID' });
    return;
  }

  if (!isValidEmail(email)) {
    res.status(400).json({ message: 'Please provide a valid email address' });
    return;
  }

  const spinRecord = await discountSpins.findOne({ id: spinId });
  if (!spinRecord) {
    res.status(404).json({ message: 'Spin not found. Please spin again.' });
    return;
  }

  if (spinRecord.claimed) {
    res.status(409).json({ message: 'This spin has already been used.' });
    return;
  }

  if (new Date(spinRecord.expiresAt).getTime() < Date.now()) {
    res.status(410).json({ message: 'This spin has expired. Please spin again.' });
    return;
  }

  const code = buildDiscountCode({
    label: spinRecord.discountLabel,
    percent: spinRecord.discountPercent
  });

  try {
    await sendDiscountEmail({
      to: email,
      code,
      segment: {
        label: spinRecord.discountLabel,
        percent: spinRecord.discountPercent
      }
    });
  } catch (error) {
    console.error('Failed to send discount email:', error);
    res.status(502).json({ message: 'Unable to send discount email right now. Please try again.' });
    return;
  }

  await discountSpins.updateOne(
    { id: spinId },
    {
      $set: {
        claimed: true,
        claimedAt: new Date().toISOString(),
        email,
        code
      }
    }
  );

  res.status(201).json({
    ok: true,
    message: 'Discount code sent',
    discountLabel: spinRecord.discountLabel
  });
});

async function start() {
  await connectDatabase();
  await verifyEmailOnStartup();

  const server = app.listen(port, () => {
    console.log(`NovaTech API running at http://localhost:${port}/api`);
  });

  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      console.error(`Port ${port} is already in use by another process.`);
      console.error('Run: lsof -i :3001   then kill that PID, and run npm run start again.');
      process.exit(1);
    }
    throw error;
  });
}

start().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});

process.on('SIGINT', async () => {
  await client.close();
  process.exit(0);
});
