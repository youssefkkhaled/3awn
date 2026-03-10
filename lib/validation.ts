import { z } from "zod";

import { DEFAULT_TIMEZONE } from "@/lib/seed";

export const createDonationRequestSchema = z
  .object({
    idempotencyKey: z.uuid(),
    type: z.enum(["meals", "amount"]),
    mealsCount: z.coerce.number().int().min(1).optional(),
    amountEGP: z.coerce.number().int().min(1).optional(),
    turnstileToken: z.string().trim().min(1),
    receiptImagePath: z.string().trim().min(1, "صورة التحويل مطلوبة."),
  })
  .superRefine((value, ctx) => {
    if (value.type === "meals" && !value.mealsCount) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "عدد الوجبات مطلوب لهذا النوع من التبرع.",
        path: ["mealsCount"],
      });
    }

    if (value.type === "amount" && !value.amountEGP) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "المبلغ مطلوب لهذا النوع من التبرع.",
        path: ["amountEGP"],
      });
    }
  });

export const loginSchema = z.object({
  username: z.string().trim().min(1, "أدخل اسم المستخدم."),
  password: z.string().min(7, "كلمة المرور يجب أن تكون 7 أحرف على الأقل."),
});

export const voidDonationSchema = z.object({
  donationId: z.uuid(),
  reason: z.string().trim().min(4, "سبب الإلغاء مطلوب."),
});

export const adjustmentSchema = z.object({
  kind: z.enum(["meals", "amount"]),
  deltaValue: z.coerce
    .number()
    .int()
    .refine((value) => value !== 0, "القيمة لا يمكن أن تكون صفرًا."),
  effectiveDate: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .or(z.literal("")),
  reason: z.string().trim().min(4, "سبب التعديل مطلوب."),
});

export const settingsSchema = z.object({
  campaignNameAr: z.string().trim().min(2),
  heroTitleAr: z.string().trim().min(2),
  heroBodyAr: z.string().trim().min(10),
  mealPriceEGP: z.coerce.number().int().min(1),
  campaignEndDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  timezone: z.string().default(DEFAULT_TIMEZONE),
  acceptingDonations: z.boolean(),
  instapayHandle: z.string().trim().min(3),
  instapayLink: z.url("أدخل رابط InstaPay صحيحًا."),
  vodafoneCashNumber: z.string().trim().min(8),
  logoStoragePath: z.string().nullable(),
});

export function isTruthyField(value: FormDataEntryValue | null) {
  if (typeof value !== "string") {
    return false;
  }

  return value === "true" || value === "on" || value === "1";
}
