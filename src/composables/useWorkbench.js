import { reactive, computed } from 'vue'
import { useGithubSync } from './useGithubSync.js'

const DATA_KEY = 'teaching_mgmt_v3'
const POS_TYPES = ['专注投入', '主动探究', '合作分享', '创新实践', '帮助他人']
const NEG_TYPES = ['说话', '迟到', '敲键盘/乱换屏幕', '未关机', '其他违纪']

function genId(p) { return (p || 'id') + '_' + Date.now() + '_' + Math.floor(Math.random() * 1000) }
function todayStr() { const d = new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2) }

function defaultData() {
  return {
    classes: {},
    classOrder: [],
    currentClassId: null,
    timetable: {},
    todos: []
  }
}

function defaultClassData() {
  return { students: [], behaviors: [], seats: { seatBoxes: [] } }
}

const raw = localStorage.getItem(DATA_KEY)
let init
try { init = JSON.parse(raw) } catch { init = null }
if (!init || !init.classes) init = defaultData()
if (!init.classOrder || !init.classOrder.length) {
  const id = 'c_7_1'
  init.classes[id] = { info: { name: '7年级1班', grade: '7', classNo: '1', teacher: '信息科技教师' }, data: defaultClassData() }
  init.classOrder = [id]
  init.currentClassId = id
}
if (!init.timetable) init.timetable = {}
if (!init.todos) init.todos = []

/* ---- 旧数据迁移：课表改为全局(不随班级变化) ---- */
if (init.timetable) {
  const ttKeys = Object.keys(init.timetable)
  const isClassKeyed = ttKeys.length > 0 && ttKeys.every(k => /^c_/.test(k))
  if (isClassKeyed) {
    const cid = init.currentClassId || (init.classOrder && init.classOrder[0])
    init.timetable = cid && init.timetable[cid] ? { ...init.timetable[cid] } : {}
  }
}

/* ---- 旧数据迁移：待办从按班级改为全局 ---- */
if (init.todos.length === 0 && init.classes) {
  for (const cid of Object.keys(init.classes)) {
    const classTodos = init.classes[cid]?.data?.todos
    if (classTodos && classTodos.length > 0) {
      init.todos = classTodos
      break
    }
  }
}
// 清理旧班级中的 todos 字段
if (init.classes) {
  Object.values(init.classes).forEach(c => { if (c.data) delete c.data.todos })
}

const state = reactive(init)

function save() {
  localStorage.setItem(DATA_KEY, JSON.stringify(state))
  // 触发自动同步到云端
  try { useGithubSync().triggerAutoPush() } catch { /* 初始化前忽略 */ }
}

function curInfo() { return state.currentClassId ? state.classes[state.currentClassId]?.info : null }
function curData() { return state.currentClassId ? state.classes[state.currentClassId]?.data : null }
function curStudents() { return curData()?.students || [] }
function curBehaviors() { return curData()?.behaviors || [] }
function curTodos() { return state.todos || [] }
function curSeats() { return curData()?.seats || { seatBoxes: [] } }

/* ---- 学生 ---- */
function addStudent(s) {
  const d = curData(); if (!d) return
  const ns = { ...s, id: s.id || genId('stu'), posScore: 0, negScore: 0 }
  d.students.push(ns); save(); return ns
}
function updateStudent(id, u) {
  const d = curData(); if (!d) return
  const i = d.students.findIndex(s => s.id === id)
  if (i >= 0) { Object.assign(d.students[i], u); save() }
}
function deleteStudent(id) {
  const d = curData(); if (!d) return
  d.students = d.students.filter(s => s.id !== id)
  d.behaviors = d.behaviors.filter(b => b.studentId !== id)
  if (d.seats?.seatBoxes) d.seats.seatBoxes.forEach(sb => { if (sb.studentId === id) sb.studentId = null })
  save()
}

/* ---- 行为 ---- */
function addBehavior(b) {
  const d = curData(); if (!d) return
  const nb = { ...b, id: genId('beh'), date: b.date || todayStr() }
  const isPos = !NEG_TYPES.includes(b.type)
  nb.score = isPos ? Math.abs(b.score || 2) : -Math.abs(b.score || 2)
  d.behaviors.push(nb)
  const stu = d.students.find(s => s.id === b.studentId || s.studentId === b.studentId)
  if (stu) { isPos ? (stu.posScore = (stu.posScore || 0) + nb.score) : (stu.negScore = (stu.negScore || 0) + nb.score) }
  save(); return nb
}
function updateBehavior(id, u) {
  const d = curData(); if (!d) return
  const i = d.behaviors.findIndex(b => b.id === id)
  if (i >= 0) {
    const old = d.behaviors[i], stu = d.students.find(s => s.id === old.studentId || s.studentId === old.studentId)
    if (stu) { const w = old.score > 0 ? 'posScore' : 'negScore'; stu[w] = Math.max(0, (stu[w] || 0) - Math.abs(old.score)) }
    Object.assign(d.behaviors[i], u)
    const nb = d.behaviors[i], stu2 = d.students.find(s => s.id === nb.studentId || s.studentId === nb.studentId)
    if (stu2) { const w = nb.score > 0 ? 'posScore' : 'negScore'; stu2[w] = (stu2[w] || 0) + Math.abs(nb.score) }
    save()
  }
}
function deleteBehavior(id) {
  const d = curData(); if (!d) return
  const b = d.behaviors.find(x => x.id === id)
  if (b) {
    const stu = d.students.find(s => s.id === b.studentId || s.studentId === b.studentId)
    if (stu) { const w = b.score > 0 ? 'posScore' : 'negScore'; stu[w] = Math.max(0, (stu[w] || 0) - Math.abs(b.score)) }
    d.behaviors = d.behaviors.filter(x => x.id !== id)
    save()
  }
}
function getStudentBehaviors(sid) { return curBehaviors().filter(b => b.studentId === sid || b.studentId === (curStudents().find(s => s.id === sid)?.studentId)) }

/* ---- 座位(自由画布) ---- */
function addSeatBox(x, y) {
  const d = curData(); if (!d) return
  if (!d.seats || !d.seats.seatBoxes) d.seats = { seatBoxes: [] }
  const box = { id: genId('seat'), x: x || 0, y: y || 0, studentId: null }
  d.seats.seatBoxes.push(box); save(); return box
}
function removeSeatBox(seatId) {
  const d = curData(); if (!d?.seats?.seatBoxes) return
  d.seats.seatBoxes = d.seats.seatBoxes.filter(s => s.id !== seatId); save()
}
function moveSeatBox(seatId, x, y) {
  const d = curData(); if (!d?.seats?.seatBoxes) return
  const box = d.seats.seatBoxes.find(s => s.id === seatId)
  if (box) { box.x = x; box.y = y; save() }
}
function assignSeatBox(seatId, studentId) {
  const d = curData(); if (!d?.seats?.seatBoxes) return
  d.seats.seatBoxes.forEach(sb => { if (sb.studentId === studentId) sb.studentId = null })
  const box = d.seats.seatBoxes.find(s => s.id === seatId)
  if (box) { box.studentId = studentId; save() }
}
function unassignSeatBox(seatId) {
  const d = curData(); if (!d?.seats?.seatBoxes) return
  const box = d.seats.seatBoxes.find(s => s.id === seatId)
  if (box) { box.studentId = null; save() }
}
function autoSeat() {
  const d = curData(); if (!d) return
  if (!d.seats || !d.seats.seatBoxes) d.seats = { seatBoxes: [] }
  const sts = [...d.students]
  d.seats.seatBoxes.forEach((sb, i) => { sb.studentId = i < sts.length ? sts[i].id : null })
  for (let i = d.seats.seatBoxes.length; i < sts.length; i++) {
    const col = (i - d.seats.seatBoxes.length) % 8
    const row = Math.floor((i - d.seats.seatBoxes.length) / 8)
    d.seats.seatBoxes.push({ id: genId('seat'), x: col * 90, y: row * 64, studentId: sts[i].id })
  }
  save()
}
function clearSeats() { const d = curData(); if (!d) return; d.seats = { seatBoxes: [] }; save() }

/* ---- 待办(全局) ---- */
function addTodo(t) { if (!state.todos) state.todos = []; state.todos.push({ ...t, id: genId('todo'), done: false }); save() }
function toggleTodo(id) { if (!state.todos) return; const t = state.todos.find(x => x.id === id); if (t) { t.done = !t.done; save() } }
function deleteTodo(id) { if (!state.todos) return; state.todos = state.todos.filter(x => x.id !== id); save() }

/* ---- 班级 ---- */
function createClass(grade, classNo) {
  const id = 'c_' + grade + '_' + classNo
  if (state.classes[id]) return id
  state.classes[id] = { info: { name: grade + '年级' + classNo + '班', grade: String(grade), classNo: String(classNo), teacher: '信息科技教师' }, data: defaultClassData() }
  state.classOrder.push(id); save(); return id
}
function deleteClass(id) {
  delete state.classes[id]
  state.classOrder = state.classOrder.filter(x => x !== id)
  if (state.currentClassId === id && state.classOrder.length) state.currentClassId = state.classOrder[0]
  save()
}
function switchClass(id) { state.currentClassId = id; save() }

/* ---- 课表 ---- */
/* 学期周次计算：以2026年9月1日所在周为第1周（单周） */
const SEMESTER_MONDAY = new Date('2026-08-31T00:00:00') // 第1周所在的周一
function getSemesterWeek() {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const diff = Math.floor((now - SEMESTER_MONDAY) / 86400000)
  if (diff < 0) return 0 // 学期未开始
  return Math.floor(diff / 7) + 1
}
function getCurrentWeekType() {
  const w = getSemesterWeek()
  if (w <= 0) return 'odd' // 学期未开始默认单周
  return w % 2 === 1 ? 'odd' : 'even'
}

function saveLesson(day, period, data) {
  const wt = data.weekType || 'all'
  if (wt === 'odd') {
    state.timetable[day + '-' + period + '-odd'] = { name: data.name, className: data.className, location: data.location, weekType: 'odd' }
  } else if (wt === 'even') {
    state.timetable[day + '-' + period + '-even'] = { name: data.name, className: data.className, location: data.location, weekType: 'even' }
  } else {
    state.timetable[day + '-' + period] = { name: data.name, className: data.className, location: data.location, weekType: 'all' }
  }
  save()
}
function removeLesson(day, period, weekType) {
  if (weekType === 'odd') {
    delete state.timetable[day + '-' + period + '-odd']
  } else if (weekType === 'even') {
    delete state.timetable[day + '-' + period + '-even']
  } else {
    delete state.timetable[day + '-' + period]
  }
  save()
}
function getWeekLessons() {
  const t = state.timetable || {}, res = []
  const wt = getCurrentWeekType()
  for (let d = 1; d <= 5; d++) {
    for (let p = 1; p <= 7; p++) {
      const oddL = t[d + '-' + p + '-odd']
      const evenL = t[d + '-' + p + '-even']
      const baseL = t[d + '-' + p]
      if (oddL || evenL) {
        const l = wt === 'odd' ? oddL : evenL
        if (l) res.push({ day: d, period: p, ...l })
      } else if (baseL) {
        res.push({ day: d, period: p, ...baseL })
      }
    }
  }
  return res
}
function getLesson(day, period) {
  const t = state.timetable
  if (!t) return null
  const oddL = t[day + '-' + period + '-odd']
  const evenL = t[day + '-' + period + '-even']
  const baseL = t[day + '-' + period]
  if (oddL || evenL) {
    const wt = getCurrentWeekType()
    return (wt === 'odd' ? oddL : evenL) || null
  }
  return baseL || null
}
/* 获取某格所有课程（含单双周信息） */
function getLessonAll(day, period) {
  const t = state.timetable
  if (!t) return { base: null, odd: null, even: null }
  return {
    base: t[day + '-' + period] || null,
    odd: t[day + '-' + period + '-odd'] || null,
    even: t[day + '-' + period + '-even'] || null
  }
}
/* 判断某格是否有单双周差异 */
function hasWeekDiff(day, period) {
  const t = state.timetable
  if (!t) return false
  return !!(t[day + '-' + period + '-odd'] || t[day + '-' + period + '-even'])
}

/* ---- 导入学生(批量,支持多班级) ---- */
function importStudentsBatch(rows) {
  let count = 0
  rows.forEach(r => {
    const g = String(r.grade || '').trim(), cn = String(r.classNo || r.class || '').trim()
    if (!g || !cn) return
    let cid = 'c_' + g + '_' + cn
    if (!state.classes[cid]) {
      state.classes[cid] = { info: { name: g + '年级' + cn + '班', grade: g, classNo: cn, teacher: '信息科技教师' }, data: defaultClassData() }
      state.classOrder.push(cid)
    }
    const stu = state.classes[cid].data.students
    const sid = String(r.studentId || r.id || '').trim()
    if (stu.find(s => s.id === sid)) return
    stu.push({
      id: sid || genId('stu'),
      name: String(r.name || r.studentName || '').trim(),
      studentId: sid,
      machineNo: String(r.machineNo || r.machine || '').trim(),
      group: String(r.group || '').trim(),
      seatNo: String(r.seatNo || '').trim(),
      level: r.level || '基础',
      posScore: 0, negScore: 0
    })
    count++
  })
  save()
  return count
}

export function useWorkbench() {
  return {
    state, curInfo, curData, curStudents, curBehaviors, curTodos, curSeats,
    addStudent, updateStudent, deleteStudent,
    addBehavior, updateBehavior, deleteBehavior, getStudentBehaviors,
    addSeatBox, removeSeatBox, moveSeatBox, assignSeatBox, unassignSeatBox, autoSeat, clearSeats,
    addTodo, toggleTodo, deleteTodo,
    createClass, deleteClass, switchClass,
    saveLesson, removeLesson, getWeekLessons, getLesson, getLessonAll, hasWeekDiff, getCurrentWeekType, getSemesterWeek,
    importStudentsBatch,
    POS_TYPES, NEG_TYPES
  }
}
