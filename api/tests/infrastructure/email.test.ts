import { describe, it, expect } from "bun:test";
import { createEmailService, type EmailService } from "../../src/infrastructure/email";

describe("EmailService — console adapter", () => {
  it("creates a console email service by default", () => {
    const svc = createEmailService();
    expect(svc).toBeTruthy();
    expect(typeof svc.send).toBe("function");
  });

  it("send resolves without error", async () => {
    const svc = createEmailService();
    await svc.send("test@example.com", "new_device_login", {
      device: "Chrome on Windows",
      location: "New York, US",
    });
  });

  it("records sent emails for testing", async () => {
    const svc = createEmailService();
    await svc.send("a@b.com", "deletion_scheduled", { deletionDate: "2026-04-16" });
    expect(svc.getSentEmails()).toHaveLength(1);
    expect(svc.getSentEmails()[0].to).toBe("a@b.com");
    expect(svc.getSentEmails()[0].template).toBe("deletion_scheduled");
  });
});
