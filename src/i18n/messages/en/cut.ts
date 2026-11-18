import type { Widen } from '../../index'
import type zh from '../zh/cut'

export default {
  listSep: ', ',
  toolbar: {
    pageAlt: 'Paper page'
  },
  empty: {
    noPaperTitle: 'No paper selected',
    noPaperDesc: 'Import a PDF or Word paper first, then come back to cut questions.',
    goImport: 'Import a paper',
    openFailed: 'Could not open the paper',
    loading: 'Loading paper…'
  },
  canvas: {
    region: 'Region {n}',
    newBox: 'New box',
    answerBoxTitle: '{tag} · Click to make this the current answer box',
    removeAnswerBox: 'Remove this answer box'
  },
  statusbar:
    'Drag to draw boxes; you can select several regions in a row, even across pages. When done, click "Create question" to combine them into one question. After boxing a single answer region, click "Add answer" and pick the target question in the bank. Stashed answer boxes stay on the canvas (dashed, labeled subject + number, e.g. "Physics 1 answer") until the answer is saved or you cancel. When zoomed in, hold Space and drag to pan.',
  panel: {
    title: 'Cut panel',
    paperMeta: '{subject} · {grade} · {year}',
    noPaper: 'No paper selected',
    questionCount: '{n} question | {n} questions'
  },
  pending: {
    selected: '{n} region selected (can span pages) | {n} regions selected (can span pages)',
    none: 'No regions selected yet',
    regionRow: 'Region {i} · Page {page} · W {w}% · H {h}%',
    removeRegion: 'Remove this region',
    createQuestion: 'Create question',
    createQuestionMulti: 'Create question ({n} regions)',
    addAnswer: 'Add answer',
    hintMulti: '"Add answer" works with one box at a time. Keep just 1 region, or use "Create question" for multiple regions.',
    hintSingle: '"Add answer" stashes this region and opens the question bank. Click the target question there to recognize and save the answer.',
    hintHasAnswers:
      '"Clear" only removes the current selection. Stashed answer boxes stay on the canvas; click "Add answer" to take the current one back to the bank and choose a different question.',
    hintEmpty:
      'Draw a box first. "Create question" makes a new question; "Add answer" stashes a single answer region so you can pick its question in the bank.'
  },
  answers: {
    title: 'Pending answers ({n})',
    clickToSelect: 'Click to make current',
    meta: 'Page {page} · W {w}%',
    footer:
      'An answer box is removed once its answer is saved in the bank or you click "Cancel". The remaining boxes are renumbered automatically.'
  },
  list: {
    title: 'Cut questions',
    hint: 'Click to jump to its region',
    emptyLine1: 'This paper has no questions yet.',
    emptyLine2: 'Draw a box to start cutting.',
    meta: 'Page {pages} · {n} region · {text} | Pages {pages} · {n} regions · {text}',
    noText: 'No text',
    deleteQuestion: 'Delete question'
  },
  tip: {
    title: 'Multi-page / multi-image questions',
    step1: '1. You can draw as many boxes as you need; turn the page to keep selecting across pages.',
    step2: '2. Click "Create question" and all regions are stacked vertically in page order into one question.',
    step3:
      '3. To box only an answer, click "Add answer": the region is stashed and the question bank opens, where you click the target question to recognize and save the answer. The answer box stays on the canvas as a dashed "Physics 1 answer" label until it is saved or canceled.'
  },
  toast: {
    renderFailed: 'Could not render the page preview',
    loadFailed: 'Could not load the paper',
    boxTooSmall: 'That box is too small. Please draw it again.',
    docNotReady: 'Document is not ready',
    createdNoText:
      'Question created. This page may be a scan with no text layer; you can generate the question document in the question bank.',
    createdMulti: 'Created "{label}" from {n} regions',
    created: 'Created "{label}"',
    createFailed: 'Could not create the question: {error}',
    answerRemoved: 'Removed "{tag}"',
    selectPaperFirst: 'Please select a paper first',
    answerOneBox:
      '"Add answer" handles one answer region at a time. Keep just 1 box, or use "Create question" for multiple regions.',
    answerAlreadyPending: 'This region is already a pending answer; it is now the current answer box',
    answerStashed: 'Answer region stashed. Choose the target question in the bank.',
    drawAnswerFirst: 'Draw a box around the answer on the paper first',
    pickAnswerTarget: 'Choose the question to fill this answer into',
    questionDeleted: 'Question deleted'
  },
  batch: {
    deletedId: 'Question #{id} (deleted)',
    deletedLabel: '{label} (deleted)',
    knowledge: '{label} · Suggesting topics',
    analysis: '{label} · Generating insights',
    stoppedHead: 'Batch recognition stopped: {n} succeeded',
    doneHead: 'Batch recognition finished: {n} succeeded',
    failedTail: ', {n} failed ({list}{more})',
    more: ', …',
    remain: ', {n} still unrecognized'
  },
  layout: {
    noQuestionContent: 'The model returned no usable question content',
    noAnswerContent: 'The model returned no usable answer content',
    answerEmpty: 'No answer content recognized. Try again with a clearer image.',
    invalidJson: 'The recognition result is not valid JSON. Retry or switch to another vision model.',
    emptyResult: 'The recognition result is empty',
    figureNoBbox: 'Skipped 1 figure with no valid position',
    suspiciousLatex: 'Possible formula syntax error: {latex}',
    figureUnresolved: 'A figure could not be located; a placeholder was kept'
  }
} satisfies Widen<typeof zh>
