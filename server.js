const express = require('express');
const mysql = require('mysql');
const bcrypt = require('bcrypt');
const bodyParser = require('body-parser');

const app = express();

app.use(bodyParser.json());

// MySQL Connection
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'finance',
});

db.connect((err) => {
  if (err) {
    console.error('Error connecting to MySQL:', err);
  } else {
    console.log('Connected to MySQL');

    // Create the 'users' table if it doesn't exist
    db.query(
      `CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        phone VARCHAR(20) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
      (err, result) => {
        if (err) {
          console.error('Error creating the table:', err);
        } else {
          console.log('Users created or already exists');
        }
      }
    );
    
    // Create the 'clients' table if it doesn't exist
    db.query(
      `CREATE TABLE IF NOT EXISTS clients (
        id INT AUTO_INCREMENT PRIMARY KEY,
        idNumber VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        surname VARCHAR(255) NOT NULL,
        gender VARCHAR(255),
        district VARCHAR(255),
        village VARCHAR(255),
        phone VARCHAR(20),
        loanAmount DECIMAL(10, 2) NOT NULL,
        monthlyInterest DECIMAL(10, 2) NOT NULL,
        totalAmount DECIMAL(10, 2) NOT NULL,
        loanRequirement VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
      (err, result) => {
        if (err) {
          console.error('Error creating the clients table:', err);
        } else {
          console.log('Clients table created or already exists');
        }
      }
    );
    
    // Create the 'payments' table
    db.query(
      `CREATE TABLE IF NOT EXISTS payments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        idNumber VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        surname VARCHAR(255) NOT NULL,
        totalAmount DECIMAL(10, 2) DEFAULT 0.00,
        paymentAmount DECIMAL(10, 2) DEFAULT 0.00,
        updatedTotalAmount DECIMAL(10, 2) DEFAULT 0.00,
        paymentDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    
      )`,
      (err, result) => {
        if (err) {
          console.error('Error creating the payments table:', err);
        } else {
          console.log('Payments table created or already exists');
        }
      }
    );
  }
});

// Registration API
app.post('/register', async (req, res) => {
  const { name, email, password, phone } = req.body;

  // Hash the password using bcrypt
  const hashedPassword = await bcrypt.hash(password, 10);

  // Insert user data into the MySQL database
  db.query(
    'INSERT INTO users (name, email, password, phone) VALUES (?, ?, ?, ?)',
    [name, email, hashedPassword, phone],
    (err, result) => {
      if (err) {
        console.error('Error registering user:', err);
        res.status(500).json({ message: 'Error registering user' });
      } else {
        console.log('User registered successfully');
        res.status(200).json({ message: 'User registered successfully' });
      }
    }
  );
});

// Login API
app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  // Query the database to check if the email exists
  db.query('SELECT * FROM users WHERE email = ?', [email], (err, results) => {
    if (err) {
      console.error('Error during login query:', err);
      res.status(500).json({ message: 'Error during login' });
    } else if (results.length === 0) {
      // User with the provided email not found
      res.status(401).json({ message: 'User not found' });
    } else {
      // Compare the provided password with the stored hashed password
      const user = results[0];
      bcrypt.compare(password, user.password, (err, passwordMatch) => {
        if (err) {
          console.error('Error comparing passwords:', err);
          res.status(500).json({ message: 'Error during login' });
        } else if (passwordMatch) {
          // Passwords match, login successful
          res.status(200).json({ message: 'Login successful' });
        } else {
          // Passwords do not match
          res.status(401).json({ message: 'Invalid password' });
        }
      });
    }
  });
});

// API to insert client data
app.post('/client', (req, res) => {
  const clientData = req.body;

  db.query(
    'INSERT INTO clients SET ?',
    clientData,
    (err, result) => {
      if (err) {
        console.error('Error inserting client data:', err);
        res.status(500).json({ message: 'Error inserting client data' });
      } else {
        console.log('Client data inserted successfully');
        res.status(200).json({ message: 'Client data inserted successfully' });
      }
    }
  );
});

// Endpoint for making a payment
app.post('/insert-payment', (req, res) => {
  const { clientIdentifier, paymentAmount } = req.body;

  // Step 1: Query the clients table to find the clientId based on some criteria (e.g., clientIdentifier).
  const clientQuery = 'SELECT id FROM clients WHERE idNumber = ?';

  db.query(clientQuery, [clientIdentifier], (clientQueryError, clientQueryResults) => {
    if (clientQueryError) {
      console.error('Error querying clients:', clientQueryError);
      return res.status(500).json({ message: 'Error querying clients' });
    }

    if (clientQueryResults.length === 0) {
      return res.status(404).json({ message: 'Client not found' });
    }

    // We found a client, use their clientId for the payment.
    const clientId = clientQueryResults[0].id;

    // Step 2: Insert the payment into the payments table using the retrieved clientId.
    const paymentInsertQuery = 'INSERT INTO payments (clientId, paymentAmount, paymentDate) VALUES (?, ?, NOW())';

    db.query(paymentInsertQuery, [clientId, paymentAmount], (paymentInsertError, paymentInsertResults) => {
      if (paymentInsertError) {
        console.error('Error inserting payment data:', paymentInsertError);
        return res.status(500).json({ message: 'Error inserting payment data' });
      }

      console.log('Payment data inserted successfully');
      res.json({ message: 'Payment data inserted successfully' });
    });
  });
});

// Add a new API endpoint to get a list of all clients
app.get('/client', (req, res) => {
  
  // Query the clients table to fetch all client data
  db.query('SELECT * FROM clients', (err, results) => {
    if (err) {
      console.error('Error fetching clients:', err);
      res.status(500).json({ message: 'Error fetching clients' });
    } else {
      // Return the list of clients as JSON
      res.status(200).json(results);
    }
  });
});

app.post('/payments', (req, res) => {
  // Parse payment data from the request body
  const { idNumber, name, surname, totalAmount, paymentAmount, updatedTotalAmount } = req.body;

  // Generate the current date
  const currentDate = new Date(); // Current date and time
  const formattedDate = currentDate.toISOString().slice(0, 19).replace('T', ' '); // Format the date as 'YYYY-MM-DD HH:MM:SS'

  // Define your SQL query to insert payment data into the payments table
  const insertPaymentQuery = `INSERT INTO payments (idNumber, name, surname, totalAmount, paymentAmount, updatedTotalAmount, paymentDate) 
    VALUES (?, ?, ?, ?, ?, ?, ?)`;

  // Execute the SQL query to insert payment data with the current date
  db.query(
    insertPaymentQuery,
    [idNumber, name, surname, totalAmount, paymentAmount, updatedTotalAmount, formattedDate],
    (err, result) => {
      if (err) {
        console.error('Error inserting payment data:', err);
        res.status(500).json({ message: 'Error inserting payment data' });
      } else {
        console.log('Payment data inserted successfully');
        res.status(200).json({ message: 'Payment data submitted successfully' });
      }
    }
  );
});


// GET request to fetch all payment data
app.get('/payments', (req, res) => {
  // Define your SQL query to retrieve all payment data
  const retrievePaymentsQuery = 'SELECT * FROM payments';

  // Execute the SQL query to fetch all payment data
  db.query(retrievePaymentsQuery, (err, results) => {
    if (err) {
      console.error('Error fetching payment data:', err);
      res.status(500).json({ message: 'Error fetching payment data' });
    } else {
      // Send the list of payment data as a JSON response
      res.status(200).json(results);
    }
  });
});
// Endpoint for handling top-up
app.post('/topup', (req, res) => {
  const { amount } = req.body;

  // Add the amount to the openingBalance
  openingBalance += parseFloat(amount);

  // You may want to store the top-up transaction in your database
  // Example: Insert the top-up transaction into a 'transactions' table
  const topUpTransactionQuery = 'INSERT INTO transactions (type, amount, date) VALUES (?, ?, NOW())';
  db.query(topUpTransactionQuery, ['topup', amount], (err, result) => {
    if (err) {
      console.error('Error inserting top-up transaction:', err);
    }
  });

  res.json({ success: true, message: `Top-up successful. New balance: ${openingBalance}` });
});

// Endpoint for handling expenses
app.post('/expenses', (req, res) => {
  const { amount } = req.body;

  // Deduct the amount from expenses
  expenses += parseFloat(amount);

  // You may want to store the expenses transaction in your database
  // Example: Insert the expenses transaction into a 'transactions' table
  const expensesTransactionQuery = 'INSERT INTO transactions (type, amount, date) VALUES (?, ?, NOW())';
  db.query(expensesTransactionQuery, ['expenses', amount], (err, result) => {
    if (err) {
      console.error('Error inserting expenses transaction:', err);
    }
  });

  res.json({ success: true, message: `Expenses recorded. Total expenses: ${expenses}` });
});
// ...

// Create the 'topup' table if it doesn't exist
db.query(
  `CREATE TABLE IF NOT EXISTS topup (
    id INT AUTO_INCREMENT PRIMARY KEY,
    amount DECIMAL(10, 2)  DEFAULT 0.00,
    date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,
  (err, result) => {
    if (err) {
      console.error('Error creating the topup table:', err);
    } else {
      console.log('Topup table created or already exists');
    }
  }
);

// Create the 'expenses' table if it doesn't exist
db.query(
  `CREATE TABLE IF NOT EXISTS expenses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    amount DECIMAL(10, 2)  DEFAULT 0.00,
    amount DECIMAL(10, 2)  DEFAULT 0.00,
    date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,
  (err, result) => {
    if (err) {
      console.error('Error creating the expenses table:', err);
    } else {
      console.log('Expenses table created or already exists');
    }
  }
);
// ...

// Endpoint for inserting expenses
app.post('/insert-expenses', (req, res) => {
  const { amount } = req.body;
  // Check if amount is provided
  if (amount === undefined || amount === null) {
    return res.status(400).json({ message: 'Amount is required' });
  }

  // Insert expenses data into the 'expenses' table
  db.query(
    'INSERT INTO expenses (amount) VALUES (?)',
    [amount],
    (err, result) => {
      if (err) {
        console.error('Error inserting expenses data:', err);
        res.status(500).json({ message: 'Error inserting expenses data' });
      } else {
        console.log('Expenses data inserted successfully');
        res.status(200).json({ message: 'Expenses data inserted successfully' });
      }
    }
  );
});

// Endpoint for inserting topup
app.post('/insert-topup', (req, res) => {
  const { amount } = req.body;
  // Check if amount is provided
  if (amount === undefined || amount === null) {
    return res.status(400).json({ message: 'Amount is required' });
  }

  // Insert topup data into the 'topup' table
  db.query(
    'INSERT INTO topup (amount) VALUES (?)',
    [amount],
    (err, result) => {
      if (err) {
        console.error('Error inserting topup data:', err);
        res.status(500).json({ message: 'Error inserting topup data' });
      } else {
        console.log('Topup data inserted successfully');
        res.status(200).json({ message: 'Topup data inserted successfully' });
      }
    }
  );
});

// Endpoint for getting topup data
app.get('/topup', (req, res) => {
  // Retrieve topup data from the 'topup' table
  db.query(
    'SELECT * FROM topup',
    (err, result) => {
      if (err) {
        console.error('Error fetching topup data:', err);
        res.status(500).json({ message: 'Error fetching topup data' });
      } else {
        const topups = result.map(item => ({
          id: item.id,
          amount: item.amount,
          transactionId: item.transaction_id
        }));
        res.status(200).json(topups);
      }
    }
  );
});

// Endpoint for getting expenses data
app.get('/expenses', (req, res) => {
  // Retrieve expenses data from the 'expenses' table
  db.query(
    'SELECT * FROM expenses',
    (err, result) => {
      if (err) {
        console.error('Error fetching expenses data:', err);
        res.status(500).json({ message: 'Error fetching expenses data' });
      } else {
        const expenses = result.map(item => ({
          id: item.id,
          amount: item.amount,
          transactionId: item.transaction_id
        }));
        res.status(200).json(expenses);
      }
    }
  );
});


const ipAddress = '192.168.43.218';
const port = process.env.NODE_ENV === 'production' ? (process.env.PORT || 80) : 3000;
app.listen(port, ipAddress, () => {
  console.log(`Server running at http://${ipAddress}:${port}/`);
});
