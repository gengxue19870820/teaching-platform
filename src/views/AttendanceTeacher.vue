<template>
  <div class="page">
    <div>
      <div class="header">
        <h1>🎓 考勤管理端</h1>
      </div>
      <div class="top-row">
        <div class="card deadline-card">
          <h2>⏰ 考勤截止时间</h2>
          <div class="deadline-form">
            <input type="datetime-local" v-model="deadline" class="deadline-input" />
            <button class="btn btn-primary" @click="saveDeadline">保存</button>
          </div>
          <p v-if="deadlineSaved" class="deadline-saved">当前截止：<strong>{{ formatDL(deadline) }}</strong></p>
        </div>
        <div class="card roster-card">
          <h2>📋 考勤花名册</h2>
          <p class="roster-hint">自动同步当前班级学生名单，切换班级时自动更新</p>
          <div class="roster-actions">
            <button class="btn btn-primary" @click="showAddStudent=true">+ 添加学生</button>
            <button class="btn btn-primary" @click="syncFromWorkbench">🔄 同步班级名单</button>
            <button class="btn btn-danger btn-sm" @click="clearRoster">清空</button>
          </div>
          <p class="roster-count">当前：<strong>{{ roster.length }}</strong> 人</p>
        </div>
      </div>
      <div v-if="showAddStudent" class="modal-overlay" @click.self="showAddStudent=false">
        <div class="modal">
          <h3>添加学生</h3>
          <div class="form-group"><label>班级 *</label><input v-model="newStudent.className" type="text" placeholder="如：计算机1班" /></div>
          <div class="form-group"><label>学号 *</label><input v-model="newStudent.studentId" type="text" placeholder="如：2024001" /></div>
          <div class="form-group"><label>姓名 *</label><input v-model="newStudent.studentName" type="text" placeholder="如：张三" /></div>
          <div class="modal-actions">
            <button class="btn btn-cancel" @click="showAddStudent=false">取消</button>
            <button class="btn btn-primary" @click="addStudent">确认</button>
          </div>
        </div>
      </div>
      <div class="stats-row">
        <div class="stat-card stat-total"><div class="stat-num">{{ roster.length }}</div><div class="stat-label">花名册总人数</div></div>
        <div class="stat-card stat-ontime"><div class="stat-num">{{ onTime.length }}</div><div class="stat-label">✅ 按时打卡</div></div>
        <div class="stat-card stat-late"><div class="stat-num">{{ late.length }}</div><div class="stat-label">⚠️ 未按时</div></div>
        <div class="stat-card stat-absent"><div class="stat-num">{{ absent.length }}</div><div class="stat-label">❌ 未打卡</div></div>
      </div>
      <div class="action-bar">
        <button class="btn btn-export" @click="exportXLSX">📥 导出XLSX</button>
        <button class="btn btn-sync-score" @click="syncAttScores" :disabled="isAttSynced">
          {{ isAttSynced ? '✅ 已同步积分' : '⚡ 一键同步按时考勤积分' }}
        </button>
        <button class="btn btn-refresh" @click="loadRecords">🔄 刷新</button>
      </div>
      <div v-if="isAttSynced" class="sync-done-bar">
        <span>✅ 考勤积分已同步！按时签到 +1分（{{ onTime.length }}人），可在「学生信息」和「课堂行为」中查看。</span>
      </div>
      <div class="card">
        <h2 style="color:#27ae60">✅ 按时打卡（+1分）</h2>
        <p v-if="!deadline" class="hint">请先设置截止时间</p>
        <p v-else-if="onTime.length===0" class="hint">暂无</p>
        <table v-else class="data-table"><thead><tr><th>序号</th><th>班级</th><th>学号</th><th>姓名</th><th>机器号</th><th>主机</th><th>鼠标</th><th>卫生</th><th>打卡时间</th><th>得分</th></tr></thead>
          <tbody><tr v-for="(s,i) in onTime" :key="s.id"><td>{{ i+1 }}</td><td>{{ s.className }}</td><td>{{ s.studentId }}</td><td>{{ s.studentName }}</td><td>{{ s.machineNo||'-' }}</td><td>{{ getLabel(hostMap,s.hostUsage) }}</td><td>{{ getLabel(mouseMap,s.mouseUsage) }}</td><td>{{ getLabel(hygieneMap,s.hygiene) }}</td><td>{{ s.submitTimeStr }}</td><td class="score-plus">+1</td></tr></tbody>
        </table>
      </div>
      <div class="card">
        <h2 style="color:#f39c12">⚠️ 未按时打卡（0分）</h2>
        <p v-if="!deadline" class="hint">请先设置截止时间</p>
        <p v-else-if="late.length===0" class="hint">暂无</p>
        <table v-else class="data-table"><thead><tr><th>序号</th><th>班级</th><th>学号</th><th>姓名</th><th>机器号</th><th>打卡时间</th><th>得分</th></tr></thead>
          <tbody><tr v-for="(s,i) in late" :key="s.id"><td>{{ i+1 }}</td><td>{{ s.className }}</td><td>{{ s.studentId }}</td><td>{{ s.studentName }}</td><td>{{ s.machineNo||'-' }}</td><td>{{ s.submitTimeStr }}</td><td class="score-zero">0</td></tr></tbody>
        </table>
      </div>
      <div class="card">
        <h2 style="color:#e74c3c">❌ 未打卡</h2>
        <p v-if="!deadline" class="hint">请先设置截止时间</p>
        <p v-else-if="absent.length===0" class="hint">全部已打卡 🎉</p>
        <table v-else class="data-table"><thead><tr><th>序号</th><th>班级</th><th>学号</th><th>姓名</th><th>备注原因</th></tr></thead>
          <tbody><tr v-for="(s,i) in absent" :key="s.studentId+s.className"><td>{{ i+1 }}</td><td>{{ s.className }}</td><td>{{ s.studentId }}</td><td>{{ s.studentName }}</td><td><input class="remark-input" v-model="s.remark" placeholder="原因" @change="saveRoster" /></td></tr></tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import * as XLSX from 'xlsx'
import { useWorkbench } from '../composables/useWorkbench.js'

const { curInfo, curStudents, addBehavior } = useWorkbench()

const hostMap = { normal: '正常', abnormal: '异常', unused: '未使用' }
const mouseMap = { normal: '正常', abnormal: '异常', unused: '未使用' }
const hygieneMap = { good: '整洁', fair: '一般', bad: '较差' }
function getLabel(map, val) { return map[val] || val }

const deadline = ref('')
const deadlineSaved = ref(false)
const records = ref([])
const roster = ref([])
const showAddStudent = ref(false)
const newStudent = reactive({ className: '', studentId: '', studentName: '' })

function loadRoster() { roster.value = JSON.parse(localStorage.getItem('att_roster') || '[]') }
function saveRoster() { localStorage.setItem('att_roster', JSON.stringify(roster.value)) }
function loadRecords() { records.value = JSON.parse(localStorage.getItem('att_records') || '[]') }

function syncFromWorkbench() {
  const info = curInfo()
  const sts = curStudents()
  if (!info || sts.length === 0) { alert('当前班级无学生数据，请先在学生信息中导入'); return }
  roster.value = sts.map(s => ({
    className: info.name,
    studentId: s.studentId || s.id,
    studentName: s.name,
    machineNo: s.machineNo || '',
    remark: ''
  }))
  saveRoster()
  alert('已同步 ' + roster.value.length + ' 名学生')
}

function addStudent() {
  if (!newStudent.className || !newStudent.studentId || !newStudent.studentName) { alert('请填写完整'); return }
  if (roster.value.some(r => r.className === newStudent.className && r.studentId === newStudent.studentId)) { alert('已存在'); return }
  roster.value.push({ ...newStudent, remark: '' })
  saveRoster()
  newStudent.className = ''; newStudent.studentId = ''; newStudent.studentName = ''
  showAddStudent.value = false
}

function clearRoster() { if (confirm('确定清空？')) { roster.value = []; saveRoster() } }

function saveDeadline() {
  if (!deadline.value) { alert('请选择时间'); return }
  localStorage.setItem('att_deadline', deadline.value); deadlineSaved.value = true
}
function formatDL(val) { return val ? new Date(val).toLocaleString('zh-CN') : '' }

const onTime = computed(() => deadline.value ? records.value.filter(r => new Date(r.submitTime).getTime() <= new Date(deadline.value).getTime()) : [])
const late = computed(() => deadline.value ? records.value.filter(r => new Date(r.submitTime).getTime() > new Date(deadline.value).getTime()) : [])
const absent = computed(() => {
  const checked = new Set(records.value.map(r => r.className + '|' + r.studentId))
  return roster.value.filter(r => !checked.has(r.className + '|' + r.studentId))
})

function exportXLSX() {
  if (roster.value.length === 0) { alert('花名册为空'); return }
  const dl = deadline.value ? new Date(deadline.value).getTime() : 0
  const checkedMap = new Map(); records.value.forEach(r => checkedMap.set(r.className + '|' + r.studentId, r))
  const data = [['\u73ED\u7EA7', '\u5B66\u53F7', '\u59D3\u540D', '\u72B6\u6001', '\u5F97\u5206', '\u673A\u5668\u53F7', '\u4E3B\u673A', '\u9F20\u6807', '\u536B\u751F', '\u6253\u5361\u65F6\u95F4']]
  roster.value.forEach(item => {
    const rec = checkedMap.get(item.className + '|' + item.studentId)
    let status = '\u672A\u6253\u5361', score = '', machine = '', host = '', mouse = '', hygiene = '', time = ''
    if (rec) {
      const t = new Date(rec.submitTime).getTime()
      status = dl > 0 ? (t <= dl ? '\u6309\u65F6\u6253\u5361' : '\u672A\u6309\u65F6') : '\u5DF2\u6253\u5361'
      score = dl > 0 ? (t <= dl ? '+1' : '0') : '\u5DF2\u6253\u5361'
      machine = rec.machineNo || ''; host = getLabel(hostMap, rec.hostUsage); mouse = getLabel(mouseMap, rec.mouseUsage)
      hygiene = getLabel(hygieneMap, rec.hygiene); time = rec.submitTimeStr
    }
    data.push([item.className, item.studentId, item.studentName, status, score, machine, host, mouse, hygiene, time])
  })
  const ws = XLSX.utils.aoa_to_sheet(data)
  ws['!cols'] = [{wch:12},{wch:12},{wch:10},{wch:10},{wch:8},{wch:10},{wch:8},{wch:8},{wch:8},{wch:18}]
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, '\u8003\u52E4\u8BB0\u5F55')
  XLSX.writeFile(wb, '\u8003\u52E4\u8BB0\u5F55_' + new Date().toLocaleDateString('zh-CN') + '.xlsx')
}

// \u8003\u52E4\u79EF\u5206\u540C\u6B65
const attSynced = ref(false)
const isAttSynced = computed(() => attSynced.value || localStorage.getItem('att_scores_synced') === '1')

function syncAttScores() {
  if (isAttSynced.value) { alert('\u8003\u52E4\u79EF\u5206\u5DF2\u540C\u6B65\uFF0C\u4E0D\u53EF\u91CD\u590D\u64CD\u4F5C\uFF01'); return }
  if (!deadline.value) { alert('\u8BF7\u5148\u8BBE\u7F6E\u622A\u6B62\u65F6\u95F4'); return }
  if (onTime.value.length === 0) { alert('\u6682\u65E0\u6309\u65F6\u6253\u5361\u7684\u5B66\u751F'); return }
  if (!confirm(`\u786E\u5B9A\u5C06 ${onTime.value.length} \u540D\u6309\u65F6\u6253\u5361\u5B66\u751F +1\u5206 \u540C\u6B65\u5230\u5B66\u751F\u4FE1\u606F\u548C\u8BFE\u5802\u884C\u4E3A\uFF1F`)) return
  onTime.value.forEach(s => {
    addBehavior({
      type: '\u4E3B\u52A8\u63A2\u7A76',
      studentId: s.studentId,
      score: 1,
      note: '\u6309\u65F6\u8003\u52E4\u7B7E\u5230 +1\u5206'
    })
  })
  localStorage.setItem('att_scores_synced', '1')
  attSynced.value = true
  alert(`\u8003\u52E4\u79EF\u5206\u540C\u6B65\u5B8C\u6210\uFF01\n\u6309\u65F6\u7B7E\u5230 ${onTime.value.length} \u4EBA +1\u5206\n\n\u5DF2\u540C\u6B65\u5230\u8BFE\u5802\u884C\u4E3A\u4E0E\u5B66\u751F\u4FE1\u606F\u3002`)
}

onMounted(() => {
  loadRoster(); loadRecords()
  const saved = localStorage.getItem('att_deadline')
  if (saved) { deadline.value = saved; deadlineSaved.value = true }
  // Auto sync on mount
  const info = curInfo()
  const sts = curStudents()
  if (info && sts.length > 0 && roster.value.length === 0) {
    syncFromWorkbench()
  }
})
</script>

<style scoped>
.page { min-height: 100vh; background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%); padding: 30px 20px; }
.login-wrapper { display: flex; align-items: center; justify-content: center; min-height: 80vh; }
.login-card { background: #fff; border-radius: 16px; padding: 40px; width: 100%; max-width: 400px; box-shadow: 0 20px 60px rgba(0,0,0,0.3); text-align: center; }
.login-icon { font-size: 56px; margin-bottom: 12px; }
.login-card h1 { font-size: 22px; color: #333; margin-bottom: 24px; }
.login-card .form-group { text-align: left; margin-bottom: 14px; }
.login-card input { width: 100%; padding: 10px 14px; border: 2px solid #e0e0e0; border-radius: 8px; font-size: 14px; box-sizing: border-box; }
.login-card input:focus { outline: none; border-color: #2a5298; }
.login-card label { display: block; font-size: 13px; font-weight: 600; color: #333; margin-bottom: 5px; }
.login-error { color: #e74c3c; font-size: 13px; margin-bottom: 10px; }
.btn-login { width: 100%; padding: 12px; background: linear-gradient(135deg, #1e3c72, #2a5298); color: #fff; border: none; border-radius: 10px; font-size: 16px; font-weight: 600; cursor: pointer; }
.header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
.header h1 { color: #fff; font-size: 26px; margin: 0; }
.header-right { display: flex; align-items: center; gap: 12px; }
.welcome { color: rgba(255,255,255,0.85); font-size: 14px; }
.card { background: #fff; border-radius: 14px; padding: 24px; margin-bottom: 20px; box-shadow: 0 10px 40px rgba(0,0,0,0.15); }
.card h2 { margin: 0 0 14px; font-size: 18px; color: #333; }
.top-row { display: flex; gap: 20px; margin-bottom: 24px; }
.top-row .card { flex: 1; margin-bottom: 0; }
.deadline-form { display: flex; gap: 10px; align-items: center; margin-bottom: 10px; }
.deadline-input { flex: 1; padding: 9px 12px; border: 2px solid #e0e0e0; border-radius: 8px; font-size: 14px; }
.deadline-saved { color: #27ae60; font-size: 13px; margin: 0; }
.roster-hint { color: #888; font-size: 13px; margin: 0 0 12px; }
.roster-actions { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 10px; }
.roster-count { font-size: 13px; color: #555; margin: 0; }
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 100; }
.modal { background: #fff; border-radius: 14px; padding: 30px; width: 100%; max-width: 420px; }
.modal h3 { margin: 0 0 20px; font-size: 18px; }
.modal .form-group { margin-bottom: 14px; }
.modal label { display: block; font-size: 13px; font-weight: 600; color: #333; margin-bottom: 5px; }
.modal input { width: 100%; padding: 9px 12px; border: 2px solid #e0e0e0; border-radius: 8px; font-size: 14px; box-sizing: border-box; }
.modal-actions { display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px; }
.stats-row { display: flex; gap: 14px; margin-bottom: 20px; }
.stat-card { flex: 1; background: #fff; border-radius: 14px; padding: 20px; text-align: center; box-shadow: 0 10px 40px rgba(0,0,0,0.15); }
.stat-num { font-size: 36px; font-weight: 700; line-height: 1; margin-bottom: 6px; }
.stat-total .stat-num { color: #2a5298; } .stat-ontime .stat-num { color: #27ae60; }
.stat-late .stat-num { color: #f39c12; } .stat-absent .stat-num { color: #e74c3c; }
.stat-label { font-size: 13px; color: #666; }
.action-bar { display: flex; gap: 12px; margin-bottom: 20px; }
.btn { padding: 9px 20px; border: none; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; }
.btn-sm { padding: 6px 14px; font-size: 12px; }
.btn-primary { background: #2a5298; color: #fff; } .btn-primary:hover { background: #1e3c72; }
.btn-export { background: #27ae60; color: #fff; } .btn-refresh { background: #3498db; color: #fff; }
.btn-sync-score { background: #e67e22; color: #fff; } .btn-sync-score:disabled { opacity: 0.6; cursor: not-allowed; }
.sync-done-bar { background: #f0fff4; border: 1px solid #b7eb8f; border-radius: 8px; padding: 12px 16px; margin-bottom: 16px; font-size: 13px; color: #27ae60; }
.btn-danger { background: #e74c3c; color: #fff; } .btn-import { background: #8e44ad; color: #fff; cursor: pointer; }
.btn-outline { background: transparent; color: rgba(255,255,255,0.85); border: 1px solid rgba(255,255,255,0.4); }
.btn-cancel { background: #e0e0e0; color: #333; }
.hint { color: #999; font-style: italic; margin: 8px 0; }
.data-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.data-table th { background: #f5f7fa; padding: 10px 12px; text-align: left; font-weight: 600; color: #555; border-bottom: 2px solid #e8e8e8; }
.data-table td { padding: 10px 12px; border-bottom: 1px solid #f0f0f0; }
.data-table tr:hover { background: #fafbfc; }
.score-plus { color: #27ae60; font-weight: 700; font-size: 16px; }
.score-zero { color: #f39c12; font-weight: 700; font-size: 16px; }
.remark-input { width: 100%; padding: 6px 10px; border: 1.5px solid #e0e0e0; border-radius: 6px; font-size: 13px; box-sizing: border-box; }
</style>
