import { t } from '../i18n'
import { subjectLabel } from '../i18n/labels'

/** 试卷学科缺失时的占位名，保证编号标签不会为空 */
export const UNKNOWN_SUBJECT = '未设学科'

/** 学科名：去掉首尾空格；为空时回退为「未设学科」 */
export function subjectName(subject: string | null | undefined): string {
  return (subject ?? '').trim() || UNKNOWN_SUBJECT
}

/** 题目编号（界面显示，随界面语言）：学科 + 该试卷内序号，如「物理3」/「Physics 3」 */
export function questionTag(subject: string | null | undefined, indexInPaper: number): string {
  return t('common.questionTag', { subject: subjectLabel(subjectName(subject)), n: indexInPaper })
}

/** 答案框编号（界面显示，随界面语言）：如「物理3答案」/「Physics 3 answer」 */
export function answerTag(subject: string | null | undefined, indexInPaper: number): string {
  return t('common.answerTag', { subject: subjectLabel(subjectName(subject)), n: indexInPaper })
}
