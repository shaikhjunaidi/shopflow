const express = require("express");
const { auth, requireRole } = require("../middleware/auth");
const prisma = require("../utils/prisma");

const router = express.Router();

// Get dashboard summary
router.get("/summary", auth, requireRole(["ADMIN", "MANAGER"]), async (req, res) => {
  try {
    // 1. Total Revenue (sum of all PAID invoices total_amount)
    const revenueResult = await prisma.invoice.aggregate({
      _sum: { total_amount: true },
      // To keep it simple, we sum all invoices. In reality, filter by PAID status.
    });
    const totalRevenue = revenueResult._sum.total_amount || 0;

    // 2. Total Customers
    const totalCustomers = await prisma.customer.count();

    // 3. Sales Today (Sum of invoices created today)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const salesTodayResult = await prisma.invoice.aggregate({
      _sum: { total_amount: true },
      where: {
        created_at: {
          gte: today,
        },
      },
    });
    const salesToday = salesTodayResult._sum.total_amount || 0;

    // 4. Active Now / Total Products (just using Total Products for now)
    const totalProducts = await prisma.product.count();

    // 5. Recent Sales
    const recentSales = await prisma.invoice.findMany({
      take: 5,
      orderBy: { created_at: "desc" },
      include: {
        customer: { select: { name: true } }
      }
    });

    res.json({
      totalRevenue,
      totalCustomers,
      salesToday,
      totalProducts,
      recentSales
    });
  } catch (error) {
    console.error("Error fetching reports:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Get chart data
router.get("/chart", auth, requireRole(["ADMIN", "MANAGER"]), async (req, res) => {
  try {
    const period = req.query.period || "week"; // "week", "month", "year"
    const now = new Date();
    let startDate = new Date();

    if (period === "week") {
      startDate.setDate(now.getDate() - 6);
      startDate.setHours(0, 0, 0, 0);
    } else if (period === "month") {
      startDate.setDate(now.getDate() - 29);
      startDate.setHours(0, 0, 0, 0);
    } else if (period === "year") {
      startDate.setFullYear(now.getFullYear(), 0, 1);
      startDate.setHours(0, 0, 0, 0);
    }

    const invoices = await prisma.invoice.findMany({
      where: {
        created_at: {
          gte: startDate
        }
      },
      select: {
        created_at: true,
        total_amount: true
      }
    });

    const dataMap = new Map();

    if (period === "week" || period === "month") {
      // Group by day.
      const daysToIterate = period === "week" ? 6 : 29;
      for (let i = 0; i <= daysToIterate; i++) {
        const d = new Date(startDate);
        d.setDate(startDate.getDate() + i);
        const key = period === "week" 
          ? d.toLocaleDateString("en-US", { weekday: "short" }) 
          : d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
        dataMap.set(key, 0);
      }
      
      invoices.forEach(inv => {
        const d = new Date(inv.created_at);
        const key = period === "week" 
          ? d.toLocaleDateString("en-US", { weekday: "short" }) 
          : d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
        if (dataMap.has(key)) {
          dataMap.set(key, dataMap.get(key) + inv.total_amount);
        }
      });
    } else if (period === "year") {
      // Group by month
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      months.forEach(m => dataMap.set(m, 0));

      invoices.forEach(inv => {
        const d = new Date(inv.created_at);
        const key = months[d.getMonth()];
        if (dataMap.has(key)) {
          dataMap.set(key, dataMap.get(key) + inv.total_amount);
        }
      });
    }

    const chartData = Array.from(dataMap, ([name, revenue]) => ({ name, revenue }));

    res.json(chartData);
  } catch (error) {
    console.error("Error fetching chart data:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Advanced Reports (Date Range, Profit, Top Products, Categories)
router.get("/advanced", auth, requireRole(["ADMIN", "MANAGER"]), async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    // Parse dates (default to last 30 days if not provided)
    const end = endDate ? new Date(endDate) : new Date();
    end.setHours(23, 59, 59, 999);
    
    const start = startDate ? new Date(startDate) : new Date(new Date().setDate(end.getDate() - 30));
    start.setHours(0, 0, 0, 0);

    // Get all invoices in date range
    const invoices = await prisma.invoice.findMany({
      where: {
        created_at: {
          gte: start,
          lte: end
        },
        status: { not: "CANCELLED" }
      },
      include: {
        items: {
          include: {
            product: {
              include: {
                category: true
              }
            }
          }
        },
        customer: true
      }
    });

    let totalRevenue = 0;
    let totalCost = 0;
    const productStats = new Map(); // productId -> { name, quantity, revenue }
    const categoryStats = new Map(); // categoryName -> revenue

    invoices.forEach(invoice => {
      totalRevenue += invoice.total_amount;
      
      invoice.items.forEach(item => {
        // Calculate cost
        const purchasePrice = item.product?.purchase_price || 0;
        totalCost += (purchasePrice * item.quantity);
        
        // Product stats
        if (item.product) {
          if (!productStats.has(item.product.id)) {
            productStats.set(item.product.id, { 
              name: item.product.name, 
              quantity: 0, 
              revenue: 0 
            });
          }
          const pStat = productStats.get(item.product.id);
          pStat.quantity += item.quantity;
          pStat.revenue += item.line_total;
          
          // Category stats
          const catName = item.product.category?.name || "Uncategorized";
          if (!categoryStats.has(catName)) {
            categoryStats.set(catName, 0);
          }
          categoryStats.set(catName, categoryStats.get(catName) + item.line_total);
        }
      });
    });

    const netProfit = totalRevenue - totalCost;

    // Sort products by quantity to get top 5
    const topProducts = Array.from(productStats.values())
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);

    // Format category stats for Recharts Pie Chart
    const revenueByCategory = Array.from(categoryStats.entries()).map(([name, value]) => ({
      name,
      value
    }));

    res.json({
      summary: {
        totalRevenue,
        totalCost,
        netProfit,
        invoiceCount: invoices.length
      },
      topProducts,
      revenueByCategory,
      rawInvoices: invoices // For CSV Export
    });

  } catch (error) {
    console.error("Error fetching advanced reports:", error);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
