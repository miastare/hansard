
// utils/DeriveSchema.js

export function deriveSchema(step, steps, tableCatalog) {
  if (!step) return [];

  if (step.op === "source") {
    const table = tableCatalog[step.table];
    if (!table) return [];
    
    // Fix type mapping - convert 'object' to 'str' for string columns
    return table.map(col => ({
      ...col,
      dtype: col.dtype === 'object' ? 'str' : col.dtype
    }));
  }

  if (step.op === "filter") {
    const inputStep = steps.find(s => s.id === step.input);
    return deriveSchema(inputStep, steps, tableCatalog);
  }

  if (step.op === "mutate") {
    const inputStep = steps.find(s => s.id === step.input);
    const inputSchema = deriveSchema(inputStep, steps, tableCatalog);
    
    if (!step.cols) return inputSchema;

    // Start with input schema
    const outputSchema = [...inputSchema];
    
    // Add or update columns based on mutations
    Object.entries(step.cols).forEach(([colName, expr]) => {
      const derivedType = deriveExpressionType(expr, inputSchema);
      
      // Find existing column or add new one
      const existingIndex = outputSchema.findIndex(col => col.name === colName);
      const newCol = { name: colName, dtype: derivedType };
      
      if (existingIndex >= 0) {
        outputSchema[existingIndex] = newCol;
      } else {
        outputSchema.push(newCol);
      }
    });
    
    return outputSchema;
  }

  return [];
}

function deriveExpressionType(expr, schema) {
  if (!expr) return 'unknown';
  
  if (expr.type === 'constant') {
    return expr.valueType || 'unknown';
  }
  
  if (expr.type === 'dynamic') {
    // Simple type derivation based on operator
    const numericOps = ['add', 'sub', 'mul', 'div', 'pow', 'neg', 'abs'];
    const booleanOps = ['and', 'or', 'not', 'eq', 'ne', 'lt', 'le', 'gt', 'ge', 'icontains', 'regex'];
    const stringOps = ['lower', 'upper'];
    
    if (numericOps.includes(expr.operator)) {
      return 'float64';
    }
    if (booleanOps.includes(expr.operator)) {
      return 'bool';
    }
    if (stringOps.includes(expr.operator)) {
      return 'str';
    }
    if (expr.operator === 'len') {
      return 'int64';
    }
  }
  
  if (expr.type === 'column') {
    const col = schema.find(c => c.name === expr.columnName);
    return col ? (col.dtype === 'object' ? 'str' : col.dtype) : 'unknown';
  }
  
  return 'unknown';
}
