import { useState, useCallback } from "react";

export default function useSchemaCache() {
  const [cache, setCache] = useState({});   // table → [{name,dtype}]
  const request = useCallback((table) => {
    if (!table || cache[table]) return;
    fetch(`http://localhost:4005/api/schema/${table}`)
      .then(r => r.json())
      .then(j => setCache(p => ({ ...p, [table]: j.cols })))
      .catch(console.error);
  }, [cache]);
  return [cache, request];
}
