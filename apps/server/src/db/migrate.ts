import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { db } from './client.js';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const migrationsFolder = join(fileURLToPath(import.meta.url), '../../../drizzle');
migrate(db, { migrationsFolder });
console.log('Migrations applied');
