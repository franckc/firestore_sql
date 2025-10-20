# Firestore SQL CLI

A simple command-line tool that allows you to query Google Cloud Firestore using SQL syntax, powered by the [FireSQL](https://github.com/jsayol/firesql) library.

## Features

- 🔍 Query Firestore collections using familiar SQL syntax
- 📊 Formatted table output for easy reading
- ⚡ Real-time query execution with timing information
- 🔄 Interactive REPL-style interface
- 🛡️ Error handling with helpful messages
- 📁 **SETDOC command** for querying specific documents and subcollections
- 🆘 Built-in help system with command examples
- 🔓 **Firebase Admin SDK** - Bypasses Firestore security rules for full access
- 🆔 **Document IDs included** - All queries automatically include document IDs as "id" field
- 📜 **Query history** - Arrow key navigation through past successful queries

## Installation

1. Clone or download this repository
2. Install dependencies:
   ```bash
   npm install --legacy-peer-deps
   ```
   
   **Note:** The `--legacy-peer-deps` flag is required due to dependency conflicts between FireSQL and Firebase versions.

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
SQL> SELECT * FROM challenges LIMIT 1
📊 Found 1 result(s) in 89ms
────────────────────────────────────────────────────────────────────────────────
id                   | title                | description          | state             
────────────────────────────────────────────────────────────────────────────────
2GHCA1pwyy23kRz6aIkq | My Challenge        | A great challenge... | active            
────────────────────────────────────────────────────────────────────────────────
```

**Benefits:**
- **Easy document identification** - Always know which document you're looking at
- **Reference for SETDOC** - Use the ID to set document references
- **Debugging** - Quickly identify specific documents in results
- **No extra queries needed** - ID is included automatically

## Query History

The CLI automatically saves successful queries to `query_history.txt` and provides arrow key navigation:

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
- **Location**: `query_history.txt` in the CLI directory
- **Format**: One query per line, most recent first
- **Automatic management** - No manual intervention needed

## Usage

```bash
node index.js <project-id>
```

Or if you've installed it globally:
```bash
firestore-sql <project-id>
```

### Example

```bash
node index.js my-firestore-project
```

This will start an interactive session where you can enter SQL queries:

```
🚀 Initializing FireSQL for project: my-firestore-project
✅ FireSQL initialized successfully!
💡 Type your SQL queries below. Type "exit" or "quit" to stop.

SQL> SELECT * FROM users LIMIT 5
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

SQL> SELECT name, age FROM users WHERE age > 30
🔄 Executing query...
📊 Found 2 result(s) in 156ms
────────────────────────────────────────────────────────────────────────────────
name                 | age                 
────────────────────────────────────────────────────────────────────────────────
Bob Johnson          | 35                 
Charlie Wilson       | 32                 
────────────────────────────────────────────────────────────────────────────────

SQL> SETDOC users/P8RlU12un4UKc0cR1p5DHrtIpdu1
📁 Document reference set to: users/P8RlU12un4UKc0cR1p5DHrtIpdu1
💡 All subsequent queries will be executed against this document/subcollection.

SQL> SELECT * FROM feed LIMIT 3
🔄 Executing query...
📊 Found 3 result(s) in 89ms
────────────────────────────────────────────────────────────────────────────────
title                | content             | createdAt           | published        
────────────────────────────────────────────────────────────────────────────────
My First Post        | Hello world!        | 2024-01-15          | true             
Weekend Update       | Had a great time... | 2024-01-14          | true             
Thoughts on Tech     | Technology is...    | 2024-01-13          | false            
────────────────────────────────────────────────────────────────────────────────

SQL> RESET
🔄 Reset to database-level queries
💡 All subsequent queries will be executed against the entire database.

SQL> HELP
📚 Firestore SQL CLI Commands:
──────────────────────────────────────────────────
SQL Queries:
  SELECT * FROM collection_name LIMIT 10
  SELECT field1, field2 FROM collection_name WHERE condition
  SELECT * FROM GROUP collection_name  (collection group query)

Special Commands:
  SETDOC <path>     - Set document reference for subcollection queries
  RESET             - Reset to database-level queries
  HELP              - Show this help message
  EXIT/QUIT         - Exit the CLI

Examples:
  SETDOC users/P8RlU12un4UKc0cR1p5DHrtIpdu1
  SETDOC "users/P8RlU12un4UKc0cR1p5DHrtIpdu1/feed"
  SELECT * FROM feed

📍 Current scope: Database-level queries
──────────────────────────────────────────────────

SQL> exit
👋 Goodbye!
```

## Special Commands

### SETDOC Command

The `SETDOC` command allows you to query specific documents and their subcollections:

```bash
SQL> SETDOC users/P8RlU12un4UKc0cR1p5DHrtIpdu1/feed
📁 Document reference set to: users/P8RlU12un4UKc0cR1p5DHrtIpdu1/feed
💡 All subsequent queries will be executed against this document/subcollection.

SQL> SELECT * FROM posts WHERE published = true
```

**Use cases:**
- Query subcollections within a specific document
- Access nested data structures
- Perform document-scoped operations

**Path formats:**
- `SETDOC users/userId/feed` - Query the feed subcollection of a specific user
- `SETDOC "users/userId/feed"` - Same as above, with quotes for paths with special characters
- `SETDOC posts/postId/comments` - Query comments under a specific post

### Other Commands

- `RESET` - Return to database-level queries
- `HELP` - Show available commands and examples
- `EXIT` or `QUIT` - Exit the CLI

## Supported SQL Features

Based on the FireSQL library, this tool supports:

- `SELECT` queries with `WHERE`, `ORDER BY`, `LIMIT`
- Basic aggregations (`AVG`, `MIN`, `MAX`, `SUM`)
- `GROUP BY` (with limitations)
- `UNION` operations
- `IN` and `BETWEEN` conditions
- `LIKE` pattern matching (limited)
- Nested object access using backticks
- Array membership with `CONTAINS`
- Collection group queries with `FROM GROUP collection_name`

### Examples of supported queries:

```sql
-- Basic select
SELECT * FROM users

-- Filtering
SELECT name, email FROM users WHERE age > 25

-- Ordering and limiting
SELECT * FROM products ORDER BY price DESC LIMIT 10

-- Aggregations
SELECT category, AVG(price) FROM products GROUP BY category

-- Nested objects
SELECT name, `details.stock` FROM products WHERE `details.available` = true

-- Array membership
SELECT * FROM posts WHERE tags CONTAINS 'javascript'

-- Collection group queries
SELECT * FROM GROUP landmarks

-- Union queries
SELECT * FROM users WHERE city = 'New York'
UNION
SELECT * FROM users WHERE age > 30
```

## Limitations

- Only `SELECT` queries are supported
- No `JOIN` operations
- `LIMIT` doesn't support `OFFSET`
- No `COUNT` aggregate function
- `GROUP BY` cannot be combined with `ORDER BY` or `LIMIT`
- Limited `LIKE` support (only `'value%'` and `'value'` patterns)
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
