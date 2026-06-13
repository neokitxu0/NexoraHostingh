import { Router } from "express";
import { db, productsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { logger } from "../lib/logger";

const router = Router();

// GET /api/public/plans
router.get("/plans", async (req, res) => {
  try {
    const { type } = req.query;
    let products;
    if (type) {
      products = await db.select().from(productsTable)
        .where(and(eq(productsTable.available, true), eq(productsTable.category, type as string)));
    } else {
      products = await db.select().from(productsTable).where(eq(productsTable.available, true));
    }
    res.json(products.map(p => ({
      ...p,
      price: parseFloat(p.price),
      setupFee: parseFloat(p.setupFee ?? "0"),
      features: JSON.parse(p.featuresJson ?? "[]"),
    })));
  } catch (err) {
    logger.error({ err }, "Public plans error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/public/reviews
router.get("/reviews", async (req, res) => {
  res.json([
    { id: 1, author: "Alex Thompson", avatarUrl: null, rating: 5, content: "NexoraHosting has been incredible. Our site went from 3s load times down to 0.4s. The support team is always available and genuinely helpful.", service: "VPS Hosting", country: "United States", createdAt: new Date().toISOString() },
    { id: 2, author: "Priya Sharma", avatarUrl: null, rating: 5, content: "Migrated from another provider and the process was seamless. Uptime has been flawless for 8 months now. Highly recommended!", service: "Shared Hosting", country: "India", createdAt: new Date().toISOString() },
    { id: 3, author: "Carlos Mendoza", avatarUrl: null, rating: 5, content: "The Minecraft hosting is amazing. My server of 50 players runs perfectly with zero lag. Setup took 2 minutes.", service: "Minecraft Hosting", country: "Mexico", createdAt: new Date().toISOString() },
    { id: 4, author: "Sophie Laurent", avatarUrl: null, rating: 5, content: "Best hosting dashboard I've ever used. Clean, intuitive, and everything I need is right where I expect it.", service: "Web Hosting", country: "France", createdAt: new Date().toISOString() },
    { id: 5, author: "James Wilson", avatarUrl: null, rating: 5, content: "Their Discord bot hosting is a game changer. My bot has been online 24/7 for months without a single interruption.", service: "Discord Bot Hosting", country: "United Kingdom", createdAt: new Date().toISOString() },
    { id: 6, author: "Yuki Tanaka", avatarUrl: null, rating: 4, content: "Excellent value for the price. The dedicated server I rented is fast and reliable. Customer service responds within minutes.", service: "Dedicated Servers", country: "Japan", createdAt: new Date().toISOString() },
  ]);
});

// GET /api/public/status
router.get("/status", async (req, res) => {
  res.json({
    overall: "operational",
    services: [
      { name: "Web Hosting", status: "operational", uptimePercent: 99.99, responseTime: 42 },
      { name: "VPS Network", status: "operational", uptimePercent: 99.97, responseTime: 18 },
      { name: "Dedicated Servers", status: "operational", uptimePercent: 99.99, responseTime: 12 },
      { name: "DNS Resolution", status: "operational", uptimePercent: 100, responseTime: 8 },
      { name: "Control Panel", status: "operational", uptimePercent: 99.95, responseTime: 65 },
      { name: "Billing System", status: "operational", uptimePercent: 99.98, responseTime: 55 },
      { name: "Game Servers", status: "operational", uptimePercent: 99.92, responseTime: 22 },
      { name: "API Gateway", status: "operational", uptimePercent: 99.99, responseTime: 15 },
    ],
    lastChecked: new Date().toISOString(),
  });
});

export default router;
