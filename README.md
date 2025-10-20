# Firestore SQL CLI

A simple command-line tool that allows you to query Google Cloud Firestore using SQL syntax, powered by a custom SQL-to-Firestore translator.

## Features

- 🔍 Query Firestore collections using familiar SQL syntax
- 📊 Formatted table output for easy reading
- ⚡ Real-time query execution with timing information
- 🔄 Interactive REPL-style interface
- 🛡️ Error handling with helpful messages
- 📁 **Direct collection paths** in FROM clause for subcollection queries
- 🆘 Built-in help system with command examples
- 🔓 **Firebase Admin SDK** - Bypasses Firestore security rules for full access
- 🆔 **Document IDs included** - All queries automatically include document IDs as "id" field
- 📜 **Query history** - Arrow key navigation through past successful queries
- 🔢 **COUNT(*) aggregation** - Native Firestore aggregation queries for accurate counting

## Installation

1. Clone or download this repository
2. Install dependencies:
   ```bash
   npm install
   ```

## Quick Start with fsql Executable

For convenience, you can use the included `fsql` shell script which provides a simpler interface:

```bash
# Make the script executable (if not already)
chmod +x fsql

# Run the CLI with your project ID
./fsql your-firebase-project-id
```

The `fsql` script automatically:
- Validates that a project ID is provided
- Starts the CLI with the correct configuration
- Provides helpful error messages if something goes wrong

### Adding fsql to your PATH (macOS)

To use `fsql` from anywhere, add it to your PATH:

```bash
# Add to your ~/.zshrc file
echo 'export PATH="$PATH:/Users/franck/src/nutmeg/firestore_sql"' >> ~/.zshrc

# Reload your shell
source ~/.zshrc

# Now you can use fsql from anywhere
fsql your-firebase-project-id
```

## Setup

Before using the CLI, you need to set up authentication for your GCP project. The tool uses Application Default Credentials (ADC). You can set this up in several ways:

### Option 1: Using gcloud CLI (Recommended)
```bash
gcloud auth application-default login
```

### Option 2: Using a service account key
```bash
export GOOGLE_APPLICATION_CREDENTIALS="path/to/your/service-account-key.json"
```

### Option 3: Configure gcloud for the correct project
If you encounter "Missing or insufficient permissions" errors, ensure your gcloud is configured for the correct project:

```bash
# Check your current project
gcloud config get-value project

# Set the correct project (replace with your actual project ID)
gcloud config set project your-project-id

# Update Application Default Credentials to use the correct project
gcloud auth application-default set-quota-project your-project-id

# Verify the configuration
gcloud config list
```

**Common Issue:** If you're getting permission errors, it's often because:
- Your CLI is using a different project ID than your gcloud configuration
- Your Application Default Credentials are pointing to the wrong project
- You need to re-authenticate after changing projects

## Firebase Admin SDK

This CLI uses the **Firebase Admin SDK** instead of the client SDK, which provides several advantages:

### 🔓 **Bypasses Security Rules**
- **No security rule restrictions** - Access any collection regardless of Firestore security rules
- **Full administrative access** - Read/write to all collections and documents
- **Perfect for development and debugging** - No need to modify security rules for testing

### 🛡️ **Secure Authentication**
- Uses **Application Default Credentials (ADC)** from gcloud
- **No API keys in code** - More secure than client SDK
- **Server-side authentication** - Designed for administrative operations

### ⚡ **Better Performance**
- **Direct server access** - No client-side limitations
- **Bulk operations support** - Better for large datasets
- **No rate limiting** - Administrative privileges

## Document IDs

All queries automatically include document IDs as the `id` field:

```sql
FSQL> SELECT * FROM challenges LIMIT 1;
📊 Found 1 result(s) in 89ms
────────────────────────────────────────────────────────────────────────────────
id                   | title                | description          | state             
────────────────────────────────────────────────────────────────────────────────
2GHCA1pwyy23kRz6aIkq | My Challenge        | A great challenge... | active            
────────────────────────────────────────────────────────────────────────────────
```

**Benefits:**
- **Easy document identification** - Always know which document you're looking at
- **Debugging** - Quickly identify specific documents in results
- **No extra queries needed** - ID is included automatically

## Query History

The CLI automatically saves successful queries to `~/.fsql_history` and provides arrow key navigation:

### 📜 **History Features**
- **Automatic saving** - All successful queries are saved to local file
- **Arrow key navigation** - Use ↑/↓ to browse through past queries
- **Persistent storage** - History survives CLI restarts
- **Duplicate prevention** - Recent queries move to top, duplicates removed
- **Size limit** - Keeps last 100 queries to prevent file bloat

### 🎮 **Navigation**
```bash
# Use arrow keys to navigate
↑ (Up arrow)    - Go to previous query in history
↓ (Down arrow)  - Go to next query in history
Enter           - Execute the selected query
```

### 📁 **History File**
- **Location**: `~/.fsql_history` in your home directory
- **Format**: One query per line, most recent first
- **Automatic management** - No manual intervention needed

## COUNT(*) Aggregation

The CLI supports standard SQL `COUNT(*)` aggregation that uses [Firestore's aggregation queries](https://firebase.google.com/docs/firestore/query-data/aggregation-queries#node.js) for accurate counting:

### 🔢 **COUNT(*) Syntax**
```sql
SELECT COUNT(*) FROM <collection> [WHERE <conditions>];
```

### 📊 **Examples**
```sql
-- Count all documents in a collection
SELECT COUNT(*) FROM users;

-- Count with single condition
SELECT COUNT(*) FROM challenges WHERE state = "active";

-- Count with multiple conditions
SELECT COUNT(*) FROM challenges WHERE state = "active" AND type = "public";

-- Count subcollection documents (direct collection path)
SELECT COUNT(*) FROM users/P8RlU12un4UKc0cR1p5DHrtIpdu1/feed WHERE type = "new_public_challenge";

-- Count with timestamp conditions
SELECT COUNT(*) FROM videos WHERE createdAt > "2025-10-10";
SELECT COUNT(*) FROM videos WHERE createdAt >= "2025-10-10T00:00:00Z";
SELECT COUNT(*) FROM videos WHERE createdAt < "2025-12-31";
SELECT COUNT(*) FROM videos WHERE createdAt <= "2025-12-31T23:59:59Z";

-- Count with date range
SELECT COUNT(*) FROM videos WHERE createdAt >= "2025-10-01" AND createdAt < "2025-11-01";
```

### 🎯 **Supported Operators**
- **Equality**: `=`, `!=`
- **Comparison**: `<`, `<=`, `>`, `>=`
- **Logical**: `AND` (multiple conditions)

### ⚡ **Performance Benefits**
- **Native aggregation** - Uses Firestore's built-in count aggregation
- **Efficient** - No need to fetch all documents to count them
- **Accurate** - Server-side counting, not client-side approximation
- **Fast** - Optimized for large datasets

### 📅 **Timestamp Support**
COUNT(*) queries include enhanced timestamp parsing for accurate date comparisons. SELECT commands have limited timestamp support due to FireSQL limitations:

#### **Supported Timestamp Formats**
```sql
-- COUNT(*) queries with timestamps
SELECT COUNT(*) FROM videos WHERE createdAt > "2025-10-10";
SELECT COUNT(*) FROM videos WHERE createdAt > "2025-10-10T00:00:00Z";
SELECT COUNT(*) FROM videos WHERE createdAt > "October 10, 2025";
SELECT COUNT(*) FROM videos WHERE createdAt > "2025-10-10 00:00:00";
SELECT COUNT(*) FROM videos WHERE createdAt <= "2025-12-31T23:59:59Z";

-- SELECT queries with timestamps (limited support)
-- Note: FireSQL has limitations with timestamp comparisons
-- Try these formats to see which works with your data:
SELECT * FROM videos WHERE createdAt > "2025-10-10";
SELECT id, title FROM videos WHERE createdAt >= "2025-10-10T00:00:00Z";
-- Alternative: Use COUNT(*) to verify data exists, then SELECT without timestamp filters
```

#### **Timestamp Features**
- **COUNT(*) Queries** - Full timestamp support with automatic date conversion to proper Date objects
- **SELECT Queries** - Limited support due to FireSQL limitations with Firestore Timestamp comparisons
- **Multiple Formats** - Supports various date formats including ISO dates, natural language dates, and datetime strings
- **All Operators** - Works with `>`, `>=`, `<`, `<=`, `=`, and `!=` operators
- **Quoted Values** - Always wrap timestamp values in quotes (single or double)

#### **Workarounds for SELECT Timestamp Queries**
```sql
-- Method 1: Use COUNT(*) to verify data exists first
SELECT COUNT(*) FROM videos WHERE createdAt > "2025-10-10";

-- Method 2: Get recent data and filter manually
SELECT __name__, createdAt FROM videos ORDER BY createdAt DESC LIMIT 50;

-- Method 3: Try different timestamp formats
SELECT * FROM videos WHERE createdAt > "2025-10-10";
SELECT * FROM videos WHERE createdAt > "2025-10-10T00:00:00Z";
```

#### **Common Use Cases**
```sql
-- Count documents created in a specific month
SELECT COUNT(*) FROM videos WHERE createdAt >= "2025-10-01" AND createdAt < "2025-11-01";

-- Count recent documents (last 30 days from a specific date)
SELECT COUNT(*) FROM videos WHERE createdAt >= "2025-09-10" AND createdAt <= "2025-10-10";

-- Count documents created today
SELECT COUNT(*) FROM videos WHERE createdAt >= "2025-10-10" AND createdAt < "2025-10-11";

-- Count documents with null or missing timestamps
SELECT COUNT(*) FROM videos WHERE createdAt = null;

-- SELECT recent videos with details
SELECT id, title, createdAt FROM videos WHERE createdAt >= "2025-10-01" ORDER BY createdAt DESC LIMIT 10;

-- SELECT videos from a specific date range
SELECT * FROM videos WHERE createdAt >= "2025-10-01" AND createdAt < "2025-11-01" AND published = true;

-- SELECT videos created today
SELECT id, title FROM videos WHERE createdAt >= "2025-10-10" AND createdAt < "2025-10-11";
```

## Usage

### Recommended: Using the fsql executable
```bash
./fsql <project-id>
```

### Alternative: Direct node execution
```bash
node index.js <project-id>
```

Or if you've installed it globally:
```bash
firestore-sql <project-id>
```

### Example

```bash
# Using the fsql executable (recommended)
./fsql my-firestore-project

# Or using node directly
node index.js my-firestore-project
```

This will start an interactive session where you can enter SQL queries:

```
🚀 Initializing FireSQL for project: my-firestore-project
✅ FireSQL initialized successfully!
💡 Type your SQL queries below. Type "exit" or "quit" to stop.

FSQL> SELECT * FROM users LIMIT 5;
🔄 Executing query...
📊 Found 5 result(s) in 234ms
────────────────────────────────────────────────────────────────────────────────
name                 | email                | age                 | city             
────────────────────────────────────────────────────────────────────────────────
John Doe             | john@example.com     | 25                 | New York         
Jane Smith           | jane@example.com     | 30                 | Los Angeles      
Bob Johnson          | bob@example.com      | 35                 | Chicago          
Alice Brown          | alice@example.com    | 28                 | Houston          
Charlie Wilson       | charlie@example.com  | 32                 | Phoenix          
────────────────────────────────────────────────────────────────────────────────

FQL> SELECT name, age FROM users WHERE age > 30;
🔄 Executing query...
📊 Found 2 result(s) in 156ms
────────────────────────────────────────────────────────────────────────────────
id                   | name                 | age                 
────────────────────────────────────────────────────────────────────────────────
user456              | Bob Johnson          | 35                 
user789              | Charlie Wilson       | 32                 
────────────────────────────────────────────────────────────────────────────────

FQL> SELECT COUNT(*) FROM users;
🔄 Executing query...
📊 Found 1 result(s) in 829ms
────────────────────────────────────────────────────────────────────────────────
COUNT(*)            
────────────────────────────────────────────────────────────────────────────────
21                  
────────────────────────────────────────────────────────────────────────────────

FQL> SELECT COUNT(*) FROM challenges WHERE state = "active";
🔄 Executing query...
📊 Found 1 result(s) in 106ms
────────────────────────────────────────────────────────────────────────────────
COUNT(*)            
────────────────────────────────────────────────────────────────────────────────
16                  
────────────────────────────────────────────────────────────────────────────────

FQL> SELECT COUNT(*) FROM videos WHERE createdAt > "2025-10-10";
🔄 Executing query...
📊 Found 1 result(s) in 89ms
────────────────────────────────────────────────────────────────────────────────
COUNT(*)            
────────────────────────────────────────────────────────────────────────────────
42                  
────────────────────────────────────────────────────────────────────────────────

FQL> SELECT id, title FROM videos WHERE createdAt > "2025-10-10" ORDER BY createdAt DESC LIMIT 5;
🔄 Executing query...
📊 Found 5 result(s) in 156ms
────────────────────────────────────────────────────────────────────────────────
id                   | title                | createdAt            
────────────────────────────────────────────────────────────────────────────────
video123             | Latest Video         | 2025-10-15T10:30:00Z
video456             | October Update       | 2025-10-12T14:20:00Z
video789             | New Feature Demo     | 2025-10-11T09:15:00Z
────────────────────────────────────────────────────────────────────────────────

FQL> SELECT COUNT(*) FROM users/P8RlU12un4UKc0cR1p5DHrtIpdu1/feed WHERE type = "new_public_challenge";
🔄 Executing query...
📊 Found 1 result(s) in 89ms
────────────────────────────────────────────────────────────────────────────────
COUNT(*)            
────────────────────────────────────────────────────────────────────────────────
3                   
────────────────────────────────────────────────────────────────────────────────

FQL> HELP
📚 Firestore SQL CLI Commands:
──────────────────────────────────────────────────
FSQL Queries:
  SELECT * FROM collection_name LIMIT 10;
  SELECT field1, field2 FROM collection_name WHERE condition;

Special Commands:
  HELP              - Show this help message
  EXIT/QUIT         - Exit the CLI

Examples:
  SELECT * FROM users/P8RlU12un4UKc0cR1p5DHrtIpdu1/feed;
  SELECT COUNT(*) FROM posts/postId/comments;
──────────────────────────────────────────────────

FSQL> exit
👋 Goodbye!
```

## Special Commands

### Available Commands

- `HELP` - Show available commands and examples
- `EXIT` or `QUIT` - Exit the CLI

### Subcollection Queries

You can query subcollections directly using collection paths in the FROM clause:

```sql
-- Query a user's feed subcollection
SELECT * FROM users/P8RlU12un4UKc0cR1p5DHrtIpdu1/feed;

-- Count comments in a post's subcollection
SELECT COUNT(*) FROM posts/postId/comments WHERE approved = true;

-- Query notifications for a specific user
SELECT * FROM users/userId/notifications WHERE read = false;
```

**Benefits:**
- **Direct access** - No need for separate commands
- **Simpler syntax** - Collection paths work directly in FROM clause
- **More intuitive** - Standard SQL approach to accessing nested data

## Supported SQL Features

This custom SQL translator supports:

- `SELECT` queries with `WHERE`, `ORDER BY`
- Field selection (`SELECT *` or `SELECT field1, field2`)
- Multiple condition support with `AND` and `OR` operators
- All comparison operators: `=`, `!=`, `>`, `>=`, `<`, `<=`
- Automatic type detection (strings, numbers, timestamps, booleans)
- `toDate()` function for human-readable timestamp formatting
- Subcollection queries via direct collection paths in FROM clause
- Document ID inclusion as `__name__` field
- **Automatic 'id' to '__name__' conversion** - Use 'id' in queries, automatically converted to '__name__'

### Examples of supported queries:

```sql
-- Basic select
SELECT * FROM users;

-- Field selection
SELECT name, email FROM users WHERE age > 25;

-- Ordering
SELECT * FROM products ORDER BY price DESC;

-- Multiple conditions with AND
SELECT * FROM users WHERE firstname = 'franck' AND age > 25;

-- Multiple conditions with OR
SELECT * FROM users WHERE city = 'New York' OR city = 'Los Angeles';

-- Timestamp comparisons
SELECT * FROM videos WHERE createdAt > '10-18-2025';

-- Subcollection queries (direct collection paths)
SELECT * FROM users/P8RlU12un4UKc0cR1p5DHrtIpdu1/feed WHERE type = 'new_public_challenge';
SELECT COUNT(*) FROM posts/postId/comments WHERE approved = true;

-- Document ID usage (both 'id' and '__name__' work)
SELECT id, name, email FROM users;
SELECT __name__, toDate(createdAt) FROM users;

-- Date formatting with toDate() function
SELECT name, toDate(updatedAt), email FROM users;
SELECT toDate(createdAt) FROM videos ORDER BY createdAt DESC;
```

## Document ID Field

### Automatic 'id' to '__name__' Conversion

For user convenience, the SQL translator automatically converts `id` field references to `__name__` (Firestore's document ID field) in all query contexts:

- **SELECT fields**: `SELECT id, name FROM users;` → `SELECT __name__, name FROM users;`
- **WHERE conditions**: `SELECT * FROM users WHERE id = "abc123";` → `SELECT * FROM users WHERE __name__ = "abc123";`
- **ORDER BY clauses**: `SELECT * FROM users ORDER BY id ASC;` → `SELECT * FROM users ORDER BY __name__ ASC;`
- **toDate() functions**: `SELECT toDate(id) FROM users;` → `SELECT toDate(__name__) FROM users;`

### Examples

```sql
-- All of these work and are automatically converted:
SELECT id, name, email FROM users;
SELECT * FROM users WHERE id = "user123";
SELECT * FROM users ORDER BY id DESC;
SELECT toDate(id) FROM users;

-- You can still use __name__ directly if preferred:
SELECT __name__, name, email FROM users;
SELECT * FROM users WHERE __name__ = "user123";
```

## toDate() Function

The `toDate()` function formats timestamp fields into human-readable date strings in `MM/DD/YY hh:mm:ss` format.

### Usage
```sql
SELECT toDate(fieldName) FROM collection_name;
```

### Features
- **Multiple timestamp types**: Supports Firestore Timestamps, JavaScript Date objects, ISO strings, and Unix timestamps
- **Local time formatting**: Displays dates in your local timezone
- **Graceful fallback**: Returns the original value if the field is not a valid date
- **Null handling**: Returns `null` for missing or null timestamp fields

### Examples
```sql
-- Format a single timestamp field
SELECT toDate(createdAt) FROM users;

-- Combine with other fields
SELECT __name__, name, toDate(createdAt) FROM users;

-- Multiple timestamp fields
SELECT toDate(createdAt), toDate(updatedAt) FROM posts;

-- With WHERE conditions
SELECT toDate(createdAt) FROM videos WHERE userId = 'user123';
```

### Output Format
- **Format**: `MM/DD/YY hh:mm:ss`
- **Example**: `10/19/25 22:38:40`
- **Timezone**: Local timezone of the system running the CLI

## Limitations

- Only `SELECT` queries are supported
- No `JOIN` operations
- No `GROUP BY` or aggregation functions
- No `LIKE` pattern matching
- OR operations are not yet fully supported in complex nested conditions
- No `NOT` condition support

## Authentication

The tool requires proper authentication to access your Firestore database. Make sure you have:

1. The necessary permissions to read from your Firestore database
2. Application Default Credentials set up (see Setup section above)
3. The correct project ID

## Troubleshooting

### Authentication Errors
If you get authentication errors, make sure:
- You're logged in with `gcloud auth application-default login`
- Your account has the necessary Firestore permissions
- The project ID is correct

### "Missing or insufficient permissions" Error
This is the most common error and usually indicates a project configuration issue:

1. **Check your project ID:**
   ```bash
   gcloud config get-value project
   ```

   If not the proper project, set it via:
   ```bash
   gcloud config set project
   ```

2. **Verify you're using the correct project in the CLI:**
   ```bash
   node index.js your-actual-project-id
   ```

3. **Update Application Default Credentials:**
   ```bash
   gcloud auth application-default set-quota-project your-actual-project-id
   ```

4. **Re-authenticate if needed:**
   ```bash
   gcloud auth application-default login
   ```

### Query Errors
- Check your SQL syntax
- Ensure collection names are correct
- Verify field names exist in your documents
- Remember FireSQL limitations (see Limitations section)

### Project ID Mismatch
If you can query some collections but not others, you might be using the wrong project:
- Use `gcloud projects list` to see all available projects
- Ensure the project ID in your CLI command matches your gcloud configuration
- Check that the collection exists in the project you're querying

## License

MIT
