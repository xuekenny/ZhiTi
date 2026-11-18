import type { Widen } from '../../index'
import type zh from '../zh/paper'

export default {
  unsaved: 'Unsaved',
  layoutOnly: 'Layout only',
  compare: 'Compare',
  rerecognize: 'Re-recognize',
  aiRecognize: 'AI recognize',
  recognizing: 'Recognizing…',
  emptyDocTitle: 'No question document yet',
  emptyDocDesc: 'Click "AI recognize" to turn the original image into an editable layout, or type it in manually below.',
  teacherReference: 'Teacher reference',
  clickToEdit: 'Click to edit',
  clickToZoom: 'Click to enlarge',
  answer: {
    title: 'Answer key',
    imageSavedHidden: 'Answer image saved; the side panel is hidden',
    imageInAside: 'Import and recognize the answer image in the side panel',
    showAside: 'Show side panel',
    placeholder: 'Not filled in yet. Type here; pasted screenshots go to "Answer image" on the right',
    editNote:
      'Manual edits are saved as plain text. The {n} image in this answer is kept below as an attachment; its position relative to the text may change. | Manual edits are saved as plain text. The {n} images in this answer are kept below as attachments; their positions relative to the text may change.',
    figuresCaption: 'Answer images',
    sourceImage: 'Answer image',
    replaceImage: 'Replace image',
    importImage: 'Import image',
    recognize: 'AI recognize answer',
    recognizingStatus: 'Recognizing text and formulas in the image…',
    image: 'Answer image',
    preview: 'Preview',
    replace: 'Replace',
    remove: 'Remove',
    noImage: 'No answer image yet. Click "Import image", or paste a screenshot into the answer area on the left',
    replaceConfirmTitle: 'Replace the answer text with this image?',
    replaceConfirmDesc:
      'The current answer text will be cleared and replaced with this image. You can still click "AI recognize answer" later to turn it back into text.',
    pendingImageAlt: 'Answer image to use',
    replaceWithImage: 'Use image',
    imagePreviewTitle: 'Answer image preview',
    figurePreviewTitle: 'Answer figure preview',
    toast: {
      notImage: 'Please choose an image file',
      readFailed: 'Could not read the image',
      readFailedRetry: 'Could not read the image. Please try again',
      placedCompare: 'Added as the answer image (see "Answer image" on the right). Click "AI recognize answer" to convert it to text',
      placedHidden: 'Added as the answer image. Click "Show side panel" to view it, then "AI recognize answer" to convert it to text',
      replacedCompare:
        'Answer text replaced with the image (see "Answer image" on the right). Click "AI recognize answer" to turn it back into text',
      replacedHidden: 'Answer text replaced with the image. Click "Show side panel" to view it',
      needImage: 'Paste or import an answer image first, then click "AI recognize answer"'
    }
  },
  knowledge: {
    rerecommend: 'Suggest again',
    recommend: 'Suggest topics',
    empty: 'No topics tagged yet',
    inputPlaceholder: 'Type a topic and press Enter'
  },
  analysis: {
    reanalyze: 'Analyze again',
    analyze: 'AI analyze',
    placeholder: 'Not generated yet. Write it yourself or click "AI analyze"'
  },
  source: {
    title: 'Original crop',
    hint: 'For proofreading',
    none: 'No original image'
  },
  figure: {
    alt: 'Question figure',
    missingTitle: 'Figure area not located',
    missingDesc: 'Check it under "Image / Text", or recognize again',
    dragResize: 'Drag to resize',
    unresolved: 'Unconfirmed figure',
    label: 'Figure',
    alignLeft: 'Align left',
    alignCenter: 'Center',
    alignRight: 'Align right',
    gapTitle: 'Space above figure',
    gapOption: '{n} line gap | {n} lines gap',
    adjustCrop: 'Adjust crop',
    cropTitle: 'Adjust figure crop',
    cropDesc: 'Drag the box to move it and drag the corners to resize, so it frames the figure you want to show.',
    sourceAlt: 'Original question image',
    applyCrop: 'Apply crop',
    cropUpdated: 'Figure crop updated',
    cropFailed: 'Crop failed. Please try again'
  },
  math: {
    ok: 'OK',
    empty: 'The formula cannot be empty',
    invalid: 'Invalid LaTeX syntax. Fix it before confirming',
    clickToEdit: 'Click to edit LaTeX',
    maybeInvalid: 'The LaTeX syntax may be invalid'
  },
  image: {
    loadFailed: 'Could not load the image'
  }
} satisfies Widen<typeof zh>
