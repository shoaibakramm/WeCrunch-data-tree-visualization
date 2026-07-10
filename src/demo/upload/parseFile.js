import { parseCSV } from './csvParser';
import { parseExcel } from './excelParser';





/**
 * @param {File} file 
 * @returns {Promise<import('./parseContract').ParsedRow[]>}
 */
export function parseFile(file) {



  if (!file || !(file instanceof File)) 
  {
    return Promise.reject(new Error('parseFile: received no file or invalid input.'));
  }



  const extension = file.name.split('.').pop().toLowerCase();

  switch (extension) 
  {

    case 'csv': return parseCSV(file);

    case 'xlsx':
    case 'xls':
      return parseExcel(file);

    default:
      return Promise.reject( new Error( `parseFile: unsupported file type ".${extension}". ` + `Please upload a .csv, .xlsx, or .xls file.`));
  }
}






/**
 * @param {File} file
 * @returns {boolean}
 */
export function isSupportedFile(file) {

  if (!file || !(file instanceof File))
  {

    return false;

  }

  const extension = file.name.split('.').pop().toLowerCase();

  return ['csv', 'xlsx', 'xls'].includes(extension);

}














/**
 * @param {File} file
 * @returns {string}
 */
export function getFileTypeLabel(file) {

  if (!file || !(file instanceof File)) 
  {
    return 'Unknown';
  }
    
  const extension = file.name.split('.').pop().toLowerCase();

  switch (extension) 
  {


    case 'csv':  return 'CSV';
    case 'xlsx': return 'Excel (xlsx)';
    case 'xls':  return 'Excel (xls)';
    default:     return `Unsupported (.${extension})`;


  }
}