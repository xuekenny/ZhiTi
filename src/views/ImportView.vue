<script setup lang="ts">
import { computed, reactive, ref, shallowRef } from 'vue'
import { FileText, Loader2, Pencil, Scissors, Trash2, UploadCloud, Wand2 } from 'lucide-vue-next'
import { disposePaperSource, isDocxFile, openDocumentFile, type OpenedDocument } from '../utils/source'
import { createPaper, deletePaper, state, ui, updatePaper } from '../store'
import { toast } from '../composables/toast'
import AppModal from '../components/AppModal.vue'
import { subjectName } from '../utils/label'
import { type Paper } from '../types'
import { t } from '../i18n'
import { gradeLabel, subjectLabel } from '../i18n/labels'

const fileInput = ref<HTMLInputElement>()
const opened = shallowRef<OpenedDocument | null>(null)
const selectedFile = ref<File | null>(null)
const parsing = ref(false)
const importing = ref(false)
const dragging = ref(false)
const pendingDelete = ref<number | null>(null)
const editingPaper = ref<Paper | null>(null)
const savingEdit = ref(false)
const subjectTouched = ref(false)
const editSubjectTouched = ref(false)

const form = reactive({
  title: '',
  year: new Date().getFullYear(),
  subject: '',
  grade: ''
})

const editForm = reactive({
  title: '',
  year: new Date().getFullYear(),
  subject: '',
  grade: ''
})

const subjectMissing = computed(() => !form.subject.trim())
const editSubjectMissing = computed(() => !editForm.subject.trim())
const canImport = computed(
  () => !!opened.value && form.title.trim().length > 0 && !subjectMissing.value && !parsing.value && !importing.value
)

const fileSizeText = computed(() => {
  if (!selectedFile.value) return ''
  const mb = selectedFile.value.size / 1024 / 1024
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.round(selectedFile.value.size / 1024)} KB`
})

function questionCount(paperId: number): number {
  return state.questions.filter((q) => q.paper_id === paperId).length
}

async function handleFile(file: File | undefined | null) {
  if (!file) return
  const isPdf = /\.pdf$/i.test(file.name) || file.type === 'application/pdf'
  if (!isPdf && !isDocxFile(file)) {
    toast(t('import.toast.unsupportedType'), 'error')
    return
  }
  if (file.size > 120 * 1024 * 1024) {
    toast(t('import.toast.tooLarge'), 'error')
    return
  }
  parsing.value = true
  selectedFile.value = file
  opened.value = null
  try {
    const result = await openDocumentFile(file)
    opened.value = result
    form.title = file.name.replace(/\.(pdf|docx)$/i, '').replace(/[_-]+/g, ' ').trim() || t('import.form.defaultTitle')
    toast(t(result.kind === 'docx' ? 'import.toast.parsedDocx' : 'import.toast.parsedPdf', { n: result.pageCount }), 'success')
  } catch (error) {
    const message = (error as Error).message || ''
    selectedFile.value = null
    if (fileInput.value) fileInput.value.value = ''
    if (isPdf && /password/i.test(message)) toast(t('import.toast.encrypted'), 'error')
    else toast(t('import.toast.parseFailed'), 'error')
  } finally {
    parsing.value = false
  }
}

function onDrop(event: DragEvent) {
  dragging.value = false
  handleFile(event.dataTransfer?.files?.[0])
}

async function doImport() {
  if (!opened.value) return
  if (subjectMissing.value) {
    subjectTouched.value = true
    toast(t('import.toast.subjectRequired'), 'warning')
    return
  }
  importing.value = true
  try {
    const paper = await createPaper({
      title: form.title.trim(),
      year: Number(form.year) || new Date().getFullYear(),
      subject: form.subject.trim(),
      grade: form.grade.trim(),
      page_count: opened.value.pageCount,
      source_name: selectedFile.value?.name,
      source_type: opened.value.kind,
      file: opened.value.bytes
    })
    opened.value.cache(paper.id)
    ui.activePaperId = paper.id
    ui.view = 'cut'
    toast(t('import.toast.imported', { title: paper.title, n: paper.page_count }), 'success')
    opened.value = null
    selectedFile.value = null
    form.title = ''
    subjectTouched.value = false
    if (fileInput.value) fileInput.value.value = ''
  } catch (error) {
    toast(t('import.toast.importFailed', { error: (error as Error).message || t('common.unknownError') }), 'error')
  } finally {
    importing.value = false
  }
}

function continueCut(paperId: number) {
  ui.activePaperId = paperId
  ui.view = 'cut'
}

function openEdit(paper: Paper) {
  editingPaper.value = paper
  editSubjectTouched.value = false
  editForm.title = paper.title
  editForm.year = paper.year
  editForm.subject = paper.subject
  editForm.grade = paper.grade
}

async function saveEdit() {
  const target = editingPaper.value
  if (!target) return
  const title = editForm.title.trim()
  if (!title) {
    toast(t('import.toast.titleRequired'), 'warning')
    return
  }
  if (editSubjectMissing.value) {
    editSubjectTouched.value = true
    toast(t('import.toast.subjectRequired'), 'warning')
    return
  }
  savingEdit.value = true
  try {
    await updatePaper(target.id, {
      title,
      year: Number(editForm.year) || target.year,
      subject: editForm.subject.trim(),
      grade: editForm.grade.trim()
    })
    toast(t('import.toast.updated'), 'success')
    editingPaper.value = null
  } catch (error) {
    toast(t('import.toast.saveFailed', { error: (error as Error).message || t('common.unknownError') }), 'error')
  } finally {
    savingEdit.value = false
  }
}

async function confirmDelete() {
  if (pendingDelete.value == null) return
  const id = pendingDelete.value
  await deletePaper(id)
  await disposePaperSource(id)
  pendingDelete.value = null
  toast(t('import.toast.deleted'), 'success')
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
</script>

<template>
  <div class="view">
    <div class="workspace" style="max-width: 1040px; margin: 0 auto; width: 100%">
      <div class="hero">
        <div>
          <h1>{{ t('import.hero.title') }}</h1>
          <p>{{ t('import.hero.intro') }}</p>
        </div>
        <div class="hero-badges">
          <span class="chip"><Wand2 :size="12" /> {{ t('import.hero.smartCut') }}</span>
          <span class="chip"><FileText :size="12" /> {{ t('import.hero.localParse') }}</span>
          <span class="chip"><Scissors :size="12" /> {{ t('import.hero.crossPage') }}</span>
        </div>
      </div>

      <div class="import-grid">
        <div>
          <div
            class="dropzone"
            :class="{ dragging, filled: !!selectedFile }"
            @click="fileInput?.click()"
            @dragover.prevent="dragging = true"
            @dragleave.prevent="dragging = false"
            @drop.prevent="onDrop"
          >
            <input ref="fileInput" type="file" accept="application/pdf,.pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.docx" hidden @change="handleFile(($event.target as HTMLInputElement).files?.[0])" />
            <template v-if="!selectedFile">
              <div class="drop-icon"><UploadCloud :size="26" /></div>
              <div class="drop-title">{{ t('import.dropzone.title') }}</div>
              <div class="hint">{{ t('import.dropzone.hint') }}</div>
            </template>
            <template v-else>
              <div class="drop-icon" :style="{ background: parsing ? '#eef0ff' : '#e7f7f1', color: parsing ? '#4f46e5' : '#059669' }">
                <Loader2 v-if="parsing" :size="24" class="spin" />
                <FileText v-else :size="24" />
              </div>
              <div class="drop-title drop-title-file" :title="selectedFile.name">{{ selectedFile.name }}</div>
              <div class="hint">
                <template v-if="parsing">{{ t('import.dropzone.parsing') }}</template>
                <template v-else-if="opened">{{ t('import.dropzone.parsed', { size: fileSizeText, pages: opened.pageCount }) }}</template>
                <template v-else>{{ t('import.dropzone.failed') }}</template>
              </div>
            </template>
          </div>

          <div class="card card-pad" style="margin-top: 16px">
            <div class="section-title">{{ t('import.form.sectionTitle') }}</div>
            <div class="field">
              <label class="label">{{ t('import.form.title') }}<span class="req">*</span></label>
              <input v-model="form.title" class="input" :placeholder="t('import.form.titlePlaceholder')" />
            </div>
            <div class="row-3">
              <div class="field">
                <label class="label">{{ t('common.year') }}</label>
                <input v-model.number="form.year" type="number" class="input" min="1990" max="2100" />
              </div>
              <div class="field">
                <label class="label">{{ t('common.subject') }}<span class="req">*</span></label>
                <input
                  v-model="form.subject"
                  class="input"
                  :class="{ invalid: subjectMissing && subjectTouched }"
                  :placeholder="t('import.form.subjectPlaceholder')"
                  @blur="subjectTouched = true"
                />
                <div v-if="subjectMissing && subjectTouched" class="field-error">{{ t('import.form.subjectError') }}</div>
                <div v-else class="hint" style="margin-top: 4px">{{ t('import.form.subjectHint') }}</div>
              </div>
              <div class="field">
                <label class="label">{{ t('common.grade') }}</label>
                <input v-model="form.grade" class="input" :placeholder="t('import.form.gradePlaceholder')" />
              </div>
            </div>
            <button class="btn btn-primary btn-lg" style="width: 100%; margin-top: 6px" :disabled="!canImport" @click="doImport">
              <Loader2 v-if="importing" :size="16" class="spin" />
              <Scissors v-else :size="16" />
              {{ importing ? t('import.form.importing') : t('import.form.submit') }}
            </button>
            <div class="hint" style="margin-top: 10px; text-align: center">{{ t('import.form.afterHint') }}</div>
          </div>
        </div>

        <div class="card card-pad">
          <div class="section-title">
            {{ t('import.list.title') }} <span class="count">{{ state.papers.length }}</span>
          </div>
          <div v-if="state.papers.length === 0" class="hint" style="padding: 24px 0; text-align: center">
            {{ t('import.list.emptyLine1') }}<br />{{ t('import.list.emptyLine2') }}
          </div>
          <div v-else class="paper-list">
            <div v-for="paper in state.papers" :key="paper.id" class="paper-row">
              <div class="paper-icon"><FileText :size="17" /></div>
              <div style="flex: 1; min-width: 0">
                <div class="paper-title" :title="paper.title">{{ paper.title }}</div>
                <div class="paper-meta">
                  {{
                    t('import.list.meta', {
                      subject: subjectLabel(subjectName(paper.subject)),
                      grade: gradeLabel(paper.grade),
                      year: paper.year,
                      pages: paper.page_count,
                      questions: questionCount(paper.id),
                      date: formatDate(paper.created_at)
                    })
                  }}
                </div>
              </div>
              <div class="paper-actions">
                <button class="btn btn-ghost btn-icon" :title="t('import.list.editTitle')" :aria-label="t('import.list.editTitle')" @click="openEdit(paper)">
                  <Pencil :size="14" />
                </button>
                <button class="btn btn-sm" @click="continueCut(paper.id)"><Scissors :size="13" /> {{ t('import.list.cut') }}</button>
                <button class="btn btn-ghost btn-icon" :title="t('import.list.deleteTitle')" :aria-label="t('import.list.deleteTitle')" @click="pendingDelete = paper.id">
                  <Trash2 :size="14" />
                </button>
              </div>
            </div>
          </div>
          <div class="hint" style="margin-top: 14px; border-top: 1px solid var(--border); padding-top: 12px">
            {{ t('import.list.deleteTip') }}
          </div>
        </div>
      </div>
    </div>

    <AppModal v-if="pendingDelete != null" :title="t('import.deleteModal.title')" @close="pendingDelete = null">
      <template #description>{{ t('import.deleteModal.description') }}</template>
      <div class="hint">
        {{ t('import.deleteModal.target') }}<strong>{{ state.papers.find((p) => p.id === pendingDelete)?.title }}</strong>
        {{ t('import.deleteModal.count', { n: pendingDelete ? questionCount(pendingDelete) : 0 }) }}
      </div>
      <template #actions>
        <button class="btn" @click="pendingDelete = null">{{ t('common.cancel') }}</button>
        <button class="btn btn-danger" @click="confirmDelete"><Trash2 :size="14" /> {{ t('import.deleteModal.confirm') }}</button>
      </template>
    </AppModal>

    <AppModal v-if="editingPaper" :title="t('import.editModal.title')" @close="editingPaper = null">
      <template #description>{{ t('import.editModal.description') }}</template>
      <div class="field">
        <label class="label">{{ t('import.form.title') }}<span class="req">*</span></label>
        <input v-model="editForm.title" class="input" :placeholder="t('import.editModal.titlePlaceholder')" />
      </div>
      <div class="row-3">
        <div class="field">
          <label class="label">{{ t('common.year') }}</label>
          <input v-model.number="editForm.year" type="number" class="input" min="1990" max="2100" />
        </div>
        <div class="field">
          <label class="label">{{ t('common.subject') }}<span class="req">*</span></label>
          <input
            v-model="editForm.subject"
            class="input"
            :class="{ invalid: editSubjectMissing && editSubjectTouched }"
            :placeholder="t('import.form.subjectPlaceholder')"
            @blur="editSubjectTouched = true"
          />
          <div v-if="editSubjectMissing && editSubjectTouched" class="field-error">{{ t('import.form.subjectError') }}</div>
        </div>
        <div class="field">
          <label class="label">{{ t('common.grade') }}</label>
          <input v-model="editForm.grade" class="input" :placeholder="t('import.form.gradePlaceholder')" />
        </div>
      </div>
      <template #actions>
        <button class="btn" @click="editingPaper = null">{{ t('common.cancel') }}</button>
        <button class="btn btn-primary" :disabled="savingEdit" @click="saveEdit">
          <Loader2 v-if="savingEdit" :size="14" class="spin" />
          {{ t('import.editModal.save') }}
        </button>
      </template>
    </AppModal>
  </div>
</template>

<style scoped>
.hero {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 18px;
  margin-bottom: 18px;
  padding: 4px 2px;
  flex-wrap: wrap;
}
.hero h1 {
  font-size: 23px;
  margin: 0 0 7px;
  letter-spacing: -0.3px;
}
.hero p {
  margin: 0;
  color: var(--text-2);
  font-size: 13.5px;
  line-height: 1.7;
  max-width: 620px;
}
.hero-badges {
  display: flex;
  gap: 6px;
}
.import-grid {
  display: grid;
  /* 允许两列都收缩到 0，避免长文件名把栅格撑宽、挤压另一列 */
  grid-template-columns: minmax(0, 1.15fr) minmax(0, 1fr);
  gap: 16px;
  align-items: start;
}
.import-grid > * {
  min-width: 0;
}
.dropzone {
  border: 1.5px dashed #c7cee0;
  border-radius: var(--radius-lg);
  background: #fff;
  padding: 34px 20px;
  text-align: center;
  cursor: pointer;
  transition: all 0.16s;
}
.dropzone:hover,
.dropzone.dragging {
  border-color: var(--accent);
  background: #f8f8ff;
}
.dropzone.filled {
  border-style: solid;
  border-color: #d6dbea;
}
.drop-icon {
  width: 52px;
  height: 52px;
  border-radius: 14px;
  background: #f1f3fa;
  color: #6b7280;
  display: grid;
  place-items: center;
  margin: 0 auto 12px;
  transition: all 0.2s;
}
.drop-title {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 6px;
  word-break: break-all;
}
/* 已选文件名保持单行省略，悬停可查看完整名称，避免撑高或撑宽卡片 */
.drop-title-file {
  max-width: 100%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  word-break: normal;
}
.spin {
  animation: spin 0.8s linear infinite;
}
.input.invalid {
  border-color: #f0a3a3;
  background: #fff8f8;
}
.field-error {
  margin-top: 4px;
  font-size: 11.5px;
  color: #dc2626;
}
.paper-list {
  display: flex;
  flex-direction: column;
  margin: 0 -18px;
  min-width: 0;
}
.paper-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 11px 18px;
  border-bottom: 1px solid #f0f2f7;
  min-width: 0;
}
.paper-row:last-child {
  border-bottom: 0;
}
.paper-row:hover {
  background: #fafbfe;
}
.paper-icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: #eef0ff;
  color: #4f46e5;
  display: grid;
  place-items: center;
  flex-shrink: 0;
}
.paper-title {
  font-size: 13px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.paper-meta {
  font-size: 11.5px;
  color: var(--text-3);
  margin-top: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.paper-actions {
  display: flex;
  align-items: center;
  gap: 2px;
  flex-shrink: 0;
  opacity: 0.75;
  transition: opacity 0.15s;
}
.paper-row:hover .paper-actions {
  opacity: 1;
}
@media (max-width: 900px) {
  .import-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
