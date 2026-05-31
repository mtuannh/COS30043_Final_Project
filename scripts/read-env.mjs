import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

export function readEnvFile(envPath) {
  if (!existsSync(envPath)) {
    return {};
  }

  const values = {};

  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const index = trimmed.indexOf('=');
    if (index === -1) {
      continue;
    }

    const key = trimmed.slice(0, index).trim();
    let value = trimmed.slice(index + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    values[key] = value;
  }

  return values;
}

export function projectEnv(root) {
  return readEnvFile(path.join(root, '.env'));
}
