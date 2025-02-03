const express = require('express');
const path = require('path');
const session = require('express-session');
const bodyParser = require('body-parser');
const mysql = require('mysql2');
const crypto = require('crypto');
const multer = require('multer'); // Import multer
const fs = require('fs');
const { exec } = require('child_process');

// require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware for parsing JSON and URL-encoded request bodies
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files from the 'src' directory
app.use(express.static(path.join(__dirname, 'src')));


// // Middleware for parsing form data
// app.use(bodyParser.urlencoded({ extended: true }));


// Ensure the upload directory exists
const uploadDir = 'uploads/solvers';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Set up multer for file uploads
const upload = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => {
            cb(null, uploadDir);
        },
        filename: (req, file, cb) => {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            cb(null, uniqueSuffix + '-' + file.originalname);
        },
    }),
    limits: { fileSize: 10 * 1024 * 1024 }, // Limit file size to 10MB
});

// MySQL database connection
// const db = mysql.createConnection({
//     host: 'localhost', //  running MySQL locally
//     user: 'root',      //  MySQL username
//     password: '6831',  //  MySQL password
//     database: 'UserDatabase', // Default to the UserDatabase
// });


// Debug: Check if environment variables are loaded correctly

const db = mysql.createConnection({
    host: '',
    user: '',
    password: '',
    database: 'UserDatabase',
    port: 3306
});

// Connect to the database
db.connect((err) => {
    if (err) {
        console.error('Database connection failed:', err.message);
        return;
    }
    console.log('Connected to the MySQL database.');
});


// Middleware to protect routes
app.use((req, res, next) => {
    const allowedPaths = ['/', '/login', '/signup.html', '/signup'];
    const publicResources = req.path.startsWith('/images/');
    if (!allowedPaths.includes(req.path) && !req.session.user && !publicResources) {
        return res.redirect('/');
    }
    next();
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'src', 'index.html'));
});

// Middleware to check if the user is an admin
function isAdmin(req, res, next) {
    if (!req.session.user || req.session.user.is_admin !== 1) {
        return res.status(403).send('<h1>Access Denied. <a href="/">Go to Login</a></h1>');
    }
    next();
}

// Login endpoint
app.post('/login', (req, res) => {
    const { username, password } = req.body;

    const query = 'SELECT * FROM Users WHERE username = ? AND password = ?';
    db.query(query, [username, password], (err, results) => {
        if (err) {
            console.error('Database query error:', err);
            res.status(500).send('Internal Server Error');
            return;
        }

        if (results.length > 0) {
            req.session.user = {
                user_id: results[0].user_id,
                username: results[0].username,
                is_admin: results[0].is_admin // Include the admin flag
            };
            return res.redirect('/home.html');
        }

        res.send('<h1>Invalid credentials. <a href="/">Go back</a></h1>');
    });
});

// Restrict access to admin.html
app.get('/admin.html', isAdmin, (req, res) => {
    res.sendFile(path.join(__dirname, 'src', 'admin.html'));
});


// Signup endpoint
app.post('/signup', (req, res) => {
    const { username, email, password } = req.body;

    // Insert the new user into the database
    const query = 'INSERT INTO Users (username, email, password) VALUES (?, ?, ?)';
    db.query(query, [username, email, password], (err, results) => {
        if (err) {
            console.error('Database insertion error:', err);
            res.status(500).send('Internal Server Error');
            return;
        }

        res.send('<h1>Signup successful! <a href="/">Go to Login</a></h1>');
    });
});
//start of account_setting.html
// Fetch account info
app.get('/account-info', (req, res) => {
    if (!req.session.user) {
        return res.status(401).send('Unauthorized');
    }

    const userId = req.session.user.user_id;

    const query = `
    SELECT email, username FROM UserDatabase.Users WHERE user_id = ?
    `;
    db.query(query, [userId], (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).send('Error fetching account info.');
        }

        if (results.length > 0) {
            const user = results[0];
            res.json({
                email: user.email,
                username: user.username,
            });
        } else {
            res.status(404).send('User not found.');
        }
    });
});

// Update username
app.post('/update-username', (req, res) => {
    const { username } = req.body;
    const userId = req.session.user.user_id;

    const query = 'UPDATE Users SET username = ? WHERE user_id = ?';
    db.query(query, [username, userId], (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Error updating username');
        }

        req.session.user.username = username; // Update session data
        res.sendStatus(200);
    });
});

// Change password
app.post('/change-password', (req, res) => {
    console.log('Request body:', req.body);

    const { password } = req.body;

    if (!password) {
        console.error('No password provided');
        return res.status(400).send('Password cannot be empty');
    }

    const userId = req.session.user.user_id;

    const query = 'UPDATE Users SET password = ? WHERE user_id = ?';
    db.query(query, [password, userId], (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Error changing password');
        }

        req.session.destroy((err) => {
            if (err) {
                console.error(err);
                return res.status(500).send('Error logging out after password change');
            }

            res.status(200).json({ redirect: '/' });
        });
    });
});

// Delete account
app.post('/delete-account', (req, res) => {
    const userId = req.session.user.user_id;

    const query = 'DELETE FROM Users WHERE user_id = ?';
    db.query(query, [userId], (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Error deleting account');
        }

        req.session.destroy((err) => {
            if (err) {
                console.error(err);
                return res.status(500).send('Error destroying session');
            }

            res.sendStatus(200);
        });
    });
});
//end of account_setting.html

// Generate API Key Endpoint
app.post('/generate-api-key', (req, res) => {
    if (!req.session.user) {
        return res.status(401).send('Unauthorized');
    }

    const userId = req.session.user.user_id;
    const apiKey = 'API-' + crypto.randomBytes(8).toString('hex').toUpperCase();
    const instantiatingDate = new Date();
    const expirationDate = new Date();
    expirationDate.setMonth(instantiatingDate.getMonth() + 2); // Expire in 2 months

    const query = `
        INSERT INTO OptimizationProblemDatabase.ApiKeys 
        (api_key, user_id, key_instantiating_date, key_expiration_date)
        VALUES (?, ?, ?, ?)
    `;

    db.query(query, [apiKey, userId, instantiatingDate, expirationDate], (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).send('Error generating API key.');
        }

        res.status(200).json({
            apiKey,
            keyInstantiatingDate: instantiatingDate.toISOString().split('T')[0],
            keyExpirationDate: expirationDate.toISOString().split('T')[0],
        });
    });
});

//clear all keys
app.post('/clear-keys', (req, res) => {
    if (!req.session.user) {
        return res.status(401).send('Unauthorized');
    }

    const userId = req.session.user.user_id;

    const query = `
        DELETE FROM OptimizationProblemDatabase.ApiKeys
        WHERE user_id = ?
    `;

    db.query(query, [userId], (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).send('Error clearing API keys.');
        }

        res.status(200).send('All API keys cleared successfully.');
    });
});


// Get All API Keys for the User
app.get('/get-api-keys', (req, res) => {
    if (!req.session.user) {
        return res.status(401).send('Unauthorized');
    }

    const userId = req.session.user.user_id;

    const query = `
        SELECT api_key AS apiKey, 
               key_instantiating_date AS keyInstantiatingDate, 
               key_expiration_date AS keyExpirationDate 
        FROM OptimizationProblemDatabase.ApiKeys
        WHERE user_id = ?
    `;

    db.query(query, [userId], (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).send('Error fetching API keys.');
        }

        res.json(results);
    });
});


// Delete a Specific API Key
app.post('/delete-api-key', (req, res) => {
    if (!req.session.user) {
        return res.status(401).send('Unauthorized');
    }

    const { apiKey } = req.body;
    const userId = req.session.user.user_id;

    const query = `
        DELETE FROM OptimizationProblemDatabase.ApiKeys
        WHERE api_key = ? AND user_id = ?
    `;

    db.query(query, [apiKey, userId], (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).send('Error deleting API key.');
        }

        if (results.affectedRows === 0) {
            return res.status(404).send('API key not found.');
        }

        res.status(200).send('API key deleted successfully.');
    });
});

// Logout endpoint
app.get('/logout', (req, res) => {
    // Destroy the session
    req.session.destroy((err) => {
        if (err) {
            console.error('Error destroying session:', err);
            return res.status(500).send('Internal Server Error');
        }

        // Redirect to the login page
        res.redirect('/');
    });
});

// monitoring.html get processes
app.get('/get-processes', (req, res) => {
    if (!req.session.user) {
        return res.status(401).send('Unauthorized');
    }

    const userId = req.session.user.user_id;

    const query = `
        SELECT 
            Job.job_id, 
            Job.status, 
            Job.created_at, 
            Job.updated_at,
            Job.time_to_solve,
            Job.solver_id, 
            Solvers.solver_name
        FROM OptimizationProblemDatabase.Job
        LEFT JOIN OptimizationProblemDatabase.Solvers
        ON Job.solver_id = Solvers.solver_id
        WHERE Job.user_id = ?
    `;

    db.query(query, [userId], (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).send('Error fetching processes.');
        }

        res.json(results);
    });
});

//download
app.get('/download-result/:jobId', (req, res) => {
    const jobId = req.params.jobId;

    const query = `
        SELECT result_data
        FROM OptimizationProblemDatabase.Job
        WHERE job_id = ?
    `;

    db.query(query, [jobId], (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).send('Error fetching result data.');
        }

        if (results.length === 0) {
            return res.status(404).send('No result data found for the specified process.');
        }

        res.json(results[0].result_data);
    });
});
//delete
app.post('/delete-process', (req, res) => {
    if (!req.session.user) {
        return res.status(401).send('Unauthorized');
    }

    const { job_id } = req.body;

    const query = `
        DELETE FROM OptimizationProblemDatabase.Job
        WHERE job_id = ?
    `;

    db.query(query, [job_id], (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).send('Error deleting process.');
        }

        if (results.affectedRows === 0) {
            return res.status(404).send('Process not found.');
        }

        res.status(200).send('Process deleted successfully.');
    });
});

//initialize processes
app.post('/initialize-process', upload.single('dataFile'), (req, res) => {
    if (!req.session.user) {
        return res.status(401).send('Unauthorized');
    }

    const { solver_id } = req.body;
    const userId = req.session.user.user_id;

    if (!req.file) {
        return res.status(400).send('No file uploaded.');
    }

    let inputData;
    try {
        inputData = JSON.parse(fs.readFileSync(req.file.path, 'utf8')); // Read file from disk
    } catch (error) {
        console.error('Error parsing JSON file:', error);
        return res.status(400).send('Invalid JSON file.');
    }

    const createdAt = new Date();
    const status = 'processing';

    const query = `
        INSERT INTO OptimizationProblemDatabase.Job (user_id, solver_id, input_data, status, created_at)
        VALUES (?, ?, ?, ?, ?)
    `;

    db.query(query, [userId, solver_id, JSON.stringify(inputData), status, createdAt], (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).send('Error initializing process.');
        }

        const jobId = results.insertId;

        // Run hub.py with the job ID
        exec(`python3 hub.py ${jobId}`, (error, stdout, stderr) => {
            if (error) {
                console.error(`Error executing hub.py for job ID ${jobId}: ${error.message}`);
                return res.status(500).send('Failed to initialize process.');
            }

            if (stderr) {
                console.error(`Error output from hub.py for job ID ${jobId}: ${stderr}`);
            }

            console.log(`hub.py output for job ID ${jobId}: ${stdout}`);
            res.status(200).send(`Process initialized successfully for Job ID: ${jobId}`);
        });
    });
});

app.get('/api-solvers', (req, res) => {
    const query = `
    SELECT solver_id, solver_name, description 
    FROM OptimizationProblemDatabase.Solvers
    `;

    db.query(query, (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).send('Failed to fetch solvers.');
        }

        res.json(results);
    });
});

//add solvers
app.post('/submit-solver', upload.single('file'), (req, res) => {
    if (!req.session.user) {
        return res.status(401).send('Unauthorized');
    }

    const { solverName, description } = req.body;
    const file = req.file;

    if (!solverName || !description || !file) {
        return res.status(400).send('All fields are required.');
    }

    const filePath = path.join('/uploads/solvers', file.filename); // Correct file path
    const userId = req.session.user.user_id;

    const query = `
        INSERT INTO OptimizationProblemDatabase.AddingSolvers (solver_name, description, file_path, user_id)
        VALUES (?, ?, ?, ?)
    `;

    db.query(query, [solverName, description, filePath, userId], (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).send('Error submitting solver.');
        }

        res.status(200).send('Solver submitted successfully!');
    });
});

// Admin panel: Fetch solver requests
app.get('/admin/solver-requests', isAdmin, (req, res) => {
    const query = `
        SELECT id, solver_name, description, file_path 
        FROM OptimizationProblemDatabase.AddingSolvers
    `;
    db.query(query, (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).send('Error fetching solver requests.');
        }
        res.json(results);
    });
});

// Admin panel: Accept solver request
app.post('/admin/accept-solver', isAdmin, (req, res) => {
    const { id } = req.body;

    const query = `
        SELECT solver_name, description, file_path 
        FROM OptimizationProblemDatabase.AddingSolvers
        WHERE id = ?
    `;

    db.query(query, [id], (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).send('Error fetching solver request.');
        }

        if (results.length === 0) {
            return res.status(404).send('Solver request not found.');
        }

        const { solver_name, description, file_path } = results[0];
        const destinationPath = path.join(__dirname, 'optimizers', path.basename(file_path));

        // Move file and update the Solvers table
        fs.rename(file_path, destinationPath, (err) => {
            if (err) {
                console.error('Error moving file:', err);
                return res.status(500).send('Error moving file.');
            }

            const insertQuery = `
                INSERT INTO OptimizationProblemDatabase.Solvers (solver_name, description)
                VALUES (?, ?)
            `;

            db.query(insertQuery, [solver_name, description], (err) => {
                if (err) {
                    console.error('Database error:', err);
                    return res.status(500).send('Error adding solver.');
                }

                const deleteQuery = `
                    DELETE FROM OptimizationProblemDatabase.AddingSolvers
                    WHERE id = ?
                `;
                db.query(deleteQuery, [id], (err) => {
                    if (err) {
                        console.error('Database error:', err);
                        return res.status(500).send('Error deleting solver request.');
                    }
                    res.sendStatus(200);
                });
            });
        });
    });
});

// Admin panel: Reject solver request
app.post('/admin/reject-solver', isAdmin, (req, res) => {
    const { id } = req.body;

    const query = `
        DELETE FROM OptimizationProblemDatabase.AddingSolvers
        WHERE id = ?
    `;

    db.query(query, [id], (err) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).send('Error rejecting solver request.');
        }
        res.sendStatus(200);
    });
});


//download solver
app.get('/download-solver', isAdmin, (req, res) => {
    const filePath = req.query.filePath;

    if (!filePath) {
        return res.status(400).send('File path is required.');
    }

    const absolutePath = path.resolve(__dirname, filePath); // Ensures proper path resolution

    // Ensure the file exists
    fs.access(absolutePath, fs.constants.F_OK, (err) => {
        if (err) {
            console.error('File not found:', absolutePath);
            return res.status(404).send('File not found.');
        }

        res.download(absolutePath, path.basename(absolutePath), (err) => {
            if (err) {
                console.error('Error downloading file:', err);
                res.status(500).send('Error downloading file.');
            }
        });
    });
});


// Admin panel: Fetch users
app.get('/admin/users', isAdmin, (req, res) => {
    const searchQuery = req.query.search || '';
    const query = `
        SELECT user_id, username, email, is_admin
        FROM Users
        WHERE username LIKE ? OR email LIKE ?
    `;
    db.query(query, [`%${searchQuery}%`, `%${searchQuery}%`], (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).send('Error fetching users.');
        }
        res.json(results);
    });
});

// Admin panel: Delete user
app.post('/admin/delete-user', isAdmin, (req, res) => {
    const { user_id } = req.body;
    const query = `DELETE FROM Users WHERE user_id = ?`;
    db.query(query, [user_id], (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).send('Error deleting user.');
        }
        res.sendStatus(200);
    });
});

// Admin panel: Edit user
app.post('/admin/edit-user', isAdmin, (req, res) => {
    const { user_id, username, email, password } = req.body;
    const query = `UPDATE Users SET username = ?, email = ?, password = ? WHERE user_id = ?`;
    db.query(query, [username, email, password, user_id], (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).send('Error updating user.');
        }
        res.sendStatus(200);
    });
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
