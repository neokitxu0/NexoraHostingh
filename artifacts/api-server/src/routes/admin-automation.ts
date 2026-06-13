import { Router } from "express";
import { db, automationJobsTable, servicesTable, invoicesTable, emailTemplatesTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireAdmin } from "../middlewares/auth";
import { logger } from "../lib/logger";

const router = Router();

// GET /api/admin/automation/jobs
router.get("/jobs", requireAdmin, async (req, res) => {
  try {
    const { page = "1" } = req.query;
    const pageNum = Number(page);
    const jobs = await db.select().from(automationJobsTable)
      .orderBy(desc(automationJobsTable.createdAt))
      .limit(50).offset((pageNum - 1) * 50);
    res.json({ data: jobs, page: pageNum });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/admin/automation/run-suspension-check
router.post("/run-suspension-check", requireAdmin, async (_req, res) => {
  try {
    const { runSuspensionCheck } = await import("../lib/automation");
    await runSuspensionCheck();
    res.json({ message: "Suspension check completed" });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// POST /api/admin/automation/run-renewal-reminders
router.post("/run-renewal-reminders", requireAdmin, async (_req, res) => {
  try {
    const { runRenewalReminders } = await import("../lib/automation");
    await runRenewalReminders();
    res.json({ message: "Renewal reminders sent" });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// POST /api/admin/automation/provision/:serviceId
router.post("/provision/:serviceId", requireAdmin, async (req, res) => {
  try {
    const { provisionService } = await import("../lib/automation");
    const result = await provisionService(Number(req.params.serviceId));
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// GET /api/admin/automation/email-templates
router.get("/email-templates", requireAdmin, async (_req, res) => {
  try {
    const templates = await db.select().from(emailTemplatesTable).orderBy(emailTemplatesTable.slug);
    res.json(templates);
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// PUT /api/admin/automation/email-templates/:id
router.put("/email-templates/:id", requireAdmin, async (req, res) => {
  try {
    const { name, subject, body, enabled } = req.body;
    const [tmpl] = await db.update(emailTemplatesTable)
      .set({ name, subject, body, enabled })
      .where(eq(emailTemplatesTable.id, Number(req.params.id)))
      .returning();
    res.json(tmpl);
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/admin/automation/email-templates/seed
router.post("/email-templates/seed", requireAdmin, async (_req, res) => {
  try {
    const defaults = [
      {
        slug: "welcome",
        name: "Welcome Email",
        subject: "Welcome to NexoraHosting, {{firstName}}!",
        body: `<h2>Welcome, {{firstName}}!</h2><p>Your account has been created. <a href="{{panelUrl}}/login">Login here</a>.</p>`,
      },
      {
        slug: "service_provisioned",
        name: "Service Provisioned",
        subject: "Your {{serviceName}} is ready!",
        body: `<h2>Your service is live!</h2><p>Service: {{serviceName}}<br>Username: {{username}}<br>Password: {{password}}<br>Panel: {{panelUrl}}</p>`,
      },
      {
        slug: "service_suspended",
        name: "Service Suspended",
        subject: "Your {{serviceName}} has been suspended",
        body: `<h2>Service Suspended</h2><p>Hi {{firstName}}, your {{serviceName}} was suspended due to unpaid invoice #{{invoiceId}}. Pay now to restore access.</p>`,
      },
      {
        slug: "renewal_reminder",
        name: "Renewal Reminder",
        subject: "Your {{serviceName}} renews in 7 days",
        body: `<h2>Renewal Reminder</h2><p>Hi {{firstName}}, your {{serviceName}} renews on {{dueDate}} for ${{amount}}.</p>`,
      },
      {
        slug: "invoice_paid",
        name: "Invoice Paid",
        subject: "Invoice #{{invoiceId}} — Payment Received",
        body: `<h2>Payment Received</h2><p>Hi {{firstName}}, we received your payment of ${{amount}} for invoice #{{invoiceId}}.</p>`,
      },
    ];
    for (const tmpl of defaults) {
      await db.insert(emailTemplatesTable).values({ ...tmpl, enabled: true })
        .onConflictDoNothing();
    }
    const all = await db.select().from(emailTemplatesTable);
    res.json(all);
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
