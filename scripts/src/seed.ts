import { db } from "@workspace/db";
import {
  usersTable, productsTable, kbCategoriesTable, kbArticlesTable, notificationsTable,
} from "@workspace/db/schema";
import bcrypt from "bcryptjs";

async function seed() {
  console.log("🌱 Seeding database…");

  const adminEmail = process.env.ADMIN_EMAIL || "admin@nexorahosting.com";
  const adminPassword = process.env.ADMIN_PASSWORD || "NexoraAdmin@2026!";
  if (!process.env.ADMIN_PASSWORD) {
    console.warn("⚠️  ADMIN_PASSWORD env var not set — using default. Set ADMIN_EMAIL + ADMIN_PASSWORD before going live!");
  }
  const adminHash = await bcrypt.hash(adminPassword, 12);
  const [admin] = await db.insert(usersTable).values({
    email: adminEmail,
    passwordHash: adminHash,
    firstName: "Nexora",
    lastName: "Admin",
    role: "admin",
    emailVerified: true,
    status: "active",
    referralCode: "NEXORA-ADMIN",
  }).onConflictDoNothing().returning();
  console.log(`✅ Admin (${adminEmail}):`, admin ? "created" : "already exists");

  const clientHash = await bcrypt.hash("demo123", 12);
  const [client] = await db.insert(usersTable).values({
    email: "demo@example.com",
    passwordHash: clientHash,
    firstName: "Demo",
    lastName: "Client",
    role: "client",
    emailVerified: true,
    status: "active",
    creditBalance: "25.00",
    referralCode: "DEMO-CLIENT",
  }).onConflictDoNothing().returning();
  console.log("✅ Demo client:", client ? "created" : "already exists");

  const products = [
    { name: "Starter", category: "shared", description: "For personal sites", price: "2.99", billingCycle: "monthly", diskSpace: "10 GB SSD", bandwidth: "100 GB", featuresJson: JSON.stringify(["1 Website","Free SSL","5 Emails","cPanel","99.9% Uptime"]), featured: false, available: true },
    { name: "Business", category: "shared", description: "For growing businesses", price: "7.99", billingCycle: "monthly", diskSpace: "50 GB SSD", bandwidth: "Unlimited", featuresJson: JSON.stringify(["Unlimited Sites","Free SSL","Unlimited Emails","cPanel","Daily Backups","Free Domain"]), featured: true, available: true },
    { name: "Enterprise", category: "shared", description: "High-performance shared", price: "14.99", billingCycle: "monthly", diskSpace: "150 GB SSD", bandwidth: "Unlimited", featuresJson: JSON.stringify(["Unlimited Sites","Free SSL","Unlimited Emails","cPanel","Daily Backups","Free Domain","CDN","Priority Support"]), featured: false, available: true },
    { name: "VPS Micro", category: "vps", description: "Entry-level VPS", price: "9.99", billingCycle: "monthly", diskSpace: "25 GB SSD", bandwidth: "1 TB", ram: "2 GB", cpu: "1 vCPU", featuresJson: JSON.stringify(["Root Access","KVM","Linux/Windows","DDoS Protection"]), featured: false, available: true },
    { name: "VPS Pro", category: "vps", description: "Production VPS", price: "29.99", billingCycle: "monthly", diskSpace: "80 GB SSD", bandwidth: "3 TB", ram: "8 GB", cpu: "4 vCPU", featuresJson: JSON.stringify(["Root Access","KVM","Linux/Windows","DDoS Protection","Weekly Backups"]), featured: true, available: true },
    { name: "VPS Ultra", category: "vps", description: "Maximum power VPS", price: "59.99", billingCycle: "monthly", diskSpace: "200 GB NVMe", bandwidth: "10 TB", ram: "32 GB", cpu: "8 vCPU", featuresJson: JSON.stringify(["Root Access","KVM","Linux/Windows","DDoS Protection","Daily Backups","Dedicated IP"]), featured: false, available: true },
    { name: "Dedicated Standard", category: "dedicated", description: "Enterprise dedicated", price: "99.99", billingCycle: "monthly", diskSpace: "2 TB HDD", bandwidth: "10 TB", ram: "32 GB", cpu: "Intel Xeon E3", featuresJson: JSON.stringify(["Full HW Control","IPMI","DDoS Protection","24/7 Support"]), featured: false, available: true },
    { name: "Dedicated Performance", category: "dedicated", description: "Top-tier dedicated", price: "199.99", billingCycle: "monthly", diskSpace: "2x 2TB NVMe", bandwidth: "Unmetered", ram: "128 GB", cpu: "Dual Xeon E5", featuresJson: JSON.stringify(["Full HW Control","IPMI","DDoS Protection","24/7 Priority","HW RAID","Free Setup"]), featured: true, available: true },
    { name: "Game Starter", category: "game", description: "Minecraft, ARK, Valheim", price: "4.99", billingCycle: "monthly", diskSpace: "20 GB SSD", bandwidth: "500 GB", ram: "4 GB", cpu: "2 vCPU", featuresJson: JSON.stringify(["Instant Setup","One-Click Mods","DDoS Protection","Auto Backups"]), featured: false, available: true },
    { name: "Game Pro", category: "game", description: "High-performance game server", price: "12.99", billingCycle: "monthly", diskSpace: "80 GB NVMe", bandwidth: "Unlimited", ram: "16 GB", cpu: "6 vCPU", featuresJson: JSON.stringify(["Instant Setup","One-Click Mods","DDoS Protection","Auto Backups","Custom Subdomain","Priority Network"]), featured: true, available: true },
  ];

  const rows = await db.insert(productsTable).values(products as any).onConflictDoNothing().returning();
  console.log(`✅ Products: ${rows.length} inserted`);

  const cats = [
    { name: "Getting Started", description: "Learn the basics of web hosting" },
    { name: "Billing & Payments", description: "Invoices, credits, and payment methods" },
    { name: "cPanel Guide", description: "Manage your hosting account with cPanel" },
    { name: "Domains & DNS", description: "Domain registration and DNS configuration" },
    { name: "Email Setup", description: "Email clients and troubleshooting" },
    { name: "Security", description: "SSL, firewalls, and account security" },
  ];
  const catRows = await db.insert(kbCategoriesTable).values(cats as any).onConflictDoNothing().returning();
  console.log(`✅ KB Categories: ${catRows.length} inserted`);

  if (catRows.length > 0) {
    const catMap = catRows.reduce((m: any, c: any) => ({ ...m, [c.name]: c.id }), {});
    const articles = [
      { categoryId: catMap["Getting Started"], title: "Getting started with NexoraHosting", excerpt: "A complete guide to setting up your first website.", content: "Welcome to NexoraHosting! This guide walks you through account setup, uploading files, and going live.", published: "true" },
      { categoryId: catMap["Getting Started"], title: "How to access your cPanel", excerpt: "Log in and navigate your hosting control panel.", content: "cPanel is your hosting control panel. Access it at yourdomain.com/cpanel or via the client area.", published: "true" },
      { categoryId: catMap["Billing & Payments"], title: "Accepted payment methods", excerpt: "All payment options accepted by NexoraHosting.", content: "We accept Visa, Mastercard, PayPal, and crypto via CoinGate. All transactions are secured with SSL.", published: "true" },
      { categoryId: catMap["Billing & Payments"], title: "How to add account credit", excerpt: "Pre-load your account with credit for faster payments.", content: "Navigate to Billing → Credit Balance in your client area to add funds. Credits apply automatically to invoices.", published: "true" },
      { categoryId: catMap["Domains & DNS"], title: "Pointing your domain to NexoraHosting", excerpt: "Update nameservers to point your domain to our servers.", content: "Update your domain's nameservers to ns1.nexorahosting.com and ns2.nexorahosting.com. Changes propagate in 24–48 hours.", published: "true" },
      { categoryId: catMap["Security"], title: "Installing a free SSL certificate", excerpt: "Enable HTTPS on your site with a free SSL cert.", content: "All NexoraHosting plans include free Let's Encrypt SSL. Enable it from cPanel → SSL/TLS Status.", published: "true" },
    ].filter(a => a.categoryId);

    const artRows = await db.insert(kbArticlesTable).values(articles as any).onConflictDoNothing().returning();
    console.log(`✅ KB Articles: ${artRows.length} inserted`);
  }

  // Notifications
  const adminUser = await db.query.usersTable.findFirst({ where: (u, { eq }) => eq(u.email, "admin@nexorahosting.com") });
  if (adminUser) {
    await db.insert(notificationsTable).values({
      userId: adminUser.id, title: "Welcome, Admin!", message: "Your NexoraHosting admin panel is ready. Manage customers, products, and services from here.", type: "info", read: false,
    }).onConflictDoNothing();
  }
  const demoUser = await db.query.usersTable.findFirst({ where: (u, { eq }) => eq(u.email, "demo@example.com") });
  if (demoUser) {
    await db.insert(notificationsTable).values([
      { userId: demoUser.id, title: "Welcome to NexoraHosting!", message: "You have $25.00 in account credits to get started.", type: "info", read: false },
      { userId: demoUser.id, title: "Account verified", message: "Your email has been confirmed. Your account is fully active.", type: "success", read: true },
    ]).onConflictDoNothing();
  }

  console.log("🎉 Seed complete!");
  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
