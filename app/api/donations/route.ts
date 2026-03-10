import { NextRequest, NextResponse } from "next/server";

import { createDonation } from "@/lib/donations";
import { ConfigurationError } from "@/lib/env";
import { AppError } from "@/lib/errors";
import { uploadReceiptAsset } from "@/lib/data/store";
import { getClientIp, hashClientIp, verifyTurnstileToken } from "@/lib/security";
import type { CreateDonationRequest } from "@/lib/types";

export const dynamic = "force-dynamic";

const MAX_RECEIPT_SIZE = 5 * 1024 * 1024;

export async function POST(request: NextRequest) {
  let payload: CreateDonationRequest;
  let receiptImage: File;

  try {
    const formData = await request.formData();
    const receiptEntry = formData.get("receiptImage");

    if (!(receiptEntry instanceof File) || receiptEntry.size === 0) {
      return NextResponse.json(
        {
          code: "RECEIPT_REQUIRED",
          error: "لقطة شاشة التحويل مطلوبة قبل تأكيد التبرع.",
        },
        { status: 400 },
      );
    }

    if (!receiptEntry.type.startsWith("image/")) {
      return NextResponse.json(
        {
          code: "RECEIPT_INVALID_TYPE",
          error: "يجب رفع صورة صحيحة لإثبات التحويل.",
        },
        { status: 400 },
      );
    }

    if (receiptEntry.size > MAX_RECEIPT_SIZE) {
      return NextResponse.json(
        {
          code: "RECEIPT_TOO_LARGE",
          error: "حجم صورة التحويل يجب ألا يتجاوز 5 ميجابايت.",
        },
        { status: 400 },
      );
    }

    receiptImage = receiptEntry;

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
      receiptImagePath: "",
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
    payload.receiptImagePath = await uploadReceiptAsset(receiptImage);

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
