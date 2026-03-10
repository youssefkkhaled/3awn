const env = process.env;

const required = [
  "ADMIN_USERNAME",
  "ADMIN_PASSWORD",
  "SESSION_SECRET",
  "IP_HASH_PEPPER",
  "BLOB_READ_WRITE_TOKEN",
];

const postgresConfigured = Boolean(
  (env.DATABASE_URL && env.DATABASE_URL.trim().length > 0) ||
    (env.POSTGRES_URL && env.POSTGRES_URL.trim().length > 0),
);

if (!postgresConfigured) {
  required.push("DATABASE_URL or POSTGRES_URL");
}

const missing = required.filter((name) => {
  if (name === "DATABASE_URL or POSTGRES_URL") {
    return true;
  }

  const value = env[name];
  return !value || value.trim().length === 0;
});

if (missing.length > 0) {
  console.error("Missing required Vercel env vars:");
  for (const name of missing) {
    console.error(`- ${name}`);
  }
  process.exitCode = 1;
} else {
  console.log("Vercel env looks complete.");
}

const optional = ["NEXT_PUBLIC_TURNSTILE_SITE_KEY", "TURNSTILE_SECRET_KEY"];
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
  console.log("Turnstile is optional for the short-term Vercel deployment.");
}
