/** 试卷导入页文案 */
export default {
  hero: {
    title: '导入一份试卷',
    intro:
      '支持 PDF 与 Word（.docx）试卷。系统会解析每一页并生成高清预览，接着用框选把题目切进题库。原始文件保存在本地，可随时继续切割。',
    smartCut: '智能切割',
    localParse: '本地解析',
    crossPage: '跨页合并'
  },
  dropzone: {
    title: '拖拽 PDF / Word 到此处，或点击选择文件',
    hint: '支持多页 PDF 与 .docx 试卷（十几页也可），最大 120 MB · 文件仅保存在本机',
    parsing: '正在解析页面…',
    parsed: '{size} · {pages} 页 · 解析完成，点击可更换文件',
    failed: '解析失败，点击重新选择'
  },
  form: {
    sectionTitle: '试卷基本信息',
    defaultTitle: '未命名试卷',
    title: '试卷标题',
    titlePlaceholder: '例如：2024 年上海市初三物理一模试卷',
    subjectPlaceholder: '例如：数学',
    gradePlaceholder: '例如：九年级',
    subjectError: '请填写学科，用于生成「物理1」这样的题目编号',
    subjectHint: '必填，将作为题目编号前缀',
    importing: '正在导入…',
    submit: '导入并开始切割',
    afterHint: '导入后可随时回到「题目切割」继续处理同一份试卷'
  },
  list: {
    title: '已导入试卷',
    emptyLine1: '还没有导入过试卷。',
    emptyLine2: '导入第一份 PDF 或 Word 后，它会出现在这里。',
    meta: '{subject} · {grade} · {year} 年 · {pages} 页 · {questions} 题 · {date}',
    editTitle: '编辑试卷信息',
    cut: '切割',
    deleteTitle: '删除试卷',
    deleteTip: '提示：删除试卷会同时移除由它切割出的全部题目，该操作不可撤销。'
  },
  deleteModal: {
    title: '删除这份试卷？',
    description: '关联的题目也会一并删除，无法恢复。',
    target: '即将删除：',
    count: '（{n} 道题目）',
    confirm: '确认删除'
  },
  editModal: {
    title: '编辑试卷信息',
    description: '修改仅影响题库中的试卷信息，不会改动原始试卷文件。',
    titlePlaceholder: '试卷标题',
    save: '保存修改'
  },
  toast: {
    unsupportedType: '仅支持 PDF 或 Word（.docx）格式的试卷文件',
    tooLarge: '文件超过 120 MB，请压缩后再导入',
    parsedPdf: '已解析 {n} 页 PDF，请确认试卷信息',
    parsedDocx: '已解析 {n} 页 Word，请确认试卷信息',
    encrypted: '该 PDF 已加密，暂不支持导入加密文档',
    parseFailed: '解析失败：文件可能已损坏或格式不支持',
    subjectRequired: '请填写学科，题目编号会以「学科 + 序号」展示',
    imported: '「{title}」导入成功，共 {n} 页，开始切割题目',
    importFailed: '导入失败：{error}',
    titleRequired: '试卷标题不能为空',
    updated: '试卷信息已更新',
    saveFailed: '保存失败：{error}',
    deleted: '已删除该试卷及关联题目'
  },
  errors: {
    pdfMissing: '找不到原始 PDF 文件，请重新导入该试卷',
    sourceMissing: '找不到原始试卷文件，请重新导入该试卷',
    docxEmpty: '这个 Word 文件没有可显示的内容'
  }
}
