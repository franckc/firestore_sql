-- Example SQL queries for Firestore SQL CLI
-- Copy and paste these into the interactive CLI

-- Special Commands
SETDOC users/P8RlU12un4UKc0cR1p5DHrtIpdu1/feed
SETDOC "users/P8RlU12un4UKc0cR1p5DHrtIpdu1/feed"
RESET
HELP

-- Basic queries
SELECT * FROM users LIMIT 10

-- Filtering
SELECT name, email FROM users WHERE age > 25

-- Ordering
SELECT * FROM products ORDER BY price DESC LIMIT 5

-- Aggregations
SELECT category, AVG(price) as avg_price FROM products GROUP BY category

-- Nested object access (use backticks for field paths)
SELECT name, `details.stock` FROM products WHERE `details.available` = true

-- Array membership
SELECT * FROM posts WHERE tags CONTAINS 'javascript'

-- Collection group queries
SELECT * FROM GROUP landmarks

-- Union queries
SELECT * FROM users WHERE city = 'New York'
UNION
SELECT * FROM users WHERE age > 30

-- Complex filtering
SELECT * FROM restaurants 
WHERE city = 'Chicago' AND (price < 50 OR rating > 4.5)
ORDER BY rating DESC

-- Using document ID
SELECT __name__ as docId, name, email FROM users

-- Pattern matching (limited LIKE support)
SELECT * FROM users WHERE name LIKE 'John%'

-- Range queries
SELECT * FROM products WHERE price BETWEEN 10 AND 100

-- IN queries
SELECT * FROM users WHERE city IN ('New York', 'Los Angeles', 'Chicago')
