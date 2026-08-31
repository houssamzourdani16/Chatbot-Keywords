// app/api/products/analytics/route.js
import { NextResponse } from "next/server";
import dbConnect from "@/lib/database/database";
import Product from "@/lib/models/product";
import Message from "@/lib/models/message";
import jwt from "jsonwebtoken";

// GET - Message analytics for the user's products by time period
export async function GET(request) {
  try {
    await dbConnect();

    const token = request.headers.get("authorization")?.split(" ")[1];
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "week"; // day | week | month
    const productId = searchParams.get("productId") || "";

    // Get user's products
    const productQuery = { user_id: decoded.userId };
    const products = await Product.find(productQuery).select("_id name");
    const productIds = products.map((p) => p._id);

    if (productIds.length === 0) {
      return NextResponse.json({
        success: true,
        products: [],
        total: 0,
        period,
      });
    }

    // Build message query
    const messageQuery = { product_id: { $in: productIds } };
    if (productId) {
      messageQuery.product_id = productId;
    }

    // Calculate date range based on period
    const now = new Date();
    let startDate;
    if (period === "day") {
      startDate = new Date(now);
      startDate.setHours(0, 0, 0, 0);
    } else if (period === "week") {
      startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 7);
    } else if (period === "month") {
      startDate = new Date(now);
      startDate.setMonth(startDate.getMonth() - 1);
    } else {
      startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 7);
    }
    messageQuery.created_at = { $gte: startDate };

    // Get messages in range
    const messages = await Message.find(messageQuery)
      .select("product_id mode status created_at")
      .sort({ created_at: 1 })
      .lean();

    // Count per product
    const productStats = products.map((p) => {
      const pMessages = messages.filter(
        (m) => m.product_id.toString() === p._id.toString(),
      );
      return {
        id: p._id,
        name: p.name,
        count: pMessages.length,
        test: pMessages.filter((m) => m.mode === "test").length,
        prod: pMessages.filter((m) => m.mode === "prod").length,
        completed: pMessages.filter((m) => m.status === "completed").length,
        failed: pMessages.filter((m) => m.status === "failed").length,
      };
    });

    // Build time series (for chart)
    const timeSeries = buildTimeSeries(messages, period, startDate, now);

    // ============================================
    // ✅ ENHANCED ANALYTICS
    // ============================================
    // Success rate
    const completed = messages.filter((m) => m.status === "completed").length;
    const failed = messages.filter((m) => m.status === "failed").length;
    const successRate =
      messages.length > 0
        ? Math.round(((messages.length - failed) / messages.length) * 100)
        : 100;

    // Avg response time (simulated from waiting_time since we don't store it)
    // We estimate based on product waiting_time
    const avgResponseTime = products.length
      ? (
          products.reduce((sum, p) => sum + (p.waiting_time || 5), 0) /
          products.length
        ).toFixed(1)
      : "0";

    // Recent webhook calls (last 10 messages)
    const recentCalls = messages
      .slice(-10)
      .reverse()
      .map((m) => {
        const prod = products.find(
          (p) => p._id.toString() === m.product_id.toString(),
        );
        return {
          id: m._id,
          product_name: prod?.name || "Unknown",
          sender_id: m.sender_id,
          message: m.raw_data?.message || m.raw_data?.text || "Message",
          status: m.status,
          mode: m.mode,
          created_at: m.created_at,
        };
      });

    return NextResponse.json({
      success: true,
      products: productStats,
      total: messages.length,
      period,
      timeSeries,
      startDate,
      endDate: now,
      // ✅ Enhanced data
      successRate,
      failed,
      completed,
      avgResponseTime,
      recentCalls,
    });
  } catch (error) {
    console.error("Analytics error:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 },
    );
  }
}

// Build time series data for charting
function buildTimeSeries(messages, period, startDate, endDate) {
  const series = [];

  if (period === "day") {
    // Hourly buckets
    for (let h = 0; h < 24; h++) {
      const hourStart = new Date(startDate);
      hourStart.setHours(h, 0, 0, 0);
      const hourEnd = new Date(hourStart);
      hourEnd.setHours(h + 1, 0, 0, 0);
      const count = messages.filter(
        (m) => m.created_at >= hourStart && m.created_at < hourEnd,
      ).length;
      series.push({ label: `${h}:00`, count });
    }
  } else if (period === "week") {
    // Daily buckets (last 7 days)
    for (let d = 6; d >= 0; d--) {
      const dayStart = new Date(endDate);
      dayStart.setDate(dayStart.getDate() - d);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);
      const count = messages.filter(
        (m) => m.created_at >= dayStart && m.created_at < dayEnd,
      ).length;
      series.push({
        label: dayStart.toLocaleDateString("en-US", { weekday: "short" }),
        count,
      });
    }
  } else if (period === "month") {
    // Weekly buckets (last 4 weeks)
    for (let w = 3; w >= 0; w--) {
      const weekStart = new Date(endDate);
      weekStart.setDate(weekStart.getDate() - w * 7);
      weekStart.setHours(0, 0, 0, 0);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);
      const count = messages.filter(
        (m) => m.created_at >= weekStart && m.created_at < weekEnd,
      ).length;
      series.push({ label: `Week ${4 - w}`, count });
    }
  }

  return series;
}
