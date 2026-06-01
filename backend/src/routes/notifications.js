const express = require("express");
const prisma = require("../utils/prisma");
const { auth } = require("../middleware/auth");

const router = express.Router();

// GET /api/notifications - Fetch all notifications
router.get("/", auth, async (req, res) => {
  try {
    const notifications = await prisma.notification.findMany({
      orderBy: { created_at: 'desc' },
      take: 20 // Limit to recent 20 for performance
    });
    res.json(notifications);
  } catch (error) {
    console.error("Error fetching notifications:", error);
    res.status(500).json({ error: "Server error fetching notifications" });
  }
});

// PUT /api/notifications/read - Mark all as read
router.put("/read", auth, async (req, res) => {
  try {
    await prisma.notification.updateMany({
      where: { is_read: false },
      data: { is_read: true }
    });
    res.json({ message: "All notifications marked as read" });
  } catch (error) {
    console.error("Error marking notifications as read:", error);
    res.status(500).json({ error: "Server error updating notifications" });
  }
});

module.exports = router;
