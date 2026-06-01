const express = require("express");
const { auth, requireRole } = require("../middleware/auth");
const prisma = require("../utils/prisma");
const { logAction } = require("../utils/audit");

const router = express.Router();

// Get all products
router.get("/", auth, async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      include: { category: true, branch_stocks: true },
    });
    res.json(products);
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Get single product
router.get("/:id", auth, async (req, res) => {
  try {
    const product = await prisma.product.findUnique({
      where: { id: req.params.id },
      include: { category: true, branch_stocks: true },
    });
    if (!product) return res.status(404).json({ error: "Product not found" });
    res.json(product);
  } catch (error) {
    console.error("Error fetching product:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Create product
router.post("/", auth, requireRole(["ADMIN", "MANAGER"]), async (req, res) => {
  try {
    const { name, category_id, description, sku, barcode, purchase_price, selling_price, stock, min_stock, image_url } = req.body;
    
    // Check if category exists
    const categoryExists = await prisma.category.findUnique({ where: { id: category_id } });
    if (!categoryExists) return res.status(400).json({ error: "Invalid category ID" });

    const product = await prisma.product.create({
      data: {
        name,
        category_id,
        description,
        sku,
        barcode,
        purchase_price: parseFloat(purchase_price),
        selling_price: parseFloat(selling_price),
        stock: parseInt(stock),
        min_stock: parseInt(min_stock),
        image_url,
      },
    });

    // Log the inventory creation action
    await prisma.inventoryLog.create({
      data: {
        product_id: product.id,
        action_type: "STOCK_IN",
        quantity: parseInt(stock)
      }
    });

    // Log audit action
    await logAction(req.user.userId, "CREATED", "PRODUCT", product.id);

    res.status(201).json(product);
  } catch (error) {
    console.error("Error creating product:", error);
    if (error.code === 'P2002') {
      return res.status(400).json({ error: "A product with this SKU already exists" });
    }
    res.status(500).json({ error: "Server error" });
  }
});

// Update product
router.put("/:id", auth, requireRole(["ADMIN", "MANAGER"]), async (req, res) => {
  try {
    const { name, category_id, description, sku, barcode, purchase_price, selling_price, stock, min_stock, image_url } = req.body;
    
    const product = await prisma.product.update({
      where: { id: req.params.id },
      data: {
        name,
        category_id,
        description,
        sku,
        barcode,
        purchase_price: parseFloat(purchase_price),
        selling_price: parseFloat(selling_price),
        stock: parseInt(stock),
        min_stock: parseInt(min_stock),
        image_url,
      },
    });
    // Log audit action
    await logAction(req.user.userId, "UPDATED", "PRODUCT", product.id);

    res.json(product);
  } catch (error) {
    console.error("Error updating product:", error);
    if (error.code === 'P2002') {
      return res.status(400).json({ error: "A product with this SKU already exists" });
    }
    res.status(500).json({ error: "Server error" });
  }
});

// Delete product
router.delete("/:id", auth, requireRole(["ADMIN"]), async (req, res) => {
  try {
    const product = await prisma.product.findUnique({
      where: { id: req.params.id },
      include: {
        _count: { select: { invoice_items: true } }
      }
    });

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    if (product._count.invoice_items > 0) {
      return res.status(400).json({ error: "Cannot delete product because it is associated with one or more invoices." });
    }

    // Delete associated inventory logs first to prevent foreign key constraint failure
    await prisma.inventoryLog.deleteMany({
      where: { product_id: req.params.id }
    });

    await prisma.product.delete({
      where: { id: req.params.id },
    });
    
    // Log audit action
    await logAction(req.user.userId, "DELETED", "PRODUCT", req.params.id);

    res.json({ message: "Product deleted successfully" });
  } catch (error) {
    console.error("Error deleting product:", error);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
