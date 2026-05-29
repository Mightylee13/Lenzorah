/**
 * server.js  — Lenzorah Maintenance API
 * Place this file in the ROOT of your project (same level as package.json)
 *
 * Endpoints:
 *   GET  /api/maintenance        → returns current maintenance state (public)
 *   POST /api/maintenance/set    → updates state (protected by ADMIN_PIN)
 */

import express from "express";
import { MongoClient } from "mongodb";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());

// ─── CORS — allow your frontend to call this server ──────────────────────────
app.use((req, res, next) => {
  const allowed = process.env.FRONTEND_URL || "*";
  res.setHeader("Access-Control-Allow-Origin", allowed);
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-admin-pin");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

// ─── MongoDB connection ───────────────────────────────────────────────────────
const MONGODB_URI = process.env.MONGODB_URI;
const ADMIN_PIN = process.env.ADMIN_PIN || "190409";
const PORT = process.env.PORT || 4000;

if (!MONGODB_URI) {
  console.error(
    "❌  MONGODB_URI is not set. Add it to your .env or Render environment.",
  );
  process.exit(1);
}

let db;

async function connectDB() {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  db = client.db("lenzorah");
  console.log("✅  Connected to MongoDB");

  // Make sure the settings document exists on first run
  const settings = db.collection("settings");
  const existing = await settings.findOne({ key: "maintenance" });
  if (!existing) {
    await settings.insertOne({
      key: "maintenance",
      value: false,
      message:
        "We are performing scheduled core upgrades. Lenzorah will be back online shortly!",
      updatedAt: new Date(),
    });
    console.log("✅  Created default maintenance document in MongoDB");
  }
}

// ─── GET /api/maintenance ─────────────────────────────────────────────────────
// Called by every browser tab every 30 seconds. No auth needed.
app.get("/api/maintenance", async (req, res) => {
  try {
    const doc = await db.collection("settings").findOne({ key: "maintenance" });
    res.json({
      maintenance: doc?.value ?? false,
      message: doc?.message ?? "",
      pageLocks: doc?.pageLocks ?? [],
      updatedAt: doc?.updatedAt ?? null,
    });
  } catch (err) {
    console.error("GET /api/maintenance error:", err);
    // Fail open — if DB is down, don't block the site
    res.json({ maintenance: false, message: "", updatedAt: null });
  }
});

// ─── POST /api/maintenance/set ────────────────────────────────────────────────
// Called only from Daratech admin panel. Protected by ADMIN_PIN header.
app.post("/api/maintenance/set", async (req, res) => {
  const pin = req.headers["x-admin-pin"];
  if (pin !== ADMIN_PIN) {
    return res.status(401).json({ error: "Invalid admin PIN" });
  }

  const { maintenance, message, pageLocks } = req.body;

  if (typeof maintenance !== "boolean") {
    return res.status(400).json({ error: "maintenance must be a boolean" });
  }

  try {
    await db.collection("settings").updateOne(
      { key: "maintenance" },
      {
        $set: {
          value: maintenance,
          message: message || "",
          pageLocks: pageLocks || [],
          updatedAt: new Date(),
        },
      },
      { upsert: true },
    );

    console.log(
      `🔧 Maintenance set to: ${maintenance}, page locks: ${pageLocks?.length || 0}`,
    );
    res.json({ success: true, maintenance, message, pageLocks });
  } catch (err) {
    console.error("POST /api/maintenance/set error:", err);
    res.status(500).json({ error: "Database error" });
  }
});

// ─── Active users (heartbeat) ────────────────────────────────────────────────
// Frontend pings this every 30s to signal user is online
const activeUsers = new Map(); // sessionId → lastSeen timestamp

app.post("/api/analytics/heartbeat", (req, res) => {
  const { sessionId } = req.body;
  if (sessionId) {
    activeUsers.set(sessionId, Date.now());
    // Clean up sessions older than 90 seconds
    const cutoff = Date.now() - 90_000;
    for (const [id, ts] of activeUsers.entries()) {
      if (ts < cutoff) activeUsers.delete(id);
    }
  }
  res.json({ ok: true, activeCount: activeUsers.size });
});

app.get("/api/analytics/active", (req, res) => {
  const pin = req.headers["x-admin-pin"];
  if (pin !== ADMIN_PIN) return res.status(401).json({ error: "Unauthorized" });
  const cutoff = Date.now() - 90_000;
  for (const [id, ts] of activeUsers.entries()) {
    if (ts < cutoff) activeUsers.delete(id);
  }
  res.json({ activeCount: activeUsers.size });
});

// ─── Health check ─────────────────────────────────────────────────────────────
app.get("/health", (req, res) => res.json({ status: "ok" }));

// ─── Keep-alive ping (prevents Render free tier sleep) ───────────────────────
// Pings itself every 14 minutes so the server never spins down
function startKeepAlive() {
  const selfUrl = process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`;
  setInterval(
    async () => {
      try {
        await fetch(`${selfUrl}/health`);
        console.log("🟢 Keep-alive ping sent");
      } catch {
        console.log("⚠️  Keep-alive ping failed (server may be starting)");
      }
    },
    14 * 60 * 1000,
  ); // every 14 minutes
}

// ─── Start ────────────────────────────────────────────────────────────────────
connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`🚀  Maintenance API running on port ${PORT}`);
      startKeepAlive();
    });
  })
  .catch((err) => {
    console.error("❌  Failed to connect to MongoDB:", err);
    process.exit(1);
  });

// ═══════════════════════════════════════════════════════════════
// ANALYTICS ENDPOINTS
// ═══════════════════════════════════════════════════════════════

// ─── POST /api/analytics/pageview ────────────────────────────────────────────
app.post("/api/analytics/pageview", async (req, res) => {
  try {
    const { path, title, referrer, sessionId } = req.body;

    // Deduplicate: one count per sessionId per path per day
    if (sessionId) {
      const today = new Date().toISOString().split("T")[0];
      const existing = await db.collection("analytics_pageviews").findOne({
        sessionId,
        path: path || "/",
        day: today,
      });
      if (existing) return res.json({ ok: true, skipped: true });
    }

    const today = new Date().toISOString().split("T")[0];
    await db.collection("analytics_pageviews").insertOne({
      path: path || "/",
      title: title || "",
      referrer: referrer || "",
      sessionId: sessionId || null,
      day: today,
      timestamp: new Date(),
    });
    res.json({ ok: true });
  } catch {
    res.json({ ok: false });
  }
});

// ─── POST /api/analytics/event ───────────────────────────────────────────────
app.post("/api/analytics/event", async (req, res) => {
  try {
    const { type, subjectId, title, sessionId } = req.body;
    await db.collection("analytics_events").insertOne({
      type: type || "unknown",
      subjectId: subjectId || null,
      title: title || "",
      sessionId: sessionId || null,
      timestamp: new Date(),
    });
    res.json({ ok: true });
  } catch {
    res.json({ ok: false });
  }
});

// ─── GET /api/analytics/summary ──────────────────────────────────────────────
// Protected by x-admin-pin header
app.get("/api/analytics/summary", async (req, res) => {
  const pin = req.headers["x-admin-pin"];
  if (pin !== ADMIN_PIN) return res.status(401).json({ error: "Unauthorized" });

  try {
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - 7);
    const startOfMonth = new Date(now);
    startOfMonth.setDate(now.getDate() - 30);
    const twoWeeksAgo = new Date(now);
    twoWeeksAgo.setDate(now.getDate() - 14);

    const [
      totalViews,
      viewsToday,
      viewsWeek,
      viewsMonth,
      topPages,
      topMovies,
      eventCounts,
      recentActivity,
      dailyViews,
    ] = await Promise.all([
      // Totals
      db.collection("analytics_pageviews").countDocuments(),
      db
        .collection("analytics_pageviews")
        .countDocuments({ timestamp: { $gte: startOfDay } }),
      db
        .collection("analytics_pageviews")
        .countDocuments({ timestamp: { $gte: startOfWeek } }),
      db
        .collection("analytics_pageviews")
        .countDocuments({ timestamp: { $gte: startOfMonth } }),

      // Top pages
      db
        .collection("analytics_pageviews")
        .aggregate([
          {
            $group: {
              _id: "$path",
              count: { $sum: 1 },
              title: { $last: "$title" },
            },
          },
          { $sort: { count: -1 } },
          { $limit: 8 },
        ])
        .toArray(),

      // Top movies (play events)
      db
        .collection("analytics_events")
        .aggregate([
          { $match: { type: "play" } },
          {
            $group: {
              _id: "$subjectId",
              title: { $last: "$title" },
              views: { $sum: 1 },
              lastWatched: { $max: "$timestamp" },
            },
          },
          { $sort: { views: -1 } },
          { $limit: 10 },
          {
            $project: { subjectId: "$_id", title: 1, views: 1, lastWatched: 1 },
          },
        ])
        .toArray(),

      // Event breakdown counts
      db
        .collection("analytics_events")
        .aggregate([
          { $group: { _id: "$type", count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ])
        .toArray(),

      // Recent activity (last 20 events)
      db
        .collection("analytics_events")
        .find(
          {},
          {
            sort: { timestamp: -1 },
            limit: 20,
            projection: { type: 1, title: 1, timestamp: 1 },
          },
        )
        .toArray(),

      // Daily views (last 14 days)
      db
        .collection("analytics_pageviews")
        .aggregate([
          { $match: { timestamp: { $gte: twoWeeksAgo } } },
          {
            $group: {
              _id: {
                $dateToString: { format: "%Y-%m-%d", date: "$timestamp" },
              },
              count: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
        ])
        .toArray(),
    ]);

    // Count unique session IDs (unique devices)
    const uniqueVisitors = await db
      .collection("analytics_pageviews")
      .distinct("sessionId");

    res.json({
      totals: {
        totalViews,
        viewsToday,
        viewsWeek,
        viewsMonth,
        uniqueVisitors: uniqueVisitors.filter(Boolean).length,
      },
      topPages,
      topMovies,
      eventCounts,
      recentActivity,
      dailyViews,
    });
  } catch (err) {
    console.error("Analytics summary error:", err);
    res.status(500).json({ error: "Failed to fetch analytics" });
  }
});
