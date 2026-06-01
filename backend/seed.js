require("dotenv").config();
const prisma = require("./src/utils/prisma.js");

async function main() {
  console.log("Seeding database with sample data...");

  // 1. Create a category
  let category = await prisma.category.findFirst({ where: { name: "Electronics" } });
  if (!category) {
    category = await prisma.category.create({
      data: { name: "Electronics", description: "Gadgets and devices" }
    });
  }

  // 2. Create 3 Products
  const productsData = [
    {
      name: "Apple iPhone 15 Pro",
      sku: "APP-IP15P",
      description: "256GB Titanium",
      purchase_price: 110000,
      selling_price: 125000,
      stock: 50,
      min_stock: 5,
      category_id: category.id,
      image_url: "https://images.unsplash.com/photo-1696446701796-da61225697cc?w=400&q=80"
    },
    {
      name: "MacBook Pro 16-inch",
      sku: "APP-MBP16",
      description: "M3 Max, 36GB RAM, 1TB SSD",
      purchase_price: 280000,
      selling_price: 310000,
      stock: 15,
      min_stock: 2,
      category_id: category.id,
      image_url: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400&q=80"
    },
    {
      name: "Sony WH-1000XM5",
      sku: "SONY-XM5",
      description: "Noise Cancelling Headphones",
      purchase_price: 22000,
      selling_price: 28000,
      stock: 100,
      min_stock: 10,
      category_id: category.id,
      image_url: "https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?w=400&q=80"
    }
  ];

  const products = [];
  for (const p of productsData) {
    const prod = await prisma.product.upsert({
      where: { sku: p.sku },
      update: {},
      create: p
    });
    products.push(prod);
  }

  // 3. Create 3 Customers
  const customersData = [
    { name: "Rahul Sharma", phone: "9876543210", email: "rahul@example.com", address: "Mumbai, MH" },
    { name: "Priya Patel", phone: "9876543211", email: "priya@example.com", address: "Ahmedabad, GJ" },
    { name: "Tech Solutions Inc.", phone: "9876543212", email: "purchasing@techsolutions.com", address: "Bengaluru, KA", gst_number: "29ABCDE1234F1Z5" }
  ];

  const customers = [];
  for (const c of customersData) {
    const cust = await prisma.customer.create({
      data: c
    });
    customers.push(cust);
  }

  // 4. Generate 5 Invoices across the last 5 days
  const now = new Date();
  const invoicesData = [
    { customer: customers[0], items: [{ prod: products[0], qty: 1 }], daysAgo: 4 },
    { customer: customers[1], items: [{ prod: products[2], qty: 2 }], daysAgo: 3 },
    { customer: customers[2], items: [{ prod: products[1], qty: 2 }, { prod: products[2], qty: 5 }], daysAgo: 2 },
    { customer: customers[0], items: [{ prod: products[2], qty: 1 }], daysAgo: 1 },
    { customer: customers[1], items: [{ prod: products[0], qty: 1 }, { prod: products[1], qty: 1 }], daysAgo: 0 },
  ];

  for (const invData of invoicesData) {
    let subtotal = 0;
    let tax_amount = 0;
    const invoiceItems = [];

    for (const item of invData.items) {
      const line_total = item.prod.selling_price * item.qty;
      const tax = line_total * 0.18;
      
      subtotal += line_total;
      tax_amount += tax;

      invoiceItems.push({
        product_id: item.prod.id,
        quantity: item.qty,
        unit_price: item.prod.selling_price,
        tax_amount: tax,
        line_total: line_total
      });
    }

    const total_amount = subtotal + tax_amount;
    const createdDate = new Date(now);
    createdDate.setDate(now.getDate() - invData.daysAgo);

    await prisma.invoice.create({
      data: {
        customer_id: invData.customer.id,
        invoice_number: `INV-${createdDate.getTime()}`,
        subtotal,
        tax_amount,
        total_amount,
        created_at: createdDate,
        items: {
          create: invoiceItems
        }
      }
    });
  }

  console.log("Successfully seeded 3 products, 3 customers, and 5 invoices!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
