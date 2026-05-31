import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { projectEnv } from './read-env.mjs';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const apiSrc = path.join(root, 'mercury-api');
const apiDest = path.join(root, 'dist', 'api');
const distDir = path.join(root, 'dist');

if (!existsSync(path.join(distDir, 'index.html'))) {
  console.error('dist/ is missing. Vite build did not run.');
  process.exit(1);
}

const env = projectEnv(root);
const required = ['MONGODB_URI', 'JWT_SECRET', 'SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS'];

for (const key of required) {
  if (!env[key]) {
    console.error(`Missing ${key} in .env (required for npm run build → Mercury deploy).`);
    process.exit(1);
  }
}

const config = {
  MONGODB_URI: env.MONGODB_URI,
  JWT_SECRET: env.JWT_SECRET,
  JWT_EXPIRES_IN: env.JWT_EXPIRES_IN || '7d',
  SMTP_HOST: env.SMTP_HOST,
  SMTP_PORT: Number(env.SMTP_PORT),
  SMTP_SECURE: String(env.SMTP_SECURE ?? 'false').toLowerCase() === 'true',
  SMTP_USER: env.SMTP_USER,
  SMTP_PASS: env.SMTP_PASS,
  DISCOUNT_FROM_EMAIL: env.DISCOUNT_FROM_EMAIL || env.SMTP_USER
};

const configPhp = `<?php

return json_decode(${JSON.stringify(JSON.stringify(config))}, true);
`;

rmSync(apiDest, { recursive: true, force: true });
mkdirSync(apiDest, { recursive: true });

for (const entry of ['index.php', 'bootstrap.php', 'lib', 'data']) {
  cpSync(path.join(apiSrc, entry), path.join(apiDest, entry), { recursive: true });
}

cpSync(path.join(apiSrc, 'api.php'), path.join(distDir, 'api.php'));

const seedSource = path.join(root, 'server', 'db.json');
if (existsSync(seedSource)) {
  cpSync(seedSource, path.join(apiDest, 'seed.json'));
}

writeFileSync(path.join(apiDest, 'config.php'), configPhp);

console.log('Mercury package ready in dist/');
console.log('Upload ALL files inside dist/ to Mercury htdocs.');
console.log('Test: open api.php?route=/api/ping in your browser after upload.');
