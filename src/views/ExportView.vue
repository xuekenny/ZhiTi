<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  ChevronUp,
  Download,
  FileText,
  FileDown,
  GripVertical,
  Loader2,
  Package,
  Plus,
  Presentation,
  Search,
  Sparkles,
  X
} from 'lucide-vue-next'
import { exportQuestions, formatLabel, type ExportFormat } from '../utils/exporters'
import { downloadBlob } from '../utils/image'
import { blobToBase64 } from '../utils/base64'
import { writeFileAt } from '../utils/storage'
import { save } from '@tauri-apps/plugin-dialog'
import { isTauri } from '@tauri-apps/api/core'
import { paperOf, state, ui, updateQuestion } from '../store'
import { hasContentDoc, recognizeQuestionLayout } from '../utils/layout'
import { buildLayoutImage } from '../utils/layoutImage'
import { toast } from '../composables/toast'
import AppModal from '../components/AppModal.vue'
import { t } from '../i18n'
import { typeLabel } from '../i18n/labels'
import type { ExportOptions, Question } from '../types'

const format = ref<ExportFormat>('pdf')
const exporting = ref(false)
const exportingLabel = ref('')
const dragIndex = ref<number | null>(null)
const showLibrary = ref(false)
const libraryKeyword = ref('')
const missingOpen = ref(false)
const missingPreviewId = ref<number | null>(null)
const contentMissingOpen = ref(false)
const contentBusyId = ref<number | null>(null)
const contentGeneratingAll = ref(false)
const contentErrors = reactive<Record<number, string>>({})
const titleEdited = ref(false)
const subtitleEdited = ref(false)

const options = reactive<ExportOptions>({
  title: '',
  subtitle: '',
  showAnswer: false,
  onePerPage: false,
  showNumber: false,
  pageSize: 'a4',
  margin: 18,
  scale: 1,
  fileName: ''
})

const formats = computed<{ key: ExportFormat; label: string; desc: string; icon: typeof FileText }[]>(() => [
  { key: 'pdf', label: formatLabel('pdf'), desc: t('export.format.pdfDesc'), icon: FileText },
  { key: 'docx', label: formatLabel('docx'), desc: t('export.format.docxDesc'), icon: FileDown },
  { key: 'pptx', label: formatLabel('pptx'), desc: t('export.format.pptxDesc'), icon: Presentation },
  { key: 'zip', label: formatLabel('zip'), desc: t('export.format.zipDesc'), icon: Package }
])

const selectedQuestions = computed(() =>
  ui.exportIds.map((id) => state.questions.find((q) => q.id === id)).filter((q): q is NonNullable<typeof q> => !!q)
)

const libraryQuestions = computed(() => {
  const kw = libraryKeyword.value.trim().toLowerCase()
  return state.questions
    .filter((q) => !ui.exportIds.includes(q.id))
    .filter((q) => {
      if (!kw) return true
      return [q.text, q.knowledge.join(' '), paperOf(q)?.title ?? ''].join(' ').toLowerCase().includes(kw)
    })
    .slice(0, 80)
})

const missingQuestions = computed(() => selectedQuestions.value.filter((q) => !q.answer.trim()))
const missingContentQuestions = computed(() => selectedQuestions.value.filter((q) => !hasContentDoc(q.content)))
const contentBusy = computed(() => contentBusyId.value != null || contentGeneratingAll.value)
const totalQuestions = computed(() => state.questions.length)

const defaultTitle = computed(() => {
  const papers = new Set(selectedQuestions.value.map((q) => q.paper_id))
  if (papers.size === 1) {
    const paper = state.papers.find((p) => p.id === selectedQuestions.value[0]?.paper_id)
    return paper?.title ?? ''
  }
  return selectedQuestions.value.length ? '题目精选卷' : ''
})

const defaultSubtitle = computed(() => {
  const papers = selectedQuestions.value.map((q) => paperOf(q)).filter(Boolean)
  const unique = Array.from(new Set(papers.map((p) => `${p!.subject} · ${p!.grade}`)))
  return unique.length === 1 ? unique[0] : ''
})

watch(
  defaultTitle,
  (value) => {
    if (!titleEdited.value) options.title = value
  },
  { immediate: true }
)

watch(
  defaultSubtitle,
  (value) => {
    if (!subtitleEdited.value) options.subtitle = value
  },
  { immediate: true }
)

function toggleAnswers() {
  options.showAnswer = !options.showAnswer
  if (options.showAnswer) openMissingAnswers()
}

function openMissingAnswers() {
  if (!missingQuestions.value.length) return
  missingOpen.value = true
}

function goToQuestion(question: Question) {
  missingOpen.value = false
  ui.pendingPaperId = question.id
  ui.activeQuestionId = question.id
  ui.view = 'bank'
}

function addQuestion(id: number) {
  if (!ui.exportIds.includes(id)) ui.exportIds = [...ui.exportIds, id]
}

function removeQuestion(id: number) {
  ui.exportIds = ui.exportIds.filter((x) => x !== id)
}

function addAll() {
  ui.exportIds = state.questions.map((q) => q.id)
  toast(t('export.toast.addedAll', { n: ui.exportIds.length }), 'success', 1800)
}

function clearAll() {
  ui.exportIds = []
}

function move(index: number, delta: number) {
  const target = index + delta
  if (target < 0 || target >= ui.exportIds.length) return
  const list = [...ui.exportIds]
  const [item] = list.splice(index, 1)
  list.splice(target, 0, item)
  ui.exportIds = list
}

function onDragStart(index: number) {
  dragIndex.value = index
}

function onDrop(index: number) {
  if (dragIndex.value == null || dragIndex.value === index) {
    dragIndex.value = null
    return
  }
  const list = [...ui.exportIds]
  const [item] = list.splice(dragIndex.value, 1)
  list.splice(index, 0, item)
  ui.exportIds = list
  dragIndex.value = null
}

async function doExport() {
  if (!selectedQuestions.value.length) {
    toast(t('export.toast.noSelection'), 'warning')
    return
  }
  if (format.value !== 'zip' && missingContentQuestions.value.length) {
    contentMissingOpen.value = true
    return
  }
  await runExport(selectedQuestions.value)
}

async function runExport(list: Question[]) {
  exporting.value = true
  exportingLabel.value = t('export.progress.preparing')
  try {
    const finalOptions: ExportOptions = {
      ...options,
      title: options.title || '试卷',
      fileName: options.fileName || options.title || '试卷'
    }
    await new Promise((resolve) => setTimeout(resolve, 60))
    exportingLabel.value = t('export.progress.layingOut')
    const { blob, filename, warnings } = await exportQuestions(format.value, list, finalOptions, ({ done, total }) => {
      exportingLabel.value = t('export.progress.question', { current: Math.min(done + 1, total), total })
    })
    if (isTauri()) {
      exportingLabel.value = t('export.progress.chooseLocation')
      const ext = filename.split('.').pop()?.toLowerCase() || 'pdf'
      const path = await save({
        defaultPath: filename,
        filters: [{ name: ext.toUpperCase(), extensions: [ext] }]
      })
      if (!path) return
      exportingLabel.value = t('export.progress.writing')
      await writeFileAt(path, await blobToBase64(blob))
      toast(t('export.toast.savedTo', { path }), 'success', 5000)
    } else {
      exportingLabel.value = t('export.progress.writing')
      downloadBlob(blob, filename)
      toast(t('export.toast.downloaded', { name: filename }), 'success', 4000)
    }
    if (warnings.length) {
      const detail = warnings.slice(0, 2).join(t('export.toast.warningSeparator'))
      toast(warnings.length > 2 ? t('export.toast.moreWarnings', { detail, n: warnings.length }) : detail, 'warning', 6200)
    }
  } catch (error) {
    toast(t('export.toast.failed', { message: (error as Error).message || t('common.unknownError') }), 'error', 5200)
  } finally {
    exporting.value = false
    exportingLabel.value = ''
  }
}

async function generateContent(question: Question): Promise<void> {
  if (!state.settings.ai.apiKey.trim()) {
    toast(t('export.toast.needAiKey'), 'warning')
    return
  }
  contentBusyId.value = question.id
  delete contentErrors[question.id]
  try {
    const image = await buildLayoutImage(question)
    const result = await recognizeQuestionLayout(state.settings.ai, image)
    await updateQuestion(question.id, { content: result.content, text: result.text })
    toast(
      t('export.toast.contentGenerated', {
        formulas: t('export.toast.formulaCount', { n: result.mathCount }),
        figures: t('export.toast.figureCount', { n: result.figureCount })
      }),
      'success',
      3800
    )
  } catch (error) {
    contentErrors[question.id] = (error as Error).message || t('export.toast.generateFailed')
    toast(t('export.toast.contentFailed', { message: contentErrors[question.id] }), 'error', 6200)
  } finally {
    contentBusyId.value = null
  }
}

async function generateAllContent() {
  if (!state.settings.ai.apiKey.trim()) {
    toast(t('export.toast.needAiKey'), 'warning')
    return
  }
  contentGeneratingAll.value = true
  try {
    for (const question of [...missingContentQuestions.value]) {
      await generateContent(question)
    }
    if (!missingContentQuestions.value.length) toast(t('export.toast.allContentDone'), 'success', 3000)
  } finally {
    contentGeneratingAll.value = false
  }
}

async function exportWithAvailableContent() {
  const list = selectedQuestions.value.filter((q) => hasContentDoc(q.content))
  if (!list.length) {
    toast(t('export.toast.nothingToExport'), 'warning')
    return
  }
  const skipped = selectedQuestions.value.length - list.length
  contentMissingOpen.value = false
  if (skipped) toast(t('export.toast.skipped', { n: skipped }), 'warning', 4200)
  await runExport(list)
}

</script>

<template>
  <div class="view">
    <div class="export-main">
      <div class="export-toolbar">
        <span class="hint">{{ t('export.toolbar.selectedBefore') }} <strong style="color: var(--text)">{{ selectedQuestions.length }}</strong> {{ t('export.toolbar.selectedAfter') }}</span>
        <button class="btn btn-ghost btn-sm" @click="ui.view = 'bank'"><ArrowLeft :size="13" /> {{ t('export.toolbar.backToBank') }}</button>
        <button class="btn btn-ghost btn-sm" :disabled="!totalQuestions || ui.exportIds.length === totalQuestions" @click="addAll">{{ t('export.toolbar.addAll') }}</button>
        <button v-if="ui.exportIds.length" class="btn btn-ghost btn-sm" @click="clearAll">{{ t('common.clear') }}</button>
        <div class="toolbar-spacer" />
        <button class="btn btn-sm" :class="{ 'btn-primary': showLibrary }" @click="showLibrary = !showLibrary">
          <Plus :size="13" /> {{ t('export.toolbar.addFromBank') }}
          <ChevronUp v-if="showLibrary" :size="13" />
          <ChevronDown v-else :size="13" />
        </button>
      </div>

      <div v-if="showLibrary" class="library-panel">
        <div class="search-box" style="width: 100%; max-width: 420px">
          <Search :size="14" style="position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: var(--text-3)" />
          <input v-model="libraryKeyword" class="input" style="padding-left: 30px" :placeholder="t('export.library.searchPlaceholder')" />
        </div>
        <div v-if="!libraryQuestions.length" class="hint" style="padding: 10px 0">{{ t('export.library.empty') }}</div>
        <div v-else class="library-grid">
          <div v-for="q in libraryQuestions" :key="q.id" class="library-item">
            <img v-if="q.image" :src="q.image" loading="lazy" />
            <div style="flex: 1; min-width: 0">
              <div class="library-text">{{ q.text || t('export.noText') }}</div>
              <div class="hint" style="font-size: 11px">{{ typeLabel(q.question_type) }} · {{ t('export.difficultyN', { n: q.difficulty }) }}</div>
            </div>
            <button class="btn btn-sm btn-primary" @click="addQuestion(q.id)"><Plus :size="12" /> {{ t('common.add') }}</button>
          </div>
        </div>
      </div>

      <div class="selected-area">
        <div v-if="!selectedQuestions.length" class="empty">
          <div class="empty-icon"><Package :size="24" /></div>
          <div class="empty-title">{{ t('export.empty.title') }}</div>
          <div class="empty-desc">{{ t('export.empty.desc') }}</div>
          <div style="display: flex; gap: 8px; margin-top: 6px">
            <button class="btn btn-primary" @click="ui.view = 'bank'">{{ t('export.empty.goToBank') }}</button>
            <button class="btn" @click="showLibrary = true"><Plus :size="14" /> {{ t('export.toolbar.addFromBank') }}</button>
          </div>
        </div>

        <template v-else>
          <div class="selected-head">
            <div class="hint">{{ t('export.selected.dragHint') }}</div>
            <div class="hint">{{ t('export.selected.total', { n: selectedQuestions.length }) }}</div>
          </div>
          <div class="selected-list">
            <div
              v-for="(q, index) in selectedQuestions"
              :key="q.id"
              class="selected-row"
              :class="{ dragging: dragIndex === index }"
              draggable="true"
              @dragstart="onDragStart(index)"
              @dragover.prevent
              @drop.prevent="onDrop(index)"
              @dragend="dragIndex = null"
            >
              <div class="drag-handle"><GripVertical :size="15" /></div>
              <div class="order-badge">{{ index + 1 }}</div>
              <div class="thumb"><img v-if="q.image" :src="q.image" loading="lazy" /></div>
              <div style="flex: 1; min-width: 0">
                <div class="row-text">{{ q.text || t('export.noTextGenerate') }}</div>
                <div class="row-meta">
                  <span class="badge badge-gray">{{ typeLabel(q.question_type) }}</span>
                  <span class="hint" style="font-size: 11px">{{ t('export.difficultyN', { n: q.difficulty }) }}</span>
                  <span v-if="q.knowledge.length" class="hint" style="font-size: 11px">· {{ q.knowledge.slice(0, 2).join(' / ') }}</span>
                  <span class="hint" style="font-size: 11px">· {{ paperOf(q)?.title }}</span>
                </div>
              </div>
              <div class="row-actions">
                <button class="btn btn-ghost btn-icon" :title="t('export.selected.moveUp')" :disabled="index === 0" @click="move(index, -1)"><ChevronUp :size="14" /></button>
                <button class="btn btn-ghost btn-icon" :title="t('export.selected.moveDown')" :disabled="index === selectedQuestions.length - 1" @click="move(index, 1)"><ChevronDown :size="14" /></button>
                <button class="btn btn-ghost btn-icon" :title="t('export.selected.remove')" @click="removeQuestion(q.id)"><X :size="14" /></button>
              </div>
            </div>
          </div>
        </template>
      </div>
    </div>

    <aside class="inspector">
      <div class="section-title" style="margin-bottom: 10px">{{ t('export.format.title') }}</div>
      <div class="format-list">
        <button
          v-for="item in formats"
          :key="item.key"
          class="format-card"
          :class="{ active: format === item.key }"
          @click="format = item.key"
        >
          <div class="format-icon"><component :is="item.icon" :size="17" /></div>
          <div style="flex: 1; min-width: 0">
            <div class="format-title">{{ item.label }}</div>
            <div class="format-desc">{{ item.desc }}</div>
          </div>
          <span v-if="format === item.key" class="format-check"><Check :size="13" /></span>
        </button>
      </div>

      <div class="divider" />

      <div class="section-title" style="margin-bottom: 10px">{{ t('export.layout.title') }}</div>
      <div class="field">
        <label class="label">{{ t('export.layout.paperTitle') }}</label>
        <input v-model="options.title" class="input" :placeholder="t('export.layout.paperTitlePlaceholder')" @input="titleEdited = true" />
      </div>
      <div class="field">
        <label class="label">{{ t('export.layout.subtitle') }}</label>
        <input v-model="options.subtitle" class="input" :placeholder="t('export.layout.subtitlePlaceholder')" @input="subtitleEdited = true" />
      </div>

      <div class="switch-row">
        <div>
          {{ t('export.layout.includeAnswers') }}
          <div class="hint" style="margin-top: 2px">
            {{ format === 'zip' ? t('export.layout.answersInManifest') : t('export.layout.answersBelow') }}
          </div>
        </div>
        <button class="switch" :class="{ on: options.showAnswer }" @click="toggleAnswers()" />
      </div>
      <div class="switch-row">
        <div>{{ t('export.layout.onePerPage') }}</div>
        <button class="switch" :class="{ on: options.onePerPage }" @click="options.onePerPage = !options.onePerPage" />
      </div>
      <div class="switch-row">
        <div>
          {{ t('export.layout.addNumbers') }}
          <div class="hint" style="margin-top: 2px">{{ t('export.layout.addNumbersHint') }}</div>
        </div>
        <button class="switch" :class="{ on: options.showNumber }" @click="options.showNumber = !options.showNumber" />
      </div>

      <div class="row-2" style="margin-top: 12px">
        <div class="field">
          <label class="label">{{ t('export.layout.pageSize') }}</label>
          <select v-model="options.pageSize" class="select">
            <option value="a4">A4</option>
            <option value="letter">Letter</option>
          </select>
        </div>
        <div class="field">
          <label class="label">{{ t('export.layout.margin', { n: options.margin }) }}</label>
          <input v-model.number="options.margin" type="range" min="8" max="30" step="2" style="width: 100%; accent-color: var(--accent)" />
        </div>
      </div>

      <div class="field">
        <label class="label">{{ t(format === 'zip' ? 'export.layout.imageWidth' : 'export.layout.contentWidth', { n: Math.round(options.scale * 100) }) }}</label>
        <input v-model.number="options.scale" type="range" min="0.6" max="1" step="0.05" style="width: 100%; accent-color: var(--accent)" />
      </div>

      <div class="field">
        <label class="label">{{ t('export.layout.fileName') }}</label>
        <input v-model="options.fileName" class="input" :placeholder="t('export.layout.fileNamePlaceholder')" />
      </div>

      <button class="btn btn-primary btn-lg" style="width: 100%; margin-top: 4px" :disabled="!selectedQuestions.length || exporting" @click="doExport">
        <Loader2 v-if="exporting" :size="16" class="spin" />
        <Download v-else :size="16" />
        {{ exporting ? t('export.action.exporting') : t('export.action.export', { n: selectedQuestions.length }) }}
      </button>
      <div v-if="exporting" class="hint" style="text-align: center; margin-top: 8px">{{ exportingLabel }}</div>

      <div v-if="format !== 'zip' && missingContentQuestions.length" class="export-warning">
        <AlertTriangle :size="13" /> {{ t('export.action.missingContent', { n: missingContentQuestions.length }) }}
      </div>

      <div v-if="selectedQuestions.length > 100" class="export-warning">
        <AlertTriangle :size="13" /> {{ t('export.action.tooMany') }}
      </div>

      <div class="hint" style="margin-top: 12px; line-height: 1.7">
        {{ t('export.action.note') }}
      </div>
    </aside>
  </div>

  <AppModal v-if="missingOpen" :title="t('export.missingAnswers.title')" :width="640" @close="missingOpen = false">
    <template #description>
      {{ t('export.missingAnswers.desc', { n: missingQuestions.length }) }}
    </template>

    <div class="missing-list">
      <div v-for="q in missingQuestions" :key="q.id" class="missing-row">
        <div class="missing-head">
          <button
            class="missing-thumb"
            :title="t('export.missingAnswers.viewImage')"
            @click="missingPreviewId = missingPreviewId === q.id ? null : q.id"
          >
            <img v-if="q.image" :src="q.image" loading="lazy" />
          </button>
          <div style="flex: 1; min-width: 0">
            <div class="missing-text">{{ q.text || t('export.noText') }}</div>
            <div class="hint" style="font-size: 11px">{{ typeLabel(q.question_type) }} · {{ paperOf(q)?.title }}</div>
          </div>
          <button class="btn btn-sm" @click="goToQuestion(q)">
            <ArrowRight :size="12" /> {{ t('export.missingAnswers.view') }}
          </button>
        </div>
        <img v-if="missingPreviewId === q.id && q.image" class="missing-preview" :src="q.image" />
      </div>
    </div>

    <template #actions>
      <button class="btn" @click="missingOpen = false">{{ t('common.close') }}</button>
    </template>
  </AppModal>

  <AppModal v-if="contentMissingOpen" :title="t('export.missingContent.title')" :width="720" @close="contentMissingOpen = false">
    <template #description>
      {{ t('export.missingContent.desc', { total: selectedQuestions.length, n: missingContentQuestions.length }) }}
    </template>

    <div v-if="missingContentQuestions.length" class="content-missing-toolbar">
      <span class="hint">{{ t('export.missingContent.pending', { n: missingContentQuestions.length }) }}</span>
      <button class="btn btn-sm" :disabled="contentBusy" @click="generateAllContent">
        <Loader2 v-if="contentGeneratingAll" :size="12" class="spin" />
        <Sparkles v-else :size="12" /> {{ t('export.missingContent.generateAll') }}
      </button>
    </div>

    <div v-if="!missingContentQuestions.length" class="content-missing-empty">
      <Check :size="18" /> {{ t('export.missingContent.allDone') }}
    </div>

    <div v-else class="missing-list">
      <div v-for="q in missingContentQuestions" :key="q.id" class="missing-row">
        <div class="missing-head">
          <button
            class="missing-thumb"
            :title="t('export.missingAnswers.viewImage')"
            @click="missingPreviewId = missingPreviewId === q.id ? null : q.id"
          >
            <img v-if="q.image" :src="q.image" loading="lazy" />
          </button>
          <div style="flex: 1; min-width: 0">
            <div class="missing-text">{{ q.text || t('export.noTextSuggest') }}</div>
            <div class="hint" style="font-size: 11px">{{ typeLabel(q.question_type) }} · {{ paperOf(q)?.title }}</div>
            <div v-if="contentErrors[q.id]" class="content-missing-error">{{ contentErrors[q.id] }}</div>
          </div>
          <button class="btn btn-sm" :disabled="contentBusy || !q.image" @click="generateContent(q)">
            <Loader2 v-if="contentBusyId === q.id" :size="12" class="spin" />
            <Sparkles v-else :size="12" /> {{ contentErrors[q.id] ? t('common.retry') : t('export.missingContent.generate') }}
          </button>
        </div>
        <img v-if="missingPreviewId === q.id && q.image" class="missing-preview" :src="q.image" />
      </div>
    </div>

    <template #actions>
      <button class="btn" @click="contentMissingOpen = false">{{ t('common.cancel') }}</button>
      <button class="btn btn-primary" :disabled="contentBusy" @click="exportWithAvailableContent">
        {{ missingContentQuestions.length ? t('export.missingContent.skipAndExport', { n: missingContentQuestions.length }) : t('export.missingContent.continueExport') }}
      </button>
    </template>
  </AppModal>
</template>

<style scoped>
.export-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.export-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: #fff;
  border-bottom: 1px solid var(--border);
  flex-wrap: wrap;
}
.library-panel {
  border-bottom: 1px solid var(--border);
  background: #fbfcff;
  padding: 12px 16px;
  max-height: 260px;
  overflow: auto;
}
.library-grid {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 10px;
}
.library-item {
  display: flex;
  align-items: center;
  gap: 9px;
  background: #fff;
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 6px 9px;
}
.library-item img {
  width: 40px;
  height: 44px;
  object-fit: cover;
  object-position: top;
  border-radius: 4px;
  border: 1px solid var(--border);
  flex-shrink: 0;
}
.library-text {
  font-size: 12px;
  color: var(--text-2);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.selected-area {
  flex: 1;
  overflow: auto;
  padding: 14px 18px 28px;
  display: flex;
  flex-direction: column;
}
.selected-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
  padding: 0 2px;
}
.selected-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.selected-row {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #fff;
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 8px;
  transition: box-shadow 0.15s, border 0.15s, opacity 0.15s;
}
.selected-row:hover {
  border-color: #c9cdf5;
  box-shadow: 0 3px 12px rgba(22, 28, 45, 0.06);
}
.selected-row.dragging {
  opacity: 0.45;
}
.drag-handle {
  color: #b9c0cf;
  cursor: grab;
  display: grid;
  place-items: center;
  padding: 2px;
}
.order-badge {
  width: 24px;
  height: 24px;
  border-radius: 6px;
  background: var(--accent-soft);
  color: var(--accent-dark);
  font-size: 11.5px;
  font-weight: 700;
  display: grid;
  place-items: center;
  flex-shrink: 0;
}
.thumb {
  width: 48px;
  height: 54px;
  border-radius: 5px;
  overflow: hidden;
  background: #f5f6fb;
  border: 1px solid var(--border);
  flex-shrink: 0;
}
.thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: top;
}
.row-text {
  font-size: 12.5px;
  color: var(--text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.row-meta {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-top: 4px;
  flex-wrap: wrap;
}
.row-actions {
  display: flex;
  gap: 0;
  opacity: 0.5;
  transition: opacity 0.15s;
}
.selected-row:hover .row-actions {
  opacity: 1;
}
.format-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.format-card {
  display: flex;
  align-items: center;
  gap: 10px;
  text-align: left;
  border: 1px solid var(--border);
  background: #fff;
  border-radius: 9px;
  padding: 9px 10px;
  transition: all 0.15s;
}
.format-card:hover {
  border-color: #c9cdf5;
  background: #fafbff;
}
.format-card.active {
  border-color: #8b84f2;
  background: #f6f5ff;
  box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.1);
}
.format-icon {
  width: 30px;
  height: 30px;
  border-radius: 7px;
  background: #f1f3fa;
  color: #5a6478;
  display: grid;
  place-items: center;
  flex-shrink: 0;
}
.format-card.active .format-icon {
  background: #e6e4ff;
  color: #4f46e5;
}
.format-title {
  font-size: 12.5px;
  font-weight: 600;
}
.format-desc {
  font-size: 11px;
  color: var(--text-3);
  margin-top: 2px;
  line-height: 1.45;
}
.format-check {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--accent);
  color: #fff;
  display: grid;
  place-items: center;
  flex-shrink: 0;
}
.export-warning {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 10px;
  padding: 8px 10px;
  background: var(--warning-soft);
  border: 1px solid #f2dfba;
  border-radius: 8px;
  font-size: 11.5px;
  color: #92400e;
}
.search-box {
  position: relative;
}
.spin {
  animation: spin 0.8s linear infinite;
}
.missing-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: 56vh;
  overflow: auto;
  padding-right: 2px;
}
.missing-row {
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 10px;
  background: #fff;
}
.missing-head {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin-bottom: 8px;
}
.missing-thumb {
  width: 48px;
  height: 54px;
  border-radius: 5px;
  overflow: hidden;
  background: #f5f6fb;
  border: 1px solid var(--border);
  flex-shrink: 0;
  padding: 0;
  cursor: zoom-in;
}
.missing-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: top;
}
.missing-text {
  font-size: 12.5px;
  color: var(--text);
  line-height: 1.6;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.missing-preview {
  display: block;
  width: 100%;
  max-height: 320px;
  object-fit: contain;
  margin-bottom: 8px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: #f8f9fc;
}
.content-missing-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 10px;
}
.content-missing-empty {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px;
  border: 1px solid #bbf7d0;
  border-radius: 10px;
  background: #ecfdf5;
  color: #166534;
  font-size: 12.5px;
}
.content-missing-error {
  margin-top: 4px;
  color: #b91c1c;
  font-size: 11px;
  line-height: 1.5;
  word-break: break-word;
}
</style>
