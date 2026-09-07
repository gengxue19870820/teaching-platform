<template>
  <div>
    <div class="ws-title">
      学生信息
      <div class="ws-actions">
        <button class="btn btn-primary" @click="openForm(null)">+ 添加学生</button>
        <label class="btn btn-default import-label">📥 批量导入<input type="file" accept=".xlsx,.xls" @change="doImport" style="display:none" /></label>
        <button class="btn btn-default" @click="downloadTemplate">📄 导入模板</button>
        <button class="btn btn-default" @click="doExport">📤 导出</button>
      </div>
    </div>
    <div class="toolbar">
      <input v-model="filter" placeholder="搜索姓名/学号/机器号/分组" class="search-input" />
      <span class="stu-count">共 {{ filtered.length }} 名学生</span>
    </div>

    <div class="table-wrap" v-if="filtered.length > 0">
      <table>
        <thead><tr><th>学号</th><th>姓名</th><th>分组</th><th>机器号</th><th>加分</th><th>扣分</th><th>操作</th></tr></thead>
        <tbody>
          <tr v-for="s in filtered" :key="s.id">
            <td>{{ s.studentId || s.id }}</td>
            <td>{{ s.name }}</td>
            <td>{{ s.group || '-' }}</td>
            <td>{{ s.machineNo || '-' }}</td>
            <td class="score-pos">+{{ s.posScore || 0 }}</td>
            <td class="score-neg">-{{ s.negScore || 0 }}</td>
            <td>
              <button class="link-btn" @click="openForm(s)">编辑</button>
              <button class="link-btn" @click="viewBehavior(s)">行为</button>
              <button class="link-btn danger" @click="doDelete(s)">删除</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <div v-else class="empty">暂无学生数据，请添加或批量导入</div>

    <!-- 编辑/添加弹窗 -->
    <div class="modal-overlay" v-if="showForm" @click.self="showForm = false">
      <div class="modal-box small">
        <div class="modal-header">
          <span>{{ editingStudent ? '编辑学生' : '添加学生' }}</span>
          <span class="modal-close" @click="showForm = false">×</span>
        </div>
        <div class="modal-body">
          <div class="form-group"><label>学号</label><input v-model="form.studentId" placeholder="学号" /></div>
          <div class="form-group"><label>姓名</label><input v-model="form.name" placeholder="姓名" /></div>
          <div class="form-group"><label>性别</label>
            <select v-model="form.gender"><option value="">未指定</option><option>男</option><option>女</option></select>
          </div>
          <div class="form-group"><label>分组</label><input v-model="form.group" placeholder="如：第1组" /></div>
          <div class="form-group"><label>机器号</label><input v-model="form.machineNo" placeholder="如：A01" /></div>
          <div class="form-group"><label>座位号</label><input v-model="form.seatNo" placeholder="如：1-1" /></div>
          <div class="form-group"><label>基础水平</label>
            <select v-model="form.level"><option>入门</option><option>基础</option><option>熟练</option><option>进阶</option></select>
          </div>
          <div class="form-group"><label>特殊情况</label><textarea v-model="form.note" rows="2" placeholder="选填"></textarea></div>
          <div class="form-actions">
            <button class="btn btn-default" @click="showForm = false">取消</button>
            <button class="btn btn-primary" @click="doSave">保存</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 行为记录弹窗 -->
    <div class="modal-overlay" v-if="showBehavior" @click.self="showBehavior = false">
      <div class="modal-box">
        <div class="modal-header">
          <span>{{ behaviorStudent?.name }} - 课堂行为记录</span>
          <span class="modal-close" @click="showBehavior = false">×</span>
        </div>
        <div class="modal-body">
          <div class="behavior-summary">
            <span class="bstat pos">加分总计：+{{ behaviorStudent?.posScore || 0 }}</span>
            <span class="bstat neg">扣分总计：-{{ behaviorStudent?.negScore || 0 }}</span>
          </div>
          <div v-if="studentBehaviors.length === 0" class="empty">暂无行为记录</div>
          <table v-else class="beh-table">
            <thead><tr><th>日期</th><th>类型</th><th>分值</th><th>描述</th></tr></thead>
            <tbody>
              <tr v-for="b in studentBehaviors" :key="b.id">
                <td>{{ b.date }}</td>
                <td><span :class="b.score > 0 ? 'tag-pos' : 'tag-neg'">{{ b.type }}</span></td>
                <td :class="b.score > 0 ? 'score-pos' : 'score-neg'">{{ b.score > 0 ? '+' : '' }}{{ b.score }}</td>
                <td>{{ b.note || b.description || '-' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import * as XLSX from 'xlsx'
import { useWorkbench } from '../composables/useWorkbench.js'

const { curStudents, curInfo, addStudent, updateStudent, deleteStudent, getStudentBehaviors } = useWorkbench()

const filter = ref('')
const filtered = computed(() => {
  const q = filter.value.trim().toLowerCase()
  if (!q) return curStudents()
  return curStudents().filter(s => (s.name || '').toLowerCase().includes(q) || (s.studentId || s.id || '').toLowerCase().includes(q) || (s.machineNo || '').toLowerCase().includes(q) || (s.group || '').toLowerCase().includes(q))
})

const showForm = ref(false)
const editingStudent = ref(null)
const form = ref({})

function openForm(s) {
  editingStudent.value = s
  if (s) {
    form.value = { ...s }
  } else {
    form.value = { studentId: '', name: '', gender: '', group: '', machineNo: '', seatNo: '', level: '基础', note: '' }
  }
  showForm.value = true
}

function doSave() {
  if (!form.value.name) { alert('请输入姓名'); return }
  if (editingStudent.value) {
    updateStudent(editingStudent.value.id, form.value)
  } else {
    addStudent(form.value)
  }
  showForm.value = false
}

function doDelete(s) {
  if (confirm('确定删除学生 ' + s.name + '？相关行为记录和座位也将清除。')) deleteStudent(s.id)
}

const showBehavior = ref(false)
const behaviorStudent = ref(null)
const studentBehaviors = ref([])
function viewBehavior(s) {
  behaviorStudent.value = s
  studentBehaviors.value = getStudentBehaviors(s.id)
  showBehavior.value = true
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
      const idKey = findKey(['学号|id|no|studentid'])
      const nameKey = findKey(['姓名|name|studentname'])
      const machKey = findKey(['机器号|machine|machineno|机号'])
      const groupKey = findKey(['分组|group'])
      const genderKey = findKey(['性别|gender|sex'])
      let count = 0
      rows.forEach(r => {
        const name = String(r[nameKey] || '').trim()
        if (!name) return
        addStudent({
          studentId: String(r[idKey] || '').trim(),
          name,
          gender: String(r[genderKey] || '').trim(),
          group: String(r[groupKey] || '').trim(),
          machineNo: String(r[machKey] || '').trim(),
          level: '基础'
        })
        count++
      })
      alert('成功导入 ' + count + ' 名学生')
    } catch (err) { alert('导入失败：' + err.message) }
    e.target.value = ''
  }
  reader.readAsArrayBuffer(file)
}

function downloadTemplate() {
  const data = [['学号', '姓名', '性别', '分组', '机器号', '座位号'], ['001', '张三', '男', '第1组', 'A01', '1-1'], ['002', '李四', '女', '第1组', 'A02', '1-2']]
  const ws = XLSX.utils.aoa_to_sheet(data)
  ws['!cols'] = [{ wch: 10 }, { wch: 10 }, { wch: 6 }, { wch: 8 }, { wch: 8 }, { wch: 8 }]
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, '学生模板')
  XLSX.writeFile(wb, '学生导入模板.xlsx')
}

function doExport() {
  const sts = curStudents()
  if (sts.length === 0) { alert('暂无学生数据'); return }
  const info = curInfo()
  const data = [['班级', '学号', '姓名', '性别', '分组', '机器号', '座位号', '加分', '扣分']]
  sts.forEach(s => {
    data.push([info?.name || '', s.studentId || s.id, s.name, s.gender || '', s.group || '', s.machineNo || '', s.seatNo || '', s.posScore || 0, s.negScore || 0])
  })
  const ws = XLSX.utils.aoa_to_sheet(data)
  ws['!cols'] = [{ wch: 14 }, { wch: 10 }, { wch: 10 }, { wch: 6 }, { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 6 }, { wch: 6 }]
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, '学生信息')
  XLSX.writeFile(wb, (info?.name || '学生') + '_学生信息.xlsx')
}
</script>

<style scoped>
.ws-title { font-size: 20px; font-weight: 700; margin-bottom: 16px; display: flex; align-items: center; justify-content: space-between; }
.ws-actions { display: flex; gap: 8px; }
.toolbar { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
.search-input { padding: 7px 12px; border: 1px solid var(--border); border-radius: var(--radius-sm); font-size: 13px; width: 260px; }
.stu-count { font-size: 13px; color: var(--text-light); }
.table-wrap { background: var(--bg-card); border-radius: var(--radius); box-shadow: var(--shadow); overflow: hidden; }
table { width: 100%; border-collapse: collapse; font-size: 13px; }
thead th { background: var(--bg-hover); padding: 10px 12px; text-align: left; font-weight: 600; color: var(--text-secondary); border-bottom: 1px solid var(--border); }
tbody td { padding: 10px 12px; border-bottom: 1px solid var(--border-light); }
tbody tr:hover { background: var(--bg-hover); }
.score-pos { color: var(--green); font-weight: 700; }
.score-neg { color: var(--red); font-weight: 700; }
.link-btn { background: none; border: none; color: var(--primary); cursor: pointer; font-size: 13px; padding: 2px 6px; border-radius: 3px; }
.link-btn:hover { background: var(--primary-bg); }
.link-btn.danger { color: var(--red); }
.link-btn.danger:hover { background: #fdeaea; }
.empty { text-align: center; color: var(--text-light); padding: 40px 0; }

.btn { padding: 6px 14px; border-radius: var(--radius-sm); font-size: 13px; border: none; cursor: pointer; white-space: nowrap; }
.btn-primary { background: var(--primary); color: #fff; }
.btn-primary:hover { background: #1976d2; }
.btn-default { background: var(--bg-card); color: var(--text-primary); border: 1px solid var(--border); }
.btn-default:hover { background: var(--bg-hover); }
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

.behavior-summary { display: flex; gap: 20px; margin-bottom: 16px; }
.bstat { padding: 6px 14px; border-radius: var(--radius-sm); font-weight: 600; font-size: 14px; }
.bstat.pos { background: #e8f5e9; color: var(--green); }
.bstat.neg { background: #fdeaea; color: var(--red); }
.beh-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.beh-table th { background: var(--bg-hover); padding: 8px 10px; text-align: left; font-weight: 600; }
.beh-table td { padding: 8px 10px; border-bottom: 1px solid var(--border-light); }
.tag-pos { background: #e8f5e9; color: var(--green); padding: 2px 8px; border-radius: 3px; font-size: 12px; font-weight: 600; }
.tag-neg { background: #fdeaea; color: var(--red); padding: 2px 8px; border-radius: 3px; font-size: 12px; font-weight: 600; }
</style>
