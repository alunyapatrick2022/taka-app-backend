const express = require('express');
const app = express();
const multer = require('multer');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const nodemailer = require('nodemailer');

dotenv.config({ path: './.env' });

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Route for the home page
// app.get('/', (req, res) => {
//     res.sendFile(path.join(__dirname, 'public', './index.html'));
// });

// Create or open the database file
const db = new sqlite3.Database('issues.db', (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
    } else {
        console.log('Connected to the SQLite database.');

        // Create 'issues' table if it doesn't exist
db.run(`
    CREATE TABLE IF NOT EXISTS issues (
        id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
        location TEXT NOT NULL,
        description TEXT NOT NULL,
        image VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
`, (err) => {
    if (err) {
        console.error('Error creating issues table:', err.message);
    } else {
        console.log('Issues table created or already exists.');
    }
});

// Create 'feedback' table if it doesn't exist
db.run(`
    CREATE TABLE IF NOT EXISTS feedback (
        id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
        rating INTEGER NOT NULL,
        comments TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
`, (err) => {
    if (err) {
        console.error('Error creating feedback table:', err.message);
    } else {
        console.log('Feedback table created or already exists.');
    }
});

    }
});

// Configure Multer for file upload
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/'); // Store uploaded files in 'uploads' folder
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname); // Get file extension
        cb(null, Date.now() + ext); // Use timestamp as file name to prevent overwriting
    }
});

// Filter for allowed file types (e.g., images only)
const fileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|pdf|docx|xlsx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (extname && mimetype) {
        return cb(null, true);
    } else {
        cb(new Error('File type not supported!'), false);
    }
};

// Initialize multer with file size limit (10 MB) and file filter
const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB limit
    fileFilter: fileFilter
}).single('image'); // 'image' is the name of the file input field

// Configure Nodemailer transporter
const transporter = nodemailer.createTransport({
    service: 'gmail', // Or your email service provider
    auth: {
        user: process.env.EMAIL_USER, // Your email
        pass: process.env.EMAIL_PASS  // Your email password or app-specific password
    }
});

// Send email function
const sendEmail = async (subject, text) => {
    try {
        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: process.env.DEVELOPER_EMAIL, // Developers' email address
            cc: process.env.CC_EMAIL, // Carbon Copy recipient
            subject: subject,
            text: text,
        });
        console.log('Email sent successfully.');
    } catch (error) {
        console.error('Error sending email:', error.message);
    }
};

// Report an issue
app.post('/api/report', upload, (req, res) => {
    const { location, description } = req.body;
    const image = req.file ? req.file.filename : null; // Get the uploaded image filename (if any)

    const query = `INSERT INTO issues (location, description, image) VALUES (?, ?, ?)`;
    db.run(query, [location, description, image], function (err) {
        if (err) {
            console.error('Error inserting issue:', err.message);
            return res.status(500).json({ success: false, message: 'Error reporting issue.' });
        }
        // Send email to developers
        sendEmail(
            'New Issue Reported',
            `Location: ${location}\nDescription: ${description}\nAttachments: ${image || 'No file attached'}`
        );

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

         // Send email to developers
    sendEmail(
        'New Feedback Received',
        `Rating: ${rating}\nComments: ${comments || 'No comments provided.'}\n`
    );
        res.json({ success: true, message: 'Feedback submitted successfully!', id: this.lastID });
    });
});

// Fetch a reminder
app.get('/api/reminder', (req, res) => {
    res.json({ message: "Community clean-up event this Saturday at 10 AM." });
});

// Express server setup
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server running on port http://localhost:${PORT}`);
});
