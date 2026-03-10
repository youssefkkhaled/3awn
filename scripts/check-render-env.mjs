const required = [
  "DATABASE_URL",
  "S3_BUCKET",
  "S3_REGION",
  "S3_ACCESS_KEY_ID",
  "S3_SECRET_ACCESS_KEY",
  "S3_PUBLIC_BASE_URL",
  "ADMIN_USERNAME",
  "ADMIN_PASSWORD",
  "SESSION_SECRET",
  "IP_HASH_PEPPER",
  "NEXT_PUBLIC_TURNSTILE_SITE_KEY",
  "TURNSTILE_SECRET_KEY",
];

const optional = ["S3_ENDPOINT"];

const missing = required.filter((name) => {
  const value = process.env[name];
  return !value || value.trim().length === 0;
});

if (missing.length > 0) {
  console.error("Missing required Render env vars:");
  for (const name of missing) {
    console.error(`- ${name}`);
  }
  process.exitCode = 1;
} else {
  console.log("Render env looks complete.");
}

const missingOptional = optional.filter((name) => {
  const value = process.env[name];
  return !value || value.trim().length === 0;
});

if (missingOptional.length > 0) {
  console.log("");
  console.log("Optional vars not set:");
  for (const name of missingOptional) {
    console.log(`- ${name}`);
  }
  console.log("Leave S3_ENDPOINT empty only if your storage provider does not need it.");
}
