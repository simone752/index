const express = require("express");
const bodyParser = require("body-parser");
const bcrypt = require("bcrypt");
const sqlite3 = require("sqlite3").verbose();
const cors = require("cors");

const app = express();
const db = new sqlite3.Database('./database.sqlite');

app.use(bodyParser.json());
app.use(cors());

// Initialize database
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT,
      question TEXT,
      date TEXT,
      answer TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS admin (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE,
      password TEXT
    )
  `);

  // Insert admin user (only if table is empty)
  const adminPassword = "your_secure_password"; // Change this
  const hashedPassword = bcrypt.hashSync(adminPassword, 10);
  db.run(
    `INSERT OR IGNORE INTO admin (username, password) VALUES (?, ?)`,
    ["admin", hashedPassword]
  );
});

// Get all questions and answers
app.get("/questions", (req, res) => {
  db.all(`SELECT * FROM questions ORDER BY id DESC`, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Add a new question
app.post("/questions", (req, res) => {
  const { username, question } = req.body;
  const date = new Date().toLocaleString();
  db.run(
    `INSERT INTO questions (username, question, date, answer) VALUES (?, ?, ?, ?)`,
    [username, question, date, null],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID });
    }
  );
});

// Add or update an answer (admin only)
app.post("/answer", (req, res) => {
  const { questionId, answer, adminUsername, adminPassword } = req.body;

  // Authenticate admin
  db.get(`SELECT * FROM admin WHERE username = ?`, [adminUsername], (err, admin) => {
    if (err || !admin || !bcrypt.compareSync(adminPassword, admin.password)) {
      return res.status(403).json({ error: "Invalid admin credentials" });
    }

    // Update answer
    db.run(
      `UPDATE questions SET answer = ? WHERE id = ?`,
      [answer, questionId],
      function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
      }
    );
  });
});

// Start server
const PORT = 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
