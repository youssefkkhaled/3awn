import type { CampaignSettingsUpdate } from "@/lib/types";

export const DEFAULT_CAMPAIGN_SLUG = "ramadan-2026";
export const DEFAULT_TIMEZONE = "Africa/Cairo";
export const DEFAULT_HERO_IMAGE_PATH = "/hero.jpeg";

export const DEFAULT_CAMPAIGN_SETTINGS: CampaignSettingsUpdate = {
  campaignNameAr: "عوّن",
  heroTitleAr: "مبادرة عوّن لوجبات الإفطار",
  heroBodyAr:
    "مبادرة رمضانية لتوفير وجبات إفطار للصائمين. يمكنك التبرع بعدد من الوجبات التي توزَّع في اليوم التالي مباشرة، أو التبرع بمبلغ كامل ليتم تحويله إلى وجبات على مدار ما تبقى من رمضان.",
  mealPriceEGP: 85,
  campaignEndDate: "2026-03-20",
  acceptingDonations: true,
  instapayHandle: "seifokaib@instapay",
  instapayLink: "https://ipn.eg/S/seifokaib/instapay/3MMcRP",
  vodafoneCashNumber: "01069291611",
  logoStoragePath: null,
};
