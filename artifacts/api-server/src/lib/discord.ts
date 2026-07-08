import { db, settingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "./logger";

const DISCORD_API = "https://discord.com/api/v10";

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

export async function sendDiscordDM(discordUserId: string, content: string): Promise<void> {
  try {
    const botToken = await getSetting("discord_bot_token");
    if (!botToken) return;

    const dmRes = await fetch(`${DISCORD_API}/users/@me/channels`, {
      method: "POST",
      headers: {
        Authorization: `Bot ${botToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ recipient_id: discordUserId }),
    });
    if (!dmRes.ok) {
      logger.warn({ status: dmRes.status }, "Failed to open Discord DM channel");
      return;
    }
    const channel = await dmRes.json() as { id: string };

    const msgRes = await fetch(`${DISCORD_API}/channels/${channel.id}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bot ${botToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ content }),
    });
    if (!msgRes.ok) {
      logger.warn({ status: msgRes.status }, "Failed to send Discord DM");
    }
  } catch (err) {
    logger.error({ err }, "Discord DM failed");
  }
}
