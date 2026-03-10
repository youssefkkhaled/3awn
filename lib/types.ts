export type DonationType = "meals" | "amount";
export type DonationStatus = "confirmed" | "voided";
export type AdjustmentKind = "meals" | "amount";

export interface CampaignSettings {
  id: string;
  slug: string;
  campaignNameAr: string;
  heroTitleAr: string;
  heroBodyAr: string;
  mealPriceEGP: number;
  campaignEndDate: string;
  timezone: string;
  acceptingDonations: boolean;
  logoStoragePath: string | null;
  instapayHandle: string;
  instapayLink: string;
  vodafoneCashNumber: string;
  createdAt: string;
  updatedAt: string;
}

export interface CampaignSnapshot {
  directMeals: number;
  monthlyPoolEGP: number;
  totalConfirmedDonations: number;
}

export interface PublicStats {
  distributionDate: string;
  distributionDateLabel: string;
  mealPriceEGP: number;
  remainingDays: number;
  directMeals: number;
  monthlyPoolEGP: number;
  monthlyPoolMealsTotal: number;
  monthlyPoolMealsPerDay: number;
  projectedMealsTomorrow: number;
  campaignEnded: boolean;
  acceptingDonations: boolean;
}

export interface CreateDonationRequest {
  idempotencyKey: string;
  type: DonationType;
  mealsCount?: number;
  amountEGP?: number;
  turnstileToken: string;
  receiptImagePath: string;
}

export interface CreateDonationResponse {
  donationId: string;
  stats: PublicStats;
}

export interface PaymentDetails {
  instapayHandle: string;
  instapayLink: string;
  vodafoneCashNumber: string;
}

export interface PublicCampaignDetails {
  campaignNameAr: string;
  heroTitleAr: string;
  heroBodyAr: string;
  logoUrl: string;
}

export interface PublicStatsPayload {
  stats: PublicStats;
  campaign: PublicCampaignDetails;
  payment: PaymentDetails;
  turnstileSiteKey: string | null;
}

export interface DonationRecord {
  id: string;
  idempotencyKey: string;
  type: DonationType;
  status: DonationStatus;
  mealsCount: number | null;
  amountEGP: number;
  distributionDate: string | null;
  createdAt: string;
  voidedAt: string | null;
  voidReason: string | null;
  clientIpHash: string | null;
  userAgent: string | null;
  receiptImagePath: string | null;
}

export interface AdminAdjustmentRecord {
  id: string;
  kind: AdjustmentKind;
  deltaValue: number;
  effectiveDate: string | null;
  reason: string;
  createdBy: string;
  createdAt: string;
}

export interface AuditLogRecord {
  id: string;
  actorUserId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  payloadJson: Record<string, unknown>;
  createdAt: string;
}

export interface LatestActivityItem {
  id: string;
  kind: "donation" | "audit";
  title: string;
  description: string;
  createdAt: string;
}

export interface DonationFilters {
  type?: DonationType;
  status?: DonationStatus;
  distributionDate?: string;
}

export interface ConfirmedDonationInsert {
  idempotencyKey: string;
  type: DonationType;
  mealsCount: number | null;
  amountEGP: number;
  distributionDate: string | null;
  clientIpHash: string | null;
  userAgent: string | null;
  receiptImagePath: string;
}

export interface AdjustmentInsert {
  kind: AdjustmentKind;
  deltaValue: number;
  effectiveDate: string | null;
  reason: string;
  createdBy: string;
}

export interface CampaignSettingsUpdate {
  campaignNameAr: string;
  heroTitleAr: string;
  heroBodyAr: string;
  mealPriceEGP: number;
  campaignEndDate: string;
  acceptingDonations: boolean;
  instapayHandle: string;
  instapayLink: string;
  vodafoneCashNumber: string;
  logoStoragePath: string | null;
}
