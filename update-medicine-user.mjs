import pkg from 'pg'; // Import the pg CommonJS module
const { Client } = pkg; // Destructure the Client from the default export

// Database configuration
const DB_CONFIG = {
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_DATABASE,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT, // Default PostgreSQL port
    ssl: { rejectUnauthorized: false }, // For RDS SSL
};

// Helper function to convert "DD-MM-YYYY" to "YYYY-MM-DD" format
const convertDateFormat = (dateStr) => {
  const [day, month, year] = dateStr.split('-');
  return `${year}-${month}-${day}`; // Return in "YYYY-MM-DD" format
};

export const handler = async (event) => {
  // Reject any non-POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed. Please use POST.' }),
    };
  }

  const client = new Client(DB_CONFIG);

  // Parse the body for input parameters
  const { id, user_credential, quantity, description, date_of_expiry } = JSON.parse(event.body);

  // Validate that at least one field to update is provided
  if (!quantity && !description && !date_of_expiry) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'At least one field (quantity, description, date_of_expiry) is required to update' }),
    };
  }

  // Validate that the user_credential is valid and exists
  let userCredentialValid = false;

  try {
    // Connect to the database
    await client.connect();

    // Check if the user_credential is valid by querying the users table
    const userResult = await client.query('SELECT * FROM users WHERE user_credential = $1', [user_credential]);

    // If the user_credential doesn't exist, return an error
    if (userResult.rowCount === 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid user credential' }),
      };
    }

    userCredentialValid = true;

    // Check if the medicine exists and belongs to the provided user_credential
    const medicineResult = await client.query('SELECT * FROM medicines WHERE id = $1 AND user_credential = $2', [id, user_credential]);

    // If no matching medicine record is found, return an error
    if (medicineResult.rowCount === 0) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Medicine not found or does not belong to the specified user' }),
      };
    }

    // If a date_of_expiry is provided, convert it to "YYYY-MM-DD" format
    let formattedExpiryDate = null;
    if (date_of_expiry) {
      try {
        formattedExpiryDate = convertDateFormat(date_of_expiry);
      } catch (dateError) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'Invalid date format. Please use DD-MM-YYYY.' }),
        };
      }
    }

    // Build the SQL query dynamically based on which fields are provided for update
    let query = 'UPDATE medicines SET';
    let values = [];
    let updateFields = [];

    // Add update fields based on the provided data
    if (quantity) {
      updateFields.push(`quantity = $${updateFields.length + 1}`);
      values.push(quantity);
    }
    if (description) {
      updateFields.push(`description = $${updateFields.length + 1}`);
      values.push(description);
    }
    if (formattedExpiryDate) {
      updateFields.push(`date_of_expiry = $${updateFields.length + 1}`);
      values.push(formattedExpiryDate);
    }

    // Add the WHERE clause to target the specific medicine by ID
    query += ` ${updateFields.join(', ')} WHERE id = $${updateFields.length + 1} RETURNING *;`;
    values.push(id);

    // Execute the update query
    const result = await client.query(query, values);

    // If no rows were updated, return an error
    if (result.rowCount === 0) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Medicine not found or update failed' }),
      };
    }

    // Return the updated medicine data
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Medicine updated successfully',
        medicine: result.rows[0],
      }),
    };
  } catch (error) {
    // Log the error for debugging
    console.error('Error updating medicine:', error);
    console.error('Error stack:', error.stack);

    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error', message: error.message }),
    };
  } finally {
    // Ensure the client connection is closed
    await client.end();
  }
};
