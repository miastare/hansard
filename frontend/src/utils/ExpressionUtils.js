// Operator definitions with type constraints and argument counts
const OPERATORS = {
  // Numeric operators
  add: { 
    minArgs: 2, 
    maxArgs: Infinity, 
    inputTypes: ['numeric'], 
    outputType: 'numeric',
    description: 'Add numbers together'
  },
  sub: { 
    minArgs: 2, 
    maxArgs: 2, 
    inputTypes: ['numeric'], 
    outputType: 'numeric',
    description: 'Subtract second number from first'
  },
  mul: { 
    minArgs: 2, 
    maxArgs: Infinity, 
    inputTypes: ['numeric'], 
    outputType: 'numeric',
    description: 'Multiply numbers together'
  },
  div: { 
    minArgs: 2, 
    maxArgs: 2, 
    inputTypes: ['numeric'], 
    outputType: 'numeric',
    description: 'Divide first number by second'
  },
  pow: { 
    minArgs: 2, 
    maxArgs: 2, 
    inputTypes: ['numeric'], 
    outputType: 'numeric',
    description: 'Raise first number to power of second'
  },
  neg: { 
    minArgs: 1, 
    maxArgs: 1, 
    inputTypes: ['numeric'], 
    outputType: 'numeric',
    description: 'Negate number'
  },
  abs: { 
    minArgs: 1, 
    maxArgs: 1, 
    inputTypes: ['numeric'], 
    outputType: 'numeric',
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
    inputTypes: ['numeric', 'str', 'bool'], 
    outputType: 'bool',
    description: 'Equal to'
  },
  ne: { 
    minArgs: 2, 
    maxArgs: 2, 
    inputTypes: ['numeric', 'str', 'bool'], 
    outputType: 'bool',
    description: 'Not equal to'
  },
  lt: { 
    minArgs: 2, 
    maxArgs: 2, 
    inputTypes: ['numeric'], 
    outputType: 'bool',
    description: 'Less than'
  },
  le: { 
    minArgs: 2, 
    maxArgs: 2, 
    inputTypes: ['numeric'], 
    outputType: 'bool',
    description: 'Less than or equal'
  },
  gt: { 
    minArgs: 2, 
    maxArgs: 2, 
    inputTypes: ['numeric'], 
    outputType: 'bool',
    description: 'Greater than'
  },
  ge: { 
    minArgs: 2, 
    maxArgs: 2, 
    inputTypes: ['numeric'], 
    outputType: 'bool',
    description: 'Greater than or equal'
  },

  // String operators
  len: { 
    minArgs: 1, 
    maxArgs: 1, 
    inputTypes: ['str'], 
    outputType: 'numeric',
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

export function getCompatibleOperators(availableColumns = [], requiredTypes = null, parentContext = null) {
  console.log('EXPRESSION UTILS: getCompatibleOperators called with columns:', availableColumns);
  console.log('EXPRESSION UTILS: requiredTypes:', requiredTypes);
  console.log('EXPRESSION UTILS: parentContext:', parentContext);

  const allOps = Object.keys(OPERATORS);

  // If no type constraints, return all operators
  if (!requiredTypes || !Array.isArray(requiredTypes)) {
    console.log('EXPRESSION UTILS: No type constraints, returning all operators:', allOps);
    return allOps;
  }

  // Filter operators based on their output type compatibility with required types
  const compatibleOps = allOps.filter(op => {
    const opInfo = getOperatorInfo(op);
    const outputType = opInfo.outputType;

    // Special handling for conditional operators
    if (outputType === 'conditional') {
      return true; // if_else can adapt to any required type
    }

    // Check if operator output is compatible with any of the required types
    return requiredTypes.some(reqType => {
      if (reqType === 'any') return true;

      // Type compatibility rules
      if (outputType === 'numeric' && (reqType === 'numeric')) return true;
      if (outputType === reqType) return true;

      return false;
    });
  });

  console.log('EXPRESSION UTILS: Compatible operators for types', requiredTypes, ':', compatibleOps);
  return compatibleOps;
}

export function getTypeFromValue(value) {
  if (typeof value === 'number') {
    return 'numeric';
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

  if (expr.type === 'column') {
    const col = availableColumns.find(c => c.name === expr.columnName);
    return col ? col.dtype : 'unknown';
  }

  if (expr.type === 'dynamic') {
    const opInfo = getOperatorInfo(expr.operator);
    if (opInfo) {
      return opInfo.outputType;
    }
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
      if (parentExpressionContext && parentExpressionContext.requiredType && 
          parentExpressionContext.requiredType !== null && 
          parentExpressionContext.requiredType !== undefined) {
        // If parent has specific type requirements, use those
        if (Array.isArray(parentExpressionContext.requiredType)) {
          // Filter out null/undefined values
          const validTypes = parentExpressionContext.requiredType.filter(t => t !== null && t !== undefined);
          return validTypes.length > 0 ? validTypes : ['numeric', 'str', 'bool'];
        }
        return [parentExpressionContext.requiredType];
      }
      // If no parent constraint, allow any type but both branches must match
      return ['numeric', 'str', 'bool']; 
    }
  }

  // For operators with specific input types, return them directly
  if (opInfo.inputTypes && opInfo.inputTypes.length > 0 && !opInfo.inputTypes.includes('any')) {
    // Handle variable-length operators that take the same type for all args
    if (argIndex >= opInfo.inputTypes.length) {
      // For operators like 'add' that can take multiple args of the same type
      return opInfo.inputTypes;
    }

    // For operators with position-specific types
    if (argIndex < opInfo.inputTypes.length) {
      const requiredType = opInfo.inputTypes[argIndex];
      if (requiredType === 'any') {
        // If this specific position allows 'any', check parent context
        if (parentExpressionContext && parentExpressionContext.requiredType) {
          if (Array.isArray(parentExpressionContext.requiredType)) {
            return parentExpressionContext.requiredType;
          }
          return [parentExpressionContext.requiredType];
        }
        return ['numeric', 'str', 'bool'];
      }
      return [requiredType];
    }
  }

  // For operators with 'any' input types, check if we have parent context
  if (opInfo.inputTypes.includes('any')) {
    if (parentExpressionContext && parentExpressionContext.requiredType) {
      if (Array.isArray(parentExpressionContext.requiredType)) {
        return parentExpressionContext.requiredType;
      }
      return [parentExpressionContext.requiredType];
    }
    return ['numeric', 'str', 'bool']; // fallback to all types
  }

  return opInfo.inputTypes || ['numeric', 'str', 'bool'];
}

export function isTypeCompatible(sourceType, targetTypes) {
  if (!Array.isArray(targetTypes)) {
    targetTypes = [targetTypes];
  }

  // Handle type conversions
  const compatibilityMap = {
    'numeric': ['numeric'],
    'str': ['str', 'object'],
    'object': ['str', 'object'],
    'bool': ['bool']
  };

  const compatibleTypes = compatibilityMap[sourceType] || [sourceType];
  return targetTypes.some(targetType => compatibleTypes.includes(targetType));
}