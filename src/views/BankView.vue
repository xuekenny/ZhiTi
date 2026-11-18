<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import {
  ArrowRight,
  Brain,
  Check,
  ChevronLeft,
  ChevronRight,
  Filter,
  Loader2,
  Maximize2,
  RotateCcw,
  Save,
  Search,
  Sparkles,
  Star,
  Tag,
  Trash2,
  X
} from 'lucide-vue-next'
import AppModal from '../components/AppModal.vue'
import ContentEditor from '../components/ContentEditor.vue'
import QuestionPaperView from '../components/QuestionPaperView.vue'
import {
  addKnowledgePoint,
  batchLayout,
  deleteQuestion,
  paperOf,
  removePendingAnswer,
  state,
  ui,
  updateQuestion,
  type PendingAnswer
} from '../store'
import { toast } from '../composables/toast'
import { analyzeQuestion, recommendKnowledge } from '../utils/ai'
import {
  docToPlainText,
  hasContentDoc,
  recognizeAnswerLayout,
  recognizeQuestionLayout,
  summarizeContent
} from '../utils/layout'
import { buildLayoutImage, buildRegionsImage } from '../utils/layoutImage'
import { requestStopBatchRecognition, startBatchRecognition } from '../utils/batchRecognition'
import { mergeContinuationLines } from '../utils/reflow'
import { answerTag, questionTag, subjectName } from '../utils/label'
import { t, type MessageKey } from '../i18n'
import { difficultyLabel, gradeLabel, subjectLabel, typeLabel } from '../i18n/labels'
import { compressImage } from '../utils/image'
import { DIFFICULTY_LABELS, QUESTION_TYPES, TYPE_BADGE_CLASS, GRADES, type AnswerBlock, type ContentDoc, type Question } from '../types'

const keyword = ref(ui.bankKeyword || '')
const filterSubject = ref('')
const filterGrade = ref('')
const filterYear = ref('')
const filterType = ref('')
const filterDifficulty = ref('')
const filterKnowledge = ref('')
const filterPaper = ref('')
const sortBy = ref<'order' | 'new' | 'difficulty'>('order')

const pageIndex = ref(1)
const pageSize = 24
const draft = ref<Question | null>(null)
const dirty = ref(false)
const saving = ref(false)
const aiBusy = ref<'' | 'knowledge' | 'analysis'>('')
const answerRecognizing = ref(false)
const answerPickTargetId = ref<number | null>(null)
const answerPickBusy = ref(false)
const answerPickStep = ref('')
const answerPickError = ref('')
const answerOverwriteTarget = ref<Question | null>(null)
const pendingDelete = ref<Question | null>(null)
const imagePreview = ref('')
const layoutBusy = ref(false)
const layoutStatus = ref('')
const pendingLayout = ref(false)
const pendingBatch = ref(false)
const batchKnowledge = ref(false)
const batchAnalysis = ref(false)
const paperOpen = ref(false)
let suppressDirty = false

const activePaper = computed(() => (draft.value ? paperOf(draft.value) : undefined))
const contentStats = computed(() => (draft.value?.content ? summarizeContent(draft.value.content) : null))
const hasDraftContent = computed(() => hasContentDoc(draft.value?.content))
const editorContent = computed<ContentDoc>(() => draft.value?.content ?? { type: 'doc', content: [] })
const paperImage = computed(() => draft.value?.image ?? '')
const paperTitle = computed(() => {
  if (!draft.value) return t('bank.paperTitle')
  return t('bank.paperTitleWith', { label: questionLabelOf(draft.value) })
})
const draftStoreQuestion = computed(() =>
  draft.value ? state.questions.find((q) => q.id === draft.value!.id) : undefined
)
/** 后台批量识别更新题目后，同步当前打开的文档；有未保存编辑时以用户内容为准 */
watch(
  () => draftStoreQuestion.value?.content,
  (content) => {
    if (!draft.value || dirty.value || !content) return
    const latest = draftStoreQuestion.value
    draft.value.content = JSON.parse(JSON.stringify(content)) as ContentDoc
    draft.value.text = latest?.text ?? draft.value.text
    draft.value.knowledge = [...(latest?.knowledge ?? [])]
    draft.value.analysis = latest?.analysis ?? ''
  }
)
const activePending = computed(() => ui.pendingAnswers.find((item) => item.id === ui.activePendingAnswerId) ?? null)
/** 当前答案框在其来源试卷内的序号（从 1 开始） */
const activePendingIndex = computed(() => {
  const pending = activePending.value
  if (!pending) return 0
  return ui.pendingAnswers.filter((item) => item.paperId === pending.paperId).findIndex((item) => item.id === pending.id) + 1
})
const answerPickPaper = computed(() => {
  const pending = activePending.value
  return pending ? state.papers.find((p) => p.id === pending.paperId) ?? null : null
})
const activePendingLabel = computed(() => answerLabelOf(answerPickPaper.value?.subject, activePendingIndex.value))
const answerPickTarget = computed(() => state.questions.find((q) => q.id === answerPickTargetId.value) ?? null)
const answerPickSummary = computed(() => {
  const question = answerPickTarget.value
  if (!question) return ''
  const line = (question.text || '').split('\n').map((item) => item.trim()).find(Boolean) || t('bank.noStemText')
  return `${questionLabelOf(question)} · ${paperOf(question)?.title || t('bank.noLinkedPaper')} · ${line}`
})
const answerOverwriteLabel = computed(() =>
  answerOverwriteTarget.value ? questionLabelOf(answerOverwriteTarget.value) : ''
)

watch(draft, () => {
  if (!suppressDirty) dirty.value = true
}, { deep: true })

watch(keyword, (value) => {
  ui.bankKeyword = value
  pageIndex.value = 1
})

watch(
  () => [ui.pendingAnswers.length, ui.activePendingAnswerId] as const,
  () => {
    answerPickTargetId.value = null
    validatePendingAnswer()
  }
)

const years = computed(() => Array.from(new Set(state.papers.map((p) => p.year))).sort((a, b) => b - a))
const subjectOptions = computed(() =>
  Array.from(new Set(state.papers.map((p) => p.subject.trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'zh-CN'))
)
const gradeOptions = computed(() => {
  const rank = (grade: string) => {
    const index = GRADES.indexOf(grade)
    return index === -1 ? GRADES.length : index
  }
  return Array.from(new Set(state.papers.map((p) => p.grade.trim()).filter(Boolean))).sort(
    (a, b) => rank(a) - rank(b) || a.localeCompare(b, 'zh-CN')
  )
})
const knowledgeOptions = computed(() => Array.from(new Set(state.questions.flatMap((q) => q.knowledge))).sort((a, b) => a.localeCompare(b, 'zh-CN')))

const filtered = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  const list = state.questions.filter((q) => {
    const paper = paperOf(q)
    if (filterSubject.value && (paper?.subject ?? '').trim() !== filterSubject.value) return false
    if (filterGrade.value && (paper?.grade ?? '').trim() !== filterGrade.value) return false
    if (filterYear.value && String(paper?.year) !== filterYear.value) return false
    if (filterPaper.value && String(q.paper_id) !== filterPaper.value) return false
    if (filterType.value && q.question_type !== filterType.value) return false
    if (filterDifficulty.value && String(q.difficulty) !== filterDifficulty.value) return false
    if (filterKnowledge.value && !q.knowledge.includes(filterKnowledge.value)) return false
    if (kw) {
      const haystack = [q.text, q.answer, q.question_type, q.knowledge.join(' '), paper?.title ?? '', paper?.subject ?? '']
        .join(' ')
        .toLowerCase()
      if (!haystack.includes(kw)) return false
    }
    return true
  })
  if (sortBy.value === 'new') return [...list].sort((a, b) => b.created_at.localeCompare(a.created_at))
  if (sortBy.value === 'difficulty') return [...list].sort((a, b) => b.difficulty - a.difficulty || a.order - b.order)
  return [...list].sort((a, b) => a.order - b.order)
})

const totalPages = computed(() => Math.max(1, Math.ceil(filtered.value.length / pageSize)))
const paged = computed(() => filtered.value.slice((pageIndex.value - 1) * pageSize, pageIndex.value * pageSize))
const hasFilters = computed(
  () =>
    !!(keyword.value || filterSubject.value || filterGrade.value || filterYear.value || filterType.value || filterDifficulty.value || filterKnowledge.value || filterPaper.value)
)
const unrecognizedQuestions = computed(() => filtered.value.filter((q) => !hasContentDoc(q.content)))

watch(filtered, () => {
  pageIndex.value = Math.min(pageIndex.value, totalPages.value)
})

watch(subjectOptions, (options) => {
  if (filterSubject.value && !options.includes(filterSubject.value)) filterSubject.value = ''
})

watch(gradeOptions, (options) => {
  if (filterGrade.value && !options.includes(filterGrade.value)) filterGrade.value = ''
})

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string)
}

function highlight(text: string): string {
  const kw = keyword.value.trim()
  if (!kw) return escapeHtml(text)
  const pattern = new RegExp(`(${kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
  return escapeHtml(text).replace(pattern, '<mark>$1</mark>')
}

function snippet(text: string): string {
  const clean = text.replace(/\s+/g, ' ').trim()
  return clean.length > 110 ? `${clean.slice(0, 110)}…` : clean
}

/** 题目在其所属试卷内的序号（从 1 开始） */
function questionIndexInPaper(question: Question): number {
  return state.questions.filter((q) => q.paper_id === question.paper_id).findIndex((q) => q.id === question.id) + 1
}

/** 题目编号（界面显示）：学科 + 该试卷内序号，如「物理3」 */
function questionLabelOf(question: Question): string {
  return questionTag(paperOf(question)?.subject, questionIndexInPaper(question))
}

/** 答案框编号（界面显示），如「物理3答案」 */
function answerLabelOf(subject: string | null | undefined, indexInPaper: number): string {
  return answerTag(subject, indexInPaper)
}

/** 题卡没有题干文字时的占位 HTML */
function emptyTextHtml(): string {
  return `<span style='color:#a2a9b8'>${escapeHtml(t('bank.card.noText'))}</span>`
}

function resetFilters() {
  keyword.value = ''
  filterSubject.value = ''
  filterGrade.value = ''
  filterYear.value = ''
  filterType.value = ''
  filterDifficulty.value = ''
  filterKnowledge.value = ''
  filterPaper.value = ''
  sortBy.value = 'order'
  pageIndex.value = 1
}

function toggleSelect(id: number) {
  ui.exportIds = ui.exportIds.includes(id) ? ui.exportIds.filter((x) => x !== id) : [...ui.exportIds, id]
}

function selectAllVisible() {
  const ids = new Set(ui.exportIds)
  filtered.value.forEach((q) => ids.add(q.id))
  ui.exportIds = Array.from(ids)
  toast(t('bank.toast.selectedCount', { n: ui.exportIds.length }), 'success', 1800)
}

function clearSelection() {
  ui.exportIds = []
}

function goExport() {
  if (!ui.exportIds.length) {
    toast(t('bank.toast.selectToExport'), 'warning')
    return
  }
  ui.view = 'export'
}

async function flushDraft(silent = true): Promise<void> {
  if (!draft.value || !dirty.value) return
  await saveDraft(silent)
}

async function openQuestion(question: Question) {
  if (draft.value && dirty.value) await flushDraft(true)
  ui.activeQuestionId = question.id
  suppressDirty = true
  draft.value = {
    ...question,
    knowledge: [...question.knowledge],
    regions: [...question.regions],
    content: question.content ? (JSON.parse(JSON.stringify(question.content)) as ContentDoc) : undefined,
    answerBlocks: question.answerBlocks ? (JSON.parse(JSON.stringify(question.answerBlocks)) as AnswerBlock[]) : undefined
  }
  paperOpen.value = false
  await nextTick()
  suppressDirty = false
  dirty.value = false
}

async function saveDraft(silent = false) {
  if (!draft.value) return
  saving.value = true
  try {
    const current = draft.value
    await updateQuestion(current.id, {
      text: current.content ? docToPlainText(current.content) : current.text,
      content: current.content,
      answer: current.answer,
      answerImage: current.answerImage,
      answerBlocks: current.answerBlocks,
      difficulty: current.difficulty,
      question_type: current.question_type,
      knowledge: [...current.knowledge],
      analysis: current.analysis
    })
    for (const name of current.knowledge) {
      await addKnowledgePoint(name, paperOf(current)?.subject ?? '')
    }
    dirty.value = false
    if (!silent) toast(t('bank.toast.saved'), 'success')
  } catch (error) {
    toast(t('bank.toast.saveFailed', { error: (error as Error).message || t('common.unknownError') }), 'error')
  } finally {
    saving.value = false
  }
}

async function runAi(kind: 'knowledge' | 'analysis') {
  if (!draft.value) return
  const text = (draft.value.content ? docToPlainText(draft.value.content) : draft.value.text).trim()
  if (!text) {
    toast(t('bank.toast.noTextForAi'), 'warning')
    return
  }
  aiBusy.value = kind
  try {
    const config = state.settings.ai
    if (kind === 'knowledge') {
      const result = await recommendKnowledge(
        config,
        { text, subject: activePaper.value?.subject ?? '', grade: activePaper.value?.grade ?? '' },
        state.knowledge.map((k) => k.name)
      )
      const subject = activePaper.value?.subject ?? ''
      for (const name of result) {
        await addKnowledgePoint(name, subject)
      }
      for (const name of result) {
        if (!draft.value.knowledge.includes(name)) draft.value.knowledge.push(name)
      }
      dirty.value = true
      toast(t('bank.toast.aiKnowledge', { n: result.length, list: result.join(t('bank.listSeparator')) }), 'success', 4200)
    } else {
      const result = await analyzeQuestion(config, {
        text,
        subject: activePaper.value?.subject ?? '',
        grade: activePaper.value?.grade ?? '',
        answer: draft.value.answer
      })
      draft.value.analysis = result
      dirty.value = true
      toast(t('bank.toast.aiAnalysis'), 'success')
    }
  } catch (error) {
    toast((error as Error).message || t('bank.toast.aiFailed'), 'error', 5200)
  } finally {
    aiBusy.value = ''
  }
}

/** 题目文档「AI 识别答案」与切割页「添加答案」共用的识别流程，保证两条入口结果一致 */
async function recognizeAnswer(imageDataUrl: string) {
  return await recognizeAnswerLayout(state.settings.ai, imageDataUrl)
}

async function recognizeAnswerFromImage(imageDataUrl: string) {
  if (!draft.value) return
  answerRecognizing.value = true
  try {
    const result = await recognizeAnswer(imageDataUrl)
    const replaced = !!draft.value.answer.trim() || !!draft.value.answerBlocks?.length
    draft.value.answer = result.text
    draft.value.answerBlocks = result.blocks
    dirty.value = true
    const figures = result.figureCount ? t('bank.toast.answerFigures', { n: result.figureCount }) : ''
    const head = replaced ? t('bank.toast.answerReplaced') : t('bank.toast.answerFilled')
    if (result.warnings.length) {
      const detail = result.warnings.slice(0, 2).join(t('bank.detailSeparator'))
      toast(t('bank.toast.answerNeedsReview', { head, figures, detail }), 'warning', 6200)
    } else {
      toast(t('bank.toast.answerDone', { head, figures }), 'success', 4200)
    }
  } catch (error) {
    toast(t('bank.toast.answerFailed', { error: (error as Error).message || t('common.unknownError') }), 'error', 5200)
  } finally {
    answerRecognizing.value = false
  }
}

function exitAnswerPick() {
  answerPickTargetId.value = null
  answerPickStep.value = ''
  answerPickError.value = ''
  answerOverwriteTarget.value = null
}

/** 待处理答案区域失效时移除该框并给出提示 */
function validatePendingAnswer() {
  const pending = activePending.value
  if (!pending) {
    answerPickTargetId.value = null
    return
  }
  if (!state.papers.some((paper) => paper.id === pending.paperId)) {
    removePendingAnswer(pending.id)
    exitAnswerPick()
    toast(t('bank.answerPick.regionInvalid'), 'warning', 5600)
    return
  }
  const region = pending.region
  if (!region || !(region.w > 0) || !(region.h > 0)) {
    removePendingAnswer(pending.id)
    exitAnswerPick()
    toast(t('bank.answerPick.regionIncomplete'), 'warning', 5600)
  }
}

function onQuestionCardClick(question: Question) {
  if (!activePending.value) {
    void openQuestion(question)
    return
  }
  answerPickTargetId.value = question.id
  answerPickError.value = ''
}

function startAnswerFill() {
  if (answerPickBusy.value) return
  const target = answerPickTarget.value
  const pending = activePending.value
  if (!target || !pending) {
    toast(t('bank.answerPick.pickTargetFirst'), 'warning')
    return
  }
  answerPickError.value = ''
  if (!state.settings.ai.apiKey.trim()) {
    toast(t('bank.needApiKey'), 'warning')
    return
  }
  if (target.answer.trim()) {
    answerOverwriteTarget.value = target
    return
  }
  void runAnswerFill(target, pending)
}

function confirmAnswerOverwrite() {
  const target = answerOverwriteTarget.value
  const pending = activePending.value
  answerOverwriteTarget.value = null
  if (target && pending) void runAnswerFill(target, pending)
}

async function runAnswerFill(target: Question, pending: PendingAnswer) {
  answerPickBusy.value = true
  answerPickError.value = ''
  answerPickStep.value = t('bank.answerPick.stepReadImage')
  let step: MessageKey = 'bank.answerPick.phaseReadImage'
  try {
    const rawImage = await buildRegionsImage(pending.paperId, [pending.region])
    if (!rawImage) throw new Error(t('bank.answerPick.imageUnreadable'))
    const answerImage = await compressImage(rawImage).catch(() => rawImage)
    let question = state.questions.find((q) => q.id === target.id) ?? target
    const hadContent = hasContentDoc(question.content)
    if (!hadContent) {
      step = 'bank.answerPick.phaseLayout'
      answerPickStep.value = t('bank.answerPick.stepLayout')
      const layoutImage = await buildLayoutImage(question)
      const layout = await recognizeQuestionLayout(state.settings.ai, layoutImage)
      await updateQuestion(question.id, { content: layout.content, text: layout.text })
      question = state.questions.find((q) => q.id === target.id) ?? question
    }
    step = 'bank.answerPick.phaseAnswer'
    answerPickStep.value = hadContent ? t('bank.answerPick.stepAnswerOnly') : t('bank.answerPick.stepAnswer')
    const recognized = await recognizeAnswer(answerImage)
    step = 'bank.answerPick.phaseWrite'
    answerPickStep.value = t('bank.answerPick.stepWrite')
    await updateQuestion(question.id, { answer: recognized.text, answerBlocks: recognized.blocks, answerImage })
    const targetLabel = questionLabelOf(question)
    const pendingSubject = state.papers.find((p) => p.id === pending.paperId)?.subject
    const pendingNo =
      ui.pendingAnswers.filter((item) => item.paperId === pending.paperId).findIndex((item) => item.id === pending.id) + 1
    const pendingLabel = answerLabelOf(pendingSubject, pendingNo)
    removePendingAnswer(pending.id)
    exitAnswerPick()
    const remains = ui.pendingAnswers.length
    const figures = recognized.figureCount ? t('bank.answerPick.figures', { n: recognized.figureCount }) : ''
    toast(
      remains
        ? t('bank.answerPick.doneWithRemains', { target: targetLabel, figures, pending: pendingLabel, n: remains })
        : t('bank.answerPick.done', { target: targetLabel, figures }),
      'success',
      4200
    )
  } catch (error) {
    answerPickError.value = t('bank.answerPick.phaseFailed', { step: t(step), error: (error as Error).message || t('common.unknownError') })
    toast(answerPickError.value, 'error', 5600)
  } finally {
    answerPickBusy.value = false
    answerPickStep.value = ''
  }
}

function cancelAnswerPick() {
  if (answerPickBusy.value) return
  const pending = activePending.value
  if (!pending) {
    exitAnswerPick()
    return
  }
  const label = activePendingLabel.value
  removePendingAnswer(pending.id)
  exitAnswerPick()
  const remains = ui.pendingAnswers.length
  toast(
    remains ? t('bank.answerPick.cancelledWithRemains', { label, n: remains }) : t('bank.answerPick.cancelled', { label }),
    'info',
    2800
  )
}

function updateContent(doc: ContentDoc) {
  if (!draft.value) return
  draft.value.content = doc
  draft.value.text = docToPlainText(doc)
  dirty.value = true
}

function updateAnswer(value: string) {
  if (!draft.value) return
  draft.value.answer = value
  // 手动编辑按纯文本保存：文字在前，原有图片块保留为附图，避免悄悄丢图
  const figures = (draft.value.answerBlocks ?? []).filter((block): block is AnswerBlock & { type: 'image' } => block.type === 'image')
  draft.value.answerBlocks = figures.length ? [{ type: 'text', text: value }, ...figures] : undefined
  dirty.value = true
}

function updateAnswerImage(value: string) {
  if (!draft.value) return
  const next = value || undefined
  const hadBlocks = !!draft.value.answerBlocks?.length
  // 答案块里的裁剪坐标依赖原图，换图/删图后必须失效，避免按旧坐标截出错图
  if (next !== draft.value.answerImage) draft.value.answerBlocks = undefined
  draft.value.answerImage = next
  dirty.value = true
  if (hadBlocks) {
    toast(
      next === undefined
        ? t('bank.toast.answerImageRemoved')
        : t('bank.toast.answerImageReplaced'),
      'warning',
      4600
    )
  }
}

function updateAnalysis(value: string) {
  if (!draft.value) return
  draft.value.analysis = value
  dirty.value = true
}

function updateKnowledge(value: string[]) {
  if (!draft.value) return
  draft.value.knowledge = value
  dirty.value = true
}

function updateQuestionType(value: string) {
  if (!draft.value) return
  draft.value.question_type = value
  dirty.value = true
}

function updateDifficulty(value: number) {
  if (!draft.value) return
  draft.value.difficulty = value
  dirty.value = true
}

function onQuestionTypeChange(event: Event) {
  updateQuestionType((event.target as HTMLSelectElement).value)
}

function onDifficultyChange(event: Event) {
  updateDifficulty(Number((event.target as HTMLSelectElement).value))
}

function requestLayout() {
  if (!draft.value) return
  if (hasDraftContent.value) {
    pendingLayout.value = true
    return
  }
  void runLayout()
}

function relayoutFromPaper() {
  requestLayout()
}

function openPaper() {
  if (!draft.value) return
  if (hasDraftContent.value) {
    const merged = mergeContinuationLines(draft.value.content!)
    if (merged.changed) {
      draft.value.content = merged.doc
      draft.value.text = docToPlainText(merged.doc)
      dirty.value = true
      toast(t('bank.toast.linesMerged'), 'success', 2400)
    }
  }
  paperOpen.value = true
}

async function runLayout() {
  pendingLayout.value = false
  if (!draft.value) return
  if (!state.settings.ai.apiKey.trim()) {
    toast(t('bank.needApiKey'), 'warning')
    return
  }
  const question = draft.value
  layoutBusy.value = true
  layoutStatus.value = t('bank.toast.layoutPreparing')
  try {
    const recognitionImage = await buildLayoutImage(question)
    layoutStatus.value = t('bank.toast.layoutRequesting')
    const result = await recognizeQuestionLayout(state.settings.ai, recognitionImage)
    if (!draft.value || draft.value.id !== question.id) return
    draft.value.content = result.content
    draft.value.text = result.text
    dirty.value = true
    const summary = t('bank.toast.layoutSummary', {
      math: t('bank.toast.layoutMath', { n: result.mathCount }),
      figures: t('bank.toast.layoutFigures', { n: result.figureCount })
    })
    if (result.warnings.length) {
      const detail = result.warnings.slice(0, 2).join(t('bank.detailSeparator'))
      toast(t('bank.toast.layoutNeedsReview', { summary, detail }), 'warning', 6200)
    } else {
      toast(t('bank.toast.layoutDone', { summary }), 'success', 3800)
    }
  } catch (error) {
    toast(t('bank.toast.layoutFailed', { error: (error as Error).message || t('common.unknownError') }), 'error', 6200)
  } finally {
    layoutBusy.value = false
    layoutStatus.value = ''
  }
}

function startBatchLayout() {
  if (batchLayout.running) {
    toast(t('bank.toast.batchBusy'), 'info')
    return
  }
  if (!state.settings.ai.apiKey.trim()) {
    toast(t('bank.needApiKey'), 'warning')
    return
  }
  if (!unrecognizedQuestions.value.length) {
    toast(t('bank.toast.batchNothing'), 'info')
    return
  }
  pendingBatch.value = true
}

async function runBatchLayout() {
  pendingBatch.value = false
  if (batchLayout.running) return
  await flushDraft(true)
  const targets = [...unrecognizedQuestions.value]
  if (!targets.length) return
  const started = startBatchRecognition(
    targets.map((q) => q.id),
    { withKnowledge: batchKnowledge.value, withAnalysis: batchAnalysis.value }
  )
  if (!started) toast(t('bank.toast.batchBusy'), 'info')
}

async function confirmDelete() {
  if (!pendingDelete.value) return
  const id = pendingDelete.value.id
  await deleteQuestion(id)
  if (ui.activeQuestionId === id) {
    ui.activeQuestionId = null
    draft.value = null
    dirty.value = false
  }
  pendingDelete.value = null
  paperOpen.value = false
  toast(t('bank.toast.deleted'), 'success')
}

function onKeydown(event: KeyboardEvent) {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
    if (draft.value && ui.view === 'bank') {
      event.preventDefault()
      void saveDraft()
    }
  }
}

onMounted(async () => {
  window.addEventListener('keydown', onKeydown)
  validatePendingAnswer()
  const pendingId = ui.pendingPaperId
  if (pendingId == null) return
  ui.pendingPaperId = null
  const question = state.questions.find((q) => q.id === pendingId)
  if (!question) return
  await openQuestion(question)
  openPaper()
})
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
  if (dirty.value) void flushDraft(true)
})
</script>

<template>
  <div class="view" :class="{ 'answer-picking': !!activePending }">
    <div class="bank-main">
      <div class="filter-bar">
        <div class="filter-row">
          <div class="search-box">
            <Search :size="15" class="search-icon" />
            <input v-model="keyword" class="search-input" :placeholder="t('bank.toolbar.searchPlaceholder')" />
            <button v-if="keyword" class="clear-btn" @click="keyword = ''"><X :size="13" /></button>
          </div>

          <select v-model="filterSubject" class="select filter-select">
            <option value="">{{ t('bank.toolbar.allSubjects') }}</option>
            <option v-for="s in subjectOptions" :key="s" :value="s">{{ subjectLabel(s) }}</option>
          </select>
          <select v-model="filterGrade" class="select filter-select">
            <option value="">{{ t('bank.toolbar.allGrades') }}</option>
            <option v-for="g in gradeOptions" :key="g" :value="g">{{ gradeLabel(g) }}</option>
          </select>
          <select v-model="filterYear" class="select filter-select">
            <option value="">{{ t('bank.toolbar.allYears') }}</option>
            <option v-for="y in years" :key="y" :value="String(y)">{{ t('bank.toolbar.yearOption', { year: y }) }}</option>
          </select>
          <select v-model="filterType" class="select filter-select">
            <option value="">{{ t('bank.toolbar.allTypes') }}</option>
            <option v-for="qt in QUESTION_TYPES" :key="qt" :value="qt">{{ typeLabel(qt) }}</option>
          </select>

          <div class="toolbar-spacer" />

          <button class="btn btn-sm" @click="selectAllVisible"><Check :size="13" /> {{ t('bank.toolbar.selectAllResults') }}</button>
          <button class="btn btn-primary btn-sm" :disabled="!ui.exportIds.length" @click="goExport">
            {{ t('bank.toolbar.exportSelected') }} {{ ui.exportIds.length ? `(${ui.exportIds.length})` : '' }}
            <ArrowRight :size="13" />
          </button>
        </div>

        <div class="filter-row">
          <select v-model="filterKnowledge" class="select filter-select" style="width: 126px">
            <option value="">{{ t('bank.toolbar.allKnowledge') }}</option>
            <option v-for="k in knowledgeOptions" :key="k">{{ k }}</option>
          </select>
          <select v-model="filterDifficulty" class="select filter-select" style="width: 108px">
            <option value="">{{ t('bank.toolbar.allDifficulty') }}</option>
            <option v-for="(_label, level) in DIFFICULTY_LABELS" :key="level" :value="String(level)">{{ level }} · {{ difficultyLabel(Number(level)) }}</option>
          </select>
          <select v-model="filterPaper" class="select filter-select" style="width: 152px">
            <option value="">{{ t('bank.toolbar.allSources') }}</option>
            <option v-for="p in state.papers" :key="p.id" :value="String(p.id)">{{ p.title }}</option>
          </select>
          <select v-model="sortBy" class="select filter-select" style="width: 116px">
            <option value="order">{{ t('bank.toolbar.sortOrder') }}</option>
            <option value="new">{{ t('bank.toolbar.sortNew') }}</option>
            <option value="difficulty">{{ t('bank.toolbar.sortDifficulty') }}</option>
          </select>
          <button v-if="hasFilters" class="btn btn-ghost btn-sm" @click="resetFilters"><RotateCcw :size="12" /> {{ t('bank.toolbar.resetFilters') }}</button>
          <button class="btn btn-sm btn-ai" :disabled="batchLayout.running || !unrecognizedQuestions.length" @click="startBatchLayout">
            <Loader2 v-if="batchLayout.running" :size="12" class="spin" />
            <Sparkles v-else :size="12" />
            {{
              batchLayout.running
                ? t('bank.toolbar.batchRunning', { done: batchLayout.done, total: batchLayout.total })
                : t('bank.toolbar.batchStart', { n: unrecognizedQuestions.length })
            }}
          </button>
          <button v-if="batchLayout.running" class="btn btn-ghost btn-sm" @click="requestStopBatchRecognition">
            <X :size="12" /> {{ t('bank.toolbar.stop') }}
          </button>

          <div class="toolbar-spacer" />
          <div v-if="ui.exportIds.length" class="selection-chip">
            {{ t('bank.toolbar.chipPrefix') }} <strong>{{ ui.exportIds.length }}</strong> {{ t('bank.toolbar.chipSuffix') }}
            <button class="chip-remove" @click="clearSelection"><X :size="11" /></button>
          </div>
        </div>
      </div>

      <div class="list-header">
        <div class="hint">
          {{ t('bank.list.totalPrefix') }} <strong style="color: var(--text)">{{ filtered.length }}</strong>
          {{ t('bank.list.totalSuffix', { n: filtered.length }) }}
          <span v-if="ui.exportIds.length"> · {{ t('bank.list.selected', { n: ui.exportIds.length }) }}</span>
        </div>
        <div v-if="batchLayout.running" class="hint" style="display: flex; align-items: center; gap: 6px">
          <Loader2 :size="12" class="spin" />
          {{ t('bank.list.recognizing', { current: batchLayout.current || '…', done: batchLayout.done, total: batchLayout.total }) }}
        </div>
        <div v-else-if="filtered.length" class="hint">
          {{ t('bank.list.range', { from: (pageIndex - 1) * pageSize + 1, to: Math.min(pageIndex * pageSize, filtered.length) }) }}
        </div>
      </div>

      <div class="bank-content">
        <div v-if="!state.questions.length" class="empty">
          <div class="empty-icon"><Filter :size="24" /></div>
          <div class="empty-title">{{ t('bank.empty.bankTitle') }}</div>
          <div class="empty-desc">{{ t('bank.empty.bankDesc') }}</div>
          <button class="btn btn-primary" @click="ui.view = 'import'">{{ t('bank.empty.goImport') }}</button>
        </div>

        <div v-else-if="!filtered.length" class="empty">
          <div class="empty-icon"><Search :size="24" /></div>
          <div class="empty-title">{{ t('bank.empty.noMatchTitle') }}</div>
          <div class="empty-desc">{{ t('bank.empty.noMatchDesc') }}</div>
          <button class="btn" @click="resetFilters"><RotateCcw :size="14" /> {{ t('bank.toolbar.resetFilters') }}</button>
        </div>

        <div v-else class="q-grid">
          <div
            v-for="question in paged"
            :key="question.id"
            class="q-card"
            :class="{
              selected: ui.exportIds.includes(question.id),
              editing: !activePending && ui.activeQuestionId === question.id,
              'answer-target': !!activePending && answerPickTargetId === question.id
            }"
            @click="onQuestionCardClick(question)"
          >
            <div class="q-thumb">
              <img v-if="question.image" :src="question.image" loading="lazy" />
              <div class="q-check" @click.stop="toggleSelect(question.id)">
                <Check v-if="ui.exportIds.includes(question.id)" :size="13" />
              </div>
              <div class="q-thumb-index">{{ questionLabelOf(question) }}</div>
            </div>
            <div class="q-body">
              <div class="q-text" v-html="question.text ? highlight(snippet(question.text)) : emptyTextHtml()"></div>
              <div class="q-meta">
                <span class="badge" :class="TYPE_BADGE_CLASS[question.question_type] || 'badge-gray'">{{ typeLabel(question.question_type) }}</span>
                <span class="chip" style="height: 20px; font-size: 11px">
                  <Star :size="10" /> {{ t('bank.card.difficulty', { n: question.difficulty }) }}
                </span>
                <span v-if="question.knowledge.length" class="chip" style="height: 20px; font-size: 11px; max-width: 116px; overflow: hidden; text-overflow: ellipsis">
                  <Tag :size="10" /> {{ question.knowledge[0] }}{{ question.knowledge.length > 1 ? ` +${question.knowledge.length - 1}` : '' }}
                </span>
                <span v-if="question.answer.trim()" class="badge badge-amber">{{ t('bank.card.hasAnswer') }}</span>
                <span
                  v-if="!(paperOf(question)?.subject ?? '').trim()"
                  class="badge badge-gray"
                  :title="t('bank.card.noSubjectTitle')"
                >
                  {{ t('bank.card.noSubject') }}
                </span>
              </div>
              <div class="q-source">{{ paperOf(question)?.title || t('bank.noLinkedPaper') }}</div>
            </div>
          </div>
        </div>

        <div v-if="totalPages > 1" class="pager">
          <button class="btn btn-sm" :disabled="pageIndex <= 1" @click="pageIndex = Math.max(1, pageIndex - 1)"><ChevronLeft :size="13" /> {{ t('bank.list.prevPage') }}</button>
          <span class="hint">{{ t('bank.list.pageOf', { page: pageIndex, total: totalPages }) }}</span>
          <button class="btn btn-sm" :disabled="pageIndex >= totalPages" @click="pageIndex = Math.min(totalPages, pageIndex + 1)">{{ t('bank.list.nextPage') }} <ChevronRight :size="13" /></button>
        </div>
      </div>
    </div>

    <aside class="inspector">
      <div v-if="!draft" class="empty" style="padding: 60px 16px">
        <div class="empty-icon"><Brain :size="22" /></div>
        <div class="empty-title">{{ t('bank.inspector.emptyTitle') }}</div>
        <div class="empty-desc">{{ t('bank.inspector.emptyDesc') }}</div>
      </div>

      <template v-else>
        <div class="editor-head">
          <div style="min-width: 0">
            <div style="font-size: 13px; font-weight: 650; display: flex; align-items: center; gap: 6px">
              {{ draft ? questionLabelOf(draft) : '' }}
              <span v-if="dirty" class="badge badge-amber">{{ t('bank.inspector.unsaved') }}</span>
            </div>
            <div class="hint" style="margin-top: 3px">{{ activePaper?.title || t('bank.noLinkedPaper') }}</div>
          </div>
          <button class="btn btn-primary btn-sm" :disabled="saving || !dirty" @click="saveDraft()">
            <Loader2 v-if="saving" :size="12" class="spin" />
            <Save v-else :size="12" /> {{ t('common.save') }}
          </button>
        </div>

        <div class="content-pane">
          <div v-if="draft.image" class="editor-image" :title="t('bank.inspector.zoomTitle')" @click="imagePreview = draft.image">
            <img :src="draft.image" :alt="t('bank.inspector.imageAlt')" />
          </div>
          <div v-else class="editor-image-placeholder">{{ t('bank.inspector.noImage') }}</div>

          <div class="content-toolbar">
            <div class="hint">
              <template v-if="hasDraftContent">
                {{ t('bank.inspector.statParagraphs', { n: contentStats?.paragraphs ?? 0 }) }} ·
                {{ t('bank.inspector.statMath', { n: contentStats?.math ?? 0 }) }} ·
                {{ t('bank.inspector.statFigures', { n: contentStats?.figures ?? 0 }) }}
                <span v-if="contentStats?.unresolved"> · {{ t('bank.inspector.statUnresolved', { n: contentStats.unresolved }) }}</span>
              </template>
              <template v-else>{{ t('bank.inspector.notRecognized') }}</template>
            </div>
            <div class="content-toolbar-actions">
              <button class="btn btn-primary btn-sm" @click="openPaper">
                <Maximize2 :size="12" /> {{ t('bank.inspector.openPaper') }}
              </button>
            </div>
          </div>

          <div v-if="hasDraftContent" class="paper-mini" @click="openPaper">
            <ContentEditor :model-value="editorContent" variant="paper" readonly />
          </div>
          <div v-else class="content-empty" @click="openPaper">
            <div style="font-size: 13px; font-weight: 600">{{ t('bank.inspector.noContentTitle') }}</div>
            <div class="hint">{{ t('bank.inspector.noContentDesc') }}</div>
          </div>
          <div class="hint" style="margin-top: 6px">{{ t('bank.inspector.paperHint') }}</div>
        </div>

        <div class="inspector-attrs">
          <div class="inspector-attrs-title">{{ t('bank.inspector.attrsTitle') }}</div>
          <label class="inspector-attr">
            <span>{{ t('bank.inspector.attrType') }}</span>
            <select class="select" :value="draft.question_type" @change="onQuestionTypeChange">
              <option v-for="type in QUESTION_TYPES" :key="type" :value="type">{{ typeLabel(type) }}</option>
            </select>
          </label>
          <label class="inspector-attr">
            <span>{{ t('bank.inspector.attrDifficulty') }}</span>
            <select class="select" :value="draft.difficulty" @change="onDifficultyChange">
              <option v-for="level in 5" :key="level" :value="level">{{ level }} · {{ difficultyLabel(level) }}</option>
            </select>
          </label>
        </div>

        <div class="editor-actions">
          <button class="btn btn-danger btn-sm" @click="pendingDelete = draft"><Trash2 :size="13" /> {{ t('bank.inspector.deleteQuestion') }}</button>
          <span class="hint" style="margin-left: auto"><span class="kbd">Ctrl</span> + <span class="kbd">S</span> {{ t('bank.inspector.saveShortcut') }}</span>
        </div>
      </template>
    </aside>

    <AppModal v-if="pendingDelete" :title="t('bank.modal.deleteTitle')" @close="pendingDelete = null">
      <template #description>{{ t('bank.modal.deleteDesc') }}</template>
      <div class="hint">{{ snippet(pendingDelete.text || t('bank.noText')) }}</div>
      <template #actions>
        <button class="btn" @click="pendingDelete = null">{{ t('common.cancel') }}</button>
        <button class="btn btn-danger" @click="confirmDelete"><Trash2 :size="14" /> {{ t('bank.modal.deleteConfirm') }}</button>
      </template>
    </AppModal>

    <AppModal v-if="pendingLayout" :title="t('bank.modal.relayoutTitle')" :z-index="95" @close="pendingLayout = false">
      <template #description>{{ t('bank.modal.relayoutDesc') }}</template>
      <template #actions>
        <button class="btn" @click="pendingLayout = false">{{ t('common.cancel') }}</button>
        <button class="btn btn-primary" @click="runLayout"><Sparkles :size="14" /> {{ t('bank.modal.relayoutConfirm') }}</button>
      </template>
    </AppModal>

    <AppModal v-if="pendingBatch" :title="t('bank.modal.batchTitle')" @close="pendingBatch = false">
      <template #description>
        {{ t('bank.modal.batchDesc', { n: unrecognizedQuestions.length }) }}
      </template>
      <div class="batch-options">
        <label class="batch-option">
          <input v-model="batchKnowledge" type="checkbox" />
          <span>
            <strong>{{ t('bank.modal.batchKnowledge') }}</strong>
            <em>{{ t('bank.modal.batchKnowledgeDesc') }}</em>
          </span>
        </label>
        <label class="batch-option">
          <input v-model="batchAnalysis" type="checkbox" />
          <span>
            <strong>{{ t('bank.modal.batchAnalysis') }}</strong>
            <em>{{ t('bank.modal.batchAnalysisDesc') }}</em>
          </span>
        </label>
      </div>
      <template #actions>
        <button class="btn" @click="pendingBatch = false">{{ t('common.cancel') }}</button>
        <button class="btn btn-primary" @click="runBatchLayout"><Sparkles :size="14" /> {{ t('bank.modal.batchConfirm') }}</button>
      </template>
    </AppModal>

    <div v-if="activePending" class="answer-pick-bar">
      <div class="answer-pick-main">
        <div class="answer-pick-mode">
          <Sparkles :size="13" />
          {{ t('bank.answerPick.modePrefix') }} <span class="answer-pick-tag">{{ activePendingLabel }}</span> {{ t('bank.answerPick.modeSuffix') }}
          <span class="answer-pick-source">
            {{ t('bank.answerPick.source', { page: activePending.region.page, title: answerPickPaper?.title || t('bank.answerPick.deletedPaper') }) }}
          </span>
          <span v-if="ui.pendingAnswers.length > 1" class="answer-pick-count">{{ t('bank.answerPick.pendingCount', { n: ui.pendingAnswers.length }) }}</span>
        </div>
        <div v-if="answerPickBusy" class="answer-pick-progress">
          <Loader2 :size="13" class="spin" />
          <span>{{ answerPickStep || t('common.processing') }}</span>
        </div>
        <div v-else-if="answerPickError" class="answer-pick-error">{{ answerPickError }}</div>
        <div v-else class="answer-pick-target">
          {{ answerPickSummary || t('bank.answerPick.targetHint') }}
        </div>
      </div>
      <div class="answer-pick-actions">
        <button class="btn btn-ghost btn-sm" :disabled="answerPickBusy" @click="cancelAnswerPick">{{ t('common.cancel') }}</button>
        <button class="btn btn-primary btn-sm" :disabled="!answerPickTargetId || answerPickBusy" @click="startAnswerFill">
          <Loader2 v-if="answerPickBusy" :size="13" class="spin" />
          <Sparkles v-else :size="13" />
          {{ t('bank.answerPick.fill') }}
        </button>
      </div>
    </div>

    <AppModal v-if="answerOverwriteTarget" :title="t('bank.modal.overwriteTitle')" @close="answerOverwriteTarget = null">
      <template #description>
        {{ t('bank.modal.overwriteDesc', { label: answerOverwriteLabel }) }}
      </template>
      <div class="hint">{{ snippet(answerOverwriteTarget.text || t('bank.noStemText')) }}</div>
      <template #actions>
        <button class="btn" @click="answerOverwriteTarget = null">{{ t('common.cancel') }}</button>
        <button class="btn btn-primary" @click="confirmAnswerOverwrite">
          <Sparkles :size="14" /> {{ t('bank.modal.overwriteConfirm') }}
        </button>
      </template>
    </AppModal>

    <QuestionPaperView
      v-if="paperOpen && draft"
      :model-value="editorContent"
      :image="paperImage"
      :title="paperTitle"
      :dirty="dirty"
      :answer="draft.answer"
      :answer-blocks="draft.answerBlocks || []"
      :answer-image="draft.answerImage || ''"
      :analysis="draft.analysis"
      :knowledge="draft.knowledge"
      :ai-busy="aiBusy"
      :answer-recognizing="answerRecognizing"
      :recognizing="layoutBusy"
      :recognize-status="layoutStatus"
      @update:model-value="updateContent"
      @update:answer="updateAnswer"
      @update:answer-image="updateAnswerImage"
      @update:analysis="updateAnalysis"
      @update:knowledge="updateKnowledge"
      @recognize-answer="recognizeAnswerFromImage"
      @ai="runAi"
      @save="saveDraft()"
      @relayout="relayoutFromPaper"
      @close="paperOpen = false"
    />

    <AppModal v-if="imagePreview" :title="t('bank.modal.imagePreview')" :width="720" @close="imagePreview = ''">
      <img :src="imagePreview" style="width: 100%; border-radius: 8px; border: 1px solid var(--border)" />
    </AppModal>
  </div>
</template>

<style scoped>
.bank-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.filter-bar {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px 16px;
  background: #fff;
  border-bottom: 1px solid var(--border);
}
.filter-row {
  display: flex;
  align-items: center;
  gap: 7px;
  flex-wrap: wrap;
}
.search-box {
  position: relative;
  width: 236px;
  flex-shrink: 0;
}
.search-icon {
  position: absolute;
  left: 10px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-3);
}
.search-input {
  width: 100%;
  height: 32px;
  border: 1px solid var(--border-strong);
  border-radius: 8px;
  padding: 0 26px 0 31px;
  font-size: 13px;
  outline: none;
  transition: border 0.15s, box-shadow 0.15s;
}
.search-input:focus {
  border-color: #a5a0f5;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.12);
}
.clear-btn {
  position: absolute;
  right: 6px;
  top: 50%;
  transform: translateY(-50%);
  border: 0;
  background: transparent;
  color: var(--text-3);
  display: grid;
  place-items: center;
  padding: 3px;
  border-radius: 4px;
}
.clear-btn:hover {
  background: #f0f2f8;
}
.filter-select {
  width: 96px;
  height: 32px;
  padding-top: 0;
  padding-bottom: 0;
  font-size: 12.5px;
}
.btn-ai {
  border-color: transparent;
  background: linear-gradient(135deg, #8b5cf6, #4f46e5);
  color: #fff;
  font-weight: 600;
  box-shadow: 0 3px 10px rgba(109, 40, 217, 0.32);
}
.btn-ai:hover:not(:disabled) {
  background: linear-gradient(135deg, #7c3aed, #4338ca);
  border-color: transparent;
}
.btn-ai:disabled {
  background: #eef0f7;
  color: var(--text-3);
  border-color: var(--border);
  box-shadow: none;
  opacity: 1;
}
.selection-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 26px;
  padding: 0 9px;
  background: var(--accent-soft);
  border: 1px solid #d2d0fa;
  color: var(--accent-dark);
  border-radius: 999px;
  font-size: 11.5px;
}
.batch-options {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.batch-option {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 9px 11px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: #fafbfe;
  cursor: pointer;
}
.batch-option:hover {
  border-color: #c9c4f7;
}
.batch-option input {
  flex-shrink: 0;
  margin: 2px 0 0;
  accent-color: #5b52ea;
}
.batch-option strong {
  display: block;
  color: var(--text);
  font-size: 12.5px;
  font-weight: 600;
}
.batch-option em {
  display: block;
  margin-top: 2px;
  color: var(--text-3);
  font-size: 11.5px;
  font-style: normal;
  line-height: 1.5;
}
.list-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 10px 18px 0;
}
.bank-content {
  flex: 1;
  overflow: auto;
  padding: 12px 18px 24px;
}
.q-card.editing {
  border-color: #6366f1;
  box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.18);
}
.q-card.answer-target {
  border-color: #6366f1;
  background: var(--accent-soft);
  box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.22);
}
.view.answer-picking .bank-content {
  padding-bottom: 118px;
}
.answer-pick-bar {
  position: fixed;
  left: 50%;
  bottom: 18px;
  z-index: 30;
  display: flex;
  align-items: center;
  gap: 16px;
  width: min(920px, calc(100vw - 48px));
  padding: 10px 14px;
  background: var(--surface);
  border: 1px solid var(--border-strong);
  border-radius: 12px;
  box-shadow: 0 12px 32px rgba(20, 28, 48, 0.18);
  transform: translateX(-50%);
}
.answer-pick-main {
  display: flex;
  flex: 1;
  min-width: 0;
  flex-direction: column;
  gap: 4px;
}
.answer-pick-mode {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12.5px;
  font-weight: 650;
  color: var(--accent-dark);
}
.answer-pick-source {
  margin-left: 4px;
  overflow: hidden;
  font-size: 11px;
  font-weight: 400;
  color: var(--text-3);
  text-overflow: ellipsis;
  white-space: nowrap;
}
.answer-pick-tag {
  flex-shrink: 0;
  padding: 0 6px;
  font-size: 11.5px;
  line-height: 18px;
  color: #b45309;
  background: #fef3c7;
  border: 1px solid #f3d9a4;
  border-radius: 999px;
}
.answer-pick-count {
  flex-shrink: 0;
  font-size: 11px;
  font-weight: 400;
  color: var(--text-3);
  white-space: nowrap;
}
.answer-pick-target {
  overflow: hidden;
  font-size: 12px;
  color: var(--text);
  text-overflow: ellipsis;
  white-space: nowrap;
}
.answer-pick-progress {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--accent);
}
.answer-pick-error {
  overflow: hidden;
  font-size: 12px;
  color: var(--danger);
  text-overflow: ellipsis;
  white-space: nowrap;
}
.answer-pick-actions {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: 8px;
}
.q-thumb-index {
  position: absolute;
  left: 7px;
  top: 7px;
  max-width: calc(100% - 14px);
  overflow: hidden;
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid var(--border);
  color: var(--text-2);
  font-size: 10.5px;
  padding: 1px 6px;
  border-radius: 999px;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.q-source {
  font-size: 11px;
  color: var(--text-3);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  border-top: 1px dashed #eef0f5;
  padding-top: 6px;
  margin-top: 2px;
}
.pager {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 22px 0 8px;
}
.editor-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  padding-bottom: 12px;
  margin-bottom: 14px;
  border-bottom: 1px solid var(--border);
}
.editor-image {
  border: 1px solid var(--border);
  border-radius: 9px;
  background: #fafbfe;
  overflow: hidden;
  margin-bottom: 14px;
  cursor: zoom-in;
  max-height: 220px;
  display: flex;
  justify-content: center;
}
.editor-image img {
  max-width: 100%;
  max-height: 220px;
  width: auto;
  height: auto;
  object-fit: contain;
  object-position: top;
}
.editor-image-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 40px;
  margin-bottom: 14px;
  border: 1px dashed var(--border);
  border-radius: 9px;
  background: #fafbfe;
  color: var(--text-3);
  font-size: 12px;
}
.content-pane {
  margin-bottom: 14px;
}
.content-empty {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
  padding: 18px 14px;
  border: 1px dashed var(--border-strong);
  border-radius: 9px;
  background: #fafbfe;
  cursor: pointer;
}
.content-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
}
.content-toolbar-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}
.paper-mini {
  position: relative;
  max-height: 340px;
  overflow: hidden;
  padding: 12px 14px;
  background: #fff;
  border: 1px solid var(--border);
  border-radius: 9px;
  cursor: zoom-in;
  --paper-base-size: 12px;
  --paper-line-height: 1.8;
}
.paper-mini :deep(.content-editor) {
  pointer-events: none;
}
.paper-mini::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 44px;
  background: linear-gradient(to bottom, rgba(255, 255, 255, 0), #fff);
  pointer-events: none;
}
.chip-remove {
  border: 0;
  background: transparent;
  color: inherit;
  display: grid;
  place-items: center;
  padding: 0;
  margin-left: 1px;
  opacity: 0.65;
}
.chip-remove:hover {
  opacity: 1;
}
.inspector-attrs {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 16px;
  padding-top: 14px;
  border-top: 1px dashed var(--border);
}
.inspector-attrs-title {
  color: var(--text-2);
  font-size: 12px;
  font-weight: 650;
}
.inspector-attr {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--text-2);
  font-size: 12px;
}
.inspector-attr > span {
  width: 30px;
  flex-shrink: 0;
}
:lang(en) .inspector-attr > span {
  width: 58px;
}
.inspector-attr .select {
  flex: 1;
  min-width: 0;
  height: 30px;
  padding-top: 0;
  padding-bottom: 0;
  font-size: 12.5px;
}
.editor-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 18px;
  padding-top: 14px;
  border-top: 1px solid var(--border);
}
.spin {
  animation: spin 0.8s linear infinite;
}
</style>
