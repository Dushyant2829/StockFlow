const pool = require("./db");

async function testConnection() {
  try {
    const [rows] = await pool.query("SELECT VERSION() AS version");
    console.log("Connected to MySQL!");
    console.log("MySQL version:", rows[0].version);
  } catch (error) {
    console.error("Database connection failed:", error.message);
  } finally {
    await pool.end();
  }
}

testConnection();