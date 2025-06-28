import { useState, useCallback, useEffect } from "react";

export function usePreviewFrames() {
  const [preview, setPreview] = useState({});   // table → head-rows array
  const [queue,   setQueue]   = useState([]);   // tables waiting to fetch

  // enqueue a table if we don't have it yet
  const request = useCallback((table) => {
    if (!table || preview[table] || queue.includes(table)) return;
    setQueue(q => [...q, table]);
  }, [preview, queue]);

  // side-effect: whenever `queue` grows → fetch next table head
   useEffect(() => {
    if (!queue.length) return;

    const table = queue[0];
    fetch(`http://localhost:4005/api/preview/${table}?n=5`)
      .then(r => r.json())
      .then(rows => setPreview(prev => ({ ...prev, [table]: rows })))
      .catch(console.error)
      .finally(() => setQueue(q => q.slice(1)));
  }, [queue]);

  return [preview, request];
}