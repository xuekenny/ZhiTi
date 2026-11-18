export default {
  windowTitle: '知题 · AI 智能题库',
  brand: '知题 · AI 智能题库',
  booting: '正在加载本地题库…',
  bootFailed: '数据库初始化失败',
  bootFailedToast: '本地数据库初始化失败：{error}',
  answerLost: '答案区域信息已丢失（页面刷新或数据重置），请回到「题目切割」重新框选',
  workspace: '工作台',
  nav: {
    import: '试卷导入',
    cut: '题目切割',
    bank: '题库管理',
    export: '题目导出',
    settings: '设置'
  },
  topbar: {
    importSub: '把纸质或电子试卷转化为可检索、可复用的数字题库',
    cutSub: '{subject} · {grade} · 共 {pages} 页 · 已切割 {cut} 题',
    cutEmpty: '请先导入一份 PDF 或 Word 试卷',
    bankSub: '共 {questions} 道题 · 来自 {papers} 份试卷 · 覆盖 {knowledge} 个知识点',
    exportSelected: '已选择 {n} 道题',
    exportEmpty: '勾选需要导出的题目，选择排版格式',
    settingsSub: '配置 AI 接口、界面语言与本地数据'
  },
  importNew: '导入新试卷',
  backToBank: '返回题库',
  switchLanguage: '切换语言'
}
