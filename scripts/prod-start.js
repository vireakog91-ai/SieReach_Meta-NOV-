const { execSync } = require("child_process");

// 1. Sync Prisma provider based on DATABASE_URL
try {
  require("./sync-prisma.js");
} catch (e) {
  console.warn("[prod-start] sync-prisma warning:", e.message);
}

// 2. Automatically push schema migrations to production PostgreSQL database if configured
const dbUrl =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_PRISMA_URL ||
  process.env.POSTGRES_URL ||
  process.env.STORAGE_URL ||
  "";

if (dbUrl && !dbUrl.startsWith("file:")) {
  console.log("[prod-start] Detected remote PostgreSQL database. Applying schema sync...");
  try {
    execSync("npx prisma db push --accept-data-loss", { stdio: "inherit" });
    console.log("[prod-start] Database schema sync complete.");
  } catch (err) {
    console.error("[prod-start] Prisma push warning:", err.message);
  }
} else {
  console.log("[prod-start] Using local SQLite database.");
}
