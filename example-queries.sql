-- Example SQL queries for Firestore SQL CLI
-- Copy and paste these into the interactive CLI

-- Special Commands
HELP

-- COUNT Queries
SELECT COUNT(*) FROM users
SELECT COUNT(*) FROM challenges WHERE state = "active"
SELECT COUNT(*) FROM challenges WHERE state = "active" AND type = "public"
SELECT COUNT(*) FROM users WHERE firstName = "franck"
SELECT COUNT(*) FROM users/P8RlU12un4UKc0cR1p5DHrtIpdu1/feed WHERE type = "new_public_challenge"

-- Basic queries
SELECT * FROM users LIMIT 10
SELECT id, email, toDate(createdAt) FROM users ORDER BY createdAt DESC LIMIT 5

-- Subcollection queries (direct collection paths)
SELECT * FROM users/P8RlU12un4UKc0cR1p5DHrtIpdu1/feed
SELECT * FROM posts/postId/comments WHERE approved = true
SELECT COUNT(*) FROM users/userId/notifications WHERE read = false

-- Filtering
SELECT name, email FROM users WHERE age > 25

-- Ordering
SELECT * FROM products ORDER BY price DESC LIMIT 5
SELECT * FROM users ORDER BY createdAt DESC LIMIT 10

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

-- Using document ID (both 'id' and '__name__' work)
SELECT id, name, email FROM users
SELECT __name__ as docId, name, email FROM users

-- Document ID in WHERE conditions
SELECT * FROM users WHERE id = "user123"
SELECT * FROM posts WHERE id > "post456"

-- Document ID in ORDER BY
SELECT * FROM users ORDER BY id ASC
SELECT * FROM posts ORDER BY id DESC

-- Document ID with toDate() function
SELECT toDate(id) FROM users

-- Pattern matching (limited LIKE support)
SELECT * FROM users WHERE name LIKE 'John%'

-- Range queries
SELECT * FROM products WHERE price BETWEEN 10 AND 100

-- IN queries
SELECT * FROM users WHERE city IN ('New York', 'Los Angeles', 'Chicago')
