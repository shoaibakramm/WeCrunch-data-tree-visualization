import Papa from 'papaparse';

/**
 * Parses a CSV File object into an array of row objects.
 * 
 * @param {File} file - A File object from a file input element
 * @returns {Promise<import('./parseContract').ParsedRow[]>}
 */
export function parseCSV(file) {
  return new Promise((resolve, reject) => {

    // Guard: make sure we actually received a File object
    if (!file || !(file instanceof File)) {
      reject(new Error('csvParser: received no file or invalid input.'));
      return;
    }

    // Guard: make sure the file has a .csv extension
    const extension = file.name.split('.').pop().toLowerCase();
    if (extension !== 'csv') {
      reject(new Error(`csvParser: expected a .csv file but got .${extension}`));
      return;
    }

    if (file.size === 0) {
        console.log('File size is 0, resolving empty')
        resolve([]);
        return;
    }

    Papa.parse(file, {
      // header: true tells PapaParse to use row 1 as keys
      header: true,

      // skipEmptyLines: true drops any completely blank rows
      skipEmptyLines: true,

      // dynamicTyping: false is critical — keeps all values as strings
      // so we honor the contract rule: no type conversion at parse time
      dynamicTyping: false,

      // transformHeader: clean up any accidental whitespace in header names
      // e.g. " name " becomes "name"
      transformHeader: (header) => header.trim(),

      // transform: called on every single cell value
      // trims whitespace and converts null/undefined to ""
      transform: (value) => {
        if (value === null || value === undefined) return '';
        return String(value).trim();
      },

        complete: (results) => {
          if (results.errors && results.errors.length > 0) {
            const criticalErrors = results.errors.filter(
              (e) => e.type === 'Quotes' || e.type === 'Delimiter'
            );
            if (criticalErrors.length > 0) {
              reject(new Error(
                `csvParser: critical parse error — ${criticalErrors[0].message}`
              ));
              return;
            }
            console.warn('csvParser: non-critical parse warnings:', results.errors);
          }
      
          // Normalize all rows against detected headers
          const headers = results.meta.fields || [];
      
          const normalized = results.data.map((row) => {
            const cleanRow = {};
            headers.forEach((header) => {
              cleanRow[header] = row[header] !== undefined && row[header] !== null
                ? String(row[header]).trim()
                : '';
            });
            return cleanRow;
          });
      
          resolve(normalized);
        },

      error: (error) => {
        // PapaParse fires this if it can't read the file at all
        reject(new Error(`csvParser: failed to read file — ${error.message}`));
      },
    });
  });
}