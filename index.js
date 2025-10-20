#!/usr/bin/env node

const { program } = require('commander');
const readline = require('readline');
const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');
const { SQLTranslator } = require('./sql-translator');

// CLI configuration
program
  .name('firestore-sql')
  .description('Query Firestore using SQL syntax')
  .version('1.0.0')
  .argument('<project-id>', 'GCP project ID')
  .action(async (projectId) => {
    try {
      await runCLI(projectId);
    } catch (error) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  });

// Query history management
const HISTORY_FILE = 'query_history.txt';
const MAX_HISTORY_SIZE = 100;

program.parse();

function loadQueryHistory() {
  try {
    if (fs.existsSync(HISTORY_FILE)) {
      const content = fs.readFileSync(HISTORY_FILE, 'utf8');
      return content.split('\n').filter(line => line.trim() !== '');
    }
  } catch (error) {
    console.log('⚠️  Could not load query history:', error.message);
  }
  return [];
}

function saveQueryToHistory(query) {
  try {
    let history = loadQueryHistory();
    
    // Remove duplicate if it exists
    history = history.filter(item => item !== query);
    
    // Add to beginning of history
    history.unshift(query);
    
    // Limit history size
    if (history.length > MAX_HISTORY_SIZE) {
      history = history.slice(0, MAX_HISTORY_SIZE);
    }
    
    // Save to file
    fs.writeFileSync(HISTORY_FILE, history.join('\n') + '\n');
  } catch (error) {
    console.log('⚠️  Could not save query to history:', error.message);
  }
}

/**
 * Preprocess SELECT queries to handle timestamp values
 * @param {string} query - The SQL query string
 * @returns {string} - The processed query with timestamp values converted
 */
function preprocessSelectQuery(query) {
  // Look for WHERE clauses with timestamp comparisons
  // Pattern: WHERE field operator "timestamp_value"
  const timestampPattern = /WHERE\s+(\w+)\s*([><=!]+)\s*(["'][^"']*["'])/gi;
  
  return query.replace(timestampPattern, (match, field, operator, value) => {
    // Try to parse the value as a timestamp
    const timestampValue = parseTimestamp(value);
    
    if (timestampValue !== null) {
      // Try using a simple ISO string format that FireSQL might recognize
      // This is more likely to work with FireSQL's SQL parser
      const isoString = timestampValue.toISOString();
      return `WHERE ${field} ${operator} "${isoString}"`;
    }
    
    // If not a valid timestamp, return the original match
    return match;
  });
}

async function runCLI(projectId) {
  console.log(`🚀 Initializing FireSQL with Admin SDK for project: ${projectId}`);
  
  // Initialize Firebase Admin SDK
  // This will use Application Default Credentials (ADC) and bypass security rules
  if (!admin.apps.length) {
    admin.initializeApp({
      projectId: projectId,
      // Uses Application Default Credentials automatically
    });
  }
  
  const db = admin.firestore();
  
  // Initialize custom SQL translator with Admin SDK database reference
  let sqlTranslator = new SQLTranslator(db);
  
  console.log('✅ Custom SQL translator initialized successfully with Admin SDK!');
  console.log('🔓 Admin SDK bypasses Firestore security rules');
  console.log('🆔 Document IDs are automatically included as "__name__" field in all query results');
  console.log('📜 Query history loaded - use ↑/↓ arrows to navigate past queries');
  console.log('💡 Type your SQL queries below. Type "exit" or "quit" to stop.');
  console.log('💡 Use collection paths directly in FROM clause (e.g., FROM users/userId/feed).');
  console.log('💡 Use "HELP" to see available commands.\n');
  
  // Load query history
  const queryHistory = loadQueryHistory();
  
  // Create readline interface with history support
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: 'SQL> ',
    historySize: 100,
    history: queryHistory
  });
  
  rl.prompt();
  
  // Interactive query loop
  rl.on('line', async (input) => {
    const query = input.trim();
    
    // Check for exit commands
    if (query.toLowerCase() === 'exit' || query.toLowerCase() === 'quit') {
      console.log('👋 Goodbye!');
      rl.close();
      return;
    }
    
    // Skip empty queries
    if (query === '') {
      rl.prompt();
      return;
    }
    
    
    // Handle HELP command
    if (query.toUpperCase() === 'HELP') {
      showHelp();
      rl.prompt();
      return;
    }
    
    
    
    try {
      // Execute the query with document ID included
      console.log('🔄 Executing query...');
      const startTime = Date.now();
      
      const results = await sqlTranslator.query(query, { includeId: true });
      
      const endTime = Date.now();
      const executionTime = endTime - startTime;
      
      // Save successful query to history
      saveQueryToHistory(query);
      
      // Display results
      displayResults(results, executionTime);
      
    } catch (error) {
      console.error('❌ Query Error:', error.message);
      console.log('💡 Please check your SQL syntax and try again.\n');
    }
    
    rl.prompt();
  });
  
  rl.on('close', () => {
    console.log('👋 Goodbye!');
    process.exit(0);
  });
}

function showHelp() {
  console.log('\n📚 Firestore SQL CLI Commands:');
  console.log('─'.repeat(50));
  console.log('SQL Queries:');
  console.log('  SELECT * FROM collection_name');
  console.log('  SELECT field1, field2 FROM collection_name WHERE condition');
  console.log('  SELECT * FROM collection_name WHERE field = "value" AND other > 10');
  console.log('  SELECT * FROM collection_name ORDER BY field ASC');
  console.log('  SELECT * FROM collection_name WHERE field = "value" ORDER BY field DESC');
  console.log('  SELECT * FROM collection_name ORDER BY field DESC LIMIT 10');
  console.log('  SELECT id, toDate(createdAt) FROM collection_name');
  console.log('  SELECT COUNT(*) FROM collection_name');
  console.log('  SELECT COUNT(*) FROM collection_name WHERE field = value');
  console.log('');
  console.log('Special Commands:');
  console.log('  HELP              - Show this help message');
  console.log('  EXIT/QUIT         - Exit the CLI');
  console.log('');
  console.log('Features:');
  console.log('  🆔 Document IDs automatically included as "__name__" field');
  console.log('  🔄 Automatic "id" to "__name__" conversion for user convenience');
  console.log('  🔓 Admin SDK bypasses all security rules');
  console.log('  📊 Formatted table output with timing');
  console.log('  📜 Query history - use ↑/↓ arrows to navigate past queries');
  console.log('  🎯 Custom SQL parser with support for AND/OR conditions');
  console.log('  📅 Automatic timestamp parsing and type detection');
  console.log('  📆 toDate() function for human-readable timestamp formatting');
  console.log('  🔢 COUNT(*) aggregation support');
  console.log('  📊 LIMIT clause support for result pagination');
  console.log('');
  console.log('Examples:');
  console.log('  SELECT * FROM challenges WHERE state = "active"');
  console.log('  SELECT id, title, description FROM challenges');
  console.log('  SELECT * FROM users WHERE firstname = "franck"');
  console.log('  SELECT * FROM videos WHERE userId = "P8RlU12un4UKc0cR1p5DHrtIpdu1" AND createdAt > "10-18-2025"');
  console.log('  SELECT * FROM videos ORDER BY createdAt DESC');
  console.log('  SELECT * FROM users ORDER BY createdAt DESC LIMIT 5');
  console.log('  SELECT id, toDate(createdAt) FROM users');
  console.log('  SELECT name, toDate(updatedAt) FROM posts');
  console.log('  SELECT COUNT(*) FROM users');
  console.log('  SELECT COUNT(*) FROM challenges WHERE state = "active"');
  console.log('  SELECT COUNT(*) FROM users/P8RlU12un4UKc0cR1p5DHrtIpdu1/feed WHERE type = "new_public_challenge"');
  console.log('');
  console.log('💡 Use collection paths directly in FROM clause for subcollections:');
  console.log('   SELECT * FROM users/userId/feed');
  console.log('   SELECT COUNT(*) FROM posts/postId/comments');
  console.log('─'.repeat(50));
  console.log('');
}

function displayResults(results, executionTime) {
  if (!results || results.length === 0) {
    console.log('📭 No results found.');
    console.log(`⏱️  Query executed in ${executionTime}ms\n`);
    return;
  }
  
  console.log(`📊 Found ${results.length} result(s) in ${executionTime}ms`);
  console.log('─'.repeat(80));
  
  // Get all unique keys from all results
  const allKeys = [...new Set(results.flatMap(result => Object.keys(result)))];
  
  // Display header
  const header = allKeys.map(key => key.padEnd(20)).join(' | ');
  console.log(header);
  console.log('─'.repeat(header.length));
  
  // Display each row
  results.forEach((result, index) => {
    const row = allKeys.map(key => {
      const value = result[key];
      const displayValue = value === null ? 'null' : 
                          value === undefined ? 'undefined' : 
                          typeof value === 'object' ? JSON.stringify(value) : 
                          String(value);
      return displayValue.padEnd(20);
    }).join(' | ');
    
    console.log(row);
    
    // Limit display to first 100 results to avoid overwhelming output
    if (index >= 99 && results.length > 100) {
      console.log(`... and ${results.length - 100} more results`);
      return;
    }
  });
  
  console.log('─'.repeat(80));
  console.log('');
}
