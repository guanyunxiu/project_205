import { createRouter, createWebHashHistory } from 'vue-router'
import { useUserStore } from '@/stores/user'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/Login.vue'),
    meta: { requiresAuth: false, title: '登录' }
  },
  {
    path: '/',
    component: () => import('@/layouts/MainLayout.vue'),
    redirect: '/dashboard',
    meta: { requiresAuth: true },
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('@/views/Dashboard.vue'),
        meta: { title: '首页', icon: 'HomeFilled' }
      },
      {
        path: 'stores',
        name: 'Stores',
        component: () => import('@/views/system/Stores.vue'),
        meta: { title: '门店管理', icon: 'OfficeBuilding', roles: ['admin'] }
      },
      {
        path: 'users',
        name: 'Users',
        component: () => import('@/views/system/Users.vue'),
        meta: { title: '用户管理', icon: 'User', roles: ['admin'] }
      },
      {
        path: 'customers',
        name: 'Customers',
        component: () => import('@/views/customer/Customers.vue'),
        meta: { title: '客户管理', icon: 'UserFilled', roles: ['admin', 'reception'] }
      },
      {
        path: 'vehicles',
        name: 'Vehicles',
        component: () => import('@/views/customer/Vehicles.vue'),
        meta: { title: '车辆管理', icon: 'Van', roles: ['admin', 'reception', 'technician'] }
      },
      {
        path: 'work-orders',
        name: 'WorkOrders',
        component: () => import('@/views/workorder/WorkOrders.vue'),
        meta: { title: '维保工单', icon: 'Document', roles: ['admin', 'reception', 'technician'] }
      },
      {
        path: 'work-orders/new',
        name: 'NewWorkOrder',
        component: () => import('@/views/workorder/NewWorkOrder.vue'),
        meta: { title: '新建工单', icon: 'Plus', roles: ['admin', 'reception'], hidden: true }
      },
      {
        path: 'work-orders/:id',
        name: 'WorkOrderDetail',
        component: () => import('@/views/workorder/WorkOrderDetail.vue'),
        meta: { title: '工单详情', icon: 'View', roles: ['admin', 'reception', 'technician'], hidden: true }
      },
      {
        path: 'settlements',
        name: 'Settlements',
        component: () => import('@/views/settlement/Settlements.vue'),
        meta: { title: '结算收银', icon: 'Money', roles: ['admin', 'reception'] }
      },
      {
        path: 'parts',
        name: 'Parts',
        component: () => import('@/views/inventory/Parts.vue'),
        meta: { title: '配件库存', icon: 'Goods', roles: ['admin', 'reception'] }
      },
      {
        path: 'stock-records',
        name: 'StockRecords',
        component: () => import('@/views/inventory/StockRecords.vue'),
        meta: { title: '出入库记录', icon: 'Tickets', roles: ['admin', 'reception'] }
      },
      {
        path: 'reports',
        name: 'Reports',
        component: () => import('@/views/report/Reports.vue'),
        meta: { title: '数据报表', icon: 'DataLine', roles: ['admin'] }
      }
    ]
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

router.beforeEach((to, _from, next) => {
  const userStore = useUserStore()
  if (to.meta.requiresAuth && !userStore.isLoggedIn) {
    next({ path: '/login', query: { redirect: to.fullPath } })
  } else if (to.path === '/login' && userStore.isLoggedIn) {
    next('/')
  } else {
    next()
  }
})

export default router
