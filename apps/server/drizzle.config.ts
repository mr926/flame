import { defineConfig } from 'drizzle-kit';
import { join } from 'node:path';

const dataDir = process.env['DATA_DIR'] ?? join(process.cwd(), '../../data');

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'sqlite',
  dbCredentials: {
    url: join(dataDir, 'flame.db'),
  },
});
