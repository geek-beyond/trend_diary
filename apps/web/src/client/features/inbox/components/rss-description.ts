import { type DefaultTreeAdapterTypes, parseFragment } from 'parse5'

const hiddenElements = new Set(['script', 'style', 'template', 'iframe', 'noscript'])
const blockElements = new Set(['blockquote', 'br', 'div', 'li', 'ol', 'p', 'pre', 'ul'])

function isVisibleElement(
  node: DefaultTreeAdapterTypes.ChildNode,
): node is DefaultTreeAdapterTypes.Element {
  return 'tagName' in node && !hiddenElements.has(node.tagName)
}

export function extractRssDescriptionText(description: string): string {
  const pending: (DefaultTreeAdapterTypes.ChildNode | '\n')[] =
    parseFragment(description).childNodes.toReversed()
  const text: string[] = []

  while (pending.length > 0) {
    const node = pending.pop()!
    if (node === '\n') {
      if (text.at(-1)?.endsWith('\n') === false) text.push('\n')
    } else if ('value' in node) {
      text.push(node.value)
    } else if (isVisibleElement(node)) {
      const isBlock = blockElements.has(node.tagName)
      if (isBlock) pending.push('\n')
      for (let index = node.childNodes.length - 1; index >= 0; index--) {
        pending.push(node.childNodes[index])
      }
      if (isBlock) pending.push('\n')
    }
  }

  return text.join('').trim()
}
