<template>
  <div class="tools-page">
    <div class="tools-header">
      <h1>🛠️ 课堂小工具</h1>
      <p class="tools-subtitle">实用的课堂教学辅助工具</p>
    </div>

    <div class="tools-grid">
      <!-- 倒计时器 -->
      <div class="tool-card">
        <div class="tool-icon">⏱️</div>
        <h2>倒计时器</h2>
        <div class="countdown-display" :class="{ 'countdown-warn': countdownRemain <= 60 && countdownRunning, 'countdown-done': countdownRemain === 0 && countdownRunning }">
          <span class="countdown-text">{{ countdownDisplay }}</span>
        </div>
        <div class="countdown-presets">
          <button v-for="m in presetMinutes" :key="m" class="preset-btn" :class="{ active: countdownMinutes === m }" @click="countdownMinutes = m">{{ m }}分钟</button>
          <div class="custom-time">
            <input type="number" v-model.number="countdownMinutes" min="1" max="120" class="custom-input" placeholder="自定义" />
            <span class="custom-label">分钟</span>
          </div>
        </div>
        <div class="tool-actions">
          <button v-if="!countdownRunning" class="tool-btn tool-btn-start" @click="startCountdown">▶ 开始</button>
          <button v-else class="tool-btn tool-btn-pause" @click="pauseCountdown">⏸ 暂停</button>
          <button class="tool-btn tool-btn-reset" @click="resetCountdown">🔄 重置</button>
        </div>
      </div>

      <!-- 正计时/秒表 -->
      <div class="tool-card">
        <div class="tool-icon">🕐</div>
        <h2>正计时器</h2>
        <div class="stopwatch-display">
          <span class="stopwatch-text">{{ stopwatchDisplay }}</span>
        </div>
        <div class="tool-actions">
          <button v-if="!stopwatchRunning" class="tool-btn tool-btn-start" @click="startStopwatch">▶ 开始</button>
          <button v-else class="tool-btn tool-btn-pause" @click="pauseStopwatch">⏸ 暂停</button>
          <button class="tool-btn tool-btn-reset" @click="resetStopwatch">🔄 重置</button>
        </div>
      </div>

      <!-- 随机点名 -->
      <div class="tool-card">
        <div class="tool-icon">🎲</div>
        <h2>随机点名</h2>
        <div class="random-display" :class="{ 'random-rolling': isRolling }">
          <span class="random-name">{{ randomName || '点击开始抽取' }}</span>
        </div>
        <div class="tool-actions">
          <button class="tool-btn tool-btn-start" @click="randomPick" :disabled="isRolling">{{ isRolling ? '抽取中...' : '🎯 抽取' }}</button>
          <button class="tool-btn tool-btn-reset" @click="resetRandom">🔄 重置</button>
        </div>
        <p class="tool-hint">从当前班级学生中随机抽取</p>
      </div>

      <!-- 分组工具 -->
      <div class="tool-card">
        <div class="tool-icon">👥</div>
        <h2>随机分组</h2>
        <div class="group-config">
          <label>分成</label>
          <input type="number" v-model.number="groupCount" min="2" max="20" class="group-input" />
          <label>组</label>
        </div>
        <div class="tool-actions">
          <button class="tool-btn tool-btn-start" @click="randomGroup">🎯 随机分组</button>
        </div>
        <div v-if="groups.length > 0" class="groups-result">
          <div v-for="(g, gi) in groups" :key="gi" class="group-item">
            <div class="group-title">第{{ gi + 1 }}组（{{ g.length }}人）</div>
            <div class="group-members">{{ g.join('、') }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onUnmounted } from 'vue'
import { useWorkbench } from '../composables/useWorkbench.js'

const { curStudents } = useWorkbench()

/* ---- 倒计时器 ---- */
const presetMinutes = [1, 3, 5, 10, 15, 20]
const countdownMinutes = ref(5)
const countdownRemain = ref(0)
const countdownDisplay = ref('05:00')
const countdownRunning = ref(false)
let countdownTimer = null
let countdownTarget = 0

function startCountdown() {
  if (countdownRemain.value === 0) {
    countdownTarget = Date.now() + countdownMinutes.value * 60 * 1000
  } else {
    countdownTarget = Date.now() + countdownRemain.value * 1000
  }
  countdownRunning.value = true
  runCountdown()
  countdownTimer = setInterval(runCountdown, 100)
}

function runCountdown() {
  const remain = Math.max(0, Math.ceil((countdownTarget - Date.now()) / 1000))
  countdownRemain.value = remain
  const m = Math.floor(remain / 60)
  const s = remain % 60
  countdownDisplay.value = String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0')
  if (remain === 0) {
    pauseCountdown()
    alert('⏰ 时间到！')
  }
}

function pauseCountdown() {
  countdownRunning.value = false
  if (countdownTimer) { clearInterval(countdownTimer); countdownTimer = null }
}

function resetCountdown() {
  pauseCountdown()
  countdownRemain.value = countdownMinutes.value * 60
  const m = Math.floor(countdownRemain.value / 60)
  const s = countdownRemain.value % 60
  countdownDisplay.value = String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0')
}

/* ---- 正计时器 ---- */
const stopwatchElapsed = ref(0)
const stopwatchDisplay = ref('00:00')
const stopwatchRunning = ref(false)
let stopwatchTimer = null
let stopwatchStart = 0

function startStopwatch() {
  stopwatchStart = Date.now() - stopwatchElapsed.value * 1000
  stopwatchRunning.value = true
  stopwatchTimer = setInterval(() => {
    stopwatchElapsed.value = Math.floor((Date.now() - stopwatchStart) / 1000)
    const m = Math.floor(stopwatchElapsed.value / 60)
    const s = stopwatchElapsed.value % 60
    stopwatchDisplay.value = String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0')
  }, 100)
}

function pauseStopwatch() {
  stopwatchRunning.value = false
  if (stopwatchTimer) { clearInterval(stopwatchTimer); stopwatchTimer = null }
}

function resetStopwatch() {
  pauseStopwatch()
  stopwatchElapsed.value = 0
  stopwatchDisplay.value = '00:00'
}

/* ---- 随机点名 ---- */
const randomName = ref('')
const isRolling = ref(false)
let rollTimer = null
const pickedIds = ref(new Set())

function randomPick() {
  const students = curStudents()
  const available = students.filter(s => !pickedIds.value.has(s.studentId || s.id))
  if (available.length === 0) { alert('全部学生已抽取完毕，请重置'); return }
  isRolling.value = true
  let count = 0
  rollTimer = setInterval(() => {
    const idx = Math.floor(Math.random() * available.length)
    randomName.value = available[idx].name
    count++
    if (count >= 15) {
      clearInterval(rollTimer)
      const finalIdx = Math.floor(Math.random() * available.length)
      randomName.value = available[finalIdx].name
      pickedIds.value.add(available[finalIdx].studentId || available[finalIdx].id)
      isRolling.value = false
    }
  }, 80)
}

function resetRandom() {
  pickedIds.value = new Set()
  randomName.value = ''
}

/* ---- 随机分组 ---- */
const groupCount = ref(4)
const groups = ref([])

function randomGroup() {
  const students = curStudents()
  if (students.length === 0) { alert('当前班级无学生'); return }
  const names = students.map(s => s.name)
  // Fisher-Yates shuffle
  for (let i = names.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [names[i], names[j]] = [names[j], names[i]]
  }
  const result = Array.from({ length: groupCount.value }, () => [])
  names.forEach((name, idx) => {
    result[idx % groupCount.value].push(name)
  })
  groups.value = result
}

onUnmounted(() => {
  if (countdownTimer) clearInterval(countdownTimer)
  if (stopwatchTimer) clearInterval(stopwatchTimer)
  if (rollTimer) clearInterval(rollTimer)
})

// Init countdown display
countdownDisplay.value = String(countdownMinutes.value).padStart(2, '0') + ':00'
</script>

<style scoped>
.tools-page { }
.tools-header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px 28px; border-radius: 12px; margin-bottom: 24px; }
.tools-header h1 { font-size: 22px; margin: 0 0 6px; }
.tools-subtitle { margin: 0; opacity: 0.9; font-size: 13px; }

.tools-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
.tool-card { background: var(--bg-card); border-radius: 12px; padding: 24px; box-shadow: var(--shadow); text-align: center; }
.tool-card h2 { font-size: 16px; color: var(--text-primary); margin-bottom: 16px; }
.tool-icon { font-size: 40px; margin-bottom: 8px; }

/* 倒计时 */
.countdown-display { margin-bottom: 16px; }
.countdown-text { font-size: 56px; font-weight: 700; font-family: 'Consolas', 'Courier New', monospace; color: var(--primary); letter-spacing: 3px; }
.countdown-warn .countdown-text { color: var(--orange); animation: blink 1s ease-in-out infinite; }
.countdown-done .countdown-text { color: var(--red); animation: blink 0.5s ease-in-out infinite; }
@keyframes blink { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }

.countdown-presets { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; margin-bottom: 16px; }
.preset-btn { padding: 6px 14px; border: 2px solid var(--border); border-radius: 20px; background: none; cursor: pointer; font-size: 13px; color: var(--text-secondary); transition: .15s; }
.preset-btn:hover { border-color: var(--primary); color: var(--primary); }
.preset-btn.active { border-color: var(--primary); background: var(--primary-bg); color: var(--primary); font-weight: 600; }
.custom-time { display: flex; align-items: center; gap: 4px; }
.custom-input { width: 60px; padding: 6px 8px; border: 2px solid var(--border); border-radius: 20px; text-align: center; font-size: 13px; }
.custom-input:focus { outline: none; border-color: var(--primary); }
.custom-label { font-size: 12px; color: var(--text-light); }

/* 正计时 */
.stopwatch-display { margin-bottom: 16px; }
.stopwatch-text { font-size: 56px; font-weight: 700; font-family: 'Consolas', 'Courier New', monospace; color: var(--green); letter-spacing: 3px; }

/* 随机点名 */
.random-display { margin-bottom: 16px; min-height: 80px; display: flex; align-items: center; justify-content: center; }
.random-name { font-size: 32px; font-weight: 700; color: var(--primary); }
.random-rolling .random-name { animation: shake 0.1s infinite; }
@keyframes shake { 0%,100% { transform: translateX(0); } 50% { transform: translateX(3px); } }

.tool-actions { display: flex; gap: 10px; justify-content: center; margin-bottom: 12px; }
.tool-btn { padding: 10px 24px; border: none; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 600; transition: .15s; }
.tool-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.tool-btn-start { background: linear-gradient(135deg, #27ae60, #2ecc71); color: #fff; }
.tool-btn-start:hover:not(:disabled) { box-shadow: 0 4px 12px rgba(39,174,96,.3); }
.tool-btn-pause { background: linear-gradient(135deg, #f39c12, #e67e22); color: #fff; }
.tool-btn-reset { background: #e0e0e0; color: #333; }
.tool-btn-reset:hover { background: #d0d0d0; }
.tool-hint { font-size: 12px; color: var(--text-light); margin: 0; }

/* 分组 */
.group-config { display: flex; align-items: center; justify-content: center; gap: 8px; margin-bottom: 16px; font-size: 14px; color: var(--text-secondary); }
.group-input { width: 60px; padding: 8px; border: 2px solid var(--border); border-radius: 8px; text-align: center; font-size: 16px; font-weight: 600; }
.group-input:focus { outline: none; border-color: var(--primary); }
.groups-result { text-align: left; margin-top: 12px; max-height: 240px; overflow-y: auto; }
.group-item { background: var(--bg-hover); border-radius: 8px; padding: 10px 14px; margin-bottom: 8px; }
.group-title { font-weight: 600; color: var(--primary); font-size: 13px; margin-bottom: 4px; }
.group-members { font-size: 13px; color: var(--text-secondary); line-height: 1.6; }
</style>
