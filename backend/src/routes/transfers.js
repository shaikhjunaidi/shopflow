const express = require("express");
const { auth, requireRole } = require("../middleware/auth");
const prisma = require("../utils/prisma");
const { logAction } = require("../utils/audit");

const router = express.Router();

// Get all transfers
router.get("/", auth, async (req, res) => {
  try {
    const transfers = await prisma.stockTransfer.findMany({
      include: {
        source_branch: true,
        target_branch: true,
        product: true,
        user: { select: { name: true } }
      },
      orderBy: { created_at: "desc" }
    });
    res.json(transfers);
  } catch (error) {
    console.error("Error fetching transfers:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Create a stock transfer
router.post("/", auth, requireRole(["ADMIN", "MANAGER"]), async (req, res) => {
  try {
    const { source_branch_id, target_branch_id, product_id, quantity } = req.body;
    
    if (!source_branch_id || !target_branch_id || !product_id || !quantity) {
      return res.status(400).json({ error: "All fields are required" });
    }

    if (quantity <= 0) {
      return res.status(400).json({ error: "Quantity must be greater than 0" });
    }

    if (source_branch_id === target_branch_id) {
      return res.status(400).json({ error: "Source and target branches must be different" });
    }

    // Process inside a transaction
    const transfer = await prisma.$transaction(async (tx) => {
      // Check source branch stock
      const sourceStock = await tx.branchStock.findUnique({
        where: {
          branch_id_product_id: {
            branch_id: source_branch_id,
            product_id: product_id
          }
        }
      });

      if (!sourceStock || sourceStock.quantity < quantity) {
        throw new Error("Insufficient stock in source branch");
      }

      // Deduct from source branch
      await tx.branchStock.update({
        where: { id: sourceStock.id },
        data: { quantity: { decrement: quantity } }
      });

      // Add to target branch (or create if not exists)
      const targetStock = await tx.branchStock.findUnique({
        where: {
          branch_id_product_id: {
            branch_id: target_branch_id,
            product_id: product_id
          }
        }
      });

      if (targetStock) {
        await tx.branchStock.update({
          where: { id: targetStock.id },
          data: { quantity: { increment: quantity } }
        });
      } else {
        await tx.branchStock.create({
          data: {
            branch_id: target_branch_id,
            product_id: product_id,
            quantity: quantity
          }
        });
      }

      // Create transfer record
      const record = await tx.stockTransfer.create({
        data: {
          source_branch_id,
          target_branch_id,
          product_id,
          quantity,
          status: "COMPLETED",
          created_by: req.user.userId
        }
      });

      // Optional: Update InventoryLog
      await tx.inventoryLog.create({
        data: {
          product_id,
          action_type: "STOCK_OUT", // Out from source
          quantity,
          notes: `Transfer to branch ${target_branch_id}`
        }
      });

      return record;
    });

    await logAction(req.user.userId, "CREATED", "STOCK_TRANSFER", transfer.id);
    
    res.status(201).json(transfer);
  } catch (error) {
    console.error("Error creating transfer:", error);
    if (error.message === "Insufficient stock in source branch") {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
