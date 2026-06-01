const express = require("express");
const { auth, requireRole } = require("../middleware/auth");
const prisma = require("../utils/prisma");
const { logAction } = require("../utils/audit");

const router = express.Router();

// Get all categories
router.get("/", auth, async (req, res) => {
  try {
    const categories = await prisma.category.findMany();
    res.json(categories);
  } catch (error) {
    console.error("Error fetching categories:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Create category
router.post("/", auth, requireRole(["ADMIN", "MANAGER"]), async (req, res) => {
  try {
    const { name, description } = req.body;
    
    const category = await prisma.category.create({
      data: {
        name,
        description,
      },
    });

    // Log audit action
    await logAction(req.user.userId, "CREATED", "CATEGORY", category.id);

    res.status(201).json(category);
  } catch (error) {
    console.error("Error creating category:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Update category
router.put("/:id", auth, requireRole(["ADMIN", "MANAGER"]), async (req, res) => {
  try {
    const { name, description } = req.body;
    
    const category = await prisma.category.update({
      where: { id: req.params.id },
      data: {
        name,
        description,
      },
    });

    // Log audit action
    await logAction(req.user.userId, "UPDATED", "CATEGORY", category.id);

    res.json(category);
  } catch (error) {
    console.error("Error updating category:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Delete category
router.delete("/:id", auth, requireRole(["ADMIN"]), async (req, res) => {
  try {
    await prisma.category.delete({
      where: { id: req.params.id },
    });

    // Log audit action
    await logAction(req.user.userId, "DELETED", "CATEGORY", req.params.id);

    res.json({ message: "Category deleted successfully" });
  } catch (error) {
    console.error("Error deleting category:", error);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
