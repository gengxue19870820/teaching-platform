<template>
  <div>
    <div class="ws-title">课表安排</div>
    <div class="tt-wrap">
      <div class="tt-grid">
        <div class="tt-cell head">节次\日期</div>
        <div v-for="d in dayNames" :key="d" class="tt-cell head">{{ d }}</div>
        <template v-for="p in curData().timetable.periods" :key="p.no">
          <div class="tt-cell head">
            {{ p.label }}<br><span class="tt-time">{{ p.startTime }}-{{ p.endTime }}</span>
          </div>
          <div v-for="d in 5" :key="'c'+d+'_'+p.no" class="tt-cell" @click="openEdit(d, p.no)">
            <template v-if="getLesson(d, p.no)">
              <div class="tt-subj">{{ getLesson(d, p.no).subj }}</div>
              <div class="tt-meta">{{ getLesson(d, p.no).cls }} {{ getLesson(d, p.no).room }}</div>
            </template>
            <span v-else class="tt-empty">＋</span>
          </div>
        </template>
      </div>
    </div>

    <!-- 编辑弹窗 -->
    <div class="modal-overlay" v-if="showModal" @click.self="showModal = false">
      <div class="modal-box" style="width:420px">
        <div class="modal-header">
          <span>编辑课程（{{ editLabel }}）</span>
          <span class="modal-close" @click="showModal = false">×</span>
        </div>
        <div class="modal-body">
          <div class="form-group"><label>课程名称</label><input v-model="form.subj" placeholder="如：信息科技" /></div>
          <div class="form-group"><label>授课班级</label><input v-model="form.cls" placeholder="如：初一(3)班" /></div>
          <div class="form-group"><label>地点</label><input v-model="form.room" placeholder="如：计算机教室A" /></div>
        </div>
        <div class="modal-footer">
          <button v-if="currentLesson" class="btn btn-danger" @click="doClear">清空</button>
          <button class="btn btn-default" @click="showModal = false">取消</button>
          <button class="btn btn-primary" @click="doSave">保存</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useWorkbench } from '../composables/useWorkbench.js'

const { curData, saveLesson, clearLesson } = useWorkbench()
const dayNames = ['周一', '周二', '周三', '周四', '周五']
const showModal = ref(false)
const editDay = ref(0)
const editPeriod = ref(0)
const form = ref({ subj: '', cls: '', room: '' })

const editLabel = computed(() => {
  return dayNames[editDay.value - 1] + ' · ' + curData().timetable.periods.find(p => p.no === editPeriod.value)?.label
})

function getLesson(d, p) { return curData().timetable.lessons[`d${d}_p${p}`] || null }
const currentLesson = computed(() => getLesson(editDay.value, editPeriod.value))

function openEdit(d, p) {
  editDay.value = d; editPeriod.value = p
  const les = getLesson(d, p)
  form.value = les ? { ...les } : { subj: '', cls: '', room: '' }
  showModal.value = true
}

function doSave() {
  if (!form.value.subj?.trim()) { alert('请输入课程名称'); return }
  saveLesson(editDay.value, editPeriod.value, form.value)
  showModal.value = false
}

function doClear() {
  clearLesson(editDay.value, editPeriod.value)
  showModal.value = false
}
</script>

<style scoped>
.ws-title { font-size: 18px; font-weight: 700; margin-bottom: 12px; }
.tt-wrap { overflow: auto; }
.tt-grid { display: grid; grid-template-columns: 80px repeat(5, minmax(120px, 1fr)); gap: 1px; background: var(--border); border: 1px solid var(--border); border-radius: var(--radius); overflow: hidden; }
.tt-cell { background: var(--bg-card); padding: 8px; min-height: 56px; font-size: 12px; cursor: pointer; display: flex; flex-direction: column; gap: 2px; }
.tt-cell.head { background: var(--bg-hover); font-weight: 600; text-align: center; cursor: default; align-items: center; justify-content: center; }
.tt-time { font-weight: 400; font-size: 10px; color: var(--text-light); }
.tt-subj { font-weight: 600; color: var(--primary); }
.tt-meta { color: var(--text-secondary); font-size: 11px; }
.tt-empty { color: var(--text-light); }
.tt-cell:hover:not(.head) { background: var(--primary-bg); }

.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.4); display: flex; align-items: center; justify-content: center; z-index: 9999; }
.modal-box { background: var(--bg-card); border-radius: var(--radius); max-width: 92vw; max-height: 85vh; overflow-y: auto; box-shadow: var(--shadow-md); }
.modal-header { padding: 14px 20px; border-bottom: 1px solid var(--border); display: flex; align-items: center; font-size: 16px; font-weight: 600; }
.modal-close { margin-left: auto; cursor: pointer; font-size: 22px; color: var(--text-light); }
.modal-close:hover { color: var(--red); }
.modal-body { padding: 20px; }
.modal-footer { padding: 12px 20px; border-top: 1px solid var(--border); display: flex; justify-content: flex-end; gap: 8px; }
.form-group { margin-bottom: 14px; }
.form-group label { display: block; margin-bottom: 4px; font-size: 13px; color: var(--text-secondary); font-weight: 600; }
.form-group input { width: 100%; height: 36px; border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 0 10px; font-size: 14px; }
.btn { padding: 6px 14px; border-radius: var(--radius-sm); font-size: 13px; border: none; cursor: pointer; }
.btn-primary { background: var(--primary); color: #fff; }
.btn-default { background: var(--bg-card); border: 1px solid var(--border); color: var(--text-primary); }
.btn-danger { background: var(--red); color: #fff; }
</style>
