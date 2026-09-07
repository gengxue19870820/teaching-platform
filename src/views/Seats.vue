<template>
  <div>
    <div class="ws-title">
      座位管理
      <div class="ws-actions">
        <label class="btn btn-default import-label">📥 导入名单<input type="file" accept=".xlsx,.xls" @change="importStudents" style="display:none" /></label>
        <button class="btn btn-default" @click="exportSeats">📤 导出座次</button>
        <button class="btn btn-default" @click="doAuto">自动排座</button>
        <button class="btn btn-danger" @click="doClear">清空</button>
      </div>
    </div>

    <div class="seat-layout">
      <!-- 左侧：待安排学生 -->
      <div class="unassigned-panel">
        <div class="panel-title">待安排学生 ({{ unassigned.length }})</div>
        <div class="student-pool">
          <div v-for="s in unassigned" :key="s.id" class="drag-student" draggable="true"
               @dragstart="onStudentDragStart($event, s.id)" @dragend="onDragEnd">
            <span class="ds-name">{{ s.name }}</span>
            <span class="ds-id">{{ s.studentId || s.id }}</span>
          </div>
          <div v-if="unassigned.length === 0" class="empty-hint">全部已安排</div>
        </div>
      </div>

      <!-- 右侧：座位画布 -->
      <div class="canvas-panel" ref="canvasRef"
           @dragover.prevent="onCanvasDragOver" @drop="onCanvasDrop">
        <div class="canvas-toolbar">
          <button class="btn btn-primary btn-sm" @click="addSeat">+ 添加座位</button>
          <span class="hint">拖拽学生到虚线框 | 拖拽虚线框移动位置</span>
        </div>
        <div class="podium">讲 台</div>
        <div class="canvas-area" :style="{ minHeight: canvasHeight + 'px' }">
          <div v-for="seat in seatBoxes" :key="seat.id" class="seat-box"
               :class="{ occupied: seat.studentId, 'drag-over': hoverSeatId === seat.id, 'moving': movingSeatId === seat.id }"
               :style="{ left: seat.x + 'px', top: seat.y + 'px' }"
               @dragover.prevent.stop="onSeatDragOver(seat.id)" @dragleave.stop="hoverSeatId = null"
               @drop.stop="onSeatDrop(seat.id)">
            <!-- 移动把手（所有座位都有） -->
            <div class="seat-handle" @mousedown.stop="startMoveSeat($event, seat)" title="拖拽移动座位">
              <span class="handle-dots">⠿</span>
            </div>
            <!-- 已安排学生 -->
            <template v-if="getSeatStudent(seat)">
              <div class="seat-student" draggable="true"
                   @dragstart="onAssignedDragStart($event, seat)">
                <span class="ss-name">{{ getSeatStudent(seat).name }}</span>
                <span class="ss-id">{{ getSeatStudent(seat).studentId || getSeatStudent(seat).id }}</span>
              </div>
              <span class="seat-clear" @click.stop="clearSeatStudent(seat.id)" title="清空该座位">✕</span>
            </template>
            <!-- 空座位 -->
            <template v-else>
              <div class="seat-empty-inner">
                <span class="seat-label">{{ seatLabel(seat) }}</span>
              </div>
            </template>
            <!-- 删除座位按钮 -->
            <span class="seat-remove" @click.stop="removeSeat(seat.id)" title="删除座位">×</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import * as XLSX from 'xlsx'
import { useWorkbench } from '../composables/useWorkbench.js'

const { curStudents, curSeats, addStudent, addSeatBox, removeSeatBox, moveSeatBox, assignSeatBox, unassignSeatBox, autoSeat, clearSeats } = useWorkbench()

const canvasRef = ref(null)
const hoverSeatId = ref(null)
const movingSeatId = ref(null)
const dragType = ref(null) // 'student' | 'reassign' | 'move-seat'
const dragStudentId = ref(null)
const dragSourceSeatId = ref(null)
const canvasHeight = ref(500)

const seatBoxes = computed(() => curSeats()?.seatBoxes || [])

watch(() => curSeats(), () => {
  const boxes = curSeats()?.seatBoxes || []
  if (boxes.length > 0) {
    const maxY = Math.max(...boxes.map(b => b.y)) + 80
    canvasHeight.value = Math.max(500, maxY)
  }
}, { deep: true })

const unassigned = computed(() => {
  const assigned = new Set(seatBoxes.value.filter(s => s.studentId).map(s => s.studentId))
  return curStudents().filter(s => !assigned.has(s.id))
})

function getSeatStudent(seat) {
  return seat.studentId ? curStudents().find(s => s.id === seat.studentId) : null
}

function seatLabel(seat) {
  const idx = seatBoxes.value.indexOf(seat)
  return idx + 1
}

/* ---- 学生从待安排列表拖拽 ---- */
function onStudentDragStart(ev, studentId) {
  dragType.value = 'student'
  dragStudentId.value = studentId
  dragSourceSeatId.value = null
  ev.dataTransfer.effectAllowed = 'move'
  ev.dataTransfer.setData('text/plain', studentId)
}

/* ---- 已安排学生从座位拖出（重新分配） ---- */
function onAssignedDragStart(ev, seat) {
  dragType.value = 'reassign'
  dragStudentId.value = seat.studentId
  dragSourceSeatId.value = seat.id
  ev.dataTransfer.effectAllowed = 'move'
  ev.dataTransfer.setData('text/plain', seat.studentId)
  ev.stopPropagation()
}

function onDragEnd() {
  hoverSeatId.value = null
  movingSeatId.value = null
  dragType.value = null
  dragStudentId.value = null
  dragSourceSeatId.value = null
}

function onSeatDragOver(seatId) {
  if (dragType.value === 'student' || dragType.value === 'reassign') {
    hoverSeatId.value = seatId
  }
}

function onSeatDrop(seatId) {
  if (dragType.value === 'student' || dragType.value === 'reassign') {
    assignSeatBox(seatId, dragStudentId.value)
  }
  hoverSeatId.value = null
  dragType.value = null
  dragStudentId.value = null
  dragSourceSeatId.value = null
}

function onCanvasDragOver(ev) {
  if (dragType.value === 'student' || dragType.value === 'reassign') {
    ev.dataTransfer.dropEffect = 'move'
  }
}

function onCanvasDrop(ev) {
  // 拖到画布空白处：不再自动清空，学生保留在原座位
  onDragEnd()
}

/* ---- 移动座位框 ---- */
function startMoveSeat(ev, seat) {
  if (ev.button !== 0) return
  ev.preventDefault()
  const startX = ev.clientX, startY = ev.clientY
  const origX = seat.x, origY = seat.y
  movingSeatId.value = seat.id

  function onMove(e) {
    const dx = e.clientX - startX, dy = e.clientY - startY
    const nx = Math.max(0, origX + dx), ny = Math.max(0, origY + dy)
    moveSeatBox(seat.id, Math.round(nx / 10) * 10, Math.round(ny / 10) * 10)
  }
  function onUp() {
    document.removeEventListener('mousemove', onMove)
    document.removeEventListener('mouseup', onUp)
    movingSeatId.value = null
  }
  document.addEventListener('mousemove', onMove)
  document.addEventListener('mouseup', onUp)
}

/* ---- 座位操作 ---- */
function addSeat() {
  const boxes = seatBoxes.value
  const count = boxes.length
  const col = count % 8, row = Math.floor(count / 8)
  addSeatBox(col * 90, row * 64)
}

function removeSeat(seatId) {
  removeSeatBox(seatId)
}

function clearSeatStudent(seatId) {
  unassignSeatBox(seatId)
}

function doAuto() { autoSeat() }
function doClear() { if (confirm('确定清空所有座位？')) clearSeats() }

/* ---- 导入学生 ---- */
function importStudents(e) {
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
      const machKey = findKey(['机器号|machine|machineno'])
      const groupKey = findKey(['分组|group'])
      let count = 0
      rows.forEach(r => {
        const name = String(r[nameKey] || '').trim()
        if (!name) return
        addStudent({
          studentId: String(r[idKey] || '').trim(),
          name,
          machineNo: String(r[machKey] || '').trim(),
          group: String(r[groupKey] || '').trim()
        })
        count++
      })
      alert('导入 ' + count + ' 名学生')
    } catch (err) { alert('导入失败：' + err.message) }
    e.target.value = ''
  }
  reader.readAsArrayBuffer(file)
}

/* ---- 导出座次 ---- */
function exportSeats() {
  const boxes = seatBoxes.value
  if (boxes.length === 0) { alert('暂无座次数据'); return }
  const data = [['座位号', '学号', '姓名', '机器号', '分组']]
  boxes.forEach((seat, idx) => {
    if (seat.studentId) {
      const s = curStudents().find(x => x.id === seat.studentId)
      if (s) data.push(['座位' + (idx + 1), s.studentId || s.id, s.name, s.machineNo || '', s.group || ''])
    }
  })
  if (data.length <= 1) { alert('暂无已安排的学生'); return }
  const ws = XLSX.utils.aoa_to_sheet(data)
  ws['!cols'] = [{ wch: 8 }, { wch: 10 }, { wch: 10 }, { wch: 8 }, { wch: 8 }]
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, '座次表')
  XLSX.writeFile(wb, '座次表.xlsx')
}
</script>

<style scoped>
.ws-title { font-size: 20px; font-weight: 700; margin-bottom: 16px; display: flex; align-items: center; justify-content: space-between; }
.ws-actions { display: flex; gap: 8px; }

.seat-layout { display: flex; gap: 20px; }
.unassigned-panel { width: 200px; flex-shrink: 0; background: var(--bg-card); border-radius: var(--radius); box-shadow: var(--shadow); overflow: hidden; }
.panel-title { padding: 12px 16px; font-weight: 600; font-size: 14px; border-bottom: 1px solid var(--border-light); background: var(--bg-hover); }
.student-pool { padding: 8px; max-height: 650px; overflow-y: auto; }
.drag-student { display: flex; align-items: center; justify-content: space-between; padding: 8px 10px; margin-bottom: 4px; border-radius: var(--radius-sm); cursor: grab; background: var(--bg-hover); border: 1px solid var(--border-light); transition: .15s; }
.drag-student:hover { border-color: var(--primary); background: var(--primary-bg); }
.drag-student:active { cursor: grabbing; }
.ds-name { font-size: 13px; font-weight: 600; }
.ds-id { font-size: 11px; color: var(--text-light); }
.empty-hint { text-align: center; color: var(--text-light); padding: 20px 0; font-size: 13px; }

.canvas-panel { flex: 1; background: var(--bg-card); border-radius: var(--radius); box-shadow: var(--shadow); overflow: hidden; display: flex; flex-direction: column; }
.canvas-toolbar { padding: 10px 16px; border-bottom: 1px solid var(--border-light); display: flex; align-items: center; gap: 12px; }
.hint { color: var(--text-light); font-size: 12px; }
.podium { text-align: center; background: linear-gradient(135deg, var(--primary), #42a5f5); color: #fff; padding: 10px; font-size: 16px; font-weight: 700; letter-spacing: 8px; margin: 12px 16px 0; border-radius: var(--radius-sm); }
.canvas-area { position: relative; flex: 1; margin: 12px 16px 16px; min-height: 500px; }

.seat-box { position: absolute; width: 80px; border: 2px dashed var(--border); border-radius: var(--radius); display: flex; flex-direction: column; align-items: center; transition: border-color .15s, background .15s, box-shadow .15s; cursor: default; }
.seat-handle { width: 100%; padding: 2px 0; text-align: center; cursor: grab; background: rgba(0,0,0,.04); border-radius: var(--radius) var(--radius) 0 0; user-select: none; flex-shrink: 0; }
.seat-handle:hover { background: rgba(30,136,229,.12); }
.seat-handle:active { cursor: grabbing; background: rgba(30,136,229,.2); }
.handle-dots { font-size: 12px; color: var(--text-light); line-height: 1; letter-spacing: 2px; }
.seat-box:hover { border-color: var(--primary); box-shadow: 0 2px 8px rgba(30,136,229,.15); }
.seat-box.occupied { border-style: solid; border-color: var(--primary); background: var(--primary-bg); }
.seat-box.drag-over { border-color: var(--green); background: #e8f5e9; transform: scale(1.08); box-shadow: 0 4px 16px rgba(67,160,71,.25); }
.seat-box.moving { opacity: 0.7; z-index: 100; border-color: var(--orange); }

.seat-empty-inner { width: 100%; flex: 1; display: flex; align-items: center; justify-content: center; border-radius: var(--radius-sm); padding: 4px 0; }
.seat-label { font-size: 12px; color: var(--text-light); font-weight: 600; }

.seat-student { width: 100%; flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; cursor: grab; position: relative; padding: 4px 0; }
.seat-student:active { cursor: grabbing; }
.ss-name { font-size: 12px; font-weight: 600; color: var(--primary); }
.ss-id { font-size: 10px; color: var(--text-light); }

.seat-remove { position: absolute; top: -6px; right: -6px; width: 18px; height: 18px; background: var(--red); color: #fff; border-radius: 50%; font-size: 12px; display: flex; align-items: center; justify-content: center; cursor: pointer; opacity: 0; transition: .15s; z-index: 10; }
.seat-box:hover .seat-remove { opacity: 1; }
.seat-clear { position: absolute; bottom: -4px; right: -4px; width: 16px; height: 16px; background: var(--orange); color: #fff; border-radius: 50%; font-size: 9px; display: flex; align-items: center; justify-content: center; cursor: pointer; opacity: 0; transition: .15s; z-index: 10; }
.seat-box:hover .seat-clear { opacity: 1; }

.btn { padding: 6px 14px; border-radius: var(--radius-sm); font-size: 13px; border: none; cursor: pointer; white-space: nowrap; }
.btn-sm { padding: 4px 10px; font-size: 12px; }
.btn-primary { background: var(--primary); color: #fff; }
.btn-primary:hover { background: #1976d2; }
.btn-default { background: var(--bg-card); color: var(--text-primary); border: 1px solid var(--border); }
.btn-default:hover { background: var(--bg-hover); }
.btn-danger { background: var(--red); color: #fff; }
.import-label { cursor: pointer; display: inline-flex; align-items: center; }
</style>
