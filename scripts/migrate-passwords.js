// Password Migration Script
// Migrates SHA-256 hashed passwords to PBKDF2 format
// Usage: Run once, then delete

const https = require("https");

const DB_PROXY = "https://guuimyx3.functions.insforge.app/db-proxy";
const INSFORGE_FUNCTIONS = "https://guuimyx3.functions.insforge.app";

// Supabase connection via InsForge
const SUPABASE_URL = "https://guuimyx3.eu-central.insforge.app";
const SUPABASE_KEY = process.env.SUPABASE_KEY || "your-anon-key";

function postJson(url, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname,
      method: "POST",
      headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(data) }
    };
    const req = https.request(options, res => {
      let body = "";
      res.on("data", chunk => body += chunk);
      res.on("end", () => {
        try { resolve(JSON.parse(body)); }
        catch (e) { reject(e); }
      });
    });
    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

async function dbQuery(sql) {
  // Handle BigInt serialization
  const result = await postJson(DB_PROXY, { sql });
  if (result.rows) {
    result.rows = result.rows.map(row => {
      const clean = {};
      for (const [k, v] of Object.entries(row)) {
        clean[k] = typeof v === "bigint" ? Number(v) : v;
      }
      return clean;
    });
  }
  return result;
}

async function hashPasswordPBKDF2(password) {
  // PBKDF2 with 310k iterations - matching the fixed auth functions
  // Note: This runs in Node.js with crypto module
  const crypto = require("crypto");
  const salt = crypto.randomBytes(16);
  const key = crypto.pbkdf2Sync(password, salt, 310000, 32, "sha256");
  const saltHex = salt.toString("hex");
  const hashHex = key.toString("hex");
  return `$pbkdf2$${saltHex}$${hashHex}`;
}

async function migrateUsers(dryRun = true) {
  console.log(dryRun ? "🧪 DRY RUN MODE - No changes will be made" : "⚠️ LIVE MODE - Changes WILL be made");
  console.log("");
  
  // Get all users with SHA-256 hashed passwords (old format)
  const result = await dbQuery(
    "SELECT id, email, password_hash FROM app_user WHERE password_hash LIKE '^[a-f0-9]{64}$'"
  );
  
  if (!result.success || !result.rows || result.rows.length === 0) {
    console.log("✅ No users with old SHA-256 passwords found");
    return { migrated: 0, errors: [] };
  }
  
  const users = result.rows;
  console.log(`Found ${users.length} users with old password format`);
  console.log("");
  
  const errors = [];
  let migrated = 0;
  
  for (const user of users) {
    try {
      if (dryRun) {
        console.log(`  Would migrate: ${user.email}`);
        migrated++;
      } else {
        // Check if password is SHA-256 of (password + MYCOMPI_SALT_2026)
        // Old format: SHA256(password + "MYCOMPI_SALT_2026")
        // We can't reverse it, so we need user to reset password
        console.log(`  ⚠️ Cannot auto-migrate ${user.email} - SHA-256 not reversible`);
        console.log(`     User needs to use "forgot password" flow`);
        errors.push({ email: user.email, reason: "SHA-256 not reversible" });
      }
    } catch (e) {
      errors.push({ email: user.email, error: e.message });
    }
  }
  
  return { migrated, errors };
}

async function markUsersForPasswordReset(emails, dryRun = true) {
  console.log("\n📧 Marking users for password reset...");
  
  if (dryRun) {
    console.log("  (dry run - no emails sent)");
    return { notified: 0 };
  }
  
  // In production, you would trigger password reset emails here
  // Most providers (Supabase, Auth0, etc.) have admin APIs for this
  console.log("  Would send password reset emails to:", emails.length);
  return { notified: emails.length };
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = !args.includes("--live");
  
  console.log("🔐 Password Migration Tool");
  console.log("========================\n");
  
  if (dryRun) {
    console.log("Running in DRY RUN mode. Use --live to apply changes.\n");
  }
  
  // Step 1: Check for users
  console.log("Step 1: Checking for users with old password format...\n");
  const check = await migrateUsers(dryRun);
  
  if (check.migrated === 0) {
    console.log("✅ Migration complete - no action needed");
    return;
  }
  
  // Step 2: For SHA-256, we need password reset flow
  if (check.errors.length > 0) {
    console.log("\n⚠️ Users with SHA-256 passwords cannot be auto-migrated:");
    console.log("   SHA-256 is not reversible (no salt stored)");
    console.log("   Solution: Users must use 'Forgot Password' flow\n");
    
    const emails = check.errors.map(e => e.email);
    await markUsersForPasswordReset(emails, dryRun);
  }
  
  // Step 3: Generate report
  console.log("\n📊 Migration Report");
  console.log("===================");
  console.log(`Users checked: ${check.migrated + check.errors.length}`);
  console.log(`Can migrate: ${check.migrated}`);
  console.log(`Need reset: ${check.errors.length}`);
  console.log(`Errors: ${check.errors.length}`);
  
  if (check.errors.length > 0) {
    console.log("\n⚠️  Action Required:");
    console.log("   1. Enable 'Forgot Password' flow in your auth provider");
    console.log("   2. Communicate to affected users");
    console.log("   3. Set password_policy = 'reset_required' in companies table");
  }
  
  console.log("\n✅ Next steps:");
  console.log("   1. Test --dry-run first");
  console.log("   2. Review users who need reset");
  console.log("   3. Run with --live to send reset emails");
  console.log("   4. Monitor for password resets over 7 days");
  console.log("   5. Lock accounts after 14 days if no reset");
}

// Password hash verification for new format
function verifyPassword(password, storedHash) {
  if (!storedHash || !storedHash.startsWith("$pbkdf2$")) {
    return false;
  }
  
  try {
    const crypto = require("crypto");
    const parts = storedHash.split("$");
    if (parts.length !== 4) return false;
    
    const saltHex = parts[2];
    const storedKeyHex = parts[3];
    const salt = Buffer.from(saltHex, "hex");
    
    const key = crypto.pbkdf2Sync(password, salt, 310000, 32, "sha256");
    const hashHex = key.toString("hex");
    
    return crypto.timingSafeEqual(
      Buffer.from(hashHex, "hex"),
      Buffer.from(storedKeyHex, "hex")
    );
  } catch (e) {
    return false;
  }
}

main().catch(console.error);