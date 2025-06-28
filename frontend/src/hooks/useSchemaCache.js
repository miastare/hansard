import { useState, useCallback } from "react";

export default function useSchemaCache() {
  console.log('USE SCHEMA CACHE: Hook called');
  const [cache, setCache] = useState({});

  const request = useCallback(async (tableName) => {
    console.log(`USE SCHEMA CACHE: === REQUESTING SCHEMA ===`);
    console.log(`USE SCHEMA CACHE: Requesting schema for table: ${tableName}`);
    console.log(`USE SCHEMA CACHE: Current cache:`, cache);
    if (cache[tableName]) {
      console.log(`USE SCHEMA CACHE: Schema for ${tableName} found in cache:`, cache[tableName]);
      return cache[tableName];
    }

    try {
      console.log(`USE SCHEMA CACHE: Fetching schema for ${tableName} from backend`);
      const response = await fetch(`/api/schema/${tableName}`);
      console.log(`USE SCHEMA CACHE: Response:`, response);
      console.log(`USE SCHEMA CACHE: Response status:`, response.status);
      console.log(`USE SCHEMA CACHE: Response ok:`, response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`USE SCHEMA CACHE: Error response text:`, errorText);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const schema = await response.json();
      console.log(`USE SCHEMA CACHE: Received schema for ${tableName}:`, schema);
      console.log(`USE SCHEMA CACHE: Schema type:`, typeof schema);
      console.log(`USE SCHEMA CACHE: Schema Array.isArray:`, Array.isArray(schema));

      setCache(prev => {
        const newCache = { ...prev, [tableName]: schema };
        console.log(`USE SCHEMA CACHE: Updated cache:`, newCache);
        return newCache;
      });

      return schema;
    } catch (error) {
      console.error(`USE SCHEMA CACHE: Error fetching schema for ${tableName}:`, error);
      console.error(`USE SCHEMA CACHE: Error stack:`, error.stack);
      return null;
    }
  }, [cache]);

  return [cache, request];
}