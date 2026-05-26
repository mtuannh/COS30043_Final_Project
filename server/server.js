import dotenv from 'dotenv';
import cors from 'cors';
import express from 'express';
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

if (!process.env.MONGODB_URI) {
  console.error('MONGODB_URI is not set in .env');
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

function pickDiscountSegment() {
  const totalWeight = DISCOUNT_SEGMENTS.reduce((sum, segment) => sum + segment.weight, 0);
  let target = randomInt(0, totalWeight);

  for (let index = 0; index < DISCOUNT_SEGMENTS.length; index += 1) {
    target -= DISCOUNT_SEGMENTS[index].weight;
    if (target < 0) {
      return { segment: DISCOUNT_SEGMENTS[index], index };
    }
  }

  return { segment: DISCOUNT_SEGMENTS[0], index: 0 };
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
}

function buildDiscountCode(segment) {
  const prefix = segment.percent > 0 ? `SAVE${segment.percent}` : 'SHIPFREE';
  return `${prefix}-${randomBytes(3).toString('hex').toUpperCase()}`;
}

function isSmtpConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

function getEmailTransporter() {
  if (emailTransporter) {
    return emailTransporter;
  }

  if (isSmtpConfigured()) {
    emailTransporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: String(process.env.SMTP_SECURE || 'false') === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
    return emailTransporter;
  }

  emailTransporter = nodemailer.createTransport({ jsonTransport: true });
  return emailTransporter;
}

async function verifyEmailOnStartup() {
  if (!isSmtpConfigured()) {
    console.log('Discount emails: DEV mode (not sent — set SMTP_HOST, SMTP_USER, SMTP_PASS in .env)');
    return;
  }

  try {
    await getEmailTransporter().verify();
    console.log(`Discount emails: Gmail SMTP ready (${process.env.SMTP_USER})`);
  } catch (error) {
    console.error('Discount emails: Gmail SMTP FAILED —', error.message);
    console.error('Check SMTP_USER, SMTP_PASS (app password), and restart with npm run start');
  }
}

async function sendDiscountEmail({ to, code, segment }) {
  const transporter = getEmailTransporter();
  const sender = process.env.DISCOUNT_FROM_EMAIL || process.env.SMTP_USER;

  const info = await transporter.sendMail({
    from: sender,
    to,
    subject: `Your NovaTech ${segment.label} code`,
    text: `Thanks for spinning with NovaTech! Your discount code is ${code}.`,
    html: `<p>Thanks for spinning with NovaTech!</p><p>Your discount code is <strong>${code}</strong>.</p>`
  });

  if (isSmtpConfigured()) {
    console.log(`Discount email sent to ${to} (code: ${code}, id: ${info.messageId || 'n/a'})`);
    return;
  }

  console.log('Discount email preview (not sent to inbox):', info.message);
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

app.post('/api/products', async (req, res) => {
  const product = {
    id: randomUUID(),
    likes: 0,
    ...req.body
  };

  await products.insertOne(product);
  res.status(201).json(product);
});

app.put('/api/products/:id', async (req, res) => {
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

app.delete('/api/products/:id', async (req, res) => {
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
  const user = await users.findOne({
    email: req.body.email,
    password: req.body.password
  });

  if (!user) {
    res.status(401).json({ message: 'Invalid email or password' });
    return;
  }

  res.json(withoutPassword(user));
});

app.post('/api/auth/register', async (req, res) => {
  const existing = await users.findOne({ email: req.body.email });

  if (existing) {
    res.status(409).json({ message: 'Email is already registered' });
    return;
  }

  const user = {
    id: randomUUID(),
    role: 'customer',
    ...req.body
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
