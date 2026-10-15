
require("dotenv").config();
if (!process.env.SESSION_SECRET) {
    throw new Error("SESSION_SECRET is missing from the environment.");
}

const express = require("express");
const cors = require("cors");
const session = require("express-session");
const bcrypt = require("bcrypt");
const pool = require("./db");

const app = express();
const PORT = process.env.PORT || 3000;

// Allow requests only from the frontend development addresses.
// Credentials are enabled because login uses a session cookie.
const allowedOrigins = [
    "http://127.0.0.1:5500",
    "http://127.0.0.1:3001",
    "http://localhost:5500"
];

app.use(cors({
    origin: allowedOrigins,
    credentials: true
}));

// Parse incoming JSON request bodies so routes can access req.body.
app.use(express.json());

// Configure session-based authentication.
// The secret must come from the environment, never be hardcoded.
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,             // Prevent client-side JS from reading the cookie.
        secure: false,              // Local HTTP only; use true with production HTTPS.
        sameSite: "lax",            // Restrict cookies in many cross-site requests.
        maxAge: 1000 * 60 * 60      // Session cookie expires after one hour.
    }
}));

// Middleware that protects routes requiring an authenticated user.
function requireAuth(req, res, next) {
    if (!req.session.user) {
        return res.status(401).json({
            message: "Authentication required."
        });
    }

    next();
}


/*
 * GET /api/products
 * Return all products stored in the database.
 * Authentication is required before the database is queried.
 */
app.get("/api/products", requireAuth, async (req, res) => {
    try {
        const [rows] = await pool.query(
            "SELECT * FROM products"
        );

        return res.json(rows);
    } catch (error) {
        // Log technical details on the server, not in the client response.
        console.error("Error fetching products:", error.message);

        return res.status(500).json({
            message: "Could not fetch products."
        });
    }
});

/*
 * GET /api/products/:id
 * Return a single product using its database ID.
 */
app.get("/api/products/:id", requireAuth, async (req, res) => {
    const id = Number(req.params.id);

    // Reject invalid IDs before making a database request.
    if (!Number.isSafeInteger(id) || id <= 0) {
        return res.status(400).json({
            message: "Invalid product ID."
        });
    }

    try {
        const [rows] = await pool.execute(
            "SELECT * FROM products WHERE id = ?",
            [id]
        );

        // A valid ID may still refer to a product that does not exist.
        if (rows.length === 0) {
            return res.status(404).json({
                message: "Product not found."
            });
        }

        return res.json(rows[0]);
    } catch (error) {
        console.error("Error fetching product:", error.message);

        return res.status(500).json({
            message: "Could not fetch product."
        });
    }
});

/*
 * PATCH /api/products/:id
 * Update only the fields supplied by the client.
 * Authentication is required before changes are made.
 */
app.patch("/api/products/:id", requireAuth, async (req, res) => {
    const id = Number(req.params.id);
    const updates = req.body;

    // Validate the product ID.
    if (!Number.isSafeInteger(id) || id <= 0) {
        return res.status(400).json({
            message: "Invalid product ID."
        });
    }

    // Require a JSON object as the request body.
    if (!updates || typeof updates !== "object" || Array.isArray(updates)) {
        return res.status(400).json({
            message: "Request body must be a JSON object."
        });
    }

    // Only these database fields can be modified through this route.
    const allowedFields = [
        "name",
        "sku",
        "category",
        "location",
        "quantity",
        "minStock"
    ];

    const fields = Object.keys(updates);

    if (fields.length === 0) {
        return res.status(400).json({
            message: "Provide at least one field to update."
        });
    }

    // Reject unknown fields before building the SQL query.
    if (fields.some(field => !allowedFields.includes(field))) {
        return res.status(400).json({
            message: "One or more fields cannot be updated."
        });
    }

    // Text fields must contain non-empty strings.
    for (const field of ["name", "sku", "category", "location"]) {
        if (
            field in updates &&
            (typeof updates[field] !== "string" || !updates[field].trim())
        ) {
            return res.status(400).json({
                message: `${field} must be a non-empty string.`
            });
        }
    }

    // Stock quantities must be non-negative whole numbers.
    for (const field of ["quantity", "minStock"]) {
        if (
            field in updates &&
            (!Number.isSafeInteger(updates[field]) || updates[field] < 0)
        ) {
            return res.status(400).json({
                message: `${field} must be a non-negative whole number.`
            });
        }
    }

    // Trim text input and standardize SKU capitalization.
    const normalizedUpdates = { ...updates };

    for (const field of ["name", "category", "location"]) {
        if (field in normalizedUpdates) {
            normalizedUpdates[field] = normalizedUpdates[field].trim();
        }
    }

    if ("sku" in normalizedUpdates) {
        normalizedUpdates.sku = normalizedUpdates.sku.trim().toUpperCase();
    }

    try {
        // Column names come only from the allowlist; values use placeholders.
        const columns = Object.keys(normalizedUpdates);
        const setClause = columns
            .map(field => `\`${field}\` = ?`)
            .join(", ");

        const values = columns.map(field => normalizedUpdates[field]);

        const [result] = await pool.execute(
            `UPDATE products SET ${setClause} WHERE id = ?`,
            [...values, id]
        );

        // Check existence separately: an unchanged update may affect zero rows.
        const [rows] = await pool.execute(
            "SELECT * FROM products WHERE id = ?",
            [id]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                message: "Product not found."
            });
        }

        return res.json(rows[0]);
    } catch (error) {
        // A duplicate SKU violates the database's UNIQUE constraint.
        if (error.code === "ER_DUP_ENTRY") {
            return res.status(409).json({
                message: "A product with this SKU already exists."
            });
        }

        console.error("Error updating product:", error.message);

        return res.status(500).json({
            message: "Could not update product."
        });
    }
});

/*
 * DELETE /api/products/:id
 * Delete a product using its database ID.
 */
app.delete("/api/products/:id", requireAuth, async (req, res) => {
    const id = Number(req.params.id);

    // Validate the ID before querying the database.
    if (!Number.isSafeInteger(id) || id <= 0) {
        return res.status(400).json({
            message: "Invalid product ID."
        });
    }

    try {
        // Delete only the product matching the supplied ID.
        const [result] = await pool.execute(
            "DELETE FROM products WHERE id = ?",
            [id]
        );

        // No affected rows means the product did not exist.
        if (result.affectedRows === 0) {
            return res.status(404).json({
                message: "Product not found."
            });
        }

        return res.json({
            message: "Product deleted successfully."
        });
    } catch (error) {
        console.error("Error deleting product:", error.message);

        return res.status(500).json({
            message: "Could not delete product."
        });
    }
});


/*
 * POST /api/products
 * Validate and create a new product in the database.
 */
app.post("/api/products", requireAuth, async (req, res) => {
    const { name, sku, category, location, quantity, minStock } = req.body;

    // Validate the required text fields.
    if (
        typeof name !== "string" || !name.trim() ||
        typeof sku !== "string" || !sku.trim() ||
        typeof category !== "string" || !category.trim() ||
        typeof location !== "string" || !location.trim()
    ) {
        return res.status(400).json({
            message: "Name, SKU, category and location are required."
        });
    }

    // Validate quantities as non-negative whole numbers.
    if (
        !Number.isSafeInteger(quantity) || quantity < 0 ||
        !Number.isSafeInteger(minStock) || minStock < 0
    ) {
        return res.status(400).json({
            message: "Quantity and minimum stock must be non-negative whole numbers."
        });
    }

    // Normalize text fields before saving.
    const normalizedName = name.trim();
    const normalizedSku = sku.trim().toUpperCase();
    const normalizedCategory = category.trim();
    const normalizedLocation = location.trim();

    try {
        // Insert the new product using parameterized SQL.
        const [result] = await pool.execute(
            `INSERT INTO products
                (name, sku, category, location, quantity, minStock)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
                normalizedName,
                normalizedSku,
                normalizedCategory,
                normalizedLocation,
                quantity,
                minStock
            ]
        );

        // Return the saved product, including its generated ID.
        const newProduct = {
            id: result.insertId,
            name: normalizedName,
            sku: normalizedSku,
            category: normalizedCategory,
            location: normalizedLocation,
            quantity,
            minStock
        };

        return res.status(201).json(newProduct);
    } catch (error) {
        // SKU values must be unique in the database.
        if (error.code === "ER_DUP_ENTRY") {
            return res.status(409).json({
                message: "A product with this SKU already exists."
            });
        }

        console.error("Error creating product:", error.message);

        return res.status(500).json({
            message: "Could not create product."
        });
    }
});

/*
 * POST /api/auth/login
 * Verify credentials and create a session for the authenticated user.
 */
app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body;

    // Reject missing or invalid input before querying the database.
    if (
        typeof email !== "string" ||
        typeof password !== "string" ||
        !email.trim() ||
        !password
    ) {
        return res.status(400).json({
            message: "Email and password are required."
        });
    }

    try {
        // Look up the account using a normalized email address.
        const [users] = await pool.execute(
            `SELECT id, name, email, password_hash, role
             FROM users
             WHERE email = ?
             LIMIT 1`,
            [email.trim().toLowerCase()]
        );

        // Use a generic error to avoid revealing whether an email exists.
        if (users.length === 0) {
            return res.status(401).json({
                message: "Invalid email or password."
            });
        }

        const user = users[0];

        // Compare the submitted password against its stored bcrypt hash.
        const passwordMatches = await bcrypt.compare(
            password,
            user.password_hash
        );

        if (!passwordMatches) {
            return res.status(401).json({
                message: "Invalid email or password."
            });
        }

        // Generate a fresh session ID after successful authentication.
        req.session.regenerate((error) => {
            if (error) {
                console.error("Session regeneration failed:", error);

                return res.status(500).json({
                    message: "Could not create a login session."
                });
            }

            // Store only the user information needed by the application.
            req.session.user = {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role
            };

            // Save the session before sending the successful response.
            req.session.save((error) => {
                if (error) {
                    console.error("Session save failed:", error);

                    return res.status(500).json({
                        message: "Could not create a login session."
                    });
                }

                return res.json({
                    message: "Login successful.",
                    user: req.session.user
                });
            });
        });
    } catch (error) {
        console.error("Login error:", error.message);

        return res.status(500).json({
            message: "An internal server error occurred."
        });
    }
});

/*
 * GET /api/auth/me
 * Return the current user's session information.
 * The frontend uses this endpoint to check login status.
 */
app.get("/api/auth/me", (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({
            message: "Not authenticated."
        });
    }

    return res.json({
        user: req.session.user
    });
});

/*
 * POST /api/auth/logout
 * Destroy the current session and clear its browser cookie.
 */
app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((error) => {
        if (error) {
            console.error("Logout failed:", error);

            return res.status(500).json({
                message: "Could not log out."
            });
        }

        // Remove the session cookie from the browser.
        res.clearCookie("connect.sid", {
            httpOnly: true,
            sameSite: "lax",
            secure: false,
            path: "/"
        });

        return res.json({
            message: "Logged out successfully."
        });
    });
});


// Root route
app.get("/", (req, res) => {
  res.send("StockFlow backend is running!");
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
