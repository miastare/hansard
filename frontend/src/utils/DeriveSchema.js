
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

  if (step.op === "aggregate") {
    console.log(`🔍 DERIVE SCHEMA: Processing aggregate step ${step.id}`);
    console.log(`🔍 DERIVE SCHEMA: Aggregate step input: ${step.input}`);
    console.log(`🔍 DERIVE SCHEMA: Aggregate step group:`, step.group);
    console.log(`🔍 DERIVE SCHEMA: Aggregate step metrics:`, step.metrics);
    
    if (!step.input || step.input === '') {
      console.log(`🔍 DERIVE SCHEMA: ❌ Aggregate step has no input specified`);
      return [];
    }
    
    const inputStep = steps.find(s => s.id === step.input);
    if (!inputStep) {
      console.log(`🔍 DERIVE SCHEMA: ❌ No input step found for aggregate: ${step.input}`);
      console.log(`🔍 DERIVE SCHEMA: Available step IDs:`, steps?.map(s => s.id));
      return [];
    }
    
    console.log(`🔍 DERIVE SCHEMA: Found input step for aggregate:`, inputStep);
    
    // Get input schema to validate group columns
    const inputSchema = deriveSchema(inputStep, steps, tableCatalog);
    console.log(`🔍 DERIVE SCHEMA: Input schema for aggregate (${inputSchema.length} columns):`, inputSchema);
    
    const outputSchema = [];
    
    // Add group by columns (they keep their original types)
    if (step.group && step.group.length > 0) {
      step.group.forEach(groupCol => {
        const inputCol = inputSchema.find(col => col.name === groupCol);
        if (inputCol) {
          console.log(`🔍 DERIVE SCHEMA: Adding group column: ${groupCol} (${inputCol.dtype})`);
          outputSchema.push({ name: groupCol, dtype: inputCol.dtype });
        } else {
          console.log(`🔍 DERIVE SCHEMA: ⚠️ Group column ${groupCol} not found in input schema`);
          // Add it anyway with unknown type
          outputSchema.push({ name: groupCol, dtype: 'unknown' });
        }
      });
    }
    
    // Add metric columns (they become numeric)
    if (step.metrics && Object.keys(step.metrics).length > 0) {
      Object.entries(step.metrics).forEach(([metricName, metric]) => {
        console.log(`🔍 DERIVE SCHEMA: Adding metric column: ${metricName} (${metric.fn})`);
        // Most aggregation functions return numeric values
        const metricType = metric.fn === 'count' ? 'numeric' : 'numeric';
        outputSchema.push({ name: metricName, dtype: metricType });
      });
    }
    
    console.log(`🔍 DERIVE SCHEMA: ✅ Final aggregate output schema (${outputSchema.length} columns):`, outputSchema);
    return outputSchema;
  }

  if (step.op === "join") {
    console.log(`🔍 DERIVE SCHEMA: Processing join step ${step.id}`);
    console.log(`🔍 DERIVE SCHEMA: Join step inputs:`, step.inputs);
    console.log(`🔍 DERIVE SCHEMA: Join step how:`, step.how);
    console.log(`🔍 DERIVE SCHEMA: Join step on:`, step.on);
    console.log(`🔍 DERIVE SCHEMA: Join step suffixes:`, step.suffixes);
    
    if (!step.inputs || step.inputs.length !== 2) {
      console.log(`🔍 DERIVE SCHEMA: ❌ Join step must have exactly 2 inputs`);
      return [];
    }
    
    const leftInputStep = steps.find(s => s.id === step.inputs[0]);
    const rightInputStep = steps.find(s => s.id === step.inputs[1]);
    
    if (!leftInputStep || !rightInputStep) {
      console.log(`🔍 DERIVE SCHEMA: ❌ Could not find input steps for join`);
      console.log(`🔍 DERIVE SCHEMA: Left input found:`, !!leftInputStep);
      console.log(`🔍 DERIVE SCHEMA: Right input found:`, !!rightInputStep);
      return [];
    }
    
    console.log(`🔍 DERIVE SCHEMA: Found join input steps:`, { left: leftInputStep.id, right: rightInputStep.id });
    
    // Get schemas for both inputs
    const leftSchema = deriveSchema(leftInputStep, steps, tableCatalog);
    const rightSchema = deriveSchema(rightInputStep, steps, tableCatalog);
    
    console.log(`🔍 DERIVE SCHEMA: Left schema (${leftSchema.length} columns):`, leftSchema);
    console.log(`🔍 DERIVE SCHEMA: Right schema (${rightSchema.length} columns):`, rightSchema);
    
    const outputSchema = [];
    const suffixes = step.suffixes || { left: '_x', right: '_y' };
    const joinColumns = step.on || [];
    
    // Add all columns from left table
    leftSchema.forEach(col => {
      // If it's a join column, add it without suffix
      if (joinColumns.includes(col.name)) {
        outputSchema.push({ name: col.name, dtype: col.dtype });
      } else {
        // Check if this column name exists in right table (not including join columns)
        const rightColExists = rightSchema.some(rightCol => 
          rightCol.name === col.name && !joinColumns.includes(rightCol.name)
        );
        
        if (rightColExists) {
          // Add with left suffix
          outputSchema.push({ name: `${col.name}${suffixes.left}`, dtype: col.dtype });
        } else {
          // Add without suffix
          outputSchema.push({ name: col.name, dtype: col.dtype });
        }
      }
    });
    
    // Add columns from right table (excluding join columns which were already added)
    rightSchema.forEach(col => {
      if (!joinColumns.includes(col.name)) {
        // Check if this column name exists in left table (not including join columns)
        const leftColExists = leftSchema.some(leftCol => 
          leftCol.name === col.name && !joinColumns.includes(leftCol.name)
        );
        
        if (leftColExists) {
          // Add with right suffix
          outputSchema.push({ name: `${col.name}${suffixes.right}`, dtype: col.dtype });
        } else {
          // Add without suffix
          outputSchema.push({ name: col.name, dtype: col.dtype });
        }
      }
    });
    
    console.log(`🔍 DERIVE SCHEMA: ✅ Final join output schema (${outputSchema.length} columns):`, outputSchema);
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
  }
  
  if (expr.type === 'column') {
    const col = schema.find(c => c.name === expr.columnName);
    return col ? (col.dtype === 'object' ? 'str' : col.dtype) : 'unknown';
  }
  
  return 'unknown';
}
