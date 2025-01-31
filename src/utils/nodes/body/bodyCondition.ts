/**
 * @file /src/utils/nodes/body/bodyCondition.ts
 * @name BodyCondition
 * @description Utility functions for body conditions.
 */

import { Node as PMNode, ResolvedPos } from "@tiptap/pm/model";
import { isPosAtEndOfDocument, isPosAtStartOfDocument } from "../document";
import { isPositionWithinParagraph } from "../paragraph";
import { getStartOfBodyAndParagraphPosition, getEndOfBodyAndParagraphPosition } from "../../pagination";
import { isAtEndOfNode, isAtStartOfNode } from "../../positionCondition";

/**
 * Check if the given position is exactly at the start of the first child of the body.
 * @param doc - The document node.
 * @param $pos - The resolved position in the document or the absolute position of the node.
 * @returns {boolean} True if the condition is met, false otherwise.
 */
export const isPosAtStartOfBody = (doc: PMNode, $pos: ResolvedPos | number): boolean => {
    return isPosMatchingStartOfBodyCondition(doc, $pos, true);
};

/**
 * Check if the given position is within the first paragraph child of the body.
 * @param doc - The document node.
 * @param pos - The resolved position in the document or the absolute position of the node.
 * @returns {boolean} True if the position is at the start of the body, false otherwise.
 */
export const isPosAtFirstChildOfBody = (doc: PMNode, $pos: ResolvedPos | number): boolean => {
    return isPosMatchingStartOfBodyCondition(doc, $pos, false);
};

/**
 * Check if the given position is exactly at the end of the body.
 * @param doc - The document node.
 * @param pos - The resolved position in the document or the absolute position of the node.
 * @returns {boolean} True if the position is at the end of the body, false otherwise.
 */
export const isPosAtEndOfBody = (doc: PMNode, $pos: ResolvedPos | number): boolean => {
    return isPosMatchingEndOfBodyCondition(doc, $pos, true);
};

/**
 * Check if the given position is at the end of the last paragraph child of the body.
 * @param doc - The document node.
 * @param pos - The resolved position in the document or the absolute position of the node.
 * @returns {boolean} True if the position is at the end of the body, false otherwise.
 */
export const isPosAtLastChildOfBody = (doc: PMNode, $pos: ResolvedPos | number): boolean => {
    return isPosMatchingEndOfBodyCondition(doc, $pos, false);
};

/**
 * Check if the given position is at the start of the document.
 * @param doc - The document node.
 * @param pos - The resolved position in the document or the absolute position of the node.
 * @param checkExactStart - Whether the position must be at the exact start of the body.
 * @returns {boolean} True if the position is at the start of the document, false otherwise.
 */
export const isPosMatchingStartOfBodyCondition = (doc: PMNode, $pos: ResolvedPos | number, checkExactStart: boolean): boolean => {
    // Resolve position if given as a number
    if (typeof $pos === "number") {
        return isPosMatchingStartOfBodyCondition(doc, doc.resolve($pos), checkExactStart);
    }

    // Check if we are at the start of the document
    if (isPosAtStartOfDocument(doc, $pos, false)) {
        return true;
    }

    // Ensure that the position is within a valid block (paragraph)
    if (!isPositionWithinParagraph($pos)) {
        return false;
    }

    // Get positions for paragraph and body
    const { startOfBodyPos, startOfParagraphPos } = getStartOfBodyAndParagraphPosition(doc, $pos);
    if (startOfBodyPos < 0) {
        console.warn("Invalid body position");
        return false;
    }

    if (startOfParagraphPos < 0) {
        console.warn("Invalid paragraph position");
        return false;
    }

    return isAtStartOfNode($pos, startOfBodyPos, startOfParagraphPos, checkExactStart);
};

/**
 * Check if the given position is at the end of the body or the last child of the body.
 * @param doc - The document node.
 * @param $pos - The resolved position in the document or the absolute position of the node.
 * @param checkExactEnd - Whether to check for the exact end of the body (true) or the last child of the body (false).
 * @returns {boolean} True if the condition is met, false otherwise.
 */
export const isPosMatchingEndOfBodyCondition = (doc: PMNode, $pos: ResolvedPos | number, checkExactEnd: boolean): boolean => {
    // Resolve position if given as a number
    if (typeof $pos === "number") {
        return isPosMatchingEndOfBodyCondition(doc, doc.resolve($pos), checkExactEnd);
    }

    // Check if we are at the end of the document
    if (isPosAtEndOfDocument(doc, $pos)) {
        return true;
    }

    // Ensure that the position is within a valid block (paragraph)
    if (!isPositionWithinParagraph($pos)) {
        return false;
    }

    // Get positions for paragraph and body
    const { endOfParagraphPos, endOfBodyPos } = getEndOfBodyAndParagraphPosition(doc, $pos);
    if (endOfParagraphPos < 0) {
        console.warn("Invalid end of paragraph position");
        return false;
    }

    if (endOfBodyPos < 0) {
        console.warn("Invalid end of body position");
        return false;
    }

    return isAtEndOfNode($pos, endOfBodyPos, endOfParagraphPos, checkExactEnd);
};
