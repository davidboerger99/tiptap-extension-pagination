/**
 * @file /src/Plugins/Pagination.ts
 * @name Pagination
 * @description Custom plugin for paginating the editor content.
 */

import type { Editor } from "@tiptap/core"
import { Plugin, PluginKey, type EditorState } from "@tiptap/pm/state"
import type { EditorView } from "@tiptap/pm/view"
import { buildPageView } from "../utils/buildPageView"
import { isNodeEmpty } from "../utils/nodes/node"
import { doesDocHavePageNodes } from "../utils/nodes/page/page"
import type { PaginationOptions } from "../PaginationExtension"

type PaginationPluginProps = {
  editor: Editor
  options: PaginationOptions
}

// Change this to a function declaration to fix the TypeScript error
function createPaginationPlugin({ editor, options }: PaginationPluginProps): Plugin {
  return new Plugin({
    key: new PluginKey("pagination"),
    view() {
      let isPaginating = false

      return {
        update(view: EditorView, prevState: EditorState) {
          if (isPaginating) return

          const { state } = view
          const { doc, schema } = state
          const pageType = schema.nodes.page

          if (!pageType) return

          const docChanged = !doc.eq(prevState.doc)
          const initialLoad = isNodeEmpty(prevState.doc) && !isNodeEmpty(doc)
          const hasPageNodes = doesDocHavePageNodes(state)

          if (!docChanged && hasPageNodes && !initialLoad) return

          isPaginating = true

          try {
            // Pass the parameters as a single object to avoid parameter order issues
            buildPageView({
              editor,
              view,
              options,
            })
          } catch (error) {
            console.error("Error in pagination:", error)
          } finally {
            // Reset paginating flag regardless of success or failure
            isPaginating = false
          }
        },
      }
    },
  })
}

export default createPaginationPlugin
