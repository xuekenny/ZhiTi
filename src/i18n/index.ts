import { ref } from 'vue'
import { isTauri } from '@tauri-apps/api/core'
import { getCurrentWindow } from '@tauri-apps/api/window'
import zh from './messages/zh'
import en from './messages/en'

/**
 * 轻量界面多语言：
 * - 中文（zh-CN）为源语言，英文文案的结构由类型检查保证与中文一致；
 * - `t()` 读取响应式的 `locale`，在模板 / computed 中调用即可随语言切换自动刷新；
 * - 只翻译界面文案；AI 提示词、题库数据值（题型、年级等存储值）与导出文件内容保持不变。
 */

export type Locale = 'zh-CN' | 'en'

export const LOCALES: { value: Locale; label: string }[] = [
  { value: 'zh-CN', label: '简体中文' },
  { value: 'en', label: 'English' }
]

const STORAGE_KEY = 'zhiti.locale'

/** 把嵌套文案对象的叶子值统一放宽为 string，供英文文案对照中文结构做类型检查 */
export type Widen<T> = { [K in keyof T]: T[K] extends string ? string : Widen<T[K]> }

type Leaves<T, P extends string = ''> = {
  [K in keyof T & string]: T[K] extends string ? `${P}${K}` : Leaves<T[K], `${P}${K}.`>
}[keyof T & string]

export type MessageKey = Leaves<typeof zh>
export type MessageParams = Record<string, string | number>

function detectLocale(): Locale {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'zh-CN' || saved === 'en') return saved
  } catch {
    /* localStorage 不可用时按系统语言 */
  }
  const lang = (typeof navigator !== 'undefined' && navigator.language) || 'zh-CN'
  return lang.toLowerCase().startsWith('zh') ? 'zh-CN' : 'en'
}

export const locale = ref<Locale>(detectLocale())

function applyDocumentLocale(value: Locale) {
  if (typeof document === 'undefined') return
  document.documentElement.lang = value
  document.title = t('app.windowTitle')
  // 桌面端窗口标题不跟随 document.title，需单独设置
  if (isTauri()) void getCurrentWindow().setTitle(document.title).catch(() => undefined)
}

export function setLocale(value: Locale): void {
  locale.value = value
  try {
    localStorage.setItem(STORAGE_KEY, value)
  } catch {
    /* 忽略：仅影响下次启动的默认语言 */
  }
  applyDocumentLocale(value)
}

export const isEnglish = () => locale.value === 'en'

function lookup(dict: unknown, key: string): string | undefined {
  let node: any = dict
  for (const part of key.split('.')) {
    if (node == null || typeof node !== 'object') return undefined
    node = node[part]
  }
  return typeof node === 'string' ? node : undefined
}

/**
 * 取当前语言的文案。
 * - 占位符写作 `{name}`，由 params 替换；
 * - 英文可写 `单数 | 复数`（两侧带空格），按 params.n 是否为 1 选择。
 */
export function t(key: MessageKey, params?: MessageParams): string {
  const dict = locale.value === 'en' ? en : zh
  let message = lookup(dict, key) ?? lookup(zh, key) ?? key
  if (params && typeof params.n === 'number' && message.includes(' | ')) {
    const [one, other] = message.split(' | ')
    message = params.n === 1 ? one : other
  }
  if (!params) return message
  return message.replace(/\{(\w+)\}/g, (match, name: string) => (params[name] !== undefined ? String(params[name]) : match))
}

applyDocumentLocale(locale.value)
