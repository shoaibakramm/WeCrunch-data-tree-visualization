import { parseCSV } from './csvParser';
import { parseExcel } from './excelParser';

/**
 * Unified file parser dispatcher.
 * Accepts any File object, detects its type by extension,
 * and routes to the correct parser.
 *
 * Always returns Promise<ParsedRow[]> — the caller never needs
 * to know or care whether the file was CSV or Excel.
 *
 * Supported extensions:
 * - .csv  → csvParser
 * - .xlsx → excelParser
 * - .xls  → excelParser
 *
 * @param {File} file - A File object from a file input element
 * @returns {Promise<import('./parseContract').ParsedRow[]>}
 */
export function parseFile(file) {

  // Guard: make sure we received something
  if (!file || !(file instanceof File)) {
    return Promise.reject(
      new Error('parseFile: received no file or invalid input.')
    );
  }

  // Detect extension
  const extension = file.name.split('.').pop().toLowerCase();

  // Route to the correct parser based on extension
  switch (extension) {
    case 'csv':
      return parseCSV(file);

    case 'xlsx':
    case 'xls':
      return parseExcel(file);

    default:
      return Promise.reject(
        new Error(
          `parseFile: unsupported file type ".${extension}". ` +
          `Please upload a .csv, .xlsx, or .xls file.`
        )
      );
  }
}

/**
 * Helper: returns true if the given file's extension is supported.
 * Useful for validating before even attempting to parse,
 * e.g. to show an error immediately when the wrong file type is selected.
 *
 * @param {File} file
 * @returns {boolean}
 */
export function isSupportedFile(file) {
  if (!file || !(file instanceof File)) return false;
  const extension = file.name.split('.').pop().toLowerCase();
  return ['csv', 'xlsx', 'xls'].includes(extension);
}

/**
 * Helper: returns a human-readable label for the file type.
 * Useful for displaying in the UI.
 *
 * @param {File} file
 * @returns {string}
 */
export function getFileTypeLabel(file) {
  if (!file || !(file instanceof File)) return 'Unknown';
  const extension = file.name.split('.').pop().toLowerCase();
  switch (extension) {
    case 'csv':  return 'CSV';
    case 'xlsx': return 'Excel (xlsx)';
    case 'xls':  return 'Excel (xls)';
    default:     return `Unsupported (.${extension})`;
  }
}