<template>
  <div class="page">
    <div class="header"><h1>📋 学生考勤登记</h1></div>
    <div v-if="noRoster" class="notice-card">
      <div class="notice-icon">⚠️</div>
      <h2>暂无考勤名单</h2>
      <p>教师尚未导入本节课学生花名册，请联系教师先完成花名册导入。</p>
    </div>
    <div v-else-if="submitted" class="success-card">
      <div class="success-icon">✅</div>
      <h2>登记成功！</h2>
      <p>提交时间：<strong>{{ submitTime }}</strong></p>
      <button class="btn btn-primary" @click="resetForm">继续登记</button>
    </div>
    <form v-else class="form-card" @submit.prevent="handleSubmit">
      <div class="form-row">
        <div class="form-group"><label>班级 <span class="required">*</span></label>
          <select v-model="form.className" required @change="onClassChange">
            <option value="" disabled>请选择班级</option>
            <option v-for="c in classOptions" :key="c" :value="c">{{ c }}</option>
          </select>
        </div>
        <div class="form-group"><label>学号 <span class="required">*</span></label>
          <select v-model="form.studentId" required @change="onStudentChange">
            <option value="" disabled>请选择学号</option>
            <option v-for="s in filteredStudents" :key="s.studentId" :value="s.studentId">{{ s.studentId }} - {{ s.studentName }}</option>
          </select>
        </div>
      </div>
      <div class="form-group"><label>学生姓名</label><input :value="form.studentName" type="text" readonly class="readonly-input" /></div>
      <div class="form-group"><label>机器号 <span class="required">*</span></label><input v-model="form.machineNo" type="text" placeholder="如：A1、A2、B3" required /></div>
      <fieldset><legend>主机使用情况 <span class="required">*</span></legend>
        <div class="radio-group">
          <label v-for="opt in hostOptions" :key="opt.value" class="radio-label"><input type="radio" v-model="form.hostUsage" :value="opt.value" required /><span>{{ opt.label }}</span></label>
        </div>
      </fieldset>
      <fieldset><legend>鼠标使用情况 <span class="required">*</span></legend>
        <div class="radio-group">
          <label v-for="opt in mouseOptions" :key="opt.value" class="radio-label"><input type="radio" v-model="form.mouseUsage" :value="opt.value" required /><span>{{ opt.label }}</span></label>
        </div>
      </fieldset>
      <fieldset><legend>卫生情况 <span class="required">*</span></legend>
        <div class="radio-group">
          <label v-for="opt in hygieneOptions" :key="opt.value" class="radio-label"><input type="radio" v-model="form.hygiene" :value="opt.value" required /><span>{{ opt.label }}</span></label>
        </div>
      </fieldset>
      <div class="form-group"><label>备注（选填）</label><textarea v-model="form.remark" rows="3" placeholder="如有特殊情况请在此说明"></textarea></div>
      <button type="submit" class="btn btn-submit">提交登记</button>
    </form>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'

const roster = ref([])
const noRoster = ref(false)
const hostOptions = [{ value: 'normal', label: '✅ 正常使用' }, { value: 'abnormal', label: '❌ 异常/损坏' }, { value: 'unused', label: '⚠️ 未使用' }]
const mouseOptions = [{ value: 'normal', label: '✅ 正常使用' }, { value: 'abnormal', label: '❌ 异常/损坏' }, { value: 'unused', label: '⚠️ 未使用' }]
const hygieneOptions = [{ value: 'good', label: '✅ 整洁' }, { value: 'fair', label: '⚠️ 一般' }, { value: 'bad', label: '❌ 较差' }]

const form = reactive({ className: '', studentId: '', studentName: '', machineNo: '', hostUsage: '', mouseUsage: '', hygiene: '', remark: '' })
const submitted = ref(false)
const submitTime = ref('')

const classOptions = computed(() => [...new Set(roster.value.map(r => r.className))])
const filteredStudents = computed(() => form.className ? roster.value.filter(r => r.className === form.className) : [])

function onClassChange() { form.studentId = ''; form.studentName = '' }
function onStudentChange() {
  const found = roster.value.find(r => r.className === form.className && r.studentId === form.studentId)
  form.studentName = found ? found.studentName : ''
}

function handleSubmit() {
  const now = new Date()
  const record = {
    className: form.className, studentId: form.studentId, studentName: form.studentName,
    machineNo: form.machineNo, hostUsage: form.hostUsage, mouseUsage: form.mouseUsage,
    hygiene: form.hygiene, remark: form.remark, submitTime: now.toISOString(),
    submitTimeStr: now.toLocaleString('zh-CN'), id: Date.now().toString()
  }
  const records = JSON.parse(localStorage.getItem('att_records') || '[]')
  records.push(record)
  localStorage.setItem('att_records', JSON.stringify(records))
  submitTime.value = now.toLocaleString('zh-CN')
  submitted.value = true
}

function resetForm() {
  Object.assign(form, { className: '', studentId: '', studentName: '', machineNo: '', hostUsage: '', mouseUsage: '', hygiene: '', remark: '' })
  submitted.value = false
}

onMounted(() => {
  roster.value = JSON.parse(localStorage.getItem('att_roster') || '[]')
  noRoster.value = roster.value.length === 0
})
</script>

<style scoped>
.page { min-height: 100vh; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px 20px; }
.header h1 { color: #fff; font-size: 28px; margin-bottom: 24px; }
.form-card, .success-card, .notice-card { max-width: 600px; margin: 0 auto; background: #fff; border-radius: 16px; padding: 36px; box-shadow: 0 20px 60px rgba(0,0,0,0.2); }
.success-card, .notice-card { text-align: center; }
.success-icon, .notice-icon { font-size: 64px; margin-bottom: 16px; }
.success-card h2 { color: #27ae60; margin-bottom: 12px; }
.notice-card h2 { color: #f39c12; margin-bottom: 12px; }
.success-card p, .notice-card p { color: #555; margin-bottom: 24px; }
.form-row { display: flex; gap: 16px; }
.form-row .form-group { flex: 1; }
.form-group { margin-bottom: 20px; }
.form-group label { display: block; font-size: 14px; font-weight: 600; color: #333; margin-bottom: 6px; }
.required { color: #e74c3c; }
input[type="text"], select, textarea { width: 100%; padding: 10px 14px; border: 2px solid #e0e0e0; border-radius: 8px; font-size: 14px; box-sizing: border-box; }
input:focus, select:focus, textarea:focus { outline: none; border-color: #667eea; }
.readonly-input { background: #f5f5f5; color: #666; cursor: not-allowed; }
fieldset { border: 2px solid #f0f0f0; border-radius: 10px; padding: 16px; margin-bottom: 20px; }
legend { font-size: 14px; font-weight: 600; color: #333; padding: 0 6px; }
.radio-group { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 8px; }
.radio-label { display: flex; align-items: center; gap: 6px; cursor: pointer; padding: 8px 14px; border-radius: 8px; border: 2px solid #e8e8e8; }
.radio-label:has(input:checked) { border-color: #667eea; background: rgba(102,126,234,0.08); }
.btn { padding: 12px 28px; border: none; border-radius: 10px; font-size: 15px; font-weight: 600; cursor: pointer; }
.btn-primary { background: #667eea; color: #fff; }
.btn-submit { width: 100%; background: linear-gradient(135deg, #667eea, #764ba2); color: #fff; font-size: 16px; padding: 14px; margin-top: 10px; }
</style>
