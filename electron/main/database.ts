import { app } from 'electron'
import path from 'path'
import fs from 'fs'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const Database = require('better-sqlite3')

let db: any = null

function getDbPath(): string {
  const appRoot = process.env.APP_ROOT || path.join(__dirname, '../..')
  const dbDir = path.join(appRoot, 'data')
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true })
  }
  const dbPath = path.join(dbDir, 'auto_repair.db')
  console.log('Database path:', dbPath)
  console.log('Database directory exists:', fs.existsSync(dbDir))
  console.log('Database directory writable:', fs.accessSync ? 'checking' : 'n/a')
  return dbPath
}

function initTables() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS stores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      address TEXT,
      phone TEXT,
      contact TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin', 'technician', 'reception')),
      store_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (store_id) REFERENCES stores(id)
    );

    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT,
      remark TEXT,
      store_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (store_id) REFERENCES stores(id)
    );

    CREATE TABLE IF NOT EXISTS vehicles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER NOT NULL,
      plate_number TEXT NOT NULL,
      brand TEXT,
      model TEXT,
      vin TEXT,
      frame_number TEXT,
      engine_number TEXT,
      color TEXT,
      mileage INTEGER,
      remark TEXT,
      store_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (customer_id) REFERENCES customers(id),
      FOREIGN KEY (store_id) REFERENCES stores(id)
    );

    CREATE TABLE IF NOT EXISTS parts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE,
      name TEXT NOT NULL,
      spec TEXT,
      unit TEXT,
      purchase_price REAL DEFAULT 0,
      sale_price REAL DEFAULT 0,
      stock INTEGER DEFAULT 0,
      min_stock INTEGER DEFAULT 0,
      category TEXT,
      remark TEXT,
      store_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (store_id) REFERENCES stores(id)
    );

    CREATE TABLE IF NOT EXISTS work_orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_no TEXT NOT NULL UNIQUE,
      customer_id INTEGER NOT NULL,
      vehicle_id INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'repairing', 'settling', 'completed', 'cancelled')),
      fault_description TEXT,
      service_type TEXT CHECK(service_type IN ('maintenance', 'repair', 'modification', 'accident')),
      technician_id INTEGER,
      receptionist_id INTEGER,
      labor_fee REAL DEFAULT 0,
      parts_fee REAL DEFAULT 0,
      discount REAL DEFAULT 0,
      total_amount REAL DEFAULT 0,
      paid_amount REAL DEFAULT 0,
      payment_method TEXT,
      store_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      completed_at DATETIME,
      FOREIGN KEY (customer_id) REFERENCES customers(id),
      FOREIGN KEY (vehicle_id) REFERENCES vehicles(id),
      FOREIGN KEY (technician_id) REFERENCES users(id),
      FOREIGN KEY (receptionist_id) REFERENCES users(id),
      FOREIGN KEY (store_id) REFERENCES stores(id)
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      work_order_id INTEGER NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('labor', 'part')),
      name TEXT NOT NULL,
      quantity REAL DEFAULT 1,
      unit_price REAL DEFAULT 0,
      amount REAL DEFAULT 0,
      part_id INTEGER,
      remark TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (work_order_id) REFERENCES work_orders(id),
      FOREIGN KEY (part_id) REFERENCES parts(id)
    );

    CREATE TABLE IF NOT EXISTS stock_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      part_id INTEGER NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('in', 'out')),
      quantity INTEGER NOT NULL,
      unit_price REAL,
      operator_id INTEGER,
      work_order_id INTEGER,
      remark TEXT,
      store_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (part_id) REFERENCES parts(id),
      FOREIGN KEY (operator_id) REFERENCES users(id),
      FOREIGN KEY (work_order_id) REFERENCES work_orders(id),
      FOREIGN KEY (store_id) REFERENCES stores(id)
    );

    CREATE TABLE IF NOT EXISTS settlements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      settlement_no TEXT NOT NULL UNIQUE,
      work_order_id INTEGER NOT NULL,
      total_amount REAL NOT NULL,
      discount REAL DEFAULT 0,
      actual_amount REAL NOT NULL,
      paid_amount REAL NOT NULL,
      payment_method TEXT NOT NULL,
      operator_id INTEGER,
      store_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (work_order_id) REFERENCES work_orders(id),
      FOREIGN KEY (operator_id) REFERENCES users(id),
      FOREIGN KEY (store_id) REFERENCES stores(id)
    );

    CREATE INDEX IF NOT EXISTS idx_work_orders_store ON work_orders(store_id);
    CREATE INDEX IF NOT EXISTS idx_work_orders_status ON work_orders(status);
    CREATE INDEX IF NOT EXISTS idx_work_orders_created ON work_orders(created_at);
    CREATE INDEX IF NOT EXISTS idx_vehicles_plate ON vehicles(plate_number);
    CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
    CREATE INDEX IF NOT EXISTS idx_settlements_created ON settlements(created_at);
  `)
}

function seedInitialData() {
  const storeCount = db.prepare('SELECT COUNT(*) as count FROM stores').get().count
  if (storeCount === 0) {
    const storeStmt = db.prepare(`
      INSERT INTO stores (name, address, phone, contact)
      VALUES (?, ?, ?, ?)
    `)
    const storeResult = storeStmt.run(
      '总店',
      '北京市朝阳区汽修路88号',
      '010-88888888',
      '张经理'
    )
    const storeId = storeResult.lastInsertRowid

    const crypto = require('crypto')
    const hash = (pwd: string) => crypto.createHash('sha256').update(pwd).digest('hex')

    const userStmt = db.prepare(`
      INSERT INTO users (username, password, name, role, store_id)
      VALUES (?, ?, ?, ?, ?)
    `)
    userStmt.run('admin', hash('123456'), '系统管理员', 'admin', storeId)
    userStmt.run('tech1', hash('123456'), '李技师', 'technician', storeId)
    userStmt.run('reception1', hash('123456'), '王前台', 'reception', storeId)

    const partStmt = db.prepare(`
      INSERT INTO parts (code, name, spec, unit, purchase_price, sale_price, stock, min_stock, category, store_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    const parts = [
      ['P001', '机油', '5W-40 4L', '桶', 120, 180, 50, 10, '油品'],
      ['P002', '机油滤芯', '通用型', '个', 25, 45, 100, 20, '滤芯'],
      ['P003', '空气滤芯', '通用型', '个', 30, 55, 80, 15, '滤芯'],
      ['P004', '刹车片', '前片', '套', 150, 280, 30, 5, '制动系统'],
      ['P005', '火花塞', '双铱金', '支', 40, 80, 60, 12, '点火系统'],
      ['P006', '防冻液', '-35℃ 4L', '桶', 60, 100, 40, 8, '油品'],
      ['P007', '变速箱油', 'ATF 4L', '桶', 180, 280, 25, 5, '油品'],
      ['P008', '刹车油', 'DOT4 1L', '桶', 45, 80, 35, 7, '制动系统']
    ]
    parts.forEach(p => partStmt.run(...p, storeId))

    const customerStmt = db.prepare(`
      INSERT INTO customers (name, phone, remark, store_id)
      VALUES (?, ?, ?, ?)
    `)
    const customers = [
      ['张三', '13800138001', 'VIP客户'],
      ['李四', '13800138002', ''],
      ['王五', '13800138003', '老客户']
    ]
    customers.forEach(c => customerStmt.run(...c, storeId))

    const vehicleStmt = db.prepare(`
      INSERT INTO vehicles (customer_id, plate_number, brand, model, vin, frame_number, engine_number, color, mileage, store_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    const vehicles = [
      [1, '京A12345', '大众', '迈腾2023款', 'LFV3A23C0D3123456', 'LBV3A23C0D3123456', 'CEA123456', '黑色', 25000],
      [2, '京B67890', '丰田', '凯美瑞2022款', 'LVGBE40K3DG123456', 'LVGBE40K3DG123456', 'A25A123456', '白色', 18000],
      [3, '京C11111', '本田', '雅阁2024款', 'LHGCR2830D1234567', 'LHGCR2830D1234567', 'K20C123456', '银色', 5000]
    ]
    vehicles.forEach(v => vehicleStmt.run(...v, storeId))
  }
}

export function initDatabase() {
  const dbPath = getDbPath()
  console.log('Database path:', dbPath)
  db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  initTables()
  seedInitialData()
  return db
}

export function getDb() {
  if (!db) {
    throw new Error('Database not initialized')
  }
  return db
}
