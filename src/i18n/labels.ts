import { locale } from './index'

/**
 * 题库数据值（题型、年级、难度、学科）以中文存储，切换语言时只翻译显示，不改数据。
 * 未收录的值（如用户自填的学科）原样显示。
 */

const TYPE_EN: Record<string, string> = {
  单选题: 'Single choice',
  多选题: 'Multiple choice',
  填空题: 'Fill in the blank',
  判断题: 'True / False',
  解答题: 'Free response',
  计算题: 'Calculation',
  实验题: 'Experiment',
  阅读理解: 'Reading',
  作文题: 'Essay',
  其他: 'Other'
}

const GRADE_EN: Record<string, string> = {
  一年级: 'Grade 1',
  二年级: 'Grade 2',
  三年级: 'Grade 3',
  四年级: 'Grade 4',
  五年级: 'Grade 5',
  六年级: 'Grade 6',
  七年级: 'Grade 7',
  八年级: 'Grade 8',
  九年级: 'Grade 9',
  初一: 'Grade 7',
  初二: 'Grade 8',
  初三: 'Grade 9',
  高一: 'Grade 10',
  高二: 'Grade 11',
  高三: 'Grade 12'
}

const SUBJECT_EN: Record<string, string> = {
  语文: 'Chinese',
  数学: 'Math',
  英语: 'English',
  物理: 'Physics',
  化学: 'Chemistry',
  生物: 'Biology',
  历史: 'History',
  地理: 'Geography',
  政治: 'Politics',
  道德与法治: 'Ethics & Law',
  科学: 'Science',
  信息技术: 'IT',
  通用技术: 'Technology',
  音乐: 'Music',
  美术: 'Art',
  体育: 'PE',
  未设学科: 'No subject'
}

const DIFFICULTY_ZH: Record<number, string> = { 1: '很容易', 2: '较容易', 3: '中等', 4: '较难', 5: '很难' }
const DIFFICULTY_EN: Record<number, string> = { 1: 'Very easy', 2: 'Easy', 3: 'Medium', 4: 'Hard', 5: 'Very hard' }

function pick(map: Record<string, string>, value: string | null | undefined): string {
  const raw = value ?? ''
  if (locale.value !== 'en') return raw
  return map[raw.trim()] ?? raw
}

/** 题型显示名 */
export const typeLabel = (value: string | null | undefined) => pick(TYPE_EN, value)
/** 年级显示名 */
export const gradeLabel = (value: string | null | undefined) => pick(GRADE_EN, value)
/** 学科显示名（数据为空时请先经 subjectName() 回退为「未设学科」） */
export const subjectLabel = (value: string | null | undefined) => pick(SUBJECT_EN, value)
/** 难度显示名（1-5） */
export function difficultyLabel(level: number): string {
  return (locale.value === 'en' ? DIFFICULTY_EN : DIFFICULTY_ZH)[level] ?? String(level)
}
