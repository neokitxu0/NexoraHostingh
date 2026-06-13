import { db, servicesTable, invoicesTable, usersTable, automationJobsTable, productsTable, settingsTable } from "@workspace/db";
import { eq, and, lte } from "drizzle-orm";
import { logger } from "./logger";
import { sendTemplateEmail } from "./mailer";
import { sendDiscordNotification } from "./discord";
import { getPterodactylClient } from "./pterodactyl";
import { getProxmoxClient } from "./proxmox";

async function logJob(type: string, targetId: number | null, status: string, result?: string, error?: string) {
  await db.insert(automationJobsTable).values({
    type, targetId, status, result, error,
    completedAt: new Date(),
  });
}

export async function runSuspensionCheck(): Promise<void> {
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
  const cutoffDate = threeDaysAgo.toISOString().split("T")[0];
  try {
    // Find users with overdue unpaid invoices
    const overdueInvoices = await db
      .select({ invoiceId: invoicesTable.id, userId: invoicesTable.userId })
      .from(invoicesTable)
      .where(and(
        eq(invoicesTable.status, "unpaid"),
        lte(invoicesTable.dueDate, cutoffDate),
      ));

    for (const inv of overdueInvoices) {
      // Find active services for this user to suspend
      const activeServices = await db.select().from(servicesTable)
        .where(and(eq(servicesTable.userId, inv.userId), eq(servicesTable.status, "active")));

      for (const service of activeServices) {
        await db.update(servicesTable)
          .set({ status: "suspended", suspendedAt: new Date() })
          .where(eq(servicesTable.id, service.id));

        const provisionData = JSON.parse(service.provisionData ?? "{}");
        const [product] = await db.select().from(productsTable).where(eq(productsTable.id, service.productId));

        if (product?.provisionModule === "pterodactyl" && provisionData.serverId) {
          const client = await getPterodactylClient();
          if (client) {
            try { await client.suspendServer(provisionData.serverId); } catch (e) { logger.error({ e }, "Pterodactyl suspend failed"); }
          }
        }

        if (product?.provisionModule === "proxmox" && provisionData.vmid && provisionData.node) {
          const client = await getProxmoxClient();
          if (client) {
            try { await client.powerAction(provisionData.node, provisionData.vmid, "stop"); } catch (e) { logger.error({ e }, "Proxmox stop failed"); }
          }
        }

        const [user] = await db.select().from(usersTable).where(eq(usersTable.id, service.userId));
        if (user) {
          await sendTemplateEmail(user.email, "service_suspended", {
            firstName: user.firstName ?? "",
            serviceName: product?.name ?? `Service #${service.id}`,
            invoiceId: String(inv.invoiceId),
          });
        }

        await sendDiscordNotification(
          "Service Suspended",
          `Service #${service.id} suspended due to overdue invoice #${inv.invoiceId}`,
          "warning",
          [{ name: "User", value: user?.email ?? `ID ${service.userId}`, inline: true }]
        );

        await logJob("suspend_service", service.id, "completed", `Suspended due to invoice #${inv.invoiceId}`);
      }
    }
  } catch (err) {
    logger.error({ err }, "Suspension check failed");
  }
}

export async function runRenewalReminders(): Promise<void> {
  const today = new Date();
  const in7Days = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
  const in7DaysStr = in7Days.toISOString().split("T")[0];

  try {
    const dueServices = await db.select().from(servicesTable)
      .where(and(
        eq(servicesTable.status, "active"),
        eq(servicesTable.nextDueDate, in7DaysStr),
      ));

    for (const service of dueServices) {
      const [user] = await db.select().from(usersTable).where(eq(usersTable.id, service.userId));
      if (!user) continue;
      const [product] = await db.select().from(productsTable).where(eq(productsTable.id, service.productId));
      await sendTemplateEmail(user.email, "renewal_reminder", {
        firstName: user.firstName ?? "",
        serviceName: product?.name ?? `Service #${service.id}`,
        dueDate: in7DaysStr,
        amount: service.price,
      });
      await logJob("renewal_reminder", service.id, "completed", `Reminder sent to ${user.email}`);
    }
  } catch (err) {
    logger.error({ err }, "Renewal reminder failed");
  }
}

export async function provisionService(serviceId: number): Promise<{ success: boolean; message: string }> {
  try {
    const [service] = await db.select().from(servicesTable).where(eq(servicesTable.id, serviceId));
    if (!service) return { success: false, message: "Service not found" };

    const [product] = await db.select().from(productsTable).where(eq(productsTable.id, service.productId));
    if (!product) return { success: false, message: "Product not found" };

    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, service.userId));
    if (!user) return { success: false, message: "User not found" };

    const config = JSON.parse(product.provisionConfigJson ?? "{}");

    if (product.provisionModule === "pterodactyl") {
      const client = await getPterodactylClient();
      if (!client) return { success: false, message: "Pterodactyl not configured" };

      let pteroUser = await client.getUserByEmail(user.email);
      let pteroPassword: string | undefined;
      if (!pteroUser) {
        const created = await client.createUser(
          user.email,
          user.email.split("@")[0].replace(/[^a-z0-9_]/gi, "_").slice(0, 20),
          user.firstName ?? "User",
          user.lastName ?? "Account"
        );
        pteroUser = created;
        pteroPassword = created.password;
      }

      const ramMb = parseInt(product.ram ?? "1024") || 1024;
      const diskMb = parseInt(product.diskSpace ?? "10240") || 10240;
      const cpuPct = parseInt(product.cpu ?? "100") || 100;

      const server = await client.createServer({
        name: `${user.email.split("@")[0]}-${service.id}`,
        userId: pteroUser.id,
        eggId: config.eggId ?? 1,
        nestId: config.nestId ?? 1,
        nodeId: config.nodeId ?? 1,
        allocationId: config.allocationId ?? 1,
        ram: ramMb,
        disk: diskMb,
        cpu: cpuPct,
        env: config.env ?? {},
      });

      const [panelSetting] = await db.select().from(settingsTable).where(eq(settingsTable.key, "pterodactyl_url")).limit(1);
      const provisionData = {
        module: "pterodactyl",
        serverId: server.id,
        serverIdentifier: server.identifier,
        serverUuid: server.uuid,
        pteroUserId: pteroUser.id,
        panelUrl: panelSetting?.value ?? "",
        username: user.email,
        password: pteroPassword,
      };

      await db.update(servicesTable).set({
        status: "active",
        username: user.email,
        password: pteroPassword,
        provisionData: JSON.stringify(provisionData),
      }).where(eq(servicesTable.id, serviceId));

      await sendTemplateEmail(user.email, "service_provisioned", {
        firstName: user.firstName ?? "",
        serviceName: product.name,
        username: user.email,
        password: pteroPassword ?? "(existing account)",
        panelUrl: provisionData.panelUrl,
      });

      await sendDiscordNotification("Server Provisioned", `Pterodactyl server created for ${user.email}`, "success", [
        { name: "Service", value: product.name, inline: true },
        { name: "Server ID", value: String(server.id), inline: true },
      ]);

      await logJob("provision_service", serviceId, "completed", JSON.stringify(provisionData));
      return { success: true, message: `Server provisioned: ${server.identifier}` };
    }

    if (product.provisionModule === "proxmox") {
      const client = await getProxmoxClient();
      if (!client) return { success: false, message: "Proxmox not configured" };

      const ramMb = parseInt(product.ram ?? "1024") || 1024;
      const diskGb = parseInt(product.diskSpace ?? "20") || 20;
      const cores = parseInt(product.cpu ?? "1") || 1;

      const { vmid } = await client.createVM({
        node: config.node ?? "pve",
        templateVmid: config.templateVmid ?? 100,
        name: `nexora-${service.id}`,
        cores,
        ram: ramMb,
        disk: diskGb,
        storage: config.storage ?? "local-lvm",
      });

      const rootPassword = Math.random().toString(36).slice(2) + "!Nx" + Math.random().toString(36).slice(2);
      const provisionData = {
        module: "proxmox",
        vmid,
        node: config.node ?? "pve",
        password: rootPassword,
        ipAddress: service.ipAddress ?? "Pending",
      };

      await db.update(servicesTable).set({
        status: "active",
        username: "root",
        password: rootPassword,
        provisionData: JSON.stringify(provisionData),
      }).where(eq(servicesTable.id, serviceId));

      await sendTemplateEmail(user.email, "service_provisioned", {
        firstName: user.firstName ?? "",
        serviceName: product.name,
        username: "root",
        password: rootPassword,
        panelUrl: "",
      });

      await logJob("provision_service", serviceId, "completed", JSON.stringify(provisionData));
      return { success: true, message: `VPS provisioned: VMID ${vmid}` };
    }

    await db.update(servicesTable).set({ status: "active" }).where(eq(servicesTable.id, serviceId));
    await logJob("provision_service", serviceId, "completed", "Manual provisioning - no module");
    return { success: true, message: "Service activated (manual provisioning)" };
  } catch (err) {
    await logJob("provision_service", serviceId, "failed", undefined, String(err));
    logger.error({ err }, "Provisioning failed");
    return { success: false, message: String(err) };
  }
}

export function startAutomationScheduler(): void {
  logger.info("Automation scheduler starting");
  setInterval(async () => {
    await runSuspensionCheck();
    await runRenewalReminders();
  }, 60 * 60 * 1000);
  setTimeout(async () => {
    await runSuspensionCheck();
    await runRenewalReminders();
  }, 10_000);
}
