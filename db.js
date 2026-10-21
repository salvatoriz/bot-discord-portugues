import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const initSqlJs = require("sql.js");

const SCHEMA = `
CREATE TABLE IF NOT EXISTS settings (
  guild_id TEXT NOT NULL, key TEXT NOT NULL, value TEXT NOT NULL,
  PRIMARY KEY (guild_id, key)
);
CREATE TABLE IF NOT EXISTS global_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS moderation (
  id INTEGER PRIMARY KEY AUTOINCREMENT, guild_id TEXT NOT NULL, user_id TEXT NOT NULL,
  moderator_id TEXT NOT NULL, action TEXT NOT NULL, reason TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS moderation_lookup ON moderation(guild_id, user_id, created_at);
CREATE TABLE IF NOT EXISTS tickets (
  id TEXT PRIMARY KEY, guild_id TEXT NOT NULL, channel_id TEXT NOT NULL UNIQUE,
  user_id TEXT NOT NULL, status TEXT NOT NULL, claimed_by TEXT,
  opened_at TEXT NOT NULL, closed_at TEXT
);
CREATE INDEX IF NOT EXISTS tickets_member ON tickets(guild_id, user_id, status);
CREATE TABLE IF NOT EXISTS ticket_participants (
  ticket_id TEXT NOT NULL, user_id TEXT NOT NULL, added_by TEXT NOT NULL,
  PRIMARY KEY (ticket_id, user_id)
);
CREATE TABLE IF NOT EXISTS reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT, guild_id TEXT NOT NULL, user_id TEXT NOT NULL,
  ticket_id TEXT, stars INTEGER NOT NULL CHECK(stars BETWEEN 1 AND 5),
  comment TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL,
  UNIQUE(guild_id, ticket_id)
);
CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT, guild_id TEXT NOT NULL, kind TEXT NOT NULL,
  subject_id TEXT, actor_id TEXT, details TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS events_lookup ON events(guild_id, created_at);
CREATE TABLE IF NOT EXISTS polls (
  message_id TEXT PRIMARY KEY, guild_id TEXT NOT NULL, question TEXT NOT NULL,
  options_json TEXT NOT NULL, created_by TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS poll_votes (
  message_id TEXT NOT NULL, user_id TEXT NOT NULL, option_index INTEGER NOT NULL,
  PRIMARY KEY (message_id, user_id)
);
CREATE TABLE IF NOT EXISTS channel_locks (
  channel_id TEXT PRIMARY KEY, guild_id TEXT NOT NULL, everyone_send TEXT
);
`;

let database;
let databasePath;

function persist() {
  if (!database) return;
  const directory = path.dirname(databasePath);
  fs.mkdirSync(directory, { recursive: true });
  const temporaryPath = `${databasePath}.tmp`;
  fs.writeFileSync(temporaryPath, Buffer.from(database.export()));
  fs.renameSync(temporaryPath, databasePath);
}

export async function initializeDatabase(filePath = process.env.BOT_DB_PATH || "./data/bot.sqlite") {
  if (database) return database;
  databasePath = path.resolve(filePath);
  fs.mkdirSync(path.dirname(databasePath), { recursive: true });
  const SQL = await initSqlJs();
  database = fs.existsSync(databasePath)
    ? new SQL.Database(new Uint8Array(fs.readFileSync(databasePath)))
    : new SQL.Database();
  database.run(SCHEMA);
  persist();
  return database;
}

function requireDatabase() {
  if (!database) throw new Error("O banco de dados ainda não foi inicializado.");
  return database;
}

export function get(sql, params = []) {
  const statement = requireDatabase().prepare(sql);
  try {
    statement.bind(params);
    return statement.step() ? statement.getAsObject() : null;
  } finally {
    statement.free();
  }
}

export function all(sql, params = []) {
  const statement = requireDatabase().prepare(sql);
  const rows = [];
  try {
    statement.bind(params);
    while (statement.step()) rows.push(statement.getAsObject());
    return rows;
  } finally {
    statement.free();
  }
}

export function run(sql, params = []) {
  const db = requireDatabase();
  db.run(sql, params);
  const changed = db.getRowsModified();
  persist();
  return changed;
}

export function getSetting(guildId, key, fallback = null) {
  return get("SELECT value FROM settings WHERE guild_id = ? AND key = ?", [guildId, key])?.value ?? fallback;
}

export function setSetting(guildId, key, value) {
  run(
    `INSERT INTO settings(guild_id, key, value) VALUES (?, ?, ?)
     ON CONFLICT(guild_id, key) DO UPDATE SET value = excluded.value`,
    [guildId, key, String(value)],
  );
}

export function getGlobalSetting(key, fallback = null) {
  return get("SELECT value FROM global_settings WHERE key = ?", [key])?.value ?? fallback;
}

export function setGlobalSetting(key, value) {
  run(
    `INSERT INTO global_settings(key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    [key, String(value)],
  );
}

export function recordEvent(guildId, kind, subjectId = null, actorId = null, details = "") {
  run(
    "INSERT INTO events(guild_id, kind, subject_id, actor_id, details, created_at) VALUES (?, ?, ?, ?, ?, ?)",
    [guildId, kind, subjectId, actorId, details.slice(0, 1500), new Date().toISOString()],
  );
}

export function closeDatabase() {
  if (database) {
    persist();
    database.close();
    database = undefined;
  }
}
