import type { FastifyPluginAsync } from 'fastify';
import { requireAdmin } from '../middleware/auth.js';
import { db } from '../db/client.js';
import { apps, categories, bookmarks, themes, settings } from '../db/schema.js';
import { join, extname, basename } from 'node:path';
import {
  existsSync, copyFileSync, mkdirSync, readFileSync,
  rmSync, writeFileSync, mkdtempSync, readdirSync, statSync,
} from 'node:fs';
import { createWriteStream } from 'node:fs';
import { tmpdir } from 'node:os';
import Database from 'better-sqlite3';
import unzipper from 'unzipper';

const DATA_DIR = process.env['DATA_DIR'] ?? join(process.cwd(), '../../data');
const UPLOADS_DIR = join(DATA_DIR, 'uploads');
const ALLOWED_IMG = new Set(['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.ico']);

/** BFS through extracted zip to find directory containing db.sqlite */
function findFlameDataDir(root: string): string | null {
  function search(dir: string, depth: number): string | null {
    if (depth > 4) return null;
    try {
      const entries = readdirSync(dir);
      if (entries.includes('db.sqlite')) return dir;
      for (const e of entries) {
        const full = join(dir, e);
        try {
          if (statSync(full).isDirectory()) {
            const found = search(full, depth + 1);
            if (found) return found;
          }
        } catch { /* skip */ }
      }
    } catch { /* skip */ }
    return null;
  }
  return search(root, 0);
}

const importRoutes: FastifyPluginAsync = async (app) => {
  app.post('/flame/upload', { preHandler: requireAdmin }, async (request, reply) => {
    const query = request.query as Record<string, string>;
    const clearFirst = query['clear'] === 'true';

    const data = await request.file();
    if (!data) {
      return reply.code(400).send({ error: 'BadRequest', message: 'No file uploaded', statusCode: 400 });
    }
    if (!data.filename.toLowerCase().endsWith('.zip')) {
      return reply.code(400).send({ error: 'BadRequest', message: 'File must be a .zip archive', statusCode: 400 });
    }

    const tmpDir = mkdtempSync(join(tmpdir(), 'flame-import-'));
    const zipPath = join(tmpDir, 'upload.zip');
    const extractDir = join(tmpDir, 'extracted');

    try {
      const chunks: Buffer[] = [];
      for await (const chunk of data.file) chunks.push(chunk as Buffer);
      writeFileSync(zipPath, Buffer.concat(chunks));

      // Extract zip entry by entry, waiting for each file to be fully written
      mkdirSync(extractDir, { recursive: true });
      const zip = await unzipper.Open.file(zipPath);
      await Promise.all(
        zip.files.map(entry => {
          if (entry.type !== 'File') return Promise.resolve();
          const outPath = join(extractDir, entry.path);
          mkdirSync(join(outPath, '..'), { recursive: true });
          return new Promise<void>((resolve, reject) => {
            entry.stream()
              .pipe(createWriteStream(outPath))
              .on('finish', resolve)
              .on('error', reject);
          });
        })
      );

      // Locate the Flame data directory
      const srcDir = findFlameDataDir(extractDir);
      if (!srcDir) {
        return reply.code(400).send({
          error: 'BadRequest',
          message: 'Could not find db.sqlite in the ZIP. Make sure you uploaded the Flame data folder as a zip.',
          statusCode: 400,
        });
      }

      const result = await doImport(srcDir, clearFirst);
      return reply.send({ data: result });
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });
};

function collectUploads(dir: string, dest: string, errors: string[]): Set<string> {
  const copied = new Set<string>();
  function walk(d: string) {
    try {
      for (const entry of readdirSync(d)) {
        const full = join(d, entry);
        try {
          if (statSync(full).isDirectory()) {
            walk(full);
          } else if (ALLOWED_IMG.has(extname(entry).toLowerCase())) {
            copyFileSync(full, join(dest, basename(entry)));
            copied.add(basename(entry));
          }
        } catch { /* skip */ }
      }
    } catch (e) { errors.push(`uploads walk ${d}: ${e}`); }
  }
  walk(dir);
  return copied;
}

function resolveIcon(
  iconStr: string | null | undefined,
  copiedFiles: Set<string>,
): { icon_type: string; icon_value: string | null } {
  if (!iconStr) return { icon_type: 'mdi', icon_value: null };
  // Strip any leading path prefix (e.g. "uploads/file.svg" → "file.svg")
  const filename = basename(iconStr);
  if (copiedFiles.has(filename)) {
    return { icon_type: 'uploaded_file', icon_value: filename };
  }
  return { icon_type: 'mdi', icon_value: iconStr };
}

async function doImport(srcDir: string, clearFirst = false) {
  const counts = { apps: 0, categories: 0, bookmarks: 0, themes: 0 };
  const errors: string[] = [];
  const now = new Date().toISOString();
  const srcUploads = join(srcDir, 'uploads');

  if (clearFirst) {
    await db.delete(bookmarks);
    await db.delete(categories);
    await db.delete(apps);
    await db.delete(themes);
  }

  // ---- uploads folder (copy recursively first so icon detection works) ----
  let copiedFiles = new Set<string>();
  if (existsSync(srcUploads)) {
    try {
      mkdirSync(UPLOADS_DIR, { recursive: true });
      copiedFiles = collectUploads(srcUploads, UPLOADS_DIR, errors);
    } catch (e) { errors.push(`uploads: ${e}`); }
  }

  // ---- SQLite ----
  const oldDbPath = join(srcDir, 'db.sqlite');
  if (existsSync(oldDbPath)) {
    let oldDb: ReturnType<typeof Database> | undefined;
    try {
      oldDb = new Database(oldDbPath, { readonly: true });

      // Apps
      try {
        const rows = oldDb.prepare('SELECT * FROM apps').all() as Array<Record<string, unknown>>;
        for (const a of rows) {
          try {
            const icon = resolveIcon(a['icon'] ? String(a['icon']) : null, copiedFiles);
            await db.insert(apps).values({
              name: String(a['name'] ?? 'Imported App'),
              url: String(a['url'] ?? 'http://localhost'),
              description: a['description'] ? String(a['description']) : null,
              icon_type: icon.icon_type,
              icon_value: icon.icon_value,
              is_public: true,
              is_pinned: true,
              sort_order: Number(a['orderId'] ?? a['sort_order'] ?? 0),
              source: 'manual',
              source_key: null,
              created_at: now,
              updated_at: now,
            });
            counts.apps++;
          } catch (e) { errors.push(`app[${a['id']}]: ${e}`); }
        }
      } catch (e) { errors.push(`apps table: ${e}`); }

      // Categories then bookmarks (need ID remapping)
      const catIdMap = new Map<number, number>();
      try {
        const rows = oldDb.prepare('SELECT * FROM categories').all() as Array<Record<string, unknown>>;
        for (const c of rows) {
          try {
            const [ins] = await db.insert(categories).values({
              name: String(c['name'] ?? 'Imported'),
              is_public: true,
              is_pinned: true,
              sort_order: Number(c['orderId'] ?? c['sort_order'] ?? 0),
              created_at: now,
              updated_at: now,
            }).returning();
            if (ins) catIdMap.set(Number(c['id']), ins.id);
            counts.categories++;
          } catch (e) { errors.push(`category[${c['id']}]: ${e}`); }
        }
      } catch (e) { errors.push(`categories table: ${e}`); }

      try {
        const rows = oldDb.prepare('SELECT * FROM bookmarks').all() as Array<Record<string, unknown>>;
        for (const b of rows) {
          const newCatId = catIdMap.get(Number(b['categoryId'] ?? b['category_id']));
          if (!newCatId) { errors.push(`bookmark[${b['id']}]: parent category not found`); continue; }
          try {
            const icon = resolveIcon(b['icon'] ? String(b['icon']) : null, copiedFiles);
            await db.insert(bookmarks).values({
              category_id: newCatId,
              name: String(b['name'] ?? 'Imported'),
              url: String(b['url'] ?? 'http://localhost'),
              icon_type: icon.icon_type,
              icon_value: icon.icon_value,
              is_public: true,
              sort_order: Number(b['orderId'] ?? b['sort_order'] ?? 0),
              created_at: now,
              updated_at: now,
            });
            counts.bookmarks++;
          } catch (e) { errors.push(`bookmark[${b['id']}]: ${e}`); }
        }
      } catch (e) { errors.push(`bookmarks table: ${e}`); }

    } catch (e) {
      errors.push(`db.sqlite: ${e}`);
    } finally {
      oldDb?.close();
    }
  }

  // ---- themes.json ----
  const themesPath = join(srcDir, 'themes.json');
  if (existsSync(themesPath)) {
    try {
      const raw = JSON.parse(readFileSync(themesPath, 'utf8')) as unknown[];
      for (const t of Array.isArray(raw) ? raw : []) {
        if (typeof t !== 'object' || t === null) continue;
        const obj = t as Record<string, unknown>;
        try {
          await db.insert(themes).values({
            name: String(obj['name'] ?? 'Imported Theme'),
            tokens_json: JSON.stringify({
              colorBackground: String(obj['background'] ?? '#242b33'),
              colorSurface: String(obj['card'] ?? '#1e252c'),
              colorBorder: 'rgba(239,251,255,0.1)',
              colorTextPrimary: String(obj['text'] ?? '#effbff'),
              colorTextSecondary: 'rgba(239,251,255,0.55)',
              colorAccent: String(obj['primary'] ?? '#6ee2ff'),
              colorAccentHover: String(obj['primary'] ?? '#4dd6ff'),
              colorDanger: '#ff6b6b',
              radiusCard: '4px',
              radiusButton: '4px',
              shadowCard: 'none',
            }),
            is_builtin: false,
            created_at: now,
            updated_at: now,
          });
          counts.themes++;
        } catch (e) { errors.push(`theme "${obj['name']}": ${e}`); }
      }
    } catch (e) { errors.push(`themes.json: ${e}`); }
  }

  // ---- config.json ----
  const configPath = join(srcDir, 'config.json');
  if (existsSync(configPath)) {
    try {
      const config = JSON.parse(readFileSync(configPath, 'utf8')) as Record<string, unknown>;
      const upsert = async (key: string, value: unknown) => {
        const v = JSON.stringify(value);
        await db.insert(settings).values({ key, value_json: v, updated_at: now })
          .onConflictDoUpdate({ target: settings.key, set: { value_json: v, updated_at: now } });
      };
      if (config['customCSS']) await upsert('custom_css', config['customCSS']);
      if (config['appsSameTab'] !== undefined) await upsert('apps_open_in_new_tab', !config['appsSameTab']);
      if (config['bookmarksSameTab'] !== undefined) await upsert('bookmarks_open_in_new_tab', !config['bookmarksSameTab']);
      const title = config['pageTitle'] ?? config['greetingName'];
      if (title) await upsert('site_title', title);
    } catch (e) { errors.push(`config.json: ${e}`); }
  }

  return { imported: counts, errors };
}

export default importRoutes;
