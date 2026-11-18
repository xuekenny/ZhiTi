import type { Question } from '../types'
import {
  addKnowledgePoint,
  batchLayout,
  beginBatchLayout,
  paperOf,
  resetBatchLayout,
  state,
  updateQuestion
} from '../store'
import { analyzeQuestion, recommendKnowledge } from './ai'
import { questionTag } from './label'
import { hasContentDoc, recognizeQuestionLayout } from './layout'
import { buildLayoutImage } from './layoutImage'
import { toast } from '../composables/toast'
import { t } from '../i18n'

export interface BatchRecognitionOptions {
  withKnowledge: boolean
  withAnalysis: boolean
}

function isActive(runId: number): boolean {
  return batchLayout.running && batchLayout.runId === runId
}

function labelOf(question: Question): string {
  const index = state.questions.filter((q) => q.paper_id === question.paper_id).findIndex((q) => q.id === question.id) + 1
  return questionTag(paperOf(question)?.subject, index)
}

/** 启动批量识别；已有任务在跑时返回 false，避免重复启动 */
export function startBatchRecognition(ids: number[], options: BatchRecognitionOptions): boolean {
  if (batchLayout.running) return false
  const targets = ids.filter((id) => state.questions.some((q) => q.id === id))
  if (!targets.length) return false
  const runId = beginBatchLayout(targets.length)
  void runBatch(targets, options, runId)
  return true
}

/** 请求停止：当前题目完成后退出循环 */
export function requestStopBatchRecognition(): void {
  if (batchLayout.running) batchLayout.stopping = true
}

async function runBatch(ids: number[], options: BatchRecognitionOptions, runId: number): Promise<void> {
  let processed = 0
  try {
    for (let i = 0; i < ids.length; i += 1) {
      if (!isActive(runId)) return
      if (batchLayout.stopping) break

      const question = state.questions.find((q) => q.id === ids[i])
      if (!question) {
        // 任务开始后被删除的题目直接跳过
        batchLayout.failed.push(t('cut.batch.deletedId', { id: ids[i] }))
        processed += 1
        batchLayout.done = processed
        continue
      }

      const label = labelOf(question)
      batchLayout.current = label
      try {
        const image = await buildLayoutImage(question)
        const result = await recognizeQuestionLayout(state.settings.ai, image)
        if (!isActive(runId)) return
        if (!state.questions.some((q) => q.id === question.id)) {
          batchLayout.failed.push(t('cut.batch.deletedLabel', { label }))
          processed += 1
          batchLayout.done = processed
          continue
        }

        const patch: Partial<Question> = { content: result.content, text: result.text }
        const paper = paperOf(question)
        const subject = paper?.subject ?? ''
        const grade = paper?.grade ?? ''

        if (options.withKnowledge) {
          batchLayout.current = t('cut.batch.knowledge', { label })
          try {
            const names = await recommendKnowledge(
              state.settings.ai,
              { text: result.text, subject, grade },
              state.knowledge.map((k) => k.name)
            )
            if (!isActive(runId)) return
            if (state.questions.some((q) => q.id === question.id)) {
              for (const name of names) await addKnowledgePoint(name, subject)
              patch.knowledge = Array.from(new Set([...question.knowledge, ...names]))
            }
          } catch {
            /* 知识点生成失败不影响题目文档结果 */
          }
        }

        if (options.withAnalysis) {
          batchLayout.current = t('cut.batch.analysis', { label })
          try {
            patch.analysis = await analyzeQuestion(state.settings.ai, {
              text: result.text,
              subject,
              grade,
              answer: question.answer
            })
            if (!isActive(runId)) return
          } catch {
            /* 题目理解生成失败不影响题目文档结果 */
          }
        }

        await updateQuestion(question.id, patch)
      } catch {
        batchLayout.failed.push(label)
      }
      processed += 1
      batchLayout.done = processed
    }

    if (!isActive(runId)) return
    const stopped = batchLayout.stopping
    const failed = batchLayout.failed.length
    const ok = processed - failed
    const remain = ids.filter((id) => {
      const question = state.questions.find((q) => q.id === id)
      return !!question && !hasContentDoc(question.content)
    }).length
    const head = stopped ? t('cut.batch.stoppedHead', { n: ok }) : t('cut.batch.doneHead', { n: ok })
    const tail = failed
      ? t('cut.batch.failedTail', {
          n: failed,
          list: batchLayout.failed.slice(0, 3).join(t('cut.listSep')),
          more: failed > 3 ? t('cut.batch.more') : ''
        })
      : ''
    const rest = stopped && remain ? t('cut.batch.remain', { n: remain }) : ''
    toast(`${head}${tail}${rest}`, failed ? 'warning' : 'success', 6200)
  } finally {
    if (batchLayout.runId === runId) resetBatchLayout()
  }
}
