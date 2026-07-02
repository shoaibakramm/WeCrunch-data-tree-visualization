import { useState } from 'react'
import './App.css'
import FileUploader from './demo/upload/FileUploader'

function App() {
  // This will hold the parsed rows once FileUploader succeeds
  const [parsedData, setParsedData] = useState(null)
  const [parseError, setParseError] = useState(null)

  function handleDataParsed(rows) {
    setParseError(null)
    setParsedData(rows)
    // Temporary: log to console so we can inspect the shape
    console.log('Parsed rows:', rows)
    console.log('Total rows:', rows.length)
    console.log('First row:', rows[0])
    console.log('Column headers:', rows[0] ? Object.keys(rows[0]) : [])
  }

  function handleError(errorMessage) {
    setParsedData(null)
    setParseError(errorMessage)
    console.error('Parse error:', errorMessage)
  }

  return (
    <div className="app-container">
      <h1>Tree Component Assignment</h1>
      <p>Phase 1 — File Upload & Parsing Test</p>

      <FileUploader
        onDataParsed={handleDataParsed}
        onError={handleError}
      />

      {/* Temporary data preview panel — just for Phase 1 testing */}
      {parsedData && parsedData.length > 0 && (
        <div className="data-preview">
          <h2>Parse Result</h2>
          <p>
            <strong>Total rows:</strong> {parsedData.length}
          </p>
          <p>
            <strong>Columns detected:</strong>{' '}
            {Object.keys(parsedData[0]).join(', ')}
          </p>

          {/* Show first 5 rows as a table */}
          <h3>First 5 rows:</h3>
          <div className="data-preview__table-wrapper">
            <table className="data-preview__table">
              <thead>
                <tr>
                  {Object.keys(parsedData[0]).map((header) => (
                    <th key={header}>{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {parsedData.slice(0, 5).map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    {Object.values(row).map((value, colIndex) => (
                      <td key={colIndex}>{value}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Show parse error if one occurred */}
      {parseError && (
        <div className="parse-error">
          <strong>Parse Error:</strong> {parseError}
        </div>
      )}
    </div>
  )
}

export default App