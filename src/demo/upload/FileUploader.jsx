import { useState } from 'react';
import { parseFile, isSupportedFile, getFileTypeLabel } from './parseFile';

/**
 * FileUploader component
 * 
 * Props:
 * - onDataParsed(rows) — called with the parsed array of row objects
 *                        when parsing succeeds
 * - onError(errorMessage) — called with an error string if anything fails
 */
function FileUploader({ onDataParsed, onError }) {
  // Track the current status to show feedback in the UI
  const [status, setStatus] = useState('idle');
  // idle | validating | parsing | done | error

  const [statusMessage, setStatusMessage] = useState('');
  const [fileName, setFileName] = useState('');

  function handleFileChange(event) {
    const file = event.target.files[0];

    // If user cancels the file dialog, event.target.files[0] is undefined
    if (!file) {
      return;
    }

    setFileName(file.name);

    // Step 1: validate the file type before attempting to parse
    setStatus('validating');
    setStatusMessage(`Validating ${file.name}...`);

    if (!isSupportedFile(file)) {
      const errorMsg = (
        `Unsupported file type: "${file.name}". ` +
        `Please upload a .csv, .xlsx, or .xls file.`
      );
      setStatus('error');
      setStatusMessage(errorMsg);
      if (onError) onError(errorMsg);
      return;
    }

    // Step 2: file type is valid — start parsing
    const fileTypeLabel = getFileTypeLabel(file);
    setStatus('parsing');
    setStatusMessage(`Parsing ${fileTypeLabel} file...`);

    parseFile(file)
      .then((rows) => {
        // Parsing succeeded
        setStatus('done');
        setStatusMessage(
          `Done. Parsed ${rows.length} rows from "${file.name}".`
        );
        // Emit the result upward to the parent
        if (onDataParsed) onDataParsed(rows);
      })
      .catch((error) => {
        // Parsing failed
        setStatus('error');
        setStatusMessage(`Error: ${error.message}`);
        if (onError) onError(error.message);
      });
  }

  return (
    <div className="file-uploader">
      <label className="file-uploader__label">
        Upload a CSV or Excel file
      </label>

      <input
        className="file-uploader__input"
        type="file"
        accept=".csv,.xlsx,.xls"
        onChange={handleFileChange}
      />

      {/* Status feedback area — only shows after a file is selected */}
      {status !== 'idle' && (
        <div className={`file-uploader__status file-uploader__status--${status}`}>
          {/* Spinner for in-progress states */}
          {(status === 'validating' || status === 'parsing') && (
            <span className="file-uploader__spinner">⏳ </span>
          )}

          {/* Checkmark for success */}
          {status === 'done' && (
            <span className="file-uploader__icon">✅ </span>
          )}

          {/* Error icon */}
          {status === 'error' && (
            <span className="file-uploader__icon">❌ </span>
          )}

          {statusMessage}
        </div>
      )}
    </div>
  );
}

export default FileUploader;