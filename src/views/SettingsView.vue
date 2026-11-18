<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import {
  Database,
  Eye,
  EyeOff,
  FolderOpen,
  Languages,
  ListRestart,
  Loader2,
  PlugZap,
  Save,
  Sparkles,
  Trash2
} from 'lucide-vue-next'
import { isTauri } from '@tauri-apps/api/core'
import { open } from '@tauri-apps/plugin-dialog'
import AppModal from '../components/AppModal.vue'
import ModelPicker from '../components/ModelPicker.vue'
import { reloadStore, saveSettings, state, ui } from '../store'
import { db } from '../db'
import { PROVIDER_PRESETS, listModels, testConnection } from '../utils/ai'
import type { AiSettings } from '../types'
import { disposeAllSources } from '../utils/source'
import { changeDataDir, getStorageState, openDataDir } from '../utils/storage'
import { toast } from '../composables/toast'
import { LOCALES, locale, setLocale, t, type Locale } from '../i18n'

const desktop = isTauri()
const ai = reactive({ ...state.settings.ai })
const showKey = ref(false)
const saving = ref(false)
const testing = ref(false)
const dataDir = ref('')
const pendingDir = ref('')
const applyingDir = ref(false)
const confirmClear = ref(false)

const providerKeys: AiSettings['provider'][] = ['moerouter', 'deepseek', 'qwen', 'custom']

const preset = computed(() => (ai.provider === 'custom' ? null : PROVIDER_PRESETS[ai.provider]))
/** 从接口拉取到的模型列表，按服务商分别缓存 */
const fetchedModels = reactive<Partial<Record<AiSettings['provider'], string[]>>>({})
const loadingModels = ref(false)
const modelOptions = computed(() => fetchedModels[ai.provider] ?? preset.value?.models ?? [])

const errorText = (error: unknown) => (error as Error)?.message || t('common.unknownError')

function onProviderChange() {
  if (!preset.value) return
  ai.baseUrl = preset.value.baseUrl
  ai.model = preset.value.model
  ai.visionModel = preset.value.visionModel
}

function onLocaleChange(event: Event) {
  setLocale((event.target as HTMLSelectElement).value as Locale)
}

async function fetchModels() {
  if (!ai.apiKey.trim()) {
    toast(t('settings.ai.needKey'), 'warning')
    return
  }
  loadingModels.value = true
  try {
    const models = await listModels({ baseUrl: ai.baseUrl, apiKey: ai.apiKey.trim() })
    if (!models.length) {
      toast(t('settings.ai.noModels'), 'warning')
      return
    }
    fetchedModels[ai.provider] = models
    toast(t('settings.ai.modelsFetched', { n: models.length }), 'success')
  } catch (error) {
    toast((error as Error).message || t('settings.ai.modelsFetchFailed'), 'error', 5600)
  } finally {
    loadingModels.value = false
  }
}

async function saveAll() {
  saving.value = true
  try {
    await saveSettings({ ai: { ...ai } })
    toast(t('settings.ai.saved'), 'success')
  } catch (error) {
    toast(t('settings.ai.saveFailed', { error: errorText(error) }), 'error')
  } finally {
    saving.value = false
  }
}

async function runTest() {
  if (!ai.apiKey.trim()) {
    toast(t('settings.ai.needKey'), 'warning')
    return
  }
  testing.value = true
  try {
    const reply = await testConnection({ ...ai })
    toast(t('settings.ai.connected', { reply: reply.slice(0, 40) }), 'success', 4200)
  } catch (error) {
    toast((error as Error).message || t('settings.ai.connectFailed'), 'error', 5600)
  } finally {
    testing.value = false
  }
}

async function loadStorageInfo() {
  if (!desktop) return
  try {
    dataDir.value = (await getStorageState()).dataDir
  } catch (error) {
    toast(t('settings.data.readDirFailed', { error: errorText(error) }), 'error', 4200)
  }
}

async function openStorageDir() {
  try {
    await openDataDir()
  } catch (error) {
    toast(t('settings.data.openDirFailed', { error: errorText(error) }), 'error', 4200)
  }
}

async function pickStorageDir() {
  const dir = await open({ directory: true, multiple: false, defaultPath: dataDir.value })
  if (typeof dir === 'string' && dir !== dataDir.value) pendingDir.value = dir
}

async function applyDirChange() {
  if (!pendingDir.value) return
  applyingDir.value = true
  try {
    const info = await changeDataDir(pendingDir.value)
    dataDir.value = info.dataDir
    pendingDir.value = ''
    await reloadStore()
    Object.assign(ai, state.settings.ai)
    toast(t('settings.changeDir.switched', { dir: info.dataDir }), 'success', 4200)
  } catch (error) {
    toast(t('settings.changeDir.failed', { error: errorText(error) }), 'error', 5200)
  } finally {
    applyingDir.value = false
  }
}

async function clearAllData() {
  await disposeAllSources()
  await db.clear('questions')
  await db.clear('papers')
  await db.clear('files')
  await db.clear('knowledge')
  state.questions = []
  state.papers = []
  state.knowledge = []
  ui.activePaperId = null
  ui.activeQuestionId = null
  ui.exportIds = []
  ui.bankKeyword = ''
  ui.cutPageByPaper = {}
  ui.view = 'import'
  confirmClear.value = false
  toast(t('settings.data.cleared'), 'success', 3000)
}

onMounted(() => {
  void loadStorageInfo()
})
</script>

<template>
  <div class="view">
    <div class="workspace settings-page">
      <div class="settings-grid">
        <div>
          <div class="card card-pad" style="margin-bottom: 16px">
            <div class="section-title"><Sparkles :size="16" style="color: var(--accent)" /> {{ t('settings.ai.title') }}</div>
            <div class="hint" style="margin-bottom: 14px">{{ t('settings.ai.intro') }}</div>

            <div class="field">
              <label class="label">{{ t('settings.ai.provider') }}</label>
              <select v-model="ai.provider" class="select" @change="onProviderChange">
                <option v-for="key in providerKeys" :key="key" :value="key">{{ t(`settings.ai.providers.${key}`) }}</option>
              </select>
              <div v-if="preset?.keyUrl" class="hint" style="margin-top: 4px">
                <template v-if="ai.provider === 'moerouter'">{{ t('settings.ai.moerouterHint') }} </template>
                {{ t('settings.ai.keyWhere', { url: preset.keyUrl }) }}
              </div>
            </div>

            <div class="field">
              <label class="label">{{ t('settings.ai.baseUrl') }}</label>
              <input v-model="ai.baseUrl" class="input" placeholder="https://api.example.com/v1" spellcheck="false" />
            </div>

            <div class="row-2">
              <div class="field">
                <label class="label model-label">
                  {{ t('settings.ai.model') }}
                  <button class="link-btn" :disabled="loadingModels" :title="t('settings.ai.fetchModelsTitle')" @click="fetchModels">
                    <Loader2 v-if="loadingModels" :size="12" class="spin" />
                    <ListRestart v-else :size="12" /> {{ t('settings.ai.fetchModels') }}
                  </button>
                </label>
                <ModelPicker v-model="ai.model" :options="modelOptions" />
              </div>
              <div class="field">
                <label class="label">{{ t('settings.ai.temperature', { value: ai.temperature.toFixed(2) }) }}</label>
                <input v-model.number="ai.temperature" type="range" min="0" max="1" step="0.05" style="width: 100%; accent-color: var(--accent); margin-top: 8px" />
              </div>
            </div>

            <div class="field">
              <label class="label">{{ t('settings.ai.visionModel') }}</label>
              <ModelPicker v-model="ai.visionModel" :options="modelOptions" :empty-label="t('settings.ai.visionSameAsChat')" />
              <div class="hint" style="margin-top: 4px">{{ t('settings.ai.visionHint') }}</div>
            </div>

            <div class="field">
              <label class="label">{{ t('settings.ai.apiKey') }}</label>
              <div style="position: relative">
                <input
                  v-model="ai.apiKey"
                  class="input"
                  :type="showKey ? 'text' : 'password'"
                  placeholder="sk-…"
                  spellcheck="false"
                  style="padding-right: 36px; font-family: ui-monospace, monospace"
                />
                <button class="key-toggle" @click="showKey = !showKey">
                  <EyeOff v-if="showKey" :size="15" />
                  <Eye v-else :size="15" />
                </button>
              </div>
            </div>

            <div style="display: flex; gap: 8px; margin-top: 16px">
              <button class="btn btn-primary" :disabled="saving" @click="saveAll">
                <Loader2 v-if="saving" :size="14" class="spin" />
                <Save v-else :size="14" /> {{ t('settings.ai.saveSettings') }}
              </button>
              <button class="btn" :disabled="testing" @click="runTest">
                <Loader2 v-if="testing" :size="14" class="spin" />
                <PlugZap v-else :size="14" /> {{ t('settings.ai.testConnection') }}
              </button>
            </div>
          </div>
        </div>

        <div>
          <div class="card card-pad" style="margin-bottom: 16px">
            <div class="section-title"><Languages :size="16" style="color: var(--accent)" /> {{ t('settings.language.title') }}</div>
            <select class="select" :value="locale" @change="onLocaleChange">
              <option v-for="item in LOCALES" :key="item.value" :value="item.value">{{ item.label }}</option>
            </select>
            <div class="hint" style="margin-top: 6px">{{ t('settings.language.hint') }}</div>
          </div>

          <div class="card card-pad" style="margin-bottom: 16px">
            <div class="section-title"><Database :size="16" style="color: var(--accent)" /> {{ t('settings.data.title') }}</div>
            <div class="stat-grid">
              <div class="stat">
                <div class="stat-value">{{ state.papers.length }}</div>
                <div class="stat-label">{{ t('settings.data.papers') }}</div>
              </div>
              <div class="stat">
                <div class="stat-value">{{ state.questions.length }}</div>
                <div class="stat-label">{{ t('settings.data.questions') }}</div>
              </div>
              <div class="stat">
                <div class="stat-value">{{ state.knowledge.length }}</div>
                <div class="stat-label">{{ t('settings.data.knowledge') }}</div>
              </div>
            </div>
            <div v-if="desktop" class="hint" style="margin-top: 10px">{{ t('settings.data.localOnly') }}</div>
            <div class="divider" />
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px">
              <div>
                <div style="font-size: 12.5px; font-weight: 600">{{ t('settings.data.dirTitle') }}</div>
                <div class="hint" style="margin-top: 2px">{{ t('settings.data.dirHint') }}</div>
              </div>
              <div v-if="desktop" style="display: flex; gap: 6px">
                <button class="btn btn-sm" @click="openStorageDir"><FolderOpen :size="13" /> {{ t('settings.data.openDir') }}</button>
                <button class="btn btn-sm" @click="pickStorageDir">{{ t('settings.data.changeDir') }}</button>
              </div>
            </div>
            <div class="dir-box">{{ desktop ? dataDir || '—' : t('settings.data.browserDb') }}</div>
            <div class="divider" />
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px">
              <div>
                <div style="font-size: 12.5px; font-weight: 600">{{ t('settings.data.clearTitle') }}</div>
                <div class="hint" style="margin-top: 2px">{{ t('settings.data.clearHint') }}</div>
              </div>
              <button class="btn btn-danger btn-sm" :disabled="!state.questions.length && !state.papers.length && !state.knowledge.length" @click="confirmClear = true">
                <Trash2 :size="13" /> {{ t('settings.data.clear') }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <AppModal v-if="pendingDir" :title="t('settings.changeDir.title')" @close="pendingDir = ''">
      <template #description>{{ t('settings.changeDir.description') }}</template>
      <div class="hint" style="line-height: 1.8">
        {{ t('settings.changeDir.newDir') }}<strong style="word-break: break-all">{{ pendingDir }}</strong><br />
        {{ t('settings.changeDir.explain') }}
      </div>
      <template #actions>
        <button class="btn" :disabled="applyingDir" @click="pendingDir = ''">{{ t('common.cancel') }}</button>
        <button class="btn btn-primary" :disabled="applyingDir" @click="applyDirChange">
          <Loader2 v-if="applyingDir" :size="14" class="spin" />
          {{ applyingDir ? t('settings.changeDir.switching') : t('settings.changeDir.confirm') }}
        </button>
      </template>
    </AppModal>

    <AppModal v-if="confirmClear" :title="t('settings.clearConfirm.title')" @close="confirmClear = false">
      <template #description>{{ t('settings.clearConfirm.description') }}</template>
      <div class="hint">
        {{ t('settings.clearConfirm.detail', { papers: state.papers.length, questions: state.questions.length, knowledge: state.knowledge.length }) }}
      </div>
      <template #actions>
        <button class="btn" @click="confirmClear = false">{{ t('common.cancel') }}</button>
        <button class="btn btn-danger" @click="clearAllData"><Trash2 :size="14" /> {{ t('settings.clearConfirm.confirm') }}</button>
      </template>
    </AppModal>
  </div>
</template>

<style scoped>
.settings-page {
  overflow: auto;
}
.settings-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  max-width: 1180px;
  margin: 0 auto;
  align-items: start;
}
.key-toggle {
  position: absolute;
  right: 6px;
  top: 50%;
  transform: translateY(-50%);
  border: 0;
  background: transparent;
  color: var(--text-3);
  padding: 4px;
  border-radius: 5px;
  display: grid;
  place-items: center;
}
.key-toggle:hover {
  background: #f2f4fa;
}
.model-label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.link-btn {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  border: 0;
  background: transparent;
  color: var(--accent);
  font-size: 11.5px;
  font-weight: 500;
  padding: 0;
  cursor: pointer;
}
.link-btn:disabled {
  opacity: 0.6;
  cursor: default;
}
.dir-box {
  margin-top: 8px;
  padding: 9px 11px;
  border: 1px solid var(--border);
  background: var(--surface-2);
  border-radius: 8px;
  font-family: ui-monospace, monospace;
  font-size: 11.5px;
  color: var(--text-2);
  line-height: 1.6;
  word-break: break-all;
}
.stat-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}
.stat {
  background: #f8f9fd;
  border: 1px solid #eef0f6;
  border-radius: 9px;
  padding: 10px;
  text-align: center;
}
.stat-value {
  font-size: 18px;
  font-weight: 700;
  color: var(--text);
  letter-spacing: -0.3px;
}
.stat-label {
  font-size: 11px;
  color: var(--text-3);
  margin-top: 2px;
}
.spin {
  animation: spin 0.8s linear infinite;
}
@media (max-width: 1100px) {
  .settings-grid {
    grid-template-columns: 1fr;
  }
}
</style>
