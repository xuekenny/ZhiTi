import type { Widen } from '../../index'
import type zh from '../zh/export'

export default {
  format: {
    title: 'Format',
    pdf: 'PDF',
    docx: 'Word document',
    pptx: 'PowerPoint',
    zip: 'ZIP bundle',
    pdfDesc: 'Re-typeset from question documents, with crisp formulas and figures',
    docxDesc: 'Editable text with native Word equations',
    pptxDesc: 'One question per slide, typeset for projection',
    zipDesc: 'All original question images plus a list, for archiving'
  },
  toolbar: {
    selectedBefore: '',
    selectedAfter: 'selected',
    backToBank: 'Back to bank',
    addAll: 'Add entire bank',
    addFromBank: 'Add from bank'
  },
  library: {
    searchPlaceholder: 'Search question text or topics to add…',
    empty: 'Nothing to add, or every question in the bank is already selected.'
  },
  noText: '(No question text yet)',
  noTextGenerate: '(No question text yet — generate a question document in the bank)',
  noTextSuggest: '(No question text yet — generate a question document in the bank first)',
  difficultyN: 'Difficulty {n}',
  empty: {
    title: 'No questions selected',
    desc: 'Tick questions in the bank, or use "Add from bank" above. Selected questions are laid out in the order below.',
    goToBank: 'Pick from bank'
  },
  selected: {
    dragHint: 'Drag the handle on the left to reorder. Questions are numbered in this order.',
    total: '{n} total',
    moveUp: 'Move up',
    moveDown: 'Move down',
    remove: 'Remove'
  },
  layout: {
    title: 'Layout',
    paperTitle: 'Title',
    paperTitlePlaceholder: 'Title shown in the exported file',
    subtitle: 'Subtitle / notes',
    subtitlePlaceholder: 'e.g. Grade 9 Physics · Unit review',
    includeAnswers: 'Include answer key',
    answersInManifest: 'Answers go into the question list',
    answersBelow: 'Answers appear below each question',
    onePerPage: 'One question per page',
    addNumbers: 'Add question numbers',
    addNumbersHint: 'Turn on if questions aren’t numbered',
    pageSize: 'Paper',
    margin: 'Margin · {n} mm',
    imageWidth: 'Image width · {n}%',
    contentWidth: 'Content width · {n}%',
    fileName: 'File name',
    fileNamePlaceholder: 'Same as title by default'
  },
  action: {
    exporting: 'Exporting…',
    export: 'Export {n} question | Export {n} questions',
    missingContent:
      '{n} question has no question document yet. Generate it or skip it before exporting. | {n} questions have no question document yet. Generate or skip them before exporting.',
    tooMany: 'More than 100 questions — exporting and layout may take a while.',
    note: 'PDF / Word / PPT are re-typeset from each question document; ZIP exports the original question images. You’ll be asked where to save the file.'
  },
  progress: {
    preparing: 'Preparing layout…',
    layingOut: 'Typesetting question documents…',
    question: 'Typesetting question {current}/{total}…',
    chooseLocation: 'Choose where to save…',
    writing: 'Writing file…'
  },
  missingAnswers: {
    title: 'Some questions have no answer',
    desc: '"Include answer key" is on, but {n} question below has no answer, so it will be exported without one. Add it in the question document and save — this list refreshes when you come back. | "Include answer key" is on, but {n} questions below have no answer, so they will be exported without one. Add them in the question documents and save — this list refreshes when you come back.',
    viewImage: 'View question image',
    view: 'Open'
  },
  missingContent: {
    title: 'Some questions have no question document',
    desc: '{n} of the {total} selected questions has no AI-recognized question document yet. PDF / Word / PPT are typeset from question documents — generate it below, or skip it and export the rest. | {n} of the {total} selected questions have no AI-recognized question document yet. PDF / Word / PPT are typeset from question documents — generate them below, or skip them and export the rest.',
    pending: '{n} to generate',
    generateAll: 'Generate all',
    allDone: 'All question documents are ready. You can export now.',
    generate: 'AI generate',
    skipAndExport: 'Skip {n} & export',
    continueExport: 'Continue export'
  },
  toast: {
    addedAll: 'Added all {n} question | Added all {n} questions',
    noSelection: 'Select questions to export first',
    savedTo: 'Exported to: {path}',
    downloaded: 'Exported "{name}"',
    warningSeparator: '; ',
    moreWarnings: '{detail} … {n} notices in total',
    failed: 'Export failed: {message}',
    needAiKey: 'Set up the AI provider and API key in Settings first',
    contentGenerated: 'Question document generated: {formulas}, {figures}',
    formulaCount: '{n} formula | {n} formulas',
    figureCount: '{n} figure | {n} figures',
    generateFailed: 'Generation failed',
    contentFailed: 'Couldn’t generate question document: {message}',
    allContentDone: 'All question documents generated',
    nothingToExport: 'No questions with a question document to export',
    skipped: 'Skipped {n} question without a question document | Skipped {n} questions without a question document'
  },
  warning: {
    skipped: 'Question {n} failed to typeset and has no original image — skipped',
    fallback: 'Question {n} failed to typeset ({reason}) — used the original image instead',
    layoutFailed: 'layout failed',
    formula: 'Formula couldn’t be exported: {latex}',
    answerFormula: 'Answer formula couldn’t be exported: {latex}',
    noContent: 'Question {n} has nothing to export — skipped',
    mathAsImage:
      '{n} formula couldn’t be converted to a native Word equation and was inserted as an image | {n} formulas couldn’t be converted to native Word equations and were inserted as images',
    missingImages: '{n} figure is missing image data — skipped | {n} figures are missing image data — skipped'
  },
  render: {
    imageTimeout: 'Image load timed out',
    fontEmbedTimeout: 'Formula font load timed out',
    noContent: 'No question document content to typeset',
    prepareTimeout: 'Preparing question images timed out',
    editorFailed: 'Question document editor failed to start',
    fontTimeout: 'Font load timed out',
    renderTimeout: 'Question rendering timed out'
  }
} satisfies Widen<typeof zh>
