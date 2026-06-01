const express = require("express");
const { auth, requireRole } = require("../middleware/auth");
const prisma = require("../utils/prisma");

const router = express.Router();

// GET /api/audit-logs - Fetch all audit logs
router.get("/", auth, requireRole(["ADMIN"]), async (req, res) => {
  try {
    const logs = await prisma.auditLog.findMany({
      include: {
        user: {
          select: {
            name: true,
            email: true,
            role: true
          }
        }
      },
      orderBy: {
        created_at: 'desc'
      }
    });

    res.json(logs);
  } catch (error) {
    console.error("Error fetching audit logs:", error);
    res.status(500).json({ error: "Server error fetching audit logs" });
  }
});

module.exports = router;
