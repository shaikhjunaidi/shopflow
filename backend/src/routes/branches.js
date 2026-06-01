const express = require("express");
const { auth, requireRole } = require("../middleware/auth");
const prisma = require("../utils/prisma");
const { logAction } = require("../utils/audit");

const router = express.Router();

// Get all branches
router.get("/", auth, async (req, res) => {
  try {
    const branches = await prisma.branch.findMany({
      orderBy: { name: "asc" }
    });
    res.json(branches);
  } catch (error) {
    console.error("Error fetching branches:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Create branch
router.post("/", auth, requireRole(["ADMIN"]), async (req, res) => {
  try {
    const { name, address, phone } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: "Name is required" });
    }

    const branch = await prisma.branch.create({
      data: { name, address, phone }
    });

    // When a branch is created, we don't automatically create stock records,
    // they will be created during a stock transfer or explicit stock initialization.

    await logAction(req.user.userId, "CREATED", "BRANCH", branch.id);
    
    res.status(201).json(branch);
  } catch (error) {
    console.error("Error creating branch:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Update branch
router.put("/:id", auth, requireRole(["ADMIN"]), async (req, res) => {
  try {
    const { name, address, phone } = req.body;
    
    const branch = await prisma.branch.update({
      where: { id: req.params.id },
      data: { name, address, phone }
    });

    await logAction(req.user.userId, "UPDATED", "BRANCH", branch.id);
    
    res.json(branch);
  } catch (error) {
    console.error("Error updating branch:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Get stock for a branch
router.get("/:id/stock", auth, async (req, res) => {
  try {
    const stock = await prisma.branchStock.findMany({
      where: { branch_id: req.params.id },
      include: {
        product: {
          include: { category: true }
        }
      }
    });
    res.json(stock);
  } catch (error) {
    console.error("Error fetching branch stock:", error);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
