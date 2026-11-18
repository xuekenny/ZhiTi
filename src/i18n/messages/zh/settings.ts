export default {
  language: {
    title: '界面语言',
    hint: '切换后立即生效。题库中的题目内容、AI 生成内容与导出文件不受影响。'
  },
  ai: {
    title: 'AI 辅助接口',
    intro: '用于「答案生成」「知识点推荐」「题目理解」以及题目图片的结构化识别。接口采用 OpenAI 兼容格式，密钥只保存在本机数据库中。',
    provider: '服务商',
    providers: {
      moerouter: 'MoeRouter（多模型聚合）',
      deepseek: 'DeepSeek',
      qwen: '通义千问',
      custom: '自定义（OpenAI 兼容）'
    },
    moerouterHint: '一个密钥调用 GPT、DeepSeek、Gemini 等多家模型，按量人民币计费。点「获取模型列表」可读取你账户下可用的全部模型。',
    keyWhere: '密钥在 {url} 的控制台创建。',
    baseUrl: '接口地址 Base URL',
    model: '模型',
    fetchModels: '获取模型列表',
    fetchModelsTitle: '用当前密钥从接口读取可用模型',
    temperature: '温度 · {value}',
    visionModel: '视觉模型（识图用）',
    visionSameAsChat: '与上面的对话模型相同',
    visionHint: '结构化识别需要支持图片输入的模型。留空时沿用上面的对话模型，如果该模型不支持识图，识别时会给出提示。',
    apiKey: 'API 密钥',
    saveSettings: '保存设置',
    testConnection: '测试连接',
    saved: '设置已保存到本地',
    saveFailed: '保存失败：{error}',
    needKey: '请先填写 API 密钥',
    connected: '连接成功：{reply}',
    connectFailed: '连接失败',
    noModels: '接口没有返回可用模型',
    modelsFetched: '已获取 {n} 个模型，可在模型下拉中选择',
    modelsFetchFailed: '获取模型列表失败'
  },
  modelPicker: {
    placeholder: '请选择模型',
    manual: '其他（手动输入）…',
    manualPlaceholder: '输入模型名，例如 gpt-6.1-terra'
  },
  data: {
    title: '本地数据',
    papers: '份试卷',
    questions: '道题目',
    knowledge: '个知识点',
    localOnly: '所有数据保存在本地文件夹中，不上传云端。备份或迁移时直接复制该目录即可。',
    dirTitle: '数据存放目录',
    dirHint: '题库、原始试卷文件与设置都保存在这里',
    browserDb: '浏览器 IndexedDB（开发模式）',
    openDir: '打开目录',
    changeDir: '更改位置',
    readDirFailed: '读取数据目录失败：{error}',
    openDirFailed: '打开目录失败：{error}',
    clearTitle: '清空题库数据',
    clearHint: '删除全部试卷，题目和知识点（谨慎使用）',
    clear: '清空',
    cleared: '题库数据已清空，AI 设置已保留'
  },
  changeDir: {
    title: '更改数据存放位置？',
    description: '切换后会重新加载该目录中的题库数据。',
    newDir: '新目录：',
    explain: '若新目录为空，当前题库与设置会复制过去；若已有知题数据，则切换并加载该目录，原目录数据保留。',
    switching: '正在切换…',
    confirm: '确认切换',
    switched: '数据目录已切换到：{dir}',
    failed: '切换数据目录失败：{error}'
  },
  clearConfirm: {
    title: '清空全部题库数据？',
    description: '此操作不可撤销，请确认已备份需要的题目和知识点。',
    detail: '将删除 {papers} 份试卷、{questions} 道题目、{knowledge} 个知识点及原始试卷文件缓存，AI 设置会保留。',
    confirm: '确认清空'
  },
  errors: {
    noApiKey: '尚未配置 API 密钥，请先在「设置」中填写 AI 接口信息',
    invalidKey: 'API 密钥无效（401），请检查密钥是否正确',
    rateLimited: '调用频率或额度受限（429），请稍后再试',
    visionUnsupported: '当前模型可能不支持图片输入（{status}），请在「设置」中填写支持识图的视觉模型。{detail}',
    httpError: 'AI 接口返回 {status}：{detail}',
    emptyReply: 'AI 接口未返回内容',
    timeout: 'AI 接口响应超时（{seconds} 秒），请稍后重试',
    unreachable: '无法连接 AI 接口：可能是网络不可达或浏览器跨域限制。桌面版（Tauri）中调用不受此限制',
    modelsFailed: '获取模型列表失败（{status}）',
    modelsTimeout: '获取模型列表超时，请稍后重试'
  }
}
