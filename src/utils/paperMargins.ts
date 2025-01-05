/**
 * @file /src/utils/paperMargins.ts
 * @name PaperMargins
 * @description Utility functions for paper margins.
 */

import { Dispatch, Editor } from "@tiptap/core";
import { Node as PMNode } from "@tiptap/pm/model";
import { EditorState, Transaction } from "@tiptap/pm/state";
import { DEFAULT_MARGIN_CONFIG } from "../constants/paper";
import { PAGE_NODE_ATTR_KEYS } from "../constants/page";
import { MultiSide, MarginConfig } from "../types/paper";
import { Nullable } from "../types/record";
import { getPageAttribute } from "./page";
import { setPageNodePosSideConfig, updatePageSideConfig } from "./setSideConfig";
import { mm } from "./units";

/**
 * Checks if a (single) margin is valid.
 * Margins must be non-negative and finite to be considered valid.
 * @param margin - The margin to check.
 * @returns {boolean} True if the margin is valid, false otherwise.
 */
export const isMarginValid = (margin: number): boolean => {
    return margin >= 0 && isFinite(margin);
};

/**
 * Checks if the paper margins are valid.
 * Margins must be non-negative and finite to be considered valid.
 * @param paperMargins - The paper margins to check.
 * @returns {boolean} True if the paper margins are valid, false otherwise.
 */
export const isValidPaperMargins = (paperMargins: MarginConfig): boolean => {
    return Object.values(paperMargins).every(isMarginValid);
};

/**
 * Get the paper margins from a page node.
 * @param pageNode - The page node to get the paper margins from.
 * @returns {Nullable<MarginConfig>} The paper margins of the specified page.
 */
export const getPageNodePaperMargins = (pageNode: PMNode): Nullable<MarginConfig> => {
    const { attrs } = pageNode;
    return attrs[PAGE_NODE_ATTR_KEYS.pageMargins];
};

/**
 * Retrieves the paper margin config of a specific page using the editor instance.
 * Falls back to the default paper margin config if the page number is invalid.
 * @param context - The current editor instance or editor state.
 * @param pageNum - The page number to retrieve the paper margin config for.
 * @returns {MarginConfig} The paper margin config of the specified page or default.
 */
export const getPageNumPaperMargins = (context: Editor | EditorState, pageNum: number): MarginConfig => {
    const getDefault = context instanceof Editor ? context.commands.getDefaultPaperMargins : () => DEFAULT_MARGIN_CONFIG;
    return getPageAttribute(context, pageNum, getDefault, getPageNodePaperMargins);
};

/**
 * Converts a margin config to a CSS string using millimeters as the unit.
 * We actually use padding on the page but typically in a document editor,
 * this is referred to as the margin and is hence named as such.
 * @param paperMargins - The paper margins to convert to a CSS string.
 * @returns {string} The CSS string representation of the paper margins. Remember MDN says
 * order is (top, right, bottom, left). See https://developer.mozilla.org/en-US/docs/Web/CSS/padding.
 */
export const calculatePagePadding = (paperMargins: MarginConfig): string => {
    const { top, right, bottom, left } = paperMargins;

    const padding = [top, right, bottom, left].map(mm).join(" ");
    return padding;
};

/**
 * Set the paper margins of a page node.
 * @param tr - The transaction to apply the change to.
 * @param dispatch - The dispatch function to apply the transaction.
 * @param pagePos - The position of the page node to set the paper margins for.
 * @param pageNode - The page node to set the paper margins for.
 * @param paperMargins - The paper margins to set.
 * @returns {boolean} True if the paper margins were set, false otherwise.
 */
export const setPageNodePosPaperMargins = (
    tr: Transaction,
    dispatch: Dispatch,
    pagePos: number,
    pageNode: PMNode,
    paperMargins: MarginConfig
): boolean => {
    return setPageNodePosSideConfig(
        tr,
        dispatch,
        pagePos,
        pageNode,
        paperMargins,
        isValidPaperMargins,
        getPageNodePaperMargins,
        PAGE_NODE_ATTR_KEYS.pageMargins
    );
};

/**
 * Updates the margin on the given page. Does not dispatch the transaction.
 * @param tr - The transaction to apply the change to.
 * @param pagePos - The position of the page node to update the margin for.
 * @param pageNode - The page node to update the margin for.
 * @param margin - The margin to update.
 * @param value - The new value of the margin.
 * @returns {boolean} True if the margin was updated, false otherwise.
 */
export const updatePaperMargin = (
    tr: Transaction,
    pagePos: number,
    pageNode: PMNode,
    margin: Exclude<MultiSide, "all">,
    value: number
): boolean => {
    return updatePageSideConfig(
        tr,
        pagePos,
        pageNode,
        margin,
        value,
        getPageNodePaperMargins,
        isValidPaperMargins,
        DEFAULT_MARGIN_CONFIG,
        PAGE_NODE_ATTR_KEYS.pageMargins
    );
};
