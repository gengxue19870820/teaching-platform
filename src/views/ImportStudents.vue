<template>
  <div>
    <div class="ws-title">导入学生信息</div>
    <div class="panel">
      <div class="panel-desc">
        可一次性导入所教所有班级的学生信息，包括年级、班级、学号、姓名、机器号、分组等。<br/>
        系统会根据年级和班级自动归类到对应班级。如班级不存在将自动创建。
      </div>
      <div class="actions">
        <button class="btn btn-primary" @click="downloadTemplate">📄 下载导入模板</button>
        <label class="btn btn-import import-label">📥 选择文件导入<input type="file" accept=".xlsx,.xls" @change="doImport" style="display:none" /></label>
      </div>
      <div class="template-info">
        <div class="info-title">模板格式说明</div>
        <table class="info-table">
          <thead><tr><th>列名</th><th>必填</th><th>说明</th></tr></thead>
          <tbody>
            <tr><td>年级</td><td class="yes">是</td><td>如：7、8、9</td></tr>
            <tr><td>班级</td><td class="yes">是</td><td>如：1、2、15</td></tr>
            <tr><td>学号</td><td class="yes">是</td><td>学生唯一标识</td></tr>
            <tr><td>姓名</td><td class="yes">是</td><td>学生姓名</td></tr>
            <tr><td>性别</td><td>否</td><td>男/女</td></tr>
            <tr><td>机器号</td><td>否</td><td>如：A01、B03</td></tr>
            <tr><td>分组</td><td>否</td><td>如：第1组</td></tr>
            <tr><td>座位号</td><td>否</td><td>如：1-1</td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="panel" v-if="importResult">
      <div class="result-header">
        <span class="result-icon">✅</span>
        <span>导入完成</span>
      </div>
      <div class="result-detail">
        <p>共识别 <strong>{{ importResult.total }}</strong> 条数据，成功导入 <strong class="success">{{ importResult.success }}</strong> 名学生</p>
        <p v-if="importResult.classes.length > 0">涉及班级：{{ importResult.classes.join('、') }}</p>
      </div>
    </div>

    <div class="panel">
      <div class="info-title">当前已导入的班级</div>
      <div class="class-list">
        <div v-for="id in state.classOrder" :key="id" class="class-item">
          <span class="ci-name">{{ state.classes[id]?.info.name }}</span>
          <span class="ci-count">{{ state.classes[id]?.data?.students?.length || 0 }} 人</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import * as XLSX from 'xlsx'
import { useWorkbench } from '../composables/useWorkbench.js'

const { state, importStudentsBatch } = useWorkbench()
const importResult = ref(null)

function downloadTemplate() {
  const data = [
    ['年级', '班级', '学号', '姓名', '性别', '机器号', '分组', '座位号'],
    ['7', '1', '001', '张三', '男', 'A01', '第1组', '1-1'],
    ['7', '1', '002', '李四', '女', 'A02', '第1组', '1-2'],
    ['7', '1', '003', '王五', '男', 'A03', '第2组', '2-1'],
    ['7', '15', '001', '赵六', '男', 'B01', '第1组', '1-1'],
    ['8', '3', '001', '孙七', '女', 'C01', '第1组', '1-1']
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
      const gradeKey = findKey(['年级|grade'])
      const classKey = findKey(['班级|class|classno'])
      const idKey = findKey(['学号|id|no|studentid'])
      const nameKey = findKey(['姓名|name|studentname'])
      const machKey = findKey(['机器号|machine|machineno'])
      const groupKey = findKey(['分组|group'])
      const genderKey = findKey(['性别|gender|sex'])
      const seatKey = findKey(['座位号|seat|seatno'])

      const normalized = rows.map(r => ({
        grade: String(r[gradeKey] || '').trim(),
        classNo: String(r[classKey] || '').trim(),
        studentId: String(r[idKey] || '').trim(),
        name: String(r[nameKey] || '').trim(),
        gender: String(r[genderKey] || '').trim(),
        machineNo: String(r[machKey] || '').trim(),
        group: String(r[groupKey] || '').trim(),
        seatNo: String(r[seatKey] || '').trim()
      })).filter(r => r.grade && r.classNo && r.name)

      const count = importStudentsBatch(normalized)
      const classSet = new Set(normalized.map(r => r.grade + '年级' + r.classNo + '班'))
      importResult.value = { total: normalized.length, success: count, classes: [...classSet] }
    } catch (err) {
      alert('导入失败：' + err.message)
    }
    e.target.value = ''
  }
  reader.readAsArrayBuffer(file)
}
</script>

<style scoped>
.ws-title { font-size: 20px; font-weight: 700; margin-bottom: 16px; }
.panel { background: var(--bg-card); border-radius: var(--radius); box-shadow: var(--shadow); padding: 20px; margin-bottom: 16px; }
.panel-desc { color: var(--text-secondary); font-size: 13px; line-height: 1.8; margin-bottom: 16px; }
.actions { display: flex; gap: 10px; margin-bottom: 20px; }
.btn { padding: 8px 18px; border-radius: var(--radius-sm); font-size: 13px; border: none; cursor: pointer; white-space: nowrap; font-weight: 600; }
.btn-primary { background: var(--primary); color: #fff; }
.btn-primary:hover { background: #1976d2; }
.btn-import { background: #8e24aa; color: #fff; cursor: pointer; display: inline-flex; align-items: center; }
.import-label { cursor: pointer; }

.template-info { border-top: 1px solid var(--border-light); padding-top: 16px; }
.info-title { font-size: 15px; font-weight: 600; margin-bottom: 12px; }
.info-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.info-table th { background: var(--bg-hover); padding: 8px 12px; text-align: left; font-weight: 600; }
.info-table td { padding: 8px 12px; border-bottom: 1px solid var(--border-light); }
.info-table .yes { color: var(--primary); font-weight: 600; }

.result-header { display: flex; align-items: center; gap: 10px; font-size: 16px; font-weight: 600; margin-bottom: 12px; }
.result-icon { font-size: 24px; }
.result-detail { color: var(--text-secondary); font-size: 14px; line-height: 1.8; }
.result-detail strong { font-size: 18px; }
.result-detail .success { color: var(--green); }

.class-list { display: flex; flex-wrap: wrap; gap: 10px; }
.class-item { background: var(--bg-hover); border: 1px solid var(--border-light); border-radius: var(--radius-sm); padding: 10px 16px; display: flex; align-items: center; gap: 10px; }
.ci-name { font-weight: 600; font-size: 14px; }
.ci-count { font-size: 12px; color: var(--text-light); background: var(--primary-bg); color: var(--primary); padding: 2px 8px; border-radius: 10px; }
</style>
