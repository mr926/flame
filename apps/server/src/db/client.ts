import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { join } from 'node:path';
import { mkdirSync } from 'node:fs';
import * as schema from './schema.js';

const dataDir = process.env['DATA_DIR'] ?? join(process.cwd(), '../../data');
mkdirSync(dataDir, { recursive: true });

const sqlite = new Database(join(dataDir, 'flame.db'));
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');

export const db = drizzle(sqlite, { schema });
export type DB = typeof db;
