const express = require("express");
const { auth, requireRole } = require("../middleware/auth");
const prisma = require("../utils/prisma");
const { logAction } = require("../utils/audit");

const router = express.Router();

// Get all returns
router.get("/", auth, async (req, res) => {
  try {
    const returns = await prisma.return.findMany({
      include: {
        invoice: {
          include: { customer: true }
        },
      },
      orderBy: { created_at: "desc" },
    });
    res.json(returns);
  } catch (error) {
    console.error("Error fetching returns:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Create a return
router.post("/", auth, async (req, res) => {
  try {
    const { invoice_id, items, reason } = req.body;
    // items should be: [{ product_id, quantity, refund_amount, restock }]

    const return_number = `RET-${Date.now()}`;
    const total_refunded = items.reduce((acc, item) => acc + item.refund_amount, 0);

    const result = await prisma.$transaction(async (tx) => {
      // 1. Create the Return record
      const returnRecord = await tx.return.create({
        data: {
          invoice_id,
          return_number,
          total_refunded,
          reason,
          items: {
            create: items.map(item => ({
              product_id: item.product_id,
              quantity: item.quantity,
              refund_amount: item.refund_amount,
              restock: item.restock
            }))
          }
        },
        include: { items: true }
      });

      // 2. Adjust inventory for items being restocked
      for (const item of items) {
        if (item.restock) {
          // Increment stock
          await tx.product.update({
            where: { id: item.product_id },
            data: { stock: { increment: item.quantity } }
          });

          // Log stock increment
          await tx.inventoryLog.create({
            data: {
              product_id: item.product_id,
              action_type: "RETURN",
              quantity: item.quantity,
              notes: `Restocked from return ${return_number}`
            }
          });
        }
      }

      return returnRecord;
    }, {
      maxWait: 10000,
      timeout: 20000,
    });

    // Log audit action
    await logAction(req.user.userId, "CREATED", "RETURN", result.id);

    res.status(201).json(result);
  } catch (error) {
    console.error("Error creating return:", error);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
