const env = process.env;
const usingPostgres = Boolean(env.DATABASE_URL && env.DATABASE_URL.trim().length > 0);

const commonRequired = [
  "ADMIN_USERNAME",
  "ADMIN_PASSWORD",
  "SESSION_SECRET",
  "IP_HASH_PEPPER",
];

const sqliteRequired = ["DATABASE_PATH", "UPLOADS_DIR"];

const postgresRequired = [
  "DATABASE_URL",
  "S3_BUCKET",
  "S3_REGION",
  "S3_ACCESS_KEY_ID",
  "S3_SECRET_ACCESS_KEY",
  "S3_PUBLIC_BASE_URL",
];

const required = usingPostgres
  ? [...commonRequired, ...postgresRequired]
  : [...commonRequired, ...sqliteRequired];

const optional = usingPostgres
  ? ["S3_ENDPOINT", "NEXT_PUBLIC_TURNSTILE_SITE_KEY", "TURNSTILE_SECRET_KEY"]
  : ["NEXT_PUBLIC_TURNSTILE_SITE_KEY", "TURNSTILE_SECRET_KEY"];

const missing = required.filter((name) => {
  const value = env[name];
  return !value || value.trim().length === 0;
});

if (missing.length > 0) {
  console.error(
    `Missing required Render env vars for ${usingPostgres ? "Postgres + S3" : "simple disk"} mode:`,
  );
  for (const name of missing) {
    console.error(`- ${name}`);
  }
  process.exitCode = 1;
} else {
  console.log(
    `Render env looks complete for ${usingPostgres ? "Postgres + S3" : "simple disk"} mode.`,
  );
}

const missingOptional = optional.filter((name) => {
  const value = env[name];
  return !value || value.trim().length === 0;
});

if (missingOptional.length > 0) {
  console.log("");
  console.log("Optional vars not set:");
  for (const name of missingOptional) {
    console.log(`- ${name}`);
  }
  if (usingPostgres) {
    console.log("Leave S3_ENDPOINT empty only if your storage provider does not need it.");
  } else {
    console.log("Turnstile is optional in the simple Render deployment.");
  }
}
