
require("dotenv").config();
const bcrypt = require("bcrypt");
const pool = require("./db");
const readline = require("readline");

function ask(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise(resolve => {
    rl.question(question, answer => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

function askHidden(question) {
  return new Promise((resolve, reject) => {
    if (!process.stdin.isTTY || !process.stdin.setRawMode) {
      reject(new Error("Run this script in the VS Code terminal."));
      return;
    }

    process.stdout.write(question);
    let password = "";

    const onKey = (character, key) => {
      if (key.name === "return" || key.name === "enter") {
        process.stdin.removeListener("keypress", onKey);
        process.stdin.setRawMode(false);
        process.stdin.pause();
        process.stdout.write("\n");
        resolve(password);
      } else if (key.name === "backspace") {
        password = password.slice(0, -1);
      } else if (key.ctrl && key.name === "c") {
        process.stdin.removeListener("keypress", onKey);
        process.stdin.setRawMode(false);
        process.stdin.pause();
        reject(new Error("Password reset cancelled."));
      } else if (!key.ctrl && !key.meta && character) {
        password += character;
      }
    };

    readline.emitKeypressEvents(process.stdin);
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.on("keypress", onKey);
  });
}

async function resetAdminPassword() {
  try {
    const email = (await ask("Admin email: ")).toLowerCase();
    const password = await askHidden("New password (hidden): ");

    if (password.length < 12) {
      console.log("Use at least 12 characters. No changes made.");
      return;
    }

    const [admins] = await pool.execute(
      "SELECT id FROM users WHERE email = ? AND role = ?",
      [email, "admin"]
    );

    if (admins.length !== 1) {
      console.log("Admin account not found. No changes made.");
      return;
    }

    const hash = await bcrypt.hash(password, 12);

    await pool.execute(
      "UPDATE users SET password_hash = ? WHERE id = ?",
      [hash, admins[0].id]
    );

    console.log("Admin password reset successfully.");
  } catch (error) {
    console.error("Password reset failed:", error.message);
  } finally {
    await pool.end();
  }
}

resetAdminPassword();
