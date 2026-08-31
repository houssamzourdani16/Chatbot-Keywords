// app/api/admin/analytics/route.js
import { NextResponse } from "next/server";
import dbConnect from "@/lib/database/database";
import Message from "@/lib/models/message";
import Product from "@/lib/models/product";
import User from "@/lib/models/user";
import { verifyAdmin } from "@/lib/auth/admin";

// GET - Analytics for charts
export async function GET(request) {
  try {
    const admin = await verifyAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "week"; // day | week | month

    // Determine date range
    const now = new Date();
    let start;
    if (period === "day") start = new Date(now.setDate(now.getDate() - 1));
    else if (period === "month")
      start = new Date(now.setMonth(now.getMonth() - 1));
    else start = new Date(now.setDate(now.getDate() - 7));

    // Messages over time (grouped by day)
    const messagesOverTime = await Message.aggregate([
      { $match: { created_at: { $gte: start } } },
      {
        $group: {
          _id: {
            year: { $year: "$created_at" },
            month: { $month: "$created_at" },
            day: { $dayOfMonth: "$created_at" },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } },
    ]);

    const timeSeries = messagesOverTime.map((m) => ({
      date: `${m._id.year}-${String(m._id.month).padStart(2, "0")}-${String(
        m._id.day,
      ).padStart(2, "0")}`,
      count: m.count,
    }));

    // Messages per product
    const messagesPerProduct = await Message.aggregate([
      { $group: { _id: "$product_id", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);

    const productIds = messagesPerProduct.map((m) => m._id);
    const products = await Product.find({ _id: { $in: productIds } }).select(
      "name",
    );
    const productMap = {};
    products.forEach((p) => (productMap[p._id] = p.name));

    const perProduct = messagesPerProduct.map((m) => ({
      name: productMap[m._id] || "Unknown",
      count: m.count,
    }));

    // Test vs Production
    const [testCount, prodCount] = await Promise.all([
      Message.countDocuments({ mode: "test" }),
      Message.countDocuments({ mode: "prod" }),
    ]);

    // Status breakdown
    const statusBreakdown = await Message.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);
    const statusMap = {};
    statusBreakdown.forEach((s) => (statusMap[s._id] = s.count));

    // Product growth (products created over time)
    const productGrowth = await Product.aggregate([
      { $match: { created_at: { $gte: start } } },
      {
        $group: {
          _id: {
            year: { $year: "$created_at" },
            month: { $month: "$created_at" },
            day: { $dayOfMonth: "$created_at" },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } },
    ]);

    const productGrowthSeries = productGrowth.map((m) => ({
      date: `${m._id.year}-${String(m._id.month).padStart(2, "0")}-${String(
        m._id.day,
      ).padStart(2, "0")}`,
      count: m.count,
    }));

    // User growth
    const userGrowth = await User.aggregate([
      { $match: { createdAt: { $gte: start } } },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
            day: { $dayOfMonth: "$createdAt" },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } },
    ]);

    const userGrowthSeries = userGrowth.map((m) => ({
      date: `${m._id.year}-${String(m._id.month).padStart(2, "0")}-${String(
        m._id.day,
      ).padStart(2, "0")}`,
      count: m.count,
    }));

    return NextResponse.json({
      success: true,
      analytics: {
        timeSeries,
        perProduct,
        testCount,
        prodCount,
        statusMap,
        productGrowth: productGrowthSeries,
        userGrowth: userGrowthSeries,
      },
    });
  } catch (error) {
    console.error("Admin analytics error:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 },
    );
  }
}
