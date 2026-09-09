<template>
  <!-- 教师登录页 -->
  <div v-if="!isLoggedIn" class="login-page">
    <div class="login-card">
      <div class="login-icon">🔐</div>
      <h1>教学管理平台</h1>
      <p class="login-subtitle">请使用账号密码登录</p>
      <div class="login-form">
        <div class="login-field">
          <label>账号</label>
          <input v-model="loginAccount" type="text" placeholder="请输入账号" @keyup.enter="doLogin" />
        </div>
        <div class="login-field">
          <label>密码</label>
          <div class="pwd-wrapper">
            <input v-model="loginPassword" :type="showPassword ? 'text' : 'password'" placeholder="请输入密码" @keyup.enter="doLogin" />
            <span class="pwd-toggle" @click="showPassword = !showPassword">{{ showPassword ? '🙈' : '👁️' }}</span>
          </div>
        </div>
        <div class="login-remember">
          <label class="checkbox-label"><input type="checkbox" v-model="rememberMe" /> 记住密码</label>
        </div>
        <div v-if="loginErr" class="login-error">{{ loginErr }}</div>
        <button class="login-btn" @click="doLogin">登 录</button>
      </div>
    </div>
  </div>

  <!-- 主应用 -->
  <div v-else class="app">
    <!-- 顶栏 -->
    <div class="topbar">
      <div class="logo">
        <span class="logo-icon">📚</span>
        <span>教学管理平台</span>
      </div>
      <div class="topbar-info">
        <div class="info-item class-btn" @click="showClassSwitcher = true">
          <span class="label">当前班级</span>
          <span class="class-name">{{ curInfo()?.name || '—' }}</span>
          <span class="arrow">▾</span>
        </div>
      </div>
      <div class="topbar-spacer"></div>
      <div class="topbar-search">
        <span class="search-icon">🔍</span>
        <input type="text" v-model="searchQuery" placeholder="搜索学生…" @keyup.enter="handleSearch" />
      </div>
      <div class="topbar-user">
        <span class="user-name">{{ loginUser }}</span>
        <button class="logout-btn" @click="doLogout" title="退出登录">退出</button>
      </div>
    </div>

    <div class="main-body">
      <!-- 侧边栏 -->
      <div class="sidebar">
        <div class="nav-group-title">工作台</div>
        <router-link to="/" class="nav-item" exact-active-class="active">
          <span class="nav-icon">📊</span>仪表盘
        </router-link>

        <div class="nav-group-title">教学管理</div>
        <router-link to="/students" class="nav-item" active-class="active">
          <span class="nav-icon">👥</span>学生信息
        </router-link>
        <router-link to="/behaviors" class="nav-item" active-class="active">
          <span class="nav-icon">⭐</span>课堂行为
        </router-link>
        <router-link to="/seats" class="nav-item" active-class="active">
          <span class="nav-icon">💺</span>座位管理
        </router-link>

        <div class="nav-group-title">作业管理</div>
        <router-link to="/homework-submit/teacher" class="nav-item" active-class="active">
          <span class="nav-icon">👨‍🏫</span>作业发布管理
        </router-link>
        <router-link to="/homework-check" class="nav-item" active-class="active">
          <span class="nav-icon">📋</span>作业提交统计
        </router-link>

        <div class="nav-group-title">考勤管理</div>
        <router-link to="/attendance/teacher" class="nav-item" active-class="active">
          <span class="nav-icon">🎓</span>考勤管理(教师)
        </router-link>

        <div class="nav-group-title">课堂小工具</div>
        <router-link to="/class-tools" class="nav-item" active-class="active">
          <span class="nav-icon">🛠️</span>课堂小工具
        </router-link>

        <div class="nav-group-title">系统</div>
        <router-link to="/sync-settings" class="nav-item" active-class="active">
          <span class="nav-icon">🔄</span>数据同步
        </router-link>
      </div>

      <!-- 主内容区 -->
      <div class="workspace">
        <router-view />
      </div>
    </div>

    <!-- 班级切换弹窗 -->
    <div class="modal-overlay" v-if="showClassSwitcher" @click.self="showClassSwitcher = false">
      <div class="modal-box class-modal">
        <div class="modal-header">
          <span>切换/管理班级</span>
          <span class="modal-close" @click="showClassSwitcher = false">×</span>
        </div>
        <div class="modal-body">
          <!-- 已有班级列表 -->
          <div class="class-list">
            <div v-for="id in state.classOrder" :key="id" class="class-row"
                 :class="{ current: id === state.currentClassId }" @click="doSwitch(id)">
              <span class="cr-name">{{ state.classes[id]?.info.name }}</span>
              <span class="cr-count">{{ state.classes[id]?.data?.students?.length || 0 }}人</span>
              <span class="cr-del" @click.stop="doDeleteClass(id)" v-if="state.classOrder.length > 1" title="删除">×</span>
            </div>
          </div>
          <!-- 新建班级 -->
          <div class="new-class">
            <div class="nc-title">新建班级</div>
            <div class="nc-row">
              <div class="nc-field">
                <label>年级</label>
                <select v-model="newGrade">
                  <option v-for="g in 12" :key="g" :value="g">{{ g }}年级</option>
                </select>
              </div>
              <div class="nc-field">
                <label>班级</label>
                <select v-model="newClassNo">
                  <option v-for="c in 24" :key="c" :value="c">{{ c }}班</option>
                </select>
              </div>
              <button class="btn btn-primary" @click="doCreate">创建</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useWorkbench } from './composables/useWorkbench.js'
import { useGithubSync } from './composables/useGithubSync.js'

/* ---- 教师账号认证（固定账号+密码） ---- */
const TEACHER_ACCOUNT = 'gengxuesdnu'
const TEACHER_PASSWORD = 'sd,123'
const LOGIN_KEY = 'teacher_logged_in'
const LOGIN_USER_KEY = 'teacher_logged_user'

const { state, curInfo, switchClass, createClass, deleteClass } = useWorkbench()
const { token, gistId, startAutoSync, stopAutoSync } = useGithubSync()
const router = useRouter()
const searchQuery = ref('')
const showClassSwitcher = ref(false)
const newGrade = ref(1)
const newClassNo = ref(1)

const REMEMBER_KEY = 'teacher_remember_account'
const rememberMe = ref(false)

// 登录状态
const isLoggedIn = ref(false)
const loginUser = ref('')
const loginAccount = ref('')
const loginPassword = ref('')
const loginErr = ref('')
const showPassword = ref(false)

function doLogin() {
  loginErr.value = ''
  const account = loginAccount.value.trim()
  const password = loginPassword.value.trim()
  if (!account) { loginErr.value = '请输入账号'; return }
  if (!password) { loginErr.value = '请输入密码'; return }
  if (account !== TEACHER_ACCOUNT || password !== TEACHER_PASSWORD) {
    loginErr.value = '账号或密码错误'
    loginPassword.value = ''
    return
  }
  isLoggedIn.value = true
  localStorage.setItem(LOGIN_KEY, '1')
  localStorage.setItem(LOGIN_USER_KEY, account)
  // 记住密码
  if (rememberMe.value) {
    localStorage.setItem(REMEMBER_KEY, account)
  } else {
    localStorage.removeItem(REMEMBER_KEY)
  }
  loginPassword.value = ''
  loginErr.value = ''
}

function doLogout() {
  if (!confirm('确定退出登录？')) return
  isLoggedIn.value = false
  loginUser.value = ''
  loginAccount.value = ''
  localStorage.removeItem(LOGIN_KEY)
  localStorage.removeItem(LOGIN_USER_KEY)
  stopAutoSync()
  router.push('/')
}

function doSwitch(id) { switchClass(id); showClassSwitcher.value = false }
function doCreate() {
  createClass(newGrade.value, newClassNo.value)
  showClassSwitcher.value = false
}
function doDeleteClass(id) {
  if (confirm('确定删除该班级及其全部数据？')) deleteClass(id)
}
function handleSearch() {
  if (searchQuery.value.trim()) router.push('/students?q=' + encodeURIComponent(searchQuery.value.trim()))
}

onMounted(() => {
  // 恢复记住的账号
  const savedAccount = localStorage.getItem(REMEMBER_KEY)
  if (savedAccount) {
    loginAccount.value = savedAccount
    rememberMe.value = true
  }
  // 检查是否已登录
  if (localStorage.getItem(LOGIN_KEY) === '1') {
    isLoggedIn.value = true
    loginUser.value = localStorage.getItem(LOGIN_USER_KEY) || TEACHER_ACCOUNT
    if (token.value && gistId.value) {
      startAutoSync()
    }
  }
})

onUnmounted(() => {
  stopAutoSync()
})
</script>

<style>
:root {
  --bg-page: #f4f6fb; --bg-sidebar: #eef2f9; --bg-card: #ffffff; --bg-hover: #eef4fb;
  --text-primary: #1f2d3d; --text-secondary: #5a6b7b; --text-light: #aab4c0;
  --primary: #1e88e5; --primary-light: #90caf9; --primary-bg: #e3f2fd;
  --red: #ef5350; --orange: #fb8c00; --blue: #1e88e5; --green: #43a047; --purple: #8e24aa;
  --border: #e0e6ed; --border-light: #eef1f5;
  --radius: 8px; --radius-sm: 4px;
  --shadow: 0 1px 3px rgba(0,0,0,.08); --shadow-md: 0 4px 12px rgba(0,0,0,.1);
}
body { font-family: "Microsoft YaHei", "Segoe UI", sans-serif; background: var(--bg-page); color: var(--text-primary); font-size: 14px; line-height: 1.6; }
* { margin: 0; padding: 0; box-sizing: border-box; }
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: #c5cdd6; border-radius: 3px; }
</style>

<style scoped>
/* 登录页 */
.login-page { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #1e3c72 0%, #2a5298 50%, #667eea 100%); }
.login-card { background: #fff; border-radius: 20px; padding: 48px 40px; width: 400px; max-width: 92vw; box-shadow: 0 20px 60px rgba(0,0,0,.25); text-align: center; }
.login-icon { font-size: 56px; margin-bottom: 8px; }
.login-card h1 { font-size: 24px; color: #1e3c72; margin-bottom: 4px; }
.login-subtitle { color: #888; font-size: 14px; margin-bottom: 28px; }
.login-form { text-align: left; }
.login-field { margin-bottom: 18px; }
.login-field label { display: block; font-size: 13px; font-weight: 600; color: #333; margin-bottom: 6px; }
.login-field input { width: 100%; padding: 11px 14px; border: 2px solid #e0e0e0; border-radius: 10px; font-size: 15px; box-sizing: border-box; transition: border-color .2s; }
.login-field input:focus { outline: none; border-color: #1e88e5; }
.pwd-wrapper { position: relative; display: flex; align-items: center; }
.pwd-wrapper input { padding-right: 42px; }
.pwd-toggle { position: absolute; right: 12px; cursor: pointer; font-size: 18px; user-select: none; opacity: .6; }
.pwd-toggle:hover { opacity: 1; }
.login-error { color: #e74c3c; font-size: 13px; margin-bottom: 12px; background: #fde8e8; padding: 8px 12px; border-radius: 8px; text-align: center; }
.login-remember { margin-bottom: 14px; }
.checkbox-label { display: flex; align-items: center; gap: 6px; font-size: 13px; color: #555; cursor: pointer; user-select: none; }
.checkbox-label input[type="checkbox"] { width: 16px; height: 16px; accent-color: #1e88e5; cursor: pointer; }
.login-btn { width: 100%; padding: 13px; background: linear-gradient(135deg, #1e3c72, #2a5298); color: #fff; border: none; border-radius: 10px; font-size: 16px; font-weight: 700; cursor: pointer; margin-top: 4px; transition: opacity .2s; }
.login-btn:hover { opacity: .9; }
.code-wrapper { display: flex; gap: 8px; align-items: center; }
.code-wrapper input { flex: 1; padding: 11px 14px; border: 2px solid #e0e0e0; border-radius: 10px; font-size: 15px; box-sizing: border-box; transition: border-color .2s; }
.code-wrapper input:focus { outline: none; border-color: #1e88e5; }
.code-btn { padding: 11px 14px; background: linear-gradient(135deg, #1e88e5, #42a5f5); color: #fff; border: none; border-radius: 10px; font-size: 13px; cursor: pointer; white-space: nowrap; transition: opacity .2s; flex-shrink: 0; }
.code-btn:disabled { background: #bbb; cursor: not-allowed; opacity: .7; }
.code-btn:not(:disabled):hover { opacity: .9; }
.sim-code { margin-top: 16px; font-size: 13px; color: #f39c12; background: #fef9e7; padding: 8px 12px; border-radius: 8px; text-align: center; }

.app { display: flex; flex-direction: column; height: 100vh; overflow: hidden; }
.topbar { height: 56px; background: var(--bg-card); border-bottom: 1px solid var(--border); display: flex; align-items: center; padding: 0 16px; gap: 12px; flex-shrink: 0; box-shadow: var(--shadow); z-index: 100; }
.logo { font-size: 17px; font-weight: 700; color: var(--primary); white-space: nowrap; display: flex; align-items: center; gap: 6px; }
.logo-icon { font-size: 22px; }
.topbar-info { display: flex; align-items: center; gap: 10px; margin-left: 8px; }
.info-item { display: flex; align-items: center; gap: 4px; color: var(--text-secondary); font-size: 13px; }
.class-btn { cursor: pointer; padding: 4px 12px; border-radius: var(--radius-sm); transition: .15s; }
.class-btn:hover { background: var(--bg-hover); color: var(--primary); }
.class-name { font-weight: 600; }
.arrow { font-size: 10px; color: var(--text-light); }
.topbar-spacer { flex: 1; }
.topbar-search { position: relative; display: flex; align-items: center; }
.topbar-search input { width: 200px; height: 32px; border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 0 10px 0 30px; background: var(--bg-page); }
.search-icon { position: absolute; left: 8px; font-size: 14px; }
.topbar-user { display: flex; align-items: center; gap: 8px; margin-left: 12px; padding-left: 12px; border-left: 1px solid var(--border); }
.user-name { font-size: 13px; color: var(--text-secondary); font-weight: 600; }
.logout-btn { padding: 4px 12px; background: var(--red); color: #fff; border: none; border-radius: var(--radius-sm); font-size: 12px; cursor: pointer; font-weight: 600; transition: opacity .15s; }
.logout-btn:hover { opacity: .85; }

.main-body { display: flex; flex: 1; overflow: hidden; }
.sidebar { width: 210px; background: var(--bg-sidebar); border-right: 1px solid var(--border); overflow-y: auto; flex-shrink: 0; padding: 8px 0; }
.nav-group-title { font-size: 11px; color: var(--text-light); padding: 12px 16px 4px; letter-spacing: 1px; text-transform: uppercase; }
.nav-item { display: flex; align-items: center; gap: 10px; padding: 10px 16px; cursor: pointer; transition: .15s; border-left: 3px solid transparent; font-size: 14px; color: var(--text-secondary); text-decoration: none; }
.nav-item:hover { background: rgba(30,136,229,.08); color: var(--text-primary); }
.nav-item.active { background: var(--primary-bg); color: var(--primary); border-left-color: var(--primary); font-weight: 600; }
.nav-icon { font-size: 18px; flex-shrink: 0; }
.workspace { flex: 1; overflow: auto; padding: 20px; background: var(--bg-page); }

/* 弹窗 */
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.4); display: flex; align-items: center; justify-content: center; z-index: 9999; }
.modal-box { background: var(--bg-card); border-radius: var(--radius); width: 520px; max-width: 92vw; max-height: 85vh; overflow-y: auto; box-shadow: var(--shadow-md); }
.modal-header { padding: 14px 20px; border-bottom: 1px solid var(--border); display: flex; align-items: center; font-size: 16px; font-weight: 600; }
.modal-close { margin-left: auto; cursor: pointer; font-size: 22px; color: var(--text-light); width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; border-radius: 4px; }
.modal-close:hover { background: var(--bg-hover); color: var(--red); }
.modal-body { padding: 16px 20px; }

/* 班级弹窗 */
.class-list { margin-bottom: 16px; }
.class-row { display: flex; align-items: center; gap: 10px; padding: 10px 14px; border-radius: var(--radius); margin-bottom: 4px; cursor: pointer; border: 1px solid var(--border-light); transition: .15s; }
.class-row:hover { border-color: var(--primary); background: var(--bg-hover); }
.class-row.current { border-color: var(--primary); background: var(--primary-bg); }
.cr-name { flex: 1; font-weight: 600; font-size: 14px; }
.cr-count { font-size: 12px; color: var(--text-light); }
.cr-del { font-size: 18px; color: var(--text-light); cursor: pointer; padding: 0 4px; border-radius: 4px; }
.cr-del:hover { background: #fdeaea; color: var(--red); }
.new-class { border-top: 1px solid var(--border); padding-top: 16px; }
.nc-title { font-size: 14px; font-weight: 600; margin-bottom: 10px; }
.nc-row { display: flex; align-items: flex-end; gap: 10px; }
.nc-field { flex: 1; }
.nc-field label { display: block; font-size: 12px; color: var(--text-secondary); margin-bottom: 4px; font-weight: 600; }
.nc-field select { width: 100%; height: 34px; border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 0 8px; font-size: 13px; }

.btn { padding: 6px 14px; border-radius: var(--radius-sm); font-size: 13px; border: none; cursor: pointer; white-space: nowrap; }
.btn-primary { background: var(--primary); color: #fff; }
.btn-primary:hover { background: #1976d2; }
</style>
