Concept 1 — WASM (WebAssembly) execution: DuckDB itself is written in C++. To run in a browser, the entire query engine is compiled to WebAssembly — a low-level bytecode format that runs at near-native speed inside the browser's JS engine sandbox. 

The duckdb code is at the backend written in c++. But the browser(v8 engine in chrome) cannot translate c++ or any language to machine code it can only do it for javascipt and web assembly.
However, c++ compiler is able to compile the c++ code to either assembly language and web assembly. So because browser understands webassembly, the duckdb code is translated into web assembly first and sent to the browser. The browser then gets that webassembly and translates that into machine code so that it can 
perform the disk operations(because we are using duckdb to write database stuff to the users disk or ram).
The assembly code for the duck db is compiled only once by the developer and stored in the .wasm file that the users browser downloads and can use to convert the code into exact machine code arm64 or x86 etc that user's cpu understands.
However there is one catch. Before doing the disk operations, for safety and security the commands first are executed on a browser sandbox where web-safe storage APIs authenticate if the commands are not malicious. 


Browser actually has its own multiple types of storages such as: Local storage, Session storage, Indexed DB, OPFS (Origin Private File System) etc.
When we put the default mode which is the in memory mode of duckdb...duck db stores out data in RAM in form of apache arrow vectors which is a structural way of storing data in the ram for fast retrieval etc. Refreshing the page completely deletes this storage.

For Persistent storage, the browser uses its OPFS.
LocalStorage is far too small (5MB max) and slow.
stored directly on your computer's storage drive (SSD/HDD), inside a hidden, browser-managed directory.
we can actually go to our files and see the data stored in folders in files.

opfs is a highly optimized, private virtual file system partitioned by the browser for a specific website.

duck db internally stores data in a columnar format so that calculations are easier...




Concept 2 — Worker thread architecture: DuckDB-WASM doesn't run on your main JS thread at all because then our application would freeze. We make another thread called a web worker. We connect the wasm duckdb database connection to that web worker thread. The database quries are written on the main thread which sends the requests to the web worker thread and the web worker thread does all the heavy work. 
every query you "call" is actually serialized, sent via postMessage to the worker, executed there, and the result sent back.
Once the query is completed teh web worker thread sends the completed query to the main thread, resolving the promise.


Concept 3 — Apache Arrow as the interchange format: Rather than DuckDB-WASM accepting arbitrary JS objects directly, the fast path for getting data in and out uses Apache Arrow — a standardized, zero-copy-friendly columnar memory format. When you ingest your parsed rows, they're often first converted into an Arrow Table (columns of typed arrays) before being handed to DuckDB, because Arrow's memory layout maps almost directly onto DuckDB's own columnar internals, avoiding expensive per-row conversion.


Concept 4 — SQL execution model (async, promise-based): Because every query round-trips through a worker via message-passing (Concept 2), every single query you run — even SELECT 1 — is inherently asynchronous and returns a Promise, unlike a typical synchronous in-process SQL library. There's no such thing as a blocking/synchronous query call from the main thread.



Concept 5 — WASM linear memory limits: The WASM module operates within a bounded linear memory space (historically capped around 4GB for 32-bit WASM, though this is evolving with memory64 proposals). Practically, this means there's a ceiling on how much data you can realistically load client-side — worth knowing conceptually even if your demo datasets won't come close to hitting it.
