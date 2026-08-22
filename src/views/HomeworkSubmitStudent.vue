<template>
  <div class="page">
    <div class="header"><h1>📚 作业提交系统 - 学生端</h1></div>
    <!-- 登录 -->
    <div v-if="!currentUser" class="login-card">
      <h2>学生登录</h2>
      <div class="form-group"><label>选择年级</label>
        <select v-model="loginGrade" @change="loginClass=''; loginStudent=''">
          <option value="">-- 请选择年级 --</option>
          <option v-for="g in grades" :key="g" :value="g">{{ g }}</option>
        </select>
      </div>
      <div class="form-group"><label>选择班级</label>
        <select v-model="loginClass" @change="loginStudent=''">
          <option value="">-- 请先选择年级 --</option>
          <option v-for="c in classes" :key="c" :value="c">{{ c }}</option>
        </select>
      </div>
      <div class="form-group"><label>选择学生</label>
        <select v-model="loginStudent">
          <option value="">-- 请先选择班级 --</option>
          <option v-for="s in classStudents" :key="s.id" :value="s.id">{{ s.id }} - {{ s.name }}</option>
        </select>
      </div>
      <button class="btn btn-login" @click="login">登 录</button>
      <p v-if="loginError" class="error-msg">{{ loginError }}</p>
    </div>
    <!-- 主内容 -->
    <div v-else>
      <div class="welcome-bar">
        <div class="info">欢迎，<strong>{{ currentUser.name }}</strong>（学号：{{ currentUser.id }} | {{ currentUser.grade }}{{ currentUser.class }}）</div>
        <button class="logout-btn" @click="currentUser=null">退出登录</button>
      </div>
      <h2 class="section-title">📋 作业列表</h2>
      <div v-if="myHomeworkList.length === 0" class="empty-state"><div class="icon">📭</div><p>暂无作业</p></div>
      <div class="homework-list">
        <div v-for="hw in myHomeworkList" :key="hw.id" class="homework-card">
          <h3>{{ hw.title }}</h3>
          <div class="desc">{{ hw.description }}</div>
          <div class="meta">
            <span v-if="hw.deadline">截止：{{ formatDate(hw.deadline) }}</span>
            <span v-else>无截止时间</span>
            <span v-if="getSubmission(hw.id)" class="status-badge status-submitted">已提交</span>
            <span v-else class="status-badge status-pending">待提交</span>
          </div>
          <div v-if="getSubmission(hw.id) && getSubmission(hw.id).grade" class="grade-card" :class="'level-'+getSubmission(hw.id).grade.level">
            <div class="grade-header">
              <span class="grade-level-tag" :class="getSubmission(hw.id).grade.level">{{ levelText(getSubmission(hw.id).grade.level) }}</span>
              <span class="grade-score">{{ formatDate(getSubmission(hw.id).grade.gradedAt) }}</span>
            </div>
            <div class="grade-comment"><span class="label">评语：</span>{{ getSubmission(hw.id).grade.comment }}</div>
          </div>
          <button v-if="!getSubmission(hw.id)" class="btn btn-small" @click="openSubmit(hw)">提交作业</button>
        </div>
      </div>
    </div>
    <!-- 提交弹窗 -->
    <div v-if="submitModal" class="modal-overlay" @click.self="submitModal=null">
      <div class="modal">
        <h2>提交作业</h2>
        <div class="hw-info">{{ submitModal.title }}</div>
        <div class="form-group"><label>作业内容</label>
          <textarea v-model="submitContent" placeholder="请在此输入作业内容..." rows="12" style="min-height:200px;font-size:15px;line-height:1.8;"></textarea>
        </div>
          <div class="modal-buttons">
          <button class="cancel-btn" @click="submitModal=null">取消</button>
          <button class="submit-btn" @click="doSubmit" :disabled="submitting">{{ submitting ? '提交中...' : '提交' }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const loginGrade = ref('')
const loginClass = ref('')
const loginStudent = ref('')
const loginError = ref('')
const currentUser = ref(null)

function getStudents() { return JSON.parse(localStorage.getItem('hw_students') || '[]') }
function getHomework() { return JSON.parse(localStorage.getItem('hw_homework') || '[]') }
function getSubmissions() { return JSON.parse(localStorage.getItem('hw_submissions') || '[]') }

const grades = computed(() => [...new Set(getStudents().map(s => s.grade).filter(Boolean))])
const classes = computed(() => {
  if (!loginGrade.value) return []
  return [...new Set(getStudents().filter(s => s.grade === loginGrade.value).map(s => s.class).filter(Boolean))]
})
const classStudents = computed(() => {
  if (!loginGrade.value || !loginClass.value) return []
  return getStudents().filter(s => s.grade === loginGrade.value && s.class === loginClass.value)
})

function login() {
  const students = getStudents()
  const s = students.find(st => st.id === loginStudent.value)
  if (!s) { loginError.value = '请选择学生'; return }
  currentUser.value = s
  loginError.value = ''
}

const myHomeworkList = computed(() => {
  return getHomework().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
})

function getSubmission(hwId) {
  if (!currentUser.value) return null
  return getSubmissions().find(s => s.studentId === currentUser.value.id && s.homeworkId === hwId) || null
}

const submitModal = ref(null)
const submitContent = ref('')
const submitting = ref(false)

function openSubmit(hw) {
  submitModal.value = hw
  submitContent.value = ''
    submitting.value = false
}


function doSubmit() {
  if (!submitModal.value || !currentUser.value) return
  if (!submitContent.value.trim()) { alert('请输入作业内容'); return }
  const subs = getSubmissions()
  const existing = subs.findIndex(s => s.studentId === currentUser.value.id && s.homeworkId === submitModal.value.id)
  const newSub = {
    id: existing >= 0 ? subs[existing].id : Date.now().toString(),
    studentId: currentUser.value.id,
    studentName: currentUser.value.name,
    homeworkId: submitModal.value.id,
    content: submitContent.value,
    submittedAt: new Date().toISOString(),
    grade: existing >= 0 ? subs[existing].grade : null
  }
  if (existing >= 0) subs[existing] = newSub; else subs.push(newSub)
  localStorage.setItem('hw_submissions', JSON.stringify(subs))
  submitModal.value = null
  alert('作业提交成功！')
}


function formatDate(d) {
  if (!d) return ''
  const dt = new Date(d)
  return dt.getFullYear() + '-' + String(dt.getMonth()+1).padStart(2,'0') + '-' + String(dt.getDate()).padStart(2,'0') + ' ' + String(dt.getHours()).padStart(2,'0') + ':' + String(dt.getMinutes()).padStart(2,'0')
}
function levelText(l) { return { A:'优秀', B:'良好', C:'合格', D:'不合格' }[l] || '' }
</script>

<style scoped>
.page { min-height: 100vh; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; }
.header { text-align: center; color: white; margin-bottom: 20px; }
.header h1 { font-size: 1.8em; }
.login-card { background: white; border-radius: 16px; padding: 36px; max-width: 450px; margin: 0 auto 30px; box-shadow: 0 20px 60px rgba(0,0,0,0.2); }
.login-card h2 { text-align: center; color: #333; margin-bottom: 20px; }
.form-group { margin-bottom: 16px; }
.form-group label { display: block; margin-bottom: 6px; color: #555; font-weight: 500; font-size: 14px; }
.form-group select, .form-group textarea { width: 100%; padding: 10px 14px; border: 2px solid #e0e0e0; border-radius: 8px; font-size: 15px; box-sizing: border-box; }
.form-group select:focus, .form-group textarea:focus { outline: none; border-color: #667eea; }
.btn-login { width: 100%; padding: 12px; background: linear-gradient(135deg, #667eea, #764ba2); color: white; border: none; border-radius: 8px; font-size: 16px; font-weight: 600; cursor: pointer; }
.btn-login:hover { opacity: 0.9; }
.error-msg { color: #e74c3c; text-align: center; margin-top: 10px; font-size: 14px; }
.welcome-bar { background: white; border-radius: 12px; padding: 16px 24px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 4px 15px rgba(0,0,0,0.1); }
.welcome-bar .info { color: #333; }
.welcome-bar .info strong { color: #667eea; }
.logout-btn { padding: 8px 20px; background: #e74c3c; color: white; border: none; border-radius: 6px; cursor: pointer; }
.section-title { color: white; font-size: 1.3em; margin-bottom: 14px; }
.homework-list { display: grid; gap: 16px; }
.homework-card { background: white; border-radius: 12px; padding: 22px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); }
.homework-card h3 { color: #333; margin-bottom: 8px; }
.homework-card .desc { color: #666; margin-bottom: 10px; line-height: 1.6; }
.homework-card .meta { display: flex; justify-content: space-between; align-items: center; color: #999; font-size: 13px; }
.status-badge { padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; }
.status-submitted { background: #d4edda; color: #155724; }
.status-pending { background: #fff3cd; color: #856404; }
.grade-card { margin-top: 12px; padding: 12px; border-radius: 8px; border-left: 4px solid #ccc; }
.grade-card.level-A { background: #e8f8f0; border-left-color: #27ae60; }
.grade-card.level-B { background: #e8f4fd; border-left-color: #3498db; }
.grade-card.level-C { background: #fff9e6; border-left-color: #f39c12; }
.grade-card.level-D { background: #fde8e8; border-left-color: #e74c3c; }
.grade-header { display: flex; align-items: center; gap: 10px; margin-bottom: 6px; }
.grade-level-tag { padding: 3px 12px; border-radius: 4px; font-size: 13px; font-weight: 700; color: white; }
.grade-level-tag.A { background: #27ae60; } .grade-level-tag.B { background: #3498db; }
.grade-level-tag.C { background: #f39c12; } .grade-level-tag.D { background: #e74c3c; }
.grade-comment { color: #555; font-size: 13px; background: rgba(255,255,255,0.6); padding: 6px 10px; border-radius: 6px; }
.btn-small { margin-top: 10px; padding: 8px 20px; background: linear-gradient(135deg, #667eea, #764ba2); color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; }
.empty-state { text-align: center; color: white; padding: 40px; opacity: 0.8; }
.empty-state .icon { font-size: 3em; margin-bottom: 10px; }
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.modal { background: white; border-radius: 16px; padding: 30px; width: 90%; max-width: 550px; max-height: 85vh; overflow-y: auto; }
.modal h2 { color: #333; margin-bottom: 8px; }
.hw-info { color: #666; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid #eee; }
.modal-buttons { display: flex; gap: 10px; justify-content: flex-end; margin-top: 16px; }
.cancel-btn { padding: 10px 20px; background: #e0e0e0; color: #333; border: none; border-radius: 8px; cursor: pointer; }
.submit-btn { padding: 10px 20px; background: linear-gradient(135deg, #667eea, #764ba2); color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; }
.submit-btn:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
