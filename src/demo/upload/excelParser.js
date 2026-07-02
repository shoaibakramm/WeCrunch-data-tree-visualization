import * as XLSX from 'xlsx';

/**
 * Parses an Excel File object (.xlsx or .xls) into an array of row objects.
 *
 * @param {File} file - A File object from a file input element
 * @returns {Promise<import('./parseContract').ParsedRow[]>}
 */
export function parseExcel(file) {
  return new Promise((resolve, reject) => {

    // Guard: make sure we actually received a File object
    if (!file || !(file instanceof File)) {
      reject(new Error('excelParser: received no file or invalid input.'));
      return;
    }

    // Guard: make sure the file has a .xlsx or .xls extension
    const extension = file.name.split('.').pop().toLowerCase();
    if (extension !== 'xlsx' && extension !== 'xls') {
      reject(new Error(
        `excelParser: expected a .xlsx or .xls file but got .${extension}`
      ));
      return;
    }

    // SheetJS does not natively accept a File object like PapaParse does.
    // We need to read the file into an ArrayBuffer first using FileReader,
    // then hand that binary data to SheetJS.
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const arrayBuffer = event.target.result;

        // XLSX.read() takes the binary data and returns a "workbook" object
        // which contains all sheets in the file
        const workbook = XLSX.read(arrayBuffer, {
          type: 'array',

          // raw: false tells SheetJS to format dates and numbers as strings
          // rather than raw numeric values — keeps us consistent with our contract
          raw: false,

          // cellDates: false — we want dates as formatted strings not JS Date objects
          cellDates: false,
        });

        // A workbook can have multiple sheets — we always take the first one.
        // For this assignment files will be single-sheet, but this is defensive.
        const firstSheetName = workbook.SheetNames[0];

        if (!firstSheetName) {
          reject(new Error('excelParser: workbook has no sheets.'));
          return;
        }

        const worksheet = workbook.Sheets[firstSheetName];

        // sheet_to_json with header: 1 gives us a raw array of arrays first
        // so we can manually handle headers ourselves — more control than
        // letting SheetJS auto-detect them
        const rawRows = XLSX.utils.sheet_to_json(worksheet, {
          // header: 1 returns array of arrays — row 0 is headers, rest are data
          header: 1,

          // defval: "" means empty cells come back as "" not undefined
          defval: '',

          // raw: false formats everything as strings
          raw: false,
        });

        // rawRows[0] is the header row
        // rawRows[1..n] are the data rows
        if (!rawRows || rawRows.length === 0) {
          resolve([]);
          return;
        }

        // Extract and clean header names from row 0
        const headers = rawRows[0].map((h) => {
          if (h === null || h === undefined) return '';
          return String(h).trim();
        });

        // Filter out completely empty header columns
        // (sometimes Excel files have phantom columns at the end)
        const validHeaderIndices = headers
          .map((h, i) => (h !== '' ? i : null))
          .filter((i) => i !== null);

        // Build the array of row objects — skip row 0 (that was headers)
        const result = rawRows.slice(1).map((row) => {
          const obj = {};
          validHeaderIndices.forEach((colIndex) => {
            const key = headers[colIndex];
            const rawValue = row[colIndex];
            // Normalize to string, empty cells to ""
            obj[key] = rawValue === null || rawValue === undefined
              ? ''
              : String(rawValue).trim();
          });
          return obj;
        });

        // Filter out completely empty rows
        // (rows where every single value is "")
        const filteredResult = result.filter((row) =>
          Object.values(row).some((val) => val !== '')
        );

        resolve(filteredResult);

      } catch (error) {
        // SheetJS can throw on seriously malformed files — catch and reject
        reject(new Error(
          `excelParser: failed to parse workbook — ${error.message}`
        ));
      }
    };

    reader.onerror = () => {
      reject(new Error(
        'excelParser: FileReader failed to read the file.'
      ));
    };

    // Trigger the read — this is what kicks off reader.onload above
    reader.readAsArrayBuffer(file);
  });
}