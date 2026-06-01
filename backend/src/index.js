require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json());
app.use(cors());
app.use(helmet({
  crossOriginResourcePolicy: false,
}));
app.use(morgan("dev"));

// Serve uploaded images statically
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

const authRoutes = require("./routes/auth");
const productRoutes = require("./routes/products");
const categoryRoutes = require("./routes/categories");
const customerRoutes = require("./routes/customers");
const invoiceRoutes = require("./routes/invoices");
const reportRoutes = require("./routes/reports");
const uploadRoutes = require("./routes/upload");
const inventoryRoutes = require("./routes/inventory");
const notificationsRoutes = require("./routes/notifications");
const auditLogRoutes = require("./routes/auditLogs");
const importRoutes = require("./routes/imports");
const supplierRoutes = require("./routes/suppliers");
const returnRoutes = require("./routes/returns");
const taskRoutes = require("./routes/tasks");
const storefrontRoutes = require("./routes/storefront");
const branchRoutes = require("./routes/branches");
const transferRoutes = require("./routes/transfers");
const initializeDatabase = require("./utils/dbInit");

// Base route
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "ShopFlow API is running" });
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/invoices", invoiceRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/notifications", notificationsRoutes);
app.use("/api/audit-logs", auditLogRoutes);
app.use("/api/imports", importRoutes);
app.use("/api/suppliers", supplierRoutes);
app.use("/api/returns", returnRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/storefront", storefrontRoutes);
app.use("/api/branches", branchRoutes);
app.use("/api/transfers", transferRoutes);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
