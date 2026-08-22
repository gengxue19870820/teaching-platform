<template>
  <div class="layout">
    <aside class="sidebar" :class="{ collapsed: isCollapsed }">
      <div class="sidebar-header">
        <h1 v-if="!isCollapsed">📚 教学管理平台</h1>
        <h1 v-else>📚</h1>
      </div>
      <nav class="nav-menu">
        <router-link to="/" class="nav-item" exact-active-class="active">
          <span class="nav-icon">🏠</span><span class="nav-text" v-show="!isCollapsed">首页</span>
        </router-link>

        <div class="nav-group">
          <div class="nav-group-title" v-show="!isCollapsed">作业管理</div>
          <router-link to="/homework-check" class="nav-item" active-class="active">
            <span class="nav-icon">📋</span><span class="nav-text" v-show="!isCollapsed">作业提交情况统计</span>
          </router-link>
          <router-link to="/homework-submit/teacher" class="nav-item" active-class="active">
            <span class="nav-icon">👨‍🏫</span><span class="nav-text" v-show="!isCollapsed">作业提交(教师)</span>
          </router-link>
          <router-link to="/homework-submit/student" class="nav-item" active-class="active">
            <span class="nav-icon">👨‍🎓</span><span class="nav-text" v-show="!isCollapsed">作业提交(学生)</span>
          </router-link>
        </div>

        <div class="nav-group">
          <div class="nav-group-title" v-show="!isCollapsed">考勤管理</div>
          <router-link to="/attendance/teacher" class="nav-item" active-class="active">
            <span class="nav-icon">🎓</span><span class="nav-text" v-show="!isCollapsed">考勤管理(教师)</span>
          </router-link>
          <router-link to="/attendance/student" class="nav-item" active-class="active">
            <span class="nav-icon">📋</span><span class="nav-text" v-show="!isCollapsed">考勤登记(学生)</span>
          </router-link>
        </div>
      </nav>
      <button class="collapse-btn" @click="isCollapsed = !isCollapsed">
        {{ isCollapsed ? '→' : '←' }}
      </button>
    </aside>
    <main class="main-content">
      <router-view />
    </main>
  </div>
</template>

<script setup>
import { ref } from 'vue'
const isCollapsed = ref(false)
</script>

<style scoped>
.layout { display: flex; min-height: 100vh; width: 100%; }
.sidebar {
  width: 240px; background: linear-gradient(180deg, #1e3c72 0%, #2a5298 100%);
  color: #fff; display: flex; flex-direction: column; position: fixed;
  top: 0; left: 0; height: 100vh; z-index: 100; transition: width 0.3s;
  overflow-x: hidden;
}
.sidebar.collapsed { width: 64px; }
.sidebar-header { padding: 20px 16px; border-bottom: 1px solid rgba(255,255,255,0.1); }
.sidebar-header h1 { font-size: 18px; white-space: nowrap; margin: 0; }
.nav-menu { flex: 1; padding: 12px 8px; overflow-y: auto; }
.nav-group { margin-bottom: 8px; }
.nav-group-title { font-size: 11px; text-transform: uppercase; opacity: 0.5; padding: 8px 12px 4px; letter-spacing: 1px; }
.nav-item {
  display: flex; align-items: center; gap: 10px; padding: 10px 14px;
  color: rgba(255,255,255,0.8); text-decoration: none; border-radius: 8px;
  margin-bottom: 2px; transition: all 0.2s; font-size: 14px; white-space: nowrap;
}
.nav-item:hover { background: rgba(255,255,255,0.1); color: #fff; }
.nav-item.active { background: rgba(255,255,255,0.2); color: #fff; font-weight: 600; }
.nav-icon { font-size: 18px; flex-shrink: 0; }
.collapse-btn {
  padding: 12px; background: none; border: none; border-top: 1px solid rgba(255,255,255,0.1);
  color: rgba(255,255,255,0.6); cursor: pointer; font-size: 16px;
}
.collapse-btn:hover { color: #fff; background: rgba(255,255,255,0.05); }
.main-content {
  flex: 1; margin-left: 240px; min-height: 100vh; background: #f0f2f5;
  transition: margin-left 0.3s;
}
.sidebar.collapsed ~ .main-content { margin-left: 64px; }
</style>
