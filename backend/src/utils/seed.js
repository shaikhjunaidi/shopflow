require('dotenv').config();
const prisma = require('./prisma');
const bcrypt = require('bcrypt');

async function seed() {
  try {
    const email = "junnuedits@gmail.com";
    const password = await bcrypt.hash("junnubhai@07", 10);
    
    // Check if user exists
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      console.log("Admin user already exists. Forcing role to ADMIN and updating password...");
      await prisma.user.update({
        where: { email },
        data: { 
          role: "ADMIN",
          password: password 
        }
      });
    } else {
      console.log("Creating admin user...");
      await prisma.user.create({
        data: {
          name: "Junaid Admin",
          email: email,
          password: password,
          role: "ADMIN"
        }
      });
    }
    console.log("Admin setup complete. Email: junnuedits@gmail.com | Password: admin123");
  } catch (error) {
    console.error("Seed error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

seed();
