import { cache } from "react";
import path from "node:path";

export class ConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigurationError";
  }
}

function readOptionalEnv(name: string) {
  const value = process.env[name];
  return value && value.length > 0 ? value : null;
}

function readRequiredEnv(name: string) {
  const value = readOptionalEnv(name);

  if (!value) {
    throw new ConfigurationError(`${name} is not configured.`);
  }

  return value;
}

export function isTurnstileConfigured() {
  return Boolean(
    readOptionalEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY") &&
      readOptionalEnv("TURNSTILE_SECRET_KEY"),
  );
}

export function isPostgresConfigured() {
  return Boolean(readOptionalEnv("DATABASE_URL"));
}

export const getDatabasePath = cache(() =>
  readOptionalEnv("DATABASE_PATH") || path.join(process.cwd(), "data", "app.db"),
);

export const getUploadsPath = cache(() =>
  readOptionalEnv("UPLOADS_DIR") ||
  path.join(process.cwd(), "public", "uploads"),
);

export const getDatabaseUrl = cache(() => readRequiredEnv("DATABASE_URL"));

export const getAdminEmail = cache(() =>
  readOptionalEnv("ADMIN_USERNAME") ||
  readOptionalEnv("ADMIN_EMAIL") ||
  "seif",
);

export function getAdminPassword() {
  const password = readOptionalEnv("ADMIN_PASSWORD");

  if (password) {
    return password;
  }

  if (process.env.NODE_ENV === "production") {
    throw new ConfigurationError(
      "ADMIN_PASSWORD is required in production.",
    );
  }

  return "bob2002";
}

export function getSessionSecret() {
  const secret = readOptionalEnv("SESSION_SECRET");

  if (secret) {
    return secret;
  }

  if (process.env.NODE_ENV === "production") {
    throw new ConfigurationError(
      "SESSION_SECRET is required in production.",
    );
  }

  return "dev-only-local-session-secret";
}

export function getTurnstileSiteKey() {
  return readOptionalEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY");
}

export const getTurnstileSecretKey = cache(() =>
  readRequiredEnv("TURNSTILE_SECRET_KEY"),
);

export function getIpHashPepper() {
  const pepper = readOptionalEnv("IP_HASH_PEPPER");

  if (pepper) {
    return pepper;
  }

  if (process.env.NODE_ENV === "production") {
    throw new ConfigurationError(
      "IP_HASH_PEPPER is required in production to hash donor IP addresses.",
    );
  }

  return "dev-only-pepper";
}

export function isObjectStorageConfigured() {
  return Boolean(
    readOptionalEnv("S3_BUCKET") &&
      readOptionalEnv("S3_ACCESS_KEY_ID") &&
      readOptionalEnv("S3_SECRET_ACCESS_KEY") &&
      readOptionalEnv("S3_PUBLIC_BASE_URL"),
  );
}

export const getS3Bucket = cache(() => readRequiredEnv("S3_BUCKET"));

export const getS3Region = cache(() => readOptionalEnv("S3_REGION") || "us-east-1");

export const getS3Endpoint = cache(() => readOptionalEnv("S3_ENDPOINT"));

export const getS3AccessKeyId = cache(() =>
  readRequiredEnv("S3_ACCESS_KEY_ID"),
);

export const getS3SecretAccessKey = cache(() =>
  readRequiredEnv("S3_SECRET_ACCESS_KEY"),
);

export const getS3PublicBaseUrl = cache(() =>
  readRequiredEnv("S3_PUBLIC_BASE_URL").replace(/\/+$/, ""),
);
