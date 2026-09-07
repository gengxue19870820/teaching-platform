<template>
  <div>
    <div class="hc-header">
      <h1>📋 作业提交情况统计</h1>
      <p class="hc-subtitle">检查当前班级（{{ curInfo()?.name || '—' }}）的作业提交情况，并同步积分到学生信息</p>
    </div>

    <!-- 选择作业 -->
    <div class="hc-card">
      <h2>选择作业</h2>
      <div v-if="homeworkList.length === 0" class="hc-empty">
        <p>暂无已发布的作业，请先在「作业提交(教师)」中发布作业</p>
      </div>
      <div v-else class="hw-select-grid">
        <div v-for="hw in homeworkList" :key="hw.id" class="hw-select-item"
             :class="{ active: selectedHwId === hw.id, synced: isHwSynced(hw.id) }" @click="selectHomework(hw.id)">
          <div class="hw-select-title">{{ hw.title }} <span v-if="isHwSynced(hw.id)" class="synced-badge">已同步</span></div>
          <div class="hw-select-meta">{{ getSubmissions(hw.id).length }}/{{ curStudents().length }} 人提交</div>
          <div class="hw-select-date">{{ formatDate(hw.createdAt) }}</div>
        </div>
      </div>
    </div>

    <!-- 检查结果 -->
    <div v-if="selectedHwId" class="hc-card">
      <div class="hc-result-header">
        <h2>{{ selectedHw.title }} - 提交检查结果</h2>
        <div class="hc-actions">
          <button class="hw-btn hw-btn-green" @click="applyAllScores" :disabled="isSynced">
            {{ isSynced ? '✅ 已同步积分（不可重复）' : '⚡ 一键同步积分到学生信息' }}
          </button>
          <button class="hw-btn hw-btn-blue" @click="exportReport">📊 导出报告</button>
        </div>
      </div>

      <!-- 统计卡片 -->
      <div class="hc-stats-row">
        <div class="hc-stat hc-stat-total">
          <span class="hc-stat-num">{{ curStudents().length }}</span>
          <span class="hc-stat-label">总人数</span>
        </div>
        <div class="hc-stat hc-stat-submitted">
          <span class="hc-stat-num">{{ submittedStudents.length }}</span>
          <span class="hc-stat-label">✅ 已提交（+2分）</span>
        </div>
        <div class="hc-stat hc-stat-not">
          <span class="hc-stat-num">{{ notSubmittedStudents.length }}</span>
          <span class="hc-stat-label">❌ 未提交（-1分）</span>
        </div>
      </div>

      <!-- 积分同步说明 -->
      <div class="hc-score-info" v-if="!isSynced">
        <span>📌 点击「同步积分」将为已提交学生添加 <strong>+2分</strong>（主动探究），未提交学生添加 <strong>-1分</strong>（未提交作业），结果将同步到「学生信息」的行为记录中。<strong>每个作业仅可同步一次，不可重复操作。</strong></span>
      </div>
      <div class="hc-score-info hc-score-done" v-else>
        <span>✅ 积分已同步！已提交 +2分（{{ submittedStudents.length }}人），未提交 -1分（{{ notSubmittedStudents.length }}人），可在「学生信息」和「课堂行为」中查看。</span>
      </div>

      <!-- 标签切换 -->
      <div class="hc-tabs">
        <button class="hc-tab" :class="{ active: activeTab === 'all' }" @click="activeTab='all'">📄 全部（{{ curStudents().length }}）</button>
        <button class="hc-tab" :class="{ active: activeTab === 'submitted' }" @click="activeTab='submitted'">✅ 已提交（{{ submittedStudents.length }}）</button>
        <button class="hc-tab" :class="{ active: activeTab === 'not' }" @click="activeTab='not'">❌ 未提交（{{ notSubmittedStudents.length }}）</button>
      </div>

      <!-- 全部学生列表 -->
      <div v-if="activeTab === 'all'" class="hc-list">
        <div v-for="s in allStudentsStatus" :key="s.id" class="hc-list-item" :class="s.submitted ? 'hc-ok' : 'hc-fail'">
          <span class="hc-sid">{{ s.studentId || s.id }}</span>
          <span class="hc-name">{{ s.name }}</span>
          <span class="hc-status-icon">{{ s.submitted ? '✅' : '❌' }}</span>
          <span class="hc-status-text">{{ s.submitted ? '已提交' : '未提交' }}</span>
          <span class="hc-time" v-if="s.submitted">{{ formatTime(s.submittedAt) }}</span>
          <span class="hc-score-tag" :class="s.submitted ? 'score-pos' : 'score-neg'">{{ s.submitted ? '+2' : '-1' }}</span>
        </div>
      </div>

      <!-- 已提交列表 -->
      <div v-if="activeTab === 'submitted'" class="hc-list">
        <div v-if="submittedStudents.length === 0" class="hc-empty-inline">暂无提交记录</div>
        <div v-for="s in submittedStudents" :key="s.id" class="hc-list-item hc-ok">
          <span class="hc-sid">{{ s.studentId || s.id }}</span>
          <span class="hc-name">{{ s.name }}</span>
          <span class="hc-status-icon">✅</span>
          <span class="hc-status-text">已提交</span>
          <span class="hc-time">{{ formatTime(s.submittedAt) }}</span>
          <span class="hc-score-tag score-pos">+2</span>
        </div>
      </div>

      <!-- 未提交列表 -->
      <div v-if="activeTab === 'not'" class="hc-list">
        <div v-if="notSubmittedStudents.length === 0" class="hc-empty-inline">🎉 全部已提交！</div>
        <div v-for="s in notSubmittedStudents" :key="s.id" class="hc-list-item hc-fail">
          <span class="hc-sid">{{ s.studentId || s.id }}</span>
          <span class="hc-name">{{ s.name }}</span>
          <span class="hc-status-icon">❌</span>
          <span class="hc-status-text">未提交</span>
          <span class="hc-score-tag score-neg">-1</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import * as XLSX from 'xlsx'
import { useWorkbench } from '../composables/useWorkbench.js'

const { curInfo, curStudents, addBehavior } = useWorkbench()

function getHomework() { return JSON.parse(localStorage.getItem('hw_homework') || '[]') }
function getSubmissions() { return JSON.parse(localStorage.getItem('hw_submissions') || '[]') }

const homeworkList = computed(() => getHomework().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)))

const selectedHwId = ref(null)
const selectedHw = computed(() => homeworkList.value.find(h => h.id === selectedHwId.value))
const activeTab = ref('all')

// 持久化同步状态（localStorage + 响应式触发）
const syncVersion = ref(0)
function getSyncedIds() { return JSON.parse(localStorage.getItem('hw_scores_synced') || '[]') }
function addSyncedId(id) { const arr = getSyncedIds(); if (!arr.includes(id)) { arr.push(id); localStorage.setItem('hw_scores_synced', JSON.stringify(arr)); syncVersion.value++ } }

const isSynced = computed(() => { syncVersion.value; return selectedHwId.value ? getSyncedIds().includes(selectedHwId.value) : false })

function isHwSynced(id) { return getSyncedIds().includes(id) }

function selectHomework(id) {
  selectedHwId.value = id
  activeTab.value = 'all'
}

function getHwSubmissions(hwId) {
  return getSubmissions().filter(s => s.homeworkId === hwId)
}

// 已提交学生（含提交信息）
const submittedStudents = computed(() => {
  if (!selectedHwId.value) return []
  const subs = getHwSubmissions(selectedHwId.value)
  const students = curStudents()
  return students.filter(s => {
    const sid = s.studentId || s.id
    return subs.some(sub => sub.studentId === sid)
  }).map(s => {
    const sid = s.studentId || s.id
    const sub = subs.find(sub => sub.studentId === sid)
    return { ...s, submitted: true, submittedAt: sub?.submittedAt }
  })
})

// 未提交学生
const notSubmittedStudents = computed(() => {
  const submittedIds = new Set(submittedStudents.value.map(s => s.studentId || s.id))
  return curStudents().filter(s => {
    const sid = s.studentId || s.id
    return !submittedIds.has(sid)
  })
})

// 全部学生状态
const allStudentsStatus = computed(() => {
  const submitted = submittedStudents.value.map(s => ({ ...s, submitted: true }))
  const notSubmitted = notSubmittedStudents.value.map(s => ({ ...s, submitted: false }))
  return [...submitted, ...notSubmitted]
})

// 一键同步积分（仅允许一次）
function applyAllScores() {
  if (!selectedHwId.value) return
  if (isSynced.value) { alert('该作业积分已同步，不可重复操作！'); return }
  const hwTitle = selectedHw.value?.title || '作业'

  // 已提交 +2分（主动探究）
  submittedStudents.value.forEach(s => {
    addBehavior({
      type: '主动探究',
      studentId: s.studentId || s.id,
      score: 2,
      note: `提交作业「${hwTitle}」+2分`
    })
  })

  // 未提交 -1分（未提交作业）
  notSubmittedStudents.value.forEach(s => {
    addBehavior({
      type: '未提交作业',
      studentId: s.studentId || s.id,
      score: 1,
      note: `未提交作业「${hwTitle}」-1分`
    })
  })

  // 持久化记录已同步
  addSyncedId(selectedHwId.value)
  alert(`积分同步完成！\n已提交 ${submittedStudents.value.length} 人 +2分\n未提交 ${notSubmittedStudents.value.length} 人 -1分\n\n可在「学生信息」和「课堂行为」中查看。`)
}

// 导出报告
function exportReport() {
  if (!selectedHwId.value) return
  const hw = selectedHw.value
  const students = curStudents()
  const subs = getHwSubmissions(selectedHwId.value)
  const data = [['学号', '姓名', '提交状态', '提交时间', '积分变动']]
  students.forEach(s => {
    const sid = s.studentId || s.id
    const sub = subs.find(sub => sub.studentId === sid)
    data.push([
      sid, s.name,
      sub ? '已提交' : '未提交',
      sub ? formatDate(sub.submittedAt) : '',
      sub ? '+2' : '-1'
    ])
  })
  const ws = XLSX.utils.aoa_to_sheet(data)
  ws['!cols'] = [{ wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 18 }, { wch: 10 }]
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, '作业提交统计')
  XLSX.writeFile(wb, hw.title + '_提交统计.xlsx')
}

function formatDate(d) {
  if (!d) return ''
  const dt = new Date(d)
  return dt.getFullYear() + '-' + String(dt.getMonth() + 1).padStart(2, '0') + '-' + String(dt.getDate()).padStart(2, '0')
}
function formatTime(d) {
  if (!d) return ''
  const dt = new Date(d)
  return String(dt.getMonth() + 1) + '/' + String(dt.getDate()).padStart(2, '0') + ' ' + String(dt.getHours()).padStart(2, '0') + ':' + String(dt.getMinutes()).padStart(2, '0')
}
</script>

<style scoped>
.hc-header { background: linear-gradient(135deg, #2c3e50 0%, #3498db 100%); color: white; padding: 20px 28px; border-radius: 12px; margin-bottom: 20px; }
.hc-header h1 { font-size: 20px; margin: 0 0 6px; }
.hc-subtitle { margin: 0; opacity: 0.9; font-size: 13px; }

.hc-card { background: var(--bg-card); border-radius: 12px; padding: 24px; margin-bottom: 20px; box-shadow: var(--shadow); }
.hc-card h2 { font-size: 17px; margin-bottom: 16px; color: var(--text-primary); }

.hc-empty { text-align: center; color: var(--text-light); padding: 30px; }
.hc-empty-inline { text-align: center; color: var(--text-light); padding: 20px; }

.hw-select-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px; }
.hw-select-item { border: 2px solid var(--border); border-radius: 10px; padding: 14px 16px; cursor: pointer; transition: .2s; }
.hw-select-item:hover { border-color: var(--primary); background: var(--bg-hover); }
.hw-select-item.active { border-color: var(--primary); background: var(--primary-bg); box-shadow: 0 2px 8px rgba(30,136,229,.15); }
.hw-select-item.synced { border-color: #b7eb8f; }
.hw-select-title { font-weight: 600; font-size: 14px; margin-bottom: 4px; }
.hw-select-meta { font-size: 12px; color: var(--primary); font-weight: 600; }
.hw-select-date { font-size: 11px; color: var(--text-light); margin-top: 4px; }

.hc-result-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 10px; }
.hc-result-header h2 { margin-bottom: 0; }
.hc-actions { display: flex; gap: 8px; }

.hc-stats-row { display: flex; gap: 12px; margin-bottom: 16px; }
.hc-stat { flex: 1; text-align: center; padding: 16px 12px; border-radius: 10px; }
.hc-stat-total { background: #f0f5ff; border: 1px solid #adc6ff; }
.hc-stat-submitted { background: #f0fff4; border: 1px solid #b7eb8f; }
.hc-stat-not { background: #fff2f0; border: 1px solid #ffccc7; }
.hc-stat-num { display: block; font-size: 28px; font-weight: 700; line-height: 1.2; }
.hc-stat-label { font-size: 12px; color: var(--text-secondary); margin-top: 4px; }

.hc-score-info { background: #fffbe6; border: 1px solid #ffe58f; border-radius: 8px; padding: 12px 16px; margin-bottom: 16px; font-size: 13px; color: var(--text-secondary); line-height: 1.6; }
.hc-score-done { background: #f0fff4; border-color: #b7eb8f; }

.hc-tabs { display: flex; gap: 0; border-bottom: 2px solid var(--border-light); margin-bottom: 12px; }
.hc-tab { padding: 10px 18px; border: none; background: none; cursor: pointer; font-size: 13px; color: var(--text-secondary); border-bottom: 2px solid transparent; margin-bottom: -2px; transition: .15s; }
.hc-tab:hover { color: var(--primary); }
.hc-tab.active { color: var(--primary); border-bottom-color: var(--primary); font-weight: 600; }

.hc-list { max-height: 500px; overflow-y: auto; }
.hc-list-item { display: flex; align-items: center; gap: 10px; padding: 10px 14px; border-radius: 8px; margin-bottom: 6px; border-left: 3px solid transparent; }
.hc-list-item.hc-ok { background: #f0fff4; border-left-color: #52c41a; }
.hc-list-item.hc-fail { background: #fff2f0; border-left-color: #ff4d4f; }
.hc-sid { font-family: monospace; font-size: 13px; font-weight: 600; min-width: 90px; color: var(--text-primary); }
.hc-name { flex: 1; font-size: 13px; }
.hc-status-icon { font-size: 16px; }
.hc-status-text { font-size: 12px; color: var(--text-secondary); min-width: 50px; }
.hc-time { font-size: 11px; color: var(--text-light); min-width: 70px; }
.hc-score-tag { padding: 2px 10px; border-radius: 12px; font-size: 12px; font-weight: 700; }
.score-pos { background: #e8f5e9; color: #2e7d32; }
.score-neg { background: #fde8e8; color: #c62828; }

.hw-btn { padding: 8px 18px; border: none; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 500; transition: .15s; }
.hw-btn:disabled { opacity: 0.6; cursor: not-allowed; }
.hw-btn-green { background: #27ae60; color: #fff; } .hw-btn-green:hover:not(:disabled) { background: #219a52; }
.hw-btn-blue { background: #3498db; color: #fff; } .hw-btn-blue:hover { background: #2980b9; }

.synced-badge { display: inline-block; background: #27ae60; color: #fff; font-size: 10px; padding: 1px 6px; border-radius: 8px; font-weight: 600; vertical-align: middle; margin-left: 4px; }
</style>
