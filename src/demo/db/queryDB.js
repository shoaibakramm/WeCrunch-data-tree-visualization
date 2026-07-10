

/**
 * @param {import('@duckdb/duckdb-wasm').AsyncDuckDBConnection} connection
 * @param {string} sql 
 * @returns {Promise<Array<Object>>}
 */
export async function queryDB(connection, sql) {

    if (!connection) 
    {
        throw new Error('queryDB: no DuckDB connection provided.');
    }


    if (!sql || typeof sql !== 'string' || sql.trim() === '') 
    {
        throw new Error('queryDB: sql must be a non-empty string.');
    }


    try {

        // DuckDB returns an Apache Arrow table — a highly efficient columnar data format. We need to convert it to plain JS objects.
        const arrowResult = await connection.query(sql);

        // Convert Arrow table to plain JS array of objects
        const arrowRows = arrowResult.toArray();                                 // toArray() gives us Arrow row objects, not plain JS objects yet

        // Convert each Arrow row to a plain JS object
        const rows = arrowRows.map((row) => {
    
            const plainRow = row.toJSON();                       // Arrow rows have a toJSON() method that does this conversion


            const normalizedRow = {};


            for (const [key, value] of Object.entries(plainRow))
            {
                if (value === null || value === undefined) 
                {
                  normalizedRow[key] = null;
                } 
                else if (typeof value === 'bigint') 
                {
                  
                  normalizedRow[key] = String(value);

                } else {
                
                    normalizedRow[key] = String(value);
                
                }

            }

            return normalizedRow;

        });

        return rows;

    } catch (error) {
        
        throw new Error(`queryDB: query failed — ${error.message}\nSQL was: ${sql}`);
    }
}