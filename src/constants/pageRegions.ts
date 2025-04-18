/**
 * @file /src/constants/pageRegions.ts
 * @name PageRegions
 * @description Constants for page regions in the editor.
 */

import type { NodeAttributes } from "../types/node"
import type { FooterNodeAttributes, HeaderFooterNodeAttributes, HeaderNodeAttributes } from "../types/pageRegions"

export const HEADER_FOOTER_NODE_NAME = "header-footer" as const

/**
 * Key for the header footer node attributes.
 */
export const HEADER_FOOTER_NODE_ATTR_KEYS = {
  type: "type",
  pageEndOffset: "pageEndOffset",
  height: "height",
  xMargins: "xMargins",
  pageNumber: "pageNumber",
} as const

// Separate Standardeinstellungen für Header und Footer definieren
export const DEFAULT_PAGE_NUMBER_OPTIONS = {
  show: false,
  position: "left",
  format: "{n}",
} as const

export const DEFAULT_FOOTER_PAGE_NUMBER_OPTIONS = {
  show: true,
  position: "left",
  format: "{n}",
} as const

/**
 * Default attributes for header and footer nodes.
 */
export const HEADER_FOOTER_DEFAULT_ATTRIBUTES: Omit<HeaderFooterNodeAttributes<unknown>, "type"> = {
  height: 10,
  xMargins: { left: 25.4, right: 25.4 },
  pageEndOffset: 10,
  pageNumber: DEFAULT_PAGE_NUMBER_OPTIONS,
}

/**
 * Default attributes for header nodes
 */
export const HEADER_DEFAULT_ATTRIBUTES: HeaderNodeAttributes = {
  type: "header",
  ...HEADER_FOOTER_DEFAULT_ATTRIBUTES,
}

/**
 * Default attributes for footer nodes
 */
export const FOOTER_DEFAULT_ATTRIBUTES: FooterNodeAttributes = {
  type: "footer",
  ...HEADER_FOOTER_DEFAULT_ATTRIBUTES,
  pageNumber: DEFAULT_FOOTER_PAGE_NUMBER_OPTIONS,
}

/**
 * The header/footer node attributes.
 */
export const HEADER_FOOTER_ATTRIBUTES: NodeAttributes<HeaderFooterNodeAttributes<unknown>> = Object.fromEntries(
  Object.entries(HEADER_DEFAULT_ATTRIBUTES).map(([key, value]) => [key, { default: value }]),
) as NodeAttributes<HeaderFooterNodeAttributes<unknown>>
