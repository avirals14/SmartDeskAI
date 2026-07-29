const express = require("express");
const router = express.Router();

const userModel = require("../models/userModel");
const { hashPassword, verifyPassword, signToken } = require("../services/authService");
const { requireAuth } = require("../middleware/auth");

// POST /api/auth/signup  { name, email, password, role? }
router.post("/signup", async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: "name, email, and password are required" });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters" });
    }

    const existing = await userModel.findByEmail(email);
    if (existing) return res.status(409).json({ error: "An account with this email already exists" });

    // Only allow self-signup as customer or agent; admin accounts are seeded/created manually.
    const safeRole = role === "agent" ? "agent" : "customer";
    const passwordHash = await hashPassword(password);
    const user = await userModel.createUser({ name, email, passwordHash, role: safeRole });

    const token = signToken(user);
    res.status(201).json({ token, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Signup failed" });
  }
});

// POST /api/auth/login  { email, password }
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "email and password are required" });
    }

    const user = await userModel.findByEmail(email);
    const valid = user && (await verifyPassword(password, user.password_hash));
    if (!valid) return res.status(401).json({ error: "Invalid email or password" });

    const token = signToken(user);
    const { password_hash, ...safeUser } = user;
    res.json({ token, user: safeUser });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Login failed" });
  }
});

// GET /api/auth/me  — requires Authorization: Bearer <token>
router.get("/me", requireAuth, async (req, res) => {
  try {
    const user = await userModel.findById(req.user.sub);
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch profile" });
  }
});

module.exports = router;
