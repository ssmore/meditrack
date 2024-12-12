import pkg from 'pg'; // Import the pg CommonJS module
const { Client } = pkg; // Destructure the Client from the default export

// Database configuration
const DB_CONFIG = {
    user: "postgres",
    host: "database-4.cd4a6qiqkgn0.us-east-2.rds.amazonaws.com",
    database: "meditrack",
    password: "h$N#W819!>F1",
    port: 5432, // Default PostgreSQL port
    ssl: { rejectUnauthorized: false }, // For RDS SSL
};

export const handler = async (event) => {
  const client = new Client(DB_CONFIG);

  try {
    // Check the HTTP method
    if (event.httpMethod !== "POST") {
      return {
        statusCode: 405,
        body: JSON.stringify({ error: "Method Not Allowed" }),
      };
    }

    // Parse and validate the request body
    const { user_name } = JSON.parse(event.body || "{}");
    if (!user_name) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing required field: user_name" }),
      };
    }

    // Connect to the database
    await client.connect();

    // Check if the user_name already exists
    const checkQuery = "SELECT COUNT(*) FROM users WHERE user_name = $1";
    const checkResult = await client.query(checkQuery, [user_name]);
    if (parseInt(checkResult.rows[0].count, 10) > 0) {
      return {
        statusCode: 409,
        body: JSON.stringify({ error: "Username already exists" }),
      };
    }

    // Insert the new user into the database
    const insertQuery = `
      INSERT INTO users (user_name)
      VALUES ($1)
      RETURNING user_id, user_name, user_credential;
    `;
    const result = await client.query(insertQuery, [user_name]);

    // Return the newly created user
    return {
      statusCode: 201,
      body: JSON.stringify({
        message: "User created successfully",
        user: result.rows[0],
      }),
    };
  } catch (error) {
    console.error("Error creating user:", error);

    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Internal Server Error" }),
    };
  } finally {
    // Ensure the client connection is closed
    await client.end();
  }
};
