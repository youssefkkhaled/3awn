import { NextRequest, NextResponse } from "next/server";

import { createDonation } from "@/lib/donations";
import { ConfigurationError } from "@/lib/env";
import { AppError } from "@/lib/errors";
import { getClientIp, hashClientIp, verifyTurnstileToken } from "@/lib/security";
import type { CreateDonationRequest } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  let payload: CreateDonationRequest;

  try {
    const formData = await request.formData();
    payload = {
      idempotencyKey: String(formData.get("idempotencyKey") || ""),
      type: String(formData.get("type") || "") as CreateDonationRequest["type"],
      mealsCount:
        typeof formData.get("mealsCount") === "string" &&
        String(formData.get("mealsCount")).length > 0
          ? Number(formData.get("mealsCount"))
          : undefined,
      amountEGP:
        typeof formData.get("amountEGP") === "string" &&
        String(formData.get("amountEGP")).length > 0
          ? Number(formData.get("amountEGP"))
          : undefined,
      turnstileToken: String(formData.get("turnstileToken") || ""),
      receiptImagePath: null,
    };
  } catch {
    return NextResponse.json(
      {
        code: "INVALID_FORM_DATA",
        error: "تعذر قراءة بيانات الطلب.",
      },
      { status: 400 },
    );
  }

  try {
    const clientIp = getClientIp(request);
    const donation = await createDonation(payload, {
      clientIp,
      clientIpHash: hashClientIp(clientIp),
      userAgent: request.headers.get("user-agent"),
      verifyTurnstile: verifyTurnstileToken,
    });

    return NextResponse.json(donation);
  } catch (error) {
    if (error instanceof ConfigurationError) {
      return NextResponse.json(
        { code: "CONFIGURATION_ERROR", error: error.message },
        { status: 503 },
      );
    }

    if (error instanceof AppError) {
      return NextResponse.json(
        { code: error.code, error: error.message },
        { status: error.status },
      );
    }

    return NextResponse.json(
      {
        code: "INTERNAL_SERVER_ERROR",
        error: "حدث خطأ غير متوقع أثناء تسجيل التبرع.",
      },
      { status: 500 },
    );
  }
}
