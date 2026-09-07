<template>
  <div>
    <div class="ws-title">
      课堂行为记录
      <div class="ws-actions">
        <button class="btn btn-primary" @click="openForm(null)">+ 添加记录</button>
        <button class="btn btn-green" @click="openBatchAdd">⚡ 批量添加</button>
        <button class="btn btn-danger-outline" :disabled="selectedIds.length === 0" @click="batchDelete">🗑 删除选中（{{ selectedIds.length }}）</button>
        <label class="btn btn-default import-label">📥 导入<input type="file" accept=".xlsx,.xls" @change="doImport" style="display:none" /></label>
        <button class="btn btn-default" @click="doExport">📤 导出</button>
      </div>
    </div>
    <div class="toolbar">
      <select v-model="filterStudent"><option value="">全部学生</option><option v-for="s in curStudents()" :key="s.id" :value="s.id">{{ s.name }}</option></select>
      <select v-model="filterType">
        <option value="">全部类型</option>
        <optgroup label="积极行为"><option v-for="t in POS_TYPES" :key="t" :value="t">{{ t }}</option></optgroup>
        <optgroup label="消极行为"><option v-for="t in NEG_TYPES" :key="t" :value="t">{{ t }}</option></optgroup>
      </select>
      <input type="date" v-model="filterDate" />
      <button class="btn btn-default btn-sm" @click="clearFilter">重置</button>
      <span class="count-info">共 {{ filtered.length }} 条记录<span v-if="selectedIds.length > 0">，已选 {{ selectedIds.length }} 条</span></span>
    </div>

    <div class="table-wrap" v-if="filtered.length > 0">
      <table>
        <thead>
          <tr>
            <th class="th-check"><input type="checkbox" :checked="allChecked" @change="toggleAll" /></th>
            <th class="th-sortable" @click="toggleSort('date')">日期 <span class="sort-icon">{{ sortIndicator('date') }}</span></th>
            <th class="th-sortable" @click="toggleSort('name')">学生 <span class="sort-icon">{{ sortIndicator('name') }}</span></th>
            <th class="th-sortable" @click="toggleSort('type')">类型 <span class="sort-icon">{{ sortIndicator('type') }}</span></th>
            <th class="th-sortable" @click="toggleSort('score')">分值 <span class="sort-icon">{{ sortIndicator('score') }}</span></th>
            <th>描述</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="b in sortedFiltered" :key="b.id" :class="{ 'row-selected': selectedSet.has(b.id) }">
            <td class="td-check"><input type="checkbox" :checked="selectedSet.has(b.id)" @change="toggleRow(b.id)" /></td>
            <td>{{ b.date }}</td>
            <td>{{ getStudentName(b.studentId) }}</td>
            <td><span :class="b.score > 0 ? 'tag-pos' : 'tag-neg'">{{ b.type }}</span></td>
            <td :class="b.score > 0 ? 'score-pos' : 'score-neg'">{{ b.score > 0 ? '+' : '' }}{{ b.score }}</td>
            <td>{{ b.note || b.description || '-' }}</td>
            <td>
              <button class="link-btn" @click="openForm(b)">编辑</button>
              <button class="link-btn danger" @click="doDelete(b)">删除</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <div v-else class="empty">暂无行为记录</div>

    <!-- 编辑/添加弹窗 -->
    <div class="modal-overlay" v-if="showForm" @click.self="showForm = false">
      <div class="modal-box small">
        <div class="modal-header">
          <span>{{ editing ? '编辑记录' : '添加记录' }}</span>
          <span class="modal-close" @click="showForm = false">×</span>
        </div>
        <div class="modal-body">
          <div class="form-group"><label>日期</label><input type="date" v-model="form.date" /></div>
          <div class="form-group"><label>学生</label>
            <select v-model="form.studentId"><option value="">请选择</option><option v-for="s in curStudents()" :key="s.id" :value="s.id">{{ s.name }}（{{ s.studentId || s.id }}）</option></select>
          </div>
          <div class="form-group"><label>行为类型</label>
            <select v-model="form.type" @change="onTypeChange">
              <option value="">请选择</option>
              <optgroup label="积极行为"><option v-for="t in POS_TYPES" :key="t" :value="t">{{ t }}</option></optgroup>
              <optgroup label="消极行为"><option v-for="t in NEG_TYPES" :key="t" :value="t">{{ t }}</option></optgroup>
            </select>
          </div>
          <div class="form-group"><label>描述</label><textarea v-model="form.description" rows="2" placeholder="选填"></textarea></div>
          <div class="form-group"><label>分值</label><input type="number" v-model.number="form.score" /></div>
          <div class="form-group"><label>备注</label><input v-model="form.note" placeholder="选填" /></div>
          <div class="form-actions">
            <button class="btn btn-default" @click="showForm = false">取消</button>
            <button class="btn btn-primary" @click="doSave">保存</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 批量添加弹窗 -->
    <div class="modal-overlay" v-if="showBatchAdd" @click.self="showBatchAdd = false">
      <div class="modal-box">
        <div class="modal-header">
          <span>⚡ 批量添加行为记录</span>
          <span class="modal-close" @click="showBatchAdd = false">×</span>
        </div>
        <div class="modal-body">
          <div class="batch-section">
            <div class="form-group">
              <label>行为类型 <span class="required">*</span></label>
              <select v-model="batchForm.type" @change="onBatchTypeChange">
                <option value="">请选择</option>
                <optgroup label="积极行为"><option v-for="t in POS_TYPES" :key="t" :value="t">{{ t }}</option></optgroup>
                <optgroup label="消极行为"><option v-for="t in NEG_TYPES" :key="t" :value="t">{{ t }}</option></optgroup>
              </select>
            </div>
            <div class="batch-row">
              <div class="form-group"><label>日期</label><input type="date" v-model="batchForm.date" /></div>
              <div class="form-group"><label>分值</label><input type="number" v-model.number="batchForm.score" /></div>
            </div>
            <div class="form-group"><label>描述/备注</label><input v-model="batchForm.description" placeholder="选填" /></div>
          </div>
          <div class="batch-section">
            <div class="batch-stu-header">
              <label>选择学生（已选 {{ batchForm.studentIds.length }} 人）</label>
              <div class="batch-stu-actions">
                <button class="btn btn-sm btn-default" @click="selectAllBatchStudents">全选</button>
                <button class="btn btn-sm btn-default" @click="batchForm.studentIds = []">清空</button>
              </div>
            </div>
            <div class="batch-stu-search">
              <input v-model="batchStuFilter" placeholder="搜索姓名/学号..." />
            </div>
            <div class="batch-stu-list">
              <label v-for="s in batchStudentOptions" :key="s.id" class="batch-stu-item" :class="{ checked: batchForm.studentIds.includes(s.id) }">
                <input type="checkbox" :value="s.id" v-model="batchForm.studentIds" />
                <span class="batch-stu-name">{{ s.name }}</span>
                <span class="batch-stu-id">{{ s.studentId || s.id }}</span>
              </label>
            </div>
          </div>
          <div class="form-actions">
            <button class="btn btn-default" @click="showBatchAdd = false">取消</button>
            <button class="btn btn-primary" @click="doBatchAdd">确认添加（{{ batchForm.studentIds.length }} 条）</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onErrorCaptured } from 'vue'
import * as XLSX from 'xlsx'
import { useWorkbench } from '../composables/useWorkbench.js'

const { curStudents, curBehaviors, addBehavior, updateBehavior, deleteBehavior, POS_TYPES, NEG_TYPES } = useWorkbench()

onErrorCaptured((err, instance, info) => {
  console.error('Behaviors组件错误:', err, info)
  return false
})

const filterStudent = ref('')
const filterType = ref('')
const filterDate = ref('')

// 排序
const sortField = ref('date')
const sortDir = ref('desc')
function toggleSort(field) {
  if (sortField.value === field) { sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc' }
  else { sortField.value = field; sortDir.value = field === 'date' ? 'desc' : 'asc' }
}
function sortIndicator(field) {
  if (sortField.value !== field) return '↕'
  return sortDir.value === 'asc' ? '↑' : '↓'
}

const filtered = computed(() => {
  return curBehaviors().filter(b => {
    if (filterStudent.value) {
      const stu = curStudents().find(x => x.id === filterStudent.value)
      const matchIds = b.studentId === filterStudent.value || b.studentId === stu?.studentId
      if (!matchIds) return false
    }
    if (filterType.value && b.type !== filterType.value) return false
    if (filterDate.value && b.date !== filterDate.value) return false
    return true
  })
})

const sortedFiltered = computed(() => {
  try {
    const arr = [...filtered.value]
    const dir = sortDir.value === 'asc' ? 1 : -1
    arr.sort((a, b) => {
      let va, vb
      if (sortField.value === 'date') { va = a.date || ''; vb = b.date || ''; return dir * String(va).localeCompare(String(vb)) }
      if (sortField.value === 'name') { va = getStudentName(a.studentId) || ''; vb = getStudentName(b.studentId) || ''; return dir * String(va).localeCompare(String(vb)) }
      if (sortField.value === 'type') { va = a.type || ''; vb = b.type || ''; return dir * String(va).localeCompare(String(vb)) }
      if (sortField.value === 'score') { return dir * ((a.score || 0) - (b.score || 0)) }
      return 0
    })
    return arr
  } catch (e) {
    console.error('sortedFiltered排序错误:', e)
    return filtered.value
  }
})

// 选择
const selectedIds = ref([])
const selectedSet = computed(() => new Set(selectedIds.value))
const allChecked = computed(() => sortedFiltered.value.length > 0 && sortedFiltered.value.every(b => selectedSet.value.has(b.id)))
function toggleAll() {
  if (allChecked.value) { selectedIds.value = [] }
  else { selectedIds.value = sortedFiltered.value.map(b => b.id) }
}
function toggleRow(id) {
  const idx = selectedIds.value.indexOf(id)
  if (idx >= 0) { selectedIds.value.splice(idx, 1) } else { selectedIds.value.push(id) }
}
function batchDelete() {
  if (selectedIds.value.length === 0) return
  if (!confirm(`确定删除选中的 ${selectedIds.value.length} 条记录？`)) return
  selectedIds.value.forEach(id => deleteBehavior(id))
  selectedIds.value = []
}

function clearFilter() { filterStudent.value = ''; filterType.value = ''; filterDate.value = '' }
function getStudentName(sid) { const s = curStudents().find(x => x.id === sid || x.studentId === sid); return s ? s.name : sid }

const showForm = ref(false)
const editing = ref(null)
const form = ref({})

function todayStr() { const d = new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2) }

function openForm(b) {
  editing.value = b
  if (b) {
    form.value = { ...b }
  } else {
    form.value = { date: todayStr(), studentId: '', type: '', description: '', score: 2, note: '' }
  }
  showForm.value = true
}

function onTypeChange() {
  form.value.score = NEG_TYPES.includes(form.value.type) ? -2 : 2
}

function doSave() {
  if (!form.value.studentId) { alert('请选择学生'); return }
  if (!form.value.type) { alert('请选择行为类型'); return }
  if (editing.value) {
    updateBehavior(editing.value.id, form.value)
  } else {
    addBehavior(form.value)
  }
  showForm.value = false
}

function doDelete(b) {
  if (confirm('确定删除该记录？')) deleteBehavior(b.id)
}

// 批量添加
const showBatchAdd = ref(false)
const batchStuFilter = ref('')
const batchForm = ref({ date: todayStr(), type: '', score: 2, studentIds: [], description: '' })

const batchStudentOptions = computed(() => {
  const q = batchStuFilter.value.trim().toLowerCase()
  const sts = curStudents()
  if (!q) return sts
  return sts.filter(s => (s.name || '').toLowerCase().includes(q) || (s.studentId || s.id || '').toLowerCase().includes(q))
})

function openBatchAdd() {
  batchForm.value = { date: todayStr(), type: '', score: 2, studentIds: [], description: '' }
  batchStuFilter.value = ''
  showBatchAdd.value = true
}
function onBatchTypeChange() {
  batchForm.value.score = NEG_TYPES.includes(batchForm.value.type) ? -2 : 2
}
function selectAllBatchStudents() {
  batchForm.value.studentIds = batchStudentOptions.value.map(s => s.id)
}
function doBatchAdd() {
  if (!batchForm.value.type) { alert('请选择行为类型'); return }
  if (batchForm.value.studentIds.length === 0) { alert('请选择至少一名学生'); return }
  let count = 0
  batchForm.value.studentIds.forEach(sid => {
    addBehavior({
      date: batchForm.value.date,
      studentId: sid,
      type: batchForm.value.type,
      description: batchForm.value.description,
      score: batchForm.value.score
    })
    count++
  })
  showBatchAdd.value = false
  alert(`成功添加 ${count} 条行为记录`)
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
      const dateKey = findKey(['日期|date'])
      const sidKey = findKey(['学号|studentid|id|no'])
      const nameKey = findKey(['姓名|name|studentname'])
      const typeKey = findKey(['类型|type|行为'])
      const scoreKey = findKey(['分值|score|分'])
      const descKey = findKey(['描述|desc|description|备注'])
      const sts = curStudents()
      let count = 0
      rows.forEach(r => {
        const sid = String(r[sidKey] || '').trim()
        const name = String(r[nameKey] || '').trim()
        let stu = sts.find(s => s.id === sid || s.studentId === sid)
        if (!stu && name) stu = sts.find(s => s.name === name)
        if (!stu) return
        addBehavior({
          date: String(r[dateKey] || todayStr()),
          studentId: stu.id,
          type: String(r[typeKey] || '其他违纪'),
          description: String(r[descKey] || ''),
          score: Number(r[scoreKey]) || 2
        })
        count++
      })
      alert('成功导入 ' + count + ' 条记录')
    } catch (err) { alert('导入失败：' + err.message) }
    e.target.value = ''
  }
  reader.readAsArrayBuffer(file)
}

function doExport() {
  const bs = filtered.value
  if (bs.length === 0) { alert('暂无记录'); return }
  const data = [['日期', '学号', '姓名', '行为类型', '分值', '描述']]
  bs.forEach(b => {
    const s = curStudents().find(x => x.id === b.studentId || x.studentId === b.studentId)
    data.push([b.date, s?.studentId || s?.id || b.studentId, s?.name || '', b.type, b.score, b.note || b.description || ''])
  })
  const ws = XLSX.utils.aoa_to_sheet(data)
  ws['!cols'] = [{ wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 16 }, { wch: 6 }, { wch: 20 }]
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, '课堂行为')
  XLSX.writeFile(wb, '课堂行为记录.xlsx')
}
</script>

<style scoped>
.ws-title { font-size: 20px; font-weight: 700; margin-bottom: 16px; display: flex; align-items: center; justify-content: space-between; }
.ws-actions { display: flex; gap: 8px; flex-wrap: wrap; }
.toolbar { display: flex; align-items: center; gap: 10px; margin-bottom: 16px; flex-wrap: wrap; }
.toolbar select, .toolbar input { padding: 7px 10px; border: 1px solid var(--border); border-radius: var(--radius-sm); font-size: 13px; }
.count-info { font-size: 13px; color: var(--text-light); margin-left: auto; }
.table-wrap { background: var(--bg-card); border-radius: var(--radius); box-shadow: var(--shadow); overflow: hidden; }
table { width: 100%; border-collapse: collapse; font-size: 13px; }
thead th { background: var(--bg-hover); padding: 10px 12px; text-align: left; font-weight: 600; color: var(--text-secondary); border-bottom: 1px solid var(--border); user-select: none; }
thead th.th-sortable { cursor: pointer; }
thead th.th-sortable:hover { background: var(--border-light); color: var(--primary); }
.sort-icon { font-size: 12px; opacity: 0.5; margin-left: 2px; }
.th-sortable:hover .sort-icon, .sort-icon:not(:empty) { opacity: 1; }
th.th-check, td.td-check { width: 36px; text-align: center; }
th.th-check input, td.td-check input { cursor: pointer; }
tbody td { padding: 10px 12px; border-bottom: 1px solid var(--border-light); }
tbody tr:hover { background: var(--bg-hover); }
tbody tr.row-selected { background: #e8f0fe; }
tbody tr.row-selected:hover { background: #d6e4f7; }
.tag-pos { background: #e8f5e9; color: var(--green); padding: 2px 8px; border-radius: 3px; font-size: 12px; font-weight: 600; }
.tag-neg { background: #fdeaea; color: var(--red); padding: 2px 8px; border-radius: 3px; font-size: 12px; font-weight: 600; }
.score-pos { color: var(--green); font-weight: 700; }
.score-neg { color: var(--red); font-weight: 700; }
.link-btn { background: none; border: none; color: var(--primary); cursor: pointer; font-size: 13px; padding: 2px 6px; border-radius: 3px; }
.link-btn:hover { background: var(--primary-bg); }
.link-btn.danger { color: var(--red); }
.link-btn.danger:hover { background: #fdeaea; }
.empty { text-align: center; color: var(--text-light); padding: 40px 0; }

.btn { padding: 6px 14px; border-radius: var(--radius-sm); font-size: 13px; border: none; cursor: pointer; white-space: nowrap; }
.btn-sm { padding: 4px 10px; font-size: 12px; }
.btn:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-primary { background: var(--primary); color: #fff; }
.btn-primary:hover:not(:disabled) { background: #1976d2; }
.btn-default { background: var(--bg-card); color: var(--text-primary); border: 1px solid var(--border); }
.btn-default:hover:not(:disabled) { background: var(--bg-hover); }
.btn-green { background: #27ae60; color: #fff; }
.btn-green:hover:not(:disabled) { background: #219a52; }
.btn-danger-outline { background: transparent; color: var(--red); border: 1px solid var(--red); }
.btn-danger-outline:hover:not(:disabled) { background: #fdeaea; }
.import-label { cursor: pointer; display: inline-flex; align-items: center; }

.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.4); display: flex; align-items: center; justify-content: center; z-index: 9999; }
.modal-box { background: var(--bg-card); border-radius: var(--radius); width: 520px; max-width: 92vw; max-height: 85vh; overflow-y: auto; box-shadow: var(--shadow-md); }
.modal-box.small { width: 420px; }
.modal-header { padding: 14px 20px; border-bottom: 1px solid var(--border); display: flex; align-items: center; font-size: 16px; font-weight: 600; }
.modal-close { margin-left: auto; cursor: pointer; font-size: 22px; color: var(--text-light); width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; border-radius: 4px; }
.modal-close:hover { background: var(--bg-hover); color: var(--red); }
.modal-body { padding: 16px 20px; }
.form-group { margin-bottom: 14px; }
.form-group label { display: block; font-size: 13px; font-weight: 600; color: var(--text-secondary); margin-bottom: 4px; }
.form-group input, .form-group select, .form-group textarea { width: 100%; padding: 8px 12px; border: 1px solid var(--border); border-radius: var(--radius-sm); font-size: 13px; }
.form-actions { display: flex; gap: 10px; justify-content: flex-end; margin-top: 16px; }
.required { color: var(--red); }

.batch-section { margin-bottom: 16px; padding-bottom: 16px; border-bottom: 1px dashed var(--border-light); }
.batch-row { display: flex; gap: 12px; }
.batch-row .form-group { flex: 1; }
.batch-stu-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
.batch-stu-header label { font-size: 13px; font-weight: 600; color: var(--text-secondary); }
.batch-stu-actions { display: flex; gap: 6px; }
.batch-stu-search { margin-bottom: 8px; }
.batch-stu-search input { width: 100%; padding: 7px 10px; border: 1px solid var(--border); border-radius: var(--radius-sm); font-size: 13px; }
.batch-stu-list { max-height: 240px; overflow-y: auto; border: 1px solid var(--border-light); border-radius: var(--radius-sm); }
.batch-stu-item { display: flex; align-items: center; gap: 8px; padding: 8px 12px; cursor: pointer; border-bottom: 1px solid var(--border-light); transition: .1s; }
.batch-stu-item:last-child { border-bottom: none; }
.batch-stu-item:hover { background: var(--bg-hover); }
.batch-stu-item.checked { background: #e8f0fe; }
.batch-stu-item input { cursor: pointer; }
.batch-stu-name { flex: 1; font-size: 13px; }
.batch-stu-id { font-size: 11px; color: var(--text-light); font-family: monospace; }
</style>
