require('dotenv').config();
const prisma = require('./src/utils/prisma');
const bcrypt = require('bcrypt');

async function main() {
  const users = [
    {
      name: "Cashier",
      email: "mohammedjunaidking69@gmail.com",
      password: "gousebhai08",
      role: "CASHIER"
    },
    {
      name: "Manager",
      email: "me.junaid.in@gmail.com",
      password: "monster@123",
      role: "MANAGER"
    }
  ];

  for (const u of users) {
    const hashedPassword = await bcrypt.hash(u.password, 10);
    
    // Upsert to avoid unique constraint errors if running multiple times
    await prisma.user.upsert({
      where: { email: u.email },
      update: {
        password: hashedPassword,
        role: u.role
      },
      create: {
        name: u.name,
        email: u.email,
        password: hashedPassword,
        role: u.role
      }
    });
    console.log(`User created/updated: ${u.email} as ${u.role}`);
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
