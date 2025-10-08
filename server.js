import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import pkg from "pg";
import dotenv from "dotenv";

dotenv.config();
const { Pool } = pkg;

const app = express();
app.use(cors());
app.use(bodyParser.json());

// --- Connect to Neon ---
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// --- Auto create tables if not exist ---
async function initTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS schedule (
      id SERIAL PRIMARY KEY,
      data JSONB,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS shipment (
      id SERIAL PRIMARY KEY,
      data JSONB,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS miscellaneous (
      id SERIAL PRIMARY KEY,
      data JSONB,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  console.log("✅ Tables verified/created successfully");
}

// --- TEST ROUTE ---
app.get("/", (req, res) => {
  res.send("✅ Warehouse Backend is running with Neon!");
});

// --- USERS ---
app.get("/api/users", async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT username, password, role FROM users");
    res.json(rows);
  } catch (err) {
    console.error("Error fetching users:", err);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

app.post("/api/users", async (req, res) => {
  const { username, password, role } = req.body;
  try {
    await pool.query(
      `INSERT INTO users (username, password, role)
       VALUES ($1, $2, $3)
       ON CONFLICT (username) DO NOTHING`,
      [username, password, role]
    );
    res.json({ success: true });
  } catch (err) {
    console.error("Error adding user:", err);
    res.status(500).json({ error: "Failed to add user" });
  }
});

// --- SCHEDULE ---
app.get("/api/schedule", async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM schedule ORDER BY created_at DESC");
    res.json(rows);
  } catch (err) {
    console.error("Error fetching schedule:", err);
    res.status(500).json({ error: "Failed to fetch schedule" });
  }
});

app.post("/api/schedule", async (req, res) => {
  try {
    const { data } = req.body;
    const { rows } = await pool.query(
      "INSERT INTO schedule (data) VALUES ($1) RETURNING *",
      [data]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error("Error adding schedule:", err);
    res.status(500).json({ error: "Failed to add schedule" });
  }
});

// --- SHIPMENT ---
app.get("/api/shipment", async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM shipment ORDER BY created_at DESC");
    res.json(rows);
  } catch (err) {
    console.error("Error fetching shipment:", err);
    res.status(500).json({ error: "Failed to fetch shipment" });
  }
});

app.post("/api/shipment", async (req, res) => {
  try {
    const { data } = req.body;
    const { rows } = await pool.query(
      "INSERT INTO shipment (data) VALUES ($1) RETURNING *",
      [data]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error("Error adding shipment:", err);
    res.status(500).json({ error: "Failed to add shipment" });
  }
});

// --- MISCELLANEOUS ---

// GET all miscellaneous records
app.get("/api/miscellaneous", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM miscellaneous ORDER BY created_at DESC"
    );
    res.json(result.rows);
  } catch (err) {
    console.error("❌ Error fetching miscellaneous:", err);
    res.status(500).json({ error: "Failed to fetch miscellaneous" });
  }
});

// SAVE new miscellaneous record
app.post("/api/miscellaneous/save", async (req, res) => {
  try {
    const { data } = req.body;
    if (!data) {
      return res.status(400).json({ error: "Missing 'data' in request body" });
    }

    // Always insert JSONB safely
    await pool.query("INSERT INTO miscellaneous (data) VALUES ($1)", [
      JSON.stringify(data),
    ]);

    res.json({ success: true });
  } catch (err) {
    console.error("❌ Error saving miscellaneous:", err);
    res.status(500).json({ error: "Failed to save miscellaneous" });
  }
});



// --- START SERVER ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, async () => {
  await initTables(); // ✅ Ensure all tables exist
  console.log(`🚀 Backend running on http://localhost:${PORT}`);
});
