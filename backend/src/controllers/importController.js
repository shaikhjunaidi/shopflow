const prisma = require("../utils/prisma");
const pdf = require("pdf-parse");
const Tesseract = require("tesseract.js");
const fs = require("fs");
const path = require("path");

exports.uploadAndParsePdf = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No PDF file uploaded" });
    }

    const filePath = req.file.path;
    const mimeType = req.file.mimetype;
    let text = "";

    if (mimeType === "application/pdf") {
      const dataBuffer = fs.readFileSync(filePath);
      const data = await pdf(dataBuffer);
      text = data.text;
    } else if (mimeType.startsWith("image/")) {
      const { data } = await Tesseract.recognize(filePath, "eng");
      text = data.text;
    }

    // Smart Table Detection - Rules-based extraction
    // Attempting to match various formats and map them to a unified product structure.
    const products = [];
    const lines = text.split("\n").filter((line) => line.trim() !== "");

    // A simple heuristic parser looking for keywords and numbers
    // This is basic for MVP and can be enhanced with AI later
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Example regex to match a line that might look like:
      // SKU-123 Product Name 10 $15.00
      // Or: Product Description 5 20.5
      
      // Let's try to extract potential product data based on common patterns
      // Extract numbers (potential qty, price) and remaining string (name/sku)
      const matches = line.match(/(.*?)\s+(\d+)\s+[\$]?(\d+(\.\d+)?)/);
      if (matches && matches.length >= 4) {
        const potentialNameOrSku = matches[1].trim();
        const potentialQty = parseInt(matches[2], 10);
        const potentialPrice = parseFloat(matches[3]);

        // Filter out things that are likely headers or footer
        if (potentialNameOrSku.toLowerCase().includes("total") || potentialNameOrSku.toLowerCase().includes("subtotal")) {
          continue;
        }

        if (potentialNameOrSku && potentialQty > 0) {
          products.push({
            name: potentialNameOrSku, // We can try splitting SKU and name if needed
            sku: `SKU-${Math.random().toString(36).substr(2, 6).toUpperCase()}`, // Auto-generate if not found
            quantity: potentialQty,
            price: potentialPrice,
            sellingPrice: potentialPrice * 1.25, // Smart Margin 25%
            category: "Uncategorized", // Default category
            status: potentialQty > 5 ? "In Stock" : "Low Stock"
          });
        }
      }
    }

    // In a real robust system, we would parse tables precisely.
    // We send back the structured preview data to the client.
    res.status(200).json({
      message: "PDF parsed successfully",
      fileName: req.file.originalname,
      filePath: filePath,
      extractedProducts: products,
      totalDetected: products.length,
    });
  } catch (error) {
    console.error("Error parsing PDF:", error);
    res.status(500).json({ error: "Failed to process PDF" });
  }
};

exports.confirmImport = async (req, res) => {
  try {
    const { fileName, filePath, products, action, supplierId } = req.body;
    const userId = req.user.id;

    if (!products || products.length === 0) {
      return res.status(400).json({ error: "No products to import" });
    }

    const validSupplierId = supplierId || null;

    if (action === "DRAFT") {
      const importRecord = await prisma.importRecord.create({
        data: {
          file_name: fileName,
          file_path: filePath,
          total_products: products.length,
          imported_by: userId,
          supplier_id: validSupplierId,
          status: "DRAFT",
          draft_data: products
        }
      });
      return res.status(200).json({ message: "Saved as draft", data: importRecord });
    }

    // Get default category or create it
    let defaultCategory = await prisma.category.findFirst({
      where: { name: "Uncategorized" }
    });

    if (!defaultCategory) {
      defaultCategory = await prisma.category.create({
        data: { name: "Uncategorized", description: "Default category for imports" }
      });
    }

    // Wrap in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create Import Record
      const importRecord = await tx.importRecord.create({
        data: {
          file_name: fileName,
          file_path: filePath,
          total_products: products.length,
          imported_by: userId,
          supplier_id: validSupplierId,
          status: "APPROVED"
        }
      });

      let importedCount = 0;

      for (const item of products) {
        // Try to find if category exists based on name, otherwise default
        let categoryId = defaultCategory.id;
        if (item.category && item.category !== "Uncategorized") {
          let cat = await tx.category.findFirst({ where: { name: item.category }});
          if (cat) categoryId = cat.id;
          else {
            cat = await tx.category.create({ data: { name: item.category } });
            categoryId = cat.id;
          }
        }

        // Determine status based on quantity
        const itemStatus = item.quantity > 5 ? "In Stock" : (item.quantity === 0 ? "Out of Stock" : "Low Stock");

        // Check if SKU exists
        const existingProduct = await tx.product.findUnique({
          where: { sku: item.sku }
        });

        if (existingProduct) {
          // If action is Update or Increase, handle it based on what frontend sends
          // For now, let's assume it increases stock or updates price based on the item properties (e.g., item.importAction = "UPDATE" or "INCREASE")
          
          if (item.importAction === "UPDATE") {
            await tx.product.update({
              where: { id: existingProduct.id },
              data: {
                name: item.name,
                purchase_price: item.price,
                selling_price: item.sellingPrice || item.price * 1.25,
                stock: item.quantity,
                status: itemStatus,
                category_id: categoryId,
                source_pdf: filePath,
                supplier_id: validSupplierId
              }
            });
            await tx.inventoryLog.create({
              data: {
                product_id: existingProduct.id,
                action_type: "IMPORT",
                quantity: item.quantity, // Log the difference or the new amount? We'll log the imported amount
                notes: `Updated from import: ${fileName}`
              }
            });
          } else {
            // Default "INCREASE" stock
            const newStock = existingProduct.stock + item.quantity;
            await tx.product.update({
              where: { id: existingProduct.id },
              data: {
                stock: newStock,
                status: newStock > 5 ? "In Stock" : "Low Stock",
                source_pdf: filePath
              }
            });
            await tx.inventoryLog.create({
              data: {
                product_id: existingProduct.id,
                action_type: "IMPORT",
                quantity: item.quantity,
                notes: `Stock increased from import: ${fileName}`
              }
            });
          }
        } else {
          // Create new product
          const newProduct = await tx.product.create({
            data: {
              name: item.name,
              sku: item.sku,
              purchase_price: item.price,
              selling_price: item.sellingPrice || item.price * 1.25, // Smart margin
              stock: item.quantity,
              category_id: categoryId,
              status: itemStatus,
              source_pdf: filePath,
              supplier_id: validSupplierId
            }
          });
          
          await tx.inventoryLog.create({
            data: {
              product_id: newProduct.id,
              action_type: "IMPORT",
              quantity: item.quantity,
              notes: `New product imported from: ${fileName}`
            }
          });
        }
        importedCount++;
      }

      return { importRecord, importedCount };
    });

    res.status(200).json({
      message: "Import confirmed and saved successfully",
      data: result,
    });
  } catch (error) {
    console.error("Error confirming import:", error);
    res.status(500).json({ error: "Failed to confirm import" });
  }
};

exports.approveImport = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check role - assuming req.user.role exists (e.g. from JWT)
    if (req.user.role === "CASHIER") {
      return res.status(403).json({ error: "Only Managers or Admins can approve imports." });
    }

    const importRecord = await prisma.importRecord.findUnique({ where: { id } });
    if (!importRecord) return res.status(404).json({ error: "Import not found" });
    if (importRecord.status !== "DRAFT") return res.status(400).json({ error: "Import is already processed" });

    // Use products from request body if they edited them, otherwise use saved draft data
    const products = req.body.products && req.body.products.length > 0 ? req.body.products : importRecord.draft_data;
    if (!products || !Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ error: "No products found in draft" });
    }

    const validSupplierId = importRecord.supplier_id || null;

    // Call internal logic similar to confirmImport but passing existing record info
    req.body = {
      fileName: importRecord.file_name,
      filePath: importRecord.file_path,
      products: products,
      supplierId: validSupplierId,
      action: "APPROVE"
    };

    // Update the record to APPROVED and clear draft_data to save space
    await prisma.importRecord.update({
      where: { id },
      data: { status: "APPROVED", draft_data: null }
    });

    // We can recursively call the logic or just duplicate the transaction piece for speed here
    // For now we'll duplicate the transaction logic for approve since it requires updating an existing ImportRecord rather than creating a new one.
    
    let defaultCategory = await prisma.category.findFirst({
      where: { name: "Uncategorized" }
    });
    if (!defaultCategory) {
      defaultCategory = await prisma.category.create({
        data: { name: "Uncategorized", description: "Default category for imports" }
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      let importedCount = 0;
      for (const item of products) {
        let categoryId = defaultCategory.id;
        if (item.category && item.category !== "Uncategorized") {
          let cat = await tx.category.findFirst({ where: { name: item.category }});
          if (cat) categoryId = cat.id;
          else {
            cat = await tx.category.create({ data: { name: item.category } });
            categoryId = cat.id;
          }
        }
        const itemStatus = item.quantity > 5 ? "In Stock" : (item.quantity === 0 ? "Out of Stock" : "Low Stock");
        const existingProduct = await tx.product.findUnique({ where: { sku: item.sku } });

        if (existingProduct) {
          if (item.importAction === "UPDATE") {
            await tx.product.update({
              where: { id: existingProduct.id },
              data: {
                name: item.name,
                purchase_price: item.price,
                selling_price: item.sellingPrice || item.price * 1.25,
                stock: item.quantity,
                status: itemStatus,
                category_id: categoryId,
                source_pdf: importRecord.file_path,
                supplier_id: validSupplierId
              }
            });
            await tx.inventoryLog.create({
              data: { product_id: existingProduct.id, action_type: "IMPORT", quantity: item.quantity, notes: `Updated from draft import: ${importRecord.file_name}` }
            });
          } else {
            const newStock = existingProduct.stock + item.quantity;
            await tx.product.update({
              where: { id: existingProduct.id },
              data: { stock: newStock, status: newStock > 5 ? "In Stock" : "Low Stock", source_pdf: importRecord.file_path }
            });
            await tx.inventoryLog.create({
              data: { product_id: existingProduct.id, action_type: "IMPORT", quantity: item.quantity, notes: `Stock increased from draft import: ${importRecord.file_name}` }
            });
          }
        } else {
          const newProduct = await tx.product.create({
            data: {
              name: item.name,
              sku: item.sku,
              purchase_price: item.price,
              selling_price: item.sellingPrice || item.price * 1.25,
              stock: item.quantity,
              category_id: categoryId,
              status: itemStatus,
              source_pdf: importRecord.file_path,
              supplier_id: validSupplierId
            }
          });
          await tx.inventoryLog.create({
            data: { product_id: newProduct.id, action_type: "IMPORT", quantity: item.quantity, notes: `New product imported from draft: ${importRecord.file_name}` }
          });
        }
        importedCount++;
      }
      return { importRecord, importedCount };
    });

    res.status(200).json({ message: "Draft import approved successfully", data: result });
  } catch (error) {
    console.error("Error approving import:", error);
    res.status(500).json({ error: "Failed to approve import" });
  }
};

exports.getImportHistory = async (req, res) => {
  try {
    const history = await prisma.importRecord.findMany({
      orderBy: { created_at: "desc" },
    });

    // To get the user names, we could fetch them or join them if we had a relation setup.
    // Assuming imported_by is user ID. We can manually fetch or update schema to have a relation.
    // For simplicity, we just return the history list.
    
    // Optional: Enrich with User Name
    const historyWithUsers = await Promise.all(history.map(async (record) => {
      let userName = "Unknown";
      if (record.imported_by) {
        const user = await prisma.user.findUnique({ where: { id: record.imported_by }});
        if (user) userName = user.name;
      }
      return {
        ...record,
        user_name: userName
      };
    }));

    res.status(200).json(historyWithUsers);
  } catch (error) {
    console.error("Error fetching import history:", error);
    res.status(500).json({ error: "Failed to fetch import history" });
  }
};
