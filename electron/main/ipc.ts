import type { IpcMain, Dialog } from 'electron'
import { getDb } from './database'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const crypto = require('crypto')

function hashPassword(pwd: string): string {
  return crypto.createHash('sha256').update(pwd).digest('hex')
}

function generateOrderNo(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
  return `WO${year}${month}${day}${random}`
}

function generateSettlementNo(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
  return `ST${year}${month}${day}${random}`
}

export function setupIpcHandlers(ipcMain: IpcMain, _dialog: Dialog) {
  const db = getDb()

  ipcMain.handle('auth:login', async (_event, { username, password }) => {
    const user = db
      .prepare('SELECT * FROM users WHERE username = ?')
      .get(username)
    if (!user) return { success: false, message: '用户不存在' }
    if (user.password !== hashPassword(password)) {
      return { success: false, message: '密码错误' }
    }
    const { password: _, ...userWithoutPassword } = user
    return { success: true, user: userWithoutPassword }
  })

  ipcMain.handle('auth:changePassword', async (_event, { userId, oldPassword, newPassword }) => {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId)
    if (!user) return { success: false, message: '用户不存在' }
    if (user.password !== hashPassword(oldPassword)) {
      return { success: false, message: '原密码错误' }
    }
    db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashPassword(newPassword), userId)
    return { success: true }
  })

  ipcMain.handle('stores:list', async () => {
    return db.prepare('SELECT * FROM stores ORDER BY id').all()
  })

  ipcMain.handle('stores:create', async (_event, data) => {
    const stmt = db.prepare(`
      INSERT INTO stores (name, address, phone, contact)
      VALUES (@name, @address, @phone, @contact)
    `)
    const result = stmt.run(data)
    return { id: result.lastInsertRowid, ...data }
  })

  ipcMain.handle('stores:update', async (_event, { id, ...data }) => {
    const stmt = db.prepare(`
      UPDATE stores SET name = @name, address = @address, phone = @phone, contact = @contact, updated_at = CURRENT_TIMESTAMP
      WHERE id = @id
    `)
    stmt.run({ id, ...data })
    return { id, ...data }
  })

  ipcMain.handle('stores:delete', async (_event, id) => {
    db.prepare('DELETE FROM stores WHERE id = ?').run(id)
    return { success: true }
  })

  ipcMain.handle('users:list', async () => {
    return db.prepare(`
      SELECT u.*, s.name as store_name 
      FROM users u 
      LEFT JOIN stores s ON u.store_id = s.id 
      ORDER BY u.id
    `).all()
  })

  ipcMain.handle('users:create', async (_event, data) => {
    const existing = db.prepare('SELECT * FROM users WHERE username = ?').get(data.username)
    if (existing) return { success: false, message: '用户名已存在' }
    const stmt = db.prepare(`
      INSERT INTO users (username, password, name, role, store_id)
      VALUES (@username, @password, @name, @role, @store_id)
    `)
    const result = stmt.run({ ...data, password: hashPassword(data.password) })
    return { success: true, id: result.lastInsertRowid }
  })

  ipcMain.handle('users:update', async (_event, { id, ...data }) => {
    const fields = []
    const values: any = { id }
    if (data.username) { fields.push('username = @username'); values.username = data.username }
    if (data.name) { fields.push('name = @name'); values.name = data.name }
    if (data.role) { fields.push('role = @role'); values.role = data.role }
    if (data.store_id !== undefined) { fields.push('store_id = @store_id'); values.store_id = data.store_id }
    fields.push('updated_at = CURRENT_TIMESTAMP')
    const stmt = db.prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = @id`)
    stmt.run(values)
    return { success: true }
  })

  ipcMain.handle('users:delete', async (_event, id) => {
    db.prepare('DELETE FROM users WHERE id = ?').run(id)
    return { success: true }
  })

  ipcMain.handle('customers:list', async (_event, { keyword = '', storeId } = {}) => {
    let sql = 'SELECT * FROM customers WHERE 1=1'
    const params: any[] = []
    if (keyword) {
      sql += ' AND (name LIKE ? OR phone LIKE ?)'
      params.push(`%${keyword}%`, `%${keyword}%`)
    }
    if (storeId) {
      sql += ' AND store_id = ?'
      params.push(storeId)
    }
    sql += ' ORDER BY id DESC'
    return db.prepare(sql).all(...params)
  })

  ipcMain.handle('customers:create', async (_event, data) => {
    const stmt = db.prepare(`
      INSERT INTO customers (name, phone, remark, store_id)
      VALUES (@name, @phone, @remark, @store_id)
    `)
    const result = stmt.run(data)
    return { id: result.lastInsertRowid, ...data }
  })

  ipcMain.handle('customers:update', async (_event, { id, ...data }) => {
    const stmt = db.prepare(`
      UPDATE customers SET name = @name, phone = @phone, remark = @remark, store_id = @store_id, updated_at = CURRENT_TIMESTAMP
      WHERE id = @id
    `)
    stmt.run({ id, ...data })
    return { id, ...data }
  })

  ipcMain.handle('customers:delete', async (_event, id) => {
    db.prepare('DELETE FROM customers WHERE id = ?').run(id)
    return { success: true }
  })

  ipcMain.handle('customers:getWithVehicles', async (_event, customerId) => {
    const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(customerId)
    if (!customer) return null
    const vehicles = db.prepare('SELECT * FROM vehicles WHERE customer_id = ?').all(customerId)
    return { ...customer, vehicles }
  })

  ipcMain.handle('vehicles:list', async (_event, { keyword = '', storeId } = {}) => {
    let sql = `
      SELECT v.*, c.name as customer_name, c.phone as customer_phone
      FROM vehicles v 
      LEFT JOIN customers c ON v.customer_id = c.id 
      WHERE 1=1
    `
    const params: any[] = []
    if (keyword) {
      sql += ' AND (v.plate_number LIKE ? OR v.brand LIKE ? OR v.model LIKE ? OR c.name LIKE ?)'
      params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`, `%${keyword}%`)
    }
    if (storeId) {
      sql += ' AND v.store_id = ?'
      params.push(storeId)
    }
    sql += ' ORDER BY v.id DESC'
    return db.prepare(sql).all(...params)
  })

  ipcMain.handle('vehicles:create', async (_event, data) => {
    const stmt = db.prepare(`
      INSERT INTO vehicles (customer_id, plate_number, brand, model, vin, frame_number, engine_number, color, mileage, remark, store_id)
      VALUES (@customer_id, @plate_number, @brand, @model, @vin, @frame_number, @engine_number, @color, @mileage, @remark, @store_id)
    `)
    const result = stmt.run(data)
    return { id: result.lastInsertRowid, ...data }
  })

  ipcMain.handle('vehicles:update', async (_event, { id, ...data }) => {
    const stmt = db.prepare(`
      UPDATE vehicles SET 
        customer_id = @customer_id, plate_number = @plate_number, brand = @brand, model = @model,
        vin = @vin, frame_number = @frame_number, engine_number = @engine_number, color = @color,
        mileage = @mileage, remark = @remark, store_id = @store_id, updated_at = CURRENT_TIMESTAMP
      WHERE id = @id
    `)
    stmt.run({ id, ...data })
    return { id, ...data }
  })

  ipcMain.handle('vehicles:delete', async (_event, id) => {
    db.prepare('DELETE FROM vehicles WHERE id = ?').run(id)
    return { success: true }
  })

  ipcMain.handle('vehicles:getServiceHistory', async (_event, vehicleId) => {
    return db.prepare(`
      SELECT wo.*, c.name as customer_name, u.name as technician_name
      FROM work_orders wo
      LEFT JOIN customers c ON wo.customer_id = c.id
      LEFT JOIN users u ON wo.technician_id = u.id
      WHERE wo.vehicle_id = ?
      ORDER BY wo.created_at DESC
    `).all(vehicleId)
  })

  ipcMain.handle('parts:list', async (_event, { keyword = '', category = '', storeId, lowStock = false } = {}) => {
    let sql = 'SELECT * FROM parts WHERE 1=1'
    const params: any[] = []
    if (keyword) {
      sql += ' AND (name LIKE ? OR code LIKE ? OR spec LIKE ?)'
      params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`)
    }
    if (category) {
      sql += ' AND category = ?'
      params.push(category)
    }
    if (storeId) {
      sql += ' AND store_id = ?'
      params.push(storeId)
    }
    if (lowStock) {
      sql += ' AND stock <= min_stock'
    }
    sql += ' ORDER BY id DESC'
    return db.prepare(sql).all(...params)
  })

  ipcMain.handle('parts:categories', async () => {
    return db.prepare('SELECT DISTINCT category FROM parts WHERE category IS NOT NULL AND category != "" ORDER BY category').all().map((r: any) => r.category)
  })

  ipcMain.handle('parts:create', async (_event, data) => {
    const stmt = db.prepare(`
      INSERT INTO parts (code, name, spec, unit, purchase_price, sale_price, stock, min_stock, category, remark, store_id)
      VALUES (@code, @name, @spec, @unit, @purchase_price, @sale_price, @stock, @min_stock, @category, @remark, @store_id)
    `)
    const result = stmt.run(data)
    return { id: result.lastInsertRowid, ...data }
  })

  ipcMain.handle('parts:update', async (_event, { id, ...data }) => {
    const stmt = db.prepare(`
      UPDATE parts SET 
        code = @code, name = @name, spec = @spec, unit = @unit, purchase_price = @purchase_price,
        sale_price = @sale_price, stock = @stock, min_stock = @min_stock, category = @category,
        remark = @remark, store_id = @store_id, updated_at = CURRENT_TIMESTAMP
      WHERE id = @id
    `)
    stmt.run({ id, ...data })
    return { id, ...data }
  })

  ipcMain.handle('parts:delete', async (_event, id) => {
    db.prepare('DELETE FROM parts WHERE id = ?').run(id)
    return { success: true }
  })

  ipcMain.handle('parts:stockIn', async (_event, { partId, quantity, unitPrice, operatorId, remark, storeId }) => {
    const tx = db.transaction(() => {
      db.prepare('UPDATE parts SET stock = stock + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(quantity, partId)
      db.prepare(`
        INSERT INTO stock_records (part_id, type, quantity, unit_price, operator_id, remark, store_id)
        VALUES (?, 'in', ?, ?, ?, ?, ?)
      `).run(partId, quantity, unitPrice, operatorId, remark, storeId)
    })
    tx()
    return { success: true }
  })

  ipcMain.handle('parts:stockOut', async (_event, { partId, quantity, unitPrice, operatorId, workOrderId, remark, storeId }) => {
    const part = db.prepare('SELECT * FROM parts WHERE id = ?').get(partId)
    if (!part || part.stock < quantity) {
      return { success: false, message: '库存不足' }
    }
    const tx = db.transaction(() => {
      db.prepare('UPDATE parts SET stock = stock - ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(quantity, partId)
      db.prepare(`
        INSERT INTO stock_records (part_id, type, quantity, unit_price, operator_id, work_order_id, remark, store_id)
        VALUES (?, 'out', ?, ?, ?, ?, ?, ?)
      `).run(partId, quantity, unitPrice, operatorId, workOrderId, remark, storeId)
    })
    tx()
    return { success: true }
  })

  ipcMain.handle('stockRecords:list', async (_event, { partId, type, storeId, startDate, endDate } = {}) => {
    let sql = `
      SELECT sr.*, p.name as part_name, p.code as part_code, u.name as operator_name
      FROM stock_records sr
      LEFT JOIN parts p ON sr.part_id = p.id
      LEFT JOIN users u ON sr.operator_id = u.id
      WHERE 1=1
    `
    const params: any[] = []
    if (partId) { sql += ' AND sr.part_id = ?'; params.push(partId) }
    if (type) { sql += ' AND sr.type = ?'; params.push(type) }
    if (storeId) { sql += ' AND sr.store_id = ?'; params.push(storeId) }
    if (startDate) { sql += ' AND sr.created_at >= ?'; params.push(startDate) }
    if (endDate) { sql += ' AND sr.created_at <= ?'; params.push(endDate + ' 23:59:59') }
    sql += ' ORDER BY sr.created_at DESC'
    return db.prepare(sql).all(...params)
  })

  ipcMain.handle('workOrders:list', async (_event, { status, keyword = '', storeId, startDate, endDate } = {}) => {
    let sql = `
      SELECT wo.*, c.name as customer_name, c.phone as customer_phone,
             v.plate_number, v.brand, v.model,
             u1.name as technician_name, u2.name as receptionist_name
      FROM work_orders wo
      LEFT JOIN customers c ON wo.customer_id = c.id
      LEFT JOIN vehicles v ON wo.vehicle_id = v.id
      LEFT JOIN users u1 ON wo.technician_id = u1.id
      LEFT JOIN users u2 ON wo.receptionist_id = u2.id
      WHERE 1=1
    `
    const params: any[] = []
    if (status && status !== 'all') { sql += ' AND wo.status = ?'; params.push(status) }
    if (keyword) {
      sql += ' AND (wo.order_no LIKE ? OR c.name LIKE ? OR v.plate_number LIKE ?)'
      params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`)
    }
    if (storeId) { sql += ' AND wo.store_id = ?'; params.push(storeId) }
    if (startDate) { sql += ' AND wo.created_at >= ?'; params.push(startDate) }
    if (endDate) { sql += ' AND wo.created_at <= ?'; params.push(endDate + ' 23:59:59') }
    sql += ' ORDER BY wo.created_at DESC'
    return db.prepare(sql).all(...params)
  })

  ipcMain.handle('workOrders:get', async (_event, id) => {
    const order = db.prepare(`
      SELECT wo.*, c.name as customer_name, c.phone as customer_phone,
             v.plate_number, v.brand, v.model, v.vin, v.frame_number, v.engine_number, v.color,
             u1.name as technician_name, u2.name as receptionist_name
      FROM work_orders wo
      LEFT JOIN customers c ON wo.customer_id = c.id
      LEFT JOIN vehicles v ON wo.vehicle_id = v.id
      LEFT JOIN users u1 ON wo.technician_id = u1.id
      LEFT JOIN users u2 ON wo.receptionist_id = u2.id
      WHERE wo.id = ?
    `).get(id)
    if (!order) return null
    const items = db.prepare('SELECT * FROM order_items WHERE work_order_id = ? ORDER BY id').all(id)
    return { ...order, items }
  })

  ipcMain.handle('workOrders:create', async (_event, data) => {
    const orderNo = generateOrderNo()
    const tx = db.transaction(() => {
      const orderResult = db.prepare(`
        INSERT INTO work_orders (order_no, customer_id, vehicle_id, status, fault_description, service_type, receptionist_id, store_id)
        VALUES (?, ?, ?, 'pending', ?, ?, ?, ?)
      `).run(orderNo, data.customer_id, data.vehicle_id, data.fault_description, data.service_type, data.receptionist_id, data.store_id)
      const orderId = orderResult.lastInsertRowid
      return orderId
    })
    const orderId = tx()
    return { success: true, id: orderId, order_no: orderNo }
  })

  ipcMain.handle('workOrders:updateStatus', async (_event, { id, status, technicianId }) => {
    const updates: string[] = ['status = ?', 'updated_at = CURRENT_TIMESTAMP']
    const params: any[] = [status]
    if (technicianId) {
      updates.push('technician_id = ?')
      params.push(technicianId)
    }
    if (status === 'completed') {
      updates.push('completed_at = CURRENT_TIMESTAMP')
    }
    params.push(id)
    db.prepare(`UPDATE work_orders SET ${updates.join(', ')} WHERE id = ?`).run(...params)
    return { success: true }
  })

  ipcMain.handle('workOrders:addItem', async (_event, { workOrderId, item }) => {
    const tx = db.transaction(() => {
      db.prepare(`
        INSERT INTO order_items (work_order_id, type, name, quantity, unit_price, amount, part_id, remark)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(workOrderId, item.type, item.name, item.quantity, item.unit_price, item.amount, item.part_id || null, item.remark || '')

      const items = db.prepare('SELECT * FROM order_items WHERE work_order_id = ?').all(workOrderId)
      const laborFee = items.filter((i: any) => i.type === 'labor').reduce((sum: number, i: any) => sum + i.amount, 0)
      const partsFee = items.filter((i: any) => i.type === 'part').reduce((sum: number, i: any) => sum + i.amount, 0)
      db.prepare('UPDATE work_orders SET labor_fee = ?, parts_fee = ?, total_amount = ? WHERE id = ?')
        .run(laborFee, partsFee, laborFee + partsFee, workOrderId)

      if (item.type === 'part' && item.part_id) {
        db.prepare('UPDATE parts SET stock = stock - ? WHERE id = ?').run(item.quantity, item.part_id)
        db.prepare(`
          INSERT INTO stock_records (part_id, type, quantity, unit_price, work_order_id, remark, store_id)
          SELECT ?, 'out', ?, ?, ?, '工单领用', store_id FROM work_orders WHERE id = ?
        `).run(item.part_id, item.quantity, item.unit_price, workOrderId, workOrderId)
      }
    })
    tx()
    return { success: true }
  })

  ipcMain.handle('workOrders:removeItem', async (_event, itemId) => {
    const item = db.prepare('SELECT * FROM order_items WHERE id = ?').get(itemId)
    if (!item) return { success: false, message: '项目不存在' }
    const tx = db.transaction(() => {
      db.prepare('DELETE FROM order_items WHERE id = ?').run(itemId)
      const items = db.prepare('SELECT * FROM order_items WHERE work_order_id = ?').all(item.work_order_id)
      const laborFee = items.filter((i: any) => i.type === 'labor').reduce((sum: number, i: any) => sum + i.amount, 0)
      const partsFee = items.filter((i: any) => i.type === 'part').reduce((sum: number, i: any) => sum + i.amount, 0)
      db.prepare('UPDATE work_orders SET labor_fee = ?, parts_fee = ?, total_amount = ? WHERE id = ?')
        .run(laborFee, partsFee, laborFee + partsFee, item.work_order_id)
      if (item.type === 'part' && item.part_id) {
        db.prepare('UPDATE parts SET stock = stock + ? WHERE id = ?').run(item.quantity, item.part_id)
      }
    })
    tx()
    return { success: true }
  })

  ipcMain.handle('workOrders:applyDiscount', async (_event, { id, discount }) => {
    db.prepare('UPDATE work_orders SET discount = ?, total_amount = labor_fee + parts_fee - ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(discount, discount, id)
    return { success: true }
  })

  ipcMain.handle('settlements:create', async (_event, data) => {
    const settlementNo = generateSettlementNo()
    const tx = db.transaction(() => {
      const result = db.prepare(`
        INSERT INTO settlements (settlement_no, work_order_id, total_amount, discount, actual_amount, paid_amount, payment_method, operator_id, store_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(settlementNo, data.work_order_id, data.total_amount, data.discount || 0, data.actual_amount, data.paid_amount, data.payment_method, data.operator_id, data.store_id)

      db.prepare(`
        UPDATE work_orders 
        SET status = 'completed', paid_amount = ?, payment_method = ?, updated_at = CURRENT_TIMESTAMP, completed_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(data.paid_amount, data.payment_method, data.work_order_id)

      return result.lastInsertRowid
    })
    const id = tx()
    return { success: true, id, settlement_no: settlementNo }
  })

  ipcMain.handle('settlements:get', async (_event, id) => {
    return db.prepare(`
      SELECT s.*, wo.order_no, c.name as customer_name, v.plate_number, u.name as operator_name
      FROM settlements s
      LEFT JOIN work_orders wo ON s.work_order_id = wo.id
      LEFT JOIN customers c ON wo.customer_id = c.id
      LEFT JOIN vehicles v ON wo.vehicle_id = v.id
      LEFT JOIN users u ON s.operator_id = u.id
      WHERE s.id = ?
    `).get(id)
  })

  ipcMain.handle('settlements:list', async (_event, { storeId, startDate, endDate } = {}) => {
    let sql = `
      SELECT s.*, wo.order_no, c.name as customer_name, v.plate_number, u.name as operator_name
      FROM settlements s
      LEFT JOIN work_orders wo ON s.work_order_id = wo.id
      LEFT JOIN customers c ON wo.customer_id = c.id
      LEFT JOIN vehicles v ON wo.vehicle_id = v.id
      LEFT JOIN users u ON s.operator_id = u.id
      WHERE 1=1
    `
    const params: any[] = []
    if (storeId) { sql += ' AND s.store_id = ?'; params.push(storeId) }
    if (startDate) { sql += ' AND s.created_at >= ?'; params.push(startDate) }
    if (endDate) { sql += ' AND s.created_at <= ?'; params.push(endDate + ' 23:59:59') }
    sql += ' ORDER BY s.created_at DESC'
    return db.prepare(sql).all(...params)
  })

  ipcMain.handle('reports:daily', async (_event, { date, storeId } = {}) => {
    const where = storeId ? ' AND store_id = ?' : ''
    const params = storeId ? [date, date + ' 23:59:59', storeId] : [date, date + ' 23:59:59']
    const revenue = db.prepare(`
      SELECT COALESCE(SUM(actual_amount), 0) as total,
             COUNT(*) as order_count
      FROM settlements 
      WHERE created_at >= ? AND created_at <= ? ${where}
    `).get(...params)
    const orderStats = db.prepare(`
      SELECT status, COUNT(*) as count
      FROM work_orders
      WHERE created_at >= ? AND created_at <= ? ${where}
      GROUP BY status
    `).all(...params)
    const newCustomers = db.prepare(`
      SELECT COUNT(*) as count
      FROM customers
      WHERE created_at >= ? AND created_at <= ? ${where}
    `).get(...params)
    return { revenue, orderStats, newCustomers }
  })

  ipcMain.handle('reports:monthly', async (_event, { year, month, storeId } = {}) => {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`
    const endDate = `${year}-${String(month).padStart(2, '0')}-31 23:59:59`
    const where = storeId ? ' AND store_id = ?' : ''
    const params = storeId ? [startDate, endDate, storeId] : [startDate, endDate]
    const revenue = db.prepare(`
      SELECT COALESCE(SUM(actual_amount), 0) as total,
             COUNT(*) as order_count
      FROM settlements 
      WHERE created_at >= ? AND created_at <= ? ${where}
    `).get(...params)
    const orderStats = db.prepare(`
      SELECT status, COUNT(*) as count
      FROM work_orders
      WHERE created_at >= ? AND created_at <= ? ${where}
      GROUP BY status
    `).all(...params)
    const dailyTrend = db.prepare(`
      SELECT DATE(created_at) as date, COALESCE(SUM(actual_amount), 0) as revenue
      FROM settlements
      WHERE created_at >= ? AND created_at <= ? ${where}
      GROUP BY DATE(created_at)
      ORDER BY date
    `).all(...params)
    return { revenue, orderStats, dailyTrend }
  })

  ipcMain.handle('reports:exportRevenue', async (_event, { startDate, endDate, storeId } = {}) => {
    const where = storeId ? ' AND s.store_id = ?' : ''
    const params = storeId ? [startDate, endDate + ' 23:59:59', storeId] : [startDate, endDate + ' 23:59:59']
    return db.prepare(`
      SELECT s.settlement_no, s.created_at, wo.order_no, c.name as customer_name, 
             v.plate_number, s.total_amount, s.discount, s.actual_amount, 
             s.payment_method, u.name as operator_name
      FROM settlements s
      LEFT JOIN work_orders wo ON s.work_order_id = wo.id
      LEFT JOIN customers c ON wo.customer_id = c.id
      LEFT JOIN vehicles v ON wo.vehicle_id = v.id
      LEFT JOIN users u ON s.operator_id = u.id
      WHERE s.created_at >= ? AND s.created_at <= ? ${where}
      ORDER BY s.created_at
    `).all(...params)
  })

  ipcMain.handle('app:getUserDataPath', () => {
    const { app } = require('electron')
    return app.getPath('userData')
  })
}
