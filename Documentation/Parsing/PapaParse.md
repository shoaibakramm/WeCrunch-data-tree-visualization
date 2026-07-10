
Concept 1: Web Worker offloading (worker: true) — parsing can run in a separate thread so it doesn't block the UI (unclickable buttons, frozen spinners) during large parses. Communication with a worker happens via message-passing, not shared memory.

Concept 2: Async by nature — parsing a File is I/O-bound, so results always arrive via callback, never synchronously, even for small files.

--------------------------------------------------------------------

Step 1 — File selection produces a File object
When the user picks a file the react UI, the browser gives you a File object (a Blob(Binary Large Object) subclass). At this point no data has been read yet — it's just a handle with metadata (name, size, MIME type) pointing to the file on disk.


Step 2 — You call Papa.parse(file, config)
PapaParse inspects the type of the first argument. If it's a File/Blob, it doesn't try to read the whole thing into a string upfront — it hands off to its internal FileStreamer, which is built on the FileReader API (specifically readAsText on successive slices of the blob, not the whole file at once).
file reader api is a browser function that helps read files. Before this we had to send teh file to the backedn to be read

Step 3 — Chunked reading begins
Underneath, PapaParse slices the file into chunks (default ~10MB per chunk, configurable via chunkSize) using Blob.slice(). It reads chunk 1, waits for the FileReader's onload event, gets that chunk's text, and only then requests the next chunk. This is why parsing a File is inherently async and event-driven — the browser is doing real disk I/O between chunks.


Step 4 — Encoding/BOM handling on the first chunk
Before parsing starts, PapaParse checks the very start of the first chunk's raw bytes for a BOM (Byte Order Mark). If found, it strips it, so it doesn't leak into your first column's header name.


Step 5 — Delimiter auto-detection (if not specified)
If you didn't pass delimiter, PapaParse takes a sample from the first chunk and runs a heuristic: it counts occurrences of common delimiters (,, \t, ;, |) across sample lines and picks whichever produces the most consistent field count row-to-row. This happens once, before the real parse begins.


Step 6 — The chunk's text enters the core parser (the state machine)
This is where the actual character-by-character work happens. PapaParse's Parser walks the chunk string one character at a time, maintaining a small set of state flags:
    Am I currently inside a quoted field?
    Have I just seen a quote character that might be an escaped "", or the closing quote?
    Have I hit a delimiter (end of field) or a newline (end of row)?
Concretely: it scans forward looking for the next delimiter or line-break character. If it encounters a " while not already inside quotes, it flips into "inside quoted field" mode and now ignores delimiters/newlines until it finds the matching closing quote — this is exactly how "Smith, John" survives as one field instead of splitting into two.

The main states PapaParse toggles between are:
    NORMAL_FIELD: Just reading standard letters or numbers.
    INSIDE_QUOTED_FIELD: Reading text wrapped inside double quotes "".
    ESCAPED_QUOTE: Just saw a quote character and needs to check if it's an escaped quote ("") or the end of the field.


Step 7 — Row assembly
As the state machine finds field boundaries, it pushes each field's substring into a fields array. When it hits a newline outside quotes, that signals "row complete" — the fields array becomes one row, gets pushed into a data array (or immediately handed to your step callback if you're streaming), and a new empty fields array starts for the next row.


Step 8 — Header row extraction (if header: true)
The very first completed row is pulled out and stored as the field-name array instead of being treated as data. Every subsequent row's fields are then zipped against these header names to build a Record object rather than a plain array.


Step 9 — Error tracking
If the state machine detects something inconsistent (e.g., a row with a different field count than the header, or an unterminated quote at end of file), it doesn't throw — it appends a descriptive object to an internal errors array and keeps going, so one bad row doesn't kill the whole import.


Step 10 — Delivery: step vs complete
If you configured step, each finished row (Step 7's output) is handed to your callback immediately, chunk by chunk, and nothing is accumulated in memory by PapaParse itself.
If you used complete instead, PapaParse accumulates every row into one big data array internally, and only invokes your callback once the last chunk has been read and the file is exhausted.

