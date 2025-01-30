/**
 * @file /src/Plugins/Keymap.ts
 * @name Keymap
 * @description Custom plugin for handling keymaps for page navigation.
 */

import { keymap } from "@tiptap/pm/keymap";
import {
    getResolvedPosition,
    isHighlighting,
    moveToNearestTextSelection,
    moveToNextTextBlock,
    moveToPreviousTextBlock,
    moveToThisTextBlock,
    setSelection,
    setSelectionAtPos,
    setSelectionToEndOfParagraph,
    setSelectionToParagraph,
} from "../utils/selection";

import {
    getFirstParagraphInNextPageBodyAfterPos,
    getLastParagraphInPreviousPageBodyBeforePos,
    getOffsetForDistanceInLine,
    getParagraphLineInfo,
    getParagraphNodeAndPosition,
    isAtStartOrEndOfParagraph,
    isParagraphNode,
    isPosAtFirstLineOfParagraph,
    isPosAtLastLineOfParagraph,
    isPositionWithinParagraph,
} from "../utils/nodes/paragraph";
import { isNodeEmpty } from "@tiptap/core";
import { appendAndReplaceNode, deleteNode } from "../utils/nodes/node";
import { isPageNode } from "../utils/nodes/page/page";
import { isPosAtStartOfDocument } from "../utils/nodes/document";
import { getPageNodeAndPosition } from "../utils/nodes/page/pagePosition";
import { isTextNode } from "../utils/nodes/text";
import { isPosAtEndOfBody, isPosAtFirstChildOfBody, isPosAtLastChildOfBody, isPosAtStartOfBody } from "../utils/nodes/body/bodyCondition";

const KeymapPlugin = keymap({
    ArrowLeft: (state, dispatch) => {
        if (!dispatch) {
            console.warn("No dispatch function provided");
            return false;
        }

        if (isHighlighting(state)) {
            return false;
        }

        const { doc, tr } = state;
        const $pos = getResolvedPosition(state);

        if (!isPosAtStartOfBody(doc, $pos)) {
            return false;
        }

        console.log("At start of page body");

        const thisPos = $pos.pos;
        const expectedTextNodePos = thisPos - 1;
        const thisTextNode = doc.nodeAt(expectedTextNodePos);
        if (!thisTextNode) {
            console.warn("No node found at position", expectedTextNodePos);
            return false;
        }

        const { pos: paragraphPos, node: paragraphNode } = getParagraphNodeAndPosition(doc, $pos);
        if (!paragraphNode) {
            console.warn("No current paragraph node found");
            return false;
        }

        if (!isParagraphNode(thisTextNode) && !isTextNode(thisTextNode)) {
            console.warn("Unexpected node type found at position", expectedTextNodePos);
            return false;
        }

        const { pos: previousParagraphPos, node: previousParagraphNode } = getLastParagraphInPreviousPageBodyBeforePos(doc, paragraphPos);
        if (!previousParagraphNode) {
            console.warn("No last paragraph node found in previous page.");
            return false;
        }

        setSelectionToEndOfParagraph(tr, previousParagraphPos, previousParagraphNode);

        dispatch(tr);
        return true;
    },
    ArrowRight: (state, dispatch) => {
        if (!dispatch) {
            console.warn("No dispatch function provided");
            return false;
        }

        if (isHighlighting(state)) {
            return false;
        }

        const { doc, tr } = state;
        const $pos = getResolvedPosition(state);

        if (!isPosAtEndOfBody(doc, $pos)) {
            return false;
        }

        console.log("At end of page body");

        const thisPos = $pos.pos;
        const expectedTextNodePos = thisPos - 1;
        const thisTextNode = doc.nodeAt(expectedTextNodePos);
        if (!thisTextNode) {
            console.warn("No node found at position", expectedTextNodePos);
            return false;
        }

        const { pos: paragraphPos, node: paragraphNode } = getParagraphNodeAndPosition(doc, $pos);
        if (!paragraphNode) {
            console.warn("No current paragraph node found");
            return false;
        }

        if (!isParagraphNode(thisTextNode) && !isTextNode(thisTextNode)) {
            console.warn("Unexpected node type found at position", expectedTextNodePos);
            return false;
        }

        const { pos: nextParagraphPos, node: nextParagraphNode } = getFirstParagraphInNextPageBodyAfterPos(doc, paragraphPos);
        if (!nextParagraphNode) {
            console.warn("No first paragraph node found in next page.");
            return false;
        }

        const newSelection = moveToThisTextBlock(tr, nextParagraphPos);
        setSelection(tr, newSelection);

        dispatch(tr);
        return true;
    },
    ArrowUp: (state, dispatch, view) => {
        if (!dispatch) {
            console.warn("No dispatch function provided");
            return false;
        }

        if (!view) {
            console.warn("No view provided");
            return false;
        }

        if (isHighlighting(state)) {
            return false;
        }

        const { doc, tr } = state;
        const $pos = getResolvedPosition(state);

        if (!isPosAtFirstChildOfBody(doc, $pos)) {
            return false;
        }

        console.log("In first child of page body");

        const thisPos = $pos.pos;
        const { isAtFirstLine, offsetDistance } = isPosAtFirstLineOfParagraph(view, $pos);
        if (!isAtFirstLine) {
            return false;
        }

        const expectedTextNodePos = thisPos - 1;
        const thisTextNode = doc.nodeAt(expectedTextNodePos);
        if (!thisTextNode) {
            console.warn("No node found at position", expectedTextNodePos);
            return false;
        }

        const { pos: paragraphPos, node: paragraphNode } = getParagraphNodeAndPosition(doc, $pos);
        if (!paragraphNode) {
            console.warn("No current paragraph node found");
            return false;
        }

        if (!isParagraphNode(thisTextNode) && !isTextNode(thisTextNode)) {
            console.warn("Unexpected node type found at position", expectedTextNodePos);
            return false;
        }

        const { pos: previousParagraphPos, node: previousParagraphNode } = getLastParagraphInPreviousPageBodyBeforePos(doc, paragraphPos);
        if (!previousParagraphNode) {
            console.warn("No last paragraph node found in previous page.");
            return false;
        }

        const { lineCount: prevParLineCount } = getParagraphLineInfo(view, previousParagraphPos);
        const prevParagraphLastLineNum = prevParLineCount - 1;
        const cursorOffset = getOffsetForDistanceInLine(view, previousParagraphPos, prevParagraphLastLineNum, offsetDistance) + 1;

        setSelectionToParagraph(tr, previousParagraphPos, previousParagraphNode, cursorOffset);

        dispatch(tr);
        return true;
    },
    ArrowDown: (state, dispatch, view) => {
        if (!dispatch) {
            console.warn("No dispatch function provided");
            return false;
        }

        if (!view) {
            console.warn("No view provided");
            return false;
        }

        if (isHighlighting(state)) {
            return false;
        }

        const { doc, tr } = state;
        const $pos = getResolvedPosition(state);

        if (!isPosAtLastChildOfBody(doc, $pos)) {
            return false;
        }

        console.log("In last child of page body");

        const thisPos = $pos.pos;
        const { isAtLastLine, offsetInLine } = isPosAtLastLineOfParagraph(view, $pos);
        if (!isAtLastLine) {
            return false;
        }

        const expectedTextNodePos = thisPos - 1;
        const thisTextNode = doc.nodeAt(expectedTextNodePos);
        if (!thisTextNode) {
            console.warn("No node found at position", expectedTextNodePos);
            return false;
        }

        const { pos: paragraphPos, node: paragraphNode } = getParagraphNodeAndPosition(doc, $pos);
        if (!paragraphNode) {
            console.warn("No current paragraph node found");
            return false;
        }

        if (!isParagraphNode(thisTextNode) && !isTextNode(thisTextNode)) {
            console.warn("Unexpected node type found at position", expectedTextNodePos);
            return false;
        }

        const { pos: nextParagraphPos, node: nextParagraphNode } = getFirstParagraphInNextPageBodyAfterPos(doc, paragraphPos);
        if (!nextParagraphNode) {
            console.warn("No first paragraph node found in next page.");
            return false;
        }

        const newSelection = moveToThisTextBlock(tr, nextParagraphPos, undefined, offsetInLine + 1);
        setSelection(tr, newSelection);

        dispatch(tr);
        return true;
    },
    Enter: (state, dispatch) => {
        if (!dispatch) {
            console.warn("No dispatch function provided");
            return false;
        }

        if (isHighlighting(state)) {
            return false;
        }

        const { doc, tr, schema, selection } = state;
        const { from } = selection;
        const $pos = getResolvedPosition(state);

        // Ensure that the position is within a valid block (paragraph)
        if (!isPositionWithinParagraph($pos)) {
            console.warn("Not inside a paragraph node");
            return false;
        }

        const { node: paragraphNode } = getParagraphNodeAndPosition(doc, $pos);
        if (!paragraphNode) {
            console.warn("No current paragraph node found");
            return false;
        }

        // Create a new empty paragraph node
        const newParagraph = schema.nodes.paragraph.create();
        console.log("Inserting new paragraph at position", from);

        if (isNodeEmpty(paragraphNode)) {
            tr.insert(from, newParagraph);
        } else {
            if (isAtStartOrEndOfParagraph(doc, $pos)) {
                tr.replaceSelectionWith(newParagraph);
            } else {
                const remainingContent = paragraphNode.content.cut($pos.parentOffset);
                const newContentParagraph = schema.nodes.paragraph.create({}, remainingContent);
                tr.replaceWith($pos.pos, $pos.pos + remainingContent.size, newContentParagraph);
            }
        }

        const newSelection = moveToNextTextBlock(tr, from);
        setSelection(tr, newSelection);
        dispatch(tr);
        return true;
    },
    Backspace: (state, dispatch) => {
        if (!dispatch) {
            console.warn("No dispatch function provided");
            return false;
        }

        if (isHighlighting(state)) {
            return false;
        }

        const { doc, tr, schema } = state;
        const $pos = getResolvedPosition(state);
        const thisPos = $pos.pos;

        // Ensure that the position is within a valid block (paragraph)
        if (!isPositionWithinParagraph($pos)) {
            return false;
        }

        if (isPosAtEndOfBody(doc, $pos)) {
            // Traverse $pos.path to find the nearest page node
            const { pos: paragraphPos, node: paragraphNode } = getParagraphNodeAndPosition(doc, $pos);
            if (!paragraphNode) {
                console.warn("No current paragraph node found");
                return false;
            }

            if (isNodeEmpty(paragraphNode)) {
                deleteNode(tr, paragraphPos, paragraphNode);
                const selection = moveToPreviousTextBlock(tr, paragraphPos);
                setSelection(tr, selection);
            } else {
                // Remove the last character from the current paragraph
                const newContent = paragraphNode.content.cut(0, paragraphNode.content.size - 1);
                const newParagraph = schema.nodes.paragraph.create({}, newContent);
                tr.replaceWith(paragraphPos, paragraphPos + paragraphNode.nodeSize, newParagraph);
                setSelectionAtPos(tr, thisPos - 1);
            }
        } else if (isPosAtStartOfDocument(doc, $pos, true)) {
            // Prevent deleting the first page node
            return true;
        } else if (!isPosAtStartOfBody(doc, $pos)) {
            return false;
        } else {
            // Traverse $pos.path to find the nearest page node
            const { node: thisPageNode, pos: thisPagePos } = getPageNodeAndPosition(doc, $pos);
            if (!thisPageNode) {
                console.warn("No current page node found");
                return false;
            }

            if (!isPosAtStartOfBody(doc, thisPos)) {
                return false;
            }

            const prevPageChild = doc.childBefore(thisPagePos);
            const prevPageNode = prevPageChild.node;

            // Confirm that the previous node is a page node
            if (!prevPageNode) {
                // Start of document
                console.log("No previous page node found");
                return false;
            }

            if (!isPageNode(prevPageNode)) {
                console.warn("Previous node is not a page node");
                return false;
            }

            // Append the content of the current paragraph to the end of the previous paragraph
            const { pos: paragraphPos, node: paragraphNode } = getParagraphNodeAndPosition(doc, $pos);
            if (!paragraphNode) {
                console.warn("No current paragraph node found");
                return false;
            }

            const { pos: previousParagraphPos, node: previousParagraphNode } = getLastParagraphInPreviousPageBodyBeforePos(
                doc,
                paragraphPos
            );
            if (!previousParagraphNode) {
                console.warn("No previous paragraph node found");
                return false;
            }

            if (!isNodeEmpty(previousParagraphNode) || !isNodeEmpty(paragraphNode)) {
                deleteNode(tr, paragraphPos, paragraphNode);
            }

            appendAndReplaceNode(tr, previousParagraphPos, previousParagraphNode, paragraphNode);

            // Set the selection to the end of the previous paragraph
            setSelectionToEndOfParagraph(tr, previousParagraphPos, previousParagraphNode);
        }

        dispatch(tr);
        return true;
    },
    Delete: (state, dispatch) => {
        if (!dispatch) {
            console.warn("No dispatch function provided");
            return false;
        }

        if (isHighlighting(state)) {
            return false;
        }

        const { doc, tr } = state;
        const $pos = getResolvedPosition(state);

        // Ensure that the position is within a valid block (paragraph)
        if (!isPositionWithinParagraph($pos)) {
            console.warn("Not inside a paragraph node");
            return false;
        }

        if (!isPosAtEndOfBody(doc, $pos)) {
            return false;
        }

        // We need to remove the current paragraph node and prepend any
        // content to the next paragraph node (which will now be at the
        // end of the current page)
        const thisPos = $pos.pos;
        const expectedTextNodePos = thisPos - 1;
        const thisTextNode = doc.nodeAt(expectedTextNodePos);
        if (!thisTextNode) {
            console.warn("No node found at position", expectedTextNodePos);
            return false;
        }

        const { pos: paragraphPos, node: paragraphNode } = getParagraphNodeAndPosition(doc, $pos);
        if (!paragraphNode) {
            console.warn("No current paragraph node found");
            return false;
        }

        if (!isParagraphNode(thisTextNode) && !isTextNode(thisTextNode)) {
            console.warn("Unexpected node type found at position", expectedTextNodePos);
            return false;
        }

        const { pos: nextParagraphPos, node: nextParagraphNode } = getFirstParagraphInNextPageBodyAfterPos(doc, paragraphPos);
        if (!nextParagraphNode) {
            console.warn("No first paragraph node found in next page.");
            return false;
        }

        const thisNodeEmpty = isNodeEmpty(paragraphNode);
        const nextNodeEmpty = isNodeEmpty(nextParagraphNode);
        if (!nextNodeEmpty) {
            deleteNode(tr, nextParagraphPos, nextParagraphNode);
        }

        appendAndReplaceNode(tr, paragraphPos, paragraphNode, nextParagraphNode);

        if (thisNodeEmpty) {
            const $newPos = tr.doc.resolve(thisPos);
            if (nextNodeEmpty) {
                moveToNextTextBlock(tr, $newPos);
            } else {
                moveToNearestTextSelection(tr, $newPos);
            }
        } else {
            setSelectionAtPos(tr, thisPos);
        }

        dispatch(tr);
        return true;
    },
});

export default KeymapPlugin;
