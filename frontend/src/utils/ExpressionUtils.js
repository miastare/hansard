// Operator definitions with type constraints and argument counts
const OPERATORS = {
  // Numeric operators
  add: { 
    minArgs: 2, 
    maxArgs: Infinity, 
    inputTypes: ['int64', 'float64'], 
    outputType: 'float64',
    description: 'Add numbers together'
  },
  sub: { 
    minArgs: 2, 
    maxArgs: 2, 
    inputTypes: ['int64', 'float64'], 
    outputType: 'float64',
    description: 'Subtract second number from first'
  },
  mul: { 
    minArgs: 2, 
    maxArgs: Infinity, 
    inputTypes: ['int64', 'float64'], 
    outputType: 'float64',
    description: 'Multiply numbers together'
  },
  div: { 
    minArgs: 2, 
    maxArgs: 2, 
    inputTypes: ['int64', 'float64'], 
    outputType: 'float64',
    description: 'Divide first number by second'
  },
  pow: { 
    minArgs: 2, 
    maxArgs: 2, 
    inputTypes: ['int64', 'float64'], 
    outputType: 'float64',
    description: 'Raise first number to power of second'
  },
  neg: { 
    minArgs: 1, 
    maxArgs: 1, 
    inputTypes: ['int64', 'float64'], 
    outputType: 'float64',
    description: 'Negate number'
  },
  abs: { 
    minArgs: 1, 
    maxArgs: 1, 
    inputTypes: ['int64', 'float64'], 
    outputType: 'float64',
    description: 'Absolute value'
  },

  // Boolean operators
  and: { 
    minArgs: 2, 
    maxArgs: Infinity, 
    inputTypes: ['bool'], 
    outputType: 'bool',
    description: 'Logical AND'
  },
  or: { 
    minArgs: 2, 
    maxArgs: Infinity, 
    inputTypes: ['bool'], 
    outputType: 'bool',
    description: 'Logical OR'
  },
  not: { 
    minArgs: 1, 
    maxArgs: 1, 
    inputTypes: ['bool'], 
    outputType: 'bool',
    description: 'Logical NOT'
  },

  // Comparison operators
  eq: { 
    minArgs: 2, 
    maxArgs: 2, 
    inputTypes: ['int64', 'float64', 'str', 'bool'], 
    outputType: 'bool',
    description: 'Equal to'
  },
  ne: { 
    minArgs: 2, 
    maxArgs: 2, 
    inputTypes: ['int64', 'float64', 'str', 'bool'], 
    outputType: 'bool',
    description: 'Not equal to'
  },
  lt: { 
    minArgs: 2, 
    maxArgs: 2, 
    inputTypes: ['int64', 'float64'], 
    outputType: 'bool',
    description: 'Less than'
  },
  le: { 
    minArgs: 2, 
    maxArgs: 2, 
    inputTypes: ['int64', 'float64'], 
    outputType: 'bool',
    description: 'Less than or equal'
  },
  gt: { 
    minArgs: 2, 
    maxArgs: 2, 
    inputTypes: ['int64', 'float64'], 
    outputType: 'bool',
    description: 'Greater than'
  },
  ge: { 
    minArgs: 2, 
    maxArgs: 2, 
    inputTypes: ['int64', 'float64'], 
    outputType: 'bool',
    description: 'Greater than or equal'
  },

  // String operators
  len: { 
    minArgs: 1, 
    maxArgs: 1, 
    inputTypes: ['str'], 
    outputType: 'int64',
    description: 'Length of string'
  },
  lower: { 
    minArgs: 1, 
    maxArgs: 1, 
    inputTypes: ['str'], 
    outputType: 'str',
    description: 'Convert to lowercase'
  },
  upper: { 
    minArgs: 1, 
    maxArgs: 1, 
    inputTypes: ['str'], 
    outputType: 'str',
    description: 'Convert to uppercase'
  },
  icontains: { 
    minArgs: 2, 
    maxArgs: 2, 
    inputTypes: ['str'], 
    outputType: 'bool',
    description: 'Case-insensitive contains'
  },
  regex: { 
    minArgs: 2, 
    maxArgs: 2, 
    inputTypes: ['str'], 
    outputType: 'bool',
    description: 'Regular expression match'
  },

  // Conditional operators
  if_else: {
    minArgs: 3,
    maxArgs: 3,
    inputTypes: ['bool', 'any', 'any'], // condition, true_value, false_value
    outputType: 'conditional', // Output type matches the true/false branches
    description: 'Conditional expression: if condition then true_value else false_value',
    constraintFunction: (args, availableColumns) => {
      // The second and third arguments must be the same type
      if (args.length === 3) {
        const trueType = getExpressionType(args[1], availableColumns);
        const falseType = getExpressionType(args[2], availableColumns);
        return trueType === falseType ? trueType : 'unknown';
      }
      return 'unknown';
    }
  },

  // Special operators
  column: {
    minArgs: 1,
    maxArgs: 1,
    inputTypes: ['str'], // Column name as string
    outputType: 'dynamic', // Output type depends on column
    description: 'Reference a column'
  }
};

export function getOperatorInfo(operator) {
  return OPERATORS[operator] || { 
    minArgs: 1, 
    maxArgs: 1, 
    inputTypes: [], 
    outputType: 'unknown',
    description: 'Unknown operator'
  };
}

export function getCompatibleOperators(availableColumns = []) {
  console.log('EXPRESSION UTILS: getCompatibleOperators called with columns:', availableColumns);
  
  // For now, return all operators
  // In future, could filter based on column types
  const allOps = Object.keys(OPERATORS);
  console.log('EXPRESSION UTILS: Returning all operators:', allOps);
  return allOps;
}

export function getTypeFromValue(value) {
  if (typeof value === 'number') {
    return Number.isInteger(value) ? 'int64' : 'float64';
  }
  if (typeof value === 'boolean') {
    return 'bool';
  }
  if (typeof value === 'string') {
    return 'str';
  }
  return 'unknown';
}

export function getExpressionType(expr, availableColumns) {
  if (!expr) return 'unknown';
  
  if (expr.type === 'constant') {
    return expr.valueType;
  }

  if (expr.type === 'dynamic') {
    const opInfo = getOperatorInfo(expr.operator);
    
    // Handle special conditional type resolution
    if (opInfo.outputType === 'conditional' && opInfo.constraintFunction) {
      return opInfo.constraintFunction(expr.args || [], availableColumns);
    }
    
    return opInfo.outputType;
  }

  if (expr.type === 'column') {
    const col = availableColumns.find(c => c.name === expr.columnName);
    return col ? col.dtype : 'unknown';
  }

  return 'unknown';
}

// Get the required type for a specific argument position in an operator
export function getRequiredTypeForArgument(operator, argIndex, parentExpressionContext = null) {
  const opInfo = getOperatorInfo(operator);
  
  // Handle special cases
  if (operator === 'if_else') {
    if (argIndex === 0) return ['bool']; // condition must be boolean
    if (argIndex === 1 || argIndex === 2) {
      // For if_else branches, the required type depends on the parent context
      if (parentExpressionContext && parentExpressionContext.requiredType) {
        // If parent requires specific type, both branches must match that type
        return Array.isArray(parentExpressionContext.requiredType) 
          ? parentExpressionContext.requiredType 
          : [parentExpressionContext.requiredType];
      }
      return ['int64', 'float64', 'str', 'bool']; // any type is allowed if no parent constraint
    }
  }
  
  // For operators with 'any' input types, check if we have parent context
  if (opInfo.inputTypes.includes('any')) {
    if (parentExpressionContext && parentExpressionContext.requiredType) {
      return Array.isArray(parentExpressionContext.requiredType) 
        ? parentExpressionContext.requiredType 
        : [parentExpressionContext.requiredType];
    }
    return ['int64', 'float64', 'str', 'bool']; // fallback to all types
  }
  
  return opInfo.inputTypes;
}

export function isTypeCompatible(sourceType, targetTypes) {
  if (!Array.isArray(targetTypes)) {
    targetTypes = [targetTypes];
  }

  // Handle type conversions
  const compatibilityMap = {
    'int64': ['int64', 'float64'],
    'float64': ['int64', 'float64'],
    'str': ['str', 'object'],
    'object': ['str', 'object'],
    'bool': ['bool']
  };

  const compatibleTypes = compatibilityMap[sourceType] || [sourceType];
  return targetTypes.some(targetType => compatibleTypes.includes(targetType));
}