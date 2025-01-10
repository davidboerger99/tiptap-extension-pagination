/**
 * @file /src/utils/nodes/page/pageCondition.ts
 * @name PageCondition
 * @description Utility functions for page conditions.
 */

import { Node as PMNode, ResolvedPos } from "@tiptap/pm/model";
import { isPosAtEndOfDocument, isPosAtStartOfDocument } from "../document";
import { isPositionWithinParagraph } from "../paragraph";
import { getStartOfBodyAndParagraphPosition, getEndOfBodyAndParagraphPosition } from "../../pagination";

/**
 * Check if the given position is at the start of the page or the first child of the page.
 * @param doc - The document node.
 * @param $pos - The resolved position in the document or the absolute position of the node.
 * @returns {boolean} True if the condition is met, false otherwise.
 */
export const isPosAtStartOfPageBody = (doc: PMNode, $pos: ResolvedPos | number): boolean => {
    return isPosMatchingStartOfPageBodyCondition(doc, $pos, true);
};

/**
 * Check if the given position is at the first paragraph child of the page.
 * @param doc - The document node.
 * @param pos - The resolved position in the document or the absolute position of the node.
 * @returns {boolean} True if the position is at the start of the page, false otherwise.
 */
export const isPosAtFirstChildOfPageBody = (doc: PMNode, $pos: ResolvedPos | number): boolean => {
    return isPosMatchingStartOfPageBodyCondition(doc, $pos, false);
};

/**
 * Check if the given position is exactly at the end of the page.
 * @param doc - The document node.
 * @param pos - The resolved position in the document or the absolute position of the node.
 * @returns {boolean} True if the position is at the end of the page, false otherwise.
 */
export const isPosAtEndOfPageBody = (doc: PMNode, $pos: ResolvedPos | number): boolean => {
    return isPosMatchingEndOfPageBodyCondition(doc, $pos, true);
};

/**
 * Check if the given position is at the last paragraph child of the page.
 * @param doc - The document node.
 * @param pos - The resolved position in the document or the absolute position of the node.
 * @returns {boolean} True if the position is at the end of the page, false otherwise.
 */
export const isPosAtLastChildOfPageBody = (doc: PMNode, $pos: ResolvedPos | number): boolean => {
    return isPosMatchingEndOfPageBodyCondition(doc, $pos, false);
};

/**
 * Check if the given position is at the start of the document.
 * @param doc - The document node.
 * @param pos - The resolved position in the document or the absolute position of the node.
 * @param allowTextBlock - Whether to allow text blocks at the start of the document. Default is false.
 * @returns {boolean} True if the position is at the start of the document, false otherwise.
 */
export const isPosMatchingStartOfPageBodyCondition = (doc: PMNode, $pos: ResolvedPos | number, checkExactStart: boolean): boolean => {
    // Resolve position if given as a number
    if (typeof $pos === "number") {
        return isPosMatchingStartOfPageBodyCondition(doc, doc.resolve($pos), checkExactStart);
    }

    // Check if we are at the start of the document
    if (isPosAtStartOfDocument(doc, $pos, false)) {
        return true;
    }

    // Ensure that the position is within a valid block (paragraph)
    if (!isPositionWithinParagraph($pos)) {
        return false;
    }

    // Get positions for paragraph and page
    const { startOfBodyPos, startOfParagraphPos } = getStartOfBodyAndParagraphPosition(doc, $pos);
    if (startOfBodyPos < 0) {
        console.warn("Invalid body position");
        return false;
    }

    if (startOfParagraphPos < 0) {
        console.warn("Invalid paragraph position");
        return false;
    }

    // Determine the condition to check
    const isFirstParagraph = startOfBodyPos + 1 === startOfParagraphPos;
    if (checkExactStart) {
        // Check if position is exactly at the start of the page
        // First position of page will always be 1 more than the paragraph position
        const isPosAtStartOfParagraph = $pos.pos - 1 === startOfParagraphPos;
        if (isFirstParagraph && isPosAtStartOfParagraph) {
            console.log("At the start of the page body");
            return true;
        }
        console.log("Not at the start of the page body");
        return false;
    } else {
        // Check if position is at the first child of the page body
        if (isFirstParagraph) {
            console.log("In the first child of the page body");
            return true;
        }
        console.log("Not in the first child of the page body");
        return false;
    }
};

/**
 * Check if the given position is at the end of the page or the last child of the page.
 * @param doc - The document node.
 * @param $pos - The resolved position in the document or the absolute position of the node.
 * @param checkExactEnd - Whether to check for the exact end of the page (true) or the last child of the page (false).
 * @returns {boolean} True if the condition is met, false otherwise.
 */
export const isPosMatchingEndOfPageBodyCondition = (doc: PMNode, $pos: ResolvedPos | number, checkExactEnd: boolean): boolean => {
    // Resolve position if given as a number
    if (typeof $pos === "number") {
        return isPosMatchingEndOfPageBodyCondition(doc, doc.resolve($pos), checkExactEnd);
    }

    // Check if we are at the end of the document
    if (isPosAtEndOfDocument(doc, $pos)) {
        return true;
    }

    // Ensure that the position is within a valid block (paragraph)
    if (!isPositionWithinParagraph($pos)) {
        return false;
    }

    // Get positions for paragraph and page
    const { endOfBodyPos, endOfParagraphPos } = getEndOfBodyAndParagraphPosition(doc, $pos);
    if (endOfParagraphPos < 0) {
        console.warn("Invalid end of paragraph position");
        return false;
    }

    if (endOfBodyPos < 0) {
        console.warn("Invalid end of page position");
        return false;
    }

    // Determine the condition to check
    if (checkExactEnd) {
        // Check if position is exactly at the end of the page body
        if ($pos.pos === endOfBodyPos) {
            console.log("At the end of the page body");
            return true;
        }
        console.log("Not at the end of the page body");
        return false;
    } else {
        // Check if position is at the last child of the page body
        if (endOfParagraphPos + 1 === endOfBodyPos) {
            console.log("In the last child of the page body");
            return true;
        }
        console.log("Not in the last child of the page body");
        return false;
    }
};
