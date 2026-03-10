import { beforeEach, describe, expect, it, vi } from "vitest";

const redirectMock = vi.fn((path: string) => {
  throw new Error(`REDIRECT:${path}`);
});

const revalidatePathMock = vi.fn();
const requireAdminUserMock = vi.fn();
const loginAdminUserMock = vi.fn();
const logoutAdminUserMock = vi.fn();
const voidDonationMock = vi.fn();
const logAuditEventMock = vi.fn();

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

vi.mock("@/lib/auth", () => ({
  loginAdminUser: loginAdminUserMock,
  logoutAdminUser: logoutAdminUserMock,
  requireAdminUser: requireAdminUserMock,
}));

vi.mock("@/lib/data/store", () => ({
  createAdjustment: vi.fn(),
  getCampaignSettings: vi.fn(),
  hasConfirmedDonations: vi.fn(),
  logAuditEvent: logAuditEventMock,
  updateCampaignSettings: vi.fn(),
  uploadLogoAsset: vi.fn(),
  voidDonation: voidDonationMock,
}));

const { loginAction, voidDonationAction } = await import("@/app/admin/actions");

describe("admin actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects back to login when local admin credentials are invalid", async () => {
    loginAdminUserMock.mockResolvedValue(false);

    const formData = new FormData();
    formData.set("username", "seif");
    formData.set("password", "password123");

    await expect(loginAction(formData)).rejects.toThrow(
      "REDIRECT:/admin/login?error=credentials",
    );
    expect(loginAdminUserMock).toHaveBeenCalledWith(
      "seif",
      "password123",
    );
  });

  it("voids a confirmed donation, logs the action, and revalidates admin pages", async () => {
    requireAdminUserMock.mockResolvedValue({
      id: "admin-1",
      email: "admin@example.com",
    });
    voidDonationMock.mockResolvedValue("donation-1");

    const formData = new FormData();
    formData.set("donationId", "55555555-5555-4555-8555-555555555555");
    formData.set("reason", "اختبار إلغاء");

    await expect(voidDonationAction(formData)).rejects.toThrow(
      "REDIRECT:/admin/donations?success=voided",
    );
    expect(voidDonationMock).toHaveBeenCalledWith(
      "55555555-5555-4555-8555-555555555555",
      "اختبار إلغاء",
    );
    expect(logAuditEventMock).toHaveBeenCalled();
    expect(revalidatePathMock).toHaveBeenCalledWith("/");
    expect(revalidatePathMock).toHaveBeenCalledWith("/admin/donations");
  });
});
