/**
 * @file /src/Nodes/HeaderFooter.ts
 * @name HeaderFooter
 * @description The Header/Footer node for the editor.
 */

import { HEADER_FOOTER_NODE_NAME, HEADER_FOOTER_ATTRIBUTES, FOOTER_DEFAULT_ATTRIBUTES } from "../constants/pageRegions"
import { constructChildOnlyClipboardPlugin } from "../utils/clipboard"
import { Node, type NodeViewRendererProps, mergeAttributes } from "@tiptap/core"
import { mm } from "../utils/units"
import { calculateHeaderFooterDimensions } from "../utils/pageRegion/dimensions"
import {
  getHeaderFooterNodePageEndOffset,
  getHeaderFooterNodeType,
  getHeaderFooterNodeXMargins,
  isHeaderFooterNode,
  getHeaderFooterNodePageNumber,
} from "../utils/nodes/headerFooter/headerFooter"
import { addNodeAttributes } from "../utils/attributes/addAttributes"
import { parseHTMLNode } from "../utils/nodes/node"
import { getPageNodeAndPosition } from "../utils/nodes/page/pagePosition"
import { getPageNumber } from "../utils/nodes/page/pageNumber"

const baseElement = "div" as const
const headerFooterAttribute = "data-page-header-footer" as const

export const HeaderFooterNode = Node.create({
  name: HEADER_FOOTER_NODE_NAME,
  group: "block",
  content: "block+",
  defining: true,
  isolating: true,

  addAttributes() {
    return addNodeAttributes(HEADER_FOOTER_ATTRIBUTES)
  },

  parseHTML() {
    return [parseHTMLNode(baseElement, headerFooterAttribute, true)]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      baseElement,
      mergeAttributes(HTMLAttributes, { [headerFooterAttribute]: true, class: HEADER_FOOTER_NODE_NAME }),
      0,
    ]
  },

  addNodeView() {
    return (props: NodeViewRendererProps) => {
      const { editor, node, getPos } = props
      const pos = getPos()

      const { node: pageNode } = getPageNodeAndPosition(editor.state.doc, pos)
      const pageRegionType = getHeaderFooterNodeType(node)
      if (!pageNode) {
        throw new Error(`Page node not found from ${pageRegionType ?? HEADER_FOOTER_NODE_NAME} node at position ${pos}`)
      }

      const dom = document.createElement(baseElement)
      dom.setAttribute(headerFooterAttribute, String(true))
      dom.classList.add(HEADER_FOOTER_NODE_NAME)

      const { width, height } = calculateHeaderFooterDimensions(pageNode, node)
      const endOffset = getHeaderFooterNodePageEndOffset(node) ?? FOOTER_DEFAULT_ATTRIBUTES.pageEndOffset
      const xMargins = getHeaderFooterNodeXMargins(node) ?? FOOTER_DEFAULT_ATTRIBUTES.xMargins

      dom.style.height = mm(height)
      dom.style.width = mm(width)
      dom.style.left = mm(xMargins.left)
      switch (pageRegionType) {
        case "header":
          dom.style.top = mm(endOffset)
          break
        case "footer":
          dom.style.bottom = mm(endOffset)
          break
      }

      dom.style.border = "1px solid #ccc"
      dom.style.overflow = "hidden"
      dom.style.position = "absolute"
      dom.style.boxSizing = "border-box"

      const contentDOM = document.createElement(baseElement)
      dom.appendChild(contentDOM)

      // Verbesserte Implementierung für Seitenzahlen
      const pageNumberOptions = getHeaderFooterNodePageNumber(node)

      // Funktion zum Aktualisieren der Seitenzahl
      const updatePageNumber = () => {
        // Entfernen Sie vorhandene Seitenzahlen
        const existingPageNumber = dom.querySelector(".page-number-container")
        if (existingPageNumber) {
          existingPageNumber.remove()
        }

        // Nur Seitenzahlen anzeigen, wenn show=true ist (standardmäßig true)
        if (pageNumberOptions && pageNumberOptions.show !== false) {
          const pageNum = getPageNumber(editor.state.doc, pos, false) // 1-indexierte Seitenzahl

          const pageNumberContainer = document.createElement("div")
          pageNumberContainer.className = "page-number-container"

          // Styling für die Seitenzahl
          pageNumberContainer.style.position = "absolute"
          pageNumberContainer.style.bottom = "0"
          pageNumberContainer.style.left = "0"
          pageNumberContainer.style.width = "100%"
          pageNumberContainer.style.textAlign = pageNumberOptions.position || "left"

          // Und fügen Sie zusätzliche Stile für die linke Ausrichtung hinzu:
          if (pageNumberOptions.position === "left") {
            pageNumberContainer.style.textAlign = "left"
            pageNumberContainer.style.paddingLeft = "10px" // Abstand vom linken Rand
          }

          pageNumberContainer.style.padding = "4px 0"
          pageNumberContainer.style.fontSize = "0.85em"
          pageNumberContainer.style.color = "#555"
          pageNumberContainer.style.borderTop = "1px solid #ddd"
          pageNumberContainer.style.backgroundColor = "rgba(255, 255, 255, 0.8)"
          pageNumberContainer.style.zIndex = "10"

          // Formatieren der Seitenzahl
          const format = pageNumberOptions.format || "{n}"
          const formattedPageNumber = format.replace("{n}", String(pageNum))
          pageNumberContainer.textContent = formattedPageNumber

          dom.appendChild(pageNumberContainer)
        }
      }

      // Initial die Seitenzahl aktualisieren
      updatePageNumber()

      // Beobachter für Attributänderungen einrichten
      const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          if (mutation.type === "attributes" && mutation.attributeName === "pageNumber") {
            updatePageNumber()
          }
        }
      })

      // Beobachter starten
      observer.observe(dom, { attributes: true })

      return {
        dom,
        contentDOM,
        update: (updatedNode) => {
          if (updatedNode.type.name !== HEADER_FOOTER_NODE_NAME) return false

          // Aktualisieren der Seitenzahl, wenn sich der Knoten ändert
          updatePageNumber()
          return true
        },
        destroy: () => {
          // Beobachter stoppen, wenn der Knoten zerstört wird
          observer.disconnect()
        },
      }
    }
  },

  addProseMirrorPlugins() {
    return [constructChildOnlyClipboardPlugin("headerChildOnlyClipboardPlugin", this.editor.schema, isHeaderFooterNode)]
  },
})
