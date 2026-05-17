import cors from 'cors';
import express from 'express';
import { randomUUID } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, 'db.json');
const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

async function readDb() {
  const contents = await readFile(dbPath, 'utf8');
  return JSON.parse(contents);
}

async function writeDb(db) {
  await writeFile(dbPath, JSON.stringify(db, null, 2));
}

function withoutPassword(user) {
  const { password, ...safeUser } = user;
  return safeUser;
}

app.get('/api/products', async (req, res) => {
  const db = await readDb();
  const query = String(req.query.query || '').toLowerCase();
  const category = String(req.query.category || '');
  const sort = String(req.query.sort || 'featured');
  const page = Number(req.query.page || 1);
  const limit = Number(req.query.limit || 6);

  let products = [...db.products];

  if (query) {
    products = products.filter((product) =>
      [product.name, product.category, product.summary, product.description].join(' ').toLowerCase().includes(query)
    );
  }

  if (category) {
    products = products.filter((product) => product.category === category);
  }

  if (sort === 'price-asc') products.sort((a, b) => a.price - b.price);
  if (sort === 'price-desc') products.sort((a, b) => b.price - a.price);
  if (sort === 'likes-desc') products.sort((a, b) => b.likes - a.likes);

  const total = products.length;
  const start = (page - 1) * limit;

  res.json({ items: products.slice(start, start + limit), total, page, limit });
});

app.get('/api/products/:id', async (req, res) => {
  const db = await readDb();
  const product = db.products.find((item) => item.id === req.params.id);

  if (!product) {
    res.status(404).json({ message: 'Product not found' });
    return;
  }

  res.json(product);
});

app.post('/api/products', async (req, res) => {
  const db = await readDb();
  const product = {
    id: randomUUID(),
    likes: 0,
    ...req.body
  };

  db.products.unshift(product);
  await writeDb(db);
  res.status(201).json(product);
});

app.put('/api/products/:id', async (req, res) => {
  const db = await readDb();
  const index = db.products.findIndex((item) => item.id === req.params.id);

  if (index === -1) {
    res.status(404).json({ message: 'Product not found' });
    return;
  }

  db.products[index] = { ...db.products[index], ...req.body };
  await writeDb(db);
  res.json(db.products[index]);
});

app.delete('/api/products/:id', async (req, res) => {
  const db = await readDb();
  db.products = db.products.filter((item) => item.id !== req.params.id);
  await writeDb(db);
  res.json({ ok: true });
});

app.post('/api/products/:id/like', async (req, res) => {
  const db = await readDb();
  const product = db.products.find((item) => item.id === req.params.id);

  if (!product) {
    res.status(404).json({ message: 'Product not found' });
    return;
  }

  product.likes += 1;
  await writeDb(db);
  res.json(product);
});

app.post('/api/auth/login', async (req, res) => {
  const db = await readDb();
  const user = db.users.find((item) => item.email === req.body.email && item.password === req.body.password);

  if (!user) {
    res.status(401).json({ message: 'Invalid email or password' });
    return;
  }

  res.json(withoutPassword(user));
});

app.post('/api/auth/register', async (req, res) => {
  const db = await readDb();

  if (db.users.some((user) => user.email === req.body.email)) {
    res.status(409).json({ message: 'Email is already registered' });
    return;
  }

  const user = {
    id: randomUUID(),
    role: 'customer',
    ...req.body
  };
  db.users.push(user);
  await writeDb(db);
  res.status(201).json(withoutPassword(user));
});

app.post('/api/messages', async (req, res) => {
  const db = await readDb();
  const message = {
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    ...req.body
  };

  db.messages.push(message);
  await writeDb(db);
  res.status(201).json(message);
});

app.listen(port, () => {
  console.log(`NovaTech API running at http://localhost:${port}/api`);
});
