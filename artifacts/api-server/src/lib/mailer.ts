import { db, settingsTable, emailTemplatesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "./logger";

async function getSetting(key: string): Promise<string | null> {
  const row = await db.select().from(settingsTable).where(eq(settingsTable.key, key)).limit(1);
  return row[0]?.value ?? null;
}

function renderTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`);
}

export async function sendEmail(to: string, subject: string, body: string): Promise<boolean> {
  try {
    const host = await getSetting("smtp_host");
    const port = await getSetting("smtp_port");
    const user = await getSetting("smtp_user");
    const pass = await getSetting("smtp_password");
    const from = await getSetting("smtp_from") ?? "noreply@nexorahosting.com";

    if (!host || !user || !pass) {
      logger.warn("SMTP not configured — skipping email send");
      return false;
    }

    const nodemailer = await import("nodemailer");
    const transporter = nodemailer.createTransport({
      host,
      port: Number(port ?? 587),
      secure: Number(port ?? 587) === 465,
      auth: { user, pass },
    });

    await transporter.sendMail({ from, to, subject, html: body });
    logger.info({ to, subject }, "Email sent");
    return true;
  } catch (err) {
    logger.error({ err }, "Email send failed");
    return false;
  }
}

export async function sendTemplateEmail(
  to: string,
  templateSlug: string,
  vars: Record<string, string>
): Promise<boolean> {
  try {
    const [template] = await db.select().from(emailTemplatesTable).where(eq(emailTemplatesTable.slug, templateSlug));
    if (!template || !template.enabled) return false;
    const subject = renderTemplate(template.subject, vars);
    const body = renderTemplate(template.body, vars);
    return sendEmail(to, subject, body);
  } catch (err) {
    logger.error({ err }, "sendTemplateEmail failed");
    return false;
  }
}
