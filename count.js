const admin = require('firebase-admin');

/**
 * Parse COUNT command and execute count query
 * @param {string} countCommand - The COUNT command string
 * @param {admin.firestore.Firestore} db - Firestore database instance
 * @param {admin.firestore.DocumentReference} currentDocRef - Current document reference (if SETDOC was used)
 * @returns {Promise<number>} - The count result
 */
async function executeCountCommand(countCommand, db, currentDocRef = null) {
  try {
    const parsed = parseCountCommand(countCommand);
    if (!parsed) {
      throw new Error('Invalid COUNT command format. Use: COUNT FROM <collection> [WHERE <conditions>]');
    }

    const { collection, whereConditions } = parsed;
    
    // Determine the base reference
    let baseRef;
    if (currentDocRef) {
      // If SETDOC was used, query the subcollection
      baseRef = currentDocRef.collection(collection);
    } else {
      // Query the main collection
      baseRef = db.collection(collection);
    }

    // Build the query
    let query = baseRef;
    
    // Apply WHERE conditions
    if (whereConditions && whereConditions.length > 0) {
      for (const condition of whereConditions) {
        query = query.where(condition.field, condition.operator, condition.value);
      }
    }

    // Execute count aggregation
    const aggregateQuery = query.aggregate({
      count: admin.firestore.AggregateField.count()
    });

    const snapshot = await aggregateQuery.get();
    return snapshot.data().count;

  } catch (error) {
    throw new Error(`COUNT query failed: ${error.message}`);
  }
}

/**
 * Parse COUNT command string
 * @param {string} command - The COUNT command string
 * @returns {Object|null} - Parsed command object or null if invalid
 */
function parseCountCommand(command) {
  // Remove extra whitespace and normalize
  const normalized = command.trim().replace(/\s+/g, ' ');
  
  // Basic COUNT command pattern
  const countPattern = /^COUNT\s+FROM\s+([^\s]+)(?:\s+WHERE\s+(.+))?$/i;
  const match = normalized.match(countPattern);
  
  if (!match) {
    return null;
  }

  const collection = match[1];
  const whereClause = match[2];

  let whereConditions = [];
  
  if (whereClause) {
    whereConditions = parseWhereConditions(whereClause);
    if (!whereConditions) {
      return null; // Invalid WHERE clause
    }
  }

  return {
    collection,
    whereConditions
  };
}

/**
 * Parse WHERE conditions from the WHERE clause
 * @param {string} whereClause - The WHERE clause string
 * @returns {Array|null} - Array of condition objects or null if invalid
 */
function parseWhereConditions(whereClause) {
  try {
    const conditions = [];
    
    // Split by AND (case insensitive) but be careful with quoted strings
    const andParts = splitByAnd(whereClause);
    
    for (const part of andParts) {
      const condition = parseSingleCondition(part.trim());
      if (!condition) {
        return null; // Invalid condition
      }
      conditions.push(condition);
    }
    
    return conditions;
  } catch (error) {
    return null;
  }
}

/**
 * Split WHERE clause by AND operator, respecting quoted strings
 * @param {string} clause - The WHERE clause
 * @returns {Array} - Array of condition strings
 */
function splitByAnd(clause) {
  const parts = [];
  let current = '';
  let inQuotes = false;
  let quoteChar = '';
  
  for (let i = 0; i < clause.length; i++) {
    const char = clause[i];
    
    if (!inQuotes && (char === '"' || char === "'")) {
      inQuotes = true;
      quoteChar = char;
      current += char;
    } else if (inQuotes && char === quoteChar) {
      inQuotes = false;
      quoteChar = '';
      current += char;
    } else if (!inQuotes && clause.substr(i, 4).toUpperCase() === ' AND') {
      // Check for AND (with space before)
      if (current.trim()) {
        parts.push(current.trim());
        current = '';
      }
      i += 3; // Skip "AND"
    } else {
      current += char;
    }
  }
  
  if (current.trim()) {
    parts.push(current.trim());
  }
  
  return parts;
}

/**
 * Parse a single condition (field operator value)
 * @param {string} condition - The condition string
 * @returns {Object|null} - Condition object or null if invalid
 */
function parseSingleCondition(condition) {
  // Supported operators (ordered by length, longest first to avoid partial matches)
  const operators = ['NOT IN', 'ARRAY_CONTAINS_ANY', 'ARRAY_CONTAINS', '<=', '>=', '!=', 'IN', '=', '<', '>'];
  
  // Try to find an operator
  for (const op of operators) {
    // Try with spaces around operator first, then without spaces
    let opIndex = condition.indexOf(` ${op} `);
    let valueStartOffset = op.length + 2;
    
    if (opIndex === -1) {
      // Try without spaces around operator
      opIndex = condition.indexOf(op);
      valueStartOffset = op.length;
    }
    
    if (opIndex !== -1) {
      const field = condition.substring(0, opIndex).trim();
      let value = condition.substring(opIndex + valueStartOffset).trim();
      
      // Parse value
      const parsedValue = parseValue(value);
      if (parsedValue === null) {
        continue; // Try next operator
      }
      
      // Map operators to Firestore operators
      const firestoreOp = mapOperator(op);
      
      return {
        field,
        operator: firestoreOp,
        value: parsedValue
      };
    }
  }
  
  return null;
}

/**
 * Parse a timestamp value from string
 * @param {string} value - The timestamp string
 * @returns {Date|null} - Parsed Date object or null if invalid
 */
function parseTimestamp(value) {
  // Remove surrounding quotes if present
  const cleanValue = (value.startsWith('"') && value.endsWith('"')) || 
                     (value.startsWith("'") && value.endsWith("'")) 
                     ? value.slice(1, -1) : value;
  
  // Try to parse as Date
  const date = new Date(cleanValue);
  
  // Check if the date is valid
  if (!isNaN(date.getTime())) {
    return date;
  }
  
  return null;
}

/**
 * Parse a value from string, handling quotes and types
 * @param {string} value - The value string
 * @returns {*} - Parsed value or null if invalid
 */
function parseValue(value) {
  // Try to parse as timestamp/date first (before removing quotes)
  const timestampValue = parseTimestamp(value);
  if (timestampValue !== null) {
    return timestampValue;
  }
  
  // Remove surrounding quotes if present
  if ((value.startsWith('"') && value.endsWith('"')) || 
      (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }
  
  // Try to parse as number
  if (!isNaN(value) && value !== '') {
    return parseFloat(value);
  }
  
  // Try to parse as boolean
  if (value.toLowerCase() === 'true') {
    return true;
  }
  if (value.toLowerCase() === 'false') {
    return false;
  }
  
  // Try to parse as null
  if (value.toLowerCase() === 'null') {
    return null;
  }
  
  // Return as string
  return value;
}

/**
 * Map SQL-like operators to Firestore operators
 * @param {string} op - SQL operator
 * @returns {string} - Firestore operator
 */
function mapOperator(op) {
  const operatorMap = {
    '=': '==',
    '!=': '!=',
    '<': '<',
    '<=': '<=',
    '>': '>',
    '>=': '>=',
    'IN': 'in',
    'NOT IN': 'not-in',
    'ARRAY_CONTAINS': 'array-contains',
    'ARRAY_CONTAINS_ANY': 'array-contains-any'
  };
  
  return operatorMap[op] || op;
}

module.exports = {
  executeCountCommand,
  parseCountCommand,
  parseTimestamp
};
