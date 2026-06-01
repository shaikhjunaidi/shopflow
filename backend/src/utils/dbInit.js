const { exec } = require("child_process");
const prisma = require("./prisma");

/**
 * Initializes the database connection and schema.
 * It tests the connection first, and if successful, runs `npx prisma db push`
 * to ensure all tables are created automatically.
 */
async function initializeDatabase() {
  console.log("----------------------------------------");
  console.log("🔄 Starting Database Initialization...");
  console.log("----------------------------------------");

  // 1. Check if DATABASE_URL is set or still placeholder
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl || dbUrl === "YOUR_NEON_DATABASE_URL_HERE") {
    console.error("❌ ERROR: Database connection string is missing or invalid.");
    console.error("👉 Please create a .env file and add your real DATABASE_URL.");
    console.error("👉 Check the neon_db_setup_guide.md file for step-by-step instructions.");
    console.log("----------------------------------------");
    // We don't exit the process so the rest of the app can theoretically still run, 
    // but DB routes will fail. For a strict requirement, we could process.exit(1).
    return false;
  }

  try {
    // 2. Test the connection
    console.log("⏳ Testing connection to PostgreSQL...");
    await prisma.$connect();
    console.log("✅ Successfully connected to the database!");

    // 3. Automatically create/update tables
    console.log("⏳ Checking and creating database tables (if they don't exist)...");
    
    return new Promise((resolve, reject) => {
      exec("npx prisma db push --accept-data-loss", (error, stdout, stderr) => {
        if (error) {
          console.error("❌ ERROR: Failed to create database tables.");
          console.error(error.message);
          resolve(false);
          return;
        }
        
        console.log("✅ Database schema is up to date!");
        console.log("----------------------------------------");
        resolve(true);
      });
    });

  } catch (error) {
    console.error("❌ ERROR: Could not connect to the database.");
    console.error("Details:", error.message);
    console.error("👉 Please check your DATABASE_URL in the .env file and ensure your Neon database is active.");
    console.log("----------------------------------------");
    return false;
  }
}

module.exports = initializeDatabase;
