<template>
  <div class="dashboard">
    <div class="ws-title">📊 仪表盘</div>

    <!-- 数据速览 -->
    <div class="stat-grid">
      <div class="stat-card">
        <div class="stat-icon stat-blue">👥</div>
        <div class="stat-info"><div class="stat-label">本班学生总人数</div><div class="stat-value">{{ curStudents().length }}</div></div>
      </div>
      <div class="stat-card">
        <div class="stat-icon stat-orange">📋</div>
        <div class="stat-info"><div class="stat-label">待办未完成</div><div class="stat-value">{{ pendingTodoCount }}</div></div>
      </div>
      <div class="stat-card">
        <div class="stat-icon stat-green">📅</div>
        <div class="stat-info"><div class="stat-label">本周排课</div><div class="stat-value">{{ weekLessonCount }}节</div></div>
      </div>
    </div>

    <!-- 上课计时 -->
    <div class="class-timer-panel">
      <div class="ctp-left">
        <div class="ctp-class">当前班级：<strong>{{ curInfo()?.name || '—' }}</strong></div>
        <div class="ctp-count">学生 {{ curStudents().length }} 人</div>
      </div>
      <div class="ctp-center">
        <div v-if="!classStarted" class="ctp-before">
          <button class="btn btn-start-class" @click="startClass">🎯 上课</button>
          <span class="ctp-hint">点击开始上课，考勤计时50分钟</span>
        </div>
        <div v-else class="ctp-during">
          <div class="timer-display" :class="{ 'timer-warn': timerRemain < 600 }">
            <span class="timer-icon">⏱️</span>
            <span class="timer-text">{{ timerDisplay }}</span>
          </div>
          <div class="timer-status" :class="timerRemain < 600 ? 'status-warn' : ''">
            {{ timerRemain > 0 ? '考勤进行中，截止还剩 ' + Math.ceil(timerRemain / 60) + ' 分钟' : '⏰ 考勤已截止' }}
          </div>
        </div>
      </div>
      <div class="ctp-right">
        <div class="ctp-att-stats" v-if="classStarted">
          <span class="att-ok">✅ 已签到 {{ attOnTimeCount }}</span>
          <span class="att-no">❌ 未签到 {{ attAbsentCount }}</span>
        </div>
        <button v-if="classStarted" class="btn btn-sm btn-danger" @click="stopClass">结束上课</button>
      </div>
    </div>

    <div class="two-col">
      <!-- 本周课表 -->
      <div class="panel">
        <div class="panel-header">
          <span class="panel-title">📅 本周课表 <span class="week-badge" :class="'wb-' + currentWeekType">第{{ currentWeekNum }}周 · {{ currentWeekLabel }}</span></span>
          <div class="panel-btns">
            <button class="btn btn-sm btn-purple" @click="downloadTimetableTemplate">📄 下载模板</button>
            <label class="btn btn-sm btn-purple import-label">📥 导入课表<input type="file" accept=".xlsx,.xls" @change="doImportTimetable" style="display:none" /></label>
            <button class="btn btn-sm btn-primary" @click="editTimetable = true">编辑课表</button>
          </div>
        </div>
        <div v-if="ttImportResult" class="tt-import-result">
          <span>✅ 成功导入 <strong>{{ ttImportResult }}</strong> 节课程</span>
          <span class="tt-import-close" @click="ttImportResult = null">×</span>
        </div>
        <div class="tt-wrap" v-if="!editTimetable">
          <table class="tt-table">
            <thead><tr><th>节次</th><th v-for="d in dayLabels" :key="d">{{ d }}</th></tr></thead>
            <tbody>
              <tr v-for="p in 7" :key="p">
                <td class="period-cell">第{{ p }}节</td>
                <td v-for="d in 5" :key="d" class="lesson-cell" :class="{ 'has-week-diff': hasWeekDiff(d, p) }" @click="openLessonEdit(d, p)">
                  <template v-if="getLesson(d, p)">
                    <div class="lesson-name">{{ getLesson(d, p).name }}</div>
                    <div class="lesson-sub">{{ getLesson(d, p).className || '' }}</div>
                    <div v-if="hasWeekDiff(d, p)" class="week-diff-tag">{{ currentWeekType === 'odd' ? '单' : '双' }}</div>
                  </template>
                  <span v-else class="empty-slot">+</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- 待办事项 -->
      <div class="panel">
        <div class="panel-header">
          <span class="panel-title">📝 待办事项</span>
          <button class="btn btn-sm btn-primary" @click="showAddTodo = true">+ 添加</button>
        </div>
        <div class="todo-list">
          <div v-if="curTodos().length === 0" class="empty-hint">暂无待办事项</div>
          <div v-for="t in sortedTodos" :key="t.id" class="todo-item" :class="{ done: t.done }">
            <label class="todo-check"><input type="checkbox" :checked="t.done" @change="toggleTodo(t.id)" /><span class="checkmark"></span></label>
            <div class="todo-content">
              <div class="todo-text">{{ t.text }}</div>
              <div class="todo-meta">
                <span class="priority-tag" :class="'p-' + (t.priority || '中')">{{ t.priority || '中' }}</span>
                <span v-if="t.due" class="due-date" :class="{ overdue: isOverdue(t.due) }">{{ t.due }}</span>
              </div>
            </div>
            <span class="todo-del" @click="deleteTodo(t.id)">×</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 导入学生信息 -->
    <div class="panel import-panel">
      <div class="panel-header">
        <span class="panel-title">📥 导入学生信息</span>
      </div>
      <div class="import-body">
        <p class="import-desc">可一次性导入所教所有班级的学生信息（年级、班级、学号、姓名、机器号、分组等），系统自动按班级归类。</p>
        <div class="import-actions">
          <button class="btn btn-primary" @click="downloadTemplate">📄 下载导入模板</button>
          <label class="btn btn-purple import-label">📥 选择文件导入<input type="file" accept=".xlsx,.xls" @change="doImport" style="display:none" /></label>
        </div>
        <div v-if="importResult" class="import-result">
          <span>✅ 成功导入 <strong>{{ importResult.success }}</strong> 名学生</span>
          <span v-if="importResult.classes.length > 0" class="result-classes">涉及：{{ importResult.classes.join('、') }}</span>
        </div>
        <div class="class-overview">
          <div v-for="id in state.classOrder" :key="id" class="class-tag">
            {{ state.classes[id]?.info.name }} <span>{{ state.classes[id]?.data?.students?.length || 0 }}人</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 课表编辑弹窗 -->
    <div class="modal-overlay" v-if="editTimetable" @click.self="editTimetable = false">
      <div class="modal-box">
        <div class="modal-header">
          <span>编辑课表 <span class="week-badge week-badge-sm" :class="'wb-' + currentWeekType">第{{ currentWeekNum }}周 · {{ currentWeekLabel }}</span></span>
          <span class="modal-close" @click="editTimetable = false">×</span>
        </div>
        <div class="modal-body">
          <table class="tt-table edit-mode">
            <thead><tr><th>节次</th><th v-for="d in dayLabels" :key="d">{{ d }}</th></tr></thead>
            <tbody>
              <tr v-for="p in 7" :key="p">
                <td class="period-cell">第{{ p }}节</td>
                <td v-for="d in 5" :key="d" class="lesson-cell editable" :class="{ 'has-week-diff': hasWeekDiff(d, p) }" @click="openLessonEdit(d, p)">
                  <template v-if="getLesson(d, p)">
                    <div class="lesson-name">{{ getLesson(d, p).name }}</div>
                    <div class="lesson-sub">{{ getLesson(d, p).className || '' }}</div>
                    <div v-if="hasWeekDiff(d, p)" class="week-diff-tag">{{ currentWeekType === 'odd' ? '单' : '双' }}</div>
                  </template>
                  <span v-else class="empty-slot">点击添加</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- 课程编辑弹窗 -->
    <div class="modal-overlay" v-if="lessonModal" @click.self="lessonModal = null">
      <div class="modal-box small">
        <div class="modal-header">
          <span>{{ lessonData.name ? '编辑课程' : '添加课程' }}</span>
          <span class="modal-close" @click="lessonModal = null">×</span>
        </div>
        <div class="modal-body">
          <div class="form-group"><label>周次类型</label>
            <select v-model="lessonData.weekType">
              <option value="all">每周</option>
              <option value="odd">仅单周</option>
              <option value="even">仅双周</option>
            </select>
          </div>
          <div class="form-group"><label>课程名称</label><input v-model="lessonData.name" placeholder="如：信息科技" /></div>
          <div class="form-group"><label>授课班级</label><input v-model="lessonData.className" placeholder="如：7年级1班" /></div>
          <div class="form-group"><label>地点</label><input v-model="lessonData.location" placeholder="如：计算机教室1" /></div>
          <div class="form-actions">
            <button class="btn btn-danger" v-if="lessonData.name" @click="doRemoveLesson">删除</button>
            <button class="btn btn-primary" @click="doSaveLesson">保存</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 添加待办弹窗 -->
    <div class="modal-overlay" v-if="showAddTodo" @click.self="showAddTodo = false">
      <div class="modal-box small">
        <div class="modal-header">
          <span>添加待办</span>
          <span class="modal-close" @click="showAddTodo = false">×</span>
        </div>
        <div class="modal-body">
          <div class="form-group"><label>事项内容</label><input v-model="todoText" placeholder="请输入待办事项" /></div>
          <div class="form-group"><label>优先级</label>
            <select v-model="todoPriority"><option>高</option><option>中</option><option>低</option></select>
          </div>
          <div class="form-group"><label>截止日期</label><input type="date" v-model="todoDue" /></div>
          <div class="form-actions"><button class="btn btn-primary" @click="doAddTodo">添加</button></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import * as XLSX from 'xlsx'
import { useWorkbench } from '../composables/useWorkbench.js'

const { state, curStudents, curTodos, addTodo, toggleTodo, deleteTodo, getWeekLessons, getLesson, getLessonAll, hasWeekDiff, saveLesson, removeLesson, importStudentsBatch, addBehavior, curInfo, getCurrentWeekType, getSemesterWeek } = useWorkbench()

const dayLabels = ['周一', '周二', '周三', '周四', '周五']
const editTimetable = ref(false)
const lessonModal = ref(null)
const lessonData = ref({ day: 0, period: 0, name: '', className: '', location: '', weekType: 'all' })

const currentWeekType = computed(() => getCurrentWeekType())
const currentWeekLabel = computed(() => currentWeekType.value === 'odd' ? '单周' : '双周')
const currentWeekNum = computed(() => getSemesterWeek())

const pendingTodoCount = computed(() => curTodos().filter(t => !t.done).length)
const weekLessonCount = computed(() => getWeekLessons().length)

const sortedTodos = computed(() => {
  const pri = { '高': 0, '中': 1, '低': 2 }
  return [...curTodos()].sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1
    return (pri[a.priority] || 1) - (pri[b.priority] || 1)
  })
})

function isOverdue(d) { return d && new Date(d) < new Date(todayStr()) }
function todayStr() { const d = new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2) }

function openLessonEdit(d, p) {
  const all = getLessonAll(d, p)
  const hasDiff = !!(all.odd || all.even)
  if (hasDiff) {
    // 默认编辑当前周的课程
    const cur = currentWeekType.value === 'odd' ? all.odd : all.even
    lessonData.value = { day: d, period: p, name: cur?.name || '', className: cur?.className || '', location: cur?.location || '', weekType: currentWeekType.value, hasDiff: true, allOdd: all.odd, allEven: all.even }
  } else {
    lessonData.value = { day: d, period: p, name: all.base?.name || '', className: all.base?.className || '', location: all.base?.location || '', weekType: 'all', hasDiff: false }
  }
  lessonModal.value = { day: d, period: p }
}
function doSaveLesson() {
  if (!lessonData.value.name) { alert('请输入课程名称'); return }
  const wt = lessonData.value.weekType || 'all'
  saveLesson(lessonData.value.day, lessonData.value.period, { name: lessonData.value.name, className: lessonData.value.className, location: lessonData.value.location, weekType: wt })
  lessonModal.value = null
}
function doRemoveLesson() {
  const wt = lessonData.value.weekType || 'all'
  removeLesson(lessonData.value.day, lessonData.value.period, wt === 'odd' || wt === 'even' ? wt : undefined)
  lessonModal.value = null
}

const showAddTodo = ref(false)
const todoText = ref('')
const todoPriority = ref('中')
const todoDue = ref('')
function doAddTodo() {
  if (!todoText.value.trim()) { alert('请输入事项内容'); return }
  addTodo({ text: todoText.value.trim(), priority: todoPriority.value, due: todoDue.value })
  todoText.value = ''; todoPriority.value = '中'; todoDue.value = ''
  showAddTodo.value = false
}

/* ---- 上课计时 & 考勤同步 ---- */
const CLASS_DURATION = 50 * 60 // 50分钟（秒）
const classStarted = ref(false)
const classStartTime = ref(0)
const timerRemain = ref(0)
const timerDisplay = ref('50:00')
let timerInterval = null

function loadClassState() {
  const saved = localStorage.getItem('class_startTime')
  if (saved) {
    classStartTime.value = parseInt(saved)
    classStarted.value = true
    startTimer()
  }
}

function startClass() {
  if (!confirm('确定开始上课？考勤计时将开始（50分钟）')) return
  classStartTime.value = Date.now()
  classStarted.value = true
  localStorage.setItem('class_startTime', String(classStartTime.value))
  // 同步考勤截止时间到 att_deadline
  const deadline = new Date(classStartTime.value + CLASS_DURATION * 1000)
  const dlStr = deadline.getFullYear() + '-' + String(deadline.getMonth()+1).padStart(2,'0') + '-' + String(deadline.getDate()).padStart(2,'0') + 'T' + String(deadline.getHours()).padStart(2,'0') + ':' + String(deadline.getMinutes()).padStart(2,'0')
  localStorage.setItem('att_deadline', dlStr)
  startTimer()
}

function startTimer() {
  if (timerInterval) clearInterval(timerInterval)
  updateTimer()
  timerInterval = setInterval(updateTimer, 1000)
}

function updateTimer() {
  const elapsed = Math.floor((Date.now() - classStartTime.value) / 1000)
  const remain = Math.max(0, CLASS_DURATION - elapsed)
  timerRemain.value = remain
  const m = Math.floor(remain / 60)
  const s = remain % 60
  timerDisplay.value = String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0')
  // 考勤截止时自动同步
  if (remain === 0 && timerInterval) {
    clearInterval(timerInterval)
    timerInterval = null
    autoSyncAttendance()
  }
}

function stopClass() {
  if (!confirm('确定结束上课？')) return
  if (timerInterval) { clearInterval(timerInterval); timerInterval = null }
  classStarted.value = false
  classStartTime.value = 0
  localStorage.removeItem('class_startTime')
  // 结束上课时也同步考勤
  autoSyncAttendance()
}

const attOnTimeCount = computed(() => {
  if (!classStarted.value) return 0
  const deadline = classStartTime.value + CLASS_DURATION * 1000
  const records = JSON.parse(localStorage.getItem('att_records') || '[]')
  const className = curInfo()?.name || ''
  return records.filter(r => r.className === className && new Date(r.submitTime).getTime() <= deadline).length
})

const attAbsentCount = computed(() => {
  return Math.max(0, curStudents().length - attOnTimeCount.value)
})

function autoSyncAttendance() {
  const deadline = classStartTime.value + CLASS_DURATION * 1000
  const records = JSON.parse(localStorage.getItem('att_records') || '[]')
  const students = curStudents()
  const className = curInfo()?.name || ''
  const checkedIds = new Set()

  // 按时签到 +1分
  students.forEach(s => {
    const sid = s.studentId || s.id
    const rec = records.find(r => r.className === className && r.studentId === sid && new Date(r.submitTime).getTime() <= deadline)
    if (rec) {
      checkedIds.add(sid)
      addBehavior({
        type: '主动探究',
        studentId: sid,
        score: 1,
        note: '按时考勤签到 +1分'
      })
    }
  })

  // 未签到 -1分
  students.forEach(s => {
    const sid = s.studentId || s.id
    if (!checkedIds.has(sid)) {
      addBehavior({
        type: '未提交作业',
        studentId: sid,
        score: 1,
        note: '未按时签到 -1分'
      })
    }
  })

  alert('考勤同步完成！\n按时签到 ' + checkedIds.size + ' 人 +1分\n未签到 ' + (students.length - checkedIds.size) + ' 人 -1分\n\n已同步到课堂行为与学生信息。')
}

onMounted(() => { loadClassState() })
onUnmounted(() => { if (timerInterval) clearInterval(timerInterval) })

/* ---- 课表导入 ---- */
const ttImportResult = ref(null)

function downloadTimetableTemplate() {
  const dayMap = { 1: '周一', 2: '周二', 3: '周三', 4: '周四', 5: '周五' }
  const data = [['星期', '节次', '课程名称', '授课班级', '地点', '周次']]
  // 预填已有课程
  for (let d = 1; d <= 5; d++) {
    for (let p = 1; p <= 7; p++) {
      const all = getLessonAll(d, p)
      const wtLabel = { all: '每周', odd: '单周', even: '双周' }
      if (all.base) data.push([dayMap[d], '第' + p + '节', all.base.name || '', all.base.className || '', all.base.location || '', wtLabel[all.base.weekType || 'all']])
      if (all.odd) data.push([dayMap[d], '第' + p + '节', all.odd.name || '', all.odd.className || '', all.odd.location || '', '单周'])
      if (all.even) data.push([dayMap[d], '第' + p + '节', all.even.name || '', all.even.className || '', all.even.location || '', '双周'])
    }
  }
  // 如果没有任何课程，添加示例行
  if (data.length === 1) {
    data.push(['周一', '第1节', '信息科技', '7年级1班', '计算机教室1', '每周'])
    data.push(['周三', '第3节', '信息科技', '7年级2班', '计算机教室1', '单周'])
    data.push(['周三', '第3节', '信息科技', '7年级3班', '计算机教室2', '双周'])
  }
  const ws = XLSX.utils.aoa_to_sheet(data)
  ws['!cols'] = [{ wch: 8 }, { wch: 8 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 8 }]
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, '课表导入模板')
  XLSX.writeFile(wb, '课表导入模板.xlsx')
}

function doImportTimetable(e) {
  const file = e.target.files[0]; if (!file) return
  const reader = new FileReader()
  reader.onload = (ev) => {
    try {
      const data = new Uint8Array(ev.target.result)
      const wb = XLSX.read(data, { type: 'array' })
      const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' })
      if (!rows.length) { alert('表格为空，请检查文件'); return }
      const dayMap = { '周一': 1, '周二': 2, '周三': 3, '周四': 4, '周五': 5, '星期一': 1, '星期二': 2, '星期三': 3, '星期四': 4, '星期五': 5 }
      const weekTypeMap = { '每周': 'all', '单周': 'odd', '双周': 'even', '全周': 'all', 'all': 'all', 'odd': 'odd', 'even': 'even' }
      const keys = Object.keys(rows[0] || {})
      const findKey = (patterns) => keys.find(k => patterns.some(p => new RegExp(p, 'i').test(k)))
      let count = 0
      rows.forEach(r => {
        const dayStr = String(r[findKey(['星期|day|日期'])] || '').trim()
        const periodStr = String(r[findKey(['节次|period|节|课'])] || '').trim()
        const name = String(r[findKey(['课程|course|name|科目'])] || '').trim()
        const className = String(r[findKey(['班级|class|className'])] || '').trim()
        const location = String(r[findKey(['地点|location|room|教室'])] || '').trim()
        const weekStr = String(r[findKey(['周次|week|周型|weektype'])] || '每周').trim()
        if (!dayStr || !periodStr || !name) return
        const day = dayMap[dayStr] || parseInt(dayStr.replace(/[^0-9]/g, ''))
        const periodMatch = periodStr.match(/(\d+)/)
        const period = periodMatch ? parseInt(periodMatch[1]) : parseInt(periodStr)
        const weekType = weekTypeMap[weekStr] || 'all'
        if (day >= 1 && day <= 5 && period >= 1 && period <= 7) {
          saveLesson(day, period, { name, className, location, weekType })
          count++
        }
      })
      ttImportResult.value = count
      if (count === 0) alert('未识别到有效的课程数据，请检查模板格式')
    } catch (err) { alert('导入失败：' + err.message) }
    e.target.value = ''
  }
  reader.readAsArrayBuffer(file)
}

/* ---- 导入学生 ---- */
const importResult = ref(null)

function downloadTemplate() {
  const data = [
    ['年级', '班级', '学号', '姓名', '性别', '机器号', '分组', '座位号'],
    ['7', '1', '001', '张三', '男', 'A01', '第1组', '1-1'],
    ['7', '1', '002', '李四', '女', 'A02', '第1组', '1-2'],
    ['7', '15', '001', '赵六', '男', 'B01', '第1组', '1-1']
  ]
  const ws = XLSX.utils.aoa_to_sheet(data)
  ws['!cols'] = [{ wch: 6 }, { wch: 6 }, { wch: 8 }, { wch: 10 }, { wch: 6 }, { wch: 8 }, { wch: 8 }, { wch: 8 }]
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, '学生导入模板')
  XLSX.writeFile(wb, '学生导入模板.xlsx')
}

function doImport(e) {
  const file = e.target.files[0]; if (!file) return
  const reader = new FileReader()
  reader.onload = (ev) => {
    try {
      const data = new Uint8Array(ev.target.result)
      const wb = XLSX.read(data, { type: 'array' })
      const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' })
      const keys = Object.keys(rows[0] || {})
      const findKey = (patterns) => keys.find(k => patterns.some(p => new RegExp(p, 'i').test(k)))
      const normalized = rows.map(r => ({
        grade: String(r[findKey(['年级|grade'])] || '').trim(),
        classNo: String(r[findKey(['班级|class|classno'])] || '').trim(),
        studentId: String(r[findKey(['学号|id|no|studentid'])] || '').trim(),
        name: String(r[findKey(['姓名|name|studentname'])] || '').trim(),
        gender: String(r[findKey(['性别|gender|sex'])] || '').trim(),
        machineNo: String(r[findKey(['机器号|machine|machineno'])] || '').trim(),
        group: String(r[findKey(['分组|group'])] || '').trim(),
        seatNo: String(r[findKey(['座位号|seat|seatno'])] || '').trim()
      })).filter(r => r.grade && r.classNo && r.name)
      const count = importStudentsBatch(normalized)
      const classSet = new Set(normalized.map(r => r.grade + '年级' + r.classNo + '班'))
      importResult.value = { total: normalized.length, success: count, classes: [...classSet] }
    } catch (err) { alert('导入失败：' + err.message) }
    e.target.value = ''
  }
  reader.readAsArrayBuffer(file)
}
</script>

<style scoped>
.dashboard { }
.ws-title { font-size: 20px; font-weight: 700; margin-bottom: 20px; color: var(--text-primary); }
.stat-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 20px; }
.stat-card { background: var(--bg-card); border-radius: var(--radius); padding: 20px; display: flex; align-items: center; gap: 16px; box-shadow: var(--shadow); }
.stat-icon { width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-size: 24px; }
.stat-blue { background: linear-gradient(135deg, #1e88e5, #42a5f5); }
.stat-orange { background: linear-gradient(135deg, #fb8c00, #ffa726); }
.stat-green { background: linear-gradient(135deg, #43a047, #66bb6a); }
.stat-label { font-size: 13px; color: var(--text-secondary); }
.stat-value { font-size: 28px; font-weight: 700; color: var(--text-primary); line-height: 1.2; }

.two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.panel { background: var(--bg-card); border-radius: var(--radius); box-shadow: var(--shadow); overflow: hidden; }
.panel-header { padding: 14px 20px; border-bottom: 1px solid var(--border-light); display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.panel-btns { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; }
.panel-title { font-size: 15px; font-weight: 600; }

.tt-wrap { padding: 12px; overflow-x: auto; }
.tt-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.tt-table th { background: var(--bg-hover); padding: 8px 6px; text-align: center; font-weight: 600; color: var(--text-secondary); border: 1px solid var(--border-light); }
.period-cell { background: var(--bg-hover); text-align: center; font-weight: 600; color: var(--text-secondary); padding: 8px 6px; border: 1px solid var(--border-light); white-space: nowrap; }
.lesson-cell { text-align: center; padding: 8px 4px; border: 1px solid var(--border-light); min-height: 48px; cursor: pointer; vertical-align: middle; }
.lesson-cell:hover { background: var(--bg-hover); }
.lesson-name { font-weight: 600; color: var(--primary); font-size: 13px; }
.lesson-sub { font-size: 11px; color: var(--text-light); margin-top: 2px; }
.empty-slot { color: var(--text-light); font-size: 18px; }
.has-week-diff { position: relative; background: #f3f0ff; }
.has-week-diff:hover { background: #ebe4ff; }
.week-diff-tag { position: absolute; top: 2px; right: 2px; font-size: 10px; background: #7c4dff; color: #fff; border-radius: 3px; padding: 0 3px; line-height: 16px; font-weight: 600; }
.week-badge { font-size: 12px; padding: 2px 8px; border-radius: 10px; font-weight: 600; margin-left: 8px; vertical-align: middle; }
.week-badge-sm { font-size: 11px; padding: 1px 6px; }
.wb-odd { background: #e3f2fd; color: #1565c0; }
.wb-even { background: #fce4ec; color: #c62828; }
.edit-mode .lesson-cell { cursor: pointer; }
.edit-mode .lesson-cell:hover { background: var(--primary-bg); }

.todo-list { padding: 8px 16px; max-height: 360px; overflow-y: auto; }
.empty-hint { text-align: center; color: var(--text-light); padding: 30px 0; font-size: 13px; }
.todo-item { display: flex; align-items: flex-start; gap: 10px; padding: 10px 0; border-bottom: 1px solid var(--border-light); }
.todo-item:last-child { border-bottom: none; }
.todo-item.done .todo-text { text-decoration: line-through; color: var(--text-light); }
.todo-check { position: relative; display: flex; align-items: center; flex-shrink: 0; margin-top: 2px; }
.todo-check input { width: 16px; height: 16px; cursor: pointer; }
.todo-content { flex: 1; min-width: 0; }
.todo-text { font-size: 14px; color: var(--text-primary); word-break: break-all; }
.todo-meta { display: flex; gap: 8px; margin-top: 4px; align-items: center; }
.priority-tag { font-size: 11px; padding: 1px 6px; border-radius: 3px; font-weight: 600; }
.p-高 { background: #fdeaea; color: var(--red); }
.p-中 { background: #fff3e0; color: var(--orange); }
.p-低 { background: #e8f5e9; color: var(--green); }
.due-date { font-size: 11px; color: var(--text-light); }
.due-date.overdue { color: var(--red); font-weight: 600; }
.todo-del { font-size: 18px; color: var(--text-light); cursor: pointer; flex-shrink: 0; padding: 0 4px; border-radius: 4px; }
.todo-del:hover { background: #fdeaea; color: var(--red); }

.btn { padding: 6px 14px; border-radius: var(--radius-sm); font-size: 13px; border: none; cursor: pointer; white-space: nowrap; }
.btn-sm { padding: 4px 10px; font-size: 12px; }
.btn-primary { background: var(--primary); color: #fff; }
.btn-primary:hover { background: #1976d2; }
.btn-danger { background: var(--red); color: #fff; }

.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.4); display: flex; align-items: center; justify-content: center; z-index: 9999; }
.modal-box { background: var(--bg-card); border-radius: var(--radius); width: 640px; max-width: 92vw; max-height: 85vh; overflow-y: auto; box-shadow: var(--shadow-md); }
.modal-box.small { width: 420px; }
.modal-header { padding: 14px 20px; border-bottom: 1px solid var(--border); display: flex; align-items: center; font-size: 16px; font-weight: 600; }
.modal-close { margin-left: auto; cursor: pointer; font-size: 22px; color: var(--text-light); width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; border-radius: 4px; }
.modal-close:hover { background: var(--bg-hover); color: var(--red); }
.modal-body { padding: 16px 20px; }

.form-group { margin-bottom: 14px; }
.form-group label { display: block; font-size: 13px; font-weight: 600; color: var(--text-secondary); margin-bottom: 4px; }
.form-group input, .form-group select, .form-group textarea { width: 100%; padding: 8px 12px; border: 1px solid var(--border); border-radius: var(--radius-sm); font-size: 13px; }
.form-actions { display: flex; gap: 10px; justify-content: flex-end; margin-top: 16px; }

.import-panel { margin-top: 20px; }
.import-body { padding: 16px 20px; }
.import-desc { color: var(--text-secondary); font-size: 13px; margin-bottom: 14px; line-height: 1.6; }
.import-actions { display: flex; gap: 10px; margin-bottom: 14px; }
.btn-purple { background: #8e24aa; color: #fff; }
.btn-purple:hover { background: #7b1fa2; }
.import-label { cursor: pointer; display: inline-flex; align-items: center; }
.tt-import-result { background: #e8f5e9; padding: 8px 16px; font-size: 13px; color: var(--green); display: flex; align-items: center; justify-content: space-between; }
.tt-import-result strong { font-size: 16px; }
.tt-import-close { cursor: pointer; font-size: 18px; color: var(--text-light); padding: 0 4px; border-radius: 4px; }
.tt-import-close:hover { background: rgba(0,0,0,.08); }
.import-result { background: #e8f5e9; border-radius: var(--radius-sm); padding: 10px 14px; margin-bottom: 14px; font-size: 13px; color: var(--green); display: flex; gap: 16px; align-items: center; }
.import-result strong { font-size: 18px; }
.result-classes { color: var(--text-secondary); font-size: 12px; }
.class-overview { display: flex; flex-wrap: wrap; gap: 8px; }
.class-tag { background: var(--bg-hover); border: 1px solid var(--border-light); border-radius: var(--radius-sm); padding: 6px 12px; font-size: 13px; font-weight: 600; display: flex; align-items: center; gap: 6px; }
.class-tag span { font-size: 11px; color: var(--primary); background: var(--primary-bg); padding: 1px 6px; border-radius: 8px; }

/* 上课计时面板 */
.class-timer-panel { background: var(--bg-card); border-radius: var(--radius); box-shadow: var(--shadow); padding: 20px 24px; display: flex; align-items: center; gap: 20px; margin-bottom: 20px; }
.ctp-left { flex: 0 0 160px; }
.ctp-class { font-size: 14px; color: var(--text-secondary); margin-bottom: 4px; }
.ctp-class strong { color: var(--primary); font-size: 16px; }
.ctp-count { font-size: 13px; color: var(--text-light); }
.ctp-center { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; }
.ctp-before { display: flex; align-items: center; gap: 14px; }
.btn-start-class { padding: 12px 36px; background: linear-gradient(135deg, #27ae60, #2ecc71); color: #fff; border: none; border-radius: 10px; font-size: 18px; font-weight: 700; cursor: pointer; transition: transform .15s, box-shadow .15s; box-shadow: 0 4px 14px rgba(39,174,96,.3); }
.btn-start-class:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(39,174,96,.4); }
.ctp-hint { font-size: 13px; color: var(--text-light); }
.ctp-during { text-align: center; }
.timer-display { display: flex; align-items: center; justify-content: center; gap: 8px; font-size: 36px; font-weight: 700; color: var(--primary); font-family: 'Consolas', 'Courier New', monospace; letter-spacing: 2px; }
.timer-display.timer-warn { color: var(--red); animation: timer-pulse 1s ease-in-out infinite; }
@keyframes timer-pulse { 0%,100% { opacity: 1; } 50% { opacity: .6; } }
.timer-icon { font-size: 28px; }
.timer-text { min-width: 100px; text-align: center; }
.timer-status { font-size: 13px; color: var(--text-secondary); margin-top: 4px; }
.timer-status.status-warn { color: var(--red); font-weight: 600; }
.ctp-right { flex: 0 0 180px; display: flex; flex-direction: column; align-items: flex-end; gap: 10px; }
.ctp-att-stats { display: flex; gap: 12px; font-size: 13px; }
.att-ok { color: var(--green); font-weight: 600; }
.att-no { color: var(--red); font-weight: 600; }
</style>
