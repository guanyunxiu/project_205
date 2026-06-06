<template>
  <div class="new-work-order">
    <div class="page-header">
      <div class="header-left">
        <el-button text @click="handleBack">
          <el-icon><ArrowLeft /></el-icon>
          返回
        </el-button>
        <h2 class="page-title">
          <el-icon :size="24"><Plus /></el-icon>
          新建工单
        </h2>
      </div>
      <p class="page-desc">创建新的维保工单</p>
    </div>

    <el-card class="steps-card" shadow="never">
      <el-steps :active="activeStep" finish-status="success" align-center>
        <el-step title="选择客户车辆" />
        <el-step title="填写服务信息" />
        <el-step title="确认提交" />
      </el-steps>
    </el-card>

    <el-card class="form-card" shadow="never">
      <div v-show="activeStep === 0" class="step-content">
        <h3 class="step-title">选择客户和车辆</h3>
        <el-form
          ref="step1FormRef"
          :model="step1Form"
          :rules="step1Rules"
          label-width="100px"
          class="step-form"
        >
          <el-form-item label="搜索客户" prop="customerKeyword">
            <el-input
              v-model="step1Form.customerKeyword"
              placeholder="请输入客户姓名或电话搜索"
              clearable
              style="width: 360px"
              @keyup.enter="searchCustomers"
            >
              <template #prefix>
                <el-icon><Search /></el-icon>
              </template>
              <template #append>
                <el-button @click="searchCustomers">搜索</el-button>
              </template>
            </el-input>
          </el-form-item>

          <el-form-item label="选择客户" prop="customerId">
            <el-radio-group
              v-model="step1Form.customerId"
              class="customer-radio-group"
            >
              <el-radio
                v-for="customer in customers"
                :key="customer.id"
                :value="customer.id"
                class="customer-radio"
                @change="onCustomerChange"
              >
                <div class="customer-info">
                  <span class="customer-name">{{ customer.name }}</span>
                  <span class="customer-phone">{{ customer.phone }}</span>
                </div>
              </el-radio>
            </el-radio-group>
          </el-form-item>

          <el-form-item label="选择车辆" prop="vehicleId">
            <el-radio-group
              v-model="step1Form.vehicleId"
              class="vehicle-radio-group"
              v-if="vehicles.length > 0"
            >
              <el-radio
                v-for="vehicle in vehicles"
                :key="vehicle.id"
                :value="vehicle.id"
                class="vehicle-radio"
              >
                <div class="vehicle-info">
                  <span class="vehicle-plate">{{ vehicle.plate_number }}</span>
                  <span class="vehicle-model">{{ vehicle.brand }} {{ vehicle.model }}</span>
                </div>
              </el-radio>
            </el-radio-group>
            <el-empty v-else description="请先选择客户" :image-size="80" />
          </el-form-item>
        </el-form>
      </div>

      <div v-show="activeStep === 1" class="step-content">
        <h3 class="step-title">填写服务信息</h3>
        <el-form
          ref="step2FormRef"
          :model="step2Form"
          :rules="step2Rules"
          label-width="100px"
          class="step-form"
        >
          <el-form-item label="故障描述" prop="faultDescription">
            <el-input
              v-model="step2Form.faultDescription"
              type="textarea"
              :rows="4"
              placeholder="请详细描述故障情况"
              maxlength="500"
              show-word-limit
            />
          </el-form-item>

          <el-form-item label="服务类型" prop="serviceType">
            <el-radio-group v-model="step2Form.serviceType">
              <el-radio
                v-for="(label, value) in ServiceTypeMap"
                :key="value"
                :value="value"
              >
                {{ label }}
              </el-radio>
            </el-radio-group>
          </el-form-item>
        </el-form>
      </div>

      <div v-show="activeStep === 2" class="step-content">
        <h3 class="step-title">确认工单信息</h3>
        <el-descriptions :column="2" border class="confirm-descriptions">
          <el-descriptions-item label="客户姓名">
            {{ selectedCustomer?.name }}
          </el-descriptions-item>
          <el-descriptions-item label="联系电话">
            {{ selectedCustomer?.phone }}
          </el-descriptions-item>
          <el-descriptions-item label="车牌号">
            {{ selectedVehicle?.plate_number }}
          </el-descriptions-item>
          <el-descriptions-item label="车型">
            {{ selectedVehicle?.brand }} {{ selectedVehicle?.model }}
          </el-descriptions-item>
          <el-descriptions-item label="服务类型">
            {{ ServiceTypeMap[step2Form.serviceType] }}
          </el-descriptions-item>
          <el-descriptions-item label="门店">
            {{ userStore.user?.store_name || '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="故障描述" :span="2">
            {{ step2Form.faultDescription }}
          </el-descriptions-item>
        </el-descriptions>
      </div>

      <div class="step-footer">
        <el-button v-if="activeStep > 0" @click="prevStep">上一步</el-button>
        <el-button
          v-if="activeStep < 2"
          type="primary"
          @click="nextStep"
        >
          下一步
        </el-button>
        <el-button
          v-if="activeStep === 2"
          type="primary"
          :loading="submitting"
          @click="handleSubmit"
        >
          提交工单
        </el-button>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import type { FormInstance, FormRules } from 'element-plus'
import {
  Plus,
  ArrowLeft,
  Search
} from '@element-plus/icons-vue'
import { customerApi, workOrderApi } from '@/api'
import { showSuccess, showError } from '@/utils'
import type { Customer, Vehicle, ServiceType } from '@/types'
import { ServiceTypeMap } from '@/types'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const userStore = useUserStore()

const activeStep = ref(0)
const submitting = ref(false)
const step1FormRef = ref<FormInstance>()
const step2FormRef = ref<FormInstance>()

const customers = ref<Customer[]>([])
const vehicles = ref<Vehicle[]>([])

const step1Form = reactive({
  customerKeyword: '',
  customerId: 0,
  vehicleId: 0
})

const step2Form = reactive({
  faultDescription: '',
  serviceType: 'maintenance' as ServiceType
})

const step1Rules: FormRules = {
  customerId: [
    { required: true, message: '请选择客户', trigger: 'change' }
  ],
  vehicleId: [
    { required: true, message: '请选择车辆', trigger: 'change' }
  ]
}

const step2Rules: FormRules = {
  faultDescription: [
    { required: true, message: '请填写故障描述', trigger: 'blur' },
    { max: 500, message: '故障描述不能超过500个字符', trigger: 'blur' }
  ],
  serviceType: [
    { required: true, message: '请选择服务类型', trigger: 'change' }
  ]
}

const selectedCustomer = computed(() => {
  return customers.value.find(c => c.id === step1Form.customerId)
})

const selectedVehicle = computed(() => {
  return vehicles.value.find(v => v.id === step1Form.vehicleId)
})

async function loadCustomers() {
  try {
    customers.value = await customerApi.list({
      storeId: userStore.user?.store_id
    })
  } catch (error) {
    showError('加载客户列表失败')
  }
}

async function searchCustomers() {
  try {
    customers.value = await customerApi.list({
      keyword: step1Form.customerKeyword,
      storeId: userStore.user?.store_id
    })
  } catch (error) {
    showError('搜索客户失败')
  }
}

async function onCustomerChange() {
  step1Form.vehicleId = 0
  if (step1Form.customerId) {
    try {
      const result = await customerApi.getWithVehicles(step1Form.customerId)
      vehicles.value = result.vehicles || []
    } catch (error) {
      showError('加载车辆列表失败')
    }
  } else {
    vehicles.value = []
  }
}

async function nextStep() {
  if (activeStep.value === 0) {
    const valid = await step1FormRef.value?.validate().catch(() => false)
    if (!valid) return
    activeStep.value++
  } else if (activeStep.value === 1) {
    const valid = await step2FormRef.value?.validate().catch(() => false)
    if (!valid) return
    activeStep.value++
  }
}

function prevStep() {
  if (activeStep.value > 0) {
    activeStep.value--
  }
}

function handleBack() {
  router.back()
}

async function handleSubmit() {
  const storeId = userStore.user?.store_id
  if (!storeId) {
    showError('未获取到门店信息')
    return
  }

  submitting.value = true
  try {
    const result = await workOrderApi.create({
      customer_id: step1Form.customerId,
      vehicle_id: step1Form.vehicleId,
      fault_description: step2Form.faultDescription,
      service_type: step2Form.serviceType,
      receptionist_id: userStore.user?.id,
      store_id: storeId
    })

    if (result.success) {
      showSuccess('工单创建成功')
      router.push(`/work-orders/${result.id}`)
    } else {
      showError('工单创建失败')
    }
  } catch (error) {
    showError('工单创建失败')
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  loadCustomers()
})
</script>

<style scoped lang="scss">
.new-work-order {
  .page-header {
    margin-bottom: 20px;

    .header-left {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .page-title {
      display: flex;
      align-items: center;
      gap: 10px;
      margin: 0 0 4px;
      font-size: 20px;
      font-weight: 600;
      color: #303133;
    }

    .page-desc {
      margin: 0 0 0 56px;
      color: #909399;
      font-size: 14px;
    }
  }

  .steps-card {
    margin-bottom: 16px;

    :deep(.el-card__body) {
      padding: 20px 40px;
    }
  }

  .form-card {
    .step-content {
      padding: 20px 0;

      .step-title {
        margin: 0 0 20px;
        font-size: 16px;
        font-weight: 600;
        color: #303133;
      }

      .step-form {
        max-width: 700px;
      }
    }

    .customer-radio-group {
      display: flex;
      flex-direction: column;
      gap: 8px;

      .customer-radio {
        margin-right: 0;
        padding: 12px 16px;
        border: 1px solid #dcdfe6;
        border-radius: 6px;
        transition: all 0.2s;

        &:hover {
          border-color: #409eff;
        }

        :deep(.el-radio__label) {
          padding-left: 10px;
        }

        .customer-info {
          display: flex;
          gap: 20px;

          .customer-name {
            font-weight: 500;
            color: #303133;
          }

          .customer-phone {
            color: #909399;
          }
        }
      }
    }

    .vehicle-radio-group {
      display: flex;
      flex-direction: column;
      gap: 8px;

      .vehicle-radio {
        margin-right: 0;
        padding: 12px 16px;
        border: 1px solid #dcdfe6;
        border-radius: 6px;
        transition: all 0.2s;

        &:hover {
          border-color: #409eff;
        }

        :deep(.el-radio__label) {
          padding-left: 10px;
        }

        .vehicle-info {
          display: flex;
          gap: 20px;

          .vehicle-plate {
            font-weight: 500;
            color: #303133;
          }

          .vehicle-model {
            color: #909399;
          }
        }
      }
    }

    .confirm-descriptions {
      margin-top: 10px;
    }

    .step-footer {
      display: flex;
      justify-content: center;
      gap: 12px;
      padding-top: 20px;
      border-top: 1px solid #ebeef5;
    }
  }
}
</style>
