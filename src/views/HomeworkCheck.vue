<template>
  <div class="app">
    <header class="header">
      <h1>📋 作业提交情况统计</h1>
      <p class="subtitle">上传学生名单和作业文件，自动检查提交情况</p>
    </header>
    <main class="main">
      <section class="card">
        <h2>① 输入学生名单</h2>
        <p class="hint">每行一个学号，或用逗号/空格分隔</p>
        <textarea v-model="studentInput" placeholder="例如：&#10;2024001&#10;2024002&#10;2024003" class="student-input" rows="6"></textarea>
        <div class="student-count" v-if="studentList.length > 0">已识别 <strong>{{ studentList.length }}</strong> 名学生</div>
      </section>
      <section class="card">
        <h2>② 上传作业文件</h2>
        <p class="hint">文件名中包含学号即可识别（如 2024001-1.pdf、2024001作业.docx 等）</p>
        <div class="upload-area" :class="{ dragging: isDragging }" @dragover.prevent="isDragging = true" @dragleave="isDragging = false" @drop.prevent="handleDrop" @click="triggerFileInput">
          <div class="upload-icon">📁</div>
          <p>点击选择文件或拖拽文件到此处</p>
          <input type="file" ref="fileInput" multiple @change="handleFileSelect" style="display: none" />
        </div>
        <div class="file-count" v-if="uploadedFiles.length > 0">
          已上传 <strong>{{ uploadedFiles.length }}</strong> 个文件
          <button class="btn-clear" @click="clearFiles">清空文件</button>
        </div>
      </section>
      <section class="card" v-if="uploadedFiles.length > 0 && studentList.length > 0">
        <h2>③ 检查结果</h2>
        <div class="stats">
          <div class="stat-item submitted"><span class="stat-number">{{ submittedStudents.length }}</span><span class="stat-label">已交</span></div>
          <div class="stat-item not-submitted"><span class="stat-number">{{ notSubmittedStudents.length }}</span><span class="stat-label">未交</span></div>
          <div class="stat-item total"><span class="stat-number">{{ studentList.length }}</span><span class="stat-label">总人数</span></div>
        </div>
        <div class="tabs">
          <button class="tab" :class="{ active: activeTab === 'submitted' }" @click="activeTab = 'submitted'">✅ 已交作业 ({{ submittedStudents.length }})</button>
          <button class="tab" :class="{ active: activeTab === 'not-submitted' }" @click="activeTab = 'not-submitted'">❌ 未交作业 ({{ notSubmittedStudents.length }})</button>
          <button class="tab" :class="{ active: activeTab === 'all' }" @click="activeTab = 'all'">📄 全部文件 ({{ uploadedFiles.length }})</button>
        </div>
        <div v-if="activeTab === 'submitted'" class="result-list">
          <div v-if="submittedStudents.length === 0" class="empty">暂无数据</div>
          <div v-for="student in submittedStudents" :key="student.id" class="result-item success">
            <span class="student-id">{{ student.id }}</span>
            <span class="file-list"><span v-for="file in student.files" :key="file" class="file-tag">{{ file }}</span></span>
          </div>
        </div>
        <div v-if="activeTab === 'not-submitted'" class="result-list">
          <div v-if="notSubmittedStudents.length === 0" class="empty">🎉 全部已交！</div>
          <div v-for="student in notSubmittedStudents" :key="student" class="result-item danger">
            <span class="student-id">{{ student }}</span>
          </div>
        </div>
        <div v-if="activeTab === 'all'" class="result-list">
          <div v-for="file in uploadedFiles" :key="file.name" class="result-item file-item">
            <span class="file-name">{{ file.name }}</span>
            <span class="file-student" v-if="extractStudentId(file.name)">学号: {{ extractStudentId(file.name) }}</span>
            <span class="file-student unmatched" v-else>未匹配学号</span>
          </div>
        </div>
        <div class="export-area">
          <button class="btn-export" @click="exportNotSubmitted">📋 复制未交名单</button>
          <button class="btn-export" @click="exportTxt">📄 导出 TXT 报告</button>
          <button class="btn-export btn-export-xls" @click="exportXls">📊 导出 XLS 表格</button>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import * as XLSX from 'xlsx'

const studentInput = ref('')
const uploadedFiles = ref([])
const isDragging = ref(false)
const activeTab = ref('submitted')
const fileInput = ref(null)

const studentList = computed(() => {
  if (!studentInput.value.trim()) return []
  return studentInput.value.split(/[\n,，;；\s]+/).map(s => s.trim()).filter(s => s.length > 0)
})

function extractStudentId(filename) {
  const nameWithoutExt = filename.replace(/\.[^.]+$/, '')
  for (const id of studentList.value) {
    if (nameWithoutExt.includes(id)) return id
  }
  return null
}

const submittedStudents = computed(() => {
  const map = {}
  for (const file of uploadedFiles.value) {
    const studentId = extractStudentId(file.name)
    if (studentId) {
      if (!map[studentId]) map[studentId] = { id: studentId, files: [] }
      map[studentId].files.push(file.name)
    }
  }
  return Object.values(map)
})

const notSubmittedStudents = computed(() => {
  const submittedIds = new Set(submittedStudents.value.map(s => s.id))
  return studentList.value.filter(id => !submittedIds.has(id))
})

function triggerFileInput() { fileInput.value.click() }
function handleFileSelect(event) {
  const files = Array.from(event.target.files)
  uploadedFiles.value = [...uploadedFiles.value, ...files]
  event.target.value = ''
}
function handleDrop(event) {
  isDragging.value = false
  const files = Array.from(event.dataTransfer.files)
  uploadedFiles.value = [...uploadedFiles.value, ...files]
}
function clearFiles() { uploadedFiles.value = [] }

function exportNotSubmitted() {
  const text = notSubmittedStudents.value.join('\n')
  navigator.clipboard.writeText(text).then(() => {
    alert('已复制未交作业名单到剪贴板！')
  }).catch(() => {
    const ta = document.createElement('textarea')
    ta.value = text
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    document.body.removeChild(ta)
    alert('已复制未交作业名单到剪贴板！')
  })
}

function generateReport() {
  let report = '=== 作业检查报告 ===\n\n'
  report += '总人数: ' + studentList.value.length + '\n'
  report += '已交: ' + submittedStudents.value.length + '\n'
  report += '未交: ' + notSubmittedStudents.value.length + '\n\n'
  report += '--- 已交作业 ---\n'
  for (const s of submittedStudents.value) report += s.id + ': ' + s.files.join(', ') + '\n'
  report += '\n--- 未交作业 ---\n'
  for (const id of notSubmittedStudents.value) report += id + '\n'
  return report
}

function exportTxt() {
  const report = generateReport()
  const blob = new Blob([report], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = '作业检查报告.txt'
  a.click()
  URL.revokeObjectURL(url)
}

function exportXls() {
  const submittedIds = new Set(submittedStudents.value.map(s => s.id))
  const fileMap = {}
  for (const s of submittedStudents.value) fileMap[s.id] = s.files.join(', ')
  const data = [
    ['学号', '提交状态', '提交文件'],
    ...studentList.value.map(id => [id, submittedIds.has(id) ? '已交' : '未交', submittedIds.has(id) ? fileMap[id] : ''])
  ]
  const ws = XLSX.utils.aoa_to_sheet(data)
  ws['!cols'] = [{ wch: 15 }, { wch: 10 }, { wch: 50 }]
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, '作业检查')
  XLSX.writeFile(wb, '作业检查报告.xls')
}
</script>

<style scoped>
.app { min-height: 100vh; background: #f0f2f5; }
.header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-align: center; padding: 2rem 1rem; }
.header h1 { margin: 0; font-size: 2rem; }
.subtitle { margin: 0.5rem 0 0; opacity: 0.9; font-size: 1rem; }
.main { max-width: 900px; margin: 0 auto; padding: 1.5rem; }
.card { background: white; border-radius: 12px; padding: 1.5rem; margin-bottom: 1.5rem; box-shadow: 0 2px 12px rgba(0,0,0,0.08); }
.card h2 { margin: 0 0 0.5rem; font-size: 1.25rem; color: #333; }
.hint { color: #888; font-size: 0.875rem; margin: 0 0 1rem; }
.student-input { width: 100%; border: 2px solid #e0e0e0; border-radius: 8px; padding: 0.75rem; font-size: 0.95rem; resize: vertical; font-family: monospace; box-sizing: border-box; }
.student-input:focus { outline: none; border-color: #667eea; }
.student-count, .file-count { margin-top: 0.75rem; color: #667eea; font-size: 0.9rem; }
.upload-area { border: 2px dashed #d0d0d0; border-radius: 12px; padding: 2.5rem; text-align: center; cursor: pointer; transition: all 0.2s; background: #fafafa; }
.upload-area:hover, .upload-area.dragging { border-color: #667eea; background: #f0f3ff; }
.upload-icon { font-size: 3rem; margin-bottom: 0.5rem; }
.upload-area p { color: #666; margin: 0; }
.btn-clear { margin-left: 1rem; background: #ff4d4f; color: white; border: none; padding: 0.25rem 0.75rem; border-radius: 4px; cursor: pointer; font-size: 0.8rem; }
.stats { display: flex; gap: 1rem; margin-bottom: 1.5rem; }
.stat-item { flex: 1; text-align: center; padding: 1rem; border-radius: 8px; background: #f8f9fa; }
.stat-item.submitted { background: #f0fff4; border: 1px solid #b7eb8f; }
.stat-item.not-submitted { background: #fff2f0; border: 1px solid #ffccc7; }
.stat-item.total { background: #f0f5ff; border: 1px solid #adc6ff; }
.stat-number { display: block; font-size: 2rem; font-weight: bold; }
.stat-label { font-size: 0.875rem; color: #666; }
.tabs { display: flex; gap: 0.5rem; margin-bottom: 1rem; border-bottom: 2px solid #f0f0f0; }
.tab { padding: 0.5rem 1rem; border: none; background: none; cursor: pointer; font-size: 0.9rem; color: #666; border-bottom: 2px solid transparent; margin-bottom: -2px; }
.tab:hover { color: #667eea; }
.tab.active { color: #667eea; border-bottom-color: #667eea; font-weight: 600; }
.result-list { max-height: 400px; overflow-y: auto; }
.result-item { display: flex; align-items: center; gap: 0.75rem; padding: 0.75rem; border-radius: 8px; margin-bottom: 0.5rem; }
.result-item.success { background: #f0fff4; border-left: 3px solid #52c41a; }
.result-item.danger { background: #fff2f0; border-left: 3px solid #ff4d4f; }
.result-item.file-item { background: #f9f9f9; border-left: 3px solid #667eea; }
.student-id { font-weight: 600; font-family: monospace; font-size: 1rem; min-width: 100px; }
.file-list { display: flex; flex-wrap: wrap; gap: 0.25rem; }
.file-tag { background: #e8f5e9; color: #2e7d32; padding: 0.15rem 0.5rem; border-radius: 4px; font-size: 0.8rem; }
.file-name { font-family: monospace; font-size: 0.9rem; }
.file-student { margin-left: auto; font-size: 0.8rem; color: #888; }
.file-student.unmatched { color: #fa8c16; }
.empty { text-align: center; padding: 2rem; color: #999; }
.export-area { display: flex; gap: 0.75rem; margin-top: 1rem; padding-top: 1rem; border-top: 1px solid #f0f0f0; }
.btn-export { padding: 0.5rem 1.25rem; border: 1px solid #667eea; background: white; color: #667eea; border-radius: 6px; cursor: pointer; font-size: 0.9rem; }
.btn-export:hover { background: #667eea; color: white; }
.btn-export-xls { border-color: #52c41a; color: #52c41a; }
.btn-export-xls:hover { background: #52c41a; color: white; }
</style>