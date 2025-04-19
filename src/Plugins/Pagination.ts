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

// Verbessern Sie die Fehlerbehandlung im Pagination-Plugin
function createPaginationPlugin({ editor, options }: PaginationPluginProps): Plugin {
  // Tracking-Variablen für die Paginierung
  let isPaginating = false
  let lastDocSize = 0
  let lastCharCount = 0
  let paginationTimer: number | null = null
  let consecutiveErrors = 0
  const MAX_CONSECUTIVE_ERRORS = 3
  let lastErrorTime = 0

  // Hilfsfunktion zum Zählen der Zeichen im Dokument
  const countCharsInDoc = (doc: any) => {
    let count = 0
    doc.descendants((node: any) => {
      if (node.isText) {
        count += node.text.length
      }
    })
    return count
  }

  // Erstellen des Plugin-Keys außerhalb der Plugin-Definition
  const pluginKey = new PluginKey("pagination")

  return new Plugin({
    key: pluginKey,

    // Speichern des Zustands im Plugin
    state: {
      init() {
        return {
          lastPaginationTime: 0,
          pendingPagination: false,
        }
      },
      apply(tr, pluginState) {
        // Wenn eine Transaktion ein needsPagination-Flag hat, setzen wir pendingPagination
        if (tr.getMeta("needsPagination")) {
          return { ...pluginState, pendingPagination: true }
        }

        // Wenn eine Paginierung durchgeführt wurde, aktualisieren wir lastPaginationTime
        if (tr.getMeta("paginationApplied")) {
          return {
            lastPaginationTime: Date.now(),
            pendingPagination: false,
          }
        }

        return pluginState
      },
    },

    // Behandlung von Transaktionen vor dem Anwenden
    appendTransaction(transactions, _oldState, newState) {
      // Prüfen, ob eine der Transaktionen eine Textänderung enthält
      const hasTextChanges = transactions.some((tr) =>
        tr.steps.some((step) => step.hasOwnProperty("from") && step.hasOwnProperty("to")),
      )

      if (hasTextChanges) {
        // Erstellen einer neuen Transaktion mit dem needsPagination-Flag
        const tr = newState.tr
        tr.setMeta("needsPagination", true)
        return tr
      }

      return null
    },

    view() {
      return {
        update(view: EditorView, prevState: EditorState) {
          const { state } = view
          const { doc } = state
          // Verwenden des Plugin-Keys von außerhalb
          const pluginState = pluginKey.getState(state)

          if (isPaginating) return

          // Aktuelle Dokumentgröße und Zeichenanzahl
          const currentDocSize = doc.content.size
          const currentCharCount = countCharsInDoc(doc)

          // Bedingungen für sofortige Paginierung
          const docChanged = !doc.eq(prevState.doc)
          const initialLoad = isNodeEmpty(prevState.doc) && !isNodeEmpty(doc)
          const hasPageNodes = doesDocHavePageNodes(state)
          const docSizeChanged = currentDocSize !== lastDocSize
          const charCountChanged = Math.abs(currentCharCount - lastCharCount) > 50 // Signifikante Änderung
          const pendingPagination = pluginState?.pendingPagination
          const timeSinceLastPagination = Date.now() - (pluginState?.lastPaginationTime || 0)
          const timeSinceLastError = Date.now() - lastErrorTime

          // Fehlerbehandlung: Wenn zu viele Fehler aufgetreten sind, Paginierung vorübergehend deaktivieren
          if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS && timeSinceLastError < 5000) {
            return
          }

          // Prüfen, ob eine Paginierung erforderlich ist
          const needsImmediatePagination =
            initialLoad ||
            (docChanged && !hasPageNodes) ||
            pendingPagination ||
            (charCountChanged && timeSinceLastPagination > 500) // Mindestens 500ms seit letzter Paginierung

          // Prüfen, ob eine verzögerte Paginierung erforderlich ist
          const needsDelayedPagination = docSizeChanged && !needsImmediatePagination && timeSinceLastPagination > 200 // Mindestens 200ms seit letzter Paginierung

          // Aktualisieren der Tracking-Variablen
          lastDocSize = currentDocSize
          lastCharCount = currentCharCount

          // Löschen des bestehenden Timers, wenn vorhanden
          if (paginationTimer !== null) {
            clearTimeout(paginationTimer)
            paginationTimer = null
          }

          // Sofortige Paginierung, wenn erforderlich
          if (needsImmediatePagination) {
            isPaginating = true

            try {
              const tr = view.state.tr
              buildPageView({
                editor,
                view,
                options,
              })

              // Setzen des paginationApplied-Flags
              tr.setMeta("paginationApplied", true)
              view.dispatch(tr)

              // Zurücksetzen des Fehlerzählers bei Erfolg
              consecutiveErrors = 0
            } catch (error) {
              console.error("Error in immediate pagination:", error)
              consecutiveErrors++
              lastErrorTime = Date.now()
            } finally {
              isPaginating = false
            }
          }
          // Verzögerte Paginierung, wenn erforderlich
          else if (needsDelayedPagination) {
            paginationTimer = window.setTimeout(() => {
              if (!view.isDestroyed) {
                isPaginating = true

                try {
                  const tr = view.state.tr
                  buildPageView({
                    editor,
                    view,
                    options,
                  })

                  // Setzen des paginationApplied-Flags
                  tr.setMeta("paginationApplied", true)
                  view.dispatch(tr)

                  // Zurücksetzen des Fehlerzählers bei Erfolg
                  consecutiveErrors = 0
                } catch (error) {
                  console.error("Error in delayed pagination:", error)
                  consecutiveErrors++
                  lastErrorTime = Date.now()
                } finally {
                  isPaginating = false
                  paginationTimer = null
                }
              }
            }, 50) // Kurze Verzögerung für bessere Benutzererfahrung
          }
        },

        destroy() {
          // Aufräumen beim Zerstören der Ansicht
          if (paginationTimer !== null) {
            clearTimeout(paginationTimer)
            paginationTimer = null
          }
        },
      }
    },
  })
}

export default createPaginationPlugin
