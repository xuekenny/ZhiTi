<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { Download, FilePlus2, Languages, Library, Scissors, Settings } from 'lucide-vue-next'
import { isTauri } from '@tauri-apps/api/core'
import ToastHost from './components/ToastHost.vue'
import ImportView from './views/ImportView.vue'
import CutView from './views/CutView.vue'
import BankView from './views/BankView.vue'
import ExportView from './views/ExportView.vue'
import SettingsView from './views/SettingsView.vue'
import { initStore, PENDING_ANSWER_FLAG, state, ui, type ViewKey } from './store'
import { changeDataDir, getStorageState } from './utils/storage'
import { toast } from './composables/toast'
import { subjectName } from './utils/label'
import { locale, setLocale, t } from './i18n'
import { gradeLabel, subjectLabel } from './i18n/labels'
import logoUrl from './assets/logo.png'

const desktop = isTauri()
const bootError = ref('')
const views = {
  import: ImportView,
  cut: CutView,
  bank: BankView,
  export: ExportView,
  settings: SettingsView
}

const navItems: { key: Exclude<ViewKey, 'settings'>; icon: typeof FilePlus2 }[] = [
  { key: 'import', icon: FilePlus2 },
  { key: 'cut', icon: Scissors },
  { key: 'bank', icon: Library },
  { key: 'export', icon: Download }
]

const activePaper = computed(() => state.papers.find((p) => p.id === ui.activePaperId))

const topbar = computed<{ title: string; subtitle: string }>(() => {
  switch (ui.view) {
    case 'import':
      return { title: t('app.nav.import'), subtitle: t('app.topbar.importSub') }
    case 'cut': {
      const paper = activePaper.value
      return {
        title: paper?.title || t('app.nav.cut'),
        subtitle: paper
          ? t('app.topbar.cutSub', {
              subject: subjectLabel(subjectName(paper.subject)),
              grade: gradeLabel(paper.grade),
              pages: paper.page_count,
              cut: state.questions.filter((q) => q.paper_id === paper.id).length
            })
          : t('app.topbar.cutEmpty')
      }
    }
    case 'bank':
      return {
        title: t('app.nav.bank'),
        subtitle: t('app.topbar.bankSub', {
          questions: state.questions.length,
          papers: state.papers.length,
          knowledge: new Set(state.questions.flatMap((q) => q.knowledge)).size
        })
      }
    case 'export':
      return {
        title: t('app.nav.export'),
        subtitle: ui.exportIds.length ? t('app.topbar.exportSelected', { n: ui.exportIds.length }) : t('app.topbar.exportEmpty')
      }
    case 'settings':
      return { title: t('app.nav.settings'), subtitle: t('app.topbar.settingsSub') }
  }
})

function toggleLocale() {
  setLocale(locale.value === 'en' ? 'zh-CN' : 'en')
}

function badgeFor(key: ViewKey): number | string | null {
  if (key === 'bank') return state.questions.length || null
  if (key === 'cut') return state.papers.length || null
  return null
}

function go(key: ViewKey) {
  if (key === 'cut' && !ui.activePaperId) {
    ui.activePaperId = state.papers[0]?.id ?? null
  }
  ui.view = key
}

onMounted(async () => {
  try {
    if (desktop) {
      const storage = await getStorageState()
      // 首次启动不再弹窗询问，直接以默认目录作为数据目录（静默写入配置，便于后续在设置中切换时迁移数据）
      if (!storage.configured) await changeDataDir(storage.defaultDir)
    }
    await initStore()
    if (!ui.activePaperId) ui.activePaperId = state.papers[0]?.id ?? null
    if (sessionStorage.getItem(PENDING_ANSWER_FLAG) && !ui.pendingAnswers.length) {
      sessionStorage.removeItem(PENDING_ANSWER_FLAG)
      toast(t('app.answerLost'), 'warning', 6000)
    }
  } catch (error) {
    bootError.value = (error as Error).message || t('app.bootFailed')
    toast(t('app.bootFailedToast', { error: bootError.value }), 'error')
  }
})
</script>

<template>
  <div v-if="!state.ready" class="boot-screen">
    <img class="brand-mark" :src="logoUrl" :alt="t('app.brand')" style="width: 46px; height: 46px" />
    <div>
      <div style="font-size: 16px; font-weight: 650">{{ t('app.brand') }}</div>
      <div class="hint" style="margin-top: 4px">{{ bootError || t('app.booting') }}</div>
    </div>
  </div>

  <div v-else class="app-shell">
    <aside class="sidebar">
      <div class="nav-section-label">{{ t('app.workspace') }}</div>
      <nav>
        <button
          v-for="item in navItems"
          :key="item.key"
          class="nav-item"
          :class="{ active: ui.view === item.key }"
          @click="go(item.key)"
        >
          <component :is="item.icon" :size="17" />
          <span>{{ t(`app.nav.${item.key}`) }}</span>
          <span v-if="badgeFor(item.key)" class="nav-badge">{{ badgeFor(item.key) }}</span>
        </button>
      </nav>

      <div class="sidebar-footer">
        <button class="nav-item" :title="t('app.switchLanguage')" @click="toggleLocale">
          <Languages :size="17" />
          <span>{{ locale === 'en' ? '中文' : 'English' }}</span>
        </button>
        <button class="nav-item" :class="{ active: ui.view === 'settings' }" @click="go('settings')">
          <Settings :size="17" />
          <span>{{ t('app.nav.settings') }}</span>
        </button>
      </div>
    </aside>

    <div class="main-area">
      <header class="topbar">
        <div>
          <div class="topbar-title">{{ topbar.title }}</div>
          <div class="topbar-sub">{{ topbar.subtitle }}</div>
        </div>
        <div class="topbar-actions">
          <button v-if="ui.view !== 'import'" class="btn btn-ghost btn-sm" @click="go('import')">
            <FilePlus2 :size="14" /> {{ t('app.importNew') }}
          </button>
          <button v-if="ui.view === 'settings'" class="btn btn-ghost btn-sm" @click="go('bank')">
            <Library :size="14" /> {{ t('app.backToBank') }}
          </button>
        </div>
      </header>

      <component :is="views[ui.view]" />
    </div>
  </div>

  <ToastHost />
</template>

<style scoped>
.boot-screen {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 14px;
  color: var(--text-2);
}
</style>
