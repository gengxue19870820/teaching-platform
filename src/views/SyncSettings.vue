<template>
  <div>
    <div class="ws-title">
      数据同步设置
      <div class="ws-actions"></div>
    </div>

    <div class="sync-card">
      <h3>🔑 GitHub 配置</h3>
      <p class="desc">通过 GitHub Gist 实现跨机器数据同步。需要先在 GitHub 创建 Personal Access Token。</p>

      <div class="form-group">
        <label>GitHub Token</label>
        <input v-model="formToken" type="password" placeholder="ghp_xxxxxxxxxxxx" />
      </div>
      <div class="form-group">
        <label>Gist ID <span class="hint">（首次上传后自动填写，也可手动填入已有 Gist ID）</span></label>
        <input v-model="formGistId" type="text" placeholder="留空则首次上传时自动创建" />
      </div>
      <div class="btn-row">
        <button class="btn btn-primary" @click="doSaveConfig">保存配置</button>
        <button class="btn btn-danger" @click="doClearConfig" v-if="formToken">清除配置</button>
      </div>
    </div>

    <div class="sync-card" v-if="token">
      <h3>🔄 同步操作</h3>
      <p class="desc" v-if="gistId">已关联 Gist，可双向同步。</p>
      <p class="desc" v-else>尚未关联 Gist，请先「上传」创建同步文件。</p>

      <div class="btn-row">
        <button class="btn btn-upload" @click="doPush" :disabled="loading">
          {{ loading ? '上传中…' : '⬆️ 上传（本地 → GitHub）' }}
        </button>
        <button class="btn btn-download" @click="doPull" :disabled="loading || !gistId">
          {{ loading ? '下载中…' : '⬇️ 下载（GitHub → 本地）' }}
        </button>
      </div>

      <div v-if="lastSyncTime" class="sync-info">
        最近同步时间：{{ lastSyncTime }}
      </div>
    </div>

    <div class="sync-card">
      <h3>💾 本地备份</h3>
      <p class="desc">将当前所有数据导出为 JSON 文件，或从备份文件恢复。</p>
      <div class="btn-row">
        <button class="btn btn-primary" @click="doExport">📥 导出全部数据</button>
        <label class="btn btn-upload" style="cursor:pointer">
          📤 从文件导入
          <input type="file" accept=".json" @change="doImport" style="display:none" />
        </label>
      </div>
    </div>

    <div class="sync-card">
      <h3>👨‍🎓 学生端数据发布</h3>
      <p class="desc">将学生名单、作业、考勤数据发布到公开 Gist，让学生端（任何设备）可以读取。每次修改数据后需重新发布。</p>
      <div class="btn-row">
        <button class="btn btn-upload" @click="doPublish" :disabled="loading">
          {{ loading ? '发布中…' : '📢 发布学生数据' }}
        </button>
      </div>
      <div v-if="publicGistId" class="sync-info">
        公开 Gist ID：<code>{{ publicGistId }}</code>
        <br><span class="hint">学生端会自动使用此 ID 读取数据</span>
      </div>
    </div>

    <div v-if="message" class="msg-box" :class="message.startsWith('✅') ? 'msg-ok' : 'msg-err'">
      {{ message }}
    </div>

    <div class="sync-card help-card">
      <h3>📖 使用说明</h3>
      <ol>
        <li>打开 <a href="https://github.com/settings/tokens" target="_blank">GitHub Token 设置页</a></li>
        <li>点击「Generate new token (classic)」</li>
        <li>勾选 <strong>gist</strong> 权限，生成并复制 Token</li>
        <li>将 Token 粘贴到上方输入框，保存配置</li>
        <li>点击「上传」将数据同步到 GitHub</li>
        <li>在另一台机器上，填入相同 Token 和 Gist ID，点击「下载」即可恢复数据</li>
      </ol>
      <p class="hint">⚠️ Token 仅存储在当前浏览器中，不会上传到任何服务器。请妥善保管。</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useGithubSync } from '../composables/useGithubSync.js'

const { token, gistId, publicGistId, loading, lastSyncTime, message, push, pull, publishStudentData, saveConfig, clearConfig, exportLocal, importLocal } = useGithubSync()

const formToken = ref('')
const formGistId = ref('')

onMounted(() => {
  formToken.value = token.value
  formGistId.value = gistId.value
})

function doSaveConfig() {
  saveConfig(formToken.value.trim(), formGistId.value.trim())
}
function doClearConfig() {
  if (confirm('确定清除同步配置？')) clearConfig()
  formToken.value = ''
  formGistId.value = ''
}
async function doPush() {
  const ok = await push()
  if (ok) formGistId.value = gistId.value
  if (ok) {
    // 同步后需要重新加载 useWorkbench 的状态
    setTimeout(() => location.reload(), 1000)
  }
}
async function doPull() {
  const ok = await pull()
  if (ok) setTimeout(() => location.reload(), 1500)
}
function doExport() { exportLocal() }
async function doImport(e) {
  const file = e.target.files[0]
  if (!file) return
  await importLocal(file)
}
async function doPublish() {
  await publishStudentData()
}
</script>

<style scoped>
.ws-title { font-size: 18px; font-weight: 700; margin-bottom: 16px; display: flex; align-items: center; gap: 8px; }
.ws-actions { margin-left: auto; }

.sync-card {
  background: var(--bg-card); border-radius: var(--radius); padding: 20px 24px;
  box-shadow: var(--shadow); margin-bottom: 16px;
}
.sync-card h3 { font-size: 16px; margin-bottom: 8px; color: var(--text-primary); }
.desc { font-size: 13px; color: var(--text-secondary); margin-bottom: 14px; line-height: 1.6; }

.form-group { margin-bottom: 14px; }
.form-group label { display: block; font-size: 13px; font-weight: 600; color: var(--text-secondary); margin-bottom: 4px; }
.form-group input { width: 100%; height: 38px; border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 0 12px; font-size: 14px; }
.form-group input:focus { outline: none; border-color: var(--primary); }
.hint { font-size: 12px; color: var(--text-light); font-weight: 400; }

.btn-row { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 4px; }
.btn { padding: 8px 18px; border-radius: var(--radius-sm); font-size: 13px; border: none; cursor: pointer; font-weight: 600; transition: opacity .15s; }
.btn:hover { opacity: 0.85; }
.btn:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-primary { background: var(--primary); color: #fff; }
.btn-danger { background: var(--red); color: #fff; }
.btn-upload { background: var(--green); color: #fff; }
.btn-download { background: var(--purple); color: #fff; }

.sync-info { margin-top: 12px; font-size: 13px; color: var(--text-secondary); padding: 8px 12px; background: var(--bg-page); border-radius: var(--radius-sm); }

.msg-box { padding: 12px 16px; border-radius: var(--radius); margin-bottom: 16px; font-size: 14px; font-weight: 500; }
.msg-ok { background: #e8f5e9; color: #2e7d32; border: 1px solid #c8e6c9; }
.msg-err { background: #fdeaea; color: #c62828; border: 1px solid #f5c6cb; }

.help-card ol { padding-left: 20px; font-size: 13px; color: var(--text-secondary); line-height: 2; }
.help-card a { color: var(--primary); text-decoration: none; }
.help-card a:hover { text-decoration: underline; }
</style>
