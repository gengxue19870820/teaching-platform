<template>
  <div>
    <div class="hw-header">
      <h1>📚 作业提交系统 - 教师端</h1>
    </div>
    <div class="hw-tabs">
      <button class="hw-tab" :class="{active:activeTab==='publish'}" @click="activeTab='publish'">📝 发布作业</button>
      <button class="hw-tab" :class="{active:activeTab==='manage'}" @click="activeTab='manage'">📋 管理作业</button>
    </div>

    <!-- 发布作业 -->
    <div v-if="activeTab==='publish'" class="hw-card-panel">
      <h2>发布新作业</h2>
      <div class="fg"><label>作业标题</label><input v-model="newHw.title" type="text" placeholder="如：第一章课后习题" /></div>
      <div class="fg"><label>作业内容/要求</label><textarea v-model="newHw.description" rows="5" placeholder="请输入作业的具体内容和要求..."></textarea></div>
      <button class="hw-btn hw-btn-primary hw-btn-full" @click="publishHomework">发布作业</button>
    </div>

    <!-- 管理作业 -->
    <div v-if="activeTab==='manage'">
      <div class="hw-filter-bar">
        <h3>🔍 班级筛选</h3>
        <div class="filter-row">
          <select v-model="manageGrade" @change="onManageGradeChange"><option value="">全部年级</option><option v-for="g in allGrades" :key="g" :value="g">{{ g }}</option></select>
          <select v-model="manageClass" @change="saveFilter"><option value="">全部班级</option><option v-for="c in filteredClasses" :key="c" :value="c">{{ c }}</option></select>
        </div>
      </div>
      <div v-if="homeworkList.length===0" class="hw-empty"><div class="empty-icon">📭</div><p>暂无发布的作业</p></div>
      <div v-for="hw in homeworkList" :key="hw.id" class="hw-item">
        <div class="hw-item-header"><h3>{{ hw.title }}</h3><span class="hw-badge">{{ getFilteredSubmissions(hw.id).length }} 人已提交</span></div>
        <p class="hw-desc">{{ hw.description }}</p>
        <div class="hw-meta">发布于：{{ formatDate(hw.createdAt) }}<span v-if="hw.deadline"> | 截止：{{ formatDate(hw.deadline) }}</span></div>
        <div class="hw-criteria-status" v-if="hw.criteriaFile"><span>✅</span><span class="criteria-uploaded">评分依据已上传：{{ hw.criteriaFile.name }}</span></div>
        <div class="hw-criteria-status" v-else><span>⚠️</span><span>暂未上传评分依据，自动批阅将按完成情况评定</span></div>
        <div class="hw-pwd-status" v-if="hw.downloadPassword"><span>🔑</span><span>下载密码已设置：<strong>{{ hw.downloadPassword }}</strong> <span class="hw-pwd-hint">（学生可用此密码删除/重新提交文件）</span></span></div>
        <div class="hw-item-actions">
          <button class="hw-btn hw-btn-blue" @click="viewSubmissions(hw)">查看提交</button>
          <button class="hw-btn hw-btn-purple" @click="batchDownload(hw)">📥 批量下载</button>
          <button class="hw-btn hw-btn-teal" @click="openPwdModal(hw)">🔑 密码管理</button>
          <button class="hw-btn hw-btn-teal" @click="openCriteriaModal(hw)">📋 评分依据</button>
          <button class="hw-btn hw-btn-orange" @click="doAutoGrade(hw)">⚡ 自动批阅</button>
          <button class="hw-btn hw-btn-green" @click="exportReport(hw,'xls')">📊 导出XLS</button>
          <button class="hw-btn hw-btn-dark" @click="exportReport(hw,'txt')">📃 导出TXT</button>
          <button class="hw-btn hw-btn-red" @click="deleteHomework(hw.id)">删除</button>
        </div>
      </div>
    </div>

    <!-- 提交详情弹窗 -->
    <div v-if="subModal" class="hw-modal-overlay" @click.self="subModal=null">
      <div class="hw-modal hw-modal-lg">
        <h2>{{ subModal.hw.title }} - 提交详情</h2>
        <div class="hw-modal-toolbar">
          <button class="hw-btn hw-btn-orange" @click="doAutoGrade(subModal.hw)">⚡ 自动批阅</button>
          <select v-model="exportClassFilter" class="hw-select-compact"><option value="">全部班级</option><option v-for="c in allSubmitClasses" :key="c" :value="c">{{ c }}</option></select>
          <button class="hw-btn hw-btn-green" @click="exportReport(subModal.hw,'xls')">📊 导出XLS</button>
          <button class="hw-btn hw-btn-dark" @click="exportReport(subModal.hw,'txt')">📃 导出TXT</button>
        </div>
        <div v-if="subModal.submissions.length===0" class="hw-empty-inline">暂无学生提交作业</div>
        <div v-for="sub in subModal.submissions" :key="sub.id" class="sub-item">
          <div class="sub-header">
            <span class="sub-student">{{ sub.studentName }}（{{ sub.studentId }}）- {{ getStudentClass(sub.studentId) }}</span>
            <span class="sub-time">{{ formatDate(sub.submittedAt) }}</span>
          </div>
          <div v-if="sub.content" class="sub-content">{{ sub.content }}</div>
          <div v-if="sub.attachments && sub.attachments.length" class="sub-attachments">
            <div class="sub-att-title">📎 附件（{{ sub.attachments.length }}）</div>
            <div class="sub-att-list">
              <div v-for="(att,ai) in sub.attachments" :key="ai" class="sub-att-item">
                <span class="att-icon">📄</span>
                <span class="att-name">{{ att.name }}</span>
                <span class="att-size">{{ fmtFileSize(att.size) }}</span>
                <button class="hw-btn hw-btn-sm hw-btn-blue" @click="downloadAttachment(sub, ai)">下载</button>
              </div>
            </div>
          </div>
          <div class="sub-grade-section">
            <div v-if="sub.grade && (sub.grade.level || sub.grade.comment)" class="grade-display" :class="'level-'+sub.grade.level">
              <span v-if="sub.grade.level" class="grade-level-badge" :class="sub.grade.level">{{ sub.grade.level }}</span>
              <span class="grade-level-text">{{ levelText(sub.grade.level) }}</span>
              <div v-if="sub.grade.comment" class="grade-comment-text">{{ sub.grade.comment }}</div>
              <div class="grade-time-text">批阅时间：{{ formatDate(sub.grade.gradedAt) }}</div>
            </div>
            <div class="grade-form-row">
              <div class="grade-field"><label>等级</label>
                <select v-model="gradeForm[sub.id].level"><option value="">--</option><option value="A">A 优秀</option><option value="B">B 良好</option><option value="C">C 合格</option><option value="D">D 不合格</option></select>
              </div>
              <div class="grade-field grade-field-wide"><label>评语（10字以内）</label>
                <input type="text" v-model="gradeForm[sub.id].comment" maxlength="10" placeholder="输入评语..." />
              </div>
              <button class="hw-btn hw-btn-green hw-btn-sm" @click="doGrade(sub)">提交批阅</button>
            </div>
          </div>
        </div>
        <button class="hw-btn hw-btn-cancel" @click="subModal=null">关闭</button>
      </div>
    </div>

    <!-- 密码管理弹窗 -->
    <div v-if="pwdModal" class="hw-modal-overlay" @click.self="pwdModal=null">
      <div class="hw-modal">
        <h2>🔑 密码管理 - {{ pwdModal.hw.title }}</h2>
        <p class="hw-hint">设置密码后，学生可在学生端输入密码删除或重新提交文件</p>
        <div class="fg"><label>下载/操作密码</label>
          <div style="display:flex;gap:10px">
            <input v-model="pwdModal.password" type="text" placeholder="输入密码，留空则不设密码" style="flex:1" />
            <button class="hw-btn hw-btn-primary hw-btn-sm" @click="genRandomPwd">随机生成</button>
          </div>
        </div>
        <div class="modal-btn-row">
          <button class="hw-btn hw-btn-cancel" @click="pwdModal=null">取消</button>
          <button class="hw-btn hw-btn-primary" @click="savePwd">保存密码</button>
        </div>
      </div>
    </div>

    <!-- 批量下载弹窗 -->
    <div v-if="batchDlModal" class="hw-modal-overlay" @click.self="batchDlModal=null">
      <div class="hw-modal hw-modal-lg">
        <h2>📥 批量下载 - {{ batchDlModal.hw.title }}</h2>
        <div class="batch-dl-options">
          <div class="fg"><label>下载范围</label>
            <select v-model="batchDlModal.scope">
              <option value="all">全部学生</option>
              <option value="submitted">仅已提交的学生</option>
              <option value="selected">选择指定学生</option>
            </select>
          </div>
          <div v-if="batchDlModal.scope==='selected'" class="batch-stu-list">
            <label v-for="s in batchDlModal.studentList" :key="s.id" class="batch-stu-item">
              <input type="checkbox" v-model="s.checked" /> {{ s.name }}（{{ s.id }}）
            </label>
          </div>
          <div class="fg"><label>文件类型</label>
            <select v-model="batchDlModal.fileType">
              <option value="attachments">仅附件文件</option>
              <option value="content">仅作业内容（txt）</option>
              <option value="both">附件 + 内容</option>
            </select>
          </div>
        </div>
        <div class="modal-btn-row">
          <button class="hw-btn hw-btn-cancel" @click="batchDlModal=null">取消</button>
          <button class="hw-btn hw-btn-green" @click="doBatchDownload" :disabled="batchDlModal.downloading">{{ batchDlModal.downloading ? '打包中...' : '📥 下载ZIP' }}</button>
        </div>
      </div>
    </div>

    <!-- 评分依据弹窗 -->
    <div v-if="criteriaModal" class="hw-modal-overlay" @click.self="criteriaModal=null">
      <div class="hw-modal">
        <h2>评分依据 - {{ criteriaModal.hw.title }}</h2>
        <div v-if="criteriaModal.hw.criteriaFile" class="criteria-info">
          <div>📄 已上传文件：<strong>{{ criteriaModal.hw.criteriaFile.name }}</strong></div>
          <div class="criteria-time">上传时间：{{ formatDate(criteriaModal.hw.criteriaFile.uploadedAt) }}</div>
        </div>
        <div v-if="criteriaModal.hw.criteriaFile" class="criteria-preview">{{ criteriaModal.hw.criteriaFile.text }}</div>
        <div class="fg">
          <label>{{ criteriaModal.hw.criteriaFile ? '重新上传评分依据' : '上传评分依据文件' }}</label>
          <div class="criteria-upload-area" @click="$refs.criteriaFileInput.click()">
            <div class="upload-icon">📄</div>
            <p>点击选择评分依据文件</p>
            <p class="upload-hint">支持txt/doc等文本文件，系统将依据文件内容对学生作业进行自动批阅</p>
          </div>
          <input ref="criteriaFileInput" type="file" accept=".txt,.md,.csv,.doc,.docx" @change="uploadCriteria" style="display:none" />
        </div>
        <button class="hw-btn hw-btn-cancel" @click="criteriaModal=null">关闭</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import * as XLSX from 'xlsx'
import JSZip from 'jszip'
import { useWorkbench } from '../composables/useWorkbench.js'

const { state } = useWorkbench()

const activeTab = ref('publish')
const manageGrade = ref('')
const manageClass = ref('')

/* ---- 数据存储 (localStorage) ---- */
function getHomework() { return JSON.parse(localStorage.getItem('hw_homework') || '[]') }
function getSubmissions() { return JSON.parse(localStorage.getItem('hw_submissions') || '[]') }
function getHwStudents() { return JSON.parse(localStorage.getItem('hw_students') || '[]') }
function saveHomework(hw) { localStorage.setItem('hw_homework', JSON.stringify(hw)) }
function saveSubmissions(subs) { localStorage.setItem('hw_submissions', JSON.stringify(subs)) }


/* ---- 班级数据 (来自 useWorkbench) ---- */
const allGrades = computed(() => {
  const grades = new Set()
  Object.values(state.classes).forEach(c => { if (c.info.grade) grades.add(c.info.grade) })
  getHwStudents().forEach(s => { if (s.grade) grades.add(s.grade) })
  return [...grades].sort((a, b) => {
    const na = parseInt(a), nb = parseInt(b)
    return isNaN(na) && isNaN(nb) ? a.localeCompare(b) : isNaN(na) ? 1 : isNaN(nb) ? -1 : na - nb
  })
})

const filteredClasses = computed(() => {
  const classes = new Set()
  Object.values(state.classes).forEach(c => {
    if (!manageGrade.value || c.info.grade === manageGrade.value) {
      if (c.info.classNo) classes.add(c.info.classNo)
    }
  })
  getHwStudents().forEach(s => {
    if (!manageGrade.value || s.grade === manageGrade.value) {
      if (s.class) classes.add(s.class)
    }
  })
  return [...classes].sort((a, b) => {
    const na = parseInt(a), nb = parseInt(b)
    return (isNaN(na) ? a : na) - (isNaN(nb) ? b : nb)
  })
})

function onManageGradeChange() { manageClass.value = '' }
function saveFilter() { /* filter is reactive */ }

/* ---- 作业列表 ---- */
const homeworkList = computed(() => {
  return getHomework().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
})

function getFilteredSubmissions(hwId) {
  const subs = getSubmissions().filter(s => s.homeworkId === hwId)
  if (!manageGrade.value && !manageClass.value) return subs
  const students = getAllStudentsForFilter()
  return subs.filter(sub => {
    const stu = students.find(s => s.id === sub.studentId)
    if (!stu) return true
    if (manageGrade.value && stu.grade !== manageGrade.value) return false
    if (manageClass.value && stu.class !== manageClass.value) return false
    return true
  })
}

function getAllStudentsForFilter() {
  const map = new Map()
  Object.values(state.classes).forEach(c => {
    c.data.students.forEach(s => {
      const id = s.studentId || s.id
      map.set(id, { id, name: s.name, grade: c.info.grade, class: c.info.classNo })
    })
  })
  getHwStudents().forEach(s => { if (!map.has(s.id)) map.set(s.id, s) })
  return [...map.values()]
}

/* ---- 发布作业 ---- */
const newHw = reactive({ title: '', description: '' })
function publishHomework() {
  if (!newHw.title || !newHw.description) { alert('请填写标题和内容'); return }
  const hw = getHomework()
  hw.push({ id: Date.now().toString(), title: newHw.title, description: newHw.description, createdAt: new Date().toISOString() })
  saveHomework(hw)
  newHw.title = ''; newHw.description = ''
  alert('作业发布成功！')
}

/* ---- 删除作业 ---- */
function deleteHomework(id) {
  if (!confirm('确定删除此作业及相关提交？')) return
  saveHomework(getHomework().filter(h => h.id !== id))
  saveSubmissions(getSubmissions().filter(s => s.homeworkId !== id))
}

/* ---- 查看提交 ---- */
const subModal = ref(null)
const gradeForm = reactive({})
const exportClassFilter = ref('')

const allSubmitClasses = computed(() => {
  if (!subModal.value) return []
  const students = getAllStudentsForFilter()
  const subs = subModal.value.submissions
  const classes = new Set()
  subs.forEach(sub => {
    const stu = students.find(s => s.id === sub.studentId)
    if (stu && stu.class) classes.add(stu.class)
  })
  return [...classes].sort()
})

function viewSubmissions(hw) {
  const subs = getSubmissions().filter(s => s.homeworkId === hw.id)
  subModal.value = { hw, submissions: subs }
  subs.forEach(sub => {
    gradeForm[sub.id] = { level: sub.grade?.level || '', comment: sub.grade?.comment || '' }
  })
}

function getStudentClass(studentId) {
  const students = getAllStudentsForFilter()
  const stu = students.find(s => s.id === studentId)
  return stu && stu.class ? stu.class : '未分班'
}

/* ---- 批阅 ---- */
function doGrade(sub) {
  const form = gradeForm[sub.id]
  if (!form || (!form.level && !form.comment)) { alert('请选择等级或填写评语'); return }
  const subs = getSubmissions()
  const idx = subs.findIndex(s => s.id === sub.id)
  if (idx >= 0) {
    subs[idx].grade = { level: form.level || null, comment: form.comment || '', gradedAt: new Date().toISOString(), gradedBy: 'manual' }
    saveSubmissions(subs)
    // refresh modal
    const hw = subModal.value.hw
    const updated = getSubmissions().filter(s => s.homeworkId === hw.id)
    subModal.value = { hw, submissions: updated }
    updated.forEach(s => { if (!gradeForm[s.id]) gradeForm[s.id] = { level: '', comment: '' } })
    alert('批阅成功！')
  }
}

/* ---- 自动批阅 (参照 server.js 的确定性算法) ---- */
function doAutoGrade(hw) {
  if (!confirm(`确定要对「${hw.title}」的所有提交进行自动批阅吗？`)) return
  const subs = getSubmissions()
  const hwSubs = subs.filter(s => s.homeworkId === hw.id)
  const deadline = hw.deadline ? new Date(hw.deadline) : null
  const criteriaText = (hw.criteriaFile && hw.criteriaFile.text) || ''

  function extractKeywords(text) {
    if (!text) return []
    return [...new Set(text.replace(/[，。！？、；：""''（）\(\)\[\]\{\},.!?;:'"\n\r\t]/g, ' ').split(/\s+/).filter(w => w.length >= 2))]
  }
  function calcMatchScore(content, keywords) {
    if (keywords.length === 0) return 0.5
    const c = (content || '').toLowerCase()
    let m = 0; keywords.forEach(kw => { if (c.includes(kw.toLowerCase())) m++ })
    return keywords.length > 0 ? m / keywords.length : 0.3
  }
  function matchToLevel(ratio, onTime) {
    if (!onTime) return ratio >= 0.7 ? 'C' : 'D'
    if (ratio >= 0.7) return 'A'
    if (ratio >= 0.5) return 'B'
    if (ratio >= 0.3) return 'C'
    return 'D'
  }
  function genComment(level, ratio, onTime) {
    if (!onTime) return '迟交，请按时完成'
    if (level === 'A' && ratio >= 0.9) return '完成出色，内容充实'
    if (level === 'A') return '优秀，继续保持'
    if (level === 'B' && ratio >= 0.6) return '较好，可更完善'
    if (level === 'B') return '良好，注意细节'
    if (level === 'C') return '基本完成，需完善'
    return '完成度不足'
  }

  const keywords = extractKeywords(criteriaText)
  hwSubs.forEach(sub => {
    if (sub.grade && sub.grade.gradedBy === 'manual') return
    const content = (sub.content || '').trim()
    const hasAttachments = sub.attachments && sub.attachments.length > 0
    const len = content.length
    const isOnTime = deadline ? new Date(sub.submittedAt) <= deadline : true
    let level, comment
    if (!content && !hasAttachments) { level = 'D'; comment = '未提交作业内容' }
    else if (!content && hasAttachments) { level = 'C'; comment = '已提交附件' }
    else if (criteriaText && keywords.length > 0) {
      const ratio = calcMatchScore(content, keywords)
      level = matchToLevel(ratio, isOnTime)
      comment = genComment(level, ratio, isOnTime)
    } else {
      if (len >= 500 && isOnTime) level = 'A'
      else if (len >= 300 && isOnTime) level = 'B'
      else if (len >= 100) level = 'C'
      else if (hasAttachments) level = 'C'
      else level = 'D'
      if (!isOnTime && level === 'A') level = 'B'
      else if (!isOnTime && level === 'B') level = 'C'
      else if (!isOnTime) level = 'D'
      comment = genComment(level, 0.5, isOnTime)
    }
    sub.grade = { level, comment, gradedBy: 'auto', gradedAt: new Date().toISOString() }
  })
  saveSubmissions(subs)
  alert(`已自动批阅 ${hwSubs.length} 份提交`)
  // refresh modal if open
  if (subModal.value && subModal.value.hw.id === hw.id) viewSubmissions(hw)
}

/* ---- 评分依据 ---- */
const criteriaModal = ref(null)
function openCriteriaModal(hw) { criteriaModal.value = { hw } }

function uploadCriteria(e) {
  const file = e.target.files[0]; if (!file || !criteriaModal.value) return
  const reader = new FileReader()
  reader.onload = (ev) => {
    const text = String(ev.target.result || '').substring(0, 5000)
    const hw = getHomework()
    const idx = hw.findIndex(h => h.id === criteriaModal.value.hw.id)
    if (idx >= 0) {
      hw[idx].criteriaFile = { name: file.name, text, uploadedAt: new Date().toISOString() }
      saveHomework(hw)
      criteriaModal.value = { hw: hw[idx] }
      alert('评分依据上传成功！')
    }
    e.target.value = ''
  }
  reader.readAsText(file)
}

/* ---- 导出报告 ---- */
function exportReport(hw, format) {
  const subs = getSubmissions().filter(s => s.homeworkId === hw.id)
  const students = getAllStudentsForFilter()
  const targetClass = format === 'xls' ? '' : (exportClassFilter.value || '')
  let targetStudents = students
  if (targetClass) targetStudents = students.filter(s => s.class === targetClass)

  const rows = targetStudents.map(stu => {
    const sub = subs.find(s => s.studentId === stu.id)
    return {
      '班级': stu.class || '未分班', '学号': stu.id, '姓名': stu.name,
      '作业标题': hw.title, '是否提交': sub ? '是' : '否',
      '提交时间': sub ? formatDate(sub.submittedAt) : '',
      '等级评判': sub?.grade?.level || '', '评语': sub?.grade?.comment || ''
    }
  })

  if (format === 'xls') {
    const ws = XLSX.utils.json_to_sheet(rows)
    ws['!cols'] = [{wch:8},{wch:12},{wch:8},{wch:20},{wch:10},{wch:18},{wch:8},{wch:20}]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '作业完成情况')
    XLSX.writeFile(wb, hw.title + '_作业完成情况.xlsx')
  } else {
    let txt = hw.title + ' - 作业完成情况\n' + '='.repeat(60) + '\n'
    txt += `班级: ${targetClass || '全部'} | 导出时间: ${formatDate(new Date().toISOString())}\n`
    txt += '-'.repeat(60) + '\n\n'
    rows.forEach(r => {
      txt += `学号: ${r['学号']} | 姓名: ${r['姓名']} | 班级: ${r['班级']}\n`
      txt += `  是否提交: ${r['是否提交']}`
      if (r['提交时间']) txt += ` | 提交时间: ${r['提交时间']}`
      txt += '\n'
      if (r['等级评判']) txt += `  等级: ${r['等级评判']} | 评语: ${r['评语']}\n`
      txt += '\n'
    })
    const total = rows.length, submitted = rows.filter(r => r['是否提交'] === '是').length
    txt += '-'.repeat(60) + `\n统计: 总人数${total} | 已提交${submitted} | 未提交${total - submitted}\n`
    const blob = new Blob([txt], { type: 'text/plain;charset=utf-8' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = hw.title + '_作业完成情况.txt'; a.click()
  }
}



/* ---- 工具函数 ---- */
function formatDate(d) {
  if (!d) return ''
  const dt = new Date(d)
  return dt.getFullYear() + '-' + String(dt.getMonth()+1).padStart(2,'0') + '-' + String(dt.getDate()).padStart(2,'0') + ' ' + String(dt.getHours()).padStart(2,'0') + ':' + String(dt.getMinutes()).padStart(2,'0')
}
function levelText(l) { return { A:'优秀', B:'良好', C:'合格', D:'不合格' }[l] || '' }

/* ---- 附件下载 ---- */
function fmtFileSize(b) {
  if (!b) return ''
  if (b < 1024) return b + 'B'
  if (b < 1024 * 1024) return (b / 1024).toFixed(1) + 'KB'
  return (b / (1024 * 1024)).toFixed(1) + 'MB'
}

function downloadAttachment(sub, ai) {
  const subs = getSubmissions()
  const fullSub = subs.find(s => s.id === sub.id)
  if (!fullSub || !fullSub.attachments || !fullSub.attachments[ai]) return
  const att = fullSub.attachments[ai]
  const a = document.createElement('a')
  a.href = att.data
  a.download = att.name
  a.click()
}

function base64ToBlob(dataUrl) {
  const arr = dataUrl.split(',')
  const mime = arr[0].match(/:(.*?);/)[1]
  const bstr = atob(arr[1])
  const u8arr = new Uint8Array(bstr.length)
  for (let i = 0; i < bstr.length; i++) u8arr[i] = bstr.charCodeAt(i)
  return new Blob([u8arr], { type: mime })
}

/* ---- 批量下载 ---- */
const batchDlModal = ref(null)

function batchDownload(hw) {
  const students = getAllStudentsForFilter()
  const subs = getSubmissions().filter(s => s.homeworkId === hw.id)
  const studentList = students.map(s => {
    const sub = subs.find(x => x.studentId === s.id)
    return { id: s.id, name: s.name, class: s.class, checked: !!sub, hasSub: !!sub }
  })
  batchDlModal.value = { hw, scope: 'submitted', fileType: 'attachments', studentList, downloading: false }
}

async function doBatchDownload() {
  if (!batchDlModal.value) return
  const { hw, scope, fileType, studentList } = batchDlModal.value
  batchDlModal.value.downloading = true
  const zip = new JSZip()
  const subs = getSubmissions().filter(s => s.homeworkId === hw.id)
  const students = getAllStudentsForFilter()

  let targetStudents = []
  if (scope === 'all') targetStudents = students
  else if (scope === 'submitted') targetStudents = students.filter(s => subs.some(x => x.studentId === s.id))
  else targetStudents = studentList.filter(s => s.checked).map(s => ({ id: s.id, name: s.name, class: s.class }))

  let count = 0
  for (const stu of targetStudents) {
    const sub = subs.find(x => x.studentId === stu.id)
    if (!sub) continue
    const folderName = (stu.class || '') + '_' + stu.id + '_' + stu.name
    const folder = zip.folder(folderName)
    if ((fileType === 'content' || fileType === 'both') && sub.content) {
      folder.file('作业内容.txt', sub.content)
    }
    if ((fileType === 'attachments' || fileType === 'both') && sub.attachments) {
      for (const att of sub.attachments) {
        try {
          const blob = base64ToBlob(att.data)
          folder.file(att.name, blob)
        } catch (e) { /* skip */ }
      }
    }
    count++
  }

  if (count === 0) { alert('没有可下载的文件'); batchDlModal.value.downloading = false; return }
  try {
    const blob = await zip.generateAsync({ type: 'blob' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = hw.title + '_学生作业.zip'
    a.click()
    URL.revokeObjectURL(a.href)
  } catch (e) { alert('打包失败：' + e.message) }
  batchDlModal.value.downloading = false
  batchDlModal.value = null
}

/* ---- 密码管理 ---- */
const pwdModal = ref(null)

function openPwdModal(hw) {
  pwdModal.value = { hw, password: hw.downloadPassword || '' }
}

function genRandomPwd() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  let pwd = ''
  for (let i = 0; i < 6; i++) pwd += chars[Math.floor(Math.random() * chars.length)]
  pwdModal.value.password = pwd
}

function savePwd() {
  if (!pwdModal.value) return
  const hw = getHomework()
  const idx = hw.findIndex(h => h.id === pwdModal.value.hw.id)
  if (idx >= 0) {
    hw[idx].downloadPassword = pwdModal.value.password || ''
    saveHomework(hw)
    alert(pwdModal.value.password ? '密码已设置：' + pwdModal.value.password : '密码已清除')
  }
  pwdModal.value = null
}
</script>

<style scoped>
.hw-header { background: linear-gradient(135deg, #2c3e50 0%, #3498db 100%); color: white; padding: 20px 30px; border-radius: 12px; margin-bottom: 20px; }
.hw-header h1 { font-size: 22px; margin: 0; }
.hw-tabs { display: flex; gap: 0; background: var(--bg-card); border-radius: 10px 10px 0 0; overflow: hidden; margin-bottom: 20px; box-shadow: var(--shadow); }
.hw-tab { flex: 1; padding: 14px 20px; border: none; background: none; cursor: pointer; font-size: 14px; font-weight: 600; color: var(--text-secondary); border-bottom: 3px solid transparent; transition: .2s; }
.hw-tab:hover { color: var(--primary); background: var(--bg-hover); }
.hw-tab.active { color: var(--primary); border-bottom-color: var(--primary); background: var(--primary-bg); }

.hw-card-panel { background: var(--bg-card); border-radius: 12px; padding: 28px; box-shadow: var(--shadow); }
.hw-card-panel h2 { font-size: 18px; margin-bottom: 20px; color: var(--text-primary); }
.fg { margin-bottom: 16px; }
.fg label { display: block; font-size: 13px; font-weight: 600; color: var(--text-secondary); margin-bottom: 6px; }
.fg input, .fg textarea, .fg select { width: 100%; padding: 10px 14px; border: 2px solid var(--border); border-radius: 8px; font-size: 14px; box-sizing: border-box; font-family: inherit; }
.fg input:focus, .fg textarea:focus, .fg select:focus { outline: none; border-color: var(--primary); }

.hw-btn { padding: 8px 18px; border: none; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 500; transition: .15s; }
.hw-btn-sm { padding: 5px 12px; font-size: 12px; }
.hw-btn-full { width: 100%; padding: 13px; font-size: 15px; }
.hw-btn-primary { background: linear-gradient(135deg, #2c3e50, #3498db); color: #fff; }
.hw-btn-primary:hover { opacity: 0.9; }
.hw-btn-blue { background: #3498db; color: #fff; } .hw-btn-blue:hover { background: #2980b9; }
.hw-btn-red { background: #e74c3c; color: #fff; } .hw-btn-red:hover { background: #c0392b; }
.hw-btn-green { background: #27ae60; color: #fff; } .hw-btn-green:hover { background: #219a52; }
.hw-btn-orange { background: #e67e22; color: #fff; } .hw-btn-orange:hover { background: #d35400; }
.hw-btn-teal { background: #16a085; color: #fff; } .hw-btn-teal:hover { background: #138d75; }
.hw-btn-purple { background: #8e44ad; color: #fff; } .hw-btn-purple:hover { background: #7d3c98; }
.hw-btn-dark { background: #2c3e50; color: #fff; } .hw-btn-dark:hover { background: #1a252f; }
.hw-btn-cancel { padding: 10px 24px; background: #e0e0e0; color: #333; float: right; margin-top: 12px; }

.hw-filter-bar { background: var(--bg-card); border-radius: 12px; padding: 18px 24px; margin-bottom: 16px; box-shadow: var(--shadow); }
.hw-filter-bar h3 { font-size: 15px; margin-bottom: 10px; }
.filter-row { display: flex; gap: 10px; flex-wrap: wrap; }
.filter-row select { padding: 8px 14px; border: 2px solid var(--border); border-radius: 6px; font-size: 14px; }
.filter-row select:focus { outline: none; border-color: var(--primary); }

.hw-item { background: var(--bg-card); border-radius: 12px; padding: 22px; margin-bottom: 16px; box-shadow: var(--shadow); border-left: 4px solid var(--primary); }
.hw-item-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
.hw-item-header h3 { font-size: 16px; margin: 0; }
.hw-badge { background: var(--primary); color: white; padding: 4px 14px; border-radius: 20px; font-size: 12px; font-weight: 600; }
.hw-desc { color: var(--text-secondary); margin-bottom: 8px; line-height: 1.6; font-size: 13px; }
.hw-meta { color: var(--text-light); font-size: 12px; margin-bottom: 10px; }
.hw-criteria-status { display: flex; align-items: center; gap: 8px; padding: 8px 12px; background: #f0f7ff; border-radius: 6px; font-size: 13px; margin-bottom: 12px; }
.criteria-uploaded { color: var(--green); font-weight: 600; }
.hw-item-actions { display: flex; gap: 8px; flex-wrap: wrap; }

.hw-empty { text-align: center; color: var(--text-light); padding: 50px 20px; }
.empty-icon { font-size: 48px; margin-bottom: 12px; }
.hw-empty-inline { text-align: center; color: var(--text-light); padding: 20px; }
.hw-hint { color: var(--text-secondary); font-size: 14px; margin-bottom: 16px; }
.hw-count { font-size: 13px; color: var(--text-secondary); margin-bottom: 12px; }

/* 弹窗 */
.hw-modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.hw-modal { background: var(--bg-card); border-radius: 14px; padding: 30px; width: 90%; max-width: 550px; max-height: 85vh; overflow-y: auto; box-shadow: 0 20px 60px rgba(0,0,0,0.3); }
.hw-modal-lg { max-width: 750px; }
.hw-modal h2 { font-size: 18px; margin-bottom: 16px; }
.hw-modal-toolbar { display: flex; gap: 10px; margin-bottom: 16px; flex-wrap: wrap; align-items: center; }
.hw-select-compact { padding: 6px 10px; border: 1px solid var(--border); border-radius: 4px; font-size: 13px; }

.sub-item { border: 1px solid var(--border-light); border-radius: 10px; padding: 16px; margin-bottom: 14px; }
.sub-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
.sub-student { font-weight: 600; color: var(--text-primary); font-size: 14px; }
.sub-time { color: var(--text-light); font-size: 13px; }
.sub-content { color: var(--text-secondary); line-height: 1.7; background: var(--bg-hover); padding: 12px; border-radius: 6px; white-space: pre-wrap; margin-bottom: 12px; font-size: 13px; max-height: 200px; overflow-y: auto; }

.sub-grade-section { border-top: 1px solid var(--border-light); padding-top: 12px; margin-top: 8px; }
.grade-display { border-radius: 8px; padding: 12px 16px; margin-bottom: 10px; }
.grade-display.level-A { background: #e8f8f0; border-left: 4px solid #27ae60; }
.grade-display.level-B { background: #e8f4fd; border-left: 4px solid #3498db; }
.grade-display.level-C { background: #fff9e6; border-left: 4px solid #f39c12; }
.grade-display.level-D { background: #fde8e8; border-left: 4px solid #e74c3c; }
.grade-level-badge { display: inline-block; padding: 3px 12px; border-radius: 4px; font-size: 15px; font-weight: 700; color: white; margin-right: 8px; }
.grade-level-badge.A { background: #27ae60; } .grade-level-badge.B { background: #3498db; }
.grade-level-badge.C { background: #f39c12; } .grade-level-badge.D { background: #e74c3c; }
.grade-level-text { font-size: 13px; color: var(--text-secondary); }
.grade-comment-text { color: var(--text-secondary); margin-top: 6px; line-height: 1.6; font-size: 13px; }
.grade-time-text { color: var(--text-light); font-size: 11px; margin-top: 4px; }

.grade-form-row { display: flex; gap: 10px; align-items: flex-end; flex-wrap: wrap; }
.grade-field { flex: 0 0 120px; }
.grade-field label { display: block; font-size: 12px; color: var(--text-secondary); margin-bottom: 4px; }
.grade-field select, .grade-field input { width: 100%; padding: 8px 10px; border: 2px solid var(--border); border-radius: 6px; font-size: 14px; }
.grade-field select:focus, .grade-field input:focus { outline: none; border-color: var(--primary); }
.grade-field-wide { flex: 1; min-width: 150px; }

.criteria-info { background: var(--bg-hover); border-radius: 8px; padding: 12px; margin-bottom: 14px; font-size: 13px; }
.criteria-time { color: var(--text-light); font-size: 12px; margin-top: 4px; }
.criteria-preview { background: var(--bg-hover); border-radius: 8px; padding: 14px; max-height: 200px; overflow-y: auto; font-size: 13px; color: var(--text-secondary); line-height: 1.7; white-space: pre-wrap; margin-bottom: 14px; border: 1px solid var(--border); }
.criteria-upload-area { border: 2px dashed var(--border); border-radius: 12px; padding: 24px 16px; text-align: center; cursor: pointer; transition: border-color .2s, background .2s; }
.criteria-upload-area:hover { border-color: var(--primary); background: var(--bg-hover); }
.upload-icon { font-size: 32px; margin-bottom: 8px; }
.upload-hint { color: var(--text-light); font-size: 12px; margin-top: 4px; }

.hw-pwd-status { display: flex; align-items: center; gap: 8px; padding: 8px 12px; background: #fff8e1; border-radius: 6px; font-size: 13px; margin-bottom: 12px; }
.hw-pwd-status strong { color: #e65100; font-family: monospace; letter-spacing: 1px; }
.hw-pwd-hint { color: #999; font-size: 12px; }

.sub-attachments { margin-top: 10px; padding: 10px; background: #f8f9ff; border-radius: 8px; border: 1px solid #e8ecf4; }
.sub-att-title { font-size: 13px; font-weight: 600; color: #555; margin-bottom: 8px; }
.sub-att-list { display: flex; flex-direction: column; gap: 6px; }
.sub-att-item { display: flex; align-items: center; gap: 8px; padding: 6px 10px; background: #fff; border-radius: 6px; border: 1px solid #eee; }
.sub-att-item .att-icon { font-size: 16px; }
.sub-att-item .att-name { flex: 1; font-size: 13px; color: #333; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.sub-att-item .att-size { font-size: 11px; color: #999; }

.modal-btn-row { display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px; }

.batch-dl-options { margin-bottom: 16px; }
.batch-stu-list { max-height: 200px; overflow-y: auto; border: 1px solid var(--border); border-radius: 8px; padding: 8px; margin-bottom: 12px; }
.batch-stu-item { display: flex; align-items: center; gap: 6px; padding: 4px 8px; border-radius: 4px; font-size: 13px; cursor: pointer; }
.batch-stu-item:hover { background: var(--bg-hover); }
.batch-stu-item input { cursor: pointer; }
</style>
