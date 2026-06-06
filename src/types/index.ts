export interface Store {
  id: number
  name: string
  address: string
  phone: string
  contact: string
  created_at: string
  updated_at: string
}

export interface User {
  id: number
  username: string
  name: string
  role: 'admin' | 'technician' | 'reception'
  store_id: number
  store_name?: string
  created_at: string
  updated_at: string
}

export interface Customer {
  id: number
  name: string
  phone: string
  remark: string
  store_id: number
  created_at: string
  updated_at: string
  vehicles?: Vehicle[]
}

export interface Vehicle {
  id: number
  customer_id: number
  plate_number: string
  brand: string
  model: string
  vin: string
  frame_number: string
  engine_number: string
  color: string
  mileage: number
  remark: string
  store_id: number
  created_at: string
  updated_at: string
  customer_name?: string
  customer_phone?: string
}

export interface Part {
  id: number
  code: string
  name: string
  spec: string
  unit: string
  purchase_price: number
  sale_price: number
  stock: number
  min_stock: number
  category: string
  remark: string
  store_id: number
  created_at: string
  updated_at: string
}

export type OrderStatus = 'pending' | 'repairing' | 'settling' | 'completed' | 'cancelled'

export type ServiceType = 'maintenance' | 'repair' | 'modification' | 'accident'

export type PaymentMethod = 'cash' | 'wechat' | 'alipay' | 'credit'

export interface WorkOrder {
  id: number
  order_no: string
  customer_id: number
  vehicle_id: number
  status: OrderStatus
  fault_description: string
  service_type: ServiceType
  technician_id?: number
  receptionist_id?: number
  labor_fee: number
  parts_fee: number
  discount: number
  total_amount: number
  paid_amount: number
  payment_method?: PaymentMethod
  store_id: number
  created_at: string
  updated_at: string
  completed_at?: string
  customer_name?: string
  customer_phone?: string
  plate_number?: string
  brand?: string
  model?: string
  technician_name?: string
  receptionist_name?: string
  items?: OrderItem[]
}

export interface OrderItem {
  id: number
  work_order_id: number
  type: 'labor' | 'part'
  name: string
  quantity: number
  unit_price: number
  amount: number
  part_id?: number
  remark: string
  created_at: string
}

export interface StockRecord {
  id: number
  part_id: number
  type: 'in' | 'out'
  quantity: number
  unit_price: number
  operator_id?: number
  work_order_id?: number
  remark: string
  store_id: number
  created_at: string
  part_name?: string
  part_code?: string
  operator_name?: string
}

export interface Settlement {
  id: number
  settlement_no: string
  work_order_id: number
  total_amount: number
  discount: number
  actual_amount: number
  paid_amount: number
  payment_method: PaymentMethod
  operator_id?: number
  store_id: number
  created_at: string
  order_no?: string
  customer_name?: string
  plate_number?: string
  operator_name?: string
}

export interface ApiResponse<T = any> {
  success: boolean
  message?: string
  data?: T
}

export const OrderStatusMap: Record<OrderStatus, { label: string; type: string }> = {
  pending: { label: '待接单', type: 'info' },
  repairing: { label: '维修中', type: 'warning' },
  settling: { label: '待结算', type: 'primary' },
  completed: { label: '已完成', type: 'success' },
  cancelled: { label: '已取消', type: 'danger' }
}

export const ServiceTypeMap: Record<ServiceType, string> = {
  maintenance: '保养',
  repair: '维修',
  modification: '改装',
  accident: '事故'
}

export const PaymentMethodMap: Record<PaymentMethod, string> = {
  cash: '现金',
  wechat: '微信',
  alipay: '支付宝',
  credit: '记账'
}

export const RoleMap: Record<User['role'], string> = {
  admin: '管理员',
  technician: '技师',
  reception: '前台'
}
