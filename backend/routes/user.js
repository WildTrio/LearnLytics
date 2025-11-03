const express = require('express');
const jwt = require("jsonwebtoken");
const { JWT_SECRET } = require("../config");
const pool = require('../db');
const bcrypt = require("bcrypt");
const { z } = require("zod");
const { authMiddleware } = require('../middlewares/authMiddleware');
const { signupSchema, signinSchema, updateSchema } = require("../schemas/userSchema");

const router = express.Router();

// ---------------------
// Get all users (name + created_at) - for admin/testing
// ---------------------
router.get('/bulk', async (req, res) => {
    try {
        const result = await pool.query('SELECT name, created_at FROM users ORDER BY id');
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// ---------------------
// Signup route - creates user & returns JWT
// ---------------------
router.post('/signup', async (req, res) => {
    try {
        const { name, email, password } = signupSchema.parse(req.body);

        // Check if user exists
        const existingUser = await pool.query("SELECT * FROM users WHERE email=$1", [email]);
        if (existingUser.rows.length > 0) {
            return res.status(401).json({ msg: "User is already registered" });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert user
        const insertQuery = `
            INSERT INTO users (name, email, password)
            VALUES ($1,$2,$3) RETURNING id, name, email;
        `;
        const newUser = await pool.query(insertQuery, [name, email, hashedPassword]);

        // Create JWT including id
        const token = jwt.sign(
            {
                id: newUser.rows[0].id,
                email: newUser.rows[0].email,
                name: newUser.rows[0].name
            },
            JWT_SECRET,
            { expiresIn: "1h" }
        );

        res.status(201).json({
            msg: "User created successfully",
            token,
            user: newUser.rows[0]
        });

    } catch (err) {
        if (err instanceof z.ZodError) {
            const messages = err.issues.map(e => e.message);
            return res.status(400).json({ errors: messages });
        }
        console.error("Signup error:", err);
        res.status(500).json({ msg: "Internal server error" });
    }
});

// ---------------------
// Signin route - returns JWT
// ---------------------
router.post('/signin', async (req, res) => {
    try {
        const parsed = signinSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({
                msg: "Invalid request data",
                errors: parsed.error.errors
            });
        }

        const { email, password } = parsed.data;

        const userResult = await pool.query("SELECT * FROM users WHERE email=$1", [email]);
        if (userResult.rows.length === 0) {
            return res.status(400).json({ msg: "Email is not registered" });
        }

        const user = userResult.rows[0];
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({ msg: "Invalid password" });

        // Create JWT with id
        const token = jwt.sign(
            { id: user.id, email: user.email, name: user.name },
            JWT_SECRET,
            { expiresIn: "1h" }
        );

        res.status(200).json({ msg: "User logged in", token });

    } catch (err) {
        console.error("Signin error:", err);
        res.status(500).json({ msg: "Internal server error" });
    }
});

// ---------------------
// Get current user profile
// ---------------------
router.get("/me", authMiddleware, async (req, res) => {
    try {
        const userResult = await pool.query(
            "SELECT id, name, email FROM users WHERE id=$1",
            [req.user.id]
        );
        if (userResult.rows.length === 0) return res.status(404).json({ msg: "User not found" });

        res.status(200).json(userResult.rows[0]);
    } catch (err) {
        console.error("Get profile error:", err);
        res.status(500).json({ msg: "Internal server error" });
    }
});

// ---------------------
// Update user info (name + password)
// ---------------------
router.post('/update', authMiddleware, async (req, res) => {
    try {
        const parsed = updateSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({
                msg: "Invalid request data",
                errors: parsed.error.errors
            });
        }

        const { oldPassword, password: newPlainPassword, name } = req.body;

        const userResult = await pool.query("SELECT * FROM users WHERE id=$1", [req.user.id]);
        const user = userResult.rows[0];
        if (!user) return res.status(404).json({ msg: "User not found" });

        const isValid = await bcrypt.compare(oldPassword, user.password);
        if (!isValid) return res.status(401).json({ msg: "Wrong old password" });

        const newPassword = await bcrypt.hash(newPlainPassword, 10);
        const updatedUser = await pool.query(
            `UPDATE users SET name=$1, password=$2 WHERE id=$3 RETURNING id, name, email`,
            [name, newPassword, req.user.id]
        );

        res.status(200).json({
            msg: "User updated successfully",
            user: updatedUser.rows[0]
        });

    } catch (err) {
        console.error("Update user error:", err);
        res.status(500).json({ msg: "Internal server error" });
    }
});

// ---------------------
// Delete user
// ---------------------
router.delete('/delete', authMiddleware, async (req, res) => {
    try {
        const { password } = req.body;

        const userResult = await pool.query("SELECT * FROM users WHERE id=$1", [req.user.id]);
        const user = userResult.rows[0];
        if (!user) return res.status(404).json({ msg: "User not found" });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({ msg: "Wrong password" });

        const deleted = await pool.query(
            "DELETE FROM users WHERE id=$1 RETURNING id, name, email",
            [req.user.id]
        );

        res.status(200).json({
            msg: "User deleted successfully",
            deletedUser: deleted.rows[0]
        });

    } catch (err) {
        console.error("Delete user error:", err);
        res.status(500).json({ msg: "Internal server error" });
    }
});

module.exports = router;
