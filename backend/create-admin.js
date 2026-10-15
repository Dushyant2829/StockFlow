
const bcrypt = require("bcrypt");
const pool = require("./db");
const readline = require("readline/promises");
const { stdin, stdout } = require("process");

async function createAdmin() {
  const rl = readline.createInterface({
    input: stdin,
    output: stdout
  });

  try {
    const [existingAdmins] = await pool.execute(
      "SELECT id FROM users WHERE role = ? LIMIT 1",
      ["admin"]
    );

    if (existingAdmins.length > 0) {
      console.log("An admin account already exists.");
      return;
    }

    const name = (await rl.question("Admin name: ")).trim();
    const email = (
      await rl.question("Admin email: ")
    ).trim().toLowerCase();
    const password = await rl.question("Admin password: ");

    if (!name || !email || !password.trim()) {
      console.log("Name, email, and password are required.");
      return;
    }

    if (password.length < 12) {
      console.log("Use a password with at least 12 characters.");
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await pool.execute(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES (?, ?, ?, ?)`,
      [name, email, passwordHash, "admin"]
    );

    console.log("Admin account created successfully!");
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      console.log("That email is already registered.");
    } else {
      console.error("Could not create admin:", error.message);
    }
  } finally {
    rl.close();
    await pool.end();
  }
}

createAdmin();
