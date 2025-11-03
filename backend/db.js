const { Pool } = require("pg");

const pool = new Pool({
  connectionString:
    "postgresql://neondb_owner:npg_j5OVBHipsX0U@ep-twilight-grass-adan3naf-pooler.c-2.us-east-1.aws.neon.tech/neondb",
  ssl: {
    rejectUnauthorized: false, // Required for Neon
  },
});

// Async function to initialize database tables
const initializeDatabase = async () => {
  try {
    // 1. Create the users table (if it doesn't exist)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(150) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        current_streak INTEGER NOT NULL DEFAULT 0,
        last_activity_date DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log("✅ Users table is ready!");

    // 2. Add columns to users table if they don't exist (for existing databases)
    await pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS current_streak INTEGER NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS last_activity_date DATE
    `);

    // 3. Create the assignments table (if it doesn't exist)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS assignments (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          title VARCHAR(255) NOT NULL,
          description TEXT,
          subject VARCHAR(100),
          due_date TIMESTAMPTZ NOT NULL,
          is_completed BOOLEAN NOT NULL DEFAULT false,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    console.log("✅ Assignments table is ready!");

    // 4. Create task_history table to track completed tasks per day
    await pool.query(`
      CREATE TABLE IF NOT EXISTS task_history (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          task_id INTEGER NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
          completed_date DATE NOT NULL,
          task_title VARCHAR(255) NOT NULL,
          completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          UNIQUE(user_id, task_id, completed_date)
      )
    `);
    console.log("✅ Task history table is ready!");
    
    // 5. Confirm connection
    const res = await pool.query("SELECT NOW()");
    console.log("DB connected at:", res.rows[0].now);

  } catch (err) {
    console.error("❌ Error initializing database tables:", err);
  }
};

// Run the initialization
initializeDatabase();

module.exports = pool;