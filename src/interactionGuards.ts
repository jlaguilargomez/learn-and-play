type GuardedDocument = Pick<Document, 'addEventListener' | 'removeEventListener' | 'getSelection'>

export function blockUnneededInteraction(event: Event) {
  event.preventDefault()
}

export function installInteractionGuards(documentTarget: GuardedDocument = document) {
  const clearSelection = () => {
    const selection = documentTarget.getSelection()

    if (selection && !selection.isCollapsed) {
      selection.removeAllRanges()
    }
  }

  documentTarget.addEventListener('contextmenu', blockUnneededInteraction)
  documentTarget.addEventListener('dragstart', blockUnneededInteraction)
  documentTarget.addEventListener('selectstart', blockUnneededInteraction)
  documentTarget.addEventListener('selectionchange', clearSelection)

  return () => {
    documentTarget.removeEventListener('contextmenu', blockUnneededInteraction)
    documentTarget.removeEventListener('dragstart', blockUnneededInteraction)
    documentTarget.removeEventListener('selectstart', blockUnneededInteraction)
    documentTarget.removeEventListener('selectionchange', clearSelection)
  }
}
