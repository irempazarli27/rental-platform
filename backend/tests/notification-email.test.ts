import { beforeEach, describe, expect, it, vi } from "vitest";

const { sendNotification } = vi.hoisted(() => ({ sendNotification: vi.fn() }));
vi.mock("../src/utils/mailer", () => ({
  mailer: { isConfigured: () => true, sendVerificationCode: vi.fn(), sendNotification },
}));

import { db } from "../src/db";
import { notificationsService } from "../src/modules/notifications/notifications.service";
import { registerUser } from "./helpers";

async function verifiedUser(label: string) {
  const { user } = await registerUser(label);
  await db.updateTable("users").set({ email_verified_at: new Date() }).where("id", "=", user.id).execute();
  return user;
}

describe("notification emails", () => {
  beforeEach(() => {
    sendNotification.mockReset();
  });

  it("emails a verified user a copy with a link to the related rental", async () => {
    const user = await verifiedUser("notif-mail");
    const rentalId = "11111111-1111-4111-8111-111111111111";
    await notificationsService.notify(user.id, "rental_requested", "Yeni talep", "Kameran için talep var.", {
      type: "rental",
      id: rentalId,
    });

    await vi.waitFor(() => expect(sendNotification).toHaveBeenCalledTimes(1));
    const [to, title, body, url] = sendNotification.mock.calls[0]!;
    expect(to).toBe(user.email);
    expect(title).toBe("Yeni talep");
    expect(body).toBe("Kameran için talep var.");
    expect(url).toMatch(new RegExp(`/dashboard/rentals/${rentalId}$`));
  });

  it("does not email an address that was never verified", async () => {
    const { user } = await registerUser("notif-unverified");
    await notificationsService.notify(user.id, "rental_requested", "Yeni talep", "x");
    // The in-app notification still exists; only the email is skipped.
    expect((await notificationsService.list(user.id)).unreadCount).toBe(1);
    await new Promise((r) => setTimeout(r, 100));
    expect(sendNotification).not.toHaveBeenCalled();
  });

  it("sends one email per conversation until the earlier notification is read", async () => {
    const user = await verifiedUser("notif-chat");
    const conversation = { type: "conversation", id: "22222222-2222-4222-8222-222222222222" };
    await notificationsService.notify(user.id, "new_message", "Yeni mesaj", "Yeni bir mesajın var.", conversation);
    await notificationsService.notify(user.id, "new_message", "Yeni mesaj", "Yeni bir mesajın var.", conversation);
    await vi.waitFor(() => expect(sendNotification).toHaveBeenCalledTimes(1));

    const { notifications } = await notificationsService.list(user.id);
    expect(notifications).toHaveLength(2);
    for (const n of notifications) await notificationsService.markRead(user.id, n.id);

    await notificationsService.notify(user.id, "new_message", "Yeni mesaj", "Yeni bir mesajın var.", conversation);
    await vi.waitFor(() => expect(sendNotification).toHaveBeenCalledTimes(2));
  });
});
