const express = require("express");
const prisma = require("../utils/prisma");
const { auth, requireRole } = require("../middleware/auth");

const router = express.Router();

// GET /api/inventory - Fetch all inventory logs
router.get("/", auth, requireRole(["ADMIN", "MANAGER"]), async (req, res) => {
  try {
    const logs = await prisma.inventoryLog.findMany({
      include: {
        product: {
          select: {
            name: true,
            sku: true,
            image_url: true,
          }
        }
      },
      orderBy: {
        created_at: 'desc'
      }
    });

    res.json(logs);
  } catch (error) {
    console.error("Error fetching inventory logs:", error);
    res.status(500).json({ error: "Server error fetching inventory logs" });
  }
});

module.exports = router;
