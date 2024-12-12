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

export const handler = async (event) => {
  // Reject any non-POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed. Please use POST.' }),
    };
  }

  const client = new Client(DB_CONFIG);

  // Parse the user_credential from the request body
  const { user_credential } = JSON.parse(event.body);

  if (!user_credential) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'user_credential is required' }),
    };
  }

  try {
    // Connect to the database
    await client.connect();

    // Query to fetch medicines for a specific user
    const query = `
      SELECT id, medicine_name, measurement_type, quantity, description, date_of_entry, date_of_update, date_of_expiry
      FROM medicines
      WHERE user_credential = $1;
    `;
    const result = await client.query(query, [user_credential]);

    // Return the list of medicines
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Medicines for the user retrieved successfully',
        medicines: result.rows,
      }),
    };
  } catch (error) {
    // Log the error for debugging
    console.error('Error fetching medicines for user:', error);
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
