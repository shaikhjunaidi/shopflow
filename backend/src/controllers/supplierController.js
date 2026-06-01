const prisma = require("../utils/prisma");

exports.getSuppliers = async (req, res) => {
  try {
    const suppliers = await prisma.supplier.findMany({
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: { products: true, imports: true }
        }
      }
    });
    res.json(suppliers);
  } catch (error) {
    console.error("Error fetching suppliers:", error);
    res.status(500).json({ error: "Failed to fetch suppliers" });
  }
};

exports.createSupplier = async (req, res) => {
  try {
    const { name, contact, email, phone, address } = req.body;
    if (!name) return res.status(400).json({ error: "Name is required" });

    const supplier = await prisma.supplier.create({
      data: { name, contact, email, phone, address }
    });
    res.status(201).json(supplier);
  } catch (error) {
    console.error("Error creating supplier:", error);
    res.status(500).json({ error: "Failed to create supplier" });
  }
};

exports.updateSupplier = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, contact, email, phone, address } = req.body;
    
    const supplier = await prisma.supplier.update({
      where: { id },
      data: { name, contact, email, phone, address }
    });
    res.json(supplier);
  } catch (error) {
    console.error("Error updating supplier:", error);
    res.status(500).json({ error: "Failed to update supplier" });
  }
};

exports.deleteSupplier = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.supplier.delete({ where: { id } });
    res.json({ message: "Supplier deleted successfully" });
  } catch (error) {
    console.error("Error deleting supplier:", error);
    res.status(500).json({ error: "Failed to delete supplier" });
  }
};
