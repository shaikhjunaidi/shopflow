require('dotenv').config();
const prisma = require('./src/utils/prisma');

async function seedAuditLogs() {
  try {
    // Get the admin user
    const adminUser = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
    if (!adminUser) {
      console.log("No admin user found to associate logs with.");
      return;
    }

    // Create some dummy audit logs
    await prisma.auditLog.createMany({
      data: [
        {
          user_id: adminUser.id,
          action: "CREATED",
          entity: "PRODUCT",
          entity_id: "demo-product-123",
          created_at: new Date(Date.now() - 1000 * 60 * 60 * 2) // 2 hours ago
        },
        {
          user_id: adminUser.id,
          action: "UPDATED",
          entity: "CATEGORY",
          entity_id: "demo-category-456",
          created_at: new Date(Date.now() - 1000 * 60 * 30) // 30 mins ago
        },
        {
          user_id: adminUser.id,
          action: "DELETED",
          entity: "INVOICE",
          entity_id: "demo-invoice-789",
          created_at: new Date(Date.now() - 1000 * 60 * 5) // 5 mins ago
        }
      ]
    });

    console.log("Mock audit logs generated successfully!");
  } catch (error) {
    console.error("Error generating mock logs:", error);
  } finally {
    await prisma.$disconnect();
  }
}

seedAuditLogs();
