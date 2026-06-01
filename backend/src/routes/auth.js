const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const prisma = require("../utils/prisma");

const router = express.Router();

router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: "Email already in use" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: email === "junnuedits@gmail.com" ? "ADMIN" : "CASHIER",
      },
    });

    res.status(201).json({ message: "User registered successfully", userId: user.id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(400).json({ error: "Invalid email or password" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: "Invalid email or password" });
    }

    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET || "default_secret",
      { expiresIn: "1d" }
    );

    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role, profile_image: user.profile_image, branch_id: user.branch_id } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
});

const { auth } = require("../middleware/auth");

router.put("/profile", auth, async (req, res) => {
  try {
    const { name, email, profile_image } = req.body;
    const userId = req.user.userId; // injected by auth middleware

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { name, email, profile_image }
    });

    res.json({ id: updatedUser.id, name: updatedUser.name, email: updatedUser.email, role: updatedUser.role, profile_image: updatedUser.profile_image });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error updating profile" });
  }
});

router.put("/password", auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.userId;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: "Incorrect current password" });
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedNewPassword }
    });

    res.json({ message: "Password updated successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error updating password" });
  }
});

// Get all users
router.get("/users", auth, async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true, profile_image: true, branch_id: true }
    });
    res.json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ error: "Server error fetching users" });
  }
});

module.exports = router;
