const express = require("express");
const { auth, requireRole } = require("../middleware/auth");
const prisma = require("../utils/prisma");
const { logAction } = require("../utils/audit");

const router = express.Router();

// Get all tasks
router.get("/", auth, async (req, res) => {
  try {
    const tasks = await prisma.task.findMany({
      include: {
        user: { select: { id: true, name: true, email: true, profile_image: true } }
      },
      orderBy: { created_at: "desc" },
    });
    res.json(tasks);
  } catch (error) {
    console.error("Error fetching tasks:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Create task
router.post("/", auth, requireRole(["ADMIN", "MANAGER"]), async (req, res) => {
  try {
    const { title, description, assigned_to } = req.body;
    
    const task = await prisma.task.create({
      data: {
        title,
        description,
        assigned_to: assigned_to || null,
        status: "TODO"
      },
      include: {
        user: { select: { id: true, name: true, email: true, profile_image: true } }
      }
    });

    await logAction(req.user.userId, "CREATED", "TASK", task.id);
    
    res.status(201).json(task);
  } catch (error) {
    console.error("Error creating task:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Update task status (for drag and drop)
router.put("/:id/status", auth, async (req, res) => {
  try {
    const { status } = req.body;
    
    // Only allow specific statuses
    if (!["TODO", "IN_PROGRESS", "DONE"].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    const task = await prisma.task.update({
      where: { id: req.params.id },
      data: { status },
      include: {
        user: { select: { id: true, name: true, email: true, profile_image: true } }
      }
    });

    await logAction(req.user.userId, "UPDATED", "TASK_STATUS", task.id);
    
    res.json(task);
  } catch (error) {
    console.error("Error updating task status:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Delete task
router.delete("/:id", auth, requireRole(["ADMIN", "MANAGER"]), async (req, res) => {
  try {
    await prisma.task.delete({
      where: { id: req.params.id }
    });

    await logAction(req.user.userId, "DELETED", "TASK", req.params.id);
    
    res.json({ message: "Task deleted successfully" });
  } catch (error) {
    console.error("Error deleting task:", error);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
