// --- START OF FILE db.ts ---
import { Database } from 'bun:sqlite'

const db = new Database('collab.sqlite')

// 启用 WAL 模式以提高并发性能
db.exec('PRAGMA journal_mode = WAL;')

// 1. 用户表
db.run(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`)

// 2. 房间表
db.run(`
  CREATE TABLE IF NOT EXISTS rooms (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    creator_id TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    content BLOB, -- Yjs 二进制数据
    FOREIGN KEY (creator_id) REFERENCES users(id)
  )
`)

// 3. 房间成员表 (用于权限控制)
db.run(`
  CREATE TABLE IF NOT EXISTS room_members (
    room_id TEXT,
    user_id TEXT,
    joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (room_id, user_id),
    FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )
`)

export default db
