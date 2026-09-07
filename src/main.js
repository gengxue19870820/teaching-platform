import { createApp } from 'vue'
import { createRouter, createWebHashHistory } from 'vue-router'
import App from './App.vue'
import './style.css'

import Home from './views/Home.vue'
import Dashboard from './views/Dashboard.vue'
import Students from './views/Students.vue'
import Behaviors from './views/Behaviors.vue'
import Seats from './views/Seats.vue'
import HomeworkCheck from './views/HomeworkCheck.vue'
import HomeworkSubmitTeacher from './views/HomeworkSubmitTeacher.vue'
import AttendanceTeacher from './views/AttendanceTeacher.vue'
import ClassTools from './views/ClassTools.vue'
import SyncSettings from './views/SyncSettings.vue'

const routes = [
  { path: '/', component: Dashboard },
  { path: '/home', component: Home },
  { path: '/students', component: Students },
  { path: '/behaviors', component: Behaviors },
  { path: '/seats', component: Seats },
  { path: '/homework-check', name: 'HomeworkCheck', component: HomeworkCheck },
  { path: '/homework-submit/teacher', name: 'HomeworkSubmitTeacher', component: HomeworkSubmitTeacher },
  { path: '/attendance/teacher', name: 'AttendanceTeacher', component: AttendanceTeacher },
  { path: '/class-tools', name: 'ClassTools', component: ClassTools },
  { path: '/sync-settings', name: 'SyncSettings', component: SyncSettings },
  { path: '/:pathMatch(.*)*', redirect: '/' }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

const app = createApp(App)
app.config.errorHandler = (err, instance, info) => {
  console.error('Vue错误:', err, info)
}
app.use(router)
router.isReady().then(() => {
  console.log('路由就绪，当前路径:', router.currentRoute.value.fullPath)
  app.mount('#app')
})
