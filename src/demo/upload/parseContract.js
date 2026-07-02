/**
 * @typedef {Object} ParsedRow
 * @property {string} [key] - Each column header from the file becomes a key.
 *                            All values are strings. Empty cells are "".
 */

/**
 * Every parser in this folder must return this shape:
 *
 * Promise<ParsedRow[]>
 *
 * Rules:
 * 1. Headers are taken from row 1 of the file.
 * 2. All values are strings — no type conversion at parse time.
 * 3. Result is always a flat array — one object per row, no nesting.
 * 4. Empty cells are empty string "", never null or undefined.
 * 5. The parser must never throw — it must return a rejected Promise on error.
 */

