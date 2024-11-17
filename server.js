const express = require('express');
const app = express();

const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

dotenv.config({ path: './.env' });

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Route for the home page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', './index.html'));
});

// Create or open the database file
const db = new sqlite3.Database('issues.db', (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
    } else {
        console.log('Connected to the SQLite database.');

        // Create tables if they don't exist
        db.run(`
            CREATE TABLE IF NOT EXISTS issues (
                id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
                location TEXT NOT NULL,
                description TEXT NOT NULL,
                image TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `, (err) => {
            if (err) console.error('Error creating issues table:', err.message);
        });

        db.run(`
            CREATE TABLE IF NOT EXISTS feedback (
                id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
                rating INTEGER NOT NULL,
                comments TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `, (err) => {
            if (err) console.error('Error creating feedback table:', err.message);
        });
    }
});

// Report an issue
app.post('/api/report', (req, res) => {
    const { location, description, image } = req.body;

    const query = `INSERT INTO issues (location, description, image) VALUES (?, ?, ?)`;
    db.run(query, [location, description, image || null], function (err) {
        if (err) {
            console.error('Error inserting issue:', err.message);
            return res.status(500).json({ success: false, message: 'Error reporting issue.' });
        }
        res.json({ success: true, message: 'Issue reported successfully!', id: this.lastID });
    });
});

// Submit feedback
app.post('/api/feedback', (req, res) => {
    const { rating, comments } = req.body;

    const query = `INSERT INTO feedback (rating, comments) VALUES (?, ?)`;
    db.run(query, [rating, comments || null], function (err) {
        if (err) {
            console.error('Error inserting feedback:', err.message);
            return res.status(500).json({ success: false, message: 'Error submitting feedback.' });
        }
        res.json({ success: true, message: 'Feedback submitted successfully!', id: this.lastID });
    });
});

// Fetch a reminder
app.get('/api/reminder', (req, res) => {
    res.json({ message: "Community clean-up event this Saturday at 10 AM." });
});

// Express server setup
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on port http://localhost:${PORT}`);
});
