const express = require("express");
const { auth, requireRole } = require("../middleware/auth");
const prisma = require("../utils/prisma");
const { logAction } = require("../utils/audit");

const router = express.Router();

// Get all customers
router.get("/", auth, async (req, res) => {
  try {
    const customers = await prisma.customer.findMany({
      include: {
        _count: {
          select: { invoices: true }
        }
      }
    });
    res.json(customers);
  } catch (error) {
    console.error("Error fetching customers:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Create customer
router.post("/", auth, requireRole(["ADMIN", "MANAGER"]), async (req, res) => {
  try {
    const { name, phone, email, address, gst_number, notes } = req.body;
    
    const customer = await prisma.customer.create({
      data: {
        name,
        phone,
        email,
        address,
        gst_number,
        notes
      },
    });

    // Log audit action
    await logAction(req.user.userId, "CREATED", "CUSTOMER", customer.id);

    res.status(201).json(customer);
  } catch (error) {
    console.error("Error creating customer:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Update customer
router.put("/:id", auth, requireRole(["ADMIN", "MANAGER"]), async (req, res) => {
  try {
    const { name, phone, email, address, gst_number, notes } = req.body;
    
    const customer = await prisma.customer.update({
      where: { id: req.params.id },
      data: {
        name,
        phone,
        email,
        address,
        gst_number,
        notes
      },
    });

    // Log audit action
    await logAction(req.user.userId, "UPDATED", "CUSTOMER", customer.id);

    res.json(customer);
  } catch (error) {
    console.error("Error updating customer:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Delete customer
router.delete("/:id", auth, requireRole(["ADMIN"]), async (req, res) => {
  try {
    const customer = await prisma.customer.findUnique({
      where: { id: req.params.id },
      include: { _count: { select: { invoices: true } } }
    });

    if (!customer) {
      return res.status(404).json({ error: "Customer not found" });
    }

    if (customer._count.invoices > 0) {
      return res.status(400).json({ error: "Cannot delete customer with associated invoices. Please delete their invoices first." });
    }

    await prisma.customer.delete({
      where: { id: req.params.id },
    });
    
    // Log audit action
    await logAction(req.user.userId, "DELETED", "CUSTOMER", req.params.id);

    res.json({ message: "Customer deleted successfully" });
  } catch (error) {
    console.error("Error deleting customer:", error);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
