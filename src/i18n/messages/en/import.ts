import type { Widen } from '../../index'
import type zh from '../zh/import'

export default {
  hero: {
    title: 'Import an exam paper',
    intro:
      'Works with PDF and Word (.docx) papers. Each page is parsed into a sharp preview; then draw boxes to cut questions into your bank. The original file stays on this computer, so you can come back and keep cutting anytime.',
    smartCut: 'Smart cutting',
    localParse: 'Parsed locally',
    crossPage: 'Cross-page merge'
  },
  dropzone: {
    title: 'Drop a PDF / Word file here, or click to choose',
    hint: 'Multi-page PDF and .docx papers supported (a dozen-plus pages is fine), up to 120 MB · Files stay on this computer',
    parsing: 'Parsing pages…',
    parsed: '{size} · Pages: {pages} · Ready. Click to choose another file',
    failed: 'Could not parse. Click to choose again'
  },
  form: {
    sectionTitle: 'Paper details',
    defaultTitle: 'Untitled paper',
    title: 'Paper title',
    titlePlaceholder: 'e.g. 2024 Shanghai Grade 9 Physics Mock Exam 1',
    subjectPlaceholder: 'e.g. Math',
    gradePlaceholder: 'e.g. Grade 9',
    subjectError: 'Enter a subject. It is used to number questions, e.g. "Physics 1"',
    subjectHint: 'Required. Used as the question number prefix',
    importing: 'Importing…',
    submit: 'Import and start cutting',
    afterHint: 'You can return to "Cut Questions" anytime to keep working on this paper'
  },
  list: {
    title: 'Imported papers',
    emptyLine1: 'No papers imported yet.',
    emptyLine2: 'Your first PDF or Word paper will show up here.',
    meta: '{subject} · {grade} · {year} · {pages} pp · {questions} Qs · {date}',
    editTitle: 'Edit paper details',
    cut: 'Cut',
    deleteTitle: 'Delete paper',
    deleteTip: 'Note: deleting a paper also removes every question cut from it. This cannot be undone.'
  },
  deleteModal: {
    title: 'Delete this paper?',
    description: 'Its questions will be deleted too and cannot be recovered.',
    target: 'About to delete: ',
    count: '({n} question) | ({n} questions)',
    confirm: 'Delete'
  },
  editModal: {
    title: 'Edit paper details',
    description: 'Changes only affect the paper details in your bank. The original file is not modified.',
    titlePlaceholder: 'Paper title',
    save: 'Save changes'
  },
  toast: {
    unsupportedType: 'Only PDF or Word (.docx) exam files are supported',
    tooLarge: 'The file is larger than 120 MB. Please compress it and try again',
    parsedPdf: 'Parsed {n} PDF page. Please check the paper details | Parsed {n} PDF pages. Please check the paper details',
    parsedDocx: 'Parsed {n} Word page. Please check the paper details | Parsed {n} Word pages. Please check the paper details',
    encrypted: 'This PDF is encrypted. Encrypted documents cannot be imported yet',
    parseFailed: 'Could not parse the file. It may be damaged or in an unsupported format',
    subjectRequired: 'Please enter a subject. Questions are numbered as "subject + number"',
    imported: '"{title}" imported ({n} page). Start cutting questions | "{title}" imported ({n} pages). Start cutting questions',
    importFailed: 'Import failed: {error}',
    titleRequired: 'The paper title cannot be empty',
    updated: 'Paper details updated',
    saveFailed: 'Save failed: {error}',
    deleted: 'Paper and its questions deleted'
  },
  errors: {
    pdfMissing: 'The original PDF file is missing. Please import this paper again',
    sourceMissing: 'The original paper file is missing. Please import this paper again',
    docxEmpty: 'This Word file has no content to display'
  }
} satisfies Widen<typeof zh>
