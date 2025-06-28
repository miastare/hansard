// utils/generateId.js
const counters = {};
export default function generateId(op) {
  counters[op] = (counters[op] || 0) + 1;
  return `${op}${counters[op]}`;        // e.g. "source1"
}