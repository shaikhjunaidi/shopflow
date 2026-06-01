const express = require("express");
const prisma = require("../utils/prisma");

const router = express.Router();

// Get all active products for the storefront
router.get("/products", async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      where: {
        status: "In Stock",
        stock: { gt: 0 }
      },
      include: {
        category: true
      },
      orderBy: { created_at: "desc" },
    });
    res.json(products);
  } catch (error) {
    console.error("Error fetching storefront products:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Place an online pickup order
router.post("/orders", async (req, res) => {
  try {
    const { name, phone, items } = req.body;
    
    if (!name || !phone || !items || items.length === 0) {
      return res.status(400).json({ error: "Name, phone, and items are required" });
    }

    // Generate invoice number
    const invoice_number = `ONL-${Date.now()}`;
    
    // Find or create customer
    let customer = await prisma.customer.findFirst({
      where: { phone }
    });

    if (!customer) {
      customer = await prisma.customer.create({
        data: { name, phone }
      });
    }

    let subtotal = 0;
    let total_tax = 0;

    // Process items and calculate totals
    const processedItems = items.map(item => {
      const line_total = item.quantity * item.unit_price;
      const tax_amount = line_total * 0.18; // Fixed 18% GST for demo
      
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

    const total_amount = subtotal + total_tax;

    // Use transaction to create invoice and update stock
    const result = await prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.create({
        data: {
          customer_id: customer.id,
          invoice_number,
          subtotal,
          tax_amount: total_tax,
          total_amount,
          order_type: "ONLINE_PICKUP",
          status: "PENDING",
          items: {
            create: processedItems
          }
        },
        include: { items: true, customer: true }
      });

      // Decrease stock
      for (const item of processedItems) {
        await tx.product.update({
          where: { id: item.product_id },
          data: { stock: { decrement: item.quantity } }
        });

        await tx.inventoryLog.create({
          data: {
            product_id: item.product_id,
            action_type: "SALE",
            quantity: item.quantity,
            notes: `Online pickup order ${invoice_number}`
          }
        });
      }

      return invoice;
    }, {
      maxWait: 10000,
      timeout: 20000,
    });

    res.status(201).json(result);
  } catch (error) {
    console.error("Error creating online order:", error);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
