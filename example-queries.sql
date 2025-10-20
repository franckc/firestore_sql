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
SELECT prettyJson(*) FROM users LIMIT 1

-- Subcollection queries (direct collection paths)
SELECT * FROM users/P8RlU12un4UKc0cR1p5DHrtIpdu1/feed
SELECT * FROM posts/postId/comments WHERE approved = true
SELECT COUNT(*) FROM users/userId/notifications WHERE read = false

-- Filtering
SELECT name, email FROM users WHERE age > 25

-- Ordering
SELECT * FROM products ORDER BY price DESC LIMIT 5
SELECT * FROM users ORDER BY createdAt DESC LIMIT 10

-- Complex filtering
SELECT * FROM restaurants 
WHERE city = 'Chicago' AND price < 50
ORDER BY rating DESC

-- Multiline queries (end with semicolon)
SELECT * FROM users
WHERE age > 25
ORDER BY createdAt DESC
LIMIT 10;

SELECT id, email, toDate(createdAt)
FROM users
WHERE firstName = "franck"
ORDER BY createdAt DESC;

SELECT prettyJson(*)
FROM challenges
WHERE state = "active"
LIMIT 1;

-- Using document ID (both 'id' and '__name__' work)
SELECT id, name, email FROM users;
SELECT __name__ as docId, name, email FROM users;

-- Document ID in WHERE conditions
SELECT * FROM users WHERE id = "user123";
SELECT * FROM posts WHERE id > "post456";

-- Document ID in ORDER BY
SELECT * FROM users ORDER BY id ASC;
SELECT * FROM posts ORDER BY id DESC;

-- Document ID with toDate() function
SELECT toDate(id) FROM users;

-- JSON formatting functions
SELECT prettyJson(*) FROM users LIMIT 1;
SELECT prettyJson(metadata) FROM posts;
SELECT prettyJson(*) FROM challenges WHERE state = "active" LIMIT 1;

