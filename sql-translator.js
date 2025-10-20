const admin = require('firebase-admin');

/**
 * Custom SQL to Firestore Query Translator
 * Supports: SELECT, WHERE, ORDER BY, AND, OR, parentheses, different field types
 */
class SQLTranslator {
  constructor(db) {
    this.db = db;
  }

  /**
   * Parse and execute a SQL SELECT query
   * @param {string} sql - SQL query string
   * @param {Object} options - Query options (includeId, etc.)
   * @returns {Promise<Array>} Query results
   */
  async query(sql, options = {}) {
    const parsed = this.parseSQL(sql);
    const results = await this.executeQuery(parsed, options);
    return results;
  }

  /**
   * Parse SQL query into structured object
   * @param {string} sql - SQL query string
   * @returns {Object} Parsed query object
   */
  parseSQL(sql) {
    // Remove extra whitespace and normalize
    const normalizedSQL = sql.trim().replace(/\s+/g, ' ');
    
    // Basic SQL structure validation
    if (!normalizedSQL.toUpperCase().startsWith('SELECT')) {
      throw new Error('Only SELECT queries are supported');
    }

    // Parse SELECT clause
    const selectMatch = normalizedSQL.match(/^SELECT\s+(.+?)\s+FROM\s+/i);
    if (!selectMatch) {
      throw new Error('Invalid SELECT syntax');
    }

    const selectFields = this.parseSelectFields(selectMatch[1]);

    // Parse FROM clause
    const fromMatch = normalizedSQL.match(/FROM\s+([^\s]+(?:\s+[^\s]+)*?)(?:\s+WHERE|\s+ORDER\s+BY|\s+LIMIT|\s*$)/i);
    if (!fromMatch) {
      throw new Error('Invalid FROM syntax');
    }

    const collectionPath = fromMatch[1].trim();

    // Parse WHERE clause
    let whereConditions = null;
    const whereMatch = normalizedSQL.match(/WHERE\s+(.+?)(?:\s+ORDER\s+BY|\s+LIMIT|\s*$)/i);
    if (whereMatch) {
      whereConditions = this.parseWhereConditions(whereMatch[1]);
    }

    // Parse ORDER BY clause
    let orderBy = null;
    const orderByMatch = normalizedSQL.match(/ORDER\s+BY\s+([^\s]+)\s+(ASC|DESC)(?:\s+LIMIT|\s*$)/i);
    if (orderByMatch) {
      orderBy = {
        field: this.convertIdToName(orderByMatch[1]),
        direction: orderByMatch[2].toUpperCase()
      };
    }

    // Parse LIMIT clause
    let limit = null;
    const limitMatch = normalizedSQL.match(/LIMIT\s+(\d+)/i);
    if (limitMatch) {
      limit = parseInt(limitMatch[1], 10);
      if (isNaN(limit) || limit < 0) {
        throw new Error('LIMIT must be a positive integer');
      }
    }

    // Validate COUNT(*) queries
    const isCountQuery = selectFields.length === 1 && 
                        selectFields[0].type === 'aggregation' && 
                        selectFields[0].function === 'COUNT';
    
    if (isCountQuery) {
      // COUNT(*) queries cannot have ORDER BY
      if (orderBy) {
        throw new Error('ORDER BY is not supported with COUNT(*) queries');
      }
    }

    return {
      select: selectFields,
      from: collectionPath,
      where: whereConditions,
      orderBy: orderBy,
      limit: limit
    };
  }

  /**
   * Convert 'id' field references to '__name__' for Firestore compatibility
   * @param {string} fieldName - Field name to potentially convert
   * @returns {string} Converted field name
   */
  convertIdToName(fieldName) {
    return fieldName === 'id' ? '__name__' : fieldName;
  }

  /**
   * Parse SELECT fields
   * @param {string} fieldsStr - Fields string (e.g., "*" or "field1, field2" or "toDate(field)" or "COUNT(*)")
   * @returns {Array} Array of field objects with name and formatting info
   */
  parseSelectFields(fieldsStr) {
    const trimmed = fieldsStr.trim();
    
    // Check for COUNT(*) aggregation
    const countMatch = trimmed.match(/^COUNT\(\*\)$/i);
    if (countMatch) {
      return [{
        type: 'aggregation',
        function: 'COUNT',
        field: '*'
      }];
    }
    
    if (trimmed === '*') {
      return ['*'];
    }
    
    return fieldsStr.split(',').map(field => {
      const trimmed = field.trim();
      
      // Check for toDate() function
      const toDateMatch = trimmed.match(/^toDate\(([^)]+)\)$/i);
      if (toDateMatch) {
        return {
          type: 'function',
          function: 'toDate',
          field: this.convertIdToName(toDateMatch[1].trim())
        };
      }
      
      // Check for prettyJson() function
      const prettyJsonMatch = trimmed.match(/^prettyJson\(([^)]+)\)$/i);
      if (prettyJsonMatch) {
        return {
          type: 'function',
          function: 'prettyJson',
          field: this.convertIdToName(prettyJsonMatch[1].trim())
        };
      }
      
      // Regular field
      return {
        type: 'field',
        field: this.convertIdToName(trimmed)
      };
    });
  }

  /**
   * Parse WHERE conditions with support for AND, OR, parentheses
   * @param {string} whereStr - WHERE clause string
   * @returns {Object} Parsed conditions tree
   */
  parseWhereConditions(whereStr) {
    // This is a simplified parser - in a production system you'd want a proper recursive descent parser
    // For now, we'll handle basic AND/OR combinations without complex nesting
    
    // Split by AND/OR while preserving the operators
    const tokens = this.tokenizeWhereClause(whereStr);
    return this.parseConditionTokens(tokens);
  }

  /**
   * Tokenize WHERE clause into condition tokens
   * @param {string} whereStr - WHERE clause string
   * @returns {Array} Array of tokens
   */
  tokenizeWhereClause(whereStr) {
    const tokens = [];
    let current = '';
    let inQuotes = false;
    let quoteChar = '';
    
    for (let i = 0; i < whereStr.length; i++) {
      const char = whereStr[i];
      
      if (!inQuotes && (char === '"' || char === "'")) {
        inQuotes = true;
        quoteChar = char;
        current += char;
      } else if (inQuotes && char === quoteChar) {
        inQuotes = false;
        quoteChar = '';
        current += char;
      } else if (!inQuotes && (char === ' ' || char === '\t')) {
        if (current.trim()) {
          tokens.push(current.trim());
          current = '';
        }
      } else {
        current += char;
      }
    }
    
    if (current.trim()) {
      tokens.push(current.trim());
    }
    
    // Post-process tokens to split field names from operators
    const processedTokens = [];
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      
      // Check if token contains an operator directly attached to a field name
      const operatorMatch = token.match(/^([a-zA-Z_][a-zA-Z0-9_]*)([=!<>]+)(.*)$/);
      if (operatorMatch) {
        processedTokens.push(operatorMatch[1]); // field name
        processedTokens.push(operatorMatch[2]); // operator
        if (operatorMatch[3]) {
          processedTokens.push(operatorMatch[3]); // value
        }
      } else {
        processedTokens.push(token);
      }
    }
    
    return processedTokens;
  }

  /**
   * Parse condition tokens into condition tree
   * @param {Array} tokens - Array of tokens
   * @returns {Object} Parsed conditions
   */
  parseConditionTokens(tokens) {
    if (tokens.length === 0) return null;
    
    // Handle simple case: single condition
    if (tokens.length === 3) {
      return this.parseSimpleCondition(tokens);
    }
    
    // Find AND/OR operators and split the tokens
    const logicalOperators = ['AND', 'OR'];
    let operatorIndex = -1;
    let operator = null;
    
    for (let i = 1; i < tokens.length - 1; i++) {
      if (logicalOperators.includes(tokens[i].toUpperCase())) {
        operatorIndex = i;
        operator = tokens[i].toUpperCase();
        break;
      }
    }
    
    if (operatorIndex === -1) {
      // No logical operator found, treat as single condition
      if (tokens.length === 3) {
        return this.parseSimpleCondition(tokens);
      } else {
        throw new Error('Invalid condition format - expected field operator value');
      }
    }
    
    // Split tokens around the logical operator
    const leftTokens = tokens.slice(0, operatorIndex);
    const rightTokens = tokens.slice(operatorIndex + 1);
    
    // Parse left and right sides
    const leftCondition = this.parseConditionTokens(leftTokens);
    const rightCondition = this.parseConditionTokens(rightTokens);
    
    return {
      type: 'logical',
      operator: operator,
      left: leftCondition,
      right: rightCondition
    };
  }

  /**
   * Parse a simple condition (field operator value)
   * @param {Array} tokens - Three tokens: [field, operator, value]
   * @returns {Object} Simple condition object
   */
  parseSimpleCondition(tokens) {
    if (tokens.length < 3) {
      throw new Error('Invalid condition format');
    }
    
    const field = this.convertIdToName(tokens[0]);
    const operator = tokens[1];
    const value = this.parseValue(tokens[2]);
    
    return {
      type: 'condition',
      field: field,
      operator: operator,
      value: value
    };
  }

  /**
   * Parse a value string into appropriate type
   * @param {string} valueStr - Value string (may be quoted)
   * @returns {*} Parsed value
   */
  parseValue(valueStr) {
    // Remove quotes if present
    const trimmed = valueStr.trim();
    
    if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || 
        (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
      const unquoted = trimmed.slice(1, -1);
      
      // Try to parse as timestamp
      const timestamp = this.parseTimestamp(unquoted);
      if (timestamp !== null) {
        return timestamp;
      }
      
      // Try to parse as number
      if (!isNaN(unquoted) && unquoted !== '') {
        return parseFloat(unquoted);
      }
      
      // Return as string
      return unquoted;
    }
    
    // Try to parse as number
    if (!isNaN(trimmed) && trimmed !== '') {
      return parseFloat(trimmed);
    }
    
    // Try to parse as boolean
    if (trimmed.toLowerCase() === 'true') return true;
    if (trimmed.toLowerCase() === 'false') return false;
    if (trimmed.toLowerCase() === 'null') return null;
    
    // Return as string
    return trimmed;
  }

  /**
   * Parse timestamp string into Date object
   * @param {string} timestampStr - Timestamp string
   * @returns {Date|null} Parsed date or null if not a valid timestamp
   */
  parseTimestamp(timestampStr) {
    // Try various timestamp formats
    const formats = [
      // ISO format
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/,
      // Date format
      /^\d{4}-\d{2}-\d{2}$/,
      // MM-DD-YYYY format
      /^\d{2}-\d{2}-\d{4}$/,
      // Natural language dates
      /^(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}$/i
    ];
    
    for (const format of formats) {
      if (format.test(timestampStr)) {
        const date = new Date(timestampStr);
        if (!isNaN(date.getTime())) {
          return date;
        }
      }
    }
    
    return null;
  }

  /**
   * Format a date/timestamp value to MM/DD/YY hh:mm:ss format
   * @param {*} value - The value to format (Date, Firestore Timestamp, string, etc.)
   * @returns {string} Formatted date string or original value if not a date
   */
  formatToDate(value) {
    if (!value) return value;
    
    let date;
    
    // Handle different timestamp types
    if (value instanceof Date) {
      date = value;
    } else if (value && typeof value === 'object' && value.toDate) {
      // Firestore Timestamp
      date = value.toDate();
    } else if (typeof value === 'string') {
      // Try to parse string as date
      date = new Date(value);
      if (isNaN(date.getTime())) {
        return value; // Return original if not a valid date
      }
    } else if (typeof value === 'number') {
      // Unix timestamp (seconds or milliseconds)
      date = new Date(value > 1000000000000 ? value : value * 1000);
      if (isNaN(date.getTime())) {
        return value; // Return original if not a valid date
      }
    } else {
      return value; // Return original value if not a date type
    }
    
    // Format as MM/DD/YY hh:mm:ss (using local time)
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = String(date.getFullYear()).slice(-2);
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    
    return `${month}/${day}/${year} ${hours}:${minutes}:${seconds}`;
  }

  /**
   * Execute parsed query against Firestore
   * @param {Object} parsed - Parsed query object
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Query results
   */
  async executeQuery(parsed, options = {}) {
    let query;
    
    // Create Firestore collection reference
    query = this.db.collection(parsed.from);
    
    // Check if this is a COUNT(*) query
    const isCountQuery = parsed.select.length === 1 && 
                        parsed.select[0].type === 'aggregation' && 
                        parsed.select[0].function === 'COUNT';
    
    if (isCountQuery) {
      // Handle COUNT(*) aggregation
      return await this.executeCountQuery(query, parsed.where);
    }
    
    // Apply WHERE conditions
    if (parsed.where) {
      query = this.applyWhereConditions(query, parsed.where);
    }
    
    // Apply ORDER BY
    if (parsed.orderBy) {
      query = query.orderBy(parsed.orderBy.field, parsed.orderBy.direction.toLowerCase());
    }
    
    // Apply LIMIT
    if (parsed.limit) {
      query = query.limit(parsed.limit);
    }
    
    // Execute query
    const snapshot = await query.get();
    
    // Process results
    const results = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      
      // Include document ID if requested
      if (options.includeId) {
        data.__name__ = doc.id;
      }
      
      // Filter fields if not SELECT *
      if (!parsed.select.includes('*')) {
        const filteredData = {};
        parsed.select.forEach(fieldObj => {
          if (typeof fieldObj === 'string') {
            // Handle legacy string format for backward compatibility
            if (fieldObj === '__name__' && options.includeId) {
              filteredData[fieldObj] = doc.id;
            } else if (data.hasOwnProperty(fieldObj)) {
              filteredData[fieldObj] = data[fieldObj];
            }
          } else if (fieldObj.type === 'field') {
            // Regular field
            if (fieldObj.field === '__name__' && options.includeId) {
              filteredData[fieldObj.field] = doc.id;
            } else if (data.hasOwnProperty(fieldObj.field)) {
              filteredData[fieldObj.field] = data[fieldObj.field];
            }
          } else if (fieldObj.type === 'function' && fieldObj.function === 'toDate') {
            // toDate() function
            const fieldName = fieldObj.field;
            const displayName = `toDate(${fieldName})`;
            
            if (fieldName === '__name__' && options.includeId) {
              // Document ID is not a date, so just return it as is
              filteredData[displayName] = doc.id;
            } else if (data.hasOwnProperty(fieldName)) {
              // Format the field value as a date
              filteredData[displayName] = this.formatToDate(data[fieldName]);
            } else {
              // Field doesn't exist, return null
              filteredData[displayName] = null;
            }
          } else if (fieldObj.type === 'function' && fieldObj.function === 'prettyJson') {
            // prettyJson() function
            const fieldName = fieldObj.field;
            const displayName = `prettyJson(${fieldName})`;
            
            if (fieldName === '*' || fieldName === '__name__') {
              // For prettyJson(*), format the entire document
              const fullDoc = { ...data };
              if (options.includeId) {
                fullDoc.id = doc.id;
              }
              filteredData[displayName] = JSON.stringify(fullDoc, null, 2);
            } else if (data.hasOwnProperty(fieldName)) {
              // Format the specific field value as JSON
              filteredData[displayName] = JSON.stringify(data[fieldName], null, 2);
            } else {
              // Field doesn't exist, return null
              filteredData[displayName] = null;
            }
          }
        });
        results.push(filteredData);
      } else {
        results.push(data);
      }
    });
    
    return results;
  }

  /**
   * Execute COUNT(*) query against Firestore
   * @param {Object} query - Firestore query object
   * @param {Object} whereConditions - Parsed WHERE conditions
   * @returns {Promise<Array>} Query results with count
   */
  async executeCountQuery(query, whereConditions) {
    // Apply WHERE conditions
    if (whereConditions) {
      query = this.applyWhereConditions(query, whereConditions);
    }
    
    // Execute count aggregation
    const aggregateQuery = query.aggregate({
      count: admin.firestore.AggregateField.count()
    });
    
    const snapshot = await aggregateQuery.get();
    const count = snapshot.data().count;
    
    // Return result in the same format as regular queries
    return [{
      'COUNT(*)': count
    }];
  }

  /**
   * Apply WHERE conditions to Firestore query
   * @param {Object} query - Firestore query object
   * @param {Object} conditions - Parsed conditions
   * @returns {Object} Modified query
   */
  applyWhereConditions(query, conditions) {
    if (!conditions) return query;
    
    if (conditions.type === 'condition') {
      return this.applySimpleCondition(query, conditions);
    } else if (conditions.type === 'logical') {
      // For AND/OR operations, we need to handle them differently
      // Firestore doesn't support complex OR operations directly
      // For now, we'll handle simple AND cases
      if (conditions.operator === 'AND') {
        query = this.applyWhereConditions(query, conditions.left);
        query = this.applyWhereConditions(query, conditions.right);
        return query;
      } else if (conditions.operator === 'OR') {
        // For OR operations, we'll need to execute multiple queries and combine results
        // This is a limitation - in production you might want to handle this differently
        throw new Error('OR operations are not yet supported in this implementation');
      }
    }
    
    return query;
  }

  /**
   * Apply a simple condition to Firestore query
   * @param {Object} query - Firestore query object
   * @param {Object} condition - Simple condition object
   * @returns {Object} Modified query
   */
  applySimpleCondition(query, condition) {
    const { field, operator, value } = condition;
    
    switch (operator) {
      case '=':
        return query.where(field, '==', value);
      case '!=':
        return query.where(field, '!=', value);
      case '>':
        return query.where(field, '>', value);
      case '>=':
        return query.where(field, '>=', value);
      case '<':
        return query.where(field, '<', value);
      case '<=':
        return query.where(field, '<=', value);
      default:
        throw new Error(`Unsupported operator: ${operator}`);
    }
  }
}

module.exports = { SQLTranslator };
