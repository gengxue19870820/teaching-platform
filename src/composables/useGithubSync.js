import { ref } from 'vue'

const SYNC_KEYS = [
  'teaching_mgmt_v3',
  'hw_homework', 'hw_submissions', 'hw_students',
  'att_roster', 'att_records', 'att_deadline', 'att_session'
]

const TOKEN_KEY = 'github_sync_token'
const GIST_KEY = 'github_sync_gist_id'
const PUBLIC_GIST_KEY = 'github_sync_public_gist_id'
const PWD_KEY = 'github_sync_publish_pwd'
const FILE_NAME = 'teaching_platform_data.json'
const PUBLIC_FILE_NAME = 'student_data.json'

function getToken() { return localStorage.getItem(TOKEN_KEY) || '' }
function getGistId() { return localStorage.getItem(GIST_KEY) || '' }
function getPublicGistId() { return localStorage.getItem(PUBLIC_GIST_KEY) || '' }
function getPublishPwd() { return localStorage.getItem(PWD_KEY) || '' }
function setToken(v) { localStorage.setItem(TOKEN_KEY, v) }
function setGistId(v) { localStorage.setItem(GIST_KEY, v) }
function setPublicGistId(v) { localStorage.setItem(PUBLIC_GIST_KEY, v) }
function setPublishPwd(v) { localStorage.setItem(PWD_KEY, v) }

/* 收集所有需要同步的数据 */
function collectData() {
  const data = {}
  SYNC_KEYS.forEach(k => {
    const v = localStorage.getItem(k)
    if (v !== null) data[k] = v
  })
  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    updatedAtStr: new Date().toLocaleString('zh-CN'),
    data
  }
}

/* 从云端数据恢复到本地 */
function restoreData(payload) {
  if (!payload || !payload.data) return 0
  let count = 0
  SYNC_KEYS.forEach(k => {
    if (payload.data[k] !== undefined) {
      localStorage.setItem(k, payload.data[k])
      count++
    }
  })
  return count
}

/* GitHub Gist API 调用 */
async function apiRequest(url, method, body, token) {
  const resp = await fetch(url, {
    method,
    headers: {
      'Authorization': 'token ' + token,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json'
    },
    body: body ? JSON.stringify(body) : undefined
  })
  if (!resp.ok) {
    const errText = await resp.text().catch(() => '')
    let msg = '请求失败 (' + resp.status + ')'
    try { const j = JSON.parse(errText); if (j.message) msg = j.message } catch {}
    throw new Error(msg)
  }
  return resp.json()
}

/* 创建新 Gist */
async function createGist(token, payload) {
  return apiRequest('https://api.github.com/gists', 'POST', {
    description: '教学管理平台同步数据',
    public: false,
    files: { [FILE_NAME]: { content: JSON.stringify(payload) } }
  }, token)
}

/* 更新已有 Gist */
async function updateGist(token, gistId, payload) {
  return apiRequest('https://api.github.com/gists/' + gistId, 'PATCH', {
    files: { [FILE_NAME]: { content: JSON.stringify(payload) } }
  }, token)
}

/* 读取 Gist 内容 */
async function readGist(token, gistId) {
  const gist = await apiRequest('https://api.github.com/gists/' + gistId, 'GET', null, token)
  const file = gist.files[FILE_NAME]
  if (!file) throw new Error('Gist 中未找到同步文件')
  return JSON.parse(file.content)
}

/* ---- AES 加密/解密 (Web Crypto API) ---- */
function buf2b64(buf) { return btoa(String.fromCharCode(...new Uint8Array(buf))) }
function b642buf(b64) { return Uint8Array.from(atob(b64), c => c.charCodeAt(0)) }

async function deriveKey(password, salt) {
  const enc = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey'])
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

async function encryptData(data, password) {
  const enc = new TextEncoder()
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const key = await deriveKey(password, salt)
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(JSON.stringify(data)))
  return { salt: buf2b64(salt), iv: buf2b64(iv), data: buf2b64(encrypted), encrypted: true }
}

async function decryptData(payload, password) {
  const salt = b642buf(payload.salt)
  const iv = b642buf(payload.iv)
  const key = await deriveKey(password, salt)
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, b642buf(payload.data))
  return JSON.parse(new TextDecoder().decode(decrypted))
}

/* 提取学生名单数据（供学生端使用） */
function extractStudentData() {
  const mgmt = JSON.parse(localStorage.getItem('teaching_mgmt_v3') || '{}')
  const students = []
  if (mgmt.classes) {
    Object.values(mgmt.classes).forEach(c => {
      if (c.data && c.data.students) {
        c.data.students.forEach(s => {
          students.push({
            studentId: s.studentId || s.id,
            name: s.name,
            className: c.info ? c.info.name : '',
            grade: c.info ? c.info.grade : '',
            classNo: c.info ? c.info.classNo : ''
          })
        })
      }
    })
  }
  const hwStudents = JSON.parse(localStorage.getItem('hw_students') || '[]')
  hwStudents.forEach(s => {
    if (!students.find(x => x.studentId === s.id && x.name === s.name)) {
      students.push({ studentId: s.id, name: s.name, className: (s.grade || '') + (s.class || '') })
    }
  })
  const attRoster = JSON.parse(localStorage.getItem('att_roster') || '[]')
  attRoster.forEach(r => {
    if (!students.find(x => x.studentId === r.studentId && x.name === r.studentName)) {
      students.push({ studentId: r.studentId, name: r.studentName, className: r.className || '' })
    }
  })
  const hwHomework = JSON.parse(localStorage.getItem('hw_homework') || '[]')
  const hwSubmissions = JSON.parse(localStorage.getItem('hw_submissions') || '[]')
  const attRecords = JSON.parse(localStorage.getItem('att_records') || '[]')
  const attSessionRaw = localStorage.getItem('att_session')
  let attSession = null
  if (attSessionRaw) {
    try { attSession = JSON.parse(attSessionRaw) } catch { /* ignore */ }
  }
  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    updatedAtStr: new Date().toLocaleString('zh-CN'),
    students,
    homework: hwHomework,
    submissions: hwSubmissions,
    attRecords,
    attSession
  }
}

export function useGithubSync() {
  const token = ref(getToken())
  const gistId = ref(getGistId())
  const publicGistId = ref(getPublicGistId())
  const loading = ref(false)
  const lastSyncTime = ref('')
  const message = ref('')

  /* 上传（本地 → GitHub） */
  async function push() {
    if (!token.value) { message.value = '请先配置 GitHub Token'; return false }
    loading.value = true
    message.value = ''
    try {
      const payload = collectData()
      let gist
      if (gistId.value) {
        gist = await updateGist(token.value, gistId.value, payload)
      } else {
        gist = await createGist(token.value, payload)
        gistId.value = gist.id
        setGistId(gist.id)
      }
      lastSyncTime.value = payload.updatedAtStr
      localStorage.setItem('_sync_updated_at', payload.updatedAt)
      message.value = '✅ 上传成功！' + Object.keys(payload.data).length + ' 项数据已同步到 GitHub'
      return true
    } catch (e) {
      message.value = '❌ 上传失败：' + e.message
      return false
    } finally {
      loading.value = false
    }
  }

  /* 下载（GitHub → 本地） */
  async function pull() {
    if (!token.value) { message.value = '请先配置 GitHub Token'; return false }
    if (!gistId.value) { message.value = '请先上传一次数据以创建同步文件，或填入 Gist ID'; return false }
    loading.value = true
    message.value = ''
    try {
      const payload = await readGist(token.value, gistId.value)
      const count = restoreData(payload)
      lastSyncTime.value = payload.updatedAtStr || ''
      if (payload.updatedAt) localStorage.setItem('_sync_updated_at', payload.updatedAt)
      message.value = '✅ 下载成功！已恢复 ' + count + ' 项数据'
      return true
    } catch (e) {
      message.value = '❌ 下载失败：' + e.message
      return false
    } finally {
      loading.value = false
    }
  }

  /* 发布学生数据到公开 Gist（加密后存储） */
  async function publishStudentData(password) {
    if (!token.value) { message.value = '请先配置 GitHub Token'; return false }
    if (!password) { message.value = '请设置发布密码，用于加密学生数据'; return false }
    loading.value = true
    message.value = ''
    try {
      const rawData = extractStudentData()
      const data = await encryptData(rawData, password)
      let gist
      if (publicGistId.value) {
        gist = await apiRequest('https://api.github.com/gists/' + publicGistId.value, 'PATCH', {
          files: { [PUBLIC_FILE_NAME]: { content: JSON.stringify(data) } }
        }, token.value)
      } else {
        gist = await apiRequest('https://api.github.com/gists', 'POST', {
          description: '教学管理平台-学生数据（公开，供学生端读取）',
          public: true,
          files: { [PUBLIC_FILE_NAME]: { content: JSON.stringify(data) } }
        }, token.value)
        publicGistId.value = gist.id
        setPublicGistId(gist.id)
      }
      const studentCount = rawData.students.length
      message.value = '✅ 发布成功！' + studentCount + ' 名学生数据已加密发布，Gist ID: ' + gist.id
      return gist.id
    } catch (e) {
      message.value = '❌ 发布失败：' + e.message
      return false
    } finally {
      loading.value = false
    }
  }

  /* 保存配置 */
  function saveConfig(t, g) {
    token.value = t
    gistId.value = g
    setToken(t)
    setGistId(g)
    message.value = '✅ 配置已保存'
  }

  /* 清除配置 */
  function clearConfig() {
    token.value = ''
    gistId.value = ''
    publicGistId.value = ''
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(GIST_KEY)
    localStorage.removeItem(PUBLIC_GIST_KEY)
    lastSyncTime.value = ''
    message.value = '配置已清除'
  }

  /* 导出全部数据为 JSON 文件 */
  function exportLocal() {
    const payload = collectData()
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = '教学管理平台_备份_' + new Date().toISOString().slice(0, 10) + '.json'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    message.value = '✅ 数据已导出'
  }

  /* 从 JSON 文件导入数据 */
  function importLocal(file) {
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const payload = JSON.parse(e.target.result)
          const count = restoreData(payload)
          message.value = '✅ 导入成功！已恢复 ' + count + ' 项数据，页面将刷新'
          setTimeout(() => location.reload(), 1500)
          resolve(true)
        } catch (err) {
          message.value = '❌ 文件格式错误：' + err.message
          resolve(false)
        }
      }
      reader.readAsText(file)
    })
  }

  /* ---- 自动同步 ---- */
  let autoPushTimer = null
  let autoPullTimer = null
  let autoSyncRunning = false

  function triggerAutoPush() {
    if (!token.value || !gistId.value) return
    clearTimeout(autoPushTimer)
    autoPushTimer = setTimeout(async () => {
      if (loading.value) return
      loading.value = true
      try {
        const payload = collectData()
        if (gistId.value) {
          await updateGist(token.value, gistId.value, payload)
          lastSyncTime.value = payload.updatedAtStr
          localStorage.setItem('_sync_updated_at', payload.updatedAt)
          console.log('[自动同步] 数据已自动推送到云端', new Date().toLocaleTimeString())
        }
      } catch (e) {
        console.warn('[自动同步] 推送失败:', e.message)
      } finally {
        loading.value = false
      }
    }, 5000)
  }

  async function doAutoPull() {
    if (!token.value || !gistId.value || loading.value) return
    try {
      const gist = await apiRequest('https://api.github.com/gists/' + gistId.value, 'GET', null, token.value)
      const file = gist.files[FILE_NAME]
      if (!file) return
      const remote = JSON.parse(file.content)
      const localRaw = localStorage.getItem('_sync_updated_at')
      const localTime = localRaw ? new Date(localRaw).getTime() : 0
      const remoteTime = remote.updatedAt ? new Date(remote.updatedAt).getTime() : 0
      if (remoteTime > localTime + 5000) {
        restoreData(remote)
        localStorage.setItem('_sync_updated_at', remote.updatedAt)
        console.log('[自动同步] 检测到云端更新，已同步到本地', new Date().toLocaleTimeString())
        setTimeout(() => location.reload(), 800)
      }
    } catch (e) {
      console.warn('[自动同步] 拉取失败:', e.message)
    }
  }

  function startAutoSync() {
    if (!token.value || !gistId.value || autoSyncRunning) return
    autoSyncRunning = true
    // 监听 localStorage 变化，自动推送
    window._autoSyncHandler = (e) => {
      if (SYNC_KEYS.includes(e.key)) triggerAutoPush()
    }
    window.addEventListener('storage', window._autoSyncHandler)
    // 定时拉取远端更新 (60秒)
    autoPullTimer = setInterval(doAutoPull, 60000)
    // 首次延迟10秒后拉取
    setTimeout(doAutoPull, 10000)
    console.log('[自动同步] 已启动，每60秒检查云端更新')
  }

  function stopAutoSync() {
    autoSyncRunning = false
    clearTimeout(autoPushTimer)
    clearInterval(autoPullTimer)
    if (window._autoSyncHandler) {
      window.removeEventListener('storage', window._autoSyncHandler)
      delete window._autoSyncHandler
    }
  }

  return {
    token, gistId, publicGistId, loading, lastSyncTime, message,
    push, pull, publishStudentData, saveConfig, clearConfig,
    exportLocal, importLocal,
    startAutoSync, stopAutoSync, triggerAutoPush
  }
}
