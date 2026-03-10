import { createHash } from "node:crypto";

import type { NextRequest } from "next/server";

import {
  getIpHashPepper,
  getTurnstileSecretKey,
  isTurnstileConfigured,
} from "@/lib/env";

export function getClientIp(request: NextRequest) {
  const cfIp = request.headers.get("cf-connecting-ip");

  if (cfIp) {
    return cfIp;
  }

  const forwarded = request.headers.get("x-forwarded-for");

  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || null;
  }

  return request.headers.get("x-real-ip");
}

export function hashClientIp(ip: string | null) {
  if (!ip) {
    return null;
  }

  return createHash("sha256")
    .update(`${ip}:${getIpHashPepper()}`)
    .digest("hex");
}

export async function verifyTurnstileToken(
  token: string,
  ip: string | null,
): Promise<{ success: boolean; errorCodes?: string[] }> {
  if (!isTurnstileConfigured()) {
    return {
      success: token.trim().length > 0,
    };
  }

  const formData = new URLSearchParams({
    secret: getTurnstileSecretKey(),
    response: token,
  });

  if (ip) {
    formData.set("remoteip", ip);
  }

  const response = await fetch(
    "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    {
      method: "POST",
      body: formData,
    },
  );

  if (!response.ok) {
    return { success: false, errorCodes: ["turnstile-request-failed"] };
  }

  const payload = (await response.json()) as {
    success: boolean;
    "error-codes"?: string[];
  };

  return {
    success: payload.success,
    errorCodes: payload["error-codes"],
  };
}
