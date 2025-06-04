import { cp, rm, mkdir } from 'fs/promises';
import path from 'path';

const exportDir = path.resolve('export');

await rm(exportDir, { recursive: true, force: true });
await mkdir(exportDir, { recursive: true });

const entries = [
  'components',
  'services',
  'hooks',
  'utils',
  'constants.ts',
  'types.ts'
];

for (const entry of entries) {
  const src = path.resolve(entry);
  const dest = path.join(exportDir, entry);
  await cp(src, dest, { recursive: true });
}

console.log(`Export folder prepared at ${exportDir}`);

