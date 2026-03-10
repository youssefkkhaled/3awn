"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  loginAdminUser,
  logoutAdminUser,
  requireAdminUser,
} from "@/lib/auth";
import {
  createAdjustment as createAdjustmentRecord,
  getCampaignSettings,
  hasConfirmedDonations,
  logAuditEvent,
  updateCampaignSettings as updateCampaignSettingsRecord,
  uploadLogoAsset,
  voidDonation as voidDonationRecord,
} from "@/lib/data/store";
import {
  adjustmentSchema,
  isTruthyField,
  loginSchema,
  settingsSchema,
  voidDonationSchema,
} from "@/lib/validation";

function encodeError(errorCode: string) {
  return encodeURIComponent(errorCode);
}

export async function loginAction(formData: FormData) {
  const parsedCredentials = loginSchema.safeParse({
    username: formData.get("username"),
    password: formData.get("password"),
  });

  if (!parsedCredentials.success) {
    redirect("/admin/login?error=credentials");
  }

  const loggedIn = await loginAdminUser(
    parsedCredentials.data.username,
    parsedCredentials.data.password,
  );

  if (!loggedIn) {
    redirect("/admin/login?error=credentials");
  }

  redirect("/admin");
}

export async function logoutAction() {
  await logoutAdminUser();
  redirect("/admin/login");
}

export async function voidDonationAction(formData: FormData) {
  const user = await requireAdminUser();
  const parsed = voidDonationSchema.safeParse({
    donationId: formData.get("donationId"),
    reason: formData.get("reason"),
  });

  if (!parsed.success) {
    redirect(`/admin/donations?error=${encodeError("void")}`);
  }

  const donationId = await voidDonationRecord(
    parsed.data.donationId,
    parsed.data.reason,
  );

  await logAuditEvent({
    actorUserId: user.id,
    action: "void_donation",
    entityType: "donation",
    entityId: donationId,
    payloadJson: {
      reason: parsed.data.reason,
    },
  });

  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/admin/donations");
  redirect("/admin/donations?success=voided");
}

export async function createAdjustmentAction(formData: FormData) {
  const user = await requireAdminUser();
  const parsed = adjustmentSchema.safeParse({
    kind: formData.get("kind"),
    deltaValue: formData.get("deltaValue"),
    effectiveDate: formData.get("effectiveDate"),
    reason: formData.get("reason"),
  });

  if (!parsed.success) {
    redirect("/admin/adjustments?error=adjustment");
  }

  if (parsed.data.kind === "meals" && !parsed.data.effectiveDate) {
    redirect("/admin/adjustments?error=effectiveDate");
  }

  const adjustment = await createAdjustmentRecord({
    kind: parsed.data.kind,
    deltaValue: parsed.data.deltaValue,
    effectiveDate:
      parsed.data.effectiveDate && parsed.data.effectiveDate.length > 0
        ? parsed.data.effectiveDate
        : null,
    reason: parsed.data.reason,
    createdBy: user.id,
  });

  await logAuditEvent({
    actorUserId: user.id,
    action: "create_adjustment",
    entityType: "admin_adjustment",
    entityId: adjustment.id,
    payloadJson: {
      kind: adjustment.kind,
      deltaValue: adjustment.deltaValue,
    },
  });

  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/admin/adjustments");
  redirect("/admin/adjustments?success=created");
}

export async function updateCampaignSettingsAction(formData: FormData) {
  const user = await requireAdminUser();
  const currentSettings = await getCampaignSettings();
  const locked = await hasConfirmedDonations();
  const logoEntry = formData.get("logo");

  let logoStoragePath = currentSettings.logoStoragePath;

  if (logoEntry instanceof File && logoEntry.size > 0) {
    logoStoragePath = await uploadLogoAsset(logoEntry);
  }

  const parsed = settingsSchema.safeParse({
    campaignNameAr: formData.get("campaignNameAr"),
    heroTitleAr: formData.get("heroTitleAr"),
    heroBodyAr: formData.get("heroBodyAr"),
    mealPriceEGP: locked
      ? currentSettings.mealPriceEGP
      : formData.get("mealPriceEGP"),
    campaignEndDate: locked
      ? currentSettings.campaignEndDate
      : formData.get("campaignEndDate"),
    acceptingDonations: isTruthyField(formData.get("acceptingDonations")),
    instapayHandle: formData.get("instapayHandle"),
    instapayLink: formData.get("instapayLink"),
    vodafoneCashNumber: formData.get("vodafoneCashNumber"),
    logoStoragePath,
  });

  if (!parsed.success) {
    redirect("/admin/settings?error=settings");
  }

  const { timezone, ...updateValues } = parsed.data;
  void timezone;

  const updatedSettings = await updateCampaignSettingsRecord(updateValues, locked);

  await logAuditEvent({
    actorUserId: user.id,
    action: "update_campaign_settings",
    entityType: "campaign_settings",
    entityId: updatedSettings.id,
    payloadJson: {
      lockedFinancialFields: locked,
      acceptingDonations: updatedSettings.acceptingDonations,
    },
  });

  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/admin/settings");
  redirect("/admin/settings?success=saved");
}
