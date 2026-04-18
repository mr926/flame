import { sqliteTable, text, integer, primaryKey } from 'drizzle-orm/sqlite-core';

export const groups = sqliteTable('groups', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  sort_order: integer('sort_order').notNull().default(0),
  created_at: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updated_at: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
});

export const pages = sqliteTable('pages', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  is_public: integer('is_public', { mode: 'boolean' }).notNull().default(true),
  show_apps: integer('show_apps', { mode: 'boolean' }).notNull().default(true),
  sort_order: integer('sort_order').notNull().default(0),
  created_at: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updated_at: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
});

export const page_groups = sqliteTable('page_groups', {
  page_id: integer('page_id').notNull().references(() => pages.id, { onDelete: 'cascade' }),
  group_id: integer('group_id').notNull().references(() => groups.id, { onDelete: 'cascade' }),
}, (t) => ({
  pk: primaryKey({ columns: [t.page_id, t.group_id] }),
}));

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  username: text('username').notNull(),
  password_hash: text('password_hash').notNull(),
  created_at: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updated_at: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
});

export const apps = sqliteTable('apps', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  url: text('url').notNull(),
  description: text('description'),
  icon_type: text('icon_type', { enum: ['mdi', 'uploaded_file', 'remote_url'] })
    .notNull()
    .default('mdi'),
  icon_value: text('icon_value'),
  is_public: integer('is_public', { mode: 'boolean' }).notNull().default(true),
  is_pinned: integer('is_pinned', { mode: 'boolean' }).notNull().default(false),
  sort_order: integer('sort_order').notNull().default(0),
  source: text('source', { enum: ['manual', 'docker', 'kubernetes'] })
    .notNull()
    .default('manual'),
  source_key: text('source_key'),
  created_at: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updated_at: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
});

export const categories = sqliteTable('categories', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  group_id: integer('group_id').references(() => groups.id, { onDelete: 'set null' }),
  is_public: integer('is_public', { mode: 'boolean' }).notNull().default(true),
  is_pinned: integer('is_pinned', { mode: 'boolean' }).notNull().default(false),
  sort_order: integer('sort_order').notNull().default(0),
  created_at: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updated_at: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
});

export const bookmarks = sqliteTable('bookmarks', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  category_id: integer('category_id')
    .notNull()
    .references(() => categories.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  url: text('url').notNull(),
  icon_type: text('icon_type', { enum: ['mdi', 'uploaded_file', 'remote_url'] })
    .notNull()
    .default('mdi'),
  icon_value: text('icon_value'),
  is_public: integer('is_public', { mode: 'boolean' }).notNull().default(true),
  sort_order: integer('sort_order').notNull().default(0),
  created_at: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updated_at: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
});

export const themes = sqliteTable('themes', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  tokens_json: text('tokens_json').notNull(),
  is_builtin: integer('is_builtin', { mode: 'boolean' }).notNull().default(false),
  created_at: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updated_at: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
});

export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value_json: text('value_json').notNull(),
  updated_at: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
});

export const sync_runs = sqliteTable('sync_runs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  source: text('source', { enum: ['docker', 'kubernetes'] }).notNull(),
  status: text('status', { enum: ['running', 'success', 'error'] }).notNull(),
  started_at: text('started_at').notNull().$defaultFn(() => new Date().toISOString()),
  finished_at: text('finished_at'),
  meta_json: text('meta_json'),
});
