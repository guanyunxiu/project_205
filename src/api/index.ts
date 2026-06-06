import type {
  Store,
  User,
  Customer,
  Vehicle,
  Part,
  WorkOrder,
  OrderItem,
  StockRecord,
  Settlement
} from '@/types'

const invoke = <T = any>(channel: string, ...args: any[]): Promise<T> => {
  return window.electronAPI.invoke(channel, ...args)
}

export const authApi = {
  login: (username: string, password: string) =>
    invoke('auth:login', { username, password }),
  changePassword: (userId: number, oldPassword: string, newPassword: string) =>
    invoke('auth:changePassword', { userId, oldPassword, newPassword })
}

export const storeApi = {
  list: () => invoke<Store[]>('stores:list'),
  create: (data: Omit<Store, 'id' | 'created_at' | 'updated_at'>) =>
    invoke<Store>('stores:create', data),
  update: (id: number, data: Partial<Store>) =>
    invoke<Store>('stores:update', { id, ...data }),
  delete: (id: number) => invoke('stores:delete', id)
}

export const userApi = {
  list: () => invoke<User[]>('users:list'),
  create: (data: { username: string; password: string; name: string; role: User['role']; store_id: number }) =>
    invoke('users:create', data),
  update: (id: number, data: Partial<User>) =>
    invoke('users:update', { id, ...data }),
  delete: (id: number) => invoke('users:delete', id)
}

export const customerApi = {
  list: (params?: { keyword?: string; storeId?: number }) =>
    invoke<Customer[]>('customers:list', params),
  create: (data: Omit<Customer, 'id' | 'created_at' | 'updated_at'>) =>
    invoke<Customer>('customers:create', data),
  update: (id: number, data: Partial<Customer>) =>
    invoke<Customer>('customers:update', { id, ...data }),
  delete: (id: number) => invoke('customers:delete', id),
  getWithVehicles: (id: number) =>
    invoke<Customer & { vehicles: Vehicle[] }>('customers:getWithVehicles', id)
}

export const vehicleApi = {
  list: (params?: { keyword?: string; storeId?: number }) =>
    invoke<Vehicle[]>('vehicles:list', params),
  create: (data: Omit<Vehicle, 'id' | 'created_at' | 'updated_at'>) =>
    invoke<Vehicle>('vehicles:create', data),
  update: (id: number, data: Partial<Vehicle>) =>
    invoke<Vehicle>('vehicles:update', { id, ...data }),
  delete: (id: number) => invoke('vehicles:delete', id),
  getServiceHistory: (id: number) =>
    invoke<WorkOrder[]>('vehicles:getServiceHistory', id)
}

export const partApi = {
  list: (params?: { keyword?: string; category?: string; storeId?: number; lowStock?: boolean }) =>
    invoke<Part[]>('parts:list', params),
  categories: () => invoke<string[]>('parts:categories'),
  create: (data: Omit<Part, 'id' | 'created_at' | 'updated_at'>) =>
    invoke<Part>('parts:create', data),
  update: (id: number, data: Partial<Part>) =>
    invoke<Part>('parts:update', { id, ...data }),
  delete: (id: number) => invoke('parts:delete', id),
  stockIn: (data: { partId: number; quantity: number; unitPrice?: number; operatorId?: number; remark?: string; storeId: number }) =>
    invoke('parts:stockIn', data),
  stockOut: (data: { partId: number; quantity: number; unitPrice?: number; operatorId?: number; workOrderId?: number; remark?: string; storeId: number }) =>
    invoke('parts:stockOut', data)
}

export const stockRecordApi = {
  list: (params?: { partId?: number; type?: 'in' | 'out'; storeId?: number; startDate?: string; endDate?: string }) =>
    invoke<StockRecord[]>('stockRecords:list', params)
}

export const workOrderApi = {
  list: (params?: { status?: string; keyword?: string; storeId?: number; startDate?: string; endDate?: string }) =>
    invoke<WorkOrder[]>('workOrders:list', params),
  get: (id: number) => invoke<WorkOrder & { items: OrderItem[] }>('workOrders:get', id),
  create: (data: { customer_id: number; vehicle_id: number; fault_description: string; service_type: WorkOrder['service_type']; receptionist_id?: number; store_id: number }) =>
    invoke<{ success: boolean; id: number; order_no: string }>('workOrders:create', data),
  updateStatus: (id: number, status: WorkOrder['status'], technicianId?: number) =>
    invoke('workOrders:updateStatus', { id, status, technicianId }),
  addItem: (workOrderId: number, item: Omit<OrderItem, 'id' | 'work_order_id' | 'created_at'>) =>
    invoke('workOrders:addItem', { workOrderId, item }),
  removeItem: (itemId: number) => invoke('workOrders:removeItem', itemId),
  applyDiscount: (id: number, discount: number) =>
    invoke('workOrders:applyDiscount', { id, discount })
}

export const settlementApi = {
  create: (data: { work_order_id: number; total_amount: number; discount?: number; actual_amount: number; paid_amount: number; payment_method: WorkOrder['payment_method']; operator_id?: number; store_id: number }) =>
    invoke<{ success: boolean; id: number; settlement_no: string }>('settlements:create', data),
  get: (id: number) => invoke<Settlement>('settlements:get', id),
  list: (params?: { storeId?: number; startDate?: string; endDate?: string }) =>
    invoke<Settlement[]>('settlements:list', params)
}

export const reportApi = {
  daily: (params?: { date?: string; storeId?: number }) =>
    invoke<any>('reports:daily', params),
  monthly: (params?: { year?: number; month?: number; storeId?: number }) =>
    invoke<any>('reports:monthly', params),
  exportRevenue: (params?: { startDate?: string; endDate?: string; storeId?: number }) =>
    invoke<any[]>('reports:exportRevenue', params)
}

export const appApi = {
  getUserDataPath: () => invoke<string>('app:getUserDataPath')
}
