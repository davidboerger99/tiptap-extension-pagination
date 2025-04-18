/**
 * @file /src/utils/pageRegion/pageRegion.ts
 * @name PageRegion
 * @description Utility functions for creating custom page regions in the editor.
 */

import type { Node as PMNode } from "@tiptap/pm/model"
import type {
  HeaderNodeAttributes,
  FooterNodeAttributes,
  HeaderFooter,
  PageNumberOptions,
} from "../../../types/pageRegions"
import type { Nullable } from "../../../types/record"
import {
  HEADER_DEFAULT_ATTRIBUTES,
  FOOTER_DEFAULT_ATTRIBUTES,
  HEADER_FOOTER_NODE_ATTR_KEYS,
  HEADER_FOOTER_NODE_NAME,
  DEFAULT_PAGE_NUMBER_OPTIONS,
  DEFAULT_FOOTER_PAGE_NUMBER_OPTIONS,
} from "../../../constants/pageRegions"
import type { XMarginConfig } from "../../../types/page"

/**
 * Determines if the given node is a header node.
 *
 * @param node - The node to check.
 * @returns {boolean} True if the node is a header node, false otherwise.
 */
export const isHeaderFooterNode = (node: PMNode): boolean => {
  return node.type.name === HEADER_FOOTER_NODE_NAME
}

/**
 * Get the type of the header or footer node.
 *
 * @param headerFooterNode - The header or footer node to retrieve the type for.
 * @returns {Nullable<HeaderFooter>} The type of the specified header or footer node or null if not found.
 */
export const getHeaderFooterNodeType = (headerFooterNode: PMNode): Nullable<HeaderFooter> => {
  const { attrs } = headerFooterNode
  return attrs[HEADER_FOOTER_NODE_ATTR_KEYS.type]
}

/**
 * Get the x margins from a header or footer node.
 *
 * @param headerFooterNode - The header or footer node.
 * @returns {Nullable<XMarginConfig>} The x margins of the specified header or footer.
 */
export const getHeaderFooterNodeXMargins = (headerFooterNode: PMNode): Nullable<XMarginConfig> => {
  const { attrs } = headerFooterNode
  return attrs[HEADER_FOOTER_NODE_ATTR_KEYS.xMargins]
}

/**
 * Get the page end offset of the header or footer node.
 *
 * @param headerFooterNode - The header or footer node to retrieve the page end offset for.
 * @returns {Nullable<number>} The page end offset of the specified header or footer node or null if not found.
 */
export const getHeaderFooterNodePageEndOffset = (headerFooterNode: PMNode): Nullable<number> => {
  const { attrs } = headerFooterNode
  return attrs[HEADER_FOOTER_NODE_ATTR_KEYS.pageEndOffset]
}

/**
 * Get the height of the header or footer node.
 *
 * @param headerFooterNode - The header or footer node to retrieve the height for.
 * @returns {Nullable<number>} The height of the specified header or footer node or null if not found.
 */
export const getHeaderFooterNodeHeight = (headerFooterNode: PMNode): Nullable<number> => {
  const { attrs } = headerFooterNode
  return attrs[HEADER_FOOTER_NODE_ATTR_KEYS.height]
}

/**
 * Get the page number options of the header or footer node.
 *
 * @param headerFooterNode - The header or footer node to retrieve the page number options for.
 * @returns {Nullable<PageNumberOptions>} The page number options of the specified header or footer node or null if not found.
 */
export const getHeaderFooterNodePageNumber = (headerFooterNode: PMNode): Nullable<PageNumberOptions> => {
  const { attrs } = headerFooterNode
  const nodeType = getHeaderFooterNodeType(headerFooterNode)

  // Wenn keine pageNumber-Attribute vorhanden sind, verwenden Sie die Standardwerte
  if (!attrs[HEADER_FOOTER_NODE_ATTR_KEYS.pageNumber]) {
    // Unterschiedliche Standardwerte für Header und Footer
    return nodeType === "footer" ? DEFAULT_FOOTER_PAGE_NUMBER_OPTIONS : DEFAULT_PAGE_NUMBER_OPTIONS
  }

  // Stellen Sie sicher, dass alle erforderlichen Eigenschaften vorhanden sind
  const defaultOptions = nodeType === "footer" ? DEFAULT_FOOTER_PAGE_NUMBER_OPTIONS : DEFAULT_PAGE_NUMBER_OPTIONS
  const pageNumberOptions = {
    ...defaultOptions,
    ...attrs[HEADER_FOOTER_NODE_ATTR_KEYS.pageNumber],
  }

  return pageNumberOptions
}

/**
 * Retrieves the header node attributes, filling in any missing attributes with the default values.
 * @param headerFooterNode - The header or footer node to retrieve the attributes for.
 * @returns {HeaderNodeAttributes} The attributes of the specified header.
 */
export const getHeaderNodeAttributes = (headerFooterNode: PMNode): HeaderNodeAttributes => {
  const { attrs } = headerFooterNode
  const mergedAttrs = { ...HEADER_DEFAULT_ATTRIBUTES, ...attrs }
  if (mergedAttrs.type !== "header") {
    console.warn("Header node attributes are not of type 'header'")
  }

  return mergedAttrs
}

/**
 * Retrieves the footer node attributes, filling in any missing attributes with the default values.
 * @param headerFooterNode - The header or footer node to retrieve the attributes for.
 * @returns {FooterNodeAttributes} The attributes of the specified footer.
 */
export const getFooterNodeAttributes = (headerFooterNode: PMNode): FooterNodeAttributes => {
  const { attrs } = headerFooterNode
  const mergedAttrs = { ...FOOTER_DEFAULT_ATTRIBUTES, ...attrs }
  if (mergedAttrs.type !== "footer") {
    console.warn("Footer node attributes are not of type 'footer'")
  }

  return mergedAttrs
}
