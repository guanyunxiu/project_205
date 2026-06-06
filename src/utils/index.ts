import dayjs from 'dayjs'
import numeral from 'numeral'
import { ElMessage } from 'element-plus'

export function formatDate(date: string | Date, format = 'YYYY-MM-DD HH:mm:ss'): string {
  return dayjs(date).format(format)
}

export function formatMoney(amount: number): string {
  return numeral(amount).format('¥0,0.00')
}

export function formatNumber(num: number): string {
  return numeral(num).format('0,0')
}

export function showSuccess(message: string) {
  ElMessage.success(message)
}

export function showError(message: string) {
  ElMessage.error(message)
}

export function showWarning(message: string) {
  ElMessage.warning(message)
}

export function confirm(message: string, title = '确认'): Promise<boolean> {
  return new Promise((resolve) => {
    ElMessageBox.confirm(message, title, {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
      .then(() => resolve(true))
      .catch(() => resolve(false))
  })
}

import { ElMessageBox } from 'element-plus'

export { ElMessageBox }
