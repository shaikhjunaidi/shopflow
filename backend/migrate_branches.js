const prisma = require('./src/utils/prisma');

async function main() {
  console.log("Creating default branch...");
  let branch = await prisma.branch.findFirst({ where: { name: "Main Warehouse" } });
  
  if (!branch) {
    branch = await prisma.branch.create({
      data: {
        name: "Main Warehouse",
        address: "123 Central HQ",
      }
    });
    console.log("Created branch:", branch.id);
  }

  console.log("Assigning users to branch...");
  await prisma.user.updateMany({
    where: { branch_id: null },
    data: { branch_id: branch.id }
  });

  console.log("Assigning invoices to branch...");
  await prisma.invoice.updateMany({
    where: { branch_id: null },
    data: { branch_id: branch.id }
  });

  console.log("Migrating product stock to BranchStock...");
  const products = await prisma.product.findMany();
  for (const p of products) {
    const existing = await prisma.branchStock.findUnique({
      where: {
        branch_id_product_id: {
          branch_id: branch.id,
          product_id: p.id
        }
      }
    });
    
    if (!existing) {
      await prisma.branchStock.create({
        data: {
          branch_id: branch.id,
          product_id: p.id,
          quantity: p.stock
        }
      });
    }
  }

  console.log("Migration complete!");
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
