<template>
  <div class="page">
    <div v-if="!loggedIn" class="login-wrapper">
      <div class="login-card">
        <div class="login-icon">🔐</div>
        <h1>作业提交系统 - 教师端</h1>
        <div class="form-group"><label>账号</label><input v-model="loginForm.username" type="text" placeholder="请输入账号" @keyup.enter="handleLogin" /></div>
        <div class="form-group"><label>密码</label><input v-model="loginForm.password" type="password" placeholder="请输入密码" @keyup.enter="handleLogin" /></div>
        <p v-if="loginError" class="login-error">{{ loginError }}</p>
        <button class="btn btn-login" @click="handleLogin">登 录</button>
      </div>
    </div>
    <div v-else>
      <div class="header">
        <h1>📚 作业提交系统 - 教师端</h1>
        <div class="header-right">
          <span class="welcome">欢迎，{{ loginForm.username }}</span>
          <button class="btn btn-sm btn-outline" @click="loggedIn=false">退出</button>
        </div>
      </div>
      <div class="tabs">
        <button class="tab" :class="{active:activeTab==='publish'}" @click="activeTab='publish'">📝 发布作业</button>
        <button class="tab" :class="{active:activeTab==='manage'}" @click="activeTab='manage'">📋 管理作业</button>
        <button class="tab" :class="{active:activeTab==='students'}" @click="activeTab='students'">👥 学生管理</button>
      </div>
      <!-- 发布作业 -->
      <div v-if="activeTab==='publish'" class="card">
        <h2>发布新作业</h2>
        <div class="form-group"><label>作业标题</label><input v-model="newHw.title" type="text" placeholder="如：第一次作业" /></div>
        <div class="form-group"><label>作业内容</label><textarea v-model="newHw.description" rows="4" placeholder="描述作业要求..."></textarea></div>
        <div class="form-group"><label>截止时间（可选）</label><input v-model="newHw.deadline" type="datetime-local" /></div>
        <button class="btn btn-primary" @click="publishHomework">发布作业</button>
      </div>
      <!-- 管理作业 -->
      <div v-if="activeTab==='manage'">
        <div v-if="!selectedHw">
          <div v-if="homeworkList.length===0" class="card"><p class="hint">暂无作业，请先发布</p></div>
          <div v-for="hw in homeworkList" :key="hw.id" class="card hw-card">
            <div class="hw-card-header">
              <h3>{{ hw.title }}</h3>
              <span class="badge">{{ getHwSubmissions(hw.id).length }} 人提交</span>
            </div>
            <p class="hw-desc">{{ hw.description }}</p>
            <div class="hw-meta">
              <span v-if="hw.deadline">截止：{{ formatDate(hw.deadline) }}</span>
              <span>发布：{{ formatDate(hw.createdAt) }}</span>
            </div>
            <div class="hw-actions">
              <button class="btn btn-sm btn-primary" @click="viewSubmissions(hw)">查看提交</button>
              <button class="btn btn-sm btn-danger" @click="deleteHomework(hw.id)">删除</button>
            </div>
          </div>
        </div>
        <div v-else>
          <button class="btn btn-sm btn-outline" @click="selectedHw=null" style="margin-bottom:16px">← 返回列表</button>
          <div class="card">
            <h2>{{ selectedHw.title }} - 提交情况</h2>
            <div class="hw-actions" style="margin-bottom:16px">
              <button class="btn btn-sm btn-primary" @click="autoGrade">自动批阅</button>
              <button class="btn btn-sm btn-export" @click="exportXls">导出XLS</button>
              <button class="btn btn-sm btn-export" @click="exportTxt">导出TXT</button>
            </div>
            <table class="data-table" v-if="selectedSubmissions.length>0">
              <thead><tr><th>学号</th><th>姓名</th><th>提交时间</th><th>文件数</th><th>等级</th><th>操作</th></tr></thead>
              <tbody>
                <tr v-for="sub in selectedSubmissions" :key="sub.id">
                  <td>{{ sub.studentId }}</td><td>{{ sub.studentName }}</td>
                  <td>{{ formatDate(sub.submittedAt) }}</td>
                  <td>{{ (sub.files||[]).length }}</td>
                  <td><span v-if="sub.grade && sub.grade.level" class="grade-tag" :class="'level-'+sub.grade.level">{{ levelText(sub.grade.level) }}</span><span v-else class="hint">未批阅</span></td>
                  <td><button class="btn btn-sm" @click="openGradeModal(sub)" style="background:#667eea;color:#fff;padding:4px 12px;font-size:12px">批阅</button></td>
                </tr>
              </tbody>
            </table>
            <p v-else class="hint">暂无提交</p>
          </div>
        </div>
      </div>
      <!-- 学生管理 -->
      <div v-if="activeTab==='students'" class="card">
        <h2>学生管理</h2>
        <div class="student-form">
          <div class="form-group"><label>年级</label><input v-model="studentForm.grade" type="text" placeholder="如：2024" /></div>
          <div class="form-group"><label>班级</label><input v-model="studentForm.className" type="text" placeholder="如：计算机1班" /></div>
        </div>
        <div class="student-actions">
          <button class="btn btn-sm btn-primary" @click="addStudentManual">手动添加</button>
          <label class="btn btn-sm btn-import">📥 导入Excel<input type="file" accept=".xlsx,.xls" @change="importStudents" style="display:none" /></label>
          <button class="btn btn-sm btn-danger" @click="clearStudents">清空学生</button>
        </div>
        <p class="roster-count">当前学生数：<strong>{{ students.length }}</strong></p>
        <div class="form-group" v-if="selectedClass"><label>筛选班级</label>
          <select v-model="filterClass"><option value="">全部班级</option><option v-for="c in allClasses" :key="c" :value="c">{{ c }}</option></select>
        </div>
        <table class="data-table" v-if="filteredStudents.length>0">
          <thead><tr><th>学号</th><th>姓名</th><th>年级</th><th>班级</th></tr></thead>
          <tbody><tr v-for="s in filteredStudents" :key="s.id"><td>{{ s.id }}</td><td>{{ s.name }}</td><td>{{ s.grade }}</td><td>{{ s.class }}</td></tr></tbody>
        </table>
      </div>
    </div>
    <!-- 批阅弹窗 -->
    <div v-if="gradeModal" class="modal-overlay" @click.self="gradeModal=null">
      <div class="modal">
        <h3>批阅作业</h3>
        <p>学生：{{ gradeModal.studentName }}（{{ gradeModal.studentId }}）</p>
        <div class="form-group"><label>等级</label>
          <select v-model="gradeForm.level"><option value="">请选择</option><option value="A">A-优秀</option><option value="B">B-良好</option><option value="C">C-合格</option><option value="D">D-不合格</option></select>
        </div>
        <div class="form-group"><label>评语</label><textarea v-model="gradeForm.comment" rows="3"></textarea></div>
        <div class="modal-actions">
          <button class="btn btn-cancel" @click="gradeModal=null">取消</button>
          <button class="btn btn-primary" @click="doGrade">确认批阅</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import * as XLSX from 'xlsx'

const ACCOUNT = { username: 'adimin', password: '202609' }
const loggedIn = ref(false)
const loginForm = reactive({ username: '', password: '' })
const loginError = ref('')
const activeTab = ref('publish')

function handleLogin() {
  if (loginForm.username === ACCOUNT.username && loginForm.password === ACCOUNT.password) { loggedIn.value = true; loginError.value = '' }
  else { loginError.value = '账号或密码错误' }
}

// Data helpers
function getStudents() { return JSON.parse(localStorage.getItem('hw_students') || '[]') }
function getHomework() { return JSON.parse(localStorage.getItem('hw_homework') || '[]') }
function getSubmissions() { return JSON.parse(localStorage.getItem('hw_submissions') || '[]') }

const students = computed(() => getStudents())
const homeworkList = computed(() => getHomework().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)))
const selectedHw = ref(null)
const selectedSubmissions = computed(() => selectedHw.value ? getHwSubmissions(selectedHw.value.id) : [])

function getHwSubmissions(hwId) { return getSubmissions().filter(s => s.homeworkId === hwId) }

// Publish
const newHw = reactive({ title: '', description: '', deadline: '' })
function publishHomework() {
  if (!newHw.title || !newHw.description) { alert('请填写标题和内容'); return }
  const hw = getHomework()
  hw.push({ id: Date.now().toString(), title: newHw.title, description: newHw.description, deadline: newHw.deadline, createdAt: new Date().toISOString() })
  localStorage.setItem('hw_homework', JSON.stringify(hw))
  newHw.title = ''; newHw.description = ''; newHw.deadline = ''
  alert('作业发布成功！')
}

// View submissions
function viewSubmissions(hw) { selectedHw.value = hw }

// Grade
const gradeModal = ref(null)
const gradeForm = reactive({ level: '', comment: '' })
function openGradeModal(sub) { gradeModal.value = sub; gradeForm.level = sub.grade?.level || ''; gradeForm.comment = sub.grade?.comment || '' }
function doGrade() {
  const subs = getSubmissions()
  const idx = subs.findIndex(s => s.id === gradeModal.value.id)
  if (idx >= 0) {
    subs[idx].grade = { level: gradeForm.level, comment: gradeForm.comment, gradedAt: new Date().toISOString(), gradedBy: 'manual' }
    localStorage.setItem('hw_submissions', JSON.stringify(subs))
  }
  gradeModal.value = null
}

// Auto grade
function autoGrade() {
  if (!selectedHw.value) return
  if (!confirm('确定要自动批阅该作业的所有提交吗？')) return
  const subs = getSubmissions()
  const hw = getHomework().find(h => h.id === selectedHw.value.id)
  const deadline = hw?.deadline ? new Date(hw.deadline) : null
  const hwSubs = subs.filter(s => s.homeworkId === selectedHw.value.id)
  hwSubs.forEach(sub => {
    if (sub.grade && sub.grade.gradedBy === 'manual') return
    const content = (sub.content || '').trim()
    const len = content.length
    const isLate = deadline && new Date(sub.submittedAt) > deadline
    let level, comment
    if (!content) { level = 'D'; comment = '未提交作业内容' }
    else if (len >= 500) { level = 'A'; comment = '内容充实详尽' }
    else if (len >= 300) { level = 'B'; comment = '内容较为完整' }
    else if (len >= 100) { level = 'C'; comment = '内容偏少，需补充' }
    else { level = 'D'; comment = '内容过少，请认真完成' }
    if (isLate) { level = level === 'A' ? 'B' : level === 'B' ? 'C' : level === 'C' ? 'D' : 'D'; comment += '（迟交）' }
    sub.grade = { level, comment, gradedBy: 'auto', gradedAt: new Date().toISOString() }
  })
  localStorage.setItem('hw_submissions', JSON.stringify(subs))
  alert('自动批阅完成！')
}

// Delete homework
function deleteHomework(id) {
  if (!confirm('确定删除此作业及相关提交？')) return
  let hw = getHomework().filter(h => h.id !== id)
  let subs = getSubmissions().filter(s => s.homeworkId !== id)
  localStorage.setItem('hw_homework', JSON.stringify(hw))
  localStorage.setItem('hw_submissions', JSON.stringify(subs))
}

// Student management
const studentForm = reactive({ grade: '', className: '' })
const filterClass = ref('')
const allClasses = computed(() => [...new Set(getStudents().map(s => s.class).filter(Boolean))])
const selectedClass = computed(() => allClasses.value.length > 0)
const filteredStudents = computed(() => {
  const list = getStudents()
  return filterClass.value ? list.filter(s => s.class === filterClass.value) : list
})

function addStudentManual() {
  if (!studentForm.grade || !studentForm.className) { alert('请填写年级和班级'); return }
  const id = prompt('请输入学号：')
  if (!id) return
  const name = prompt('请输入姓名：')
  if (!name) return
  const students = getStudents()
  if (students.find(s => s.id === id)) { alert('学号已存在'); return }
  students.push({ id, name, grade: studentForm.grade, class: studentForm.className })
  localStorage.setItem('hw_students', JSON.stringify(students))
  alert('添加成功！')
}

function importStudents(e) {
  const file = e.target.files[0]
  if (!file) return
  if (!studentForm.grade || !studentForm.className) { alert('请先填写年级和班级'); e.target.value = ''; return }
  const reader = new FileReader()
  reader.onload = (ev) => {
    try {
      const data = new Uint8Array(ev.target.result)
      const wb = XLSX.read(data, { type: 'array' })
      const sheet = wb.Sheets[wb.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' })
      const keys = Object.keys(rows[0] || {})
      const idKey = keys.find(k => /学号|id|no/i.test(k))
      const nameKey = keys.find(k => /姓名|name/i.test(k))
      if (!idKey || !nameKey) { alert('Excel必须包含学号和姓名列'); return }
      const students = getStudents()
      const filtered = students.filter(s => s.class !== studentForm.className)
      const newStudents = rows.map(r => ({ id: String(r[idKey]).trim(), name: String(r[nameKey]).trim(), grade: studentForm.grade, class: studentForm.className })).filter(s => s.id && s.name)
      const updated = [...filtered, ...newStudents]
      localStorage.setItem('hw_students', JSON.stringify(updated))
      alert('导入成功！共' + newStudents.length + '人')
    } catch (err) { alert('解析失败：' + err.message) }
    e.target.value = ''
  }
  reader.readAsArrayBuffer(file)
}

function clearStudents() {
  if (!confirm('确定清空所有学生？')) return
  localStorage.setItem('hw_students', JSON.stringify([]))
}

// Export
function exportXls() {
  if (!selectedHw.value) return
  const hw = selectedHw.value
  const subs = getHwSubmissions(hw.id)
  const allStu = getStudents()
  const data = [['学号','姓名','班级','是否提交','提交时间','等级','评语']]
  allStu.forEach(s => {
    const sub = subs.find(sb => sb.studentId === s.id)
    data.push([s.id, s.name, s.class || '', sub ? '是' : '否', sub ? formatDate(sub.submittedAt) : '', sub?.grade?.level || '', sub?.grade?.comment || ''])
  })
  const ws = XLSX.utils.aoa_to_sheet(data)
  ws['!cols'] = [{wch:12},{wch:8},{wch:12},{wch:8},{wch:18},{wch:6},{wch:20}]
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, '作业完成情况')
  XLSX.writeFile(wb, hw.title + '_作业完成情况.xlsx')
}

function exportTxt() {
  if (!selectedHw.value) return
  const hw = selectedHw.value
  const subs = getHwSubmissions(hw.id)
  let txt = hw.title + ' - 作业完成情况\n' + '='.repeat(50) + '\n\n'
  subs.forEach(sub => {
    txt += '学号: ' + sub.studentId + ' | 姓名: ' + sub.studentName + '\n'
    txt += '  提交时间: ' + formatDate(sub.submittedAt) + '\n'
    if (sub.grade?.level) txt += '  等级: ' + sub.grade.level + ' | 评语: ' + (sub.grade.comment || '') + '\n'
    txt += '\n'
  })
  const blob = new Blob([txt], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url; a.download = hw.title + '_报告.txt'; a.click()
  URL.revokeObjectURL(url)
}

function formatDate(d) {
  if (!d) return ''
  const dt = new Date(d)
  return dt.getFullYear() + '-' + String(dt.getMonth()+1).padStart(2,'0') + '-' + String(dt.getDate()).padStart(2,'0') + ' ' + String(dt.getHours()).padStart(2,'0') + ':' + String(dt.getMinutes()).padStart(2,'0')
}
function levelText(l) { return {A:'优秀',B:'良好',C:'合格',D:'不合格'}[l] || '' }
</script>

<style scoped>
.page { min-height: 100vh; background: #f0f2f5; padding: 0; }
.login-wrapper { display: flex; align-items: center; justify-content: center; min-height: 100vh; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
.login-card { background: #fff; border-radius: 16px; padding: 40px; width: 100%; max-width: 400px; box-shadow: 0 20px 60px rgba(0,0,0,0.3); text-align: center; }
.login-icon { font-size: 56px; margin-bottom: 12px; }
.login-card h1 { font-size: 20px; color: #333; margin-bottom: 24px; }
.login-card .form-group { text-align: left; margin-bottom: 14px; }
.login-card input { width: 100%; padding: 10px 14px; border: 2px solid #e0e0e0; border-radius: 8px; font-size: 14px; box-sizing: border-box; }
.login-card input:focus { outline: none; border-color: #667eea; }
.login-card label { display: block; font-size: 13px; font-weight: 600; color: #333; margin-bottom: 5px; }
.login-error { color: #e74c3c; font-size: 13px; margin-bottom: 10px; }
.btn-login { width: 100%; padding: 12px; background: linear-gradient(135deg, #667eea, #764ba2); color: #fff; border: none; border-radius: 10px; font-size: 16px; font-weight: 600; cursor: pointer; }
.header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px 30px; display: flex; justify-content: space-between; align-items: center; }
.header h1 { font-size: 22px; margin: 0; }
.header-right { display: flex; align-items: center; gap: 12px; }
.welcome { color: rgba(255,255,255,0.85); font-size: 14px; }
.tabs { display: flex; gap: 0; background: white; border-bottom: 2px solid #f0f0f0; padding: 0 20px; }
.tab { padding: 14px 24px; border: none; background: none; cursor: pointer; font-size: 14px; color: #666; border-bottom: 3px solid transparent; transition: all 0.2s; }
.tab:hover { color: #667eea; }
.tab.active { color: #667eea; border-bottom-color: #667eea; font-weight: 600; }
.card { background: white; border-radius: 12px; padding: 24px; margin: 20px; box-shadow: 0 2px 12px rgba(0,0,0,0.06); }
.card h2 { margin: 0 0 16px; font-size: 18px; color: #333; }
.form-group { margin-bottom: 14px; }
.form-group label { display: block; font-size: 13px; font-weight: 600; color: #333; margin-bottom: 5px; }
.form-group input, .form-group textarea, .form-group select { width: 100%; padding: 9px 12px; border: 2px solid #e0e0e0; border-radius: 8px; font-size: 14px; box-sizing: border-box; }
.form-group input:focus, .form-group textarea:focus, .form-group select:focus { outline: none; border-color: #667eea; }
.btn { padding: 9px 20px; border: none; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; }
.btn-sm { padding: 6px 14px; font-size: 12px; }
.btn-primary { background: #667eea; color: #fff; }
.btn-primary:hover { background: #5a6fd6; }
.btn-danger { background: #e74c3c; color: #fff; }
.btn-danger:hover { background: #c0392b; }
.btn-outline { background: transparent; color: rgba(255,255,255,0.85); border: 1px solid rgba(255,255,255,0.4); }
.btn-export { background: #27ae60; color: #fff; }
.btn-import { background: #8e44ad; color: #fff; cursor: pointer; }
.btn-cancel { background: #e0e0e0; color: #333; }
.hw-card { border-left: 4px solid #667eea; }
.hw-card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.hw-card-header h3 { margin: 0; font-size: 16px; }
.badge { background: #667eea; color: white; padding: 3px 10px; border-radius: 12px; font-size: 12px; }
.hw-desc { color: #666; font-size: 13px; margin-bottom: 8px; }
.hw-meta { display: flex; gap: 16px; color: #999; font-size: 12px; margin-bottom: 10px; }
.hw-actions { display: flex; gap: 8px; }
.student-form { display: flex; gap: 12px; }
.student-form .form-group { flex: 1; }
.student-actions { display: flex; gap: 8px; margin-bottom: 12px; }
.roster-count { font-size: 13px; color: #555; margin-bottom: 12px; }
.data-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.data-table th { background: #f5f7fa; padding: 10px 12px; text-align: left; font-weight: 600; color: #555; border-bottom: 2px solid #e8e8e8; }
.data-table td { padding: 10px 12px; border-bottom: 1px solid #f0f0f0; }
.data-table tr:hover { background: #fafbfc; }
.grade-tag { padding: 2px 10px; border-radius: 4px; font-size: 12px; font-weight: 700; color: white; }
.grade-tag.level-A { background: #27ae60; } .grade-tag.level-B { background: #3498db; }
.grade-tag.level-C { background: #f39c12; } .grade-tag.level-D { background: #e74c3c; }
.hint { color: #999; font-style: italic; }
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 100; }
.modal { background: #fff; border-radius: 14px; padding: 30px; width: 90%; max-width: 420px; box-shadow: 0 20px 60px rgba(0,0,0,0.3); }
.modal h3 { margin: 0 0 16px; font-size: 18px; }
.modal-actions { display: flex; gap: 10px; justify-content: flex-end; margin-top: 16px; }
.sub-content { margin: 12px 0; padding: 12px; background: #f8f9fa; border-radius: 8px; }
.sub-content strong { display: block; margin-bottom: 8px; color: #333; }
.content-text { white-space: pre-wrap; line-height: 1.8; color: #444; font-size: 14px; max-height: 300px; overflow-y: auto; padding: 10px; background: white; border-radius: 6px; border: 1px solid #e8e8e8; }
</style>
