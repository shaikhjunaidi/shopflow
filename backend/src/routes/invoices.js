const express = require("express");
const { auth, requireRole } = require("../middleware/auth");
const prisma = require("../utils/prisma");
const { logAction } = require("../utils/audit");

const router = express.Router();

// Get all invoices
router.get("/", auth, async (req, res) => {
  try {
    const invoices = await prisma.invoice.findMany({
      include: {
        customer: true,
      },
      orderBy: { created_at: "desc" },
    });
    res.json(invoices);
  } catch (error) {
    console.error("Error fetching invoices:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Get invoice by number
router.get("/number/:invoice_number", auth, async (req, res) => {
  try {
    const invoice = await prisma.invoice.findUnique({
      where: { invoice_number: req.params.invoice_number },
      include: {
        customer: true,
        items: {
          include: { product: true }
        }
      },
    });
    if (!invoice) return res.status(404).json({ error: "Invoice not found" });
    res.json(invoice);
  } catch (error) {
    console.error("Error fetching invoice by number:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Get single invoice by ID
router.get("/:id", auth, async (req, res) => {
  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id: req.params.id },
      include: {
        customer: true,
        items: {
          include: { product: true }
        }
      },
    });
    if (!invoice) return res.status(404).json({ error: "Invoice not found" });
    res.json(invoice);
  } catch (error) {
    console.error("Error fetching invoice:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Create invoice
router.post("/", auth, async (req, res) => {
  try {
    const { customer_id, items, discount_amount = 0 } = req.body;
    
    // Generate invoice number (e.g., INV-TIMESTAMP)
    const invoice_number = `INV-${Date.now()}`;
    
    let subtotal = 0;
    let total_tax = 0;

    // Calculate totals based on items (simplified: assuming flat 18% tax for demo)
    const processedItems = items.map(item => {
      const line_total = item.quantity * item.unit_price;
      const tax_amount = line_total * 0.18; // 18% GST mock
      
      subtotal += line_total;
      total_tax += tax_amount;

      return {
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        tax_amount: tax_amount,
        line_total: line_total
      };
    });

    const total_amount = subtotal + total_tax - discount_amount;

    const customerRecord = await prisma.customer.findUnique({ where: { id: customer_id } });

    // Use transaction to create invoice and update stock with extended timeout for serverless DBs
    const result = await prisma.$transaction(async (tx) => {
      // Create invoice
      const invoice = await tx.invoice.create({
        data: {
          customer_id: customerRecord.id,
          invoice_number,
          subtotal,
          tax_amount: total_tax,
          discount_amount: discount_amount || 0,
          total_amount,
          order_type: order_type || "IN_STORE",
          branch_id,
          items: {
            create: processedItems
          }
        },
        include: { items: true, customer: true }
      });

      // Decrease stock and create inventory logs
      for (const item of processedItems) {
        // Fallback: Also decrease global stock for backwards compatibility
        await tx.product.update({
          where: { id: item.product_id },
          data: { stock: { decrement: item.quantity } }
        });

        if (branch_id) {
          const branchStock = await tx.branchStock.findUnique({
            where: { branch_id_product_id: { branch_id, product_id: item.product_id } }
          });
          if (branchStock) {
            await tx.branchStock.update({
              where: { id: branchStock.id },
              data: { quantity: { decrement: item.quantity } }
            });
          }
        }

        await tx.inventoryLog.create({
          data: {
            product_id: item.product_id,
            action_type: "STOCK_OUT",
            quantity: item.quantity
          }
        });
      }

      return invoice;
    }, {
      maxWait: 10000, // default: 2000
      timeout: 20000, // default: 5000
    });

    // Log audit action
    await logAction(req.user.userId, "CREATED", "INVOICE", result.id);

    res.status(201).json(result);
  } catch (error) {
    console.error("Error creating invoice:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Delete invoice
router.delete("/:id", auth, requireRole(["ADMIN"]), async (req, res) => {
  try {
    const invoiceId = req.params.id;

    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { items: true }
    });

    if (!invoice) {
      return res.status(404).json({ error: "Invoice not found" });
    }

    // Use transaction to delete invoice and restore stock safely
    await prisma.$transaction(async (tx) => {
      // 1. Restore stock and create InventoryLogs
      for (const item of invoice.items) {
        const product = await tx.product.update({
          where: { id: item.product_id },
          data: { stock: { increment: item.quantity } }
        });

        await tx.inventoryLog.create({
          data: {
            product_id: item.product_id,
            action_type: "STOCK_IN",
            quantity: item.quantity
          }
        });

        await tx.notification.create({
          data: {
            title: "Stock Restored",
            message: `Restored ${item.quantity} units of ${product.name} from deleted invoice ${invoice.invoice_number}.`,
            type: "STOCK_IN"
          }
        });
      }

      // 2. Delete InvoiceItems
      await tx.invoiceItem.deleteMany({
        where: { invoice_id: invoiceId }
      });

      // 3. Delete Invoice
      await tx.invoice.delete({
        where: { id: invoiceId }
      });
    }, {
      maxWait: 10000,
      timeout: 20000,
    });

    // Log audit action
    await logAction(req.user.userId, "DELETED", "INVOICE", invoiceId);

    res.json({ message: "Invoice deleted successfully" });
  } catch (error) {
    console.error("Error deleting invoice:", error);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
