const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

// Load local environment variables if available
const envPath = path.join(__dirname, "..", ".env");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf8");
  for (const line of envContent.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

const dbUrl =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_PRISMA_URL ||
  process.env.POSTGRES_URL ||
  process.env.STORAGE_URL ||
  "";

const isSqlite = !dbUrl || dbUrl.startsWith("file:");
const targetProvider = isSqlite ? "sqlite" : "postgresql";

const schemaPath = path.join(__dirname, "..", "prisma", "schema.prisma");
if (!fs.existsSync(schemaPath)) {
  console.error("[sync-prisma] schema.prisma not found at", schemaPath);
  process.exit(1);
}

let schema = fs.readFileSync(schemaPath, "utf8");
const providerRegex = /provider\s*=\s*"(sqlite|postgresql)"/;
const match = schema.match(providerRegex);
console.log("[sync-prisma] dbUrl:", dbUrl, "| current:", match ? match[1] : "none", "| target:", targetProvider);

if (match && match[1] !== targetProvider) {
  console.log(`[sync-prisma] Switching Prisma provider from "${match[1]}" to "${targetProvider}"...`);
  schema = schema.replace(providerRegex, `provider = "${targetProvider}"`);

  // If deploying to Supabase with DIRECT_URL for migrations & connection pooling
  if (targetProvider === "postgresql" && process.env.DIRECT_URL && !schema.includes("directUrl")) {
    schema = schema.replace(/url\s*=\s*env\("DATABASE_URL"\)/, 'url       = env("DATABASE_URL")\n  directUrl = env("DIRECT_URL")');
  }

  fs.writeFileSync(schemaPath, schema, "utf8");

  try {
    console.log("[sync-prisma] Generating Prisma Client...");
    execSync("npx prisma generate", { stdio: "inherit" });
    if (isSqlite) {
      console.log("[sync-prisma] Syncing SQLite schema with prisma db push...");
      execSync("npx prisma db push --accept-data-loss", { stdio: "inherit" });
    } else {
      console.log("[sync-prisma] Syncing remote PostgreSQL schema with prisma db push...");
      try {
        execSync("npx prisma db push --accept-data-loss", { stdio: "inherit" });
      } catch (pushErr) {
        console.warn("[sync-prisma] Remote db push warning:", pushErr.message);
      }
    }
  } catch (err) {
    console.error("[sync-prisma] Error running prisma sync:", err.message);
  }
} else {
  if (targetProvider === "postgresql") {
    if (process.env.DIRECT_URL && !schema.includes("directUrl")) {
      schema = schema.replace(/url\s*=\s*env\("DATABASE_URL"\)/, 'url       = env("DATABASE_URL")\n  directUrl = env("DIRECT_URL")');
      fs.writeFileSync(schemaPath, schema, "utf8");
    }
    console.log("[sync-prisma] Syncing remote PostgreSQL schema with prisma db push...");
    try {
      execSync("npx prisma db push --accept-data-loss", { stdio: "inherit" });
    } catch (e) {
      console.warn("[sync-prisma] Remote db push warning:", e.message);
    }
  }

  // If already matches, verify client is generated and sqlite db has latest schema
  if (isSqlite && process.argv.includes("--push")) {
    try {
      execSync("npx prisma db push --accept-data-loss", { stdio: "inherit" });
    } catch (e) {
      // Ignore
    }
  }
}
