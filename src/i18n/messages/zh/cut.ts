/** 题目切割页（CutView）及切割/识别相关工具的界面文案 */
export default {
  listSep: '、',
  toolbar: {
    pageAlt: '试卷页面'
  },
  empty: {
    noPaperTitle: '还没有选择试卷',
    noPaperDesc: '先导入一份 PDF 或 Word 试卷，再回来进行框选切割。',
    goImport: '去导入试卷',
    openFailed: '无法打开试卷',
    loading: '正在加载试卷…'
  },
  canvas: {
    region: '区域 {n}',
    newBox: '新框选',
    answerBoxTitle: '{tag} · 点击设为当前答案框',
    removeAnswerBox: '移除该答案框'
  },
  statusbar:
    '按住拖动画框可连续圈选多个区域（可跨页），选好后点「创建题目」合成一题；框选单个答案区域后可点「添加答案」到题库中选择目标题目。已暂存的答案框会保留在画布上（虚线 · 学科+序号，如「物理1答案」），完成写入或手动取消才移除。放大后按住空格 + 左键拖动可平移画布。',
  panel: {
    title: '切割面板',
    paperMeta: '{subject} · {grade} · {year} 年',
    noPaper: '未选择试卷',
    questionCount: '{n} 题'
  },
  pending: {
    selected: '已框选 {n} 个区域（可跨页合并）',
    none: '尚未框选区域',
    regionRow: '区域 {i} · 第 {page} 页 · 宽 {w}% · 高 {h}%',
    removeRegion: '移除该区域',
    createQuestion: '创建题目',
    createQuestionMulti: '创建题目（{n} 个区域）',
    addAnswer: '添加答案',
    hintMulti: '「添加答案」仅支持一框一题，请只保留 1 个区域；多区域请用「创建题目」。',
    hintSingle: '「添加答案」会暂存该区域并跳转题库，在题库中点击目标题目即可识别写入答案。',
    hintHasAnswers: '「清空」只清当前框选；已暂存的答案框会保留在画布上，点「添加答案」可带当前答案框回题库更换目标题目。',
    hintEmpty: '先框选区域：「创建题目」新建一题，「添加答案」暂存单个答案区域后到题库中选择目标题目。'
  },
  answers: {
    title: '待处理答案（{n}）',
    clickToSelect: '点选设为当前答案框',
    meta: '第 {page} 页 · 宽 {w}%',
    footer: '答案框在题库完成识别写入或点「取消」后才会移除；移除/完成后其余编号自动重排。'
  },
  list: {
    title: '已切割题目',
    hint: '点击定位到该题区域',
    emptyLine1: '当前试卷还没有题目。',
    emptyLine2: '用框选开始切割吧。',
    meta: '第 {pages} 页 · {n} 个区域 · {text}',
    noText: '无文本',
    deleteQuestion: '删除题目'
  },
  tip: {
    title: '跨页 / 多图题目',
    step1: '1. 框选可连续多次，跨页时翻页继续框选；',
    step2: '2. 选好后点「创建题目」，所有区域按页码顺序纵向拼接成一题；',
    step3:
      '3. 只框选答案区域时，点「添加答案」会暂存该区域并跳转题库，在题库中点选目标题目即可识别写入答案；答案框以虚线「物理1答案」的形式保留在画布上，写入完成或取消后才移除。'
  },
  toast: {
    renderFailed: '页面预览渲染失败',
    loadFailed: '试卷载入失败',
    boxTooSmall: '框选区域过小，请重新框选',
    docNotReady: '文档未就绪',
    createdNoText: '已生成题目。该页可能是扫描件，文本层为空，可在题库中生成题目文档',
    createdMulti: '已生成「{label}」，含 {n} 个区域',
    created: '已生成「{label}」',
    createFailed: '生成题目失败：{error}',
    answerRemoved: '已移除「{tag}」',
    selectPaperFirst: '请先选择一份试卷',
    answerOneBox: '「添加答案」一次只处理一个答案区域，请只保留 1 个框选；多区域请用「创建题目」',
    answerAlreadyPending: '该区域已是待处理答案，已设为当前答案框',
    answerStashed: '已暂存答案区域，请在题库中选择目标题目',
    drawAnswerFirst: '请先在试卷上框选答案区域',
    pickAnswerTarget: '请选择要填入答案的题目',
    questionDeleted: '已删除该题目'
  },
  batch: {
    deletedId: '题目 #{id}（已删除）',
    deletedLabel: '{label}（已删除）',
    knowledge: '{label} · 生成知识点',
    analysis: '{label} · 生成题目理解',
    stoppedHead: '已停止一键识别：成功 {n} 道',
    doneHead: '一键识别完成：成功 {n} 道',
    failedTail: '，失败 {n} 道（{list}{more}）',
    more: ' 等',
    remain: '，还有 {n} 道未识别'
  },
  layout: {
    noQuestionContent: '模型未返回可用的题目内容',
    noAnswerContent: '模型未返回可用的答案内容',
    answerEmpty: '未识别到答案内容，请换一张更清晰的图片重试',
    invalidJson: '识别结果不是有效 JSON，请重试或更换视觉模型',
    emptyResult: '识别结果为空',
    figureNoBbox: '有 1 张插图未给出有效位置，已跳过',
    suspiciousLatex: '公式语法可疑：{latex}',
    figureUnresolved: '图形区域未定位，已保留占位'
  }
}
