/**
 * @file /src/types/pageRegions.ts
 * @name PageRegions
 * @description Type definitions for page regions in the editor.
 */

import type { BodyNodeAttributes } from "./body"
import type { XMarginConfig } from "./page"

export type HeaderFooter = "header" | "footer"
export type PageRegion = "header" | "body" | "footer"

/**
 * Page number display options
 */
export type PageNumberOptions = {
  /**
   * Whether to show page numbers
   */
  show: boolean

  /**
   * The position of the page number in the header/footer
   */
  position: "left" | "center" | "right"

  /**
   * The format of the page number
   * Use {n} as a placeholder for the page number
   * Examples: "Page {n}", "{n}", "- {n} -"
   */
  format: string
}

/**
 * Attributes for header and footer nodes.
 */
export type HeaderFooterNodeAttributes<T extends HeaderFooter | unknown> = {
  /**
   * The type of the node. Either "header" or "footer".
   */
  type: T

  /**
   * The offset of the header or footer in millimeters. For the header, that is
   * the distance from the top of the page to the top of the header. For the footer,
   * that is the distance from the bottom of the page to the bottom of the footer.
   * Doing things this way allows for this value to be agnostic of the paper size
   * and orientation. This value should be non-negative.
   */
  pageEndOffset: number

  /**
   * Height of the header in millimeters.
   */
  height: number

  /**
   * The x-axis margins of the header.
   */
  xMargins: XMarginConfig

  /**
   * Page number options
   */
  pageNumber: PageNumberOptions
}

/**
 * Attributes for a header node.
 */
export type HeaderNodeAttributes = HeaderFooterNodeAttributes<"header">

/**
 * Attributes for a footer node.
 */
export type FooterNodeAttributes = HeaderFooterNodeAttributes<"footer">

/**
 * Groups the attributes of all the page regions into a single object.
 */
export type PageRegionNodeAttributesObject = {
  header: HeaderNodeAttributes
  body: BodyNodeAttributes
  footer: FooterNodeAttributes
}
