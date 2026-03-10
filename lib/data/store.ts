import { isPostgresConfigured } from "@/lib/env";
import * as postgresStore from "@/lib/data/store-postgres";
import * as sqliteStore from "@/lib/data/store-sqlite";

function getStoreProvider() {
  return (isPostgresConfigured() ? postgresStore : sqliteStore) as typeof sqliteStore;
}

export function getCampaignSettings(
  ...args: Parameters<typeof sqliteStore.getCampaignSettings>
) {
  return getStoreProvider().getCampaignSettings(...args);
}

export function getCampaignSnapshot(
  ...args: Parameters<typeof sqliteStore.getCampaignSnapshot>
) {
  return getStoreProvider().getCampaignSnapshot(...args);
}

export function getLogoPublicUrl(
  ...args: Parameters<typeof sqliteStore.getLogoPublicUrl>
) {
  return getStoreProvider().getLogoPublicUrl(...args);
}

export function hasConfirmedDonations(
  ...args: Parameters<typeof sqliteStore.hasConfirmedDonations>
) {
  return getStoreProvider().hasConfirmedDonations(...args);
}

export function insertConfirmedDonation(
  ...args: Parameters<typeof sqliteStore.insertConfirmedDonation>
) {
  return getStoreProvider().insertConfirmedDonation(...args);
}

export function listDonations(
  ...args: Parameters<typeof sqliteStore.listDonations>
) {
  return getStoreProvider().listDonations(...args);
}

export function voidDonation(
  ...args: Parameters<typeof sqliteStore.voidDonation>
) {
  return getStoreProvider().voidDonation(...args);
}

export function createAdjustment(
  ...args: Parameters<typeof sqliteStore.createAdjustment>
) {
  return getStoreProvider().createAdjustment(...args);
}

export function listAdjustments(
  ...args: Parameters<typeof sqliteStore.listAdjustments>
) {
  return getStoreProvider().listAdjustments(...args);
}

export function logAuditEvent(
  ...args: Parameters<typeof sqliteStore.logAuditEvent>
) {
  return getStoreProvider().logAuditEvent(...args);
}

export function listAuditLogs(
  ...args: Parameters<typeof sqliteStore.listAuditLogs>
) {
  return getStoreProvider().listAuditLogs(...args);
}

export function uploadLogoAsset(
  ...args: Parameters<typeof sqliteStore.uploadLogoAsset>
) {
  return getStoreProvider().uploadLogoAsset(...args);
}

export function uploadReceiptAsset(
  ...args: Parameters<typeof sqliteStore.uploadReceiptAsset>
) {
  return getStoreProvider().uploadReceiptAsset(...args);
}

export function updateCampaignSettings(
  ...args: Parameters<typeof sqliteStore.updateCampaignSettings>
) {
  return getStoreProvider().updateCampaignSettings(...args);
}

export function listLatestActivity(
  ...args: Parameters<typeof sqliteStore.listLatestActivity>
) {
  return getStoreProvider().listLatestActivity(...args);
}
