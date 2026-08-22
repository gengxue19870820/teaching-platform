import { createApp } from 'vue'
import { createRouter, createWebHashHistory } from 'vue-router'
import App from './App.vue'
import './style.css'

import Home from './views/Home.vue'
import HomeworkCheck from './views/HomeworkCheck.vue'
import HomeworkSubmitStudent from './views/HomeworkSubmitStudent.vue'
import HomeworkSubmitTeacher from './views/HomeworkSubmitTeacher.vue'
import AttendanceStudent from './views/AttendanceStudent.vue'
import AttendanceTeacher from './views/AttendanceTeacher.vue'

const routes = [
  { path: '/', component: Home },
  { path: '/homework-check', name: 'HomeworkCheck', component: HomeworkCheck },
  { path: '/homework-submit/student', name: 'HomeworkSubmitStudent', component: HomeworkSubmitStudent },
  { path: '/homework-submit/teacher', name: 'HomeworkSubmitTeacher', component: HomeworkSubmitTeacher },
  { path: '/attendance/student', name: 'AttendanceStudent', component: AttendanceStudent },
  { path: '/attendance/teacher', name: 'AttendanceTeacher', component: AttendanceTeacher }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

const app = createApp(App)
app.use(router)
app.mount('#app')
