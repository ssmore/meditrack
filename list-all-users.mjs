import pg from 'pg'; 
const { Client } = pg;

// Database configuration from environment variables
const DB_CONFIG = {
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT, // Default PostgreSQL port
  ssl: { rejectUnauthorized: false }, // For RDS SSL
};

export const handler = async (event) => {
  const client = new Client(DB_CONFIG);

  try {
    // Connect to the database
    await client.connect();

    // Query to fetch all users
    const query = 'SELECT user_id, user_name, user_credential FROM users;';
    const result = await client.query(query);

    // Return the results
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Users retrieved successfully',
        users: result.rows,
      }),
    };
  } catch (error) {
    console.error('Error fetching users:', error);

    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to fetch users' }),
    };
  } finally {
    // Ensure the client connection is closed
    await client.end();
  }
};
