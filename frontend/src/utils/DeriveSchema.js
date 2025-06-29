
// utils/DeriveSchema.js

export function deriveSchema(step, steps, tableCatalog) {
  if (!step) {
    console.log('🔍 DERIVE SCHEMA: ❌ No step provided');
    return [];
  }

  console.log(`🔍 DERIVE SCHEMA: === Processing step ${step.id} (${step.op}) ===`);
  console.log(`🔍 DERIVE SCHEMA: Step details:`, step);
  console.log(`🔍 DERIVE SCHEMA: Available steps:`, steps?.map(s => ({id: s.id, op: s.op, input: s.input, table: s.table})));
  console.log(`🔍 DERIVE SCHEMA: Number of available steps:`, steps?.length || 0);
  console.log(`🔍 DERIVE SCHEMA: tableCatalog keys:`, Object.keys(tableCatalog || {}));

  if (step.op === "source") {
    console.log(`🔍 DERIVE SCHEMA: Processing source step for table: ${step.table}`);
    const table = tableCatalog[step.table];
    console.log(`🔍 DERIVE SCHEMA: Table data:`, table);
    
    if (!table) {
      console.log(`🔍 DERIVE SCHEMA: ❌ No table found for: ${step.table}`);
      console.log(`🔍 DERIVE SCHEMA: Available tables:`, Object.keys(tableCatalog || {}));
      return [];
    }
    
    const cols = table.cols || table;
    console.log(`🔍 DERIVE SCHEMA: Extracted cols:`, cols);
    console.log(`🔍 DERIVE SCHEMA: Cols is array:`, Array.isArray(cols));
    console.log(`🔍 DERIVE SCHEMA: Cols type:`, typeof cols);
    
    if (!Array.isArray(cols)) {
      console.log(`🔍 DERIVE SCHEMA: ❌ Table schema is not an array:`, cols);
      return [];
    }
    
    const result = cols.map(col => ({
      ...col,
      dtype: col.dtype === 'object' ? 'str' : col.dtype
    }));
    console.log(`🔍 DERIVE SCHEMA: ✅ Source schema result (${result.length} columns):`, result);
    return result;
  }

  if (step.op === "filter") {
    console.log(`🔍 DERIVE SCHEMA: Processing filter step, looking for input: ${step.input}`);
    const inputStep = steps.find(s => s.id === step.input);
    
    if (!inputStep) {
      console.log(`🔍 DERIVE SCHEMA: ❌ No input step found for filter: ${step.input}`);
      console.log(`🔍 DERIVE SCHEMA: Available step IDs:`, steps?.map(s => s.id));
      return [];
    }
    
    console.log(`🔍 DERIVE SCHEMA: Filter input step found:`, inputStep);
    return deriveSchema(inputStep, steps, tableCatalog);
  }

  if (step.op === "mutate") {
    console.log(`🔍 DERIVE SCHEMA: Processing mutate step ${step.id}`);
    console.log(`🔍 DERIVE SCHEMA: Mutate step input: ${step.input}`);
    console.log(`🔍 DERIVE SCHEMA: Mutate step input type: ${typeof step.input}`);
    console.log(`🔍 DERIVE SCHEMA: Mutate step input is empty string: ${step.input === ''}`);
    console.log(`🔍 DERIVE SCHEMA: Mutate step input is null: ${step.input === null}`);
    console.log(`🔍 DERIVE SCHEMA: Mutate step input is undefined: ${step.input === undefined}`);
    console.log(`🔍 DERIVE SCHEMA: Mutate step cols:`, step.cols);
    
    if (!step.input || step.input === '') {
      console.log(`🔍 DERIVE SCHEMA: ❌ Mutate step has no input specified`);
      console.log(`🔍 DERIVE SCHEMA: ❌ Full step object:`, JSON.stringify(step, null, 2));
      return [];
    }
    
    const inputStep = steps.find(s => s.id === step.input);
    if (!inputStep) {
      console.log(`🔍 DERIVE SCHEMA: ❌ No input step found for mutate: ${step.input}`);
      console.log(`🔍 DERIVE SCHEMA: Available step IDs:`, steps?.map(s => s.id));
      return [];
    }
    
    console.log(`🔍 DERIVE SCHEMA: Found input step for mutate:`, inputStep);
    console.log(`🔍 DERIVE SCHEMA: Input step details - id: ${inputStep.id}, op: ${inputStep.op}, input: ${inputStep.input}, table: ${inputStep.table}`);
    
    // Recursively get the input schema
    console.log(`🔍 DERIVE SCHEMA: Recursively deriving schema for input step ${inputStep.id} (${inputStep.op})`);
    const inputSchema = deriveSchema(inputStep, steps, tableCatalog);
    console.log(`🔍 DERIVE SCHEMA: Input schema for mutate (${inputSchema.length} columns):`, inputSchema);
    console.log(`🔍 DERIVE SCHEMA: Input schema details:`, JSON.stringify(inputSchema, null, 2));
    
    if (!step.cols || Object.keys(step.cols).length === 0) {
      console.log(`🔍 DERIVE SCHEMA: No cols in mutate step, returning input schema`);
      return inputSchema;
    }

    // Start with input schema
    const outputSchema = [...inputSchema];
    console.log(`🔍 DERIVE SCHEMA: Starting with input schema (${outputSchema.length} columns)`);
    
    // Add or update columns based on mutations
    Object.entries(step.cols).forEach(([colName, expr]) => {
      console.log(`🔍 DERIVE SCHEMA: Processing mutate column: ${colName}`);
      const derivedType = deriveExpressionType(expr, inputSchema);
      console.log(`🔍 DERIVE SCHEMA: Derived type for ${colName}: ${derivedType}`);
      
      // Find existing column or add new one
      const existingIndex = outputSchema.findIndex(col => col.name === colName);
      const newCol = { name: colName, dtype: derivedType };
      
      if (existingIndex >= 0) {
        console.log(`🔍 DERIVE SCHEMA: Updating existing column ${colName} at index ${existingIndex}`);
        outputSchema[existingIndex] = newCol;
      } else {
        console.log(`🔍 DERIVE SCHEMA: Adding new column ${colName}`);
        outputSchema.push(newCol);
      }
    });
    
    console.log(`🔍 DERIVE SCHEMA: ✅ Final mutate output schema (${outputSchema.length} columns):`, outputSchema);
    return outputSchema;
  }

  console.log(`🔍 DERIVE SCHEMA: ❌ Unhandled step type: ${step.op}`);
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
    if (expr.operator === 'if_else' && expr.args && expr.args.length >= 3) {
      // Return type of if_else is the type of the true/false branches (should be same)
      const trueType = deriveExpressionType(expr.args[1], schema);
      const falseType = deriveExpressionType(expr.args[2], schema);
      return trueType === falseType ? trueType : 'unknown';
    }
  }
  
  if (expr.type === 'column') {
    const col = schema.find(c => c.name === expr.columnName);
    return col ? (col.dtype === 'object' ? 'str' : col.dtype) : 'unknown';
  }
  
  return 'unknown';
}
