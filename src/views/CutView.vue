<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import {
  ChevronLeft,
  ChevronRight,
  Layers,
  Loader2,
  Plus,
  Scissors,
  Sparkles,
  Trash2,
  ZoomIn,
  ZoomOut
} from 'lucide-vue-next'
import { canvasToDataUrl, composeDataUrls, cropCanvas } from '../utils/image'
import { getPaperSource, type PaperSource } from '../utils/source'
import { addPendingAnswer, createQuestion, deleteQuestion, removePendingAnswer, state, ui } from '../store'
import { toast } from '../composables/toast'
import { guessQuestionType } from '../utils/questionType'
import { answerTag, questionTag, subjectName } from '../utils/label'
import type { Question, Region } from '../types'
import { t } from '../i18n'
import { gradeLabel, subjectLabel, typeLabel } from '../i18n/labels'

const doc = shallowRef<PaperSource | null>(null)
const loading = ref(false)
const loadError = ref('')
const page = ref(1)
const pageCount = ref(0)
const pageImage = ref('')
const rendering = ref(false)
const zoom = ref(1)
const draftBox = ref<Region | null>(null)
const pendingBoxes = ref<Region[]>([])
const generating = ref(false)
const baseWidth = ref(780)
const stageRef = ref<HTMLElement>()
const spaceHeld = ref(false)
const panning = ref(false)
let dragStart: { x: number; y: number } | null = null
let panStart: { x: number; y: number; left: number; top: number } | null = null
let renderToken = 0
let loadToken = 0
let resizeObserver: ResizeObserver | null = null

const paper = computed(() => state.papers.find((p) => p.id === ui.activePaperId))
const paperQuestions = computed(() => state.questions.filter((q) => q.paper_id === ui.activePaperId))
const pageQuestions = computed(() => questionRegionsOnPage())
const pendingBoxesOnPage = computed(() =>
  pendingBoxes.value.map((region, index) => ({ region, index })).filter(({ region }) => region.page === page.value)
)
/** 当前试卷下的待处理答案框（跨视图保存在 store 中，序号按该试卷内的答案框顺序） */
const paperPendingAnswers = computed(() =>
  ui.pendingAnswers
    .filter((item) => item.paperId === ui.activePaperId)
    .map((item, index) => ({ item, index }))
)
const pendingAnswersOnPage = computed(() =>
  paperPendingAnswers.value.filter(({ item }) => item.region.page === page.value)
)
/** 「添加答案」可用：框选了 1 个新区域，或已有当前试卷的答案框可继续换目标题目 */
const answerPickReady = computed(
  () => pendingBoxes.value.length === 1 || (!pendingBoxes.value.length && paperPendingAnswers.value.length > 0)
)
const displayWidth = computed(() => Math.round(baseWidth.value * zoom.value))

function questionRegionsOnPage(): { question: Question; index: number; region: Region }[] {
  const list: { question: Question; index: number; region: Region }[] = []
  paperQuestions.value.forEach((question, index) => {
    question.regions
      .filter((r) => r.page === page.value)
      .forEach((region) => list.push({ question, index, region }))
  })
  return list
}

function nextPage() {
  if (page.value < pageCount.value) {
    page.value += 1
  }
}

function prevPage() {
  if (page.value > 1) {
    page.value -= 1
  }
}

async function renderPreview() {
  const document = doc.value
  if (!document) return
  const token = ++renderToken
  rendering.value = true
  try {
    const canvas = await document.renderPage(page.value, displayWidth.value * 1.5)
    if (token !== renderToken) return
    pageImage.value = canvasToDataUrl(canvas, 0.94)
  } catch {
    if (token === renderToken) toast(t('cut.toast.renderFailed'), 'error')
  } finally {
    if (token === renderToken) rendering.value = false
  }
}

async function loadDocument() {
  const token = ++loadToken
  if (!ui.activePaperId) {
    doc.value = null
    pageCount.value = 0
    pageImage.value = ''
    page.value = 1
    loading.value = false
    return
  }
  const paperId = ui.activePaperId
  loading.value = true
  loadError.value = ''
  try {
    const document = await getPaperSource(paperId)
    if (token !== loadToken) return
    doc.value = document
    pageCount.value = document.pageCount
    const savedPage = ui.cutPageByPaper[paperId] ?? 1
    page.value = Math.min(Math.max(1, savedPage), document.pageCount)
    draftBox.value = null
    pendingBoxes.value = []
    await renderPreview()
  } catch (error) {
    if (token !== loadToken) return
    doc.value = null
    loadError.value = (error as Error).message || t('cut.toast.loadFailed')
    toast(loadError.value, 'error')
  } finally {
    if (token === loadToken) loading.value = false
  }
}

function normalizedPoint(event: PointerEvent): { x: number; y: number } {
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
  const x = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width))
  const y = Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height))
  return { x, y }
}

function onPointerDown(event: PointerEvent) {
  if (spaceHeld.value) return
  if (loading.value || rendering.value || !doc.value) return
  if (event.button !== 0) return
  const point = normalizedPoint(event)
  dragStart = point
  draftBox.value = { page: page.value, x: point.x, y: point.y, w: 0, h: 0 }
  ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
}

function onPointerMove(event: PointerEvent) {
  if (!dragStart) return
  const point = normalizedPoint(event)
  draftBox.value = {
    page: page.value,
    x: Math.min(dragStart.x, point.x),
    y: Math.min(dragStart.y, point.y),
    w: Math.abs(point.x - dragStart.x),
    h: Math.abs(point.y - dragStart.y)
  }
}

function onPointerUp(event: PointerEvent) {
  if (!dragStart) return
  dragStart = null
  const box = draftBox.value
  draftBox.value = null
  if (box && (box.w < 0.02 || box.h < 0.012)) {
    toast(t('cut.toast.boxTooSmall'), 'warning', 1800)
  } else if (box) {
    pendingBoxes.value.push(box)
  }
  try {
    ;(event.currentTarget as HTMLElement).releasePointerCapture(event.pointerId)
  } catch {
    /* ignore */
  }
}

function removePending(index: number) {
  pendingBoxes.value.splice(index, 1)
}

/** 空格 + 左键拖动平移画布 */
function onStagePointerDown(event: PointerEvent) {
  if (!spaceHeld.value || event.button !== 0) return
  const stage = stageRef.value
  if (!stage) return
  panStart = { x: event.clientX, y: event.clientY, left: stage.scrollLeft, top: stage.scrollTop }
  panning.value = true
  stage.setPointerCapture(event.pointerId)
  event.preventDefault()
}

function onStagePointerMove(event: PointerEvent) {
  if (!panStart) return
  const stage = stageRef.value
  if (!stage) return
  stage.scrollLeft = panStart.left - (event.clientX - panStart.x)
  stage.scrollTop = panStart.top - (event.clientY - panStart.y)
}

function onStagePointerUp(event: PointerEvent) {
  if (!panStart) return
  panStart = null
  panning.value = false
  const stage = stageRef.value
  if (!stage) return
  try {
    stage.releasePointerCapture(event.pointerId)
  } catch {
    /* ignore */
  }
}

function isTypingTarget(target: EventTarget | null): boolean {
  const element = target as HTMLElement | null
  if (!element) return false
  const tag = element.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || element.isContentEditable
}

function onKeyDown(event: KeyboardEvent) {
  if (event.code !== 'Space') return
  if (isTypingTarget(event.target)) return
  // 阻止空格滚动页面/触发焦点按钮，改为进入平移模式
  event.preventDefault()
  if (!event.repeat) spaceHeld.value = true
}

function onKeyUp(event: KeyboardEvent) {
  if (event.code === 'Space') spaceHeld.value = false
}

function onWindowBlur() {
  spaceHeld.value = false
  panning.value = false
  panStart = null
}

function clearPending() {
  pendingBoxes.value = []
  draftBox.value = null
}

async function buildImage(regions: Region[]): Promise<string> {
  if (!doc.value) throw new Error(t('cut.toast.docNotReady'))
  const source = doc.value
  const ordered = [...regions].sort((a, b) => a.page - b.page || a.y - b.y)
  const pageCanvases = new Map<number, HTMLCanvasElement>()
  const parts: string[] = []
  for (const region of ordered) {
    let canvas = pageCanvases.get(region.page)
    if (!canvas) {
      canvas = await source.renderPage(region.page, 1600)
      pageCanvases.set(region.page, canvas)
    }
    parts.push(canvasToDataUrl(cropCanvas(canvas, region)))
  }
  if (parts.length === 1) return parts[0]
  return await composeDataUrls(parts, 14)
}

async function saveRegions(regions: Region[]): Promise<Question | null> {
  if (!ui.activePaperId || !doc.value) return null
  const image = await buildImage(regions)
  const text = await doc.value.extractText(regions)
  return await createQuestion({
    paper_id: ui.activePaperId,
    image,
    regions,
    text,
    question_type: guessQuestionType(text),
    difficulty: 3
  })
}

async function createFromPending() {
  if (!pendingBoxes.value.length) return
  generating.value = true
  try {
    const created = await saveRegions([...pendingBoxes.value])
    pendingBoxes.value = []
    draftBox.value = null
    if (!created) return
    const count = state.questions.filter((q) => q.paper_id === ui.activePaperId).length
    const regionCount = created.regions.length
    const label = questionTag(paper.value?.subject, count)
    if (!created.text.trim()) toast(t('cut.toast.createdNoText'), 'warning', 4200)
    else if (regionCount > 1) toast(t('cut.toast.createdMulti', { label, n: regionCount }), 'success')
    else toast(t('cut.toast.created', { label }), 'success')
  } catch (error) {
    toast(t('cut.toast.createFailed', { error: (error as Error).message || t('common.unknownError') }), 'error')
  } finally {
    generating.value = false
  }
}

function sameRegion(a: Region, b: Region): boolean {
  return (
    a.page === b.page &&
    Math.abs(a.x - b.x) < 1e-4 &&
    Math.abs(a.y - b.y) < 1e-4 &&
    Math.abs(a.w - b.w) < 1e-4 &&
    Math.abs(a.h - b.h) < 1e-4
  )
}

/** 把一个答案框设为当前待处理项；若不在当前页则翻到它所在页 */
function selectPendingAnswer(id: number) {
  const item = ui.pendingAnswers.find((answer) => answer.id === id)
  if (!item) return
  ui.activePendingAnswerId = id
  draftBox.value = null
  if (item.region.page !== page.value) page.value = item.region.page
}

function dropPendingAnswer(id: number) {
  const item = ui.pendingAnswers.find((answer) => answer.id === id)
  if (!item) return
  const index = ui.pendingAnswers.filter((answer) => answer.paperId === item.paperId).findIndex((answer) => answer.id === id) + 1
  const subject = state.papers.find((p) => p.id === item.paperId)?.subject
  removePendingAnswer(id)
  toast(t('cut.toast.answerRemoved', { tag: answerTag(subject, index) }), 'info', 2200)
}

function pickAnswerTarget() {
  if (!ui.activePaperId) {
    toast(t('cut.toast.selectPaperFirst'), 'warning')
    return
  }
  const paperId = ui.activePaperId
  if (pendingBoxes.value.length > 1) {
    toast(t('cut.toast.answerOneBox'), 'warning', 3600)
    return
  }
  if (pendingBoxes.value.length === 1) {
    const region = pendingBoxes.value[0]
    const existing = ui.pendingAnswers.find((item) => item.paperId === paperId && sameRegion(item.region, region))
    if (!existing) addPendingAnswer(paperId, region)
    else ui.activePendingAnswerId = existing.id
    pendingBoxes.value = []
    draftBox.value = null
    ui.view = 'bank'
    toast(
      existing ? t('cut.toast.answerAlreadyPending') : t('cut.toast.answerStashed'),
      'info',
      3600
    )
    return
  }
  // 没有新框选时，带着当前（或该试卷最近一个）答案框回题库更换目标题目
  const current = ui.pendingAnswers.find((item) => item.id === ui.activePendingAnswerId && item.paperId === paperId)
  const fallback = [...ui.pendingAnswers].reverse().find((item) => item.paperId === paperId)
  const target = current ?? fallback
  if (!target) {
    toast(t('cut.toast.drawAnswerFirst'), 'warning', 3200)
    return
  }
  ui.activePendingAnswerId = target.id
  ui.view = 'bank'
  toast(t('cut.toast.pickAnswerTarget'), 'info', 2600)
}

async function removeQuestion(question: Question) {
  await deleteQuestion(question.id)
  toast(t('cut.toast.questionDeleted'), 'success')
}

/** 点击题目列表：定位到该题第一个区域所在页，并在画布上高亮 */
function focusQuestion(question: Question) {
  ui.activeQuestionId = question.id
  const first = [...question.regions].sort((a, b) => a.page - b.page || a.y - b.y)[0]
  if (first && first.page !== page.value) page.value = first.page
}

watch(
  () => ui.activePaperId,
  () => {
    draftBox.value = null
    pendingBoxes.value = []
    void loadDocument()
  }
)

watch(page, (value) => {
  if (ui.activePaperId) ui.cutPageByPaper[ui.activePaperId] = value
})

watch([page, zoom], () => {
  void renderPreview()
})

onMounted(() => {
  if (stageRef.value) {
    resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const width = entry.contentRect.width
        baseWidth.value = Math.max(460, Math.min(880, width - 64))
      }
    })
    resizeObserver.observe(stageRef.value)
  }
  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('keyup', onKeyUp)
  window.addEventListener('blur', onWindowBlur)
  void loadDocument()
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  window.removeEventListener('keydown', onKeyDown)
  window.removeEventListener('keyup', onKeyUp)
  window.removeEventListener('blur', onWindowBlur)
  renderToken++
})
</script>

<template>
  <div class="view">
    <div class="cut-main">
      <div class="cut-toolbar">
        <select v-if="state.papers.length > 1" v-model.number="ui.activePaperId" class="select toolbar-paper-select">
          <option v-for="p in state.papers" :key="p.id" :value="p.id">{{ p.title }}</option>
        </select>

        <div class="page-nav">
          <button class="btn btn-icon" :disabled="page <= 1" @click="prevPage"><ChevronLeft :size="15" /></button>
          <span class="page-indicator">{{ page }} / {{ pageCount || 1 }}</span>
          <button class="btn btn-icon" :disabled="page >= pageCount" @click="nextPage"><ChevronRight :size="15" /></button>
        </div>

        <div class="page-nav">
          <button class="btn btn-icon" :disabled="zoom <= 0.6" @click="zoom = Math.max(0.6, zoom - 0.2)"><ZoomOut :size="15" /></button>
          <span class="page-indicator" style="min-width: 48px">{{ Math.round(zoom * 100) }}%</span>
          <button class="btn btn-icon" :disabled="zoom >= 2" @click="zoom = Math.min(2, zoom + 0.2)"><ZoomIn :size="15" /></button>
        </div>

        <div class="toolbar-spacer" />
      </div>

      <div
        class="cut-stage"
        ref="stageRef"
        :class="{ 'pan-ready': spaceHeld, panning }"
        @pointerdown="onStagePointerDown"
        @pointermove="onStagePointerMove"
        @pointerup="onStagePointerUp"
        @pointerleave="onStagePointerUp"
        @pointercancel="onStagePointerUp"
      >
        <div v-if="!ui.activePaperId" class="empty" style="margin: auto">
          <div class="empty-icon"><Scissors :size="24" /></div>
          <div class="empty-title">{{ t('cut.empty.noPaperTitle') }}</div>
          <div class="empty-desc">{{ t('cut.empty.noPaperDesc') }}</div>
          <button class="btn btn-primary" style="margin-top: 6px" @click="ui.view = 'import'">{{ t('cut.empty.goImport') }}</button>
        </div>

        <div v-else-if="loadError" class="empty" style="margin: auto">
          <div class="empty-title">{{ t('cut.empty.openFailed') }}</div>
          <div class="empty-desc">{{ loadError }}</div>
        </div>

        <div v-else-if="loading" class="empty" style="margin: auto">
          <div class="empty-icon"><Loader2 :size="24" class="spin" /></div>
          <div class="empty-title">{{ t('cut.empty.loading') }}</div>
        </div>

        <div v-else class="page-wrap" :style="{ width: displayWidth + 'px' }">
          <img v-if="pageImage" :src="pageImage" :alt="t('cut.toolbar.pageAlt')" draggable="false" />
          <div v-else class="page-skeleton"><Loader2 :size="22" class="spin" /></div>

          <div
            class="interaction-layer"
            @pointerdown="onPointerDown"
            @pointermove="onPointerMove"
            @pointerup="onPointerUp"
            @pointerleave="onPointerUp"
            @contextmenu.prevent
          >
            <div
              v-for="(item, i) in pageQuestions"
              :key="'box' + item.question.id + '-' + i"
              class="question-box"
              :class="{ active: item.question.id === ui.activeQuestionId }"
              :style="{
                left: item.region.x * 100 + '%',
                top: item.region.y * 100 + '%',
                width: item.region.w * 100 + '%',
                height: item.region.h * 100 + '%'
              }"
            >
              <span class="question-box-label">{{ questionTag(paper?.subject, item.index + 1) }}</span>
            </div>

            <div
              v-for="item in pendingBoxesOnPage"
              :key="'pending' + item.index"
              class="pending-box"
              :style="{
                left: item.region.x * 100 + '%',
                top: item.region.y * 100 + '%',
                width: item.region.w * 100 + '%',
                height: item.region.h * 100 + '%'
              }"
            >
              <span class="pending-label">{{ t('cut.canvas.region', { n: item.index + 1 }) }}</span>
            </div>

            <div
              v-for="entry in pendingAnswersOnPage"
              :key="'answer' + entry.item.id"
              class="answer-box"
              :class="{ active: entry.item.id === ui.activePendingAnswerId }"
              :style="{
                left: entry.item.region.x * 100 + '%',
                top: entry.item.region.y * 100 + '%',
                width: entry.item.region.w * 100 + '%',
                height: entry.item.region.h * 100 + '%'
              }"
              :title="t('cut.canvas.answerBoxTitle', { tag: answerTag(paper?.subject, entry.index + 1) })"
              @pointerdown.stop
              @click.stop="selectPendingAnswer(entry.item.id)"
            >
              <span class="answer-box-label">
                {{ answerTag(paper?.subject, entry.index + 1) }}
                <button
                  class="answer-box-remove"
                  :title="t('cut.canvas.removeAnswerBox')"
                  @pointerdown.stop
                  @click.stop="dropPendingAnswer(entry.item.id)"
                >
                  ×
                </button>
              </span>
            </div>

            <div
              v-if="draftBox"
              class="pending-box"
              :style="{
                left: draftBox.x * 100 + '%',
                top: draftBox.y * 100 + '%',
                width: draftBox.w * 100 + '%',
                height: draftBox.h * 100 + '%'
              }"
            >
              <span class="pending-label">{{ t('cut.canvas.newBox') }}</span>
            </div>
          </div>

          <div v-if="rendering" class="render-mask"><Loader2 :size="18" class="spin" /></div>
        </div>
      </div>

      <div class="cut-statusbar">
        {{ t('cut.statusbar') }}
      </div>
    </div>

    <aside class="inspector">
      <div class="inspector-head">
        <div>
          <div style="font-size: 13px; font-weight: 650">{{ t('cut.panel.title') }}</div>
          <div class="hint">
            {{
              paper
                ? t('cut.panel.paperMeta', {
                    subject: subjectLabel(subjectName(paper.subject)),
                    grade: gradeLabel(paper.grade),
                    year: paper.year
                  })
                : t('cut.panel.noPaper')
            }}
          </div>
        </div>
        <span class="badge badge-indigo">{{ t('cut.panel.questionCount', { n: paperQuestions.length }) }}</span>
      </div>

      <div class="card pending-card">
        <div style="font-size: 13px; font-weight: 600; margin-bottom: 4px">
          {{ pendingBoxes.length ? t('cut.pending.selected', { n: pendingBoxes.length }) : t('cut.pending.none') }}
        </div>
        <div v-if="pendingBoxes.length" class="pending-region-list">
          <div v-for="(box, i) in pendingBoxes" :key="i" class="pending-region-row">
            <span>
              {{
                t('cut.pending.regionRow', {
                  i: i + 1,
                  page: box.page,
                  w: Math.round(box.w * 100),
                  h: Math.round(box.h * 100)
                })
              }}
            </span>
            <button class="btn btn-ghost btn-icon" :title="t('cut.pending.removeRegion')" @click="removePending(i)"><Trash2 :size="13" /></button>
          </div>
        </div>
        <div style="display: flex; gap: 7px; flex-wrap: wrap">
          <button class="btn btn-primary btn-sm" :disabled="generating || !pendingBoxes.length" @click="createFromPending">
            <Plus :size="13" />
            {{
              pendingBoxes.length > 1
                ? t('cut.pending.createQuestionMulti', { n: pendingBoxes.length })
                : t('cut.pending.createQuestion')
            }}
          </button>
          <button class="btn btn-sm" :disabled="generating || !answerPickReady" @click="pickAnswerTarget">
            <Sparkles :size="13" />
            {{ t('cut.pending.addAnswer') }}
          </button>
          <button class="btn btn-ghost btn-sm" :disabled="!pendingBoxes.length" @click="clearPending">{{ t('common.clear') }}</button>
        </div>
        <div class="hint" style="margin-top: 8px">
          <template v-if="pendingBoxes.length > 1">
            {{ t('cut.pending.hintMulti') }}
          </template>
          <template v-else-if="pendingBoxes.length === 1">
            {{ t('cut.pending.hintSingle') }}
          </template>
          <template v-else-if="paperPendingAnswers.length">
            {{ t('cut.pending.hintHasAnswers') }}
          </template>
          <template v-else>
            {{ t('cut.pending.hintEmpty') }}
          </template>
        </div>
      </div>

      <div v-if="paperPendingAnswers.length" class="card answer-card">
        <div class="panel-section-title" style="margin-bottom: 6px">
          <span>{{ t('cut.answers.title', { n: paperPendingAnswers.length }) }}</span>
          <span class="hint">{{ t('cut.answers.clickToSelect') }}</span>
        </div>
        <div class="pending-region-list">
          <div
            v-for="entry in paperPendingAnswers"
            :key="entry.item.id"
            class="answer-region-row"
            :class="{ active: entry.item.id === ui.activePendingAnswerId }"
            @click="selectPendingAnswer(entry.item.id)"
          >
            <span class="answer-index">{{ answerTag(paper?.subject, entry.index + 1) }}</span>
            <span class="answer-meta">{{
              t('cut.answers.meta', { page: entry.item.region.page, w: Math.round(entry.item.region.w * 100) })
            }}</span>
            <button class="btn btn-ghost btn-icon" :title="t('cut.canvas.removeAnswerBox')" @click.stop="dropPendingAnswer(entry.item.id)">
              <Trash2 :size="13" />
            </button>
          </div>
        </div>
        <div class="hint" style="margin-top: 6px">
          {{ t('cut.answers.footer') }}
        </div>
      </div>

      <div class="panel-section" style="flex: 1">
        <div class="panel-section-title">
          <span>{{ t('cut.list.title') }}</span>
          <span class="hint">{{ t('cut.list.hint') }}</span>
        </div>

        <div v-if="!paperQuestions.length" class="hint" style="padding: 18px 0; text-align: center">
          {{ t('cut.list.emptyLine1') }}<br />{{ t('cut.list.emptyLine2') }}
        </div>

        <div v-else class="question-list">
          <div
            v-for="(question, index) in paperQuestions"
            :key="question.id"
            class="question-row"
            :class="{ active: question.id === ui.activeQuestionId }"
            @click="focusQuestion(question)"
          >
            <div class="q-thumb-mini">
              <img v-if="question.image" :src="question.image" />
            </div>
            <div style="flex: 1; min-width: 0">
              <div class="question-row-title">
                <span>{{ questionTag(paper?.subject, index + 1) }}</span>
                <span class="badge badge-gray" style="margin-left: 4px">{{ typeLabel(question.question_type) }}</span>
              </div>
              <div class="question-row-meta">
                {{
                  t('cut.list.meta', {
                    pages: question.regions.map((r) => r.page).join(t('cut.listSep')),
                    n: question.regions.length,
                    text: question.text ? question.text.slice(0, 24) : t('cut.list.noText')
                  })
                }}
              </div>
            </div>
            <div class="question-row-actions" @click.stop>
              <button class="btn btn-ghost btn-icon" :title="t('cut.list.deleteQuestion')" @click="removeQuestion(question)">
                <Trash2 :size="14" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="tip-card">
        <div style="display: flex; align-items: center; gap: 6px; font-weight: 600; font-size: 12px; margin-bottom: 6px">
          <Layers :size="13" /> {{ t('cut.tip.title') }}
        </div>
        <div class="hint">
          {{ t('cut.tip.step1') }}<br />
          {{ t('cut.tip.step2') }}<br />
          {{ t('cut.tip.step3') }}
        </div>
      </div>
    </aside>
  </div>
</template>

<style scoped>
.cut-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.cut-toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 16px;
  background: #fff;
  border-bottom: 1px solid var(--border);
  flex-wrap: wrap;
}
/* 下拉框固定 32px 高时必须去掉上下内边距，否则 13px 文字会被裁切 */
.toolbar-paper-select {
  width: 190px;
  height: 32px;
  padding-top: 0;
  padding-bottom: 0;
}
.page-nav {
  display: flex;
  align-items: center;
  gap: 4px;
}
.page-indicator {
  font-size: 12px;
  color: var(--text-2);
  min-width: 54px;
  text-align: center;
  font-variant-numeric: tabular-nums;
}
.cut-stage {
  flex: 1;
  overflow: auto;
  background: #e9ecf3;
  display: flex;
  justify-content: center;
  justify-content: safe center;
  align-items: flex-start;
  padding: 24px 28px 40px;
  background-image: radial-gradient(#d6dbe6 1px, transparent 1px);
  background-size: 18px 18px;
}
.cut-stage.pan-ready {
  cursor: grab;
}
.cut-stage.panning {
  cursor: grabbing;
}
.cut-stage.pan-ready .interaction-layer,
.cut-stage.panning .interaction-layer {
  cursor: inherit;
}
.page-wrap {
  position: relative;
  flex: 0 0 auto;
  align-self: flex-start;
  margin: 0 auto;
  background: #fff;
  box-shadow: 0 4px 26px rgba(22, 28, 45, 0.18);
  border-radius: 2px;
  overflow: hidden;
}
.page-wrap img {
  display: block;
  width: 100%;
  height: auto;
  user-select: none;
}
.page-skeleton {
  height: 600px;
  display: grid;
  place-items: center;
  color: var(--text-3);
}
.interaction-layer {
  position: absolute;
  inset: 0;
  cursor: crosshair;
  touch-action: none;
}
.question-box {
  position: absolute;
  border: 1.5px solid rgba(79, 70, 229, 0.45);
  background: rgba(99, 102, 241, 0.05);
  border-radius: 2px;
  pointer-events: none;
  transition: border-color 0.15s;
}
.question-box.active {
  border-color: #4f46e5;
  border-width: 2px;
  background: rgba(99, 102, 241, 0.1);
  box-shadow: 0 0 0 2px rgba(129, 140, 248, 0.35);
}
.question-box-label {
  position: absolute;
  top: -1px;
  left: -1px;
  background: #4f46e5;
  color: #fff;
  font-size: 10px;
  line-height: 15px;
  padding: 0 5px;
  border-radius: 0 0 4px 0;
  white-space: nowrap;
}
.pending-box {
  position: absolute;
  border: 2px dashed #0ea5e9;
  background: rgba(14, 165, 233, 0.12);
  pointer-events: none;
}
.pending-label {
  position: absolute;
  top: -1px;
  right: -1px;
  background: #0ea5e9;
  color: #fff;
  font-size: 10px;
  padding: 0 5px;
  line-height: 15px;
  border-radius: 0 0 0 4px;
}
.answer-box {
  position: absolute;
  border: 2px dashed #f59e0b;
  background: rgba(245, 158, 11, 0.12);
  border-radius: 2px;
  cursor: pointer;
  pointer-events: auto;
  transition: border-color 0.15s, background 0.15s;
}
.answer-box:hover {
  background: rgba(245, 158, 11, 0.18);
}
.answer-box.active {
  border-color: #d97706;
  border-style: solid;
  background: rgba(245, 158, 11, 0.22);
  box-shadow: 0 0 0 2px rgba(251, 191, 36, 0.35);
}
.answer-box-label {
  position: absolute;
  right: -1px;
  bottom: -1px;
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 0 4px;
  background: #f59e0b;
  color: #fff;
  font-size: 10px;
  line-height: 15px;
  border-radius: 0 0 0 4px;
  white-space: nowrap;
}
.answer-box-remove {
  border: 0;
  padding: 0 1px;
  background: transparent;
  color: #fff;
  font-size: 11px;
  line-height: 1;
  cursor: pointer;
  opacity: 0.85;
}
.answer-box-remove:hover {
  opacity: 1;
}
.render-mask {
  position: absolute;
  inset: 0;
  background: rgba(255, 255, 255, 0.7);
  display: grid;
  place-items: center;
  color: var(--accent);
}
.cut-statusbar {
  flex-shrink: 0;
  padding: 8px 18px;
  font-size: 12px;
  color: var(--text-3);
  background: #fff;
  border-top: 1px solid var(--border);
  line-height: 1.6;
}
.inspector-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border);
  margin-bottom: 14px;
}
.pending-card {
  padding: 12px;
  border-color: #bfe6f8;
  background: #f6fcff;
  margin-bottom: 14px;
}
.panel-section {
  padding: 12px 0;
  border-bottom: 1px solid var(--border);
}
.panel-section-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  font-size: 12.5px;
  font-weight: 650;
  margin-bottom: 8px;
}
.question-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 8px;
}
.question-row {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 7px;
  border: 1px solid var(--border);
  border-radius: 9px;
  cursor: pointer;
  transition: all 0.15s;
}
.question-row:hover {
  border-color: #c7cbf5;
  background: #fafbff;
}
.question-row.active {
  border-color: #8b84f2;
  background: #f5f5ff;
  box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.1);
}
.q-thumb-mini {
  width: 44px;
  height: 52px;
  border-radius: 5px;
  overflow: hidden;
  background: #f4f6fb;
  flex-shrink: 0;
  border: 1px solid var(--border);
}
.q-thumb-mini img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: top;
}
.question-row-title {
  display: flex;
  align-items: center;
  gap: 3px;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
}
.question-row-meta {
  font-size: 11px;
  color: var(--text-3);
  margin-top: 3px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.question-row-actions {
  display: flex;
  gap: 1px;
  opacity: 0;
  transition: opacity 0.15s;
}
.question-row:hover .question-row-actions {
  opacity: 1;
}
.tip-card {
  margin-top: 14px;
  padding: 12px;
  background: #f7f8fd;
  border: 1px solid #e6e8f4;
  border-radius: 10px;
}
.spin {
  animation: spin 0.8s linear infinite;
}
.pending-region-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 10px;
}
.pending-region-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  font-size: 11.5px;
  color: var(--text-2);
  background: #fff;
  border: 1px solid #e3ecf6;
  border-radius: 7px;
  padding: 4px 7px;
}
.pending-region-row span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.answer-card {
  padding: 12px;
  border-color: #f3e0b8;
  background: #fffbf2;
  margin-bottom: 14px;
}
.answer-region-row {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 7px;
  font-size: 11.5px;
  color: var(--text-2);
  background: #fff;
  border: 1px solid #f0e3cc;
  border-radius: 7px;
  cursor: pointer;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.answer-region-row:hover {
  border-color: #e9c98d;
}
.answer-region-row.active {
  border-color: #f59e0b;
  box-shadow: 0 0 0 2px rgba(245, 158, 11, 0.16);
}
.answer-index {
  font-weight: 650;
  color: #b45309;
  white-space: nowrap;
}
.answer-meta {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--text-3);
}
</style>
