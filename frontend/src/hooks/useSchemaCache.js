import { useState, useCallback } from "react";

export default function useSchemaCache() {
  const [cache, setCache] = useState({});   // table → [{name,dtype}]
  const request = useCallback((table) => {
    console.log(`SCHEMA CACHE: Request for table: ${table}`);
    console.log(`SCHEMA CACHE: Current cache:`, cache);
    if (!table || cache[table]) {
      console.log(`SCHEMA CACHE: Skipping request - table empty or already cached`);
      return;
    }
    console.log(`SCHEMA CACHE: Fetching schema for ${table}`);
    fetch(`/api/schema/${table}`)
      .then(r => {
        console.log(`SCHEMA CACHE: Response received for ${table}:`, r);
        return r.json();
      })
      .then(j => {
        console.log(`SCHEMA CACHE: JSON data for ${table}:`, j);
        console.log(`SCHEMA CACHE: Columns data:`, j.cols);
        setCache(p => {
          const newCache = { ...p, [table]: j.cols };
          console.log(`SCHEMA CACHE: Updated cache:`, newCache);
          return newCache;
        });
      })
      .catch(err => {
        console.error(`SCHEMA CACHE: Error fetching ${table}:`, err);
      });
  }, [cache]);
  return [cache, request];
}
}