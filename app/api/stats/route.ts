import { NextResponse } from "next/server";

import { getDistributionDateKey } from "@/lib/date";
import { ConfigurationError, getTurnstileSiteKey } from "@/lib/env";
import { AppError } from "@/lib/errors";
import {
  getCampaignSettings,
  getCampaignSnapshot,
  getLogoPublicUrl,
} from "@/lib/data/store";
import { buildPublicStatsPayload } from "@/lib/stats";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const settings = await getCampaignSettings();
    const distributionDate = getDistributionDateKey(new Date(), settings.timezone);
    const basePayload = buildPublicStatsPayload({
      settings,
      snapshot: await getCampaignSnapshot(distributionDate),
      logoUrl: await getLogoPublicUrl(settings.logoStoragePath),
      turnstileSiteKey: getTurnstileSiteKey(),
    });

    return NextResponse.json(basePayload);
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
        error: "حدث خطأ غير متوقع أثناء تحميل بيانات الحملة.",
      },
      { status: 500 },
    );
  }
}
