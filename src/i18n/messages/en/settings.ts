import type { Widen } from '../../index'
import type zh from '../zh/settings'

export default {
  language: {
    title: 'Interface language',
    hint: 'Takes effect immediately. Question content, AI-generated text and exported files are not affected.'
  },
  ai: {
    title: 'AI provider',
    intro:
      'Used for answer generation, topic suggestions, question insights and structured recognition of question images. Uses the OpenAI-compatible format; your key is stored only on this computer.',
    provider: 'Provider',
    providers: {
      moerouter: 'MoeRouter (multi-model)',
      deepseek: 'DeepSeek',
      qwen: 'Qwen (Tongyi)',
      custom: 'Custom (OpenAI-compatible)'
    },
    moerouterHint:
      'One key for GPT, DeepSeek, Gemini and more, billed per use in CNY. Click "Fetch models" to load every model available to your account.',
    keyWhere: 'Create a key in the console at {url}.',
    baseUrl: 'Base URL',
    model: 'Model',
    fetchModels: 'Fetch models',
    fetchModelsTitle: 'Load the available models from the API with the current key',
    temperature: 'Temperature · {value}',
    visionModel: 'Vision model (for images)',
    visionSameAsChat: 'Same as the chat model above',
    visionHint:
      'Structured recognition needs a model that accepts images. If left empty the chat model above is used; you will be told if it cannot read images.',
    apiKey: 'API key',
    saveSettings: 'Save settings',
    testConnection: 'Test connection',
    saved: 'Settings saved locally',
    saveFailed: 'Save failed: {error}',
    needKey: 'Enter an API key first',
    connected: 'Connected: {reply}',
    connectFailed: 'Connection failed',
    noModels: 'The API returned no usable models',
    modelsFetched: 'Loaded {n} model. Pick it from the model list | Loaded {n} models. Pick one from the model list',
    modelsFetchFailed: 'Failed to fetch models'
  },
  modelPicker: {
    placeholder: 'Choose a model',
    manual: 'Other (type a name)…',
    manualPlaceholder: 'Model name, e.g. gpt-6.1-terra'
  },
  data: {
    title: 'Local data',
    papers: 'papers',
    questions: 'questions',
    knowledge: 'topics',
    localOnly: 'All data is stored in a local folder and never uploaded. To back up or move it, just copy that folder.',
    dirTitle: 'Data folder',
    dirHint: 'Your question bank, original exam files and settings live here',
    browserDb: 'Browser IndexedDB (dev mode)',
    openDir: 'Open folder',
    changeDir: 'Change',
    readDirFailed: 'Could not read the data folder: {error}',
    openDirFailed: 'Could not open the folder: {error}',
    clearTitle: 'Clear question bank',
    clearHint: 'Deletes all papers, questions and topics (use with care)',
    clear: 'Clear',
    cleared: 'Question bank cleared. AI settings were kept.'
  },
  changeDir: {
    title: 'Change the data folder?',
    description: 'The question bank in that folder will be loaded after switching.',
    newDir: 'New folder: ',
    explain:
      'If the new folder is empty, your current bank and settings are copied there. If it already holds ZhiTi data, the app switches to it and leaves the old folder untouched.',
    switching: 'Switching…',
    confirm: 'Switch',
    switched: 'Data folder switched to: {dir}',
    failed: 'Could not switch the data folder: {error}'
  },
  clearConfirm: {
    title: 'Clear the entire question bank?',
    description: 'This cannot be undone. Make sure you have backed up the questions and topics you need.',
    detail:
      'This deletes all papers ({papers}), questions ({questions}) and topics ({knowledge}), plus the cached original files. AI settings are kept.',
    confirm: 'Clear everything'
  },
  errors: {
    noApiKey: 'No API key yet. Fill in the AI provider under Settings first.',
    invalidKey: 'Invalid API key (401). Please check it.',
    rateLimited: 'Rate or quota limit reached (429). Try again later.',
    visionUnsupported:
      'This model may not accept images ({status}). Set a vision-capable model under Settings. {detail}',
    httpError: 'The AI API returned {status}: {detail}',
    emptyReply: 'The AI API returned no content',
    timeout: 'The AI API timed out ({seconds}s). Try again later.',
    unreachable:
      'Cannot reach the AI API: the network may be down or the browser blocked a cross-origin request. The desktop app is not affected.',
    modelsFailed: 'Failed to fetch models ({status})',
    modelsTimeout: 'Fetching models timed out. Try again later.'
  }
} satisfies Widen<typeof zh>
