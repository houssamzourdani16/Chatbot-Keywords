// app/api/admin/users/route.js
import { NextResponse } from "next/server";
import dbConnect from "@/lib/database/database";
import User from "@/lib/models/user";
import Product from "@/lib/models/product";
import Message from "@/lib/models/message";
import Batch from "@/lib/models/batch";
import WebhookModel from "@/lib/models/webhook-model";
import { verifyAdmin } from "@/lib/auth/admin";

// GET - List all users
export async function GET(request) {
  try {
    const admin = await verifyAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const search = searchParams.get("search") || "";
    const plan = searchParams.get("plan") || "";
    const status = searchParams.get("status") || "";
    const skip = (page - 1) * limit;

    const query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }
    if (plan) query.plan = plan;
    if (status === "active") query.blacklisted = false;
    if (status === "inactive") query.blacklisted = true;

    const [users, total] = await Promise.all([
      User.find(query)
        .select("-password -refreshToken")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(query),
    ]);

    // Count products & messages per user
    const usersWithCounts = await Promise.all(
      users.map(async (u) => {
        const [productCount, messageCount] = await Promise.all([
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
          plan: u.plan || "Basic",
          blacklisted: u.blacklisted,
          createdAt: u.createdAt,
          productCount,
          messageCount,
          webhookModel,
        };
      }),
    );

    return NextResponse.json({
      success: true,
      users: usersWithCounts,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Admin users error:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 },
    );
  }
}

// PATCH - Blacklist / unblacklist a user
export async function PATCH(request) {
  try {
    const admin = await verifyAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { userId, blacklisted, plan, role } = body;

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 },
      );
    }

    // Prevent blacklisting yourself
    if (blacklisted !== undefined && userId === admin._id.toString()) {
      return NextResponse.json(
        { error: "You cannot blacklist yourself" },
        { status: 400 },
      );
    }

    await dbConnect();

    const update = {};
    if (blacklisted !== undefined) update.blacklisted = !!blacklisted;
    if (plan) update.plan = plan;
    if (role) update.role = role;

    const user = await User.findByIdAndUpdate(userId, update, {
      new: true,
    }).select("-password -refreshToken");

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, user });
  } catch (error) {
    console.error("Admin blacklist error:", error);
    return NextResponse.json(
      { error: "Failed to update user" },
      { status: 500 },
    );
  }
}

// DELETE - Delete a user and all their data
export async function DELETE(request) {
  try {
    const admin = await verifyAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 },
      );
    }

    // Prevent deleting yourself
    if (userId === admin._id.toString()) {
      return NextResponse.json(
        { error: "You cannot delete yourself" },
        { status: 400 },
      );
    }

    await dbConnect();

    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Delete all related data
    const productIds = await Product.find({ user_id: userId }).select("_id");
    const ids = productIds.map((p) => p._id);

    await Promise.all([
      Message.deleteMany({ user_id: userId }),
      Batch.deleteMany({ user_id: userId }),
      Product.deleteMany({ user_id: userId }),
      User.findByIdAndDelete(userId),
    ]);

    return NextResponse.json({
      success: true,
      message: `Deleted user and ${ids.length} products`,
    });
  } catch (error) {
    console.error("Admin delete user error:", error);
    return NextResponse.json(
      { error: "Failed to delete user" },
      { status: 500 },
    );
  }
}
