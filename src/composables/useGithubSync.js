import { ref } from 'vue'

const SYNC_KEYS = [
  'teaching_mgmt_v3',
  'hw_homework', 'hw_submissions', 'hw_students',
  'att_roster', 'att_records', 'att_deadline'
]

const TOKEN_KEY = 'github_sync_token'
const GIST_KEY = 'github_sync_gist_id'
const FILE_NAME = 'teaching_platform_data.json'

function getToken() { return localStorage.getItem(TOKEN_KEY) || '' }
function getGistId() { return localStorage.getItem(GIST_KEY) || '' }
function setToken(v) { localStorage.setItem(TOKEN_KEY, v) }
function setGistId(v) { localStorage.setItem(GIST_KEY, v) }

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

export function useGithubSync() {
  const token = ref(getToken())
  const gistId = ref(getGistId())
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
      message.value = '✅ 下载成功！已恢复 ' + count + ' 项数据'
      return true
    } catch (e) {
      message.value = '❌ 下载失败：' + e.message
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
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(GIST_KEY)
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

  return {
    token, gistId, loading, lastSyncTime, message,
    push, pull, saveConfig, clearConfig,
    exportLocal, importLocal
  }
}
