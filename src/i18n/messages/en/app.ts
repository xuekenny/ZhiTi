import type { Widen } from '../../index'
import type zh from '../zh/app'

export default {
  windowTitle: 'ZhiTi · AI Question Bank',
  brand: 'ZhiTi · AI Question Bank',
  booting: 'Loading your local question bank…',
  bootFailed: 'Database initialization failed',
  bootFailedToast: 'Failed to initialize the local database: {error}',
  answerLost: 'The answer regions were lost (page refreshed or data reset). Go back to "Cut Questions" and select them again.',
  workspace: 'Workspace',
  nav: {
    import: 'Import Papers',
    cut: 'Cut Questions',
    bank: 'Question Bank',
    export: 'Export',
    settings: 'Settings'
  },
  topbar: {
    importSub: 'Turn paper or digital exams into a searchable, reusable question bank',
    cutSub: '{subject} · {grade} · Pages: {pages} · Cut: {cut}',
    cutEmpty: 'Import a PDF or Word exam first',
    bankSub: 'Questions: {questions} · Papers: {papers} · Topics: {knowledge}',
    exportSelected: '{n} question selected | {n} questions selected',
    exportEmpty: 'Tick the questions to export and choose a layout',
    settingsSub: 'AI provider, interface language and local data'
  },
  importNew: 'Import paper',
  backToBank: 'Back to bank',
  switchLanguage: 'Switch language'
} satisfies Widen<typeof zh>
