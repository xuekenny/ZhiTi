import type { AiSettings } from '../types'
import { t } from '../i18n'
import { normalizeNumberedList } from './text'

export type ChatContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } }

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string | ChatContentPart[]
}

export interface ChatOptions {
  maxTokens?: number
  timeoutMs?: number
  temperature?: number
  model?: string
}

export interface ProviderPreset {
  label: string
  baseUrl: string
  model: string
  visionModel: string
  /** 下拉候选模型（仍可手动输入其他模型名） */
  models: string[]
  /** 获取 API 密钥的页面 */
  keyUrl?: string
}

export const PROVIDER_PRESETS: Record<Exclude<AiSettings['provider'], 'custom'>, ProviderPreset> = {
  moerouter: {
    label: 'MoeRouter',
    baseUrl: 'https://moerouter.com/v1',
    model: 'gpt-6.1-terra',
    visionModel: 'deepseek-v4.1-flash',
    // 仅列出支持 OpenAI Chat Completions 接口的模型；仅走 Anthropic 协议的模型在这里无法调用
    models: [
      'gpt-6.1-terra',
      'gpt-6.1-sol',
      'gpt-6.2-sol',
      'gpt-6.2-astra',
      'gpt-6-luna',
      'deepseek-v4.1-flash',
      'deepseek-v4-flash',
      'gemini-3.8-flash',
      'gemini-4-hydrogen',
      'gemini-4-argon'
    ],
    keyUrl: 'https://moerouter.com'
  },
  deepseek: {
    label: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com/v1',
    model: 'deepseek-chat',
    visionModel: '',
    models: ['deepseek-chat', 'deepseek-reasoner'],
    keyUrl: 'https://platform.deepseek.com'
  },
  qwen: {
    label: '通义千问',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    model: 'qwen-plus',
    visionModel: 'qwen-vl-max',
    models: ['qwen-plus', 'qwen-max', 'qwen-turbo', 'qwen-vl-max', 'qwen-vl-plus'],
    keyUrl: 'https://bailian.console.aliyun.com'
  }
}

/** 读取接口提供的模型列表（GET /models），只保留可走 Chat Completions 的文本/多模态模型 */
export async function listModels(config: Pick<AiSettings, 'baseUrl' | 'apiKey'>): Promise<string[]> {
  if (!config.apiKey) throw new Error(t('settings.ai.needKey'))
  const baseUrl = config.baseUrl.replace(/\/+$/, '')
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 15000)
  try {
    const response = await fetch(`${baseUrl}/models`, {
      headers: { Authorization: `Bearer ${config.apiKey}` },
      signal: controller.signal
    })
    if (response.status === 401) throw new Error(t('settings.errors.invalidKey'))
    if (!response.ok) throw new Error(t('settings.errors.modelsFailed', { status: response.status }))
    const data = await response.json()
    const items: any[] = Array.isArray(data?.data) ? data.data : []
    const ids = items
      .filter((item) => {
        const endpoints = item?.supported_endpoint_types
        // 接口若标注了支持的协议，只保留 OpenAI 兼容的模型
        if (Array.isArray(endpoints) && endpoints.length && !endpoints.includes('openai')) return false
        return !/image|embedding|tts|whisper|rerank|moderation|auto-review/i.test(String(item?.id ?? ''))
      })
      .map((item) => String(item.id))
      .filter(Boolean)
    return [...new Set(ids)].sort()
  } catch (error) {
    if ((error as Error).name === 'AbortError') throw new Error(t('settings.errors.modelsTimeout'))
    if ((error as Error).message.includes('Failed to fetch')) throw new Error(t('settings.errors.unreachable'))
    throw error
  } finally {
    clearTimeout(timer)
  }
}

/** 通用对话请求，content 支持纯文本或 OpenAI 多模态数组（文字 + 图片） */
export async function chat(config: AiSettings, messages: ChatMessage[], options: ChatOptions = {}): Promise<string> {
  if (!config.apiKey) throw new Error(t('settings.errors.noApiKey'))
  const baseUrl = config.baseUrl.replace(/\/+$/, '')
  const timeoutMs = options.timeoutMs ?? 45000
  const usesVision = messages.some(
    (message) => Array.isArray(message.content) && message.content.some((part) => part.type === 'image_url')
  )
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`
      },
      body: JSON.stringify({
        model: options.model || config.model,
        messages,
        temperature: options.temperature ?? config.temperature,
        max_tokens: options.maxTokens ?? 1024,
        stream: false
      }),
      signal: controller.signal
    })
    if (!response.ok) {
      const detail = await response.text().catch(() => '')
      if (response.status === 401) throw new Error(t('settings.errors.invalidKey'))
      if (response.status === 429) throw new Error(t('settings.errors.rateLimited'))
      if (usesVision && (response.status === 400 || response.status === 415 || response.status === 422)) {
        throw new Error(t('settings.errors.visionUnsupported', { status: response.status, detail: detail.slice(0, 120) }))
      }
      throw new Error(t('settings.errors.httpError', { status: response.status, detail: detail.slice(0, 160) }))
    }
    const data = await response.json()
    const raw = data?.choices?.[0]?.message?.content
    const content =
      typeof raw === 'string'
        ? raw
        : Array.isArray(raw)
          ? raw.map((part: any) => (typeof part === 'string' ? part : part?.text ?? '')).join('')
          : ''
    if (!content.trim()) throw new Error(t('settings.errors.emptyReply'))
    return content.trim()
  } catch (error) {
    if ((error as Error).name === 'AbortError') {
      throw new Error(t('settings.errors.timeout', { seconds: Math.round(timeoutMs / 1000) }))
    }
    if ((error as Error).message.includes('Failed to fetch')) throw new Error(t('settings.errors.unreachable'))
    throw error
  } finally {
    clearTimeout(timer)
  }
}

function stripFence(text: string): string {
  return text.replace(/```(?:json)?/gi, '').replace(/```/g, '').trim()
}

function questionPrompt(subject: string, grade: string, text: string, answerHint?: string): string {
  return [
    subject || grade ? `试卷信息：${[subject, grade].filter(Boolean).join(' / ')}` : '',
    '题目内容：',
    text.slice(0, 4000),
    answerHint ? `\n参考答案（如有）：${answerHint}` : ''
  ]
    .filter(Boolean)
    .join('\n')
}

/** AI 推荐知识点，返回知识点名称数组 */
export async function recommendKnowledge(
  config: AiSettings,
  question: { text: string; subject: string; grade: string },
  existingNames: string[]
): Promise<string[]> {
  const content = await chat(
    config,
    [
      {
        role: 'system',
        content:
          '你是一位中小学教研专家。请依据题目内容推荐 2-4 个最贴切的知识点。优先使用候选知识点列表中的名称；若确实没有合适的，可补充简洁的新知识点名称（不超过 10 个字）。只返回 JSON 数组，例如 ["牛顿第二定律","受力分析"]，不要任何解释。'
      },
      {
        role: 'user',
        content: [
          questionPrompt(question.subject, question.grade, question.text),
          existingNames.length ? `候选知识点：${existingNames.slice(0, 80).join('、')}` : ''
        ]
          .filter(Boolean)
          .join('\n')
      }
    ],
    { maxTokens: 600 }
  )
  const cleaned = stripFence(content)
  const match = cleaned.match(/\[[\s\S]*\]/)
  if (match) {
    try {
      const parsed = JSON.parse(match[0])
      if (Array.isArray(parsed)) {
        return parsed.map((x) => String(x).trim()).filter(Boolean).slice(0, 5)
      }
    } catch {
      /* fallthrough */
    }
  }
  return cleaned
    .split(/[，,、；;\n]/)
    .map((s) => s.replace(/["'[\]{}]/g, '').trim())
    .filter(Boolean)
    .slice(0, 4)
}

/** AI 题目理解：考察模型、应用场景、解题思路 */
export async function analyzeQuestion(config: AiSettings, question: { text: string; subject: string; grade: string; answer: string }): Promise<string> {
  const content = await chat(
    config,
    [
      {
        role: 'system',
        content: [
          '你是一位中小学教研专家。请用简洁中文分析这道题，分三点作答：',
          '（1）考查的核心知识点；',
          '（2）涉及的情境/物理模型或应用场景；',
          '（3）解题的关键思路。',
          '编号必须写成完整的全角括号「（1）（2）（3）」，左右括号都要有，不要写成 1）或 (1 这种缺一半括号的形式，也不要用其他编号样式。',
          '数学公式用 LaTeX：行内用 $...$ 包裹，不要写裸命令。',
          '总字数控制在 250 字以内，不要复述题目原文。'
        ].join('\n')
      },
      { role: 'user', content: questionPrompt(question.subject, question.grade, question.text, question.answer) }
    ],
    { maxTokens: 800 }
  )
  return normalizeNumberedList(stripFence(content))
}

/** 测试 AI 接口连通性 */
export async function testConnection(config: AiSettings): Promise<string> {
  return await chat(config, [{ role: 'user', content: '请回复“连接成功”四个字。' }], { maxTokens: 64 })
}
