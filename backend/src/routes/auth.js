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

    // Auto-upgrade to ADMIN if it's the specific email
    if (user.email.toLowerCase().trim() === "junnuedits@gmail.com" && user.role !== "ADMIN") {
      await prisma.user.update({
        where: { id: user.id },
        data: { role: "ADMIN" }
      });
      user.role = "ADMIN";
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

// Temporary endpoint to inject 5 real-life products and 5 customers
router.get("/inject-samples", async (req, res) => {
  try {
    let category = await prisma.category.findFirst({ where: { name: "Tech & Gear" } });
    if (!category) {
      category = await prisma.category.create({
        data: { name: "Tech & Gear", description: "Premium technology products" }
      });
    }

    const products = [
      { name: "iPhone 15 Pro Max", sku: "APP-15PM", description: "256GB Natural Titanium", purchase_price: 110000, selling_price: 135000, stock: 45, min_stock: 5, image_url: "https://images.unsplash.com/photo-1696446701796-da61225697cc?w=800&q=80", category_id: category.id },
      { name: "Sony WH-1000XM5", sku: "SNY-XM5", description: "Noise Cancelling Headphones", purchase_price: 22000, selling_price: 29990, stock: 120, min_stock: 10, image_url: "https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?w=800&q=80", category_id: category.id },
      { name: "MacBook Pro 16-inch", sku: "APP-MBP16", description: "M3 Max, 36GB RAM, 1TB SSD", purchase_price: 280000, selling_price: 310000, stock: 12, min_stock: 2, image_url: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&q=80", category_id: category.id },
      { name: "DJI Mini 4 Pro", sku: "DJI-M4P", description: "Drone with 4K HDR Video", purchase_price: 65000, selling_price: 82000, stock: 8, min_stock: 2, image_url: "https://images.unsplash.com/photo-1579829366248-204fe8413f31?w=800&q=80", category_id: category.id },
      { name: "Samsung Galaxy S24 Ultra", sku: "SAM-S24U", description: "512GB Titanium Black", purchase_price: 95000, selling_price: 129999, stock: 35, min_stock: 5, image_url: "https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=800&q=80", category_id: category.id }
    ];

    for (const p of products) {
      await prisma.product.upsert({
        where: { sku: p.sku },
        update: {},
        create: p
      });
    }

    const customers = [
      { name: "Rahul Sharma", phone: "9876543210", email: "rahul@example.com", address: "Mumbai, MH" },
      { name: "Priya Patel", phone: "9876543211", email: "priya@example.com", address: "Ahmedabad, GJ" },
      { name: "Tech Solutions Inc.", phone: "9876543212", email: "purchasing@techsolutions.com", address: "Bengaluru, KA", gst_number: "29ABCDE1234F1Z5" },
      { name: "Amit Kumar", phone: "9876543213", email: "amit@example.com", address: "Delhi, DL" },
      { name: "Sneha Reddy", phone: "9876543214", email: "sneha@example.com", address: "Hyderabad, TS" }
    ];

    for (const c of customers) {
      const exists = await prisma.customer.findFirst({ where: { phone: c.phone } });
      if (!exists) {
        await prisma.customer.create({ data: c });
      }
    }

    res.json({ message: "Successfully injected 5 real-life products and 5 customers!" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to inject data" });
  }
});

module.exports = router;
