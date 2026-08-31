// app/api/admin/webhooks/route.js
import { NextResponse } from "next/server";
import dbConnect from "@/lib/database/database";
import WebhookModel from "@/lib/models/webhook-model";
import User from "@/lib/models/user";
import { verifyAdmin } from "@/lib/auth/admin";

// GET - List all webhook models with user counts
export async function GET(request) {
  try {
    const admin = await verifyAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const webhooks = await WebhookModel.find({}).sort({ createdAt: -1 }).lean();

    // Count users using each webhook
    const enriched = await Promise.all(
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
          users_count: usersUsing,
          created_at: w.createdAt,
        };
      }),
    );

    return NextResponse.json({ success: true, webhooks: enriched });
  } catch (error) {
    console.error("Admin webhooks error:", error);
    return NextResponse.json(
      { error: "Failed to fetch webhooks" },
      { status: 500 },
    );
  }
}

// POST - Create a webhook model
export async function POST(request) {
  try {
    const admin = await verifyAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    const body = await request.json();

    if (!body.name || !body.webhook_url) {
      return NextResponse.json(
        { error: "Name and webhook URL are required" },
        { status: 400 },
      );
    }

    const webhook = await WebhookModel.create({
      name: body.name,
      webhook_url: body.webhook_url,
      description: body.description || "",
      is_active: body.is_active !== undefined ? body.is_active : true,
    });

    return NextResponse.json({ success: true, webhook }, { status: 201 });
  } catch (error) {
    console.error("Admin create webhook error:", error);
    if (error.code === 11000) {
      return NextResponse.json(
        { error: "A webhook with this name already exists" },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: "Failed to create webhook" },
      { status: 500 },
    );
  }
}
