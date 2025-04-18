/**
 * @file /src/utils/buildPageView.ts
 * @name BuildPageView
 * @description Utility functions for building the page view.
 */

import type { Node as PMNode, ResolvedPos } from "@tiptap/pm/model"
import type { Transaction } from "@tiptap/pm/state"
import type { EditorView } from "@tiptap/pm/view"
import type { PaginationOptions } from "../PaginationExtension"
import { MIN_PARAGRAPH_HEIGHT } from "../constants/pagination"
import type { NodePosArray } from "../types/node"
import type { CursorMap } from "../types/cursor"
import type { Nullable, Undefinable } from "../types/record"
import type { MarginConfig } from "../types/page"
import {
  moveToNearestValidCursorPosition,
  moveToThisTextBlock,
  setSelection,
  setSelectionAtEndOfDocument,
} from "./selection"
import { inRange } from "./math"
import { getPaginationNodeAttributes } from "./nodes/page/attributes/getPageAttributes"
import { isParagraphNode } from "./nodes/paragraph"
import { isTextNode } from "./nodes/text"
import { getPaginationNodeTypes } from "./pagination"
import { isPageNumInRange } from "./nodes/page/pageRange"
import type { HeaderFooter, HeaderFooterNodeAttributes } from "../types/pageRegions"
import { getPageRegionNode } from "./pageRegion/getAttributes"
import { getMaybeNodeSize } from "./nodes/node"
import { isPageNode } from "./nodes/page/page"
import { isHeaderFooterNode } from "./nodes/headerFooter/headerFooter"
import { isBodyNode } from "./nodes/body/body"
import type { Editor } from "@tiptap/core"
import { TextSelection } from "@tiptap/pm/state"
import { shouldBreakParagraph } from "./nodes/paragraph"

// Konstanten für die Paginierung anpassen
const CURSOR_MAPPING_ATTEMPTS = 3 // Anzahl der Versuche für die Cursor-Zuordnung

// Vollständig überarbeitete buildPageView-Funktion
export const buildPageView = ({
  editor,
  view,
  options,
  isPasteOperation = false,
}: {
  editor: Editor
  view: EditorView
  options: PaginationOptions
  isPasteOperation?: boolean
}): void => {
  const { state } = view
  const { doc } = state

  try {
    // Speichern der aktuellen Cursor-Position und Selektion
    const { selection } = state
    const oldCursorPos = selection.from
    const oldCursorAnchor = selection.anchor
    const oldCursorHead = selection.head

    // Sammeln und Messen der Inhaltsknoten
    const contentNodes = collectContentNodes(doc)
    const nodeHeights = measureNodeHeights(view, contentNodes)

    // Erstellen des neuen Dokuments mit proaktiver Paginierung
    const { newDoc, oldToNewPosMap } = buildNewDocument(editor, options, contentNodes, nodeHeights, isPasteOperation)

    // Vergleichen der Dokumente und Anwenden der Änderungen, wenn nötig
    if (!newDoc.content.eq(doc.content)) {
      // Erstellen einer neuen Transaktion basierend auf dem aktuellen Zustand
      // Dies ist wichtig, um sicherzustellen, dass die Transaktion mit dem aktuellen Zustand übereinstimmt
      const tr = view.state.tr

      // Ersetzen des Dokuments
      tr.replaceWith(0, doc.content.size, newDoc.content)
      tr.setMeta("pagination", true)

      const newDocContentSize = newDoc.content.size

      // Verbesserte Cursor-Zuordnung mit mehreren Versuchen
      let newCursorPos = null
      for (let attempt = 0; attempt < CURSOR_MAPPING_ATTEMPTS; attempt++) {
        newCursorPos = mapCursorPosition(contentNodes, oldCursorPos, oldToNewPosMap, newDocContentSize)
        if (newCursorPos !== null) break

        // Wenn die direkte Zuordnung fehlschlägt, versuchen wir es mit benachbarten Positionen
        if (attempt === 0) {
          newCursorPos = mapCursorPosition(contentNodes, oldCursorPos - 1, oldToNewPosMap, newDocContentSize)
        } else if (attempt === 1) {
          newCursorPos = mapCursorPosition(contentNodes, oldCursorPos + 1, oldToNewPosMap, newDocContentSize)
        }
      }

      // Sicherstellen, dass die Cursor-Position gültig ist
      if (newCursorPos !== null) {
        // Begrenzen Sie die Position auf den gültigen Bereich
        newCursorPos = Math.max(0, Math.min(newCursorPos, newDocContentSize - 1))

        try {
          // Anwenden der Cursor-Position
          enhancedCursorPositioning(tr, newCursorPos, oldCursorAnchor, oldCursorHead)
        } catch (error) {
          console.warn("Error setting cursor position, using fallback", error)
          // Fallback: Setzen Sie den Cursor an eine sichere Position
          try {
            const safePos = Math.min(newCursorPos, tr.doc.content.size - 1)
            tr.setSelection(TextSelection.create(tr.doc, safePos))
          } catch (e) {
            console.warn("Fallback cursor positioning failed", e)
          }
        }
      }

      // Dispatch der Transaktion mit try-catch
      try {
        view.dispatch(tr)
      } catch (dispatchError) {
        console.error("Error dispatching pagination transaction:", dispatchError)
        // Wenn die Transaktion fehlschlägt, versuchen wir eine einfachere Transaktion
        try {
          // Erstellen einer neuen, einfachen Transaktion
          const simpleTransaction = view.state.tr
          simpleTransaction.setMeta("pagination", true)
          view.dispatch(simpleTransaction)
        } catch (fallbackError) {
          console.error("Fallback transaction also failed:", fallbackError)
        }
      }
    }
  } catch (error) {
    console.error("Error updating page view. Details:", error)
  }
}

/**
 * Collect content nodes and their existing positions.
 *
 * @param doc - The document node.
 * @returns {NodePosArray} The content nodes and their positions.
 */
const collectContentNodes = (doc: PMNode): NodePosArray => {
  const contentNodes: NodePosArray = []
  doc.forEach((pageNode, pageOffset) => {
    if (isPageNode(pageNode)) {
      pageNode.forEach((pageRegionNode, pageRegionOffset) => {
        // Offsets in forEach loop start from 0, however, the child nodes of any given node
        // have a starting offset of 1 (for the first child)
        const truePageRegionOffset = pageRegionOffset + 1

        if (isHeaderFooterNode(pageRegionNode)) {
          // Don't collect header/footer nodes
        } else if (isBodyNode(pageRegionNode)) {
          pageRegionNode.forEach((child, childOffset) => {
            // First child of body node (e.g. paragraph) has an offset of 1 more
            // than the body node itself.
            const trueChildOffset = childOffset + 1

            contentNodes.push({ node: child, pos: pageOffset + truePageRegionOffset + trueChildOffset })
          })
        } else {
          contentNodes.push({ node: pageRegionNode, pos: pageOffset + truePageRegionOffset })
        }
      })
    } else {
      contentNodes.push({ node: pageNode, pos: pageOffset + 1 })
    }
  })

  return contentNodes
}

/**
 * Calculates the margins of the element.
 *
 * @param element - The element to calculate margins for.
 * @returns {MarginConfig} The margins of the element.
 */
const calculateElementMargins = (element: HTMLElement): MarginConfig => {
  const style = window.getComputedStyle(element)
  return {
    top: Number.parseFloat(style.marginTop),
    right: Number.parseFloat(style.marginRight),
    bottom: Number.parseFloat(style.marginBottom),
    left: Number.parseFloat(style.marginLeft),
  }
}

/**
 * Measure the heights of the content nodes.
 *
 * @param view - The editor view.
 * @param contentNodes - The content nodes and their positions.
 * @returns {number[]} The heights of the content nodes.
 */
const measureNodeHeights = (view: EditorView, contentNodes: NodePosArray): number[] => {
  const paragraphType = view.state.schema.nodes.paragraph

  const nodeHeights = contentNodes.map(({ pos, node }) => {
    const domNode = view.nodeDOM(pos)
    if (domNode instanceof HTMLElement) {
      let { height } = domNode.getBoundingClientRect()

      const { top: marginTop } = calculateElementMargins(domNode)

      if (height === 0) {
        if (node.type === paragraphType || node.isTextblock) {
          // Assign a minimum height to empty paragraphs or textblocks
          height = MIN_PARAGRAPH_HEIGHT
        }
      }

      // Fügen Sie einen kleinen Puffer hinzu, um sicherzustellen, dass wir genug Platz haben
      return (height + marginTop) * 1.02 // Reduzierter Puffer für bessere Platznutzung
    }

    return MIN_PARAGRAPH_HEIGHT // Default to minimum height if DOM element is not found
  })

  return nodeHeights
}

/**
 * Build the new document and keep track of new positions.
 *
 * @param editor - The editor instance.
 * @param options - The pagination options.
 * @param contentNodes - The content nodes and their positions.
 * @param nodeHeights - The heights of the content nodes.
 * @param isPasteOperation - Whether this is a paste operation.
 * @returns {newDoc: PMNode, oldToNewPosMap: CursorMap} The new document and the mapping from old positions to new positions.
 */
const buildNewDocument = (
  editor: Editor,
  options: PaginationOptions,
  contentNodes: NodePosArray,
  nodeHeights: number[],
  isPasteOperation = false,
): { newDoc: PMNode; oldToNewPosMap: CursorMap } => {
  const { schema, doc } = editor.state
  const { pageAmendmentOptions } = options
  const {
    pageNodeType: pageType,
    headerFooterNodeType: headerFooterType,
    bodyNodeType: bodyType,
    paragraphNodeType: paragraphType,
  } = getPaginationNodeTypes(schema)

  let pageNum = 0
  const pages: PMNode[] = []
  let existingPageNode: Nullable<PMNode> = doc.maybeChild(pageNum)
  let { pageNodeAttributes, pageRegionNodeAttributes, bodyPixelDimensions } = getPaginationNodeAttributes(
    editor,
    pageNum,
  )

  const constructHeaderFooter =
    <HF extends HeaderFooter>(pageRegionType: HeaderFooter) =>
    (headerFooterAttrs: HeaderFooterNodeAttributes<HF>): PMNode | undefined => {
      if (!headerFooterType) return

      if (existingPageNode) {
        const hfNode = getPageRegionNode(existingPageNode, pageRegionType)
        if (hfNode) {
          return hfNode
        }
      }

      const emptyParagraph = paragraphType.create()
      return headerFooterType.create(headerFooterAttrs, [emptyParagraph])
    }

  const constructHeader = <HF extends HeaderFooter>(headerFooterAttrs: HeaderFooterNodeAttributes<HF>) => {
    if (!pageAmendmentOptions.enableHeader) return
    return constructHeaderFooter("header")(headerFooterAttrs)
  }
  const constructFooter = <HF extends HeaderFooter>(headerFooterAttrs: HeaderFooterNodeAttributes<HF>) => {
    if (!pageAmendmentOptions.enableFooter) return
    return constructHeaderFooter("footer")(headerFooterAttrs)
  }

  const constructPageRegions = (currentPageContent: PMNode[]): PMNode[] => {
    const { body: bodyAttrs, footer: footerAttrs } = pageRegionNodeAttributes
    const pageBody = bodyType.create(bodyAttrs, currentPageContent)
    const pageFooter = constructFooter(footerAttrs)

    const pageRegions: Undefinable<PMNode>[] = [currentPageHeader, pageBody, pageFooter]
    return pageRegions.filter((region) => !!region)
  }

  const addPage = (currentPageContent: PMNode[]): PMNode => {
    const pageNodeContents = constructPageRegions(currentPageContent)
    const pageNode = pageType.create(pageNodeAttributes, pageNodeContents)
    pages.push(pageNode)
    return pageNode
  }

  // Header is constructed prior to the body because we need to know its node size for the cursor mapping
  let currentPageHeader: PMNode | undefined = constructHeader(pageRegionNodeAttributes.header)
  let currentPageContent: PMNode[] = []
  let currentHeight = 0

  const oldToNewPosMap: CursorMap = new Map<number, number>()
  const pageOffset = 1,
    bodyOffset = 1
  let cumulativeNewDocPos = pageOffset + getMaybeNodeSize(currentPageHeader) + bodyOffset

  // Verbesserte Paginierungslogik mit Vorausschau
  for (let i = 0; i < contentNodes.length; i++) {
    const { node, pos: oldPos } = contentNodes[i]
    const nodeHeight = nodeHeights[i]

    // Verbesserte Paginierungslogik mit besserer Textumbruchbehandlung
    const isPageFull = currentHeight + nodeHeight > bodyPixelDimensions.bodyHeight
    let shouldBreakHere = false

    // Zusätzliche Prüfung für Absätze - nur wenn die Seite wirklich voll ist
    if (isPageFull && isParagraphNode(node)) {
      const remainingHeight = bodyPixelDimensions.bodyHeight - currentHeight

      // Bei eingefügtem Text sind wir noch weniger aggressiv mit Umbrüchen
      if (isPasteOperation) {
        // Nur umbrechen, wenn absolut kein Platz mehr ist
        shouldBreakHere = remainingHeight <= 0
      } else {
        // Verwenden der verbesserten shouldBreakParagraph-Funktion
        shouldBreakHere = shouldBreakParagraph(editor.view, oldPos, remainingHeight)
      }
    } else if (isPageFull) {
      // Für Nicht-Absatz-Knoten: Umbrechen, wenn die Seite voll ist
      shouldBreakHere = true
    }

    if (shouldBreakHere && currentPageContent.length > 0) {
      // Hier würden wir den Absatz teilen, wenn wir innerhalb eines Absatzes umbrechen
      // Für jetzt fügen wir einfach den ganzen Absatz auf die nächste Seite ein

      const pageNode = addPage(currentPageContent)
      cumulativeNewDocPos += pageNode.nodeSize - getMaybeNodeSize(currentPageHeader)
      currentPageContent = []
      currentHeight = 0
      existingPageNode = doc.maybeChild(++pageNum)
      if (isPageNumInRange(doc, pageNum)) {
        ;({ pageNodeAttributes, pageRegionNodeAttributes, bodyPixelDimensions } = getPaginationNodeAttributes(
          editor,
          pageNum,
        ))
      }

      // Next page header
      currentPageHeader = constructHeader(pageRegionNodeAttributes.header)
      cumulativeNewDocPos += getMaybeNodeSize(currentPageHeader)
    }

    // Record the mapping from old position to new position
    const nodeStartPosInNewDoc = cumulativeNewDocPos + currentPageContent.reduce((sum, n) => sum + n.nodeSize, 0)

    oldToNewPosMap.set(oldPos, nodeStartPosInNewDoc)

    currentPageContent.push(node)
    currentHeight += nodeHeight
  }

  if (currentPageContent.length > 0) {
    // Add final page (may not be full)
    addPage(currentPageContent)
  } else {
    pageNum--
  }

  const newDoc = schema.topNodeType.create(null, pages)
  const docSize = newDoc.content.size
  limitMappedCursorPositions(oldToNewPosMap, docSize)

  return { newDoc, oldToNewPosMap }
}

/**
 * Limit mapped cursor positions to document size to prevent out of bounds errors
 * when setting the cursor position.
 *
 * @param oldToNewPosMap - The mapping from old positions to new positions.
 * @param docSize - The size of the new document.
 * @returns {void}
 */
const limitMappedCursorPositions = (oldToNewPosMap: CursorMap, docSize: number): void => {
  oldToNewPosMap.forEach((newPos, oldPos) => {
    if (newPos > docSize) {
      oldToNewPosMap.set(oldPos, docSize)
    }
  })
}

/**
 * Map the cursor position from the old document to the new document.
 *
 * @param contentNodes - The content nodes and their positions.
 * @param oldCursorPos - The old cursor position.
 * @param oldToNewPosMap - The mapping from old positions to new positions.
 * @param newDocContentSize - The size of the new document. Serves as maximum limit for cursor position.
 * @returns {number} The new cursor position.
 */
const mapCursorPosition = (
  contentNodes: NodePosArray,
  oldCursorPos: number,
  oldToNewPosMap: CursorMap,
  newDocContentSize: number,
): Nullable<number> => {
  // Direkte Zuordnung, wenn die Position in der Map ist
  if (oldToNewPosMap.has(oldCursorPos)) {
    return oldToNewPosMap.get(oldCursorPos)!
  }

  // Suche nach dem Knoten, der die Position enthält
  for (let i = 0; i < contentNodes.length; i++) {
    const { node, pos: oldNodePos } = contentNodes[i]
    const nodeSize = node.nodeSize

    if (inRange(oldCursorPos, oldNodePos, oldNodePos + nodeSize)) {
      const offsetInNode = oldCursorPos - oldNodePos
      const newNodePos = oldToNewPosMap.get(oldNodePos)
      if (newNodePos === undefined) {
        console.error("Unable to determine new node position from cursor map!")
        return 0
      } else {
        return Math.min(newNodePos + offsetInNode, newDocContentSize - 1)
      }
    }
  }

  // Wenn keine direkte Zuordnung gefunden wurde, suchen wir nach der nächstgelegenen Position
  let closestOldPos = -1
  let minDistance = Number.POSITIVE_INFINITY

  for (const oldPos of oldToNewPosMap.keys()) {
    const distance = Math.abs(oldPos - oldCursorPos)
    if (distance < minDistance) {
      minDistance = distance
      closestOldPos = oldPos
    }
  }

  if (closestOldPos !== -1) {
    return oldToNewPosMap.get(closestOldPos)!
  }

  return null
}

/**
 * Check if the given position is at the start of a text block.
 *
 * @param $pos - The resolved position in the document.
 * @returns {boolean} True if the position is at the start of a text block, false otherwise.
 */
const isNodeBeforeAvailable = ($pos: ResolvedPos): boolean => {
  return !!$pos.nodeBefore && (isTextNode($pos.nodeBefore) || isParagraphNode($pos.nodeBefore))
}

/**
 * Check if the given position is at the end of a text block.
 *
 * @param $pos - The resolved position in the document.
 *
 * @param $pos - The resolved position in the document.
 * @returns {boolean} True if the position is at the end of a text block, false otherwise.
 */
const isNodeAfterAvailable = ($pos: ResolvedPos): boolean => {
  return !!$pos.nodeAfter && (isTextNode($pos.nodeAfter) || isParagraphNode($pos.nodeAfter))
}

/**
 * Enhanced cursor positioning with multiple fallback strategies
 *
 * @param tr - The transaction to update
 * @param newCursorPos - The mapped new cursor position
 * @param oldCursorPos - The original cursor position
 * @param oldCursorAnchor - The original selection anchor
 * @param oldCursorHead - The original selection head
 */
const enhancedCursorPositioning = (
  tr: Transaction,
  newCursorPos: Nullable<number>,
  oldCursorAnchor: number,
  oldCursorHead: number,
): void => {
  if (newCursorPos !== null) {
    try {
      const $pos = tr.doc.resolve(newCursorPos)
      let selection

      // Strategie 1: Versuchen, die Position im Textblock zu verwenden
      if ($pos.parent.isTextblock || isNodeBeforeAvailable($pos) || isNodeAfterAvailable($pos)) {
        selection = moveToThisTextBlock(tr, $pos)
      }
      // Strategie 2: Nächstgelegene gültige Position finden
      else {
        selection = moveToNearestValidCursorPosition($pos)
      }

      // Wenn eine Selektion gefunden wurde, anwenden
      if (selection) {
        setSelection(tr, selection)
        return
      }

      // Strategie 3: Versuchen, die alte Selektion wiederherzustellen
      if (oldCursorAnchor !== oldCursorHead) {
        // Es war eine Bereichsauswahl
        const newAnchor = mapCursorPosition(
          [],
          oldCursorAnchor,
          new Map([[oldCursorAnchor, newCursorPos]]),
          tr.doc.content.size,
        )
        const newHead = mapCursorPosition(
          [],
          oldCursorHead,
          new Map([[oldCursorHead, newCursorPos]]),
          tr.doc.content.size,
        )

        if (newAnchor !== null && newHead !== null) {
          // Erstellen einer TextSelection mit Anker und Kopf
          const textSelection = TextSelection.create(tr.doc, newAnchor, newHead)
          tr.setSelection(textSelection)
          return
        }
      }

      // Strategie 4: Einfach die neue Position verwenden
      const textSelection = TextSelection.create(tr.doc, newCursorPos)
      tr.setSelection(textSelection)
    } catch (error) {
      console.error("Error setting cursor position:", error)
      // Fallback zu einer sicheren Auswahl am Ende des Dokuments
      setSelectionAtEndOfDocument(tr)
    }
  } else {
    // Wenn keine neue Position gefunden wurde, zum Ende des Dokuments gehen
    setSelectionAtEndOfDocument(tr)
  }
}
