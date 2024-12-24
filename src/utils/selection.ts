/**
 * @file /src/utils/pagination.ts
 * @name Pagination
 * @description Utility functions for paginating the editor content.
 */

import { ResolvedPos } from "@tiptap/pm/model";
import { EditorState, Selection, TextSelection, Transaction } from "@tiptap/pm/state";
import { Nullable } from "./record";
import { Sign } from "../constants/direction";

/**
 * Check if the editor is currently highlighting text.
 * @param state - The current editor state.
 * @returns True if text is currently highlighted, false otherwise.
 */
export const isHighlighting = (state: EditorState): boolean => {
    const { from, to } = state.selection;
    return from !== to;
};

/**
 * Get the resolved position in the document.
 * @param state - The current editor state.
 * @returns The resolved position in the document.
 */
export const getResolvedPosition = (state: EditorState): ResolvedPos => {
    const { from } = state.selection;
    const $pos = state.doc.resolve(from);
    return $pos;
};

/**
 * Set the selection at the specified anchor and head positions. If head is not provided,
 * it will be set to the anchor position.
 * @param tr - The current transaction.
 * @param anchor - The anchor position.
 * @param head - The head position.
 * @returns The updated transaction.
 */
export const setSelectionAtPos = (tr: Transaction, anchor: number, head?: number): Transaction => {
    const selection = TextSelection.create(tr.doc, anchor, head ?? anchor);
    return setSelection(tr, selection);
};

/**
 * Set the selection to the specified selection object.
 * @param tr - The current transaction.
 * @param selection - The selection object.
 * @returns The updated transaction.
 */
export const setSelection = <S extends Selection>(tr: Transaction, selection: S): Transaction => {
    console.log("Setting selection to", selection.$anchor.pos, "-", selection.$head.pos);
    return tr.setSelection(selection);
};

/**
 * Set the selection at the end of the document.
 * @param tr - The current transaction.
 * @returns The updated transaction.
 */
export const setSelectionAtEndOfDocument = (tr: Transaction): Transaction => {
    return setSelectionAtPos(tr, tr.doc.content.size);
};

/**
 * Move the cursor to the previous text block.
 * @param tr - The current transaction.
 * @param $pos - The resolved position in the document.
 * @returns {Selection} The new selection.
 */
export const moveToPreviousTextBlock = (tr: Transaction, $pos: ResolvedPos | number): Selection => {
    if (typeof $pos === "number") {
        return moveToPreviousTextBlock(tr, tr.doc.resolve($pos));
    }

    const prevPos = $pos.pos - 1;
    const prevResPos = tr.doc.resolve(prevPos);
    const searchDirection = -1;
    const selection = Selection.near(prevResPos, searchDirection);
    return selection;
};

/**
 * Move the cursor to the current text block.
 * @param tr - The current transaction.
 * @param $pos - The resolved position in the document.
 * @param bias - The search direction.
 * @returns {Selection} The new selection.
 */
export const moveToThisTextBlock = (tr: Transaction, $pos: ResolvedPos | number, bias: Sign = 1): Selection => {
    if (typeof $pos === "number") {
        return moveToThisTextBlock(tr, tr.doc.resolve($pos));
    }

    const thisPos = $pos.pos;
    const thisResPos = tr.doc.resolve(thisPos);
    const selection = Selection.near(thisResPos, bias);
    return selection;
};

/**
 * Move the cursor to the next text block.
 * @param tr - The current transaction.
 * @param $pos - The resolved position in the document.
 * @returns {Selection} The new selection.
 */
export const moveToNextTextBlock = (tr: Transaction, $pos: ResolvedPos | number): Selection => {
    if (typeof $pos === "number") {
        return moveToNextTextBlock(tr, tr.doc.resolve($pos));
    }

    const nextPos = $pos.pos + 1;
    const nextResPos = tr.doc.resolve(nextPos);
    const searchDirection = 1;
    const selection = Selection.near(nextResPos, searchDirection);
    return selection;
};

/**
 * Move the cursor to the nearest text selection.
 * @param tr - The current transaction.
 * @param $pos - The resolved position in the document.
 * @param bias - The search direction.
 * @returns {void} The new selection.
 * @throws {Error} If the parent is not a text block.
 */
export const moveToNearestTextSelection = (tr: Transaction, $pos: ResolvedPos, bias: Sign = 1): void => {
    const textSelection = getNearestTextSelection($pos, bias);
    setSelection(tr, textSelection);
};

/**
 * Get the nearest text selection to the given position.
 * @param $pos - The resolved position in the document.
 * @param bias - The search direction.
 * @returns {Selection} The nearest text selection.
 * @throws {Error} If the parent is not a text block.
 */
export const getNearestTextSelection = ($pos: ResolvedPos, bias: Sign = 1): Selection => {
    if (!$pos.parent.isTextblock) {
        throw new Error("Parent is not a text block");
    }

    console.log("The position is valid for a TextSelection. Setting selection to", $pos.pos);
    return TextSelection.near($pos, bias);
};

/**
 * Move the cursor to the nearest valid cursor position.
 * @param tr - The current transaction.
 * @param $pos - The resolved position in the document.
 * @returns {Selection} The new selection.
 */
export const moveToNearestValidCursorPosition = (tr: Transaction, $pos: ResolvedPos): Nullable<Selection> => {
    const selection = Selection.findFrom($pos, 1, true) || Selection.findFrom($pos, -1, true);
    return selection;
};
