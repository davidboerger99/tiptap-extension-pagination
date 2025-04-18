/**
 * @file /src/utils/nodes/listItem.ts
 * @name ListItem
 * @description Utility functions for list items.
 */

import type { Node as PMNode } from "@tiptap/pm/model"
import type { Nullable } from "../../types/record"

/**
 * Check if the given node is a list item node.
 *
 * @param node - The node to check.
 * @returns {boolean} True if the node is a list item node, false otherwise.
 */
export const isListItemNode = (node: Nullable<PMNode>): boolean => {
  if (!node) {
    console.warn("No node provided")
    return false
  }

  return node.type.name === "listItem"
}
