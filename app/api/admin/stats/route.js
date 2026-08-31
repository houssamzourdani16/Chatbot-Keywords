// app/api/admin/stats/route.js
import { NextResponse } from "next/server";
import dbConnect from "@/lib/database/database";
import User from "@/lib/models/user";
import Product from "@/lib/models/product";
import Message from "@/lib/models/message";
import WebhookModel from "@/lib/models/webhook-model";
import { verifyAdmin } from "@/lib/auth/admin";

export async function GET(request) {
  try {
    const admin = await verifyAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const [totalUsers, totalMessages, totalProducts, totalWebhooks] =
      await Promise.all([
        User.countDocuments(),
        Message.countDocuments(),
        Product.countDocuments(),
        WebhookModel.countDocuments(),
      ]);

    // Users with stats
    const users = await User.find({})
      .select("-password -refreshToken")
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    const usersWithStats = await Promise.all(
      users.map(async (u) => {
        const [productsCount, messagesCount] = await Promise.all([
          Product.countDocuments({ user_id: u._id }),
          Message.countDocuments({ user_id: u._id }),
        ]);

        let webhookModel = null;
        if (u.webhook_model_id) {
          const wh = await WebhookModel.findById(u.webhook_model_id).select(
            "name",
          );
          webhookModel = wh?.name || null;
        }

        return {
          id: u._id,
          name: u.name,
          email: u.email,
          role: u.role,
          productsCount,
          messagesCount,
          webhookModel,
          joinedDate: u.createdAt,
        };
      }),
    );

    // Webhooks with user counts
    const webhooks = await WebhookModel.find({}).sort({ createdAt: -1 }).lean();
    const webhooksWithCounts = await Promise.all(
      webhooks.map(async (w) => {
        const usersUsing = await User.countDocuments({
          webhook_model_id: w._id,
        });
        return {
          id: w._id,
          name: w.name,
          webhook_url: w.webhook_url,
          description: w.description,
          is_active: w.is_active,
          usersUsing,
        };
      }),
    );

    return NextResponse.json({
      success: true,
      stats: {
        totalUsers,
        totalMessages,
        totalProducts,
        totalWebhooks,
        users: usersWithStats,
        webhooks: webhooksWithCounts,
      },
    });
  } catch (error) {
    console.error("Admin stats error:", error);
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 },
    );
  }
}
