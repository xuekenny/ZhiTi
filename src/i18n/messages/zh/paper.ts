/** 题目纸张视图、题目编辑器（公式 / 图形节点）文案 */
export default {
  unsaved: '未保存',
  layoutOnly: '只看排版',
  compare: '对照原图',
  rerecognize: '重新识别',
  aiRecognize: 'AI识别',
  recognizing: '正在识别…',
  emptyDocTitle: '尚未生成题目文档',
  emptyDocDesc: '点击「AI识别」把原图转成可编辑的排版，也可以直接在下方手动录入。',
  teacherReference: '教师参考',
  clickToEdit: '点击可编辑',
  clickToZoom: '点击放大预览',
  answer: {
    title: '参考答案',
    imageSavedHidden: '答案原图已保存，当前右栏隐藏',
    imageInAside: '答案原图在右侧栏导入与识别',
    showAside: '显示右栏',
    placeholder: '尚未填写，可直接输入；粘贴截图会放到右侧「答案原图」',
    editNote: '手动编辑按纯文本保存；答案中的 {n} 张图会保留在下方作为附图，图片与文字的原始相对位置可能改变。',
    figuresCaption: '答案附图',
    sourceImage: '答案原图',
    replaceImage: '替换图片',
    importImage: '导入图片',
    recognize: 'AI 识别答案',
    recognizingStatus: '正在识别图片中的文字与公式…',
    image: '答案图片',
    preview: '预览',
    replace: '替换',
    remove: '移除',
    noImage: '还没有答案图片，可点「导入图片」，或在左侧答案区直接粘贴截图',
    replaceConfirmTitle: '用图片替换答案文字？',
    replaceConfirmDesc: '当前参考答案文字会被清空并替换为该图片，之后仍可点「AI 识别答案」转回文字。',
    pendingImageAlt: '待替换的答案图片',
    replaceWithImage: '替换为图片',
    imagePreviewTitle: '答案图片预览',
    figurePreviewTitle: '答案插图预览',
    toast: {
      notImage: '请选择图片文件',
      readFailed: '图片读取失败',
      readFailedRetry: '图片读取失败，请重试',
      placedCompare: '已放入答案原图（右侧「答案原图」区块），点「AI 识别答案」可转为文字',
      placedHidden: '已放入答案原图，点「显示右栏」查看，再点「AI 识别答案」可转为文字',
      replacedCompare: '已用图片替换答案文字，图片在右侧「答案原图」，可点「AI 识别答案」转回文字',
      replacedHidden: '已用图片替换答案文字，点「显示右栏」查看答案原图',
      needImage: '请先粘贴或导入答案图片，再点「AI 识别答案」'
    }
  },
  knowledge: {
    rerecommend: '重新推荐',
    recommend: '推荐知识点',
    empty: '尚未标注知识点',
    inputPlaceholder: '输入知识点，回车添加'
  },
  analysis: {
    reanalyze: '重新分析',
    analyze: 'AI 分析',
    placeholder: '尚未生成，可手动填写或点击 AI 分析'
  },
  source: {
    title: '原图裁剪',
    hint: '对照校对',
    none: '没有原图'
  },
  figure: {
    alt: '题目图形',
    missingTitle: '图形区域未定位',
    missingDesc: '可在「原图 / 文字」中查看，或重新识别',
    dragResize: '拖动调整宽度',
    unresolved: '待确认图形',
    label: '图形',
    alignLeft: '左对齐',
    alignCenter: '居中',
    alignRight: '右对齐',
    gapTitle: '图形上方间距',
    gapOption: '{n} 行间距',
    adjustCrop: '调整范围',
    cropTitle: '调整图形范围',
    cropDesc: '拖动裁剪框移动位置，拖四角调整大小，框选要显示的图形区域。',
    sourceAlt: '题目原图',
    applyCrop: '应用裁剪',
    cropUpdated: '图形范围已更新',
    cropFailed: '裁剪失败，请重试'
  },
  math: {
    ok: '确定',
    empty: '公式不能为空',
    invalid: 'LaTeX 语法有误，请修正后再确定',
    clickToEdit: '点击修改 LaTeX',
    maybeInvalid: 'LaTeX 语法可能有误'
  },
  image: {
    loadFailed: '图片加载失败'
  }
}
