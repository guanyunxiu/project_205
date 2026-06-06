<template>
  <div class="login-container">
    <div class="login-bg">
      <div class="login-card">
        <div class="login-header">
          <el-icon :size="48" color="#409EFF">
            <Tools />
          </el-icon>
          <h1 class="title">汽修维保管理系统</h1>
          <p class="subtitle">Auto Repair Management System</p>
        </div>

        <el-form
          ref="formRef"
          :model="form"
          :rules="rules"
          class="login-form"
          @keyup.enter="handleLogin"
        >
          <el-form-item prop="username">
            <el-input
              v-model="form.username"
              placeholder="请输入用户名"
              :prefix-icon="User"
              size="large"
              clearable
            />
          </el-form-item>

          <el-form-item prop="password">
            <el-input
              v-model="form.password"
              type="password"
              placeholder="请输入密码"
              :prefix-icon="Lock"
              size="large"
              show-password
              clearable
            />
          </el-form-item>

          <el-button
            type="primary"
            size="large"
            class="login-btn"
            :loading="loading"
            @click="handleLogin"
          >
            登 录
          </el-button>
        </el-form>

        <el-alert
          type="info"
          :closable="false"
          class="account-tip"
        >
          <template #title>
            <div class="tip-title">测试账号</div>
            <div class="tip-content">
              <p>管理员：admin / 123456</p>
              <p>技师：tech1 / 123456</p>
              <p>前台：reception1 / 123456</p>
            </div>
          </template>
        </el-alert>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { FormInstance, FormRules } from 'element-plus'
import { Tools, User, Lock } from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const formRef = ref<FormInstance>()
const loading = ref(false)

const form = reactive({
  username: '',
  password: ''
})

const rules: FormRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' }
  ]
}

async function handleLogin() {
  if (!formRef.value) return

  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return

  loading.value = true
  try {
    const success = await userStore.login(form.username, form.password)
    if (success) {
      const redirect = (route.query.redirect as string) || '/'
      router.push(redirect)
    }
  } finally {
    loading.value = false
  }
}
</script>

<style scoped lang="scss">
.login-container {
  width: 100vw;
  height: 100vh;
  overflow: hidden;
}

.login-bg {
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
}

.login-card {
  width: 420px;
  background: #fff;
  border-radius: 12px;
  padding: 40px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.login-header {
  text-align: center;
  margin-bottom: 36px;

  .title {
    margin: 16px 0 8px;
    font-size: 24px;
    font-weight: 600;
    color: #303133;
  }

  .subtitle {
    margin: 0;
    font-size: 14px;
    color: #909399;
    letter-spacing: 1px;
  }
}

.login-form {
  .login-btn {
    width: 100%;
    font-size: 16px;
    font-weight: 500;
    margin-top: 8px;
  }
}

.account-tip {
  margin-top: 24px;

  .tip-title {
    font-weight: 600;
    color: #606266;
    margin-bottom: 8px;
  }

  .tip-content {
    p {
      margin: 4px 0;
      font-size: 13px;
      color: #909399;
      font-family: 'Consolas', monospace;
    }
  }
}
</style>
