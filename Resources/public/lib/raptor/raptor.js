(function(){;
// File start: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-dependencies/resizetable.js
function countColumns(tableElement) {
    // calculate current number of columns of a table,
    // taking into account rowspans and colspans

    var tr, td, i, j, k, cs, rs;
    var rowspanLeft = new Array();
    var tableCols = 0;
    var tableRows = tableElement.rows.length;
    i = 0;
    while (i < tableRows) {
        var tr = tableElement.rows[i];
        var j = 0;
        var k = 0;
        // Trace and adjust the cells of this row
        while (j < tr.cells.length || k < rowspanLeft.length) {
            if (rowspanLeft[k]) {
                rowspanLeft[k++]--;
            } else if (j >= tr.cells.length) {
                k++;
            } else {
                td = tr.cells[j++];
                rs = Math.max(1, parseInt(td.rowSpan));
                for (cs = Math.max(1, parseInt(td.colSpan)); cs > 0; cs--) {
                    if (rowspanLeft[k])
                        break; // Overlapping colspan and rowspan cells
                    rowspanLeft[k++] = rs - 1;
                }
            }
        }
        tableCols = Math.max(k, tableCols);
        i++;
    }
    return tableCols;
}

function resizeTable(tableElement, rCount, rStart, cCount, cStart, options) {
    // Insert or remove rows and columns in the table, taking into account
    // rowspans and colspans
    // Parameters:
    //   tableElement: DOM element representing existing table to be modified
    //   rCount:       number of rows to add (if >0) or delete (if <0)
    //   rStart:       number of row where rows should be added/deleted
    //   cCount:       number of columns to add (if >0) or delete (if <0)
    //   cStart:       number of column where columns should be added/deleted
    //   cCount
    //   cStart
    var tr, td, i, j, k, l, cs, rs;
    var rowspanLeft = [];
    var rowspanCell = [];
    var tableRows0 = tableElement.rows.length;
    var tableCols0 = countColumns(tableElement);
    var cells = [];

    if (rCount > 0) { // Prep insertion of rows
        for (i = rStart; i < rStart + rCount; i++) {
            tableElement.insertRow(i);
        }
    }
    i = 0;
    while (i < tableRows0) {
        var tr = tableElement.rows[i];
        var j = 0;
        var k = 0;
        // Trace and adjust the cells of this row
        while (k < tableCols0) {
            if (cCount > 0 && k === cStart) { // Insert columns by inserting cells
                for (l = 0; l < cCount; l++) {  // between/before existing cells
                    cells.push(insertEmptyCell(tr, j++, options.placeHolder));
                }
            }
            if (rowspanLeft[k]) {
                if (rCount < 0
                        && i === rStart - rCount && rowspanCell[k]
                        && rowspanCell[k].rowSpan == 1) {
                    // This is the first row after a series of to-be-deleted rows.
                    // Any rowspan-cells covering this row which started in the
                    // to-be-deleted rows have to be moved into this row, with
                    // rowspan adjusted. All such cells are marked td.rowSpan==1.
                    td = rowspanCell[k];
                    if (j >= tr.cells.length) {
                        tr.appendChild(td);
                    } else {
                        tr.insertBefore(td, tr.cells[j]);
                    }
                    j++;
                    rs = td.rowSpan = rowspanLeft[k];
                    for (cs = Math.max(1, parseInt(td.colSpan)); cs > 0; --cs) {
                        rowspanLeft[k++] = rs - 1;
                    }
                } else {
                    if (--rowspanLeft[k++] === 0)
                        rowspanCell[k] = null;
                    while (rowspanLeft[k] && !rowspanCell[k]) {
                        // This is a cell of a block with both rowspan and colspan>1
                        // Handle all remaining cells in this row of the block, so as to
                        // avoid inserting cells which are already covered by the block
                        --rowspanLeft[k++];
                    }
                }
            } else {
                if (j >= tr.cells.length) {
                    cells.push(insertEmptyCell(tr, j, options.placeHolder)); // append missing cell
                }
                td = tr.cells[j++];
                rs = Math.max(1, parseInt(td.rowSpan));
                if (rs > 1) {
                    rowspanCell[k] = td;
                    if (rCount < 0 && i >= rStart && i < rStart - rCount) {//row is to-be-deleted
                        td.rowSpan = 1; // Mark cell as to-be-moved-down-later
                    }
                }
                var k0 = k;
                for (cs = Math.max(1, parseInt(td.colSpan)); cs > 0; --cs) {
                    if (rowspanLeft[k]) { // Overlapping colspan and rowspan cells
                        td.colSpan -= cs; // Set adjustment into table
                        break;
                    }
                    rowspanLeft[k++] = rs - 1;
                }
                if (rCount < 0 && i >= rStart && i < rStart - rCount) {
                    // This row is to be deleted: do not insert/remove columns,
                    // but preserve row as-is so we can move cells down later on
                } else if (cCount > 0 && k > cStart && k0 < cStart) {
                    td.colSpan += cCount; // Insert columns by widening cell
                } else if (cCount < 0 && k0 < cStart - cCount && k > cStart) {
                    // Delete columns in overlap of [k0,k> and [cStart,cStart-cCount>
                    var newColSpan = Math.max(0, cStart - k0) + Math.max(0, k - (cStart - cCount));
                    if (newColSpan) {
                        // .. by reducing width of cell containing to-be-deleted columns
                        td.colSpan = newColSpan;
                    } else {
                        // .. by removing fully-encompassed cell
                        tr.deleteCell(--j);
                    }
                }
            }
        }
        if (cCount > 0 && k === cStart) { // Insert columns by appending cells to row
            for (l = 0; l < cCount; l++) {
                cells.push(insertEmptyCell(tr, j++, options.placeHolder));
            }
        }
        i++;
        if (rCount > 0 && i === rStart) {
            // Adjust rowspans present at start of inserted rows
            for (l = 0; l < tableCols0; l++) {
                if (rowspanLeft[l])
                    rowspanLeft[l] += rCount;
                if (rowspanCell[l])
                    rowspanCell[l].rowSpan += rCount;
            }
        } else if (rCount < 0 && i === rStart) {
            // Adjust rowspans present at start of to-be-deleted rows
            for (l = 0; l < rowspanCell.length; l++) {
                if (rowspanCell[l]) {
                    rowspanCell[l].rowSpan -= Math.min(-rCount, rowspanLeft[l]);
                }
            }
        }
    }
    if (rCount < 0) {
        for (i = rStart; i < rStart - rCount; i++) {
            tableElement.deleteRow(i);
        }
    }
    return cells;
}

function insertEmptyCell(row, index, placeHolder) {
    var sibling, cell;
    // Check the cell's sibling to detect header cells
    if (index > 0) {
        sibling = row.cells[index - 1];
    } else if (index < row.cells.length) {
        sibling = row.cells[index + 1];
    }

    // Header cell
    cell = row.insertCell(index);
    if (sibling && sibling.tagName === 'TH') {
        var header = document.createElement('th');
        if (placeHolder) {
            header.innerHTML = placeHolder;
        }
        $(cell).replaceWith(header)
    } else if (placeHolder) {
        cell.innerHTML = placeHolder;
    }
    return cell;
}
;
// File end: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-dependencies/resizetable.js
;
// File start: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-dependencies/goog-table.js
// Copyright 2008 The Closure Library Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//            http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS-IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

// https://code.google.com/p/closure-library/source/browse/closure/goog/editor/table.js
//
// Modified by David Neilsen <david@panmedia.co.nz>

/**
 * @fileoverview Table editing support.
 * This file provides the class GoogTable and two
 * supporting classes, GoogTableRow and
 * GoogTableCell. Together these provide support for
 * high level table modifications: Adding and deleting rows and columns,
 * and merging and splitting cells.
 *
 * @supported IE6+, WebKit 525+, Firefox 2+.
 */


/**
 * Class providing high level table editing functions.
 * @param {Element} node Element that is a table or descendant of a table.
 * @constructor
 * @final
 */
GoogTable = function(node) {
    this.element = goog.dom.getAncestorByTagNameAndClass(node,
            goog.dom.TagName.TABLE);
    if (!this.element) {
        goog.log.error(this.logger_,
                "Can't create Table based on a node " +
                "that isn't a table, or descended from a table.");
    }
    this.dom_ = goog.dom.getDomHelper(this.element);
    this.refresh();
};


/**
 * Walks the dom structure of this object's table element and populates
 * this.rows with GoogTableRow objects. This is done initially
 * to populate the internal data structures, and also after each time the
 * DOM structure is modified. Currently this means that the all existing
 * information is discarded and re-read from the DOM.
 */
// TODO(user): support partial refresh to save cost of full update
// every time there is a change to the DOM.
GoogTable.prototype.refresh = function() {
    var rows = this.rows = [];
    var tbody = this.element.getElementsByTagName(goog.dom.TagName.TBODY)[0];
    if (!tbody) {
        return;
    }
    var trs = [];
    for (var child = tbody.firstChild; child; child = child.nextSibling) {
        if (child.nodeName == goog.dom.TagName.TR) {
            trs.push(child);
        }
    }

    for (var rowNum = 0, tr; tr = trs[rowNum]; rowNum++) {
        var existingRow = rows[rowNum];
        var tds = GoogTable.getChildCellElements(tr);
        var columnNum = 0;
        // A note on cellNum vs. columnNum: A cell is a td/th element. Cells may
        // use colspan/rowspan to extend over multiple rows/columns. cellNum
        // is the dom element number, columnNum is the logical column number.
        for (var cellNum = 0, td; td = tds[cellNum]; cellNum++) {
            // If there's already a cell extending into this column
            // (due to that cell's colspan/rowspan), increment the column counter.
            while (existingRow && existingRow.columns[columnNum]) {
                columnNum++;
            }
            var cell = new GoogTableCell(td, rowNum, columnNum);
            // Place this cell in every row and column into which it extends.
            for (var i = 0; i < cell.rowSpan; i++) {
                var cellRowNum = rowNum + i;
                // Create TableRow objects in this.rows as needed.
                var cellRow = rows[cellRowNum];
                if (!cellRow) {
                    // TODO(user): try to avoid second trs[] lookup.
                    rows.push(
                            cellRow = new GoogTableRow(trs[cellRowNum], cellRowNum));
                }
                // Extend length of column array to make room for this cell.
                var minimumColumnLength = columnNum + cell.colSpan;
                if (cellRow.columns.length < minimumColumnLength) {
                    cellRow.columns.length = minimumColumnLength;
                }
                for (var j = 0; j < cell.colSpan; j++) {
                    var cellColumnNum = columnNum + j;
                    cellRow.columns[cellColumnNum] = cell;
                }
            }
            columnNum += cell.colSpan;
        }
    }
};


/**
 * Returns all child elements of a TR element that are of type TD or TH.
 * @param {Element} tr TR element in which to find children.
 * @return {Array.<Element>} array of child cell elements.
 */
GoogTable.getChildCellElements = function(tr) {
    var cells = [];
    for (var i = 0, cell; cell = tr.childNodes[i]; i++) {
        if (cell.nodeName == goog.dom.TagName.TD ||
                cell.nodeName == goog.dom.TagName.TH) {
            cells.push(cell);
        }
    }
    return cells;
};


/**
 * Inserts a new row in the table. The row will be populated with new
 * cells, and existing rowspanned cells that overlap the new row will
 * be extended.
 * @param {number=} opt_rowIndex Index at which to insert the row. If
 *         this is omitted the row will be appended to the end of the table.
 * @return {Element} The new row.
 */
GoogTable.prototype.insertRow = function(opt_rowIndex) {
    var rowIndex = goog.isDefAndNotNull(opt_rowIndex) ?
            opt_rowIndex : this.rows.length;
    var refRow;
    var insertAfter;
    if (rowIndex == 0) {
        refRow = this.rows[0];
        insertAfter = false;
    } else {
        refRow = this.rows[rowIndex - 1];
        insertAfter = true;
    }
    var newTr = this.dom_.createElement('tr');
    for (var i = 0, cell; cell = refRow.columns[i]; i += 1) {
        // Check whether the existing cell will span this new row.
        // If so, instead of creating a new cell, extend
        // the rowspan of the existing cell.
        if ((insertAfter && cell.endRow > rowIndex) ||
                (!insertAfter && cell.startRow < rowIndex)) {
            cell.setRowSpan(cell.rowSpan + 1);
            if (cell.colSpan > 1) {
                i += cell.colSpan - 1;
            }
        } else {
            newTr.appendChild(this.createEmptyTd());
        }
        if (insertAfter) {
            goog.dom.insertSiblingAfter(newTr, refRow.element);
        } else {
            goog.dom.insertSiblingBefore(newTr, refRow.element);
        }
    }
    this.refresh();
    return newTr;
};


/**
 * Inserts a new column in the table. The column will be created by
 * inserting new TD elements in each row, or extending the colspan
 * of existing TD elements.
 * @param {number=} opt_colIndex Index at which to insert the column. If
 *         this is omitted the column will be appended to the right side of
 *         the table.
 * @return {Array.<Element>} Array of new cell elements that were created
 *         to populate the new column.
 */
GoogTable.prototype.insertColumn = function(opt_colIndex) {
    // TODO(user): set column widths in a way that makes sense.
    var colIndex = goog.isDefAndNotNull(opt_colIndex) ?
            opt_colIndex :
            (this.rows[0] && this.rows[0].columns.length) || 0;
    var newTds = [];
    for (var rowNum = 0, row; row = this.rows[rowNum]; rowNum++) {
        var existingCell = row.columns[colIndex];
        if (existingCell && existingCell.endCol >= colIndex &&
                existingCell.startCol < colIndex) {
            existingCell.setColSpan(existingCell.colSpan + 1);
            rowNum += existingCell.rowSpan - 1;
        } else {
            var newTd = this.createEmptyTd();
            // TODO(user): figure out a way to intelligently size new columns.
            newTd.style.width = GoogTable.OPTIMUM_EMPTY_CELL_WIDTH + 'px';
            this.insertCellElement(newTd, rowNum, colIndex);
            newTds.push(newTd);
        }
    }
    this.refresh();
    return newTds;
};


/**
 * Removes a row from the table, removing the TR element and
 * decrementing the rowspan of any cells in other rows that overlap the row.
 * @param {number} rowIndex Index of the row to delete.
 */
GoogTable.prototype.removeRow = function(rowIndex) {
    var row = this.rows[rowIndex];
    if (!row) {
        goog.log.warning(this.logger_,
                "Can't remove row at position " + rowIndex + ': no such row.');
    }
    for (var i = 0, cell; cell = row.columns[i]; i += cell.colSpan) {
        if (cell.rowSpan > 1) {
            cell.setRowSpan(cell.rowSpan - 1);
            if (cell.startRow == rowIndex) {
                // Rowspanned cell started in this row - move it down to the next row.
                this.insertCellElement(cell.element, rowIndex + 1, cell.startCol);
            }
        }
    }
    row.element.parentNode.removeChild(row.element);
    this.refresh();
};


/**
 * Removes a column from the table. This is done by removing cell elements,
 * or shrinking the colspan of elements that span multiple columns.
 * @param {number} colIndex Index of the column to delete.
 */
GoogTable.prototype.removeColumn = function(colIndex) {
    for (var i = 0, row; row = this.rows[i]; i++) {
        var cell = row.columns[colIndex];
        if (!cell) {
            goog.log.error(this.logger_,
                    "Can't remove cell at position " + i + ', ' + colIndex +
                    ': no such cell.');
        }
        if (cell.colSpan > 1) {
            cell.setColSpan(cell.colSpan - 1);
        } else {
            cell.element.parentNode.removeChild(cell.element);
        }
        // Skip over following rows that contain this same cell.
        i += cell.rowSpan - 1;
    }
    this.refresh();
};


/**
 * Merges multiple cells into a single cell, and sets the rowSpan and colSpan
 * attributes of the cell to take up the same space as the original cells.
 * @param {number} startRowIndex Top coordinate of the cells to merge.
 * @param {number} startColIndex Left coordinate of the cells to merge.
 * @param {number} endRowIndex Bottom coordinate of the cells to merge.
 * @param {number} endColIndex Right coordinate of the cells to merge.
 * @return {boolean} Whether or not the merge was possible. If the cells
 *         in the supplied coordinates can't be merged this will return false.
 */
GoogTable.prototype.mergeCells = function(
        startRowIndex, startColIndex, endRowIndex, endColIndex) {
    // TODO(user): take a single goog.math.Rect parameter instead?
    var cells = [];
    var cell;
    if (startRowIndex == endRowIndex && startColIndex == endColIndex) {
        goog.log.warning(this.logger_, "Can't merge single cell");
        return false;
    }
    // Gather cells and do sanity check.
    for (var i = startRowIndex; i <= endRowIndex; i++) {
        for (var j = startColIndex; j <= endColIndex; j++) {
            cell = this.rows[i].columns[j];
            if (cell.startRow < startRowIndex ||
                    cell.endRow > endRowIndex ||
                    cell.startCol < startColIndex ||
                    cell.endCol > endColIndex) {
                goog.log.warning(this.logger_,
                        "Can't merge cells: the cell in row " + i + ', column ' + j +
                        'extends outside the supplied rectangle.');
                return false;
            }
            // TODO(user): this is somewhat inefficient, as we will add
            // a reference for a cell for each position, even if it's a single
            // cell with row/colspan.
            cells.push(cell);
        }
    }
    var targetCell = cells[0];
    var targetTd = targetCell.element;
    var doc = this.dom_.getDocument();

    // Merge cell contents and discard other cells.
    for (var i = 1; cell = cells[i]; i++) {
        var td = cell.element;
        if (!td.parentNode || td == targetTd) {
            // We've already handled this cell at one of its previous positions.
            continue;
        }
        // Add a space if needed, to keep merged content from getting squished
        // together.
        if (targetTd.lastChild &&
                targetTd.lastChild.nodeType == goog.dom.NodeType.TEXT) {
            targetTd.appendChild(doc.createTextNode(' '));
        }
        var childNode;
        while ((childNode = td.firstChild)) {
            targetTd.appendChild(childNode);
        }
        td.parentNode.removeChild(td);
    }
    targetCell.setColSpan((endColIndex - startColIndex) + 1);
    targetCell.setRowSpan((endRowIndex - startRowIndex) + 1);
    if (endColIndex > startColIndex) {
        // Clear width on target cell.
        // TODO(user): instead of clearing width, calculate width
        // based on width of input cells
        targetTd.removeAttribute('width');
        targetTd.style.width = null;
    }
    this.refresh();

    return true;
};


/**
 * Splits a cell with colspans or rowspans into multiple descrete cells.
 * @param {number} rowIndex y coordinate of the cell to split.
 * @param {number} colIndex x coordinate of the cell to split.
 * @return {Array.<Element>} Array of new cell elements created by splitting
 *         the cell.
 */
// TODO(user): support splitting only horizontally or vertically,
// support splitting cells that aren't already row/colspanned.
GoogTable.prototype.splitCell = function(rowIndex, colIndex) {
    var row = this.rows[rowIndex];
    var cell = row.columns[colIndex];
    var newTds = [];
    for (var i = 0; i < cell.rowSpan; i++) {
        for (var j = 0; j < cell.colSpan; j++) {
            if (i > 0 || j > 0) {
                var newTd = this.createEmptyTd();
                this.insertCellElement(newTd, rowIndex + i, colIndex + j);
                newTds.push(newTd);
            }
        }
    }
    cell.setColSpan(1);
    cell.setRowSpan(1);
    this.refresh();
    return newTds;
};


/**
 * Inserts a cell element at the given position. The colIndex is the logical
 * column index, not the position in the dom. This takes into consideration
 * that cells in a given logical    row may actually be children of a previous
 * DOM row that have used rowSpan to extend into the row.
 * @param {Element} td The new cell element to insert.
 * @param {number} rowIndex Row in which to insert the element.
 * @param {number} colIndex Column in which to insert the element.
 */
GoogTable.prototype.insertCellElement = function(
        td, rowIndex, colIndex) {
    var row = this.rows[rowIndex];
    var nextSiblingElement = null;
    for (var i = colIndex, cell; cell = row.columns[i]; i += cell.colSpan) {
        if (cell.startRow == rowIndex) {
            nextSiblingElement = cell.element;
            break;
        }
    }
    row.element.insertBefore(td, nextSiblingElement);
};


/**
 * Creates an empty TD element and fill it with some empty content so it will
 * show up with borders even in IE pre-7 or if empty-cells is set to 'hide'
 * @return {Element} a new TD element.
 */
GoogTable.prototype.createEmptyTd = function() {
    // TODO(user): more cross-browser testing to determine best
    // and least annoying filler content.
    return this.dom_.createDom(goog.dom.TagName.TD, {}, goog.string.Unicode.NBSP);
};



/**
 * Class representing a logical table row: a tr element and any cells
 * that appear in that row.
 * @param {Element} trElement This rows's underlying TR element.
 * @param {number} rowIndex This row's index in its parent table.
 * @constructor
 * @final
 */
GoogTableRow = function(trElement, rowIndex) {
    this.index = rowIndex;
    this.element = trElement;
    this.columns = [];
};



/**
 * Class representing a table cell, which may span across multiple
 * rows and columns
 * @param {Element} td This cell's underlying TD or TH element.
 * @param {number} startRow Index of the row where this cell begins.
 * @param {number} startCol Index of the column where this cell begins.
 * @constructor
 * @final
 */
GoogTableCell = function(td, startRow, startCol) {
    this.element = td;
    this.colSpan = parseInt(td.colSpan, 10) || 1;
    this.rowSpan = parseInt(td.rowSpan, 10) || 1;
    this.startRow = startRow;
    this.startCol = startCol;
    this.updateCoordinates_();
};


/**
 * Calculates this cell's endRow/endCol coordinates based on rowSpan/colSpan
 * @private
 */
GoogTableCell.prototype.updateCoordinates_ = function() {
    this.endCol = this.startCol + this.colSpan - 1;
    this.endRow = this.startRow + this.rowSpan - 1;
};


/**
 * Set this cell's colSpan, updating both its colSpan property and the
 * underlying element's colSpan attribute.
 * @param {number} colSpan The new colSpan.
 */
GoogTableCell.prototype.setColSpan = function(colSpan) {
    if (colSpan != this.colSpan) {
        if (colSpan > 1) {
            this.element.colSpan = colSpan;
        } else {
            this.element.colSpan = 1,
            this.element.removeAttribute('colSpan');
        }
        this.colSpan = colSpan;
        this.updateCoordinates_();
    }
};


/**
 * Set this cell's rowSpan, updating both its rowSpan property and the
 * underlying element's rowSpan attribute.
 * @param {number} rowSpan The new rowSpan.
 */
GoogTableCell.prototype.setRowSpan = function(rowSpan) {
    if (rowSpan != this.rowSpan) {
        if (rowSpan > 1) {
            this.element.rowSpan = rowSpan.toString();
        } else {
            this.element.rowSpan = '1';
            this.element.removeAttribute('rowSpan');
        }
        this.rowSpan = rowSpan;
        this.updateCoordinates_();
    }
};


/**
 * Optimum size of empty cells (in pixels), if possible.
 * @type {number}
 */
GoogTable.OPTIMUM_EMPTY_CELL_WIDTH = 60;


/**
 * Maximum width for new tables.
 * @type {number}
 */
GoogTable.OPTIMUM_MAX_NEW_TABLE_WIDTH = 600;


/**
 * Default color for table borders.
 * @type {string}
 */
GoogTable.DEFAULT_BORDER_COLOR = '#888';


/**
 * Creates a new table element, populated with cells and formatted.
 * @param {Document} doc Document in which to create the table element.
 * @param {number} columns Number of columns in the table.
 * @param {number} rows Number of rows in the table.
 * @param {Object=} opt_tableStyle Object containing borderWidth and borderColor
 *        properties, used to set the inital style of the table.
 * @return {Element} a table element.
 */
GoogTable.createDomTable = function(
        doc, columns, rows, opt_tableStyle) {
    // TODO(user): define formatting properties as constants,
    // make separate formatTable() function
    var style = {
        borderWidth: '1',
        borderColor: GoogTable.DEFAULT_BORDER_COLOR
    };
    for (var prop in opt_tableStyle) {
        style[prop] = opt_tableStyle[prop];
    }
    var dom = new goog.dom.DomHelper(doc);
    var tableElement = dom.createTable(rows, columns, true);

    var minimumCellWidth = 10;
    // Calculate a good cell width.
    var cellWidth = Math.max(
            minimumCellWidth,
            Math.min(GoogTable.OPTIMUM_EMPTY_CELL_WIDTH,
                             GoogTable.OPTIMUM_MAX_NEW_TABLE_WIDTH / columns));

    var tds = tableElement.getElementsByTagName(goog.dom.TagName.TD);
    for (var i = 0, td; td = tds[i]; i++) {
        td.style.width = cellWidth + 'px';
    }

    // Set border somewhat redundantly to make sure they show
    // up correctly in all browsers.
    goog.style.setStyle(
            tableElement, {
                'borderCollapse': 'collapse',
                'borderColor': style.borderColor,
                'borderWidth': style.borderWidth + 'px'
            });
    tableElement.border = style.borderWidth;
    tableElement.setAttribute('bordercolor', style.borderColor);
    tableElement.setAttribute('cellspacing', '0');

    return tableElement;
};
;
// File end: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-dependencies/goog-table.js
;
// File start: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-dependencies/plupload.js
/*1.5.7*/
(function() {
    var f = 0, k = [], m = {}, i = {}, a = {"<": "lt", ">": "gt", "&": "amp", '"': "quot", "'": "#39"}, l = /[<>&\"\']/g, b, c = window.setTimeout, d = {}, e;
    function h() {
        this.returnValue = false
    }
    function j() {
        this.cancelBubble = true
    }
    (function(n) {
        var o = n.split(/,/), p, r, q;
        for (p = 0; p < o.length; p += 2) {
            q = o[p + 1].split(/ /);
            for (r = 0; r < q.length; r++) {
                i[q[r]] = o[p]
            }
        }
    })("application/msword,doc dot,application/pdf,pdf,application/pgp-signature,pgp,application/postscript,ps ai eps,application/rtf,rtf,application/vnd.ms-excel,xls xlb,application/vnd.ms-powerpoint,ppt pps pot,application/zip,zip,application/x-shockwave-flash,swf swfl,application/vnd.openxmlformats-officedocument.wordprocessingml.document,docx,application/vnd.openxmlformats-officedocument.wordprocessingml.template,dotx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,xlsx,application/vnd.openxmlformats-officedocument.presentationml.presentation,pptx,application/vnd.openxmlformats-officedocument.presentationml.template,potx,application/vnd.openxmlformats-officedocument.presentationml.slideshow,ppsx,application/x-javascript,js,application/json,json,audio/mpeg,mpga mpega mp2 mp3,audio/x-wav,wav,audio/mp4,m4a,image/bmp,bmp,image/gif,gif,image/jpeg,jpeg jpg jpe,image/photoshop,psd,image/png,png,image/svg+xml,svg svgz,image/tiff,tiff tif,text/plain,asc txt text diff log,text/html,htm html xhtml,text/css,css,text/csv,csv,text/rtf,rtf,video/mpeg,mpeg mpg mpe m2v,video/quicktime,qt mov,video/mp4,mp4,video/x-m4v,m4v,video/x-flv,flv,video/x-ms-wmv,wmv,video/avi,avi,video/webm,webm,video/3gpp,3gp,video/3gpp2,3g2,video/vnd.rn-realvideo,rv,application/vnd.oasis.opendocument.formula-template,otf,application/octet-stream,exe");
    var g = {VERSION: "1.5.7", STOPPED: 1, STARTED: 2, QUEUED: 1, UPLOADING: 2, FAILED: 4, DONE: 5, GENERIC_ERROR: -100, HTTP_ERROR: -200, IO_ERROR: -300, SECURITY_ERROR: -400, INIT_ERROR: -500, FILE_SIZE_ERROR: -600, FILE_EXTENSION_ERROR: -601, IMAGE_FORMAT_ERROR: -700, IMAGE_MEMORY_ERROR: -701, IMAGE_DIMENSIONS_ERROR: -702, mimeTypes: i, ua: (function() {
            var r = navigator, q = r.userAgent, s = r.vendor, o, n, p;
            o = /WebKit/.test(q);
            p = o && s.indexOf("Apple") !== -1;
            n = window.opera && window.opera.buildNumber;
            return{windows: navigator.platform.indexOf("Win") !== -1, android: /Android/.test(q), ie: !o && !n && (/MSIE/gi).test(q) && (/Explorer/gi).test(r.appName), webkit: o, gecko: !o && /Gecko/.test(q), safari: p, opera: !!n}
        }()), typeOf: function(n) {
            return({}).toString.call(n).match(/\s([a-z|A-Z]+)/)[1].toLowerCase()
        }, extend: function(n) {
            g.each(arguments, function(o, p) {
                if (p > 0) {
                    g.each(o, function(r, q) {
                        n[q] = r
                    })
                }
            });
            return n
        }, cleanName: function(n) {
            var o, p;
            p = [/[\300-\306]/g, "A", /[\340-\346]/g, "a", /\307/g, "C", /\347/g, "c", /[\310-\313]/g, "E", /[\350-\353]/g, "e", /[\314-\317]/g, "I", /[\354-\357]/g, "i", /\321/g, "N", /\361/g, "n", /[\322-\330]/g, "O", /[\362-\370]/g, "o", /[\331-\334]/g, "U", /[\371-\374]/g, "u"];
            for (o = 0; o < p.length; o += 2) {
                n = n.replace(p[o], p[o + 1])
            }
            n = n.replace(/\s+/g, "_");
            n = n.replace(/[^a-z0-9_\-\.]+/gi, "");
            return n
        }, addRuntime: function(n, o) {
            o.name = n;
            k[n] = o;
            k.push(o);
            return o
        }, guid: function() {
            var n = new Date().getTime().toString(32), o;
            for (o = 0; o < 5; o++) {
                n += Math.floor(Math.random() * 65535).toString(32)
            }
            return(g.guidPrefix || "p") + n + (f++).toString(32)
        }, buildUrl: function(o, n) {
            var p = "";
            g.each(n, function(r, q) {
                p += (p ? "&" : "") + encodeURIComponent(q) + "=" + encodeURIComponent(r)
            });
            if (p) {
                o += (o.indexOf("?") > 0 ? "&" : "?") + p
            }
            return o
        }, each: function(q, r) {
            var p, o, n;
            if (q) {
                p = q.length;
                if (p === b) {
                    for (o in q) {
                        if (q.hasOwnProperty(o)) {
                            if (r(q[o], o) === false) {
                                return
                            }
                        }
                    }
                } else {
                    for (n = 0; n < p; n++) {
                        if (r(q[n], n) === false) {
                            return
                        }
                    }
                }
            }
        }, formatSize: function(n) {
            if (n === b || /\D/.test(n)) {
                return g.translate("N/A")
            }
            if (n > 1073741824) {
                return Math.round(n / 1073741824, 1) + " GB"
            }
            if (n > 1048576) {
                return Math.round(n / 1048576, 1) + " MB"
            }
            if (n > 1024) {
                return Math.round(n / 1024, 1) + " KB"
            }
            return n + " b"
        }, getPos: function(o, s) {
            var t = 0, r = 0, v, u = document, p, q;
            o = o;
            s = s || u.body;
            function n(B) {
                var z, A, w = 0, C = 0;
                if (B) {
                    A = B.getBoundingClientRect();
                    z = u.compatMode === "CSS1Compat" ? u.documentElement : u.body;
                    w = A.left + z.scrollLeft;
                    C = A.top + z.scrollTop
                }
                return{x: w, y: C}
            }
            if (o && o.getBoundingClientRect && g.ua.ie && (!u.documentMode || u.documentMode < 8)) {
                p = n(o);
                q = n(s);
                return{x: p.x - q.x, y: p.y - q.y}
            }
            v = o;
            while (v && v != s && v.nodeType) {
                t += v.offsetLeft || 0;
                r += v.offsetTop || 0;
                v = v.offsetParent
            }
            v = o.parentNode;
            while (v && v != s && v.nodeType) {
                t -= v.scrollLeft || 0;
                r -= v.scrollTop || 0;
                v = v.parentNode
            }
            return{x: t, y: r}
        }, getSize: function(n) {
            return{w: n.offsetWidth || n.clientWidth, h: n.offsetHeight || n.clientHeight}
        }, parseSize: function(n) {
            var o;
            if (typeof (n) == "string") {
                n = /^([0-9]+)([mgk]?)$/.exec(n.toLowerCase().replace(/[^0-9mkg]/g, ""));
                o = n[2];
                n = +n[1];
                if (o == "g") {
                    n *= 1073741824
                }
                if (o == "m") {
                    n *= 1048576
                }
                if (o == "k") {
                    n *= 1024
                }
            }
            return n
        }, xmlEncode: function(n) {
            return n ? ("" + n).replace(l, function(o) {
                return a[o] ? "&" + a[o] + ";" : o
            }) : n
        }, toArray: function(p) {
            var o, n = [];
            for (o = 0; o < p.length; o++) {
                n[o] = p[o]
            }
            return n
        }, inArray: function(p, q) {
            if (q) {
                if (Array.prototype.indexOf) {
                    return Array.prototype.indexOf.call(q, p)
                }
                for (var n = 0, o = q.length; n < o; n++) {
                    if (q[n] === p) {
                        return n
                    }
                }
            }
            return -1
        }, addI18n: function(n) {
            return g.extend(m, n)
        }, translate: function(n) {
            return m[n] || n
        }, isEmptyObj: function(n) {
            if (n === b) {
                return true
            }
            for (var o in n) {
                return false
            }
            return true
        }, hasClass: function(p, o) {
            var n;
            if (p.className == "") {
                return false
            }
            n = new RegExp("(^|\\s+)" + o + "(\\s+|$)");
            return n.test(p.className)
        }, addClass: function(o, n) {
            if (!g.hasClass(o, n)) {
                o.className = o.className == "" ? n : o.className.replace(/\s+$/, "") + " " + n
            }
        }, removeClass: function(p, o) {
            var n = new RegExp("(^|\\s+)" + o + "(\\s+|$)");
            p.className = p.className.replace(n, function(r, q, s) {
                return q === " " && s === " " ? " " : ""
            })
        }, getStyle: function(o, n) {
            if (o.currentStyle) {
                return o.currentStyle[n]
            } else {
                if (window.getComputedStyle) {
                    return window.getComputedStyle(o, null)[n]
                }
            }
        }, addEvent: function(s, n, t) {
            var r, q, p, o;
            o = arguments[3];
            n = n.toLowerCase();
            if (e === b) {
                e = "Plupload_" + g.guid()
            }
            if (s.addEventListener) {
                r = t;
                s.addEventListener(n, r, false)
            } else {
                if (s.attachEvent) {
                    r = function() {
                        var u = window.event;
                        if (!u.target) {
                            u.target = u.srcElement
                        }
                        u.preventDefault = h;
                        u.stopPropagation = j;
                        t(u)
                    };
                    s.attachEvent("on" + n, r)
                }
            }
            if (s[e] === b) {
                s[e] = g.guid()
            }
            if (!d.hasOwnProperty(s[e])) {
                d[s[e]] = {}
            }
            q = d[s[e]];
            if (!q.hasOwnProperty(n)) {
                q[n] = []
            }
            q[n].push({func: r, orig: t, key: o})
        }, removeEvent: function(s, n) {
            var q, t, p;
            if (typeof (arguments[2]) == "function") {
                t = arguments[2]
            } else {
                p = arguments[2]
            }
            n = n.toLowerCase();
            if (s[e] && d[s[e]] && d[s[e]][n]) {
                q = d[s[e]][n]
            } else {
                return
            }
            for (var o = q.length - 1; o >= 0; o--) {
                if (q[o].key === p || q[o].orig === t) {
                    if (s.removeEventListener) {
                        s.removeEventListener(n, q[o].func, false)
                    } else {
                        if (s.detachEvent) {
                            s.detachEvent("on" + n, q[o].func)
                        }
                    }
                    q[o].orig = null;
                    q[o].func = null;
                    q.splice(o, 1);
                    if (t !== b) {
                        break
                    }
                }
            }
            if (!q.length) {
                delete d[s[e]][n]
            }
            if (g.isEmptyObj(d[s[e]])) {
                delete d[s[e]];
                try {
                    delete s[e]
                } catch (r) {
                    s[e] = b
                }
            }
        }, removeAllEvents: function(o) {
            var n = arguments[1];
            if (o[e] === b || !o[e]) {
                return
            }
            g.each(d[o[e]], function(q, p) {
                g.removeEvent(o, p, n)
            })
        }};
    g.Uploader = function(r) {
        var o = {}, u, t = [], q, p = false;
        u = new g.QueueProgress();
        r = g.extend({chunk_size: 0, multipart: true, multi_selection: true, file_data_name: "file", filters: []}, r);
        function s() {
            var w, x = 0, v;
            if (this.state == g.STARTED) {
                for (v = 0; v < t.length; v++) {
                    if (!w && t[v].status == g.QUEUED) {
                        w = t[v];
                        w.status = g.UPLOADING;
                        if (this.trigger("BeforeUpload", w)) {
                            this.trigger("UploadFile", w)
                        }
                    } else {
                        x++
                    }
                }
                if (x == t.length) {
                    this.stop();
                    this.trigger("UploadComplete", t)
                }
            }
        }
        function n() {
            var w, v;
            u.reset();
            for (w = 0; w < t.length; w++) {
                v = t[w];
                if (v.size !== b) {
                    u.size += v.size;
                    u.loaded += v.loaded
                } else {
                    u.size = b
                }
                if (v.status == g.DONE) {
                    u.uploaded++
                } else {
                    if (v.status == g.FAILED) {
                        u.failed++
                    } else {
                        u.queued++
                    }
                }
            }
            if (u.size === b) {
                u.percent = t.length > 0 ? Math.ceil(u.uploaded / t.length * 100) : 0
            } else {
                u.bytesPerSec = Math.ceil(u.loaded / ((+new Date() - q || 1) / 1000));
                u.percent = u.size > 0 ? Math.ceil(u.loaded / u.size * 100) : 0
            }
        }
        g.extend(this, {state: g.STOPPED, runtime: "", features: {}, files: t, settings: r, total: u, id: g.guid(), init: function() {
                var A = this, B, x, w, z = 0, y;
                if (typeof (r.preinit) == "function") {
                    r.preinit(A)
                } else {
                    g.each(r.preinit, function(D, C) {
                        A.bind(C, D)
                    })
                }
                r.page_url = r.page_url || document.location.pathname.replace(/\/[^\/]+$/g, "/");
                if (!/^(\w+:\/\/|\/)/.test(r.url)) {
                    r.url = r.page_url + r.url
                }
                r.chunk_size = g.parseSize(r.chunk_size);
                r.max_file_size = g.parseSize(r.max_file_size);
                A.bind("FilesAdded", function(C, F) {
                    var E, D, H = 0, I, G = r.filters;
                    if (G && G.length) {
                        I = [];
                        g.each(G, function(J) {
                            g.each(J.extensions.split(/,/), function(K) {
                                if (/^\s*\*\s*$/.test(K)) {
                                    I.push("\\.*")
                                } else {
                                    I.push("\\." + K.replace(new RegExp("[" + ("/^$.*+?|()[]{}\\".replace(/./g, "\\$&")) + "]", "g"), "\\$&"))
                                }
                            })
                        });
                        I = new RegExp(I.join("|") + "$", "i")
                    }
                    for (E = 0; E < F.length; E++) {
                        D = F[E];
                        D.loaded = 0;
                        D.percent = 0;
                        D.status = g.QUEUED;
                        if (I && !I.test(D.name)) {
                            C.trigger("Error", {code: g.FILE_EXTENSION_ERROR, message: g.translate("File extension error."), file: D});
                            continue
                        }
                        if (D.size !== b && D.size > r.max_file_size) {
                            C.trigger("Error", {code: g.FILE_SIZE_ERROR, message: g.translate("File size error."), file: D});
                            continue
                        }
                        t.push(D);
                        H++
                    }
                    if (H) {
                        c(function() {
                            A.trigger("QueueChanged");
                            A.refresh()
                        }, 1)
                    } else {
                        return false
                    }
                });
                if (r.unique_names) {
                    A.bind("UploadFile", function(C, D) {
                        var F = D.name.match(/\.([^.]+)$/), E = "tmp";
                        if (F) {
                            E = F[1]
                        }
                        D.target_name = D.id + "." + E
                    })
                }
                A.bind("UploadProgress", function(C, D) {
                    D.percent = D.size > 0 ? Math.ceil(D.loaded / D.size * 100) : 100;
                    n()
                });
                A.bind("StateChanged", function(C) {
                    if (C.state == g.STARTED) {
                        q = (+new Date())
                    } else {
                        if (C.state == g.STOPPED) {
                            for (B = C.files.length - 1; B >= 0; B--) {
                                if (C.files[B].status == g.UPLOADING) {
                                    C.files[B].status = g.QUEUED;
                                    n()
                                }
                            }
                        }
                    }
                });
                A.bind("QueueChanged", n);
                A.bind("Error", function(C, D) {
                    if (D.file) {
                        D.file.status = g.FAILED;
                        n();
                        if (C.state == g.STARTED) {
                            c(function() {
                                s.call(A)
                            }, 1)
                        }
                    }
                });
                A.bind("FileUploaded", function(C, D) {
                    D.status = g.DONE;
                    D.loaded = D.size;
                    C.trigger("UploadProgress", D);
                    c(function() {
                        s.call(A)
                    }, 1)
                });
                if (r.runtimes) {
                    x = [];
                    y = r.runtimes.split(/\s?,\s?/);
                    for (B = 0; B < y.length; B++) {
                        if (k[y[B]]) {
                            x.push(k[y[B]])
                        }
                    }
                } else {
                    x = k
                }
                function v() {
                    var F = x[z++], E, C, D;
                    if (F) {
                        E = F.getFeatures();
                        C = A.settings.required_features;
                        if (C) {
                            C = C.split(",");
                            for (D = 0; D < C.length; D++) {
                                if (!E[C[D]]) {
                                    v();
                                    return
                                }
                            }
                        }
                        F.init(A, function(G) {
                            if (G && G.success) {
                                A.features = E;
                                A.runtime = F.name;
                                A.trigger("Init", {runtime: F.name});
                                A.trigger("PostInit");
                                A.refresh()
                            } else {
                                v()
                            }
                        })
                    } else {
                        A.trigger("Error", {code: g.INIT_ERROR, message: g.translate("Init error.")})
                    }
                }
                v();
                if (typeof (r.init) == "function") {
                    r.init(A)
                } else {
                    g.each(r.init, function(D, C) {
                        A.bind(C, D)
                    })
                }
            }, refresh: function() {
                this.trigger("Refresh")
            }, start: function() {
                if (t.length && this.state != g.STARTED) {
                    this.state = g.STARTED;
                    this.trigger("StateChanged");
                    s.call(this)
                }
            }, stop: function() {
                if (this.state != g.STOPPED) {
                    this.state = g.STOPPED;
                    this.trigger("CancelUpload");
                    this.trigger("StateChanged")
                }
            }, disableBrowse: function() {
                p = arguments[0] !== b ? arguments[0] : true;
                this.trigger("DisableBrowse", p)
            }, getFile: function(w) {
                var v;
                for (v = t.length - 1; v >= 0; v--) {
                    if (t[v].id === w) {
                        return t[v]
                    }
                }
            }, removeFile: function(w) {
                var v;
                for (v = t.length - 1; v >= 0; v--) {
                    if (t[v].id === w.id) {
                        return this.splice(v, 1)[0]
                    }
                }
            }, splice: function(x, v) {
                var w;
                w = t.splice(x === b ? 0 : x, v === b ? t.length : v);
                this.trigger("FilesRemoved", w);
                this.trigger("QueueChanged");
                return w
            }, trigger: function(w) {
                var y = o[w.toLowerCase()], x, v;
                if (y) {
                    v = Array.prototype.slice.call(arguments);
                    v[0] = this;
                    for (x = 0; x < y.length; x++) {
                        if (y[x].func.apply(y[x].scope, v) === false) {
                            return false
                        }
                    }
                }
                return true
            }, hasEventListener: function(v) {
                return !!o[v.toLowerCase()]
            }, bind: function(v, x, w) {
                var y;
                v = v.toLowerCase();
                y = o[v] || [];
                y.push({func: x, scope: w || this});
                o[v] = y
            }, unbind: function(v) {
                v = v.toLowerCase();
                var y = o[v], w, x = arguments[1];
                if (y) {
                    if (x !== b) {
                        for (w = y.length - 1; w >= 0; w--) {
                            if (y[w].func === x) {
                                y.splice(w, 1);
                                break
                            }
                        }
                    } else {
                        y = []
                    }
                    if (!y.length) {
                        delete o[v]
                    }
                }
            }, unbindAll: function() {
                var v = this;
                g.each(o, function(x, w) {
                    v.unbind(w)
                })
            }, destroy: function() {
                this.stop();
                this.trigger("Destroy");
                this.unbindAll()
            }})
    };
    g.File = function(q, o, p) {
        var n = this;
        n.id = q;
        n.name = o;
        n.size = p;
        n.loaded = 0;
        n.percent = 0;
        n.status = 0
    };
    g.Runtime = function() {
        this.getFeatures = function() {
        };
        this.init = function(n, o) {
        }
    };
    g.QueueProgress = function() {
        var n = this;
        n.size = 0;
        n.loaded = 0;
        n.uploaded = 0;
        n.failed = 0;
        n.queued = 0;
        n.percent = 0;
        n.bytesPerSec = 0;
        n.reset = function() {
            n.size = n.loaded = n.uploaded = n.failed = n.queued = n.percent = n.bytesPerSec = 0
        }
    };
    g.runtimes = {};
    window.plupload = g
})();;
// File end: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-dependencies/plupload.js
;
// File start: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-dependencies/plupload.html4.js
(function(d,a,b,c){function e(f){return a.getElementById(f)}b.runtimes.Html4=b.addRuntime("html4",{getFeatures:function(){return{multipart:true,triggerDialog:(b.ua.gecko&&d.FormData||b.ua.webkit)}},init:function(f,g){f.bind("Init",function(p){var j=a.body,n,h="javascript",k,x,q,z=[],r=/MSIE/.test(navigator.userAgent),t=[],m=p.settings.filters,o,l,s,w;no_type_restriction:for(o=0;o<m.length;o++){l=m[o].extensions.split(/,/);for(w=0;w<l.length;w++){if(l[w]==="*"){t=[];break no_type_restriction}s=b.mimeTypes[l[w]];if(s&&b.inArray(s,t)===-1){t.push(s)}}}t=t.join(",");function v(){var B,y,i,A;q=b.guid();z.push(q);B=a.createElement("form");B.setAttribute("id","form_"+q);B.setAttribute("method","post");B.setAttribute("enctype","multipart/form-data");B.setAttribute("encoding","multipart/form-data");B.setAttribute("target",p.id+"_iframe");B.style.position="absolute";y=a.createElement("input");y.setAttribute("id","input_"+q);y.setAttribute("type","file");y.setAttribute("accept",t);y.setAttribute("size",1);A=e(p.settings.browse_button);if(p.features.triggerDialog&&A){b.addEvent(e(p.settings.browse_button),"click",function(C){if(!y.disabled){y.click()}C.preventDefault()},p.id)}b.extend(y.style,{width:"100%",height:"100%",opacity:0,fontSize:"99px",cursor:"pointer"});b.extend(B.style,{overflow:"hidden"});i=p.settings.shim_bgcolor;if(i){B.style.background=i}if(r){b.extend(y.style,{filter:"alpha(opacity=0)"})}b.addEvent(y,"change",function(F){var D=F.target,C,E=[],G;if(D.value){e("form_"+q).style.top=-1048575+"px";C=D.value.replace(/\\/g,"/");C=C.substring(C.length,C.lastIndexOf("/")+1);E.push(new b.File(q,C));if(!p.features.triggerDialog){b.removeAllEvents(B,p.id)}else{b.removeEvent(A,"click",p.id)}b.removeEvent(y,"change",p.id);v();if(E.length){f.trigger("FilesAdded",E)}}},p.id);B.appendChild(y);j.appendChild(B);p.refresh()}function u(){var i=a.createElement("div");i.innerHTML='<iframe id="'+p.id+'_iframe" name="'+p.id+'_iframe" src="'+h+':&quot;&quot;" style="display:none"></iframe>';n=i.firstChild;j.appendChild(n);b.addEvent(n,"load",function(C){var D=C.target,B,y;if(!k){return}try{B=D.contentWindow.document||D.contentDocument||d.frames[D.id].document}catch(A){p.trigger("Error",{code:b.SECURITY_ERROR,message:b.translate("Security error."),file:k});return}y=B.documentElement.innerText||B.documentElement.textContent;if(y){k.status=b.DONE;k.loaded=1025;k.percent=100;p.trigger("UploadProgress",k);p.trigger("FileUploaded",k,{response:y})}},p.id)}if(p.settings.container){j=e(p.settings.container);if(b.getStyle(j,"position")==="static"){j.style.position="relative"}}p.bind("UploadFile",function(i,A){var B,y;if(A.status==b.DONE||A.status==b.FAILED||i.state==b.STOPPED){return}B=e("form_"+A.id);y=e("input_"+A.id);y.setAttribute("name",i.settings.file_data_name);B.setAttribute("action",i.settings.url);b.each(b.extend({name:A.target_name||A.name},i.settings.multipart_params),function(E,C){var D=a.createElement("input");b.extend(D,{type:"hidden",name:C,value:E});B.insertBefore(D,B.firstChild)});k=A;e("form_"+q).style.top=-1048575+"px";B.submit()});p.bind("FileUploaded",function(i){i.refresh()});p.bind("StateChanged",function(i){if(i.state==b.STARTED){u()}else{if(i.state==b.STOPPED){d.setTimeout(function(){b.removeEvent(n,"load",i.id);if(n.parentNode){n.parentNode.removeChild(n)}},0)}}b.each(i.files,function(A,y){if(A.status===b.DONE||A.status===b.FAILED){var B=e("form_"+A.id);if(B){B.parentNode.removeChild(B)}}})});p.bind("Refresh",function(y){var F,A,B,C,i,G,H,E,D;F=e(y.settings.browse_button);if(F){i=b.getPos(F,e(y.settings.container));G=b.getSize(F);H=e("form_"+q);E=e("input_"+q);b.extend(H.style,{top:i.y+"px",left:i.x+"px",width:G.w+"px",height:G.h+"px"});if(y.features.triggerDialog){if(b.getStyle(F,"position")==="static"){b.extend(F.style,{position:"relative"})}D=parseInt(F.style.zIndex,10);if(isNaN(D)){D=0}b.extend(F.style,{zIndex:D});b.extend(H.style,{zIndex:D-1})}B=y.settings.browse_button_hover;C=y.settings.browse_button_active;A=y.features.triggerDialog?F:H;if(B){b.addEvent(A,"mouseover",function(){b.addClass(F,B)},y.id);b.addEvent(A,"mouseout",function(){b.removeClass(F,B)},y.id)}if(C){b.addEvent(A,"mousedown",function(){b.addClass(F,C)},y.id);b.addEvent(a.body,"mouseup",function(){b.removeClass(F,C)},y.id)}}});f.bind("FilesRemoved",function(y,B){var A,C;for(A=0;A<B.length;A++){C=e("form_"+B[A].id);if(C){C.parentNode.removeChild(C)}}});f.bind("DisableBrowse",function(i,A){var y=a.getElementById("input_"+q);if(y){y.disabled=A}});f.bind("Destroy",function(i){var y,A,B,C={inputContainer:"form_"+q,inputFile:"input_"+q,browseButton:i.settings.browse_button};for(y in C){A=e(C[y]);if(A){b.removeAllEvents(A,i.id)}}b.removeAllEvents(a.body,i.id);b.each(z,function(E,D){B=e("form_"+E);if(B){B.parentNode.removeChild(B)}})});v()});g({success:true})}})})(window,document,plupload);;
// File end: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-dependencies/plupload.html4.js
;
// File start: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-dependencies/plupload.html5.js
(function(k,m,l,g){var d={},j;function c(s){var r=s.naturalWidth,u=s.naturalHeight;if(r*u>1024*1024){var t=m.createElement("canvas");t.width=t.height=1;var q=t.getContext("2d");q.drawImage(s,-r+1,0);return q.getImageData(0,0,1,1).data[3]===0}else{return false}}function f(u,r,z){var q=m.createElement("canvas");q.width=1;q.height=z;var A=q.getContext("2d");A.drawImage(u,0,0);var t=A.getImageData(0,0,1,z).data;var x=0;var v=z;var y=z;while(y>x){var s=t[(y-1)*4+3];if(s===0){v=y}else{x=y}y=(v+x)>>1}var w=(y/z);return(w===0)?1:w}function o(K,s,t){var v=K.naturalWidth,z=K.naturalHeight;var E=t.width,B=t.height;var F=s.getContext("2d");F.save();var r=c(K);if(r){v/=2;z/=2}var I=1024;var q=m.createElement("canvas");q.width=q.height=I;var u=q.getContext("2d");var G=f(K,v,z);var A=0;while(A<z){var J=A+I>z?z-A:I;var C=0;while(C<v){var D=C+I>v?v-C:I;u.clearRect(0,0,I,I);u.drawImage(K,-C,-A);var x=(C*E/v)<<0;var y=Math.ceil(D*E/v);var w=(A*B/z/G)<<0;var H=Math.ceil(J*B/z/G);F.drawImage(q,0,0,D,J,x,w,y,H);C+=I}A+=I}F.restore();q=u=null}function p(r,s){var q;if("FileReader" in k){q=new FileReader();q.readAsDataURL(r);q.onload=function(){s(q.result)}}else{return s(r.getAsDataURL())}}function n(r,s){var q;if("FileReader" in k){q=new FileReader();q.readAsBinaryString(r);q.onload=function(){s(q.result)}}else{return s(r.getAsBinary())}}function e(u,s,q,y){var t,r,x,v,w=this;p(d[u.id],function(z){t=m.createElement("canvas");t.style.display="none";m.body.appendChild(t);x=new Image();x.onerror=x.onabort=function(){y({success:false})};x.onload=function(){var F,A,C,B,E;if(!s.width){s.width=x.width}if(!s.height){s.height=x.height}v=Math.min(s.width/x.width,s.height/x.height);if(v<1){F=Math.round(x.width*v);A=Math.round(x.height*v)}else{if(s.quality&&q==="image/jpeg"){F=x.width;A=x.height}else{y({success:false});return}}t.width=F;t.height=A;o(x,t,{width:F,height:A});if(q==="image/jpeg"){B=new h(atob(z.substring(z.indexOf("base64,")+7)));if(B.headers&&B.headers.length){E=new a();if(E.init(B.get("exif")[0])){E.setExif("PixelXDimension",F);E.setExif("PixelYDimension",A);B.set("exif",E.getBinary());if(w.hasEventListener("ExifData")){w.trigger("ExifData",u,E.EXIF())}if(w.hasEventListener("GpsData")){w.trigger("GpsData",u,E.GPS())}}}}if(s.quality&&q==="image/jpeg"){try{z=t.toDataURL(q,s.quality/100)}catch(D){z=t.toDataURL(q)}}else{z=t.toDataURL(q)}z=z.substring(z.indexOf("base64,")+7);z=atob(z);if(B&&B.headers&&B.headers.length){z=B.restore(z);B.purge()}t.parentNode.removeChild(t);y({success:true,data:z})};x.src=z})}l.runtimes.Html5=l.addRuntime("html5",{getFeatures:function(){var v,r,u,t,s,q;r=u=s=q=false;if(k.XMLHttpRequest){v=new XMLHttpRequest();u=!!v.upload;r=!!(v.sendAsBinary||v.upload)}if(r){t=!!(v.sendAsBinary||(k.Uint8Array&&k.ArrayBuffer));s=!!(File&&(File.prototype.getAsDataURL||k.FileReader)&&t);q=!!(File&&(File.prototype.mozSlice||File.prototype.webkitSlice||File.prototype.slice))}j=l.ua.safari&&l.ua.windows;return{html5:r,dragdrop:(function(){var w=m.createElement("div");return("draggable" in w)||("ondragstart" in w&&"ondrop" in w)}()),jpgresize:s,pngresize:s,multipart:s||!!k.FileReader||!!k.FormData,canSendBinary:t,cantSendBlobInFormData:!!(l.ua.gecko&&k.FormData&&k.FileReader&&!FileReader.prototype.readAsArrayBuffer)||l.ua.android,progress:u,chunks:q,multi_selection:!(l.ua.safari&&l.ua.windows),triggerDialog:(l.ua.gecko&&k.FormData||l.ua.webkit)}},init:function(s,u){var q,t;function r(z){var x,w,y=[],A,v={};for(w=0;w<z.length;w++){x=z[w];if(v[x.name]&&l.ua.safari&&l.ua.windows){continue}v[x.name]=true;A=l.guid();d[A]=x;y.push(new l.File(A,x.fileName||x.name,x.fileSize||x.size))}if(y.length){s.trigger("FilesAdded",y)}}q=this.getFeatures();if(!q.html5){u({success:false});return}s.bind("Init",function(A){var J,I,F=[],z,G,w=A.settings.filters,x,E,v=m.body,H;J=m.createElement("div");J.id=A.id+"_html5_container";l.extend(J.style,{position:"absolute",background:s.settings.shim_bgcolor||"transparent",width:"100px",height:"100px",overflow:"hidden",zIndex:99999,opacity:s.settings.shim_bgcolor?"":0});J.className="plupload html5";if(s.settings.container){v=m.getElementById(s.settings.container);if(l.getStyle(v,"position")==="static"){v.style.position="relative"}}v.appendChild(J);no_type_restriction:for(z=0;z<w.length;z++){x=w[z].extensions.split(/,/);for(G=0;G<x.length;G++){if(x[G]==="*"){F=[];break no_type_restriction}E=l.mimeTypes[x[G]];if(E&&l.inArray(E,F)===-1){F.push(E)}}}J.innerHTML='<input id="'+s.id+'_html5"  style="font-size:999px" type="file" accept="'+F.join(",")+'" '+(s.settings.multi_selection&&s.features.multi_selection?'multiple="multiple"':"")+" />";J.scrollTop=100;H=m.getElementById(s.id+"_html5");if(A.features.triggerDialog){l.extend(H.style,{position:"absolute",width:"100%",height:"100%"})}else{l.extend(H.style,{cssFloat:"right",styleFloat:"right"})}H.onchange=function(){r(this.files);this.value=""};I=m.getElementById(A.settings.browse_button);if(I){var C=A.settings.browse_button_hover,D=A.settings.browse_button_active,B=A.features.triggerDialog?I:J;if(C){l.addEvent(B,"mouseover",function(){l.addClass(I,C)},A.id);l.addEvent(B,"mouseout",function(){l.removeClass(I,C)},A.id)}if(D){l.addEvent(B,"mousedown",function(){l.addClass(I,D)},A.id);l.addEvent(m.body,"mouseup",function(){l.removeClass(I,D)},A.id)}if(A.features.triggerDialog){l.addEvent(I,"click",function(K){var y=m.getElementById(A.id+"_html5");if(y&&!y.disabled){y.click()}K.preventDefault()},A.id)}}});s.bind("PostInit",function(){var v=m.getElementById(s.settings.drop_element);if(v){if(j){l.addEvent(v,"dragenter",function(z){var y,w,x;y=m.getElementById(s.id+"_drop");if(!y){y=m.createElement("input");y.setAttribute("type","file");y.setAttribute("id",s.id+"_drop");y.setAttribute("multiple","multiple");l.addEvent(y,"change",function(){r(this.files);l.removeEvent(y,"change",s.id);y.parentNode.removeChild(y)},s.id);l.addEvent(y,"dragover",function(A){A.stopPropagation()},s.id);v.appendChild(y)}w=l.getPos(v,m.getElementById(s.settings.container));x=l.getSize(v);if(l.getStyle(v,"position")==="static"){l.extend(v.style,{position:"relative"})}l.extend(y.style,{position:"absolute",display:"block",top:0,left:0,width:x.w+"px",height:x.h+"px",opacity:0})},s.id);return}l.addEvent(v,"dragover",function(w){w.preventDefault()},s.id);l.addEvent(v,"drop",function(x){var w=x.dataTransfer;if(w&&w.files){r(w.files)}x.preventDefault()},s.id)}});s.bind("Refresh",function(v){var w,x,y,A,z;w=m.getElementById(s.settings.browse_button);if(w){x=l.getPos(w,m.getElementById(v.settings.container));y=l.getSize(w);A=m.getElementById(s.id+"_html5_container");l.extend(A.style,{top:x.y+"px",left:x.x+"px",width:y.w+"px",height:y.h+"px"});if(s.features.triggerDialog){if(l.getStyle(w,"position")==="static"){l.extend(w.style,{position:"relative"})}z=parseInt(l.getStyle(w,"zIndex"),10);if(isNaN(z)){z=0}l.extend(w.style,{zIndex:z});l.extend(A.style,{zIndex:z-1})}}});s.bind("DisableBrowse",function(v,x){var w=m.getElementById(v.id+"_html5");if(w){w.disabled=x}});s.bind("CancelUpload",function(){if(t&&t.abort){t.abort()}});s.bind("UploadFile",function(v,x){var y=v.settings,B,w;function A(D,G,C){var E;if(File.prototype.slice){try{D.slice();return D.slice(G,C)}catch(F){return D.slice(G,C-G)}}else{if(E=File.prototype.webkitSlice||File.prototype.mozSlice){return E.call(D,G,C)}else{return null}}}function z(C){var F=0,E=0;function D(){var L,P,N,O,K,M,H,G=v.settings.url;function J(S){if(t.sendAsBinary){t.sendAsBinary(S)}else{if(v.features.canSendBinary){var Q=new Uint8Array(S.length);for(var R=0;R<S.length;R++){Q[R]=(S.charCodeAt(R)&255)}t.send(Q.buffer)}}}function I(R){var V=0,W="----pluploadboundary"+l.guid(),T,S="--",U="\r\n",Q="";t=new XMLHttpRequest;if(t.upload){t.upload.onprogress=function(X){x.loaded=Math.min(x.size,E+X.loaded-V);v.trigger("UploadProgress",x)}}t.onreadystatechange=function(){var X,Z;if(t.readyState==4&&v.state!==l.STOPPED){try{X=t.status}catch(Y){X=0}if(X>=400){v.trigger("Error",{code:l.HTTP_ERROR,message:l.translate("HTTP Error."),file:x,status:X})}else{if(N){Z={chunk:F,chunks:N,response:t.responseText,status:X};v.trigger("ChunkUploaded",x,Z);E+=M;if(Z.cancelled){x.status=l.FAILED;return}x.loaded=Math.min(x.size,(F+1)*K)}else{x.loaded=x.size}v.trigger("UploadProgress",x);R=L=T=Q=null;if(!N||++F>=N){x.status=l.DONE;v.trigger("FileUploaded",x,{response:t.responseText,status:X})}else{D()}}}};if(v.settings.multipart&&q.multipart){O.name=x.target_name||x.name;t.open("post",G,true);l.each(v.settings.headers,function(Y,X){t.setRequestHeader(X,Y)});if(typeof(R)!=="string"&&!!k.FormData){T=new FormData();l.each(l.extend(O,v.settings.multipart_params),function(Y,X){T.append(X,Y)});T.append(v.settings.file_data_name,R);t.send(T);return}if(typeof(R)==="string"){t.setRequestHeader("Content-Type","multipart/form-data; boundary="+W);l.each(l.extend(O,v.settings.multipart_params),function(Y,X){Q+=S+W+U+'Content-Disposition: form-data; name="'+X+'"'+U+U;Q+=unescape(encodeURIComponent(Y))+U});H=l.mimeTypes[x.name.replace(/^.+\.([^.]+)/,"$1").toLowerCase()]||"application/octet-stream";Q+=S+W+U+'Content-Disposition: form-data; name="'+v.settings.file_data_name+'"; filename="'+unescape(encodeURIComponent(x.name))+'"'+U+"Content-Type: "+H+U+U+R+U+S+W+S+U;V=Q.length-R.length;R=Q;J(R);return}}G=l.buildUrl(v.settings.url,l.extend(O,v.settings.multipart_params));t.open("post",G,true);t.setRequestHeader("Content-Type","application/octet-stream");l.each(v.settings.headers,function(Y,X){t.setRequestHeader(X,Y)});if(typeof(R)==="string"){J(R)}else{t.send(R)}}if(x.status==l.DONE||x.status==l.FAILED||v.state==l.STOPPED){return}O={name:x.target_name||x.name};if(y.chunk_size&&x.size>y.chunk_size&&(q.chunks||typeof(C)=="string")){K=y.chunk_size;N=Math.ceil(x.size/K);M=Math.min(K,x.size-(F*K));if(typeof(C)=="string"){L=C.substring(F*K,F*K+M)}else{L=A(C,F*K,F*K+M)}O.chunk=F;O.chunks=N}else{M=x.size;L=C}if(v.settings.multipart&&q.multipart&&typeof(L)!=="string"&&k.FileReader&&q.cantSendBlobInFormData&&q.chunks&&v.settings.chunk_size){(function(){var Q=new FileReader();Q.onload=function(){I(Q.result);Q=null};Q.readAsBinaryString(L)}())}else{I(L)}}D()}B=d[x.id];if(q.jpgresize&&v.settings.resize&&/\.(png|jpg|jpeg)$/i.test(x.name)){e.call(v,x,v.settings.resize,/\.png$/i.test(x.name)?"image/png":"image/jpeg",function(C){if(C.success){x.size=C.data.length;z(C.data)}else{if(q.chunks){z(B)}else{n(B,z)}}})}else{if(!q.chunks&&q.jpgresize){n(B,z)}else{z(B)}}});s.bind("Destroy",function(v){var x,y,w=m.body,z={inputContainer:v.id+"_html5_container",inputFile:v.id+"_html5",browseButton:v.settings.browse_button,dropElm:v.settings.drop_element};for(x in z){y=m.getElementById(z[x]);if(y){l.removeAllEvents(y,v.id)}}l.removeAllEvents(m.body,v.id);if(v.settings.container){w=m.getElementById(v.settings.container)}w.removeChild(m.getElementById(z.inputContainer))});u({success:true})}});function b(){var t=false,r;function u(w,y){var v=t?0:-8*(y-1),z=0,x;for(x=0;x<y;x++){z|=(r.charCodeAt(w+x)<<Math.abs(v+x*8))}return z}function q(x,v,w){var w=arguments.length===3?w:r.length-v-1;r=r.substr(0,v)+x+r.substr(w+v)}function s(w,x,z){var A="",v=t?0:-8*(z-1),y;for(y=0;y<z;y++){A+=String.fromCharCode((x>>Math.abs(v+y*8))&255)}q(A,w,z)}return{II:function(v){if(v===g){return t}else{t=v}},init:function(v){t=false;r=v},SEGMENT:function(v,x,w){switch(arguments.length){case 1:return r.substr(v,r.length-v-1);case 2:return r.substr(v,x);case 3:q(w,v,x);break;default:return r}},BYTE:function(v){return u(v,1)},SHORT:function(v){return u(v,2)},LONG:function(v,w){if(w===g){return u(v,4)}else{s(v,w,4)}},SLONG:function(v){var w=u(v,4);return(w>2147483647?w-4294967296:w)},STRING:function(v,w){var x="";for(w+=v;v<w;v++){x+=String.fromCharCode(u(v,1))}return x}}}function h(v){var x={65505:{app:"EXIF",name:"APP1",signature:"Exif\0"},65506:{app:"ICC",name:"APP2",signature:"ICC_PROFILE\0"},65517:{app:"IPTC",name:"APP13",signature:"Photoshop 3.0\0"}},w=[],u,q,s=g,t=0,r;u=new b();u.init(v);if(u.SHORT(0)!==65496){return}q=2;r=Math.min(1048576,v.length);while(q<=r){s=u.SHORT(q);if(s>=65488&&s<=65495){q+=2;continue}if(s===65498||s===65497){break}t=u.SHORT(q+2)+2;if(x[s]&&u.STRING(q+4,x[s].signature.length)===x[s].signature){w.push({hex:s,app:x[s].app.toUpperCase(),name:x[s].name.toUpperCase(),start:q,length:t,segment:u.SEGMENT(q,t)})}q+=t}u.init(null);return{headers:w,restore:function(B){u.init(B);var z=new h(B);if(!z.headers){return false}for(var A=z.headers.length;A>0;A--){var C=z.headers[A-1];u.SEGMENT(C.start,C.length,"")}z.purge();q=u.SHORT(2)==65504?4+u.SHORT(4):2;for(var A=0,y=w.length;A<y;A++){u.SEGMENT(q,0,w[A].segment);q+=w[A].length}return u.SEGMENT()},get:function(A){var B=[];for(var z=0,y=w.length;z<y;z++){if(w[z].app===A.toUpperCase()){B.push(w[z].segment)}}return B},set:function(B,A){var C=[];if(typeof(A)==="string"){C.push(A)}else{C=A}for(var z=ii=0,y=w.length;z<y;z++){if(w[z].app===B.toUpperCase()){w[z].segment=C[ii];w[z].length=C[ii].length;ii++}if(ii>=C.length){break}}},purge:function(){w=[];u.init(null)}}}function a(){var t,q,r={},w;t=new b();q={tiff:{274:"Orientation",34665:"ExifIFDPointer",34853:"GPSInfoIFDPointer"},exif:{36864:"ExifVersion",40961:"ColorSpace",40962:"PixelXDimension",40963:"PixelYDimension",36867:"DateTimeOriginal",33434:"ExposureTime",33437:"FNumber",34855:"ISOSpeedRatings",37377:"ShutterSpeedValue",37378:"ApertureValue",37383:"MeteringMode",37384:"LightSource",37385:"Flash",41986:"ExposureMode",41987:"WhiteBalance",41990:"SceneCaptureType",41988:"DigitalZoomRatio",41992:"Contrast",41993:"Saturation",41994:"Sharpness"},gps:{0:"GPSVersionID",1:"GPSLatitudeRef",2:"GPSLatitude",3:"GPSLongitudeRef",4:"GPSLongitude"}};w={ColorSpace:{1:"sRGB",0:"Uncalibrated"},MeteringMode:{0:"Unknown",1:"Average",2:"CenterWeightedAverage",3:"Spot",4:"MultiSpot",5:"Pattern",6:"Partial",255:"Other"},LightSource:{1:"Daylight",2:"Fliorescent",3:"Tungsten",4:"Flash",9:"Fine weather",10:"Cloudy weather",11:"Shade",12:"Daylight fluorescent (D 5700 - 7100K)",13:"Day white fluorescent (N 4600 -5400K)",14:"Cool white fluorescent (W 3900 - 4500K)",15:"White fluorescent (WW 3200 - 3700K)",17:"Standard light A",18:"Standard light B",19:"Standard light C",20:"D55",21:"D65",22:"D75",23:"D50",24:"ISO studio tungsten",255:"Other"},Flash:{0:"Flash did not fire.",1:"Flash fired.",5:"Strobe return light not detected.",7:"Strobe return light detected.",9:"Flash fired, compulsory flash mode",13:"Flash fired, compulsory flash mode, return light not detected",15:"Flash fired, compulsory flash mode, return light detected",16:"Flash did not fire, compulsory flash mode",24:"Flash did not fire, auto mode",25:"Flash fired, auto mode",29:"Flash fired, auto mode, return light not detected",31:"Flash fired, auto mode, return light detected",32:"No flash function",65:"Flash fired, red-eye reduction mode",69:"Flash fired, red-eye reduction mode, return light not detected",71:"Flash fired, red-eye reduction mode, return light detected",73:"Flash fired, compulsory flash mode, red-eye reduction mode",77:"Flash fired, compulsory flash mode, red-eye reduction mode, return light not detected",79:"Flash fired, compulsory flash mode, red-eye reduction mode, return light detected",89:"Flash fired, auto mode, red-eye reduction mode",93:"Flash fired, auto mode, return light not detected, red-eye reduction mode",95:"Flash fired, auto mode, return light detected, red-eye reduction mode"},ExposureMode:{0:"Auto exposure",1:"Manual exposure",2:"Auto bracket"},WhiteBalance:{0:"Auto white balance",1:"Manual white balance"},SceneCaptureType:{0:"Standard",1:"Landscape",2:"Portrait",3:"Night scene"},Contrast:{0:"Normal",1:"Soft",2:"Hard"},Saturation:{0:"Normal",1:"Low saturation",2:"High saturation"},Sharpness:{0:"Normal",1:"Soft",2:"Hard"},GPSLatitudeRef:{N:"North latitude",S:"South latitude"},GPSLongitudeRef:{E:"East longitude",W:"West longitude"}};function s(x,F){var z=t.SHORT(x),C,I,J,E,D,y,A,G,H=[],B={};for(C=0;C<z;C++){A=y=x+12*C+2;J=F[t.SHORT(A)];if(J===g){continue}E=t.SHORT(A+=2);D=t.LONG(A+=2);A+=4;H=[];switch(E){case 1:case 7:if(D>4){A=t.LONG(A)+r.tiffHeader}for(I=0;I<D;I++){H[I]=t.BYTE(A+I)}break;case 2:if(D>4){A=t.LONG(A)+r.tiffHeader}B[J]=t.STRING(A,D-1);continue;case 3:if(D>2){A=t.LONG(A)+r.tiffHeader}for(I=0;I<D;I++){H[I]=t.SHORT(A+I*2)}break;case 4:if(D>1){A=t.LONG(A)+r.tiffHeader}for(I=0;I<D;I++){H[I]=t.LONG(A+I*4)}break;case 5:A=t.LONG(A)+r.tiffHeader;for(I=0;I<D;I++){H[I]=t.LONG(A+I*4)/t.LONG(A+I*4+4)}break;case 9:A=t.LONG(A)+r.tiffHeader;for(I=0;I<D;I++){H[I]=t.SLONG(A+I*4)}break;case 10:A=t.LONG(A)+r.tiffHeader;for(I=0;I<D;I++){H[I]=t.SLONG(A+I*4)/t.SLONG(A+I*4+4)}break;default:continue}G=(D==1?H[0]:H);if(w.hasOwnProperty(J)&&typeof G!="object"){B[J]=w[J][G]}else{B[J]=G}}return B}function v(){var y=g,x=r.tiffHeader;t.II(t.SHORT(x)==18761);if(t.SHORT(x+=2)!==42){return false}r.IFD0=r.tiffHeader+t.LONG(x+=2);y=s(r.IFD0,q.tiff);r.exifIFD=("ExifIFDPointer" in y?r.tiffHeader+y.ExifIFDPointer:g);r.gpsIFD=("GPSInfoIFDPointer" in y?r.tiffHeader+y.GPSInfoIFDPointer:g);return true}function u(z,x,C){var E,B,A,D=0;if(typeof(x)==="string"){var y=q[z.toLowerCase()];for(hex in y){if(y[hex]===x){x=hex;break}}}E=r[z.toLowerCase()+"IFD"];B=t.SHORT(E);for(i=0;i<B;i++){A=E+12*i+2;if(t.SHORT(A)==x){D=A+8;break}}if(!D){return false}t.LONG(D,C);return true}return{init:function(x){r={tiffHeader:10};if(x===g||!x.length){return false}t.init(x);if(t.SHORT(0)===65505&&t.STRING(4,5).toUpperCase()==="EXIF\0"){return v()}return false},EXIF:function(){var y;y=s(r.exifIFD,q.exif);if(y.ExifVersion&&l.typeOf(y.ExifVersion)==="array"){for(var z=0,x="";z<y.ExifVersion.length;z++){x+=String.fromCharCode(y.ExifVersion[z])}y.ExifVersion=x}return y},GPS:function(){var x;x=s(r.gpsIFD,q.gps);if(x.GPSVersionID){x.GPSVersionID=x.GPSVersionID.join(".")}return x},setExif:function(x,y){if(x!=="PixelXDimension"&&x!=="PixelYDimension"){return false}return u("exif",x,y)},getBinary:function(){return t.SEGMENT()}}}})(window,document,plupload);;
// File end: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-dependencies/plupload.html5.js
;
// File start: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-dependencies/jquery.ui.plupload.js
(function(f,a,c,g,e){var h={};function b(i){return c.translate(i)||i}function d(i){i.html('<div class="plupload_wrapper"><div class="ui-widget-content plupload_container"><div class="plupload"><div class="ui-state-default ui-widget-header plupload_header"><div class="plupload_header_content"><div class="plupload_header_title">'+b("Select files")+'</div><div class="plupload_header_text">'+b("Add files to the upload queue and click the start button.")+'</div></div></div><div class="plupload_content"><table class="plupload_filelist"><tr class="ui-widget-header plupload_filelist_header"><td class="plupload_cell plupload_file_name">'+b("Filename")+'</td><td class="plupload_cell plupload_file_status">'+b("Status")+'</td><td class="plupload_cell plupload_file_size">'+b("Size")+'</td><td class="plupload_cell plupload_file_action">&nbsp;</td></tr></table><div class="plupload_scroll"><table class="plupload_filelist_content"></table></div><table class="plupload_filelist"><tr class="ui-widget-header ui-widget-content plupload_filelist_footer"><td class="plupload_cell plupload_file_name"><div class="plupload_buttons"><!-- Visible --><a class="plupload_button plupload_add">'+b("Add Files")+'</a>&nbsp;<a class="plupload_button plupload_start">'+b("Start Upload")+'</a>&nbsp;<a class="plupload_button plupload_stop plupload_hidden">'+b("Stop Upload")+'</a>&nbsp;</div><div class="plupload_started plupload_hidden"><!-- Hidden --><div class="plupload_progress plupload_right"><div class="plupload_progress_container"></div></div><div class="plupload_cell plupload_upload_status"></div><div class="plupload_clearer">&nbsp;</div></div></td><td class="plupload_file_status"><span class="plupload_total_status">0%</span></td><td class="plupload_file_size"><span class="plupload_total_file_size">0 kb</span></td><td class="plupload_file_action"></td></tr></table></div></div></div><input class="plupload_count" value="0" type="hidden"></div>')}g.widget("ui.plupload",{contents_bak:"",runtime:null,options:{browse_button_hover:"ui-state-hover",browse_button_active:"ui-state-active",dragdrop:true,multiple_queues:true,buttons:{browse:true,start:true,stop:true},autostart:false,sortable:false,rename:false,max_file_count:0},FILE_COUNT_ERROR:-9001,_create:function(){var i=this,k,j;k=this.element.attr("id");if(!k){k=c.guid();this.element.attr("id",k)}this.id=k;this.contents_bak=this.element.html();d(this.element);this.container=g(".plupload_container",this.element).attr("id",k+"_container");this.filelist=g(".plupload_filelist_content",this.container).attr({id:k+"_filelist",unselectable:"on"});this.browse_button=g(".plupload_add",this.container).attr("id",k+"_browse");this.start_button=g(".plupload_start",this.container).attr("id",k+"_start");this.stop_button=g(".plupload_stop",this.container).attr("id",k+"_stop");if(g.ui.button){this.browse_button.button({icons:{primary:"ui-icon-circle-plus"}});this.start_button.button({icons:{primary:"ui-icon-circle-arrow-e"},disabled:true});this.stop_button.button({icons:{primary:"ui-icon-circle-close"}})}this.progressbar=g(".plupload_progress_container",this.container);if(g.ui.progressbar){this.progressbar.progressbar()}this.counter=g(".plupload_count",this.element).attr({id:k+"_count",name:k+"_count"});j=this.uploader=h[k]=new c.Uploader(g.extend({container:k,browse_button:k+"_browse"},this.options));j.bind("Error",function(l,m){if(m.code===c.INIT_ERROR){i.destroy()}});j.bind("Init",function(l,m){if(!i.options.buttons.browse){i.browse_button.button("disable").hide();l.disableBrowse(true)}if(!i.options.buttons.start){i.start_button.button("disable").hide()}if(!i.options.buttons.stop){i.stop_button.button("disable").hide()}if(!i.options.unique_names&&i.options.rename){i._enableRenaming()}if(j.features.dragdrop&&i.options.dragdrop){i._enableDragAndDrop()}i.container.attr("title",b("Using runtime: ")+(i.runtime=m.runtime));i.start_button.click(function(n){if(!g(this).button("option","disabled")){i.start()}n.preventDefault()});i.stop_button.click(function(n){i.stop();n.preventDefault()})});if(i.options.max_file_count){j.bind("FilesAdded",function(l,n){var o=[],m=n.length;var p=l.files.length+m-i.options.max_file_count;if(p>0){o=n.splice(m-p,p);l.trigger("Error",{code:i.FILE_COUNT_ERROR,message:b("File count error."),file:o})}})}j.init();j.bind("FilesAdded",function(l,m){i._trigger("selected",null,{up:l,files:m});if(i.options.autostart){setTimeout(function(){i.start()},10)}});j.bind("FilesRemoved",function(l,m){i._trigger("removed",null,{up:l,files:m})});j.bind("QueueChanged",function(){i._updateFileList()});j.bind("StateChanged",function(){i._handleState()});j.bind("UploadFile",function(l,m){i._handleFileStatus(m)});j.bind("FileUploaded",function(l,m){i._handleFileStatus(m);i._trigger("uploaded",null,{up:l,file:m})});j.bind("UploadProgress",function(l,m){g("#"+m.id).find(".plupload_file_status").html(m.percent+"%").end().find(".plupload_file_size").html(c.formatSize(m.size));i._handleFileStatus(m);i._updateTotalProgress();i._trigger("progress",null,{up:l,file:m})});j.bind("UploadComplete",function(l,m){i._trigger("complete",null,{up:l,files:m})});j.bind("Error",function(l,p){var n=p.file,o,m;if(n){o="<strong>"+p.message+"</strong>";m=p.details;if(m){o+=" <br /><i>"+p.details+"</i>"}else{switch(p.code){case c.FILE_EXTENSION_ERROR:m=b("File: %s").replace("%s",n.name);break;case c.FILE_SIZE_ERROR:m=b("File: %f, size: %s, max file size: %m").replace(/%([fsm])/g,function(r,q){switch(q){case"f":return n.name;case"s":return n.size;case"m":return c.parseSize(i.options.max_file_size)}});break;case i.FILE_COUNT_ERROR:m=b("Upload element accepts only %d file(s) at a time. Extra files were stripped.").replace("%d",i.options.max_file_count);break;case c.IMAGE_FORMAT_ERROR:m=c.translate("Image format either wrong or not supported.");break;case c.IMAGE_MEMORY_ERROR:m=c.translate("Runtime ran out of available memory.");break;case c.IMAGE_DIMENSIONS_ERROR:m=c.translate("Resoultion out of boundaries! <b>%s</b> runtime supports images only up to %wx%hpx.").replace(/%([swh])/g,function(r,q){switch(q){case"s":return l.runtime;case"w":return l.features.maxWidth;case"h":return l.features.maxHeight}});break;case c.HTTP_ERROR:m=b("Upload URL might be wrong or doesn't exist");break}o+=" <br /><i>"+m+"</i>"}i.notify("error",o);i._trigger("error",null,{up:l,file:n,error:o})}})},_setOption:function(j,k){var i=this;if(j=="buttons"&&typeof(k)=="object"){k=g.extend(i.options.buttons,k);if(!k.browse){i.browse_button.button("disable").hide();up.disableBrowse(true)}else{i.browse_button.button("enable").show();up.disableBrowse(false)}if(!k.start){i.start_button.button("disable").hide()}else{i.start_button.button("enable").show()}if(!k.stop){i.stop_button.button("disable").hide()}else{i.start_button.button("enable").show()}}i.uploader.settings[j]=k},start:function(){this.uploader.start();this._trigger("start",null)},stop:function(){this.uploader.stop();this._trigger("stop",null)},getFile:function(j){var i;if(typeof j==="number"){i=this.uploader.files[j]}else{i=this.uploader.getFile(j)}return i},removeFile:function(j){var i=this.getFile(j);if(i){this.uploader.removeFile(i)}},clearQueue:function(){this.uploader.splice()},getUploader:function(){return this.uploader},refresh:function(){this.uploader.refresh()},_handleState:function(){var j=this,i=this.uploader;if(i.state===c.STARTED){g(j.start_button).button("disable");g([]).add(j.stop_button).add(".plupload_started").removeClass("plupload_hidden");g(".plupload_upload_status",j.element).html(b("Uploaded %d/%d files").replace("%d/%d",i.total.uploaded+"/"+i.files.length));g(".plupload_header_content",j.element).addClass("plupload_header_content_bw")}else{g([]).add(j.stop_button).add(".plupload_started").addClass("plupload_hidden");if(j.options.multiple_queues){g(j.start_button).button("enable");g(".plupload_header_content",j.element).removeClass("plupload_header_content_bw")}j._updateFileList()}},_handleFileStatus:function(l){var n,j;if(!g("#"+l.id).length){return}switch(l.status){case c.DONE:n="plupload_done";j="ui-icon ui-icon-circle-check";break;case c.FAILED:n="ui-state-error plupload_failed";j="ui-icon ui-icon-alert";break;case c.QUEUED:n="plupload_delete";j="ui-icon ui-icon-circle-minus";break;case c.UPLOADING:n="ui-state-highlight plupload_uploading";j="ui-icon ui-icon-circle-arrow-w";var i=g(".plupload_scroll",this.container),m=i.scrollTop(),o=i.height(),k=g("#"+l.id).position().top+g("#"+l.id).height();if(o<k){i.scrollTop(m+k-o)}break}n+=" ui-state-default plupload_file";g("#"+l.id).attr("class",n).find(".ui-icon").attr("class",j)},_updateTotalProgress:function(){var i=this.uploader;this.progressbar.progressbar("value",i.total.percent);this.element.find(".plupload_total_status").html(i.total.percent+"%").end().find(".plupload_total_file_size").html(c.formatSize(i.total.size)).end().find(".plupload_upload_status").html(b("Uploaded %d/%d files").replace("%d/%d",i.total.uploaded+"/"+i.files.length))},_updateFileList:function(){var k=this,j=this.uploader,m=this.filelist,l=0,o,n=this.id+"_",i;if(g.ui.sortable&&this.options.sortable){g("tbody.ui-sortable",m).sortable("destroy")}m.empty();g.each(j.files,function(q,p){i="";o=n+l;if(p.status===c.DONE){if(p.target_name){i+='<input type="hidden" name="'+o+'_tmpname" value="'+c.xmlEncode(p.target_name)+'" />'}i+='<input type="hidden" name="'+o+'_name" value="'+c.xmlEncode(p.name)+'" />';i+='<input type="hidden" name="'+o+'_status" value="'+(p.status===c.DONE?"done":"failed")+'" />';l++;k.counter.val(l)}m.append('<tr class="ui-state-default plupload_file" id="'+p.id+'"><td class="plupload_cell plupload_file_name"><span>'+p.name+'</span></td><td class="plupload_cell plupload_file_status">'+p.percent+'%</td><td class="plupload_cell plupload_file_size">'+c.formatSize(p.size)+'</td><td class="plupload_cell plupload_file_action"><div class="ui-icon"></div>'+i+"</td></tr>");k._handleFileStatus(p);g("#"+p.id+".plupload_delete .ui-icon, #"+p.id+".plupload_done .ui-icon").click(function(r){g("#"+p.id).remove();j.removeFile(p);r.preventDefault()});k._trigger("updatelist",null,m)});if(j.total.queued===0){g(".ui-button-text",k.browse_button).html(b("Add Files"))}else{g(".ui-button-text",k.browse_button).html(b("%d files queued").replace("%d",j.total.queued))}if(j.files.length===(j.total.uploaded+j.total.failed)){k.start_button.button("disable")}else{k.start_button.button("enable")}m[0].scrollTop=m[0].scrollHeight;k._updateTotalProgress();if(!j.files.length&&j.features.dragdrop&&j.settings.dragdrop){g("#"+o+"_filelist").append('<tr><td class="plupload_droptext">'+b("Drag files here.")+"</td></tr>")}else{if(k.options.sortable&&g.ui.sortable){k._enableSortingList()}}},_enableRenaming:function(){var i=this;this.filelist.on("click",".plupload_delete .plupload_file_name span",function(o){var m=g(o.target),k,n,j,l="";k=i.uploader.getFile(m.parents("tr")[0].id);j=k.name;n=/^(.+)(\.[^.]+)$/.exec(j);if(n){j=n[1];l=n[2]}m.hide().after('<input class="plupload_file_rename" type="text" />');m.next().val(j).focus().blur(function(){m.show().next().remove()}).keydown(function(q){var p=g(this);if(g.inArray(q.keyCode,[13,27])!==-1){q.preventDefault();if(q.keyCode===13){k.name=p.val()+l;m.html(k.name)}p.blur()}})})},_enableDragAndDrop:function(){this.filelist.append('<tr><td class="plupload_droptext">'+b("Drag files here.")+"</td></tr>");this.filelist.parent().attr("id",this.id+"_dropbox");this.uploader.settings.drop_element=this.options.drop_element=this.id+"_dropbox"},_enableSortingList:function(){var j,i=this;if(g("tbody tr",this.filelist).length<2){return}g("tbody",this.filelist).sortable({containment:"parent",items:".plupload_delete",helper:function(l,k){return k.clone(true).find("td:not(.plupload_file_name)").remove().end().css("width","100%")},stop:function(p,o){var l,n,k,m=[];g.each(g(this).sortable("toArray"),function(q,r){m[m.length]=i.uploader.getFile(r)});m.unshift(m.length);m.unshift(0);Array.prototype.splice.apply(i.uploader.files,m)}})},notify:function(j,k){var i=g('<div class="plupload_message"><span class="plupload_message_close ui-icon ui-icon-circle-close" title="'+b("Close")+'"></span><p><span class="ui-icon"></span>'+k+"</p></div>");i.addClass("ui-state-"+(j==="error"?"error":"highlight")).find("p .ui-icon").addClass("ui-icon-"+(j==="error"?"alert":"info")).end().find(".plupload_message_close").click(function(){i.remove()}).end();g(".plupload_header_content",this.container).append(i)},destroy:function(){g(".plupload_button",this.element).unbind();if(g.ui.button){g(".plupload_add, .plupload_start, .plupload_stop",this.container).button("destroy")}if(g.ui.progressbar){this.progressbar.progressbar("destroy")}if(g.ui.sortable&&this.options.sortable){g("tbody",this.filelist).sortable("destroy")}this.uploader.destroy();this.element.empty().html(this.contents_bak);this.contents_bak="";g.Widget.prototype.destroy.apply(this)}})}(window,document,plupload,jQuery));;
// File end: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-dependencies/jquery.ui.plupload.js
;
// File start: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-dependencies/diff.js
/**
 * Diff Match and Patch
 *
 * Copyright 2006 Google Inc.
 * http://code.google.com/p/google-diff-match-patch/
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * @fileoverview Computes the difference between two texts to create a patch.
 * Applies the patch onto another text, allowing for errors.
 * @author fraser@google.com (Neil Fraser)
 */

/**
 * Class containing the diff, match and patch methods.
 * @constructor
 */
function diff_match_patch() {

  // Defaults.
  // Redefine these in your program to override the defaults.

  // Number of seconds to map a diff before giving up (0 for infinity).
  this.Diff_Timeout = 1.0;
  // Cost of an empty edit operation in terms of edit characters.
  this.Diff_EditCost = 4;
  // At what point is no match declared (0.0 = perfection, 1.0 = very loose).
  this.Match_Threshold = 0.5;
  // How far to search for a match (0 = exact location, 1000+ = broad match).
  // A match this many characters away from the expected location will add
  // 1.0 to the score (0.0 is a perfect match).
  this.Match_Distance = 1000;
  // When deleting a large block of text (over ~64 characters), how close do
  // the contents have to be to match the expected contents. (0.0 = perfection,
  // 1.0 = very loose).  Note that Match_Threshold controls how closely the
  // end points of a delete need to match.
  this.Patch_DeleteThreshold = 0.5;
  // Chunk size for context length.
  this.Patch_Margin = 4;

  // The number of bits in an int.
  this.Match_MaxBits = 32;
}


//  DIFF FUNCTIONS


/**
 * The data structure representing a diff is an array of tuples:
 * [[DIFF_DELETE, 'Hello'], [DIFF_INSERT, 'Goodbye'], [DIFF_EQUAL, ' world.']]
 * which means: delete 'Hello', add 'Goodbye' and keep ' world.'
 */
var DIFF_DELETE = -1;
var DIFF_INSERT = 1;
var DIFF_EQUAL = 0;

/** @typedef {{0: number, 1: string}} */
diff_match_patch.Diff;


/**
 * Find the differences between two texts.  Simplifies the problem by stripping
 * any common prefix or suffix off the texts before diffing.
 * @param {string} text1 Old string to be diffed.
 * @param {string} text2 New string to be diffed.
 * @param {boolean=} opt_checklines Optional speedup flag. If present and false,
 *     then don't run a line-level diff first to identify the changed areas.
 *     Defaults to true, which does a faster, slightly less optimal diff.
 * @param {number} opt_deadline Optional time when the diff should be complete
 *     by.  Used internally for recursive calls.  Users should set DiffTimeout
 *     instead.
 * @return {!Array.<!diff_match_patch.Diff>} Array of diff tuples.
 */
diff_match_patch.prototype.diff_main = function(text1, text2, opt_checklines,
    opt_deadline) {
  // Set a deadline by which time the diff must be complete.
  if (typeof opt_deadline == 'undefined') {
    if (this.Diff_Timeout <= 0) {
      opt_deadline = Number.MAX_VALUE;
    } else {
      opt_deadline = (new Date).getTime() + this.Diff_Timeout * 1000;
    }
  }
  var deadline = opt_deadline;

  // Check for null inputs.
  if (text1 == null || text2 == null) {
    throw new Error('Null input. (diff_main)');
  }

  // Check for equality (speedup).
  if (text1 == text2) {
    if (text1) {
      return [[DIFF_EQUAL, text1]];
    }
    return [];
  }

  if (typeof opt_checklines == 'undefined') {
    opt_checklines = true;
  }
  var checklines = opt_checklines;

  // Trim off common prefix (speedup).
  var commonlength = this.diff_commonPrefix(text1, text2);
  var commonprefix = text1.substring(0, commonlength);
  text1 = text1.substring(commonlength);
  text2 = text2.substring(commonlength);

  // Trim off common suffix (speedup).
  commonlength = this.diff_commonSuffix(text1, text2);
  var commonsuffix = text1.substring(text1.length - commonlength);
  text1 = text1.substring(0, text1.length - commonlength);
  text2 = text2.substring(0, text2.length - commonlength);

  // Compute the diff on the middle block.
  var diffs = this.diff_compute_(text1, text2, checklines, deadline);

  // Restore the prefix and suffix.
  if (commonprefix) {
    diffs.unshift([DIFF_EQUAL, commonprefix]);
  }
  if (commonsuffix) {
    diffs.push([DIFF_EQUAL, commonsuffix]);
  }
  this.diff_cleanupMerge(diffs);
  return diffs;
};


/**
 * Find the differences between two texts.  Assumes that the texts do not
 * have any common prefix or suffix.
 * @param {string} text1 Old string to be diffed.
 * @param {string} text2 New string to be diffed.
 * @param {boolean} checklines Speedup flag.  If false, then don't run a
 *     line-level diff first to identify the changed areas.
 *     If true, then run a faster, slightly less optimal diff.
 * @param {number} deadline Time when the diff should be complete by.
 * @return {!Array.<!diff_match_patch.Diff>} Array of diff tuples.
 * @private
 */
diff_match_patch.prototype.diff_compute_ = function(text1, text2, checklines,
    deadline) {
  var diffs;

  if (!text1) {
    // Just add some text (speedup).
    return [[DIFF_INSERT, text2]];
  }

  if (!text2) {
    // Just delete some text (speedup).
    return [[DIFF_DELETE, text1]];
  }

  var longtext = text1.length > text2.length ? text1 : text2;
  var shorttext = text1.length > text2.length ? text2 : text1;
  var i = longtext.indexOf(shorttext);
  if (i != -1) {
    // Shorter text is inside the longer text (speedup).
    diffs = [[DIFF_INSERT, longtext.substring(0, i)],
             [DIFF_EQUAL, shorttext],
             [DIFF_INSERT, longtext.substring(i + shorttext.length)]];
    // Swap insertions for deletions if diff is reversed.
    if (text1.length > text2.length) {
      diffs[0][0] = diffs[2][0] = DIFF_DELETE;
    }
    return diffs;
  }

  if (shorttext.length == 1) {
    // Single character string.
    // After the previous speedup, the character can't be an equality.
    return [[DIFF_DELETE, text1], [DIFF_INSERT, text2]];
  }

  // Check to see if the problem can be split in two.
  var hm = this.diff_halfMatch_(text1, text2);
  if (hm) {
    // A half-match was found, sort out the return data.
    var text1_a = hm[0];
    var text1_b = hm[1];
    var text2_a = hm[2];
    var text2_b = hm[3];
    var mid_common = hm[4];
    // Send both pairs off for separate processing.
    var diffs_a = this.diff_main(text1_a, text2_a, checklines, deadline);
    var diffs_b = this.diff_main(text1_b, text2_b, checklines, deadline);
    // Merge the results.
    return diffs_a.concat([[DIFF_EQUAL, mid_common]], diffs_b);
  }

  if (checklines && text1.length > 100 && text2.length > 100) {
    return this.diff_lineMode_(text1, text2, deadline);
  }

  return this.diff_bisect_(text1, text2, deadline);
};


/**
 * Do a quick line-level diff on both strings, then rediff the parts for
 * greater accuracy.
 * This speedup can produce non-minimal diffs.
 * @param {string} text1 Old string to be diffed.
 * @param {string} text2 New string to be diffed.
 * @param {number} deadline Time when the diff should be complete by.
 * @return {!Array.<!diff_match_patch.Diff>} Array of diff tuples.
 * @private
 */
diff_match_patch.prototype.diff_lineMode_ = function(text1, text2, deadline) {
  // Scan the text on a line-by-line basis first.
  var a = this.diff_linesToChars_(text1, text2);
  text1 = a.chars1;
  text2 = a.chars2;
  var linearray = a.lineArray;

  var diffs = this.diff_main(text1, text2, false, deadline);

  // Convert the diff back to original text.
  this.diff_charsToLines_(diffs, linearray);
  // Eliminate freak matches (e.g. blank lines)
  this.diff_cleanupSemantic(diffs);

  // Rediff any replacement blocks, this time character-by-character.
  // Add a dummy entry at the end.
  diffs.push([DIFF_EQUAL, '']);
  var pointer = 0;
  var count_delete = 0;
  var count_insert = 0;
  var text_delete = '';
  var text_insert = '';
  while (pointer < diffs.length) {
    switch (diffs[pointer][0]) {
      case DIFF_INSERT:
        count_insert++;
        text_insert += diffs[pointer][1];
        break;
      case DIFF_DELETE:
        count_delete++;
        text_delete += diffs[pointer][1];
        break;
      case DIFF_EQUAL:
        // Upon reaching an equality, check for prior redundancies.
        if (count_delete >= 1 && count_insert >= 1) {
          // Delete the offending records and add the merged ones.
          diffs.splice(pointer - count_delete - count_insert,
                       count_delete + count_insert);
          pointer = pointer - count_delete - count_insert;
          var a = this.diff_main(text_delete, text_insert, false, deadline);
          for (var j = a.length - 1; j >= 0; j--) {
            diffs.splice(pointer, 0, a[j]);
          }
          pointer = pointer + a.length;
        }
        count_insert = 0;
        count_delete = 0;
        text_delete = '';
        text_insert = '';
        break;
    }
    pointer++;
  }
  diffs.pop();  // Remove the dummy entry at the end.

  return diffs;
};


/**
 * Find the 'middle snake' of a diff, split the problem in two
 * and return the recursively constructed diff.
 * See Myers 1986 paper: An O(ND) Difference Algorithm and Its Variations.
 * @param {string} text1 Old string to be diffed.
 * @param {string} text2 New string to be diffed.
 * @param {number} deadline Time at which to bail if not yet complete.
 * @return {!Array.<!diff_match_patch.Diff>} Array of diff tuples.
 * @private
 */
diff_match_patch.prototype.diff_bisect_ = function(text1, text2, deadline) {
  // Cache the text lengths to prevent multiple calls.
  var text1_length = text1.length;
  var text2_length = text2.length;
  var max_d = Math.ceil((text1_length + text2_length) / 2);
  var v_offset = max_d;
  var v_length = 2 * max_d;
  var v1 = new Array(v_length);
  var v2 = new Array(v_length);
  // Setting all elements to -1 is faster in Chrome & Firefox than mixing
  // integers and undefined.
  for (var x = 0; x < v_length; x++) {
    v1[x] = -1;
    v2[x] = -1;
  }
  v1[v_offset + 1] = 0;
  v2[v_offset + 1] = 0;
  var delta = text1_length - text2_length;
  // If the total number of characters is odd, then the front path will collide
  // with the reverse path.
  var front = (delta % 2 != 0);
  // Offsets for start and end of k loop.
  // Prevents mapping of space beyond the grid.
  var k1start = 0;
  var k1end = 0;
  var k2start = 0;
  var k2end = 0;
  for (var d = 0; d < max_d; d++) {
    // Bail out if deadline is reached.
    if ((new Date()).getTime() > deadline) {
      break;
    }

    // Walk the front path one step.
    for (var k1 = -d + k1start; k1 <= d - k1end; k1 += 2) {
      var k1_offset = v_offset + k1;
      var x1;
      if (k1 == -d || (k1 != d && v1[k1_offset - 1] < v1[k1_offset + 1])) {
        x1 = v1[k1_offset + 1];
      } else {
        x1 = v1[k1_offset - 1] + 1;
      }
      var y1 = x1 - k1;
      while (x1 < text1_length && y1 < text2_length &&
             text1.charAt(x1) == text2.charAt(y1)) {
        x1++;
        y1++;
      }
      v1[k1_offset] = x1;
      if (x1 > text1_length) {
        // Ran off the right of the graph.
        k1end += 2;
      } else if (y1 > text2_length) {
        // Ran off the bottom of the graph.
        k1start += 2;
      } else if (front) {
        var k2_offset = v_offset + delta - k1;
        if (k2_offset >= 0 && k2_offset < v_length && v2[k2_offset] != -1) {
          // Mirror x2 onto top-left coordinate system.
          var x2 = text1_length - v2[k2_offset];
          if (x1 >= x2) {
            // Overlap detected.
            return this.diff_bisectSplit_(text1, text2, x1, y1, deadline);
          }
        }
      }
    }

    // Walk the reverse path one step.
    for (var k2 = -d + k2start; k2 <= d - k2end; k2 += 2) {
      var k2_offset = v_offset + k2;
      var x2;
      if (k2 == -d || (k2 != d && v2[k2_offset - 1] < v2[k2_offset + 1])) {
        x2 = v2[k2_offset + 1];
      } else {
        x2 = v2[k2_offset - 1] + 1;
      }
      var y2 = x2 - k2;
      while (x2 < text1_length && y2 < text2_length &&
             text1.charAt(text1_length - x2 - 1) ==
             text2.charAt(text2_length - y2 - 1)) {
        x2++;
        y2++;
      }
      v2[k2_offset] = x2;
      if (x2 > text1_length) {
        // Ran off the left of the graph.
        k2end += 2;
      } else if (y2 > text2_length) {
        // Ran off the top of the graph.
        k2start += 2;
      } else if (!front) {
        var k1_offset = v_offset + delta - k2;
        if (k1_offset >= 0 && k1_offset < v_length && v1[k1_offset] != -1) {
          var x1 = v1[k1_offset];
          var y1 = v_offset + x1 - k1_offset;
          // Mirror x2 onto top-left coordinate system.
          x2 = text1_length - x2;
          if (x1 >= x2) {
            // Overlap detected.
            return this.diff_bisectSplit_(text1, text2, x1, y1, deadline);
          }
        }
      }
    }
  }
  // Diff took too long and hit the deadline or
  // number of diffs equals number of characters, no commonality at all.
  return [[DIFF_DELETE, text1], [DIFF_INSERT, text2]];
};


/**
 * Given the location of the 'middle snake', split the diff in two parts
 * and recurse.
 * @param {string} text1 Old string to be diffed.
 * @param {string} text2 New string to be diffed.
 * @param {number} x Index of split point in text1.
 * @param {number} y Index of split point in text2.
 * @param {number} deadline Time at which to bail if not yet complete.
 * @return {!Array.<!diff_match_patch.Diff>} Array of diff tuples.
 * @private
 */
diff_match_patch.prototype.diff_bisectSplit_ = function(text1, text2, x, y,
    deadline) {
  var text1a = text1.substring(0, x);
  var text2a = text2.substring(0, y);
  var text1b = text1.substring(x);
  var text2b = text2.substring(y);

  // Compute both diffs serially.
  var diffs = this.diff_main(text1a, text2a, false, deadline);
  var diffsb = this.diff_main(text1b, text2b, false, deadline);

  return diffs.concat(diffsb);
};


/**
 * Split two texts into an array of strings.  Reduce the texts to a string of
 * hashes where each Unicode character represents one line.
 * @param {string} text1 First string.
 * @param {string} text2 Second string.
 * @return {{chars1: string, chars2: string, lineArray: !Array.<string>}}
 *     An object containing the encoded text1, the encoded text2 and
 *     the array of unique strings.
 *     The zeroth element of the array of unique strings is intentionally blank.
 * @private
 */
diff_match_patch.prototype.diff_linesToChars_ = function(text1, text2) {
  var lineArray = [];  // e.g. lineArray[4] == 'Hello\n'
  var lineHash = {};   // e.g. lineHash['Hello\n'] == 4

  // '\x00' is a valid character, but various debuggers don't like it.
  // So we'll insert a junk entry to avoid generating a null character.
  lineArray[0] = '';

  /**
   * Split a text into an array of strings.  Reduce the texts to a string of
   * hashes where each Unicode character represents one line.
   * Modifies linearray and linehash through being a closure.
   * @param {string} text String to encode.
   * @return {string} Encoded string.
   * @private
   */
  function diff_linesToCharsMunge_(text) {
    var chars = '';
    // Walk the text, pulling out a substring for each line.
    // text.split('\n') would would temporarily double our memory footprint.
    // Modifying text would create many large strings to garbage collect.
    var lineStart = 0;
    var lineEnd = -1;
    // Keeping our own length variable is faster than looking it up.
    var lineArrayLength = lineArray.length;
    while (lineEnd < text.length - 1) {
      lineEnd = text.indexOf('\n', lineStart);
      if (lineEnd == -1) {
        lineEnd = text.length - 1;
      }
      var line = text.substring(lineStart, lineEnd + 1);
      lineStart = lineEnd + 1;

      if (lineHash.hasOwnProperty ? lineHash.hasOwnProperty(line) :
          (lineHash[line] !== undefined)) {
        chars += String.fromCharCode(lineHash[line]);
      } else {
        chars += String.fromCharCode(lineArrayLength);
        lineHash[line] = lineArrayLength;
        lineArray[lineArrayLength++] = line;
      }
    }
    return chars;
  }

  var chars1 = diff_linesToCharsMunge_(text1);
  var chars2 = diff_linesToCharsMunge_(text2);
  return {chars1: chars1, chars2: chars2, lineArray: lineArray};
};


/**
 * Rehydrate the text in a diff from a string of line hashes to real lines of
 * text.
 * @param {!Array.<!diff_match_patch.Diff>} diffs Array of diff tuples.
 * @param {!Array.<string>} lineArray Array of unique strings.
 * @private
 */
diff_match_patch.prototype.diff_charsToLines_ = function(diffs, lineArray) {
  for (var x = 0; x < diffs.length; x++) {
    var chars = diffs[x][1];
    var text = [];
    for (var y = 0; y < chars.length; y++) {
      text[y] = lineArray[chars.charCodeAt(y)];
    }
    diffs[x][1] = text.join('');
  }
};


/**
 * Determine the common prefix of two strings.
 * @param {string} text1 First string.
 * @param {string} text2 Second string.
 * @return {number} The number of characters common to the start of each
 *     string.
 */
diff_match_patch.prototype.diff_commonPrefix = function(text1, text2) {
  // Quick check for common null cases.
  if (!text1 || !text2 || text1.charAt(0) != text2.charAt(0)) {
    return 0;
  }
  // Binary search.
  // Performance analysis: http://neil.fraser.name/news/2007/10/09/
  var pointermin = 0;
  var pointermax = Math.min(text1.length, text2.length);
  var pointermid = pointermax;
  var pointerstart = 0;
  while (pointermin < pointermid) {
    if (text1.substring(pointerstart, pointermid) ==
        text2.substring(pointerstart, pointermid)) {
      pointermin = pointermid;
      pointerstart = pointermin;
    } else {
      pointermax = pointermid;
    }
    pointermid = Math.floor((pointermax - pointermin) / 2 + pointermin);
  }
  return pointermid;
};


/**
 * Determine the common suffix of two strings.
 * @param {string} text1 First string.
 * @param {string} text2 Second string.
 * @return {number} The number of characters common to the end of each string.
 */
diff_match_patch.prototype.diff_commonSuffix = function(text1, text2) {
  // Quick check for common null cases.
  if (!text1 || !text2 ||
      text1.charAt(text1.length - 1) != text2.charAt(text2.length - 1)) {
    return 0;
  }
  // Binary search.
  // Performance analysis: http://neil.fraser.name/news/2007/10/09/
  var pointermin = 0;
  var pointermax = Math.min(text1.length, text2.length);
  var pointermid = pointermax;
  var pointerend = 0;
  while (pointermin < pointermid) {
    if (text1.substring(text1.length - pointermid, text1.length - pointerend) ==
        text2.substring(text2.length - pointermid, text2.length - pointerend)) {
      pointermin = pointermid;
      pointerend = pointermin;
    } else {
      pointermax = pointermid;
    }
    pointermid = Math.floor((pointermax - pointermin) / 2 + pointermin);
  }
  return pointermid;
};


/**
 * Determine if the suffix of one string is the prefix of another.
 * @param {string} text1 First string.
 * @param {string} text2 Second string.
 * @return {number} The number of characters common to the end of the first
 *     string and the start of the second string.
 * @private
 */
diff_match_patch.prototype.diff_commonOverlap_ = function(text1, text2) {
  // Cache the text lengths to prevent multiple calls.
  var text1_length = text1.length;
  var text2_length = text2.length;
  // Eliminate the null case.
  if (text1_length == 0 || text2_length == 0) {
    return 0;
  }
  // Truncate the longer string.
  if (text1_length > text2_length) {
    text1 = text1.substring(text1_length - text2_length);
  } else if (text1_length < text2_length) {
    text2 = text2.substring(0, text1_length);
  }
  var text_length = Math.min(text1_length, text2_length);
  // Quick check for the worst case.
  if (text1 == text2) {
    return text_length;
  }

  // Start by looking for a single character match
  // and increase length until no match is found.
  // Performance analysis: http://neil.fraser.name/news/2010/11/04/
  var best = 0;
  var length = 1;
  while (true) {
    var pattern = text1.substring(text_length - length);
    var found = text2.indexOf(pattern);
    if (found == -1) {
      return best;
    }
    length += found;
    if (found == 0 || text1.substring(text_length - length) ==
        text2.substring(0, length)) {
      best = length;
      length++;
    }
  }
};


/**
 * Do the two texts share a substring which is at least half the length of the
 * longer text?
 * This speedup can produce non-minimal diffs.
 * @param {string} text1 First string.
 * @param {string} text2 Second string.
 * @return {Array.<string>} Five element Array, containing the prefix of
 *     text1, the suffix of text1, the prefix of text2, the suffix of
 *     text2 and the common middle.  Or null if there was no match.
 * @private
 */
diff_match_patch.prototype.diff_halfMatch_ = function(text1, text2) {
  if (this.Diff_Timeout <= 0) {
    // Don't risk returning a non-optimal diff if we have unlimited time.
    return null;
  }
  var longtext = text1.length > text2.length ? text1 : text2;
  var shorttext = text1.length > text2.length ? text2 : text1;
  if (longtext.length < 4 || shorttext.length * 2 < longtext.length) {
    return null;  // Pointless.
  }
  var dmp = this;  // 'this' becomes 'window' in a closure.

  /**
   * Does a substring of shorttext exist within longtext such that the substring
   * is at least half the length of longtext?
   * Closure, but does not reference any external variables.
   * @param {string} longtext Longer string.
   * @param {string} shorttext Shorter string.
   * @param {number} i Start index of quarter length substring within longtext.
   * @return {Array.<string>} Five element Array, containing the prefix of
   *     longtext, the suffix of longtext, the prefix of shorttext, the suffix
   *     of shorttext and the common middle.  Or null if there was no match.
   * @private
   */
  function diff_halfMatchI_(longtext, shorttext, i) {
    // Start with a 1/4 length substring at position i as a seed.
    var seed = longtext.substring(i, i + Math.floor(longtext.length / 4));
    var j = -1;
    var best_common = '';
    var best_longtext_a, best_longtext_b, best_shorttext_a, best_shorttext_b;
    while ((j = shorttext.indexOf(seed, j + 1)) != -1) {
      var prefixLength = dmp.diff_commonPrefix(longtext.substring(i),
                                               shorttext.substring(j));
      var suffixLength = dmp.diff_commonSuffix(longtext.substring(0, i),
                                               shorttext.substring(0, j));
      if (best_common.length < suffixLength + prefixLength) {
        best_common = shorttext.substring(j - suffixLength, j) +
            shorttext.substring(j, j + prefixLength);
        best_longtext_a = longtext.substring(0, i - suffixLength);
        best_longtext_b = longtext.substring(i + prefixLength);
        best_shorttext_a = shorttext.substring(0, j - suffixLength);
        best_shorttext_b = shorttext.substring(j + prefixLength);
      }
    }
    if (best_common.length * 2 >= longtext.length) {
      return [best_longtext_a, best_longtext_b,
              best_shorttext_a, best_shorttext_b, best_common];
    } else {
      return null;
    }
  }

  // First check if the second quarter is the seed for a half-match.
  var hm1 = diff_halfMatchI_(longtext, shorttext,
                             Math.ceil(longtext.length / 4));
  // Check again based on the third quarter.
  var hm2 = diff_halfMatchI_(longtext, shorttext,
                             Math.ceil(longtext.length / 2));
  var hm;
  if (!hm1 && !hm2) {
    return null;
  } else if (!hm2) {
    hm = hm1;
  } else if (!hm1) {
    hm = hm2;
  } else {
    // Both matched.  Select the longest.
    hm = hm1[4].length > hm2[4].length ? hm1 : hm2;
  }

  // A half-match was found, sort out the return data.
  var text1_a, text1_b, text2_a, text2_b;
  if (text1.length > text2.length) {
    text1_a = hm[0];
    text1_b = hm[1];
    text2_a = hm[2];
    text2_b = hm[3];
  } else {
    text2_a = hm[0];
    text2_b = hm[1];
    text1_a = hm[2];
    text1_b = hm[3];
  }
  var mid_common = hm[4];
  return [text1_a, text1_b, text2_a, text2_b, mid_common];
};


/**
 * Reduce the number of edits by eliminating semantically trivial equalities.
 * @param {!Array.<!diff_match_patch.Diff>} diffs Array of diff tuples.
 */
diff_match_patch.prototype.diff_cleanupSemantic = function(diffs) {
  var changes = false;
  var equalities = [];  // Stack of indices where equalities are found.
  var equalitiesLength = 0;  // Keeping our own length var is faster in JS.
  /** @type {?string} */
  var lastequality = null;
  // Always equal to diffs[equalities[equalitiesLength - 1]][1]
  var pointer = 0;  // Index of current position.
  // Number of characters that changed prior to the equality.
  var length_insertions1 = 0;
  var length_deletions1 = 0;
  // Number of characters that changed after the equality.
  var length_insertions2 = 0;
  var length_deletions2 = 0;
  while (pointer < diffs.length) {
    if (diffs[pointer][0] == DIFF_EQUAL) {  // Equality found.
      equalities[equalitiesLength++] = pointer;
      length_insertions1 = length_insertions2;
      length_deletions1 = length_deletions2;
      length_insertions2 = 0;
      length_deletions2 = 0;
      lastequality = diffs[pointer][1];
    } else {  // An insertion or deletion.
      if (diffs[pointer][0] == DIFF_INSERT) {
        length_insertions2 += diffs[pointer][1].length;
      } else {
        length_deletions2 += diffs[pointer][1].length;
      }
      // Eliminate an equality that is smaller or equal to the edits on both
      // sides of it.
      if (lastequality && (lastequality.length <=
          Math.max(length_insertions1, length_deletions1)) &&
          (lastequality.length <= Math.max(length_insertions2,
                                           length_deletions2))) {
        // Duplicate record.
        diffs.splice(equalities[equalitiesLength - 1], 0,
                     [DIFF_DELETE, lastequality]);
        // Change second copy to insert.
        diffs[equalities[equalitiesLength - 1] + 1][0] = DIFF_INSERT;
        // Throw away the equality we just deleted.
        equalitiesLength--;
        // Throw away the previous equality (it needs to be reevaluated).
        equalitiesLength--;
        pointer = equalitiesLength > 0 ? equalities[equalitiesLength - 1] : -1;
        length_insertions1 = 0;  // Reset the counters.
        length_deletions1 = 0;
        length_insertions2 = 0;
        length_deletions2 = 0;
        lastequality = null;
        changes = true;
      }
    }
    pointer++;
  }

  // Normalize the diff.
  if (changes) {
    this.diff_cleanupMerge(diffs);
  }
  this.diff_cleanupSemanticLossless(diffs);

  // Find any overlaps between deletions and insertions.
  // e.g: <del>abcxxx</del><ins>xxxdef</ins>
  //   -> <del>abc</del>xxx<ins>def</ins>
  // e.g: <del>xxxabc</del><ins>defxxx</ins>
  //   -> <ins>def</ins>xxx<del>abc</del>
  // Only extract an overlap if it is as big as the edit ahead or behind it.
  pointer = 1;
  while (pointer < diffs.length) {
    if (diffs[pointer - 1][0] == DIFF_DELETE &&
        diffs[pointer][0] == DIFF_INSERT) {
      var deletion = diffs[pointer - 1][1];
      var insertion = diffs[pointer][1];
      var overlap_length1 = this.diff_commonOverlap_(deletion, insertion);
      var overlap_length2 = this.diff_commonOverlap_(insertion, deletion);
      if (overlap_length1 >= overlap_length2) {
        if (overlap_length1 >= deletion.length / 2 ||
            overlap_length1 >= insertion.length / 2) {
          // Overlap found.  Insert an equality and trim the surrounding edits.
          diffs.splice(pointer, 0,
              [DIFF_EQUAL, insertion.substring(0, overlap_length1)]);
          diffs[pointer - 1][1] =
              deletion.substring(0, deletion.length - overlap_length1);
          diffs[pointer + 1][1] = insertion.substring(overlap_length1);
          pointer++;
        }
      } else {
        if (overlap_length2 >= deletion.length / 2 ||
            overlap_length2 >= insertion.length / 2) {
          // Reverse overlap found.
          // Insert an equality and swap and trim the surrounding edits.
          diffs.splice(pointer, 0,
              [DIFF_EQUAL, deletion.substring(0, overlap_length2)]);
          diffs[pointer - 1][0] = DIFF_INSERT;
          diffs[pointer - 1][1] =
              insertion.substring(0, insertion.length - overlap_length2);
          diffs[pointer + 1][0] = DIFF_DELETE;
          diffs[pointer + 1][1] =
              deletion.substring(overlap_length2);
          pointer++;
        }
      }
      pointer++;
    }
    pointer++;
  }
};


/**
 * Look for single edits surrounded on both sides by equalities
 * which can be shifted sideways to align the edit to a word boundary.
 * e.g: The c<ins>at c</ins>ame. -> The <ins>cat </ins>came.
 * @param {!Array.<!diff_match_patch.Diff>} diffs Array of diff tuples.
 */
diff_match_patch.prototype.diff_cleanupSemanticLossless = function(diffs) {
  /**
   * Given two strings, compute a score representing whether the internal
   * boundary falls on logical boundaries.
   * Scores range from 6 (best) to 0 (worst).
   * Closure, but does not reference any external variables.
   * @param {string} one First string.
   * @param {string} two Second string.
   * @return {number} The score.
   * @private
   */
  function diff_cleanupSemanticScore_(one, two) {
    if (!one || !two) {
      // Edges are the best.
      return 6;
    }

    // Each port of this function behaves slightly differently due to
    // subtle differences in each language's definition of things like
    // 'whitespace'.  Since this function's purpose is largely cosmetic,
    // the choice has been made to use each language's native features
    // rather than force total conformity.
    var char1 = one.charAt(one.length - 1);
    var char2 = two.charAt(0);
    var nonAlphaNumeric1 = char1.match(diff_match_patch.nonAlphaNumericRegex_);
    var nonAlphaNumeric2 = char2.match(diff_match_patch.nonAlphaNumericRegex_);
    var whitespace1 = nonAlphaNumeric1 &&
        char1.match(diff_match_patch.whitespaceRegex_);
    var whitespace2 = nonAlphaNumeric2 &&
        char2.match(diff_match_patch.whitespaceRegex_);
    var lineBreak1 = whitespace1 &&
        char1.match(diff_match_patch.linebreakRegex_);
    var lineBreak2 = whitespace2 &&
        char2.match(diff_match_patch.linebreakRegex_);
    var blankLine1 = lineBreak1 &&
        one.match(diff_match_patch.blanklineEndRegex_);
    var blankLine2 = lineBreak2 &&
        two.match(diff_match_patch.blanklineStartRegex_);

    if (blankLine1 || blankLine2) {
      // Five points for blank lines.
      return 5;
    } else if (lineBreak1 || lineBreak2) {
      // Four points for line breaks.
      return 4;
    } else if (nonAlphaNumeric1 && !whitespace1 && whitespace2) {
      // Three points for end of sentences.
      return 3;
    } else if (whitespace1 || whitespace2) {
      // Two points for whitespace.
      return 2;
    } else if (nonAlphaNumeric1 || nonAlphaNumeric2) {
      // One point for non-alphanumeric.
      return 1;
    }
    return 0;
  }

  var pointer = 1;
  // Intentionally ignore the first and last element (don't need checking).
  while (pointer < diffs.length - 1) {
    if (diffs[pointer - 1][0] == DIFF_EQUAL &&
        diffs[pointer + 1][0] == DIFF_EQUAL) {
      // This is a single edit surrounded by equalities.
      var equality1 = diffs[pointer - 1][1];
      var edit = diffs[pointer][1];
      var equality2 = diffs[pointer + 1][1];

      // First, shift the edit as far left as possible.
      var commonOffset = this.diff_commonSuffix(equality1, edit);
      if (commonOffset) {
        var commonString = edit.substring(edit.length - commonOffset);
        equality1 = equality1.substring(0, equality1.length - commonOffset);
        edit = commonString + edit.substring(0, edit.length - commonOffset);
        equality2 = commonString + equality2;
      }

      // Second, step character by character right, looking for the best fit.
      var bestEquality1 = equality1;
      var bestEdit = edit;
      var bestEquality2 = equality2;
      var bestScore = diff_cleanupSemanticScore_(equality1, edit) +
          diff_cleanupSemanticScore_(edit, equality2);
      while (edit.charAt(0) === equality2.charAt(0)) {
        equality1 += edit.charAt(0);
        edit = edit.substring(1) + equality2.charAt(0);
        equality2 = equality2.substring(1);
        var score = diff_cleanupSemanticScore_(equality1, edit) +
            diff_cleanupSemanticScore_(edit, equality2);
        // The >= encourages trailing rather than leading whitespace on edits.
        if (score >= bestScore) {
          bestScore = score;
          bestEquality1 = equality1;
          bestEdit = edit;
          bestEquality2 = equality2;
        }
      }

      if (diffs[pointer - 1][1] != bestEquality1) {
        // We have an improvement, save it back to the diff.
        if (bestEquality1) {
          diffs[pointer - 1][1] = bestEquality1;
        } else {
          diffs.splice(pointer - 1, 1);
          pointer--;
        }
        diffs[pointer][1] = bestEdit;
        if (bestEquality2) {
          diffs[pointer + 1][1] = bestEquality2;
        } else {
          diffs.splice(pointer + 1, 1);
          pointer--;
        }
      }
    }
    pointer++;
  }
};

// Define some regex patterns for matching boundaries.
diff_match_patch.nonAlphaNumericRegex_ = /[^a-zA-Z0-9]/;
diff_match_patch.whitespaceRegex_ = /\s/;
diff_match_patch.linebreakRegex_ = /[\r\n]/;
diff_match_patch.blanklineEndRegex_ = /\n\r?\n$/;
diff_match_patch.blanklineStartRegex_ = /^\r?\n\r?\n/;

/**
 * Reduce the number of edits by eliminating operationally trivial equalities.
 * @param {!Array.<!diff_match_patch.Diff>} diffs Array of diff tuples.
 */
diff_match_patch.prototype.diff_cleanupEfficiency = function(diffs) {
  var changes = false;
  var equalities = [];  // Stack of indices where equalities are found.
  var equalitiesLength = 0;  // Keeping our own length var is faster in JS.
  /** @type {?string} */
  var lastequality = null;
  // Always equal to diffs[equalities[equalitiesLength - 1]][1]
  var pointer = 0;  // Index of current position.
  // Is there an insertion operation before the last equality.
  var pre_ins = false;
  // Is there a deletion operation before the last equality.
  var pre_del = false;
  // Is there an insertion operation after the last equality.
  var post_ins = false;
  // Is there a deletion operation after the last equality.
  var post_del = false;
  while (pointer < diffs.length) {
    if (diffs[pointer][0] == DIFF_EQUAL) {  // Equality found.
      if (diffs[pointer][1].length < this.Diff_EditCost &&
          (post_ins || post_del)) {
        // Candidate found.
        equalities[equalitiesLength++] = pointer;
        pre_ins = post_ins;
        pre_del = post_del;
        lastequality = diffs[pointer][1];
      } else {
        // Not a candidate, and can never become one.
        equalitiesLength = 0;
        lastequality = null;
      }
      post_ins = post_del = false;
    } else {  // An insertion or deletion.
      if (diffs[pointer][0] == DIFF_DELETE) {
        post_del = true;
      } else {
        post_ins = true;
      }
      /*
       * Five types to be split:
       * <ins>A</ins><del>B</del>XY<ins>C</ins><del>D</del>
       * <ins>A</ins>X<ins>C</ins><del>D</del>
       * <ins>A</ins><del>B</del>X<ins>C</ins>
       * <ins>A</del>X<ins>C</ins><del>D</del>
       * <ins>A</ins><del>B</del>X<del>C</del>
       */
      if (lastequality && ((pre_ins && pre_del && post_ins && post_del) ||
                           ((lastequality.length < this.Diff_EditCost / 2) &&
                            (pre_ins + pre_del + post_ins + post_del) == 3))) {
        // Duplicate record.
        diffs.splice(equalities[equalitiesLength - 1], 0,
                     [DIFF_DELETE, lastequality]);
        // Change second copy to insert.
        diffs[equalities[equalitiesLength - 1] + 1][0] = DIFF_INSERT;
        equalitiesLength--;  // Throw away the equality we just deleted;
        lastequality = null;
        if (pre_ins && pre_del) {
          // No changes made which could affect previous entry, keep going.
          post_ins = post_del = true;
          equalitiesLength = 0;
        } else {
          equalitiesLength--;  // Throw away the previous equality.
          pointer = equalitiesLength > 0 ?
              equalities[equalitiesLength - 1] : -1;
          post_ins = post_del = false;
        }
        changes = true;
      }
    }
    pointer++;
  }

  if (changes) {
    this.diff_cleanupMerge(diffs);
  }
};


/**
 * Reorder and merge like edit sections.  Merge equalities.
 * Any edit section can move as long as it doesn't cross an equality.
 * @param {!Array.<!diff_match_patch.Diff>} diffs Array of diff tuples.
 */
diff_match_patch.prototype.diff_cleanupMerge = function(diffs) {
  diffs.push([DIFF_EQUAL, '']);  // Add a dummy entry at the end.
  var pointer = 0;
  var count_delete = 0;
  var count_insert = 0;
  var text_delete = '';
  var text_insert = '';
  var commonlength;
  while (pointer < diffs.length) {
    switch (diffs[pointer][0]) {
      case DIFF_INSERT:
        count_insert++;
        text_insert += diffs[pointer][1];
        pointer++;
        break;
      case DIFF_DELETE:
        count_delete++;
        text_delete += diffs[pointer][1];
        pointer++;
        break;
      case DIFF_EQUAL:
        // Upon reaching an equality, check for prior redundancies.
        if (count_delete + count_insert > 1) {
          if (count_delete !== 0 && count_insert !== 0) {
            // Factor out any common prefixies.
            commonlength = this.diff_commonPrefix(text_insert, text_delete);
            if (commonlength !== 0) {
              if ((pointer - count_delete - count_insert) > 0 &&
                  diffs[pointer - count_delete - count_insert - 1][0] ==
                  DIFF_EQUAL) {
                diffs[pointer - count_delete - count_insert - 1][1] +=
                    text_insert.substring(0, commonlength);
              } else {
                diffs.splice(0, 0, [DIFF_EQUAL,
                                    text_insert.substring(0, commonlength)]);
                pointer++;
              }
              text_insert = text_insert.substring(commonlength);
              text_delete = text_delete.substring(commonlength);
            }
            // Factor out any common suffixies.
            commonlength = this.diff_commonSuffix(text_insert, text_delete);
            if (commonlength !== 0) {
              diffs[pointer][1] = text_insert.substring(text_insert.length -
                  commonlength) + diffs[pointer][1];
              text_insert = text_insert.substring(0, text_insert.length -
                  commonlength);
              text_delete = text_delete.substring(0, text_delete.length -
                  commonlength);
            }
          }
          // Delete the offending records and add the merged ones.
          if (count_delete === 0) {
            diffs.splice(pointer - count_insert,
                count_delete + count_insert, [DIFF_INSERT, text_insert]);
          } else if (count_insert === 0) {
            diffs.splice(pointer - count_delete,
                count_delete + count_insert, [DIFF_DELETE, text_delete]);
          } else {
            diffs.splice(pointer - count_delete - count_insert,
                count_delete + count_insert, [DIFF_DELETE, text_delete],
                [DIFF_INSERT, text_insert]);
          }
          pointer = pointer - count_delete - count_insert +
                    (count_delete ? 1 : 0) + (count_insert ? 1 : 0) + 1;
        } else if (pointer !== 0 && diffs[pointer - 1][0] == DIFF_EQUAL) {
          // Merge this equality with the previous one.
          diffs[pointer - 1][1] += diffs[pointer][1];
          diffs.splice(pointer, 1);
        } else {
          pointer++;
        }
        count_insert = 0;
        count_delete = 0;
        text_delete = '';
        text_insert = '';
        break;
    }
  }
  if (diffs[diffs.length - 1][1] === '') {
    diffs.pop();  // Remove the dummy entry at the end.
  }

  // Second pass: look for single edits surrounded on both sides by equalities
  // which can be shifted sideways to eliminate an equality.
  // e.g: A<ins>BA</ins>C -> <ins>AB</ins>AC
  var changes = false;
  pointer = 1;
  // Intentionally ignore the first and last element (don't need checking).
  while (pointer < diffs.length - 1) {
    if (diffs[pointer - 1][0] == DIFF_EQUAL &&
        diffs[pointer + 1][0] == DIFF_EQUAL) {
      // This is a single edit surrounded by equalities.
      if (diffs[pointer][1].substring(diffs[pointer][1].length -
          diffs[pointer - 1][1].length) == diffs[pointer - 1][1]) {
        // Shift the edit over the previous equality.
        diffs[pointer][1] = diffs[pointer - 1][1] +
            diffs[pointer][1].substring(0, diffs[pointer][1].length -
                                        diffs[pointer - 1][1].length);
        diffs[pointer + 1][1] = diffs[pointer - 1][1] + diffs[pointer + 1][1];
        diffs.splice(pointer - 1, 1);
        changes = true;
      } else if (diffs[pointer][1].substring(0, diffs[pointer + 1][1].length) ==
          diffs[pointer + 1][1]) {
        // Shift the edit over the next equality.
        diffs[pointer - 1][1] += diffs[pointer + 1][1];
        diffs[pointer][1] =
            diffs[pointer][1].substring(diffs[pointer + 1][1].length) +
            diffs[pointer + 1][1];
        diffs.splice(pointer + 1, 1);
        changes = true;
      }
    }
    pointer++;
  }
  // If shifts were made, the diff needs reordering and another shift sweep.
  if (changes) {
    this.diff_cleanupMerge(diffs);
  }
};


/**
 * loc is a location in text1, compute and return the equivalent location in
 * text2.
 * e.g. 'The cat' vs 'The big cat', 1->1, 5->8
 * @param {!Array.<!diff_match_patch.Diff>} diffs Array of diff tuples.
 * @param {number} loc Location within text1.
 * @return {number} Location within text2.
 */
diff_match_patch.prototype.diff_xIndex = function(diffs, loc) {
  var chars1 = 0;
  var chars2 = 0;
  var last_chars1 = 0;
  var last_chars2 = 0;
  var x;
  for (x = 0; x < diffs.length; x++) {
    if (diffs[x][0] !== DIFF_INSERT) {  // Equality or deletion.
      chars1 += diffs[x][1].length;
    }
    if (diffs[x][0] !== DIFF_DELETE) {  // Equality or insertion.
      chars2 += diffs[x][1].length;
    }
    if (chars1 > loc) {  // Overshot the location.
      break;
    }
    last_chars1 = chars1;
    last_chars2 = chars2;
  }
  // Was the location was deleted?
  if (diffs.length != x && diffs[x][0] === DIFF_DELETE) {
    return last_chars2;
  }
  // Add the remaining character length.
  return last_chars2 + (loc - last_chars1);
};


/**
 * Convert a diff array into a pretty HTML report.
 * @param {!Array.<!diff_match_patch.Diff>} diffs Array of diff tuples.
 * @return {string} HTML representation.
 */
diff_match_patch.prototype.diff_prettyHtml = function(diffs) {
  var html = [];
  var pattern_amp = /&/g;
  var pattern_lt = /</g;
  var pattern_gt = />/g;
  var pattern_para = /\n/g;
  for (var x = 0; x < diffs.length; x++) {
    var op = diffs[x][0];    // Operation (insert, delete, equal)
    var data = diffs[x][1];  // Text of change.
    var text = data.replace(pattern_amp, '&amp;').replace(pattern_lt, '&lt;')
        .replace(pattern_gt, '&gt;').replace(pattern_para, '&para;<br>');
    switch (op) {
      case DIFF_INSERT:
        html[x] = '<ins style="background:#e6ffe6;">' + text + '</ins>';
        break;
      case DIFF_DELETE:
        html[x] = '<del style="background:#ffe6e6;">' + text + '</del>';
        break;
      case DIFF_EQUAL:
        html[x] = '<span>' + text + '</span>';
        break;
    }
  }
  return html.join('');
};


/**
 * Compute and return the source text (all equalities and deletions).
 * @param {!Array.<!diff_match_patch.Diff>} diffs Array of diff tuples.
 * @return {string} Source text.
 */
diff_match_patch.prototype.diff_text1 = function(diffs) {
  var text = [];
  for (var x = 0; x < diffs.length; x++) {
    if (diffs[x][0] !== DIFF_INSERT) {
      text[x] = diffs[x][1];
    }
  }
  return text.join('');
};


/**
 * Compute and return the destination text (all equalities and insertions).
 * @param {!Array.<!diff_match_patch.Diff>} diffs Array of diff tuples.
 * @return {string} Destination text.
 */
diff_match_patch.prototype.diff_text2 = function(diffs) {
  var text = [];
  for (var x = 0; x < diffs.length; x++) {
    if (diffs[x][0] !== DIFF_DELETE) {
      text[x] = diffs[x][1];
    }
  }
  return text.join('');
};


/**
 * Compute the Levenshtein distance; the number of inserted, deleted or
 * substituted characters.
 * @param {!Array.<!diff_match_patch.Diff>} diffs Array of diff tuples.
 * @return {number} Number of changes.
 */
diff_match_patch.prototype.diff_levenshtein = function(diffs) {
  var levenshtein = 0;
  var insertions = 0;
  var deletions = 0;
  for (var x = 0; x < diffs.length; x++) {
    var op = diffs[x][0];
    var data = diffs[x][1];
    switch (op) {
      case DIFF_INSERT:
        insertions += data.length;
        break;
      case DIFF_DELETE:
        deletions += data.length;
        break;
      case DIFF_EQUAL:
        // A deletion and an insertion is one substitution.
        levenshtein += Math.max(insertions, deletions);
        insertions = 0;
        deletions = 0;
        break;
    }
  }
  levenshtein += Math.max(insertions, deletions);
  return levenshtein;
};


/**
 * Crush the diff into an encoded string which describes the operations
 * required to transform text1 into text2.
 * E.g. =3\t-2\t+ing  -> Keep 3 chars, delete 2 chars, insert 'ing'.
 * Operations are tab-separated.  Inserted text is escaped using %xx notation.
 * @param {!Array.<!diff_match_patch.Diff>} diffs Array of diff tuples.
 * @return {string} Delta text.
 */
diff_match_patch.prototype.diff_toDelta = function(diffs) {
  var text = [];
  for (var x = 0; x < diffs.length; x++) {
    switch (diffs[x][0]) {
      case DIFF_INSERT:
        text[x] = '+' + encodeURI(diffs[x][1]);
        break;
      case DIFF_DELETE:
        text[x] = '-' + diffs[x][1].length;
        break;
      case DIFF_EQUAL:
        text[x] = '=' + diffs[x][1].length;
        break;
    }
  }
  return text.join('\t').replace(/%20/g, ' ');
};


/**
 * Given the original text1, and an encoded string which describes the
 * operations required to transform text1 into text2, compute the full diff.
 * @param {string} text1 Source string for the diff.
 * @param {string} delta Delta text.
 * @return {!Array.<!diff_match_patch.Diff>} Array of diff tuples.
 * @throws {!Error} If invalid input.
 */
diff_match_patch.prototype.diff_fromDelta = function(text1, delta) {
  var diffs = [];
  var diffsLength = 0;  // Keeping our own length var is faster in JS.
  var pointer = 0;  // Cursor in text1
  var tokens = delta.split(/\t/g);
  for (var x = 0; x < tokens.length; x++) {
    // Each token begins with a one character parameter which specifies the
    // operation of this token (delete, insert, equality).
    var param = tokens[x].substring(1);
    switch (tokens[x].charAt(0)) {
      case '+':
        try {
          diffs[diffsLength++] = [DIFF_INSERT, decodeURI(param)];
        } catch (ex) {
          // Malformed URI sequence.
          throw new Error('Illegal escape in diff_fromDelta: ' + param);
        }
        break;
      case '-':
        // Fall through.
      case '=':
        var n = parseInt(param, 10);
        if (isNaN(n) || n < 0) {
          throw new Error('Invalid number in diff_fromDelta: ' + param);
        }
        var text = text1.substring(pointer, pointer += n);
        if (tokens[x].charAt(0) == '=') {
          diffs[diffsLength++] = [DIFF_EQUAL, text];
        } else {
          diffs[diffsLength++] = [DIFF_DELETE, text];
        }
        break;
      default:
        // Blank tokens are ok (from a trailing \t).
        // Anything else is an error.
        if (tokens[x]) {
          throw new Error('Invalid diff operation in diff_fromDelta: ' +
                          tokens[x]);
        }
    }
  }
  if (pointer != text1.length) {
    throw new Error('Delta length (' + pointer +
        ') does not equal source text length (' + text1.length + ').');
  }
  return diffs;
};


//  MATCH FUNCTIONS


/**
 * Locate the best instance of 'pattern' in 'text' near 'loc'.
 * @param {string} text The text to search.
 * @param {string} pattern The pattern to search for.
 * @param {number} loc The location to search around.
 * @return {number} Best match index or -1.
 */
diff_match_patch.prototype.match_main = function(text, pattern, loc) {
  // Check for null inputs.
  if (text == null || pattern == null || loc == null) {
    throw new Error('Null input. (match_main)');
  }

  loc = Math.max(0, Math.min(loc, text.length));
  if (text == pattern) {
    // Shortcut (potentially not guaranteed by the algorithm)
    return 0;
  } else if (!text.length) {
    // Nothing to match.
    return -1;
  } else if (text.substring(loc, loc + pattern.length) == pattern) {
    // Perfect match at the perfect spot!  (Includes case of null pattern)
    return loc;
  } else {
    // Do a fuzzy compare.
    return this.match_bitap_(text, pattern, loc);
  }
};


/**
 * Locate the best instance of 'pattern' in 'text' near 'loc' using the
 * Bitap algorithm.
 * @param {string} text The text to search.
 * @param {string} pattern The pattern to search for.
 * @param {number} loc The location to search around.
 * @return {number} Best match index or -1.
 * @private
 */
diff_match_patch.prototype.match_bitap_ = function(text, pattern, loc) {
  if (pattern.length > this.Match_MaxBits) {
    throw new Error('Pattern too long for this browser.');
  }

  // Initialise the alphabet.
  var s = this.match_alphabet_(pattern);

  var dmp = this;  // 'this' becomes 'window' in a closure.

  /**
   * Compute and return the score for a match with e errors and x location.
   * Accesses loc and pattern through being a closure.
   * @param {number} e Number of errors in match.
   * @param {number} x Location of match.
   * @return {number} Overall score for match (0.0 = good, 1.0 = bad).
   * @private
   */
  function match_bitapScore_(e, x) {
    var accuracy = e / pattern.length;
    var proximity = Math.abs(loc - x);
    if (!dmp.Match_Distance) {
      // Dodge divide by zero error.
      return proximity ? 1.0 : accuracy;
    }
    return accuracy + (proximity / dmp.Match_Distance);
  }

  // Highest score beyond which we give up.
  var score_threshold = this.Match_Threshold;
  // Is there a nearby exact match? (speedup)
  var best_loc = text.indexOf(pattern, loc);
  if (best_loc != -1) {
    score_threshold = Math.min(match_bitapScore_(0, best_loc), score_threshold);
    // What about in the other direction? (speedup)
    best_loc = text.lastIndexOf(pattern, loc + pattern.length);
    if (best_loc != -1) {
      score_threshold =
          Math.min(match_bitapScore_(0, best_loc), score_threshold);
    }
  }

  // Initialise the bit arrays.
  var matchmask = 1 << (pattern.length - 1);
  best_loc = -1;

  var bin_min, bin_mid;
  var bin_max = pattern.length + text.length;
  var last_rd;
  for (var d = 0; d < pattern.length; d++) {
    // Scan for the best match; each iteration allows for one more error.
    // Run a binary search to determine how far from 'loc' we can stray at this
    // error level.
    bin_min = 0;
    bin_mid = bin_max;
    while (bin_min < bin_mid) {
      if (match_bitapScore_(d, loc + bin_mid) <= score_threshold) {
        bin_min = bin_mid;
      } else {
        bin_max = bin_mid;
      }
      bin_mid = Math.floor((bin_max - bin_min) / 2 + bin_min);
    }
    // Use the result from this iteration as the maximum for the next.
    bin_max = bin_mid;
    var start = Math.max(1, loc - bin_mid + 1);
    var finish = Math.min(loc + bin_mid, text.length) + pattern.length;

    var rd = Array(finish + 2);
    rd[finish + 1] = (1 << d) - 1;
    for (var j = finish; j >= start; j--) {
      // The alphabet (s) is a sparse hash, so the following line generates
      // warnings.
      var charMatch = s[text.charAt(j - 1)];
      if (d === 0) {  // First pass: exact match.
        rd[j] = ((rd[j + 1] << 1) | 1) & charMatch;
      } else {  // Subsequent passes: fuzzy match.
        rd[j] = (((rd[j + 1] << 1) | 1) & charMatch) |
                (((last_rd[j + 1] | last_rd[j]) << 1) | 1) |
                last_rd[j + 1];
      }
      if (rd[j] & matchmask) {
        var score = match_bitapScore_(d, j - 1);
        // This match will almost certainly be better than any existing match.
        // But check anyway.
        if (score <= score_threshold) {
          // Told you so.
          score_threshold = score;
          best_loc = j - 1;
          if (best_loc > loc) {
            // When passing loc, don't exceed our current distance from loc.
            start = Math.max(1, 2 * loc - best_loc);
          } else {
            // Already passed loc, downhill from here on in.
            break;
          }
        }
      }
    }
    // No hope for a (better) match at greater error levels.
    if (match_bitapScore_(d + 1, loc) > score_threshold) {
      break;
    }
    last_rd = rd;
  }
  return best_loc;
};


/**
 * Initialise the alphabet for the Bitap algorithm.
 * @param {string} pattern The text to encode.
 * @return {!Object} Hash of character locations.
 * @private
 */
diff_match_patch.prototype.match_alphabet_ = function(pattern) {
  var s = {};
  for (var i = 0; i < pattern.length; i++) {
    s[pattern.charAt(i)] = 0;
  }
  for (var i = 0; i < pattern.length; i++) {
    s[pattern.charAt(i)] |= 1 << (pattern.length - i - 1);
  }
  return s;
};


//  PATCH FUNCTIONS


/**
 * Increase the context until it is unique,
 * but don't let the pattern expand beyond Match_MaxBits.
 * @param {!diff_match_patch.patch_obj} patch The patch to grow.
 * @param {string} text Source text.
 * @private
 */
diff_match_patch.prototype.patch_addContext_ = function(patch, text) {
  if (text.length == 0) {
    return;
  }
  var pattern = text.substring(patch.start2, patch.start2 + patch.length1);
  var padding = 0;

  // Look for the first and last matches of pattern in text.  If two different
  // matches are found, increase the pattern length.
  while (text.indexOf(pattern) != text.lastIndexOf(pattern) &&
         pattern.length < this.Match_MaxBits - this.Patch_Margin -
         this.Patch_Margin) {
    padding += this.Patch_Margin;
    pattern = text.substring(patch.start2 - padding,
                             patch.start2 + patch.length1 + padding);
  }
  // Add one chunk for good luck.
  padding += this.Patch_Margin;

  // Add the prefix.
  var prefix = text.substring(patch.start2 - padding, patch.start2);
  if (prefix) {
    patch.diffs.unshift([DIFF_EQUAL, prefix]);
  }
  // Add the suffix.
  var suffix = text.substring(patch.start2 + patch.length1,
                              patch.start2 + patch.length1 + padding);
  if (suffix) {
    patch.diffs.push([DIFF_EQUAL, suffix]);
  }

  // Roll back the start points.
  patch.start1 -= prefix.length;
  patch.start2 -= prefix.length;
  // Extend the lengths.
  patch.length1 += prefix.length + suffix.length;
  patch.length2 += prefix.length + suffix.length;
};


/**
 * Compute a list of patches to turn text1 into text2.
 * Use diffs if provided, otherwise compute it ourselves.
 * There are four ways to call this function, depending on what data is
 * available to the caller:
 * Method 1:
 * a = text1, b = text2
 * Method 2:
 * a = diffs
 * Method 3 (optimal):
 * a = text1, b = diffs
 * Method 4 (deprecated, use method 3):
 * a = text1, b = text2, c = diffs
 *
 * @param {string|!Array.<!diff_match_patch.Diff>} a text1 (methods 1,3,4) or
 * Array of diff tuples for text1 to text2 (method 2).
 * @param {string|!Array.<!diff_match_patch.Diff>} opt_b text2 (methods 1,4) or
 * Array of diff tuples for text1 to text2 (method 3) or undefined (method 2).
 * @param {string|!Array.<!diff_match_patch.Diff>} opt_c Array of diff tuples
 * for text1 to text2 (method 4) or undefined (methods 1,2,3).
 * @return {!Array.<!diff_match_patch.patch_obj>} Array of Patch objects.
 */
diff_match_patch.prototype.patch_make = function(a, opt_b, opt_c) {
  var text1, diffs;
  if (typeof a == 'string' && typeof opt_b == 'string' &&
      typeof opt_c == 'undefined') {
    // Method 1: text1, text2
    // Compute diffs from text1 and text2.
    text1 = /** @type {string} */(a);
    diffs = this.diff_main(text1, /** @type {string} */(opt_b), true);
    if (diffs.length > 2) {
      this.diff_cleanupSemantic(diffs);
      this.diff_cleanupEfficiency(diffs);
    }
  } else if (a && typeof a == 'object' && typeof opt_b == 'undefined' &&
      typeof opt_c == 'undefined') {
    // Method 2: diffs
    // Compute text1 from diffs.
    diffs = /** @type {!Array.<!diff_match_patch.Diff>} */(a);
    text1 = this.diff_text1(diffs);
  } else if (typeof a == 'string' && opt_b && typeof opt_b == 'object' &&
      typeof opt_c == 'undefined') {
    // Method 3: text1, diffs
    text1 = /** @type {string} */(a);
    diffs = /** @type {!Array.<!diff_match_patch.Diff>} */(opt_b);
  } else if (typeof a == 'string' && typeof opt_b == 'string' &&
      opt_c && typeof opt_c == 'object') {
    // Method 4: text1, text2, diffs
    // text2 is not used.
    text1 = /** @type {string} */(a);
    diffs = /** @type {!Array.<!diff_match_patch.Diff>} */(opt_c);
  } else {
    throw new Error('Unknown call format to patch_make.');
  }

  if (diffs.length === 0) {
    return [];  // Get rid of the null case.
  }
  var patches = [];
  var patch = new diff_match_patch.patch_obj();
  var patchDiffLength = 0;  // Keeping our own length var is faster in JS.
  var char_count1 = 0;  // Number of characters into the text1 string.
  var char_count2 = 0;  // Number of characters into the text2 string.
  // Start with text1 (prepatch_text) and apply the diffs until we arrive at
  // text2 (postpatch_text).  We recreate the patches one by one to determine
  // context info.
  var prepatch_text = text1;
  var postpatch_text = text1;
  for (var x = 0; x < diffs.length; x++) {
    var diff_type = diffs[x][0];
    var diff_text = diffs[x][1];

    if (!patchDiffLength && diff_type !== DIFF_EQUAL) {
      // A new patch starts here.
      patch.start1 = char_count1;
      patch.start2 = char_count2;
    }

    switch (diff_type) {
      case DIFF_INSERT:
        patch.diffs[patchDiffLength++] = diffs[x];
        patch.length2 += diff_text.length;
        postpatch_text = postpatch_text.substring(0, char_count2) + diff_text +
                         postpatch_text.substring(char_count2);
        break;
      case DIFF_DELETE:
        patch.length1 += diff_text.length;
        patch.diffs[patchDiffLength++] = diffs[x];
        postpatch_text = postpatch_text.substring(0, char_count2) +
                         postpatch_text.substring(char_count2 +
                             diff_text.length);
        break;
      case DIFF_EQUAL:
        if (diff_text.length <= 2 * this.Patch_Margin &&
            patchDiffLength && diffs.length != x + 1) {
          // Small equality inside a patch.
          patch.diffs[patchDiffLength++] = diffs[x];
          patch.length1 += diff_text.length;
          patch.length2 += diff_text.length;
        } else if (diff_text.length >= 2 * this.Patch_Margin) {
          // Time for a new patch.
          if (patchDiffLength) {
            this.patch_addContext_(patch, prepatch_text);
            patches.push(patch);
            patch = new diff_match_patch.patch_obj();
            patchDiffLength = 0;
            // Unlike Unidiff, our patch lists have a rolling context.
            // http://code.google.com/p/google-diff-match-patch/wiki/Unidiff
            // Update prepatch text & pos to reflect the application of the
            // just completed patch.
            prepatch_text = postpatch_text;
            char_count1 = char_count2;
          }
        }
        break;
    }

    // Update the current character count.
    if (diff_type !== DIFF_INSERT) {
      char_count1 += diff_text.length;
    }
    if (diff_type !== DIFF_DELETE) {
      char_count2 += diff_text.length;
    }
  }
  // Pick up the leftover patch if not empty.
  if (patchDiffLength) {
    this.patch_addContext_(patch, prepatch_text);
    patches.push(patch);
  }

  return patches;
};


/**
 * Given an array of patches, return another array that is identical.
 * @param {!Array.<!diff_match_patch.patch_obj>} patches Array of Patch objects.
 * @return {!Array.<!diff_match_patch.patch_obj>} Array of Patch objects.
 */
diff_match_patch.prototype.patch_deepCopy = function(patches) {
  // Making deep copies is hard in JavaScript.
  var patchesCopy = [];
  for (var x = 0; x < patches.length; x++) {
    var patch = patches[x];
    var patchCopy = new diff_match_patch.patch_obj();
    patchCopy.diffs = [];
    for (var y = 0; y < patch.diffs.length; y++) {
      patchCopy.diffs[y] = patch.diffs[y].slice();
    }
    patchCopy.start1 = patch.start1;
    patchCopy.start2 = patch.start2;
    patchCopy.length1 = patch.length1;
    patchCopy.length2 = patch.length2;
    patchesCopy[x] = patchCopy;
  }
  return patchesCopy;
};


/**
 * Merge a set of patches onto the text.  Return a patched text, as well
 * as a list of true/false values indicating which patches were applied.
 * @param {!Array.<!diff_match_patch.patch_obj>} patches Array of Patch objects.
 * @param {string} text Old text.
 * @return {!Array.<string|!Array.<boolean>>} Two element Array, containing the
 *      new text and an array of boolean values.
 */
diff_match_patch.prototype.patch_apply = function(patches, text) {
  if (patches.length == 0) {
    return [text, []];
  }

  // Deep copy the patches so that no changes are made to originals.
  patches = this.patch_deepCopy(patches);

  var nullPadding = this.patch_addPadding(patches);
  text = nullPadding + text + nullPadding;

  this.patch_splitMax(patches);
  // delta keeps track of the offset between the expected and actual location
  // of the previous patch.  If there are patches expected at positions 10 and
  // 20, but the first patch was found at 12, delta is 2 and the second patch
  // has an effective expected position of 22.
  var delta = 0;
  var results = [];
  for (var x = 0; x < patches.length; x++) {
    var expected_loc = patches[x].start2 + delta;
    var text1 = this.diff_text1(patches[x].diffs);
    var start_loc;
    var end_loc = -1;
    if (text1.length > this.Match_MaxBits) {
      // patch_splitMax will only provide an oversized pattern in the case of
      // a monster delete.
      start_loc = this.match_main(text, text1.substring(0, this.Match_MaxBits),
                                  expected_loc);
      if (start_loc != -1) {
        end_loc = this.match_main(text,
            text1.substring(text1.length - this.Match_MaxBits),
            expected_loc + text1.length - this.Match_MaxBits);
        if (end_loc == -1 || start_loc >= end_loc) {
          // Can't find valid trailing context.  Drop this patch.
          start_loc = -1;
        }
      }
    } else {
      start_loc = this.match_main(text, text1, expected_loc);
    }
    if (start_loc == -1) {
      // No match found.  :(
      results[x] = false;
      // Subtract the delta for this failed patch from subsequent patches.
      delta -= patches[x].length2 - patches[x].length1;
    } else {
      // Found a match.  :)
      results[x] = true;
      delta = start_loc - expected_loc;
      var text2;
      if (end_loc == -1) {
        text2 = text.substring(start_loc, start_loc + text1.length);
      } else {
        text2 = text.substring(start_loc, end_loc + this.Match_MaxBits);
      }
      if (text1 == text2) {
        // Perfect match, just shove the replacement text in.
        text = text.substring(0, start_loc) +
               this.diff_text2(patches[x].diffs) +
               text.substring(start_loc + text1.length);
      } else {
        // Imperfect match.  Run a diff to get a framework of equivalent
        // indices.
        var diffs = this.diff_main(text1, text2, false);
        if (text1.length > this.Match_MaxBits &&
            this.diff_levenshtein(diffs) / text1.length >
            this.Patch_DeleteThreshold) {
          // The end points match, but the content is unacceptably bad.
          results[x] = false;
        } else {
          this.diff_cleanupSemanticLossless(diffs);
          var index1 = 0;
          var index2;
          for (var y = 0; y < patches[x].diffs.length; y++) {
            var mod = patches[x].diffs[y];
            if (mod[0] !== DIFF_EQUAL) {
              index2 = this.diff_xIndex(diffs, index1);
            }
            if (mod[0] === DIFF_INSERT) {  // Insertion
              text = text.substring(0, start_loc + index2) + mod[1] +
                     text.substring(start_loc + index2);
            } else if (mod[0] === DIFF_DELETE) {  // Deletion
              text = text.substring(0, start_loc + index2) +
                     text.substring(start_loc + this.diff_xIndex(diffs,
                         index1 + mod[1].length));
            }
            if (mod[0] !== DIFF_DELETE) {
              index1 += mod[1].length;
            }
          }
        }
      }
    }
  }
  // Strip the padding off.
  text = text.substring(nullPadding.length, text.length - nullPadding.length);
  return [text, results];
};


/**
 * Add some padding on text start and end so that edges can match something.
 * Intended to be called only from within patch_apply.
 * @param {!Array.<!diff_match_patch.patch_obj>} patches Array of Patch objects.
 * @return {string} The padding string added to each side.
 */
diff_match_patch.prototype.patch_addPadding = function(patches) {
  var paddingLength = this.Patch_Margin;
  var nullPadding = '';
  for (var x = 1; x <= paddingLength; x++) {
    nullPadding += String.fromCharCode(x);
  }

  // Bump all the patches forward.
  for (var x = 0; x < patches.length; x++) {
    patches[x].start1 += paddingLength;
    patches[x].start2 += paddingLength;
  }

  // Add some padding on start of first diff.
  var patch = patches[0];
  var diffs = patch.diffs;
  if (diffs.length == 0 || diffs[0][0] != DIFF_EQUAL) {
    // Add nullPadding equality.
    diffs.unshift([DIFF_EQUAL, nullPadding]);
    patch.start1 -= paddingLength;  // Should be 0.
    patch.start2 -= paddingLength;  // Should be 0.
    patch.length1 += paddingLength;
    patch.length2 += paddingLength;
  } else if (paddingLength > diffs[0][1].length) {
    // Grow first equality.
    var extraLength = paddingLength - diffs[0][1].length;
    diffs[0][1] = nullPadding.substring(diffs[0][1].length) + diffs[0][1];
    patch.start1 -= extraLength;
    patch.start2 -= extraLength;
    patch.length1 += extraLength;
    patch.length2 += extraLength;
  }

  // Add some padding on end of last diff.
  patch = patches[patches.length - 1];
  diffs = patch.diffs;
  if (diffs.length == 0 || diffs[diffs.length - 1][0] != DIFF_EQUAL) {
    // Add nullPadding equality.
    diffs.push([DIFF_EQUAL, nullPadding]);
    patch.length1 += paddingLength;
    patch.length2 += paddingLength;
  } else if (paddingLength > diffs[diffs.length - 1][1].length) {
    // Grow last equality.
    var extraLength = paddingLength - diffs[diffs.length - 1][1].length;
    diffs[diffs.length - 1][1] += nullPadding.substring(0, extraLength);
    patch.length1 += extraLength;
    patch.length2 += extraLength;
  }

  return nullPadding;
};


/**
 * Look through the patches and break up any which are longer than the maximum
 * limit of the match algorithm.
 * Intended to be called only from within patch_apply.
 * @param {!Array.<!diff_match_patch.patch_obj>} patches Array of Patch objects.
 */
diff_match_patch.prototype.patch_splitMax = function(patches) {
  var patch_size = this.Match_MaxBits;
  for (var x = 0; x < patches.length; x++) {
    if (patches[x].length1 <= patch_size) {
      continue;
    }
    var bigpatch = patches[x];
    // Remove the big old patch.
    patches.splice(x--, 1);
    var start1 = bigpatch.start1;
    var start2 = bigpatch.start2;
    var precontext = '';
    while (bigpatch.diffs.length !== 0) {
      // Create one of several smaller patches.
      var patch = new diff_match_patch.patch_obj();
      var empty = true;
      patch.start1 = start1 - precontext.length;
      patch.start2 = start2 - precontext.length;
      if (precontext !== '') {
        patch.length1 = patch.length2 = precontext.length;
        patch.diffs.push([DIFF_EQUAL, precontext]);
      }
      while (bigpatch.diffs.length !== 0 &&
             patch.length1 < patch_size - this.Patch_Margin) {
        var diff_type = bigpatch.diffs[0][0];
        var diff_text = bigpatch.diffs[0][1];
        if (diff_type === DIFF_INSERT) {
          // Insertions are harmless.
          patch.length2 += diff_text.length;
          start2 += diff_text.length;
          patch.diffs.push(bigpatch.diffs.shift());
          empty = false;
        } else if (diff_type === DIFF_DELETE && patch.diffs.length == 1 &&
                   patch.diffs[0][0] == DIFF_EQUAL &&
                   diff_text.length > 2 * patch_size) {
          // This is a large deletion.  Let it pass in one chunk.
          patch.length1 += diff_text.length;
          start1 += diff_text.length;
          empty = false;
          patch.diffs.push([diff_type, diff_text]);
          bigpatch.diffs.shift();
        } else {
          // Deletion or equality.  Only take as much as we can stomach.
          diff_text = diff_text.substring(0,
              patch_size - patch.length1 - this.Patch_Margin);
          patch.length1 += diff_text.length;
          start1 += diff_text.length;
          if (diff_type === DIFF_EQUAL) {
            patch.length2 += diff_text.length;
            start2 += diff_text.length;
          } else {
            empty = false;
          }
          patch.diffs.push([diff_type, diff_text]);
          if (diff_text == bigpatch.diffs[0][1]) {
            bigpatch.diffs.shift();
          } else {
            bigpatch.diffs[0][1] =
                bigpatch.diffs[0][1].substring(diff_text.length);
          }
        }
      }
      // Compute the head context for the next patch.
      precontext = this.diff_text2(patch.diffs);
      precontext =
          precontext.substring(precontext.length - this.Patch_Margin);
      // Append the end context for this patch.
      var postcontext = this.diff_text1(bigpatch.diffs)
                            .substring(0, this.Patch_Margin);
      if (postcontext !== '') {
        patch.length1 += postcontext.length;
        patch.length2 += postcontext.length;
        if (patch.diffs.length !== 0 &&
            patch.diffs[patch.diffs.length - 1][0] === DIFF_EQUAL) {
          patch.diffs[patch.diffs.length - 1][1] += postcontext;
        } else {
          patch.diffs.push([DIFF_EQUAL, postcontext]);
        }
      }
      if (!empty) {
        patches.splice(++x, 0, patch);
      }
    }
  }
};


/**
 * Take a list of patches and return a textual representation.
 * @param {!Array.<!diff_match_patch.patch_obj>} patches Array of Patch objects.
 * @return {string} Text representation of patches.
 */
diff_match_patch.prototype.patch_toText = function(patches) {
  var text = [];
  for (var x = 0; x < patches.length; x++) {
    text[x] = patches[x];
  }
  return text.join('');
};


/**
 * Parse a textual representation of patches and return a list of Patch objects.
 * @param {string} textline Text representation of patches.
 * @return {!Array.<!diff_match_patch.patch_obj>} Array of Patch objects.
 * @throws {!Error} If invalid input.
 */
diff_match_patch.prototype.patch_fromText = function(textline) {
  var patches = [];
  if (!textline) {
    return patches;
  }
  var text = textline.split('\n');
  var textPointer = 0;
  var patchHeader = /^@@ -(\d+),?(\d*) \+(\d+),?(\d*) @@$/;
  while (textPointer < text.length) {
    var m = text[textPointer].match(patchHeader);
    if (!m) {
      throw new Error('Invalid patch string: ' + text[textPointer]);
    }
    var patch = new diff_match_patch.patch_obj();
    patches.push(patch);
    patch.start1 = parseInt(m[1], 10);
    if (m[2] === '') {
      patch.start1--;
      patch.length1 = 1;
    } else if (m[2] == '0') {
      patch.length1 = 0;
    } else {
      patch.start1--;
      patch.length1 = parseInt(m[2], 10);
    }

    patch.start2 = parseInt(m[3], 10);
    if (m[4] === '') {
      patch.start2--;
      patch.length2 = 1;
    } else if (m[4] == '0') {
      patch.length2 = 0;
    } else {
      patch.start2--;
      patch.length2 = parseInt(m[4], 10);
    }
    textPointer++;

    while (textPointer < text.length) {
      var sign = text[textPointer].charAt(0);
      try {
        var line = decodeURI(text[textPointer].substring(1));
      } catch (ex) {
        // Malformed URI sequence.
        throw new Error('Illegal escape in patch_fromText: ' + line);
      }
      if (sign == '-') {
        // Deletion.
        patch.diffs.push([DIFF_DELETE, line]);
      } else if (sign == '+') {
        // Insertion.
        patch.diffs.push([DIFF_INSERT, line]);
      } else if (sign == ' ') {
        // Minor equality.
        patch.diffs.push([DIFF_EQUAL, line]);
      } else if (sign == '@') {
        // Start of next patch.
        break;
      } else if (sign === '') {
        // Blank line?  Whatever.
      } else {
        // WTF?
        throw new Error('Invalid patch mode "' + sign + '" in: ' + line);
      }
      textPointer++;
    }
  }
  return patches;
};


/**
 * Class representing one patch operation.
 * @constructor
 */
diff_match_patch.patch_obj = function() {
  /** @type {!Array.<!diff_match_patch.Diff>} */
  this.diffs = [];
  /** @type {?number} */
  this.start1 = null;
  /** @type {?number} */
  this.start2 = null;
  /** @type {number} */
  this.length1 = 0;
  /** @type {number} */
  this.length2 = 0;
};


/**
 * Emmulate GNU diff's format.
 * Header: @@ -382,8 +481,9 @@
 * Indicies are printed as 1-based, not 0-based.
 * @return {string} The GNU diff string.
 */
diff_match_patch.patch_obj.prototype.toString = function() {
  var coords1, coords2;
  if (this.length1 === 0) {
    coords1 = this.start1 + ',0';
  } else if (this.length1 == 1) {
    coords1 = this.start1 + 1;
  } else {
    coords1 = (this.start1 + 1) + ',' + this.length1;
  }
  if (this.length2 === 0) {
    coords2 = this.start2 + ',0';
  } else if (this.length2 == 1) {
    coords2 = this.start2 + 1;
  } else {
    coords2 = (this.start2 + 1) + ',' + this.length2;
  }
  var text = ['@@ -' + coords1 + ' +' + coords2 + ' @@\n'];
  var op;
  // Escape the body of the patch with %xx notation.
  for (var x = 0; x < this.diffs.length; x++) {
    switch (this.diffs[x][0]) {
      case DIFF_INSERT:
        op = '+';
        break;
      case DIFF_DELETE:
        op = '-';
        break;
      case DIFF_EQUAL:
        op = ' ';
        break;
    }
    text[x + 1] = op + encodeURI(this.diffs[x][1]) + '\n';
  }
  return text.join('').replace(/%20/g, ' ');
};


// Export these global variables so that they survive Google's JS compiler.
// In a browser, 'this' will be 'window'.
// Users of node.js should 'require' the uncompressed version since Google's
// JS compiler may break the following exports for non-browser environments.
this['diff_match_patch'] = diff_match_patch;
this['DIFF_DELETE'] = DIFF_DELETE;
this['DIFF_INSERT'] = DIFF_INSERT;
this['DIFF_EQUAL'] = DIFF_EQUAL;
;
// File end: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-dependencies/diff.js
;
// File start: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-dependencies/jquery-pnotify.js
/*
 * jQuery Pines Notify (pnotify) Plugin 1.2.2
 *
 * http://pinesframework.org/pnotify/
 * Copyright (c) 2009-2012 Hunter Perrin
 *
 * Triple license under the GPL, LGPL, and MPL:
 *	  http://www.gnu.org/licenses/gpl.html
 *	  http://www.gnu.org/licenses/lgpl.html
 *	  http://www.mozilla.org/MPL/MPL-1.1.html
 */

(function($) {
	var history_handle_top,
		timer,
		body,
		jwindow = $(window),
		styling = {
			jqueryui: {
				container: "ui-widget ui-widget-content ui-corner-all",
				notice: "ui-state-highlight",
				// (The actual jQUI notice icon looks terrible.)
				notice_icon: "ui-icon ui-icon-info",
				info: "",
				info_icon: "ui-icon ui-icon-info",
				success: "ui-state-default",
				success_icon: "ui-icon ui-icon-circle-check",
				error: "ui-state-error",
				error_icon: "ui-icon ui-icon-alert",
				closer: "ui-icon ui-icon-close",
				pin_up: "ui-icon ui-icon-pin-w",
				pin_down: "ui-icon ui-icon-pin-s",
				hi_menu: "ui-state-default ui-corner-bottom",
				hi_btn: "ui-state-default ui-corner-all",
				hi_btnhov: "ui-state-hover",
				hi_hnd: "ui-icon ui-icon-grip-dotted-horizontal"
			},
			bootstrap: {
				container: "alert",
				notice: "",
				notice_icon: "icon-exclamation-sign",
				info: "alert-info",
				info_icon: "icon-info-sign",
				success: "alert-success",
				success_icon: "icon-ok-sign",
				error: "alert-error",
				error_icon: "icon-warning-sign",
				closer: "icon-remove",
				pin_up: "icon-pause",
				pin_down: "icon-play",
				hi_menu: "well",
				hi_btn: "btn",
				hi_btnhov: "",
				hi_hnd: "icon-chevron-down"
			}
		};
	// Set global variables.
	var do_when_ready = function(){
		body = $("body");
		jwindow = $(window);
		// Reposition the notices when the window resizes.
		jwindow.bind('resize', function(){
			if (timer)
				clearTimeout(timer);
			timer = setTimeout($.pnotify_position_all, 10);
		});
	};
	if (document.body)
		do_when_ready();
	else
		$(do_when_ready);
	$.extend({
		pnotify_remove_all: function () {
			var notices_data = jwindow.data("pnotify");
			/* POA: Added null-check */
			if (notices_data && notices_data.length) {
				$.each(notices_data, function(){
					if (this.pnotify_remove)
						this.pnotify_remove();
				});
			}
		},
		pnotify_position_all: function () {
			// This timer is used for queueing this function so it doesn't run
			// repeatedly.
			if (timer)
				clearTimeout(timer);
			timer = null;
			// Get all the notices.
			var notices_data = jwindow.data("pnotify");
			if (!notices_data || !notices_data.length)
				return;
			// Reset the next position data.
			$.each(notices_data, function(){
				var s = this.opts.stack;
				if (!s) return;
				s.nextpos1 = s.firstpos1;
				s.nextpos2 = s.firstpos2;
				s.addpos2 = 0;
				s.animation = true;
			});
			$.each(notices_data, function(){
				this.pnotify_position();
			});
		},
		pnotify: function(options) {
			// Stores what is currently being animated (in or out).
			var animating;

			// Build main options.
			var opts;
			if (typeof options != "object") {
				opts = $.extend({}, $.pnotify.defaults);
				opts.text = options;
			} else {
				opts = $.extend({}, $.pnotify.defaults, options);
			}
			// Translate old pnotify_ style options.
			for (var i in opts) {
				if (typeof i == "string" && i.match(/^pnotify_/))
					opts[i.replace(/^pnotify_/, "")] = opts[i];
			}

			if (opts.before_init) {
				if (opts.before_init(opts) === false)
					return null;
			}

			// This keeps track of the last element the mouse was over, so
			// mouseleave, mouseenter, etc can be called.
			var nonblock_last_elem;
			// This is used to pass events through the notice if it is non-blocking.
			var nonblock_pass = function(e, e_name){
				pnotify.css("display", "none");
				var element_below = document.elementFromPoint(e.clientX, e.clientY);
				pnotify.css("display", "block");
				var jelement_below = $(element_below);
				var cursor_style = jelement_below.css("cursor");
				pnotify.css("cursor", cursor_style != "auto" ? cursor_style : "default");
				// If the element changed, call mouseenter, mouseleave, etc.
				if (!nonblock_last_elem || nonblock_last_elem.get(0) != element_below) {
					if (nonblock_last_elem) {
						dom_event.call(nonblock_last_elem.get(0), "mouseleave", e.originalEvent);
						dom_event.call(nonblock_last_elem.get(0), "mouseout", e.originalEvent);
					}
					dom_event.call(element_below, "mouseenter", e.originalEvent);
					dom_event.call(element_below, "mouseover", e.originalEvent);
				}
				dom_event.call(element_below, e_name, e.originalEvent);
				// Remember the latest element the mouse was over.
				nonblock_last_elem = jelement_below;
			};

			// Get our styling object.
			var styles = styling[opts.styling];

			// Create our widget.
			// Stop animation, reset the removal timer, and show the close
			// button when the user mouses over.
			var pnotify = $("<div />", {
				"class": "ui-pnotify "+opts.addclass,
				"css": {"display": "none"},
				"mouseenter": function(e){
					if (opts.nonblock) e.stopPropagation();
					if (opts.mouse_reset && animating == "out") {
						// If it's animating out, animate back in really quickly.
						pnotify.stop(true);
						animating = "in";
						pnotify.css("height", "auto").animate({"width": opts.width, "opacity": opts.nonblock ? opts.nonblock_opacity : opts.opacity}, "fast");
					}
					if (opts.nonblock) {
						// If it's non-blocking, animate to the other opacity.
						pnotify.stop().animate({"opacity": opts.nonblock_opacity}, "fast");
					}
					// Stop the close timer.
					if (opts.hide && opts.mouse_reset) pnotify.pnotify_cancel_remove();
					// Show the buttons.
					if (opts.sticker && !opts.nonblock) pnotify.sticker.trigger("pnotify_icon").css("visibility", "visible");
					if (opts.closer && !opts.nonblock) pnotify.closer.css("visibility", "visible");
				},
				"mouseleave": function(e){
					if (opts.nonblock) e.stopPropagation();
					nonblock_last_elem = null;
					pnotify.css("cursor", "auto");
					// Animate back to the normal opacity.
					if (opts.nonblock && animating != "out")
						pnotify.stop().animate({"opacity": opts.opacity}, "fast");
					// Start the close timer.
					if (opts.hide && opts.mouse_reset) pnotify.pnotify_queue_remove();
					// Hide the buttons.
					if (opts.sticker_hover)
						pnotify.sticker.css("visibility", "hidden");
					if (opts.closer_hover)
						pnotify.closer.css("visibility", "hidden");
					$.pnotify_position_all();
				},
				"mouseover": function(e){
					if (opts.nonblock) e.stopPropagation();
				},
				"mouseout": function(e){
					if (opts.nonblock) e.stopPropagation();
				},
				"mousemove": function(e){
					if (opts.nonblock) {
						e.stopPropagation();
						nonblock_pass(e, "onmousemove");
					}
				},
				"mousedown": function(e){
					if (opts.nonblock) {
						e.stopPropagation();
						e.preventDefault();
						nonblock_pass(e, "onmousedown");
					}
				},
				"mouseup": function(e){
					if (opts.nonblock) {
						e.stopPropagation();
						e.preventDefault();
						nonblock_pass(e, "onmouseup");
					}
				},
				"click": function(e){
					if (opts.nonblock) {
						e.stopPropagation();
						nonblock_pass(e, "onclick");
					}
				},
				"dblclick": function(e){
					if (opts.nonblock) {
						e.stopPropagation();
						nonblock_pass(e, "ondblclick");
					}
				}
			});
			pnotify.opts = opts;
			// Create a container for the notice contents.
                        var stateClass;
                        if (opts.state) {
                            stateClass = 'ui-state-' + opts.state;
                        } else if (styles[opts.type]) {
                            stateClass = styles[opts.type];
                        } else {
                            stateClass = styles.notice;
                        }
			pnotify.container = $("<div />", {
                            "class": styles.container + " ui-pnotify-container " + stateClass
                        }).appendTo(pnotify);
			if (opts.cornerclass != "")
				pnotify.container.removeClass("ui-corner-all").addClass(opts.cornerclass);
			// Create a drop shadow.
			if (opts.shadow)
				pnotify.container.addClass("ui-pnotify-shadow");

			// The current version of Pines Notify.
			pnotify.pnotify_version = "1.2.2";

			// This function is for updating the notice.
			pnotify.pnotify = function(options) {
				// Update the notice.
				var old_opts = opts;
				if (typeof options == "string")
					opts.text = options;
				else
					opts = $.extend({}, opts, options);
				// Translate old pnotify_ style options.
				for (var i in opts) {
					if (typeof i == "string" && i.match(/^pnotify_/))
						opts[i.replace(/^pnotify_/, "")] = opts[i];
				}
				pnotify.opts = opts;
				// Update the corner class.
				if (opts.cornerclass != old_opts.cornerclass)
					pnotify.container.removeClass("ui-corner-all").addClass(opts.cornerclass);
				// Update the shadow.
				if (opts.shadow != old_opts.shadow) {
					if (opts.shadow)
						pnotify.container.addClass("ui-pnotify-shadow");
					else
						pnotify.container.removeClass("ui-pnotify-shadow");
				}
				// Update the additional classes.
				if (opts.addclass === false)
					pnotify.removeClass(old_opts.addclass);
				else if (opts.addclass !== old_opts.addclass)
					pnotify.removeClass(old_opts.addclass).addClass(opts.addclass);
				// Update the title.
				if (opts.title === false)
					pnotify.title_container.slideUp("fast");
				else if (opts.title !== old_opts.title) {
					if (opts.title_escape)
						pnotify.title_container.text(opts.title).slideDown(200);
					else
						pnotify.title_container.html(opts.title).slideDown(200);
				}
				// Update the text.
				if (opts.text === false) {
					pnotify.text_container.slideUp("fast");
				} else if (opts.text !== old_opts.text) {
					if (opts.text_escape)
						pnotify.text_container.text(opts.text).slideDown(200);
					else
						pnotify.text_container.html(opts.insert_brs ? String(opts.text).replace(/\n/g, "<br />") : opts.text).slideDown(200);
				}
				// Update values for history menu access.
				pnotify.pnotify_history = opts.history;
				pnotify.pnotify_hide = opts.hide;
				// Change the notice type.
				if (opts.type != old_opts.type)
					pnotify.container.removeClass(styles.error+" "+styles.notice+" "+styles.success+" "+styles.info).addClass(opts.type == "error" ? styles.error : (opts.type == "info" ? styles.info : (opts.type == "success" ? styles.success : styles.notice)));
				if (opts.icon !== old_opts.icon || (opts.icon === true && opts.type != old_opts.type)) {
					// Remove any old icon.
					pnotify.container.find("div.ui-pnotify-icon").remove();
					if (opts.icon !== false) {
						// Build the new icon.
						$("<div />", {"class": "ui-pnotify-icon"})
						.append($("<span />", {"class": opts.icon === true ? (opts.type == "error" ? styles.error_icon : (opts.type == "info" ? styles.info_icon : (opts.type == "success" ? styles.success_icon : styles.notice_icon))) : opts.icon}))
						.prependTo(pnotify.container);
					}
				}
				// Update the width.
				if (opts.width !== old_opts.width)
					pnotify.animate({width: opts.width});
				// Update the minimum height.
				if (opts.min_height !== old_opts.min_height)
					pnotify.container.animate({minHeight: opts.min_height});
				// Update the opacity.
				if (opts.opacity !== old_opts.opacity)
					pnotify.fadeTo(opts.animate_speed, opts.opacity);
				// Update the sticker and closer buttons.
				if (!opts.closer || opts.nonblock)
					pnotify.closer.css("display", "none");
				else
					pnotify.closer.css("display", "block");
				if (!opts.sticker || opts.nonblock)
					pnotify.sticker.css("display", "none");
				else
					pnotify.sticker.css("display", "block");
				// Update the sticker icon.
				pnotify.sticker.trigger("pnotify_icon");
				// Update the hover status of the buttons.
				if (opts.sticker_hover)
					pnotify.sticker.css("visibility", "hidden");
				else if (!opts.nonblock)
					pnotify.sticker.css("visibility", "visible");
				if (opts.closer_hover)
					pnotify.closer.css("visibility", "hidden");
				else if (!opts.nonblock)
					pnotify.closer.css("visibility", "visible");
				// Update the timed hiding.
				if (!opts.hide)
					pnotify.pnotify_cancel_remove();
				else if (!old_opts.hide)
					pnotify.pnotify_queue_remove();
				pnotify.pnotify_queue_position();
				return pnotify;
			};

			// Position the notice. dont_skip_hidden causes the notice to
			// position even if it's not visible.
			pnotify.pnotify_position = function(dont_skip_hidden){
				// Get the notice's stack.
				var s = pnotify.opts.stack;
				if (!s) return;
				if (!s.nextpos1)
					s.nextpos1 = s.firstpos1;
				if (!s.nextpos2)
					s.nextpos2 = s.firstpos2;
				if (!s.addpos2)
					s.addpos2 = 0;
				var hidden = pnotify.css("display") == "none";
				// Skip this notice if it's not shown.
				if (!hidden || dont_skip_hidden) {
					var curpos1, curpos2;
					// Store what will need to be animated.
					var animate = {};
					// Calculate the current pos1 value.
					var csspos1;
					switch (s.dir1) {
						case "down":
							csspos1 = "top";
							break;
						case "up":
							csspos1 = "bottom";
							break;
						case "left":
							csspos1 = "right";
							break;
						case "right":
							csspos1 = "left";
							break;
					}
					curpos1 = parseInt(pnotify.css(csspos1));
					if (isNaN(curpos1))
						curpos1 = 0;
					// Remember the first pos1, so the first visible notice goes there.
					if (typeof s.firstpos1 == "undefined" && !hidden) {
						s.firstpos1 = curpos1;
						s.nextpos1 = s.firstpos1;
					}
					// Calculate the current pos2 value.
					var csspos2;
					switch (s.dir2) {
						case "down":
							csspos2 = "top";
							break;
						case "up":
							csspos2 = "bottom";
							break;
						case "left":
							csspos2 = "right";
							break;
						case "right":
							csspos2 = "left";
							break;
					}
					curpos2 = parseInt(pnotify.css(csspos2));
					if (isNaN(curpos2))
						curpos2 = 0;
					// Remember the first pos2, so the first visible notice goes there.
					if (typeof s.firstpos2 == "undefined" && !hidden) {
						s.firstpos2 = curpos2;
						s.nextpos2 = s.firstpos2;
					}
					// Check that it's not beyond the viewport edge.
					if ((s.dir1 == "down" && s.nextpos1 + pnotify.height() > jwindow.height()) ||
						(s.dir1 == "up" && s.nextpos1 + pnotify.height() > jwindow.height()) ||
						(s.dir1 == "left" && s.nextpos1 + pnotify.width() > jwindow.width()) ||
						(s.dir1 == "right" && s.nextpos1 + pnotify.width() > jwindow.width()) ) {
						// If it is, it needs to go back to the first pos1, and over on pos2.
						s.nextpos1 = s.firstpos1;
						s.nextpos2 += s.addpos2 + (typeof s.spacing2 == "undefined" ? 25 : s.spacing2);
						s.addpos2 = 0;
					}
					// Animate if we're moving on dir2.
					if (s.animation && s.nextpos2 < curpos2) {
						switch (s.dir2) {
							case "down":
								animate.top = s.nextpos2+"px";
								break;
							case "up":
								animate.bottom = s.nextpos2+"px";
								break;
							case "left":
								animate.right = s.nextpos2+"px";
								break;
							case "right":
								animate.left = s.nextpos2+"px";
								break;
						}
					} else {
						if(s.nextpos2)
							pnotify.css(csspos2, s.nextpos2+"px");
					}
					// Keep track of the widest/tallest notice in the column/row, so we can push the next column/row.
					switch (s.dir2) {
						case "down":
						case "up":
							if (pnotify.outerHeight(true) > s.addpos2)
								s.addpos2 = pnotify.height();
							break;
						case "left":
						case "right":
							if (pnotify.outerWidth(true) > s.addpos2)
								s.addpos2 = pnotify.width();
							break;
					}
					// Move the notice on dir1.
					if (s.nextpos1) {
						// Animate if we're moving toward the first pos.
						if (s.animation && (curpos1 > s.nextpos1 || animate.top || animate.bottom || animate.right || animate.left)) {
							switch (s.dir1) {
								case "down":
									animate.top = s.nextpos1+"px";
									break;
								case "up":
									animate.bottom = s.nextpos1+"px";
									break;
								case "left":
									animate.right = s.nextpos1+"px";
									break;
								case "right":
									animate.left = s.nextpos1+"px";
									break;
							}
						} else
							pnotify.css(csspos1, s.nextpos1+"px");
					}
					// Run the animation.
					if (animate.top || animate.bottom || animate.right || animate.left)
						pnotify.animate(animate, {duration: this.opts.position_animate_speed, queue: false});
					// Calculate the next dir1 position.
					switch (s.dir1) {
						case "down":
						case "up":
							s.nextpos1 += pnotify.height() + (typeof s.spacing1 == "undefined" ? 25 : s.spacing1);
							break;
						case "left":
						case "right":
							s.nextpos1 += pnotify.width() + (typeof s.spacing1 == "undefined" ? 25 : s.spacing1);
							break;
					}
				}
			};

			// Queue the positiona all function so it doesn't run repeatedly and
			// use up resources.
			pnotify.pnotify_queue_position = function(milliseconds){
				if (timer)
					clearTimeout(timer);
				if (!milliseconds)
					milliseconds = 10;
				timer = setTimeout($.pnotify_position_all, milliseconds);
			};

			// Display the notice.
			pnotify.pnotify_display = function() {
                // Remove oldest notifications leaving only opts.maxonscreen on screen
                notices_data = jwindow.data("pnotify");
                if (notices_data && (notices_data.length > opts.maxonscreen)) {
                    $.each(notices_data.slice(0, notices_data.length - opts.maxonscreen), function(){
                        if (this.pnotify_remove)
                            this.pnotify_remove();
                        });
                };
				// If the notice is not in the DOM, append it.
				if (!pnotify.parent().length)
					pnotify.appendTo(body);
				// Run callback.
				if (opts.before_open) {
					if (opts.before_open(pnotify) === false)
						return;
				}
				// Try to put it in the right position.
				if (opts.stack.push != "top")
					pnotify.pnotify_position(true);
				// First show it, then set its opacity, then hide it.
				if (opts.animation == "fade" || opts.animation.effect_in == "fade") {
					// If it's fading in, it should start at 0.
					pnotify.show().fadeTo(0, 0).hide();
				} else {
					// Or else it should be set to the opacity.
					if (opts.opacity != 1)
						pnotify.show().fadeTo(0, opts.opacity).hide();
				}
				pnotify.animate_in(function(){
					if (opts.after_open)
						opts.after_open(pnotify);

					pnotify.pnotify_queue_position();

					// Now set it to hide.
					if (opts.hide)
						pnotify.pnotify_queue_remove();
				});
			};

			// Remove the notice.
			pnotify.pnotify_remove = function() {
				if (pnotify.timer) {
					window.clearTimeout(pnotify.timer);
					pnotify.timer = null;
				}
				// Run callback.
				if (opts.before_close) {
					if (opts.before_close(pnotify) === false)
						return;
				}
				pnotify.animate_out(function(){
					if (opts.after_close) {
						if (opts.after_close(pnotify) === false)
							return;
					}
					pnotify.pnotify_queue_position();
					// If we're supposed to remove the notice from the DOM, do it.
					if (opts.remove)
						pnotify.detach();
				});
			};

			// Animate the notice in.
			pnotify.animate_in = function(callback){
				// Declare that the notice is animating in. (Or has completed animating in.)
				animating = "in";
				var animation;
				if (typeof opts.animation.effect_in != "undefined")
					animation = opts.animation.effect_in;
				else
					animation = opts.animation;
				if (animation == "none") {
					pnotify.show();
					callback();
				} else if (animation == "show")
					pnotify.show(opts.animate_speed, callback);
				else if (animation == "fade")
					pnotify.show().fadeTo(opts.animate_speed, opts.opacity, callback);
				else if (animation == "slide")
					pnotify.slideDown(opts.animate_speed, callback);
				else if (typeof animation == "function")
					animation("in", callback, pnotify);
				else
					pnotify.show(animation, (typeof opts.animation.options_in == "object" ? opts.animation.options_in : {}), opts.animate_speed, callback);
			};

			// Animate the notice out.
			pnotify.animate_out = function(callback){
				// Declare that the notice is animating out. (Or has completed animating out.)
				animating = "out";
				var animation;
				if (typeof opts.animation.effect_out != "undefined")
					animation = opts.animation.effect_out;
				else
					animation = opts.animation;
				if (animation == "none") {
					pnotify.hide();
					callback();
				} else if (animation == "show")
					pnotify.hide(opts.animate_speed, callback);
				else if (animation == "fade")
					pnotify.fadeOut(opts.animate_speed, callback);
				else if (animation == "slide")
					pnotify.slideUp(opts.animate_speed, callback);
				else if (typeof animation == "function")
					animation("out", callback, pnotify);
				else
					pnotify.hide(animation, (typeof opts.animation.options_out == "object" ? opts.animation.options_out : {}), opts.animate_speed, callback);
			};

			// Cancel any pending removal timer.
			pnotify.pnotify_cancel_remove = function() {
				if (pnotify.timer)
					window.clearTimeout(pnotify.timer);
			};

			// Queue a removal timer.
			pnotify.pnotify_queue_remove = function() {
				// Cancel any current removal timer.
				pnotify.pnotify_cancel_remove();
				pnotify.timer = window.setTimeout(function(){
					pnotify.pnotify_remove();
				}, (isNaN(opts.delay) ? 0 : opts.delay));
			};

			// Provide a button to close the notice.
			pnotify.closer = $("<div />", {
				"class": "ui-pnotify-closer",
				"css": {"cursor": "pointer", "visibility": opts.closer_hover ? "hidden" : "visible"},
				"click": function(){
					pnotify.pnotify_remove();
					pnotify.sticker.css("visibility", "hidden");
					pnotify.closer.css("visibility", "hidden");
				}
			})
			.append($("<span />", {"class": styles.closer, "title": opts.labels.close}))
			.appendTo(pnotify.container);
			if (!opts.closer || opts.nonblock)
				pnotify.closer.css("display", "none");

			// Provide a button to stick the notice.
			pnotify.sticker = $("<div />", {
				"class": "ui-pnotify-sticker",
				"css": {"cursor": "pointer", "visibility": opts.sticker_hover ? "hidden" : "visible"},
				"click": function(){
					opts.hide = !opts.hide;
					if (opts.hide)
						pnotify.pnotify_queue_remove();
					else
						pnotify.pnotify_cancel_remove();
					$(this).trigger("pnotify_icon");
				}
			})
			.bind("pnotify_icon", function(){
				$(this).children().removeClass(styles.pin_up+" "+styles.pin_down).addClass(opts.hide ? styles.pin_up : styles.pin_down);
			})
			.append($("<span />", {"class": styles.pin_up, "title": opts.labels.stick}))
			.appendTo(pnotify.container);
			if (!opts.sticker || opts.nonblock)
				pnotify.sticker.css("display", "none");

			// Add the appropriate icon.
			if (opts.icon !== false) {
				$("<div />", {"class": "ui-pnotify-icon"})
				.append($("<span />", {"class": opts.icon === true ? (opts.type == "error" ? styles.error_icon : (opts.type == "info" ? styles.info_icon : (opts.type == "success" ? styles.success_icon : styles.notice_icon))) : opts.icon}))
				.prependTo(pnotify.container);
			}

			// Add a title.
			pnotify.title_container = $("<span />", {
				"class": "ui-pnotify-title"
			})
			.appendTo(pnotify.container);
			if (opts.title === false)
				pnotify.title_container.hide();
			else if (opts.title_escape)
				pnotify.title_container.text(opts.title);
			else
				pnotify.title_container.html(opts.title);

			// Add text.
			pnotify.text_container = $("<div />", {
				"class": "ui-pnotify-text"
			})
			.appendTo(pnotify.container);
			if (opts.text === false)
				pnotify.text_container.hide();
			else if (opts.text_escape)
				pnotify.text_container.text(opts.text);
			else
				pnotify.text_container.html(opts.insert_brs ? String(opts.text).replace(/\n/g, "<br />") : opts.text);

			// Set width and min height.
			if (typeof opts.width == "string")
				pnotify.css("width", opts.width);
			if (typeof opts.min_height == "string")
				pnotify.container.css("min-height", opts.min_height);

			// The history variable controls whether the notice gets redisplayed
			// by the history pull down.
			pnotify.pnotify_history = opts.history;
			// The hide variable controls whether the history pull down should
			// queue a removal timer.
			pnotify.pnotify_hide = opts.hide;

			// Add the notice to the notice array.
			var notices_data = jwindow.data("pnotify");
			if (notices_data == null || typeof notices_data != "object")
				notices_data = [];
			if (opts.stack.push == "top")
				notices_data = $.merge([pnotify], notices_data);
			else
				notices_data = $.merge(notices_data, [pnotify]);
			jwindow.data("pnotify", notices_data);
			// Now position all the notices if they are to push to the top.
			if (opts.stack.push == "top")
				pnotify.pnotify_queue_position(1);

			// Run callback.
			if (opts.after_init)
				opts.after_init(pnotify);

			if (opts.history) {
				// If there isn't a history pull down, create one.
				var history_menu = jwindow.data("pnotify_history");
				if (typeof history_menu == "undefined") {
					history_menu = $("<div />", {
						"class": "ui-pnotify-history-container "+styles.hi_menu,
						"mouseleave": function(){
							history_menu.animate({top: "-"+history_handle_top+"px"}, {duration: 100, queue: false});
						}
					})
					.append($("<div />", {"class": "ui-pnotify-history-header", "text": opts.labels.redisplay}))
					.append($("<button />", {
							"class": "ui-pnotify-history-all "+styles.hi_btn,
							"text": opts.labels.all,
							"mouseenter": function(){
								$(this).addClass(styles.hi_btnhov);
							},
							"mouseleave": function(){
								$(this).removeClass(styles.hi_btnhov);
							},
							"click": function(){
								// Display all notices. (Disregarding non-history notices.)
								$.each(notices_data, function(){
									if (this.pnotify_history) {
										if (this.is(":visible")) {
											if (this.pnotify_hide)
												this.pnotify_queue_remove();
										} else if (this.pnotify_display)
											this.pnotify_display();
									}
								});
								return false;
							}
					}))
					.append($("<button />", {
							"class": "ui-pnotify-history-last "+styles.hi_btn,
							"text": opts.labels.last,
							"mouseenter": function(){
								$(this).addClass(styles.hi_btnhov);
							},
							"mouseleave": function(){
								$(this).removeClass(styles.hi_btnhov);
							},
							"click": function(){
								// Look up the last history notice, and display it.
								var i = -1;
								var notice;
								do {
									if (i == -1)
										notice = notices_data.slice(i);
									else
										notice = notices_data.slice(i, i+1);
									if (!notice[0])
										break;
									i--;
								} while (!notice[0].pnotify_history || notice[0].is(":visible"));
								if (!notice[0])
									return false;
								if (notice[0].pnotify_display)
									notice[0].pnotify_display();
								return false;
							}
					}))
					.appendTo(body);

					// Make a handle so the user can pull down the history tab.
					var handle = $("<span />", {
						"class": "ui-pnotify-history-pulldown "+styles.hi_hnd,
						"mouseenter": function(){
							history_menu.animate({top: "0"}, {duration: 100, queue: false});
						}
					})
					.appendTo(history_menu);

					// Get the top of the handle.
					history_handle_top = handle.offset().top + 2;
					// Hide the history pull down up to the top of the handle.
					history_menu.css({top: "-"+history_handle_top+"px"});
					// Save the history pull down.
					jwindow.data("pnotify_history", history_menu);
				}
			}

			// Mark the stack so it won't animate the new notice.
			opts.stack.animation = false;

			// Display the notice.
			if (opts.auto_display)
				pnotify.pnotify_display();

			return pnotify;
		}
	});

	// Some useful regexes.
	var re_on = /^on/,
		re_mouse_events = /^(dbl)?click$|^mouse(move|down|up|over|out|enter|leave)$|^contextmenu$/,
		re_ui_events = /^(focus|blur|select|change|reset)$|^key(press|down|up)$/,
		re_html_events = /^(scroll|resize|(un)?load|abort|error)$/;
	// Fire a DOM event.
	var dom_event = function(e, orig_e){
		var event_object;
		e = e.toLowerCase();
		if (document.createEvent && this.dispatchEvent) {
			// FireFox, Opera, Safari, Chrome
			e = e.replace(re_on, '');
			if (e.match(re_mouse_events)) {
				// This allows the click event to fire on the notice. There is
				// probably a much better way to do it.
				$(this).offset();
				event_object = document.createEvent("MouseEvents");
				event_object.initMouseEvent(
					e, orig_e.bubbles, orig_e.cancelable, orig_e.view, orig_e.detail,
					orig_e.screenX, orig_e.screenY, orig_e.clientX, orig_e.clientY,
					orig_e.ctrlKey, orig_e.altKey, orig_e.shiftKey, orig_e.metaKey, orig_e.button, orig_e.relatedTarget
				);
			} else if (e.match(re_ui_events)) {
				event_object = document.createEvent("UIEvents");
				event_object.initUIEvent(e, orig_e.bubbles, orig_e.cancelable, orig_e.view, orig_e.detail);
			} else if (e.match(re_html_events)) {
				event_object = document.createEvent("HTMLEvents");
				event_object.initEvent(e, orig_e.bubbles, orig_e.cancelable);
			}
			if (!event_object) return;
			this.dispatchEvent(event_object);
		} else {
			// Internet Explorer
			if (!e.match(re_on)) e = "on"+e;
			event_object = document.createEventObject(orig_e);
			this.fireEvent(e, event_object);
		}
	};

	$.pnotify.defaults = {
		// The notice's title.
		title: false,
		// Whether to escape the content of the title. (Not allow HTML.)
		title_escape: false,
		// The notice's text.
		text: false,
		// Whether to escape the content of the text. (Not allow HTML.)
		text_escape: false,
		// What styling classes to use. (Can be either jqueryui or bootstrap.)
		styling: "bootstrap",
		// Additional classes to be added to the notice. (For custom styling.)
		addclass: "",
		// Class to be added to the notice for corner styling.
		cornerclass: "",
		// Create a non-blocking notice. It lets the user click elements underneath it.
		nonblock: false,
		// The opacity of the notice (if it's non-blocking) when the mouse is over it.
		nonblock_opacity: .2,
		// Display a pull down menu to redisplay previous notices, and place the notice in the history.
		history: true,
        // Maximum number of notifications to have onscreen
        maxonscreen: Infinity,
		// Display the notice when it is created. Turn this off to add notifications to the history without displaying them.
		auto_display: true,
		// Width of the notice.
		width: "300px",
		// Minimum height of the notice. It will expand to fit content.
		min_height: "16px",
		// Type of the notice. "notice", "info", "success", or "error".
		type: "notice",
		// Set icon to true to use the default icon for the selected style/type, false for no icon, or a string for your own icon class.
		icon: true,
		// The animation to use when displaying and hiding the notice. "none", "show", "fade", and "slide" are built in to jQuery. Others require jQuery UI. Use an object with effect_in and effect_out to use different effects.
		animation: "fade",
		// Speed at which the notice animates in and out. "slow", "def" or "normal", "fast" or number of milliseconds.
		animate_speed: "slow",
		// Specify a specific duration of position animation
		position_animate_speed: 500,
		// Opacity of the notice.
		opacity: 1,
		// Display a drop shadow.
		shadow: true,
		// Provide a button for the user to manually close the notice.
		closer: true,
		// Only show the closer button on hover.
		closer_hover: true,
		// Provide a button for the user to manually stick the notice.
		sticker: true,
		// Only show the sticker button on hover.
		sticker_hover: true,
		// After a delay, remove the notice.
		hide: true,
		// Delay in milliseconds before the notice is removed.
		delay: 8000,
		// Reset the hide timer if the mouse moves over the notice.
		mouse_reset: true,
		// Remove the notice's elements from the DOM after it is removed.
		remove: true,
		// Change new lines to br tags.
		insert_brs: true,
		// The stack on which the notices will be placed. Also controls the direction the notices stack.
		stack: {"dir1": "down", "dir2": "left", "push": "bottom", "spacing1": 25, "spacing2": 25},
                //Lets you change the displayed text, facilitating the internationalization.
                labels: {
                    redisplay: "Redisplay",
                    all: "All",
                    last: "Last",
                    close: "Close",
                    stick: "Stick"
                }
	};
})(jQuery);;
// File end: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-dependencies/jquery-pnotify.js
;
// File start: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-dependencies/classlist.js
/*
 * classList.js: Cross-browser full element.classList implementation.
 * 2012-11-15
 *
 * By Eli Grey, http://eligrey.com
 * Public Domain.
 * NO WARRANTY EXPRESSED OR IMPLIED. USE AT YOUR OWN RISK.
 */

/*global self, document, DOMException */

/*! @source http://purl.eligrey.com/github/classList.js/blob/master/classList.js*/
// <ie>
if ("document" in self && !(
                "classList" in document.createElement("_") &&
                "classList" in document.createElementNS("http://www.w3.org/2000/svg", "svg")
        )) {

(function (view) {

"use strict";

if (!('Element' in view)) return;

var
          classListProp = "classList"
        , protoProp = "prototype"
        , elemCtrProto = view.Element[protoProp]
        , objCtr = Object
        , strTrim = String[protoProp].trim || function () {
                return this.replace(/^\s+|\s+$/g, "");
        }
        , arrIndexOf = Array[protoProp].indexOf || function (item) {
                var
                          i = 0
                        , len = this.length
                ;
                for (; i < len; i++) {
                        if (i in this && this[i] === item) {
                                return i;
                        }
                }
                return -1;
        }
        // Vendors: please allow content code to instantiate DOMExceptions
        , DOMEx = function (type, message) {
                this.name = type;
                this.code = DOMException[type];
                this.message = message;
        }
        , checkTokenAndGetIndex = function (classList, token) {
                if (token === "") {
                        throw new DOMEx(
                                  "SYNTAX_ERR"
                                , "An invalid or illegal string was specified"
                        );
                }
                if (/\s/.test(token)) {
                        throw new DOMEx(
                                  "INVALID_CHARACTER_ERR"
                                , "String contains an invalid character"
                        );
                }
                return arrIndexOf.call(classList, token);
        }
        , ClassList = function (elem) {
                var
                          trimmedClasses = strTrim.call(elem.getAttribute("class"))
                        , classes = trimmedClasses ? trimmedClasses.split(/\s+/) : []
                        , i = 0
                        , len = classes.length
                ;
                for (; i < len; i++) {
                        this.push(classes[i]);
                }
                this._updateClassName = function () {
                        elem.setAttribute("class", this.toString());
                };
        }
        , classListProto = ClassList[protoProp] = []
        , classListGetter = function () {
                return new ClassList(this);
        }
;
// Most DOMException implementations don't allow calling DOMException's toString()
// on non-DOMExceptions. Error's toString() is sufficient here.
DOMEx[protoProp] = Error[protoProp];
classListProto.item = function (i) {
        return this[i] || null;
};
classListProto.contains = function (token) {
        token += "";
        return checkTokenAndGetIndex(this, token) !== -1;
};
classListProto.add = function () {
        var
                  tokens = arguments
                , i = 0
                , l = tokens.length
                , token
                , updated = false
        ;
        do {
                token = tokens[i] + "";
                if (checkTokenAndGetIndex(this, token) === -1) {
                        this.push(token);
                        updated = true;
                }
        }
        while (++i < l);

        if (updated) {
                this._updateClassName();
        }
};
classListProto.remove = function () {
        var
                  tokens = arguments
                , i = 0
                , l = tokens.length
                , token
                , updated = false
        ;
        do {
                token = tokens[i] + "";
                var index = checkTokenAndGetIndex(this, token);
                if (index !== -1) {
                        this.splice(index, 1);
                        updated = true;
                }
        }
        while (++i < l);

        if (updated) {
                this._updateClassName();
        }
};
classListProto.toggle = function (token, forse) {
        token += "";

        var
                  result = this.contains(token)
                , method = result ?
                        forse !== true && "remove"
                :
                        forse !== false && "add"
        ;

        if (method) {
                this[method](token);
        }

        return !result;
};
classListProto.toString = function () {
        return this.join(" ");
};

if (objCtr.defineProperty) {
        var classListPropDesc = {
                  get: classListGetter
                , enumerable: true
                , configurable: true
        };
        try {
                objCtr.defineProperty(elemCtrProto, classListProp, classListPropDesc);
        } catch (ex) { // IE 8 doesn't support enumerable:true
                if (ex.number === -0x7FF5EC54) {
                        classListPropDesc.enumerable = false;
                        objCtr.defineProperty(elemCtrProto, classListProp, classListPropDesc);
                }
        }
} else if (objCtr[protoProp].__defineGetter__) {
        elemCtrProto.__defineGetter__(classListProp, classListGetter);
}

}(self));

}
// </ie>
;
// File end: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-dependencies/classlist.js
;
// File start: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-dependencies/pixastic.custom.js
/*
 * Pixastic Lib - Core Functions - v0.1.3
 * Copyright (c) 2008 Jacob Seidelin, jseidelin@nihilogic.dk, http://blog.nihilogic.dk/
 * License: [http://www.pixastic.com/lib/license.txt]
 */

var Pixastic = (function() {


	function addEvent(el, event, handler) {
		if (el.addEventListener)
			el.addEventListener(event, handler, false);
		else if (el.attachEvent)
			el.attachEvent("on" + event, handler);
	}

	function onready(handler) {
		var handlerDone = false;
		var execHandler = function() {
			if (!handlerDone) {
				handlerDone = true;
				handler();
			}
		}
		document.write("<"+"script defer src=\"//:\" id=\"__onload_ie_pixastic__\"></"+"script>");
		var script = document.getElementById("__onload_ie_pixastic__");
		script.onreadystatechange = function() {
			if (script.readyState == "complete") {
				script.parentNode.removeChild(script);
				execHandler();
			}
		}
		if (document.addEventListener)
			document.addEventListener("DOMContentLoaded", execHandler, false);
		addEvent(window, "load", execHandler);
	}

	function init() {
		var imgEls = getElementsByClass("pixastic", null, "img");
		var canvasEls = getElementsByClass("pixastic", null, "canvas");
		var elements = imgEls.concat(canvasEls);
		for (var i=0;i<elements.length;i++) {
			(function() {

			var el = elements[i];
			var actions = [];
			var classes = el.className.split(" ");
			for (var c=0;c<classes.length;c++) {
				var cls = classes[c];
				if (cls.substring(0,9) == "pixastic-") {
					var actionName = cls.substring(9);
					if (actionName != "")
						actions.push(actionName);
				}
			}
			if (actions.length) {
				if (el.tagName.toLowerCase() == "img") {
					var dataImg = new Image();
					dataImg.src = el.src;
					if (dataImg.complete) {
						for (var a=0;a<actions.length;a++) {
							var res = Pixastic.applyAction(el, el, actions[a], null);
							if (res)
								el = res;
						}
					} else {
						dataImg.onload = function() {
							for (var a=0;a<actions.length;a++) {
								var res = Pixastic.applyAction(el, el, actions[a], null)
								if (res)
									el = res;
							}
						}
					}
				} else {
					setTimeout(function() {
						for (var a=0;a<actions.length;a++) {
							var res = Pixastic.applyAction(
								el, el, actions[a], null
							);
							if (res)
								el = res;
						}
					},1);
				}
			}

			})();
		}
	}

	if (typeof pixastic_parseonload != "undefined" && pixastic_parseonload)
		onready(init);

	// getElementsByClass by Dustin Diaz, http://www.dustindiaz.com/getelementsbyclass/
	function getElementsByClass(searchClass,node,tag) {
	        var classElements = new Array();
	        if ( node == null )
	                node = document;
	        if ( tag == null )
	                tag = '*';

	        var els = node.getElementsByTagName(tag);
	        var elsLen = els.length;
	        var pattern = new RegExp("(^|\\s)"+searchClass+"(\\s|$)");
	        for (i = 0, j = 0; i < elsLen; i++) {
	                if ( pattern.test(els[i].className) ) {
	                        classElements[j] = els[i];
	                        j++;
	                }
	        }
	        return classElements;
	}

	var debugElement;

	function writeDebug(text, level) {
		if (!Pixastic.debug) return;
		try {
			switch (level) {
				case "warn" :
					console.warn("Pixastic:", text);
					break;
				case "error" :
					console.error("Pixastic:", text);
					break;
				default:
					console.log("Pixastic:", text);
			}
		} catch(e) {
		}
		if (!debugElement) {

		}
	}

	// canvas capability checks

	var hasCanvas = (function() {
		var c = document.createElement("canvas");
		var val = false;
		try {
			val = !!((typeof c.getContext == "function") && c.getContext("2d"));
		} catch(e) {}
		return function() {
			return val;
		}
	})();

	var hasCanvasImageData = (function() {
		var c = document.createElement("canvas");
		var val = false;
		var ctx;
		try {
			if (typeof c.getContext == "function" && (ctx = c.getContext("2d"))) {
				val = (typeof ctx.getImageData == "function");
			}
		} catch(e) {}
		return function() {
			return val;
		}
	})();

	var hasGlobalAlpha = (function() {
		var hasAlpha = false;
		var red = document.createElement("canvas");
		if (hasCanvas() && hasCanvasImageData()) {
			red.width = red.height = 1;
			var redctx = red.getContext("2d");
			redctx.fillStyle = "rgb(255,0,0)";
			redctx.fillRect(0,0,1,1);

			var blue = document.createElement("canvas");
			blue.width = blue.height = 1;
			var bluectx = blue.getContext("2d");
			bluectx.fillStyle = "rgb(0,0,255)";
			bluectx.fillRect(0,0,1,1);

			redctx.globalAlpha = 0.5;
			redctx.drawImage(blue, 0, 0);
			var reddata = redctx.getImageData(0,0,1,1).data;

			hasAlpha = (reddata[2] != 255);
		}
		return function() {
			return hasAlpha;
		}
	})();


	// return public interface

	return {

		parseOnLoad : false,

		debug : false,

		applyAction : function(img, dataImg, actionName, options) {

			options = options || {};

			var imageIsCanvas = (img.tagName.toLowerCase() == "canvas");
			if (imageIsCanvas && Pixastic.Client.isIE()) {
				if (Pixastic.debug) writeDebug("Tried to process a canvas element but browser is IE.");
				return false;
			}

			var canvas, ctx;
			var hasOutputCanvas = false;
			if (Pixastic.Client.hasCanvas()) {
				hasOutputCanvas = !!options.resultCanvas;
				canvas = options.resultCanvas || document.createElement("canvas");
				ctx = canvas.getContext("2d");
			}

			var w = img.offsetWidth;
			var h = img.offsetHeight;

			if (imageIsCanvas) {
				w = img.width;
				h = img.height;
			}

			// offsetWidth/Height might be 0 if the image is not in the document
			if (w == 0 || h == 0) {
				if (img.parentNode == null) {
					// add the image to the doc (way out left), read its dimensions and remove it again
					var oldpos = img.style.position;
					var oldleft = img.style.left;
					img.style.position = "absolute";
					img.style.left = "-9999px";
					document.body.appendChild(img);
					w = img.offsetWidth;
					h = img.offsetHeight;
					document.body.removeChild(img);
					img.style.position = oldpos;
					img.style.left = oldleft;
				} else {
					if (Pixastic.debug) writeDebug("Image has 0 width and/or height.");
					return;
				}
			}

			if (actionName.indexOf("(") > -1) {
				var tmp = actionName;
				actionName = tmp.substr(0, tmp.indexOf("("));
				var arg = tmp.match(/\((.*?)\)/);
				if (arg[1]) {
					arg = arg[1].split(";");
					for (var a=0;a<arg.length;a++) {
						thisArg = arg[a].split("=");
						if (thisArg.length == 2) {
							if (thisArg[0] == "rect") {
								var rectVal = thisArg[1].split(",");
								options[thisArg[0]] = {
									left : parseInt(rectVal[0],10)||0,
									top : parseInt(rectVal[1],10)||0,
									width : parseInt(rectVal[2],10)||0,
									height : parseInt(rectVal[3],10)||0
								}
							} else {
								options[thisArg[0]] = thisArg[1];
							}
						}
					}
				}
			}

			if (!options.rect) {
				options.rect = {
					left : 0, top : 0, width : w, height : h
				};
			} else {
				options.rect.left = Math.round(options.rect.left);
				options.rect.top = Math.round(options.rect.top);
				options.rect.width = Math.round(options.rect.width);
				options.rect.height = Math.round(options.rect.height);
			}

			var validAction = false;
			if (Pixastic.Actions[actionName] && typeof Pixastic.Actions[actionName].process == "function") {
				validAction = true;
			}
			if (!validAction) {
				if (Pixastic.debug) writeDebug("Invalid action \"" + actionName + "\". Maybe file not included?");
				return false;
			}
			if (!Pixastic.Actions[actionName].checkSupport()) {
				if (Pixastic.debug) writeDebug("Action \"" + actionName + "\" not supported by this browser.");
				return false;
			}

			if (Pixastic.Client.hasCanvas()) {
				if (canvas !== img) {
					canvas.width = w;
					canvas.height = h;
				}
				if (!hasOutputCanvas) {
					canvas.style.width = w+"px";
					canvas.style.height = h+"px";
				}
				ctx.drawImage(dataImg,0,0,w,h);

				if (!img.__pixastic_org_image) {
					canvas.__pixastic_org_image = img;
					canvas.__pixastic_org_width = w;
					canvas.__pixastic_org_height = h;
				} else {
					canvas.__pixastic_org_image = img.__pixastic_org_image;
					canvas.__pixastic_org_width = img.__pixastic_org_width;
					canvas.__pixastic_org_height = img.__pixastic_org_height;
				}

			} else if (Pixastic.Client.isIE() && typeof img.__pixastic_org_style == "undefined") {
				img.__pixastic_org_style = img.style.cssText;
			}

			var params = {
				image : img,
				canvas : canvas,
				width : w,
				height : h,
				useData : true,
				options : options
			}

			// Ok, let's do it!

			var res = Pixastic.Actions[actionName].process(params);

			if (!res) {
				return false;
			}

			if (Pixastic.Client.hasCanvas()) {
				if (params.useData) {
					if (Pixastic.Client.hasCanvasImageData()) {
						canvas.getContext("2d").putImageData(params.canvasData, options.rect.left, options.rect.top);

						// Opera doesn't seem to update the canvas until we draw something on it, lets draw a 0x0 rectangle.
						// Is this still so?
						canvas.getContext("2d").fillRect(0,0,0,0);
					}
				}

				if (!options.leaveDOM) {
					// copy properties and stuff from the source image
					canvas.title = img.title;
					canvas.imgsrc = img.imgsrc;
					if (!imageIsCanvas) canvas.alt  = img.alt;
					if (!imageIsCanvas) canvas.imgsrc = img.src;
					canvas.className = img.className;
					canvas.style.cssText = img.style.cssText;
					canvas.name = img.name;
					canvas.tabIndex = img.tabIndex;
					canvas.id = img.id;
					if (img.parentNode && img.parentNode.replaceChild) {
						img.parentNode.replaceChild(canvas, img);
					}
				}

				options.resultCanvas = canvas;

				return canvas;
			}

			return img;
		},

		prepareData : function(params, getCopy) {
			var ctx = params.canvas.getContext("2d");
			var rect = params.options.rect;
			var dataDesc = ctx.getImageData(rect.left, rect.top, rect.width, rect.height);
			var data = dataDesc.data;
			if (!getCopy) params.canvasData = dataDesc;
			return data;
		},

		// load the image file
		process : function(img, actionName, options, callback) {
			if (img.tagName.toLowerCase() == "img") {
				var dataImg = new Image();
				dataImg.src = img.src;
				if (dataImg.complete) {
					var res = Pixastic.applyAction(img, dataImg, actionName, options);
					if (callback) callback(res);
					return res;
				} else {
					dataImg.onload = function() {
						var res = Pixastic.applyAction(img, dataImg, actionName, options)
						if (callback) callback(res);
					}
				}
			}
			if (img.tagName.toLowerCase() == "canvas") {
				var res = Pixastic.applyAction(img, img, actionName, options);
				if (callback) callback(res);
				return res;
			}
		},

		revert : function(img) {
			if (Pixastic.Client.hasCanvas()) {
				if (img.tagName.toLowerCase() == "canvas" && img.__pixastic_org_image) {
					img.width = img.__pixastic_org_width;
					img.height = img.__pixastic_org_height;
					img.getContext("2d").drawImage(img.__pixastic_org_image, 0, 0);

					if (img.parentNode && img.parentNode.replaceChild) {
						img.parentNode.replaceChild(img.__pixastic_org_image, img);
					}

					return img;
				}
			} else if (Pixastic.Client.isIE()) {
 				if (typeof img.__pixastic_org_style != "undefined")
					img.style.cssText = img.__pixastic_org_style;
			}
		},

		Client : {
			hasCanvas : hasCanvas,
			hasCanvasImageData : hasCanvasImageData,
			hasGlobalAlpha : hasGlobalAlpha,
			isIE : function() {
				return !!document.all && !!window.attachEvent && !window.opera;
			}
		},

		Actions : {}
	}


})();
/*
 * Pixastic Lib - Blur filter - v0.1.0
 * Copyright (c) 2008 Jacob Seidelin, jseidelin@nihilogic.dk, http://blog.nihilogic.dk/
 * License: [http://www.pixastic.com/lib/license.txt]
 */

Pixastic.Actions.blur = {
	process : function(params) {

		if (typeof params.options.fixMargin == "undefined")
			params.options.fixMargin = true;

		if (Pixastic.Client.hasCanvasImageData()) {
			var data = Pixastic.prepareData(params);
			var dataCopy = Pixastic.prepareData(params, true)

			/*
			var kernel = [
				[0.5, 	1, 	0.5],
				[1, 	2, 	1],
				[0.5, 	1, 	0.5]
			];
			*/

			var kernel = [
				[0, 	1, 	0],
				[1, 	2, 	1],
				[0, 	1, 	0]
			];

			var weight = 0;
			for (var i=0;i<3;i++) {
				for (var j=0;j<3;j++) {
					weight += kernel[i][j];
				}
			}

			weight = 1 / (weight*2);

			var rect = params.options.rect;
			var w = rect.width;
			var h = rect.height;

			var w4 = w*4;
			var y = h;
			do {
				var offsetY = (y-1)*w4;

				var prevY = (y == 1) ? 0 : y-2;
				var nextY = (y == h) ? y - 1 : y;

				var offsetYPrev = prevY*w*4;
				var offsetYNext = nextY*w*4;

				var x = w;
				do {
					var offset = offsetY + (x*4-4);

					var offsetPrev = offsetYPrev + ((x == 1) ? 0 : x-2) * 4;
					var offsetNext = offsetYNext + ((x == w) ? x-1 : x) * 4;

					data[offset] = (
						/*
						dataCopy[offsetPrev - 4]
						+ dataCopy[offsetPrev+4]
						+ dataCopy[offsetNext - 4]
						+ dataCopy[offsetNext+4]
						+
						*/
						(dataCopy[offsetPrev]
						+ dataCopy[offset-4]
						+ dataCopy[offset+4]
						+ dataCopy[offsetNext])		* 2
						+ dataCopy[offset] 		* 4
						) * weight;

					data[offset+1] = (
						/*
						dataCopy[offsetPrev - 3]
						+ dataCopy[offsetPrev+5]
						+ dataCopy[offsetNext - 3]
						+ dataCopy[offsetNext+5]
						+
						*/
						(dataCopy[offsetPrev+1]
						+ dataCopy[offset-3]
						+ dataCopy[offset+5]
						+ dataCopy[offsetNext+1])	* 2
						+ dataCopy[offset+1] 		* 4
						) * weight;

					data[offset+2] = (
						/*
						dataCopy[offsetPrev - 2]
						+ dataCopy[offsetPrev+6]
						+ dataCopy[offsetNext - 2]
						+ dataCopy[offsetNext+6]
						+
						*/
						(dataCopy[offsetPrev+2]
						+ dataCopy[offset-2]
						+ dataCopy[offset+6]
						+ dataCopy[offsetNext+2])	* 2
						+ dataCopy[offset+2] 		* 4
						) * weight;

				} while (--x);
			} while (--y);

			return true;

		} else if (Pixastic.Client.isIE()) {
			params.image.style.filter += " progid:DXImageTransform.Microsoft.Blur(pixelradius=1.5)";

			if (params.options.fixMargin) {
				params.image.style.marginLeft = (parseInt(params.image.style.marginLeft,10)||0) - 2 + "px";
				params.image.style.marginTop = (parseInt(params.image.style.marginTop,10)||0) - 2 + "px";
			}

			return true;
		}
	},
	checkSupport : function() {
		return (Pixastic.Client.hasCanvasImageData() || Pixastic.Client.isIE());
	}
}/*
 * Pixastic Lib - Brightness/Contrast filter - v0.1.1
 * Copyright (c) 2008 Jacob Seidelin, jseidelin@nihilogic.dk, http://blog.nihilogic.dk/
 * License: [http://www.pixastic.com/lib/license.txt]
 */

Pixastic.Actions.brightness = {

	process : function(params) {

		var brightness = parseInt(params.options.brightness,10) || 0;
		var contrast = parseFloat(params.options.contrast)||0;
		var legacy = !!(params.options.legacy && params.options.legacy != "false");

		if (legacy) {
			brightness = Math.min(150,Math.max(-150,brightness));
		} else {
			var brightMul = 1 + Math.min(150,Math.max(-150,brightness)) / 150;
		}
		contrast = Math.max(0,contrast+1);

		if (Pixastic.Client.hasCanvasImageData()) {
			var data = Pixastic.prepareData(params);
			var rect = params.options.rect;
			var w = rect.width;
			var h = rect.height;

			var p = w*h;
			var pix = p*4, pix1, pix2;

			var mul, add;
			if (contrast != 1) {
				if (legacy) {
					mul = contrast;
					add = (brightness - 128) * contrast + 128;
				} else {
					mul = brightMul * contrast;
					add = - contrast * 128 + 128;
				}
			} else {  // this if-then is not necessary anymore, is it?
				if (legacy) {
					mul = 1;
					add = brightness;
				} else {
					mul = brightMul;
					add = 0;
				}
			}
			var r, g, b;
			while (p--) {
				if ((r = data[pix-=4] * mul + add) > 255 )
					data[pix] = 255;
				else if (r < 0)
					data[pix] = 0;
				else
 					data[pix] = r;

				if ((g = data[pix1=pix+1] * mul + add) > 255 )
					data[pix1] = 255;
				else if (g < 0)
					data[pix1] = 0;
				else
					data[pix1] = g;

				if ((b = data[pix2=pix+2] * mul + add) > 255 )
					data[pix2] = 255;
				else if (b < 0)
					data[pix2] = 0;
				else
					data[pix2] = b;
			}
			return true;
		}
	},
	checkSupport : function() {
		return Pixastic.Client.hasCanvasImageData();
	}
}

/*
 * Pixastic Lib - Color adjust filter - v0.1.1
 * Copyright (c) 2008 Jacob Seidelin, jseidelin@nihilogic.dk, http://blog.nihilogic.dk/
 * License: [http://www.pixastic.com/lib/license.txt]
 */

Pixastic.Actions.coloradjust = {

	process : function(params) {
		var red = parseFloat(params.options.red) || 0;
		var green = parseFloat(params.options.green) || 0;
		var blue = parseFloat(params.options.blue) || 0;

		red = Math.round(red*255);
		green = Math.round(green*255);
		blue = Math.round(blue*255);

		if (Pixastic.Client.hasCanvasImageData()) {
			var data = Pixastic.prepareData(params);
			var rect = params.options.rect;

			var p = rect.width*rect.height;
			var pix = p*4, pix1, pix2;

			var r, g, b;
			while (p--) {
				pix -= 4;

				if (red) {
					if ((r = data[pix] + red) < 0 )
						data[pix] = 0;
					else if (r > 255 )
						data[pix] = 255;
					else
						data[pix] = r;
				}

				if (green) {
					if ((g = data[pix1=pix+1] + green) < 0 )
						data[pix1] = 0;
					else if (g > 255 )
						data[pix1] = 255;
					else
						data[pix1] = g;
				}

				if (blue) {
					if ((b = data[pix2=pix+2] + blue) < 0 )
						data[pix2] = 0;
					else if (b > 255 )
						data[pix2] = 255;
					else
						data[pix2] = b;
				}
			}
			return true;
		}
	},
	checkSupport : function() {
		return (Pixastic.Client.hasCanvasImageData());
	}
}
/*
 * Pixastic Lib - Desaturation filter - v0.1.1
 * Copyright (c) 2008 Jacob Seidelin, jseidelin@nihilogic.dk, http://blog.nihilogic.dk/
 * License: [http://www.pixastic.com/lib/license.txt]
 */

Pixastic.Actions.desaturate = {

	process : function(params) {
		var useAverage = !!(params.options.average && params.options.average != "false");

		if (Pixastic.Client.hasCanvasImageData()) {
			var data = Pixastic.prepareData(params);
			var rect = params.options.rect;
			var w = rect.width;
			var h = rect.height;

			var p = w*h;
			var pix = p*4, pix1, pix2;

			if (useAverage) {
				while (p--)
					data[pix-=4] = data[pix1=pix+1] = data[pix2=pix+2] = (data[pix]+data[pix1]+data[pix2])/3
			} else {
				while (p--)
					data[pix-=4] = data[pix1=pix+1] = data[pix2=pix+2] = (data[pix]*0.3 + data[pix1]*0.59 + data[pix2]*0.11);
			}
			return true;
		} else if (Pixastic.Client.isIE()) {
			params.image.style.filter += " gray";
			return true;
		}
	},
	checkSupport : function() {
		return (Pixastic.Client.hasCanvasImageData() || Pixastic.Client.isIE());
	}
}/*
 * Pixastic Lib - Glow - v0.1.0
 * Copyright (c) 2008 Jacob Seidelin, jseidelin@nihilogic.dk, http://blog.nihilogic.dk/
 * License: [http://www.pixastic.com/lib/license.txt]
 */


Pixastic.Actions.glow = {
	process : function(params) {

		var amount = (parseFloat(params.options.amount)||0);
		var blurAmount = parseFloat(params.options.radius)||0;

		amount = Math.min(1,Math.max(0,amount));
		blurAmount = Math.min(5,Math.max(0,blurAmount));

		if (Pixastic.Client.hasCanvasImageData()) {
			var rect = params.options.rect;

			var blurCanvas = document.createElement("canvas");
			blurCanvas.width = params.width;
			blurCanvas.height = params.height;
			var blurCtx = blurCanvas.getContext("2d");
			blurCtx.drawImage(params.canvas,0,0);

			var scale = 2;
			var smallWidth = Math.round(params.width / scale);
			var smallHeight = Math.round(params.height / scale);

			var copy = document.createElement("canvas");
			copy.width = smallWidth;
			copy.height = smallHeight;

			var clear = true;
			var steps = Math.round(blurAmount * 20);

			var copyCtx = copy.getContext("2d");
			for (var i=0;i<steps;i++) {
				var scaledWidth = Math.max(1,Math.round(smallWidth - i));
				var scaledHeight = Math.max(1,Math.round(smallHeight - i));

				copyCtx.clearRect(0,0,smallWidth,smallHeight);

				copyCtx.drawImage(
					blurCanvas,
					0,0,params.width,params.height,
					0,0,scaledWidth,scaledHeight
				);

				blurCtx.clearRect(0,0,params.width,params.height);

				blurCtx.drawImage(
					copy,
					0,0,scaledWidth,scaledHeight,
					0,0,params.width,params.height
				);
			}

			var data = Pixastic.prepareData(params);
			var blurData = Pixastic.prepareData({canvas:blurCanvas,options:params.options});

			var p = rect.width * rect.height;

			var pix = p*4, pix1 = pix + 1, pix2 = pix + 2, pix3 = pix + 3;
			while (p--) {
				if ((data[pix-=4] += amount * blurData[pix]) > 255) data[pix] = 255;
				if ((data[pix1-=4] += amount * blurData[pix1]) > 255) data[pix1] = 255;
				if ((data[pix2-=4] += amount * blurData[pix2]) > 255) data[pix2] = 255;
			}

			return true;
		}
	},
	checkSupport : function() {
		return Pixastic.Client.hasCanvasImageData();
	}
}



/*
 * Pixastic Lib - HSL Adjust  - v0.1.1
 * Copyright (c) 2008 Jacob Seidelin, jseidelin@nihilogic.dk, http://blog.nihilogic.dk/
 * License: [http://www.pixastic.com/lib/license.txt]
 */

Pixastic.Actions.hsl = {
	process : function(params) {

		var hue = parseInt(params.options.hue,10)||0;
		var saturation = (parseInt(params.options.saturation,10)||0) / 100;
		var lightness = (parseInt(params.options.lightness,10)||0) / 100;


		// this seems to give the same result as Photoshop
		if (saturation < 0) {
			var satMul = 1+saturation;
		} else {
			var satMul = 1+saturation*2;
		}

		hue = (hue%360) / 360;
		var hue6 = hue * 6;

		var rgbDiv = 1 / 255;

		var light255 = lightness * 255;
		var lightp1 = 1 + lightness;
		var lightm1 = 1 - lightness;
		if (Pixastic.Client.hasCanvasImageData()) {
			var data = Pixastic.prepareData(params);

			var rect = params.options.rect;

			var p = rect.width * rect.height;

			var pix = p*4, pix1 = pix + 1, pix2 = pix + 2, pix3 = pix + 3;

			while (p--) {

				var r = data[pix-=4];
				var g = data[pix1=pix+1];
				var b = data[pix2=pix+2];

				if (hue != 0 || saturation != 0) {
					// ok, here comes rgb to hsl + adjust + hsl to rgb, all in one jumbled mess.
					// It's not so pretty, but it's been optimized to get somewhat decent performance.
					// The transforms were originally adapted from the ones found in Graphics Gems, but have been heavily modified.
					var vs = r;
					if (g > vs) vs = g;
					if (b > vs) vs = b;
					var ms = r;
					if (g < ms) ms = g;
					if (b < ms) ms = b;
					var vm = (vs-ms);
					var l = (ms+vs)/510;
					if (l > 0) {
						if (vm > 0) {
							if (l <= 0.5) {
								var s = vm / (vs+ms) * satMul;
								if (s > 1) s = 1;
								var v = (l * (1+s));
							} else {
								var s = vm / (510-vs-ms) * satMul;
								if (s > 1) s = 1;
								var v = (l+s - l*s);
							}
							if (r == vs) {
								if (g == ms)
									var h = 5 + ((vs-b)/vm) + hue6;
								else
									var h = 1 - ((vs-g)/vm) + hue6;
							} else if (g == vs) {
								if (b == ms)
									var h = 1 + ((vs-r)/vm) + hue6;
								else
									var h = 3 - ((vs-b)/vm) + hue6;
							} else {
								if (r == ms)
									var h = 3 + ((vs-g)/vm) + hue6;
								else
									var h = 5 - ((vs-r)/vm) + hue6;
							}
							if (h < 0) h+=6;
							if (h >= 6) h-=6;
							var m = (l+l-v);
							var sextant = h>>0;
							if (sextant == 0) {
								r = v*255; g = (m+((v-m)*(h-sextant)))*255; b = m*255;
							} else if (sextant == 1) {
								r = (v-((v-m)*(h-sextant)))*255; g = v*255; b = m*255;
							} else if (sextant == 2) {
								r = m*255; g = v*255; b = (m+((v-m)*(h-sextant)))*255;
							} else if (sextant == 3) {
								r = m*255; g = (v-((v-m)*(h-sextant)))*255; b = v*255;
							} else if (sextant == 4) {
								r = (m+((v-m)*(h-sextant)))*255; g = m*255; b = v*255;
							} else if (sextant == 5) {
								r = v*255; g = m*255; b = (v-((v-m)*(h-sextant)))*255;
							}
						}
					}
				}

				if (lightness < 0) {
					r *= lightp1;
					g *= lightp1;
					b *= lightp1;
				} else if (lightness > 0) {
					r = r * lightm1 + light255;
					g = g * lightm1 + light255;
					b = b * lightm1 + light255;
				}

				if (r < 0)
					data[pix] = 0
				else if (r > 255)
					data[pix] = 255
				else
					data[pix] = r;

				if (g < 0)
					data[pix1] = 0
				else if (g > 255)
					data[pix1] = 255
				else
					data[pix1] = g;

				if (b < 0)
					data[pix2] = 0
				else if (b > 255)
					data[pix2] = 255
				else
					data[pix2] = b;

			}

			return true;
		}
	},
	checkSupport : function() {
		return Pixastic.Client.hasCanvasImageData();
	}

}
/*
 * Pixastic Lib - Invert filter - v0.1.1
 * Copyright (c) 2008 Jacob Seidelin, jseidelin@nihilogic.dk, http://blog.nihilogic.dk/
 * License: [http://www.pixastic.com/lib/license.txt]
 */

Pixastic.Actions.invert = {
	process : function(params) {
		if (Pixastic.Client.hasCanvasImageData()) {
			var data = Pixastic.prepareData(params);

			var invertAlpha = !!params.options.invertAlpha;
			var rect = params.options.rect;

			var p = rect.width * rect.height;

			var pix = p*4, pix1 = pix + 1, pix2 = pix + 2, pix3 = pix + 3;

			while (p--) {
				data[pix-=4] = 255 - data[pix];
				data[pix1-=4] = 255 - data[pix1];
				data[pix2-=4] = 255 - data[pix2];
				if (invertAlpha)
					data[pix3-=4] = 255 - data[pix3];
			}

			return true;
		} else if (Pixastic.Client.isIE()) {
			params.image.style.filter += " invert";
			return true;
		}
	},
	checkSupport : function() {
		return (Pixastic.Client.hasCanvasImageData() || Pixastic.Client.isIE());
	}
}
/*
 * Pixastic Lib - Posterize effect - v0.1.0
 * Copyright (c) 2008 Jacob Seidelin, jseidelin@nihilogic.dk, http://blog.nihilogic.dk/
 * License: [http://www.pixastic.com/lib/license.txt]
 */

Pixastic.Actions.posterize = {

	process : function(params) {


		var numLevels = 256;
		if (typeof params.options.levels != "undefined")
			numLevels = parseInt(params.options.levels,10)||1;

		if (Pixastic.Client.hasCanvasImageData()) {
			var data = Pixastic.prepareData(params);

			numLevels = Math.max(2,Math.min(256,numLevels));

			var numAreas = 256 / numLevels;
			var numValues = 256 / (numLevels-1);

			var rect = params.options.rect;
			var w = rect.width;
			var h = rect.height;
			var w4 = w*4;
			var y = h;
			do {
				var offsetY = (y-1)*w4;
				var x = w;
				do {
					var offset = offsetY + (x-1)*4;

					var r = numValues * ((data[offset] / numAreas)>>0);
					var g = numValues * ((data[offset+1] / numAreas)>>0);
					var b = numValues * ((data[offset+2] / numAreas)>>0);

					if (r > 255) r = 255;
					if (g > 255) g = 255;
					if (b > 255) b = 255;

					data[offset] = r;
					data[offset+1] = g;
					data[offset+2] = b;

				} while (--x);
			} while (--y);
			return true;
		}
	},
	checkSupport : function() {
		return Pixastic.Client.hasCanvasImageData();
	}
}


/*
 * Pixastic Lib - Remove noise - v0.1.0
 * Copyright (c) 2008 Jacob Seidelin, jseidelin@nihilogic.dk, http://blog.nihilogic.dk/
 * License: [http://www.pixastic.com/lib/license.txt]
 */

Pixastic.Actions.removenoise = {
	process : function(params) {

		if (Pixastic.Client.hasCanvasImageData()) {
			var data = Pixastic.prepareData(params);

			var rect = params.options.rect;
			var w = rect.width;
			var h = rect.height;

			var w4 = w*4;
			var y = h;
			do {
				var offsetY = (y-1)*w4;

				var nextY = (y == h) ? y - 1 : y;
				var prevY = (y == 1) ? 0 : y-2;

				var offsetYPrev = prevY*w*4;
				var offsetYNext = nextY*w*4;

				var x = w;
				do {
					var offset = offsetY + (x*4-4);

					var offsetPrev = offsetYPrev + ((x == 1) ? 0 : x-2) * 4;
					var offsetNext = offsetYNext + ((x == w) ? x-1 : x) * 4;

					var minR, maxR, minG, maxG, minB, maxB;

					minR = maxR = data[offsetPrev];
					var r1 = data[offset-4], r2 = data[offset+4], r3 = data[offsetNext];
					if (r1 < minR) minR = r1;
					if (r2 < minR) minR = r2;
					if (r3 < minR) minR = r3;
					if (r1 > maxR) maxR = r1;
					if (r2 > maxR) maxR = r2;
					if (r3 > maxR) maxR = r3;

					minG = maxG = data[offsetPrev+1];
					var g1 = data[offset-3], g2 = data[offset+5], g3 = data[offsetNext+1];
					if (g1 < minG) minG = g1;
					if (g2 < minG) minG = g2;
					if (g3 < minG) minG = g3;
					if (g1 > maxG) maxG = g1;
					if (g2 > maxG) maxG = g2;
					if (g3 > maxG) maxG = g3;

					minB = maxB = data[offsetPrev+2];
					var b1 = data[offset-2], b2 = data[offset+6], b3 = data[offsetNext+2];
					if (b1 < minB) minB = b1;
					if (b2 < minB) minB = b2;
					if (b3 < minB) minB = b3;
					if (b1 > maxB) maxB = b1;
					if (b2 > maxB) maxB = b2;
					if (b3 > maxB) maxB = b3;

					if (data[offset] > maxR) {
						data[offset] = maxR;
					} else if (data[offset] < minR) {
						data[offset] = minR;
					}
					if (data[offset+1] > maxG) {
						data[offset+1] = maxG;
					} else if (data[offset+1] < minG) {
						data[offset+1] = minG;
					}
					if (data[offset+2] > maxB) {
						data[offset+2] = maxB;
					} else if (data[offset+2] < minB) {
						data[offset+2] = minB;
					}

				} while (--x);
			} while (--y);

			return true;
		}
	},
	checkSupport : function() {
		return Pixastic.Client.hasCanvasImageData();
	}
}/*
 * Pixastic Lib - Sepia filter - v0.1.0
 * Copyright (c) 2008 Jacob Seidelin, jseidelin@nihilogic.dk, http://blog.nihilogic.dk/
 * License: [http://www.pixastic.com/lib/license.txt]
 */

Pixastic.Actions.sepia = {

	process : function(params) {
		var mode = (parseInt(params.options.mode,10)||0);
		if (mode < 0) mode = 0;
		if (mode > 1) mode = 1;

		if (Pixastic.Client.hasCanvasImageData()) {
			var data = Pixastic.prepareData(params);
			var rect = params.options.rect;
			var w = rect.width;
			var h = rect.height;
			var w4 = w*4;
			var y = h;
			do {
				var offsetY = (y-1)*w4;
				var x = w;
				do {
					var offset = offsetY + (x-1)*4;

					if (mode) {
						// a bit faster, but not as good
						var d = data[offset] * 0.299 + data[offset+1] * 0.587 + data[offset+2] * 0.114;
						var r = (d + 39);
						var g = (d + 14);
						var b = (d - 36);
					} else {
						// Microsoft
						var or = data[offset];
						var og = data[offset+1];
						var ob = data[offset+2];

						var r = (or * 0.393 + og * 0.769 + ob * 0.189);
						var g = (or * 0.349 + og * 0.686 + ob * 0.168);
						var b = (or * 0.272 + og * 0.534 + ob * 0.131);
					}

					if (r < 0) r = 0; if (r > 255) r = 255;
					if (g < 0) g = 0; if (g > 255) g = 255;
					if (b < 0) b = 0; if (b > 255) b = 255;

					data[offset] = r;
					data[offset+1] = g;
					data[offset+2] = b;

				} while (--x);
			} while (--y);
			return true;
		}
	},
	checkSupport : function() {
		return Pixastic.Client.hasCanvasImageData();
	}
}/*
 * Pixastic Lib - Sharpen filter - v0.1.0
 * Copyright (c) 2008 Jacob Seidelin, jseidelin@nihilogic.dk, http://blog.nihilogic.dk/
 * License: [http://www.pixastic.com/lib/license.txt]
 */

Pixastic.Actions.sharpen = {
	process : function(params) {

		var strength = 0;
		if (typeof params.options.amount != "undefined")
			strength = parseFloat(params.options.amount)||0;

		if (strength < 0) strength = 0;
		if (strength > 1) strength = 1;

		if (Pixastic.Client.hasCanvasImageData()) {
			var data = Pixastic.prepareData(params);
			var dataCopy = Pixastic.prepareData(params, true)

			var mul = 15;
			var mulOther = 1 + 3*strength;

			var kernel = [
				[0, 	-mulOther, 	0],
				[-mulOther, 	mul, 	-mulOther],
				[0, 	-mulOther, 	0]
			];

			var weight = 0;
			for (var i=0;i<3;i++) {
				for (var j=0;j<3;j++) {
					weight += kernel[i][j];
				}
			}

			weight = 1 / weight;

			var rect = params.options.rect;
			var w = rect.width;
			var h = rect.height;

			mul *= weight;
			mulOther *= weight;

			var w4 = w*4;
			var y = h;
			do {
				var offsetY = (y-1)*w4;

				var nextY = (y == h) ? y - 1 : y;
				var prevY = (y == 1) ? 0 : y-2;

				var offsetYPrev = prevY*w4;
				var offsetYNext = nextY*w4;

				var x = w;
				do {
					var offset = offsetY + (x*4-4);

					var offsetPrev = offsetYPrev + ((x == 1) ? 0 : x-2) * 4;
					var offsetNext = offsetYNext + ((x == w) ? x-1 : x) * 4;

					var r = ((
						- dataCopy[offsetPrev]
						- dataCopy[offset-4]
						- dataCopy[offset+4]
						- dataCopy[offsetNext])		* mulOther
						+ dataCopy[offset] 	* mul
						);

					var g = ((
						- dataCopy[offsetPrev+1]
						- dataCopy[offset-3]
						- dataCopy[offset+5]
						- dataCopy[offsetNext+1])	* mulOther
						+ dataCopy[offset+1] 	* mul
						);

					var b = ((
						- dataCopy[offsetPrev+2]
						- dataCopy[offset-2]
						- dataCopy[offset+6]
						- dataCopy[offsetNext+2])	* mulOther
						+ dataCopy[offset+2] 	* mul
						);


					if (r < 0 ) r = 0;
					if (g < 0 ) g = 0;
					if (b < 0 ) b = 0;
					if (r > 255 ) r = 255;
					if (g > 255 ) g = 255;
					if (b > 255 ) b = 255;

					data[offset] = r;
					data[offset+1] = g;
					data[offset+2] = b;

				} while (--x);
			} while (--y);

			return true;

		}
	},
	checkSupport : function() {
		return Pixastic.Client.hasCanvasImageData();
	}
}
/*
 * Pixastic Lib - Solarize filter - v0.1.0
 * Copyright (c) 2008 Jacob Seidelin, jseidelin@nihilogic.dk, http://blog.nihilogic.dk/
 * License: [http://www.pixastic.com/lib/license.txt]
 */

Pixastic.Actions.solarize = {

	process : function(params) {
		var useAverage = !!(params.options.average && params.options.average != "false");

		if (Pixastic.Client.hasCanvasImageData()) {
			var data = Pixastic.prepareData(params);
			var rect = params.options.rect;
			var w = rect.width;
			var h = rect.height;
			var w4 = w*4;
			var y = h;
			do {
				var offsetY = (y-1)*w4;
				var x = w;
				do {
					var offset = offsetY + (x-1)*4;

					var r = data[offset];
					var g = data[offset+1];
					var b = data[offset+2];

					if (r > 127) r = 255 - r;
					if (g > 127) g = 255 - g;
					if (b > 127) b = 255 - b;

					data[offset] = r;
					data[offset+1] = g;
					data[offset+2] = b;

				} while (--x);
			} while (--y);
			return true;
		}
	},
	checkSupport : function() {
		return (Pixastic.Client.hasCanvasImageData());
	}
};
// File end: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-dependencies/pixastic.custom.js
;
// File start: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-dependencies/rangy/rangy-core.js
/**
 * Rangy, a cross-browser JavaScript range and selection library
 * http://code.google.com/p/rangy/
 *
 * Copyright 2014, Tim Down
 * Licensed under the MIT license.
 * Version: 1.3alpha.
 * Build date: 22 January 2014
 */

(function(global) {
    var amdSupported = (typeof global.define == "function" && global.define.amd);

    var OBJECT = "object", FUNCTION = "function", UNDEFINED = "undefined";

    // Minimal set of properties required for DOM Level 2 Range compliance. Comparison constants such as START_TO_START
    // are omitted because ranges in KHTML do not have them but otherwise work perfectly well. See issue 113.
    var domRangeProperties = ["startContainer", "startOffset", "endContainer", "endOffset", "collapsed",
        "commonAncestorContainer"];

    // Minimal set of methods required for DOM Level 2 Range compliance
    var domRangeMethods = ["setStart", "setStartBefore", "setStartAfter", "setEnd", "setEndBefore",
        "setEndAfter", "collapse", "selectNode", "selectNodeContents", "compareBoundaryPoints", "deleteContents",
        "extractContents", "cloneContents", "insertNode", "surroundContents", "cloneRange", "toString", "detach"];

    var textRangeProperties = ["boundingHeight", "boundingLeft", "boundingTop", "boundingWidth", "htmlText", "text"];

    // Subset of TextRange's full set of methods that we're interested in
    var textRangeMethods = ["collapse", "compareEndPoints", "duplicate", "moveToElementText", "parentElement", "select",
        "setEndPoint", "getBoundingClientRect"];

    /*----------------------------------------------------------------------------------------------------------------*/

    // Trio of functions taken from Peter Michaux's article:
    // http://peter.michaux.ca/articles/feature-detection-state-of-the-art-browser-scripting
    function isHostMethod(o, p) {
        var t = typeof o[p];
        return t == FUNCTION || (!!(t == OBJECT && o[p])) || t == "unknown";
    }

    function isHostObject(o, p) {
        return !!(typeof o[p] == OBJECT && o[p]);
    }

    function isHostProperty(o, p) {
        return typeof o[p] != UNDEFINED;
    }

    // Creates a convenience function to save verbose repeated calls to tests functions
    function createMultiplePropertyTest(testFunc) {
        return function(o, props) {
            var i = props.length;
            while (i--) {
                if (!testFunc(o, props[i])) {
                    return false;
                }
            }
            return true;
        };
    }

    // Next trio of functions are a convenience to save verbose repeated calls to previous two functions
    var areHostMethods = createMultiplePropertyTest(isHostMethod);
    var areHostObjects = createMultiplePropertyTest(isHostObject);
    var areHostProperties = createMultiplePropertyTest(isHostProperty);

    function isTextRange(range) {
        return range && areHostMethods(range, textRangeMethods) && areHostProperties(range, textRangeProperties);
    }

    function getBody(doc) {
        return isHostObject(doc, "body") ? doc.body : doc.getElementsByTagName("body")[0];
    }

    var modules = {};

    var api = {
        version: "1.3alpha.",
        initialized: false,
        supported: true,

        util: {
            isHostMethod: isHostMethod,
            isHostObject: isHostObject,
            isHostProperty: isHostProperty,
            areHostMethods: areHostMethods,
            areHostObjects: areHostObjects,
            areHostProperties: areHostProperties,
            isTextRange: isTextRange,
            getBody: getBody
        },

        features: {},

        modules: modules,
        config: {
            alertOnFail: true,
            alertOnWarn: false,
            preferTextRange: false
        }
    };

    function consoleLog(msg) {
        if (isHostObject(window, "console") && isHostMethod(window.console, "log")) {
            window.console.log(msg);
        }
    }

    function alertOrLog(msg, shouldAlert) {
        if (shouldAlert) {
            window.alert(msg);
        } else  {
            consoleLog(msg);
        }
    }

    function fail(reason) {
        api.initialized = true;
        api.supported = false;
        alertOrLog("Rangy is not supported on this page in your browser. Reason: " + reason, api.config.alertOnFail);
    }

    api.fail = fail;

    function warn(msg) {
        alertOrLog("Rangy warning: " + msg, api.config.alertOnWarn);
    }

    api.warn = warn;

    // Add utility extend() method
    if ({}.hasOwnProperty) {
        api.util.extend = function(obj, props, deep) {
            var o, p;
            for (var i in props) {
                if (props.hasOwnProperty(i)) {
                    o = obj[i];
                    p = props[i];
                    //if (deep) alert([o !== null, typeof o == "object", p !== null, typeof p == "object"])
                    if (deep && o !== null && typeof o == "object" && p !== null && typeof p == "object") {
                        api.util.extend(o, p, true);
                    }
                    obj[i] = p;
                }
            }
            return obj;
        };
    } else {
        fail("hasOwnProperty not supported");
    }

    // Test whether Array.prototype.slice can be relied on for NodeLists and use an alternative toArray() if not
    (function() {
        var el = document.createElement("div");
        el.appendChild(document.createElement("span"));
        var slice = [].slice;
        var toArray;
        try {
            if (slice.call(el.childNodes, 0)[0].nodeType == 1) {
                toArray = function(arrayLike) {
                    return slice.call(arrayLike, 0);
                };
            }
        } catch (e) {}

        if (!toArray) {
            toArray = function(arrayLike) {
                var arr = [];
                for (var i = 0, len = arrayLike.length; i < len; ++i) {
                    arr[i] = arrayLike[i];
                }
                return arr;
            };
        }

        api.util.toArray = toArray;
    })();


    // Very simple event handler wrapper function that doesn't attempt to solve issues such as "this" handling or
    // normalization of event properties
    var addListener;
    if (isHostMethod(document, "addEventListener")) {
        addListener = function(obj, eventType, listener) {
            obj.addEventListener(eventType, listener, false);
        };
    } else if (isHostMethod(document, "attachEvent")) {
        addListener = function(obj, eventType, listener) {
            obj.attachEvent("on" + eventType, listener);
        };
    } else {
        fail("Document does not have required addEventListener or attachEvent method");
    }

    api.util.addListener = addListener;

    var initListeners = [];

    function getErrorDesc(ex) {
        return ex.message || ex.description || String(ex);
    }

    // Initialization
    function init() {
        if (api.initialized) {
            return;
        }
        var testRange;
        var implementsDomRange = false, implementsTextRange = false;

        // First, perform basic feature tests

        if (isHostMethod(document, "createRange")) {
            testRange = document.createRange();
            if (areHostMethods(testRange, domRangeMethods) && areHostProperties(testRange, domRangeProperties)) {
                implementsDomRange = true;
            }
            testRange.detach();
        }

        var body = getBody(document);
        if (!body || body.nodeName.toLowerCase() != "body") {
            fail("No body element found");
            return;
        }

        if (body && isHostMethod(body, "createTextRange")) {
            testRange = body.createTextRange();
            if (isTextRange(testRange)) {
                implementsTextRange = true;
            }
        }

        if (!implementsDomRange && !implementsTextRange) {
            fail("Neither Range nor TextRange are available");
            return;
        }

        api.initialized = true;
        api.features = {
            implementsDomRange: implementsDomRange,
            implementsTextRange: implementsTextRange
        };

        // Initialize modules
        var module, errorMessage;
        for (var moduleName in modules) {
            if ( (module = modules[moduleName]) instanceof Module ) {
                module.init(module, api);
            }
        }

        // Call init listeners
        for (var i = 0, len = initListeners.length; i < len; ++i) {
            try {
                initListeners[i](api);
            } catch (ex) {
                errorMessage = "Rangy init listener threw an exception. Continuing. Detail: " + getErrorDesc(ex);
                consoleLog(errorMessage);
            }
        }
    }

    // Allow external scripts to initialize this library in case it's loaded after the document has loaded
    api.init = init;

    // Execute listener immediately if already initialized
    api.addInitListener = function(listener) {
        if (api.initialized) {
            listener(api);
        } else {
            initListeners.push(listener);
        }
    };

    var createMissingNativeApiListeners = [];

    api.addCreateMissingNativeApiListener = function(listener) {
        createMissingNativeApiListeners.push(listener);
    };

    function createMissingNativeApi(win) {
        win = win || window;
        init();

        // Notify listeners
        for (var i = 0, len = createMissingNativeApiListeners.length; i < len; ++i) {
            createMissingNativeApiListeners[i](win);
        }
    }

    api.createMissingNativeApi = createMissingNativeApi;

    function Module(name, dependencies, initializer) {
        this.name = name;
        this.dependencies = dependencies;
        this.initialized = false;
        this.supported = false;
        this.initializer = initializer;
    }

    Module.prototype = {
        init: function(api) {
            var requiredModuleNames = this.dependencies || [];
            for (var i = 0, len = requiredModuleNames.length, requiredModule, moduleName; i < len; ++i) {
                moduleName = requiredModuleNames[i];

                requiredModule = modules[moduleName];
                if (!requiredModule || !(requiredModule instanceof Module)) {
                    throw new Error("required module '" + moduleName + "' not found");
                }

                requiredModule.init();

                if (!requiredModule.supported) {
                    throw new Error("required module '" + moduleName + "' not supported");
                }
            }
            
            // Now run initializer
            this.initializer(this)
        },
        
        fail: function(reason) {
            this.initialized = true;
            this.supported = false;
            throw new Error("Module '" + this.name + "' failed to load: " + reason);
        },

        warn: function(msg) {
            api.warn("Module " + this.name + ": " + msg);
        },

        deprecationNotice: function(deprecated, replacement) {
            api.warn("DEPRECATED: " + deprecated + " in module " + this.name + "is deprecated. Please use "
                + replacement + " instead");
        },

        createError: function(msg) {
            return new Error("Error in Rangy " + this.name + " module: " + msg);
        }
    };
    
    function createModule(isCore, name, dependencies, initFunc) {
        var newModule = new Module(name, dependencies, function(module) {
            if (!module.initialized) {
                module.initialized = true;
                try {
                    initFunc(api, module);
                    module.supported = true;
                } catch (ex) {
                    var errorMessage = "Module '" + name + "' failed to load: " + getErrorDesc(ex);
                    consoleLog(errorMessage);
                }
            }
        });
        modules[name] = newModule;
        
/*
        // Add module AMD support
        if (!isCore && amdSupported) {
            global.define(["rangy-core"], function(rangy) {
                
            });
        }
*/
    }

    api.createModule = function(name) {
        // Allow 2 or 3 arguments (second argument is an optional array of dependencies)
        var initFunc, dependencies;
        if (arguments.length == 2) {
            initFunc = arguments[1];
            dependencies = [];
        } else {
            initFunc = arguments[2];
            dependencies = arguments[1];
        }
        createModule(false, name, dependencies, initFunc);
    };

    api.createCoreModule = function(name, dependencies, initFunc) {
        createModule(true, name, dependencies, initFunc);
    };

    /*----------------------------------------------------------------------------------------------------------------*/

    // Ensure rangy.rangePrototype and rangy.selectionPrototype are available immediately

    function RangePrototype() {}
    api.RangePrototype = RangePrototype;
    api.rangePrototype = new RangePrototype();

    function SelectionPrototype() {}
    api.selectionPrototype = new SelectionPrototype();

    /*----------------------------------------------------------------------------------------------------------------*/

    // Wait for document to load before running tests

    var docReady = false;

    var loadHandler = function(e) {
        if (!docReady) {
            docReady = true;
            if (!api.initialized) {
                init();
            }
        }
    };

    // Test whether we have window and document objects that we will need
    if (typeof window == UNDEFINED) {
        fail("No window found");
        return;
    }
    if (typeof document == UNDEFINED) {
        fail("No document found");
        return;
    }

    if (isHostMethod(document, "addEventListener")) {
        document.addEventListener("DOMContentLoaded", loadHandler, false);
    }

    // Add a fallback in case the DOMContentLoaded event isn't supported
    addListener(window, "load", loadHandler);

    /*----------------------------------------------------------------------------------------------------------------*/
    
    // AMD, for those who like this kind of thing

    if (amdSupported) {
        // AMD. Register as an anonymous module.
        global.define(function() {
            api.amd = true;
            return api;
        });
    }
    
    // Create a "rangy" property of the global object in any case. Other Rangy modules (which use Rangy's own simple
    // module system) rely on the existence of this global property
    global.rangy = api;
})(this);    

rangy.createCoreModule("DomUtil", [], function(api, module) {
    var UNDEF = "undefined";
    var util = api.util;

    // Perform feature tests
    if (!util.areHostMethods(document, ["createDocumentFragment", "createElement", "createTextNode"])) {
        module.fail("document missing a Node creation method");
    }

    if (!util.isHostMethod(document, "getElementsByTagName")) {
        module.fail("document missing getElementsByTagName method");
    }

    var el = document.createElement("div");
    if (!util.areHostMethods(el, ["insertBefore", "appendChild", "cloneNode"] ||
            !util.areHostObjects(el, ["previousSibling", "nextSibling", "childNodes", "parentNode"]))) {
        module.fail("Incomplete Element implementation");
    }

    // innerHTML is required for Range's createContextualFragment method
    if (!util.isHostProperty(el, "innerHTML")) {
        module.fail("Element is missing innerHTML property");
    }

    var textNode = document.createTextNode("test");
    if (!util.areHostMethods(textNode, ["splitText", "deleteData", "insertData", "appendData", "cloneNode"] ||
            !util.areHostObjects(el, ["previousSibling", "nextSibling", "childNodes", "parentNode"]) ||
            !util.areHostProperties(textNode, ["data"]))) {
        module.fail("Incomplete Text Node implementation");
    }

    /*----------------------------------------------------------------------------------------------------------------*/

    // Removed use of indexOf because of a bizarre bug in Opera that is thrown in one of the Acid3 tests. I haven't been
    // able to replicate it outside of the test. The bug is that indexOf returns -1 when called on an Array that
    // contains just the document as a single element and the value searched for is the document.
    var arrayContains = /*Array.prototype.indexOf ?
        function(arr, val) {
            return arr.indexOf(val) > -1;
        }:*/

        function(arr, val) {
            var i = arr.length;
            while (i--) {
                if (arr[i] === val) {
                    return true;
                }
            }
            return false;
        };

    // Opera 11 puts HTML elements in the null namespace, it seems, and IE 7 has undefined namespaceURI
    function isHtmlNamespace(node) {
        var ns;
        return typeof node.namespaceURI == UNDEF || ((ns = node.namespaceURI) === null || ns == "http://www.w3.org/1999/xhtml");
    }

    function parentElement(node) {
        var parent = node.parentNode;
        return (parent.nodeType == 1) ? parent : null;
    }

    function getNodeIndex(node) {
        var i = 0;
        while( (node = node.previousSibling) ) {
            ++i;
        }
        return i;
    }

    function getNodeLength(node) {
        switch (node.nodeType) {
            case 7:
            case 10:
                return 0;
            case 3:
            case 8:
                return node.length;
            default:
                return node.childNodes.length;
        }
    }

    function getCommonAncestor(node1, node2) {
        var ancestors = [], n;
        for (n = node1; n; n = n.parentNode) {
            ancestors.push(n);
        }

        for (n = node2; n; n = n.parentNode) {
            if (arrayContains(ancestors, n)) {
                return n;
            }
        }

        return null;
    }

    function isAncestorOf(ancestor, descendant, selfIsAncestor) {
        var n = selfIsAncestor ? descendant : descendant.parentNode;
        while (n) {
            if (n === ancestor) {
                return true;
            } else {
                n = n.parentNode;
            }
        }
        return false;
    }

    function isOrIsAncestorOf(ancestor, descendant) {
        return isAncestorOf(ancestor, descendant, true);
    }

    function getClosestAncestorIn(node, ancestor, selfIsAncestor) {
        var p, n = selfIsAncestor ? node : node.parentNode;
        while (n) {
            p = n.parentNode;
            if (p === ancestor) {
                return n;
            }
            n = p;
        }
        return null;
    }

    function isCharacterDataNode(node) {
        var t = node.nodeType;
        return t == 3 || t == 4 || t == 8 ; // Text, CDataSection or Comment
    }

    function isTextOrCommentNode(node) {
        if (!node) {
            return false;
        }
        var t = node.nodeType;
        return t == 3 || t == 8 ; // Text or Comment
    }

    function insertAfter(node, precedingNode) {
        var nextNode = precedingNode.nextSibling, parent = precedingNode.parentNode;
        if (nextNode) {
            parent.insertBefore(node, nextNode);
        } else {
            parent.appendChild(node);
        }
        return node;
    }

    // Note that we cannot use splitText() because it is bugridden in IE 9.
    function splitDataNode(node, index, positionsToPreserve) {
        var newNode = node.cloneNode(false);
        newNode.deleteData(0, index);
        node.deleteData(index, node.length - index);
        insertAfter(newNode, node);

        // Preserve positions
        if (positionsToPreserve) {
            for (var i = 0, position; position = positionsToPreserve[i++]; ) {
                // Handle case where position was inside the portion of node after the split point
                if (position.node == node && position.offset > index) {
                    position.node = newNode;
                    position.offset -= index;
                }
                // Handle the case where the position is a node offset within node's parent
                else if (position.node == node.parentNode && position.offset > getNodeIndex(node)) {
                    ++position.offset;
                }
            }
        }
        return newNode;
    }

    function getDocument(node) {
        if (node.nodeType == 9) {
            return node;
        } else if (typeof node.ownerDocument != UNDEF) {
            return node.ownerDocument;
        } else if (typeof node.document != UNDEF) {
            return node.document;
        } else if (node.parentNode) {
            return getDocument(node.parentNode);
        } else {
            throw module.createError("getDocument: no document found for node");
        }
    }

    function getWindow(node) {
        var doc = getDocument(node);
        if (typeof doc.defaultView != UNDEF) {
            return doc.defaultView;
        } else if (typeof doc.parentWindow != UNDEF) {
            return doc.parentWindow;
        } else {
            throw module.createError("Cannot get a window object for node");
        }
    }

    function getIframeDocument(iframeEl) {
        if (typeof iframeEl.contentDocument != UNDEF) {
            return iframeEl.contentDocument;
        } else if (typeof iframeEl.contentWindow != UNDEF) {
            return iframeEl.contentWindow.document;
        } else {
            throw module.createError("getIframeDocument: No Document object found for iframe element");
        }
    }

    function getIframeWindow(iframeEl) {
        if (typeof iframeEl.contentWindow != UNDEF) {
            return iframeEl.contentWindow;
        } else if (typeof iframeEl.contentDocument != UNDEF) {
            return iframeEl.contentDocument.defaultView;
        } else {
            throw module.createError("getIframeWindow: No Window object found for iframe element");
        }
    }

    // This looks bad. Is it worth it?
    function isWindow(obj) {
        return obj && util.isHostMethod(obj, "setTimeout") && util.isHostObject(obj, "document");
    }

    function getContentDocument(obj, module, methodName) {
        var doc;

        if (!obj) {
            doc = document;
        }

        // Test if a DOM node has been passed and obtain a document object for it if so
        else if (util.isHostProperty(obj, "nodeType")) {
            doc = (obj.nodeType == 1 && obj.tagName.toLowerCase() == "iframe")
                ? getIframeDocument(obj) : getDocument(obj);
        }

        // Test if the doc parameter appears to be a Window object
        else if (isWindow(obj)) {
            doc = obj.document;
        }

        if (!doc) {
            throw module.createError(methodName + "(): Parameter must be a Window object or DOM node");
        }

        return doc;
    }

    function getRootContainer(node) {
        var parent;
        while ( (parent = node.parentNode) ) {
            node = parent;
        }
        return node;
    }

    function comparePoints(nodeA, offsetA, nodeB, offsetB) {
        // See http://www.w3.org/TR/DOM-Level-2-Traversal-Range/ranges.html#Level-2-Range-Comparing
        var nodeC, root, childA, childB, n;
        if (nodeA == nodeB) {
            // Case 1: nodes are the same
            return offsetA === offsetB ? 0 : (offsetA < offsetB) ? -1 : 1;
        } else if ( (nodeC = getClosestAncestorIn(nodeB, nodeA, true)) ) {
            // Case 2: node C (container B or an ancestor) is a child node of A
            return offsetA <= getNodeIndex(nodeC) ? -1 : 1;
        } else if ( (nodeC = getClosestAncestorIn(nodeA, nodeB, true)) ) {
            // Case 3: node C (container A or an ancestor) is a child node of B
            return getNodeIndex(nodeC) < offsetB  ? -1 : 1;
        } else {
            root = getCommonAncestor(nodeA, nodeB);
            if (!root) {
                throw new Error("comparePoints error: nodes have no common ancestor");
            }

            // Case 4: containers are siblings or descendants of siblings
            childA = (nodeA === root) ? root : getClosestAncestorIn(nodeA, root, true);
            childB = (nodeB === root) ? root : getClosestAncestorIn(nodeB, root, true);

            if (childA === childB) {
                // This shouldn't be possible
                throw module.createError("comparePoints got to case 4 and childA and childB are the same!");
            } else {
                n = root.firstChild;
                while (n) {
                    if (n === childA) {
                        return -1;
                    } else if (n === childB) {
                        return 1;
                    }
                    n = n.nextSibling;
                }
            }
        }
    }

    /*----------------------------------------------------------------------------------------------------------------*/

    // Test for IE's crash (IE 6/7) or exception (IE >= 8) when a reference to garbage-collected text node is queried
    var crashyTextNodes = false;

    function isBrokenNode(node) {
        try {
            node.parentNode;
            return false;
        } catch (e) {
            return true;
        }
    }

    (function() {
        var el = document.createElement("b");
        el.innerHTML = "1";
        var textNode = el.firstChild;
        el.innerHTML = "<br>";
        crashyTextNodes = isBrokenNode(textNode);

        api.features.crashyTextNodes = crashyTextNodes;
    })();

    /*----------------------------------------------------------------------------------------------------------------*/

    function inspectNode(node) {
        if (!node) {
            return "[No node]";
        }
        if (crashyTextNodes && isBrokenNode(node)) {
            return "[Broken node]";
        }
        if (isCharacterDataNode(node)) {
            return '"' + node.data + '"';
        }
        if (node.nodeType == 1) {
            var idAttr = node.id ? ' id="' + node.id + '"' : "";
            return "<" + node.nodeName + idAttr + ">[" + getNodeIndex(node) + "][" + node.childNodes.length + "][" + (node.innerHTML || "[innerHTML not supported]").slice(0, 25) + "]";
        }
        return node.nodeName;
    }

    function fragmentFromNodeChildren(node) {
        var fragment = getDocument(node).createDocumentFragment(), child;
        while ( (child = node.firstChild) ) {
            fragment.appendChild(child);
        }
        return fragment;
    }

    var getComputedStyleProperty;
    if (typeof window.getComputedStyle != UNDEF) {
        getComputedStyleProperty = function(el, propName) {
            return getWindow(el).getComputedStyle(el, null)[propName];
        };
    } else if (typeof document.documentElement.currentStyle != UNDEF) {
        getComputedStyleProperty = function(el, propName) {
            return el.currentStyle[propName];
        };
    } else {
        module.fail("No means of obtaining computed style properties found");
    }

    function NodeIterator(root) {
        this.root = root;
        this._next = root;
    }

    NodeIterator.prototype = {
        _current: null,

        hasNext: function() {
            return !!this._next;
        },

        next: function() {
            var n = this._current = this._next;
            var child, next;
            if (this._current) {
                child = n.firstChild;
                if (child) {
                    this._next = child;
                } else {
                    next = null;
                    while ((n !== this.root) && !(next = n.nextSibling)) {
                        n = n.parentNode;
                    }
                    this._next = next;
                }
            }
            return this._current;
        },

        detach: function() {
            this._current = this._next = this.root = null;
        }
    };

    function createIterator(root) {
        return new NodeIterator(root);
    }

    function DomPosition(node, offset) {
        this.node = node;
        this.offset = offset;
    }

    DomPosition.prototype = {
        equals: function(pos) {
            return !!pos && this.node === pos.node && this.offset == pos.offset;
        },

        inspect: function() {
            return "[DomPosition(" + inspectNode(this.node) + ":" + this.offset + ")]";
        },

        toString: function() {
            return this.inspect();
        }
    };

    function DOMException(codeName) {
        this.code = this[codeName];
        this.codeName = codeName;
        this.message = "DOMException: " + this.codeName;
    }

    DOMException.prototype = {
        INDEX_SIZE_ERR: 1,
        HIERARCHY_REQUEST_ERR: 3,
        WRONG_DOCUMENT_ERR: 4,
        NO_MODIFICATION_ALLOWED_ERR: 7,
        NOT_FOUND_ERR: 8,
        NOT_SUPPORTED_ERR: 9,
        INVALID_STATE_ERR: 11
    };

    DOMException.prototype.toString = function() {
        return this.message;
    };

    api.dom = {
        arrayContains: arrayContains,
        isHtmlNamespace: isHtmlNamespace,
        parentElement: parentElement,
        getNodeIndex: getNodeIndex,
        getNodeLength: getNodeLength,
        getCommonAncestor: getCommonAncestor,
        isAncestorOf: isAncestorOf,
        isOrIsAncestorOf: isOrIsAncestorOf,
        getClosestAncestorIn: getClosestAncestorIn,
        isCharacterDataNode: isCharacterDataNode,
        isTextOrCommentNode: isTextOrCommentNode,
        insertAfter: insertAfter,
        splitDataNode: splitDataNode,
        getDocument: getDocument,
        getWindow: getWindow,
        getIframeWindow: getIframeWindow,
        getIframeDocument: getIframeDocument,
        getBody: util.getBody,
        isWindow: isWindow,
        getContentDocument: getContentDocument,
        getRootContainer: getRootContainer,
        comparePoints: comparePoints,
        isBrokenNode: isBrokenNode,
        inspectNode: inspectNode,
        getComputedStyleProperty: getComputedStyleProperty,
        fragmentFromNodeChildren: fragmentFromNodeChildren,
        createIterator: createIterator,
        DomPosition: DomPosition
    };

    api.DOMException = DOMException;
});
rangy.createCoreModule("DomRange", ["DomUtil"], function(api, module) {
    var dom = api.dom;
    var util = api.util;
    var DomPosition = dom.DomPosition;
    var DOMException = api.DOMException;

    var isCharacterDataNode = dom.isCharacterDataNode;
    var getNodeIndex = dom.getNodeIndex;
    var isOrIsAncestorOf = dom.isOrIsAncestorOf;
    var getDocument = dom.getDocument;
    var comparePoints = dom.comparePoints;
    var splitDataNode = dom.splitDataNode;
    var getClosestAncestorIn = dom.getClosestAncestorIn;
    var getNodeLength = dom.getNodeLength;
    var arrayContains = dom.arrayContains;
    var getRootContainer = dom.getRootContainer;
    var crashyTextNodes = api.features.crashyTextNodes;

    /*----------------------------------------------------------------------------------------------------------------*/

    // Utility functions

    function isNonTextPartiallySelected(node, range) {
        return (node.nodeType != 3) &&
               (isOrIsAncestorOf(node, range.startContainer) || isOrIsAncestorOf(node, range.endContainer));
    }

    function getRangeDocument(range) {
        return range.document || getDocument(range.startContainer);
    }

    function getBoundaryBeforeNode(node) {
        return new DomPosition(node.parentNode, getNodeIndex(node));
    }

    function getBoundaryAfterNode(node) {
        return new DomPosition(node.parentNode, getNodeIndex(node) + 1);
    }

    function insertNodeAtPosition(node, n, o) {
        var firstNodeInserted = node.nodeType == 11 ? node.firstChild : node;
        if (isCharacterDataNode(n)) {
            if (o == n.length) {
                dom.insertAfter(node, n);
            } else {
                n.parentNode.insertBefore(node, o == 0 ? n : splitDataNode(n, o));
            }
        } else if (o >= n.childNodes.length) {
            n.appendChild(node);
        } else {
            n.insertBefore(node, n.childNodes[o]);
        }
        return firstNodeInserted;
    }

    function rangesIntersect(rangeA, rangeB, touchingIsIntersecting) {
        assertRangeValid(rangeA);
        assertRangeValid(rangeB);

        if (getRangeDocument(rangeB) != getRangeDocument(rangeA)) {
            throw new DOMException("WRONG_DOCUMENT_ERR");
        }

        var startComparison = comparePoints(rangeA.startContainer, rangeA.startOffset, rangeB.endContainer, rangeB.endOffset),
            endComparison = comparePoints(rangeA.endContainer, rangeA.endOffset, rangeB.startContainer, rangeB.startOffset);

        return touchingIsIntersecting ? startComparison <= 0 && endComparison >= 0 : startComparison < 0 && endComparison > 0;
    }

    function cloneSubtree(iterator) {
        var partiallySelected;
        for (var node, frag = getRangeDocument(iterator.range).createDocumentFragment(), subIterator; node = iterator.next(); ) {
            partiallySelected = iterator.isPartiallySelectedSubtree();
            node = node.cloneNode(!partiallySelected);
            if (partiallySelected) {
                subIterator = iterator.getSubtreeIterator();
                node.appendChild(cloneSubtree(subIterator));
                subIterator.detach(true);
            }

            if (node.nodeType == 10) { // DocumentType
                throw new DOMException("HIERARCHY_REQUEST_ERR");
            }
            frag.appendChild(node);
        }
        return frag;
    }

    function iterateSubtree(rangeIterator, func, iteratorState) {
        var it, n;
        iteratorState = iteratorState || { stop: false };
        for (var node, subRangeIterator; node = rangeIterator.next(); ) {
            if (rangeIterator.isPartiallySelectedSubtree()) {
                if (func(node) === false) {
                    iteratorState.stop = true;
                    return;
                } else {
                    // The node is partially selected by the Range, so we can use a new RangeIterator on the portion of
                    // the node selected by the Range.
                    subRangeIterator = rangeIterator.getSubtreeIterator();
                    iterateSubtree(subRangeIterator, func, iteratorState);
                    subRangeIterator.detach(true);
                    if (iteratorState.stop) {
                        return;
                    }
                }
            } else {
                // The whole node is selected, so we can use efficient DOM iteration to iterate over the node and its
                // descendants
                it = dom.createIterator(node);
                while ( (n = it.next()) ) {
                    if (func(n) === false) {
                        iteratorState.stop = true;
                        return;
                    }
                }
            }
        }
    }

    function deleteSubtree(iterator) {
        var subIterator;
        while (iterator.next()) {
            if (iterator.isPartiallySelectedSubtree()) {
                subIterator = iterator.getSubtreeIterator();
                deleteSubtree(subIterator);
                subIterator.detach(true);
            } else {
                iterator.remove();
            }
        }
    }

    function extractSubtree(iterator) {
        for (var node, frag = getRangeDocument(iterator.range).createDocumentFragment(), subIterator; node = iterator.next(); ) {

            if (iterator.isPartiallySelectedSubtree()) {
                node = node.cloneNode(false);
                subIterator = iterator.getSubtreeIterator();
                node.appendChild(extractSubtree(subIterator));
                subIterator.detach(true);
            } else {
                iterator.remove();
            }
            if (node.nodeType == 10) { // DocumentType
                throw new DOMException("HIERARCHY_REQUEST_ERR");
            }
            frag.appendChild(node);
        }
        return frag;
    }

    function getNodesInRange(range, nodeTypes, filter) {
        var filterNodeTypes = !!(nodeTypes && nodeTypes.length), regex;
        var filterExists = !!filter;
        if (filterNodeTypes) {
            regex = new RegExp("^(" + nodeTypes.join("|") + ")$");
        }

        var nodes = [];
        iterateSubtree(new RangeIterator(range, false), function(node) {
            if (filterNodeTypes && !regex.test(node.nodeType)) {
                return;
            }
            if (filterExists && !filter(node)) {
                return;
            }
            // Don't include a boundary container if it is a character data node and the range does not contain any
            // of its character data. See issue 190.
            var sc = range.startContainer;
            if (node == sc && isCharacterDataNode(sc) && range.startOffset == sc.length) {
                return;
            }

            var ec = range.endContainer;
            if (node == ec && isCharacterDataNode(ec) && range.endOffset == 0) {
                return;
            }

            nodes.push(node);
        });
        return nodes;
    }

    function inspect(range) {
        var name = (typeof range.getName == "undefined") ? "Range" : range.getName();
        return "[" + name + "(" + dom.inspectNode(range.startContainer) + ":" + range.startOffset + ", " +
                dom.inspectNode(range.endContainer) + ":" + range.endOffset + ")]";
    }

    /*----------------------------------------------------------------------------------------------------------------*/

    // RangeIterator code partially borrows from IERange by Tim Ryan (http://github.com/timcameronryan/IERange)

    function RangeIterator(range, clonePartiallySelectedTextNodes) {
        this.range = range;
        this.clonePartiallySelectedTextNodes = clonePartiallySelectedTextNodes;


        if (!range.collapsed) {
            this.sc = range.startContainer;
            this.so = range.startOffset;
            this.ec = range.endContainer;
            this.eo = range.endOffset;
            var root = range.commonAncestorContainer;

            if (this.sc === this.ec && isCharacterDataNode(this.sc)) {
                this.isSingleCharacterDataNode = true;
                this._first = this._last = this._next = this.sc;
            } else {
                this._first = this._next = (this.sc === root && !isCharacterDataNode(this.sc)) ?
                    this.sc.childNodes[this.so] : getClosestAncestorIn(this.sc, root, true);
                this._last = (this.ec === root && !isCharacterDataNode(this.ec)) ?
                    this.ec.childNodes[this.eo - 1] : getClosestAncestorIn(this.ec, root, true);
            }
        }
    }

    RangeIterator.prototype = {
        _current: null,
        _next: null,
        _first: null,
        _last: null,
        isSingleCharacterDataNode: false,

        reset: function() {
            this._current = null;
            this._next = this._first;
        },

        hasNext: function() {
            return !!this._next;
        },

        next: function() {
            // Move to next node
            var current = this._current = this._next;
            if (current) {
                this._next = (current !== this._last) ? current.nextSibling : null;

                // Check for partially selected text nodes
                if (isCharacterDataNode(current) && this.clonePartiallySelectedTextNodes) {
                    if (current === this.ec) {
                        (current = current.cloneNode(true)).deleteData(this.eo, current.length - this.eo);
                    }
                    if (this._current === this.sc) {
                        (current = current.cloneNode(true)).deleteData(0, this.so);
                    }
                }
            }

            return current;
        },

        remove: function() {
            var current = this._current, start, end;

            if (isCharacterDataNode(current) && (current === this.sc || current === this.ec)) {
                start = (current === this.sc) ? this.so : 0;
                end = (current === this.ec) ? this.eo : current.length;
                if (start != end) {
                    current.deleteData(start, end - start);
                }
            } else {
                if (current.parentNode) {
                    current.parentNode.removeChild(current);
                } else {
                }
            }
        },

        // Checks if the current node is partially selected
        isPartiallySelectedSubtree: function() {
            var current = this._current;
            return isNonTextPartiallySelected(current, this.range);
        },

        getSubtreeIterator: function() {
            var subRange;
            if (this.isSingleCharacterDataNode) {
                subRange = this.range.cloneRange();
                subRange.collapse(false);
            } else {
                subRange = new Range(getRangeDocument(this.range));
                var current = this._current;
                var startContainer = current, startOffset = 0, endContainer = current, endOffset = getNodeLength(current);

                if (isOrIsAncestorOf(current, this.sc)) {
                    startContainer = this.sc;
                    startOffset = this.so;
                }
                if (isOrIsAncestorOf(current, this.ec)) {
                    endContainer = this.ec;
                    endOffset = this.eo;
                }

                updateBoundaries(subRange, startContainer, startOffset, endContainer, endOffset);
            }
            return new RangeIterator(subRange, this.clonePartiallySelectedTextNodes);
        },

        detach: function(detachRange) {
            if (detachRange) {
                this.range.detach();
            }
            this.range = this._current = this._next = this._first = this._last = this.sc = this.so = this.ec = this.eo = null;
        }
    };

    /*----------------------------------------------------------------------------------------------------------------*/

    // Exceptions

    function RangeException(codeName) {
        this.code = this[codeName];
        this.codeName = codeName;
        this.message = "RangeException: " + this.codeName;
    }

    RangeException.prototype = {
        BAD_BOUNDARYPOINTS_ERR: 1,
        INVALID_NODE_TYPE_ERR: 2
    };

    RangeException.prototype.toString = function() {
        return this.message;
    };

    /*----------------------------------------------------------------------------------------------------------------*/

    var beforeAfterNodeTypes = [1, 3, 4, 5, 7, 8, 10];
    var rootContainerNodeTypes = [2, 9, 11];
    var readonlyNodeTypes = [5, 6, 10, 12];
    var insertableNodeTypes = [1, 3, 4, 5, 7, 8, 10, 11];
    var surroundNodeTypes = [1, 3, 4, 5, 7, 8];

    function createAncestorFinder(nodeTypes) {
        return function(node, selfIsAncestor) {
            var t, n = selfIsAncestor ? node : node.parentNode;
            while (n) {
                t = n.nodeType;
                if (arrayContains(nodeTypes, t)) {
                    return n;
                }
                n = n.parentNode;
            }
            return null;
        };
    }

    var getDocumentOrFragmentContainer = createAncestorFinder( [9, 11] );
    var getReadonlyAncestor = createAncestorFinder(readonlyNodeTypes);
    var getDocTypeNotationEntityAncestor = createAncestorFinder( [6, 10, 12] );

    function assertNoDocTypeNotationEntityAncestor(node, allowSelf) {
        if (getDocTypeNotationEntityAncestor(node, allowSelf)) {
            throw new RangeException("INVALID_NODE_TYPE_ERR");
        }
    }

    function assertNotDetached(range) {
        if (!range.startContainer) {
            throw new DOMException("INVALID_STATE_ERR");
        }
    }

    function assertValidNodeType(node, invalidTypes) {
        if (!arrayContains(invalidTypes, node.nodeType)) {
            throw new RangeException("INVALID_NODE_TYPE_ERR");
        }
    }

    function assertValidOffset(node, offset) {
        if (offset < 0 || offset > (isCharacterDataNode(node) ? node.length : node.childNodes.length)) {
            throw new DOMException("INDEX_SIZE_ERR");
        }
    }

    function assertSameDocumentOrFragment(node1, node2) {
        if (getDocumentOrFragmentContainer(node1, true) !== getDocumentOrFragmentContainer(node2, true)) {
            throw new DOMException("WRONG_DOCUMENT_ERR");
        }
    }

    function assertNodeNotReadOnly(node) {
        if (getReadonlyAncestor(node, true)) {
            throw new DOMException("NO_MODIFICATION_ALLOWED_ERR");
        }
    }

    function assertNode(node, codeName) {
        if (!node) {
            throw new DOMException(codeName);
        }
    }

    function isOrphan(node) {
        return (crashyTextNodes && dom.isBrokenNode(node)) ||
            !arrayContains(rootContainerNodeTypes, node.nodeType) && !getDocumentOrFragmentContainer(node, true);
    }

    function isValidOffset(node, offset) {
        return offset <= (isCharacterDataNode(node) ? node.length : node.childNodes.length);
    }

    function isRangeValid(range) {
        return (!!range.startContainer && !!range.endContainer
                && !isOrphan(range.startContainer)
                && !isOrphan(range.endContainer)
                && isValidOffset(range.startContainer, range.startOffset)
                && isValidOffset(range.endContainer, range.endOffset));
    }

    function assertRangeValid(range) {
        assertNotDetached(range);
        if (!isRangeValid(range)) {
            throw new Error("Range error: Range is no longer valid after DOM mutation (" + range.inspect() + ")");
        }
    }

    /*----------------------------------------------------------------------------------------------------------------*/

    // Test the browser's innerHTML support to decide how to implement createContextualFragment
    var styleEl = document.createElement("style");
    var htmlParsingConforms = false;
    try {
        styleEl.innerHTML = "<b>x</b>";
        htmlParsingConforms = (styleEl.firstChild.nodeType == 3); // Opera incorrectly creates an element node
    } catch (e) {
        // IE 6 and 7 throw
    }

    api.features.htmlParsingConforms = htmlParsingConforms;

    var createContextualFragment = htmlParsingConforms ?

        // Implementation as per HTML parsing spec, trusting in the browser's implementation of innerHTML. See
        // discussion and base code for this implementation at issue 67.
        // Spec: http://html5.org/specs/dom-parsing.html#extensions-to-the-range-interface
        // Thanks to Aleks Williams.
        function(fragmentStr) {
            // "Let node the context object's start's node."
            var node = this.startContainer;
            var doc = getDocument(node);

            // "If the context object's start's node is null, raise an INVALID_STATE_ERR
            // exception and abort these steps."
            if (!node) {
                throw new DOMException("INVALID_STATE_ERR");
            }

            // "Let element be as follows, depending on node's interface:"
            // Document, Document Fragment: null
            var el = null;

            // "Element: node"
            if (node.nodeType == 1) {
                el = node;

            // "Text, Comment: node's parentElement"
            } else if (isCharacterDataNode(node)) {
                el = dom.parentElement(node);
            }

            // "If either element is null or element's ownerDocument is an HTML document
            // and element's local name is "html" and element's namespace is the HTML
            // namespace"
            if (el === null || (
                el.nodeName == "HTML"
                && dom.isHtmlNamespace(getDocument(el).documentElement)
                && dom.isHtmlNamespace(el)
            )) {

            // "let element be a new Element with "body" as its local name and the HTML
            // namespace as its namespace.""
                el = doc.createElement("body");
            } else {
                el = el.cloneNode(false);
            }

            // "If the node's document is an HTML document: Invoke the HTML fragment parsing algorithm."
            // "If the node's document is an XML document: Invoke the XML fragment parsing algorithm."
            // "In either case, the algorithm must be invoked with fragment as the input
            // and element as the context element."
            el.innerHTML = fragmentStr;

            // "If this raises an exception, then abort these steps. Otherwise, let new
            // children be the nodes returned."

            // "Let fragment be a new DocumentFragment."
            // "Append all new children to fragment."
            // "Return fragment."
            return dom.fragmentFromNodeChildren(el);
        } :

        // In this case, innerHTML cannot be trusted, so fall back to a simpler, non-conformant implementation that
        // previous versions of Rangy used (with the exception of using a body element rather than a div)
        function(fragmentStr) {
            assertNotDetached(this);
            var doc = getRangeDocument(this);
            var el = doc.createElement("body");
            el.innerHTML = fragmentStr;

            return dom.fragmentFromNodeChildren(el);
        };

    function splitRangeBoundaries(range, positionsToPreserve) {
        assertRangeValid(range);

        var sc = range.startContainer, so = range.startOffset, ec = range.endContainer, eo = range.endOffset;
        var startEndSame = (sc === ec);

        if (isCharacterDataNode(ec) && eo > 0 && eo < ec.length) {
            splitDataNode(ec, eo, positionsToPreserve);
        }

        if (isCharacterDataNode(sc) && so > 0 && so < sc.length) {
            sc = splitDataNode(sc, so, positionsToPreserve);
            if (startEndSame) {
                eo -= so;
                ec = sc;
            } else if (ec == sc.parentNode && eo >= getNodeIndex(sc)) {
                eo++;
            }
            so = 0;
        }
        range.setStartAndEnd(sc, so, ec, eo);
    }

    /*----------------------------------------------------------------------------------------------------------------*/

    var rangeProperties = ["startContainer", "startOffset", "endContainer", "endOffset", "collapsed",
        "commonAncestorContainer"];

    var s2s = 0, s2e = 1, e2e = 2, e2s = 3;
    var n_b = 0, n_a = 1, n_b_a = 2, n_i = 3;

    util.extend(api.rangePrototype, {
        compareBoundaryPoints: function(how, range) {
            assertRangeValid(this);
            assertSameDocumentOrFragment(this.startContainer, range.startContainer);

            var nodeA, offsetA, nodeB, offsetB;
            var prefixA = (how == e2s || how == s2s) ? "start" : "end";
            var prefixB = (how == s2e || how == s2s) ? "start" : "end";
            nodeA = this[prefixA + "Container"];
            offsetA = this[prefixA + "Offset"];
            nodeB = range[prefixB + "Container"];
            offsetB = range[prefixB + "Offset"];
            return comparePoints(nodeA, offsetA, nodeB, offsetB);
        },

        insertNode: function(node) {
            assertRangeValid(this);
            assertValidNodeType(node, insertableNodeTypes);
            assertNodeNotReadOnly(this.startContainer);

            if (isOrIsAncestorOf(node, this.startContainer)) {
                throw new DOMException("HIERARCHY_REQUEST_ERR");
            }

            // No check for whether the container of the start of the Range is of a type that does not allow
            // children of the type of node: the browser's DOM implementation should do this for us when we attempt
            // to add the node

            var firstNodeInserted = insertNodeAtPosition(node, this.startContainer, this.startOffset);
            this.setStartBefore(firstNodeInserted);
        },

        cloneContents: function() {
            assertRangeValid(this);

            var clone, frag;
            if (this.collapsed) {
                return getRangeDocument(this).createDocumentFragment();
            } else {
                if (this.startContainer === this.endContainer && isCharacterDataNode(this.startContainer)) {
                    clone = this.startContainer.cloneNode(true);
                    clone.data = clone.data.slice(this.startOffset, this.endOffset);
                    frag = getRangeDocument(this).createDocumentFragment();
                    frag.appendChild(clone);
                    return frag;
                } else {
                    var iterator = new RangeIterator(this, true);
                    clone = cloneSubtree(iterator);
                    iterator.detach();
                }
                return clone;
            }
        },

        canSurroundContents: function() {
            assertRangeValid(this);
            assertNodeNotReadOnly(this.startContainer);
            assertNodeNotReadOnly(this.endContainer);

            // Check if the contents can be surrounded. Specifically, this means whether the range partially selects
            // no non-text nodes.
            var iterator = new RangeIterator(this, true);
            var boundariesInvalid = (iterator._first && (isNonTextPartiallySelected(iterator._first, this)) ||
                    (iterator._last && isNonTextPartiallySelected(iterator._last, this)));
            iterator.detach();
            return !boundariesInvalid;
        },

        surroundContents: function(node) {
            assertValidNodeType(node, surroundNodeTypes);

            if (!this.canSurroundContents()) {
                throw new RangeException("BAD_BOUNDARYPOINTS_ERR");
            }

            // Extract the contents
            var content = this.extractContents();

            // Clear the children of the node
            if (node.hasChildNodes()) {
                while (node.lastChild) {
                    node.removeChild(node.lastChild);
                }
            }

            // Insert the new node and add the extracted contents
            insertNodeAtPosition(node, this.startContainer, this.startOffset);
            node.appendChild(content);

            this.selectNode(node);
        },

        cloneRange: function() {
            assertRangeValid(this);
            var range = new Range(getRangeDocument(this));
            var i = rangeProperties.length, prop;
            while (i--) {
                prop = rangeProperties[i];
                range[prop] = this[prop];
            }
            return range;
        },

        toString: function() {
            assertRangeValid(this);
            var sc = this.startContainer;
            if (sc === this.endContainer && isCharacterDataNode(sc)) {
                return (sc.nodeType == 3 || sc.nodeType == 4) ? sc.data.slice(this.startOffset, this.endOffset) : "";
            } else {
                var textParts = [], iterator = new RangeIterator(this, true);
                iterateSubtree(iterator, function(node) {
                    // Accept only text or CDATA nodes, not comments
                    if (node.nodeType == 3 || node.nodeType == 4) {
                        textParts.push(node.data);
                    }
                });
                iterator.detach();
                return textParts.join("");
            }
        },

        // The methods below are all non-standard. The following batch were introduced by Mozilla but have since
        // been removed from Mozilla.

        compareNode: function(node) {
            assertRangeValid(this);

            var parent = node.parentNode;
            var nodeIndex = getNodeIndex(node);

            if (!parent) {
                throw new DOMException("NOT_FOUND_ERR");
            }

            var startComparison = this.comparePoint(parent, nodeIndex),
                endComparison = this.comparePoint(parent, nodeIndex + 1);

            if (startComparison < 0) { // Node starts before
                return (endComparison > 0) ? n_b_a : n_b;
            } else {
                return (endComparison > 0) ? n_a : n_i;
            }
        },

        comparePoint: function(node, offset) {
            assertRangeValid(this);
            assertNode(node, "HIERARCHY_REQUEST_ERR");
            assertSameDocumentOrFragment(node, this.startContainer);

            if (comparePoints(node, offset, this.startContainer, this.startOffset) < 0) {
                return -1;
            } else if (comparePoints(node, offset, this.endContainer, this.endOffset) > 0) {
                return 1;
            }
            return 0;
        },

        createContextualFragment: createContextualFragment,

        toHtml: function() {
            assertRangeValid(this);
            var container = this.commonAncestorContainer.parentNode.cloneNode(false);
            container.appendChild(this.cloneContents());
            return container.innerHTML;
        },

        // touchingIsIntersecting determines whether this method considers a node that borders a range intersects
        // with it (as in WebKit) or not (as in Gecko pre-1.9, and the default)
        intersectsNode: function(node, touchingIsIntersecting) {
            assertRangeValid(this);
            assertNode(node, "NOT_FOUND_ERR");
            if (getDocument(node) !== getRangeDocument(this)) {
                return false;
            }

            var parent = node.parentNode, offset = getNodeIndex(node);
            assertNode(parent, "NOT_FOUND_ERR");

            var startComparison = comparePoints(parent, offset, this.endContainer, this.endOffset),
                endComparison = comparePoints(parent, offset + 1, this.startContainer, this.startOffset);

            return touchingIsIntersecting ? startComparison <= 0 && endComparison >= 0 : startComparison < 0 && endComparison > 0;
        },

        isPointInRange: function(node, offset) {
            assertRangeValid(this);
            assertNode(node, "HIERARCHY_REQUEST_ERR");
            assertSameDocumentOrFragment(node, this.startContainer);

            return (comparePoints(node, offset, this.startContainer, this.startOffset) >= 0) &&
                   (comparePoints(node, offset, this.endContainer, this.endOffset) <= 0);
        },

        // The methods below are non-standard and invented by me.

        // Sharing a boundary start-to-end or end-to-start does not count as intersection.
        intersectsRange: function(range) {
            return rangesIntersect(this, range, false);
        },

        // Sharing a boundary start-to-end or end-to-start does count as intersection.
        intersectsOrTouchesRange: function(range) {
            return rangesIntersect(this, range, true);
        },

        intersection: function(range) {
            if (this.intersectsRange(range)) {
                var startComparison = comparePoints(this.startContainer, this.startOffset, range.startContainer, range.startOffset),
                    endComparison = comparePoints(this.endContainer, this.endOffset, range.endContainer, range.endOffset);

                var intersectionRange = this.cloneRange();
                if (startComparison == -1) {
                    intersectionRange.setStart(range.startContainer, range.startOffset);
                }
                if (endComparison == 1) {
                    intersectionRange.setEnd(range.endContainer, range.endOffset);
                }
                return intersectionRange;
            }
            return null;
        },

        union: function(range) {
            if (this.intersectsOrTouchesRange(range)) {
                var unionRange = this.cloneRange();
                if (comparePoints(range.startContainer, range.startOffset, this.startContainer, this.startOffset) == -1) {
                    unionRange.setStart(range.startContainer, range.startOffset);
                }
                if (comparePoints(range.endContainer, range.endOffset, this.endContainer, this.endOffset) == 1) {
                    unionRange.setEnd(range.endContainer, range.endOffset);
                }
                return unionRange;
            } else {
                throw new RangeException("Ranges do not intersect");
            }
        },

        containsNode: function(node, allowPartial) {
            if (allowPartial) {
                return this.intersectsNode(node, false);
            } else {
                return this.compareNode(node) == n_i;
            }
        },

        containsNodeContents: function(node) {
            return this.comparePoint(node, 0) >= 0 && this.comparePoint(node, getNodeLength(node)) <= 0;
        },

        containsRange: function(range) {
            var intersection = this.intersection(range);
            return intersection !== null && range.equals(intersection);
        },

        containsNodeText: function(node) {
            var nodeRange = this.cloneRange();
            nodeRange.selectNode(node);
            var textNodes = nodeRange.getNodes([3]);
            if (textNodes.length > 0) {
                nodeRange.setStart(textNodes[0], 0);
                var lastTextNode = textNodes.pop();
                nodeRange.setEnd(lastTextNode, lastTextNode.length);
                var contains = this.containsRange(nodeRange);
                nodeRange.detach();
                return contains;
            } else {
                return this.containsNodeContents(node);
            }
        },

        getNodes: function(nodeTypes, filter) {
            assertRangeValid(this);
            return getNodesInRange(this, nodeTypes, filter);
        },

        getDocument: function() {
            return getRangeDocument(this);
        },

        collapseBefore: function(node) {
            assertNotDetached(this);

            this.setEndBefore(node);
            this.collapse(false);
        },

        collapseAfter: function(node) {
            assertNotDetached(this);

            this.setStartAfter(node);
            this.collapse(true);
        },
        
        getBookmark: function(containerNode) {
            var doc = getRangeDocument(this);
            var preSelectionRange = api.createRange(doc);
            containerNode = containerNode || dom.getBody(doc);
            preSelectionRange.selectNodeContents(containerNode);
            var range = this.intersection(preSelectionRange);
            var start = 0, end = 0;
            if (range) {
                preSelectionRange.setEnd(range.startContainer, range.startOffset);
                start = preSelectionRange.toString().length;
                end = start + range.toString().length;
                preSelectionRange.detach();
            }

            return {
                start: start,
                end: end,
                containerNode: containerNode
            };
        },
        
        moveToBookmark: function(bookmark) {
            var containerNode = bookmark.containerNode;
            var charIndex = 0;
            this.setStart(containerNode, 0);
            this.collapse(true);
            var nodeStack = [containerNode], node, foundStart = false, stop = false;
            var nextCharIndex, i, childNodes;

            while (!stop && (node = nodeStack.pop())) {
                if (node.nodeType == 3) {
                    nextCharIndex = charIndex + node.length;
                    if (!foundStart && bookmark.start >= charIndex && bookmark.start <= nextCharIndex) {
                        this.setStart(node, bookmark.start - charIndex);
                        foundStart = true;
                    }
                    if (foundStart && bookmark.end >= charIndex && bookmark.end <= nextCharIndex) {
                        this.setEnd(node, bookmark.end - charIndex);
                        stop = true;
                    }
                    charIndex = nextCharIndex;
                } else {
                    childNodes = node.childNodes;
                    i = childNodes.length;
                    while (i--) {
                        nodeStack.push(childNodes[i]);
                    }
                }
            }
        },

        getName: function() {
            return "DomRange";
        },

        equals: function(range) {
            return Range.rangesEqual(this, range);
        },

        isValid: function() {
            return isRangeValid(this);
        },
        
        inspect: function() {
            return inspect(this);
        }
    });

    function copyComparisonConstantsToObject(obj) {
        obj.START_TO_START = s2s;
        obj.START_TO_END = s2e;
        obj.END_TO_END = e2e;
        obj.END_TO_START = e2s;

        obj.NODE_BEFORE = n_b;
        obj.NODE_AFTER = n_a;
        obj.NODE_BEFORE_AND_AFTER = n_b_a;
        obj.NODE_INSIDE = n_i;
    }

    function copyComparisonConstants(constructor) {
        copyComparisonConstantsToObject(constructor);
        copyComparisonConstantsToObject(constructor.prototype);
    }

    function createRangeContentRemover(remover, boundaryUpdater) {
        return function() {
            assertRangeValid(this);

            var sc = this.startContainer, so = this.startOffset, root = this.commonAncestorContainer;

            var iterator = new RangeIterator(this, true);

            // Work out where to position the range after content removal
            var node, boundary;
            if (sc !== root) {
                node = getClosestAncestorIn(sc, root, true);
                boundary = getBoundaryAfterNode(node);
                sc = boundary.node;
                so = boundary.offset;
            }

            // Check none of the range is read-only
            iterateSubtree(iterator, assertNodeNotReadOnly);

            iterator.reset();

            // Remove the content
            var returnValue = remover(iterator);
            iterator.detach();

            // Move to the new position
            boundaryUpdater(this, sc, so, sc, so);

            return returnValue;
        };
    }

    function createPrototypeRange(constructor, boundaryUpdater, detacher) {
        function createBeforeAfterNodeSetter(isBefore, isStart) {
            return function(node) {
                assertNotDetached(this);
                assertValidNodeType(node, beforeAfterNodeTypes);
                assertValidNodeType(getRootContainer(node), rootContainerNodeTypes);

                var boundary = (isBefore ? getBoundaryBeforeNode : getBoundaryAfterNode)(node);
                (isStart ? setRangeStart : setRangeEnd)(this, boundary.node, boundary.offset);
            };
        }

        function setRangeStart(range, node, offset) {
            var ec = range.endContainer, eo = range.endOffset;
            if (node !== range.startContainer || offset !== range.startOffset) {
                // Check the root containers of the range and the new boundary, and also check whether the new boundary
                // is after the current end. In either case, collapse the range to the new position
                if (getRootContainer(node) != getRootContainer(ec) || comparePoints(node, offset, ec, eo) == 1) {
                    ec = node;
                    eo = offset;
                }
                boundaryUpdater(range, node, offset, ec, eo);
            }
        }

        function setRangeEnd(range, node, offset) {
            var sc = range.startContainer, so = range.startOffset;
            if (node !== range.endContainer || offset !== range.endOffset) {
                // Check the root containers of the range and the new boundary, and also check whether the new boundary
                // is after the current end. In either case, collapse the range to the new position
                if (getRootContainer(node) != getRootContainer(sc) || comparePoints(node, offset, sc, so) == -1) {
                    sc = node;
                    so = offset;
                }
                boundaryUpdater(range, sc, so, node, offset);
            }
        }

        // Set up inheritance
        var F = function() {};
        F.prototype = api.rangePrototype;
        constructor.prototype = new F();

        util.extend(constructor.prototype, {
            setStart: function(node, offset) {
                assertNotDetached(this);
                assertNoDocTypeNotationEntityAncestor(node, true);
                assertValidOffset(node, offset);

                setRangeStart(this, node, offset);
            },

            setEnd: function(node, offset) {
                assertNotDetached(this);
                assertNoDocTypeNotationEntityAncestor(node, true);
                assertValidOffset(node, offset);

                setRangeEnd(this, node, offset);
            },

            /**
             * Convenience method to set a range's start and end boundaries. Overloaded as follows:
             * - Two parameters (node, offset) creates a collapsed range at that position
             * - Three parameters (node, startOffset, endOffset) creates a range contained with node starting at
             *   startOffset and ending at endOffset
             * - Four parameters (startNode, startOffset, endNode, endOffset) creates a range starting at startOffset in
             *   startNode and ending at endOffset in endNode
             */
            setStartAndEnd: function() {
                assertNotDetached(this);

                var args = arguments;
                var sc = args[0], so = args[1], ec = sc, eo = so;

                switch (args.length) {
                    case 3:
                        eo = args[2];
                        break;
                    case 4:
                        ec = args[2];
                        eo = args[3];
                        break;
                }

                boundaryUpdater(this, sc, so, ec, eo);
            },
            
            setBoundary: function(node, offset, isStart) {
                this["set" + (isStart ? "Start" : "End")](node, offset);
            },

            setStartBefore: createBeforeAfterNodeSetter(true, true),
            setStartAfter: createBeforeAfterNodeSetter(false, true),
            setEndBefore: createBeforeAfterNodeSetter(true, false),
            setEndAfter: createBeforeAfterNodeSetter(false, false),

            collapse: function(isStart) {
                assertRangeValid(this);
                if (isStart) {
                    boundaryUpdater(this, this.startContainer, this.startOffset, this.startContainer, this.startOffset);
                } else {
                    boundaryUpdater(this, this.endContainer, this.endOffset, this.endContainer, this.endOffset);
                }
            },

            selectNodeContents: function(node) {
                assertNotDetached(this);
                assertNoDocTypeNotationEntityAncestor(node, true);

                boundaryUpdater(this, node, 0, node, getNodeLength(node));
            },

            selectNode: function(node) {
                assertNotDetached(this);
                assertNoDocTypeNotationEntityAncestor(node, false);
                assertValidNodeType(node, beforeAfterNodeTypes);

                var start = getBoundaryBeforeNode(node), end = getBoundaryAfterNode(node);
                boundaryUpdater(this, start.node, start.offset, end.node, end.offset);
            },

            extractContents: createRangeContentRemover(extractSubtree, boundaryUpdater),

            deleteContents: createRangeContentRemover(deleteSubtree, boundaryUpdater),

            canSurroundContents: function() {
                assertRangeValid(this);
                assertNodeNotReadOnly(this.startContainer);
                assertNodeNotReadOnly(this.endContainer);

                // Check if the contents can be surrounded. Specifically, this means whether the range partially selects
                // no non-text nodes.
                var iterator = new RangeIterator(this, true);
                var boundariesInvalid = (iterator._first && (isNonTextPartiallySelected(iterator._first, this)) ||
                        (iterator._last && isNonTextPartiallySelected(iterator._last, this)));
                iterator.detach();
                return !boundariesInvalid;
            },

            detach: function() {
                detacher(this);
            },

            splitBoundaries: function() {
                splitRangeBoundaries(this);
            },

            splitBoundariesPreservingPositions: function(positionsToPreserve) {
                splitRangeBoundaries(this, positionsToPreserve);
            },

            normalizeBoundaries: function() {
                assertRangeValid(this);

                var sc = this.startContainer, so = this.startOffset, ec = this.endContainer, eo = this.endOffset;

                var mergeForward = function(node) {
                    var sibling = node.nextSibling;
                    if (sibling && sibling.nodeType == node.nodeType) {
                        ec = node;
                        eo = node.length;
                        node.appendData(sibling.data);
                        sibling.parentNode.removeChild(sibling);
                    }
                };

                var mergeBackward = function(node) {
                    var sibling = node.previousSibling;
                    if (sibling && sibling.nodeType == node.nodeType) {
                        sc = node;
                        var nodeLength = node.length;
                        so = sibling.length;
                        node.insertData(0, sibling.data);
                        sibling.parentNode.removeChild(sibling);
                        if (sc == ec) {
                            eo += so;
                            ec = sc;
                        } else if (ec == node.parentNode) {
                            var nodeIndex = getNodeIndex(node);
                            if (eo == nodeIndex) {
                                ec = node;
                                eo = nodeLength;
                            } else if (eo > nodeIndex) {
                                eo--;
                            }
                        }
                    }
                };

                var normalizeStart = true;

                if (isCharacterDataNode(ec)) {
                    if (ec.length == eo) {
                        mergeForward(ec);
                    }
                } else {
                    if (eo > 0) {
                        var endNode = ec.childNodes[eo - 1];
                        if (endNode && isCharacterDataNode(endNode)) {
                            mergeForward(endNode);
                        }
                    }
                    normalizeStart = !this.collapsed;
                }

                if (normalizeStart) {
                    if (isCharacterDataNode(sc)) {
                        if (so == 0) {
                            mergeBackward(sc);
                        }
                    } else {
                        if (so < sc.childNodes.length) {
                            var startNode = sc.childNodes[so];
                            if (startNode && isCharacterDataNode(startNode)) {
                                mergeBackward(startNode);
                            }
                        }
                    }
                } else {
                    sc = ec;
                    so = eo;
                }

                boundaryUpdater(this, sc, so, ec, eo);
            },

            collapseToPoint: function(node, offset) {
                assertNotDetached(this);
                assertNoDocTypeNotationEntityAncestor(node, true);
                assertValidOffset(node, offset);
                this.setStartAndEnd(node, offset);
            }
        });

        copyComparisonConstants(constructor);
    }

    /*----------------------------------------------------------------------------------------------------------------*/

    // Updates commonAncestorContainer and collapsed after boundary change
    function updateCollapsedAndCommonAncestor(range) {
        range.collapsed = (range.startContainer === range.endContainer && range.startOffset === range.endOffset);
        range.commonAncestorContainer = range.collapsed ?
            range.startContainer : dom.getCommonAncestor(range.startContainer, range.endContainer);
    }

    function updateBoundaries(range, startContainer, startOffset, endContainer, endOffset) {
        range.startContainer = startContainer;
        range.startOffset = startOffset;
        range.endContainer = endContainer;
        range.endOffset = endOffset;
        range.document = dom.getDocument(startContainer);

        updateCollapsedAndCommonAncestor(range);
    }

    function detach(range) {
        assertNotDetached(range);
        range.startContainer = range.startOffset = range.endContainer = range.endOffset = range.document = null;
        range.collapsed = range.commonAncestorContainer = null;
    }

    function Range(doc) {
        this.startContainer = doc;
        this.startOffset = 0;
        this.endContainer = doc;
        this.endOffset = 0;
        this.document = doc;
        updateCollapsedAndCommonAncestor(this);
    }

    createPrototypeRange(Range, updateBoundaries, detach);

    util.extend(Range, {
        rangeProperties: rangeProperties,
        RangeIterator: RangeIterator,
        copyComparisonConstants: copyComparisonConstants,
        createPrototypeRange: createPrototypeRange,
        inspect: inspect,
        getRangeDocument: getRangeDocument,
        rangesEqual: function(r1, r2) {
            return r1.startContainer === r2.startContainer &&
                r1.startOffset === r2.startOffset &&
                r1.endContainer === r2.endContainer &&
                r1.endOffset === r2.endOffset;
        }
    });

    api.DomRange = Range;
    api.RangeException = RangeException;
});
rangy.createCoreModule("WrappedRange", ["DomRange"], function(api, module) {
    var WrappedRange, WrappedTextRange;
    var dom = api.dom;
    var util = api.util;
    var DomPosition = dom.DomPosition;
    var DomRange = api.DomRange;
    var getBody = dom.getBody;
    var getContentDocument = dom.getContentDocument;
    var isCharacterDataNode = dom.isCharacterDataNode;


    /*----------------------------------------------------------------------------------------------------------------*/

    if (api.features.implementsDomRange) {
        // This is a wrapper around the browser's native DOM Range. It has two aims:
        // - Provide workarounds for specific browser bugs
        // - provide convenient extensions, which are inherited from Rangy's DomRange

        (function() {
            var rangeProto;
            var rangeProperties = DomRange.rangeProperties;

            function updateRangeProperties(range) {
                var i = rangeProperties.length, prop;
                while (i--) {
                    prop = rangeProperties[i];
                    range[prop] = range.nativeRange[prop];
                }
                // Fix for broken collapsed property in IE 9.
                range.collapsed = (range.startContainer === range.endContainer && range.startOffset === range.endOffset);
            }

            function updateNativeRange(range, startContainer, startOffset, endContainer, endOffset) {
                var startMoved = (range.startContainer !== startContainer || range.startOffset != startOffset);
                var endMoved = (range.endContainer !== endContainer || range.endOffset != endOffset);
                var nativeRangeDifferent = !range.equals(range.nativeRange);

                // Always set both boundaries for the benefit of IE9 (see issue 35)
                if (startMoved || endMoved || nativeRangeDifferent) {
                    range.setEnd(endContainer, endOffset);
                    range.setStart(startContainer, startOffset);
                }
            }

            function detach(range) {
                range.nativeRange.detach();
                range.detached = true;
                var i = rangeProperties.length;
                while (i--) {
                    range[ rangeProperties[i] ] = null;
                }
            }

            var createBeforeAfterNodeSetter;

            WrappedRange = function(range) {
                if (!range) {
                    throw module.createError("WrappedRange: Range must be specified");
                }
                this.nativeRange = range;
                updateRangeProperties(this);
            };

            DomRange.createPrototypeRange(WrappedRange, updateNativeRange, detach);

            rangeProto = WrappedRange.prototype;

            rangeProto.selectNode = function(node) {
                this.nativeRange.selectNode(node);
                updateRangeProperties(this);
            };

            rangeProto.cloneContents = function() {
                return this.nativeRange.cloneContents();
            };

            // Due to a long-standing Firefox bug that I have not been able to find a reliable way to detect,
            // insertNode() is never delegated to the native range.

            rangeProto.surroundContents = function(node) {
                this.nativeRange.surroundContents(node);
                updateRangeProperties(this);
            };

            rangeProto.collapse = function(isStart) {
                this.nativeRange.collapse(isStart);
                updateRangeProperties(this);
            };

            rangeProto.cloneRange = function() {
                return new WrappedRange(this.nativeRange.cloneRange());
            };

            rangeProto.refresh = function() {
                updateRangeProperties(this);
            };

            rangeProto.toString = function() {
                return this.nativeRange.toString();
            };

            // Create test range and node for feature detection

            var testTextNode = document.createTextNode("test");
            getBody(document).appendChild(testTextNode);
            var range = document.createRange();

            /*--------------------------------------------------------------------------------------------------------*/

            // Test for Firefox 2 bug that prevents moving the start of a Range to a point after its current end and
            // correct for it

            range.setStart(testTextNode, 0);
            range.setEnd(testTextNode, 0);

            try {
                range.setStart(testTextNode, 1);

                rangeProto.setStart = function(node, offset) {
                    this.nativeRange.setStart(node, offset);
                    updateRangeProperties(this);
                };

                rangeProto.setEnd = function(node, offset) {
                    this.nativeRange.setEnd(node, offset);
                    updateRangeProperties(this);
                };

                createBeforeAfterNodeSetter = function(name) {
                    return function(node) {
                        this.nativeRange[name](node);
                        updateRangeProperties(this);
                    };
                };

            } catch(ex) {

                rangeProto.setStart = function(node, offset) {
                    try {
                        this.nativeRange.setStart(node, offset);
                    } catch (ex) {
                        this.nativeRange.setEnd(node, offset);
                        this.nativeRange.setStart(node, offset);
                    }
                    updateRangeProperties(this);
                };

                rangeProto.setEnd = function(node, offset) {
                    try {
                        this.nativeRange.setEnd(node, offset);
                    } catch (ex) {
                        this.nativeRange.setStart(node, offset);
                        this.nativeRange.setEnd(node, offset);
                    }
                    updateRangeProperties(this);
                };

                createBeforeAfterNodeSetter = function(name, oppositeName) {
                    return function(node) {
                        try {
                            this.nativeRange[name](node);
                        } catch (ex) {
                            this.nativeRange[oppositeName](node);
                            this.nativeRange[name](node);
                        }
                        updateRangeProperties(this);
                    };
                };
            }

            rangeProto.setStartBefore = createBeforeAfterNodeSetter("setStartBefore", "setEndBefore");
            rangeProto.setStartAfter = createBeforeAfterNodeSetter("setStartAfter", "setEndAfter");
            rangeProto.setEndBefore = createBeforeAfterNodeSetter("setEndBefore", "setStartBefore");
            rangeProto.setEndAfter = createBeforeAfterNodeSetter("setEndAfter", "setStartAfter");

            /*--------------------------------------------------------------------------------------------------------*/

            // Always use DOM4-compliant selectNodeContents implementation: it's simpler and less code than testing
            // whether the native implementation can be trusted
            rangeProto.selectNodeContents = function(node) {
                this.setStartAndEnd(node, 0, dom.getNodeLength(node));
            };

            /*--------------------------------------------------------------------------------------------------------*/

            // Test for and correct WebKit bug that has the behaviour of compareBoundaryPoints round the wrong way for
            // constants START_TO_END and END_TO_START: https://bugs.webkit.org/show_bug.cgi?id=20738

            range.selectNodeContents(testTextNode);
            range.setEnd(testTextNode, 3);

            var range2 = document.createRange();
            range2.selectNodeContents(testTextNode);
            range2.setEnd(testTextNode, 4);
            range2.setStart(testTextNode, 2);

            if (range.compareBoundaryPoints(range.START_TO_END, range2) == -1 &&
                    range.compareBoundaryPoints(range.END_TO_START, range2) == 1) {
                // This is the wrong way round, so correct for it

                rangeProto.compareBoundaryPoints = function(type, range) {
                    range = range.nativeRange || range;
                    if (type == range.START_TO_END) {
                        type = range.END_TO_START;
                    } else if (type == range.END_TO_START) {
                        type = range.START_TO_END;
                    }
                    return this.nativeRange.compareBoundaryPoints(type, range);
                };
            } else {
                rangeProto.compareBoundaryPoints = function(type, range) {
                    return this.nativeRange.compareBoundaryPoints(type, range.nativeRange || range);
                };
            }

            /*--------------------------------------------------------------------------------------------------------*/

            // Test for IE 9 deleteContents() and extractContents() bug and correct it. See issue 107.

            var el = document.createElement("div");
            el.innerHTML = "123";
            var textNode = el.firstChild;
            var body = getBody(document);
            body.appendChild(el);

            range.setStart(textNode, 1);
            range.setEnd(textNode, 2);
            range.deleteContents();

            if (textNode.data == "13") {
                // Behaviour is correct per DOM4 Range so wrap the browser's implementation of deleteContents() and
                // extractContents()
                rangeProto.deleteContents = function() {
                    this.nativeRange.deleteContents();
                    updateRangeProperties(this);
                };

                rangeProto.extractContents = function() {
                    var frag = this.nativeRange.extractContents();
                    updateRangeProperties(this);
                    return frag;
                };
            } else {
            }

            body.removeChild(el);
            body = null;

            /*--------------------------------------------------------------------------------------------------------*/

            // Test for existence of createContextualFragment and delegate to it if it exists
            if (util.isHostMethod(range, "createContextualFragment")) {
                rangeProto.createContextualFragment = function(fragmentStr) {
                    return this.nativeRange.createContextualFragment(fragmentStr);
                };
            }

            /*--------------------------------------------------------------------------------------------------------*/

            // Clean up
            getBody(document).removeChild(testTextNode);
            range.detach();
            range2.detach();

            rangeProto.getName = function() {
                return "WrappedRange";
            };

            api.WrappedRange = WrappedRange;

            api.createNativeRange = function(doc) {
                doc = getContentDocument(doc, module, "createNativeRange");
                return doc.createRange();
            };
        })();
    }
    
    if (api.features.implementsTextRange) {
        /*
        This is a workaround for a bug where IE returns the wrong container element from the TextRange's parentElement()
        method. For example, in the following (where pipes denote the selection boundaries):

        <ul id="ul"><li id="a">| a </li><li id="b"> b |</li></ul>

        var range = document.selection.createRange();
        alert(range.parentElement().id); // Should alert "ul" but alerts "b"

        This method returns the common ancestor node of the following:
        - the parentElement() of the textRange
        - the parentElement() of the textRange after calling collapse(true)
        - the parentElement() of the textRange after calling collapse(false)
        */
        var getTextRangeContainerElement = function(textRange) {
            var parentEl = textRange.parentElement();
            var range = textRange.duplicate();
            range.collapse(true);
            var startEl = range.parentElement();
            range = textRange.duplicate();
            range.collapse(false);
            var endEl = range.parentElement();
            var startEndContainer = (startEl == endEl) ? startEl : dom.getCommonAncestor(startEl, endEl);

            return startEndContainer == parentEl ? startEndContainer : dom.getCommonAncestor(parentEl, startEndContainer);
        };

        var textRangeIsCollapsed = function(textRange) {
            return textRange.compareEndPoints("StartToEnd", textRange) == 0;
        };

        // Gets the boundary of a TextRange expressed as a node and an offset within that node. This function started out as
        // an improved version of code found in Tim Cameron Ryan's IERange (http://code.google.com/p/ierange/) but has
        // grown, fixing problems with line breaks in preformatted text, adding workaround for IE TextRange bugs, handling
        // for inputs and images, plus optimizations.
        var getTextRangeBoundaryPosition = function(textRange, wholeRangeContainerElement, isStart, isCollapsed, startInfo) {
            var workingRange = textRange.duplicate();
            workingRange.collapse(isStart);
            var containerElement = workingRange.parentElement();

            // Sometimes collapsing a TextRange that's at the start of a text node can move it into the previous node, so
            // check for that
            if (!dom.isOrIsAncestorOf(wholeRangeContainerElement, containerElement)) {
                containerElement = wholeRangeContainerElement;
            }


            // Deal with nodes that cannot "contain rich HTML markup". In practice, this means form inputs, images and
            // similar. See http://msdn.microsoft.com/en-us/library/aa703950%28VS.85%29.aspx
            if (!containerElement.canHaveHTML) {
                var pos = new DomPosition(containerElement.parentNode, dom.getNodeIndex(containerElement));
                return {
                    boundaryPosition: pos,
                    nodeInfo: {
                        nodeIndex: pos.offset,
                        containerElement: pos.node
                    }
                };
            }

            var workingNode = dom.getDocument(containerElement).createElement("span");

            // Workaround for HTML5 Shiv's insane violation of document.createElement(). See Rangy issue 104 and HTML5
            // Shiv issue 64: https://github.com/aFarkas/html5shiv/issues/64
            if (workingNode.parentNode) {
                workingNode.parentNode.removeChild(workingNode);
            }

            var comparison, workingComparisonType = isStart ? "StartToStart" : "StartToEnd";
            var previousNode, nextNode, boundaryPosition, boundaryNode;
            var start = (startInfo && startInfo.containerElement == containerElement) ? startInfo.nodeIndex : 0;
            var childNodeCount = containerElement.childNodes.length;
            var end = childNodeCount;

            // Check end first. Code within the loop assumes that the endth child node of the container is definitely
            // after the range boundary.
            var nodeIndex = end;

            while (true) {
                if (nodeIndex == childNodeCount) {
                    containerElement.appendChild(workingNode);
                } else {
                    containerElement.insertBefore(workingNode, containerElement.childNodes[nodeIndex]);
                }
                workingRange.moveToElementText(workingNode);
                comparison = workingRange.compareEndPoints(workingComparisonType, textRange);
                if (comparison == 0 || start == end) {
                    break;
                } else if (comparison == -1) {
                    if (end == start + 1) {
                        // We know the endth child node is after the range boundary, so we must be done.
                        break;
                    } else {
                        start = nodeIndex;
                    }
                } else {
                    end = (end == start + 1) ? start : nodeIndex;
                }
                nodeIndex = Math.floor((start + end) / 2);
                containerElement.removeChild(workingNode);
            }


            // We've now reached or gone past the boundary of the text range we're interested in
            // so have identified the node we want
            boundaryNode = workingNode.nextSibling;

            if (comparison == -1 && boundaryNode && isCharacterDataNode(boundaryNode)) {
                // This is a character data node (text, comment, cdata). The working range is collapsed at the start of the
                // node containing the text range's boundary, so we move the end of the working range to the boundary point
                // and measure the length of its text to get the boundary's offset within the node.
                workingRange.setEndPoint(isStart ? "EndToStart" : "EndToEnd", textRange);

                var offset;

                if (/[\r\n]/.test(boundaryNode.data)) {
                    /*
                    For the particular case of a boundary within a text node containing rendered line breaks (within a <pre>
                    element, for example), we need a slightly complicated approach to get the boundary's offset in IE. The
                    facts:
                    
                    - Each line break is represented as \r in the text node's data/nodeValue properties
                    - Each line break is represented as \r\n in the TextRange's 'text' property
                    - The 'text' property of the TextRange does not contain trailing line breaks
                    
                    To get round the problem presented by the final fact above, we can use the fact that TextRange's
                    moveStart() and moveEnd() methods return the actual number of characters moved, which is not necessarily
                    the same as the number of characters it was instructed to move. The simplest approach is to use this to
                    store the characters moved when moving both the start and end of the range to the start of the document
                    body and subtracting the start offset from the end offset (the "move-negative-gazillion" method).
                    However, this is extremely slow when the document is large and the range is near the end of it. Clearly
                    doing the mirror image (i.e. moving the range boundaries to the end of the document) has the same
                    problem.
                    
                    Another approach that works is to use moveStart() to move the start boundary of the range up to the end
                    boundary one character at a time and incrementing a counter with the value returned by the moveStart()
                    call. However, the check for whether the start boundary has reached the end boundary is expensive, so
                    this method is slow (although unlike "move-negative-gazillion" is largely unaffected by the location of
                    the range within the document).
                    
                    The method below is a hybrid of the two methods above. It uses the fact that a string containing the
                    TextRange's 'text' property with each \r\n converted to a single \r character cannot be longer than the
                    text of the TextRange, so the start of the range is moved that length initially and then a character at
                    a time to make up for any trailing line breaks not contained in the 'text' property. This has good
                    performance in most situations compared to the previous two methods.
                    */
                    var tempRange = workingRange.duplicate();
                    var rangeLength = tempRange.text.replace(/\r\n/g, "\r").length;

                    offset = tempRange.moveStart("character", rangeLength);
                    while ( (comparison = tempRange.compareEndPoints("StartToEnd", tempRange)) == -1) {
                        offset++;
                        tempRange.moveStart("character", 1);
                    }
                } else {
                    offset = workingRange.text.length;
                }
                boundaryPosition = new DomPosition(boundaryNode, offset);
            } else {

                // If the boundary immediately follows a character data node and this is the end boundary, we should favour
                // a position within that, and likewise for a start boundary preceding a character data node
                previousNode = (isCollapsed || !isStart) && workingNode.previousSibling;
                nextNode = (isCollapsed || isStart) && workingNode.nextSibling;
                if (nextNode && isCharacterDataNode(nextNode)) {
                    boundaryPosition = new DomPosition(nextNode, 0);
                } else if (previousNode && isCharacterDataNode(previousNode)) {
                    boundaryPosition = new DomPosition(previousNode, previousNode.data.length);
                } else {
                    boundaryPosition = new DomPosition(containerElement, dom.getNodeIndex(workingNode));
                }
            }

            // Clean up
            workingNode.parentNode.removeChild(workingNode);

            return {
                boundaryPosition: boundaryPosition,
                nodeInfo: {
                    nodeIndex: nodeIndex,
                    containerElement: containerElement
                }
            };
        };

        // Returns a TextRange representing the boundary of a TextRange expressed as a node and an offset within that node.
        // This function started out as an optimized version of code found in Tim Cameron Ryan's IERange
        // (http://code.google.com/p/ierange/)
        var createBoundaryTextRange = function(boundaryPosition, isStart) {
            var boundaryNode, boundaryParent, boundaryOffset = boundaryPosition.offset;
            var doc = dom.getDocument(boundaryPosition.node);
            var workingNode, childNodes, workingRange = getBody(doc).createTextRange();
            var nodeIsDataNode = isCharacterDataNode(boundaryPosition.node);

            if (nodeIsDataNode) {
                boundaryNode = boundaryPosition.node;
                boundaryParent = boundaryNode.parentNode;
            } else {
                childNodes = boundaryPosition.node.childNodes;
                boundaryNode = (boundaryOffset < childNodes.length) ? childNodes[boundaryOffset] : null;
                boundaryParent = boundaryPosition.node;
            }

            // Position the range immediately before the node containing the boundary
            workingNode = doc.createElement("span");

            // Making the working element non-empty element persuades IE to consider the TextRange boundary to be within the
            // element rather than immediately before or after it
            workingNode.innerHTML = "&#feff;";

            // insertBefore is supposed to work like appendChild if the second parameter is null. However, a bug report
            // for IERange suggests that it can crash the browser: http://code.google.com/p/ierange/issues/detail?id=12
            if (boundaryNode) {
                boundaryParent.insertBefore(workingNode, boundaryNode);
            } else {
                boundaryParent.appendChild(workingNode);
            }

            workingRange.moveToElementText(workingNode);
            workingRange.collapse(!isStart);

            // Clean up
            boundaryParent.removeChild(workingNode);

            // Move the working range to the text offset, if required
            if (nodeIsDataNode) {
                workingRange[isStart ? "moveStart" : "moveEnd"]("character", boundaryOffset);
            }

            return workingRange;
        };

        /*------------------------------------------------------------------------------------------------------------*/

        // This is a wrapper around a TextRange, providing full DOM Range functionality using rangy's DomRange as a
        // prototype

        WrappedTextRange = function(textRange) {
            this.textRange = textRange;
            this.refresh();
        };

        WrappedTextRange.prototype = new DomRange(document);

        WrappedTextRange.prototype.refresh = function() {
            var start, end, startBoundary;

            // TextRange's parentElement() method cannot be trusted. getTextRangeContainerElement() works around that.
            var rangeContainerElement = getTextRangeContainerElement(this.textRange);

            if (textRangeIsCollapsed(this.textRange)) {
                end = start = getTextRangeBoundaryPosition(this.textRange, rangeContainerElement, true,
                    true).boundaryPosition;
            } else {
                startBoundary = getTextRangeBoundaryPosition(this.textRange, rangeContainerElement, true, false);
                start = startBoundary.boundaryPosition;

                // An optimization used here is that if the start and end boundaries have the same parent element, the
                // search scope for the end boundary can be limited to exclude the portion of the element that precedes
                // the start boundary
                end = getTextRangeBoundaryPosition(this.textRange, rangeContainerElement, false, false,
                    startBoundary.nodeInfo).boundaryPosition;
            }

            this.setStart(start.node, start.offset);
            this.setEnd(end.node, end.offset);
        };

        WrappedTextRange.prototype.getName = function() {
            return "WrappedTextRange";
        };

        DomRange.copyComparisonConstants(WrappedTextRange);

        WrappedTextRange.rangeToTextRange = function(range) {
            if (range.collapsed) {
                return createBoundaryTextRange(new DomPosition(range.startContainer, range.startOffset), true);
            } else {
                var startRange = createBoundaryTextRange(new DomPosition(range.startContainer, range.startOffset), true);
                var endRange = createBoundaryTextRange(new DomPosition(range.endContainer, range.endOffset), false);
                var textRange = getBody( DomRange.getRangeDocument(range) ).createTextRange();
                textRange.setEndPoint("StartToStart", startRange);
                textRange.setEndPoint("EndToEnd", endRange);
                return textRange;
            }
        };

        api.WrappedTextRange = WrappedTextRange;

        // IE 9 and above have both implementations and Rangy makes both available. The next few lines sets which
        // implementation to use by default.
        if (!api.features.implementsDomRange || api.config.preferTextRange) {
            // Add WrappedTextRange as the Range property of the global object to allow expression like Range.END_TO_END to work
            var globalObj = (function() { return this; })();
            if (typeof globalObj.Range == "undefined") {
                globalObj.Range = WrappedTextRange;
            }

            api.createNativeRange = function(doc) {
                doc = getContentDocument(doc, module, "createNativeRange");
                return getBody(doc).createTextRange();
            };

            api.WrappedRange = WrappedTextRange;
        }
    }

    api.createRange = function(doc) {
        doc = getContentDocument(doc, module, "createRange");
        return new api.WrappedRange(api.createNativeRange(doc));
    };

    api.createRangyRange = function(doc) {
        doc = getContentDocument(doc, module, "createRangyRange");
        return new DomRange(doc);
    };

    api.createIframeRange = function(iframeEl) {
        module.deprecationNotice("createIframeRange()", "createRange(iframeEl)");
        return api.createRange(iframeEl);
    };

    api.createIframeRangyRange = function(iframeEl) {
        module.deprecationNotice("createIframeRangyRange()", "createRangyRange(iframeEl)");
        return api.createRangyRange(iframeEl);
    };

    api.addCreateMissingNativeApiListener(function(win) {
        var doc = win.document;
        if (typeof doc.createRange == "undefined") {
            doc.createRange = function() {
                return api.createRange(doc);
            };
        }
        doc = win = null;
    });
});
// This module creates a selection object wrapper that conforms as closely as possible to the Selection specification
// in the HTML Editing spec (http://dvcs.w3.org/hg/editing/raw-file/tip/editing.html#selections)
rangy.createCoreModule("WrappedSelection", ["DomRange", "WrappedRange"], function(api, module) {
    api.config.checkSelectionRanges = true;

    var BOOLEAN = "boolean";
    var NUMBER = "number";
    var dom = api.dom;
    var util = api.util;
    var isHostMethod = util.isHostMethod;
    var DomRange = api.DomRange;
    var WrappedRange = api.WrappedRange;
    var DOMException = api.DOMException;
    var DomPosition = dom.DomPosition;
    var getNativeSelection;
    var selectionIsCollapsed;
    var features = api.features;
    var CONTROL = "Control";
    var getDocument = dom.getDocument;
    var getBody = dom.getBody;
    var rangesEqual = DomRange.rangesEqual;


    // Utility function to support direction parameters in the API that may be a string ("backward" or "forward") or a
    // Boolean (true for backwards).
    function isDirectionBackward(dir) {
        return (typeof dir == "string") ? /^backward(s)?$/i.test(dir) : !!dir;
    }

    function getWindow(win, methodName) {
        if (!win) {
            return window;
        } else if (dom.isWindow(win)) {
            return win;
        } else if (win instanceof WrappedSelection) {
            return win.win;
        } else {
            var doc = dom.getContentDocument(win, module, methodName);
            return dom.getWindow(doc);
        }
    }

    function getWinSelection(winParam) {
        return getWindow(winParam, "getWinSelection").getSelection();
    }

    function getDocSelection(winParam) {
        return getWindow(winParam, "getDocSelection").document.selection;
    }
    
    function winSelectionIsBackward(sel) {
        var backward = false;
        if (sel.anchorNode) {
            backward = (dom.comparePoints(sel.anchorNode, sel.anchorOffset, sel.focusNode, sel.focusOffset) == 1);
        }
        return backward;
    }

    // Test for the Range/TextRange and Selection features required
    // Test for ability to retrieve selection
    var implementsWinGetSelection = isHostMethod(window, "getSelection"),
        implementsDocSelection = util.isHostObject(document, "selection");

    features.implementsWinGetSelection = implementsWinGetSelection;
    features.implementsDocSelection = implementsDocSelection;

    var useDocumentSelection = implementsDocSelection && (!implementsWinGetSelection || api.config.preferTextRange);

    if (useDocumentSelection) {
        getNativeSelection = getDocSelection;
        api.isSelectionValid = function(winParam) {
            var doc = getWindow(winParam, "isSelectionValid").document, nativeSel = doc.selection;

            // Check whether the selection TextRange is actually contained within the correct document
            return (nativeSel.type != "None" || getDocument(nativeSel.createRange().parentElement()) == doc);
        };
    } else if (implementsWinGetSelection) {
        getNativeSelection = getWinSelection;
        api.isSelectionValid = function() {
            return true;
        };
    } else {
        module.fail("Neither document.selection or window.getSelection() detected.");
    }

    api.getNativeSelection = getNativeSelection;

    var testSelection = getNativeSelection();
    var testRange = api.createNativeRange(document);
    var body = getBody(document);

    // Obtaining a range from a selection
    var selectionHasAnchorAndFocus = util.areHostProperties(testSelection,
        ["anchorNode", "focusNode", "anchorOffset", "focusOffset"]);

    features.selectionHasAnchorAndFocus = selectionHasAnchorAndFocus;

    // Test for existence of native selection extend() method
    var selectionHasExtend = isHostMethod(testSelection, "extend");
    features.selectionHasExtend = selectionHasExtend;
    
    // Test if rangeCount exists
    var selectionHasRangeCount = (typeof testSelection.rangeCount == NUMBER);
    features.selectionHasRangeCount = selectionHasRangeCount;

    var selectionSupportsMultipleRanges = false;
    var collapsedNonEditableSelectionsSupported = true;

    var addRangeBackwardToNative = selectionHasExtend ?
        function(nativeSelection, range) {
            var doc = DomRange.getRangeDocument(range);
            var endRange = api.createRange(doc);
            endRange.collapseToPoint(range.endContainer, range.endOffset);
            nativeSelection.addRange(getNativeRange(endRange));
            nativeSelection.extend(range.startContainer, range.startOffset);
        } : null;

    if (util.areHostMethods(testSelection, ["addRange", "getRangeAt", "removeAllRanges"]) &&
            typeof testSelection.rangeCount == NUMBER && features.implementsDomRange) {

        (function() {
            // Previously an iframe was used but this caused problems in some circumstances in IE, so tests are
            // performed on the current document's selection. See issue 109.

            // Note also that if a selection previously existed, it is wiped by these tests. This should usually be fine
            // because initialization usually happens when the document loads, but could be a problem for a script that
            // loads and initializes Rangy later. If anyone complains, code could be added to save and restore the
            // selection.
            var sel = window.getSelection();
            if (sel) {
                // Store the current selection
                var originalSelectionRangeCount = sel.rangeCount;
                var selectionHasMultipleRanges = (originalSelectionRangeCount > 1);
                var originalSelectionRanges = [];
                var originalSelectionBackward = winSelectionIsBackward(sel); 
                for (var i = 0; i < originalSelectionRangeCount; ++i) {
                    originalSelectionRanges[i] = sel.getRangeAt(i);
                }
                
                // Create some test elements
                var body = getBody(document);
                var testEl = body.appendChild( document.createElement("div") );
                testEl.contentEditable = "false";
                var textNode = testEl.appendChild( document.createTextNode("\u00a0\u00a0\u00a0") );

                // Test whether the native selection will allow a collapsed selection within a non-editable element
                var r1 = document.createRange();

                r1.setStart(textNode, 1);
                r1.collapse(true);
                sel.addRange(r1);
                collapsedNonEditableSelectionsSupported = (sel.rangeCount == 1);
                sel.removeAllRanges();

                // Test whether the native selection is capable of supporting multiple ranges
                if (!selectionHasMultipleRanges) {
                    var r2 = r1.cloneRange();
                    r1.setStart(textNode, 0);
                    r2.setEnd(textNode, 3);
                    r2.setStart(textNode, 2);
                    sel.addRange(r1);
                    sel.addRange(r2);

                    selectionSupportsMultipleRanges = (sel.rangeCount == 2);
                    r2.detach();
                }

                // Clean up
                body.removeChild(testEl);
                sel.removeAllRanges();
                r1.detach();

                for (i = 0; i < originalSelectionRangeCount; ++i) {
                    if (i == 0 && originalSelectionBackward) {
                        if (addRangeBackwardToNative) {
                            addRangeBackwardToNative(sel, originalSelectionRanges[i]);
                        } else {
                            api.warn("Rangy initialization: original selection was backwards but selection has been restored forwards because browser does not support Selection.extend");
                            sel.addRange(originalSelectionRanges[i])
                        }
                    } else {
                        sel.addRange(originalSelectionRanges[i])
                    }
                }
            }
        })();
    }

    features.selectionSupportsMultipleRanges = selectionSupportsMultipleRanges;
    features.collapsedNonEditableSelectionsSupported = collapsedNonEditableSelectionsSupported;

    // ControlRanges
    var implementsControlRange = false, testControlRange;

    if (body && isHostMethod(body, "createControlRange")) {
        testControlRange = body.createControlRange();
        if (util.areHostProperties(testControlRange, ["item", "add"])) {
            implementsControlRange = true;
        }
    }
    features.implementsControlRange = implementsControlRange;

    // Selection collapsedness
    if (selectionHasAnchorAndFocus) {
        selectionIsCollapsed = function(sel) {
            return sel.anchorNode === sel.focusNode && sel.anchorOffset === sel.focusOffset;
        };
    } else {
        selectionIsCollapsed = function(sel) {
            return sel.rangeCount ? sel.getRangeAt(sel.rangeCount - 1).collapsed : false;
        };
    }

    function updateAnchorAndFocusFromRange(sel, range, backward) {
        var anchorPrefix = backward ? "end" : "start", focusPrefix = backward ? "start" : "end";
        sel.anchorNode = range[anchorPrefix + "Container"];
        sel.anchorOffset = range[anchorPrefix + "Offset"];
        sel.focusNode = range[focusPrefix + "Container"];
        sel.focusOffset = range[focusPrefix + "Offset"];
    }

    function updateAnchorAndFocusFromNativeSelection(sel) {
        var nativeSel = sel.nativeSelection;
        sel.anchorNode = nativeSel.anchorNode;
        sel.anchorOffset = nativeSel.anchorOffset;
        sel.focusNode = nativeSel.focusNode;
        sel.focusOffset = nativeSel.focusOffset;
    }

    function updateEmptySelection(sel) {
        sel.anchorNode = sel.focusNode = null;
        sel.anchorOffset = sel.focusOffset = 0;
        sel.rangeCount = 0;
        sel.isCollapsed = true;
        sel._ranges.length = 0;
    }

    function getNativeRange(range) {
        var nativeRange;
        if (range instanceof DomRange) {
            nativeRange = api.createNativeRange(range.getDocument());
            nativeRange.setEnd(range.endContainer, range.endOffset);
            nativeRange.setStart(range.startContainer, range.startOffset);
        } else if (range instanceof WrappedRange) {
            nativeRange = range.nativeRange;
        } else if (features.implementsDomRange && (range instanceof dom.getWindow(range.startContainer).Range)) {
            nativeRange = range;
        }
        return nativeRange;
    }

    function rangeContainsSingleElement(rangeNodes) {
        if (!rangeNodes.length || rangeNodes[0].nodeType != 1) {
            return false;
        }
        for (var i = 1, len = rangeNodes.length; i < len; ++i) {
            if (!dom.isAncestorOf(rangeNodes[0], rangeNodes[i])) {
                return false;
            }
        }
        return true;
    }

    function getSingleElementFromRange(range) {
        var nodes = range.getNodes();
        if (!rangeContainsSingleElement(nodes)) {
            throw module.createError("getSingleElementFromRange: range " + range.inspect() + " did not consist of a single element");
        }
        return nodes[0];
    }

    // Simple, quick test which only needs to distinguish between a TextRange and a ControlRange
    function isTextRange(range) {
        return !!range && typeof range.text != "undefined";
    }

    function updateFromTextRange(sel, range) {
        // Create a Range from the selected TextRange
        var wrappedRange = new WrappedRange(range);
        sel._ranges = [wrappedRange];

        updateAnchorAndFocusFromRange(sel, wrappedRange, false);
        sel.rangeCount = 1;
        sel.isCollapsed = wrappedRange.collapsed;
    }

    function updateControlSelection(sel) {
        // Update the wrapped selection based on what's now in the native selection
        sel._ranges.length = 0;
        if (sel.docSelection.type == "None") {
            updateEmptySelection(sel);
        } else {
            var controlRange = sel.docSelection.createRange();
            if (isTextRange(controlRange)) {
                // This case (where the selection type is "Control" and calling createRange() on the selection returns
                // a TextRange) can happen in IE 9. It happens, for example, when all elements in the selected
                // ControlRange have been removed from the ControlRange and removed from the document.
                updateFromTextRange(sel, controlRange);
            } else {
                sel.rangeCount = controlRange.length;
                var range, doc = getDocument(controlRange.item(0));
                for (var i = 0; i < sel.rangeCount; ++i) {
                    range = api.createRange(doc);
                    range.selectNode(controlRange.item(i));
                    sel._ranges.push(range);
                }
                sel.isCollapsed = sel.rangeCount == 1 && sel._ranges[0].collapsed;
                updateAnchorAndFocusFromRange(sel, sel._ranges[sel.rangeCount - 1], false);
            }
        }
    }

    function addRangeToControlSelection(sel, range) {
        var controlRange = sel.docSelection.createRange();
        var rangeElement = getSingleElementFromRange(range);

        // Create a new ControlRange containing all the elements in the selected ControlRange plus the element
        // contained by the supplied range
        var doc = getDocument(controlRange.item(0));
        var newControlRange = getBody(doc).createControlRange();
        for (var i = 0, len = controlRange.length; i < len; ++i) {
            newControlRange.add(controlRange.item(i));
        }
        try {
            newControlRange.add(rangeElement);
        } catch (ex) {
            throw module.createError("addRange(): Element within the specified Range could not be added to control selection (does it have layout?)");
        }
        newControlRange.select();

        // Update the wrapped selection based on what's now in the native selection
        updateControlSelection(sel);
    }

    var getSelectionRangeAt;

    if (isHostMethod(testSelection, "getRangeAt")) {
        // try/catch is present because getRangeAt() must have thrown an error in some browser and some situation.
        // Unfortunately, I didn't write a comment about the specifics and am now scared to take it out. Let that be a
        // lesson to us all, especially me.
        getSelectionRangeAt = function(sel, index) {
            try {
                return sel.getRangeAt(index);
            } catch (ex) {
                return null;
            }
        };
    } else if (selectionHasAnchorAndFocus) {
        getSelectionRangeAt = function(sel) {
            var doc = getDocument(sel.anchorNode);
            var range = api.createRange(doc);
            range.setStartAndEnd(sel.anchorNode, sel.anchorOffset, sel.focusNode, sel.focusOffset);

            // Handle the case when the selection was selected backwards (from the end to the start in the
            // document)
            if (range.collapsed !== this.isCollapsed) {
                range.setStartAndEnd(sel.focusNode, sel.focusOffset, sel.anchorNode, sel.anchorOffset);
            }

            return range;
        };
    }

    function WrappedSelection(selection, docSelection, win) {
        this.nativeSelection = selection;
        this.docSelection = docSelection;
        this._ranges = [];
        this.win = win;
        this.refresh();
    }

    WrappedSelection.prototype = api.selectionPrototype;

    function deleteProperties(sel) {
        sel.win = sel.anchorNode = sel.focusNode = sel._ranges = null;
        sel.rangeCount = sel.anchorOffset = sel.focusOffset = 0;
        sel.detached = true;
    }

    var cachedRangySelections = [];

    function actOnCachedSelection(win, action) {
        var i = cachedRangySelections.length, cached, sel;
        while (i--) {
            cached = cachedRangySelections[i];
            sel = cached.selection;
            if (action == "deleteAll") {
                deleteProperties(sel);
            } else if (cached.win == win) {
                if (action == "delete") {
                    cachedRangySelections.splice(i, 1);
                    return true;
                } else {
                    return sel;
                }
            }
        }
        if (action == "deleteAll") {
            cachedRangySelections.length = 0;
        }
        return null;
    }

    var getSelection = function(win) {
        // Check if the parameter is a Rangy Selection object
        if (win && win instanceof WrappedSelection) {
            win.refresh();
            return win;
        }

        win = getWindow(win, "getNativeSelection");

        var sel = actOnCachedSelection(win);
        var nativeSel = getNativeSelection(win), docSel = implementsDocSelection ? getDocSelection(win) : null;
        if (sel) {
            sel.nativeSelection = nativeSel;
            sel.docSelection = docSel;
            sel.refresh();
        } else {
            sel = new WrappedSelection(nativeSel, docSel, win);
            cachedRangySelections.push( { win: win, selection: sel } );
        }
        return sel;
    };

    api.getSelection = getSelection;

    api.getIframeSelection = function(iframeEl) {
        module.deprecationNotice("getIframeSelection()", "getSelection(iframeEl)");
        return api.getSelection(dom.getIframeWindow(iframeEl));
    };

    var selProto = WrappedSelection.prototype;

    function createControlSelection(sel, ranges) {
        // Ensure that the selection becomes of type "Control"
        var doc = getDocument(ranges[0].startContainer);
        var controlRange = getBody(doc).createControlRange();
        for (var i = 0, el, len = ranges.length; i < len; ++i) {
            el = getSingleElementFromRange(ranges[i]);
            try {
                controlRange.add(el);
            } catch (ex) {
                throw module.createError("setRanges(): Element within one of the specified Ranges could not be added to control selection (does it have layout?)");
            }
        }
        controlRange.select();

        // Update the wrapped selection based on what's now in the native selection
        updateControlSelection(sel);
    }

    // Selecting a range
    if (!useDocumentSelection && selectionHasAnchorAndFocus && util.areHostMethods(testSelection, ["removeAllRanges", "addRange"])) {
        selProto.removeAllRanges = function() {
            this.nativeSelection.removeAllRanges();
            updateEmptySelection(this);
        };

        var addRangeBackward = function(sel, range) {
            addRangeBackwardToNative(sel.nativeSelection, range);
            sel.refresh();
        };

        if (selectionHasRangeCount) {
            selProto.addRange = function(range, direction) {
                if (implementsControlRange && implementsDocSelection && this.docSelection.type == CONTROL) {
                    addRangeToControlSelection(this, range);
                } else {
                    if (isDirectionBackward(direction) && selectionHasExtend) {
                        addRangeBackward(this, range);
                    } else {
                        var previousRangeCount;
                        if (selectionSupportsMultipleRanges) {
                            previousRangeCount = this.rangeCount;
                        } else {
                            this.removeAllRanges();
                            previousRangeCount = 0;
                        }
                        // Clone the native range so that changing the selected range does not affect the selection.
                        // This is contrary to the spec but is the only way to achieve consistency between browsers. See
                        // issue 80.
                        this.nativeSelection.addRange(getNativeRange(range).cloneRange());

                        // Check whether adding the range was successful
                        this.rangeCount = this.nativeSelection.rangeCount;

                        if (this.rangeCount == previousRangeCount + 1) {
                            // The range was added successfully

                            // Check whether the range that we added to the selection is reflected in the last range extracted from
                            // the selection
                            if (api.config.checkSelectionRanges) {
                                var nativeRange = getSelectionRangeAt(this.nativeSelection, this.rangeCount - 1);
                                if (nativeRange && !rangesEqual(nativeRange, range)) {
                                    // Happens in WebKit with, for example, a selection placed at the start of a text node
                                    range = new WrappedRange(nativeRange);
                                }
                            }
                            this._ranges[this.rangeCount - 1] = range;
                            updateAnchorAndFocusFromRange(this, range, selectionIsBackward(this.nativeSelection));
                            this.isCollapsed = selectionIsCollapsed(this);
                        } else {
                            // The range was not added successfully. The simplest thing is to refresh
                            this.refresh();
                        }
                    }
                }
            };
        } else {
            selProto.addRange = function(range, direction) {
                if (isDirectionBackward(direction) && selectionHasExtend) {
                    addRangeBackward(this, range);
                } else {
                    this.nativeSelection.addRange(getNativeRange(range));
                    this.refresh();
                }
            };
        }

        selProto.setRanges = function(ranges) {
            if (implementsControlRange && ranges.length > 1) {
                createControlSelection(this, ranges);
            } else {
                this.removeAllRanges();
                for (var i = 0, len = ranges.length; i < len; ++i) {
                    this.addRange(ranges[i]);
                }
            }
        };
    } else if (isHostMethod(testSelection, "empty") && isHostMethod(testRange, "select") &&
               implementsControlRange && useDocumentSelection) {

        selProto.removeAllRanges = function() {
            // Added try/catch as fix for issue #21
            try {
                this.docSelection.empty();

                // Check for empty() not working (issue #24)
                if (this.docSelection.type != "None") {
                    // Work around failure to empty a control selection by instead selecting a TextRange and then
                    // calling empty()
                    var doc;
                    if (this.anchorNode) {
                        doc = getDocument(this.anchorNode);
                    } else if (this.docSelection.type == CONTROL) {
                        var controlRange = this.docSelection.createRange();
                        if (controlRange.length) {
                            doc = getDocument( controlRange.item(0) );
                        }
                    }
                    if (doc) {
                        var textRange = getBody(doc).createTextRange();
                        textRange.select();
                        this.docSelection.empty();
                    }
                }
            } catch(ex) {}
            updateEmptySelection(this);
        };

        selProto.addRange = function(range) {
            if (this.docSelection.type == CONTROL) {
                addRangeToControlSelection(this, range);
            } else {
                api.WrappedTextRange.rangeToTextRange(range).select();
                this._ranges[0] = range;
                this.rangeCount = 1;
                this.isCollapsed = this._ranges[0].collapsed;
                updateAnchorAndFocusFromRange(this, range, false);
            }
        };

        selProto.setRanges = function(ranges) {
            this.removeAllRanges();
            var rangeCount = ranges.length;
            if (rangeCount > 1) {
                createControlSelection(this, ranges);
            } else if (rangeCount) {
                this.addRange(ranges[0]);
            }
        };
    } else {
        module.fail("No means of selecting a Range or TextRange was found");
        return false;
    }

    selProto.getRangeAt = function(index) {
        if (index < 0 || index >= this.rangeCount) {
            throw new DOMException("INDEX_SIZE_ERR");
        } else {
            // Clone the range to preserve selection-range independence. See issue 80.
            return this._ranges[index].cloneRange();
        }
    };

    var refreshSelection;

    if (useDocumentSelection) {
        refreshSelection = function(sel) {
            var range;
            if (api.isSelectionValid(sel.win)) {
                range = sel.docSelection.createRange();
            } else {
                range = getBody(sel.win.document).createTextRange();
                range.collapse(true);
            }

            if (sel.docSelection.type == CONTROL) {
                updateControlSelection(sel);
            } else if (isTextRange(range)) {
                updateFromTextRange(sel, range);
            } else {
                updateEmptySelection(sel);
            }
        };
    } else if (isHostMethod(testSelection, "getRangeAt") && typeof testSelection.rangeCount == NUMBER) {
        refreshSelection = function(sel) {
            if (implementsControlRange && implementsDocSelection && sel.docSelection.type == CONTROL) {
                updateControlSelection(sel);
            } else {
                sel._ranges.length = sel.rangeCount = sel.nativeSelection.rangeCount;
                if (sel.rangeCount) {
                    for (var i = 0, len = sel.rangeCount; i < len; ++i) {
                        sel._ranges[i] = new api.WrappedRange(sel.nativeSelection.getRangeAt(i));
                    }
                    updateAnchorAndFocusFromRange(sel, sel._ranges[sel.rangeCount - 1], selectionIsBackward(sel.nativeSelection));
                    sel.isCollapsed = selectionIsCollapsed(sel);
                } else {
                    updateEmptySelection(sel);
                }
            }
        };
    } else if (selectionHasAnchorAndFocus && typeof testSelection.isCollapsed == BOOLEAN && typeof testRange.collapsed == BOOLEAN && features.implementsDomRange) {
        refreshSelection = function(sel) {
            var range, nativeSel = sel.nativeSelection;
            if (nativeSel.anchorNode) {
                range = getSelectionRangeAt(nativeSel, 0);
                sel._ranges = [range];
                sel.rangeCount = 1;
                updateAnchorAndFocusFromNativeSelection(sel);
                sel.isCollapsed = selectionIsCollapsed(sel);
            } else {
                updateEmptySelection(sel);
            }
        };
    } else {
        module.fail("No means of obtaining a Range or TextRange from the user's selection was found");
        return false;
    }

    selProto.refresh = function(checkForChanges) {
        var oldRanges = checkForChanges ? this._ranges.slice(0) : null;
        var oldAnchorNode = this.anchorNode, oldAnchorOffset = this.anchorOffset;

        refreshSelection(this);
        if (checkForChanges) {
            // Check the range count first
            var i = oldRanges.length;
            if (i != this._ranges.length) {
                return true;
            }

            // Now check the direction. Checking the anchor position is the same is enough since we're checking all the
            // ranges after this
            if (this.anchorNode != oldAnchorNode || this.anchorOffset != oldAnchorOffset) {
                return true;
            }

            // Finally, compare each range in turn
            while (i--) {
                if (!rangesEqual(oldRanges[i], this._ranges[i])) {
                    return true;
                }
            }
            return false;
        }
    };

    // Removal of a single range
    var removeRangeManually = function(sel, range) {
        var ranges = sel.getAllRanges();
        sel.removeAllRanges();
        for (var i = 0, len = ranges.length; i < len; ++i) {
            if (!rangesEqual(range, ranges[i])) {
                sel.addRange(ranges[i]);
            }
        }
        if (!sel.rangeCount) {
            updateEmptySelection(sel);
        }
    };

    if (implementsControlRange) {
        selProto.removeRange = function(range) {
            if (this.docSelection.type == CONTROL) {
                var controlRange = this.docSelection.createRange();
                var rangeElement = getSingleElementFromRange(range);

                // Create a new ControlRange containing all the elements in the selected ControlRange minus the
                // element contained by the supplied range
                var doc = getDocument(controlRange.item(0));
                var newControlRange = getBody(doc).createControlRange();
                var el, removed = false;
                for (var i = 0, len = controlRange.length; i < len; ++i) {
                    el = controlRange.item(i);
                    if (el !== rangeElement || removed) {
                        newControlRange.add(controlRange.item(i));
                    } else {
                        removed = true;
                    }
                }
                newControlRange.select();

                // Update the wrapped selection based on what's now in the native selection
                updateControlSelection(this);
            } else {
                removeRangeManually(this, range);
            }
        };
    } else {
        selProto.removeRange = function(range) {
            removeRangeManually(this, range);
        };
    }

    // Detecting if a selection is backward
    var selectionIsBackward;
    if (!useDocumentSelection && selectionHasAnchorAndFocus && features.implementsDomRange) {
        selectionIsBackward = winSelectionIsBackward;

        selProto.isBackward = function() {
            return selectionIsBackward(this);
        };
    } else {
        selectionIsBackward = selProto.isBackward = function() {
            return false;
        };
    }

    // Create an alias for backwards compatibility. From 1.3, everything is "backward" rather than "backwards"
    selProto.isBackwards = selProto.isBackward;

    // Selection stringifier
    // This is conformant to the old HTML5 selections draft spec but differs from WebKit and Mozilla's implementation.
    // The current spec does not yet define this method.
    selProto.toString = function() {
        var rangeTexts = [];
        for (var i = 0, len = this.rangeCount; i < len; ++i) {
            rangeTexts[i] = "" + this._ranges[i];
        }
        return rangeTexts.join("");
    };

    function assertNodeInSameDocument(sel, node) {
        if (sel.win.document != getDocument(node)) {
            throw new DOMException("WRONG_DOCUMENT_ERR");
        }
    }

    // No current browser conforms fully to the spec for this method, so Rangy's own method is always used
    selProto.collapse = function(node, offset) {
        assertNodeInSameDocument(this, node);
        var range = api.createRange(node);
        range.collapseToPoint(node, offset);
        this.setSingleRange(range);
        this.isCollapsed = true;
    };

    selProto.collapseToStart = function() {
        if (this.rangeCount) {
            var range = this._ranges[0];
            this.collapse(range.startContainer, range.startOffset);
        } else {
            throw new DOMException("INVALID_STATE_ERR");
        }
    };

    selProto.collapseToEnd = function() {
        if (this.rangeCount) {
            var range = this._ranges[this.rangeCount - 1];
            this.collapse(range.endContainer, range.endOffset);
        } else {
            throw new DOMException("INVALID_STATE_ERR");
        }
    };

    // The spec is very specific on how selectAllChildren should be implemented so the native implementation is
    // never used by Rangy.
    selProto.selectAllChildren = function(node) {
        assertNodeInSameDocument(this, node);
        var range = api.createRange(node);
        range.selectNodeContents(node);
        this.setSingleRange(range);
    };

    selProto.deleteFromDocument = function() {
        // Sepcial behaviour required for IE's control selections
        if (implementsControlRange && implementsDocSelection && this.docSelection.type == CONTROL) {
            var controlRange = this.docSelection.createRange();
            var element;
            while (controlRange.length) {
                element = controlRange.item(0);
                controlRange.remove(element);
                element.parentNode.removeChild(element);
            }
            this.refresh();
        } else if (this.rangeCount) {
            var ranges = this.getAllRanges();
            if (ranges.length) {
                this.removeAllRanges();
                for (var i = 0, len = ranges.length; i < len; ++i) {
                    ranges[i].deleteContents();
                }
                // The spec says nothing about what the selection should contain after calling deleteContents on each
                // range. Firefox moves the selection to where the final selected range was, so we emulate that
                this.addRange(ranges[len - 1]);
            }
        }
    };

    // The following are non-standard extensions
    selProto.eachRange = function(func, returnValue) {
        for (var i = 0, len = this._ranges.length; i < len; ++i) {
            if ( func( this.getRangeAt(i) ) ) {
                return returnValue;
            }
        }
    };

    selProto.getAllRanges = function() {
        var ranges = [];
        this.eachRange(function(range) {
            ranges.push(range);
        });
        return ranges;
    };

    selProto.setSingleRange = function(range, direction) {
        this.removeAllRanges();
        this.addRange(range, direction);
    };

    selProto.callMethodOnEachRange = function(methodName, params) {
        var results = [];
        this.eachRange( function(range) {
            results.push( range[methodName].apply(range, params) );
        } );
        return results;
    };
    
    function createStartOrEndSetter(isStart) {
        return function(node, offset) {
            var range;
            if (this.rangeCount) {
                range = this.getRangeAt(0);
                range["set" + (isStart ? "Start" : "End")](node, offset);
            } else {
                range = api.createRange(this.win.document);
                range.setStartAndEnd(node, offset);
            }
            this.setSingleRange(range, this.isBackward());
        };
    }

    selProto.setStart = createStartOrEndSetter(true);
    selProto.setEnd = createStartOrEndSetter(false);
    
    // Add select() method to Range prototype. Any existing selection will be removed.
    api.rangePrototype.select = function(direction) {
        getSelection( this.getDocument() ).setSingleRange(this, direction);
    };

    selProto.changeEachRange = function(func) {
        var ranges = [];
        var backward = this.isBackward();

        this.eachRange(function(range) {
            func(range);
            ranges.push(range);
        });

        this.removeAllRanges();
        if (backward && ranges.length == 1) {
            this.addRange(ranges[0], "backward");
        } else {
            this.setRanges(ranges);
        }
    };

    selProto.containsNode = function(node, allowPartial) {
        return this.eachRange( function(range) {
            return range.containsNode(node, allowPartial);
        }, true );
    };

    selProto.getBookmark = function(containerNode) {
        return {
            backward: this.isBackward(),
            rangeBookmarks: this.callMethodOnEachRange("getBookmark", [containerNode])
        };
    };

    selProto.moveToBookmark = function(bookmark) {
        var selRanges = [];
        for (var i = 0, rangeBookmark, range; rangeBookmark = bookmark.rangeBookmarks[i++]; ) {
            range = api.createRange(this.win);
            range.moveToBookmark(rangeBookmark);
            selRanges.push(range);
        }
        if (bookmark.backward) {
            this.setSingleRange(selRanges[0], "backward");
        } else {
            this.setRanges(selRanges);
        }
    };

    selProto.toHtml = function() {
        return this.callMethodOnEachRange("toHtml").join("");
    };

    function inspect(sel) {
        var rangeInspects = [];
        var anchor = new DomPosition(sel.anchorNode, sel.anchorOffset);
        var focus = new DomPosition(sel.focusNode, sel.focusOffset);
        var name = (typeof sel.getName == "function") ? sel.getName() : "Selection";

        if (typeof sel.rangeCount != "undefined") {
            for (var i = 0, len = sel.rangeCount; i < len; ++i) {
                rangeInspects[i] = DomRange.inspect(sel.getRangeAt(i));
            }
        }
        return "[" + name + "(Ranges: " + rangeInspects.join(", ") +
                ")(anchor: " + anchor.inspect() + ", focus: " + focus.inspect() + "]";
    }

    selProto.getName = function() {
        return "WrappedSelection";
    };

    selProto.inspect = function() {
        return inspect(this);
    };

    selProto.detach = function() {
        actOnCachedSelection(this.win, "delete");
        deleteProperties(this);
    };

    WrappedSelection.detachAll = function() {
        actOnCachedSelection(null, "deleteAll");
    };

    WrappedSelection.inspect = inspect;
    WrappedSelection.isDirectionBackward = isDirectionBackward;

    api.Selection = WrappedSelection;

    api.selectionPrototype = selProto;

    api.addCreateMissingNativeApiListener(function(win) {
        if (typeof win.getSelection == "undefined") {
            win.getSelection = function() {
                return getSelection(win);
            };
        }
        win = null;
    });
});
;
// File end: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-dependencies/rangy/rangy-core.js
;
// File start: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-dependencies/rangy/rangy-applier.js
/**
 * Tag/attribute/class applier module for Rangy.
 *
 * Depends on Rangy core.
 *
 * Subject the Raptor licence: http://www.raptor-editor.com/license
 * @author Tim Down
 * @author David Neilsen david@panmedia.co.nz
 *
 * Derived from "CSS Class Applier module for Rangy." which is Copyright 2012,
 * Tim Down, and licensed under the MIT license.
 */
rangy.createModule("Applier", ["WrappedSelection"], function(api, module) {
    var dom = api.dom;
    var DomPosition = dom.DomPosition;

    function trim(str) {
        return str.replace(/^\s\s*/, "").replace(/\s\s*$/, "");
    }

    function hasClass(el, cssClass) {
        return el.className && new RegExp("(?:^|\\s)" + cssClass + "(?:\\s|$)").test(el.className);
    }

    function addClass(el, cssClass) {
        if (el.className) {
            if (!hasClass(el, cssClass)) {
                el.className += " " + cssClass;
            }
        } else {
            el.className = cssClass;
        }
    }

    var removeClass = (function() {
        function replacer(matched, whiteSpaceBefore, whiteSpaceAfter) {
            return (whiteSpaceBefore && whiteSpaceAfter) ? " " : "";
        }

        return function(el, cssClass) {
            if (el.className) {
                el.className = el.className.replace(new RegExp("(^|\\s)" + cssClass + "(\\s|$)"), replacer);
            }
        };
    })();

    function sortClassName(className) {
        return className.split(/\s+/).sort().join(" ");
    }

    function getSortedClassName(el) {
        return sortClassName(el.className);
    }

    function haveSameClasses(el1, el2) {
        return getSortedClassName(el1) == getSortedClassName(el2);
    }

    function compareRanges(r1, r2) {
        return r1.compareBoundaryPoints(r2.START_TO_START, r2);
    }

    function mergeOverlappingRanges(ranges) {

        for (var i = 0, len = ranges.length, r1, r2, j; i < len; ++i) {
        }
    }

    // Sorts and merges any overlapping ranges
    function normalizeRanges(ranges) {
        var sortedRanges = ranges.slice(0);
        sortedRanges.sort(compareRanges);
        var newRanges = [];

        // Check for overlaps and merge where they exist
        for (var i = 1, len = ranges.length, range, mergedRange = ranges[0]; i < len; ++i) {
            range = ranges[i];
            if (range.intersectsOrTouchesRange(mergedRange)) {
                mergedRange = mergedRange.union(range);
            } else {
                newRanges.push(mergedRange);
                mergedRange = range;
            }

        }
        newRanges.push(mergedRange);
        return newRanges;
    }

    function movePosition(position, oldParent, oldIndex, newParent, newIndex) {
        var node = position.node, offset = position.offset;

        var newNode = node, newOffset = offset;

        if (node == newParent && offset > newIndex) {
            newOffset++;
        }

        if (node == oldParent && (offset == oldIndex  || offset == oldIndex + 1)) {
            newNode = newParent;
            newOffset += newIndex - oldIndex;
        }

        if (node == oldParent && offset > oldIndex + 1) {
            newOffset--;
        }

        position.node = newNode;
        position.offset = newOffset;
    }

    function movePreservingPositions(node, newParent, newIndex, positionsToPreserve) {
        // For convenience, allow newIndex to be -1 to mean "insert at the end".
        if (newIndex == -1) {
            newIndex = newParent.childNodes.length;
        }

        var oldParent = node.parentNode;
        var oldIndex = dom.getNodeIndex(node);

        for (var i = 0, position; position = positionsToPreserve[i++]; ) {
            movePosition(position, oldParent, oldIndex, newParent, newIndex);
        }

        // Now actually move the node.
        if (newParent.childNodes.length == newIndex) {
            newParent.appendChild(node);
        } else {
            newParent.insertBefore(node, newParent.childNodes[newIndex]);
        }
    }

    function moveChildrenPreservingPositions(node, newParent, newIndex, removeNode, positionsToPreserve) {
        var child, children = [];
        while ( (child = node.firstChild) ) {
            movePreservingPositions(child, newParent, newIndex++, positionsToPreserve);
            children.push(child);
        }
        if (removeNode) {
            node.parentNode.removeChild(node);
        }
        return children;
    }

    function replaceWithOwnChildrenPreservingPositions(element, positionsToPreserve) {
        return moveChildrenPreservingPositions(element, element.parentNode, dom.getNodeIndex(element), true, positionsToPreserve);
    }

    function rangeSelectsAnyText(range, textNode) {
        var textRange = range.cloneRange();
        textRange.selectNodeContents(textNode);

        var intersectionRange = textRange.intersection(range);
        var text = intersectionRange ? intersectionRange.toString() : "";
        textRange.detach();

        return text != "";
    }

    function rangeSelectsAnySelfClosing(range) {
        var clonedRange = range.cloneRange();
        return /<img/.test(fragmentToHtml(clonedRange.cloneContents()));
    }

    function getEffectiveNodes(range) {
        return range.getNodes([], function(node) {
            if (node.nodeType === 3 && rangeSelectsAnyText(range, node)) {
                return node;
            } else if (node.nodeType === 1 && node.tagName === 'IMG') {
                return node;
            }
        });
    }

    function elementsHaveSameNonClassAttributes(el1, el2) {
        if (el1.attributes.length != el2.attributes.length) return false;
        for (var i = 0, len = el1.attributes.length, attr1, attr2, name; i < len; ++i) {
            attr1 = el1.attributes[i];
            name = attr1.name;
            if (name != "class") {
                attr2 = el2.attributes.getNamedItem(name);
                if (attr1.specified != attr2.specified) return false;
                if (attr1.specified && attr1.nodeValue !== attr2.nodeValue) return false;
            }
        }
        return true;
    }

    function elementHasNonClassAttributes(el, exceptions) {
        for (var i = 0, len = el.attributes.length, attrName; i < len; ++i) {
            attrName = el.attributes[i].name;
            if ( !(exceptions && dom.arrayContains(exceptions, attrName)) && el.attributes[i].specified && attrName != "class") {
                return true;
            }
        }
        return false;
    }

    function elementHasProps(el, props) {
        var propValue;
        for (var p in props) {
            if (props.hasOwnProperty(p)) {
                propValue = props[p];
                if (typeof propValue == "object") {
                    if (!elementHasProps(el[p], propValue)) {
                        return false;
                    }
                } else if (el[p] !== propValue) {
                    return false;
                }
            }
        }
        return true;
    }

    /**
     * Retrieve outer html from an element.
     *
     * @param  {jQuery} element The jQuery element to retrieve the outer HTML from.
     * @return {String} The outer HTML.
     */
    function elementOuterHtml(element) {
        return element.clone().wrap('<div/>').parent().html();
    }

    /**
     * Convert a DOMFragment to an HTML string. Optionally wraps the string in a tag.
     * @todo type for domFragment and tag.
     * @param {type} domFragment The fragment to be converted to a HTML string.
     * @param {type} tag The tag that the string may be wrapped in.
     * @returns {String} The DOMFragment as a string, optionally wrapped in a tag.
     */
    function fragmentToHtml(domFragment, tag) {
        var html = '';
        // Get all nodes in the extracted content
        for (var j = 0, l = domFragment.childNodes.length; j < l; j++) {
            var node = domFragment.childNodes.item(j);
            var content = node.nodeType === Node.TEXT_NODE ? node.nodeValue : elementOuterHtml(jQuery(node));
            if (content) {
                html += content;
            }
        }
        if (tag) {
            html = jQuery('<' + tag + '>' + html + '</' + tag + '>');
            html.find('p').wrapInner('<' + tag + '/>');
            html.find('p > *').unwrap();
            html = jQuery('<div/>').html(html).html();
        }
        return html;
    }

    var getComputedStyleProperty;

    if (typeof window.getComputedStyle != "undefined") {
        getComputedStyleProperty = function(el, propName) {
            return dom.getWindow(el).getComputedStyle(el, null)[propName];
        };
    } else if (typeof document.documentElement.currentStyle != "undefined") {
        getComputedStyleProperty = function(el, propName) {
            return el.currentStyle[propName];
        };
    } else {
        module.fail("No means of obtaining computed style properties found");
    }

    var isEditableElement;

    (function() {
        var testEl = document.createElement("div");
        if (typeof testEl.isContentEditable == "boolean") {
            isEditableElement = function(node) {
                return node && node.nodeType == 1 && node.isContentEditable;
            };
        } else {
            isEditableElement = function(node) {
                if (!node || node.nodeType != 1 || node.contentEditable == "false") {
                    return false;
                }
                return node.contentEditable == "true" || isEditableElement(node.parentNode);
            };
        }
    })();

    function isEditingHost(node) {
        var parent;
        return node && node.nodeType == 1
            && (( (parent = node.parentNode) && parent.nodeType == 9 && parent.designMode == "on")
            || (isEditableElement(node) && !isEditableElement(node.parentNode)));
    }

    function isEditable(node) {
        return (isEditableElement(node) || (node.nodeType != 1 && isEditableElement(node.parentNode))) && !isEditingHost(node);
    }

    var inlineDisplayRegex = /^inline(-block|-table)?$/i;

    function isNonInlineElement(node) {
        return node && node.nodeType == 1 && !inlineDisplayRegex.test(getComputedStyleProperty(node, "display"));
    }

    // White space characters as defined by HTML 4 (http://www.w3.org/TR/html401/struct/text.html)
    var htmlNonWhiteSpaceRegex = /[^\r\n\t\f \u200B]/;

    function isUnrenderedWhiteSpaceNode(node) {
        if (node.data.length == 0) {
            return true;
        }
        if (htmlNonWhiteSpaceRegex.test(node.data)) {
            return false;
        }
        var cssWhiteSpace = getComputedStyleProperty(node.parentNode, "whiteSpace");
        switch (cssWhiteSpace) {
            case "pre":
            case "pre-wrap":
            case "-moz-pre-wrap":
                return false;
            case "pre-line":
                if (/[\r\n]/.test(node.data)) {
                    return false;
                }
        }

        // We now have a whitespace-only text node that may be rendered depending on its context. If it is adjacent to a
        // non-inline element, it will not be rendered. This seems to be a good enough definition.
        return isNonInlineElement(node.previousSibling) || isNonInlineElement(node.nextSibling);
    }

    function getRangeBoundaries(ranges) {
        var positions = [], i, range;
        for (i = 0; range = ranges[i++]; ) {
            positions.push(
                new DomPosition(range.startContainer, range.startOffset),
                new DomPosition(range.endContainer, range.endOffset)
            );
        }
        return positions;
    }

    function updateRangesFromBoundaries(ranges, positions) {
        for (var i = 0, range, start, end, len = ranges.length; i < len; ++i) {
            range = ranges[i];
            start = positions[i * 2];
            end = positions[i * 2 + 1];
            range.setStartAndEnd(start.node, start.offset, end.node, end.offset);
        }
    }

    function arrayWithoutValue(arr, val) {
        var newArray = [];
        for (var i = 0, len = arr.length; i < len; ++i) {
            if (arr[i] !== val) {
                newArray.push(arr[i]);
            }
        }
        return newArray;
    }

    function isSplitPoint(node, offset) {
        if (dom.isCharacterDataNode(node)) {
            if (offset == 0) {
                return !!node.previousSibling;
            } else if (offset == node.length) {
                return !!node.nextSibling;
            } else {
                return true;
            }
        }

        return offset > 0 && offset < node.childNodes.length;
    }

    function splitNodeAt(node, descendantNode, descendantOffset, positionsToPreserve) {
        var newNode, parentNode;
        var splitAtStart = (descendantOffset == 0);

        if (dom.isAncestorOf(descendantNode, node)) {
            return node;
        }

        if (dom.isCharacterDataNode(descendantNode)) {
            var descendantIndex = dom.getNodeIndex(descendantNode);
            if (descendantOffset == 0) {
                descendantOffset = descendantIndex;
            } else if (descendantOffset == descendantNode.length) {
                descendantOffset = descendantIndex + 1;
            } else {
                throw module.createError("splitNodeAt() should not be called with offset in the middle of a data node ("
                    + descendantOffset + " in " + descendantNode.data);
            }
            descendantNode = descendantNode.parentNode;
        }

        if (isSplitPoint(descendantNode, descendantOffset)) {
            // descendantNode is now guaranteed not to be a text or other character node
            newNode = descendantNode.cloneNode(false);
            parentNode = descendantNode.parentNode;
            if (newNode.id) {
                newNode.removeAttribute("id");
            }
            var child, newChildIndex = 0;

            while ( (child = descendantNode.childNodes[descendantOffset]) ) {
                movePreservingPositions(child, newNode, newChildIndex++, positionsToPreserve);
                //newNode.appendChild(child);
            }
            movePreservingPositions(newNode, parentNode, dom.getNodeIndex(descendantNode) + 1, positionsToPreserve);
            //dom.insertAfter(newNode, descendantNode);
            return (descendantNode == node) ? newNode : splitNodeAt(node, parentNode, dom.getNodeIndex(newNode), positionsToPreserve);
        } else if (node != descendantNode) {
            newNode = descendantNode.parentNode;

            // Work out a new split point in the parent node
            var newNodeIndex = dom.getNodeIndex(descendantNode);

            if (!splitAtStart) {
                newNodeIndex++;
            }
            return splitNodeAt(node, newNode, newNodeIndex, positionsToPreserve);
        }
        return node;
    }

    function areElementsMergeable(el1, el2) {
        return el1.tagName == el2.tagName
            && haveSameClasses(el1, el2)
            && elementsHaveSameNonClassAttributes(el1, el2)
            && getComputedStyleProperty(el1, "display") == "inline"
            && getComputedStyleProperty(el2, "display") == "inline";
    }

    function createAdjacentMergeableTextNodeGetter(forward) {
        var propName = forward ? "nextSibling" : "previousSibling";

        return function(textNode, checkParentElement) {
            var el = textNode.parentNode;
            var adjacentNode = textNode[propName];
            if (adjacentNode) {
                // Can merge if the node's previous/next sibling is a text node
                if (adjacentNode && adjacentNode.nodeType == 3) {
                    return adjacentNode;
                }
            } else if (checkParentElement) {
                // Compare text node parent element with its sibling
                adjacentNode = el[propName];
                if (adjacentNode && adjacentNode.nodeType == 1 && areElementsMergeable(el, adjacentNode)) {
                    return adjacentNode[forward ? "firstChild" : "lastChild"];
                }
            }
            return null;
        };
    }

    var getPreviousMergeableTextNode = createAdjacentMergeableTextNodeGetter(false),
        getNextMergeableTextNode = createAdjacentMergeableTextNodeGetter(true);


    function Merge(firstNode) {
        this.isElementMerge = (firstNode.nodeType == 1);
        this.firstTextNode = this.isElementMerge ? firstNode.lastChild : firstNode;
        this.textNodes = [this.firstTextNode];
    }

    Merge.prototype = {
        doMerge: function(positionsToPreserve) {
            var textBits = [], combinedTextLength = 0, textNode, parent, text;
            for (var i = 0, len = this.textNodes.length, j, position; i < len; ++i) {
                textNode = this.textNodes[i];
                parent = textNode.parentNode;
                if (i > 0) {
                    parent.removeChild(textNode);
                    if (!parent.hasChildNodes()) {
                        parent.parentNode.removeChild(parent);
                    }
                    if (positionsToPreserve) {
                        for (j = 0; position = positionsToPreserve[j++]; ) {
                            // Handle case where position is inside the text node being merged into a preceding node
                            if (position.node == textNode) {
                                position.node = this.firstTextNode;
                                position.offset += combinedTextLength;
                            }
                        }
                    }
                }
                textBits[i] = textNode.data;
                combinedTextLength += textNode.data.length;
            }
            this.firstTextNode.data = text = textBits.join("");
            return text;
        },

        getLength: function() {
            var i = this.textNodes.length, len = 0;
            while (i--) {
                len += this.textNodes[i].length;
            }
            return len;
        },

        toString: function() {
            var textBits = [];
            for (var i = 0, len = this.textNodes.length; i < len; ++i) {
                textBits[i] = "'" + this.textNodes[i].data + "'";
            }
            return "[Merge(" + textBits.join(",") + ")]";
        }
    };

    // TODO: Populate this with every attribute name that corresponds to a property with a different name
    var attrNamesForProperties = {};

    function Applier(options) {
        this.tag = null;
        this.tags = [];
        this.classes = [];
        this.attributes = [];
        this.ignoreWhiteSpace = true;
        this.applyToEditableOnly = false;
        this.useExistingElements = true;
        this.ignoreClasses = false;
        this.ignoreAttributes = false;

        for (var key in options) {
            this[key] = options[key];
        }

        // Uppercase tag names
        for (var i = 0, l = this.tags.length; i < l; i++) {
            this.tags[i] = this.tags[i].toUpperCase();
        }
        if (this.tag) {
            this.tag = this.tag.toUpperCase();
            this.tags.push(this.tag);
        }
    }

    Applier.prototype = {
        copyPropertiesToElement: function(props, el, createCopy) {
            var s, elStyle, elProps = {}, elPropsStyle, propValue, elPropValue, attrName;

            for (var p in props) {
                if (props.hasOwnProperty(p)) {
                    propValue = props[p];
                    elPropValue = el[p];

                    // Special case for class. The copied properties object has the applier's CSS class as well as its
                    // own to simplify checks when removing styling elements
                    if (p == "className") {
                        addClass(el, propValue);
                        addClass(el, this.cssClass);
                        el[p] = sortClassName(el[p]);
                        if (createCopy) {
                            elProps[p] = el[p];
                        }
                    }

                    // Special case for style
                    else if (p == "style") {
                        elStyle = elPropValue;
                        if (createCopy) {
                            elProps[p] = elPropsStyle = {};
                        }
                        for (s in props[p]) {
                            elStyle[s] = propValue[s];
                            if (createCopy) {
                                elPropsStyle[s] = elStyle[s];
                            }
                        }
                        this.attrExceptions.push(p);
                    } else {
                        el[p] = propValue;
                        // Copy the property back from the dummy element so that later comparisons to check whether elements
                        // may be removed are checking against the right value. For example, the href property of an element
                        // returns a fully qualified URL even if it was previously assigned a relative URL.
                        if (createCopy) {
                            elProps[p] = el[p];

                            // Not all properties map to identically named attributes
                            attrName = attrNamesForProperties.hasOwnProperty(p) ? attrNamesForProperties[p] : p;
                            this.attrExceptions.push(attrName);
                        }
                    }
                }
            }

            return createCopy ? elProps : "";
        },

        isValid: function(node) {
            return this.isValidTag(node)
                && this.hasClasses(node)
                && this.hasAttributes(node);
        },

        isValidTag: function(node) {
            // Only elements are valid
            if (node.nodeType !== 1) {
                return false;
            }

            // Check if tag names are ignored
            if (this.tags.length === 0) {
                return true;
            }

            // Check for valid tag name
            for (var i = 0, l = this.tags.length; i < l; i++) {
                if (node.tagName === this.tags[i]) {
                    return true;
                }
            }
            return false;
        },

        hasClasses: function(node) {
            if (this.ignoreClasses) {
                return true;
            }
            for (var i = 0, l = this.classes.length; i < l; i++) {
                if (!hasClass(node, this.classes[i])) {
                    return false;
                }
            }
            return true;
        },

        hasAttributes: function(node) {
            if (this.ignoreAttributes) {
                return true;
            }
            for (var key in this.attributes) {
                if (!node.hasAttribute(key)) {
                    return false;
                }
            }
            return true;
        },

        getSelfOrAncestor: function(node) {
            while (node) {
                if (this.isValid(node)) {
                    return node;
                }
                node = node.parentNode;
            }
            return null;
        },

        isModifiable: function(node) {
            return !this.applyToEditableOnly || isEditable(node);
        },

        // White space adjacent to an unwrappable node can be ignored for wrapping
        isIgnorableWhiteSpaceNode: function(node) {
            return this.ignoreWhiteSpace && node && node.nodeType == 3 && isUnrenderedWhiteSpaceNode(node);
        },

        // Normalizes nodes after applying a CSS class to a Range.
        postApply: function(textNodes, range, positionsToPreserve, isUndo) {
            var firstNode = textNodes[0], lastNode = textNodes[textNodes.length - 1];
            var merges = [], currentMerge;

            var rangeStartNode = firstNode, rangeEndNode = lastNode;
            var rangeStartOffset = 0, rangeEndOffset = lastNode.length;

            var textNode, precedingTextNode;

            // Check for every required merge and create a Merge object for each
            for (var i = 0, len = textNodes.length; i < len; ++i) {
                textNode = textNodes[i];
                precedingTextNode = getPreviousMergeableTextNode(textNode, !isUndo);
                if (precedingTextNode) {
                    if (!currentMerge) {
                        currentMerge = new Merge(precedingTextNode);
                        merges.push(currentMerge);
                    }
                    currentMerge.textNodes.push(textNode);
                    if (textNode === firstNode) {
                        rangeStartNode = currentMerge.firstTextNode;
                        rangeStartOffset = rangeStartNode.length;
                    }
                    if (textNode === lastNode) {
                        rangeEndNode = currentMerge.firstTextNode;
                        rangeEndOffset = currentMerge.getLength();
                    }
                } else {
                    currentMerge = null;
                }
            }

            // Test whether the first node after the range needs merging
            var nextTextNode = getNextMergeableTextNode(lastNode, !isUndo);

            if (nextTextNode) {
                if (!currentMerge) {
                    currentMerge = new Merge(lastNode);
                    merges.push(currentMerge);
                }
                currentMerge.textNodes.push(nextTextNode);
            }

            // Apply the merges
            if (merges.length) {
                for (i = 0, len = merges.length; i < len; ++i) {
                    merges[i].doMerge(positionsToPreserve);
                }

                // Set the range boundaries
                range.setStartAndEnd(rangeStartNode, rangeStartOffset, rangeEndNode, rangeEndOffset);
            }
        },

        createContainer: function(doc) {
            var element = doc.createElement(this.tag);
            this.addClasses(element);
            this.addAttributes(element);
            return element;
        },

        addClasses: function(node) {
            for (var i = 0, l = this.classes.length; i < l; i++) {
                addClass(node, this.classes[i]);
            }
        },

        addAttributes: function(node) {
            for (var key in this.attributes) {
                node.setAttribute(key, this.attributes[key]);
            }
        },

        removeClasses: function(node) {
            for (var i = 0, l = this.classes.length; i < l; i++) {
                removeClass(node, this.classes[i]);
            }
        },

        removeAttributes: function(node) {
            for (var key in this.attributes) {
                node.removeAttribute(key);
            }
        },

        applyToTextNode: function(textNode, positionsToPreserve) {
            var parent = textNode.parentNode;
            if (parent.childNodes.length == 1
                    && dom.arrayContains(this.tags, parent.tagName)
                    && this.useExistingElements) {
                this.addClasses(parent);
                this.addAttributes(parent);
            } else {
                var element = this.createContainer(dom.getDocument(textNode));
                textNode.parentNode.insertBefore(element, textNode);
                element.appendChild(textNode);
            }
        },

        isRemovable: function(node) {
            return this.tags.length > 0
                && this.isValidTag(node)
                && this.hasClasses(node)
                && this.hasAttributes(node)
                && this.isModifiable(node);
        },

        undoToTextNode: function(textNode, range, ancestor, positionsToPreserve) {
            if (!range.containsNode(ancestor)) {
                // Split out the portion of the ancestor from which we can remove the CSS class
                //var parent = ancestorWithClass.parentNode, index = dom.getNodeIndex(ancestorWithClass);
                var ancestorRange = range.cloneRange();
                ancestorRange.selectNode(ancestor);
                if (ancestorRange.isPointInRange(range.endContainer, range.endOffset)) {
                    splitNodeAt(ancestor, range.endContainer, range.endOffset, positionsToPreserve);
                    range.setEndAfter(ancestor);
                }
                if (ancestorRange.isPointInRange(range.startContainer, range.startOffset)) {
                    ancestor = splitNodeAt(ancestor, range.startContainer, range.startOffset, positionsToPreserve);
                }
            }
            if (this.isRemovable(ancestor)) {
                replaceWithOwnChildrenPreservingPositions(ancestor, positionsToPreserve);
            } else {
                this.removeClasses(ancestor);
                this.removeAttributes(ancestor);
            }
        },

        applyToRange: function(range, rangesToPreserve) {
            rangesToPreserve = rangesToPreserve || [];

            // Create an array of range boundaries to preserve
            var positionsToPreserve = getRangeBoundaries(rangesToPreserve || []);

            range.splitBoundariesPreservingPositions(positionsToPreserve);
            var nodes = getEffectiveNodes(range);
            if (nodes.length) {
                for (var i = 0, textNode; textNode = nodes[i++]; ) {
                    if (!this.isIgnorableWhiteSpaceNode(textNode)
                            && this.isModifiable(textNode)) {
                        this.applyToTextNode(textNode, positionsToPreserve);
                    }
                }
                range.setStart(nodes[0], 0);
                textNode = nodes[nodes.length - 1];
                range.setEnd(textNode, textNode.length);
                if (this.normalize) {
                    this.postApply(nodes, range, positionsToPreserve, false);
                }

                // Update the ranges from the preserved boundary positions
                updateRangesFromBoundaries(rangesToPreserve, positionsToPreserve);
            }
        },

        applyToRanges: function(ranges) {
            var i = ranges.length;
            while (i--) {
                this.applyToRange(ranges[i], ranges);
            }
            return ranges;
        },

        applyToSelection: function(win) {
            var sel = api.getSelection(win);
            sel.setRanges( this.applyToRanges(sel.getAllRanges()) );
        },

        undoToRange: function(range, rangesToPreserve) {
            // Create an array of range boundaries to preserve
            rangesToPreserve = rangesToPreserve || [];
            var positionsToPreserve = getRangeBoundaries(rangesToPreserve);

            range.splitBoundariesPreservingPositions(positionsToPreserve);
            var textNodes = getEffectiveNodes(range);
            var textNode, validAncestor;
            var lastTextNode = textNodes[textNodes.length - 1];

            if (textNodes.length) {
                for (var i = 0, l = textNodes.length; i < l; ++i) {
                    textNode = textNodes[i];
                    validAncestor = this.getSelfOrAncestor(textNode);
                    if (validAncestor
                            && this.isModifiable(textNode)) {
                        this.undoToTextNode(textNode, range, validAncestor, positionsToPreserve);
                    }

                    // Ensure the range is still valid
                    range.setStart(textNodes[0], 0);
                    range.setEnd(lastTextNode, lastTextNode.length);
                }


                if (this.normalize) {
                    this.postApply(textNodes, range, positionsToPreserve, true);
                }

                // Update the ranges from the preserved boundary positions
                updateRangesFromBoundaries(rangesToPreserve, positionsToPreserve);
            }
        },

        undoToRanges: function(ranges) {
            // Get ranges returned in document order
            var i = ranges.length;

            while (i--) {
                //this.undoToRange(ranges[i], arrayWithoutValue(ranges, ranges[i]));
                this.undoToRange(ranges[i], ranges);
            }

            return ranges;
        },

        undoToSelection: function(win) {
            var sel = api.getSelection(win);
            var ranges = api.getSelection(win).getAllRanges();
            this.undoToRanges(ranges);
            sel.setRanges(ranges);
        },

        getTextSelectedByRange: function(textNode, range) {
            var textRange = range.cloneRange();
            textRange.selectNodeContents(textNode);

            var intersectionRange = textRange.intersection(range);
            var text = intersectionRange ? intersectionRange.toString() : "";
            textRange.detach();

            return text;
        },

        isAppliedToRange: function(range) {
            if (range.collapsed) {
                return !!this.getSelfOrAncestor(range.commonAncestorContainer);
            } else {
                var textNodes = range.getNodes( [3] );
                for (var i = 0, textNode; textNode = textNodes[i++]; ) {
                    if (!this.isIgnorableWhiteSpaceNode(textNode)) {
                        if (rangeSelectsAnyText(range, textNode)
                                && this.isModifiable(textNode)
                                && !this.getSelfOrAncestor(textNode)) {
                            return false;
                        } else if (rangeSelectsAnySelfClosing(range)) {
                            return false;
                        }
                    }
                }
                var html = fragmentToHtml(range.cloneContents());
                if (html.match(/^<(img)/) || trim(html.replace(/<.*?>/g, '')) === '') {
                    return false;
                }
                return true;
            }
        },

        isAppliedToRanges: function(ranges) {
            var i = ranges.length;
            if (i === 0) {
                return false;
            }
            while (i--) {
                if (!this.isAppliedToRange(ranges[i])) {
                    return false;
                }
            }
            return true;
        },

        isAppliedToSelection: function(win) {
            var sel = api.getSelection(win);
            return this.isAppliedToRanges(sel.getAllRanges());
        },

        toggleRange: function(range) {
            if (this.isAppliedToRange(range)) {
                this.undoToRange(range);
            } else {
                this.applyToRange(range);
            }
        },

        toggleRanges: function(ranges) {
            if (this.isAppliedToRanges(ranges)) {
                this.undoToRanges(ranges);
            } else {
                this.applyToRanges(ranges);
            }
        },

        toggleSelection: function(win) {
            if (this.isAppliedToSelection(win)) {
                this.undoToSelection(win);
            } else {
                this.applyToSelection(win);
            }
        },

        detach: function() {}
    };

    function createApplier(options) {
        return new Applier(options);
    }

    Applier.util = {
    };

    api.Applier = Applier;
    api.createApplier = createApplier;
});
;
// File end: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-dependencies/rangy/rangy-applier.js
;
// File start: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-dependencies/rangy/rangy-cssclassapplier.js
/**
 * Class Applier module for Rangy.
 * Adds, removes and toggles classes on Ranges and Selections
 *
 * Part of Rangy, a cross-browser JavaScript range and selection library
 * http://code.google.com/p/rangy/
 *
 * Depends on Rangy core.
 *
 * Copyright 2014, Tim Down
 * Licensed under the MIT license.
 * Version: 1.3alpha.
 * Build date: 22 January 2014
 */
rangy.createModule("ClassApplier", ["WrappedSelection"], function(api, module) {
    var dom = api.dom;
    var DomPosition = dom.DomPosition;
    var contains = dom.arrayContains;


    var defaultTagName = "span";

    function each(obj, func) {
        for (var i in obj) {
            if (obj.hasOwnProperty(i)) {
                if (func(i, obj[i]) === false) {
                    return false;
                }
            }
        }
        return true;
    }
    
    function trim(str) {
        return str.replace(/^\s\s*/, "").replace(/\s\s*$/, "");
    }

    function hasClass(el, cssClass) {
        return el.className && new RegExp("(?:^|\\s)" + cssClass + "(?:\\s|$)").test(el.className);
    }

    function addClass(el, cssClass) {
        if (el.className) {
            if (!hasClass(el, cssClass)) {
                el.className += " " + cssClass;
            }
        } else {
            el.className = cssClass;
        }
    }

    var removeClass = (function() {
        function replacer(matched, whiteSpaceBefore, whiteSpaceAfter) {
            return (whiteSpaceBefore && whiteSpaceAfter) ? " " : "";
        }

        return function(el, cssClass) {
            if (el.className) {
                el.className = el.className.replace(new RegExp("(^|\\s)" + cssClass + "(\\s|$)"), replacer);
            }
        };
    })();

    function sortClassName(className) {
        return className.split(/\s+/).sort().join(" ");
    }

    function getSortedClassName(el) {
        return sortClassName(el.className);
    }

    function haveSameClasses(el1, el2) {
        return getSortedClassName(el1) == getSortedClassName(el2);
    }

    function movePosition(position, oldParent, oldIndex, newParent, newIndex) {
        var node = position.node, offset = position.offset;
        var newNode = node, newOffset = offset;

        if (node == newParent && offset > newIndex) {
            ++newOffset;
        }

        if (node == oldParent && (offset == oldIndex  || offset == oldIndex + 1)) {
            newNode = newParent;
            newOffset += newIndex - oldIndex;
        }

        if (node == oldParent && offset > oldIndex + 1) {
            --newOffset;
        }

        position.node = newNode;
        position.offset = newOffset;
    }
    
    function movePositionWhenRemovingNode(position, parentNode, index) {
        if (position.node == parentNode && position.offset > index) {
            --position.offset;
        }
    }

    function movePreservingPositions(node, newParent, newIndex, positionsToPreserve) {
        // For convenience, allow newIndex to be -1 to mean "insert at the end".
        if (newIndex == -1) {
            newIndex = newParent.childNodes.length;
        }

        var oldParent = node.parentNode;
        var oldIndex = dom.getNodeIndex(node);

        for (var i = 0, position; position = positionsToPreserve[i++]; ) {
            movePosition(position, oldParent, oldIndex, newParent, newIndex);
        }

        // Now actually move the node.
        if (newParent.childNodes.length == newIndex) {
            newParent.appendChild(node);
        } else {
            newParent.insertBefore(node, newParent.childNodes[newIndex]);
        }
    }
    
    function removePreservingPositions(node, positionsToPreserve) {

        var oldParent = node.parentNode;
        var oldIndex = dom.getNodeIndex(node);

        for (var i = 0, position; position = positionsToPreserve[i++]; ) {
            movePositionWhenRemovingNode(position, oldParent, oldIndex);
        }

        node.parentNode.removeChild(node);
    }

    function moveChildrenPreservingPositions(node, newParent, newIndex, removeNode, positionsToPreserve) {
        var child, children = [];
        while ( (child = node.firstChild) ) {
            movePreservingPositions(child, newParent, newIndex++, positionsToPreserve);
            children.push(child);
        }
        if (removeNode) {
            node.parentNode.removeChild(node);
        }
        return children;
    }

    function replaceWithOwnChildrenPreservingPositions(element, positionsToPreserve) {
        return moveChildrenPreservingPositions(element, element.parentNode, dom.getNodeIndex(element), true, positionsToPreserve);
    }

    function rangeSelectsAnyText(range, textNode) {
        var textNodeRange = range.cloneRange();
        textNodeRange.selectNodeContents(textNode);

        var intersectionRange = textNodeRange.intersection(range);
        var text = intersectionRange ? intersectionRange.toString() : "";
        textNodeRange.detach();

        return text != "";
    }

    function getEffectiveTextNodes(range) {
        var nodes = range.getNodes([3]);
        
        // Optimization as per issue 145
        
        // Remove non-intersecting text nodes from the start of the range
        var start = 0, node;
        while ( (node = nodes[start]) && !rangeSelectsAnyText(range, node) ) {
            ++start;
        }

        // Remove non-intersecting text nodes from the start of the range
        var end = nodes.length - 1;
        while ( (node = nodes[end]) && !rangeSelectsAnyText(range, node) ) {
            --end;
        }
        
        return nodes.slice(start, end + 1);
    }

    function elementsHaveSameNonClassAttributes(el1, el2) {
        if (el1.attributes.length != el2.attributes.length) return false;
        for (var i = 0, len = el1.attributes.length, attr1, attr2, name; i < len; ++i) {
            attr1 = el1.attributes[i];
            name = attr1.name;
            if (name != "class") {
                attr2 = el2.attributes.getNamedItem(name);
                if ( (attr1 === null) != (attr2 === null) ) return false;
                if (attr1.specified != attr2.specified) return false;
                if (attr1.specified && attr1.nodeValue !== attr2.nodeValue) return false;
            }
        }
        return true;
    }

    function elementHasNonClassAttributes(el, exceptions) {
        for (var i = 0, len = el.attributes.length, attrName; i < len; ++i) {
            attrName = el.attributes[i].name;
            if ( !(exceptions && contains(exceptions, attrName)) && el.attributes[i].specified && attrName != "class") {
                return true;
            }
        }
        return false;
    }

    function elementHasProperties(el, props) {
        each(props, function(p, propValue) {
            if (typeof propValue == "object") {
                if (!elementHasProperties(el[p], propValue)) {
                    return false;
                }
            } else if (el[p] !== propValue) {
                return false;
            }
        });
        return true;
    }

    var getComputedStyleProperty = dom.getComputedStyleProperty;
    var isEditableElement = (function() {
        var testEl = document.createElement("div");
        return typeof testEl.isContentEditable == "boolean" ?
            function (node) {
                return node && node.nodeType == 1 && node.isContentEditable;
            } :
            function (node) {
                if (!node || node.nodeType != 1 || node.contentEditable == "false") {
                    return false;
                }
                return node.contentEditable == "true" || isEditableElement(node.parentNode);
            };
    })();

    function isEditingHost(node) {
        var parent;
        return node && node.nodeType == 1
            && (( (parent = node.parentNode) && parent.nodeType == 9 && parent.designMode == "on")
            || (isEditableElement(node) && !isEditableElement(node.parentNode)));
    }

    function isEditable(node) {
        return (isEditableElement(node) || (node.nodeType != 1 && isEditableElement(node.parentNode))) && !isEditingHost(node);
    }

    var inlineDisplayRegex = /^inline(-block|-table)?$/i;

    function isNonInlineElement(node) {
        return node && node.nodeType == 1 && !inlineDisplayRegex.test(getComputedStyleProperty(node, "display"));
    }

    // White space characters as defined by HTML 4 (http://www.w3.org/TR/html401/struct/text.html)
    var htmlNonWhiteSpaceRegex = /[^\r\n\t\f \u200B]/;

    function isUnrenderedWhiteSpaceNode(node) {
        if (node.data.length == 0) {
            return true;
        }
        if (htmlNonWhiteSpaceRegex.test(node.data)) {
            return false;
        }
        var cssWhiteSpace = getComputedStyleProperty(node.parentNode, "whiteSpace");
        switch (cssWhiteSpace) {
            case "pre":
            case "pre-wrap":
            case "-moz-pre-wrap":
                return false;
            case "pre-line":
                if (/[\r\n]/.test(node.data)) {
                    return false;
                }
        }

        // We now have a whitespace-only text node that may be rendered depending on its context. If it is adjacent to a
        // non-inline element, it will not be rendered. This seems to be a good enough definition.
        return isNonInlineElement(node.previousSibling) || isNonInlineElement(node.nextSibling);
    }

    function getRangeBoundaries(ranges) {
        var positions = [], i, range;
        for (i = 0; range = ranges[i++]; ) {
            positions.push(
                new DomPosition(range.startContainer, range.startOffset),
                new DomPosition(range.endContainer, range.endOffset)
            );
        }
        return positions;
    }

    function updateRangesFromBoundaries(ranges, positions) {
        for (var i = 0, range, start, end, len = ranges.length; i < len; ++i) {
            range = ranges[i];
            start = positions[i * 2];
            end = positions[i * 2 + 1];
            range.setStartAndEnd(start.node, start.offset, end.node, end.offset);
        }
    }

    function isSplitPoint(node, offset) {
        if (dom.isCharacterDataNode(node)) {
            if (offset == 0) {
                return !!node.previousSibling;
            } else if (offset == node.length) {
                return !!node.nextSibling;
            } else {
                return true;
            }
        }

        return offset > 0 && offset < node.childNodes.length;
    }

    function splitNodeAt(node, descendantNode, descendantOffset, positionsToPreserve) {
        var newNode, parentNode;
        var splitAtStart = (descendantOffset == 0);

        if (dom.isAncestorOf(descendantNode, node)) {
            return node;
        }

        if (dom.isCharacterDataNode(descendantNode)) {
            var descendantIndex = dom.getNodeIndex(descendantNode);
            if (descendantOffset == 0) {
                descendantOffset = descendantIndex;
            } else if (descendantOffset == descendantNode.length) {
                descendantOffset = descendantIndex + 1;
            } else {
                throw module.createError("splitNodeAt() should not be called with offset in the middle of a data node ("
                    + descendantOffset + " in " + descendantNode.data);
            }
            descendantNode = descendantNode.parentNode;
        }

        if (isSplitPoint(descendantNode, descendantOffset)) {
            // descendantNode is now guaranteed not to be a text or other character node
            newNode = descendantNode.cloneNode(false);
            parentNode = descendantNode.parentNode;
            if (newNode.id) {
                newNode.removeAttribute("id");
            }
            var child, newChildIndex = 0;

            while ( (child = descendantNode.childNodes[descendantOffset]) ) {
                movePreservingPositions(child, newNode, newChildIndex++, positionsToPreserve);
            }
            movePreservingPositions(newNode, parentNode, dom.getNodeIndex(descendantNode) + 1, positionsToPreserve);
            return (descendantNode == node) ? newNode : splitNodeAt(node, parentNode, dom.getNodeIndex(newNode), positionsToPreserve);
        } else if (node != descendantNode) {
            newNode = descendantNode.parentNode;

            // Work out a new split point in the parent node
            var newNodeIndex = dom.getNodeIndex(descendantNode);

            if (!splitAtStart) {
                newNodeIndex++;
            }
            return splitNodeAt(node, newNode, newNodeIndex, positionsToPreserve);
        }
        return node;
    }

    function areElementsMergeable(el1, el2) {
        return el1.tagName == el2.tagName
            && haveSameClasses(el1, el2)
            && elementsHaveSameNonClassAttributes(el1, el2)
            && getComputedStyleProperty(el1, "display") == "inline"
            && getComputedStyleProperty(el2, "display") == "inline";
    }

    function createAdjacentMergeableTextNodeGetter(forward) {
        var siblingPropName = forward ? "nextSibling" : "previousSibling";

        return function(textNode, checkParentElement) {
            var el = textNode.parentNode;
            var adjacentNode = textNode[siblingPropName];
            if (adjacentNode) {
                // Can merge if the node's previous/next sibling is a text node
                if (adjacentNode && adjacentNode.nodeType == 3) {
                    return adjacentNode;
                }
            } else if (checkParentElement) {
                // Compare text node parent element with its sibling
                adjacentNode = el[siblingPropName];
                if (adjacentNode && adjacentNode.nodeType == 1 && areElementsMergeable(el, adjacentNode)) {
                    var adjacentNodeChild = adjacentNode[forward ? "firstChild" : "lastChild"];
                    if (adjacentNodeChild && adjacentNodeChild.nodeType == 3) {
                        return adjacentNodeChild;
                    }
                }
            }
            return null;
        };
    }

    var getPreviousMergeableTextNode = createAdjacentMergeableTextNodeGetter(false),
        getNextMergeableTextNode = createAdjacentMergeableTextNodeGetter(true);


    function Merge(firstNode) {
        this.isElementMerge = (firstNode.nodeType == 1);
        this.textNodes = [];
        var firstTextNode = this.isElementMerge ? firstNode.lastChild : firstNode;
        if (firstTextNode) {
            this.textNodes[0] = firstTextNode;
        }
    }

    Merge.prototype = {
        doMerge: function(positionsToPreserve) {
            var textNodes = this.textNodes;
            var firstTextNode = textNodes[0];
            if (textNodes.length > 1) {
                var textParts = [], combinedTextLength = 0, textNode, parent;
                for (var i = 0, len = textNodes.length, j, position; i < len; ++i) {
                    textNode = textNodes[i];
                    parent = textNode.parentNode;
                    if (i > 0) {
                        parent.removeChild(textNode);
                        if (!parent.hasChildNodes()) {
                            parent.parentNode.removeChild(parent);
                        }
                        if (positionsToPreserve) {
                            for (j = 0; position = positionsToPreserve[j++]; ) {
                                // Handle case where position is inside the text node being merged into a preceding node
                                if (position.node == textNode) {
                                    position.node = firstTextNode;
                                    position.offset += combinedTextLength;
                                }
                            }
                        }
                    }
                    textParts[i] = textNode.data;
                    combinedTextLength += textNode.data.length;
                }
                firstTextNode.data = textParts.join("");
            }
            return firstTextNode.data;
        },

        getLength: function() {
            var i = this.textNodes.length, len = 0;
            while (i--) {
                len += this.textNodes[i].length;
            }
            return len;
        },

        toString: function() {
            var textParts = [];
            for (var i = 0, len = this.textNodes.length; i < len; ++i) {
                textParts[i] = "'" + this.textNodes[i].data + "'";
            }
            return "[Merge(" + textParts.join(",") + ")]";
        }
    };

    var optionProperties = ["elementTagName", "ignoreWhiteSpace", "applyToEditableOnly", "useExistingElements",
        "removeEmptyElements", "onElementCreate"];

    // TODO: Populate this with every attribute name that corresponds to a property with a different name. Really??
    var attrNamesForProperties = {};

    function ClassApplier(cssClass, options, tagNames) {
        var normalize, i, len, propName, applier = this;
        applier.cssClass = cssClass;

        var elementPropertiesFromOptions = null, elementAttributes = {};

        // Initialize from options object
        if (typeof options == "object" && options !== null) {
            tagNames = options.tagNames;
            elementPropertiesFromOptions = options.elementProperties;
            elementAttributes = options.elementAttributes;

            for (i = 0; propName = optionProperties[i++]; ) {
                if (options.hasOwnProperty(propName)) {
                    applier[propName] = options[propName];
                }
            }
            normalize = options.normalize;
        } else {
            normalize = options;
        }

        // Backward compatibility: the second parameter can also be a Boolean indicating to normalize after unapplying
        applier.normalize = (typeof normalize == "undefined") ? true : normalize;

        // Initialize element properties and attribute exceptions
        applier.attrExceptions = [];
        var el = document.createElement(applier.elementTagName);
        applier.elementProperties = applier.copyPropertiesToElement(elementPropertiesFromOptions, el, true);
        each(elementAttributes, function(attrName) {
            applier.attrExceptions.push(attrName);
        });
        applier.elementAttributes = elementAttributes;

        applier.elementSortedClassName = applier.elementProperties.hasOwnProperty("className") ?
            applier.elementProperties.className : cssClass;

        // Initialize tag names
        applier.applyToAnyTagName = false;
        var type = typeof tagNames;
        if (type == "string") {
            if (tagNames == "*") {
                applier.applyToAnyTagName = true;
            } else {
                applier.tagNames = trim(tagNames.toLowerCase()).split(/\s*,\s*/);
            }
        } else if (type == "object" && typeof tagNames.length == "number") {
            applier.tagNames = [];
            for (i = 0, len = tagNames.length; i < len; ++i) {
                if (tagNames[i] == "*") {
                    applier.applyToAnyTagName = true;
                } else {
                    applier.tagNames.push(tagNames[i].toLowerCase());
                }
            }
        } else {
            applier.tagNames = [applier.elementTagName];
        }
    }

    ClassApplier.prototype = {
        elementTagName: defaultTagName,
        elementProperties: {},
        elementAttributes: {},
        ignoreWhiteSpace: true,
        applyToEditableOnly: false,
        useExistingElements: true,
        removeEmptyElements: true,
        onElementCreate: null,

        copyPropertiesToElement: function(props, el, createCopy) {
            var s, elStyle, elProps = {}, elPropsStyle, propValue, elPropValue, attrName;

            for (var p in props) {
                if (props.hasOwnProperty(p)) {
                    propValue = props[p];
                    elPropValue = el[p];

                    // Special case for class. The copied properties object has the applier's CSS class as well as its
                    // own to simplify checks when removing styling elements
                    if (p == "className") {
                        addClass(el, propValue);
                        addClass(el, this.cssClass);
                        el[p] = sortClassName(el[p]);
                        if (createCopy) {
                            elProps[p] = el[p];
                        }
                    }

                    // Special case for style
                    else if (p == "style") {
                        elStyle = elPropValue;
                        if (createCopy) {
                            elProps[p] = elPropsStyle = {};
                        }
                        for (s in props[p]) {
                            elStyle[s] = propValue[s];
                            if (createCopy) {
                                elPropsStyle[s] = elStyle[s];
                            }
                        }
                        this.attrExceptions.push(p);
                    } else {
                        el[p] = propValue;
                        // Copy the property back from the dummy element so that later comparisons to check whether
                        // elements may be removed are checking against the right value. For example, the href property
                        // of an element returns a fully qualified URL even if it was previously assigned a relative
                        // URL.
                        if (createCopy) {
                            elProps[p] = el[p];

                            // Not all properties map to identically-named attributes
                            attrName = attrNamesForProperties.hasOwnProperty(p) ? attrNamesForProperties[p] : p;
                            this.attrExceptions.push(attrName);
                        }
                    }
                }
            }

            return createCopy ? elProps : "";
        },
        
        copyAttributesToElement: function(attrs, el) {
            for (var attrName in attrs) {
                if (attrs.hasOwnProperty(attrName)) {
                    el.setAttribute(attrName, attrs[attrName]);
                }
            }
        },

        hasClass: function(node) {
            return node.nodeType == 1 &&
                contains(this.tagNames, node.tagName.toLowerCase()) &&
                hasClass(node, this.cssClass);
        },

        getSelfOrAncestorWithClass: function(node) {
            while (node) {
                if (this.hasClass(node)) {
                    return node;
                }
                node = node.parentNode;
            }
            return null;
        },

        isModifiable: function(node) {
            return !this.applyToEditableOnly || isEditable(node);
        },

        // White space adjacent to an unwrappable node can be ignored for wrapping
        isIgnorableWhiteSpaceNode: function(node) {
            return this.ignoreWhiteSpace && node && node.nodeType == 3 && isUnrenderedWhiteSpaceNode(node);
        },

        // Normalizes nodes after applying a CSS class to a Range.
        postApply: function(textNodes, range, positionsToPreserve, isUndo) {
            var firstNode = textNodes[0], lastNode = textNodes[textNodes.length - 1];

            var merges = [], currentMerge;

            var rangeStartNode = firstNode, rangeEndNode = lastNode;
            var rangeStartOffset = 0, rangeEndOffset = lastNode.length;

            var textNode, precedingTextNode;

            // Check for every required merge and create a Merge object for each
            for (var i = 0, len = textNodes.length; i < len; ++i) {
                textNode = textNodes[i];
                precedingTextNode = getPreviousMergeableTextNode(textNode, !isUndo);
                if (precedingTextNode) {
                    if (!currentMerge) {
                        currentMerge = new Merge(precedingTextNode);
                        merges.push(currentMerge);
                    }
                    currentMerge.textNodes.push(textNode);
                    if (textNode === firstNode) {
                        rangeStartNode = currentMerge.textNodes[0];
                        rangeStartOffset = rangeStartNode.length;
                    }
                    if (textNode === lastNode) {
                        rangeEndNode = currentMerge.textNodes[0];
                        rangeEndOffset = currentMerge.getLength();
                    }
                } else {
                    currentMerge = null;
                }
            }

            // Test whether the first node after the range needs merging
            var nextTextNode = getNextMergeableTextNode(lastNode, !isUndo);

            if (nextTextNode) {
                if (!currentMerge) {
                    currentMerge = new Merge(lastNode);
                    merges.push(currentMerge);
                }
                currentMerge.textNodes.push(nextTextNode);
            }

            // Apply the merges
            if (merges.length) {
                for (i = 0, len = merges.length; i < len; ++i) {
                    merges[i].doMerge(positionsToPreserve);
                }

                // Set the range boundaries
                range.setStartAndEnd(rangeStartNode, rangeStartOffset, rangeEndNode, rangeEndOffset);
            }
        },

        createContainer: function(doc) {
            var el = doc.createElement(this.elementTagName);
            this.copyPropertiesToElement(this.elementProperties, el, false);
            this.copyAttributesToElement(this.elementAttributes, el);
            addClass(el, this.cssClass);
            if (this.onElementCreate) {
                this.onElementCreate(el, this);
            }
            return el;
        },

        applyToTextNode: function(textNode, positionsToPreserve) {
            var parent = textNode.parentNode;
            if (parent.childNodes.length == 1 &&
                    this.useExistingElements &&
                    contains(this.tagNames, parent.tagName.toLowerCase()) &&
                    elementHasProperties(parent, this.elementProperties)) {

                addClass(parent, this.cssClass);
            } else {
                var el = this.createContainer(dom.getDocument(textNode));
                textNode.parentNode.insertBefore(el, textNode);
                el.appendChild(textNode);
            }
        },

        isRemovable: function(el) {
            return el.tagName.toLowerCase() == this.elementTagName
                && getSortedClassName(el) == this.elementSortedClassName
                && elementHasProperties(el, this.elementProperties)
                && !elementHasNonClassAttributes(el, this.attrExceptions)
                && this.isModifiable(el);
        },

        isEmptyContainer: function(el) {
            var childNodeCount = el.childNodes.length;
            return el.nodeType == 1
                && this.isRemovable(el)
                && (childNodeCount == 0 || (childNodeCount == 1 && this.isEmptyContainer(el.firstChild)));
        },
        
        removeEmptyContainers: function(range) {
            var applier = this;
            var nodesToRemove = range.getNodes([1], function(el) {
                return applier.isEmptyContainer(el);
            });
            
            var rangesToPreserve = [range]
            var positionsToPreserve = getRangeBoundaries(rangesToPreserve);
            
            for (var i = 0, node; node = nodesToRemove[i++]; ) {
                removePreservingPositions(node, positionsToPreserve);
            }

            // Update the range from the preserved boundary positions
            updateRangesFromBoundaries(rangesToPreserve, positionsToPreserve);
        },

        undoToTextNode: function(textNode, range, ancestorWithClass, positionsToPreserve) {
            if (!range.containsNode(ancestorWithClass)) {
                // Split out the portion of the ancestor from which we can remove the CSS class
                //var parent = ancestorWithClass.parentNode, index = dom.getNodeIndex(ancestorWithClass);
                var ancestorRange = range.cloneRange();
                ancestorRange.selectNode(ancestorWithClass);
                if (ancestorRange.isPointInRange(range.endContainer, range.endOffset)) {
                    splitNodeAt(ancestorWithClass, range.endContainer, range.endOffset, positionsToPreserve);
                    range.setEndAfter(ancestorWithClass);
                }
                if (ancestorRange.isPointInRange(range.startContainer, range.startOffset)) {
                    ancestorWithClass = splitNodeAt(ancestorWithClass, range.startContainer, range.startOffset, positionsToPreserve);
                }
            }
            if (this.isRemovable(ancestorWithClass)) {
                replaceWithOwnChildrenPreservingPositions(ancestorWithClass, positionsToPreserve);
            } else {
                removeClass(ancestorWithClass, this.cssClass);
            }
        },

        applyToRange: function(range, rangesToPreserve) {
            rangesToPreserve = rangesToPreserve || [];

            // Create an array of range boundaries to preserve
            var positionsToPreserve = getRangeBoundaries(rangesToPreserve || []);
            
            range.splitBoundariesPreservingPositions(positionsToPreserve);

            // Tidy up the DOM by removing empty containers 
            if (this.removeEmptyElements) {
                this.removeEmptyContainers(range);
            }

            var textNodes = getEffectiveTextNodes(range);

            if (textNodes.length) {
                for (var i = 0, textNode; textNode = textNodes[i++]; ) {
                    if (!this.isIgnorableWhiteSpaceNode(textNode) && !this.getSelfOrAncestorWithClass(textNode)
                            && this.isModifiable(textNode)) {
                        this.applyToTextNode(textNode, positionsToPreserve);
                    }
                }
                textNode = textNodes[textNodes.length - 1];
                range.setStartAndEnd(textNodes[0], 0, textNode, textNode.length);
                if (this.normalize) {
                    this.postApply(textNodes, range, positionsToPreserve, false);
                }

                // Update the ranges from the preserved boundary positions
                updateRangesFromBoundaries(rangesToPreserve, positionsToPreserve);
            }
        },

        applyToRanges: function(ranges) {

            var i = ranges.length;
            while (i--) {
                this.applyToRange(ranges[i], ranges);
            }


            return ranges;
        },

        applyToSelection: function(win) {
            var sel = api.getSelection(win);
            sel.setRanges( this.applyToRanges(sel.getAllRanges()) );
        },

        undoToRange: function(range, rangesToPreserve) {
            // Create an array of range boundaries to preserve
            rangesToPreserve = rangesToPreserve || [];
            var positionsToPreserve = getRangeBoundaries(rangesToPreserve);


            range.splitBoundariesPreservingPositions(positionsToPreserve);

            // Tidy up the DOM by removing empty containers 
            if (this.removeEmptyElements) {
                this.removeEmptyContainers(range, positionsToPreserve);
            }

            var textNodes = getEffectiveTextNodes(range);
            var textNode, ancestorWithClass;
            var lastTextNode = textNodes[textNodes.length - 1];

            if (textNodes.length) {
                for (var i = 0, len = textNodes.length; i < len; ++i) {
                    textNode = textNodes[i];
                    ancestorWithClass = this.getSelfOrAncestorWithClass(textNode);
                    if (ancestorWithClass && this.isModifiable(textNode)) {
                        this.undoToTextNode(textNode, range, ancestorWithClass, positionsToPreserve);
                    }

                    // Ensure the range is still valid
                    range.setStartAndEnd(textNodes[0], 0, lastTextNode, lastTextNode.length);
                }


                if (this.normalize) {
                    this.postApply(textNodes, range, positionsToPreserve, true);
                }

                // Update the ranges from the preserved boundary positions
                updateRangesFromBoundaries(rangesToPreserve, positionsToPreserve);
            }
        },

        undoToRanges: function(ranges) {
            // Get ranges returned in document order
            var i = ranges.length;

            while (i--) {
                this.undoToRange(ranges[i], ranges);
            }

            return ranges;
        },

        undoToSelection: function(win) {
            var sel = api.getSelection(win);
            var ranges = api.getSelection(win).getAllRanges();
            this.undoToRanges(ranges);
            sel.setRanges(ranges);
        },

/*
        getTextSelectedByRange: function(textNode, range) {
            var textRange = range.cloneRange();
            textRange.selectNodeContents(textNode);

            var intersectionRange = textRange.intersection(range);
            var text = intersectionRange ? intersectionRange.toString() : "";
            textRange.detach();

            return text;
        },
*/

        isAppliedToRange: function(range) {
            if (range.collapsed || range.toString() == "") {
                return !!this.getSelfOrAncestorWithClass(range.commonAncestorContainer);
            } else {
                var textNodes = range.getNodes( [3] );
                if (textNodes.length)
                for (var i = 0, textNode; textNode = textNodes[i++]; ) {
                    if (!this.isIgnorableWhiteSpaceNode(textNode) && rangeSelectsAnyText(range, textNode)
                            && this.isModifiable(textNode) && !this.getSelfOrAncestorWithClass(textNode)) {
                        return false;
                    }
                }
                return true;
            }
        },

        isAppliedToRanges: function(ranges) {
            var i = ranges.length;
            if (i == 0) {
                return false;
            }
            while (i--) {
                if (!this.isAppliedToRange(ranges[i])) {
                    return false;
                }
            }
            return true;
        },

        isAppliedToSelection: function(win) {
            var sel = api.getSelection(win);
            return this.isAppliedToRanges(sel.getAllRanges());
        },

        toggleRange: function(range) {
            if (this.isAppliedToRange(range)) {
                this.undoToRange(range);
            } else {
                this.applyToRange(range);
            }
        },

/*
        toggleRanges: function(ranges) {
            if (this.isAppliedToRanges(ranges)) {
                this.undoToRanges(ranges);
            } else {
                this.applyToRanges(ranges);
            }
        },
*/

        toggleSelection: function(win) {
            if (this.isAppliedToSelection(win)) {
                this.undoToSelection(win);
            } else {
                this.applyToSelection(win);
            }
        },
        
        getElementsWithClassIntersectingRange: function(range) {
            var elements = [];
            var applier = this;
            range.getNodes([3], function(textNode) {
                var el = applier.getSelfOrAncestorWithClass(textNode);
                if (el && !contains(elements, el)) {
                    elements.push(el);
                }
            });
            return elements;
        },

/*
        getElementsWithClassIntersectingSelection: function(win) {
            var sel = api.getSelection(win);
            var elements = [];
            var applier = this;
            sel.eachRange(function(range) {
                var rangeElements = applier.getElementsWithClassIntersectingRange(range);
                for (var i = 0, el; el = rangeElements[i++]; ) {
                    if (!contains(elements, el)) {
                        elements.push(el);
                    }
                }
            });
            return elements;
        },
*/

        detach: function() {}
    };

    function createClassApplier(cssClass, options, tagNames) {
        return new ClassApplier(cssClass, options, tagNames);
    }

    ClassApplier.util = {
        hasClass: hasClass,
        addClass: addClass,
        removeClass: removeClass,
        hasSameClasses: haveSameClasses,
        replaceWithOwnChildren: replaceWithOwnChildrenPreservingPositions,
        elementsHaveSameNonClassAttributes: elementsHaveSameNonClassAttributes,
        elementHasNonClassAttributes: elementHasNonClassAttributes,
        splitNodeAt: splitNodeAt,
        isEditableElement: isEditableElement,
        isEditingHost: isEditingHost,
        isEditable: isEditable
    };

    api.CssClassApplier = api.ClassApplier = ClassApplier;
    api.createCssClassApplier = api.createClassApplier = createClassApplier;
});
;
// File end: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-dependencies/rangy/rangy-cssclassapplier.js
;
// File start: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-dependencies/rangy/rangy-selectionsaverestore.js
/**
 * Selection save and restore module for Rangy.
 * Saves and restores user selections using marker invisible elements in the DOM.
 *
 * Part of Rangy, a cross-browser JavaScript range and selection library
 * http://code.google.com/p/rangy/
 *
 * Depends on Rangy core.
 *
 * Copyright 2014, Tim Down
 * Licensed under the MIT license.
 * Version: 1.3alpha.
 * Build date: 22 January 2014
 */
rangy.createModule("SaveRestore", ["WrappedRange"], function(api, module) {
    var dom = api.dom;

    var markerTextChar = "\ufeff";

    function gEBI(id, doc) {
        return (doc || document).getElementById(id);
    }

    function insertRangeBoundaryMarker(range, atStart) {
        var markerId = "selectionBoundary_" + (+new Date()) + "_" + ("" + Math.random()).slice(2);
        var markerEl;
        var doc = dom.getDocument(range.startContainer);

        // Clone the Range and collapse to the appropriate boundary point
        var boundaryRange = range.cloneRange();
        boundaryRange.collapse(atStart);

        // Create the marker element containing a single invisible character using DOM methods and insert it
        markerEl = doc.createElement("span");
        markerEl.id = markerId;
        markerEl.style.lineHeight = "0";
        markerEl.style.display = "none";
        markerEl.className = "rangySelectionBoundary";
        markerEl.appendChild(doc.createTextNode(markerTextChar));

        boundaryRange.insertNode(markerEl);
        boundaryRange.detach();
        return markerEl;
    }

    function setRangeBoundary(doc, range, markerId, atStart) {
        var markerEl = gEBI(markerId, doc);
        if (markerEl) {
            range[atStart ? "setStartBefore" : "setEndBefore"](markerEl);
            markerEl.parentNode.removeChild(markerEl);
        } else {
            module.warn("Marker element has been removed. Cannot restore selection.");
        }
    }

    function compareRanges(r1, r2) {
        return r2.compareBoundaryPoints(r1.START_TO_START, r1);
    }

    function saveRange(range, backward) {
        var startEl, endEl, doc = api.DomRange.getRangeDocument(range), text = range.toString();

        if (range.collapsed) {
            endEl = insertRangeBoundaryMarker(range, false);
            return {
                document: doc,
                markerId: endEl.id,
                collapsed: true
            };
        } else {
            endEl = insertRangeBoundaryMarker(range, false);
            startEl = insertRangeBoundaryMarker(range, true);

            return {
                document: doc,
                startMarkerId: startEl.id,
                endMarkerId: endEl.id,
                collapsed: false,
                backward: backward,
                toString: function() {
                    return "original text: '" + text + "', new text: '" + range.toString() + "'";
                }
            };
        }
    }

    function restoreRange(rangeInfo, normalize) {
        var doc = rangeInfo.document;
        if (typeof normalize == "undefined") {
            normalize = true;
        }
        var range = api.createRange(doc);
        if (rangeInfo.collapsed) {
            var markerEl = gEBI(rangeInfo.markerId, doc);
            if (markerEl) {
                markerEl.style.display = "inline";
                var previousNode = markerEl.previousSibling;

                // Workaround for issue 17
                if (previousNode && previousNode.nodeType == 3) {
                    markerEl.parentNode.removeChild(markerEl);
                    range.collapseToPoint(previousNode, previousNode.length);
                } else {
                    range.collapseBefore(markerEl);
                    markerEl.parentNode.removeChild(markerEl);
                }
            } else {
                module.warn("Marker element has been removed. Cannot restore selection.");
            }
        } else {
            setRangeBoundary(doc, range, rangeInfo.startMarkerId, true);
            setRangeBoundary(doc, range, rangeInfo.endMarkerId, false);
        }

        if (normalize) {
            range.normalizeBoundaries();
        }

        return range;
    }

    function saveRanges(ranges, backward) {
        var rangeInfos = [], range, doc;

        // Order the ranges by position within the DOM, latest first, cloning the array to leave the original untouched
        ranges = ranges.slice(0);
        ranges.sort(compareRanges);

        for (var i = 0, len = ranges.length; i < len; ++i) {
            rangeInfos[i] = saveRange(ranges[i], backward);
        }

        // Now that all the markers are in place and DOM manipulation over, adjust each range's boundaries to lie
        // between its markers
        for (i = len - 1; i >= 0; --i) {
            range = ranges[i];
            doc = api.DomRange.getRangeDocument(range);
            if (range.collapsed) {
                range.collapseAfter(gEBI(rangeInfos[i].markerId, doc));
            } else {
                range.setEndBefore(gEBI(rangeInfos[i].endMarkerId, doc));
                range.setStartAfter(gEBI(rangeInfos[i].startMarkerId, doc));
            }
        }

        return rangeInfos;
    }

    function saveSelection(win) {
        if (!api.isSelectionValid(win)) {
            module.warn("Cannot save selection. This usually happens when the selection is collapsed and the selection document has lost focus.");
            return null;
        }
        var sel = api.getSelection(win);
        var ranges = sel.getAllRanges();
        var backward = (ranges.length == 1 && sel.isBackward());

        var rangeInfos = saveRanges(ranges, backward);

        // Ensure current selection is unaffected
        if (backward) {
            sel.setSingleRange(ranges[0], "backward");
        } else {
            sel.setRanges(ranges);
        }

        return {
            win: win,
            rangeInfos: rangeInfos,
            restored: false
        };
    }

    function restoreRanges(rangeInfos) {
        var ranges = [];

        // Ranges are in reverse order of appearance in the DOM. We want to restore earliest first to avoid
        // normalization affecting previously restored ranges.
        var rangeCount = rangeInfos.length;

        for (var i = rangeCount - 1; i >= 0; i--) {
            ranges[i] = restoreRange(rangeInfos[i], true);
        }

        return ranges;
    }

    function restoreSelection(savedSelection, preserveDirection) {
        if (!savedSelection.restored) {
            var rangeInfos = savedSelection.rangeInfos;
            var sel = api.getSelection(savedSelection.win);
            var ranges = restoreRanges(rangeInfos), rangeCount = rangeInfos.length;

            if (rangeCount == 1 && preserveDirection && api.features.selectionHasExtend && rangeInfos[0].backward) {
                sel.removeAllRanges();
                sel.addRange(ranges[0], true);
            } else {
                sel.setRanges(ranges);
            }

            savedSelection.restored = true;
        }
    }

    function removeMarkerElement(doc, markerId) {
        var markerEl = gEBI(markerId, doc);
        if (markerEl) {
            markerEl.parentNode.removeChild(markerEl);
        }
    }

    function removeMarkers(savedSelection) {
        var rangeInfos = savedSelection.rangeInfos;
        for (var i = 0, len = rangeInfos.length, rangeInfo; i < len; ++i) {
            rangeInfo = rangeInfos[i];
            if (rangeInfo.collapsed) {
                removeMarkerElement(savedSelection.doc, rangeInfo.markerId);
            } else {
                removeMarkerElement(savedSelection.doc, rangeInfo.startMarkerId);
                removeMarkerElement(savedSelection.doc, rangeInfo.endMarkerId);
            }
        }
    }

    api.util.extend(api, {
        saveRange: saveRange,
        restoreRange: restoreRange,
        saveRanges: saveRanges,
        restoreRanges: restoreRanges,
        saveSelection: saveSelection,
        restoreSelection: restoreSelection,
        removeMarkerElement: removeMarkerElement,
        removeMarkers: removeMarkers
    });
});
;
// File end: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-dependencies/rangy/rangy-selectionsaverestore.js
;
// File start: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-dependencies/rangy/rangy-serializer.js
/**
 * Serializer module for Rangy.
 * Serializes Ranges and Selections. An example use would be to store a user's selection on a particular page in a
 * cookie or local storage and restore it on the user's next visit to the same page.
 *
 * Part of Rangy, a cross-browser JavaScript range and selection library
 * http://code.google.com/p/rangy/
 *
 * Depends on Rangy core.
 *
 * Copyright 2014, Tim Down
 * Licensed under the MIT license.
 * Version: 1.3alpha.
 * Build date: 22 January 2014
 */
rangy.createModule("Serializer", ["WrappedSelection"], function(api, module) {
    var UNDEF = "undefined";

    // encodeURIComponent and decodeURIComponent are required for cookie handling
    if (typeof encodeURIComponent == UNDEF || typeof decodeURIComponent == UNDEF) {
        module.fail("Global object is missing encodeURIComponent and/or decodeURIComponent method");
    }

    // Checksum for checking whether range can be serialized
    var crc32 = (function() {
        function utf8encode(str) {
            var utf8CharCodes = [];

            for (var i = 0, len = str.length, c; i < len; ++i) {
                c = str.charCodeAt(i);
                if (c < 128) {
                    utf8CharCodes.push(c);
                } else if (c < 2048) {
                    utf8CharCodes.push((c >> 6) | 192, (c & 63) | 128);
                } else {
                    utf8CharCodes.push((c >> 12) | 224, ((c >> 6) & 63) | 128, (c & 63) | 128);
                }
            }
            return utf8CharCodes;
        }

        var cachedCrcTable = null;

        function buildCRCTable() {
            var table = [];
            for (var i = 0, j, crc; i < 256; ++i) {
                crc = i;
                j = 8;
                while (j--) {
                    if ((crc & 1) == 1) {
                        crc = (crc >>> 1) ^ 0xEDB88320;
                    } else {
                        crc >>>= 1;
                    }
                }
                table[i] = crc >>> 0;
            }
            return table;
        }

        function getCrcTable() {
            if (!cachedCrcTable) {
                cachedCrcTable = buildCRCTable();
            }
            return cachedCrcTable;
        }

        return function(str) {
            var utf8CharCodes = utf8encode(str), crc = -1, crcTable = getCrcTable();
            for (var i = 0, len = utf8CharCodes.length, y; i < len; ++i) {
                y = (crc ^ utf8CharCodes[i]) & 0xFF;
                crc = (crc >>> 8) ^ crcTable[y];
            }
            return (crc ^ -1) >>> 0;
        };
    })();

    var dom = api.dom;

    function escapeTextForHtml(str) {
        return str.replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }

    function nodeToInfoString(node, infoParts) {
        infoParts = infoParts || [];
        var nodeType = node.nodeType, children = node.childNodes, childCount = children.length;
        var nodeInfo = [nodeType, node.nodeName, childCount].join(":");
        var start = "", end = "";
        switch (nodeType) {
            case 3: // Text node
                start = escapeTextForHtml(node.nodeValue);
                break;
            case 8: // Comment
                start = "<!--" + escapeTextForHtml(node.nodeValue) + "-->";
                break;
            default:
                start = "<" + nodeInfo + ">";
                end = "</>";
                break;
        }
        if (start) {
            infoParts.push(start);
        }
        for (var i = 0; i < childCount; ++i) {
            nodeToInfoString(children[i], infoParts);
        }
        if (end) {
            infoParts.push(end);
        }
        return infoParts;
    }

    // Creates a string representation of the specified element's contents that is similar to innerHTML but omits all
    // attributes and comments and includes child node counts. This is done instead of using innerHTML to work around
    // IE <= 8's policy of including element properties in attributes, which ruins things by changing an element's
    // innerHTML whenever the user changes an input within the element.
    function getElementChecksum(el) {
        var info = nodeToInfoString(el).join("");
        return crc32(info).toString(16);
    }

    function serializePosition(node, offset, rootNode) {
        var pathParts = [], n = node;
        rootNode = rootNode || dom.getDocument(node).documentElement;
        while (n && n != rootNode) {
            pathParts.push(dom.getNodeIndex(n, true));
            n = n.parentNode;
        }
        return pathParts.join("/") + ":" + offset;
    }

    function deserializePosition(serialized, rootNode, doc) {
        if (!rootNode) {
            rootNode = (doc || document).documentElement;
        }
        var parts = serialized.split(":");
        var node = rootNode;
        var nodeIndices = parts[0] ? parts[0].split("/") : [], i = nodeIndices.length, nodeIndex;

        while (i--) {
            nodeIndex = parseInt(nodeIndices[i], 10);
            if (nodeIndex < node.childNodes.length) {
                node = node.childNodes[nodeIndex];
            } else {
                throw module.createError("deserializePosition() failed: node " + dom.inspectNode(node) +
                        " has no child with index " + nodeIndex + ", " + i);
            }
        }

        return new dom.DomPosition(node, parseInt(parts[1], 10));
    }

    function serializeRange(range, omitChecksum, rootNode) {
        rootNode = rootNode || api.DomRange.getRangeDocument(range).documentElement;
        if (!dom.isOrIsAncestorOf(rootNode, range.commonAncestorContainer)) {
            throw module.createError("serializeRange(): range " + range.inspect() +
                " is not wholly contained within specified root node " + dom.inspectNode(rootNode));
        }
        var serialized = serializePosition(range.startContainer, range.startOffset, rootNode) + "," +
            serializePosition(range.endContainer, range.endOffset, rootNode);
        if (!omitChecksum) {
            serialized += "{" + getElementChecksum(rootNode) + "}";
        }
        return serialized;
    }

    var deserializeRegex = /^([^,]+),([^,\{]+)(\{([^}]+)\})?$/;
    
    function deserializeRange(serialized, rootNode, doc) {
        if (rootNode) {
            doc = doc || dom.getDocument(rootNode);
        } else {
            doc = doc || document;
            rootNode = doc.documentElement;
        }
        var result = deserializeRegex.exec(serialized);
        var checksum = result[4], rootNodeChecksum = getElementChecksum(rootNode);
        if (checksum && checksum !== getElementChecksum(rootNode)) {
            throw module.createError("deserializeRange(): checksums of serialized range root node (" + checksum +
                    ") and target root node (" + rootNodeChecksum + ") do not match");
        }
        var start = deserializePosition(result[1], rootNode, doc), end = deserializePosition(result[2], rootNode, doc);
        var range = api.createRange(doc);
        range.setStartAndEnd(start.node, start.offset, end.node, end.offset);
        return range;
    }

    function canDeserializeRange(serialized, rootNode, doc) {
        if (!rootNode) {
            rootNode = (doc || document).documentElement;
        }
        var result = deserializeRegex.exec(serialized);
        var checksum = result[3];
        return !checksum || checksum === getElementChecksum(rootNode);
    }

    function serializeSelection(selection, omitChecksum, rootNode) {
        selection = api.getSelection(selection);
        var ranges = selection.getAllRanges(), serializedRanges = [];
        for (var i = 0, len = ranges.length; i < len; ++i) {
            serializedRanges[i] = serializeRange(ranges[i], omitChecksum, rootNode);
        }
        return serializedRanges.join("|");
    }

    function deserializeSelection(serialized, rootNode, win) {
        if (rootNode) {
            win = win || dom.getWindow(rootNode);
        } else {
            win = win || window;
            rootNode = win.document.documentElement;
        }
        var serializedRanges = serialized.split("|");
        var sel = api.getSelection(win);
        var ranges = [];

        for (var i = 0, len = serializedRanges.length; i < len; ++i) {
            ranges[i] = deserializeRange(serializedRanges[i], rootNode, win.document);
        }
        sel.setRanges(ranges);

        return sel;
    }

    function canDeserializeSelection(serialized, rootNode, win) {
        var doc;
        if (rootNode) {
            doc = win ? win.document : dom.getDocument(rootNode);
        } else {
            win = win || window;
            rootNode = win.document.documentElement;
        }
        var serializedRanges = serialized.split("|");

        for (var i = 0, len = serializedRanges.length; i < len; ++i) {
            if (!canDeserializeRange(serializedRanges[i], rootNode, doc)) {
                return false;
            }
        }

        return true;
    }

    var cookieName = "rangySerializedSelection";

    function getSerializedSelectionFromCookie(cookie) {
        var parts = cookie.split(/[;,]/);
        for (var i = 0, len = parts.length, nameVal, val; i < len; ++i) {
            nameVal = parts[i].split("=");
            if (nameVal[0].replace(/^\s+/, "") == cookieName) {
                val = nameVal[1];
                if (val) {
                    return decodeURIComponent(val.replace(/\s+$/, ""));
                }
            }
        }
        return null;
    }

    function restoreSelectionFromCookie(win) {
        win = win || window;
        var serialized = getSerializedSelectionFromCookie(win.document.cookie);
        if (serialized) {
            deserializeSelection(serialized, win.doc);
        }
    }

    function saveSelectionCookie(win, props) {
        win = win || window;
        props = (typeof props == "object") ? props : {};
        var expires = props.expires ? ";expires=" + props.expires.toUTCString() : "";
        var path = props.path ? ";path=" + props.path : "";
        var domain = props.domain ? ";domain=" + props.domain : "";
        var secure = props.secure ? ";secure" : "";
        var serialized = serializeSelection(api.getSelection(win));
        win.document.cookie = encodeURIComponent(cookieName) + "=" + encodeURIComponent(serialized) + expires + path + domain + secure;
    }

    api.serializePosition = serializePosition;
    api.deserializePosition = deserializePosition;

    api.serializeRange = serializeRange;
    api.deserializeRange = deserializeRange;
    api.canDeserializeRange = canDeserializeRange;

    api.serializeSelection = serializeSelection;
    api.deserializeSelection = deserializeSelection;
    api.canDeserializeSelection = canDeserializeSelection;

    api.restoreSelectionFromCookie = restoreSelectionFromCookie;
    api.saveSelectionCookie = saveSelectionCookie;

    api.getElementChecksum = getElementChecksum;
    api.nodeToInfoString = nodeToInfoString;
});
;
// File end: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-dependencies/rangy/rangy-serializer.js
;
// File start: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-dependencies/rangy/rangy-textrange.js
/**
 * Text range module for Rangy.
 * Text-based manipulation and searching of ranges and selections.
 *
 * Features
 *
 * - Ability to move range boundaries by character or word offsets
 * - Customizable word tokenizer
 * - Ignores text nodes inside <script> or <style> elements or those hidden by CSS display and visibility properties
 * - Range findText method to search for text or regex within the page or within a range. Flags for whole words and case
 *   sensitivity
 * - Selection and range save/restore as text offsets within a node
 * - Methods to return visible text within a range or selection
 * - innerText method for elements
 *
 * References
 *
 * https://www.w3.org/Bugs/Public/show_bug.cgi?id=13145
 * http://aryeh.name/spec/innertext/innertext.html
 * http://dvcs.w3.org/hg/editing/raw-file/tip/editing.html
 *
 * Part of Rangy, a cross-browser JavaScript range and selection library
 * http://code.google.com/p/rangy/
 *
 * Depends on Rangy core.
 *
 * Copyright 2014, Tim Down
 * Licensed under the MIT license.
 * Version: 1.3alpha.
 * Build date: 22 January 2014
 */

/**
 * Problem: handling of trailing spaces before line breaks is handled inconsistently between browsers.
 *
 * First, a <br>: this is relatively simple. For the following HTML:
 *
 * 1 <br>2
 *
 * - IE and WebKit render the space, include it in the selection (i.e. when the content is selected and pasted into a
 *   textarea, the space is present) and allow the caret to be placed after it.
 * - Firefox does not acknowledge the space in the selection but it is possible to place the caret after it.
 * - Opera does not render the space but has two separate caret positions on either side of the space (left and right
 *   arrow keys show this) and includes the space in the selection.
 *
 * The other case is the line break or breaks implied by block elements. For the following HTML:
 *
 * <p>1 </p><p>2<p>
 *
 * - WebKit does not acknowledge the space in any way
 * - Firefox, IE and Opera as per <br>
 *
 * One more case is trailing spaces before line breaks in elements with white-space: pre-line. For the following HTML:
 *
 * <p style="white-space: pre-line">1
 * 2</p>
 *
 * - Firefox and WebKit include the space in caret positions
 * - IE does not support pre-line up to and including version 9
 * - Opera ignores the space
 * - Trailing space only renders if there is a non-collapsed character in the line
 *
 * Problem is whether Rangy should ever acknowledge the space and if so, when. Another problem is whether this can be
 * feature-tested
 */
rangy.createModule("TextRange", ["WrappedSelection"], function(api, module) {
    var UNDEF = "undefined";
    var CHARACTER = "character", WORD = "word";
    var dom = api.dom, util = api.util;
    var extend = util.extend;
    var getBody = dom.getBody;


    var spacesRegex = /^[ \t\f\r\n]+$/;
    var spacesMinusLineBreaksRegex = /^[ \t\f\r]+$/;
    var allWhiteSpaceRegex = /^[\t-\r \u0085\u00A0\u1680\u180E\u2000-\u200B\u2028\u2029\u202F\u205F\u3000]+$/;
    var nonLineBreakWhiteSpaceRegex = /^[\t \u00A0\u1680\u180E\u2000-\u200B\u202F\u205F\u3000]+$/;
    var lineBreakRegex = /^[\n-\r\u0085\u2028\u2029]$/;

    var defaultLanguage = "en";

    var isDirectionBackward = api.Selection.isDirectionBackward;

    // Properties representing whether trailing spaces inside blocks are completely collapsed (as they are in WebKit,
    // but not other browsers). Also test whether trailing spaces before <br> elements are collapsed.
    var trailingSpaceInBlockCollapses = false;
    var trailingSpaceBeforeBrCollapses = false;
    var trailingSpaceBeforeBlockCollapses = false;
    var trailingSpaceBeforeLineBreakInPreLineCollapses = true;

    (function() {
        var el = document.createElement("div");
        el.contentEditable = "true";
        el.innerHTML = "<p>1 </p><p></p>";
        var body = getBody(document);
        var p = el.firstChild;
        var sel = api.getSelection();

        body.appendChild(el);
        sel.collapse(p.lastChild, 2);
        sel.setStart(p.firstChild, 0);
        trailingSpaceInBlockCollapses = ("" + sel).length == 1;

        el.innerHTML = "1 <br>";
        sel.collapse(el, 2);
        sel.setStart(el.firstChild, 0);
        trailingSpaceBeforeBrCollapses = ("" + sel).length == 1;

        el.innerHTML = "1 <p>1</p>";
        sel.collapse(el, 2);
        sel.setStart(el.firstChild, 0);
        trailingSpaceBeforeBlockCollapses = ("" + sel).length == 1;

        body.removeChild(el);
        sel.removeAllRanges();
    })();

    /*----------------------------------------------------------------------------------------------------------------*/

    // This function must create word and non-word tokens for the whole of the text supplied to it
    function defaultTokenizer(chars, wordOptions) {
        var word = chars.join(""), result, tokens = [];

        function createTokenFromRange(start, end, isWord) {
            var tokenChars = chars.slice(start, end);
            var token = {
                isWord: isWord,
                chars: tokenChars,
                toString: function() {
                    return tokenChars.join("");
                }
            };
            for (var i = 0, len = tokenChars.length; i < len; ++i) {
                tokenChars[i].token = token;
            }
            tokens.push(token);
        }

        // Match words and mark characters
        var lastWordEnd = 0, wordStart, wordEnd;
        while ( (result = wordOptions.wordRegex.exec(word)) ) {
            wordStart = result.index;
            wordEnd = wordStart + result[0].length;

            // Create token for non-word characters preceding this word
            if (wordStart > lastWordEnd) {
                createTokenFromRange(lastWordEnd, wordStart, false);
            }

            // Get trailing space characters for word
            if (wordOptions.includeTrailingSpace) {
                while (nonLineBreakWhiteSpaceRegex.test(chars[wordEnd])) {
                    ++wordEnd;
                }
            }
            createTokenFromRange(wordStart, wordEnd, true);
            lastWordEnd = wordEnd;
        }

        // Create token for trailing non-word characters, if any exist
        if (lastWordEnd < chars.length) {
            createTokenFromRange(lastWordEnd, chars.length, false);
        }

        return tokens;
    }

    var defaultCharacterOptions = {
        includeBlockContentTrailingSpace: true,
        includeSpaceBeforeBr: true,
        includeSpaceBeforeBlock: true,
        includePreLineTrailingSpace: true
    };

    var defaultCaretCharacterOptions = {
        includeBlockContentTrailingSpace: !trailingSpaceBeforeLineBreakInPreLineCollapses,
        includeSpaceBeforeBr: !trailingSpaceBeforeBrCollapses,
        includeSpaceBeforeBlock: !trailingSpaceBeforeBlockCollapses,
        includePreLineTrailingSpace: true
    };
    
    var defaultWordOptions = {
        "en": {
            wordRegex: /[a-z0-9]+('[a-z0-9]+)*/gi,
            includeTrailingSpace: false,
            tokenizer: defaultTokenizer
        }
    };

    function createOptions(optionsParam, defaults) {
        if (!optionsParam) {
            return defaults;
        } else {
            var options = {};
            extend(options, defaults);
            extend(options, optionsParam);
            return options;
        }
    }

    function createWordOptions(options) {
        var lang, defaults;
        if (!options) {
            return defaultWordOptions[defaultLanguage];
        } else {
            lang = options.language || defaultLanguage;
            defaults = {};
            extend(defaults, defaultWordOptions[lang] || defaultWordOptions[defaultLanguage]);
            extend(defaults, options);
            return defaults;
        }
    }

    function createCharacterOptions(options) {
        return createOptions(options, defaultCharacterOptions);
    }

    function createCaretCharacterOptions(options) {
        return createOptions(options, defaultCaretCharacterOptions);
    }
    
    var defaultFindOptions = {
        caseSensitive: false,
        withinRange: null,
        wholeWordsOnly: false,
        wrap: false,
        direction: "forward",
        wordOptions: null,
        characterOptions: null
    };

    var defaultMoveOptions = {
        wordOptions: null,
        characterOptions: null
    };

    var defaultExpandOptions = {
        wordOptions: null,
        characterOptions: null,
        trim: false,
        trimStart: true,
        trimEnd: true
    };

    var defaultWordIteratorOptions = {
        wordOptions: null,
        characterOptions: null,
        direction: "forward"
    };

    /*----------------------------------------------------------------------------------------------------------------*/

    /* DOM utility functions */
    var getComputedStyleProperty = dom.getComputedStyleProperty;

    // Create cachable versions of DOM functions

    // Test for old IE's incorrect display properties
    var tableCssDisplayBlock;
    (function() {
        var table = document.createElement("table");
        var body = getBody(document);
        body.appendChild(table);
        tableCssDisplayBlock = (getComputedStyleProperty(table, "display") == "block");
        body.removeChild(table);
    })();

    api.features.tableCssDisplayBlock = tableCssDisplayBlock;

    var defaultDisplayValueForTag = {
        table: "table",
        caption: "table-caption",
        colgroup: "table-column-group",
        col: "table-column",
        thead: "table-header-group",
        tbody: "table-row-group",
        tfoot: "table-footer-group",
        tr: "table-row",
        td: "table-cell",
        th: "table-cell"
    };

    // Corrects IE's "block" value for table-related elements
    function getComputedDisplay(el, win) {
        var display = getComputedStyleProperty(el, "display", win);
        var tagName = el.tagName.toLowerCase();
        return (display == "block"
            && tableCssDisplayBlock
            && defaultDisplayValueForTag.hasOwnProperty(tagName))
            ? defaultDisplayValueForTag[tagName] : display;
    }

    function isHidden(node) {
        var ancestors = getAncestorsAndSelf(node);
        for (var i = 0, len = ancestors.length; i < len; ++i) {
            if (ancestors[i].nodeType == 1 && getComputedDisplay(ancestors[i]) == "none") {
                return true;
            }
        }

        return false;
    }

    function isVisibilityHiddenTextNode(textNode) {
        var el;
        return textNode.nodeType == 3
            && (el = textNode.parentNode)
            && getComputedStyleProperty(el, "visibility") == "hidden";
    }

    /*----------------------------------------------------------------------------------------------------------------*/


    // "A block node is either an Element whose "display" property does not have
    // resolved value "inline" or "inline-block" or "inline-table" or "none", or a
    // Document, or a DocumentFragment."
    function isBlockNode(node) {
        return node
            && ((node.nodeType == 1 && !/^(inline(-block|-table)?|none)$/.test(getComputedDisplay(node)))
            || node.nodeType == 9 || node.nodeType == 11);
    }

    function getLastDescendantOrSelf(node) {
        var lastChild = node.lastChild;
        return lastChild ? getLastDescendantOrSelf(lastChild) : node;
    }

    function containsPositions(node) {
        return dom.isCharacterDataNode(node)
            || !/^(area|base|basefont|br|col|frame|hr|img|input|isindex|link|meta|param)$/i.test(node.nodeName);
    }

    function getAncestors(node) {
        var ancestors = [];
        while (node.parentNode) {
            ancestors.unshift(node.parentNode);
            node = node.parentNode;
        }
        return ancestors;
    }

    function getAncestorsAndSelf(node) {
        return getAncestors(node).concat([node]);
    }

    function nextNodeDescendants(node) {
        while (node && !node.nextSibling) {
            node = node.parentNode;
        }
        if (!node) {
            return null;
        }
        return node.nextSibling;
    }

    function nextNode(node, excludeChildren) {
        if (!excludeChildren && node.hasChildNodes()) {
            return node.firstChild;
        }
        return nextNodeDescendants(node);
    }

    function previousNode(node) {
        var previous = node.previousSibling;
        if (previous) {
            node = previous;
            while (node.hasChildNodes()) {
                node = node.lastChild;
            }
            return node;
        }
        var parent = node.parentNode;
        if (parent && parent.nodeType == 1) {
            return parent;
        }
        return null;
    }

    // Adpated from Aryeh's code.
    // "A whitespace node is either a Text node whose data is the empty string; or
    // a Text node whose data consists only of one or more tabs (0x0009), line
    // feeds (0x000A), carriage returns (0x000D), and/or spaces (0x0020), and whose
    // parent is an Element whose resolved value for "white-space" is "normal" or
    // "nowrap"; or a Text node whose data consists only of one or more tabs
    // (0x0009), carriage returns (0x000D), and/or spaces (0x0020), and whose
    // parent is an Element whose resolved value for "white-space" is "pre-line"."
    function isWhitespaceNode(node) {
        if (!node || node.nodeType != 3) {
            return false;
        }
        var text = node.data;
        if (text === "") {
            return true;
        }
        var parent = node.parentNode;
        if (!parent || parent.nodeType != 1) {
            return false;
        }
        var computedWhiteSpace = getComputedStyleProperty(node.parentNode, "whiteSpace");

        return (/^[\t\n\r ]+$/.test(text) && /^(normal|nowrap)$/.test(computedWhiteSpace))
            || (/^[\t\r ]+$/.test(text) && computedWhiteSpace == "pre-line");
    }

    // Adpated from Aryeh's code.
    // "node is a collapsed whitespace node if the following algorithm returns
    // true:"
    function isCollapsedWhitespaceNode(node) {
        // "If node's data is the empty string, return true."
        if (node.data === "") {
            return true;
        }

        // "If node is not a whitespace node, return false."
        if (!isWhitespaceNode(node)) {
            return false;
        }

        // "Let ancestor be node's parent."
        var ancestor = node.parentNode;

        // "If ancestor is null, return true."
        if (!ancestor) {
            return true;
        }

        // "If the "display" property of some ancestor of node has resolved value "none", return true."
        if (isHidden(node)) {
            return true;
        }

        return false;
    }

    function isCollapsedNode(node) {
        var type = node.nodeType;
        return type == 7 /* PROCESSING_INSTRUCTION */
            || type == 8 /* COMMENT */
            || isHidden(node)
            || /^(script|style)$/i.test(node.nodeName)
            || isVisibilityHiddenTextNode(node)
            || isCollapsedWhitespaceNode(node);
    }

    function isIgnoredNode(node, win) {
        var type = node.nodeType;
        return type == 7 /* PROCESSING_INSTRUCTION */
            || type == 8 /* COMMENT */
            || (type == 1 && getComputedDisplay(node, win) == "none");
    }

    /*----------------------------------------------------------------------------------------------------------------*/

    // Possibly overengineered caching system to prevent repeated DOM calls slowing everything down

    function Cache() {
        this.store = {};
    }

    Cache.prototype = {
        get: function(key) {
            return this.store.hasOwnProperty(key) ? this.store[key] : null;
        },

        set: function(key, value) {
            return this.store[key] = value;
        }
    };

    var cachedCount = 0, uncachedCount = 0;
    
    function createCachingGetter(methodName, func, objProperty) {
        return function(args) {
            var cache = this.cache;
            if (cache.hasOwnProperty(methodName)) {
                cachedCount++;
                return cache[methodName];
            } else {
                uncachedCount++;
                var value = func.call(this, objProperty ? this[objProperty] : this, args);
                cache[methodName] = value;
                return value;
            }
        };
    }
    
/*
    api.report = function() {
        console.log("Cached: " + cachedCount + ", uncached: " + uncachedCount);
    };
*/

    /*----------------------------------------------------------------------------------------------------------------*/

    function NodeWrapper(node, session) {
        this.node = node;
        this.session = session;
        this.cache = new Cache();
        this.positions = new Cache();
    }

    var nodeProto = {
        getPosition: function(offset) {
            var positions = this.positions;
            return positions.get(offset) || positions.set(offset, new Position(this, offset));
        },

        toString: function() {
            return "[NodeWrapper(" + dom.inspectNode(this.node) + ")]";
        }
    };

    NodeWrapper.prototype = nodeProto;

    var EMPTY = "EMPTY",
        NON_SPACE = "NON_SPACE",
        UNCOLLAPSIBLE_SPACE = "UNCOLLAPSIBLE_SPACE",
        COLLAPSIBLE_SPACE = "COLLAPSIBLE_SPACE",
        TRAILING_SPACE_BEFORE_BLOCK = "TRAILING_SPACE_BEFORE_BLOCK",
        TRAILING_SPACE_IN_BLOCK = "TRAILING_SPACE_IN_BLOCK",
        TRAILING_SPACE_BEFORE_BR = "TRAILING_SPACE_BEFORE_BR",
        PRE_LINE_TRAILING_SPACE_BEFORE_LINE_BREAK = "PRE_LINE_TRAILING_SPACE_BEFORE_LINE_BREAK",
        TRAILING_LINE_BREAK_AFTER_BR = "TRAILING_LINE_BREAK_AFTER_BR";

    extend(nodeProto, {
        isCharacterDataNode: createCachingGetter("isCharacterDataNode", dom.isCharacterDataNode, "node"),
        getNodeIndex: createCachingGetter("nodeIndex", dom.getNodeIndex, "node"),
        getLength: createCachingGetter("nodeLength", dom.getNodeLength, "node"),
        containsPositions: createCachingGetter("containsPositions", containsPositions, "node"),
        isWhitespace: createCachingGetter("isWhitespace", isWhitespaceNode, "node"),
        isCollapsedWhitespace: createCachingGetter("isCollapsedWhitespace", isCollapsedWhitespaceNode, "node"),
        getComputedDisplay: createCachingGetter("computedDisplay", getComputedDisplay, "node"),
        isCollapsed: createCachingGetter("collapsed", isCollapsedNode, "node"),
        isIgnored: createCachingGetter("ignored", isIgnoredNode, "node"),
        next: createCachingGetter("nextPos", nextNode, "node"),
        previous: createCachingGetter("previous", previousNode, "node"),

        getTextNodeInfo: createCachingGetter("textNodeInfo", function(textNode) {
            var spaceRegex = null, collapseSpaces = false;
            var cssWhitespace = getComputedStyleProperty(textNode.parentNode, "whiteSpace");
            var preLine = (cssWhitespace == "pre-line");
            if (preLine) {
                spaceRegex = spacesMinusLineBreaksRegex;
                collapseSpaces = true;
            } else if (cssWhitespace == "normal" || cssWhitespace == "nowrap") {
                spaceRegex = spacesRegex;
                collapseSpaces = true;
            }

            return {
                node: textNode,
                text: textNode.data,
                spaceRegex: spaceRegex,
                collapseSpaces: collapseSpaces,
                preLine: preLine
            };
        }, "node"),

        hasInnerText: createCachingGetter("hasInnerText", function(el, backward) {
            var session = this.session;
            var posAfterEl = session.getPosition(el.parentNode, this.getNodeIndex() + 1);
            var firstPosInEl = session.getPosition(el, 0);

            var pos = backward ? posAfterEl : firstPosInEl;
            var endPos = backward ? firstPosInEl : posAfterEl;

            /*
             <body><p>X  </p><p>Y</p></body>

             Positions:

             body:0:""
             p:0:""
             text:0:""
             text:1:"X"
             text:2:TRAILING_SPACE_IN_BLOCK
             text:3:COLLAPSED_SPACE
             p:1:""
             body:1:"\n"
             p:0:""
             text:0:""
             text:1:"Y"

             A character is a TRAILING_SPACE_IN_BLOCK iff:

             - There is no uncollapsed character after it within the visible containing block element

             A character is a TRAILING_SPACE_BEFORE_BR iff:

             - There is no uncollapsed character after it preceding a <br> element

             An element has inner text iff

             - It is not hidden
             - It contains an uncollapsed character

             All trailing spaces (pre-line, before <br>, end of block) require definite non-empty characters to render.
             */

            while (pos !== endPos) {
                pos.prepopulateChar();
                if (pos.isDefinitelyNonEmpty()) {
                    return true;
                }
                pos = backward ? pos.previousVisible() : pos.nextVisible();
            }

            return false;
        }, "node"),
        
        isRenderedBlock: createCachingGetter("isRenderedBlock", function(el) {
            // Ensure that a block element containing a <br> is considered to have inner text 
            var brs = el.getElementsByTagName("br");
            for (var i = 0, len = brs.length; i < len; ++i) {
                if (!isCollapsedNode(brs[i])) {
                    return true;
                }
            }
            return this.hasInnerText();
        }, "node"),

        getTrailingSpace: createCachingGetter("trailingSpace", function(el) {
            if (el.tagName.toLowerCase() == "br") {
                return "";
            } else {
                switch (this.getComputedDisplay()) {
                    case "inline":
                        var child = el.lastChild;
                        while (child) {
                            if (!isIgnoredNode(child)) {
                                return (child.nodeType == 1) ? this.session.getNodeWrapper(child).getTrailingSpace() : "";
                            }
                            child = child.previousSibling;
                        }
                        break;
                    case "inline-block":
                    case "inline-table":
                    case "none":
                    case "table-column":
                    case "table-column-group":
                        break;
                    case "table-cell":
                        return "\t";
                    default:
                        return this.isRenderedBlock(true) ? "\n" : "";
                }
            }
            return "";
        }, "node"),

        getLeadingSpace: createCachingGetter("leadingSpace", function(el) {
            switch (this.getComputedDisplay()) {
                case "inline":
                case "inline-block":
                case "inline-table":
                case "none":
                case "table-column":
                case "table-column-group":
                case "table-cell":
                    break;
                default:
                    return this.isRenderedBlock(false) ? "\n" : "";
            }
            return "";
        }, "node")
    });

    /*----------------------------------------------------------------------------------------------------------------*/


    function Position(nodeWrapper, offset) {
        this.offset = offset;
        this.nodeWrapper = nodeWrapper;
        this.node = nodeWrapper.node;
        this.session = nodeWrapper.session;
        this.cache = new Cache();
    }

    function inspectPosition() {
        return "[Position(" + dom.inspectNode(this.node) + ":" + this.offset + ")]";
    }

    var positionProto = {
        character: "",
        characterType: EMPTY,
        isBr: false,

        /*
        This method:
        - Fully populates positions that have characters that can be determined independently of any other characters.
        - Populates most types of space positions with a provisional character. The character is finalized later.
         */
        prepopulateChar: function() {
            var pos = this;
            if (!pos.prepopulatedChar) {
                var node = pos.node, offset = pos.offset;
                var visibleChar = "", charType = EMPTY;
                var finalizedChar = false;
                if (offset > 0) {
                    if (node.nodeType == 3) {
                        var text = node.data;
                        var textChar = text.charAt(offset - 1);

                        var nodeInfo = pos.nodeWrapper.getTextNodeInfo();
                        var spaceRegex = nodeInfo.spaceRegex;
                        if (nodeInfo.collapseSpaces) {
                            if (spaceRegex.test(textChar)) {
                                // "If the character at position is from set, append a single space (U+0020) to newdata and advance
                                // position until the character at position is not from set."

                                // We also need to check for the case where we're in a pre-line and we have a space preceding a
                                // line break, because such spaces are collapsed in some browsers
                                if (offset > 1 && spaceRegex.test(text.charAt(offset - 2))) {
                                } else if (nodeInfo.preLine && text.charAt(offset) === "\n") {
                                    visibleChar = " ";
                                    charType = PRE_LINE_TRAILING_SPACE_BEFORE_LINE_BREAK;
                                } else {
                                    visibleChar = " ";
                                    //pos.checkForFollowingLineBreak = true;
                                    charType = COLLAPSIBLE_SPACE;
                                }
                            } else {
                                visibleChar = textChar;
                                charType = NON_SPACE;
                                finalizedChar = true;
                            }
                        } else {
                            visibleChar = textChar;
                            charType = UNCOLLAPSIBLE_SPACE;
                            finalizedChar = true;
                        }
                    } else {
                        var nodePassed = node.childNodes[offset - 1];
                        if (nodePassed && nodePassed.nodeType == 1 && !isCollapsedNode(nodePassed)) {
                            if (nodePassed.tagName.toLowerCase() == "br") {
                                visibleChar = "\n";
                                pos.isBr = true;
                                charType = COLLAPSIBLE_SPACE;
                                finalizedChar = false;
                            } else {
                                pos.checkForTrailingSpace = true;
                            }
                        }

                        // Check the leading space of the next node for the case when a block element follows an inline
                        // element or text node. In that case, there is an implied line break between the two nodes.
                        if (!visibleChar) {
                            var nextNode = node.childNodes[offset];
                            if (nextNode && nextNode.nodeType == 1 && !isCollapsedNode(nextNode)) {
                                pos.checkForLeadingSpace = true;
                            }
                        }
                    }
                }

                pos.prepopulatedChar = true;
                pos.character = visibleChar;
                pos.characterType = charType;
                pos.isCharInvariant = finalizedChar;
            }
        },

        isDefinitelyNonEmpty: function() {
            var charType = this.characterType;
            return charType == NON_SPACE || charType == UNCOLLAPSIBLE_SPACE;
        },

        // Resolve leading and trailing spaces, which may involve prepopulating other positions
        resolveLeadingAndTrailingSpaces: function() {
            if (!this.prepopulatedChar) {
                this.prepopulateChar();
            }
            if (this.checkForTrailingSpace) {
                var trailingSpace = this.session.getNodeWrapper(this.node.childNodes[this.offset - 1]).getTrailingSpace();
                if (trailingSpace) {
                    this.isTrailingSpace = true;
                    this.character = trailingSpace;
                    this.characterType = COLLAPSIBLE_SPACE;
                }
                this.checkForTrailingSpace = false;
            }
            if (this.checkForLeadingSpace) {
                var leadingSpace = this.session.getNodeWrapper(this.node.childNodes[this.offset]).getLeadingSpace();
                if (leadingSpace) {
                    this.isLeadingSpace = true;
                    this.character = leadingSpace;
                    this.characterType = COLLAPSIBLE_SPACE;
                }
                this.checkForLeadingSpace = false;
            }
        },
        
        getPrecedingUncollapsedPosition: function(characterOptions) {
            var pos = this, character;
            while ( (pos = pos.previousVisible()) ) {
                character = pos.getCharacter(characterOptions);
                if (character !== "") {
                    return pos;
                }
            }

            return null;
        },

        getCharacter: function(characterOptions) {
            this.resolveLeadingAndTrailingSpaces();
            
            // Check if this position's  character is invariant (i.e. not dependent on character options) and return it
            // if so
            if (this.isCharInvariant) {
                return this.character;
            }
            
            var cacheKey = ["character", characterOptions.includeSpaceBeforeBr, characterOptions.includeBlockContentTrailingSpace, characterOptions.includePreLineTrailingSpace].join("_");
            var cachedChar = this.cache.get(cacheKey);
            if (cachedChar !== null) {
                return cachedChar;
            }
            
            // We need to actually get the character
            var character = "";
            var collapsible = (this.characterType == COLLAPSIBLE_SPACE);
            
            var nextPos, previousPos/* = this.getPrecedingUncollapsedPosition(characterOptions)*/;
            var gotPreviousPos = false;
            var pos = this;
            
            function getPreviousPos() {
                if (!gotPreviousPos) {
                    previousPos = pos.getPrecedingUncollapsedPosition(characterOptions);
                    gotPreviousPos = true;
                }
                return previousPos;
            }

            // Disallow a collapsible space that is followed by a line break or is the last character
            if (collapsible) {
                // Disallow a collapsible space that follows a trailing space or line break, or is the first character
                if (this.character == " " &&
                        (!getPreviousPos() || previousPos.isTrailingSpace || previousPos.character == "\n")) {
                }
                // Allow a leading line break unless it follows a line break
                else if (this.character == "\n" && this.isLeadingSpace) {
                    if (getPreviousPos() && previousPos.character != "\n") {
                        character = "\n";
                    } else {
                    }
                } else {
                    nextPos = this.nextUncollapsed();
                    if (nextPos) {
                        if (nextPos.isBr) {
                            this.type = TRAILING_SPACE_BEFORE_BR;
                        } else if (nextPos.isTrailingSpace && nextPos.character == "\n") {
                            this.type = TRAILING_SPACE_IN_BLOCK;
                        } else if (nextPos.isLeadingSpace && nextPos.character == "\n") {
                            this.type = TRAILING_SPACE_BEFORE_BLOCK;
                        }
                        
                        if (nextPos.character === "\n") {
                            if (this.type == TRAILING_SPACE_BEFORE_BR && !characterOptions.includeSpaceBeforeBr) {
                            } else if (this.type == TRAILING_SPACE_BEFORE_BLOCK && !characterOptions.includeSpaceBeforeBlock) {
                            } else if (this.type == TRAILING_SPACE_IN_BLOCK && nextPos.isTrailingSpace && !characterOptions.includeBlockContentTrailingSpace) {
                            } else if (this.type == PRE_LINE_TRAILING_SPACE_BEFORE_LINE_BREAK && nextPos.type == NON_SPACE && !characterOptions.includePreLineTrailingSpace) {
                            } else if (this.character === "\n") {
                                if (nextPos.isTrailingSpace) {
                                    if (this.isTrailingSpace) {
                                    } else if (this.isBr) {
                                        nextPos.type = TRAILING_LINE_BREAK_AFTER_BR;
                                        
                                        if (getPreviousPos() && previousPos.isLeadingSpace && previousPos.character == "\n") {
                                            nextPos.character = "";
                                        } else {
                                            //character = "\n";
                                            //nextPos
                                            /*
                                             nextPos.character = "";
                                             character = "\n";
                                             */
                                        }
                                    }
                                } else {
                                    character = "\n";
                                }
                            } else if (this.character === " ") {
                                character = " ";
                            } else {
                            }
                        } else {
                            character = this.character;
                        }
                    } else {
                    }
                }
            }

            // Collapse a br element that is followed by a trailing space
            else if (this.character === "\n" &&
                    (!(nextPos = this.nextUncollapsed()) || nextPos.isTrailingSpace)) {
            }
            
            
            this.cache.set(cacheKey, character);

            return character;
        },

        equals: function(pos) {
            return !!pos && this.node === pos.node && this.offset === pos.offset;
        },

        inspect: inspectPosition,

        toString: function() {
            return this.character;
        }
    };

    Position.prototype = positionProto;

    extend(positionProto, {
        next: createCachingGetter("nextPos", function(pos) {
            var nodeWrapper = pos.nodeWrapper, node = pos.node, offset = pos.offset, session = nodeWrapper.session;
            if (!node) {
                return null;
            }
            var nextNode, nextOffset, child;
            if (offset == nodeWrapper.getLength()) {
                // Move onto the next node
                nextNode = node.parentNode;
                nextOffset = nextNode ? nodeWrapper.getNodeIndex() + 1 : 0;
            } else {
                if (nodeWrapper.isCharacterDataNode()) {
                    nextNode = node;
                    nextOffset = offset + 1;
                } else {
                    child = node.childNodes[offset];
                    // Go into the children next, if children there are
                    if (session.getNodeWrapper(child).containsPositions()) {
                        nextNode = child;
                        nextOffset = 0;
                    } else {
                        nextNode = node;
                        nextOffset = offset + 1;
                    }
                }
            }

            return nextNode ? session.getPosition(nextNode, nextOffset) : null;
        }),

        previous: createCachingGetter("previous", function(pos) {
            var nodeWrapper = pos.nodeWrapper, node = pos.node, offset = pos.offset, session = nodeWrapper.session;
            var previousNode, previousOffset, child;
            if (offset == 0) {
                previousNode = node.parentNode;
                previousOffset = previousNode ? nodeWrapper.getNodeIndex() : 0;
            } else {
                if (nodeWrapper.isCharacterDataNode()) {
                    previousNode = node;
                    previousOffset = offset - 1;
                } else {
                    child = node.childNodes[offset - 1];
                    // Go into the children next, if children there are
                    if (session.getNodeWrapper(child).containsPositions()) {
                        previousNode = child;
                        previousOffset = dom.getNodeLength(child);
                    } else {
                        previousNode = node;
                        previousOffset = offset - 1;
                    }
                }
            }
            return previousNode ? session.getPosition(previousNode, previousOffset) : null;
        }),

        /*
         Next and previous position moving functions that filter out

         - Hidden (CSS visibility/display) elements
         - Script and style elements
         */
        nextVisible: createCachingGetter("nextVisible", function(pos) {
            var next = pos.next();
            if (!next) {
                return null;
            }
            var nodeWrapper = next.nodeWrapper, node = next.node;
            var newPos = next;
            if (nodeWrapper.isCollapsed()) {
                // We're skipping this node and all its descendants
                newPos = nodeWrapper.session.getPosition(node.parentNode, nodeWrapper.getNodeIndex() + 1);
            }
            return newPos;
        }),

        nextUncollapsed: createCachingGetter("nextUncollapsed", function(pos) {
            var nextPos = pos;
            while ( (nextPos = nextPos.nextVisible()) ) {
                nextPos.resolveLeadingAndTrailingSpaces();
                if (nextPos.character !== "") {
                    return nextPos;
                }
            }
            return null;
        }),

        previousVisible: createCachingGetter("previousVisible", function(pos) {
            var previous = pos.previous();
            if (!previous) {
                return null;
            }
            var nodeWrapper = previous.nodeWrapper, node = previous.node;
            var newPos = previous;
            if (nodeWrapper.isCollapsed()) {
                // We're skipping this node and all its descendants
                newPos = nodeWrapper.session.getPosition(node.parentNode, nodeWrapper.getNodeIndex());
            }
            return newPos;
        })
    });

    /*----------------------------------------------------------------------------------------------------------------*/

    var currentSession = null;

    var Session = (function() {
        function createWrapperCache(nodeProperty) {
            var cache = new Cache();

            return {
                get: function(node) {
                    var wrappersByProperty = cache.get(node[nodeProperty]);
                    if (wrappersByProperty) {
                        for (var i = 0, wrapper; wrapper = wrappersByProperty[i++]; ) {
                            if (wrapper.node === node) {
                                return wrapper;
                            }
                        }
                    }
                    return null;
                },

                set: function(nodeWrapper) {
                    var property = nodeWrapper.node[nodeProperty];
                    var wrappersByProperty = cache.get(property) || cache.set(property, []);
                    wrappersByProperty.push(nodeWrapper);
                }
            };
        }

        var uniqueIDSupported = util.isHostProperty(document.documentElement, "uniqueID");

        function Session() {
            this.initCaches();
        }

        Session.prototype = {
            initCaches: function() {
                this.elementCache = uniqueIDSupported ? (function() {
                    var elementsCache = new Cache();

                    return {
                        get: function(el) {
                            return elementsCache.get(el.uniqueID);
                        },

                        set: function(elWrapper) {
                            elementsCache.set(elWrapper.node.uniqueID, elWrapper);
                        }
                    };
                })() : createWrapperCache("tagName");

                // Store text nodes keyed by data, although we may need to truncate this
                this.textNodeCache = createWrapperCache("data");
                this.otherNodeCache = createWrapperCache("nodeName");
            },

            getNodeWrapper: function(node) {
                var wrapperCache;
                switch (node.nodeType) {
                    case 1:
                        wrapperCache = this.elementCache;
                        break;
                    case 3:
                        wrapperCache = this.textNodeCache;
                        break;
                    default:
                        wrapperCache = this.otherNodeCache;
                        break;
                }

                var wrapper = wrapperCache.get(node);
                if (!wrapper) {
                    wrapper = new NodeWrapper(node, this);
                    wrapperCache.set(wrapper);
                }
                return wrapper;
            },

            getPosition: function(node, offset) {
                return this.getNodeWrapper(node).getPosition(offset);
            },

            getRangeBoundaryPosition: function(range, isStart) {
                var prefix = isStart ? "start" : "end";
                return this.getPosition(range[prefix + "Container"], range[prefix + "Offset"]);
            },

            detach: function() {
                this.elementCache = this.textNodeCache = this.otherNodeCache = null;
            }
        };

        return Session;
    })();

    /*----------------------------------------------------------------------------------------------------------------*/

    function startSession() {
        endSession();
        return (currentSession = new Session());
    }

    function getSession() {
        return currentSession || startSession();
    }

    function endSession() {
        if (currentSession) {
            currentSession.detach();
        }
        currentSession = null;
    }

    /*----------------------------------------------------------------------------------------------------------------*/

    // Extensions to the rangy.dom utility object

    extend(dom, {
        nextNode: nextNode,
        previousNode: previousNode
    });

    /*----------------------------------------------------------------------------------------------------------------*/

    function createCharacterIterator(startPos, backward, endPos, characterOptions) {

        // Adjust the end position to ensure that it is actually reached
        if (endPos) {
            if (backward) {
                if (isCollapsedNode(endPos.node)) {
                    endPos = startPos.previousVisible();
                }
            } else {
                if (isCollapsedNode(endPos.node)) {
                    endPos = endPos.nextVisible();
                }
            }
        }

        var pos = startPos, finished = false;

        function next() {
            var newPos = null, charPos = null;
            if (backward) {
                charPos = pos;
                if (!finished) {
                    pos = pos.previousVisible();
                    finished = !pos || (endPos && pos.equals(endPos));
                }
            } else {
                if (!finished) {
                    charPos = pos = pos.nextVisible();
                    finished = !pos || (endPos && pos.equals(endPos));
                }
            }
            if (finished) {
                pos = null;
            }
            return charPos;
        }

        var previousTextPos, returnPreviousTextPos = false;

        return {
            next: function() {
                if (returnPreviousTextPos) {
                    returnPreviousTextPos = false;
                    return previousTextPos;
                } else {
                    var pos, character;
                    while ( (pos = next()) ) {
                        character = pos.getCharacter(characterOptions);
                        if (character) {
                            previousTextPos = pos;
                            return pos;
                        }
                    }
                    return null;
                }
            },

            rewind: function() {
                if (previousTextPos) {
                    returnPreviousTextPos = true;
                } else {
                    throw module.createError("createCharacterIterator: cannot rewind. Only one position can be rewound.");
                }
            },

            dispose: function() {
                startPos = endPos = null;
            }
        };
    }

    var arrayIndexOf = Array.prototype.indexOf ?
        function(arr, val) {
            return arr.indexOf(val);
        } :
        function(arr, val) {
            for (var i = 0, len = arr.length; i < len; ++i) {
                if (arr[i] === val) {
                    return i;
                }
            }
            return -1;
        };

    // Provides a pair of iterators over text positions, tokenized. Transparently requests more text when next()
    // is called and there is no more tokenized text
    function createTokenizedTextProvider(pos, characterOptions, wordOptions) {
        var forwardIterator = createCharacterIterator(pos, false, null, characterOptions);
        var backwardIterator = createCharacterIterator(pos, true, null, characterOptions);
        var tokenizer = wordOptions.tokenizer;

        // Consumes a word and the whitespace beyond it
        function consumeWord(forward) {
            var pos, textChar;
            var newChars = [], it = forward ? forwardIterator : backwardIterator;

            var passedWordBoundary = false, insideWord = false;

            while ( (pos = it.next()) ) {
                textChar = pos.character;
                

                if (allWhiteSpaceRegex.test(textChar)) {
                    if (insideWord) {
                        insideWord = false;
                        passedWordBoundary = true;
                    }
                } else {
                    if (passedWordBoundary) {
                        it.rewind();
                        break;
                    } else {
                        insideWord = true;
                    }
                }
                newChars.push(pos);
            }


            return newChars;
        }

        // Get initial word surrounding initial position and tokenize it
        var forwardChars = consumeWord(true);
        var backwardChars = consumeWord(false).reverse();
        var tokens = tokenizer(backwardChars.concat(forwardChars), wordOptions);

        // Create initial token buffers
        var forwardTokensBuffer = forwardChars.length ?
            tokens.slice(arrayIndexOf(tokens, forwardChars[0].token)) : [];

        var backwardTokensBuffer = backwardChars.length ?
            tokens.slice(0, arrayIndexOf(tokens, backwardChars.pop().token) + 1) : [];

        function inspectBuffer(buffer) {
            var textPositions = ["[" + buffer.length + "]"];
            for (var i = 0; i < buffer.length; ++i) {
                textPositions.push("(word: " + buffer[i] + ", is word: " + buffer[i].isWord + ")");
            }
            return textPositions;
        }


        return {
            nextEndToken: function() {
                var lastToken, forwardChars;

                // If we're down to the last token, consume character chunks until we have a word or run out of
                // characters to consume
                while ( forwardTokensBuffer.length == 1 &&
                    !(lastToken = forwardTokensBuffer[0]).isWord &&
                    (forwardChars = consumeWord(true)).length > 0) {

                    // Merge trailing non-word into next word and tokenize
                    forwardTokensBuffer = tokenizer(lastToken.chars.concat(forwardChars), wordOptions);
                }

                return forwardTokensBuffer.shift();
            },

            previousStartToken: function() {
                var lastToken, backwardChars;

                // If we're down to the last token, consume character chunks until we have a word or run out of
                // characters to consume
                while ( backwardTokensBuffer.length == 1 &&
                    !(lastToken = backwardTokensBuffer[0]).isWord &&
                    (backwardChars = consumeWord(false)).length > 0) {

                    // Merge leading non-word into next word and tokenize
                    backwardTokensBuffer = tokenizer(backwardChars.reverse().concat(lastToken.chars), wordOptions);
                }

                return backwardTokensBuffer.pop();
            },

            dispose: function() {
                forwardIterator.dispose();
                backwardIterator.dispose();
                forwardTokensBuffer = backwardTokensBuffer = null;
            }
        };
    }

    function movePositionBy(pos, unit, count, characterOptions, wordOptions) {
        var unitsMoved = 0, currentPos, newPos = pos, charIterator, nextPos, absCount = Math.abs(count), token;
        if (count !== 0) {
            var backward = (count < 0);

            switch (unit) {
                case CHARACTER:
                    charIterator = createCharacterIterator(pos, backward, null, characterOptions);
                    while ( (currentPos = charIterator.next()) && unitsMoved < absCount ) {
                        ++unitsMoved;
                        newPos = currentPos;
                    }
                    nextPos = currentPos;
                    charIterator.dispose();
                    break;
                case WORD:
                    var tokenizedTextProvider = createTokenizedTextProvider(pos, characterOptions, wordOptions);
                    var next = backward ? tokenizedTextProvider.previousStartToken : tokenizedTextProvider.nextEndToken;

                    while ( (token = next()) && unitsMoved < absCount ) {
                        if (token.isWord) {
                            ++unitsMoved;
                            newPos = backward ? token.chars[0] : token.chars[token.chars.length - 1];
                        }
                    }
                    break;
                default:
                    throw new Error("movePositionBy: unit '" + unit + "' not implemented");
            }

            // Perform any necessary position tweaks
            if (backward) {
                newPos = newPos.previousVisible();
                unitsMoved = -unitsMoved;
            } else if (newPos && newPos.isLeadingSpace) {
                // Tweak the position for the case of a leading space. The problem is that an uncollapsed leading space
                // before a block element (for example, the line break between "1" and "2" in the following HTML:
                // "1<p>2</p>") is considered to be attached to the position immediately before the block element, which
                // corresponds with a different selection position in most browsers from the one we want (i.e. at the
                // start of the contents of the block element). We get round this by advancing the position returned to
                // the last possible equivalent visible position.
                if (unit == WORD) {
                    charIterator = createCharacterIterator(pos, false, null, characterOptions);
                    nextPos = charIterator.next();
                    charIterator.dispose();
                }
                if (nextPos) {
                    newPos = nextPos.previousVisible();
                }
            }
        }


        return {
            position: newPos,
            unitsMoved: unitsMoved
        };
    }

    function createRangeCharacterIterator(session, range, characterOptions, backward) {
        var rangeStart = session.getRangeBoundaryPosition(range, true);
        var rangeEnd = session.getRangeBoundaryPosition(range, false);
        var itStart = backward ? rangeEnd : rangeStart;
        var itEnd = backward ? rangeStart : rangeEnd;

        return createCharacterIterator(itStart, !!backward, itEnd, characterOptions);
    }

    function getRangeCharacters(session, range, characterOptions) {

        var chars = [], it = createRangeCharacterIterator(session, range, characterOptions), pos;
        while ( (pos = it.next()) ) {
            chars.push(pos);
        }

        it.dispose();
        return chars;
    }

    function isWholeWord(startPos, endPos, wordOptions) {
        var range = api.createRange(startPos.node);
        range.setStartAndEnd(startPos.node, startPos.offset, endPos.node, endPos.offset);
        var returnVal = !range.expand("word", wordOptions);
        range.detach();
        return returnVal;
    }

    function findTextFromPosition(initialPos, searchTerm, isRegex, searchScopeRange, findOptions) {
        var backward = isDirectionBackward(findOptions.direction);
        var it = createCharacterIterator(
            initialPos,
            backward,
            initialPos.session.getRangeBoundaryPosition(searchScopeRange, backward),
            findOptions
        );
        var text = "", chars = [], pos, currentChar, matchStartIndex, matchEndIndex;
        var result, insideRegexMatch;
        var returnValue = null;

        function handleMatch(startIndex, endIndex) {
            var startPos = chars[startIndex].previousVisible();
            var endPos = chars[endIndex - 1];
            var valid = (!findOptions.wholeWordsOnly || isWholeWord(startPos, endPos, findOptions.wordOptions));

            return {
                startPos: startPos,
                endPos: endPos,
                valid: valid
            };
        }

        while ( (pos = it.next()) ) {
            currentChar = pos.character;
            if (!isRegex && !findOptions.caseSensitive) {
                currentChar = currentChar.toLowerCase();
            }

            if (backward) {
                chars.unshift(pos);
                text = currentChar + text;
            } else {
                chars.push(pos);
                text += currentChar;
            }
            
            //console.log("text " + text)

            if (isRegex) {
                result = searchTerm.exec(text);
                if (result) {
                    if (insideRegexMatch) {
                        // Check whether the match is now over
                        matchStartIndex = result.index;
                        matchEndIndex = matchStartIndex + result[0].length;
                        if ((!backward && matchEndIndex < text.length) || (backward && matchStartIndex > 0)) {
                            returnValue = handleMatch(matchStartIndex, matchEndIndex);
                            break;
                        }
                    } else {
                        insideRegexMatch = true;
                    }
                }
            } else if ( (matchStartIndex = text.indexOf(searchTerm)) != -1 ) {
                returnValue = handleMatch(matchStartIndex, matchStartIndex + searchTerm.length);
                break;
            }
        }

        // Check whether regex match extends to the end of the range
        if (insideRegexMatch) {
            returnValue = handleMatch(matchStartIndex, matchEndIndex);
        }
        it.dispose();

        return returnValue;
    }

    function createEntryPointFunction(func) {
        return function() {
            var sessionRunning = !!currentSession;
            var session = getSession();
            var args = [session].concat( util.toArray(arguments) );
            var returnValue = func.apply(this, args);
            if (!sessionRunning) {
                endSession();
            }
            return returnValue;
        };
    }

    /*----------------------------------------------------------------------------------------------------------------*/

    // Extensions to the Rangy Range object

    function createRangeBoundaryMover(isStart, collapse) {
        /*
         Unit can be "character" or "word"
         Options:

         - includeTrailingSpace
         - wordRegex
         - tokenizer
         - collapseSpaceBeforeLineBreak
         */
        return createEntryPointFunction(
            function(session, unit, count, moveOptions) {
                if (typeof count == "undefined") {
                    count = unit;
                    unit = CHARACTER;
                }
                moveOptions = createOptions(moveOptions, defaultMoveOptions);
                var characterOptions = createCharacterOptions(moveOptions.characterOptions);
                var wordOptions = createWordOptions(moveOptions.wordOptions);

                var boundaryIsStart = isStart;
                if (collapse) {
                    boundaryIsStart = (count >= 0);
                    this.collapse(!boundaryIsStart);
                }
                var moveResult = movePositionBy(session.getRangeBoundaryPosition(this, boundaryIsStart), unit, count, characterOptions, wordOptions);
                var newPos = moveResult.position;
                this[boundaryIsStart ? "setStart" : "setEnd"](newPos.node, newPos.offset);
                return moveResult.unitsMoved;
            }
        );
    }

    function createRangeTrimmer(isStart) {
        return createEntryPointFunction(
            function(session, characterOptions) {
                characterOptions = createCharacterOptions(characterOptions);
                var pos;
                var it = createRangeCharacterIterator(session, this, characterOptions, !isStart);
                var trimCharCount = 0;
                while ( (pos = it.next()) && allWhiteSpaceRegex.test(pos.character) ) {
                    ++trimCharCount;
                }
                it.dispose();
                var trimmed = (trimCharCount > 0);
                if (trimmed) {
                    this[isStart ? "moveStart" : "moveEnd"](
                        "character",
                        isStart ? trimCharCount : -trimCharCount,
                        { characterOptions: characterOptions }
                    );
                }
                return trimmed;
            }
        );
    }

    extend(api.rangePrototype, {
        moveStart: createRangeBoundaryMover(true, false),

        moveEnd: createRangeBoundaryMover(false, false),

        move: createRangeBoundaryMover(true, true),

        trimStart: createRangeTrimmer(true),

        trimEnd: createRangeTrimmer(false),

        trim: createEntryPointFunction(
            function(session, characterOptions) {
                var startTrimmed = this.trimStart(characterOptions), endTrimmed = this.trimEnd(characterOptions);
                return startTrimmed || endTrimmed;
            }
        ),

        expand: createEntryPointFunction(
            function(session, unit, expandOptions) {
                var moved = false;
                expandOptions = createOptions(expandOptions, defaultExpandOptions);
                var characterOptions = createCharacterOptions(expandOptions.characterOptions);
                if (!unit) {
                    unit = CHARACTER;
                }
                if (unit == WORD) {
                    var wordOptions = createWordOptions(expandOptions.wordOptions);
                    var startPos = session.getRangeBoundaryPosition(this, true);
                    var endPos = session.getRangeBoundaryPosition(this, false);

                    var startTokenizedTextProvider = createTokenizedTextProvider(startPos, characterOptions, wordOptions);
                    var startToken = startTokenizedTextProvider.nextEndToken();
                    var newStartPos = startToken.chars[0].previousVisible();
                    var endToken, newEndPos;

                    if (this.collapsed) {
                        endToken = startToken;
                    } else {
                        var endTokenizedTextProvider = createTokenizedTextProvider(endPos, characterOptions, wordOptions);
                        endToken = endTokenizedTextProvider.previousStartToken();
                    }
                    newEndPos = endToken.chars[endToken.chars.length - 1];

                    if (!newStartPos.equals(startPos)) {
                        this.setStart(newStartPos.node, newStartPos.offset);
                        moved = true;
                    }
                    if (newEndPos && !newEndPos.equals(endPos)) {
                        this.setEnd(newEndPos.node, newEndPos.offset);
                        moved = true;
                    }

                    if (expandOptions.trim) {
                        if (expandOptions.trimStart) {
                            moved = this.trimStart(characterOptions) || moved;
                        }
                        if (expandOptions.trimEnd) {
                            moved = this.trimEnd(characterOptions) || moved;
                        }
                    }

                    return moved;
                } else {
                    return this.moveEnd(CHARACTER, 1, expandOptions);
                }
            }
        ),

        text: createEntryPointFunction(
            function(session, characterOptions) {
                return this.collapsed ?
                    "" : getRangeCharacters(session, this, createCharacterOptions(characterOptions)).join("");
            }
        ),

        selectCharacters: createEntryPointFunction(
            function(session, containerNode, startIndex, endIndex, characterOptions) {
                var moveOptions = { characterOptions: characterOptions };
                if (!containerNode) {
                    containerNode = getBody( this.getDocument() );
                }
                this.selectNodeContents(containerNode);
                this.collapse(true);
                this.moveStart("character", startIndex, moveOptions);
                this.collapse(true);
                this.moveEnd("character", endIndex - startIndex, moveOptions);
            }
        ),

        // Character indexes are relative to the start of node
        toCharacterRange: createEntryPointFunction(
            function(session, containerNode, characterOptions) {
                if (!containerNode) {
                    containerNode = getBody( this.getDocument() );
                }
                var parent = containerNode.parentNode, nodeIndex = dom.getNodeIndex(containerNode);
                var rangeStartsBeforeNode = (dom.comparePoints(this.startContainer, this.endContainer, parent, nodeIndex) == -1);
                var rangeBetween = this.cloneRange();
                var startIndex, endIndex;
                if (rangeStartsBeforeNode) {
                    rangeBetween.setStartAndEnd(this.startContainer, this.startOffset, parent, nodeIndex);
                    startIndex = -rangeBetween.text(characterOptions).length;
                } else {
                    rangeBetween.setStartAndEnd(parent, nodeIndex, this.startContainer, this.startOffset);
                    startIndex = rangeBetween.text(characterOptions).length;
                }
                endIndex = startIndex + this.text(characterOptions).length;
    
                return {
                    start: startIndex,
                    end: endIndex
                };
            }
        ),

        findText: createEntryPointFunction(
            function(session, searchTermParam, findOptions) {
                // Set up options
                findOptions = createOptions(findOptions, defaultFindOptions);
    
                // Create word options if we're matching whole words only
                if (findOptions.wholeWordsOnly) {
                    findOptions.wordOptions = createWordOptions(findOptions.wordOptions);
    
                    // We don't ever want trailing spaces for search results
                    findOptions.wordOptions.includeTrailingSpace = false;
                }
    
                var backward = isDirectionBackward(findOptions.direction);
    
                // Create a range representing the search scope if none was provided
                var searchScopeRange = findOptions.withinRange;
                if (!searchScopeRange) {
                    searchScopeRange = api.createRange();
                    searchScopeRange.selectNodeContents(this.getDocument());
                }
    
                // Examine and prepare the search term
                var searchTerm = searchTermParam, isRegex = false;
                if (typeof searchTerm == "string") {
                    if (!findOptions.caseSensitive) {
                        searchTerm = searchTerm.toLowerCase();
                    }
                } else {
                    isRegex = true;
                }
    
                var initialPos = session.getRangeBoundaryPosition(this, !backward);
    
                // Adjust initial position if it lies outside the search scope
                var comparison = searchScopeRange.comparePoint(initialPos.node, initialPos.offset);
                
                if (comparison === -1) {
                    initialPos = session.getRangeBoundaryPosition(searchScopeRange, true);
                } else if (comparison === 1) {
                    initialPos = session.getRangeBoundaryPosition(searchScopeRange, false);
                }
    
                var pos = initialPos;
                var wrappedAround = false;
    
                // Try to find a match and ignore invalid ones
                var findResult;
                while (true) {
                    findResult = findTextFromPosition(pos, searchTerm, isRegex, searchScopeRange, findOptions);
    
                    if (findResult) {
                        if (findResult.valid) {
                            this.setStartAndEnd(findResult.startPos.node, findResult.startPos.offset, findResult.endPos.node, findResult.endPos.offset);
                            return true;
                        } else {
                            // We've found a match that is not a whole word, so we carry on searching from the point immediately
                            // after the match
                            pos = backward ? findResult.startPos : findResult.endPos;
                        }
                    } else if (findOptions.wrap && !wrappedAround) {
                        // No result found but we're wrapping around and limiting the scope to the unsearched part of the range
                        searchScopeRange = searchScopeRange.cloneRange();
                        pos = session.getRangeBoundaryPosition(searchScopeRange, !backward);
                        searchScopeRange.setBoundary(initialPos.node, initialPos.offset, backward);
                        wrappedAround = true;
                    } else {
                        // Nothing found and we can't wrap around, so we're done
                        return false;
                    }
                }
            }
        ),

        pasteHtml: function(html) {
            this.deleteContents();
            if (html) {
                var frag = this.createContextualFragment(html);
                var lastChild = frag.lastChild;
                this.insertNode(frag);
                this.collapseAfter(lastChild);
            }
        }
    });

    /*----------------------------------------------------------------------------------------------------------------*/

    // Extensions to the Rangy Selection object

    function createSelectionTrimmer(methodName) {
        return createEntryPointFunction(
            function(session, characterOptions) {
                var trimmed = false;
                this.changeEachRange(function(range) {
                    trimmed = range[methodName](characterOptions) || trimmed;
                });
                return trimmed;
            }
        );
    }

    extend(api.selectionPrototype, {
        expand: createEntryPointFunction(
            function(session, unit, expandOptions) {
                this.changeEachRange(function(range) {
                    range.expand(unit, expandOptions);
                });
            }
        ),

        move: createEntryPointFunction(
            function(session, unit, count, options) {
                var unitsMoved = 0;
                if (this.focusNode) {
                    this.collapse(this.focusNode, this.focusOffset);
                    var range = this.getRangeAt(0);
                    if (!options) {
                        options = {};
                    }
                    options.characterOptions = createCaretCharacterOptions(options.characterOptions);
                    unitsMoved = range.move(unit, count, options);
                    this.setSingleRange(range);
                }
                return unitsMoved;
            }
        ),

        trimStart: createSelectionTrimmer("trimStart"),
        trimEnd: createSelectionTrimmer("trimEnd"),
        trim: createSelectionTrimmer("trim"),

        selectCharacters: createEntryPointFunction(
            function(session, containerNode, startIndex, endIndex, direction, characterOptions) {
                var range = api.createRange(containerNode);
                range.selectCharacters(containerNode, startIndex, endIndex, characterOptions);
                this.setSingleRange(range, direction);
            }
        ),

        saveCharacterRanges: createEntryPointFunction(
            function(session, containerNode, characterOptions) {
                var ranges = this.getAllRanges(), rangeCount = ranges.length;
                var rangeInfos = [];
    
                var backward = rangeCount == 1 && this.isBackward();
    
                for (var i = 0, len = ranges.length; i < len; ++i) {
                    rangeInfos[i] = {
                        characterRange: ranges[i].toCharacterRange(containerNode, characterOptions),
                        backward: backward,
                        characterOptions: characterOptions
                    };
                }
    
                return rangeInfos;
            }
        ),

        restoreCharacterRanges: createEntryPointFunction(
            function(session, containerNode, saved) {
                this.removeAllRanges();
                for (var i = 0, len = saved.length, range, rangeInfo, characterRange; i < len; ++i) {
                    rangeInfo = saved[i];
                    characterRange = rangeInfo.characterRange;
                    range = api.createRange(containerNode);
                    range.selectCharacters(containerNode, characterRange.start, characterRange.end, rangeInfo.characterOptions);
                    this.addRange(range, rangeInfo.backward);
                }
            }
        ),

        text: createEntryPointFunction(
            function(session, characterOptions) {
                var rangeTexts = [];
                for (var i = 0, len = this.rangeCount; i < len; ++i) {
                    rangeTexts[i] = this.getRangeAt(i).text(characterOptions);
                }
                return rangeTexts.join("");
            }
        )
    });

    /*----------------------------------------------------------------------------------------------------------------*/

    // Extensions to the core rangy object

    api.innerText = function(el, characterOptions) {
        var range = api.createRange(el);
        range.selectNodeContents(el);
        var text = range.text(characterOptions);
        range.detach();
        return text;
    };

    api.createWordIterator = function(startNode, startOffset, iteratorOptions) {
        var session = getSession();
        iteratorOptions = createOptions(iteratorOptions, defaultWordIteratorOptions);
        var characterOptions = createCharacterOptions(iteratorOptions.characterOptions);
        var wordOptions = createWordOptions(iteratorOptions.wordOptions);
        var startPos = session.getPosition(startNode, startOffset);
        var tokenizedTextProvider = createTokenizedTextProvider(startPos, characterOptions, wordOptions);
        var backward = isDirectionBackward(iteratorOptions.direction);

        return {
            next: function() {
                return backward ? tokenizedTextProvider.previousStartToken() : tokenizedTextProvider.nextEndToken();
            },

            dispose: function() {
                tokenizedTextProvider.dispose();
                this.next = function() {};
            }
        };
    };

    /*----------------------------------------------------------------------------------------------------------------*/
    
    api.noMutation = function(func) {
        var session = getSession();
        func(session);
        endSession();
    };

    api.noMutation.createEntryPointFunction = createEntryPointFunction;

    api.textRange = {
        isBlockNode: isBlockNode,
        isCollapsedWhitespaceNode: isCollapsedWhitespaceNode,

        createPosition: createEntryPointFunction(
            function(session, node, offset) {
                return session.getPosition(node, offset);
            }
        )
    };
});;
// File end: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-dependencies/rangy/rangy-textrange.js
;
// File start: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-common/ajax.js
var ajax = {};

ajax.prepare = function(data) {
    var query = [];
    for (var key in data) {
        query.push(encodeURIComponent(key) + '=' + encodeURIComponent(data[key]));
    }
    return query.join('&');
};

ajax.send = function(url, callback, method, data, async) {
    var x = new XMLHttpRequest();
    x.open(method, url, async);
    x.onreadystatechange = function() {
        if (x.readyState == 4) {
            callback(x.responseText, x)
        }
    };
    x.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
    if (method == 'POST') {
        x.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
    }
    x.send(data)
};

ajax.get = function(url, data, callback, async) {
    ajax.send(url + (data ? '?' + ajax.prepare(data) : ''), callback, 'GET', null, async)
};

ajax.post = function(url, data, callback, async) {
    ajax.send(url, callback, 'POST', ajax.prepare(data), async)
};
;
// File end: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-common/ajax.js
;
// File start: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-common/debug.js
// <debug/>


// <strict/>
;
// File end: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-common/debug.js
;
// File start: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-common/event.js
function eventMouseEnter(node, callback) {
    node.addEventListener('mouseover', function(event) {
        if (!event.relatedTarget || (event.relatedTarget !== this && !(this.compareDocumentPosition(event.relatedTarget) & Node.DOCUMENT_POSITION_CONTAINED_BY))) {
            callback.call(node, event);
        }
    });
};

function eventMouseLeave(node, callback) {
    node.addEventListener('mouseout', function(event) {
        if (!event.relatedTarget || (event.relatedTarget !== this && !(this.compareDocumentPosition(event.relatedTarget) & Node.DOCUMENT_POSITION_CONTAINED_BY))) {
            callback.call(node, event);
        }
    });
};

function eventEventable(object) {
    object.prototype.events = {};
    object.prototype.bindOptions = function(options) {
        for (var name in options) {
            this.bind(name, options[name]);
        }
    };
    object.prototype.bind = function(name, callback) {
        // <strict/>
        var names = name.split(/,\s*/);
        for (var i = 0, l = names.length; i < l; i++) {
            if (!this.events[names[i]]) {
                this.events[names[i]] = [];
            }
            this.events[names[i]].push(callback);
        }
    };
    object.prototype.fire = function(name, args) {
        var result = [];

        // <debug/>

        if (this.events[name]) {
            for (var i = 0; i < this.events[name].length; i++) {
                var event = this.events[name][i],
                    currentResult = event.apply(this, args);
                if (typeof currentResult !== 'undefined') {
                    result = result.concat(currentResult);
                }
            }
        }

        return result;
    };
};
;
// File end: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-common/event.js
;
// File start: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-common/format.js
function formatBytes(bytes, decimalPlaces) {
    if (typeof decimalPlaces === 'undefined') {
        decimalPlaces = 2;
    }
    var suffix = ['B', 'kB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    for (var i = 0; bytes > 1024 && i < 8; i++) {
        bytes /= 1024;
    }
    return Math.round(bytes, decimalPlaces) + ' ' + suffix[i];
}
;
// File end: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-common/format.js
;
// File start: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-common/i18n.js
/**
 * @fileOverview Editor internationalization (i18n) private functions and properties.
 * @license http://www.raptor-editor.com/license
 *
 * @author David Neilsen <david@panmedia.co.nz>
 * @author Michael Robinson <michael@panmedia.co.nz>
 */

/**
 * @type String|null
 */
var currentLocale = null;

var localeFallback = 'en';

/**
 * @type Object
 */
var locales = {};

/**
 * @type Object
 */
var localeNames = {};

/**
 *
 * @static
 * @param {String} languageCode The language code (e.g. `en`, `fr`, `zh-CN`).
 * @param {String} nativeName The languages native name.
 * @param {Object} [strings] Locale keys mapped to phrases.
 */
function registerLocale(name, nativeName, strings) {
    // <strict/>
    // <debug/>

    locales[name] = strings;
    localeNames[name] = nativeName;
}

/**
 * Extends an existing locale, or registers it if it does not already exist.
 *
 * @static
 * @param {String} languageCode The language code (e.g. `en`, `fr`, `zh-CN`).
 * @param {String|Object} nativeName The languages native name, or an locale keys mapped to phrases.
 * @param {Object} [strings] Locale keys mapped to phrases.
 */
function extendLocale(languageCode, nativeName, strings) {
    if (typeof locales[languageCode] === 'undefined') {
        registerLocale(languageCode, nativeName, strings);
    } else {
        // <debug/>

        // Allow only passing the nativeName once.
        strings = strings || nativeName;

        for (var key in strings) {
            locales[languageCode][key] = strings[key];
        }
    }
}

/**
 * @param {String} key
 */
function setLocale(key) {
    if (currentLocale !== key) {
        // <debug/>

        currentLocale = key;
        Raptor.eachInstance(function() {
            this.localeChange();
        });
    }
}

/**
 * Return the localised string for the current locale if present, else the
 * localised string for the first available locale, failing that return the
 * string.
 *
 * @param  {string} string
 * @param  {Boolean} allowMissing If true and the localized string is missing, false is returned.
 * @return {string|false}
 */
function getLocalizedString(string, allowMissing) {
    if (typeof locales[currentLocale] !== 'undefined' &&
            typeof locales[currentLocale][string] !== 'undefined') {
        return locales[currentLocale][string];
    }

    if (typeof locales[localeFallback] !== 'undefined' &&
            typeof locales[localeFallback][string] !== 'undefined') {
        return locales[localeFallback][string];
    }

    for (var localeName in localeNames) {
        if (typeof locales[localeName][string] !== 'undefined') {
            return locales[localeName][string];
        }
    }

    if (allowMissing) {
        return false;
    }

    // <debug/>
    return string;
}

/**
 * Internationalisation function. Translates a string with tagged variable
 * references to the current locale.
 *
 * <p>
 * Variable references should be surrounded with double curly braces {{ }}
 *      e.g. "This string has a variable: {{my.variable}} which will not be translated"
 * </p>
 *
 * @static
 * @param {String} string
 * @param {Object|false} variables If false, then no string is returned by default.
 */
function tr(string, variables) {
    if (!currentLocale) {
        var lastLocale = Raptor.persist('locale');
        if (lastLocale) {
            currentLocale = lastLocale;
        }
    } 
    if (!currentLocale) {
        currentLocale = 'en';
    }

    // Get the current locale translated string
    string = getLocalizedString(string, variables === false);
    if (string === false) {
        return false;
    }

    // Convert the variables
    if (!variables) {
        return string;
    } else {
        for (var key in variables) {
            string = string.replace('{{' + key + '}}', variables[key]);
        }
        return string;
    }
}
;
// File end: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-common/i18n.js
;
// File start: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-common/node.js

/**
 * Generates a unique ID for a node.
 *
 * @returns {String} The unique ID.
 */
function nodeUniqueId(node) {
    if (!node || !node.id) {
        var id;
        do {
            id = 'ruid-' + Math.random().toString().replace('.', '');
        } while (document.getElementById(id))
        if (!node) {
            return id;
        }
        node.id = id;
    }
    return node.id;
}

function nodeClosestByClassName(node, className) {
    while (node.parentNode && node.parentNode.className != className) {
        node = node.parentNode;
    }
    if (node.parentNode) {
        return node.parentNode;
    }
    return null;
}

function nodeFromHtml(html, wrapper) {
    var node = document.createElement(wrapper || 'div');
    node.innerHTML = html;
    return node.children[0];
}

function nodeClassSwitch(node, classAdd, classRemove) {
    node.classList.add(classAdd);
    node.classList.remove(classRemove);
}

function nodeLastChild(node) {
    var lastChild = node.lastChild
    while (lastChild && lastChild.nodeType !== 1) {
        lastChild = lastChild.previousSibling;
    }
    return lastChild;
}

function nodeOffsetTop(node) {
    var offsetTop = 0;
    do {
        if (node.tagName === 'BODY') {
            break;
        } else {
            offsetTop += node.offsetTop;
        }
        node = node.offsetParent;
    } while(node);
    return offsetTop;
}
;
// File end: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-common/node.js
;
// File start: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-common/plugin.js
function Plugin(overrides) {
    for (var key in overrides) {
        this[key] = overrides[key];
    }
};

Plugin.prototype.init = function() {}

function pluginPluggable(object) {
    object.registerPlugin = function(plugin) {
        // <strict/>

        this.prototype.plugins[plugin.name] = plugin;
    };
    object.prototype.plugins = {};
    object.prototype.pluginInstances = {};
};

function pluginPrepare(pluggable, plugin, pluginOptions, pluginAttributes) {
    var instance = $.extend({}, plugin);

    var options = $.extend({}, pluggable.options, {
        baseClass: 'raptor-plugin-' + stringFromCamelCase(plugin.name)
    }, instance.options, pluginOptions);

    instance.pluggable = pluggable;
    instance.options = options;

    for (var key in pluginAttributes) {
        instance[key] = pluginAttributes[key];
    }

    // <strict/>
    var ui = instance.init();

    return {
        ui: ui,
        instance: instance
    };
};
;
// File end: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-common/plugin.js
;
// File start: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-common/state.js
var stateDirty = {};

jQuery(window).on('beforeunload', stateCheckDirty);

function stateSetDirty(owner, dirty) {
    if (dirty) {
        stateDirty[owner] = dirty;
    } else {
        delete stateDirty[owner];
    }
}

function stateCheckDirty(event) {
    var dirty = false;
    for (var key in stateDirty) {
        if (typeof stateDirty[key] === 'function') {
            if (stateDirty[key]()) {
                dirty = true;
            }
        } else if (stateDirty[key]) {
            dirty = true;
        }
    }
    if (dirty) {
        var confirmationMessage = 'There are unsaved changes on this page. Are you sure you wish to navigate away?';
        (event || window.event).returnValue = confirmationMessage;
        return confirmationMessage;
    }
};
// File end: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-common/state.js
;
// File start: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-common/string.js
function stringHash(string) {
    return string
        .split('')
        .reduce(function(a, b){
            a = ((a << 5) - a) + b.charCodeAt(0);
            return a & a
        }, 0);
}

function stringUcFirst(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

function stringFromCamelCase(string, delimiter) {
    return string.replace(/([A-Z])/g, function(match) {
        return (delimiter || '-') + match.toLowerCase();
    });
}
;
// File end: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-common/string.js
;
// File start: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-common/template.js
/**
 * @fileOverview Template helper functions.
 * @license http://www.raptor-editor.com/license
 *
 * @author David Neilsen david@panmedia.co.nz
 * @author Michael Robinson michael@panmedia.co.nz
 */

/**
 *
 * @type type
 */
var templateCache = { 
    "unsupported": "<div class=\"{{baseClass}}-unsupported-overlay\"></div> <div class=\"{{baseClass}}-unsupported-content\"> It has been detected that you a using a browser that is not supported by Raptor, please use one of the following browsers: <ul> <li><a href=\"http://www.google.com/chrome\">Google Chrome</a></li> <li><a href=\"http://www.firefox.com\">Mozilla Firefox</a></li> <li><a href=\"http://www.google.com/chromeframe\">Internet Explorer with Chrome Frame</a></li> </ul> <div class=\"{{baseClass}}-unsupported-input\"> <button class=\"{{baseClass}}-unsupported-close\">Close</button> <input name=\"{{baseClass}}-unsupported-show\" type=\"checkbox\" /> <label>Don't show this message again</label> </div> <div>",
    "class-menu.item": "<li><a data-value=\"{{value}}\">{{label}}</a></li>",
    "click-button-to-edit.button": "<button class=\"{{baseClass}}-button\">tr('clickButtonToEditPluginButton')</button>",
    "color-menu-basic.menu": "<li><a data-color=\"automatic\"><div class=\"{{baseClass}}-swatch\" style=\"display: none\"></div> <span>tr('colorMenuBasicAutomatic')</span></a></li> <li><a data-color=\"white\"><div class=\"{{baseClass}}-swatch\" style=\"background-color: #ffffff\"></div> <span>tr('colorMenuBasicWhite')</span></a></li> <li><a data-color=\"black\"><div class=\"{{baseClass}}-swatch\" style=\"background-color: #000000\"></div> <span>tr('colorMenuBasicBlack')</span></a></li> <li><a data-color=\"grey\"><div class=\"{{baseClass}}-swatch\" style=\"background-color: #999\"></div> <span>tr('colorMenuBasicGrey')</span></a></li> <li><a data-color=\"blue\"><div class=\"{{baseClass}}-swatch\" style=\"background-color: #4f81bd\"></div> <span>tr('colorMenuBasicBlue')</span></a></li> <li><a data-color=\"red\"><div class=\"{{baseClass}}-swatch\" style=\"background-color: #c0504d\"></div> <span>tr('colorMenuBasicRed')</span></a></li> <li><a data-color=\"green\"><div class=\"{{baseClass}}-swatch\" style=\"background-color: #9bbb59\"></div> <span>tr('colorMenuBasicGreen')</span></a></li> <li><a data-color=\"purple\"><div class=\"{{baseClass}}-swatch\" style=\"background-color: #8064a2\"></div> <span>tr('colorMenuBasicPurple')</span></a></li> <li><a data-color=\"orange\"><div class=\"{{baseClass}}-swatch\" style=\"background-color: #f79646\"></div> <span>tr('colorMenuBasicOrange')</span></a></li>",
    "embed.dialog": "<div class=\"{{baseClass}}-panel-tabs ui-tabs ui-widget ui-widget-content ui-corner-all\"> <ul class=\"ui-tabs-nav ui-helper-reset ui-helper-clearfix ui-widget-header ui-corner-all\"> <li class=\"ui-state-default ui-corner-top ui-tabs-selected ui-state-active\"><a>tr('embedDialogTabCode')</a></li> <li class=\"ui-state-default ui-corner-top\"><a>tr('embedDialogTabPreview')</a></li> </ul> <div class=\"{{baseClass}}-code-tab\"> <p>tr('embedDialogTabCodeContent')</p> <textarea></textarea> </div> <div class=\"{{baseClass}}-preview-tab\" style=\"display: none\"> <p>tr('embedDialogTabPreviewContent')</p> <div class=\"{{baseClass}}-preview\"></div> </div> </div>",
    "font-family.menu-item": "<li><a data-font=\"{{fontName}}\"><span>{{fontTitle}}</span></a></li>",
    "image-resize.dialog": "<div class=\"raptor-resize-image\"> <div> <label for=\"{{baseClass}}-width\">tr('imageResizeDialogWidth')</label> <input class=\"form-text\" id=\"{{baseClass}}-width\" name=\"width\" type=\"text\" placeholder=\"tr('imageResizeDialogWidthPlaceHolder')\"/> </div> <div> <label for=\"{{baseClass}}-height\">tr('imageResizeDialogHeight')</label> <input class=\"form-text\" id=\"{{baseClass}}-height\" name=\"height\" type=\"text\" placeholder=\"tr('imageResizeDialogHeightPlaceHolder')\"/> </div> <div class=\"{{baseClass}}-lock-proportions-container\"> <span class=\"{{baseClass}}-lock-proportions\"> <span class=\"ui-button-text\">Constrain proportions</span> <span class=\"ui-icon ui-icon-locked\"></span> </span> </div> </div>",
    "insert-file.dialog": "<div> <div> <label class=\"form-label\">tr('insertFileURLLabel')</label> <input type=\"text\" name=\"location\" class=\"form-text\" placeholder=\"tr('insertFileURLPlaceHolder')\"/> </div> <div> <label class=\"form-label\">tr('insertFileNameLabel')</label> <input type=\"text\" name=\"name\" class=\"form-text\" placeholder=\"tr('insertFileNamePlaceHolder')\"/> </div> </div>",
    "language-menu.item": "<li><a data-value=\"{{value}}\"><span class=\"ui-icon ui-icon-flag-{{icon}}\"></span>{{label}}</a></li>",
    "link.dialog": "<div style=\"display:none\" class=\"{{baseClass}}-panel\"> <div class=\"{{baseClass}}-menu\"> <p>tr('linkCreateDialogMenuHeader')</p> <fieldset data-menu=\"\"></fieldset> </div> <div class=\"{{baseClass}}-wrap\"> <div class=\"{{baseClass}}-content\" data-content=\"\"></div> </div> </div>",
    "link.document": "<h2>tr('linkTypeDocumentHeader')</h2> <fieldset> <label for=\"{{baseClass}}-document-href\">tr('linkTypeDocumentLocationLabel')</label> <input id=\"{{baseClass}}-document-href\" value=\"http://\" name=\"location\" class=\"{{baseClass}}-document-href\" type=\"text\" placeholder=\"tr('linkTypeDocumentLocationPlaceHolder')\" /> </fieldset> <h2>tr('linkTypeDocumentNewWindowHeader')</h2> <fieldset> <label for=\"{{baseClass}}-document-target\"> <input id=\"{{baseClass}}-document-target\" name=\"blank\" type=\"checkbox\" /> <span>tr('linkTypeDocumentNewWindowLabel')</span> </label> </fieldset> tr('linkTypeDocumentInfo')",
    "link.email": "<h2>tr('linkTypeEmailHeader')</h2> <fieldset class=\"{{baseClass}}-email\"> <label for=\"{{baseClass}}-email\">tr('linkTypeEmailToLabel')</label> <input id=\"{{baseClass}}-email\" name=\"email\" type=\"text\" placeholder=\"tr('linkTypeEmailToPlaceHolder')\"/> </fieldset> <fieldset class=\"{{baseClass}}-email\"> <label for=\"{{baseClass}}-email-subject\">tr('linkTypeEmailSubjectLabel')</label> <input id=\"{{baseClass}}-email-subject\" name=\"subject\" type=\"text\" placeholder=\"tr('linkTypeEmailSubjectPlaceHolder')\"/> </fieldset>",
    "link.error": "<div style=\"display:none\" class=\"ui-widget {{baseClass}}-error-message {{messageClass}}\"> <div class=\"ui-state-error ui-corner-all\"> <p> <span class=\"ui-icon ui-icon-alert\"></span> {{message}} </p> </div> </div>",
    "link.external": "<h2>tr('linkTypeExternalHeader')</h2> <fieldset> <label for=\"{{baseClass}}-external-href\">tr('linkTypeExternalLocationLabel')</label> <input id=\"{{baseClass}}-external-href\" value=\"http://\" name=\"location\" class=\"{{baseClass}}-external-href\" type=\"text\" placeholder=\"tr('linkTypeExternalLocationPlaceHolder')\" /> </fieldset> <h2>tr('linkTypeExternalNewWindowHeader')</h2> <fieldset> <label for=\"{{baseClass}}-external-target\"> <input id=\"{{baseClass}}-external-target\" name=\"blank\" type=\"checkbox\" /> <span>tr('linkTypeExternalNewWindowLabel')</span> </label> </fieldset> tr('linkTypeExternalInfo')",
    "link.file-url": "<h2>tr('Link to a document or other file')</h2> <fieldset> <label for=\"{{baseClass}}-external-href\">tr('Location')</label> <input id=\"{{baseClass}}-external-href\" value=\"http://\" name=\"location\" class=\"{{baseClass}}-external-href\" type=\"text\" placeholder=\"tr('Enter your URL')\" /> </fieldset> <h2>tr('New window')</h2> <fieldset> <label for=\"{{baseClass}}-external-target\"> <input id=\"{{baseClass}}-external-target\" name=\"blank\" type=\"checkbox\" /> <span>tr('Check this box to have the file open in a new browser window')</span> </label> </fieldset> <h2>tr('Not sure what to put in the box above?')</h2> <ol> <li>tr('Ensure the file has been uploaded to your website')</li> <li>tr('Open the uploaded file in your browser')</li> <li>tr(\"Copy the file's URL from your browser's address bar and paste it into the box above\")</li> </ol>",
    "link.internal": "<h2>tr('linkTypeInternalHeader')</h2> <fieldset> <label for=\"{{baseClass}}-internal-href\">tr('linkTypeInternalLocationLabel') {{domain}}</label> <input id=\"{{baseClass}}-internal-href\" value=\"\" name=\"location\" class=\"{{baseClass}}-internal-href\" type=\"text\" placeholder=\"tr('linkTypeInternalLocationPlaceHolder')\" /> </fieldset> <h2>tr('linkTypeInternalNewWindowHeader')</h2> <fieldset> <label for=\"{{baseClass}}-internal-target\"> <input id=\"{{baseClass}}-internal-target\" name=\"blank\" type=\"checkbox\" /> <span>tr('linkTypeInternalNewWindowLabel')</span> </label> </fieldset> tr('linkTypeInternalInfo')",
    "link.label": "<label> <input type=\"radio\" name=\"link-type\" autocomplete=\"off\"/> <span>{{label}}</span> </label>",
    "paste.dialog": "<div class=\"{{baseClass}}-panel ui-dialog-content ui-widget-content\"> <div class=\"{{baseClass}}-panel-tabs ui-tabs ui-widget ui-widget-content ui-corner-all\"> <ul class=\"ui-tabs-nav ui-helper-reset ui-helper-clearfix ui-widget-header ui-corner-all\"> <li class=\"{{baseClass}}-tab-formatted-clean ui-state-default ui-corner-top ui-state-active ui-tabs-selected\" style=\"display: none\"><a>tr('pasteDialogFormattedCleaned')</a></li> <li class=\"{{baseClass}}-tab-plain-text ui-state-default ui-corner-top\" style=\"display: none\"><a>tr('pasteDialogPlain')</a></li> <li class=\"{{baseClass}}-tab-formatted-unclean ui-state-default ui-corner-top\" style=\"display: none\"><a>tr('pasteDialogFormattedUnclean')</a></li> <li class=\"{{baseClass}}-tab-source ui-state-default ui-corner-top\" style=\"display: none\"><a>tr('pasteDialogSource')</a></li> </ul> <div class=\"{{baseClass}}-content-formatted-clean\" style=\"display: none\"> <div contenteditable=\"true\" class=\"{{baseClass}}-area {{baseClass}}-markup\"></div> </div> <div class=\"{{baseClass}}-content-plain-text\" style=\"display: none\"> <textarea class=\"{{baseClass}}-area {{baseClass}}-plain\"></textarea> </div> <div class=\"{{baseClass}}-content-formatted-unclean\" style=\"display: none\"> <div contenteditable=\"true\" class=\"{{baseClass}}-area {{baseClass}}-rich\"></div> </div> <div class=\"{{baseClass}}-content-source\" style=\"display: none\"> <textarea class=\"{{baseClass}}-area {{baseClass}}-source\"></textarea> </div> </div> </div>",
    "snippet-menu.item": "<li><a data-name=\"{{name}}\">{{name}}</a></li>",
    "special-characters.dialog": "<div> tr('specialCharactersHelp') <br/> <ul></ul> </div>",
    "special-characters.tab-button": "<button data-setKey=\"{{setKey}}\" data-charactersIndex=\"{{charactersIndex}}\" title=\"{{description}}\">{{htmlEntity}}</button>",
    "special-characters.tab-content": "<div id=\"{{baseClass}}-{{key}}\"></div>",
    "special-characters.tab-li": "<li><a href=\"#{{baseClass}}-{{key}}\">{{name}}</a></li>",
    "statistics.dialog": "<div> <ul> <li data-name=\"characters\"></li> <li data-name=\"words\"></li> <li data-name=\"sentences\"></li> <li data-name=\"truncation\"></li> </ul> </div>",
    "table.create-menu": "<table class=\"{{baseClass}}-menu\"> <tr> <td></td> <td></td> <td></td> <td></td> <td></td> <td></td> <td></td> <td></td> </tr> <tr> <td></td> <td></td> <td></td> <td></td> <td></td> <td></td> <td></td> <td></td> </tr> <tr> <td></td> <td></td> <td></td> <td></td> <td></td> <td></td> <td></td> <td></td> </tr> <tr> <td></td> <td></td> <td></td> <td></td> <td></td> <td></td> <td></td> <td></td> </tr> <tr> <td></td> <td></td> <td></td> <td></td> <td></td> <td></td> <td></td> <td></td> </tr> <tr> <td></td> <td></td> <td></td> <td></td> <td></td> <td></td> <td></td> <td></td> </tr> <tr> <td></td> <td></td> <td></td> <td></td> <td></td> <td></td> <td></td> <td></td> </tr> <tr> <td></td> <td></td> <td></td> <td></td> <td></td> <td></td> <td></td> <td></td> </tr> </table>",
    "tag-menu.menu": "<li><a data-value=\"na\">tr('tagMenuTagNA')</a></li> <li><a data-value=\"p\">tr('tagMenuTagP')</a></li> <li><a data-value=\"h1\">tr('tagMenuTagH1')</a></li> <li><a data-value=\"h2\">tr('tagMenuTagH2')</a></li> <li><a data-value=\"h3\">tr('tagMenuTagH3')</a></li> <li><a data-value=\"h4\">tr('tagMenuTagH4')</a></li> <li><a data-value=\"div\">tr('tagMenuTagDiv')</a></li> <li><a data-value=\"pre\">tr('tagMenuTagPre')</a></li> <li><a data-value=\"address\">tr('tagMenuTagAddress')</a></li>",
    "unsaved-edit-warning.warning": "<div class=\"{{baseClass}} ui-corner-tl\"> <span class=\"ui-icon ui-icon-alert\"></span> <span>tr('unsavedEditWarningText')</span> </div>",
    "view-source.dialog": "<div class=\"{{baseClass}}-inner-wrapper\"> <textarea></textarea> </div>"
 };

function templateRegister(name, content) {
    templateCache[name] = content;
}

function templateGet(name) {
    return templateCache[name];
};

/**
 *
 * @param {type} template
 * @param {type} variables
 * @returns {unresolved}
 */
function templateConvertTokens(template, variables) {
    // Translate template
    template = template.replace(/tr\(['"]{1}(.*?)['"]{1}\)/g, function(match, key) {
        key = key.replace(/\\(.?)/g, function (s, slash) {
            switch (slash) {
                case '\\': {
                    return '\\';
                }
                case '0': {
                    return '\u0000';
                }
                case '': {
                    return '';
                }
                default: {
                    return slash;
                }
            }
        });
        return tr(key);
    });

    // Replace variables
    variables = $.extend({}, this.options, variables || {});
    variables = templateGetVariables(variables);
    template = template.replace(/\{\{(.*?)\}\}/g, function(match, variable) {
        // <debug/>
        return variables[variable];
    });

    return template;
};

/**
 *
 * @param {type} variables
 * @param {type} prefix
 * @param {type} depth
 * @returns {unresolved}
 */
function templateGetVariables(variables, prefix, depth) {
    prefix = prefix ? prefix + '.' : '';
    var maxDepth = 5;
    if (!depth) depth = 1;
    var result = {};
    for (var name in variables) {
        if (typeof variables[name] === 'object' && depth < maxDepth) {
            var inner = templateGetVariables(variables[name], prefix + name, ++depth);
            for (var innerName in inner) {
                result[innerName] = inner[innerName];
            }
        } else {
            result[prefix + name] = variables[name];
        }
    }
    return result;
};
;
// File end: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-common/template.js
;
// File start: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-common/toolbar.js
function toolbarLayout(pluggable, uiOrder, panelElement, pluginAttributes) {
    panelElement = $(panelElement || document.createElement('div'));
    // Loop the UI component order option
    for (var i = 0, l = uiOrder.length; i < l; i++) {
        var uiGroupContainer = $('<div/>')
            .addClass('raptor-layout-toolbar-group');

        // Loop each UI in the group
        var uiGroup = uiOrder[i];
        for (var ii = 0, ll = uiGroup.length; ii < ll; ii++) {
            // <strict/>
            var pluginOptions = pluggable.plugins[uiGroup[ii]];
            if (pluginOptions === false) {
                continue;
            }

            var component = pluginPrepare(pluggable, pluggable.plugins[uiGroup[ii]], pluginOptions, pluginAttributes);

            pluggable.pluginInstances[uiGroup[ii]] = component.instance;

            if (typeIsElement(component.ui)) {
                // Fix corner classes
                component.ui.removeClass('ui-corner-all');

                // Append the UI object to the group
                uiGroupContainer.append(component.ui);
            }
        }

        // Append the UI group to the editor toolbar
        if (uiGroupContainer.children().length > 0) {
            uiGroupContainer.appendTo(panelElement);
        }
    }

    // Fix corner classes
    panelElement.find('.ui-button:first-child').addClass('ui-corner-left');
    panelElement.find('.ui-button:last-child').addClass('ui-corner-right');
    return panelElement[0];
};
;
// File end: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-common/toolbar.js
;
// File start: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-common/types.js
/**
 * @fileOverview Type checking functions.
 * @license http://www.raptor-editor.com/license
 *
 * @author Michael Robinson michael@panmedia.co.nz
 * @author David Neilsen david@panmedia.co.nz
 */

/**
 * Determine whether object is a number
 * {@link http://stackoverflow.com/a/1421988/187954}.
 *
 * @param  {mixed} object The object to be tested
 * @return {Boolean} True if the object is a number.
 */
function typeIsNumber(object) {
    return !isNaN(object - 0) && object !== null;
}

/**
 * Determines whether object is a string.
 *
 * @param {mixed} object The object to be tested.
 * @returns {Boolean} True if the object is a string.
 */
function typeIsString(object) {
    return typeof object === 'string';
}

/**
 * @param  {mixed} object
 * @return {boolean} True if object is an Array.
 */
function typeIsArray(object) {
    return object instanceof Array;
}

/**
 * Determines whether object is a node.
 *
 * @param {mixed} object The object to be tested.
 * @returns {Boolean} True if the object is a node.
 */
function typeIsNode(object) {
    return object instanceof Node;
}

/**
 * @param  {mixed} object
 * @return {boolean} True if object is a text node.
 */
function typeIsTextNode(object) {
    if (typeIsNode(object)) {
        return object.nodeType === Node.TEXT_NODE;
    }

    if (typeIsElement(object)) {
        return typeIsNode(object[0]);
    }

    return false;
}

/**
 * Determines whether object is a jQuery element.
 *
 * @param {mixed} object The object to be tested.
 * @returns {Boolean} True if the object is a jQUery element.
 */
function typeIsElement(object) {
    return object instanceof jQuery;
}

function typeIsJQueryCompatible(object) {
    return object instanceof Node || object instanceof NodeList || object instanceof HTMLCollection || object instanceof jQuery;
};
// File end: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-common/types.js
;
// File start: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-locales/en.js
/**
 * @fileOverview English strings file.
 * @license http://www.raptor-editor.com/license
 *
 * @author David Neilsen <david@panmedia.co.nz>
 * @author Michael Robinson <michael@panmedia.co.nz>
 */
extendLocale('en', 'English', {
    alignCenterTitle: 'Align text center',
    alignJustifyTitle: 'Align text justify',
    alignLeftTitle: 'Align text left',
    alignRightTitle: 'Align text right',

    cancelDialogCancelButton: 'Continue Editing',
    cancelDialogContent: 'Are you sure you want to cancel editing? All changes will be lost!',
    cancelDialogOKButton: 'Cancel Editing',
    cancelDialogTitle: 'Cancel Editing',
    cancelTitle: 'Cancel editing',

    classMenuTitle: 'Style picker',
    clearFormattingTitle: 'Clear formatting',
    clickButtonToEditText: 'Edit',
    clickButtonToEditTitle: null,

    closeTitle: 'Close this toolbar',

    colorMenuBasicAutomatic: 'Automatic',
    colorMenuBasicBlack: 'Black',
    colorMenuBasicBlue: 'Blue',
    colorMenuBasicGreen: 'Green',
    colorMenuBasicGrey: 'Grey',
    colorMenuBasicOrange: 'Orange',
    colorMenuBasicPurple: 'Purple',
    colorMenuBasicRed: 'Red',
    colorMenuBasicTitle: 'Change text color',
    colorMenuBasicWhite: 'White',

    dockToElementTitle: 'Dock/undock editor to element',
    dockToScreenTitle: 'Dock/undock editor to screen',

    embedTitle: 'Embed object',
    embedDialogTitle: 'Embed Object',
    embedDialogTabCode: 'Embed Code',
    embedDialogTabCodeContent: 'Paste your embed code into the text area below:',
    embedDialogTabPreview: 'Preview',
    embedDialogTabPreviewContent: 'A preview of your embedded object is displayed below:',
    embedDialogOKButton: 'Embed Object',
    embedDialogCancelButton: 'Cancel',

    errorUINoName: 'UI "{{ui}}" is invalid (must have a name property)',
    errorUINotObject: 'UI "{{ui}}" is invalid (must be an object)',
    errorUIOverride: 'UI "{{name}}" has already been registered, and will be overwritten',

    floatLeftTitle: 'Align image to the left',
    floatNoneTitle: 'Remove image align',
    floatRightTitle: 'Align image to the right',

    fontFamilyMenuTitle: 'Choose your font',
    fontFamilyMenuFontDefault: 'Default Font',
    fontFamilyMenuFontArial: 'Arial',
    fontFamilyMenuFontPalatino: 'Palatino',
    fontFamilyMenuFontGeorgia: 'Georgia',
    fontFamilyMenuFontTimes: 'Times New Roman',
    fontFamilyMenuFontComicSans: 'Comic Sans',
    fontFamilyMenuFontImpact: 'Impact',
    fontFamilyMenuFontCourier: 'Courier New',

    guidesTitle: 'Show element guides',

    historyRedoTitle: 'Redo',
    historyUndoTitle: 'Undo',

    hrCreateTitle: 'Insert Horizontal Rule',

    imageResizeDialogWidth: 'Image width',
    imageResizeDialogHeight: 'Image height',
    imageResizeDialogWidthPlaceHolder: 'Width',
    imageResizeDialogHeightPlaceHolder: 'Height',
    imageResizeDialogTitle: 'Resize Image',
    imageResizeDialogOKButton: 'Resize',
    imageResizeDialogCancelButton: 'Cancel',
    imageResizeTitle: 'Resize this image',

    insertFileTitle: 'Insert file',
    insertFileDialogTitle: 'Insert file',
    insertFileDialogOKButton: 'Insert file',
    insertFileDialogCancelButton: 'Cancel',
    insertFileURLLabel: 'File URL',
    insertFileNameLabel: 'File Name',
    insertFileURLPlaceHolder: 'File URL...',
    insertFileNamePlaceHolder: 'File Name...',

    languageMenuTitle: 'Change Language',

    loremIpsumTitle: 'Insert dummy text for testing',

    listOrderedTitle: 'Ordered list',
    listUnorderedTitle: 'Unordered list',

    linkCreateTitle: 'Insert Link',
    linkRemoveTitle: 'Remove Link',

    linkCreateDialogTitle: 'Insert Link',
    linkCreateDialogOKButton: 'Insert Link',
    linkCreateDialogCancelButton: 'Cancel',
    linkCreateDialogMenuHeader: 'Choose a link type',

    linkTypeEmailLabel: 'Email address',
    linkTypeEmailHeader: 'Link to an email address',
    linkTypeEmailToLabel: 'Email:',
    linkTypeEmailToPlaceHolder: 'Enter email address',
    linkTypeEmailSubjectLabel: 'Subject (optional):',
    linkTypeEmailSubjectPlaceHolder: 'Enter subject',

    linkTypeExternalLabel: 'Page on another website',
    linkTypeExternalHeader: 'Link to a page on another website',
    linkTypeExternalLocationLabel: 'Location:',
    linkTypeExternalLocationPlaceHolder: 'Enter a URL',
    linkTypeExternalNewWindowHeader: 'New window',
    linkTypeExternalNewWindowLabel: 'Check this box to have the link open in a new browser window/tab.',
    linkTypeExternalInfo:
        '<h2>Not sure what to put in the box above?</h2>' +
        '<ol>' +
        '    <li>Find the page on the web you want to link to.</li>' +
        '    <li>Copy the web address from your browser\'s address bar and paste it into the box above.</li>' +
        '</ol>',

    linkTypeDocumentLabel: 'Document or other file',
    linkTypeDocumentHeader: 'Link to a document or other file',
    linkTypeDocumentLocationLabel: 'Location:',
    linkTypeDocumentLocationPlaceHolder: 'Enter a URL',
    linkTypeDocumentNewWindowHeader: 'New window',
    linkTypeDocumentNewWindowLabel: 'Check this box to have the file open in a new browser window/tab.',
    linkTypeDocumentInfo:
        '<h2>Not sure what to put in the box above?</h2>' +
        '<ol>' +
        '    <li>Ensure the file has been uploaded to your website.</li>' +
        '    <li>Open the uploaded file in your browser.</li>' +
        '    <li>Copy the file\'s URL from your browser\'s address bar and paste it into the box above.</li>' +
        '</ol>',

    linkTypeInternalLabel: 'Page on this website',
    linkTypeInternalHeader: 'Link to a page on this website',
    linkTypeInternalLocationLabel: '',
    linkTypeInternalLocationPlaceHolder: 'Enter a URI',
    linkTypeInternalNewWindowHeader: 'New window',
    linkTypeInternalNewWindowLabel: 'Check this box to have the link open in a new browser window/tab.',
    linkTypeInternalInfo:
        '<h2>Not sure what to put in the box above?</h2>' +
        '<ol>' +
        '    <li>Find the page on this site link to.</li>' +
        '    <li>Copy the web address from your browser\'s address bar, excluding "{{domain}}" and paste it into the box above.</li>' +
        '</ol>',

    logoTitle: 'Learn More About the Raptor WYSIWYG Editor',

    navigateAway: '\nThere are unsaved changes on this page. \nIf you navigate away from this page you will lose your unsaved changes',

    pasteDialogTitle: 'Paste',
    pasteDialogOKButton: 'Insert',
    pasteDialogCancelButton: 'Cancel',
    pasteDialogPlain: 'Plain Text',
    pasteDialogFormattedCleaned: 'Formatted &amp; Cleaned',
    pasteDialogFormattedUnclean: 'Formatted Unclean',
    pasteDialogSource: 'Source Code',

    placeholderPluginDefaultContent: '<br/>',

    saveTitle: 'Save content',
    saveNotConfigured: 'Save has not been configured, or is disabled.',
    saveJsonFail: 'Failed to save {{failed}} content block(s)',
    saveJsonSaved: 'Successfully saved {{saved}} content block(s).',
    saveRestFail: 'Failed to save {{failed}} content block(s).',
    saveRestPartial: 'Saved {{saved}} out of {{failed}} content blocks.',
    saveRestSaved: 'Successfully saved {{saved}} content block(s).',

    snippetMenuTitle: 'Snippets',

    specialCharactersArrows: 'Arrows',
    specialCharactersDialogOKButton: 'OK',
    specialCharactersDialogTitle: 'Insert Special Characters',
    specialCharactersGreekAlphabet: 'Greek Alphabet',
    specialCharactersHelp: 'Click a special character to add it. Click "OK" when done to close this dialog',
    specialCharactersMathematics: 'Mathematics',
    specialCharactersSymbols: 'Symbols',
    specialCharactersTitle: 'Insert a special character',

    statisticsButtonCharacterOverLimit: '{{charactersRemaining}} characters over limit',
    statisticsButtonCharacterRemaining: '{{charactersRemaining}} characters remaining',
    statisticsButtonCharacters: '{{characters}} characters',
    statisticsDialogCharactersOverLimit: '{{characters}} characters, {{charactersRemaining}} over the recommended limit',
    statisticsDialogCharactersRemaining: '{{characters}} characters, {{charactersRemaining}} remaining',
    statisticsDialogNotTruncated: 'Content will not be truncated',
    statisticsDialogOKButton: 'Ok',
    statisticsDialogSentence: '{{sentences}} sentence',
    statisticsDialogSentences: '{{sentences}} sentences',
    statisticsDialogTitle: 'Content Statistics',
    statisticsDialogTruncated: 'Content contains more than {{limit}} characters and may be truncated',
    statisticsDialogWord: '{{words}} word',
    statisticsDialogWords: '{{words}} words',
    statisticsTitle: 'Click to view statistics',

    imageSwapTitle: 'Swap this image',

    tableCreateTitle: 'Create table',
    tableDeleteColumnTitle: 'Delete table column',
    tableDeleteRowTitle: 'Delete table row',
    tableInsertColumnTitle: 'Insert table column',
    tableInsertRowTitle: 'Insert table row',
    tableMergeCellsTitle: 'Merge table cells',
    tableSplitCellsTitle: 'Split table cells',

    tagMenuTagH1: 'Heading&nbsp;1',
    tagMenuTagH2: 'Heading&nbsp;2',
    tagMenuTagH3: 'Heading&nbsp;3',
    tagMenuTagH4: 'Heading&nbsp;4',
    tagMenuTagNA: 'N/A',
    tagMenuTagP: 'Paragraph',
    tagMenuTagDiv: 'Div',
    tagMenuTagPre: 'Pre-formatted',
    tagMenuTagAddress: 'Address',
    tagMenuTitle: 'Change element style',

    tagTreeElementLink: 'Select {{element}} element',
    tagTreeElementTitle: 'Click to select the contents of the "{{element}}" element',
    tagTreeRoot: 'root',
    tagTreeRootLink: 'Select all editable content',
    tagTreeRootTitle: 'Click to select all editable content',

    textBlockQuoteTitle: 'Block quote',
    textBoldTitle: 'Bold',
    textItalicTitle: 'Italic',
    textStrikeTitle: 'Strike through',
    textSubTitle: 'Sub-script',
    textSuperTitle: 'Super-script',
    textUnderlineTitle: 'Underline',
    textSizeDecreaseTitle: 'Decrease text size',
    textSizeIncreaseTitle: 'Increase text size',

    unsavedEditWarningText: 'There are unsaved changes on this page',

    revisionsText: 'Revisions',
    revisionsTextEmpty: 'No Revisions',
    revisionsTitle: null,
    revisionsCreated: 'Created',
    revisionsApplyButtonTitle: 'Rollback',
    revisionsApplyButtonText: 'Rollback',
    revisionsAJAXFailed: 'Failed to retrieve revisions',
    revisionsApplyButtonDialogCancelButton: 'Cancel',
    revisionsApplyButtonDialogOKButton: 'Rollback',
    revisionsApplyButtonDialogTitle: 'Rollback Confirmation',
    revisionsApplyDialogContent: 'This will replace the current content with the selected revision.<br/>The current content will be added as a revision, and will be visible in the revisions list for this block.',
    revisionsDialogCancelButton: 'Cancel',
    revisionsDialogTitle: 'View content revisions',
    revisionsButtonCurrent: 'Current',
    revisionsButtonViewDiffText: 'Differences',
    revisionsButtonViewDiffTitle: null,
    revisionsDiffButtonDialogCancelButton: 'Close',
    revisionsDiffButtonDialogTitle: 'View differences',
    revisionsDiffButtonTitle: 'View differences',
    revisionsDiffButtonText: 'View differences',
    revisionsLoading: 'Loading revisions...',
    revisionsNone: 'No revisions for this element',
    revisionsPreviewButtonTitle: 'Preview',
    revisionsPreviewButtonText: 'Preview',

    fileManagerDialogTitle: 'File Manager',
    fileManagerTitle: 'File Manager',
    rfmClose: 'Close',
    rfmContinue: 'Continue',
    rfmDeleteTitle: 'Delete',
    rfmDownloadTitle: 'Download',
    rfmEditTitle: 'Edit',
    rfmFileActions: 'Actions',
    rfmFileModificationTime: 'Modified',
    rfmFileName: 'Name',
    rfmFileSize: 'Size',
    rfmFileType: 'Type',
    rfmFilteredTotal: 'Showing {{start}} to {{end}} of {{filteredTotal}} files',
    rfmFirst: 'First',
    rfmHeadingDirectories: 'Directories',
    rfmHeadingSearch: 'Search',
    rfmHeadingTags: 'Tags',
    rfmHeadingUpload: 'Upload',
    rfmInsertTitle: 'Insert',
    rfmLast: 'Last',
    rfmRenameTitle: 'Rename',
    rfmSearch: 'Go',
    rfmTagDocument: 'Document',
    rfmTagImage: 'Image',
    rfmTotal: ', filtered from {{total}}',
    rfmUpload: 'Upload',
    rfmUploadBrowse: 'Browse',
    rfmUploadDrop: 'Drop Files Here',
    rfmUploadFileRemove: 'Remove',
    rfmUploadOr: 'or',
    rfmViewTitle: 'View',

    imageEditorDialogCancelButton: 'Cancel',
    imageEditorDialogOKButton: 'Save',
    imageEditorDialogTitle: 'Image Editor',
    imageEditorTitle: 'Edit Image',
    rieApply: 'Apply',
    rieBlurTitle: 'Blur',
    rieBrightnessTitle: 'Brightness/Contrast',
    rieCancel: 'Cancel',
    rieCancelTitle: 'Cancel',
    rieColorAdjustTitle: 'Adjsut Color',
    rieCropTitle: 'Crop',
    rieDesaturateTitle: 'Desaturate',
    rieFlipHTitle: 'Flip Horizontally',
    rieFlipVTitle: 'Flip Vertically',
    rieGlowTitle: 'Glow',
    rieHslTitle: 'Hue, Saturation, Lightness.',
    rieInvertTitle: 'Invert',
    riePosterizeTitle: 'Posterize',
    rieRedoTitle: 'Redo',
    rieRemoveNoiseTitle: 'Remove Noise',
    rieResizeTitle: 'Resize',
    rieRevertTitle: 'Revert',
    rieRotateLeftTitle: 'Rotate Left',
    rieRotateRightTitle: 'Rotate Right',
    rieSaveTitle: 'Save',
    rieSaveTitle: 'Save',
    rieSepiaTitle: 'Sepia',
    rieSharpenTitle: 'Sharpen',
    rieSolarizeTitle: 'Solarize',
    rieUndoTitle: 'Undo',
    rieUploadTitle: 'Upload',

    rieActionColorAdjustRed: 'Red',
    rieActionColorAdjustGreen: 'Green',
    rieActionColorAdjustBlue: 'Blue',
    rieActionBrightnessBrightness: 'Brightness',
    rieActionBrightnessContrast: 'Contrast',
    rieActionGlowAmount: 'Glow Amount',
    rieActionGlowRadius: 'Glow Radius',
    rieActionHsl: 'Hue',
    rieActionHsl: 'Saturation',
    rieActionHsl: 'Lightness',
    rieActionPosterize: 'Levels',

    viewSourceDialogCancelButton: 'Close',
    viewSourceDialogOKButton: 'Apply source code',
    viewSourceDialogTitle: 'Content source code',
    viewSourceTitle: 'View/edit source code'
});
;
// File end: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-locales/en.js
;
// File start: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-locales/pl.js
/**
 * @fileOverview Polish strings file.
 * @license http://www.raptor-editor.com/license
 *
 * Note: this file was automatically translated and may not be 100% correct.
 *
 * @author David Neilsen <david@panmedia.co.nz>
 */
extendLocale('pl', 'Polski', {
    alignCenterTitle: "Wyrównać tekst centrum",
    alignJustifyTitle: "Wyrównać tekst uzasadnienia",
    alignLeftTitle: "Wyrównaj tekst do lewej",
    alignRightTitle: "Wyrównaj tekst do prawej",
    cancelDialogCancelButton: "Kontynuuj edycję",
    cancelDialogContent: "Czy na pewno chcesz anulować edycję? Wszystkie zmiany zostaną utracone!",
    cancelDialogOKButton: "Anulowanie edycji",
    cancelDialogTitle: "Anulowanie edycji",
    cancelTitle: "Anulowanie edycji",
    classMenuTitle: "Selektor stylu",
    clearFormattingTitle: "Wyczyść formatowanie",
    clickButtonToEditText: "Edycja",
    clickButtonToEditTitle: "",
    colorMenuBasicAutomatic: "Automatyczne",
    colorMenuBasicBlack: "Czarny",
    colorMenuBasicBlue: "Niebieski",
    colorMenuBasicGreen: "Zielony",
    colorMenuBasicGrey: "Szary",
    colorMenuBasicOrange: "Orange",
    colorMenuBasicPurple: "Fioletowy",
    colorMenuBasicRed: "Czerwony",
    colorMenuBasicTitle: "Zmienianie koloru tekstu",
    colorMenuBasicWhite: "Biały",
    dockToElementTitle: "Dok\/oddokować edytor do elementu",
    dockToScreenTitle: "Dok\/oddokować edytor do ekranu",
    embedDialogCancelButton: "Anuluj",
    embedDialogOKButton: "Osadzić obiekt",
    embedDialogTabCode: "Osadzić kod",
    embedDialogTabCodeContent: "Wklej kod HTML w polu tekstowym poniżej:",
    embedDialogTabPreview: "Podgląd",
    embedDialogTabPreviewContent: "Podgląd obiektu osadzonego jest wyświetlany poniżej:",
    embedDialogTitle: "Osadzić obiekt",
    embedTitle: "Osadzić obiekt",
    errorUINoName: "UI \"{{ui}}\" jest nieprawidłowy (musi mieć Właściwość name)",
    errorUINotObject: "UI \"{{ui}}\" jest nieprawidłowy (musi być obiektem)",
    errorUIOverride: "UI \"{{name}}\" została już zarejestrowana i zostaną zastąpione",
    fileManagerDialogTitle: "Menedżer plików",
    fileManagerTitle: "Menedżer plików",
    floatLeftTitle: "Wyrównanie obrazu w lewo",
    floatNoneTitle: "Usuń obraz wyrównać",
    floatRightTitle: "Wyrównanie obrazu w prawo",
    fontFamilyMenuFontArial: "Arial",
    fontFamilyMenuFontComicSans: "Komiks bez",
    fontFamilyMenuFontCourier: "Nowy Kurier",
    fontFamilyMenuFontDefault: "Domyślna czcionka",
    fontFamilyMenuFontGeorgia: "Gruzja",
    fontFamilyMenuFontImpact: "Wpływ",
    fontFamilyMenuFontPalatino: "Palatyn",
    fontFamilyMenuFontTimes: "Times New Roman",
    fontFamilyMenuTitle: "Wybierz czcionki",
    guidesTitle: "Pokaż element przewodników",
    historyRedoTitle: "Wykonaj ponownie",
    historyUndoTitle: "Cofnij",
    hrCreateTitle: "Wstaw pozioma",
    imageResizeButtonDialogCancelButton: "Anuluj",
    imageResizeButtonDialogHeight: "Wysokość obrazu",
    imageResizeButtonDialogHeightPlaceHolder: "Wysokość",
    imageResizeButtonDialogOKButton: "Zmiana rozmiaru",
    imageResizeButtonDialogTitle: "Rozmiar obrazu",
    imageResizeButtonDialogWidth: "Szerokość obrazu",
    imageResizeButtonDialogWidthPlaceHolder: "Szerokość",
    imageResizeButtonText: "Rozmiar obrazu",
    insertFileDialogCancelButton: "Anuluj",
    insertFileDialogOKButton: "Wstaw plik",
    insertFileNameLabel: "Nazwa pliku",
    insertFileNamePlaceHolder: "Nazwa pliku...",
    insertFileTitle: "Wstaw plik",
    insertFileURLLabel: "Adres URL pliku",
    insertFileURLPlaceHolder: "Adres URL pliku...",
    languageMenuTitle: "Zmień język",
    linkCreateDialogCancelButton: "Anuluj",
    linkCreateDialogMenuHeader: "Wybierz typ łącza",
    linkCreateDialogOKButton: "Wstaw Link",
    linkCreateDialogTitle: "Wstaw Link",
    linkCreateTitle: "Wstaw Link",
    linkRemoveTitle: "Usuń Link",
    linkTypeDocumentHeader: "Link do dokumentu lub inny plik",
    linkTypeDocumentInfo: "<h2>Nie wiesz, co należy umieścić w polu powyżej?<\/h2><ol>    <li>Upewnij się, że plik został przesłany do Twojej witryny.<\/li>    <li>Otwórz plik przesłane w przeglądarce.<\/li>    <li>Skopiuj adres URL pliku z paska adresu przeglądarki i wklej go w polu powyżej.<\/li><\/ol>",
    linkTypeDocumentLabel: "Dokument lub inny plik",
    linkTypeDocumentLocationLabel: "Lokalizacja:",
    linkTypeDocumentLocationPlaceHolder: "Wprowadź adres URL",
    linkTypeDocumentNewWindowHeader: "Nowe okno",
    linkTypeDocumentNewWindowLabel: "Zaznacz to pole aby plik jest otwarty w przeglądarce nowe okno\/kartę.",
    linkTypeEmailHeader: "Link do adresu e-mail",
    linkTypeEmailLabel: "Adres e-mail",
    linkTypeEmailSubjectLabel: "Temat (opcjonalne):",
    linkTypeEmailSubjectPlaceHolder: "Wpisz temat",
    linkTypeEmailToLabel: "Adres e-mail:",
    linkTypeEmailToPlaceHolder: "Wpisz adres e-mail",
    linkTypeExternalHeader: "Link do strony na innej stronie internetowej",
    linkTypeExternalInfo: "<h2>Nie wiesz, co należy umieścić w polu powyżej?<\/h2><ol>    <li>Znajdź stronę sieci web, którą chcesz się połączyć.<\/li>    <li>Skopiuj adres internetowy z paska adresu przeglądarki i wklej go w polu powyżej.<\/li><\/ol>",
    linkTypeExternalLabel: "Strony na innej stronie internetowej",
    linkTypeExternalLocationLabel: "Lokalizacja:",
    linkTypeExternalLocationPlaceHolder: "Wprowadź adres URL",
    linkTypeExternalNewWindowHeader: "Nowe okno",
    linkTypeExternalNewWindowLabel: "Zaznacz to pole, aby otworzyć nowe okno przeglądarki\/karcie link.",
    linkTypeInternalHeader: "Link do strony na tej stronie",
    linkTypeInternalInfo: "<h2>Nie wiesz, co należy umieścić w polu powyżej?<\/h2><ol>    <li>Znajdź strony na tej stronie link do.<\/li>    <li>Skopiuj adres www z przeglądarki adres baru, z wyjątkiem \"{{domain}}\" i wklej go w polu powyżej.<\/li><\/ol>",
    linkTypeInternalLabel: "Na stronie tej witryny",
    linkTypeInternalLocationLabel: "",
    linkTypeInternalLocationPlaceHolder: "Podaj identyfikator URI",
    linkTypeInternalNewWindowHeader: "Nowe okno",
    linkTypeInternalNewWindowLabel: "Zaznacz to pole, aby otworzyć nowe okno przeglądarki\/karcie link.",
    listOrderedTitle: "Uporządkowana lista",
    listUnorderedTitle: "Lista nieuporządkowana",
    logoTitle: "Dowiedz się więcej o edytorze WYSIWYG Raptor",
    loremIpsumTitle: "Wstawianie tekstu manekina do testów",
    navigateAway: "\nNa tej stronie są niezapisane zmiany. \nJeśli można przejść od tej strony stracisz niezapisane zmiany",
    pasteDialogCancelButton: "Anuluj",
    pasteDialogFormattedCleaned: "Sformatowany i oczyszczone",
    pasteDialogFormattedUnclean: "Sformatowany nieczyste",
    pasteDialogOKButton: "Wstaw",
    pasteDialogPlain: "Zwykły tekst",
    pasteDialogSource: "Kod źródłowy",
    pasteDialogTitle: "Wklej",
    placeholderPluginDefaultContent: "",
    revisionsAJAXFailed: "Nie można pobrać wersje",
    revisionsApplyButtonDialogCancelButton: "Anuluj",
    revisionsApplyButtonDialogOKButton: "Wycofywanie",
    revisionsApplyButtonDialogText: "Potwierdzenie wycofania",
    revisionsApplyButtonDialogTitle: "Potwierdzenie wycofania",
    revisionsApplyButtonText: "Wycofywanie",
    revisionsApplyButtonTitle: "Wycofywanie",
    revisionsApplyDialogContent: "Spowoduje to zastąpienie aktualnej treści z wybranej wersji.<br>Zawartość bieżącego zostaną dodane jako zmianę i będzie widoczna na liście poprawki dla tego bloku.",
    revisionsButtonCurrent: "Prąd",
    revisionsButtonViewDiffText: "Różnice",
    revisionsButtonViewDiffTitle: "",
    revisionsCreated: "Stworzony",
    revisionsDialogCancelButton: "Anuluj",
    revisionsDialogTitle: "Zobacz treść poprawki",
    revisionsDiffButtonDialogCancelButton: "Zamknij",
    revisionsDiffButtonDialogTitle: "Zobacz różnice",
    revisionsDiffButtonText: "Zobacz różnice",
    revisionsDiffButtonTitle: "Zobacz różnice",
    revisionsLoading: "Ładowanie poprawki...",
    revisionsNone: "Nie korekt dla tego elementu",
    revisionsPreviewButtonText: "Podgląd",
    revisionsPreviewButtonTitle: "Podgląd",
    revisionsText: "Poprawki",
    revisionsTextEmpty: "Nie zmian",
    revisionsTitle: "",
    rfmClose: "Zamknij",
    rfmContinue: "W dalszym ciągu",
    rfmDelete: "Usuń",
    rfmDownload: "Pobierz za darmo",
    rfmFileActions: "Działania",
    rfmFileModificationTime: "Zmodyfikowany",
    rfmFileName: "Nazwa",
    rfmFileSize: "Rozmiar",
    rfmFileType: "Typ",
    rfmFilteredTotal: "Wyświetlone {{start}} {{end}} {{filteredTotal}} plików",
    rfmFirst: "Pierwszy",
    rfmHeadingDirectories: "Katalogi",
    rfmHeadingSearch: "Szukaj",
    rfmHeadingTags: "Tagi",
    rfmHeadingUpload: "Przesłać",
    rfmInsert: "Wstaw",
    rfmLast: "Ostatnia",
    rfmSearch: "Iść",
    rfmTagDocument: "Dokument",
    rfmTagImage: "Obraz",
    rfmTotal: ", filtrowane z {{total}}",
    rfmUpload: "Przesłać",
    rfmUploadBrowse: "Przeglądaj",
    rfmUploadDrop: "Usuwanie plików tutaj",
    rfmUploadFileRemove: "Usuń",
    rfmUploadOr: "lub",
    rfmView: "Widok",
    saveJsonFail: "Nie udało się uratować {{failed}} zawartość bloku",
    saveJsonSaved: "Zapisane {{saved}} zawartość bloku.",
    saveNotConfigured: "Zapisz nie został skonfigurowany, lub jest wyłączona.",
    saveRestFail: "Nie udało się uratować {{failed}} zawartość bloku.",
    saveRestPartial: "Zapisane {{saved}} {{failed}} bloki zawartości.",
    saveRestSaved: "Zapisane {{saved}} zawartość bloku.",
    saveTitle: "Zapisywanie zawartości",
    snippetMenuTitle: "Fragmenty",
    specialCharactersArrows: "Strzałki",
    specialCharactersDialogOKButton: "Ok",
    specialCharactersDialogTitle: "Wstawianie znaków specjalnych",
    specialCharactersGreekAlphabet: "Alfabet grecki",
    specialCharactersHelp: "Kliknij przycisk dodać znak specjalny. Kliknij przycisk \"OK\" po zakończeniu zamknij to okno",
    specialCharactersMathematics: "Matematyka",
    specialCharactersSymbols: "Symbole",
    specialCharactersTitle: "Wstawianie znaków specjalnych",
    statisticsButtonCharacterOverLimit: "{{charactersRemaining}} znaków ponad limit",
    statisticsButtonCharacterRemaining: "pozostało znaków {{charactersRemaining}}",
    statisticsButtonCharacters: "{{characters}} znaków",
    statisticsDialogCharactersOverLimit: "znaki {{characters}}, {{charactersRemaining}} przekroczenie zalecanej",
    statisticsDialogCharactersRemaining: "{{characters}} pozostało, {{charactersRemaining}}",
    statisticsDialogNotTruncated: "Zawartości nie zostanie obcięty",
    statisticsDialogOKButton: "Ok",
    statisticsDialogSentence: "zdanie {{sentences}}",
    statisticsDialogSentences: "{{sentences}} zdań",
    statisticsDialogTitle: "Statystyki zawartości",
    statisticsDialogTruncated: "Zawartość zawiera więcej niż {{limit}} znaków i może zostać obcięta",
    statisticsDialogWord: "słowo {{words}}",
    statisticsDialogWords: "{{words}} słów",
    statisticsTitle: "Kliknij, aby wyświetlić statystyki",
    tableCreateTitle: "Tworzenie tabeli",
    tableDeleteColumnTitle: "Usuń kolumnę tabeli",
    tableDeleteRowTitle: "Usuwanie wiersza tabeli",
    tableInsertColumnTitle: "Wstaw kolumnę tabeli",
    tableInsertRowTitle: "Wstaw wiersz tabeli",
    tableMergeCellsTitle: "Scalanie komórek tabeli",
    tableSplitCellsTitle: "Podział komórek tabeli",
    tagMenuTagAddress: "Adres",
    tagMenuTagDiv: "DIV",
    tagMenuTagH1: "Nagłówek 1",
    tagMenuTagH2: "Nagłówek 2",
    tagMenuTagH3: "Pozycja 3",
    tagMenuTagH4: "Pozycja 4",
    tagMenuTagNA: "N\/D!",
    tagMenuTagP: "Ust.",
    tagMenuTagPre: "Wstępnie sformatowany",
    tagMenuTitle: "Zmienić styl",
    tagTreeElementLink: "Wybierz opcję {{element}}",
    tagTreeElementTitle: "Kliknij, aby zaznaczyć zawartość elementu \"{{element}}\"",
    tagTreeRoot: "korzeń",
    tagTreeRootLink: "Wybierz wszystkie edytowalna treść",
    tagTreeRootTitle: "Kliknij, aby zaznaczyć całą zawartość edycji",
    textBlockQuoteTitle: "Cytat blokowy",
    textBoldTitle: "Pogrubienie",
    textItalicTitle: "Kursywa",
    textSizeDecreaseTitle: "Zmniejsz rozmiar tekstu",
    textSizeIncreaseTitle: "Zwiększyć rozmiar tekstu",
    textStrikeTitle: "Strajku poprzez",
    textSubTitle: "Sub-skrypt",
    textSuperTitle: "Super skrypt",
    textUnderlineTitle: "Podkreślenie",
    unsavedEditWarningText: "Na tej stronie są niezapisane zmiany",
    viewSourceDialogCancelButton: "Zamknij",
    viewSourceDialogOKButton: "Stosuje się kod źródłowy",
    viewSourceDialogTitle: "Kod źródłowy zawartości",
    viewSourceTitle: "Wyświetl\/Edytuj kod źródłowy"
});;
// File end: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-locales/pl.js
;
// File start: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/tools/action.js
/**
 * @fileOverview Action helper functions.
 * @license http://www.raptor-editor.com/license
 *
 * @author David Neilsen david@panmedia.co.nz
 * @author Michael Robinson michael@panmedia.co.nz
 */

/**
 * Previews an action on an element.
 * @todo check descriptions for accuracy
 * @param {Object} previewState The saved state of the target.
 * @param {jQuery} target Element to have the preview applied to it.
 * @param {function} action The action to be previewed.
 * @returns {Object} ??
 */
function actionPreview(previewState, target, action) {
    // <strict/>

    actionPreviewRestore(previewState, target);

    previewState = stateSave(target);
    action();
    rangy.getSelection().removeAllRanges();
    return previewState;
}

/**
 * Changes an element back to its saved state and returns that element.
 * @todo check descriptions please.
 * @param {Object} previewState The previously saved state of the target.
 * @param {jQuery} target The element to have it's state restored.
 * @returns {jQuery} The restored target.
 */
function actionPreviewRestore(previewState, target) {
    if (previewState) {
        var state = stateRestore(target, previewState);
        if (state.ranges) {
            rangy.getSelection().setRanges(state.ranges);
        }
        return state.element;
    }
    return target;
}

/**
 * Applies an action.
 * @todo types for params
 * @param {type} action The action to apply.
 * @param {type} history
 */
function actionApply(action, history) {
    action();
}

/**
 * Undoes an action.
 *
 * @returns {undefined}
 */
function actionUndo() {

}

/**
 * Redoes an action.
 *
 * @returns {undefined}
 */
function actionRedo() {

}
;
// File end: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/tools/action.js
;
// File start: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/tools/clean.js
/**
 * @fileOverview Cleaning helper functions.
 * @license http://www.raptor-editor.com/license
 *
 * @author David Neilsen - david@panmedia.co.nz
 * @author Michael Robinson - michael@panmedia.co.nz
 */

/**
 * Replaces elements in another elements. E.g.
 *
 * @example
 * cleanReplaceElements('.content', {
 *     'b': '<strong/>',
 *     'i': '<em/>',
 * });
 *
 * @param  {jQuery|Element|Selector} selector The element to be find and replace in.
 * @param  {Object} replacements A map of selectors to replacements. The replacement
 *   can be a jQuery object, an element, or a selector.
 */
function cleanReplaceElements(selector, replacements) {
    for (var find in replacements) {
        var replacement = replacements[find];
        var i = 0;
        var found = false;
        do {
            found = $(selector).find(find);
            if (found.length) {
                found = $(found.get(0));
                var clone = $(replacement).clone();
                clone.html(found.html());
                clone.attr(elementGetAttributes(found));
                found.replaceWith(clone);
            }
        } while(found.length);
    }
}

/**
 * Unwrap function. Currently just wraps jQuery.unwrap() but may be extended in future.
 *
 * @param  {jQuery|Element|Selector} selector The element to unwrap.
 */
function cleanUnwrapElements(selector) {
    $(selector).unwrap();
}

/**
 * Takes a supplied element and removes all of the empty attributes from it.
 *
 * @param {jQuery} element This is the element to remove all the empty attributes from.
 * @param {array} attributes This is an array of the elements attributes.
 */
function cleanEmptyAttributes(element, attributes) {
    // <strict/>

    for (i = 0; i < attributes.length; i++) {
        if (!$.trim(element.attr(attributes[i]))) {
            element.removeAttr(attributes[i]);
        }
        element
            .find('[' + attributes[i] + ']')
            .filter(function() {
                return $.trim($(this).attr(attributes[i])) === '';
            }).removeAttr(attributes[i]);
    }
}


/**
 * Remove comments from element.
 *
 * @param  {jQuery} parent The jQuery element to have comments removed from.
 * @return {jQuery} The modified parent.
 */
function cleanRemoveComments(parent) {
    // <strict/>

    parent.contents().each(function() {
        if (this.nodeType == Node.COMMENT_NODE) {
            $(this).remove();
        }
    });
    parent.children().each(function() {
        cleanRemoveComments($(this));
    });
    return parent;
}


/**
 * Removed empty elements whose tag name matches the list of supplied tags.
 *
 * @param  {jQuery} parent The jQuery element to have empty element removed from.
 * @param  {String[]} tags The list of tags to clean.
 * @return {jQuery} The modified parent.
 */
function cleanEmptyElements(parent, tags) {
    // <strict/>
    var found;
    // Need to loop incase removing an empty element, leaves another one.
    do {
        found = false;
        parent.find(tags.join(',')).each(function() {
            if ($.trim($(this).html()) === '') {
                $(this).remove();
                found = true;
            }
        });
    } while (found);
    return parent;
}

/**
 * Wraps any text nodes in the node with the supplied tag. This does not scan child elements.
 *
 * @param  {Node} node
 * @param  {String} tag The tag to use from wrapping the text nodes.
 */
function cleanWrapTextNodes(node, tag) {
    // <strict/>

    var textNodes = nodeFindTextNodes(node);
    for (var i = 0, l = textNodes.length; i < l; i++) {
        var clone = textNodes[i].cloneNode(),
            wrapper = document.createElement(tag);
        wrapper.appendChild(clone);
        node.insertBefore(wrapper, textNodes[i]);
        node.removeChild(textNodes[i]);
    }
}

function cleanUnnestElement(element, selector) {
    var found;
    do {
        found = false;
        $(element).find(selector).each(function() {
            if ($(this).parent().is(selector)) {
                $(this).unwrap();
                found = true;
            }
        });
    } while (found);

}

/**
 * Generic clean function to remove misc elements.
 *
 * @param  {jQuery} element
 */
function clean(element) {
    $(element).find('.rangySelectionBoundary').remove();
}
;
// File end: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/tools/clean.js
;
// File start: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/tools/dock.js
/**
 * @fileOverview Docking to screen and element helper functions.
 * @license http://www.raptor-editor.com/license
 *
 * @author David Neilsen david@panmedia.co.nz
 * @author Michael Robinson michael@panmedia.co.nz
 */

/**
 * Docks a specified element to the screen.
 *
 * @param {jQuery} element The element to dock.
 * @param {string} options Any options to further specify the docking state.
 * @returns {Object} An object containing the docked element, a spacer div and the style state.
 */
function dockToScreen(element, options) {
    var position,
        spacer = $('<div>')
            .addClass('spacer');
    if (options.position === 'top') {
        position = {
            position: 'fixed',
            top: options.under ? $(options.under).outerHeight() : 0,
            left: 0,
            right: 0
        };
        if (options.spacer) {
            if (options.under) {
                spacer.insertAfter(options.under);
            } else {
                spacer.prependTo('body');
            }
        }
    } else if (options.position === 'topLeft') {
        position = {
            position: 'fixed',
            top: options.under ? $(options.under).outerHeight() : 0,
            left: 0
        };
        if (options.spacer) {
            if (options.under) {
                spacer.insertAfter(options.under);
            } else {
                spacer.prependTo('body');
            }
        }
    } else if (options.position === 'topRight') {
        position = {
            position: 'fixed',
            top: options.under ? $(options.under).outerHeight() : 0,
            right: 0
        };
        if (options.spacer) {
            if (options.under) {
                spacer.insertAfter(options.under);
            } else {
                spacer.prependTo('body');
            }
        }
    } else if (options.position === 'bottom') {
        position = {
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0
        };
        if (options.spacer) {
            spacer.appendTo('body');
        }
    } else if (options.position === 'bottomLeft') {
        position = {
            position: 'fixed',
            bottom: 0,
            left: 0
        };
        if (options.spacer) {
            spacer.appendTo('body');
        }
    } else if (options.position === 'bottomRight') {
        position = {
            position: 'fixed',
            bottom: 0,
            right: 0
        };
        if (options.spacer) {
            spacer.appendTo('body');
        }
    }
    var styleState = styleSwapState(element, position);
    spacer.css('height', element.outerHeight());
    setTimeout(function() {
        spacer.css('height', element.outerHeight());
    }, 300);
    return {
        dockedElement: element,
        spacer: spacer,
        styleState: styleState
    };
}

/**
 * Undocks a docked element from the screen.
 * @todo not sure of description for dockState
 * @param {jQuery} dockState
 * @returns {unresolved}
 */
function undockFromScreen(dockState) {
    styleRestoreState(dockState.dockedElement, dockState.styleState);
    dockState.spacer.remove();
    return dockState.dockedElement.detach();
}

/**
 * Docks an element to a another element.
 *
 * @param {jQuery} elementToDock This is the element to be docked.
 * @param {jQuery} dockTo This is the element to which the elementToDock will be docked to.
 * @param {string} options These are any options to refine the docking position.
 * @returns {Object} An object containing the docked element, what it has been docked to, and their style states.
 */
function dockToElement(elementToDock, dockTo, options) {
    var wrapper = dockTo
            .wrap('<div>')
            .parent(),
        innerStyleState = styleSwapWithWrapper(wrapper, dockTo, {
            'float': 'none',
            display: 'block',
            clear: 'none',
            position: 'static',

            /* Margin */
            margin: 0,
            marginLeft: 0,
            marginRight: 0,
            marginTop: 0,
            marginBottom: 0,

            /* Padding */
            padding: 0,
            paddingLeft: 0,
            paddingRight: 0,
            paddingTop: 0,
            paddingBottom: 0,

            outline: 0,
            width: 'auto',
            border: 'none'
        }),
        dockedElementStyleState = styleSwapState(elementToDock, {
            position: 'static'
        });
    wrapper
        .prepend(elementToDock)
        .addClass(options.wrapperClass ? options.wrapperClass : '');
    return {
        dockedElement: elementToDock,
        dockedTo: dockTo,
        innerStyleState: innerStyleState,
        dockedElementStyleState: dockedElementStyleState
    };
}

/**
 * Undocks an element from the screen.
 *@todo not sure of description for dockState
 * @param {jQuery} dockState
 * @returns {Object} The undocked element.
 */
function undockFromElement(dockState) {
    styleRestoreState(dockState.dockedTo, dockState.innerStyleState);
    styleRestoreState(dockState.dockedElement, dockState.dockedElementStyleState);
    var dockedElement = dockState.dockedElement.detach();
    dockState.dockedTo.unwrap();
    return dockedElement;
}
;
// File end: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/tools/dock.js
;
// File start: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/tools/element.js
/**
 * @fileOverview Element manipulation helper functions.
 * @license http://www.raptor-editor.com/license
 *
 * @author David Neilsen david@panmedia.co.nz
 * @author Michael Robinson michael@panmedia.co.nz
 */

/**
 * Remove all but the allowed attributes from the parent.
 *
 * @param {jQuery} parent The jQuery element to cleanse of attributes.
 * @param {String[]|null} allowedAttributes An array of allowed attributes.
 * @return {jQuery} The modified parent.
 */
function elementRemoveAttributes(parent, allowedAttributes) {
    parent.children().each(function() {
        var stripAttributes = $.map(this.attributes, function(item) {
            if ($.inArray(item.name, allowedAttributes) === -1) {
                return item.name;
            }
        });
        var child = $(this);
        $.each(stripAttributes, function(i, attributeName) {
            child.removeAttr(attributeName);
        });
        element.removeAttributes($(this), allowedAttributes);
    });
    return parent;
}

/**
 * Sets the z-index CSS property on an element to 1 above all its sibling elements.
 *
 * @param {jQuery} element The jQuery element to have it's z index increased.
 */
function elementBringToTop(element) {
    var zIndex = 1;
    element.siblings().each(function() {
        var z = $(this).css('z-index');
        if (!isNaN(z) && z > zIndex) {
            zIndex = z + 1;
        }
    });
    element.css('z-index', zIndex);
}

/**
 * Retrieve outer html from an element.
 *
 * @param  {jQuery} element The jQuery element to retrieve the outer HTML from.
 * @return {String} The outer HTML.
 */
function elementOuterHtml(element) {
    return element.clone().wrap('<div/>').parent().html();
}

/**
 * Retrieve outer text from an element.
 *
 * @param  {jQuery} element The jQuery element to retrieve the outer text from.
 * @return {String} The outer text.
 */
function elementOuterText(element) {
    return element.clone().wrap('<div/>').parent().text();
}

/**
 * Determine whether element is block.
 *
 * @param  {Element} element The element to test.
 * @return {Boolean} True if the element is a block element
 */
function elementIsBlock(element) {
    return elementDefaultDisplay(element.tagName) === 'block';
}

/**
 * Determine whether element contains a block element.
 *
 * @param  {Element} element
 * @return {Boolean} True if the element contains a block element, false otherwise.
 */
function elementContainsBlockElement(element) {
    var containsBlock = false;
    element.contents().each(function() {
        if (!typeIsTextNode(this) && elementIsBlock(this)) {
            containsBlock = true;
            return;
        }
    });
    return containsBlock;
}

/**
 * Determine whether element is inline or block.
 *
 * @see http://stackoverflow.com/a/2881008/187954
 * @param  {string} tag Lower case tag name, e.g. 'a'.
 * @return {string} Default display style for tag.
 */
function elementDefaultDisplay(tag) {
    var cStyle,
        t = document.createElement(tag),
        gcs = "getComputedStyle" in window;

    document.body.appendChild(t);
    cStyle = (gcs ? window.getComputedStyle(t, "") : t.currentStyle).display;
    document.body.removeChild(t);

    return cStyle;
}

/**
 * Check that the given element is one of the the given tags.
 *
 * @param  {jQuery|Element} element The element to be tested.
 * @param  {Array}  validTags An array of valid tag names.
 * @return {Boolean} True if the given element is one of the give valid tags.
 */
function elementIsValid(element, validTags) {
    return -1 !== $.inArray($(element)[0].tagName.toLowerCase(), validTags);
}

/**
 * According to the given array of valid tags, find and return the first invalid
 * element of a valid parent. Recursively search parents until the wrapper is
 * encountered.
 *
 * @param  {Node} element
 * @param  {string[]} validTags
 * @param  {Element} wrapper
 * @return {Node}           [description]
 */
function elementFirstInvalidElementOfValidParent(element, validTags, wrapper) {
    // <strict/>
    var parent = element.parentNode;
    if (parent[0] === wrapper[0]) {
        // <strict/>
        return element;
    }
    if (elementIsValid(parent, validTags)) {
        return element;
    }
    return elementFirstInvalidElementOfValidParent(parent, validTags, wrapper);
}

/**
 * Calculate and return the visible rectangle for the element.
 *
 * @param  {jQuery|Element} element The element to calculate the visible rectangle for.
 * @return {Object} Visible rectangle for the element.
 */
function elementVisibleRect(element) {
    // <strict/>
    element = $(element);

    var rect = {
        top: Math.round(element.offset().top),
        left: Math.round(element.offset().left),
        width: Math.round(element.outerWidth()),
        height: Math.round(element.outerHeight())
    };


    var scrollTop = $(window).scrollTop();
    var windowHeight = $(window).height();
    var scrollBottom = scrollTop + windowHeight;
    var elementBottom = Math.round(rect.height + rect.top);

    // If top & bottom of element are within the viewport, do nothing.
    if (scrollTop < rect.top && scrollBottom > elementBottom) {
        return rect;
    }

    // Top of element is outside the viewport
    if (scrollTop > rect.top) {
        rect.top = scrollTop;
    }

    // Bottom of element is outside the viewport
    if (scrollBottom < elementBottom) {
        rect.height = scrollBottom - rect.top;
    } else {
        // Bottom of element inside viewport
        rect.height = windowHeight - (scrollBottom - elementBottom);
    }

    return rect;
}

/**
 * Returns a map of an elements attributes and values. The result of this function
 * can be passed directly to $('...').attr(result);
 *
 * @param  {jQuery|Element|Selector} element The element to get the attributes from.
 * @return {Object} A map of attribute names mapped to their values.
 */
function elementGetAttributes(element) {
    var attributes = $(element).get(0).attributes,
        result = {};
    for (var i = 0, l = attributes.length; i < l; i++) {
        result[attributes[i].name] = attributes[i].value;
    }
    return result;
}

/**
 * Gets the styles of an element.
 * @todo the type for result.
 * FIXME: this function needs reviewing.
 * @param {jQuerySelector|jQuery|Element} element This is the element to get the style from.
 * @returns {unresolved} The style(s) of the element.
 */
function elementGetStyles(element) {
    var result = {};
    var style = window.getComputedStyle(element[0], null);
    for (var i = 0; i < style.length; i++) {
        result[style.item(i)] = style.getPropertyValue(style.item(i));
    }
    return result;
}

/**
 * Wraps the inner content of an element with a tag.
 *
 * @param {jQuerySelector|jQuery|Element} element The element(s) to wrap.
 * @param {String} tag The wrapper tag name
 * @returns {jQuery} The wrapped element.
 */
function elementWrapInner(element, tag) {
    var result = new jQuery();
    selectionSave();
    for (var i = 0, l = element.length; i < l; i++) {
        var wrapper = $('<' + tag + '/>').html($(element[i]).html());
        element.html(wrapper);
        result.push(wrapper[0]);
    }
    selectionRestore();
    return result;
}

/**
 * Toggles the styles of an element.
 *
 * FIXME: this function needs reviewing
 * @public @static
 * @param {jQuerySelector|jQuery|Element} element The jQuery element to have it's style changed.
 * @param {type} styles The styles to add or remove from the element.
 * @returns {undefined}
 */
function elementToggleStyle(element, styles) {
    $.each(styles, function(property, value) {
        if ($(element).css(property) === value) {
            $(element).css(property, '');
        } else {
            $(element).css(property, value);
        }
    });
}

/**
 * Swaps the styles of two elements.
 *
 * @param {jQuery|Element} element1 The element for element 2 to get its styles from.
 * @param {jQuery|Element} element2 The element for element 1 to get its styles from.
 * @param {Object} style The style to be swapped between the two elements.
 */
function elementSwapStyles(element1, element2, style) {
    for (var name in style) {
        element1.css(name, element2.css(name));
        element2.css(name, style[name]);
    }
}

/**
 * Checks if an element is empty.
 *
 * @param {Element} element The element to be checked.
 * @returns {Boolean} Returns true if element is empty.
 */
function elementIsEmpty(element) {
    // <strict/>

    // Images and elements containing images are not empty
    if (element.is('img') || element.find('img').length) {
        return false;
    }
    if ((/&nbsp;/).test(element.html())) {
        return false;
    }
    return element.text() === '';
}

/**
 * Positions an element underneath another element.
 *
 * @param {jQuery} element Element to position.
 * @param {jQuery} under Element to position under.
 */
function elementPositionUnder(element, under) {
    var pos = $(under).offset(),
        height = $(under).outerHeight();
    $(element).css({
        top: (pos.top + height - $(window).scrollTop()) + 'px',
        left: pos.left + 'px'
    });
}

/**
 * Removes the element from the DOM to manipulate it using a function passed to the method, then replaces it back to it's origional position.
 *
 * @todo desc and type for manip
 * @param {jQuery|Element} element The element to be manipulated.
 * @param {type} manip A function used to manipulate the element i think.
 */
function elementDetachedManip(element, manip) {
    var parent = $(element).parent();
    $(element).detach();
    manip(element);
    parent.append(element);
}

/**
 * Finds the closest parent, up to a limit element, to the supplied element that is not an display inline or null.
 * If the parent element is the same as the limit element then it returns null.
 *
 * @param {jQuery} element The element to find the closest parent of.
 * @param {jQuery} limitElement The element to stop looking for the closest parent at.
 * @returns {jQuery} Closest element that is not display inline or null, or null if the parent element is the same as the limit element.
 */
function elementClosestBlock(element, limitElement) {
    // <strict/>
    while (element.length > 0 &&
        element[0] !== limitElement[0] &&
        (element[0].nodeType === Node.TEXT_NODE || element.css('display') === 'inline')) {
        element = element.parent();
    }
    if (element[0] === limitElement[0]) {
        return null;
    }
    return element;
}

/**
 * Generates a unique id.
 *
 * @returns {String} The unique id.
 */
function elementUniqueId() {
    var id = 'ruid-' + new Date().getTime() + '-' + Math.floor(Math.random() * 100000);
    while ($('#' + id).length) {
        id = 'ruid-' + new Date().getTime() + '-' + Math.floor(Math.random() * 100000);
    }
    return id;
}

/**
 * Changes the tags on a given element.
 *
 * @todo not sure of details of return
 * @param {jQuerySelector|jQuery|Element} element The element(s) to have it's tags changed
 * @param {Element} newTag The new tag for the element(s)
 * @returns {Element}
 */
function elementChangeTag(element, newTag) {
    // <strict/>
    var tags = [];
    for (var i = element.length - 1; 0 <= i ; i--) {
        var node = document.createElement(newTag);
        node.innerHTML = element[i].innerHTML;
        $.each(element[i].attributes, function() {
            $(node).attr(this.name, this.value);
        });
        $(element[i]).after(node).remove();
        tags[i] = node;
    }
    return $(tags);
}

/**
 * Positions an element over top of another element.
 *  - If the other element is big, then the element is positioned in the center of the visible part of the other element.
 *  - If the other element is small and not at the top of the screen, the other element is positioned at the top of the other element.
 *  - If the other element is small and not is at the top of the screen, the other element is positioned at the bottom of the other element.
 *
 * @param {Element} element The element to position.
 * @param {Element} over The element to position over.
 */
function elementPositionOver(element, over) {
    if (element.outerHeight() > over.outerHeight() - 20) {
        var visibleRect = elementVisibleRect(over),
            offset = over.offset();
        element.css({
            position: 'absolute',
            // Calculate offset center for the element
            top:  offset.top - element.outerHeight(),
            left: visibleRect.left + ((visibleRect.width / 2)  - (element.outerWidth()  / 2))
        });
    } else {
        var visibleRect = elementVisibleRect(over);
        element.css({
            position: 'absolute',
            // Calculate offset center for the element
            top:  visibleRect.top  + ((visibleRect.height / 2) - (element.outerHeight() / 2)),
            left: visibleRect.left + ((visibleRect.width / 2)  - (element.outerWidth()  / 2))
        });
    }
}
;
// File end: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/tools/element.js
;
// File start: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/tools/fragment.js
/**
 * @fileOverview DOM fragment manipulation helper functions
 * @license http://www.raptor-editor.com/license
 *
 * @author David Neilsen david@panmedia.co.nz
 * @author Michael Robinson michael@panmedia.co.nz
 */

/**
 * Convert a DOMFragment to an HTML string. Optionally wraps the string in a tag.
 * @todo type for domFragment and tag.
 * @param {type} domFragment The fragment to be converted to a HTML string.
 * @param {type} tag The tag that the string may be wrapped in.
 * @returns {String} The DOMFragment as a string, optionally wrapped in a tag.
 */
function fragmentToHtml(domFragment, tag) {
    var html = '';
    // Get all nodes in the extracted content
    for (var j = 0, l = domFragment.childNodes.length; j < l; j++) {
        var node = domFragment.childNodes.item(j);
        var content = node.nodeType === Node.TEXT_NODE ? node.nodeValue : elementOuterHtml($(node));
        if (content) {
            html += content;
        }
    }
    if (tag) {
        html = $('<' + tag + '>' + html + '</' + tag + '>');
        html.find('p').wrapInner('<' + tag + '/>');
        html.find('p > *').unwrap();
        html = $('<div/>').html(html).html();
    }
    return html;
}

/**
 * Insert a DOMFragment before an element and wraps them both in a tag.
 *
 * @public @static
 * @param {DOMFragment} domFragment This is the DOMFragment to be inserted.
 * @param {jQuerySelector|jQuery|Element} beforeElement This is the element the DOMFragment is to be inserted before.
 * @param {String} wrapperTag This is the tag to wrap the domFragment and the beforeElement in.
 */
function fragmentInsertBefore(domFragment, beforeElement, wrapperTag) {
    // Get all nodes in the extracted content
    for (var j = 0, l = domFragment.childNodes.length; j < l; j++) {
        var node = domFragment.childNodes.item(j);
        // Prepend the node before the current node
        var content = node.nodeType === Node.TEXT_NODE ? node.nodeValue : $(node).html();
        if (content) {
            $('<' + wrapperTag + '/>')
                .html($.trim(content))
                .insertBefore(beforeElement);
        }
    }
}
;
// File end: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/tools/fragment.js
;
// File start: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/tools/list.js
/**
 * @fileOverview List manipulation helper functions.
 * @license http://www.raptor-editor.com/license
 *
 * @author David Neilsen david@panmedia.co.nz
 * @author Michael Robinson michael@panmedia.co.nz
 */

/**
 * Determines the appropriate list toggling action then performs it.
 *
 * @param {String} listType This is the type of list to check the selection against.
 * @param {Object} listItem This is the list item to use as the selection.
 * @param {Element} wrapper Element containing the entire action, may not be modified.
 */
function listToggle(listType, listItem, wrapper) {
    if (wrapper.html().trim() === '') {
        return;
    }
    if (!selectionExists()) {
        return;
    }
    if (listShouldConvertType(listType, listItem, wrapper)) {
        return listConvertListType(listType, listItem, wrapper);
    }
    if (listShouldUnwrap(listType, listItem)) {
        return listUnwrapSelection(listType, listItem, wrapper);
    }
    if (listShouldWrap(listType, listItem, wrapper)) {
       return listWrapSelection(listType, listItem, wrapper);
    }
}

/**
 * @param  {String} listType
 * @param  {String} listItem
 * @return {Boolean}
 */
function listShouldUnwrap(listType, listItem) {
    var selectedElements = $(selectionGetElements());
    if (selectedElements.is(listType)) {
        return true;
    }
    if (listType === 'blockquote' && !selectedElements.parent().is(listType)) {
        return false;
    }
    if (selectedElements.is(listItem) && selectedElements.parent().is(listType)) {
        return true;
    }
    if (selectedElements.parentsUntil(listType, listItem).length) {
        return true;
    }
    return false;
}

/**
 * @param  {String} listType
 * @param  {String} listItem
 * @return {Boolean}
 */
function listShouldConvertType(listType, listItem, wrapper) {
    var range = selectionRange();
    var commonAncestor = $(rangeGetCommonAncestor(range));
    if (rangeIsEmpty(range)) {
        var closestListItem = commonAncestor.closest(listItem, wrapper);
        if (closestListItem.length) {
            rangeExpandTo(range, [closestListItem]);
        } else {
            rangeExpandToParent(range);
        }
    }
    commonAncestor = $(rangeGetCommonAncestor(range));

    // Do not convert blockquotes that have partial selections
    if (listType === 'blockquote' &&
        !rangeContainsNode(range, commonAncestor.get(0))) {
        return false;
    }

    if ($(commonAncestor).is(listItem) &&
        !$(commonAncestor).parent().is(listType)) {
        return true;
    }
    return false;
}

function listShouldWrap(listType, listItem, wrapper) {
    if (listType === 'blockquote') {
        return elementIsValid(wrapper, listValidBlockQuoteParents);
    }
    return elementIsValid(wrapper, listValidUlOlParents);
}

/**
 * @type {String[]} Tags allowed within an li.
 */
var listValidLiChildren = [
    'a', 'abbr','acronym', 'applet', 'b', 'basefont', 'bdo', 'big', 'br', 'button',
    'cite', 'code', 'dfn', 'em', 'font', 'i', 'iframe', 'img', 'input', 'kbd',
    'label', 'map', 'object', 'p', 'q', 's',  'samp', 'select', 'small', 'span',
    'strike', 'strong', 'sub', 'sup', 'textarea', 'tt', 'u', 'var',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6'
];

/**
 * @type {String][]} Tags ol & ul are allowed within.
 */
var listValidUlOlParents =  [
    'article', 'nav', 'section', 'footer', 'blockquote', 'body', 'button',
    'center', 'dd', 'div', 'fieldset', 'form', 'iframe', 'li', 'noframes',
    'noscript', 'object', 'td', 'th'
];

/**
 * @type {String][]} Tags blockquote is allowed within.
 */
var listValidBlockQuoteParents = [
    'body', 'center', 'dd', 'div', 'dt', 'fieldset', 'form', 'iframe', 'li', 'td', 'th'
];

 var listValidPChildren = [
    'a', 'abbr', 'acronym', 'applet', 'b', 'basefont', 'bdo', 'big', 'br',
    'button', 'cite', 'code', 'dfn', 'em', 'font', 'i', 'iframe', 'img',
    'input', 'kbd', 'label', 'map', 'object', 'q', 's', 'samp', 'script',
    'select', 'small', 'span', 'strike', 'strong', 'sub', 'sup', 'textarea',
    'u'
];

var listValidPParents = [
    'address', 'blockquote', 'body', 'button', 'center', 'dd', 'div', 'fieldset',
    'form', 'iframe', 'li', 'noframes', 'noscript', 'object', 'td', 'th'
];

/**
 * Convert tags invalid within the context of listItem.
 *
 * @param  {Element} list
 * @param  {String} listItem
 * @param  {String[]} validChildren
 */
function listEnforceValidChildren(list, listItem, validChildren, removeEmpty) {
    removeEmpty = typeof removeEmpty === 'undefined' ? true : removeEmpty;
    // <strict/>
    var removeEmptyElements = function(node) {
        if ($(node).is('img') || $(node).find('img').length) {
            return;
        }
        if (!$(node).text().trim()) {
            $(node).remove();
            return true;
        }
    };

    list.find('> ' + listItem).each(function() {
        if (removeEmpty && removeEmptyElements(this)) {
            return true;
        }
        $(this).contents().each(function() {
            if (removeEmpty && removeEmptyElements(this)) {
                return true;
            }
            if (listItem === 'p') {
                if (!typeIsTextNode(this) &&
                    !elementIsValid(this, validChildren)) {
                    $(this).contents().unwrap();
                    return true;
                }
            } else {
                // Do nothing for bare text nodes
                if (typeIsTextNode(this)) {
                    return true;
                }
                // Unwrap the invalid element and remove it if empty
                if (!elementIsValid(this, validChildren)) {
                    $(this).contents().unwrap();
                    removeEmptyElements(this);
                    return true;
                }
            }
        });
    });
}

/**
 * Wraps the selected element(s) in list tags.
 *
 * @param {String} listType The type of list that the selection is to be transformed into.
 * @param {String} listItem The list item to be used in creating the list.
 * @param {Element} wrapper Element containing the entire action, may not be modified.
 */
function listWrapSelection(listType, listItem, wrapper) {
    var range = selectionRange();
    var commonAncestor = rangeGetCommonAncestor(range);

    /**
     * <wrapper>{}<p>Some content</p></wrapper>
     */
    if (rangeIsEmpty(range) && commonAncestor === wrapper.get(0)) {
        return;
    }

    // Having a <td> fully selected is a special case: without intervention
    // the surrounding <table> would be split, with a <listType> inserted between
    // the two <tables>.
    if ($(commonAncestor).is('td,th') || commonAncestor === wrapper.get(0)) {
        rangeSelectElementContent(range, commonAncestor);

    // Other cases require checking if the range contains the full text of the
    // common ancestor. In these cases the commonAncestor should be selected
    } else if (rangeContainsNodeText(range, commonAncestor)) {
        rangeSelectElement(range, $(commonAncestor));
    }

    if (rangeIsEmpty(range)) {
        range.selectNode(elementClosestBlock($(commonAncestor), wrapper).get(0));
    }

    var contents = listConvertItemsForList(fragmentToHtml(range.extractContents()), listItem);
    var validParents = listType === 'blockquote' ? listValidBlockQuoteParents : listValidUlOlParents;
    var uniqueId = elementUniqueId();
    var replacementHtml = '<' + listType + ' id="' + uniqueId + '">' + $('<div/>').html(contents).html() + '</' + listType + '>';

    rangeReplaceWithinValidTags(range, replacementHtml, wrapper, validParents);

    var replacement = $('#' + uniqueId).removeAttr('id');
    var validChildren = listType === 'blockquote' ? listValidPChildren : listValidLiChildren;
    listEnforceValidChildren(replacement, listItem, validChildren);
    if (replacement.is(listType)) {
        var child = replacement.find(' > ' + listItem);
        if (child.length === 0) {
            replacement = $(document.createElement('li')).appendTo(replacement);
        }
    }
    selectionSelectInner(replacement.get(0));
}

/**
 * Wrap non block elements in <p> tags, then in <li>'s.
 *
 * @param  {String} items HTML to be prepared.
 * @param  {String} listItem
 * @return {String} Prepared HTML.
 */
function listConvertItemsForList(items, listItem) {
    items = $('<div/>').html(items);

    if (!elementContainsBlockElement(items)) {
        // Do not double wrap p's
        if (listItem === 'p') {
            return '<' + listItem + '>' + items.html() + '</' + listItem + '>';
        }
        return '<' + listItem + '><p>' + items.html() + '</p></' + listItem + '>';
    }

    items.contents().each(function() {
        if ($(this).is('img')) {
            return true;
        }
        if (elementIsEmpty($(this))) {
            return $(this).remove();
        }
        $(this).wrap('<' + listItem + '/>');
        if (!elementIsBlock(this)) {
            $(this).wrap('<p>');
        }
    });

    return items.html();
}

/**
 * Convert the given list item to the given tag. If the listItem has children,
 * convert them and unwrap the containing list item.
 *
 * @param  {Element} listItem
 * @param  {string} listType
 * @param  {string} tag
 * @param  {string[]} validTagChildren Array of valid child tag names.
 * @return {Element|null} Result of the final conversion.
 */
function listConvertListItem(listItem, listType, tag) {
     // <strict/>
    var listItemChildren = listItem.contents();
    if (listItemChildren.length) {
        listItemChildren.each(function() {
            if ($(this).text().trim() === '') {
                return $(this).remove();
            }
            if (typeIsTextNode(this) || !elementIsBlock(this)) {
                return $(this).wrap('<' + tag + '>');
            }
        });
        return listItem.contents().unwrap();
    } else {
        return elementChangeTag(listItem, tag);
    }
}

/**
 * Convert listItems to paragraphs and unwrap the containing listType.
 *
 * @param  {Element} list
 * @param  {string} listItem
 * @param  {string} listType
 */
function listUnwrap(list, listItem, listType) {
    // <strict/>
    var convertedItem = null;
    list.find(listItem).each(function() {
        listConvertListItem($(this), listType, 'p');
    });
    return list.contents().unwrap();
}

/**
 * Tidy lists that have been modified, including removing empty listItems and
 * removing the list if it is completely empty.
 *
 * @param  {Element} list
 * @param  {string} listType
 * @param  {string} listItem
 */
function listTidyModified(list, listType, listItem) {
    // <strict/>
    listRemoveEmptyItems(list, listType, listItem);
    listRemoveEmpty(list, listType, listItem);
}

/**
 * Remove empty listItems from within the list.
 *
 * @param  {Element} list
 * @param  {string} listType
 * @param  {string} listItem
 */
function listRemoveEmptyItems(list, listType, listItem) {
    // <strict/>
    if (!list.is(listType)) {
        return;
    }
    list.find(listItem).each(function() {
        if ($(this).text().trim() === '') {
            $(this).remove();
        }
    });
}

/**
 * Remove list if it is of listType and empty.
 *
 * @param  {Element} list
 * @param  {string} listType
 * @param  {string} listItem
 */
function listRemoveEmpty(list, listType, listItem) {
    // <strict/>
    if (!list.is(listType)) {
        return;
    }
    if (list.text().trim() === '') {
        list.remove();
    }
}

/**
 * Unwrap the list items between the range's startElement & endElement.
 *
 * @param  {RangyRange} range
 * @param  {string} listType
 * @param  {string} listItem
 * @param  {Element} wrapper
 */
function listUnwrapSelectedListItems(range, listType, listItem, wrapper) {
    var startElement = rangeGetStartElement(range);
    var endElement = rangeGetEndElement(range);
    var replacementPlaceholderId = elementUniqueId();

    rangeExpandToParent(range);
    var breakOutValidityList = listType === 'blockquote' ? listValidBlockQuoteParents : listValidPParents;
    breakOutValidityList = $.grep(breakOutValidityList, function(item) {
        return item !== 'li';
    });
    rangeReplaceWithinValidTags(range, $('<p/>').attr('id', replacementPlaceholderId), wrapper, breakOutValidityList);

    var replacementPlaceholder = $('#' + replacementPlaceholderId);

    listTidyModified(replacementPlaceholder.prev(), listType, listItem);
    listTidyModified(replacementPlaceholder.next(), listType, listItem);

    var toUnwrap = [startElement];
    if (startElement !== endElement) {
        $(startElement).nextUntil(endElement).each(function() {
            if (this === endElement) {
                return;
            }
            toUnwrap.push(this);
        });
        toUnwrap.push(endElement);
    }

    toUnwrap.reverse();

    $(toUnwrap).each(function() {
        replacementPlaceholder.after(this);
        listConvertListItem($(this), listType, 'p');
    });

    replacementPlaceholder.remove();

    return listEnforceValidChildren($(rangeGetCommonAncestor(range)), listItem, listValidLiChildren);
}

/**
 * Unwraps the selected list item(s) and puts it into <p> tags.
 *
 * @param {Object} listItem
 */
function listUnwrapSelection(listType, listItem, wrapper) {
    var range = selectionRange();
    if (rangeIsEmpty(range)) {
        rangeExpandTo(range, [listItem]);
    }

    var commonAncestor = $(rangeGetCommonAncestor(range));

    /**
     * Selection contains more than one <listItem>, or the whole <listType>
     */
    if (commonAncestor.is(listType)) {
        var startElement = rangeGetStartElement(range);
        var endElement = rangeGetEndElement(range);

        /**
         * {<listType>
         *     <listItem>list content</listItem>
         * </listType>}
         */
        if ($(endElement).is(listType) && $(startElement).is(listType)) {
            return listUnwrap(commonAncestor, listItem, listType);
        }

        /**
         * <listType>
         *     <listItem>{list content</listItem>
         *     <listItem>list content}</listItem>
         *     <listItem>list content</listItem>
         * </listType>
         */
         return listUnwrapSelectedListItems(range, listType, listItem, wrapper);
    }

    if (!commonAncestor.is(listItem)) {
        commonAncestor = commonAncestor.closest(listItem);
    }
    /**
     * <listType>
     *     <li>{list content}</li>
     * </listType>
     */
    if (!commonAncestor.prev().length && !commonAncestor.next().length) {
        return listUnwrap(commonAncestor.closest(listType), listItem, listType);
    }

    /**
     * <listType>
     *     <listItem>list content</listItem>
     *     <listItem>{list content}</listItem>
     *     <listItem>list content</listItem>
     * </listType>
     */
    if (commonAncestor.next().length && commonAncestor.prev().length) {
        return listUnwrapSelectedListItems(range, listType, listItem, wrapper);
    }

    /**
     * <listType>
     *     <listItem>{list content}</listItem>
     *     <listItem>list content</listItem>
     * </listType>
     */
    if (commonAncestor.next().length && !commonAncestor.prev().length) {
        commonAncestor.parent().before(listConvertListItem(commonAncestor, listType, 'p'));
        commonAncestor.remove();
        return;
    }

    /**
     * <listType>
     *     <listItem>list content</listItem>
     *     <listItem>{list content}</listItem>
     * </listType>
     */
    if (!commonAncestor.next().length && commonAncestor.prev().length) {
        commonAncestor.parent().after(listConvertListItem(commonAncestor, 'p', listType));
        commonAncestor.remove();
        return;
    }
}

function listConvertListType(listType, listItem, wrapper) {
    var range = selectionRange();
    if (rangeIsEmpty(range)) {
        rangeExpandTo(range, [listItem]);
    }

    var startElement = rangeGetStartElement(range);
    var endElement = rangeGetEndElement(range);
    var replacementPlaceholderId = elementUniqueId();

    rangeExpandToParent(range);
    var breakOutValidityList = $.grep(listValidPParents, function(item) {
        return item !== listItem;
    });
    rangeReplaceWithinValidTags(range, $('<p/>').attr('id', replacementPlaceholderId), wrapper, breakOutValidityList);

    var replacementPlaceholder = $('#' + replacementPlaceholderId);

    listTidyModified(replacementPlaceholder.prev(), listType, listItem);
    listTidyModified(replacementPlaceholder.next(), listType, listItem);

    var toUnwrap = [startElement];
    if (startElement !== endElement) {
        $(startElement).nextUntil(endElement).each(function() {
            if (this === endElement) {
                return;
            }
            toUnwrap.push(this);
        });
        toUnwrap.push(endElement);
    }

    toUnwrap.reverse();

    $(toUnwrap).each(function() {
        replacementPlaceholder.after(this);
    });
    replacementPlaceholder.remove();
    var convertedList = $(toUnwrap).wrap('<' + listType + '>').parent();

    return listEnforceValidChildren(convertedList, listItem, listValidLiChildren);
}

/**
 * Break the currently selected list, replacing the selection.
 *
 * @param  {String} listType
 * @param  {String} listItem
 * @param  {Element} wrapper
 * @param  {String|Element} replacement
 * @return {Element|Boolean} The replaced element, or false if replacement did not
 *                               occur.
 */
function listBreakByReplacingSelection(listType, listItem, wrapper, replacement) {
    var selectedElement = selectionGetElement();
    if (!selectedElement.closest(listItem).length) {
        return false;
    }

    var parentList = selectedElement.closest(listType);
    if (!parentList.length || wrapper.get(0) === parentList.get(0)) {
        return false;
    }

    selectionSelectToEndOfElement(selectedElement);
    selectionDelete();

    var top = $('<' + listType + '/>'),
        bottom = $('<' + listType + '/>'),
        middlePassed = false;
    parentList.children().each(function() {
        if (selectedElement.closest(listItem).get(0) === this) {
            middlePassed = true;
            top.append(this);
            return;
        }
        if (!middlePassed) {
            top.append(this);
        } else {
            bottom.append(this);
        }
    });
    parentList.replaceWith(top);
    replacement = $(replacement).appendTo($('body'));
    top.after(replacement, bottom);

    return replacement;
}

/**
 * Add a new list item below the selection. New list item contains content of original
 * list item from selection end to end of element.
 *
 * @param  {String} listType
 * @param  {String} listItem
 * @param  {Element} wrapper
 * @param  {String|Element} replacement
 * @return {Element|Boolean}
 */
function listBreakAtSelection(listType, listItem, wrapper) {
    var selectedElement = selectionGetElement();
    if (!selectedElement.closest(listItem).length) {
        return false;
    }

    selectionDelete();
    selectionSelectToEndOfElement(selectedElement);
    var html = selectionGetHtml();
    if (html.trim() === '') {
        html = '&nbsp;';
    }
    selectionDelete();

    if (selectedElement.text().trim() === '') {
        selectedElement.html('&nbsp;');
    }
    var newListItem = $('<' + listItem + '>').html(html);
    selectedElement.closest(listItem).after(newListItem);

    listEnforceValidChildren(selectedElement.closest(listType), listItem, listValidLiChildren, false);

    return newListItem;
}
;
// File end: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/tools/list.js
;
// File start: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/tools/node.js
/**
 * @fileOverview Find node parent helper function.
 * @license http://www.raptor-editor.com/license
 *
 * @author David Neilsen david@panmedia.co.nz
 * @author Michael Robinson michael@panmedia.co.nz
 */


/**
 * Find the first parent of a node that is not a text node.
 *
 * @param {Node} node
 * @returns {Node}
 */
function nodeFindParent(node) {
    while (node.nodeType === Node.TEXT_NODE) {
        node = node.parentNode;
    }
    return node;
}

function nodeFindTextNodes(node) {
    var textNodes = [], whitespace = /^\s*$/;
    for (var i = 0, l = node.childNodes.length; i < l; i++) {
        if (node.childNodes[i].nodeType == Node.TEXT_NODE) {
            if (!whitespace.test(node.childNodes[i].nodeValue)) {
                textNodes.push(node.childNodes[i]);
            }
        }
    }
    return textNodes;
}

function nodeIsChildOf(child, parent) {
     var node = child.parentNode;
     while (node != null) {
         if (node == parent) {
             return true;
         }
         node = node.parentNode;
     }
     return false;
}
;
// File end: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/tools/node.js
;
// File start: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/tools/persist.js
/**
 * @fileOverview Storage helper functions.
 * @license http://www.raptor-editor.com/license
 *
 * @author David Neilsen david@panmedia.co.nz
 * @author Michael Robinson michael@panmedia.co.nz
 */

/**
 * Stores key-value data.
 * If local storage is already configured, retrieve what is stored and convert it to an array, otherwise create a blank array.
 * The value is then set in the array based on the key and the array is saved into local storage.
 * @todo desc and type for returns
 * @param {type} key The key for the data to be stored at
 * @param {type} value The data to be stored at the key.
 * @returns {persistSet} ??
 */
function persistSet(key, value) {
    if (localStorage) {
        var storage;
        if (localStorage.raptor) {
            storage = JSON.parse(localStorage.raptor);
        } else {
            storage = {};
        }
        storage[key] = value;
        localStorage.raptor = JSON.stringify(storage);
    }
}

/**
 * Gets the data stored at the supplied key.
 *
 * @param {type} key The key to get the stored data from.
 * @returns {Object} The data stored at the key.
 */
function persistGet(key) {
    if (localStorage) {
        var storage;
        if (localStorage.raptor) {
            storage = JSON.parse(localStorage.raptor);
        } else {
            storage = {};
        }
        return storage[key];
    }
}
;
// File end: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/tools/persist.js
;
// File start: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/tools/range.js
/**
 * @fileOverview Range manipulation helper functions.
 * @license http://www.raptor-editor.com/license
 *
 * @author David Neilsen david@panmedia.co.nz
 * @author Michael Robinson michael@panmedia.co.nz
 */

/**
 * Expands a range to to surround all of the content from its start container
 * to its end container.
 *
 * @param {RangyRange} range The range to expand.
 */
function rangeExpandToParent(range) {
    // <strict/>
    range.setStartBefore(range.startContainer);
    range.setEndAfter(range.endContainer);
}

/**
 * Ensure range selects entire element.
 *
 * @param  {RangyRange} range
 * @param  {Element} element
 */
function rangeSelectElement(range, element) {
    // <strict/>
    range.selectNode($(element)[0]);
}

function rangeSelectElementContent(range, element) {
    // <strict/>
    range.selectNodeContents($(element).get(0));
}

/**
 * Expand range to contain given elements.
 *
 * @param {RangyRange} range The range to expand.
 * @param {array} elements An array of elements to check the current range against.
 */
function rangeExpandTo(range, elements) {
    // <strict/>
    do {
        rangeExpandToParent(range);
        for (var i = 0, l = elements.length; i < l; i++) {
            if ($(range.commonAncestorContainer).is(elements[i])) {
                return;
            }
        }
    } while (range.commonAncestorContainer);
}

/**
 * Replaces the content of range with the given html.
 *
 * @param  {RangyRange} range The range to replace.
 * @param  {jQuery|String} html The html to use when replacing range.
 * @return {Node[]} Array of new nodes inserted.
 */
function rangeReplace(range, html) {
    // <strict/>

    var result = [],
        nodes = $('<div/>').append(html)[0].childNodes;
    range.deleteContents();
    if (nodes.length === undefined || nodes.length === 1) {
        range.insertNode(nodes[0].cloneNode(true));
    } else {
        $.each(nodes, function(i, node) {
            result.unshift(node.cloneNode(true));
            range.insertNodeAtEnd(result[0]);
        });
    }
    return result;
}

/**
 * Empties a supplied range of all the html tags.
 *
 * @param {RangyRange} range This is the range to remove tags from.
 * @returns {boolean} True if the range is empty.
 */
function rangeEmptyTag(range) {
    var html = rangeToHtml(range);
    if (typeof html === 'string') {
        html = html.replace(/([ #;&,.+*~\':"!^$[\]()=>|\/@])/g,'\\$1');
    }
    return stringHtmlStringIsEmpty(html);
}

/**
 * @param  {RangyRange} range
 * @return {Node} The range's start element.
 */
function rangeGetStartElement(range) {
    // <strict/>
    return nodeFindParent(range.startContainer);
}

/**
 * @param  {RangyRange} range
 * @return {Node} The range's end element.
 */
function rangeGetEndElement(range) {
    // <strict/>
    return nodeFindParent(range.endContainer);
}

/**
 * Returns a single selected range's common ancestor.
 * Works for single ranges only.
 *
 * @param {RangyRange} range
 * @return {Element} The range's common ancestor.
 */
function rangeGetCommonAncestor(range) {
    // <strict/>
    return nodeFindParent(range.commonAncestorContainer);
}

/**
 * Returns true if the supplied range is empty (has a length of 0)
 *
 * @public @static
 * @param {RangyRange} range The range to check if it is empty
 */
function rangeIsEmpty(range) {
    // <strict/>
    return range.startOffset === range.endOffset &&
           range.startContainer === range.endContainer;
}

/**
 * @param  {RangyRange} range
 * @param  {Node} node
 * @return {boolean} True if the range is entirely contained by the given node.
 */
function rangeIsContainedBy(range, node) {
    // <strict/>
    var nodeRange = range.cloneRange();
    nodeRange.selectNodeContents(node);
    return nodeRange.containsRange(range);
}

/**
 * @param  {RangyRange} range
 * @param  {Node} node
 * @return {Boolean} True if node is contained within the range, false otherwise.
 */
function rangeContainsNode(range, node) {
    // <strict/>
    return range.containsNode(node);
}

/**
 * Tests whether the range contains all of the text (within text nodes) contained
 * within node. This is to provide an intuitive means of checking whether a range
 * "contains" a node if you consider the range as just in terms of the text it
 * contains without having to worry about niggly details about range boundaries.
 *
 * @param  {RangyRange} range
 * @param  {Node} node
 * @return {Boolean}
 */
function rangeContainsNodeText(range, node) {
    // <strict/>
    return range.containsNodeText(node);
}

/**
 * Removes the white space at the start and the end of the range.
 *
 * @param {RangyRange} range This is the range of selected text.
 */
function rangeTrim(range) {
    // <strict/>
    if (range.startContainer.data) {
        while (/\s/.test(range.startContainer.data.substr(range.startOffset, 1))) {
            range.setStart(range.startContainer, range.startOffset + 1);
        }
    }

    if (range.endContainer.data) {
        while (range.endOffset > 0 && /\s/.test(range.endContainer.data.substr(range.endOffset - 1, 1))) {
            range.setEnd(range.endContainer, range.endOffset - 1);
        }
    }
}

/**
 * Serializes supplied ranges.
 *
 * @param {RangyRange} ranges This is the set of ranges to be serialized.
 * @param {Node} rootNode
 * @returns {String} A string of the serialized ranges separated by '|'.
 */
function rangeSerialize(range, rootNode) {
    // <strict/>
    return rangy.serializeRange(range, true, rootNode);
}

/**
 * Deseralizes supplied ranges.
 *
 * @param {string} serialized This is the already serailized range to be deserialized.
 * @param {Node} rootNode
 * @returns {Array} An array of deserialized ranges.
 */
function rangeDeserialize(serialized, rootNode) {
    // <strict/>
    var serializedRanges = serialized.split("|"),
        ranges = [];
    for (var i = 0, l = serializedRanges.length; i < l; i++) {
        ranges[i] = rangy.deserializeRange(serializedRanges[i], rootNode);
    }
    return ranges;
}

/**
 * Split the selection container and insert the given html between the two elements created.
 *
 * @param  {RangyRange}
 * @param  {jQuery|Element|string} html The html to replace selection with.
 */
function rangeReplaceSplitInvalidTags(range, html, wrapper, validTagNames) {
    // <strict/>
    var commonAncestor = rangeGetCommonAncestor(range);

    if (!elementIsValid(commonAncestor, validTagNames)) {
        commonAncestor = elementFirstInvalidElementOfValidParent(commonAncestor, validTagNames, wrapper);
    }

    // Select from start of selected element to start of selection
    var startRange = rangy.createRange();
    startRange.setStartBefore(commonAncestor);
    startRange.setEnd(range.startContainer, range.startOffset);
    var startFragment = startRange.cloneContents();

    // Select from end of selected element to end of selection
    var endRange = rangy.createRange();
    endRange.setStart(range.endContainer, range.endOffset);
    endRange.setEndAfter(commonAncestor);
    var endFragment = endRange.cloneContents();

    // Replace the start element's html with the content that was not selected, append html & end element's html
    var replacement = elementOuterHtml($(fragmentToHtml(startFragment)));
    replacement += elementOuterHtml($(html).attr('data-replacement', true));
    replacement += elementOuterHtml($(fragmentToHtml(endFragment)));

    replacement = $(replacement);

    $(commonAncestor).replaceWith(replacement);
    replacement = replacement.parent().find('[data-replacement]').removeAttr('data-replacement');

    // Remove empty surrounding tags only if they're of the same type as the split element
    if (replacement.prev().is(commonAncestor.tagName.toLowerCase()) &&
        !replacement.prev().html().trim()) {
        replacement.prev().remove();
    }
    if (replacement.next().is(commonAncestor.tagName.toLowerCase()) &&
        !replacement.next().html().trim()) {
        replacement.next().remove();
    }
    return replacement;
}

/**
 * Replace the given range, splitting the parent elements such that the given html
 * is contained only by valid tags.
 *
 * @param  {RangyRange} range
 * @param  {string} html
 * @param  {Element} wrapper
 * @param  {string[]} validTagNames
 * @return {Element}
 */
function rangeReplaceWithinValidTags(range, html, wrapper, validTagNames) {
    var startElement = nodeFindParent(range.startContainer);
    var endElement = nodeFindParent(range.endContainer);
    var selectedElement = rangeGetCommonAncestor(range);

    var selectedElementValid = elementIsValid(selectedElement, validTagNames);
    var startElementValid = elementIsValid(startElement, validTagNames);
    var endElementValid = elementIsValid(endElement, validTagNames);

    // The html may be inserted within the selected element & selection start / end.
    if (selectedElementValid && startElementValid && endElementValid) {
        return rangeReplace(range, html);
    }

    // Context is invalid. Split containing element and insert list in between.
    return rangeReplaceSplitInvalidTags(range, html, wrapper, validTagNames);
}

function rangeToHtml(range) {
    return fragmentToHtml(range.cloneContents());
}

function rangeGet() {
    var selection = rangy.getSelection();
    if (selection.rangeCount > 0) {
        return selection.getRangeAt(0);
    }
    return null;
}
;
// File end: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/tools/range.js
;
// File start: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/tools/selection.js
/**
 * @fileOverview Selection manipulation helper functions.
 * @license http://www.raptor-editor.com/license
 *
 * @author David Neilsen david@panmedia.co.nz
 * @author Michael Robinson michael@panmedia.co.nz
 */

/**
 * @type {Boolean|Object} current saved selection.
 */
var savedSelection = false;

/**
 * Save selection wrapper, preventing plugins / UI from accessing rangy directly.
 * @todo check desc and type for overwrite.
 * @param {Boolean} overwrite True if selection is able to be overwritten.
 */
function selectionSave(overwrite) {
    if (savedSelection && !overwrite) return;
    savedSelection = rangy.saveSelection();
}

/**
 * Restore selection wrapper, preventing plugins / UI from accessing rangy directly.
 */
function selectionRestore() {
    if (savedSelection) {
        rangy.restoreSelection(savedSelection);
        savedSelection = false;
    }
}

/**
 * Reset saved selection.
 */
function selectionDestroy() {
    if (savedSelection) {
        rangy.removeMarkers(savedSelection);
    }
    savedSelection = false;
}

/**
 * Returns whether the selection is saved.
 *
 * @returns {Boolean} True if there is a saved selection.
 */
function selectionSaved() {
    return savedSelection !== false;
}

/**
 * Iterates over all ranges in a selection and calls the callback for each
 * range. The selection/range offsets is updated in every iteration in in the
 * case that a range was changed or removed by a previous iteration.
 *
 * @public @static
 * @param {function} callback The function to call for each range. The first and only parameter will be the current range.
 * @param {RangySelection} [selection] A RangySelection, or by default, the current selection.
 * @param {object} [context] The context in which to call the callback.
 */
function selectionEachRange(callback, selection, context) {
    selection = selection || rangy.getSelection();
    var range, i = 0;
    // Create a new range set every time to update range offsets
    while (range = selection.getAllRanges()[i++]) {
        callback.call(context, range);
    }
}

/**
 * Replaces the current selection with the specified range.
 *
 * @param {RangySelection} mixed The specified range to replace the current range.
 */
function selectionSet(mixed) {
    rangy.getSelection().setSingleRange(mixed);
}

/**
 * Replaces the given selection (or the current selection if selection is not
 * supplied) with the given html.
 * @todo type for result
 * @public @static
 * @param  {jQuery|String} html The html to use when replacing.
 * @param  {RangySelection|null} selection The selection to replace, or null to replace the current selection.
 * @returns {type} The replaced selection.
 */
function selectionReplace(html, selection) {
    var result = [];
    selectionEachRange(function(range) {
        result = result.concat(rangeReplace(range, html));
    }, selection, this);
    return result;
}

/**
 * Selects all the contents of the supplied element, excluding the element itself.
 *
 * @public @static
 * @param {jQuerySelector|jQuery|Element} element
 * @param {RangySelection} [selection] A RangySelection, or by default, the current selection.
 */
 /*
function selectionSelectInner(element, selection) {
    selection = selection || rangy.getSelection();
    selection.removeAllRanges();
    $(element).focus().contents().each(function() {
        var range = rangy.createRange();
        range.selectNodeContents(this);
        selection.addRange(range);
    });
}
*/
/**
 * Selects all the contents of the supplied node, excluding the node itself.
 *
 * @public @static
 * @param {Node} node
 * @param {RangySelection} [selection] A RangySelection, or by default, the current selection.
 */
function selectionSelectInner(node, selection) {
    // <strict/>
    selection = selection || rangy.getSelection();
    var range = rangy.createRange();
    range.selectNodeContents(node);
    selection.setSingleRange(range);
}

/**
 * Selects all the contents of the supplied node, including the node itself.
 *
 * @public @static
 * @param {Node} node
 * @param {RangySelection} [selection] A RangySelection, or null to use the current selection.
 */
function selectionSelectOuter(node, selection) {
    // <strict/>
    var range = rangy.createRange();
    range.selectNode(node);
    rangy.getSelection().setSingleRange(range);
}

/**
 * Move selection to the start or end of element.
 *
 * @param  {jQuerySelector|jQuery|Element} element The subject element.
 * @param  {RangySelection|null} selection A RangySelection, or null to use the current selection.
 * @param {Boolean} start True to select the start of the element.
 */
function selectionSelectEdge(element, selection, start) {
    selection = selection || rangy.getSelection();
    selection.removeAllRanges();

    $(element).each(function() {
        var range = rangy.createRange();
        range.selectNodeContents(this);
        range.collapse(start);
        selection.addRange(range);
    });
}

/**
 * Move selection to the end of element.
 *
 * @param  {jQuerySelector|jQuery|Element} element The subject element.
 * @param  {RangySelection|null} selection A RangySelection, or null to use the current selection.
 */
function selectionSelectEnd(element, selection) {
    selectionSelectEdge(element, selection, false);
}

/**
 * Move selection to the start of element.
 *
 * @param  {jQuerySelector|jQuery|Element} element The subject element.
 * @param  {RangySelection|null} selection A RangySelection, or null to use the current selection.
 */
function selectionSelectStart(element, selection) {
    selectionSelectEdge(element, selection, true);
}

/**
 * Extend selection to the end of element.
 *
 * @param  {Element} element
 * @param  {RangySelection|null} selection
 */
function selectionSelectToEndOfElement(element, selection) {
    // <strict/>
    selection = selection || rangy.getSelection();
    var range = selectionRange();
    selection.removeAllRanges();
    range.setEndAfter(element.get(0));
    selection.addRange(range);
}

/**
 * Gets the HTML from a selection. If no selection is supplied then current selection will be used.
 *
 * @param  {RangySelection|null} selection Selection to get html from or null to use current selection.
 * @return {string} The html content of the selection.
 */
function selectionGetHtml(selection) {
    selection = selection || rangy.getSelection();
    return selection.toHtml();
}

/**
 * Gets the closest common ancestor container to the given or current selection that isn't a text node.
 * @todo check please
 *
 * @param {RangySelection} range The selection to get the element from.
 * @returns {jQuery} The common ancestor container that isn't a text node.
 */
function selectionGetElement(range, selection) {
    selection = selection || rangy.getSelection();
    if (!selectionExists()) {
        return new jQuery;
    }
    var range = selectionRange(),
        commonAncestor;
    // Check if the common ancestor container is a text node
    if (range.commonAncestorContainer.nodeType === Node.TEXT_NODE) {
        // Use the parent instead
        commonAncestor = range.commonAncestorContainer.parentNode;
    } else {
        commonAncestor = range.commonAncestorContainer;
    }
    return $(commonAncestor);
}

/**
 * Gets all elements within and including the selection's common ancestor that contain a selection (excluding text nodes) and
 * returns them as a jQuery array.
 *
 * @public @static
 * @param {RangySelection|null} A RangySelection, or by default, the current selection.
 */
function selectionGetElements(selection) {
    var result = new jQuery();
    selectionEachRange(function(range) {
        result.push(selectionGetElement(range)[0]);
    }, selection, this);
    return result;
}

/**
 * Gets the start element of a selection.
 * @todo check the type of the return...i guessed and i have a feeling i might be wrong.
 * @returns {jQuery|Object} If the anchor node is a text node then the parent of the anchor node is returned, otherwise the anchor node is returned.
 */
function selectionGetStartElement() {
    var selection = rangy.getSelection();
    if (selection.anchorNode === null) {
        return null;
    }
    if (selection.isBackwards()) {
        return selection.focusNode.nodeType === Node.TEXT_NODE ? $(selection.focusNode.parentElement) : $(selection.focusNode);
    }
    if (!selection.anchorNode) console.trace();
    return selection.anchorNode.nodeType === Node.TEXT_NODE ? $(selection.anchorNode.parentElement) : $(selection.anchorNode);
}

/**
 * Gets the end element of the selection.
 * @returns {jQuery|Object} If the focus node is a text node then the parent of the focus node is returned, otherwise the focus node is returned.
 */
function selectionGetEndElement() {
    var selection = rangy.getSelection();
    if (selection.anchorNode === null) {
        return null;
    }
    if (selection.isBackwards()) {
        return selection.anchorNode.nodeType === Node.TEXT_NODE ? $(selection.anchorNode.parentElement) : $(selection.anchorNode);
    }
    return selection.focusNode.nodeType === Node.TEXT_NODE ? $(selection.focusNode.parentElement) : $(selection.focusNode);
}

/**
 * Checks to see if the selection is at the end of the element.
 *
 * @returns {Boolean} True if the node immediately after the selection ends does not exist or is empty,
 *                      false if the whole nodes' text is not selected or it doesn't fit the criteria for the true clause.
 */
function selectionAtEndOfElement() {
    var selection = rangy.getSelection();
    var focusNode = selection.isBackwards() ? selection.anchorNode : selection.focusNode;
    var focusOffset = selection.isBackwards() ? selection.focusOffset : selection.anchorOffset;
    if (focusOffset !== focusNode.textContent.length) {
        return false;
    }
    var previous = focusNode.nextSibling;
    if (!previous || $(previous).html() === '') {
        return true;
    } else {
        return false;
    }
}

/**
 * Checks to see if the selection is at the start of the element.
 *
 * @returns {Boolean} True if the node immediately before the selection starts does not exist or is empty,
 *                      false if the whole nodes' text is not selected or it doesn't fit the criteria for the true clause.
 */
function selectionAtStartOfElement() {
    var selection = rangy.getSelection();
    var anchorNode = selection.isBackwards() ? selection.focusNode : selection.anchorNode;
    if (selection.isBackwards() ? selection.focusOffset : selection.anchorOffset !== 0) {
        return false;
    }
    var previous = anchorNode.previousSibling;
    if (!previous || $(previous).html() === '') {
        return true;
    } else {
        return false;
    }
}

/**
 * Checks to see if the selection is empty.
 * @returns {Boolean} Returns true if the selection is empty.
 */
function selectionIsEmpty() {
    return rangy.getSelection().toHtml() === '';
}

/**
 * FIXME: this function needs reviewing.
 *
 * This should toggle an inline style, and normalise any overlapping tags, or adjacent (ignoring white space) tags.
 * @todo apparently this needs fixing and i'm not sure what it returns.
 * @public @static
 *
 * @param {String} tag This is the tag to be toggled.
 * @param {Array} options These are any additional properties to add to the element.
 * @returns {selectionToggleWrapper}
 */
function selectionToggleWrapper(tag, options) {
    options = options || {};
    var applier = rangy.createCssClassApplier(options.classes || '', {
        normalize: true,
        elementTagName: tag,
        elementProperties: options.attributes || {}
    });
    selectionEachRange(function(range) {
        if (rangeEmptyTag(range)) {
            var element = $('<' + tag + '/>')
                .addClass(options.classes)
                .attr(options.attributes || {})
                .append(fragmentToHtml(range.cloneContents()));
            rangeReplace(range, element);
        } else {
            applier.toggleRange(range);
        }
    }, null, this);
}

/**
 * @todo method description and check types
 *
 * @param {String} tag The tag for the selection to be wrapped in.
 * @param {String} attributes The attributes to be added to the selection.
 * @param {String} classes The classes to be added to the selection
 */
function selectionWrapTagWithAttribute(tag, attributes, classes) {
    selectionEachRange(function(range) {
        var element = selectionGetElement(range);
        if (element.is(tag)) {
            element.attr(attributes);
        } else {
            selectionToggleWrapper(tag, {
                classes: classes,
                attributes: attributes
            });
        }
    }, null, this);
}

/**
 * Check if there is a current selection.
 *
 * @public @static
 * @returns {Boolean} Returns true if there is at least one range selected.
 */
function selectionExists() {
    return rangy.getSelection().rangeCount !== 0;
}

/**
 * Gets the first range in the current selection. In strict mode if no selection
 * exists an error occurs.
 *
 * @public @static
 * @returns {RangyRange} Returns true if there is at least one range selected.
 */
function selectionRange() {
    // <strict/>
    return rangy.getSelection().getRangeAt(0);
}

/**
 * Split the selection container and insert the given html between the two elements created.
 * @param  {jQuery|Element|string} html The html to replace selection with.
 * @param  {RangySelection|null} selection The selection to replace, or null for the current selection.
 * @returns {Object} The selection container with it's new content added.
 */
function selectionReplaceSplittingSelectedElement(html, selection) {
    selection = selection || rangy.getSelection();

    var selectionRange = selectionRange();
    var selectedElement = selectionGetElements()[0];

    // Select from start of selected element to start of selection
    var startRange = rangy.createRange();
    startRange.setStartBefore(selectedElement);
    startRange.setEnd(selectionRange.startContainer, selectionRange.startOffset);
    var startFragment = startRange.cloneContents();

    // Select from end of selected element to end of selection
    var endRange = rangy.createRange();
    endRange.setStart(selectionRange.endContainer, selectionRange.endOffset);
    endRange.setEndAfter(selectedElement);
    var endFragment = endRange.cloneContents();

    // Replace the start element's html with the content that was not selected, append html & end element's html
    var replacement = elementOuterHtml($(fragmentToHtml(startFragment)));
    replacement += elementOuterHtml($(html).attr('data-replacement', true));
    replacement += elementOuterHtml($(fragmentToHtml(endFragment)));

    replacement = $(replacement);

    $(selectedElement).replaceWith(replacement);
    return replacement.parent().find('[data-replacement]').removeAttr('data-replacement');
}

/**
 * Replace current selection with given html, ensuring that selection container is split at
 * the start & end of the selection in cases where the selection starts / ends within an invalid element.
 *
 * @param  {jQuery|Element|string} html The html to replace current selection with.
 * @param  {Array} validTagNames An array of tag names for tags that the given html may be inserted into without having the selection container split.
 * @param  {RangySeleciton|null} selection The selection to replace, or null for the current selection.
 * @returns {Object} The replaced selection if everything is valid or the selection container with it's new content added.
 */
function selectionReplaceWithinValidTags(html, validTagNames, selection) {
    selection = selection || rangy.getSelection();

    if (!selectionExists()) {
        return;
    }

    var startElement = selectionGetStartElement()[0];
    var endElement = selectionGetEndElement()[0];
    var selectedElement = selectionGetElements()[0];

    var selectedElementValid = elementIsValid(selectedElement, validTagNames);
    var startElementValid = elementIsValid(startElement, validTagNames);
    var endElementValid = elementIsValid(endElement, validTagNames);

    // The html may be inserted within the selected element & selection start / end.
    if (selectedElementValid && startElementValid && endElementValid) {
        return selectionReplace(html);
    }

    // Context is invalid. Split containing element and insert list in between.
    return selectionReplaceSplittingSelectedElement(html, selection);
}

/**
 * Toggles style(s) on the first block level parent element of each range in a selection
 *
 * @public @static
 * @param {Object} styles styles to apply
 * @param {jQuerySelector|jQuery|Element} limit The parent limit element.
 * If there is no block level elements before the limit, then the limit content
 * element will be wrapped with a "div"
 */
function selectionToggleBlockStyle(styles, limit) {
    selectionEachRange(function(range) {
        var parent = $(range.commonAncestorContainer);
        while (parent.length && parent[0] !== limit[0] && (
                parent[0].nodeType === Node.TEXT_NODE || parent.css('display') === 'inline')) {
            parent = parent.parent();
        }
        if (parent[0] === limit[0]) {
            // Only apply block style if the limit element is a block
            if (limit.css('display') !== 'inline') {
                // Wrap the HTML inside the limit element
                elementWrapInner(limit, 'div');
                // Set the parent to the wrapper
                parent = limit.children().first();
            }
        }
        // Apply the style to the parent
        elementToggleStyle(parent, styles);
    }, null, this);
}

/**
 * Iterates throught each block in the selection and calls the callback function.
 *
 * @todo revise blockContainer parameter!
 * @param {function} callback The function to be called on each block in the selection.
 * @param {jQuery} limitElement The element to stop searching for block elements at.
 * @param {undefined|Sring} blockContainer Thia parameter is unused for some reason.
 */
function selectionEachBlock(callback, limitElement, blockContainer) {
    // <strict/>
    selectionEachRange(function(range) {
        // Loop range parents until a block element is found, or the limit element is reached
        var startBlock = elementClosestBlock($(range.startContainer), limitElement),
            endBlock = elementClosestBlock($(range.endContainer), limitElement),
            blocks;
        if (!startBlock || !endBlock) {
            // Wrap the HTML inside the limit element
            callback(elementWrapInner(limitElement, blockContainer).get(0));
        } else {
            if (startBlock.is(endBlock)) {
                blocks = startBlock;
            } else if (startBlock && endBlock) {
                blocks = startBlock.nextUntil(endBlock).andSelf().add(endBlock);
            }
            for (var i = 0, l = blocks.length; i < l; i++) {
                callback(blocks[i]);
            }
        }
    });
}

/**
 * Add or removes a set of classes to the closest block elements in a selection.
 * If the `limitElement` is closer than a block element, then a new
 * `blockContainer` element wrapped around the selection.
 *
 * If any block in the selected text has not got the class applied to it, then
 * the class will be applied to all blocks.
 *
 * @todo revise blockContainer parameter!
 * @param {string[]} addClasses This is a set of classes to be added.
 * @param {string[]} removeClasses This is a set of classes to be removed.
 * @param {jQuery} limitElement The element to stop searching for block elements at.
 * @param {undefined|String} blockContainer Thia parameter is unused for some reason.
 */
function selectionToggleBlockClasses(addClasses, removeClasses, limitElement, blockContainer) {
    // <strict/>

    var apply = false,
        blocks = new jQuery();

    selectionEachBlock(function(block) {
        blocks.push(block);
        if (!apply) {
            for (var i = 0, l = addClasses.length; i < l; i++) {
                if (!$(block).hasClass(addClasses[i])) {
                    apply = true;
                }
            }
        }
    }, limitElement, blockContainer);

    $(blocks).removeClass(removeClasses.join(' '));
    if (apply) {
        $(blocks).addClass(addClasses.join(' '));
    } else {
        $(blocks).removeClass(addClasses.join(' '));
    }
}

/**
 * Removes all ranges from a selection that are not contained within the
 * supplied element.
 *
 * @public @static
 * @param {jQuerySelector|jQuery|Element} element The element to exclude the removal of ranges.
 * @param {RangySelection} [selection] The selection from which to remove the ranges.
 */
function selectionConstrain(node, selection) {
    // <strict/>
    selection = selection || rangy.getSelection();
    var ranges = selection.getAllRanges(),
        newRanges = [];
    for (var i = 0, l = ranges.length; i < l; i++) {
        var newRange = ranges[i].cloneRange();
        if (ranges[i].startContainer !== node &&
                !nodeIsChildOf(ranges[i].startContainer, node)) {
            newRange.setStart(node, 0);
        }
        if (ranges[i].endContainer !== node &&
                !nodeIsChildOf(ranges[i].endContainer, node)) {
            newRange.setEnd(node, node.childNodes.length);
        }
        newRanges.push(newRange);
    }
    selection.setRanges(newRanges);
}

/**
 * Clears the formatting on a supplied selection.
 *
 * @param {Node} limitNode The containing element.
 * @param {RangySelection} [selection] The selection to have it's formatting cleared.
 */
function selectionClearFormatting(limitNode, selection) {
    // <strict/>

    limitNode = limitNode || document.body;
    selection = selection || rangy.getSelection();
    if (selectionExists()) {
        // Create a copy of the selection range to work with
        var range = selectionRange().cloneRange();

        // Get the selected content
        var content = range.extractContents();

        // Expand the range to the parent if there is no selected content
        // and the range's ancestor is not the limitNode
        if (fragmentToHtml(content) === '') {
            rangeSelectElementContent(range, range.commonAncestorContainer);
            selection.setSingleRange(range);
            content = range.extractContents();
        }

        content = $('<div/>').append(fragmentToHtml(content)).html().replace(/(<\/?.*?>)/gi, function(match) {
            if (match.match(/^<(img|object|param|embed|iframe)/) !== null) {
                return match;
            }
            return '';
        });

        // Get the containing element
        var parent = range.commonAncestorContainer;
        while (parent && parent.parentNode !== limitNode) {
            parent = parent.parentNode;
        }

        if (parent) {
            // Place the end of the range after the paragraph
            range.setEndAfter(parent);

            // Extract the contents of the paragraph after the caret into a fragment
            var contentAfterRangeStart = range.extractContents();

            // Collapse the range immediately after the paragraph
            range.collapseAfter(parent);

            // Insert the content
            range.insertNode(contentAfterRangeStart);

            // Move the caret to the insertion point
            range.collapseAfter(parent);
        }
        content = $.parseHTML(content);
        if (content !== null) {
            $(content.reverse()).each(function() {
                if ($(this).is('img')) {
                    range.insertNode($(this).removeAttr('width height class style').get(0));
                    return;
                }
                range.insertNode(this);
            });
        }
    }
}

/**
 * Replaces specified tags and classes on a selection.
 *
 * @todo check descriptions and types please
 * @param {String} tag1 This is the tag to appear on the selection at the end of the method.
 * @param {jQuery} class1 This is the class to appear on the selection at the end of the method.
 * @param {String} tag2 This is the current tag on the selection, which is to be replaced.
 * @param {jQuery} class2 This is the current class on the selection, which is to be replaced.
 */
function selectionInverseWrapWithTagClass(tag1, class1, tag2, class2) {
    selectionSave();
    // Assign a temporary tag name (to fool rangy)
    var id = 'domTools' + Math.ceil(Math.random() * 10000000);

    selectionEachRange(function(range) {
        var applier2 = rangy.createCssClassApplier(class2, {
            elementTagName: tag2
        });

        // Check if tag 2 is applied to range
        if (applier2.isAppliedToRange(range)) {
            // Remove tag 2 to range
            applier2.toggleSelection();
        } else {
            // Apply tag 1 to range
            rangy.createCssClassApplier(class1, {
                elementTagName: id
            }).toggleSelection();
        }
    }, null, this);

    // Replace the temporary tag with the correct tag
    $(id).each(function() {
        $(this).replaceWith($('<' + tag1 + '/>').addClass(class1).html($(this).html()));
    });

    selectionRestore();
}

/**
 * Expands the user selection to encase a whole word.
 */
function selectionExpandToWord() {
    var ranges = rangy.getSelection().getAllRanges();
    if (ranges.length === 1) {
        if (rangeToHtml(ranges[0]) === '') {
            rangy.getSelection().expand('word');
        }
    }
}

/**
 * Expands the user selection to contain the supplied selector, stopping at the specified limit element.
 *
 * @param {jQuerySelector} selector The selector to expand the selection to.
 * @param {jQuerySelector} limit The element to stop at.
 * @param {boolean} outer If true, then the outer most matched element (by the
 *   selector) is wrapped. Otherwise the first matched element is wrapped.
 */
function selectionExpandTo(selector, limit, outer) {
    var ranges = rangy.getSelection().getAllRanges();
    for (var i = 0, l = ranges.length; i < l; i++) {
        // Start container
        var element = $(nodeFindParent(ranges[i].startContainer));
        if (outer || (!element.is(selector) && !element.is(limit))) {
            element = element.parentsUntil(limit, selector);
        }
        if (outer) {
            element = element.last();
        } else {
            element = element.first();
        }
        if (element.length === 1 && !element.is(limit)) {
            ranges[i].setStart(element[0], 0);
        }

        // End container
        element = $(nodeFindParent(ranges[i].endContainer));
        if (outer || (!element.is(selector) && !element.is(limit))) {
            element = element.parentsUntil(limit, selector);
        }
        if (outer) {
            element = element.last();
        } else {
            element = element.first();
        }
        if (element.length === 1 && !element.is(limit)) {
            ranges[i].setEnd(element[0], element[0].childNodes.length);
        }
    }
    rangy.getSelection().setRanges(ranges);
}

/**
 * Trims an entire selection as per rangeTrim.
 *
 * @see rangeTrim
 */
function selectionTrim() {
    if (selectionExists()) {
        var range = selectionRange();
        rangeTrim(range);
        selectionSet(range);
    }
}

/**
 * Finds the inner elements and the wrapping tags for a selector.
 *
 * @param {string} selector A jQuery selector to match the wrapping/inner element against.
 * @param {jQuery} limitElement The element to stop searching at.
 * @returns {jQuery}
 */
function selectionFindWrappingAndInnerElements(selector, limitElement) {
    var result = new jQuery();
    selectionEachRange(function(range) {
        var startNode = range.startContainer;
        while (startNode.nodeType === Node.TEXT_NODE) {
            startNode = startNode.parentNode;
        }

        var endNode = range.endContainer;
        while (endNode.nodeType === Node.TEXT_NODE) {
            endNode = endNode.parentNode;
        }

        var filter = function() {
            if (!limitElement.is(this)) {
                result.push(this);
            }
        };

        do {
            $(startNode).filter(selector).each(filter);

            if (!limitElement.is(startNode) && result.length === 0) {
                $(startNode).parentsUntil(limitElement, selector).each(filter);
            }

            $(startNode).find(selector).each(filter);

            if ($(endNode).is(startNode)) {
                break;
            }

            startNode = $(startNode).next();
        } while (startNode.length > 0 && $(startNode).prevAll().has(endNode).length === 0);
    });
    return result;
}

/**
 * Changes the tags on a selection.
 *
 * @param {String} changeTo The tag to be changed to.
 * @param {String} changeFrom The tag to be changed from.
 * @param {jQuery} limitElement The element to stop changing the tags at.
 */
function selectionChangeTags(changeTo, changeFrom, limitElement) {
    var elements = selectionFindWrappingAndInnerElements(changeFrom.join(','), limitElement);
    if (elements.length) {
        selectionSave();
        elementChangeTag(elements, changeTo);
        selectionRestore();
    } else {
        var limitNode = limitElement.get(0);
        if (limitNode.innerHTML.trim()) {
            selectionSave();
            limitNode.innerHTML = '<' + changeTo + '>' + limitNode.innerHTML + '</' + changeTo + '>';
            selectionRestore();
        } else {
            limitNode.innerHTML = '<' + changeTo + '>&nbsp;</' + changeTo + '>';
            selectionSelectInner(limitNode.childNodes[0]);
        }
    }
}

/**
 * Checks that the selecton only contains valid children.
 *
 * @param {String} selector A string containing a selector expression to match the current set of elements against.
 * @param {jQuery} limit The element to stop changing the tags at.
 * @returns {Boolean} True if the selection contains valid children.
 */
function selectionContains(selector, limit) {
    var result = true;
    selectionEachRange(function(range) {
        // Check if selection only contains valid children
        var children = $(range.commonAncestorContainer).find('*');
        if ($(range.commonAncestorContainer).parentsUntil(limit, selector).length === 0 &&
                (children.length === 0 || children.length !== children.filter(selector).length)) {
            result = false;
        }
    });
    return result;
}

function selectionDelete(selection) {
    selection = selection || rangy.getSelection();
    selection.deleteFromDocument();
}
;
// File end: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/tools/selection.js
;
// File start: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/tools/state.js
/**
 * @fileOverview Save state helper functions.
 * @license http://www.raptor-editor.com/license
 *
 * @author David Neilsen david@panmedia.co.nz
 * @author Michael Robinson michael@panmedia.co.nz
 */

/**
 * Saves the state of an element.
 * @param {jQuery} element The element to have its current state saved.
 * @returns {Object} The saved state of the element.
 */
function stateSave(element) {
    // <strict/>

    var range = rangeGet();
    return {
        element: element.clone(true),
        ranges: range ? rangeSerialize(range, element.get(0)) : null
    };
}

/**
 * Restores an element from its saved state.
 *
 * @param {jQuery} element The element to have its state restored.
 * @param {jQuery} state The state to restore the element to.
 * @returns {Object} The restored element.
 */
function stateRestore(element, state) {
    // <strict/>

    element.replaceWith(state.element);
    var ranges = null;
    try {
        if (state.ranges) {
            ranges = rangeDeserialize(state.ranges, state.element.get(0));
        }
    } catch (exception) {
        // <debug/>
    }
    return {
        element: state.element,
        ranges: ranges
    };
}
;
// File end: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/tools/state.js
;
// File start: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/tools/string.js
/**
 * @fileOverview String helper functions.
 * @license http://www.raptor-editor.com/license
 *
 * @author David Neilsen david@panmedia.co.nz
 * @author Michael Robinson michael@panmedia.co.nz
 */

/**
 * Modification of strip_tags from PHP JS - http://phpjs.org/functions/strip_tags:535.
 * @param  {string} content HTML containing tags to be stripped
 * @param {Array} allowedTags Array of tags that should not be stripped
 * @return {string} HTML with all tags not present allowedTags array.
 */
function stringStripTags(content, allowedTags) {
    // making sure the allowed arg is a string containing only tags in lowercase (<a><b><c>)
    allowed = [];
    for (var allowedTagsIndex = 0; allowedTagsIndex < allowedTags.length; allowedTagsIndex++) {
        if (allowedTags[allowedTagsIndex].match(/[a-z][a-z0-9]{0,}/g)) {
            allowed.push(allowedTags[allowedTagsIndex]);
        }
    }
    // making sure the allowed arg is a string containing only tags in lowercase (<a><b><c>)
    var tags = /<\/?([a-z][a-z0-9]*)\b[^>]*\/?>/gi,
        commentsAndPhpTags = /<!--[\s\S]*?-->|<\?(?:php)?[\s\S]*?\?>/gi;

    return content.replace(commentsAndPhpTags, '').replace(tags, function ($0, $1) {
        return allowed.indexOf($1.toLowerCase()) > -1 ? $0 : '';
    });
}

/**
 * Converts a string in camelcase to lower case words separated with a dash or other supplied delimiter.
 * @param {String} string The string to be converted from camelcase.
 * @param {String} delimiter The character to separate the words, '-' if null.
 * @returns {String} A lowercase string separated by dashes.
 */
function stringCamelCaseConvert(string, delimiter) {
    return string.replace(/([A-Z])/g, function(match) {
        return (delimiter || '-') + match.toLowerCase();
    });
}

/**
 * Checks if an html string is empty.
 *
 * @param {Element} element The element to be checked.
 * @returns {Element}
 */
function stringHtmlStringIsEmpty(html) {
    // <strict/>
    return $($.parseHTML(html)).is(':empty');
}
;
// File end: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/tools/string.js
;
// File start: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/tools/style.js
/**
 * @fileOverview Style helper functions.
 * @license http://www.raptor-editor.com/license
 *
 * @author David Neilsen david@panmedia.co.nz
 * @author Michael Robinson michael@panmedia.co.nz
 */

/**
 * @todo desc all
 * @param {jQuerySelector|jQuery|Element} element This is the element to have its styles swapped.
 * @param {array} newState The new state to be applied to the element.
 * @returns {array}
 */
function styleSwapState(element, newState) {
    var node = element.get(0),
        previousState = {};
    // Double loop because jQuery will automatically assign other style properties like 'margin-left' when setting 'margin'
    for (var key in newState) {
        previousState[key] = node.style[key];
    }
    for (key in newState) {
        element.css(key, newState[key]);
    }
    return previousState;
}

/**
 * @todo type for wrapper and inner and descriptions
 * @param {type} wrapper
 * @param {type} inner
 * @param {array} newState
 * @returns {unresolved}
 */
function styleSwapWithWrapper(wrapper, inner, newState) {
    var innerNode = inner.get(0),
        previousState = {};
    // Double loop because jQuery will automatically assign other style properties like 'margin-left' when setting 'margin'
    for (var key in newState) {
        previousState[key] = innerNode.style[key];
    }
    for (key in newState) {
        wrapper.css(key, inner.css(key));
        inner.css(key, newState[key]);
    }
    return previousState;
}

/**
 * @todo all
 * @param {jQuery} element
 * @param {array} state
 * @returns {undefined}
 */
function styleRestoreState(element, state) {
    for (var key in state) {
        element.css(key, state[key] || '');
    }
}
;
// File end: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/tools/style.js
;
// File start: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/tools/table.js
/**
 * @fileOverview Table helper functions.
 * @license http://www.raptor-editor.com/license
 *
 * @author David Neilsen - david@panmedia.co.nz
 */

/**
 * Create and return a new table element with the supplied number of rows/columns.
 *
 * @public @static
 * @param {int} columns The number of columns to add to the table.
 * @param {int} rows The number of rows to add to the table.
 * @param [options] Extra options to apply.
 * @param [options.placeHolder=""] Place holder HTML to insert into each created cell.
 * @returns {HTMLTableElement}
 */
function tableCreate(columns, rows, options) {
    options = options || {};
    var table = document.createElement('table');
    while (rows--) {
        var row = table.insertRow(0);
        for (var i = 0; i < columns; i++) {
            var cell = row.insertCell(0);
            if (options.placeHolder) {
                cell.innerHTML = options.placeHolder;
            }
        }
    }
    return table;
}

/**
 * Adds a column to a table.
 *
 * @param {HTMLTableElement} table
 * @param {int[]} index Position to insert the column at, starting at 0.
 * @param [options] Extra options to apply.
 * @param [options.placeHolder=""] Place holder HTML to insert into each created cell.
 * @returns {HTMLTableCellElement[]} An array of cells added to the table.
 */
function tableInsertColumn(table, index, options) {
    return resizeTable(table, 0, 0, 1, index, options || {});
}
/**
 * Removes a column from a table.
 *
 * @param {HTMLTableElement} table
 * @param {int} index Position to remove the column at, starting at 0.
 */
function tableDeleteColumn(table, index) {
    resizeTable(table, 0, 0, -1, index);
}

/**
 * Adds a row to a table, and append as many cells as the longest row in the table.
 *
 * @param {HTMLTableElement} table
 * @param {int[]} index Position to insert the row at, starting at 0.
 * @param [options] Extra options to apply.
 * @param [options.placeHolder=""] Place holder HTML to insert into each created cell.
 * @returns {HTMLTableCellElement[]} An array of cells added to the table.
 */
function tableInsertRow(table, index, options) {
    var googTable = new GoogTable(table);
    return googTable.insertRow(index, options);
}

/**
 * Removes a row from a table.
 *
 * @param {HTMLTableElement} table The table to remove the row from.
 * @param {int} index Position to remove the row at, starting at 0.
 */
function tableDeleteRow(table, index) {
    resizeTable(table, -1, index, 0, 0);
}

/**
 * Return the x/y position of a table cell, taking into consideration the column/row span.
 *
 * @param {HTMLTableCellElement} cell The table cell to get the index for.
 * @returns {tableGetCellIndex.Anonym$0}
 */
function tableGetCellIndex(cell) {
    var x, y, tx, ty,
        matrix = [],
        rows = cell.parentNode.parentNode.parentNode.tBodies[0].rows;
    for (var r = 0; r < rows.length; r++) {
        y = rows[r].sectionRowIndex;
        y = r;
        for (var c = 0; c < rows[r].cells.length; c++) {
            x = c;
            while (matrix[y] && matrix[y][x]) {
                // Skip already occupied cells in current row
                x++;
            }
            for (tx = x; tx < x + (rows[r].cells[c].colSpan || 1); ++tx) {
                // Mark matrix elements occupied by current cell with true
                for (ty = y; ty < y + (rows[r].cells[c].rowSpan || 1); ++ty) {
                    if (!matrix[ty]) {
                        // Fill missing rows
                        matrix[ty] = [];
                    }
                    matrix[ty][tx] = true;
                }
            }
            if (cell === rows[r].cells[c]) {
                return {
                    x: x,
                    y: y
                };
            }
        }
    }
}

/**
 * Gets a table cell by a given index.
 *
 * @param {HTMLTableElement} table This is the table to get the cell from.
 * @param {int} index This is the index to find the cell.
 * @returns {HTMLTableCellElement|null} The cell at the specified index.
 */
function tableGetCellByIndex(table, index) {
    var rows = table.tBodies[0].rows;
    for (var r = 0; r < rows.length; r++) {
        for (var c = 0; c < rows[r].cells.length; c++) {
            var currentIndex = tableGetCellIndex(rows[r].cells[c]);
            if (currentIndex.x === index.x &&
                    currentIndex.y === index.y) {
                return rows[r].cells[c];
            }
        }
    }
    return null;
}

/**
 * Returns an array of cells found within the supplied indexes.
 *
 * @param {HTMLTableElement} table
 * @param {int} startIndex This is the index to start searching at.
 * @param {int} endIndex This is the index to stop searching at.
 * @returns {Array} An array of the cells in the range supplied.
 */
function tableCellsInRange(table, startIndex, endIndex) {
    var startX = Math.min(startIndex.x, endIndex.x),
        x = startX,
        y = Math.min(startIndex.y, endIndex.y),
        endX = Math.max(startIndex.x, endIndex.x),
        endY = Math.max(startIndex.y, endIndex.y),
        cells = [];
    while (y <= endY) {
        while (x <= endX) {
            var cell = tableGetCellByIndex(table, {
                x: x,
                y: y
            });
            if (cell !== null) {
                cells.push(cell);
            }
            x++;
        }
        x = startX;
        y++;
    }
    return cells;
}

/**
 * Checks if the cells selected can be merged.
 *
 * @param {HTMLTableElement} table The table to check the selection with.
 * @param {int} startX Selection's start x position.
 * @param {int} startY Selection's start y position.
 * @param {int} endX Selection's end x position.
 * @param {int} endY Selection's end y position.
 */
function tableCanMergeCells(table, startX, startY, endX, endY) {
}

/**
 * Merges the selected cells of a table.
 *
 * @param {HTMLTableElement} table This is the table that is going to have cells merged.
 * @param {int} startX This is the X coordinate to start merging the cells at.
 * @param {int} startY This is the Y coordinate to start merging the cells at.
 * @param {int} endX This is the X coordinate to stop merging the cells at.
 * @param {int} endY This is the Y coordinate to stop merging the cells at.
 */
function tableMergeCells(table, startX, startY, endX, endY) {
    var googTable = new GoogTable(table);
    googTable.mergeCells(startX, startY, endX, endY);
}

/**
 * Checks if the cell at the given index can be split.
 *
 * @param {HTMLTableElement} table Table to check the seleciton with.
 * @param {int} x The X coordinate of the cell to be checked.
 * @param {int} y Ths Y coordinate of the cell to be checked.
 */
function tableCanSplitCells(table, x, y) {
}

/**
 * Splits the selected cell of a table.
 *
 * @param {HTMLTableElement} table The table to find the cell to be split on.
 * @param {int} x The X coordinate of the cell to be split.
 * @param {int} y The Y coordinate of the cell to be split.
 */
function tableSplitCells(table, x, y) {
    var googTable = new GoogTable(table);
    googTable.splitCell(x, y);
}


function tableIsEmpty(table) {
    for (var i = 0, l = table.rows.length; i < l; i++) {
        if (table.rows[i].cells.length > 0) {
            return false;
        }
    }
    return true;
};
// File end: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/tools/table.js
;
// File start: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/tools/template.js
;
// File end: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/tools/template.js
;
// File start: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/tools/types.js
/**
 * @fileOverview Type checking functions.
 * @license http://www.raptor-editor.com/license
 *
 * @author Michael Robinson michael@panmedia.co.nz
 * @author David Neilsen david@panmedia.co.nz
 */

/**
 * Determines whether object is a rangy range.
 *
 * @param {mixed} object The object to be tested.
 * @returns {Boolean} True if the object is a rangy range.
 */
function typeIsRange(object) {
    return object instanceof rangy.WrappedRange;
}

/**
 * Determines whether object is a rangy selection.
 *
 * @param {mixed} object The object to be tested.
 * @returns {Boolean} True if the object is a rangy selection.
 */
function typeIsSelection(object) {
    return object instanceof rangy.WrappedSelection;
}
;
// File end: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/tools/types.js
;
// File start: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-common/adapters/jquery-ui.js
/**
 * @fileOverview jQuery UI helper functions.
 * @license http://www.raptor-editor.com/license
 *
 * @author David Neilsen david@panmedia.co.nz
 * @author Michael Robinson michael@panmedia.co.nz
 */

/**
 * Wrap the jQuery UI button function.
 *
 * @param {Element|Node|selector} element
 * @param {Object|null} options The options relating to the creation of the button.
 * @returns {Element} The modified element.
 */
function aButton(element, options) {
    // <strict/>

    return $(element).button(options);
}

/**
 * Wrap the jQuery UI button's set label function.
 *
 * @param {Element|Node|selector} element
 * @param {String} text The text for the label.
 * @returns {Element} The labelled button.
 */
function aButtonSetLabel(element, text) {
    // <strict/>

    $(element).button('option', 'text', true);
    return $(element).button('option', 'label', text);
}

/**
 * Wrap the jQuery UI button's set icon function.
 *
 * @param {Element|Node|selector} element
 * @param {String} icon The icon name to be added to the button, e.g. 'ui-icon-disk'
 * @returns {Element} The modified button.
 */
function aButtonSetIcon(element, icon) {
    // <strict/>

    return $(element).button('option', 'icons', {
        primary: icon
    });
}

/**
 * Wrap the jQuery UI button's enable function.
 *
 * @param {Element|Node|selector} element
 * @returns {Element} The enabled button.
 */
function aButtonEnable(element) {
    // <strict/>

    return $(element).button('option', 'disabled', false);
}

function aButtonIsEnabled(element) {
    return !$(element).is('.ui-state-disabled');
}

/**
 * Wrap the jQuery UI button's disable function.
 *
 * @param {Element|Node|selector} element
 * @returns {Element} The disabled button.
 */
function aButtonDisable(element) {
    // <strict/>

    return $(element).button('option', 'disabled', true);
}

/**
 * Wrap the jQuery UI button's add class function.
 *
 * @param {Element|Node|selector} element
 * @returns {Element} The highlighted button.
 */
function aButtonActive(element) {
    // <strict/>

    return $(element).addClass('ui-state-highlight');
}

/**
 * Wrap the jQuery UI button's remove class function.
 *
 * @param {Element|Node|selector} element
 * @returns {Element} The button back in its normal state.
 */
function aButtonInactive(element) {
    // <strict/>

    return $(element).removeClass('ui-state-highlight');
}

/**
 * Wrap the jQuery UI button's initialise menu function.
 *
 * @param {Element|Node|selector} element
 * @param {Object|null} options The set of options for menu creation.
 * @returns {Element} The menu.
 */
function aMenu(element, options) {
    // <strict/>

    return $(element).menu(options);
}

/**
 * Initialises a dialog with the given element.
 *
 * @param {Element|Node|selector} element
 * @param {Object|null} options The set of options for the menu.
 * @returns {Element} A dialog.
 */
function aDialog(element, options) {
    // <strict/>

    options.dialogClass = typeof options.dialogClass !== 'undefined' ? options.dialogClass + ' ui-dialog-fixed' : 'ui-dialog-fixed';
    var dialog = $(element).dialog(options);
    dialog.parent().css({
        top: (parseInt(dialog.parent().css('top')) || 0) - $(window).scrollTop()
    });
    dialog.dialog("option", "position", 'center');
    return dialog;
}

/**
 * Wrap the jQuery UI open dialog function.
 *
 * @param {Element|Node|selector} element
 * @returns {Element}
 */
function aDialogOpen(element) {
    // <strict/>

    return $(element).dialog('open');
}

/**
 * Wrap the jQuery UI close dialog function.
 *
 * @param {Element|Node|selector} element
 * @returns {Element}
 */
function aDialogClose(element) {
    // <strict/>

    return $(element).dialog('close');
}

function aDialogRemove(element) {
    // <strict/>

    return $(element).dialog('destroy').remove();
}

/**
 * Wrap the jQuery UI tabs function.
 *
 * @param  {Element|Node|selector} element
 * @param  {Object|null} options
 * @returns {Element}
 */
function aTabs(element, options) {
    // <strict/>

    return $(element).tabs(options);
}
;
// File end: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-common/adapters/jquery-ui.js
;
// File start: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-common/adapters/pnotify.js
function aNotify(options) {
    if (options.type == 'success') {
        options.state = 'confirmation'
    }
    $.pnotify($.extend({
        type: 'success',
        styling: 'jqueryui',
        history: false
    }, options));
}
;
// File end: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-common/adapters/pnotify.js
;
// File start: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/init.js
var $ = jQuery;

$(function() {
    // Initialise rangy
    if (!rangy.initialized) {
        rangy.init();
    }

    // Add helper method to rangy
    if (!$.isFunction(rangy.rangePrototype.insertNodeAtEnd)) {
        rangy.rangePrototype.insertNodeAtEnd = function(node) {
            var range = this.cloneRange();
            range.collapse(false);
            range.insertNode(node);
            range.detach();
            this.setEndAfter(node);
        };
    }
});

// Select menu close event (triggered when clicked off)
$('html').click(function(event) {
    $('.ui-editor-selectmenu-visible')
        .removeClass('ui-editor-selectmenu-visible');
});
;
// File end: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/init.js
;
// File start: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/support.js
var supported, ios, hotkeys, firefox, ie;

function isSupported() {
    if (supported === undefined) {
        supported = true;

        // <ios>
        ios = /(iPhone|iPod|iPad).*AppleWebKit/i.test(navigator.userAgent);
        if (ios) {
            $('html').addClass('raptor-ios');

            // Fixed position hack
            if (ios) {
                $(document).on('scroll', function(){
                    setInterval(function() {
                        $('body').css('height', '+=1').css('height', '-=1');
                    }, 0);
                });
            }
        }
        // </ios>

        firefox = /Firefox/i.test(navigator.userAgent);
        if (firefox) {
            $('html').addClass('raptor-ff');
        }

        // <ie>
        /**
         * Returns the version of Internet Explorer or a -1 (indicating the use of another browser).
         * http://obvcode.blogspot.co.nz/2007/11/easiest-way-to-check-ie-version-with.html
         */
        var ieVersion = (function() {
            var version = -1;
            if (navigator.appVersion.indexOf("MSIE") != -1) {
                version = parseFloat(navigator.appVersion.split("MSIE")[1]);
            }
            return version;
        })();

        ie = ieVersion !== -1;
        if (ie && ieVersion < 9) {
            supported = false;

            // Create message modal
            $(function() {
                var message = $('<div/>')
                    .addClass('raptor-unsupported')
                    .html(
                        '<div class="raptor-unsupported-overlay"></div>' +
                        '<div class="raptor-unsupported-content">' +
                        '    It has been detected that you a using a browser that is not supported by Raptor, please' +
                        '    use one of the following browsers:' +
                        '    <ul>' +
                        '        <li><a href="http://www.google.com/chrome">Google Chrome</a></li>' +
                        '        <li><a href="http://www.firefox.com">Mozilla Firefox</a></li>' +
                        '        <li><a href="http://windows.microsoft.com/ie">Internet Explorer</a></li>' +
                        '    </ul>' +
                        '    <div class="raptor-unsupported-input">' +
                        '        <button class="raptor-unsupported-close">Close</button>' +
                        '        <input name="raptor-unsupported-show" type="checkbox" />' +
                        '        <label>Don\'t show this message again</label>' +
                        '    </div>' +
                        '<div>'
                    )
                    .appendTo('body');

                /**
                 * Sets the z-index CSS property on an element to 1 above all its sibling elements.
                 *
                 * @param {jQuery} element The jQuery element to have it's z index increased.
                 */
                var elementBringToTop = function(element) {
                    var zIndex = 1;
                    element.siblings().each(function() {
                        var z = $(this).css('z-index');
                        if (!isNaN(z) && z > zIndex) {
                            zIndex = z + 1;
                        }
                    });
                    element.css('z-index', zIndex);
                }
                elementBringToTop(message);

                // Close event
                message.find('.raptor-unsupported-close').click(function() {
                    message.remove();
                });
            });
        }
        // </ie>

        hotkeys = jQuery.hotkeys !== undefined;
    }
    return supported;
}

// <ie>

/**
 * Object.create polyfill
 * https://developer.mozilla.org/en-US/docs/JavaScript/Reference/Global_Objects/Object/create
 */
if (!Object.create) {
    Object.create = function (o) {
        if (arguments.length > 1) {
            throw new Error('Object.create implementation only accepts the first parameter.');
        }
        function F() {}
        F.prototype = o;
        return new F();
    };
}

/**
 * Node.TEXT_NODE polyfill
 */
if (typeof Node === 'undefined') {
    Node = {
        TEXT_NODE: 3
    };
}

/**
 * String.trim polyfill
 * https://gist.github.com/eliperelman/1035982
 */
''.trim || (String.prototype.trim = // Use the native method if available, otherwise define a polyfill:
    function () { // trim returns a new string (which replace supports)
        return this.replace(/^[\s\uFEFF]+|[\s\uFEFF]+$/g,'') // trim the left and right sides of the string
    });

// </ie>

// <strict/>;
// File end: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/support.js
;
// File start: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/raptor.js
/**
 * @class
 */
var Raptor =  {

    globalDefaults: {},
    defaults: {},

    /** @type {Boolean} True to enable hotkeys */
    enableHotkeys: true,

    /** @type {Object} Custom hotkeys */
    hotkeys: {},

    /**
     * Plugins added via Raptor.registerPlugin
     * @property {Object} plugins
     */
    plugins: {},

    /**
     * UI added via Raptor.registerUi
     * @property {Object} ui
     */
    ui: {},

    /**
     * Layouts added via Raptor.registerLayout
     * @property {Object} layouts
     */
    layouts: {},

    /**
     * Presets added via Raptor.registerPreset
     * @property {Object} presets
     */
    presets: {},

    hoverPanels: {},

    /**
     * @property {Raptor[]} instances
     */
    instances: [],

    /**
     * @returns {Raptor[]}
     */
    getInstances: function() {
        return this.instances;
    },

    eachInstance: function(callback) {
        for (var i = 0; i < this.instances.length; i++) {
            callback.call(this.instances[i], this.instances[i]);
        }
    },

    /*========================================================================*\
     * Templates
    \*========================================================================*/
    /**
     * @property {String} urlPrefix
     */
    urlPrefix: '/raptor/',

    /**
     * @param {String} name
     * @returns {String}
     */
    getTemplate: function(name, urlPrefix) {
        var template;
        if (!this.templates[name]) {
            // Parse the URL
            var url = urlPrefix || this.urlPrefix;
            var split = name.split('.');
            if (split.length === 1) {
                // URL is for and editor core template
                url += 'templates/' + split[0] + '.html';
            } else {
                // URL is for a plugin template
                url += 'plugins/' + split[0] + '/templates/' + split.splice(1).join('/') + '.html';
            }

            // Request the template
            $.ajax({
                url: url,
                type: 'GET',
                async: false,
                // <debug/>
                // 15 seconds
                timeout: 15000,
                error: function() {
                    template = null;
                },
                success: function(data) {
                    template = data;
                }
            });
            // Cache the template
            this.templates[name] = template;
        } else {
            template = this.templates[name];
        }
        return template;
    },

    /*========================================================================*\
     * Helpers
    \*========================================================================*/

    /**
     * @returns {boolean}
     */
    isDirty: function() {
        var instances = this.getInstances();
        for (var i = 0; i < instances.length; i++) {
            if (instances[i].isDirty()) return true;
        }
        return false;
    },

    /**
     *
     */
    unloadWarning: function() {
        var instances = this.getInstances();
        for (var i = 0; i < instances.length; i++) {
            if (instances[i].isDirty() &&
                    instances[i].isEditing() &&
                    instances[i].options.unloadWarning) {
                return tr('navigateAway');
            }
        }
    },

    /*========================================================================*\
     * Plugins and UI
    \*========================================================================*/

    /**
     * Registers a new UI component, overriding any previous UI components registered with the same name.
     *
     * @param {String} name
     * @param {Object} ui
     */
    registerUi: function(ui) {
        // <strict/>
        this.ui[ui.name] = ui;
    },

    /**
     * Registers a new layout, overriding any previous layout registered with the same name.
     *
     * @param {String} name
     * @param {Object} layout
     */
    registerLayout: function(layout) {
        // <strict/>

        this.layouts[layout.name] = layout;
    },

    registerPlugin: function(plugin) {
        // <strict/>

        this.plugins[plugin.name] = plugin;
    },

    registerPreset: function(preset, setDefault) {
        // <strict/>

        this.presets[preset.name] = preset;
        if (setDefault) {
            this.defaults = preset;
        }
    },

    /*========================================================================*\
     * Persistance
    \*========================================================================*/
    /**
     * @param {String} key
     * @param {mixed} value
     * @param {String} namespace
     */
    persist: function(key, value, namespace) {
        key = namespace ? namespace + '.' + key : key;
        // Local storage throws an error when using XUL
        try {
            if (localStorage) {
                var storage;
                if (localStorage.uiWidgetEditor) {
                    storage = JSON.parse(localStorage.uiWidgetEditor);
                } else {
                    storage = {};
                }
                if (value === undefined) {
                    return storage[key];
                }
                storage[key] = value;
                localStorage.uiWidgetEditor = JSON.stringify(storage);
            }
        } catch (e) {

        }
        return value;
    }

};
;
// File end: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/raptor.js
;
// File start: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/raptor-widget.js
/**
 *
 * @author David Neilsen - david@panmedia.co.nz
 * @author Michael Robinson - michael@panmedia.co.nz
 * @version 0.1
 * @requires jQuery
 * @requires jQuery UI
 * @requires Rangy
 */

/**
 * Set to true when raptor is reloading the page after it has disabled editing.
 *
 * @type Boolean
 */
var disabledReloading = false;

/**
 * @class
 */
var RaptorWidget = {

    /**
     * @constructs RaptorWidget
     */
    _init: function() {
        // Prevent double initialisation
        if (this.element.attr('data-raptor-initialised')) {
            // <debug/>
            return;
        }
        this.element.attr('data-raptor-initialised', true);

        // Add the editor instance to the global list of instances
        if ($.inArray(this, Raptor.instances) === -1) {
            Raptor.instances.push(this);
        }

        var currentInstance = this;

        // <strict/>

        // Set the initial locale
        var locale = this.persist('locale') || this.options.initialLocale;
        if (locale) {
            currentLocale = locale;
        }

        var options = this.options;
        if (this.options.preset) {
            this.options = $.extend(true, {}, Raptor.globalDefaults, Raptor.presets[this.options.preset], this.options);
        } else {
            this.options = $.extend(true, {}, Raptor.globalDefaults, Raptor.defaults, this.options);
        }
        if (options.layouts && options.layouts.toolbar && options.layouts.toolbar.uiOrder) {
            this.options.layouts.toolbar.uiOrder = options.layouts.toolbar.uiOrder;
        }

        // Give the element a unique ID
        if (!this.element.attr('id')) {
            this.element.attr('id', elementUniqueId());
        }

        // Initialise properties
        this.ready = false;
        this.events = {};
        this.plugins = {};
        this.layouts = {};
        this.templates = $.extend({}, Raptor.templates);
        this.target = this.element;
        this.layout = null;
        this.previewState = null;
        this.pausedState = null;
        this.pausedScrollX = null;
        this.pausedScrollY = null;

        // True if editing is enabled
        this.enabled = false;

        // True if editing is enabled at least once
        this.initialised = false;

        // List of UI objects bound to the editor
        this.uiObjects = {};

        // List of hotkeys bound to the editor
        this.hotkeys = {};
        this.hotkeysSuspended = false;

        // If hotkeys are enabled, register any custom hotkeys provided by the user
        if (this.options.enableHotkeys) {
            this.registerHotkey(this.hotkeys);
        }

        // Bind default events
        for (var name in this.options.bind) {
            this.bind(name, this.options.bind[name]);
        }

        // Undo stack, redo pointer
        this.history = [];
        this.present = 0;
        this.historyEnabled = true;

        // Check for browser support
        if (!isSupported()) {
            // @todo If element isn't a textarea, replace it with one
            return;
        }

        // Store the original HTML
        this.setOriginalHtml(this.element.is(':input') ? this.element.val() : this.element.html());
        this.historyPush(this.getOriginalHtml());

        // Replace textareas/inputs with a div
        if (this.element.is(':input')) {
            this.replaceOriginal();
        }

        // Load plugins
        this.loadPlugins();

        // Stores if the current state of the content is clean
        this.dirty = false;

        // Stores the previous state of the content
        this.previousContent = null;

        // Stores the previous selection
        this.previousSelection = null;

        this.getElement().addClass('raptor-editable-block');

        this.loadLayouts();

        // Fire the ready event
        this.ready = true;
        this.fire('ready');

        // Automatically enable the editor if autoEnable is true
        if (this.options.autoEnable) {
            $(function() {
                currentInstance.enableEditing();
            });
        }
    },

    /*========================================================================*\
     * Core functions
    \*========================================================================*/

    /**
     * Attaches the editor's internal events.
     *
     * @fires RaptorWidget#resize
     */
    attach: function() {
        this.bind('change', this.historyPush);

        this.getElement().on('click.raptor', 'img', function(event) {
            selectionSelectOuter(event.target);
            this.checkSelectionChange();
        }.bind(this));
        this.getElement().on('focus.raptor', this.showLayout.bind(this));
        this.target.on('mouseup.raptor', this.checkSelectionChange.bind(this));
        this.target.on('input.raptor', this.checkChange.bind(this));

        // Unload warning
        $(window).bind('beforeunload', Raptor.unloadWarning.bind(Raptor));

        // Trigger editor resize when window is resized
        var editor = this;
        $(window).resize(function(event) {
            editor.fire('resize');
        });
    },

    /**
     * Detaches the editor's internal events.
     */
    detach: function() {
        this.unbind('change');
        this.getElement().off('click.raptor', 'img');
        this.getElement().off('focus.raptor');
        this.getElement().blur();

        this.target.off('mouseup.raptor');
        this.target.off('keyup.raptor');
    },

    /**
     * Reinitialises the editor, unbinding all events, destroys all UI and plugins
     * then recreates them.
     */
    localeChange: function() {
        if (!this.ready) {
            // If the edit is still initialising, wait until its ready
            var localeChange;
            localeChange = function() {
                // Prevent reinit getting called twice
                this.unbind('ready', localeChange);
                this.localeChange();
            };
            this.bind('ready', localeChange);
            return;
        }

        this.actionPreviewRestore();
        var visibleLayouts = [];
        for (var name in this.layouts) {
            if (this.layouts[name].isVisible()) {
                visibleLayouts.push(name);
            }
        }
        this.layoutsDestruct();
        this.events = {};
        this.plugins = {};
        this.uiObjects = {};
        this.hotkeys = {};
        this.loadPlugins();
        this.loadLayouts();
        for (var i = 0; i < visibleLayouts.length; i++) {
            this.layouts[visibleLayouts[i]].show();
        }
        this.checkSelectionChange();
    },

    /**
     * Restore focus to the element being edited.
     */
    restoreFocus: function() {
        this.getElement().focus();
    },

    /**
     * Returns the current content editable element, which will be either the
     * orignal element, or the div the orignal element was replaced with.
     * @returns {jQuery} The current content editable element
     */
    getElement: function() {
        return this.target;
    },

    getNode: function() {
        return this.target[0];
    },

    /**
     *
     */
    getOriginalElement: function() {
        return this.element;
    },

    /**
     * Replaces the original element with a content editable div. Typically used
     * to replace a textarea.
     */
    replaceOriginal: function() {
        if (!this.target.is(':input')) return;

        // Create the replacement div
        var target = $('<div/>')
            // Set the HTML of the div to the HTML of the original element, or if the original element was an input, use its value instead
            .html(this.element.val())
            // Insert the div before the original element
            .insertBefore(this.element)
            // Give the div a unique ID
            .attr('id', elementUniqueId())
            // Copy the original elements class(es) to the replacement div
            .addClass(this.element.attr('class'))
            // Add custom classes
            .addClass(this.options.classes);

        var style = elementGetStyles(this.element);
        for (var i = 0; i < this.options.replaceStyle.length; i++) {
            target.css(this.options.replaceStyle[i], style[this.options.replaceStyle[i]]);
        }

        this.element.hide();
        this.bind('change', function() {
            if (this.getOriginalElement().is(':input')) {
                this.getOriginalElement().val(this.getHtml()).trigger('input');
            } else {
                this.getOriginalElement().html(this.getHtml());
            }
        });

        this.target = target;
    },

    checkSelectionChange: function() {
        // Check if the caret has changed position
        var currentSelection = rangy.serializeSelection(null, false);
        if (this.previousSelection !== currentSelection) {
            this.fire('selectionChange');
        }
        this.previousSelection = currentSelection;
    },

    /**
     * Determine whether the editing element's content has been changed.
     */
    checkChange: function() {
        // Get the current content
        var currentHtml = this.getHtml();

        // Check if the dirty state has changed
        var wasDirty = this.dirty;

        // Check if the current content is different from the original content
        this.dirty = this.originalHtml !== currentHtml;

        // If the current content has changed since the last check, fire the change event
        if (this.previousHtml !== currentHtml) {
            this.previousHtml = currentHtml;
            this.fire('change', [currentHtml]);

            // If the content was changed to its original state, fire the cleaned event
            if (wasDirty !== this.dirty) {
                if (this.dirty) {
                    this.fire('dirty');
                } else {
                    this.fire('cleaned');
                }
            }

            this.checkSelectionChange();
        }
    },

    change: function() {
        this.fire('change', [this.getHtml()]);
    },

    /*========================================================================*\
     * Destructor
    \*========================================================================*/

    /**
     * Hides the toolbar, disables editing, and fires the destroy event, and unbinds any events.
     * @public
     */
    destruct: function(reinitialising) {
        this.disableEditing();

        // Trigger destroy event, for plugins to remove them selves
        this.fire('destroy');

        // Remove all event bindings
        this.events = {};

        // Unbind all events
        this.getElement().off('.raptor');

        if (this.getOriginalElement().is(':input')) {
            this.target.remove();
            this.target = null;
            this.element.show();
        }

        this.layoutsDestruct();
    },

    /**
     * Runs destruct, then calls the UI widget destroy function.
     * @see $.
     */
//    destroy: function() {
//        this.destruct();
//        $.Widget.prototype.destroy.call(this);
//    },

    /*========================================================================*\
     * Preview functions
    \*========================================================================*/

    actionPreview: function(action) {
        this.actionPreviewRestore();
        try {
            var ranges = this.fire('selectionCustomise');
            if (ranges.length > 0) {
                this.previewState = actionPreview(this.previewState, this.target, function() {
                    for (var i = 0, l = ranges.length; i < l; i++) {
                        rangy.getSelection().setSingleRange(ranges[i]);
                        this.selectionConstrain();
                        action();
                    }
                }.bind(this));
            } else {
                this.selectionConstrain();
                this.previewState = actionPreview(this.previewState, this.target, action);
            }
            this.checkSelectionChange();
        } catch (exception) {
            // <strict/>
        }
    },

    actionPreviewRestore: function() {
        if (this.previewState) {
            this.target = actionPreviewRestore(this.previewState, this.target);
            this.previewState = null;
            this.checkSelectionChange();
        }
    },

    actionApply: function(action) {
        this.actionPreviewRestore();
        var state = this.stateSave();
        try {
            var ranges = this.fire('selectionCustomise');
            if (ranges.length > 0) {
                actionApply(function() {
                    for (var i = 0, l = ranges.length; i < l; i++) {
                        rangy.getSelection().setSingleRange(ranges[i]);
                        this.selectionConstrain();
                        actionApply(action, this.history);
                    }
                }.bind(this), this.history);
            } else {
                this.selectionConstrain();
                actionApply(action, this.history);
            }
            this.checkChange();
        } catch (exception) {
            this.stateRestore(state);
            // <strict/>
        }
    },

    actionUndo: function() { },

    actionRedo: function() { },

    stateSave: function() {
        this.selectionConstrain();
        return stateSave(this.target);
    },

    stateRestore: function(state) {
        // if (!this.isEditing()) {
        //     return;
        // }
        var restoredState = stateRestore(this.target, state),
            selection = rangy.getSelection();
        this.target = restoredState.element;
        if (restoredState.ranges !== null) {
            selection.setRanges(restoredState.ranges);
            selection.refresh();
        }
    },

    selectionConstrain: function() {
        selectionConstrain(this.target[0]);
    },

    pause: function() {
        if (!this.pausedState) {
            this.pausedState = this.stateSave()
            this.suspendHotkeys();
            // <jquery-ui>
            // Hack to fix when a dialog is closed, the editable element is focused, and the scroll jumps to the top
            this.pausedScrollX = window.scrollX;
            this.pausedScrollY = window.scrollY;
            // </jquery-ui>
        }
    },

    resume: function() {
        if (this.pausedState) {
            this.stateRestore(this.pausedState);
            this.pausedState = null;
            this.resumeHotkeys();
            this.restoreFocus();
            // <jquery-ui>
            window.scrollTo(this.pausedScrollX, this.pausedScrollY);
            // </jquery-ui>
        }
    },

    /*========================================================================*\
     * Persistance Functions
    \*========================================================================*/

    /**
     * @param {String} key
     * @param {mixed} [value]
     * @returns {mixed}
     */
    persist: function(key, value) {
        if (!this.options.persistence) return null;
        return Raptor.persist(key, value, this.options.namespace);
    },

    /*========================================================================*\
     * Other Functions
    \*========================================================================*/

    /**
     *
     */
    enableEditing: function() {
        if (!this.enabled) {
            this.fire('enabling');

            // Attach core events
            this.attach();

            this.enabled = true;

            this.getElement()
                .addClass(this.options.baseClass + '-editing')
                .addClass(this.options.classes);

            if (this.options.partialEdit) {
                this.getElement().find(this.options.partialEdit).prop('contenteditable', true);
            } else {
                this.getElement().prop('contenteditable', true);
            }

            if (!this.initialised) {
                this.initialised = true;
//                try {
//                    document.execCommand('enableInlineTableEditing', false, false);
//                    document.execCommand('styleWithCSS', true, true);
//                } catch (error) {
//                    // <strict/>
//                }

                for (var name in this.plugins) {
                    this.plugins[name].enable();
                }

                this.bindHotkeys();

                this.getElement().closest('form').on('submit.raptor', function() {
                    clean(this.getElement());
                    this.fire('change', [this.getHtml()]);
                }.bind(this));
            }

            clean(this.getElement());
            this.fire('enabled');
            this.showLayout();

            var selectNode = this.options.partialEdit ? this.getElement().find('[contenteditable]')[0] : this.getNode();
            switch (this.options.autoSelect) {
                case 'all': {
                    selectionSelectInner(selectNode);
                    break;
                }
                case 'start': {
                    var selectInnerNode = $(selectNode).find('*:first')[0];
                    if (!selectInnerNode) {
                        selectionSelectInner(selectNode);
                        break;
                    }
                    var range = rangy.createRange();
                    range.setStartBefore(selectInnerNode);
                    range.setEndBefore(selectInnerNode);
                    selectionSet(range);
                    break;
                }
                case 'end': {
                    var selectInnerNode = $(selectNode).find('*:last')[0];
                    if (!selectInnerNode) {
                        selectionSelectInner(selectNode);
                        break;
                    }
                    selectionSelectInner(selectInnerNode);
                    var range = rangy.createRange();
                    range.setStartAfter(selectInnerNode);
                    range.setEndAfter(selectInnerNode);
                    selectionSet(range);
                    break;
                }
            }
        }
    },

    /**
     *
     */
    disableEditing: function() {
        if (this.enabled) {
            this.detach();
            this.enabled = false;
            this.getElement()
                .prop('contenteditable', false)
                .removeClass(this.options.baseClass + '-editing')
                .removeClass(this.options.classes);
            rangy.getSelection().removeAllRanges();
            this.fire('disabled');
            if (this.options.reloadOnDisable && !disabledReloading) {
                disabledReloading = true;
                window.location.reload();
            }
        }
    },

    cancelEditing: function() {
        this.unify(function(raptor) {
            raptor.stopEditing();
        });
    },

    stopEditing: function() {
        this.fire('cancel');
        if (!this.options.reloadOnDisable) {
            this.resetHtml();
        }
        this.disableEditing();
        this.dirty = false;
        selectionDestroy();
    },

    /**
     *
     * @returns {boolean}
     */
    isEditing: function() {
        return this.enabled;
    },

    /**
     * @param {jQuerySelector|jQuery|Element} element
     * @returns {boolean}
     */
    isRoot: function(element) {
        return this.getElement()[0] === $(element)[0];
    },

    /**
     * @param {function} callback
     * @param {boolean} [callSelf]
     */
    unify: function(callback, callSelf) {
        if (callSelf !== false) {
            callback(this);
        }
        if (this.options.unify) {
            var currentInstance = this;
            Raptor.eachInstance(function(instance) {
                if (instance === currentInstance) {
                    return;
                }
                if (instance.options.unify) {
                    callback(instance);
                }
            });
        }
    },

    /*========================================================================*\
     * Layout
    \*========================================================================*/
    getLayout: function(type) {
        // <strict/>
        return this.layouts[type];
    },

    loadLayouts: function() {
        for (var name in this.options.layouts) {
            if (typeof Raptor.layouts[name] === 'undefined') {
                // <strict/>
                continue;
            }
            this.layouts[name] = this.prepareComponent(Raptor.layouts[name], this.options.layouts[name], 'layout').instance;

            if (this.layouts[name].hotkeys) {
                this.registerHotkey(this.layouts[name].hotkeys, null, this.layouts[name]);
            }
        }
    },

    layoutsDestruct: function() {
        for (var name in this.layouts) {
            this.layouts[name].destruct();
        }
    },

    prepareComponent: function(component, componentOptions, prefix) {
        var instance = $.extend({}, component);

        var options = $.extend({}, this.options, {
            baseClass: this.options.baseClass + '-' + prefix + '-' + stringFromCamelCase(component.name)
        }, instance.options, componentOptions);

        instance.raptor = this;
        instance.options = options;
        // <strict/>
        var init = instance.init();

        return {
            init: init,
            instance: instance
        };
    },

    /**
     * Show the layout for the current element.
     */
    showLayout: function() {
        // <debug/>

        // If unify option is set, hide all other layouts first
        this.unify(function(raptor) {
            raptor.fire('layoutHide');
        }, false);

        this.fire('layoutShow');

        this.fire('resize');
        if (typeof this.getElement().attr('tabindex') === 'undefined') {
            this.getElement().attr('tabindex', -1);
        }
    },

    /*========================================================================*\
     * Template functions
    \*========================================================================*/

    /**
     * @param {String} name
     * @param {Object} variables
     */
    getTemplate: function(name, variables) {
        if (!this.templates[name]) {
            this.templates[name] = templateGet(name, this.options.urlPrefix);
        }
        // <strict/>
        return templateConvertTokens(this.templates[name], variables);
    },

    /*========================================================================*\
     * History functions
    \*========================================================================*/

    /**
     *
     */
    historyPush: function() {
        if (!this.historyEnabled) return;
        var html = this.getHtml();
        if (html !== this.historyPeek()) {
            // Reset the future on change
            if (this.present !== this.history.length - 1) {
                this.history = this.history.splice(0, this.present + 1);
            }

            // Add new HTML to the history
            this.history.push(this.getHtml());

            // Mark the persent as the end of the history
            this.present = this.history.length - 1;

            this.fire('historyChange');
        }
    },

    /**
     * @returns {String|null}
     */
    historyPeek: function() {
        if (!this.history.length) return null;
        return this.history[this.present];
    },

    /**
     *
     */
    historyBack: function() {
        if (this.present > 0) {
            this.present--;
            this.setHtml(this.history[this.present]);
            this.historyEnabled = false;
            this.change();
            this.historyEnabled = true;
            this.fire('historyChange');
        }
    },

    /**
     *
     */
    historyForward: function() {
        if (this.present < this.history.length - 1) {
            this.present++;
            this.setHtml(this.history[this.present]);
            this.historyEnabled = false;
            this.change();
            this.historyEnabled = true;
            this.fire('historyChange');
        }
    },

    /*========================================================================*\
     * Hotkeys
    \*========================================================================*/

    /**
     * @param {Array|String} mixed The hotkey name or an array of hotkeys
     * @param {Object} The hotkey object or null
     */
    registerHotkey: function(mixed, action) {
        // <strict/>

        this.hotkeys[mixed] = action;
    },

    bindHotkeys: function() {
        for (var keyCombination in this.hotkeys) {
            this.getElement().on('keydown.raptor', keyCombination, function(event) {
                if (this.isEditing() && !this.hotkeysSuspended) {
                    var result = this.hotkeys[event.data]();
                    if (result !== false) {
                        event.preventDefault();
                    }
                }
            }.bind(this));
        }
    },

    /**
     * Suspend hotkey functionality.
     */
    suspendHotkeys: function() {
        // <debug/>
        this.hotkeysSuspended = true;
    },

    /**
     * Resume hotkey functionality.
     */
    resumeHotkeys: function() {
        // <debug/>
        this.hotkeysSuspended = false;
    },

    /*========================================================================*\
     * Buttons
    \*========================================================================*/

    isUiEnabled: function(ui) {
        // Check if we are not automatically enabling UI, and if not, check if the UI was manually enabled
        if (this.options.enableUi === false &&
                typeof this.options.plugins[ui] === 'undefined' ||
                this.options.plugins[ui] === false) {
            // <debug/>
            return false;
        }

        // Check if we have explicitly disabled UI
        if ($.inArray(ui, this.options.disabledUi) !== -1 ||
                $.inArray(ui, this.options.disabledPlugins) !== -1) {
            // <strict/>
            return false;
        }

        return true;
    },

    /**
     * @deprecated
     * @param  {String} ui Name of the UI object to be returned.
     * @return {Object|null} UI object referenced by the given name.
     */
    getUi: function(ui) {
        // <strict/>
        return this.uiObjects[ui];
    },

    /*========================================================================*\
     * Plugins
    \*========================================================================*/
    /**
     * @param {String} name
     * @return {Object|undefined} plugin
     */
    getPlugin: function(name) {
        return this.uiObjects[name] || this.plugins[name];
    },

    /**
     *
     */
    loadPlugins: function() {
        var editor = this;

        if (!this.options.plugins) {
            this.options.plugins = {};
        }

        for (var name in Raptor.plugins) {
            // Check if we are not automaticly enabling plugins, and if not, check if the plugin was manually enabled
            if (this.options.enablePlugins === false &&
                    typeof this.options.plugins[name] === 'undefined' ||
                    this.options.plugins[name] === false) {
                // <debug/>
                continue;
            }

            // Check if we have explicitly disabled the plugin
            if ($.inArray(name, this.options.disabledUi) !== -1 ||
                    $.inArray(name, this.options.disabledPlugins) !== -1) {
                // <strict/>
                continue;
            }

            editor.plugins[name] = this.prepareComponent(Raptor.plugins[name], editor.options.plugins[name], 'plugin').instance;
        }
    },

    /*========================================================================*\
     * Content accessors
    \*========================================================================*/

    /**
     * @returns {boolean}
     */
    isDirty: function() {
        return this.dirty;
    },

    /**
     * @returns {String}
     */
    getHtml: function() {
        return this.getElement().html();
    },

    clean: function() {
        this.actionApply(function() {
            clean(this.getElement());
        }.bind(this));
    },

    /**
     * @param {String} html
     */
    setHtml: function(html) {
        this.getElement().html(html);
        this.fire('html');
        this.checkChange();
    },

    /**
     *
     */
    resetHtml: function() {
        this.setHtml(this.getOriginalHtml());
        this.fire('cleaned');
    },

    /**
     * @returns {String}
     */
    getOriginalHtml: function() {
        return this.originalHtml;
    },

    /**
     *
     */
    saved: function(args) {
        this.setOriginalHtml(this.getHtml());
        this.dirty = false;
        this.fire('saved', args);
        this.fire('cleaned');
    },

    /**
     * @param {String} html
     */
    setOriginalHtml: function(html) {
        this.originalHtml = html;
    },

    /*========================================================================*\
     * Event handling
    \*========================================================================*/
    /**
     * @param {String} name
     * @param {function} callback
     * @param {Object} [context]
     */
    bind: function(name, callback, context) {
        if (typeof callback === 'undefined' ||
            !$.isFunction(callback)) {
            // <strict/>
            return;
        }
        var names = name.split(/,\s*/);
        for (var i = 0, l = names.length; i < l; i++) {
            if (!this.events[names[i]]) {
                this.events[names[i]] = [];
            }
            this.events[names[i]].push({
                context: context,
                callback: callback
            });
        }
    },

    /**
     * @param {String} name
     * @param {function} callback
     * @param {Object} [context]
     */
    unbind: function(name, callback, context) {
        for (var i = 0, l = this.events[name].length; i < l; i++) {
            if (this.events[name][i] &&
                this.events[name][i].callback === callback &&
                this.events[name][i].context === context) {
                this.events[name].splice(i, 1);
            }
        }
    },

    /**
     * @param {String} name
     * @param {boolean} [global]
     * @param {boolean} [sub]
     */
    fire: function(name, args) {
        var result = [];

        // <debug/>

        if (this.events[name]) {
            for (var i = 0, l = this.events[name].length; i < l; i++) {
                var event = this.events[name][i];
                if (typeof event !== 'undefined' &&
                        typeof event.callback !== 'undefined') {
                    var currentResult = event.callback.apply(event.context || this, args);
                    if (typeof currentResult !== 'undefined') {
                        result = result.concat(currentResult);
                    }
                }
            }
        }

        return result;
    }
};

$.widget('ui.raptor', RaptorWidget);
$.fn.raptor.Raptor = Raptor;;
// File end: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/raptor-widget.js
;
// File start: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/components/layout.js
function RaptorLayout(name) {
    this.name = name;
}

RaptorLayout.prototype.init = function() {
};

RaptorLayout.prototype.destruct = function() {
};

RaptorLayout.prototype.isVisible = function() {
    return false;
};

RaptorLayout.prototype.show = function() {
};

RaptorLayout.prototype.hide = function() {
};
;
// File end: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/components/layout.js
;
// File start: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/components/plugin.js
/**
 * @fileOverview Contains the raptor plugin class code.
 * @license http://www.raptor-editor.com/license
 *
 * @author David Neilsen <david@panmedia.co.nz>
 * @author Michael Robinson <michael@panmedia.co.nz>
 * @author Melissa Richards <melissa@panmedia.co.nz>
 */

/**
 * @class The raptor plugin class.
 *
 * @todo type and desc for name.
 * @param {type} name
 * @param {Object} overrides Options hash.
 * @returns {RaptorPlugin}
 */
function RaptorPlugin(name, overrides) {
    this.name = name;
    for (var key in overrides) {
        this[key] = overrides[key];
    }
}

/**
 * Initialize the raptor plugin.
 */
RaptorPlugin.prototype.init = function() {};

/**
 * Enable the raptor plugin.
 */
RaptorPlugin.prototype.enable = function() {};
;
// File end: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/components/plugin.js
;
// File start: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/components/layout/ui-group.js
function UiGroup(raptor, uiOrder) {
    this.raptor = raptor;
    this.uiOrder = uiOrder;
};

UiGroup.prototype.appendTo = function(layout, panel) {
    // Loop the UI component order option
    for (var i = 0, l = this.uiOrder.length; i < l; i++) {
        var uiGroupContainer = $('<div/>')
            .addClass(this.raptor.options.baseClass + '-layout-toolbar-group');

        // Loop each UI in the group
        var uiGroup = this.uiOrder[i];
        for (var ii = 0, ll = uiGroup.length; ii < ll; ii++) {
            // Check if the UI component has been explicitly disabled
            if (!this.raptor.isUiEnabled(uiGroup[ii])) {
                continue;
            }

            // Check the UI has been registered
            if (Raptor.ui[uiGroup[ii]]) {
                var uiOptions = this.raptor.options.plugins[uiGroup[ii]];
                if (uiOptions === false) {
                    continue;
                }

                var component = this.raptor.prepareComponent(Raptor.ui[uiGroup[ii]], uiOptions, 'ui');
                component.instance.layout = layout;

                this.raptor.uiObjects[uiGroup[ii]] = component.instance;

                if (typeIsElement(component.init)) {
                    // Fix corner classes
                    component.init.removeClass('ui-corner-all');

                    // Append the UI object to the group
                    uiGroupContainer.append(component.init);
                }
            }
            // <strict/>
        }

        // Append the UI group to the editor toolbar
        if (uiGroupContainer.children().length > 0) {
            uiGroupContainer.appendTo(panel);
        }
    }

    // Fix corner classes
    panel.find('.ui-button:first-child').addClass('ui-corner-left');
    panel.find('.ui-button:last-child').addClass('ui-corner-right');
};
;
// File end: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/components/layout/ui-group.js
;
// File start: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/components/layout/toolbar.js
/**
 * @fileOverview Toolbar layout.
 * @license http://www.raptor-editor.com/license
 *
 * @author David Neilsen david@panmedia.co.nz
 * @author Michael Robinson michael@panmedia.co.nz
 */

function ToolbarLayout() {
    RaptorLayout.call(this, 'toolbar');
    this.wrapper = null;
}

ToolbarLayout.prototype = Object.create(RaptorLayout.prototype);

ToolbarLayout.prototype.init = function() {
    this.raptor.bind('enabled', this.show.bind(this));
    this.raptor.bind('disabled', this.hide.bind(this));
    this.raptor.bind('layoutShow', this.show.bind(this));
    this.raptor.bind('layoutHide', this.hide.bind(this));
    $(window).resize(this.constrainPosition.bind(this));
};

ToolbarLayout.prototype.destruct = function() {
    if (this.wrapper) {
        this.wrapper.remove();
        this.wrapper = null;
    }
    this.raptor.fire('toolbarDestroy');
};

/**
 * Show the toolbar.
 *
 * @fires RaptorWidget#toolbarShow
 */
ToolbarLayout.prototype.show = function() {
    if (!this.isVisible()) {
        this.getElement().css('display', '');
        this.constrainPosition();
        this.raptor.fire('toolbarShow');
    }
};

/**
 * Hide the toolbar.
 *
 * @fires RaptorWidget#toolbarHide
 */
ToolbarLayout.prototype.hide = function() {
    if (this.isReady()) {
        this.getElement().css('display', 'none');
        this.raptor.fire('toolbarHide');
    }
};

ToolbarLayout.prototype.initDragging = function() {
    if ($.fn.draggable &&
            this.options.draggable &&
            !this.getElement().data('ui-draggable')) {
        // <debug/>
        this.getElement().draggable({
            cancel: 'a, button',
            cursor: 'move',
            stop: this.constrainPosition.bind(this)
        });
        // Remove the relative position
        this.getElement().css('position', 'fixed');

        // Set the persistent position
        var pos = this.raptor.persist('position') || this.options.dialogPosition;

        if (!pos) {
            pos = [10, 10];
        }

        // <debug/>

        if (parseInt(pos[0], 10) + this.getElement().outerHeight() > $(window).height()) {
            pos[0] = $(window).height() - this.getElement().outerHeight();
        }
        if (parseInt(pos[1], 10) + this.getElement().outerWidth() > $(window).width()) {
            pos[1] = $(window).width() - this.getElement().outerWidth();
        }

        this.getElement().css({
            top: Math.abs(parseInt(pos[0], 10)),
            left: Math.abs(parseInt(pos[1], 10))
        });
    }
};

ToolbarLayout.prototype.enableDragging = function() {
    if ($.fn.draggable &&
            this.options.draggable &&
            this.getElement().data('ui-draggable')) {
        this.getElement().draggable('enable');
    }
};

ToolbarLayout.prototype.disableDragging = function() {
    if ($.fn.draggable &&
            this.options.draggable &&
            this.getElement().is('.ui-draggable')) {
        this.getElement().draggable('disable').removeClass('ui-state-disabled');
    }
};

ToolbarLayout.prototype.isReady = function() {
    return this.wrapper !== null;
};

ToolbarLayout.prototype.isVisible = function() {
    return this.isReady() && this.getElement().is(':visible');
};

ToolbarLayout.prototype.constrainPosition = function() {
    if (this.isVisible()) {
        var x = parseInt(this.wrapper.css('left')) || -999,
            y = parseInt(this.wrapper.css('top')) || -999,
            width = this.wrapper.outerWidth(),
            height = this.wrapper.outerHeight(),
            windowWidth = $(window).width(),
            windowHeight = $(window).height(),
            newX = Math.max(0, Math.min(x, windowWidth - width)),
            newY = Math.max(0, Math.min(y, windowHeight - height));

        if (newX !== x || newY !== y) {
            this.wrapper.css({
                left: newX,
                top: newY
            });
        }

        // Save the persistent position
        this.raptor.persist('position', [
            this.wrapper.css('top'),
            this.wrapper.css('left')
        ]);
    }
};

ToolbarLayout.prototype.getElement = function() {
    if (this.wrapper === null) {
        // Load all UI components if not supplied
        if (!this.options.uiOrder) {
            this.options.uiOrder = [[]];
            for (var name in Raptor.ui) {
                this.options.uiOrder[0].push(name);
            }
        }

        // <debug/>

        var toolbar = this.toolbar = $('<div/>')
            .addClass(this.options.baseClass + '-toolbar');
        var innerWrapper = this.toolbarWrapper = $('<div/>')
            .addClass(this.options.baseClass + '-inner')
            .addClass('ui-widget-content')
            .mousedown(function(event) {
                event.preventDefault();
            })
            .append(toolbar);
        var path = this.path = $('<div/>')
            .addClass(this.options.baseClass + '-path')
            .addClass('ui-widget-header');
        var wrapper = this.wrapper = $('<div/>')
            .addClass(this.options.baseClass + '-outer ' + this.raptor.options.baseClass + '-layout')
            .css('display', 'none')
            .append(path)
            .append(innerWrapper);

        var uiGroup = new UiGroup(this.raptor, this.options.uiOrder);
        uiGroup.appendTo(this, this.toolbar);
        $('<div/>').css('clear', 'both').appendTo(this.toolbar);

        $(function() {
            wrapper.appendTo('body');
            this.initDragging();
            this.constrainPosition(true);
            this.raptor.fire('layoutReady', [this.wrapper]);
            this.raptor.fire('toolbarReady', [this]);
        }.bind(this));
    }
    return this.wrapper;
};

Raptor.registerLayout(new ToolbarLayout());
;
// File end: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/components/layout/toolbar.js
;
// File start: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/components/layout/hover-panel.js
/**
 * @fileOverview Hover panel layout.
 * @license http://www.raptor-editor.com/license
 *
 * @author David Neilsen david@panmedia.co.nz
 * @author Michael Robinson michael@panmedia.co.nz
 */

function HoverPanelLayout() {
    RaptorLayout.call(this, 'hoverPanel');
    this.hoverPanel = null;
    this.visible = false;
}

HoverPanelLayout.prototype = Object.create(RaptorLayout.prototype);

HoverPanelLayout.prototype.init = function() {
    this.raptor.bind('ready', this.ready.bind(this));
    this.raptor.bind('enabled', this.enabled.bind(this));
};

HoverPanelLayout.prototype.ready = function() {
    this.raptor.getElement()
        .mouseenter(this.show.bind(this))
        .mouseleave(this.hide.bind(this));
};

HoverPanelLayout.prototype.enabled = function() {
    this.getElement().hide();
};

HoverPanelLayout.prototype.getElement = function() {
    if (this.hoverPanel === null) {
        this.hoverPanel = $('<div/>')
            .addClass(this.raptor.options.baseClass + '-layout ' + this.options.baseClass)
            .mouseleave(this.hide.bind(this));

        var uiGroup = new UiGroup(this.raptor, this.options.uiOrder);
        uiGroup.appendTo(this, this.hoverPanel);

        $(window).bind('scroll', this.position.bind(this));

        this.hoverPanel
            .appendTo('body');

        this.raptor.fire('layoutReady', [this.hoverPanel]);
    }
    return this.hoverPanel;
};

HoverPanelLayout.prototype.show = function(event) {
    if (!this.raptor.isEditing()) {
        this.visible = true;
        this.getElement().show();
        this.position();
        this.raptor.getElement().addClass(this.raptor.options.baseClass + '-editable-block-hover');
    }
};

HoverPanelLayout.prototype.hide = function(event) {
    if (!this.visible) {
        return;
    }
    if (!event) {
        return;
    }
    if ($.contains(this.getElement().get(0), event.relatedTarget)) {
        return;
    }
    if (event.relatedTarget === this.getElement().get(0)) {
        return;
    }
    if (this.getElement().get(0) === $(event.relatedTarget).parent().get(0)) {
        return;
    }
    if ($.contains(this.raptor.getElement().get(0), event.relatedTarget)) {
        return;
    }
    if (event.relatedTarget === this.raptor.getElement().get(0)) {
        return;
    }
    this.visible = false;
    this.getElement().hide();
    this.raptor.getElement().removeClass(this.raptor.options.baseClass + '-editable-block-hover');
};

HoverPanelLayout.prototype.position = function() {
    if (this.visible) {
        var visibleRect = elementVisibleRect(this.raptor.getElement());
        this.getElement().css({
            // Calculate offset center for the hoverPanel
            top:  visibleRect.top  + ((visibleRect.height / 2) - (this.getElement().outerHeight() / 2)),
            left: visibleRect.left + ((visibleRect.width / 2)  - (this.getElement().outerWidth()  / 2))
        });
    }
};

HoverPanelLayout.prototype.destruct = function() {
    if (this.hoverPanel) {
        this.hoverPanel.remove();
        this.hoverPanel = null;
    }
    this.visible = false;
};

Raptor.registerLayout(new HoverPanelLayout());
;
// File end: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/components/layout/hover-panel.js
;
// File start: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/components/layout/element-hover-panel.js
/**
 * @fileOverview Element hover panel layout.
 * @license http://www.raptor-editor.com/license
 *
 * @author David Neilsen david@panmedia.co.nz
 */

function ElementHoverPanelLayout() {
    RaptorLayout.call(this, 'elementHoverPanel');
    this.elements = 'img';
    this.hoverPanel = null;
    this.visible = false;
    this.target = null;
    this.enabled = true;
}

ElementHoverPanelLayout.prototype = Object.create(RaptorLayout.prototype);

ElementHoverPanelLayout.prototype.init = function() {
    this.raptor.bind('ready', this.ready.bind(this));
};

ElementHoverPanelLayout.prototype.ready = function() {
    this.raptor.getElement()
        .on('mouseenter', this.options.elements, this.show.bind(this))
        .on('mouseleave', this.options.elements, this.hide.bind(this));
};

ElementHoverPanelLayout.prototype.getElement = function() {
    if (this.hoverPanel === null) {
        this.hoverPanel = $('<div/>')
            .addClass(this.raptor.options.baseClass + '-layout raptor-layout-hover-panel ' + this.options.baseClass)
            .mouseleave(this.hide.bind(this));

        var uiGroup = new UiGroup(this.raptor, this.options.uiOrder);
        uiGroup.appendTo(this, this.hoverPanel);

        $(window).bind('scroll', this.position.bind(this));

        this.hoverPanel
            .appendTo('body');

        this.raptor.fire('layoutReady', [this.hoverPanel]);
    }
    return this.hoverPanel;
};

ElementHoverPanelLayout.prototype.show = function(event) {
    if (this.enabled && this.raptor.isEditing()) {
        this.target = event.target;
        this.visible = true;
        elementPositionOver(this.getElement().show(), $(this.target));
    }
};

ElementHoverPanelLayout.prototype.hide = function(event) {
    if (!this.visible) {
        return;
    }
    if (event) {
        if ($.contains(this.getElement().get(0), event.relatedTarget)) {
            return;
        }
        if (event.relatedTarget === this.getElement().get(0)) {
            return;
        }
        if (this.getElement().get(0) === $(event.relatedTarget).parent().get(0)) {
            return;
        }
        if ($.contains(this.raptor.getElement().get(0), event.relatedTarget)) {
            return;
        }
        if (event.relatedTarget === this.raptor.getElement().get(0)) {
            return;
        }
    }
    this.visible = false;
    this.getElement().hide();
};

ElementHoverPanelLayout.prototype.close = function() {
    if (this.visible) {
        this.enabled = false;
        this.visible = false;
        this.getElement().hide();
        setTimeout(function() {
            this.enabled = true;
        }.bind(this), 1000);
    }
};

ElementHoverPanelLayout.prototype.position = function() {
    if (this.visible) {
        elementPositionOver(this.getElement(), $(this.target));
    }
};

ElementHoverPanelLayout.prototype.destruct = function() {
    if (this.hoverPanel) {
        this.hoverPanel.remove();
        this.hoverPanel = null;
    }
    this.visible = false;
};

Raptor.registerLayout(new ElementHoverPanelLayout());
;
// File end: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/components/layout/element-hover-panel.js
;
// File start: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/components/ui/button.js
/**
 * @fileOverview Contains the core button class code.
 * @license http://www.raptor-editor.com/license
 *
 * @author David Neilsen <david@panmedia.co.nz>
 * @author Michael Robinson <michael@panmedia.co.nz>
 * @author Melissa Richards <melissa@panmedia.co.nz>
 */

/**
 * @class The core button class.
 *
 * @param {Object} overrides Options hash.
 */
function Button(overrides) {
    this.text = false;
    this.label = null;
    this.icon = null;
    this.hotkey = null;
    for (var key in overrides) {
        this[key] = overrides[key];
    }
}

/**
 * Initialize the button.
 *
 * @return {Element}
 */
Button.prototype.init = function() {
    // Bind hotkeys
    if (typeof this.hotkey === 'string') {
        this.raptor.registerHotkey(this.hotkey, this.action.bind(this));
    } else if (typeIsArray(this.hotkey)) {
        for (var i = 0, l = this.hotkey.length; i < l; i++) {
            this.raptor.registerHotkey(this.hotkey[i], this.action.bind(this));
        }
    }

    // Return the button
    return this.getButton();
};

/**
 * Prepare and return the button Element to be used in the Raptor UI.
 *
 * @return {Element}
 */
Button.prototype.getButton = function() {
    if (!this.button) {
        var text = this.text || this.translate('Text', false);
        this.button = $('<div>')
            .html(text)
            .addClass(this.options.baseClass)
            .attr('title', this.getTitle())
            .click(this.click.bind(this));
        aButton(this.button, {
            icons: {
                primary: this.getIcon()
            },
            text: text,
            label: this.label
        });
    }
    return this.button;
};

/**
 * @return {String} The button's title property value, or if not present then the
 *   localized value for the button's name + Title.
 */
Button.prototype.getTitle = function() {
    return this.title || this.translate('Title');
};

/**
 * @return {String} The button's icon property value, or the ui-icon- prefix
 *   with the button's camel cased name appended.
 */
Button.prototype.getIcon = function() {
    if (this.icon === null) {
        return 'ui-icon-' + stringCamelCaseConvert(this.name);
    }
    return this.icon;
};

/**
 * Perform the button's action.
 *
 * @todo this probably should not nest actions
 */
Button.prototype.click = function() {
    if (aButtonIsEnabled(this.button)) {
        this.raptor.actionApply(this.action.bind(this));
    }
};

Button.prototype.translate = function(translation, variables) {
    return tr(this.name + translation, variables);
};
;
// File end: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/components/ui/button.js
;
// File start: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/components/ui/preview-button.js
/**
 * @fileOverview Contains the preview button class code.
 * @license http://www.raptor-editor.com/license
 *
 * @author David Neilsen <david@panmedia.co.nz>
 * @author Michael Robinson <michael@panmedia.co.nz>
 * @author Melissa Richards <melissa@panmedia.co.nz>
 */

/**
 * @class the preview button class.
 *
 * @constructor
 * @augments Button
 *
 * @param {Object} options
 */
function PreviewButton(options) {
    this.preview = true;
    this.previewing = false;
    Button.call(this, options);
}

PreviewButton.prototype = Object.create(Button.prototype);

/**
 * Initialize the toggle preview button.
 *
 * @returns {Element}
 */
PreviewButton.prototype.init = function() {
    this.preview = typeof this.options.preview === 'undefined' ? true : false;
    return Button.prototype.init.apply(this, arguments);
};

/**
 * Prepare and return the preview button Element to be used in the Raptor UI.
 *
 * @returns {Element}
 */
PreviewButton.prototype.getButton = function() {
    if (!this.button) {
        this.button = Button.prototype.getButton.call(this)
            .mouseenter(this.mouseEnter.bind(this))
            .mouseleave(this.mouseLeave.bind(this));
    }
    return this.button;
};

/**
 * Sets the mouse enter function to enable the preview.
 */
PreviewButton.prototype.mouseEnter = function() {
    if (this.canPreview()) {
        this.previewing = true;
        this.raptor.actionPreview(this.action.bind(this));
    }
};

/**
 * Sets the mouse leave function to disable the preview.
 */
PreviewButton.prototype.mouseLeave = function() {
    this.previewing = false;
    this.raptor.actionPreviewRestore();
};

/**
 * Sets the click function to disable the preview and apply the style.
 *
 * @returns {Element}
 */
PreviewButton.prototype.click = function() {
    this.previewing = false;
    return Button.prototype.click.apply(this, arguments);
};

/**
 * Checks if the Element is able to generate a preview.
 *
 * @todo check as i guessed this.
 * @returns {Boolean} True if preview available.
 */
PreviewButton.prototype.canPreview = function() {
    return this.preview;
};
/**
 * Checks if the Element is in it's preview state.
 *
 * @todo check as i guessed this.
 * @returns {Boolean} True if in previewing state.
 */
PreviewButton.prototype.isPreviewing = function() {
    return this.previewing;
};
;
// File end: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/components/ui/preview-button.js
;
// File start: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/components/ui/toggle-button.js
/**
 * @fileOverview Contains the core button class code.
 * @license http://www.raptor-editor.com/license
 *
 * @author David Neilsen <david@panmedia.co.nz>
 * @author Michael Robinson <michael@panmedia.co.nz>
 * @author Melissa Richards <melissa@panmedia.co.nz>
 */

/**
 * The toggle button class.
 *
 * @constructor
 * @augments Button
 *
 * @param {Object} options
 */
function ToggleButton(options) {
    this.disable = false;
    Button.call(this, options);
}

ToggleButton.prototype = Object.create(Button.prototype);

/**
 * Initialize the toggle button.
 *
 * @returns {Element}
 */
ToggleButton.prototype.init = function() {
    this.raptor.bind('selectionChange', this.selectionChange.bind(this));
    return Button.prototype.init.apply(this, arguments);
};

/**
 * Changes the state of the button depending on whether it is active or not.
 */
ToggleButton.prototype.selectionChange = function() {
    if (this.selectionToggle()) {
        aButtonActive(this.button);
        if (this.disable) {
            aButtonEnable(this.button);
        }
    } else {
        aButtonInactive(this.button);
        if (this.disable) {
            aButtonDisable(this.button);
        }
    }
};
;
// File end: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/components/ui/toggle-button.js
;
// File start: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/components/ui/preview-toggle-button.js
/**
 * @fileOverview Contains the preview toggle button class code.
 * @license http://www.raptor-editor.com/license
 *
 * @author David Neilsen <david@panmedia.co.nz>
 * @author Michael Robinson <michael@panmedia.co.nz>
 * @author Melissa Richards <melissa@panmedia.co.nz>
 */

/**
 * @class the preview toggle button class.
 *
 * @constructor
 * @augments PreviewButton
 *
 * @param {Object} options
 */
function PreviewToggleButton(options) {
    PreviewButton.call(this, options);
}

PreviewToggleButton.prototype = Object.create(PreviewButton.prototype);

/**
 * Initialize the toggle preview button.
 *
 * @returns {Element}
 */
PreviewToggleButton.prototype.init = function() {
    this.raptor.bind('selectionChange', this.selectionChange.bind(this));
    return PreviewButton.prototype.init.apply(this, arguments);
};

/**
 * Sets the state of the button to active when preview is enabled.
 */
PreviewToggleButton.prototype.selectionChange = function() {
    if (this.selectionToggle()) {
        if (!this.isPreviewing()) {
            aButtonActive(this.button);
        }
    } else {
        aButtonInactive(this.button);
    }
};
;
// File end: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/components/ui/preview-toggle-button.js
;
// File start: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/components/ui/filtered-preview-button.js
/**
 * @fileOverview Contains the filtered preview button class code.
 * @license http://www.raptor-editor.com/license
 *
 * @author David Neilsen <david@panmedia.co.nz>
 * @author Michael Robinson <michael@panmedia.co.nz>
 * @author Melissa Richards <melissa@panmedia.co.nz>
 */

/**
 * @class the filtered preview button class.
 *
 * @constructor
 * @augments PreviewButton
 *
 * @param {Object} options
 */
function FilteredPreviewButton(options) {
    Button.call(this, options);
}

FilteredPreviewButton.prototype = Object.create(PreviewButton.prototype);

/**
 * Initialize the filtered preview button.
 *
 * @returns {Element} result
 */
FilteredPreviewButton.prototype.init = function() {
    var result = PreviewButton.prototype.init.apply(this, arguments);
    this.raptor.bind('selectionChange', this.selectionChange.bind(this));
    return result;
};

/**
 * Toggles the button's disabled state.
 */
FilteredPreviewButton.prototype.selectionChange = function() {
    if (this.isEnabled()) {
        aButtonEnable(this.button);
    } else {
        aButtonDisable(this.button);
    }
};

// <strict/>


/**
 * @returns {Boolean} True if preview available and if the button is enabled, false otherwise.
 */
FilteredPreviewButton.prototype.canPreview = function() {
    return PreviewButton.prototype.canPreview.call(this) && this.isEnabled();
};

/**
 * @returns {Boolean} True if button is enabled, false otherwise.
 */
FilteredPreviewButton.prototype.isEnabled = function() {
    var range = rangeGet();
    if (range) {
        return !!this.getElement(range);
    }
    return !!this.previewing;
};

/**
 * Perform the button's action.
 */
FilteredPreviewButton.prototype.action = function() {
    selectionEachRange(function(range) {
        var element = this.getElement(range);
        if (element) {
            this.applyToElement(element);
        }
    }.bind(this));
};
;
// File end: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/components/ui/filtered-preview-button.js
;
// File start: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/components/ui/css-class-applier-button.js
/**
 * @fileOverview Contains the CSS class applier button class code.
 * @license http://www.raptor-editor.com/license
 *
 * @author David Neilsen <david@panmedia.co.nz>
 * @author Michael Robinson <michael@panmedia.co.nz>
 * @author Melissa Richards <melissa@panmedia.co.nz>
 */

/**
 * @class The CSS class applier button.
 *
 * @constructor
 * @augments PreviewToggleButton
 * @param {Object} options
 */
function CSSClassApplierButton(options) {
    PreviewToggleButton.call(this, options);
}

CSSClassApplierButton.prototype = Object.create(PreviewToggleButton.prototype);

/**
 * Applies the class from the button to a selection.
 */
CSSClassApplierButton.prototype.action = function() {
    selectionExpandToWord();
    this.raptor.selectionConstrain();
    for (var i = 0, l = this.classes.length; i < l; i++) {
        var applier = rangy.createCssClassApplier(this.options.cssPrefix + this.classes[i], {
            elementTagName: this.tag || 'span'
        });
        applier.toggleSelection();
    }
};

/**
 * Checks whether a class has been applied to a selection.
 *
 * @returns {Boolean} True if the css has been applied to the selection, false otherwise.
 */
CSSClassApplierButton.prototype.selectionToggle = function() {
    for (var i = 0, l = this.classes.length; i < l; i++) {
        var applier = rangy.createCssClassApplier(this.options.cssPrefix + this.classes[i], {
            elementTagName: this.tag || 'span'
        });
        if (!applier.isAppliedToSelection()) {
            return false;
        }
    }
    return true;
};
;
// File end: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/components/ui/css-class-applier-button.js
;
// File start: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/components/ui/dialog-button.js
/**
 * @fileOverview Contains the dialog button class code.
 * @license http://www.raptor-editor.com/license
 *
 * @author David Neilsen <david@panmedia.co.nz>
 * @author Michael Robinson <michael@panmedia.co.nz>
 * @author Melissa Richards <melissa@panmedia.co.nz>
 */

/**
 * @type {Object} Container for Raptor dialogs.
 */
var dialogs = {};

/**
 * @class
 *
 * @constructor
 * @augments Button
 * @param {Object} options
 * @returns {DialogButton}
 */
function DialogButton(options) {
    this.state = null;
    Button.call(this, options);
}

DialogButton.prototype = Object.create(Button.prototype);

/**
 * A dialog button's action is to open a dialog, no content is modified at this
 * stage.
 */
DialogButton.prototype.action = function() {
    this.openDialog();
};

// <strict/>

/**
 * Checks the validility of a dialog.
 *
 * @param {type} dialog
 * @returns {Boolean} True if dialog is valid, false otherwise.
 */
DialogButton.prototype.validateDialog = function(dialog) {
    return true;
};

/**
 * Opens a dialog.
 *
 * @param {Object} dialog The dialog to open.
 */
DialogButton.prototype.openDialog = function() {
    this.raptor.pause();
    aDialogOpen(this.getDialog());
};

DialogButton.prototype.onDialogClose = function() {
    dialogs[this.name].instance.raptor.resume();
};

DialogButton.prototype.okButtonClick = function(event) {
    var valid = dialogs[this.name].instance.validateDialog();
    if (valid === true) {
        aDialogClose(dialogs[this.name].dialog);
        dialogs[this.name].instance.applyAction.call(dialogs[this.name].instance, dialogs[this.name].dialog);
    }
};

DialogButton.prototype.closeDialog = function() {
    aDialogClose(dialogs[this.name].dialog);
};

DialogButton.prototype.cancelButtonClick = DialogButton.prototype.closeDialog;

/**
 * Prepare and return the dialog's OK button's initialisation object.
 *
 * @param {String} name
 * @returns {Object} The initiialisation object for this dialog's OK button.
 */
DialogButton.prototype.getOkButton = function(name) {
    return {
        text: tr(name + 'DialogOKButton'),
        click: this.okButtonClick.bind(this),
        icons: {
            primary: 'ui-icon-circle-check'
        }
    };
};

/**
 * Prepare and return the dialog's cancel button's initialisation object.
 *
 * @param {String} name
 * @returns {Object} The initiialisation object for this dialog's cancel button.
 */
DialogButton.prototype.getCancelButton = function(name) {
    return {
        text: tr(name + 'DialogCancelButton'),
        click: this.cancelButtonClick.bind(this),
        icons: {
            primary: 'ui-icon-circle-close'
        }
    };
};

/**
 * Prepare and return the dialogs default options to be used in the Raptor UI.
 *
 * @param {String} name The name of the dialog to have the default options applied to it.
 * @returns {Object} the default options for the dialog.
 */
DialogButton.prototype.getDefaultDialogOptions = function(name) {
    var options = {
        modal: true,
        resizable: true,
        autoOpen: false,
        title: tr(name + 'DialogTitle'),
        dialogClass: this.options.baseClass + '-dialog ' + this.options.dialogClass,
        close: this.onDialogClose.bind(this),
        buttons: []
    };
    var okButton = this.getOkButton(name),
        cancelButton = this.getCancelButton(name);
    if (typeof okButton !== 'undefined' && okButton !== false) {
        options.buttons.push(okButton);
    }
    if (typeof cancelButton !== 'undefined' && cancelButton !== false) {
        options.buttons.push(cancelButton);
    }
    return options;
};

/**
 * Prepare and return the dialog to be used in the Raptor UI.
 *
 * @returns {Element} The dialog.
 */
DialogButton.prototype.getDialog = function() {
    if (typeof dialogs[this.name] === 'undefined') {
        dialogs[this.name] = {
            dialog: $(this.getDialogTemplate())
        };
        aDialog(dialogs[this.name].dialog, $.extend(this.getDefaultDialogOptions(this.name), this.dialogOptions));
    }
    dialogs[this.name].instance = this;
    return dialogs[this.name].dialog;
};
;
// File end: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/components/ui/dialog-button.js
;
// File start: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/components/ui/dialog-toggle-button.js
/**
 * @fileOverview Contains the dialog toggle button class code.
 * @license http://www.raptor-editor.com/license
 *
 * @author David Neilsen <david@panmedia.co.nz>
 * @author Michael Robinson <michael@panmedia.co.nz>
 * @author Melissa Richards <melissa@panmedia.co.nz>
 */

/**
 * @class
 *
 * @constructor
 * @augments DialogButton
 * @augments ToggleButton
 *
 * @param {type} options
 */
function DialogToggleButton(options) {
    DialogButton.call(this, options);
    ToggleButton.call(this, options);
}

DialogToggleButton.prototype = Object.create(DialogButton.prototype);

DialogToggleButton.prototype.init = ToggleButton.prototype.init;

DialogToggleButton.prototype.selectionChange = ToggleButton.prototype.selectionChange;
;
// File end: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/components/ui/dialog-toggle-button.js
;
// File start: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/components/ui/menu-button.js
/**
 * @fileOverview Contains the menu button class code.
 * @license http://www.raptor-editor.com/license
 *
 * @author David Neilsen <david@panmedia.co.nz>
 * @author Michael Robinson <michael@panmedia.co.nz>
 * @author Melissa Richards <melissa@panmedia.co.nz>
 */

/**
 * @constructor
 * @augments Button
 *
 * @param {Menu} menu The menu to create the menu button for.
 * @param {Object} options
 */
function MenuButton(menu, options) {
    this.menu = menu;
    this.name = menu.name;
    this.raptor = menu.raptor;
    this.options = menu.options;
    Button.call(this, options);
}

MenuButton.prototype = Object.create(Button.prototype);

/**
 * Shows the menu when button is clicked.
 *
 * @param {Event} event The click event.
 */
MenuButton.prototype.click = function(event) {
    if (this.menu.getMenu().is(':visible')) {
        $('.raptor-menu').hide();
    } else {
        this.menu.show();
    }
    event.preventDefault();
};
;
// File end: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/components/ui/menu-button.js
;
// File start: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/components/ui/menu.js
/**
 * @fileOverview Contains the menu class code.
 * @license http://www.raptor-editor.com/license
 *
 * @author David Neilsen <david@panmedia.co.nz>
 * @author Michael Robinson <michael@panmedia.co.nz>
 * @author Melissa Richards <melissa@panmedia.co.nz>
 */

/**
 * @class
 * @constructor
 *
 * @param {Object} options
 * @returns {Menu}
 */
function Menu(options) {
    this.menu = null;
    this.menuContent = '';
    this.button = null;
    for (var key in options) {
        this[key] = options[key];
    }
}

/**
 * Initialize the menu.
 *
 * @returns {MenuButton}
 */
Menu.prototype.init = function() {
    this.setOptions();
    var button = this.getButton().init();
    button.addClass('raptor-menu-button');
    return button;
};

/**
 * Prepare and return the menu's button Element to be used in the Raptor UI.
 *
 * @returns {MenuButton}
 */
Menu.prototype.getButton = function() {
    if (!this.button) {
        this.button = new MenuButton(this);
    }
    return this.button;
};

/**
 * Applies options to the menu.
 */
Menu.prototype.setOptions = function() {
    this.options.title = tr(this.name + 'Title');
    this.options.icon = 'ui-icon-' + this.name;
};

/**
 * Prepare and return the menu Element to be used in the Raptor UI.
 *
 * @returns {Element}
 */
Menu.prototype.getMenu = function() {
    if (!this.menu) {
        this.menu = $('<div>')
            .addClass('ui-menu ui-widget ui-widget-content ui-corner-all ' + this.options.baseClass + '-menu ' + this.raptor.options.baseClass + '-menu')
            .html(this.menuContent)
            .css('position', 'fixed')
            .hide()
            .mousedown(function(event) {
                // Prevent losing the selection on the editor target
                event.preventDefault();
            })
            .children()
            .appendTo('body');
    }
    return this.menu;
};

/**
 * Display menu.
 */
Menu.prototype.show = function() {
    $('.raptor-menu').hide();
    elementPositionUnder(this.getMenu().toggle(), this.getButton().getButton());
};

/**
 * Click off close event.
 *
 * @param {Event} event The click event.
 */
$('html').click(function(event) {
    if (!$(event.target).hasClass('raptor-menu-button') &&
            $(event.target).closest('.raptor-menu-button').length === 0) {
        $('.raptor-menu').hide();
    }
});
;
// File end: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/components/ui/menu.js
;
// File start: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/components/ui/custom-menu.js
/**
 * @fileOverview Contains the custom menu class code.
 * @license http://www.raptor-editor.com/license
 *
 * @author David Neilsen <david@panmedia.co.nz>
 * @author Michael Robinson <michael@panmedia.co.nz>
 * @author Melissa Richards <melissa@panmedia.co.nz>
 */

/**
 * @class The custom menu class.
 *
 * @constructor
 * @augments Menu
 *
 * Prepares and returns the custom menu Element to be used in the Raptor UI.
 *
 * @returns {Element}
 */
Menu.prototype.getMenu = function() {
    if (!this.menu) {
        this.menu = $('<div>')
            .addClass('ui-menu ui-widget ui-widget-content ui-corner-all ' + this.options.baseClass + '-menu ' + this.raptor.options.baseClass + '-menu')
            .html(this.menuContent)
            .css('position', 'fixed')
            .hide()
            .appendTo('body')
            .mousedown(function(event) {
                // Prevent losing the selection on the editor target
                event.preventDefault();
            });
    }
    return this.menu;
};

;
// File end: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/components/ui/custom-menu.js
;
// File start: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/components/ui/select-menu.js
/**
 * @fileOverview Contains the select menu class code.
 * @license http://www.raptor-editor.com/license
 *
 * @author David Neilsen <david@panmedia.co.nz>
 * @author Michael Robinson <michael@panmedia.co.nz>
 * @author Melissa Richards <melissa@panmedia.co.nz>
 */

/**
 * @class The select menu class.
 *
 * @constructor
 * @augments Menu
 *
 * @param {Object} options
 */
function SelectMenu(options) {
    Menu.call(this, options);
}

SelectMenu.prototype = Object.create(Menu.prototype);

SelectMenu.prototype.menuItemMouseDown = function(event) {
    // Prevent losing the selection on the editor target
    event.preventDefault();
};

SelectMenu.prototype.menuItemClick = function(event) {
    aButtonSetLabel(this.button.button, $(event.target).html());
    $(this.menu).closest('ul').hide();
    // Prevent jQuery UI focusing the menu
    return false;
};

SelectMenu.prototype.menuItemMouseEnter = function(event) {
};

SelectMenu.prototype.menuItemMouseLeave = function(event) {
};

/**
 * Prepare and return the select menu Element to be used in the Raptor UI.
 *
 * @returns {Element} The select menu.
 */
SelectMenu.prototype.getMenu = function() {
    if (!this.menu) {
        this.menu = $('<ul>')
            .addClass(this.options.baseClass + '-menu ' + this.raptor.options.baseClass + '-menu')
            .html(this.getMenuItems())
            .css('position', 'fixed')
            .hide()
            .find('a')
            .mousedown(this.menuItemMouseDown.bind(this))
            .mouseenter(this.menuItemMouseEnter.bind(this))
            .mouseleave(this.menuItemMouseLeave.bind(this))
            .click(this.menuItemClick.bind(this))
            .end()
            .appendTo('body');
        aMenu(this.menu);
    }
    return this.menu;
};
;
// File end: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/components/ui/select-menu.js
;
// File start: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/expose.js

// <expose>
$.extend(Raptor, {
    Button: Button,
    CSSClassApplierButton: CSSClassApplierButton,
    DialogButton: DialogButton,
    DialogToggleButton: DialogToggleButton,
    FilteredPreviewButton: FilteredPreviewButton,
    HoverPanelLayout: HoverPanelLayout,
    Menu: Menu,
    MenuButton: MenuButton,
    PreviewButton: PreviewButton,
    PreviewToggleButton: PreviewToggleButton,
    RaptorLayout: RaptorLayout,
    RaptorPlugin: RaptorPlugin,
    SelectMenu: SelectMenu,
    TextAlignButton: TextAlignButton,
    ToggleButton: ToggleButton,
    ToolbarLayout: ToolbarLayout,
    UiGroup: UiGroup,
    aButton: aButton,
    aButtonActive: aButtonActive,
    aButtonDisable: aButtonDisable,
    aButtonEnable: aButtonEnable,
    aButtonInactive: aButtonInactive,
    aButtonIsEnabled: aButtonIsEnabled,
    aButtonSetIcon: aButtonSetIcon,
    aButtonSetLabel: aButtonSetLabel,
    aDialog: aDialog,
    aDialogClose: aDialogClose,
    aDialogOpen: aDialogOpen,
    aMenu: aMenu,
    aTabs: aTabs,
    actionApply: actionApply,
    actionPreview: actionPreview,
    actionPreviewRestore: actionPreviewRestore,
    actionRedo: actionRedo,
    actionUndo: actionUndo,
    clean: clean,
    cleanEmptyAttributes: cleanEmptyAttributes,
    cleanEmptyElements: cleanEmptyElements,
    cleanRemoveComments: cleanRemoveComments,
    cleanReplaceElements: cleanReplaceElements,
    cleanUnnestElement: cleanUnnestElement,
    cleanUnwrapElements: cleanUnwrapElements,
    cleanWrapTextNodes: cleanWrapTextNodes,
    dockToElement: dockToElement,
    dockToScreen: dockToScreen,
    elementBringToTop: elementBringToTop,
    elementChangeTag: elementChangeTag,
    elementClosestBlock: elementClosestBlock,
    elementContainsBlockElement: elementContainsBlockElement,
    elementDefaultDisplay: elementDefaultDisplay,
    elementDetachedManip: elementDetachedManip,
    elementFirstInvalidElementOfValidParent: elementFirstInvalidElementOfValidParent,
    elementGetAttributes: elementGetAttributes,
    elementGetStyles: elementGetStyles,
    elementIsBlock: elementIsBlock,
    elementIsEmpty: elementIsEmpty,
    elementIsValid: elementIsValid,
    elementOuterHtml: elementOuterHtml,
    elementOuterText: elementOuterText,
    elementPositionUnder: elementPositionUnder,
    elementRemoveAttributes: elementRemoveAttributes,
    elementSwapStyles: elementSwapStyles,
    elementToggleStyle: elementToggleStyle,
    elementUniqueId: elementUniqueId,
    elementVisibleRect: elementVisibleRect,
    elementWrapInner: elementWrapInner,
    extendLocale: extendLocale,
    fragmentInsertBefore: fragmentInsertBefore,
    fragmentToHtml: fragmentToHtml,
    getLocalizedString: getLocalizedString,
    listBreakAtSelection: listBreakAtSelection,
    listBreakByReplacingSelection: listBreakByReplacingSelection,
    listConvertItemsForList: listConvertItemsForList,
    listConvertListItem: listConvertListItem,
    listConvertListType: listConvertListType,
    listEnforceValidChildren: listEnforceValidChildren,
    listRemoveEmpty: listRemoveEmpty,
    listRemoveEmptyItems: listRemoveEmptyItems,
    listShouldConvertType: listShouldConvertType,
    listShouldUnwrap: listShouldUnwrap,
    listShouldWrap: listShouldWrap,
    listTidyModified: listTidyModified,
    listToggle: listToggle,
    listUnwrap: listUnwrap,
    listUnwrapSelectedListItems: listUnwrapSelectedListItems,
    listUnwrapSelection: listUnwrapSelection,
    listWrapSelection: listWrapSelection,
    nodeFindParent: nodeFindParent,
    nodeFindTextNodes: nodeFindTextNodes,
    nodeIsChildOf: nodeIsChildOf,
    persistGet: persistGet,
    persistSet: persistSet,
    rangeContainsNode: rangeContainsNode,
    rangeContainsNodeText: rangeContainsNodeText,
    rangeDeserialize: rangeDeserialize,
    rangeEmptyTag: rangeEmptyTag,
    rangeExpandTo: rangeExpandTo,
    rangeExpandToParent: rangeExpandToParent,
    rangeGet: rangeGet,
    rangeGetCommonAncestor: rangeGetCommonAncestor,
    rangeGetEndElement: rangeGetEndElement,
    rangeGetStartElement: rangeGetStartElement,
    rangeIsContainedBy: rangeIsContainedBy,
    rangeIsEmpty: rangeIsEmpty,
    rangeReplace: rangeReplace,
    rangeReplaceSplitInvalidTags: rangeReplaceSplitInvalidTags,
    rangeReplaceWithinValidTags: rangeReplaceWithinValidTags,
    rangeSelectElement: rangeSelectElement,
    rangeSelectElementContent: rangeSelectElementContent,
    rangeSerialize: rangeSerialize,
    rangeToHtml: rangeToHtml,
    rangeTrim: rangeTrim,
    registerLocale: registerLocale,
    selectionAtEndOfElement: selectionAtEndOfElement,
    selectionAtStartOfElement: selectionAtStartOfElement,
    selectionChangeTags: selectionChangeTags,
    selectionClearFormatting: selectionClearFormatting,
    selectionConstrain: selectionConstrain,
    selectionContains: selectionContains,
    selectionDelete: selectionDelete,
    selectionDestroy: selectionDestroy,
    selectionEachBlock: selectionEachBlock,
    selectionEachRange: selectionEachRange,
    selectionExists: selectionExists,
    selectionExpandTo: selectionExpandTo,
    selectionExpandToWord: selectionExpandToWord,
    selectionFindWrappingAndInnerElements: selectionFindWrappingAndInnerElements,
    selectionGetElement: selectionGetElement,
    selectionGetElements: selectionGetElements,
    selectionGetEndElement: selectionGetEndElement,
    selectionGetHtml: selectionGetHtml,
    selectionGetStartElement: selectionGetStartElement,
    selectionInverseWrapWithTagClass: selectionInverseWrapWithTagClass,
    selectionIsEmpty: selectionIsEmpty,
    selectionRange: selectionRange,
    selectionReplace: selectionReplace,
    selectionReplaceSplittingSelectedElement: selectionReplaceSplittingSelectedElement,
    selectionReplaceWithinValidTags: selectionReplaceWithinValidTags,
    selectionRestore: selectionRestore,
    selectionSave: selectionSave,
    selectionSaved: selectionSaved,
    selectionSelectEdge: selectionSelectEdge,
    selectionSelectEnd: selectionSelectEnd,
    selectionSelectInner: selectionSelectInner,
    selectionSelectOuter: selectionSelectOuter,
    selectionSelectStart: selectionSelectStart,
    selectionSelectToEndOfElement: selectionSelectToEndOfElement,
    selectionSet: selectionSet,
    selectionToggleBlockClasses: selectionToggleBlockClasses,
    selectionToggleBlockStyle: selectionToggleBlockStyle,
    selectionToggleWrapper: selectionToggleWrapper,
    selectionTrim: selectionTrim,
    selectionWrapTagWithAttribute: selectionWrapTagWithAttribute,
    setLocale: setLocale,
    stateRestore: stateRestore,
    stateSave: stateSave,
    stringCamelCaseConvert: stringCamelCaseConvert,
    stringHtmlStringIsEmpty: stringHtmlStringIsEmpty,
    stringStripTags: stringStripTags,
    styleRestoreState: styleRestoreState,
    styleSwapState: styleSwapState,
    styleSwapWithWrapper: styleSwapWithWrapper,
    tableCanMergeCells: tableCanMergeCells,
    tableCanSplitCells: tableCanSplitCells,
    tableCellsInRange: tableCellsInRange,
    tableCreate: tableCreate,
    tableDeleteColumn: tableDeleteColumn,
    tableDeleteRow: tableDeleteRow,
    tableGetCellByIndex: tableGetCellByIndex,
    tableGetCellIndex: tableGetCellIndex,
    tableInsertColumn: tableInsertColumn,
    tableInsertRow: tableInsertRow,
    tableMergeCells: tableMergeCells,
    tableSplitCells: tableSplitCells,
    templateConvertTokens: templateConvertTokens,
    templateGet: templateGet,
    templateGetVariables: templateGetVariables,
    typeIsArray: typeIsArray,
    typeIsElement: typeIsElement,
    typeIsNode: typeIsNode,
    typeIsNumber: typeIsNumber,
    typeIsRange: typeIsRange,
    typeIsSelection: typeIsSelection,
    typeIsString: typeIsString,
    typeIsTextNode: typeIsTextNode,
    undockFromElement: undockFromElement,
    undockFromScreen: undockFromScreen
});
window.Raptor = Raptor;
// </expose>
;
// File end: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/expose.js
;
// File start: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/presets/base.js
/**
 * @fileOverview Default options for Raptor.
 * @license http://www.raptor-editor.com/license
 *
 * @author David Neilsen <david@panmedia.co.nz>
 * @author Michael Robinson <michael@panmedia.co.nz>
 * @author Melissa Richards <melissa@panmedia.co.nz>
 */

/**
 * @namespace Default options for Raptor.
 */
Raptor.globalDefaults = {
    /**
     * @type Object Default layouts to use.
     */
    layouts: {},

    /**
     * Plugins option overrides.
     *
     * @type Object
     */
    plugins: {},

    /**
     * UI option overrides.
     *
     * @type Object
     */
    ui: {},

    /**
     * Default events to bind.
     *
     * @type Object
     */
    bind: {},

    /**
     * Namespace used for persistence to prevent conflicting with other stored
     * values.
     *
     * @type String
     */
    namespace: null,

    /**
     * Switch to indicated that some events should be automatically applied to
     * all editors that are 'unified'
     *
     * @type boolean
     */
    unify: true,

    /**
     * Switch to indicate whether or not to stored persistent values, if set to
     * false the persist function will always return null
     *
     * @type boolean
     */
    persistence: true,

    /**
     * The name to store persistent values under
     * @type String
     */
    persistenceName: 'uiEditor',

    /**
     * Switch to indicate whether or not to a warning should pop up when the
     * user navigates aways from the page and there are unsaved changes
     *
     * @type boolean
     */
    unloadWarning: true,

    /**
     * Switch to automatically enabled editing on the element
     *
     * @type boolean
     */
    autoEnable: false,

    /**
     * Only enable editing on certian parts of the element
     *
     * @type {jQuerySelector}
     */
    partialEdit: false,

    /**
     * Automatically select the editable content when editing is enabled.
     *
     * @type boolean
     */
    autoSelect: 'end',

    /**
     * Switch to specify if the editor should automatically enable all plugins,
     * if set to false, only the plugins specified in the 'plugins' option
     * object will be enabled
     *
     * @type boolean
     */
    enablePlugins: true,

    /**
     * An array of explicitly disabled plugins.
     *
     * @type String[]
     */
    disabledPlugins: [],

    /**
     * Switch to specify if the editor should automatically enable all UI, if
     * set to false, only the UI specified in the {@link Raptor.defaults.ui}
     * option object will be enabled
     *
     * @type boolean
     */
    enableUi: true,

    /**
     * An array of explicitly disabled UI elements.
     *
     * @type String[]
     */
    disabledUi: [],

    /**
     * Switch to indicate that the element the editor is being applied to should
     * be replaced with a div (useful for textareas), the value/html of the
     * replaced element will be automatically updated when the editor element is
     * changed
     *
     * @type boolean
     */
    replace: false,

    /**
     * A list of styles that will be copied from the replaced element and
     * applied to the editor replacement element
     *
     * @type String[]
     */
    replaceStyle: [
        'display', 'position', 'float', 'width',
        'padding-left', 'padding-right', 'padding-top', 'padding-bottom',
        'margin-left', 'margin-right', 'margin-top', 'margin-bottom'
    ],

    /**
     *
     * @type String
     */
    baseClass: 'raptor',

    /**
     * CSS class prefix that is prepended to inserted elements classes.
     * E.g. "cms-bold"
     *
     * @type String
     */
    cssPrefix: 'cms-',

    draggable: true
};
;
// File end: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/presets/base.js
;
// File start: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/presets/full.js
/**
 * @fileOverview Contains the full options preset.
 * @license http://www.raptor-editor.com/license
 *
 * @author David Neilsen <david@panmedia.co.nz>
 * @author Michael Robinson <michael@panmedia.co.nz>
 * @author Melissa Richards <melissa@panmedia.co.nz>
 */

/**
 * @namespace Full options for Raptor.
 */
Raptor.registerPreset({
    name: 'full',
    plugins: {
        imageSwap: {
            chooser: 'insertFile'
        }
    },
    layouts: {
        toolbar: {
            uiOrder: [
                ['logo'],
                ['save', 'cancel'],
                ['dockToScreen', 'dockToElement', 'guides'],
                ['viewSource'],
                ['historyUndo', 'historyRedo'],
                ['alignLeft', 'alignCenter', 'alignJustify', 'alignRight'],
                ['textBold', 'textItalic', 'textUnderline', 'textStrike'],
                ['textSuper', 'textSub'],
                ['listUnordered', 'listOrdered'],
                ['hrCreate', 'textBlockQuote'],
                ['textSizeDecrease', 'textSizeIncrease', 'fontFamilyMenu'],
                ['clearFormatting'],
                ['linkCreate', 'linkRemove'],
                ['embed', 'insertFile'],
                ['floatLeft', 'floatNone', 'floatRight'],
                ['colorMenuBasic'],
                ['tagMenu'],
                ['classMenu'],
                ['snippetMenu', 'specialCharacters'],
                ['tableCreate', 'tableInsertRow', 'tableDeleteRow', 'tableInsertColumn', 'tableDeleteColumn'],
                ['languageMenu'],
                ['statistics']
            ]
        },
        hoverPanel: {
            uiOrder: [
                ['clickButtonToEdit']
            ]
        },
        elementHoverPanel: {
            elements: 'img',
            uiOrder: [
                ['imageResize', 'imageSwap', 'close']
            ]
        }
    }
}, true);
;
// File end: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/presets/full.js
;
// File start: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/presets/micro.js
/**
 * @fileOverview Contains the micro options preset.
 * @license http://www.raptor-editor.com/license
 * @author David Neilsen <david@panmedia.co.nz>
 */

/**
 * @namespace Micro options for Raptor.
 */
Raptor.registerPreset({
    name: 'micro',
    layouts: {
        toolbar: {
            uiOrder: [
                ['logo'],
                ['save', 'cancel'],
                ['dockToScreen', 'dockToElement'],
                ['historyUndo', 'historyRedo'],
                ['specialCharacters'],
                ['languageMenu'],
                ['statistics']
            ]
        },
        hoverPanel: {
            uiOrder: [
                ['clickButtonToEdit', 'revisions']
            ]
        }
    },
    plugins: {
        placeholder: false,
        paste: {
            panels: [
                'plain-text'
            ]
        },
        noBreak: {
            enabled: true
        }
    }
});
;
// File end: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/presets/micro.js
;
// File start: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/presets/inline.js
/**
 * @fileOverview Contains the inline preset.
 * @license http://www.raptor-editor.com/license
 *
 * @author David Neilsen <david@panmedia.co.nz>
 */

/**
 * @namespace Inline preset for Raptor.
 */
Raptor.registerPreset({
    name: 'inline',
    classes: 'raptor-editing-inline',
    autoEnable: true,
    draggable: false,
    unify: false,
    unloadWarning: false,
    reloadOnDisable: true,
    plugins: {
        unsavedEditWarning: false,
        dock: {
            dockToElement: true,
            docked: true,
            persist: false
        }
    },
    layouts: {
        toolbar: {
            uiOrder: [
                ['textBold', 'textItalic', 'textUnderline', 'textStrike'],
                ['colorMenuBasic'],
                ['textBlockQuote'],
                ['listOrdered', 'listUnordered'],
                ['textSizeDecrease', 'textSizeIncrease'],
                ['linkCreate', 'linkRemove']
            ]
        }
    }
});
;
// File end: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/presets/inline.js
;
// File start: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-premium/src/presets/mammoth.js
/**
 * @fileOverview Contains the mammoth preset.
 * @license http://www.raptor-editor.com/license
 *
 * @author David Neilsen <david@panmedia.co.nz>
 */

/**
 * @namespace Mammoth preset for Raptor.
 */
Raptor.registerPreset({
    name: 'mammoth',
    plugins: {
        imageSwap: {
            chooser: 'fileManager'
        }
    },
    layouts: {
        toolbar: {
            uiOrder: [
                ['logo'],
                ['save', 'cancel'],
                ['dockToScreen', 'guides'],
                ['viewSource'],
                ['historyUndo', 'historyRedo'],
                ['alignLeft', 'alignCenter', 'alignJustify', 'alignRight'],
                ['textBold', 'textItalic', 'textUnderline', 'textStrike'],
                ['textSuper', 'textSub'],
                ['listUnordered', 'listOrdered'],
                ['hrCreate', 'textBlockQuote'],
                ['textSizeDecrease', 'textSizeIncrease'],
                ['clearFormatting'],
                ['linkCreate', 'linkRemove'],
                ['embed', 'fileManager'],
                ['floatLeft', 'floatNone', 'floatRight'],
                ['colorMenuBasic'],
                ['tagMenu'],
                ['classMenu'],
                ['snippetMenu', 'specialCharacters', 'loremIpsum'],
                ['tableCreate', 'tableInsertRow', 'tableDeleteRow', 'tableInsertColumn', 'tableDeleteColumn']
            ]
        },
        hoverPanel: {
            uiOrder: [
                ['clickButtonToEdit', 'revisions']
            ]
        },
        elementHoverPanel: {
            elements: 'img',
            uiOrder: [
                ['imageResize', 'imageSwap', 'imageEditor', 'close']
            ]
        },
        imageEditor: {
            uiOrder: [
                ['save', 'cancel'],
                ['revert', 'upload'],
                ['undo', 'redo'],
                ['flipV', 'flipH', 'rotateLeft', 'rotateRight', 'resize', 'crop']
            ]
        },
        fileManager: {
            uiOrder: [
                ['insert', 'rename', 'edit', 'delete', 'download', 'view']
            ]
        }
    }
}, true);
;
// File end: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-premium/src/presets/mammoth.js
;
// File start: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-premium/src/presets/mammoth-inline.js
/**
 * @fileOverview Contains the mammoth preset.
 * @license http://www.raptor-editor.com/license
 *
 * @author David Neilsen <david@panmedia.co.nz>
 */

/**
 * @namespace Mammoth preset for Raptor.
 */
Raptor.registerPreset({
    name: 'mammoth-inline',
    classes: 'raptor-editing-inline',
    autoEnable: true,
    draggable: false,
    unify: false,
    unloadWarning: false,
    reloadOnDisable: true,
    plugins: {
        unsavedEditWarning: false,
        dock: {
            dockToElement: true,
            docked: true,
            persist: false
        }
    },
    layouts: {
        toolbar: {
            uiOrder: [
                ['viewSource', 'guides'],
                ['historyUndo', 'historyRedo'],
                ['alignLeft', 'alignCenter', 'alignJustify', 'alignRight'],
                ['textBold', 'textItalic', 'textUnderline', 'textStrike'],
                ['textSuper', 'textSub'],
                ['listUnordered', 'listOrdered'],
                ['hrCreate', 'textBlockQuote'],
                ['textSizeDecrease', 'textSizeIncrease'],
                ['clearFormatting'],
                ['linkCreate', 'linkRemove'],
                ['embed', 'fileManager'],
                ['floatLeft', 'floatNone', 'floatRight'],
                ['colorMenuBasic'],
                ['tagMenu'],
                ['classMenu'],
                ['snippetMenu', 'specialCharacters'],
                ['tableCreate', 'tableInsertRow', 'tableDeleteRow', 'tableInsertColumn', 'tableDeleteColumn']
            ]
        }
    }
});
;
// File end: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-premium/src/presets/mammoth-inline.js
;
// File start: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/plugins/cancel/cancel.js
/**
 * @fileOverview Contains the cancel editing dialog code.
 * @license http://www.raptor-editor.com/license
 *
 * @author David Neilsen <david@panmedia.co.nz>
 * @author Michael Robinson <michael@panmedia.co.nz>
 * @author Melissa Richards <melissa@panmedia.co.nz>
 */

/**
 * Creates an instance of a cancel dialog.
 *
 * @todo needs checking and not sure what to put in for the param stuff.
 * @param {type} param
 */
Raptor.registerUi(new DialogButton({
    name: 'cancel',
    hotkey: 'esc',
    dialogOptions: {
        width: 500
    },

    action: function() {
        if (this.raptor.isDirty()) {
            DialogButton.prototype.action.call(this);
        } else {
            this.applyAction();
        }
    },

    applyAction: function() {
        this.raptor.cancelEditing();
    },

    getDialogTemplate: function() {
        return $('<div>').html(tr('cancelDialogContent'));
    }
}));
;
// File end: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/plugins/cancel/cancel.js
;
// File start: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/plugins/class-menu/class-menu.js
/**
 * @fileOverview Contains the class menu class code.
 * @license http://www.raptor-editor.com/license
 *
 * @author David Neilsen <david@panmedia.co.nz>
 * @author Michael Robinson <michael@panmedia.co.nz>
 * @author Melissa Richards <melissa@panmedia.co.nz>
 */

/**
 * The select menu class.
 *
 * @constructor
 * @augments SelectMenu
 *
 * @param {Object} options
 */
function ClassMenu(options) {
    SelectMenu.call(this, {
        name: 'classMenu'
    });
}

ClassMenu.prototype = Object.create(SelectMenu.prototype);

/**
 * Initialises the class menu.
 *
 * @todo type and desc for result
 * @returns {unresolved} result
 */
ClassMenu.prototype.init = function() {
    var result = SelectMenu.prototype.init.call(this);
    if (typeof this.options.classes === 'object' &&
            Object.keys(this.options.classes).length > 0) {
        this.raptor.bind('selectionChange', this.updateButton.bind(this));
        return result;
    }
};

/**
 * Toggles a given set of classes on a selection.
 *
 * @param {Object} classes
 */
ClassMenu.prototype.changeClass = function(classes) {
    selectionToggleBlockClasses(classes, [], this.raptor.getElement());
};

/**
 * Applies the class on click.
 *
 * @param event
 */
ClassMenu.prototype.menuItemClick = function(event) {
    SelectMenu.prototype.menuItemClick.apply(this, arguments);
    this.raptor.actionApply(function() {
        this.changeClass([$(event.currentTarget).data('value')]);
    }.bind(this));
};

/**
 * Puts the selection into preview mode for the chosen class.
 *
 * @param event The mouse event which triggered the preview.
 */
ClassMenu.prototype.menuItemMouseEnter = function(event) {
    this.raptor.actionPreview(function() {
        this.changeClass([$(event.currentTarget).data('value')]);
    }.bind(this));
};

/**
 * Restores the selection from preview mode.
 *
 * @param event
 */
ClassMenu.prototype.menuItemMouseLeave = function(event) {
    this.raptor.actionPreviewRestore();
};
 /**
  * Updates the class menu button.
  */
ClassMenu.prototype.updateButton = function() {
};

//ClassMenu.prototype.getButton = function() {
//    if (!this.button) {
//        this.button = new Button({
//            name: this.name,
//            action: this.show.bind(this),
//            preview: false,
//            options: this.options,
//            icon: false,
//            text: 'Class Selector',
//            raptor: this.raptor
//        });
//    }
//    return this.button;
//};

/**
 * Prepare and return the menu items to be used in the Raptor UI.
 * @returns {Object} The menu items.
 */
ClassMenu.prototype.getMenuItems = function() {
    var items = '';
    for (var label in this.options.classes) {
        items += this.raptor.getTemplate('class-menu.item', {
            label: label,
            value: this.options.classes[label]
        });
    }
    return items;
};

Raptor.registerUi(new ClassMenu());
;
// File end: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/plugins/class-menu/class-menu.js
;
// File start: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/plugins/clear-formatting/clear-formatting.js
/**
 * @fileOverview Contains the clear formatting button code.
 * @license http://www.raptor-editor.com/license
 *
 * @author David Neilsen <david@panmedia.co.nz>
 * @author Michael Robinson <michael@panmedia.co.nz>
 * @author Melissa Richards <melissa@panmedia.co.nz>
 */

/**
 * Creates an instance of the preview button that clears the
 * formatting on a selection.
 */
Raptor.registerUi(new PreviewButton({
    name: 'clearFormatting',
    action: function() {
        selectionClearFormatting(this.raptor.getElement().get(0));
        cleanEmptyElements(this.raptor.getElement(), [
            'a', 'b', 'i', 'sub', 'sup', 'strong', 'em', 'big', 'small', 'p'
        ]);
        cleanWrapTextNodes(this.raptor.getElement()[0], 'p');
    }
}));
;
// File end: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/plugins/clear-formatting/clear-formatting.js
;
// File start: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/plugins/click-button-to-edit/click-button-to-edit.js
/**
 * @fileOverview Contains the click button to edit code.
 * @license http://www.raptor-editor.com/license
 *
 * @author David Neilsen <david@panmedia.co.nz>
 * @author Michael Robinson <michael@panmedia.co.nz>
 * @author Melissa Richards <melissa@panmedia.co.nz>
 */
Raptor.registerUi(new Button({
    name: 'clickButtonToEdit',
    action: function() {
        this.raptor.enableEditing();
    }
}));
;
// File end: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/plugins/click-button-to-edit/click-button-to-edit.js
;
// File start: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/plugins/close/close.js
/**
 * @fileOverview Contains the close panel code.
 * @license http://www.raptor-editor.com/license
 *
 * @author David Neilsen <david@panmedia.co.nz>
 */
Raptor.registerUi(new Button({
    name: 'close',

    click: function() {
        this.layout.close();
    }
}));
;
// File end: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/plugins/close/close.js
;
// File start: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/plugins/color-menu-basic/color-menu-basic.js
/**
 * @fileOverview Contains the basic colour menu class code.
 * @license http://www.raptor-editor.com/license
 *
 * @author  David Neilsen <david@panmedia.co.nz>
 * @author  Michael Robinson <michael@panmedia.co.nz>
 * @author Melissa Richards <melissa@panmedia.co.nz>
 */

/**
 * The basic colour menu class.
 *
 * @constructor
 * @augments SelectMenu
 *
 * @param {Object} options
 */
function ColorMenuBasic(options) {
    this.colors = [
        'white',
        'black',
        'grey',
        'blue',
        'red',
        'green',
        'purple',
        'orange'
    ];
    /**
     * Cache the current color so it can be reapplied to the button if the user
     * clicks the button to open the menu, hovers some colors then clicks off to
     * close it.
     *
     * @type {String}
     */
    this.currentColor = 'automatic';
    SelectMenu.call(this, {
        name: 'colorMenuBasic'
    });
}

ColorMenuBasic.prototype = Object.create(SelectMenu.prototype);

/**
 * Initialize the basic colour menu.
 *
 * @returns {Element}
 */
ColorMenuBasic.prototype.init = function() {
    this.raptor.bind('selectionChange', this.updateButton.bind(this));
    this.updateButton();
    return SelectMenu.prototype.init.apply(this, arguments);
};

/**
 * Updates the basic colour menu with the current colour.
 */
ColorMenuBasic.prototype.updateButton = function() {
    var tag = selectionGetElements()[0],
        button = this.getButton().getButton(),
        color = null,
        closest = null;

    // TODO: set automatic icon color to the color of the text
    aButtonSetLabel(button, tr('colorMenuBasicAutomatic'));
    aButtonSetIcon(button, false);
    if (!tag) {
        return;
    }
    tag = $(tag);
    for (var colorsIndex = 0; colorsIndex < this.colors.length; colorsIndex++) {
        closest = $(tag).closest('.' + this.options.cssPrefix + this.colors[colorsIndex]);
        if (closest.length) {
            color = this.colors[colorsIndex];
            break;
        }
    }
    if (color) {
        aButtonSetLabel(button, tr('colorMenuBasic' + (color.charAt(0).toUpperCase() + color.slice(1))));
        aButtonSetIcon(button, 'ui-icon-swatch');
        // FIXME: set color in an adapter friendly way
        button.find('.ui-icon').css('background-color', closest.css('color'));
        return;
    }
};

/**
 * Changes the colour of the selection.
 *
 * @param {type} color The current colour.
 */
ColorMenuBasic.prototype.changeColor = function(color, permanent) {
    if (permanent) {
        this.currentColor = color;
    }
    this.raptor.actionApply(function() {
        selectionExpandToWord();
        if (color === 'automatic') {
            selectionGetElements().parents('.' + this.options.cssPrefix + 'color').addBack().each(function() {
                var classes = $(this).attr('class');
                if (classes === null || typeof classes === 'undefined') {
                    return;
                }
                classes = classes.match(/(cms-(.*?))( |$)/ig);
                if (classes === null || typeof classes === 'undefined') {
                    return;
                }
                for (var i = 0, l = classes.length; i < l; i++) {
                    $(this).removeClass($.trim(classes[i]));
                }
            });
        } else {
            var uniqueId = elementUniqueId();
            selectionToggleWrapper('span', {
                classes: this.options.cssPrefix + 'color ' + this.options.cssPrefix + color,
                attributes: {
                    id: uniqueId
                }
            });
            var element = $('#' + uniqueId);
            if (element.length) {
                selectionSelectInner(element.removeAttr('id').get(0));
                var splitNode;
                do {
                    splitNode = $('#' + uniqueId);
                    splitNode.removeAttr('id');
                } while (splitNode.length);
            }
        }
    }.bind(this));
};

/**
 * The preview state for the basic colour menu.
 *
 * @param event The mouse event which triggered the preview.
 */
ColorMenuBasic.prototype.menuItemMouseEnter = function(event) {
    this.raptor.actionPreview(function() {
        this.changeColor($(event.currentTarget).data('color'));
    }.bind(this));
};

/**
 * Restores the selection from the preview.
 *
 * @param event
 */
ColorMenuBasic.prototype.menuItemMouseLeave = function(event) {
    this.raptor.actionPreviewRestore();
};

/**
 * Applies the colour change to the selection.
 *
 * @param event The mouse event to trigger the application of the colour.
 */
ColorMenuBasic.prototype.menuItemClick = function(event) {
    SelectMenu.prototype.menuItemClick.apply(this, arguments);
    this.raptor.actionApply(function() {
        this.changeColor($(event.currentTarget).data('color'), true);
    }.bind(this));
};

/**
 * Prepare and return the menu items to be used in the Raptor UI.
 * @returns {Element} The menu items.
 */
ColorMenuBasic.prototype.getMenuItems = function() {
    return this.raptor.getTemplate('color-menu-basic.menu', this.options);
};

Raptor.registerUi(new ColorMenuBasic());
;
// File end: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/plugins/color-menu-basic/color-menu-basic.js
;
// File start: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/plugins/dock/dock-plugin.js
/**
 * @fileOverview Contains the dock plugin class code.
 * @license http://www.raptor-editor.com/license
 *
 * @author David Neilsen <david@panmedia.co.nz>
 * @author Michael Robinson <michael@panmedia.co.nz>
 * @author Melissa Richards <melissa@panmedia.co.nz>
 */

/**
 * The dock plugin class.
 *
 * @constructor
 * @augments RaptorPlugin
 *
 * @param {String} name
 * @param {Object} overrides
 */
function DockPlugin(name, overrides) {
    this.options = {
        dockToElement: false,
        docked: false,
        position: 'top',
        spacer: true,
        persist: true
    };
    this.dockState = false;
    this.marker = false;

    RaptorPlugin.call(this, name || 'dock', overrides);
}

DockPlugin.prototype = Object.create(RaptorPlugin.prototype);

/**
 * Initialize the dock plugin.
 */
DockPlugin.prototype.init = function() {
    var docked;
    if (this.options.persist) {
        docked = this.raptor.persist('docked');
    }
    if (typeof docked === 'undefined') {
        docked = this.options.docked;
    }
    if (typeof docked === 'undefined') {
        docked = false;
    }
    if (docked) {
        this.raptor.bind('toolbarReady', function() {
            if (docked) {
                this.toggleState();
            }
        }.bind(this));
        this.raptor.bind('toolbarHide', function() {
            if (this.dockState && this.dockState.spacer) {
                this.dockState.spacer.addClass(this.options.baseClass + '-hidden');
                this.dockState.spacer.removeClass(this.options.baseClass + '-visible');
            }
        }.bind(this));
        this.raptor.bind('toolbarShow', function() {
            if (this.dockState && this.dockState.spacer) {
                this.dockState.spacer.removeClass(this.options.baseClass + '-hidden');
                this.dockState.spacer.addClass(this.options.baseClass + '-visible');
            }
        }.bind(this));
        this.raptor.bind('toolbarDestroy', function() {
            if (this.dockState && this.dockState.spacer) {
                this.dockState.spacer.remove();
            }
        }.bind(this));
    }
};

/**
 * Switch between docked / undocked, depending on options.
 *
 * @return {Object} Resulting dock state
 */
DockPlugin.prototype.toggleState = function() {
    if (this.options.dockToElement) {
        return this.toggleDockToElement();
    }
    return this.toggleDockToScreen();
};

/**
 * Gets the dock state on toggle dock to element.
 *
 * @return {Object} Resulting dock state
 */
DockPlugin.prototype.toggleDockToElement = function() {
    if (this.dockState) {
        if (typeof this.dockState.dockedTo !== 'undefined') {
            this.undockFromElement();
        } else {
            this.undockFromScreen();
            this.dockToElement();
        }
    } else {
        this.dockToElement();
    }
};

/**
 * Gets the dock state on dock to element.
 *
 * @return {Object} Resulting dock state
 */
DockPlugin.prototype.dockToElement = function() {
    var element = this.raptor.getElement(),
        layoutElement = this.raptor.getLayout('toolbar').getElement();
    this.marker = $('<marker>').addClass(this.options.baseClass + '-marker').insertAfter(layoutElement);
    this.raptor.getLayout('toolbar').getElement().addClass(this.options.baseClass + '-docked-to-element');
    this.dockState = dockToElement(this.raptor.getLayout('toolbar').getElement(), element, {
        position: this.options.position,
        spacer: false,
        wrapperClass: this.options.baseClass + '-inline-wrapper'
    });
    this.activateButton(this.raptor.getPlugin('dockToElement'));
};

/**
 * Gets the dock state on undocking from an element.
 *
 * @return {Object} Resulting dock state
 */
DockPlugin.prototype.undockFromElement = function() {
    this.marker.replaceWith(undockFromElement(this.dockState));
    this.dockState = null;
    this.raptor.getLayout('toolbar').getElement().removeClass(this.options.baseClass + '-docked-to-element');
    this.deactivateButton(this.raptor.getPlugin('dockToElement'));
};

/**
 * Gets the dock state on toggle dock to screen.
 *
 * @return {Object} Resulting dock state
 */
DockPlugin.prototype.toggleDockToScreen = function() {
    if (this.dockState) {
        if (typeof this.dockState.dockedTo !== 'undefined') {
            this.undockFromElement();
            this.dockToScreen();
        } else {
            this.undockFromScreen();
        }
    } else {
        this.dockToScreen();
    }
};

/**
 * Gets the dock state on dock to screen.
 *
 * @return {Object} Resulting dock state
 */
DockPlugin.prototype.dockToScreen = function() {
    if (!this.dockState) {
        var layout = this.raptor.getLayout('toolbar');
        if (layout.isReady()) {
            this.raptor.persist('docked', true);
            var layoutElement = layout.getElement();
            this.marker = $('<marker>').addClass(this.options.baseClass + '-marker')
                                .insertAfter(layoutElement);
            layoutElement.addClass(this.options.baseClass + '-docked');
            layout.disableDragging();
            this.dockState = dockToScreen(layoutElement, {
                position: this.options.position,
                spacer: true,
                under: this.options.under
            });
            if (!layout.isVisible()) {
                this.dockState.spacer.removeClass(this.options.baseClass + '-visible');
                this.dockState.spacer.addClass(this.options.baseClass + '-hidden');
            }
            this.activateButton(this.raptor.getPlugin('dockToScreen'));
        }
    }
};

/**
 * Gets the dock state on undocking from the screen.
 *
 * @return {Object} Resulting dock state
 */
DockPlugin.prototype.undockFromScreen = function() {
    if (this.dockState) {
        this.raptor.persist('docked', false);
        var layout = this.raptor.getLayout('toolbar'),
            layoutElement = undockFromScreen(this.dockState);
        this.marker.replaceWith(layoutElement);
        layout.enableDragging();
        layout.constrainPosition();
        this.dockState = null;
        layoutElement.removeClass(this.options.baseClass + '-docked');
        this.deactivateButton(this.raptor.getPlugin('dockToScreen'));
    }
};

DockPlugin.prototype.deactivateButton = function(ui) {
    if (typeof ui !== 'undefined' &&
            typeof ui.button !== 'undefined') {
        aButtonInactive(ui.button);
    }
};

DockPlugin.prototype.activateButton = function(ui) {
    if (typeof ui !== 'undefined' &&
            typeof ui.button !== 'undefined') {
        aButtonActive(ui.button);
    }
};

Raptor.registerPlugin(new DockPlugin());
;
// File end: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/plugins/dock/dock-plugin.js
;
// File start: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/plugins/dock/dock-to-screen.js
/**
 * @fileOverview Contains the dock to screen button code.
 * @license http://www.raptor-editor.com/license
 *
 * @author David Neilsen <david@panmedia.co.nz>
 * @author Michael Robinson <michael@panmedia.co.nz>
 * @author Melissa Richards <melissa@panmedia.co.nz>
 */

/**
 * Creates an instance of the dock to screen button for use in the Raptor UI.
 *
 * @todo des and type for the param.
 * @param {type} param
 */
Raptor.registerUi(new Button({
    name: 'dockToScreen',
    action: function() {
        this.raptor.unify(function(raptor) {
            raptor.plugins.dock.toggleDockToScreen();
        });
    }
}));
;
// File end: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/plugins/dock/dock-to-screen.js
;
// File start: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/plugins/dock/dock-to-element.js
/**
 * @fileOverview Contains the dock to element button code.
 * @author  David Neilsen <david@panmedia.co.nz>
 * @author  Michael Robinson <michael@panmedia.co.nz>
 * @author Melissa Richards <melissa@panmedia.co.nz>
 */

/**
 * Creates an instance of the dock to element button for use in the raptor UI.
 *
 * @todo not sure how to document this one.
 * @param {type} param
 */
Raptor.registerUi(new Button({
    name: 'dockToElement',
    action: function() {
        this.raptor.unify(function(raptor) {
            raptor.plugins.dock.toggleDockToElement();
        });
    }
}));
;
// File end: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/plugins/dock/dock-to-element.js
;
// File start: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/plugins/embed/embed.js
/**
 * @fileOverview Contains the embed dialog button code.
 * @license http://www.raptor-editor.com/license
 *
 * @author David Neilsen <david@panmedia.co.nz>
 * @author Michael Robinson <michael@panmedia.co.nz>
 * @author Melissa Richards <melissa@panmedia.co.nz>
 */

/**
 * Creates an intance of the embed dialog for use in the Raptor UI.
 *
 * @todo des and type for the param.
 * @param {type} param
 */
Raptor.registerUi(new DialogButton({
    name: 'embed',
    state: null,
    dialogOptions: {
        width: 600,
        height: 400
    },

    /**
     * Replace selection with embed textarea content.
     *
     * @param  {Element} dialog
     */
    applyAction: function(dialog) {
        this.raptor.actionApply(function() {
            selectionReplace(dialog.find('textarea').val());
        });
    },

    /**
     * Create and prepare the embed dialog template.
     *
     * @return {Element}
     */
    getDialogTemplate: function() {
        var template = $('<div>').html(this.raptor.getTemplate('embed.dialog', this.options));

        template.find('textarea').change(function(event) {
            template.find('.' + this.options.baseClass + '-preview').html($(event.target).val());
        }.bind(this));

        // Create fake jQuery UI tabs (to prevent hash changes)
        var tabs = template.find('.' + this.options.baseClass + '-panel-tabs');
        tabs.find('li')
            .click(function() {
                tabs.find('ul li').removeClass('ui-state-active').removeClass('ui-tabs-selected');
                $(this).addClass('ui-state-active').addClass('ui-tabs-selected');
                tabs.children('div').hide().eq($(this).index()).show();
            });
        return template;
    }
}));
;
// File end: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/plugins/embed/embed.js
;
// File start: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/plugins/float/float-left.js
/**
 * @fileOverview Contains the float left button code.
 * @license http://www.raptor-editor.com/license
 *
 * @author David Neilsen <david@panmedia.co.nz>
 * @author Michael Robinson <michael@panmedia.co.nz>
 * @author Melissa Richards <melissa@panmedia.co.nz>
 */

/**
 * Creates an instance of a filtered preview button to float an image left.
 *
 * @todo des and type for the param.
 * @param {type} param
 */
Raptor.registerUi(new FilteredPreviewButton({
    name: 'floatLeft',
    applyToElement: function(element) {
        element.removeClass(this.options.cssPrefix + 'float-right');
        element.toggleClass(this.options.cssPrefix + 'float-left');
        cleanEmptyAttributes(element, ['class']);
    },
    getElement: function(range) {
        var images = $(range.commonAncestorContainer).find('img');
        return images.length ? images : null;
    }
}));
;
// File end: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/plugins/float/float-left.js
;
// File start: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/plugins/float/float-none.js
/**
 * @fileOverview Contains the float none button class code.
 * @license http://www.raptor-editor.com/license
 *
 * @author David Neilsen <david@panmedia.co.nz>
 * @author Michael Robinson <michael@panmedia.co.nz>
 * @author Melissa Richards <melissa@panmedia.co.nz>
 */

/**
 * Creates an instance of a filtered preview button to remove the float an image.
 *
 * @todo des and type for the param.
 * @param {type} param
 */
Raptor.registerUi(new FilteredPreviewButton({
    name: 'floatNone',
    applyToElement: function(element) {
        element.removeClass(this.options.cssPrefix + 'float-right');
        element.removeClass(this.options.cssPrefix + 'float-left');
        cleanEmptyAttributes(element, ['class']);
    },
    getElement: function(range) {
        var images = $(range.commonAncestorContainer).find('img');
        return images.length ? images : null;
    }
}));
;
// File end: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/plugins/float/float-none.js
;
// File start: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/plugins/float/float-right.js
/**
 * @fileOverview Contains the float right button class code.
 * @license http://www.raptor-editor.com/license
 *
 * @author David Neilsen <david@panmedia.co.nz>
 * @author Michael Robinson <michael@panmedia.co.nz>
 * @author Melissa Richards <melissa@panmedia.co.nz>
 */

/**
 * Creates an instance of a filtered preview button to float an image right.
 *
 * @todo des and type for the param.
 * @param {type} param
 */
Raptor.registerUi(new FilteredPreviewButton({
    name: 'floatRight',
    applyToElement: function(element) {
        element.removeClass(this.options.cssPrefix + 'float-left');
        element.toggleClass(this.options.cssPrefix + 'float-right');
        cleanEmptyAttributes(element, ['class']);
    },
    getElement: function(range) {
        var images = $(range.commonAncestorContainer).find('img');
        return images.length ? images : null;
    }
}));
;
// File end: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/plugins/float/float-right.js
;
// File start: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/plugins/font-family/font-family.js
/**
 * @fileOverview Contains the basic font-family class code.
 * 
 * @author Nikolay Rodionov <rodi.incave@gmail.com>
 * @author David Neilsen <david@panmedia.co.nz>
 */

/**
 * The basic font-family class.
 *
 * @constructor
 * @augments SelectMenu
 *
 * @param {Object} options
 */
function FontFamilyMenu(options) {
    this.options= {
        fonts: [
            'arial',
            'palatino',
            'georgia',
            'times',
            'comic-sans',
            'impact',
            'courier'
        ]
    };
    
    SelectMenu.call(this, {
        name: 'fontFamilyMenu'
    });
}

FontFamilyMenu.prototype = Object.create(SelectMenu.prototype);

/**
 * Initialize the basic font menu.
 *
 * @returns {Element}
 */
FontFamilyMenu.prototype.init = function() {
    this.raptor.bind('selectionChange', this.updateButton.bind(this));
    this.updateButton();
    return SelectMenu.prototype.init.apply(this, arguments);
};

/**
 * Updates the basic font menu with the current font.
 */
FontFamilyMenu.prototype.updateButton = function() {
    var tag = selectionGetElements()[0],
        button = this.getButton().getButton(),
        font = null,
        closest = null;

    aButtonSetLabel(button, tr('fontFamilyMenuFontDefault'));
    aButtonSetIcon(button, false);
    if (!tag) {
        return;
    }
    
    for (var fontsIndex = 0; fontsIndex < this.options.fonts.length; fontsIndex++) {
        closest = $(tag).closest('.' + this.options.cssPrefix + 'font-' + this.options.fonts[fontsIndex]);
        if (closest.length) {
            font = this.options.fonts[fontsIndex];
            break;
        }
    }
    
    if (font) {
        aButtonSetLabel(button, this.getMenu().find('[data-font="' + font + '"]').text());
        return;
    }
};

/**
 * Changes the font-family of the selection.
 *
 * @param {type} font The current font.
 */
FontFamilyMenu.prototype.changeFont = function(font) {
    selectionExpandToWord();
    if (font === 'default') {
        selectionGetElements().parents('.' + this.options.cssPrefix + 'font').addBack().each(function() {
            var classes = $(this).attr('class');
            if (classes === null || typeof classes === 'undefined') {
                return;
            }
            classes = classes.match(/(cms-font-(.*?))( |$)/ig);
            if (classes === null || typeof classes === 'undefined') {
                return;
            }
            for (var i = 0, l = classes.length; i < l; i++) {
                $(this).removeClass($.trim(classes[i]));
            }
        });
    } else {
        var uniqueId = elementUniqueId();
        selectionToggleWrapper('span', {
            classes: this.options.classes || this.options.cssPrefix + 'font ' + this.options.cssPrefix + 'font-' + font,
            attributes: {
                id: uniqueId
            }
        });
        var element = $('#' + uniqueId);
        if (element.length) {
            selectionSelectInner(element.removeAttr('id').get(0));
            var splitNode;
            do {
                splitNode = $('#' + uniqueId);
                splitNode.removeAttr('id');
            } while (splitNode.length);
        }
    }
};

/**
 * The preview state for the basic font menu.
 *
 * @param event The mouse event which triggered the preview.
 */
FontFamilyMenu.prototype.menuItemMouseEnter = function(event) {
    this.raptor.actionPreview(function() {
        this.changeFont($(event.currentTarget).data('font'));
    }.bind(this));
};

/**
 * Restores the selection from the preview.
 *
 * @param event
 */
FontFamilyMenu.prototype.menuItemMouseLeave = function(event) {
    this.raptor.actionPreviewRestore();
};

/**
 * Applies the font change to the selection.
 *
 * @param event The mouse event to trigger the application of the font.
 */
FontFamilyMenu.prototype.menuItemClick = function(event) {
    SelectMenu.prototype.menuItemClick.apply(this, arguments);
    this.raptor.actionApply(function() {
        this.changeFont($(event.currentTarget).data('font'));
    }.bind(this));
};

/**
 * Prepare and return the menu items to be used in the Raptor UI.
 * @returns {Element} The menu items.
 */
FontFamilyMenu.prototype.getMenuItems = function() {
    var items = this.raptor.getTemplate('font-family.menu-item', {
        fontName: 'default',
        fontTitle: tr('fontFamilyMenuFontDefault')
    });
    for (var i = 0, l = this.options.fonts.length; i < l; i++) {
        items += this.raptor.getTemplate('font-family.menu-item', {
            fontName: this.options.fonts[i],
            fontTitle: tr(('fontFamilyMenuFont-' + this.options.fonts[i]).replace(/-([a-z])/g, function (matches) {
                return matches[1].toUpperCase()
            }))
        });
    }
    return items;
};

Raptor.registerUi(new FontFamilyMenu());
;
// File end: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/plugins/font-family/font-family.js
;
// File start: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/plugins/guides/guides.js
/**
 * @fileOverview Contains the guides button class code.
 * @license http://www.raptor-editor.com/license
 *
 * @author David Neilsen <david@panmedia.co.nz>
 * @author Michael Robinson <michael@panmedia.co.nz>
 * @author Melissa Richards <melissa@panmedia.co.nz>
 */

/**
 * Creates an instance of a preview button to show the guides of the elements.
 *
 * @todo des and type for the param.
 * @param {type} param
 */
Raptor.registerUi(new PreviewButton({
    name: 'guides',

    action: function() {
        this.raptor.getElement().toggleClass(this.getClassName());
        this.updateButtonState();
    },

    updateButtonState: function() {
        if (this.raptor.getElement().hasClass(this.getClassName())) {
            aButtonActive(this.button);
        } else {
            aButtonInactive(this.button);
        }
    },

    init: function() {
        this.raptor.bind('cancel', this.removeClass.bind(this));
        this.raptor.bind('saved', this.removeClass.bind(this));
        return PreviewButton.prototype.init.call(this);
    },

    removeClass: function() {
        this.raptor.getElement().removeClass(this.getClassName());
    },

    getClassName: function() {
        return this.options.baseClass + '-visible';
    },

    mouseEnter: function() {
        PreviewButton.prototype.mouseEnter.call(this);
        this.updateButtonState();
    },

    mouseLeave: function() {
        PreviewButton.prototype.mouseLeave.call(this);
        this.updateButtonState();
    }
}));
;
// File end: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/plugins/guides/guides.js
;
// File start: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/plugins/history/history-redo.js
/**
 * @fileOverview Contains the history redo code.
 * @license http://www.raptor-editor.com/license
 *
 * @author David Neilsen <david@panmedia.co.nz>
 * @author Michael Robinson <michael@panmedia.co.nz>
 * @author Melissa Richards <melissa@panmedia.co.nz>
 */

/**
 * Creates an instance of the button class to redo an action.
 *
 * @todo param details?
 * @param {type} param
 */
Raptor.registerUi(new Button({
    name: 'historyRedo',
    hotkey: ['ctrl+y', 'ctrl+shift+z'],

    action: function() {
        this.raptor.historyForward();
    },

    init: function () {
        this.raptor.bind('historyChange', this.historyChange.bind(this));
        Button.prototype.init.apply(this, arguments);
        aButtonDisable(this.button);
        return this.button;
    },

    historyChange: function() {
        if (this.raptor.present < this.raptor.history.length - 1) {
            aButtonEnable(this.button);
        } else {
            aButtonDisable(this.button);
        }
    }
}));
;
// File end: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/plugins/history/history-redo.js
;
// File start: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/plugins/history/history-undo.js
/**
 * @fileOverview Contains the history undo code.
 * @license http://www.raptor-editor.com/license
 *
 * @author David Neilsen <david@panmedia.co.nz>
 * @author Michael Robinson <michael@panmedia.co.nz>
 * @author Melissa Richards <melissa@panmedia.co.nz>
 */

/**
 * Creates an instance of the button class to undo an action.
 *
 * @todo param details?
 * @param {type} param
 */
Raptor.registerUi(new Button({
    name: 'historyUndo',
    hotkey: 'ctrl+z',

    action: function() {
        this.raptor.historyBack();
    },

    init: function () {
        this.raptor.bind('historyChange', this.historyChange.bind(this));
        Button.prototype.init.apply(this, arguments);
        aButtonDisable(this.button);
        return this.button;
    },

    historyChange: function() {
        if (this.raptor.present === 0) {
            aButtonDisable(this.button);
        } else {
            aButtonEnable(this.button);
        }
    }
}));
;
// File end: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/plugins/history/history-undo.js
;
// File start: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/plugins/hr/hr-create.js
/**
 * @fileOverview Contains the hr button code.
 * @license http://www.raptor-editor.com/license
 *
 * @author David Neilsen <david@panmedia.co.nz>
 * @author Michael Robinson <michael@panmedia.co.nz>
 * @author Melissa Richards <melissa@panmedia.co.nz>
 */

/**
 * Creates an instance of the preview button to insert a hr at the selection.
 *
 * @todo param details?
 * @param {type} param
 */
Raptor.registerUi(new PreviewButton({
    name: 'hrCreate',
    action: function() {
        selectionReplace('<hr/>');
    }
}));
;
// File end: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/plugins/hr/hr-create.js
;
// File start: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/plugins/image-resize/image-resize.js
/**
 * @fileOverview Contains the image resize button code.
 * @author David Neilsen <david@panmedia.co.nz>
 */
Raptor.registerUi(new DialogButton({
    name: 'imageResize',
    proportional: true,
    image: null,
    dialogOptions: {
        width: 450
    },

    action: function() {
        var dialog = this.getDialog();
        this.image = nodeUniqueId(this.layout.target);
        this.originalWidth = this.layout.target.width;
        this.originalHeight = this.layout.target.height;
        dialog.find('[name=width]').val(this.layout.target.width),
        dialog.find('[name=height]').val(this.layout.target.height);
        this.openDialog();
    },

    applyAction: function() {
        var dialog = this.getDialog(),
            width = dialog.find('[name=width]').val(),
            height = dialog.find('[name=height]').val();
        this.raptor.actionApply(function() {
            $('#' + this.image)
                .css({
                    width: width,
                    height: height
                })
                .attr('width', width)
                .attr('height', height);
            selectionSelectOuter($('#' + this.image)[0]);
        }.bind(this));
    },

    getDialogTemplate: function() {
        var template = $('<div>').html(this.raptor.getTemplate('image-resize.dialog', this.options)),
            plugin = this;
        template.find('.' + this.options.baseClass + '-lock-proportions')
            .hover(function() {
                $(this).addClass('ui-state-hover');
            }, function() {
                $(this).removeClass('ui-state-hover');
            })
            .click(function() {
                dialogs[plugin.name].instance.proportional = !dialogs[plugin.name].instance.proportional;
                $(this)
                    .find('.ui-icon')
                    .toggleClass('ui-icon-locked', plugin.proportional)
                    .toggleClass('ui-icon-unlocked', !plugin.proportional);
            });

        var widthInput = template.find('[name=width]'),
            heightInput = template.find('[name=height]');

        widthInput.on('input.raptor', function() {
            var value = parseInt($(this).val());
            if (!isNaN(value)) {
                if (dialogs[plugin.name].instance.proportional) {
                    heightInput.val(Math.round(Math.abs(dialogs[plugin.name].instance.originalHeight / dialogs[plugin.name].instance.originalWidth * value)));
                }
            }
        });

        heightInput.on('input.raptor', function() {
            var value = parseInt($(this).val());
            if (!isNaN(value)) {
                if (dialogs[plugin.name].instance.proportional) {
                    widthInput.val(Math.round(Math.abs(dialogs[plugin.name].instance.originalWidth / dialogs[plugin.name].instance.originalHeight * value)));
                }
            }
        });

        return template;
    }
}));
;
// File end: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/plugins/image-resize/image-resize.js
;
// File start: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/plugins/image-swap/image-swap.js
/**
 * @fileOverview Contains the image swap button code.
 * @author David Neilsen <david@panmedia.co.nz>
 */
Raptor.registerUi(new Button({
    name: 'imageSwap',
    chooser: null,
    click: function() {
        selectionSelectOuter(this.layout.target);
        this.raptor.getPlugin(this.options.chooser).action(this.layout.target);
    }
}));
;
// File end: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/plugins/image-swap/image-swap.js
;
// File start: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/plugins/insert-file/insert-file.js
/**
 * @fileOverview Contains the insert file button code.
 * @license http://www.raptor-editor.com/license
 *
 * @author David Neilsen <david@panmedia.co.nz>
 * @author Michael Robinson <michael@panmedia.co.nz>
 * @author Melissa Richards <melissa@panmedia.co.nz>
 */

/**
 * Creates an instance of the button class to allow the insertation of files.
 *
 * @todo param details?
 * @param {type} param
 */
Raptor.registerUi(new DialogButton({
    name: 'insertFile',
    state: false,
    /** @type {string[]} Image extensions*/
    imageTypes: [
        'jpeg',
        'jpg',
        'png',
        'gif'
    ],
    options: {

        /**
         * Save the current state, show the insert file dialog or file manager.
         *
         * @type {null|Function} Specify a function to use instead of the default
         *                       file insertion dialog.
         * @return {Boolean} False to indicate that custom action failed and the
         *                         default dialog should be used.
         */
        customAction: false
    },

    /**
     * Open the insert file dialog or file manager.
     */
    action: function(target) {
        // If a customAction has been specified, use it instead of the default dialog.
        if (!this.options.customAction || this.options.customAction.call(this, target) === false) {
            if (typeof target !== 'undefined') {
                this.getDialog().find('[name=location]').val(target.getAttribute('src') || target.getAttribute('href'));
                this.getDialog().find('[name=name]').val(target.innerHTML);
            } else {
                this.getDialog().find('[name=location]').val('');
                this.getDialog().find('[name=name]').val('');
            }
            return this.openDialog();
        }
    },

    applyAction: function() {
        var dialog = this.getDialog(),
            location = dialog.find('[name=location]').val(),
            name = dialog.find('[name=name]').val();
        this.raptor.actionApply(function() {
            this.insertFiles([{
                location: location,
                name: name
            }]);
        }.bind(this));
    },

    getDialogTemplate: function() {
        return $(this.raptor.getTemplate('insert-file.dialog'));
    },

    /**
     * Attempt to determine the file type from either the file's explicitly set
     * extension property, or the file extension of the file's location property.
     *
     * @param  {Object} file
     * @return {string}
     */
    getFileType: function(file) {
        if (typeof file.extension !== 'undefined') {
            return file.extension.toLowerCase();
        }
        var extension = file.location.split('.');
        if (extension.length > 0) {
            return extension.pop().toLowerCase();
        }
        return 'unknown';
    },

    /**
     * @param  {Object} file
     * @return {Boolean} True if the file is an image.
     */
    isImage: function(file) {
        return $.inArray(this.getFileType(file), this.imageTypes) !== -1;
    },

    /**
     * Insert the given files. If files contains only one item, it is inserted
     * with selectionReplaceWithinValidTags using an appropriate valid tag array
     * for the file's type. If files contains more than one item, the items are
     * processed into an array of HTML strings, joined then inserted using
     * selectionReplaceWithinValidTags with a valid tag array of tags that may
     * contain both image and anchor tags.
     *
     * [
     *     {
     *         location: location of the file, e.g. http://www.raptor-editor.com/images/html5.png
     *         name: a name for the file, e.g. HTML5 Logo
     *         extension: explicitly defined extension for the file, e.g. png
     *     }
     * ]
     *
     * @param  {Object[]} files Array of files to be inserted.
     */
    insertFiles: function(files) {
        this.raptor.resume();
        if (!files.length) {
            return;
        }
        this.raptor.actionApply(function() {
            if (files.length === 1) {
                if ((this.isImage(files[0]) && $(selectionGetHtml()).is('img')) || selectionIsEmpty()) {
                    this.replaceFiles(files);
                } else {
                    this.linkFiles(files);
                }
            } else {
                this.linkFiles(files);
            }
        }.bind(this));
    },

    linkFiles: function(files) {
        selectionExpandTo('a', this.raptor.getElement());
        selectionTrim();
        var applier = rangy.createApplier({
            tag: 'a',
            attributes: {
                href: files[0].location.replace(/([^:])\/\//g, '$1/'),
                title: files[0].name,
                'class': this.options.cssPrefix + 'file ' + this.options.cssPrefix + this.getFileType(files[0])
            }
        });
        applier.applyToSelection();
    },

    replaceFiles: function(files) {
        var elements = [];
        for (var fileIndex = 0; fileIndex < files.length; fileIndex++) {
            elements.push(this.prepareElement(files[fileIndex]));
        }
        selectionReplace(elements.join(', '));
    },

    /**
     * Prepare the HTML for either an image or an anchor tag, depending on the file's type.
     *
     * @param {Object} file
     * @param {string|null} text The text to use as the tag's title and an anchor
     *                           tag's HTML. If null, the file's name is used.
     * @return {string} The tag's HTML.
     */
    prepareElement: function(file, text) {
        if (this.isImage(file)) {
            return this.prepareImage(file, this.options.cssPrefix + this.getFileType(file), text);
        } else {
            return this.prepareAnchor(file, this.options.cssPrefix + 'file ' + this.options.cssPrefix + this.getFileType(file), text);
        }
    },

    /**
     * Prepare HTML for an image tag.
     *
     * @param  {Object} file
     * @param  {string} classNames Classnames to apply to the image tag.
     * @param  {string|null} text Text to use as the image tag's title. If null,
     *                            the file's name is used.
     * @return {string} Image tag's HTML.
     */
    prepareImage: function(file, classNames, text) {
        return $('<div/>').html($('<img/>').attr({
            src: file.location.replace(/([^:])\/\//g, '$1/'),
            title: text || file.name,
            'class': classNames
        })).html();
    },

    /**
     * Prepare HTML for an anchor tag.
     *
     * @param  {Object} file
     * @param  {string} classNames Classnames to apply to the anchor tag.
     * @param  {string|null} text Text to use as the anchor tag's title & content. If null,
     *                            the file's name is used.
     * @return {string} Anchor tag's HTML.
     */
    prepareAnchor: function(file, classNames, text) {
        return $('<div/>').html($('<a/>').attr({
            href: file.location.replace(/([^:])\/\//g, '$1/'),
            title: file.name,
            'class': classNames
        }).html(text || file.name)).html();
    }
}));
;
// File end: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/plugins/insert-file/insert-file.js
;
// File start: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/plugins/language-menu/language-menu.js
/**
 * @fileOverview Contains the insert file button code.
 * @license http://www.raptor-editor.com/license
 *
 * @author David Neilsen <david@panmedia.co.nz>
 * @author Michael Robinson <michael@panmedia.co.nz>
 * @author Melissa Richards <melissa@panmedia.co.nz>
 */

/**
 * The language menu class.
 *
 * @constructor
 * @augments SelectMenu
 *
 * @param {Object} options
 */
function LanguageMenu(options) {
    this.options = {
        persist: true
    };
    SelectMenu.call(this, {
        name: 'languageMenu'
    });
}

LanguageMenu.prototype = Object.create(SelectMenu.prototype);

/**
 * Initialize the language menu.
 *
 * @return {Element}
 */
LanguageMenu.prototype.init = function() {
    var result = Menu.prototype.init.call(this);
    aButtonSetLabel(this.button.button, localeNames[currentLocale]);
    aButtonSetIcon(this.button.button, 'ui-icon-flag-' + currentLocale.toLowerCase());
    return result;
};

/**
 * Change the editor's language to the current selection.
 *
 * @param {Event} event
 */
LanguageMenu.prototype.menuItemClick = function(event) {
    var locale = $(event.currentTarget).data('value');
    if (this.options.persist) {
        Raptor.persist('locale', locale);
    }
    setTimeout(function() {
        setLocale(locale);
    }, 1);
};

/**
 * @return {jQuery}
 */
LanguageMenu.prototype.getMenuItems = function() {
    var items = '';
    for (var locale in locales) {
        items += this.raptor.getTemplate('language-menu.item', {
            label: localeNames[locale],
            value: locale,
            icon: locale.toLowerCase()
        });
    }
    return items;
};

Raptor.registerUi(new LanguageMenu());
;
// File end: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/plugins/language-menu/language-menu.js
;
// File start: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/plugins/link/link-create.js
/**
 * @fileOverview Contains the create link button code.
 * @license http://www.raptor-editor.com/license
 *
 * @author David Neilsen <david@panmedia.co.nz>
 * @author Michael Robinson <michael@panmedia.co.nz>
 * @author Melissa Richards <melissa@panmedia.co.nz>
 */

var linkMenu,
    linkTypes,
    linkContent,
    linkAttributes;

/**
 * Creates an instance of the dialog toggle button to create links.
 *
 * @todo param stuff?
 * @param {type} param
 */
Raptor.registerUi(new DialogToggleButton({
    name: 'linkCreate',

    dialogOptions: {
        width: 850
    },

    applyAction: function() {
        this.raptor.actionApply(function() {
            selectionExpandToWord();
            selectionExpandTo('a', this.raptor.getElement());
            selectionTrim();
            var applier = rangy.createApplier({
                tag: 'a',
                attributes: linkAttributes
            });
            if (linkAttributes !== false && $.trim(linkAttributes.href) !== '') {
                applier.applyToSelection();
                cleanEmptyElements(this.raptor.getElement(), ['a']);
            }
        }.bind(this));
    },

    openDialog: function() {
        var element = selectionGetElement();
        if (element.is('a')) {
            for (var i = 0, l = linkTypes.length; i < l; i++) {
                var result = linkTypes[i].updateInputs(element, linkContent.children('div:eq(' + i + ')'));
                if (result) {
                    linkMenu.find(':radio:eq(' + i + ')').trigger('click');
                }
            }
        }
        DialogToggleButton.prototype.openDialog.call(this);
    },

    validateDialog: function() {
        var i = linkMenu.find(':radio:checked').val();
        linkAttributes = linkTypes[i].getAttributes(linkContent.children('div:eq(' + i + ')'));
        return linkAttributes !== false;
    },

    selectionToggle: function() {
        var element = selectionGetElement();
        if (!element) {
            return false;
        }
        if (element.closest('a').length) {
            return true;
        }
        return false;
    },

    getDialogTemplate: function() {
        var template = $(this.raptor.getTemplate('link.dialog', this.options));

        linkMenu = template.find('[data-menu]');
        linkContent = template.find('[data-content]');
        linkTypes = [
            new LinkTypeInternal(this.raptor),
            new LinkTypeExternal(this.raptor),
            new LinkTypeDocument(this.raptor),
            new LinkTypeEmail(this.raptor)
        ];

        for (var i = 0, l = linkTypes.length; i < l; i++) {
            $(this.raptor.getTemplate('link.label', linkTypes[i]))
                .click(function() {
                    linkContent.children('div').hide();
                    linkContent.children('div:eq(' + $(this).index() + ')').show();
                })
                .find(':radio')
                    .val(i)
                .end()
                .appendTo(linkMenu);
            $('<div>')
                .append(linkTypes[i].getContent())
                .hide()
                .appendTo(linkContent);
        }
        linkMenu.find(':radio:first').prop('checked', true);
        linkContent.children('div:first').show();

        return template;
    }
}));
;
// File end: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/plugins/link/link-create.js
;
// File start: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/plugins/link/link-remove.js
/**
 * @fileOverview Contains the remove link class code.
 * @license http://www.raptor-editor.com/license
 *
 * @author David Neilsen <david@panmedia.co.nz>
 * @author Michael Robinson <michael@panmedia.co.nz>
 * @author Melissa Richards <melissa@panmedia.co.nz>
 */

/**
 * Creates an instance of teh toggle button to remove links.
 *
 * @todo param details?
 * @param {type} param
 */
Raptor.registerUi(new PreviewToggleButton({
    name: 'linkRemove',
    disable: true,

    action: function() {
        this.raptor.actionApply(function() {
            var applier = rangy.createApplier({
                tag: 'a'
            });
            selectionExpandToWord();
            this.raptor.selectionConstrain();
            applier.undoToSelection();
            cleanEmptyElements(this.raptor.getElement(), ['a']);
        }.bind(this));
    },

    selectionToggle: function() {
        var element = selectionGetElement();
        if (!element) {
            return false;
        }
        if (element.closest('a').length) {
            return true;
        }
        return false;
    }
}));
;
// File end: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/plugins/link/link-remove.js
;
// File start: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/plugins/link/link-type-document.js
/**
 * @fileOverview Contains the document link class code.
 * @license http://www.raptor-editor.com/license
 *
 * @author David Neilsen <david@panmedia.co.nz>
 * @author Michael Robinson <michael@panmedia.co.nz>
 * @author Melissa Richards <melissa@panmedia.co.nz>
 */

/**
 * @class The internal link class.
 *
 * @constructor
 * @param {Raptor} raptor
 */
function LinkTypeDocument(raptor) {
    this.raptor = raptor;
    this.label = tr('linkTypeDocumentLabel');
}

LinkTypeDocument.prototype = Object.create(LinkTypeExternal.prototype);

/**
 * @return {String} The document link panel content.
 */
LinkTypeDocument.prototype.getContent = function() {
    return this.raptor.getTemplate('link.document', this.raptor.options);
};
;
// File end: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/plugins/link/link-type-document.js
;
// File start: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/plugins/link/link-type-email.js
/**
 * @fileOverview Contains the internal link class code.
 * @license http://www.raptor-editor.com/license
 *
 * @author David Neilsen <david@panmedia.co.nz>
 * @author Michael Robinson <michael@panmedia.co.nz>
 * @author Melissa Richards <melissa@panmedia.co.nz>
 */

/**
 * @class Email link class.
 * @constructor
 *
 * @todo param details and des for return.
 * @param {type} raptor
 * @returns {LinkTypeEmail}
 */
function LinkTypeEmail(raptor) {
    this.raptor = raptor;
    this.label = tr('linkTypeEmailLabel');
}

/**
 * Gets the content of the email link.
 *
 * @returns {Element}
 */
LinkTypeEmail.prototype.getContent = function() {
    return this.raptor.getTemplate('link.email', this.raptor.options);
};

/**
 * Gets the attributes of the email link.
 *
 * @todo panel and return details
 * @param {type} panel
 * @returns {LinkTypeEmail.prototype.getAttributes.Anonym$0|Boolean}
 */
LinkTypeEmail.prototype.getAttributes = function(panel) {
    var address = panel.find('[name=email]').val(),
        subject = panel.find('[name=subject]').val();
    if ($.trim(subject)) {
        subject = '?Subject=' + encodeURIComponent(subject);
    }
    if ($.trim(address) === '') {
        return false;
    }
    return {
        href: 'mailto:' + address + subject
    };
};

/**
 * Updates the users inputs.
 *
 * @todo type and des for panel and des for return.
 * @param {String} link The email link.
 * @param {type} panel
 * @returns {Boolean}
 */
LinkTypeEmail.prototype.updateInputs = function(link, panel) {
    var result = false;
        email = '',
        subject = '',
        href = link.attr('href');
    if (href.indexOf('mailto:') === 0) {
        var subjectPosition = href.indexOf('?Subject=');
        if (subjectPosition > 0) {
            email = href.substring(7, subjectPosition);
            subject = href.substring(subjectPosition + 9);
        } else {
            email = href.substring(7);
            subject = '';
        }
        result = true;
    }
    panel.find('[name=email]').val(email);
    panel.find('[name=subject]').val(subject);
    return result;
};
;
// File end: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/plugins/link/link-type-email.js
;
// File start: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/plugins/link/link-type-external.js
/**
 * @fileOverview Contains the external link class code.
 * @license http://www.raptor-editor.com/license
 *
 * @author David Neilsen <david@panmedia.co.nz>
 * @author Michael Robinson <michael@panmedia.co.nz>
 * @author Melissa Richards <melissa@panmedia.co.nz>
 */

/**
 * @class The external link class.
 * @constructor
 *
 * @todo check please
 * @param {Object} raptor
 * @returns {Element}
 */
function LinkTypeExternal(raptor) {
    this.raptor = raptor;
    this.label = tr('linkTypeExternalLabel');
}

/**
 * Gets the content of the external link.
 *
 * @returns {Element}
 */
LinkTypeExternal.prototype.getContent = function() {
    return this.raptor.getTemplate('link.external', this.raptor.options);
};

/**
 * Gets the attributes of the external link.
 *
 * @todo type and des for panel
 * @param {type} panel
 * @returns {LinkTypeExternal.prototype.getAttributes.result|Boolean}
 */
LinkTypeExternal.prototype.getAttributes = function(panel) {
    var address = panel.find('[name=location]').val(),
        target = panel.find('[name=blank]').is(':checked'),
        result = {
            href: address
        };

    if (target) {
        result.target = '_blank';
    }

    if ($.trim(result.href) === 'http://') {
        return false;
    }

    return result;
};

/**
 * Updates the users inputs.
 *
 * @todo type and desc for panel and return.
 * @param {String} link The external link.
 * @param {type} panel
 * @returns {Boolean}
 */
LinkTypeExternal.prototype.updateInputs = function(link, panel) {
    var result = false,
        href = link.attr('href');
    if (href.indexOf('http://') === 0) {
        panel.find('[name=location]').val(href);
        result = true;
    } else {
        panel.find('[name=location]').val('http://');
    }
    if (link.attr('target') === '_blank') {
        panel.find('[name=blank]').prop('checked', true);
    } else {
        panel.find('[name=blank]').prop('checked', false);
    }
    return result;
};
;
// File end: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/plugins/link/link-type-external.js
;
// File start: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/plugins/link/link-type-internal.js
/**
 * @fileOverview Contains the internal link class code.
 * @license http://www.raptor-editor.com/license
 *
 * @author David Neilsen <david@panmedia.co.nz>
 * @author Michael Robinson <michael@panmedia.co.nz>
 * @author Melissa Richards <melissa@panmedia.co.nz>
 */

/**
 * @class The internal link class.
 * @constructor
 *
 * @todo check please
 * @param {Object} raptor
 * @returns {Element}
 */
function LinkTypeInternal(raptor) {
    this.raptor = raptor;
    this.label = tr('linkTypeInternalLabel');
}

/**
 * Gets the content of the internal link.
 *
 * @returns {Element}
 */
LinkTypeInternal.prototype.getContent = function() {
    return this.raptor.getTemplate('link.internal', {
        baseClass: this.raptor.options.baseClass,
        domain: window.location.protocol + '//' + window.location.host
    });
};

/**
 * Gets the attributes of the internal link.
 *
 * @todo type and des for panel and return
 * @param {type} panel
 * @returns {LinkTypeInternal.prototype.getAttributes.result}
 */
LinkTypeInternal.prototype.getAttributes = function(panel) {
    var address = panel.find('[name=location]').val(),
        target = panel.find('[name=blank]').is(':checked'),
        result = {
            href: address
        };

    if (target) {
        result.target = '_blank';
    }

    return result;
};

/**
 * Updates the users inputs.
 *
 * @todo type and des for panel and des for return.
 * @param {String} link The internal lnk.
 * @param {type} panel
 * @returns {Boolean}
 */
LinkTypeInternal.prototype.updateInputs = function(link, panel) {
    var href = link.attr('href');
    if (href.indexOf('http://') === -1 &&
            href.indexOf('mailto:') === -1) {
        panel.find('[name=location]').val(href);
    } else {
        panel.find('[name=location]').val('');
    }
    if (link.attr('target') === '_blank') {
        panel.find('[name=blank]').prop('checked', true);
    } else {
        panel.find('[name=blank]').prop('checked', false);
    }
    return false;
};
;
// File end: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/plugins/link/link-type-internal.js
;
// File start: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/plugins/list/list-ordered.js
/**
 * @fileOverview Contains the ordered list button code.
 * @license http://www.raptor-editor.com/license
 *
 * @author David Neilsen <david@panmedia.co.nz>
 * @author Michael Robinson <michael@panmedia.co.nz>
 * @author Melissa Richards <melissa@panmedia.co.nz>
 */

/**
 * Creates a new instance of the preview toggle button to create ordered lists.
 */
Raptor.registerUi(new PreviewToggleButton({
    name: 'listOrdered',
    init: function() {
        var result = PreviewToggleButton.prototype.init.apply(this, arguments);
        if (elementIsValid(this.raptor.getElement(), listValidUlOlParents)) {
            return result;
        }
        return;
    },
    action: function() {
        listToggle('ol', 'li', this.raptor.getElement());
    },
    selectionToggle: function() {
        var selection = rangy.getSelection();
        return selection.getAllRanges().length > 0 &&
            selectionGetElements(selection).closest('ol').length;
    }
}));
;
// File end: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/plugins/list/list-ordered.js
;
// File start: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/plugins/list/list-unordered.js
/**
 * @fileOverview Contains the unordered list button code.
 * @license http://www.raptor-editor.com/license
 *
 * @author David Neilsen <david@panmedia.co.nz>
 * @author Michael Robinson <michael@panmedia.co.nz>
 * @author Melissa Richards <melissa@panmedia.co.nz>
 */

/**
 * Creates a new instance of the preview toggle button to create unordered lists.
 *
 * @todo param details?
 * @param {type} param
 */
Raptor.registerUi(new PreviewToggleButton({
    name: 'listUnordered',
    init: function() {
        var result = PreviewToggleButton.prototype.init.apply(this, arguments);
        if (elementIsValid(this.raptor.getElement(), listValidUlOlParents)) {
            return result;
        }
        return;
    },
    action: function() {
        listToggle('ul', 'li', this.raptor.getElement());
    },
    selectionToggle: function() {
        var selection = rangy.getSelection();
        return selection.getAllRanges().length > 0 &&
            selectionGetElements(selection).closest('ul').length;
    }
}));
;
// File end: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/plugins/list/list-unordered.js
;
// File start: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/plugins/logo/logo.js
/**
 * @fileOverview Contains the logo button code.
 * @license http://www.raptor-editor.com/license
 *
 * @author David Neilsen <david@panmedia.co.nz>
 * @author Michael Robinson <michael@panmedia.co.nz>
 * @author Melissa Richards <melissa@panmedia.co.nz>
 */

/**
 * Creates a new instance of the button class to display the raptor logo and
 * link to the raptor version page.
 */
Raptor.registerUi(new Button({
    name: 'logo',
    // <usage-statistics>
    init: function() {
        var button = Button.prototype.init.apply(this, arguments);
        button.find('.ui-button-icon-primary').css({
            'background-image': 'url(//www.raptor-editor.com/logo/VERSION?json=' +
                encodeURIComponent(JSON.stringify(this.raptor.options)) + ')'
        });
        return button;
    },
    // </usage-statistics>
    action: function() {
        window.open('http://www.raptor-editor.com/about/VERSION', '_blank');
    }
}));
;
// File end: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/plugins/logo/logo.js
;
// File start: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/plugins/no-break/no-break.js
/**
 * @fileOverview No break plugin.
 * @license http://www.raptor-editor.com/license
 *
 * @author David Neilsen david@panmedia.co.nz
 */

function NoBreakPlugin(name, overrides) {
    RaptorPlugin.call(this, name || 'noBreak', overrides);
}

NoBreakPlugin.prototype = Object.create(RaptorPlugin.prototype);

NoBreakPlugin.prototype.init = function() {
    this.raptor.getElement().on('keypress.raptor', this.preventReturn.bind(this));
    this.raptor.getElement().on('drop.raptor', this.preventDrop.bind(this));
};

NoBreakPlugin.prototype.preventReturn = function(event) {
    if (this.options.enabled && event.which === 13) {
        return false;
    }
};

NoBreakPlugin.prototype.preventDrop = function(event) {
    return this.options.enabled;
// Attempt to allow dropping of plain text (not working)
//
//    console.log(event.originalEvent);
//    var range = rangy.getSelection().getRangeAt(0).cloneRange();
//    console.log(range);
//    console.log(range.startOffset);
//    console.log(range.endOffset);
//    for (var i = 0, l = event.originalEvent.dataTransfer.items.length; i < l; i++) {
//        console.log(event.originalEvent);
//        if (event.originalEvent.dataTransfer.items[i].type == 'text/plain' &&
//                event.originalEvent.dataTransfer.items[i].kind == 'string') {
//            event.originalEvent.dataTransfer.items[i].getAsString(function(content) {
//                this.raptor.actionApply(function() {
//                    rangeReplace(range, content);
////                    selectionReplace(content);
//                })
//            }.bind(this));
//        }
//    }
//    return false;
};

Raptor.registerPlugin(new NoBreakPlugin());
;
// File end: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/plugins/no-break/no-break.js
;
// File start: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/plugins/normalise-line-breaks/normalise-line-breaks.js
/**
 * @fileOverview Contains the view normalise line breaks button code.
 * @license http://www.raptor-editor.com/license
 *
 * @author Michael Robinson <michael@panmedia.co.nz>
 * @author David Neilsen <david@panmedia.co.nz>
 * @author Melissa Richards <melissa@panmedia.co.nz>
 */

/**
 * Attempts to enforce standard behaviour across browsers for return &
 * shift+return key presses.
 *
 * @constructor
 * @param {String} name
 * @param {Object} overrides
 */
function NormaliseLineBreaksPlugin(name, overrides) {
    RaptorPlugin.call(this, name || 'normaliseLineBreaks', overrides);
}

NormaliseLineBreaksPlugin.prototype = Object.create(RaptorPlugin.prototype);

/**
 * Register hotkey actions.
 */
NormaliseLineBreaksPlugin.prototype.init = function() {
    this.raptor.registerHotkey('return', this.returnPressed.bind(this));
    this.raptor.registerHotkey('shift+return', this.shiftReturnPressed.bind(this));
};

NormaliseLineBreaksPlugin.prototype.returnPressedList = function(selectedElement) {
    var selectedListElement = selectedElement.closest('li');
    if (!selectedListElement.length) {
        return false;
    }

    var parentList = selectedListElement.closest('ul, ol');
    var listType = parentList.get(0).tagName.toLowerCase(),
        replacementElement = false;

    // If current list element is empty, list element needs to be replaced with <p>
    if (elementIsEmpty(selectedListElement)) {
        // If not at bottom of list, list must be broken
        var nextListElement = selectedListElement.next();
        if (nextListElement.length && nextListElement.is('li')) {
            replacementElement = listBreakByReplacingSelection(listType, 'li', this.raptor.getElement(), '<p>&nbsp;</p>');
            if (replacementElement) {
                selectionSelectInner(replacementElement.get(0));
            }
        } else {
            selectedListElement.remove();
            selectionSelectInner($('<p>&nbsp;</p>').insertAfter(parentList).get(0));
        }
    } else {
        replacementElement = listBreakAtSelection(listType, 'li', this.raptor.getElement());
        if (replacementElement) {
            selectionSelectStart(replacementElement.get(0));
        }
    }
    return true;

};

/**
 * Handle return keypress.
 *
 * When inside a ul/ol, the the current list item is split and the cursor is
 * placed at the start of the second list item.
 *
 * @return {Boolean} True if the keypress has been handled and should not propagate
 *                        further
 */
NormaliseLineBreaksPlugin.prototype.returnPressed = function() {
    var selectedElement = selectionGetElement();

    if (this.returnPressedList(selectedElement)) {
        return true;
    }
    return false;
};

NormaliseLineBreaksPlugin.prototype.shiftReturnPressedList = function(selectedElement) {
    if (selectedElement.closest('li').length) {
        var listType = selectedElement.closest('ul, ol').get(0).tagName.toLowerCase();
        var replacementElement = listBreakByReplacingSelection(listType, 'li', this.raptor.getElement(), '<p>&nbsp;</p>');
        if (replacementElement) {
            selectionSelectInner(replacementElement.get(0));
        }
        return true;
    }

    return false;
};

/**
 * Handle shift+return keypress.
 *
 * When inside a ul/ol, the the current selection is replaced with a p by splitting the list.
 *
 * @return {Boolean} True if the keypress has been handled and should not propagate
 *                        further
 */
NormaliseLineBreaksPlugin.prototype.shiftReturnPressed = function() {
    var selectedElement = selectionGetElement();
    if (this.shiftReturnPressedList(selectedElement)) {
        return true;
    }
    return false;
};

Raptor.registerPlugin(new NormaliseLineBreaksPlugin());

;
// File end: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/plugins/normalise-line-breaks/normalise-line-breaks.js
;
// File start: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/plugins/paste/paste.js
/**
 * @fileOverview Contains the paste plugin class code.
 * @license http://www.raptor-editor.com/license
 *
 * @author David Neilsen <david@panmedia.co.nz>
 * @author Michael Robinson <michael@panmedia.co.nz>
 * @author Melissa Richards <melissa@panmedia.co.nz>
 */

var pasteInProgress = false,
    pasteDialog = null,
    pasteInstance = null,
    pasteShiftDown = null;

/**
 * The paste plugin class.
 *
 * @constructor
 * @augments RaptorPlugin
 *
 * @param {String} name
 * @param {Object} overrides Options hash.
 */
function PastePlugin(name, overrides) {
    /**
     * Default options.
     *
     * @type {Object}
     */
    this.options = {
        /**
         * Tags that will not be stripped from pasted content.
         * @type {Array}
         */
        allowedTags: [
            'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'blockquote',
            'p', 'a', 'span', 'hr', 'br', 'strong', 'em'
        ],

        allowedAttributes: [
            'href', 'title'
        ],

        allowedEmptyTags: [
            'hr', 'br'
        ],
        
        panels: [
            'formatted-clean',
            'plain-text',
            'formatted-unclean',
            'source'
        ]
    };

    RaptorPlugin.call(this, name || 'paste', overrides);
}

PastePlugin.prototype = Object.create(RaptorPlugin.prototype);

/**
 * Enables pasting.
 */
PastePlugin.prototype.enable = function() {
    this.raptor.getElement().on('paste.raptor', this.capturePaste.bind(this));
};

/**
 * Captures the html to be pasted.
 *
 * @returns {Boolean} True if paste capture is successful.
 */
PastePlugin.prototype.capturePaste = function() {
    if (pasteShiftDown) {
        return;
    }
    if (pasteInProgress) {
        return false;
    }
    selectionSave();

    pasteInProgress = true;

    // Make a contentEditable div to capture pasted text
    $('.raptorPasteBin').remove();
    $('<div class="raptorPasteBin" contenteditable="true" style="width: 1px; height: 1px; overflow: hidden; position: fixed; top: -1px;" />').appendTo('body');
    $('.raptorPasteBin').focus();

    window.setTimeout(this.showPasteDialog.bind(this), 0);

    return true;
};

/**
 * Opens the paste dialog.
 */
PastePlugin.prototype.showPasteDialog = function() {
    aDialogOpen(this.getDialog(this));
};

/**
 * Inserts the pasted content into the selection.
 *
 * @param {HTML} html The html to be pasted into the selection.
 */
PastePlugin.prototype.pasteContent = function(html) {
    this.raptor.actionApply(function() {
        var uniqueId = elementUniqueId();
        selectionRestore();
        html = this.filterAttributes(html);
        html = this.filterChars(html);
        selectionReplace($('<placeholder id="' + uniqueId + '">' + html + '</placeholder>'));
        $('.raptorPasteBin').remove();
        var placeholder = $('#' + uniqueId);
        selectionSelectInner(placeholder.get(0));
        selectionSave();
        placeholder.contents().unwrap();
        selectionRestore();
    }.bind(this));
};

/**
 * Gets the paste dialog.
 *
 * @todo type for instance
 * @param {type} instance The paste instance
 * @returns {Object} The paste dialog.
 */
PastePlugin.prototype.getDialog = function(instance) {
    pasteInstance = instance;
    if (!pasteDialog) {
        pasteDialog = $('<div>').html(this.raptor.getTemplate('paste.dialog', this.options));
        for (var i = 0, l = this.options.panels.length; i < l; i++) {
            pasteDialog.find('.' + this.options.baseClass + '-tab-' + this.options.panels[i]).css('display', '');
            if (i === 0) {
                pasteDialog.find('.' + this.options.baseClass + '-content-' + this.options.panels[i]).css('display', '');
            }
        }
        pasteDialog.find('.' + this.options.baseClass + '-panel-tabs > div:visible:not(:first)').hide();
        aDialog(pasteDialog, {
            modal: true,
            resizable: true,
            autoOpen: false,
            width: 800,
            height: 500,
            title: tr('pasteDialogTitle'),
            dialogClass: this.options.baseClass + '-dialog',
            close: function() {
                pasteInProgress = false;
            },
            buttons: [
                {
                    text: tr('pasteDialogOKButton'),
                    click: function() {
                        var html = null,
                            element = pasteDialog.find('.' + this.options.baseClass + '-area:visible');

                        if (element.hasClass(this.options.baseClass + '-plain') || element.hasClass(this.options.baseClass + '-source')) {
                            html = element.val();
                        } else {
                            html = element.html();
                        }
                        aDialogClose(pasteDialog);
                        pasteInstance.pasteContent(html);
                    }.bind(this),
                    icons: {
                        primary: 'ui-icon-circle-check'
                    }
                },
                {
                    text: tr('pasteDialogCancelButton'),
                    click: function() {
                        selectionDestroy();
                        $('.raptorPasteBin').remove();
                        aDialogClose(pasteDialog);
                    },
                    icons: {
                        primary: 'ui-icon-circle-close'
                    }
                }
            ]
        });

        // Create fake jQuery UI tabs (to prevent hash changes)
        var tabs = pasteDialog.find('.' + this.options.baseClass + '-panel-tabs');
        tabs.find('li')
            .click(function() {
                tabs.find('ul li').removeClass('ui-state-active').removeClass('ui-tabs-selected');
                $(this).addClass('ui-state-active').addClass('ui-tabs-selected');
                tabs.children('div').hide().eq($(this).index()).show();
            });
    }
    this.updateAreas();
    return pasteDialog;
};

/**
 * Attempts to filter rubbish from content using regular expressions.
 *
 * @param  {String} content Dirty text
 * @return {String} The filtered content
 */
PastePlugin.prototype.filterAttributes = function(content) {
    // The filters variable is an array of of regular expression & handler pairs.
    //
    // The regular expressions attempt to strip out a lot of style data that
    // MS Word likes to insert when pasting into a contentEditable.
    // Almost all of it is junk and not good html.
    //
    // The hander is a place to put a function for match handling.
    // In most cases, it just handles it as empty string.  But the option is there
    // for more complex handling.
    var filters = [
        // Meta tags, link tags, and prefixed tags
        {regexp: /(<meta\s*[^>]*\s*>)|(<\s*link\s* href="file:[^>]*\s*>)|(<\/?\s*\w+:[^>]*\s*>)/gi, handler: ''},
        // MS class tags and comment tags.
        {regexp: /(class="Mso[^"]*")|(<!--(.|\s){1,}?-->)/gi, handler: ''},
        // Apple class tags
        {regexp: /(class="Apple-(style|converted)-[a-z]+\s?[^"]+")/, handle: ''},
        // Google doc attributes
        {regexp: /id="internal-source-marker_[^"]+"|dir="[rtl]{3}"/, handle: ''},
        // blank p tags
        {regexp: /(<p[^>]*>\s*(\&nbsp;|\u00A0)*\s*<\/p[^>]*>)|(<p[^>]*>\s*<font[^>]*>\s*(\&nbsp;|\u00A0)*\s*<\/\s*font\s*>\s<\/p[^>]*>)/ig, handler: ''},
        // Strip out styles containing mso defs and margins, as likely added in IE and are not good to have as it mangles presentation.
        {regexp: /(style="[^"]*mso-[^;][^"]*")|(style="margin:\s*[^;"]*;")/gi, handler: ''},
        // Style tags
        {regexp: /(?:<style([^>]*)>([\s\S]*?)<\/style>|<link\s+(?=[^>]*rel=['"]?stylesheet)([^>]*?href=(['"])([^>]*?)\4[^>\/]*)\/?>)/gi, handler: ''},
        // Scripts (if any)
        {regexp: /(<\s*script[^>]*>((.|\s)*?)<\\?\/\s*script\s*>)|(<\s*script\b([^<>]|\s)*>?)|(<[^>]*=(\s|)*[("|')]javascript:[^$1][(\s|.)]*[$1][^>]*>)/ig, handler: ''}
    ];

    $.each(filters, function(i, filter) {
        content = content.replace(filter.regexp, filter.handler);
    });

    return content;
};

/**
 * Replaces commonly-used Windows 1252 encoded chars that do not exist in ASCII or ISO-8859-1 with ISO-8859-1 cognates.
 * @param  {[type]} content [description]
 * @return {[type]}
 */
PastePlugin.prototype.filterChars = function(content) {
    var s = content;

    // smart single quotes and apostrophe
    s = s.replace(/[\u2018|\u2019|\u201A]/g, '\'');

    // smart double quotes
    s = s.replace(/[\u201C|\u201D|\u201E]/g, '\"');

    // ellipsis
    s = s.replace(/\u2026/g, '...');

    // dashes
    s = s.replace(/[\u2013|\u2014]/g, '-');

    // circumflex
    s = s.replace(/\u02C6/g, '^');

    // open angle bracket
    s = s.replace(/\u2039/g, '<');

    // close angle bracket
    s = s.replace(/\u203A/g, '>');

    // spaces
    s = s.replace(/[\u02DC|\u00A0]/g, ' ');

    return s;
};

/**
 * Strip all attributes from content (if it's an element), and every element contained within
 * Strip loop taken from <a href="http://stackoverflow.com/a/1870487/187954">Remove all attributes</a>
 * @param  {String|Element} content The string / element to be cleaned
 * @return {String} The cleaned string
 */
PastePlugin.prototype.stripAttributes = function(content) {
    content = $('<div/>').html(content);
    var allowedAttributes = this.options.allowedAttributes;

    $(content.find('*')).each(function() {
        // First copy the attributes to remove if we don't do this it causes problems iterating over the array
        // we're removing elements from
        var attributes = [];
        $.each(this.attributes, function(index, attribute) {
            // Do not remove allowed attributes
            if (-1 !== $.inArray(attribute.nodeName, allowedAttributes)) {
                return;
            }
            attributes.push(attribute.nodeName);
        });

        // now remove the attributes
        for (var attributeIndex = 0; attributeIndex < attributes.length; attributeIndex++) {
            $(this).attr(attributes[attributeIndex], null);
        }
    });
    return content.html();
};

/**
 * Remove empty tags.
 *
 * @param {String} content The HTML containing empty elements to be removed
 * @return {String} The cleaned HTML
 */
PastePlugin.prototype.stripEmpty = function(content) {
    var wrapper = $('<div/>').html(content);
    var allowedEmptyTags = this.options.allowedEmptyTags;
    wrapper.find('*').filter(function() {
        // Do not strip elements in allowedEmptyTags
        if (-1 !== $.inArray(this.tagName.toLowerCase(), allowedEmptyTags)) {
            return false;
        }
        // If the element has at least one child element that exists in allowedEmptyTags, do not strip it
        if ($(this).find(allowedEmptyTags.join(',')).length) {
            return false;
        }
        return $.trim($(this).text()) === '';
    }).remove();
    return wrapper.html();
};

/**
 * Remove spans that have no attributes.
 *
 * @param {String} content
 * @return {String} The cleaned HTML
 */
PastePlugin.prototype.stripSpans = function(content) {
    var wrapper = $('<div/>').html(content);
    wrapper.find('span').each(function() {
        if (!this.attributes.length) {
            $(this).replaceWith($(this).html());
        }
    });
    return wrapper.html();
};

/**
 * Update text input content.
 */
PastePlugin.prototype.updateAreas = function() {
    var markup = $('.raptorPasteBin').html();
    markup = this.filterAttributes(markup);
    markup = this.filterChars(markup);
    markup = this.stripEmpty(markup);
    markup = this.stripAttributes(markup);
    markup = this.stripSpans(markup);
    markup = stringStripTags(markup, this.options.allowedTags);

    var plain = $('<div/>').html($('.raptorPasteBin').html()).text();
    var html = $('.raptorPasteBin').html();

    pasteDialog.find('.' + this.options.baseClass + '-plain').val($('<div/>').html(plain).text());
    pasteDialog.find('.' + this.options.baseClass + '-rich').html(markup);
    pasteDialog.find('.' + this.options.baseClass + '-source').html(html);
    pasteDialog.find('.' + this.options.baseClass + '-markup').html(markup);
};

$(document).on('keyup.raptor keydown.raptor', function(event) {
    pasteShiftDown = event.shiftKey;
});

Raptor.registerPlugin(new PastePlugin());
;
// File end: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/plugins/paste/paste.js
;
// File start: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/plugins/placeholder/placeholder.js
/**
 * @fileOverview Placeholder text component.
 * @license http://www.raptor-editor.com/license
 *
 * @author David Neilsen david@panmedia.co.nz
 * @author Michael Robinson michael@panmedia.co.nz
 * @author Melissa Richards <melissa@panmedia.co.nz>
 */

/**
 * Placeholder plugin
 *
 * @constructor
 * @augments RaptorPlugin
 * @param {[type]} name
 * @param {[type]} overrides
 */
function PlaceholderPlugin(name, overrides) {

    /**
     * Default placholder plugin options.
     *
     * @type {Object}
     */
    this.options = {

        /**
         * The placeholder content used if the Raptor Editor's instance has no content.
         *
         * @type {String}
         */
        content: tr('placeholderPluginDefaultContent'),

        /**
         * Tag to wrap placeholder content.
         *
         * @type {String}
         */
        tag: 'p',

        /**
         * Select placeholder content when inserted.
         *
         * @type {Boolean}
         */
        select: true
    };

    RaptorPlugin.call(this, name || 'placeholder', overrides);
}

PlaceholderPlugin.prototype = Object.create(RaptorPlugin.prototype);

/**
 * Init placeholder plugin.
 */
PlaceholderPlugin.prototype.init = function() {
    this.raptor.bind('enabled', this.enabled.bind(this));
    this.raptor.bind('change', this.check.bind(this));
};

/**
 * Insert the placeholder if the editable element is empty.
 */
PlaceholderPlugin.prototype.enabled = function() {
    this.check(this.raptor.getHtml());
};

PlaceholderPlugin.prototype.check = function(html) {
    html = html.trim();
    if (!html || html === '<br>' || html === '<div><br></div>') {
        var raptorNode = this.raptor.getNode(),
            tag = document.createElement(this.options.tag);
        tag.innerHTML = this.options.content;
        raptorNode.innerHTML = '';
        raptorNode.appendChild(tag);
        if (this.options.select) {
            selectionSelectInner(raptorNode.childNodes[0]);
        }
        this.raptor.checkChange();
    }
};

Raptor.registerPlugin(new PlaceholderPlugin());
;
// File end: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/plugins/placeholder/placeholder.js
;
// File start: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/plugins/save/save.js
/**
 * @fileOverview Contains the save class code.
 * @license http://www.raptor-editor.com/license
 *
 * @author David Neilsen <david@panmedia.co.nz>
 * @author Michael Robinson <michael@panmedia.co.nz>
 * @author Melissa Richards <melissa@panmedia.co.nz>
 */

/**
 * Creates an instance of the button class to save any changes.
 */
Raptor.registerUi(new Button({
    name: 'save',

    action: function() {
        if (this.getPlugin()) {
            this.getPlugin().save();
        } else {
            aNotify({
                text: tr('saveNotConfigured'),
                type: 'error'
            });
        }
    },

    init: function() {
        if (this.options.plugin === null) {
            return;
        }

        var result = Button.prototype.init.apply(this, arguments);

        // <strict/>

        this.raptor.bind('dirty', this.dirty.bind(this));
        this.raptor.bind('cleaned', this.clean.bind(this));
        this.clean();
        return result;
    },

    getPlugin: function() {
        return this.raptor.getPlugin(this.options.plugin);
    },

    dirty: function() {
        aButtonEnable(this.button);
    },

    clean: function() {
        aButtonDisable(this.button);
    }
}));
;
// File end: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/plugins/save/save.js
;
// File start: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/plugins/save/save-json.js
/**
 * @fileOverview Contains the save JSON plugin code.
 * @license http://www.raptor-editor.com/license
 *
 * @author David Neilsen <david@panmedia.co.nz>
 * @author Michael Robinson <michael@panmedia.co.nz>
 * @author Melissa Richards <melissa@panmedia.co.nz>
 */

/**
 * The save JSON class.
 *
 * @constructor
 * @param {String} name
 * @param {Object} overrides
 */
function SaveJsonPlugin(name, overrides) {
    this.options = {
        retain: false
    };
    RaptorPlugin.call(this, name || 'saveJson', overrides);
    this.size = null;
}

SaveJsonPlugin.prototype = Object.create(RaptorPlugin.prototype);

Raptor.registerPlugin(new SaveJsonPlugin());

// <strict/>

/**
 * Save Raptor content.
 */
SaveJsonPlugin.prototype.save = function(saveSections) {
    // Hack save sections
    if (typeof RaptorSection !== 'undefined' && saveSections !== false) {
        RaptorSection.save(false);
    }
    var data = {};
    this.raptor.unify(function(raptor) {
        if (raptor.isDirty()) {
            raptor.clean();
            var plugin = raptor.getPlugin('saveJson');
            var id = plugin.options.id.call(plugin);
            var html = raptor.getHtml();
            data[id] = html;
        }
    }.bind(this));
    var post = {};
    this.size = Object.keys(data).length;
    post[this.options.postName] = JSON.stringify(data);
    $.ajax({
            type: this.options.type || 'post',
            dataType: this.options.dataType || 'json',
            url: this.options.url,
            data: post
        })
        .done(this.done.bind(this))
        .fail(this.fail.bind(this));
};

/**
 * Done handler.
 *
 * @param {Object} data
 * @param {Integer} status
 * @param {Object} xhr
 */
SaveJsonPlugin.prototype.done = function(data, status, xhr) {
    this.raptor.unify(function(raptor) {
        if (raptor.isDirty()) {
            raptor.saved([data, status, xhr]);
        }
    });
    var message = tr('saveJsonSaved', {
        saved: this.size
    });
    if ($.isFunction(this.options.formatResponse)) {
        message = this.options.formatResponse(data);
    }
    aNotify({
        text: message,
        type: 'success'
    });
    if (!this.options.retain) {
        this.raptor.unify(function(raptor) {
            raptor.disableEditing();
        });
    }
};

/**
 * Fail handler.
 *
 * @param {Object} xhr
 */
SaveJsonPlugin.prototype.fail = function(xhr) {
    aNotify({
        text: tr('saveJsonFail', {
            failed: this.size
        }),
        type: 'error'
    });
};
;
// File end: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/plugins/save/save-json.js
;
// File start: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/plugins/save/save-rest.js
/**
 * @fileOverview Contains the save rest class code.
 * @license http://www.raptor-editor.com/license
 *
 * @author David Neilsen <david@panmedia.co.nz>
 * @author Michael Robinson <michael@panmedia.co.nz>
 * @author Melissa Richards <melissa@panmedia.co.nz>
 */

/**
 * The save rest class.
 *
 * @constructor
 * @augments RaptorPlugin
 *
 * @param {String} name
 * @param {Object} overrides Options hash
 */
function SaveRestPlugin(name, overrides) {
    this.method = 'put';
    this.options = {
        retain: false
    };
    RaptorPlugin.call(this, name || 'saveRest', overrides);
}

SaveRestPlugin.prototype = Object.create(RaptorPlugin.prototype);

/**
 * Initializes the save rest plugin.
 *
 * @returns {Element}
 */
// <strict/>

/**
 * Saves the selection.
 */
SaveRestPlugin.prototype.save = function() {
    this.requests = 0;
    this.errors = [];
    this.messages = [];
    this.raptor.unify(function(raptor) {
        if (raptor.isDirty()) {
            this.requests++;
            var xhr = raptor.getPlugin('saveRest').sendRequest();
            xhr.raptor = raptor;
            xhr
                .done(this.done.bind(this))
                .fail(this.fail.bind(this))
                .always(this.always.bind(this));
        }
    }.bind(this));
};

/**
 * @param {type} data
 * @param {type} status
 * @param {type} xhr
 */
SaveRestPlugin.prototype.done = function(data, status, xhr) {
    xhr.raptor.saved();
    this.messages.push(data);
};

/**
 * @param {type} xhr
 */
SaveRestPlugin.prototype.fail = function(xhr) {
    this.errors.push(xhr.responseText);
};

/**
 * Action always peformed on AJAX request
 */
SaveRestPlugin.prototype.always = function() {
    this.requests--;
    if (this.requests === 0) {
        if (this.errors.length > 0 && this.messages.length === 0) {
            aNotify({
                text: tr('saveRestFail', {
                    failed: this.errors.length
                }),
                type: 'error'
            });
        } else if (this.errors.length > 0) {
            aNotify({
                text: tr('saveRestPartial', {
                    saved: this.messages.length,
                    failed: this.errors.length
                }),
                type: 'error'
            });
        } else {
            aNotify({
                text: tr('saveRestSaved', {
                    saved: this.messages.length
                }),
                type: 'success'
            });
            if (!this.options.retain) {
                this.raptor.unify(function(raptor) {
                    raptor.disableEditing();
                });
            }
        }
    }
};

/**
 * @returns {Object} AJAX promise object
 */
SaveRestPlugin.prototype.sendRequest = function() {
    var headers = this.raptor.getPlugin('saveRest').getHeaders(),
        data = this.raptor.getPlugin('saveRest').getData(),
        url = this.raptor.getPlugin('saveRest').getURL();
    return $.ajax({
        type: this.options.type || 'post',
        dataType: this.options.dataType || 'json',
        headers: headers,
        data: data,
        url: url
    });
};

/**
 * @returns {SaveRestPlugin.prototype.getHeaders}
 */
SaveRestPlugin.prototype.getHeaders = function() {
    if (this.options.headers) {
        return this.options.headers.call(this);
    }
    return {};
};

/**
 * @returns {SaveRestPlugin.prototype.getData.data}
 */
SaveRestPlugin.prototype.getData = function() {
    // Get the data to send to the server
    this.raptor.clean();
    var content = this.raptor.getHtml(),
        data = this.options.data.call(this, content);
    data._method = this.method;
    return data;
};

/**
 * @returns {String} The URL to use for REST calls
 */
SaveRestPlugin.prototype.getURL = function() {
    if (typeof this.options.url === 'string') {
        return this.options.url;
    }
    return this.options.url.call(this);
};

Raptor.registerPlugin(new SaveRestPlugin());
;
// File end: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/plugins/save/save-rest.js
;
// File start: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/plugins/snippet-menu/snippet-menu.js
/**
 * @fileOverview Contains the snippet menu class code.
 * @license http://www.raptor-editor.com/license
 *
 * @author David Neilsen <david@panmedia.co.nz>
 * @author Michael Robinson <michael@panmedia.co.nz>
 * @author Melissa Richards <melissa@panmedia.co.nz>
 */

/**
 * The snippet menu class.
 *
 * @constructor
 * @augments SelectMenu
 *
 * @param {Object} options
 */
function SnippetMenu(options) {
    SelectMenu.call(this, {
        name: 'snippetMenu'
    });
}

SnippetMenu.prototype = Object.create(SelectMenu.prototype);

/**
 * Initialize the snippet menu.
 *
 * @returns {Element}
 */
SnippetMenu.prototype.init = function() {
    var result = SelectMenu.prototype.init.call(this);
    if (typeof this.options.snippets !== 'undefined' &&
            Object.keys(this.options.snippets).length > 0) {
        return result;
    }
};

/**
 * Inserts the snippet into the selected text.
 *
 * @todo type for name
 * @param {type} name The name of the snippet.
 */
SnippetMenu.prototype.insertSnippet = function(name) {
    selectionReplace(this.options.snippets[name]);
};

/**
 * Applies the insertion of the snippet.
 *
 * @param {type} event The click event that applies the snippet.
 */
SnippetMenu.prototype.menuItemMouseDown = function(event) {
    this.raptor.actionApply(function() {
        this.insertSnippet($(event.currentTarget).data('name'));
    }.bind(this));
};

/**
 * Previews the insertion of a snippet.
 *
 * @param {type} event The mouse event that triggers the preview.
 */
SnippetMenu.prototype.menuItemMouseEnter = function(event) {
    this.raptor.actionPreview(function() {
        this.insertSnippet($(event.currentTarget).data('name'));
    }.bind(this));
};

/**
 * Removes the preview state.
 */
SnippetMenu.prototype.menuItemMouseLeave = function() {
    this.raptor.actionPreviewRestore();
};

/**
 * Gets the menu items for the snippet menu.
 *
 * @todo check type for return
 * @returns {Element} The menu items.
 */
SnippetMenu.prototype.getMenuItems = function() {
    var items = '';
    for (var name in this.options.snippets) {
        items += this.raptor.getTemplate('snippet-menu.item', {
            name: name
        });
    }
    return items;
};

Raptor.registerUi(new SnippetMenu());
;
// File end: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/plugins/snippet-menu/snippet-menu.js
;
// File start: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/plugins/special-characters/special-characters.js
/**
 * @fileOverview Contains the special characters button code.
 * @license http://www.raptor-editor.com/license
 *
 * @author David Neilsen <david@panmedia.co.nz>
 * @author Michael Robinson <michael@panmedia.co.nz>
 * @author Melissa Richards <melissa@panmedia.co.nz>
 */

var insertCharacter = false;

/**
 * Creates an instance of the button class to insert special characters.
 */
Raptor.registerUi(new DialogButton({
    name: 'specialCharacters',
    dialogOptions: {
        width: 645
    },
    options: {
        setOrder: [
            'symbols',
            'mathematics',
            'arrows',
            'greekAlphabet'
        ],
        /**
         * Character sets available for display. From {@link http://turner.faculty.swau.edu/webstuff/htmlsymbols.html}
         */
        characterSets: {
            symbols: {
                name: tr('specialCharactersSymbols'),
                characters: [
                    ['<', '&lt;', 'less than'],
                    ['>', '&gt;', 'greater than'],
                    ['&', '&amp;', 'ampersand'],
                    ['"', '&quot;', 'quotation mark'],
                    ['&nbsp;', 'non-breaking space: \' \''],
                    ['&emsp;', 'em space: \'  \''],
                    ['&ensp;', 'en space: \' \''],
                    ['&thinsp;', 'thin space: \'\''],
                    ['&mdash;', 'em dash'],
                    ['&ndash;', 'en dash'],
                    ['&minus;', 'minus'],
                    ['-', 'hyphen'],
                    ['&oline;', 'overbar space'],
                    ['&cent;', 'cent'],
                    ['&pound;', 'pound'],
                    ['&euro;', 'euro'],
                    ['&sect;', 'section'],
                    ['&dagger;', 'dagger'],
                    ['&Dagger;', 'double dagger'],
                    ['&lsquo;', 'left single quotes'],
                    ['&rsquo;', 'right single quotes'],
                    ['\'', 'single quotes'],
                    ['&#x263a;', 'smiley face'],
                    ['&#x2605;', 'black star'],
                    ['&#x2606;', 'white star'],
                    ['&#x2610;', 'check box'],
                    ['&middot;', 'middle dot'],
                    ['&bull;', 'bullet'],
                    ['&copy;', 'copyright'],
                    ['&reg;', 'registered'],
                    ['&trade;', 'trade'],
                    ['&iquest;', 'inverted question mark'],
                    ['&iexcl;', 'inverted exclamation mark'],
                    ['&Aring;', 'Angström'],
                    ['&hellip;', 'ellipsis'],
                    ['&#x2295;', 'earth'],
                    ['&#x2299;', 'sun'],
                    ['&#x2640;', 'female'],
                    ['&#x2642;', 'male'],
                    ['&clubs;', 'clubs or shamrock'],
                    ['&spades;', 'spades'],
                    ['&hearts;', 'hearts or valentine'],
                    ['&diams;', 'diamonds'],
                    ['&loz;', 'diamond']
                ]
            },
            mathematics: {
                name: tr('specialCharactersMathematics'),
                characters: [
                    ['&lt;', 'less than'],
                    ['&le;', 'less than or equal to'],
                    ['&gt;', 'greater than'],
                    ['&ge;', 'greater than or equal to'],
                    ['&ne;', 'not equal'],
                    ['&asymp;', 'approximately equal to'],
                    ['&equiv;', 'identically equal to'],
                    ['&cong;', 'congruent to'],
                    ['&prop;', 'proportional'],
                    ['&there4;', 'therefore'],
                    ['&sum;', 'summation'],
                    ['&prod;', 'product'],
                    ['&prime;', 'prime or minutes'],
                    ['&Prime;', 'double prime or seconds'],
                    ['&Delta;', 'delta'],
                    ['&nabla;', 'del'],
                    ['&part;', 'partial'],
                    ['&int;', 'integral'],
                    ['&middot;', 'middle dot'],
                    ['&sdot;', 'dot operator'],
                    ['&bull;', 'bullet'],
                    ['&minus;', 'minus sign'],
                    ['&times;', 'multipllcation sign'],
                    ['&divide;', 'division sign'],
                    ['&frasl;', 'fraction slash, (ordinary / \\)'],
                    ['&plusmn;', 'plus or minus'],
                    ['&deg;', 'degree sign'],
                    ['&lfloor;', 'floor function'],
                    ['&rfloor;', 'floor function'],
                    ['&lceil;', 'ceiling function'],
                    ['&rceil;', 'ceiling function'],
                    ['&lowast;', 'asterisk operator, (ordinary *)'],
                    ['&oplus;', 'circled plus'],
                    ['&otimes;', 'circled times'],
                    ['&ordm;', 'masculine ordinal'],
                    ['&lang;', 'bra'],
                    ['&rang;', 'ket'],
                    ['&infin;', 'infinity'],
                    ['&pi;', 'pi'],
                    ['&frac12;', 'half'],
                    ['&alefsym;', 'aleph'],
                    ['&radic;', 'radical'],
                    ['&ang;', 'angle'],
                    ['&perp;', 'perpendicular'],
                    ['&real;', 'real'],
                    ['&isin;', 'is an element of'],
                    ['&notin;', 'not an element of'],
                    ['&empty;', 'null set'],
                    ['&sub;', 'subset of'],
                    ['&sube;', 'subset or or equal to'],
                    ['&nsub;', 'not a subset'],
                    ['&cap;', 'intersection'],
                    ['&cup;', 'union'],
                    ['&sim;', 'tilde operator (ordinary ~)'],
                    ['&Oslash;', 'slash O'],
                    ['&and;', 'logical and'],
                    ['&Lambda;', 'lambda (and)'],
                    ['&or;', 'logical or'],
                    ['&not;', 'not sign'],
                    ['&sim;', 'tilde operator (ordinary ~)'],
                    ['&rarr;', 'right arrow'],
                    ['&rArr;', 'double right arrow'],
                    ['&larr;', 'left arrow'],
                    ['&lArr;', 'left double arrow'],
                    ['&harr;', 'left right arrow'],
                    ['&hArr;', 'left right double arrow']
                ]
            },
            arrows: {
                name: tr('specialCharactersArrows'),
                characters: [
                    ['&darr;', 'down arrow'],
                    ['&dArr;', 'down double arrow'],
                    ['&uarr;', 'up arrow'],
                    ['&uArr;', 'up double arrow'],
                    ['&crarr;', 'arriage return arrow'],
                    ['&rarr;', 'right arrow'],
                    ['&rArr;', 'double right arrow'],
                    ['&larr;', 'left arrow'],
                    ['&lArr;', 'left double arrow'],
                    ['&harr;', 'left right arrow'],
                    ['&hArr;', 'left right double arrow']
                ]
            },
            greekAlphabet: {
                name: tr('specialCharactersGreekAlphabet'),
                characters: [
                    ['&alpha;', 'alpha'],
                    ['&beta;', 'beta'],
                    ['&gamma;', 'gamma'],
                    ['&delta;', 'delta'],
                    ['&epsilon;', 'epsilon'],
                    ['&zeta;', 'zeta'],
                    ['&eta;', 'eta'],
                    ['&theta;', 'theta'],
                    ['&iota;', 'iota'],
                    ['&kappa;', 'kappa'],
                    ['&lambda;', 'lambda'],
                    ['&mu;', 'mu'],
                    ['&nu;', 'nu'],
                    ['&xi;', 'xi'],
                    ['&omicron;', 'omicron'],
                    ['&pi;', 'pi'],
                    ['&rho;', 'rho'],
                    ['&sigma;', 'sigma'],
                    ['&tau;', 'tau'],
                    ['&upsilon;', 'upsilon'],
                    ['&phi;', 'phi'],
                    ['&chi;', 'chi'],
                    ['&psi;', 'psi'],
                    ['&omega;', 'omega'],
                    ['&Alpha;', 'alpha'],
                    ['&Beta;', 'beta'],
                    ['&Gamma;', 'gamma'],
                    ['&Delta;', 'delta'],
                    ['&Epsilon;', 'epsilon'],
                    ['&Zeta;', 'zeta'],
                    ['&Eta;', 'eta'],
                    ['&Theta;', 'theta'],
                    ['&Iota;', 'iota'],
                    ['&Kappa;', 'kappa'],
                    ['&Lambda;', 'lambda'],
                    ['&Mu;', 'mu'],
                    ['&Nu;', 'nu'],
                    ['&Xi;', 'xi'],
                    ['&Omicron;', 'omicron'],
                    ['&Pi;', 'pi'],
                    ['&Rho;', 'rho'],
                    ['&Sigma;', 'sigma'],
                    ['&Tau;', 'tau'],
                    ['&Upsilon;', 'upsilon'],
                    ['&Phi;', 'phi'],
                    ['&Chi;', 'chi'],
                    ['&Psi;', 'psi'],
                    ['&Omega;', 'omega']
                ]
            }
        }
    },

    applyAction: function(dialog) {
        this.raptor.actionApply(function() {
            if (insertCharacter) {
                selectionReplace(insertCharacter);
            }
            insertCharacter = false;
        });
    },

    /**
     * Prepare tabs and add buttons to tab content.
     *
     * @return {Element}
     */
    getDialogTemplate: function() {
        var html = $(this.raptor.getTemplate('special-characters.dialog')).appendTo('body').hide();
        var setKey, tabContent, character, characterButton;
        for (var setOrderIndex = 0; setOrderIndex < this.options.setOrder.length; setOrderIndex++) {
            setKey = this.options.setOrder[setOrderIndex];

            html.find('ul').append(this.raptor.getTemplate('special-characters.tab-li', {
                baseClass: this.options.baseClass,
                name: this.options.characterSets[setKey].name,
                key: setKey
            }));

            tabContent = $(this.raptor.getTemplate('special-characters.tab-content', {
                baseClass: this.options.baseClass,
                key: setKey
            }));
            var tabCharacters = [];
            for (var charactersIndex = 0; charactersIndex < this.options.characterSets[setKey].characters.length; charactersIndex++) {
                character = this.options.characterSets[setKey].characters[charactersIndex];
                characterButton = this.raptor.getTemplate('special-characters.tab-button', {
                    htmlEntity: character[0],
                    description: character[1],
                    setKey: setKey,
                    charactersIndex: charactersIndex
                });
                tabCharacters.push(characterButton);
            }
            tabContent.append(tabCharacters.join(''));
            html.find('ul').after(tabContent);
        }
        html.show();

        var _this = this;
        html.find('button').each(function() {
            aButton($(this));
        }).click(function() {
            var setKey = $(this).attr('data-setKey');
            var charactersIndex = $(this).attr('data-charactersIndex');
            insertCharacter = _this.options.characterSets[setKey].characters[charactersIndex][0];
            _this.getOkButton(_this.name).click.call(this);
        });
        aTabs(html);
        return html;
    },

    getCancelButton: function() {
        return;
    }
}));
;
// File end: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/plugins/special-characters/special-characters.js
;
// File start: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/plugins/statistics/statistics.js
/**
 * @fileOverview Contains the statistics code.
 * @license http://www.raptor-editor.com/license
 *
 * @author David Neilsen <david@panmedia.co.nz>
 * @author Michael Robinson <michael@panmedia.co.nz>
 * @author Melissa Richards <melissa@panmedia.co.nz>
 */

var statisticsDialog = null;

/**
 * Creates an instance of a dialog button to display the pages statistics.
 */
Raptor.registerUi(new DialogButton({
    name: 'statistics',
    options: {
        maximum: 100,
        showCountInButton: true
    },
    dialogOptions: {
        width: 350
    },

    init: function() {
        if (this.options.showCountInButton) {
            this.raptor.bind('change', this.updateButton.bind(this));
        }
        return DialogButton.prototype.init.apply(this, arguments);
    },

    applyAction: function() {
    },

    getCancelButton: function() {
    },

    getCharacterCount: function() {
        return $('<div>').html(this.raptor.getHtml()).text().trim().length;
    },

    getContent: function() {
        return $('<div>').html(this.raptor.getHtml()).text().trim();
    },

    updateButton: function() {
        var charactersRemaining = null,
            label = null,
            characterCount = this.getCharacterCount();

        // Cases where maximum has been provided
        if (this.options.maximum) {
            charactersRemaining = this.options.maximum - characterCount;
            if (charactersRemaining >= 0) {
                label = tr('statisticsButtonCharacterRemaining', {
                    charactersRemaining: charactersRemaining
                });
            } else {
                label = tr('statisticsButtonCharacterOverLimit', {
                    charactersRemaining: charactersRemaining * -1
                });
            }
        } else {
            label = tr('statisticsButtonCharacters', {
                characters: characterCount
            });
        }

        aButtonSetLabel(this.button, label);

        if (!this.options.maximum) {
            return;
        }

        // Add the error state to the button's text element if appropriate
        if (charactersRemaining < 0) {
            this.button.addClass('ui-state-error').removeClass('ui-state-default');
        } else{
            // Add the highlight class if the remaining characters are in the "sweet zone"
            if (charactersRemaining >= 0 && charactersRemaining <= 15) {
                this.button.addClass('ui-state-highlight').removeClass('ui-state-error ui-state-default');
            } else {
                this.button.removeClass('ui-state-highlight ui-state-error').addClass('ui-state-default');
            }
        }
    },

    getButton: function() {
        if (!this.button) {
            Button.prototype.getButton.call(this);
            aButton(this.button, {
                text: true
            });
            if (this.options.showCountInButton) {
                this.updateButton();
            }
        }
        return this.button;
    },

    getDialogTemplate: function() {
        return $(this.raptor.getTemplate('statistics.dialog', this.options));
    },

    /**
     * Process and return the statistics dialog template.
     *
     * @return {jQuery} The processed statistics dialog template
     */
    openDialog: function() {
        var dialog = this.getDialog(),
            content = this.getContent();

        // If maximum has not been set, use infinity
        var charactersRemaining = this.options.maximum ? this.options.maximum - content.length : '&infin;';
        if (typeIsNumber(charactersRemaining) && charactersRemaining < 0) {
            dialog.find('[data-name=truncation]').html(tr('statisticsDialogTruncated', {
                'limit': this.options.maximum
            }));
        } else {
            dialog.find('[data-name=truncation]').html(tr('statisticsDialogNotTruncated'));
        }

        var totalWords = content.split(' ').length;
        if (totalWords === 1) {
            dialog.find('[data-name=words]').html(tr('statisticsDialogWord', {
                words: totalWords
            }));
        } else {
            dialog.find('[data-name=words]').html(tr('statisticsDialogWords', {
                words: totalWords
            }));
        }

        var totalSentences = content.split('. ').length;
        if (totalSentences === 1) {
            dialog.find('[data-name=sentences]').html(tr('statisticsDialogSentence', {
                sentences: totalSentences
            }));
        } else {
            dialog.find('[data-name=sentences]').html(tr('statisticsDialogSentences', {
                sentences: totalSentences
            }));
        }

        var characters = null;
        if (charactersRemaining >= 0 || !typeIsNumber(charactersRemaining)) {
            dialog.find('[data-name=characters]').html(tr('statisticsDialogCharactersRemaining', {
                characters: content.length,
                charactersRemaining: charactersRemaining
            }));
        } else {
            dialog.find('[data-name=characters]').html(tr('statisticsDialogCharactersOverLimit', {
                characters: content.length,
                charactersRemaining: charactersRemaining * -1
            }));
        }
        DialogButton.prototype.openDialog.call(this);
    }
}));
;
// File end: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/plugins/statistics/statistics.js
;
// File start: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/plugins/table/table-cell-button.js
/**
 * @fileOverview Contains the table cell button class code.
 * @license http://www.raptor-editor.com/license
 *
 * @author David Neilsen <david@panmedia.co.nz>
 * @author Michael Robinson <michael@panmedia.co.nz>
 * @author Melissa Richards <melissa@panmedia.co.nz>
 */

/**
 * The table cell button class.
 *
 * @constructor
 * @augments FilteredPreviewButton
 *
 * @param {Object} options Options hash.
 */
function TableCellButton(options) {
    FilteredPreviewButton.call(this, options);
}

TableCellButton.prototype = Object.create(FilteredPreviewButton.prototype);

/**
 * @todo
 *
 * @param {RangySelection} range The selection to get the cell from.
 * @returns {Element|null}
 */
TableCellButton.prototype.getElement = function(range) {
    var cell = $(range.commonAncestorContainer.parentNode).closest('td, th');
    if (cell.length) {
        return cell[0];
    }
    return null;
};
;
// File end: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/plugins/table/table-cell-button.js
;
// File start: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/plugins/table/table-create.js
/**
 * @fileOverview Contains the table menu class code.
 * @license http://www.raptor-editor.com/license
 *
 * @author David Neilsen <david@panmedia.co.nz>
 * @author Michael Robinson <michael@panmedia.co.nz>
 * @author Melissa Richards <melissa@panmedia.co.nz>
 */

/**
 * The table menu class.
 *
 * @constructor
 * @augments Menu
 *
 * @param {Object} options Options hash.
 */
function TableMenu(options) {
    Menu.call(this, {
        name: 'tableCreate'
    });
}

TableMenu.prototype = Object.create(Menu.prototype);

/**
 * Creates the menu table.
 *
 * @param event The mouse event to create the table.
 */
TableMenu.prototype.createTable = function(event) {
    this.raptor.actionApply(function() {
        selectionReplace(elementOuterHtml($(tableCreate(event.target.cellIndex + 1, event.target.parentNode.rowIndex + 1, {
            placeHolder: '&nbsp;'
        }))));
    });
};

/**
 * Highlights the cells inside the table menu.
 *
 * @param event The mouse event to trigger the function.
 */
TableMenu.prototype.highlight = function(event) {
    var cells = tableCellsInRange(this.menuTable.get(0), {
            x: 0,
            y: 0
        }, {
            x: event.target.cellIndex,
            y: event.target.parentNode.rowIndex
        });

    // highlight cells in menu
    this.highlightRemove(event);
    $(cells).addClass(this.options.baseClass + '-menu-hover');

    // Preview create
    this.raptor.actionPreview(function() {
        selectionReplace(elementOuterHtml($(tableCreate(event.target.cellIndex + 1, event.target.parentNode.rowIndex + 1, {
            placeHolder: '&nbsp;'
        }))));
    });
};

/**
 * Removes the highlight from the table menu.
 *
 * @param event The mouse event to trigger the function.
 */
TableMenu.prototype.highlightRemove = function(event) {
    this.menuTable
        .find('.' + this.options.baseClass + '-menu-hover')
        .removeClass(this.options.baseClass + '-menu-hover');
    this.raptor.actionPreviewRestore();
};

/**
 * Prepares and returns the menu for use in the Raptor UI.
 * @returns {Element}
 */
TableMenu.prototype.getMenu = function() {
    if (!this.menu) {
        this.menuContent = this.raptor.getTemplate('table.create-menu', this.options);
        Menu.prototype.getMenu.call(this)
            .on('click', 'td', this.createTable.bind(this))
            .on('mouseenter', 'td', this.highlight.bind(this))
            .mouseleave(this.highlightRemove.bind(this));
        this.menuTable = this.menu.find('table:eq(0)');
    }
    return this.menu;
};

Raptor.registerUi(new TableMenu());
;
// File end: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/plugins/table/table-create.js
;
// File start: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/plugins/table/table-delete-column.js
/**
 * @fileOverview Contains the delete column button code.
 * @license http://www.raptor-editor.com/license
 *
 * @author David Neilsen <david@panmedia.co.nz>
 * @author Michael Robinson <michael@panmedia.co.nz>
 * @author Melissa Richards <melissa@panmedia.co.nz>
 */

/**
 * Creates a table cell button to delete a column from a table.
 */
Raptor.registerUi(new TableCellButton({
    name: 'tableDeleteColumn',
    applyToElement: function(cell) {
        var position = tableGetCellIndex(cell),
            table = cell.parentNode.parentNode.parentNode,
            nextCell;
        tableDeleteColumn(cell.parentNode.parentNode.parentNode, position.x);
        if (tableIsEmpty(table)) {
            table.parentNode.removeChild(table);
            return;
        }
        nextCell = tableGetCellByIndex(table, position);
        if (!nextCell && position.x > 0) {
            nextCell = tableGetCellByIndex(table, {
                x: position.x - 1,
                y: position.y
            });
        }
        selectionSelectInner(nextCell);
    }
}));
;
// File end: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/plugins/table/table-delete-column.js
;
// File start: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/plugins/table/table-delete-row.js
/**
 * @fileOverview Contains the delete column button code.
 * @license http://www.raptor-editor.com/license
 *
 * @author David Neilsen <david@panmedia.co.nz>
 * @author Michael Robinson <michael@panmedia.co.nz>
 * @author Melissa Richards <melissa@panmedia.co.nz>
 */

/**
 * Creates a table cell button to delete a row from a table.
 */
Raptor.registerUi(new TableCellButton({
    name: 'tableDeleteRow',
    applyToElement: function(cell) {
        var position = tableGetCellIndex(cell),
            table = cell.parentNode.parentNode.parentNode,
            nextCell;
        tableDeleteRow(cell.parentNode.parentNode.parentNode, position.y);
        if (tableIsEmpty(table)) {
            table.parentNode.removeChild(table);
            return;
        }
        nextCell = tableGetCellByIndex(table, position);
        if (!nextCell && position.y > 0) {
            nextCell = tableGetCellByIndex(table, {
                x: position.x,
                y: position.y - 1
            });
        }
        selectionSelectInner(nextCell);
    }
}));
;
// File end: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/plugins/table/table-delete-row.js
;
// File start: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/plugins/table/table-insert-column.js
/**
 * @fileOverview Contains the insert column button code.
 * @license http://www.raptor-editor.com/license
 *
 * @author David Neilsen <david@panmedia.co.nz>
 * @author Michael Robinson <michael@panmedia.co.nz>
 * @author Melissa Richards <melissa@panmedia.co.nz>
 */

/**
 * Creates a table cell button to insert a column into a table.
 */
Raptor.registerUi(new TableCellButton({
    name: 'tableInsertColumn',
    applyToElement: function(cell) {
        tableInsertColumn(cell.parentNode.parentNode.parentNode, tableGetCellIndex(cell).x + 1, {
            placeHolder: '&nbsp;'
        });
    }
}));
;
// File end: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/plugins/table/table-insert-column.js
;
// File start: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/plugins/table/table-insert-row.js
/**
 * @fileOverview Contains the insert row button code.
 * @license http://www.raptor-editor.com/license
 *
 * @author David Neilsen <david@panmedia.co.nz>
 * @author Michael Robinson <michael@panmedia.co.nz>
 * @author Melissa Richards <melissa@panmedia.co.nz>
 */

/**
 * Creates a table cell button to insert a row into a table.
 */
Raptor.registerUi(new TableCellButton({
    name: 'tableInsertRow',
    applyToElement: function(cell) {
        tableInsertRow(cell.parentNode.parentNode.parentNode, tableGetCellIndex(cell).y + 1, {
            placeHolder: '&nbsp;'
        });
    }
}));
;
// File end: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/plugins/table/table-insert-row.js
;
// File start: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/plugins/table/table-merge-cells.js
/**
 * @fileOverview Contains the split cell button code.
 * @license http://www.raptor-editor.com/license
 *
 * @author David Neilsen <david@panmedia.co.nz>
 * @author Michael Robinson <michael@panmedia.co.nz>
 * @author Melissa Richards <melissa@panmedia.co.nz>
 */

/**
 * Creates a button to merge the selected cells of a table.
 */
Raptor.registerUi(new Button({
    name: 'tableMergeCells',
    action: function() {
    }
}));
;
// File end: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/plugins/table/table-merge-cells.js
;
// File start: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/plugins/table/table-split-cells.js
/**
 * @fileOverview Contains the split cells button code.
 * @license http://www.raptor-editor.com/license
 *
 * @author David Neilsen <david@panmedia.co.nz>
 * @author Michael Robinson <michael@panmedia.co.nz>
 * @author Melissa Richards <melissa@panmedia.co.nz>
 */

/**
 * Creates a button to split the selected cell of a table.
 */
Raptor.registerUi(new Button({
    name: 'tableSplitCells',
    action: function() {
    }
}));
;
// File end: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/plugins/table/table-split-cells.js
;
// File start: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/plugins/table/table-support.js
/**
 * @fileOverview Contains the table helper functions.
 * @license http://www.raptor-editor.com/license
 *
 * @author David Neilsen <david@panmedia.co.nz>
 * @author Michael Robinson <michael@panmedia.co.nz>
 * @author Melissa Richards <melissa@panmedia.co.nz>
 */

var tableSupportDragging = false,
    tableSupportStartCell = null;

/**
 * The supporting table class.
 *
 * @constructor
 *
 * @augments RaptorPlugin
 *
 * @param {String} name
 * @param {Object} overrides Options hash.
 */
function TableSupport(name, overrides) {
    RaptorPlugin.call(this, name || 'tableSupport', overrides);
}

TableSupport.prototype = Object.create(RaptorPlugin.prototype);

/**
 * Initialize the table support class.
 */
TableSupport.prototype.init = function() {
    this.raptor.bind('selectionCustomise', this.selectionCustomise.bind(this));
    this.raptor.registerHotkey('tab', this.tabToNextCell.bind(this));
    this.raptor.registerHotkey('shift+tab', this.tabToPrevCell.bind(this));
    this.raptor.getElement()
        .on('mousedown', 'tbody td', this.cellMouseDown.bind(this))
        .on('mouseover', 'tbody td', this.cellMouseOver.bind(this))
        .mouseup(this.cellMouseUp.bind(this));
};

/**
 * @todo i think this has something to do with the cell selection but i'm not sure
 * @returns {Array}
 */
TableSupport.prototype.selectionCustomise = function() {
    var ranges = [],
        range;
    $('.' + this.options.baseClass + '-cell-selected').each(function() {
        range = rangy.createRange();
        range.selectNodeContents(this);
        ranges.push(range);
    });
    return ranges;
};

/**
 * Event handler for mouse down.
 *
 * @param event The mouse event to trigger the function.
 */
TableSupport.prototype.cellMouseDown = function(event) {
    if (this.raptor.isEditing()) {
        tableSupportStartCell = tableGetCellIndex(event.target);
        if (tableSupportStartCell !== null) {
            tableSupportDragging = true;
            $(event.target).closest('table').addClass(this.options.baseClass + '-selected');
        }
    }
};

/**
 * Event handler for mouse up.
 *
 * @param event The mouse event to trigger the function.
 */
TableSupport.prototype.cellMouseUp = function(event) {
    tableSupportDragging = false;
    var cell = $(event.target).closest('td'),
        deselect = false;
    if (cell.length > 0 && tableSupportStartCell !== null) {
        var index = tableGetCellIndex(cell.get(0));
        if (index === null ||
                (index.x == tableSupportStartCell.x &&
                index.y == tableSupportStartCell.y)) {
            deselect = true;
        }
    } else {
        deselect = true;
    }
    if (deselect) {
        $('.' + this.options.baseClass + '-selected').removeClass(this.options.baseClass + '-selected');
        $('.' + this.options.baseClass + '-cell-selected').removeClass(this.options.baseClass + '-cell-selected');
    }
};

/**
 * Event handler for mouse hover.
 *
 * @param event The mouse event to trigger the function.
 */
TableSupport.prototype.cellMouseOver = function(event) {
    if (tableSupportDragging) {
        var cells = tableCellsInRange($(event.target).closest('table').get(0), tableSupportStartCell, tableGetCellIndex(event.target));
        $('.' + this.options.baseClass + '-cell-selected').removeClass(this.options.baseClass + '-cell-selected');
        $(cells).addClass(this.options.baseClass + '-cell-selected');
        rangy.getSelection().removeAllRanges();
    }
};

/**
 * Handles tabbing to the next table cell.
 */
TableSupport.prototype.tabToNextCell = function() {
    var range = rangy.getSelection().getRangeAt(0),
        parent = rangeGetCommonAncestor(range),
        cell = $(parent).closest('td');
    if (cell.length === 0) {
        return false;
    }
    var next = cell.next('td');
    if (next.length === 0) {
        next = cell.closest('tr').next('tr').find('td:first');
        if (next.length === 0) {
            next = cell.closest('tbody').find('td:first');
        }
    }
    rangeSelectElementContent(range, next);
    rangy.getSelection().setSingleRange(range);
};

/**
 * Handles tabbing to the next table cell.
 */
TableSupport.prototype.tabToPrevCell = function() {
    var range = rangy.getSelection().getRangeAt(0),
        parent = rangeGetCommonAncestor(range),
        cell = $(parent).closest('td');
    if (cell.length === 0) {
        return false;
    }
    var prev = cell.prev('td');
    if (prev.length === 0) {
        prev = cell.closest('tr').prev('tr').find('td:last');
        if (prev.length === 0) {
            prev = cell.closest('tbody').find('td:last');
        }
    }
    rangeSelectElementContent(range, prev);
    rangy.getSelection().setSingleRange(range);
};

Raptor.registerPlugin(new TableSupport());
;
// File end: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/plugins/table/table-support.js
;
// File start: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/plugins/tag-menu/tag-menu.js
/**
 * @fileOverview Contains the left align button code.
 * @license http://www.raptor-editor.com/license
 *
 * @author David Neilsen <david@panmedia.co.nz>
 * @author Michael Robinson <michael@panmedia.co.nz>
 * @author Melissa Richards <melissa@panmedia.co.nz>
 */

/**
 * The tag menu class.
 *
 * @constructor
 * @augments SelectMenu
 *
 * @param {Object} options Options hash.
 */
function TagMenu(options) {
    SelectMenu.call(this, {
        name: 'tagMenu'
    });
}

TagMenu.prototype = Object.create(SelectMenu.prototype);

/**
 * Initializes the tag menu.
 */
TagMenu.prototype.init = function() {
    this.raptor.bind('selectionChange', this.updateButton.bind(this));
    return SelectMenu.prototype.init.apply(this, arguments);
};

/**
 * Changes the tags on the selected element(s).
 *
 * @param {HTML} tag The new tag.
 */
TagMenu.prototype.changeTag = function(tag) {
    // Prevent injection of illegal tags
    if (typeof tag === 'undefined' || tag === 'na') {
        return;
    }

    var selectedElement = selectionGetElement(),
        limitElement = this.raptor.getElement();
    if (selectedElement && !selectedElement.is(limitElement)) {
        var cell = selectedElement.closest('td, li, #' + limitElement.attr('id'));
        if (cell.length !== 0) {
            limitElement = cell;
        }
    }
    
    selectionChangeTags(tag, [
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'p', 'div', 'pre', 'address'
    ], limitElement);
};

/**
 * Applies the tag change.
 *
 * @param event The mouse event to trigger the function.
 */
TagMenu.prototype.menuItemClick = function(event) {
    SelectMenu.prototype.menuItemClick.apply(this, arguments);
    this.raptor.actionApply(function() {
        this.changeTag($(event.currentTarget).data('value'));
    }.bind(this));
};

/**
 * Generates a preview state for a change of tag.
 *
 * @param event The mouse event to trigger the preview.
 */
TagMenu.prototype.menuItemMouseEnter = function(event) {
    this.raptor.actionPreview(function() {
        this.changeTag($(event.currentTarget).data('value'));
    }.bind(this));
};

/**
 * Restores the tag menu from it's preview state.
 *
 * @param event The mouse event to trigger the restoration of the tag menu.
 */
TagMenu.prototype.menuItemMouseLeave = function(event) {
    this.raptor.actionPreviewRestore();
};

/**
 * Updates the display of the tag menu button.
 */
TagMenu.prototype.updateButton = function() {
    var tag = selectionGetElements()[0],
        button = this.getButton().getButton();
    if (!tag) {
        return;
    }
    var tagName = tag.tagName.toLowerCase(),
        option = this.getMenu().find('[data-value=' + tagName + ']');
    if (option.length) {
        aButtonSetLabel(button, option.html());
    } else {
        aButtonSetLabel(button, tr('tagMenuTagNA'));
    }
//    if (this.raptor.getElement()[0] === tag) {
//        aButtonDisable(button);
//    } else {
//        aButtonEnable(button);
//    }
};

/**
 * Prepares and returns the menu items for use in the raptor UI.
 * @returns {Element}
 */
TagMenu.prototype.getMenuItems = function() {
    return this.raptor.getTemplate('tag-menu.menu', this.options);
};

Raptor.registerUi(new TagMenu());
;
// File end: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/plugins/tag-menu/tag-menu.js
;
// File start: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/plugins/text-align/text-align-button.js
/**
 * @fileOverview Contains the text align button class code.
 * @license http://www.raptor-editor.com/license
 *
 * @author David Neilsen <david@panmedia.co.nz>
 * @author Michael Robinson <michael@panmedia.co.nz>
 * @author Melissa Richards <melissa@panmedia.co.nz>
 */

/**
 * The text align button class.
 *
 * @constructor
 * @augments PreviewToggleButton
 *
 * @param {Object} options Options hash.
 */
function TextAlignButton(options) {
    PreviewToggleButton.call(this, options);
}

TextAlignButton.prototype = Object.create(PreviewToggleButton.prototype);

TextAlignButton.prototype.action = function() {
    selectionToggleBlockClasses([
        this.getClass()
    ], [
        this.options.cssPrefix + 'center',
        this.options.cssPrefix + 'left',
        this.options.cssPrefix + 'right',
        this.options.cssPrefix + 'justify'
    ], this.raptor.getElement(), 'span');
    this.selectionChange();
};

TextAlignButton.prototype.selectionToggle = function() {
    return rangy.getSelection().getAllRanges().length > 0 &&
        selectionContains('.' + this.getClass(), this.raptor.getElement());
};;
// File end: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/plugins/text-align/text-align-button.js
;
// File start: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/plugins/text-align/center.js
/**
 * @fileOverview Contains the center align button code.
 * @license http://www.raptor-editor.com/license
 *
 * @author David Neilsen <david@panmedia.co.nz>
 * @author Michael Robinson <michael@panmedia.co.nz>
 * @author Melissa Richards <melissa@panmedia.co.nz>
 */

/**
 * Creates a text align button to align text center.
 */
Raptor.registerUi(new TextAlignButton({
    name: 'alignCenter',
    getClass: function() {
        return this.options.cssPrefix + 'center';
    }
}));
;
// File end: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/plugins/text-align/center.js
;
// File start: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/plugins/text-align/justify.js
/**
 * @fileOverview Contains the justify text button code.
 * @license http://www.raptor-editor.com/license
 *
 * @author David Neilsen <david@panmedia.co.nz>
 * @author Michael Robinson <michael@panmedia.co.nz>
 * @author Melissa Richards <melissa@panmedia.co.nz>
 */

/**
 * Creates a text align button to justify text.
 */
Raptor.registerUi(new TextAlignButton({
    name: 'alignJustify',
    getClass: function() {
        return this.options.cssPrefix + 'justify';
    }
}));
;
// File end: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/plugins/text-align/justify.js
;
// File start: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/plugins/text-align/left.js
/**
 * @fileOverview Contains the left align button code.
 * @license http://www.raptor-editor.com/license
 *
 * @author David Neilsen <david@panmedia.co.nz>
 * @author Michael Robinson <michael@panmedia.co.nz>
 * @author Melissa Richards <melissa@panmedia.co.nz>
 */

/**
 * Creates a text align button to align text left.
 */
Raptor.registerUi(new TextAlignButton({
    name: 'alignLeft',
    getClass: function() {
        return this.options.cssPrefix + 'left';
    }
}));
;
// File end: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/plugins/text-align/left.js
;
// File start: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/plugins/text-align/right.js
/**
 * @fileOverview Contains the right align button code.
 * @license http://www.raptor-editor.com/license
 *
 * @author David Neilsen <david@panmedia.co.nz>
 * @author Michael Robinson <michael@panmedia.co.nz>
 * @author Melissa Richards <melissa@panmedia.co.nz>
 */

/**
 * Creates a text align button to align text right.
 */
Raptor.registerUi(new TextAlignButton({
    name: 'alignRight',
    getClass: function() {
        return this.options.cssPrefix + 'right';
    }
}));
;
// File end: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/plugins/text-align/right.js
;
// File start: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/plugins/text-style/bold.js
/**
 * @fileOverview Contains the bold button code.
 * @license http://www.raptor-editor.com/license
 *
 * @author David Neilsen <david@panmedia.co.nz>
 * @author Michael Robinson <michael@panmedia.co.nz>
 * @author Melissa Richards <melissa@panmedia.co.nz>
 */

/**
 * Creates an instance of the CSS applier button to apply the bold class to a selection.
 */
Raptor.registerUi(new CSSClassApplierButton({
    name: 'textBold',
    hotkey: 'ctrl+b',
    tag: 'strong',
    classes: ['bold']
}));
;
// File end: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/plugins/text-style/bold.js
;
// File start: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/plugins/text-style/italic.js
/**
 * @fileOverview Contains the italic button code.
 * @license http://www.raptor-editor.com/license
 *
 * @author David Neilsen <david@panmedia.co.nz>
 * @author Michael Robinson <michael@panmedia.co.nz>
 * @author Melissa Richards <melissa@panmedia.co.nz>
 */

/**
 * Creates an instance of the CSS applier button to apply the italic class to a
 * selection.
 */
Raptor.registerUi(new CSSClassApplierButton({
    name: 'textItalic',
    hotkey: 'ctrl+i',
    tag: 'em',
    classes: ['italic']
}));
;
// File end: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/plugins/text-style/italic.js
;
// File start: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/plugins/text-style/strike.js
/**
 * @fileOverview Contains the strike button code.
 * @license http://www.raptor-editor.com/license
 *
 * @author David Neilsen <david@panmedia.co.nz>
 * @author Michael Robinson <michael@panmedia.co.nz>
 * @author Melissa Richards <melissa@panmedia.co.nz>
 */

/**
 * Creates an instance of the CSS applier button to apply the strike class to a
 * selection.
 */
Raptor.registerUi(new CSSClassApplierButton({
    name: 'textStrike',
    tag: 'del',
    classes: ['strike']
}));
;
// File end: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/plugins/text-style/strike.js
;
// File start: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/plugins/text-style/block-quote.js
/**
 * @fileOverview Contains the block quote button code.
 * @license http://www.raptor-editor.com/license
 *
 * @author David Neilsen <david@panmedia.co.nz>
 * @author Michael Robinson <michael@panmedia.co.nz>
 * @author Melissa Richards <melissa@panmedia.co.nz>
 */

/**
 * Creates an instance of the preview toggle button to insert a block quote.
 */
Raptor.registerUi(new PreviewToggleButton({
    name: 'textBlockQuote',
    init: function() {
        var result = PreviewToggleButton.prototype.init.apply(this, arguments);
        if (elementIsValid(this.raptor.getElement(), listValidBlockQuoteParents)) {
            return result;
        }
        return;
    },
    action: function() {
        listToggle('blockquote', 'p', this.raptor.getElement());
    },
    selectionToggle: function() {
        return rangy.getSelection().getAllRanges().length > 0 &&
            selectionContains('blockquote', this.raptor.getElement());
    }
}));
;
// File end: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/plugins/text-style/block-quote.js
;
// File start: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/plugins/text-style/size-decrease.js
/**
 * @fileOverview Contains the text size decrease button code.
 * @license http://www.raptor-editor.com/license
 *
 * @author David Neilsen <david@panmedia.co.nz>
 * @author Michael Robinson <michael@panmedia.co.nz>
 * @author Melissa Richards <melissa@panmedia.co.nz>
 */

/**
 * Creates an instance of the preview button to apply the text size decrease
 * class to a selection.
 */
Raptor.registerUi(new PreviewButton({
    name: 'textSizeDecrease',
    action: function() {
        selectionExpandToWord();
        this.raptor.selectionConstrain();
        selectionInverseWrapWithTagClass('small', this.options.cssPrefix + 'small', 'big', this.options.cssPrefix + 'big');
        this.raptor.getElement().find('small.' + this.options.cssPrefix + 'small:empty, big.' + this.options.cssPrefix + 'big:empty').remove();
    }
}));
;
// File end: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/plugins/text-style/size-decrease.js
;
// File start: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/plugins/text-style/size-increase.js
/**
 * @fileOverview Contains the text size increase button code.
 * @license http://www.raptor-editor.com/license
 *
 * @author David Neilsen <david@panmedia.co.nz>
 * @author Michael Robinson <michael@panmedia.co.nz>
 * @author Melissa Richards <melissa@panmedia.co.nz>
 */

/**
 * Creates an instance of the preview button to apply the text size increase
 * class to a selection.
 */
Raptor.registerUi(new PreviewButton({
    name: 'textSizeIncrease',
    action: function() {
        selectionExpandToWord();
        this.raptor.selectionConstrain();
        selectionInverseWrapWithTagClass('big', this.options.cssPrefix + 'big', 'small', this.options.cssPrefix + 'small');
        this.raptor.getElement().find('small.' + this.options.cssPrefix + 'small:empty, big.' + this.options.cssPrefix + 'big:empty').remove();
    }
}));
;
// File end: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/plugins/text-style/size-increase.js
;
// File start: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/plugins/text-style/underline.js
/**
 * @fileOverview Contains the underline button code.
 * @license http://www.raptor-editor.com/license
 *
 * @author David Neilsen <david@panmedia.co.nz>
 * @author Michael Robinson <michael@panmedia.co.nz>
 * @author Melissa Richards <melissa@panmedia.co.nz>
 */

/**
 * Creates an instance of the CSS applier button to apply the underline class to a selection.
 */
Raptor.registerUi(new CSSClassApplierButton({
    name: 'textUnderline',
    hotkey: 'ctrl+u',
    tag: 'u',
    classes: ['underline']
}));
;
// File end: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/plugins/text-style/underline.js
;
// File start: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/plugins/text-style/sub.js
/**
 * @fileOverview Contains the subscript button code.
 * @license http://www.raptor-editor.com/license
 *
 * @author David Neilsen <david@panmedia.co.nz>
 * @author Michael Robinson <michael@panmedia.co.nz>
 * @author Melissa Richards <melissa@panmedia.co.nz>
 */

/**
 * Creates an instance of the CSS applier button to apply the subscript class to
 * a selection.
 */
Raptor.registerUi(new CSSClassApplierButton({
    name: 'textSub',
    tag: 'sub',
    classes: ['sub']
}));
;
// File end: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/plugins/text-style/sub.js
;
// File start: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/plugins/text-style/super.js
/**
 * @fileOverview Contains the superscript button code.
 * @license http://www.raptor-editor.com/license
 *
 * @author David Neilsen <david@panmedia.co.nz>
 * @author Michael Robinson <michael@panmedia.co.nz>
 * @author Melissa Richards <melissa@panmedia.co.nz>
 */

/**
 * Creates an instance of the CSS applier button to apply the superscript class
 * to a selection.
 */
Raptor.registerUi(new CSSClassApplierButton({
    name: 'textSuper',
    tag: 'sup',
    classes: ['sup']
}));
;
// File end: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/plugins/text-style/super.js
;
// File start: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/plugins/tool-tip/tool-tip.js
/**
 * @fileOverview Stylised tooltip plugin.
 * @license http://www.raptor-editor.com/license
 *
 * @author David Neilsen david@panmedia.co.nz
 */
function ToolTipPlugin(name, overrides) {
    RaptorPlugin.call(this, name || 'toolTip', overrides);
}

ToolTipPlugin.prototype = Object.create(RaptorPlugin.prototype);

ToolTipPlugin.prototype.init = function() {
    this.raptor.bind('layoutReady', function(node) {
        $(node)
            .on('mouseover', '[title]', function(event) {
                $(this)
                    .attr('data-title', $(this).attr('title'))
                    .removeAttr('title');
            });
    });
};

Raptor.registerPlugin(new ToolTipPlugin());
;
// File end: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/plugins/tool-tip/tool-tip.js
;
// File start: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/plugins/unsaved-edit-warning/unsaved-edit-warning.js
/**
 * @fileOverview Contains the unsaved edit warning plugin class code.
 * @license http://www.raptor-editor.com/license
 *
 * @author David Neilsen <david@panmedia.co.nz>
 * @author Michael Robinson <michael@panmedia.co.nz>
 * @author Melissa Richards <melissa@panmedia.co.nz>
 */

var unsavedEditWarningDirty = 0,
    unsavedEditWarningElement = null;

/**
 * The unsaved edit warning plugin.
 *
 * @constructor
 * @augments RaptorPlugin
 *
 * @param {String} name
 * @param {Object} overrides Options hash.
 */
function UnsavedEditWarningPlugin(name, overrides) {
    RaptorPlugin.call(this, name || 'unsavedEditWarning', overrides);
}

UnsavedEditWarningPlugin.prototype = Object.create(RaptorPlugin.prototype);

/**
 * Enables the unsaved edit warning plugin.
 *
 * @todo raptor details
 * @param {type} raptor
 */
UnsavedEditWarningPlugin.prototype.enable = function(raptor) {
    this.raptor.bind('dirty', this.show.bind(this));
    this.raptor.bind('cleaned', this.hide.bind(this));
};

/**
 * Shows the unsaved edit warning.
 */
UnsavedEditWarningPlugin.prototype.show = function() {
    unsavedEditWarningDirty++;
    elementBringToTop(this.getElement());
    this.getElement().addClass(this.options.baseClass + '-visible');
};

/**
 * Hides the unsaved edit warning.
 *
 * @param event The mouse event that triggers the function.
 */
UnsavedEditWarningPlugin.prototype.hide = function(event) {
    if (--unsavedEditWarningDirty === 0) {
        this.getElement().removeClass(this.options.baseClass + '-visible');
    }
};

/**
 * Prepares and returns the unsaved edit warning element for use in the Raptor UI.
 *
 * @todo instance details
 * @param {type} instance
 * @returns {Element}
 */
UnsavedEditWarningPlugin.prototype.getElement = function() {
    if (!unsavedEditWarningElement) {
        var dirtyClass = 'raptor-plugin-unsaved-edit-warning-dirty';
        unsavedEditWarningElement = $(this.raptor.getTemplate('unsaved-edit-warning.warning', this.options))
            .mouseenter(function() {
                Raptor.eachInstance(function(raptor) {
                    if (raptor.isDirty()) {
                        raptor.getElement().addClass(dirtyClass);
                    }
                });
            })
            .mouseleave(function() {
                $('.' + dirtyClass).removeClass(dirtyClass);            })
            .appendTo('body');
    }
    return unsavedEditWarningElement;
};

Raptor.registerPlugin(new UnsavedEditWarningPlugin());
;
// File end: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/plugins/unsaved-edit-warning/unsaved-edit-warning.js
;
// File start: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/plugins/view-source/view-source.js
/**
 * @fileOverview Contains the view source dialog code.
 * @license http://www.raptor-editor.com/license
 *
 * @author David Neilsen <david@panmedia.co.nz>
 * @author Michael Robinson <michael@panmedia.co.nz>
 * @author Melissa Richards <melissa@panmedia.co.nz>
 */

/**
 * Creates an instance of the dialog button to open the view source dialog.
 */
Raptor.registerUi(new DialogButton({
    name: 'viewSource',
    dialogOptions: {
        width: 600,
        height: 400
    },

    /**
     * Replace the editing element's content with the HTML from the dialog's textarea
     *
     * @param  {Element} dialog
     */
    applyAction: function(dialog) {
        var html = dialog.find('textarea').val();
        this.raptor.actionApply(function() {
            this.raptor.setHtml(html);
            selectionSelectStart(this.raptor.getElement().first());
            this.raptor.checkSelectionChange();
        }.bind(this));
    },

    /**
     * Update the dialog's text area with the current HTML.
     */
    openDialog: function() {
        var textarea = this.getDialog().find('textarea');
        textarea.val(this.raptor.getHtml());
        DialogButton.prototype.openDialog.call(this);
        textarea.select();
    },

    /**
     * @return {Element}
     */
    getDialogTemplate: function() {
        return $('<div>').html(this.raptor.getTemplate('view-source.dialog', this.options));
    }
}));
;
// File end: /var/deployments/www.raptor-editor.com.3/raptor-gold/raptor-editor/src/plugins/view-source/view-source.js
})();