
// utils/DeriveSchema.js

export function deriveSchema(step, steps, tableCatalog) {
  if (!step) return [];

  console.log('DERIVE SCHEMA: Processing step:', step);
  console.log('DERIVE SCHEMA: Available steps:', steps);

  if (step.op === "source") {
    const table = tableCatalog[step.table];
    if (!table) return [];
    
    // Handle both formats: table.cols or table directly
    const cols = table.cols || table;
    if (!Array.isArray(cols)) return [];
    
    // Fix type mapping - convert 'object' to 'str' for string columns
    const result = cols.map(col => ({
      ...col,
      dtype: col.dtype === 'object' ? 'str' : col.dtype
    }));
    console.log('DERIVE SCHEMA: Source schema result:', result);
    return result;
  }

  if (step.op === "filter") {
    const inputStep = steps.find(s => s.id === step.input);
    console.log('DERIVE SCHEMA: Filter - found input step:', inputStep);
    return deriveSchema(inputStep, steps, tableCatalog);
  }

  if (step.op === "mutate") {
    console.log('DERIVE SCHEMA: Processing mutate step');
    console.log('DERIVE SCHEMA: step.input:', step.input);
    console.log('DERIVE SCHEMA: step.cols:', step.cols);
    
    const inputStep = steps.find(s => s.id === step.input);
    console.log('DERIVE SCHEMA: Mutate - found input step:', inputStep);
    
    const inputSchema = deriveSchema(inputStep, steps, tableCatalog);
    console.log('DERIVE SCHEMA: Input schema for mutate:', inputSchema);
    
    if (!step.cols) {
      console.log('DERIVE SCHEMA: No cols in mutate step, returning input schema');
      return inputSchema;
    }

    // Start with input schema
    const outputSchema = [...inputSchema];
    console.log('DERIVE SCHEMA: Starting output schema:', outputSchema);
    
    // Add or update columns based on mutations
    Object.entries(step.cols).forEach(([colName, expr]) => {
      console.log('DERIVE SCHEMA: Processing column:', colName, 'with expr:', expr);
      const derivedType = deriveExpressionType(expr, inputSchema);
      console.log('DERIVE SCHEMA: Derived type for', colName, ':', derivedType);
      
      // Find existing column or add new one
      const existingIndex = outputSchema.findIndex(col => col.name === colName);
      const newCol = { name: colName, dtype: derivedType };
      
      if (existingIndex >= 0) {
        console.log('DERIVE SCHEMA: Updating existing column at index', existingIndex);
        outputSchema[existingIndex] = newCol;
      } else {
        console.log('DERIVE SCHEMA: Adding new column');
        outputSchema.push(newCol);
      }
    });
    
    console.log('DERIVE SCHEMA: Final output schema:', outputSchema);
    return outputSchema;
  }

  console.log('DERIVE SCHEMA: Unhandled step type:', step.op);
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
