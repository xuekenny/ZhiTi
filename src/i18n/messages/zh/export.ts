/** 导出页面与导出过程中的界面文案（导出文件内的文字不在此处） */
export default {
  format: {
    title: '导出格式',
    pdf: 'PDF',
    docx: 'Word 文档',
    pptx: 'PPT 演示文稿',
    zip: '素材包 ZIP',
    pdfDesc: '按题目文档重新排版，公式与图形清晰',
    docxDesc: '文字可编辑，公式为 Word 原生公式',
    pptxDesc: '一题一页，按题目文档排版，适合投屏',
    zipDesc: '全部题目原图 + 清单，便于归档'
  },
  toolbar: {
    selectedBefore: '已选',
    selectedAfter: '道题',
    backToBank: '返回题库挑选',
    addAll: '全选题库',
    addFromBank: '从题库添加'
  },
  library: {
    searchPlaceholder: '搜索题干或知识点，快速添加题目…',
    empty: '没有可添加的题目，或题库已全部选中。'
  },
  noText: '（暂无题干文字）',
  noTextGenerate: '（暂无题干文字，可在题库中生成题目文档）',
  noTextSuggest: '（暂无题干文字，建议先在题库生成题目文档）',
  difficultyN: '难度 {n}',
  empty: {
    title: '还没有选择题目',
    desc: '到题库勾选题目，或使用上方「从题库添加」快速挑选。选中的题目会按下面的顺序排版。',
    goToBank: '去题库挑选'
  },
  selected: {
    dragHint: '拖动左侧手柄可调整题目顺序，导出时按此顺序编号。',
    total: '共 {n} 题',
    moveUp: '上移',
    moveDown: '下移',
    remove: '移出'
  },
  layout: {
    title: '排版设置',
    paperTitle: '试卷标题',
    paperTitlePlaceholder: '导出文件中的标题',
    subtitle: '副标题 / 说明',
    subtitlePlaceholder: '例如：初三物理 · 第一轮复习',
    includeAnswers: '包含参考答案',
    answersInManifest: '答案写入题目清单',
    answersBelow: '答案显示在每题下方',
    onePerPage: '每题独立一页',
    addNumbers: '新加题目编号',
    addNumbersHint: '题目无编号可勾选',
    pageSize: '纸张',
    margin: '页边距 · {n} mm',
    imageWidth: '题目图片宽度 · {n}%',
    contentWidth: '题目内容宽度 · {n}%',
    fileName: '文件名',
    fileNamePlaceholder: '默认与标题一致'
  },
  action: {
    exporting: '正在导出…',
    export: '导出 {n} 道题',
    missingContent: '{n} 道题尚未生成题目文档，导出前需生成或跳过。',
    tooMany: '题目超过 100 道，导出与排版可能需要较长时间。',
    note: '导出说明：PDF / Word / PPT 按「题目文档」的结构化内容重新排版，ZIP 仍导出题目原图。点击导出会弹出保存位置选择窗口。'
  },
  progress: {
    preparing: '正在生成排版…',
    layingOut: '正在排版题目文档…',
    question: '正在排版第 {current}/{total} 题…',
    chooseLocation: '请选择保存位置…',
    writing: '正在写入文件…'
  },
  missingAnswers: {
    title: '有题目还没有填写参考答案',
    desc: '已勾选「包含参考答案」，以下 {n} 道题没有答案，导出时会跳过它们的答案。请前往题目文档补充并保存，返回后列表会自动刷新。',
    viewImage: '查看题目图片',
    view: '去查看'
  },
  missingContent: {
    title: '有题目还没有生成题目文档',
    desc: '已勾选 {total} 道题，其中 {n} 道还没有 AI 识别的题目文档。PDF / Word / PPT 需要基于题目文档排版，可在下方直接生成，或跳过这些题继续导出。',
    pending: '共 {n} 道待生成',
    generateAll: '全部生成',
    allDone: '所有题目文档已生成，可以继续导出。',
    generate: 'AI 生成',
    skipAndExport: '跳过 {n} 道并导出',
    continueExport: '继续导出'
  },
  toast: {
    addedAll: '已添加全部 {n} 道题目',
    noSelection: '请先选择需要导出的题目',
    savedTo: '已导出到：{path}',
    downloaded: '已导出「{name}」',
    warningSeparator: '；',
    moreWarnings: '{detail} 等 {n} 条提示',
    failed: '导出失败：{message}',
    needAiKey: '请先在「设置」中填写 AI 接口与密钥',
    contentGenerated: '题目文档已生成：{formulas}、{figures}',
    formulaCount: '{n} 个公式',
    figureCount: '{n} 个图形',
    generateFailed: '生成失败',
    contentFailed: '题目文档生成失败：{message}',
    allContentDone: '全部题目文档已生成',
    nothingToExport: '没有已生成题目文档的题目可导出',
    skipped: '已跳过 {n} 道未生成题目文档的题'
  },
  warning: {
    skipped: '第 {n} 题排版失败且原图不可用，已跳过',
    fallback: '第 {n} 题排版失败（{reason}），已回退原图',
    layoutFailed: '排版失败',
    formula: '公式无法导出：{latex}',
    answerFormula: '答案公式无法导出：{latex}',
    noContent: '第 {n} 题没有可导出的内容，已跳过',
    mathAsImage: '{n} 个公式无法转为 Word 原生公式，已自动转为图片',
    missingImages: '{n} 张插图缺少图片数据，已跳过'
  },
  render: {
    imageTimeout: '图片加载超时',
    fontEmbedTimeout: '公式字体加载超时',
    noContent: '没有可排版的题目文档内容',
    prepareTimeout: '题目图片准备超时',
    editorFailed: '题目文档编辑器初始化失败',
    fontTimeout: '字体加载超时',
    renderTimeout: '题目渲染超时'
  }
}
