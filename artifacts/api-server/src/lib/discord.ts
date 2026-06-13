import { db, settingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "./logger";

async function getSetting(key: string): Promise<string | null> {
  const row = await db.select().from(settingsTable).where(eq(settingsTable.key, key)).limit(1);
  return row[0]?.value ?? null;
}

export type DiscordColor = "success" | "warning" | "error" | "info";

const COLORS: Record<DiscordColor, number> = {
  success: 0x22c55e,
  warning: 0xf59e0b,
  error: 0xef4444,
  info: 0x6366f1,
};

export async function sendDiscordNotification(
  title: string,
  description: string,
  color: DiscordColor = "info",
  fields?: Array<{ name: string; value: string; inline?: boolean }>
): Promise<void> {
  try {
    const webhook = await getSetting("discord_webhook_url");
    if (!webhook) return;

    const payload = {
      embeds: [{
        title,
        description,
        color: COLORS[color],
        fields: fields ?? [],
        timestamp: new Date().toISOString(),
        footer: { text: "NexoraHosting" },
      }],
    };

    await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    logger.error({ err }, "Discord notification failed");
  }
}
