<template>
  <div>
    <div class="ws-title">
      待办事项
      <div class="ws-actions">
        <button class="btn btn-default" @click="exportCSV" title="导出为CSV文件">📥 CSV</button>
        <button class="btn btn-default" @click="exportJSON" title="导出为JSON文件">📥 JSON</button>
        <button class="btn btn-primary" @click="openForm(null)">+ 添加待办</button>
      </div>
    </div>

    <div v-if="sorted.length === 0" class="empty">暂无待办，点击「添加待办」</div>
    <div v-for="t in sorted" :key="t.id" class="todo-item" :class="{ done: t.done }">
      <div class="chk" @click="doToggle(t.id)">
        <svg v-if="t.done" viewBox="0 0 24 24" width="12" height="12"><path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z" fill="#fff"/></svg>
      </div>
      <div class="t-title">{{ t.title }}</div>
      <span v-if="t.priority" class="tag" :class="priorityTag(t.priority)">{{ t.priority }}</span>
      <span v-if="t.due" class="t-meta">{{ t.due }}</span>
      <div class="t-del" @click="doDelete(t.id)">×</div>
    </div>

    <!-- 编辑弹窗 -->
    <div class="modal-overlay" v-if="showModal" @click.self="showModal = false">
      <div class="modal-box" style="width:420px">
        <div class="modal-header">
          <span>{{ editId ? '编辑' : '添加' }}待办</span>
          <span class="modal-close" @click="showModal = false">×</span>
        </div>
        <div class="modal-body">
          <div class="form-group"><label>事项</label><input v-model="form.title" placeholder="如：准备下周Python课件" /></div>
          <div class="form-row">
            <div class="form-group"><label>优先级</label>
              <select v-model="form.priority">
                <option value="高">高</option><option value="中">中</option><option value="低">低</option>
              </select>
            </div>
            <div class="form-group"><label>截止日期</label><input type="date" v-model="form.due" /></div>
          </div>
        </div>
        <div class="modal-footer">
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

const { curInfo, curData, curTodos, addTodo, toggleTodo, deleteTodo } = useWorkbench()

const showModal = ref(false)
const editId = ref(null)
const form = ref({})

const sorted = computed(() => {
  return [...(curTodos() || [])].sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1
    const pMap = { '高': 0, '中': 1, '低': 2 }
    return (pMap[a.priority] ?? 2) - (pMap[b.priority] ?? 2)
  })
})

function priorityTag(p) { return p === '高' ? 'tag-red' : p === '中' ? 'tag-orange' : 'tag-gray' }

function openForm(t) {
  editId.value = t?.id || null
  form.value = t ? { ...t } : { title: '', priority: '高', due: '' }
  showModal.value = true
}

function doSave() {
  if (!form.value.title?.trim()) { alert('请输入事项'); return }
  if (editId.value) {
    const todo = curTodos().find(x => x.id === editId.value)
    if (todo) { todo.title = form.value.title; todo.priority = form.value.priority; todo.due = form.value.due }
  } else {
    addTodo(form.value)
  }
  showModal.value = false
}

function doToggle(id) { toggleTodo(id) }
function doDelete(id) { if (confirm('删除该待办？')) deleteTodo(id) }

/* ---- 导出 ---- */
function getClassName() {
  const info = curInfo()
  return info ? info.name : '未知班级'
}

function exportCSV() {
  const todos = curTodos() || []
  if (!todos.length) { alert('暂无待办数据可导出'); return }
  const BOM = '\uFEFF'
  const header = '事项,优先级,截止日期,状态\n'
  const rows = todos.map(t => {
    const title = '"' + (t.title || '').replace(/"/g, '""') + '"'
    const priority = t.priority || ''
    const due = t.due || ''
    const done = t.done ? '已完成' : '未完成'
    return [title, priority, due, done].join(',')
  }).join('\n')
  const blob = new Blob([BOM + header + rows], { type: 'text/csv;charset=utf-8' })
  downloadBlob(blob, '待办事项_' + getClassName() + '.csv')
}

function exportJSON() {
  const todos = curTodos() || []
  if (!todos.length) { alert('暂无待办数据可导出'); return }
  const data = {
    className: getClassName(),
    exportTime: new Date().toLocaleString('zh-CN'),
    todos: todos.map(t => ({
      title: t.title || '',
      priority: t.priority || '',
      due: t.due || '',
      done: t.done ? '已完成' : '未完成'
    }))
  }
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' })
  downloadBlob(blob, '待办事项_' + getClassName() + '.json')
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
</script>

<style scoped>
.ws-title { font-size: 18px; font-weight: 700; margin-bottom: 12px; display: flex; align-items: center; gap: 8px; }
.ws-actions { margin-left: auto; display: flex; gap: 8px; }

.btn { padding: 6px 14px; border-radius: var(--radius-sm); font-size: 13px; border: none; cursor: pointer; }
.btn-primary { background: var(--primary); color: #fff; }
.btn-default { background: var(--bg-card); border: 1px solid var(--border); color: var(--text-primary); }

.todo-item { display: flex; align-items: center; gap: 10px; padding: 11px 14px; background: var(--bg-card); border-radius: var(--radius); box-shadow: var(--shadow); margin-bottom: 8px; }
.todo-item.done .t-title { text-decoration: line-through; color: var(--text-light); }
.chk { width: 18px; height: 18px; border: 2px solid var(--border); border-radius: 4px; cursor: pointer; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
.todo-item.done .chk { background: var(--green); border-color: var(--green); }
.t-title { flex: 1; font-size: 14px; }
.t-meta { font-size: 12px; color: var(--text-light); }
.t-del { color: var(--text-light); cursor: pointer; padding: 2px 6px; border-radius: 4px; font-size: 18px; }
.t-del:hover { background: #fdeaea; color: var(--red); }

.tag { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 11px; font-weight: 600; }
.tag-red { background: #fdeaea; color: var(--red); }
.tag-orange { background: #fff3e0; color: var(--orange); }
.tag-gray { background: #f0f0f0; color: var(--text-secondary); }

.empty { text-align: center; padding: 40px; color: var(--text-light); }

.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.4); display: flex; align-items: center; justify-content: center; z-index: 9999; }
.modal-box { background: var(--bg-card); border-radius: var(--radius); max-width: 92vw; max-height: 85vh; overflow-y: auto; box-shadow: var(--shadow-md); }
.modal-header { padding: 14px 20px; border-bottom: 1px solid var(--border); display: flex; align-items: center; font-size: 16px; font-weight: 600; }
.modal-close { margin-left: auto; cursor: pointer; font-size: 22px; color: var(--text-light); }
.modal-close:hover { color: var(--red); }
.modal-body { padding: 20px; }
.modal-footer { padding: 12px 20px; border-top: 1px solid var(--border); display: flex; justify-content: flex-end; gap: 8px; }
.form-group { margin-bottom: 14px; }
.form-group label { display: block; margin-bottom: 4px; font-size: 13px; color: var(--text-secondary); font-weight: 600; }
.form-group input, .form-group select { width: 100%; height: 36px; border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 0 10px; font-size: 14px; }
.form-row { display: flex; gap: 12px; }
.form-row .form-group { flex: 1; }
</style>
