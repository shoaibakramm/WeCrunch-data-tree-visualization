import * as XLSX from 'xlsx';




/**
 * @param {File} file 
 * @returns {Promise<import('./parseContract').ParsedRow[]>}
 */
export function parseExcel(file) {
  return new Promise((resolve, reject) => {

    if (!file || !(file instanceof File)) 
    {

      reject(new Error('excelParser: received no file or invalid input.'));

      return;

    }

    const extension = file.name.split('.').pop().toLowerCase();

    if (extension !== 'xlsx' && extension !== 'xls') 
    {

      reject(new Error(`excelParser: expected a .xlsx or .xls file but got .${extension}`));

      return;
    
    }

    const reader = new FileReader();

    reader.onload = (event) => {

      try {

        const arrayBuffer = event.target.result;

        const workbook = XLSX.read(arrayBuffer, {

          type: 'array',

          raw: false,

          cellDates: false,

        });

        const firstSheetName = workbook.SheetNames[0];

        if (!firstSheetName) 
        {

          reject(new Error('excelParser: workbook has no sheets.'));

          return;
        
        }

        const worksheet = workbook.Sheets[firstSheetName];


        const rawRows = XLSX.utils.sheet_to_json(worksheet, {

          header: 1,

          defval: '',

          raw: false,
          
        });


        if (!rawRows || rawRows.length === 0) 
        {

          resolve([]);

          return;

        }

        const headers = rawRows[0].map((h) => {

          if (h === null || h === undefined) 
          {
            return '';
          }

          return String(h).trim();
        
        });


        const validHeaderIndices = headers.map((h, i) => (h !== '' ? i : null)).filter((i) => i !== null);

        const result = rawRows.slice(1).map((row) => {

          const obj = {};
          
          validHeaderIndices.forEach((colIndex) => {

            const key = headers[colIndex];

            const rawValue = row[colIndex];

            obj[key] = rawValue === null || rawValue === undefined ? '' : String(rawValue).trim();

          });

          return obj;

        });


        const filteredResult = result.filter((row) => Object.values(row).some((val) => val !== '') );

        resolve(filteredResult);

      } catch (error) {

        reject(new Error( `excelParser: failed to parse workbook — ${error.message}`));

      }
    };

    reader.onerror = () => { 
      reject(new Error('excelParser: FileReader failed to read the file.' )); 
    };


    reader.readAsArrayBuffer(file);
  });
}