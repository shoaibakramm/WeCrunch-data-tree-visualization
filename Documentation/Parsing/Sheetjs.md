

Step 1 — File selection produces a File object
Same starting point as CSV: gives you a File/Blob handle. No data is read yet.


Step 2 — Reading as binary, not text
Unlike CSV, you can't hand SheetJS a text stream , an .xlsx is a ZIP archive of binary data. So the first real step is converting the File into an ArrayBuffer (raw bytes), typically via file.arrayBuffer() or a FileReader.readAsArrayBuffer(). This is a full, single read — there's no chunked streaming like PapaParse does, because you can't meaningfully parse a partial ZIP file.


Step 3 — XLSX.read(arrayBuffer) — unzipping
SheetJS first treats the buffer as a ZIP container and unzips it in memory. Internally it locates entries like [Content_Types].xml, xl/workbook.xml, xl/worksheets/sheet1.xml, xl/sharedStrings.xml, xl/styles.xml — each is just a compressed file inside the archive, decompressed into an in-memory string/buffer.


Step 4 — Parsing xl/workbook.xml — discovering sheets
This small XML file lists the workbook's sheets (names, order, internal relationship IDs). SheetJS parses this first because it needs to know what sheets exist before it can decide which worksheet XML files to process next.


Step 5 — Loading the shared string table
Before parsing any actual cell data, SheetJS reads xl/sharedStrings.xml. Excel doesn't store repeated text directly inside each cell — instead, all unique strings in the workbook are stored once in this shared table, and individual cells just reference an index into it (a space-saving trick from Excel's own file format design). SheetJS loads this table into memory so it can resolve those references later.
<!-- A look inside xl/sharedStrings.xml -->
<sst count="3" uniqueCount="3">
  <si><t>Lahore</t></si>       <!-- Index 0 -->
  <si><t>Karachi</t></si>      <!-- Index 1 -->
  <si><t>Islamabad</t></si>    <!-- Index 2 -->
</sst>


Step 6 — Parsing an individual worksheet's XML (sheet1.xml)
This is the real "row data" step, analogous to PapaParse's state-machine pass. The worksheet XML looks roughly like:

<row r="2">
  <c r="A2" t="s"><v>2</v></c>
  <c r="B2" t="n"><v>0</v></c>
</row>

SheetJS walks this XML (using an XML parser, not a hand-rolled state machine like PapaParse's CSV parser) and for each <c> (cell) element extracts:
    The cell address (r="A2")
    The type code (t="s" for shared-string, t="n" for number, t="b" boolean, t="d" date, blank/omitted usually means number)
    The raw value (<v>)



Step 7 — Resolving cell values by type
For each cell, SheetJS branches on the type code:

    t="s" → the <v> is actually an index into the shared string table , so SheetJS looks it up and substitutes the real text.
    t="n" → the <v> is used directly as a number.
    t="b" → "0"/"1" converted to boolean.


Step 8 — Building the sparse Worksheet object
    Rather than assembling rows into arrays, SheetJS builds a flat object keyed by cell address: { A1: {...}, B1: {...}, A2: {...}, ... }, plus a '!ref' property recording the used range (e.g. "A1:D50"). This mirrors how Excel itself thinks about a sheet — as an addressable grid, not a list of rows.


Step 9 — workbook.Sheets[name] gives you one parsed sheet
At this point you have the full Workbook object: SheetNames (from Step 4) plus Sheets (a map of name → the sparse cell-address object from Step 8). This is the raw parsed result — still not "rows."
If you were to log this object in your code (console.log(workbook)), you would see it is built from the exact pieces assembled across the earlier phases:

{
  // 1. SheetNames (Assembled way back in Step 4)
  SheetNames: ["Sales", "Inventory"],

  // 2. Sheets Map (The collection of sparse grid objects from Step 8)
  Sheets: {
    "Sales": {
      "!ref": "A1:B2",
      "A1": { "v": "Name", "t": "s" },
      "B1": { "v": "Age", "t": "s" },
      "A2": { "v": "Shoaib", "t": "s" },
      "B2": { "v": 22, "t": "n" }
    },
    "Inventory": {
      "!ref": "A1:C10",
      ...
    }
  }
}

// 1. Find the name of the very first tab in the Excel file
const firstSheetName = workbook.SheetNames[0]; // Returns "Sales"

// 2. Use that name as a key to extract the sparse coordinate grid object
const worksheet = workbook.Sheets[firstSheetName];



Step 10 — XLSX.utils.sheet_to_json(sheet) — the conversion step
This utility function walks the '!ref' range, cell by cell, row by row, reconstructing actual JS row objects:
    It determines column boundaries and row boundaries from the ref range.
    For each row index, it looks up each expected cell address (A2, B2, ...), pulls its resolved value , and assembles them into a plain object.
    By default it uses row 1's cell values as the object's keys (equivalent to PapaParse's header: true), unless you override this with a header option
    Cells that don't exist in the sparse object (truly empty cells) are simply skipped/omitted or given null, depending on options — this is a structural difference from CSV, where every field position is always present because delimiters mark it explicitly.



Step 11 — Final output
The result is Array<Record<string, any>> — same shape as PapaParse's output, satisfying the same Phase 1 contract, even though the two libraries got there via completely different underlying mechanics (byte-level state machine over text vs. unzip → XML parse → sparse cell map → range-walk reconstruction).


Key contrast to hold onto: PapaParse parses sequentially (stream of characters → rows, one pass), while SheetJS parses structurally (whole buffer → ZIP → XML tree → addressable grid → then a separate reconstruction pass turns that grid into rows). That's the real reason SheetJS can't offer the same kind of incremental step-callback streaming that PapaParse does — the file format itself isn't sequential in nature.

In a CSV file, every field position is always explicitly declared by delimiters. If a field is empty, the commas are still there to mark the empty spot:
Shoaib,,Lahore (The second field is explicitly an empty string "").
In an Excel file, if a user leaves a cell completely blank, Excel saves storage space by completely deleting that cell from the XML layout. The coordinate address simply does not exist in the sparse worksheet object.