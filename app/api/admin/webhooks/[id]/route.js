// app/api/admin/webhooks/[id]/route.js
import { NextResponse } from "next/server";
import dbConnect from "@/lib/database/database";
import WebhookModel from "@/lib/models/webhook-model";
import User from "@/lib/models/user";
import { verifyAdmin } from "@/lib/auth/admin";

// GET - Single webhook
export async function GET(request, { params }) {
  try {
    const admin = await verifyAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    const { id } = await params;
    const webhook = await WebhookModel.findById(id).lean();
    if (!webhook) {
      return NextResponse.json({ error: "Webhook not found" }, { status: 404 });
    }

    const usersUsing = await User.countDocuments({ webhook_model_id: id });

    return NextResponse.json({
      success: true,
      webhook: { ...webhook, users_count: usersUsing },
    });
  } catch (error) {
    console.error("Admin webhook detail error:", error);
    return NextResponse.json(
      { error: "Failed to fetch webhook" },
      { status: 500 },
    );
  }
}

// PUT - Update webhook
export async function PUT(request, { params }) {
  try {
    const admin = await verifyAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    const { id } = await params;
    const body = await request.json();

    const webhook = await WebhookModel.findById(id);
    if (!webhook) {
      return NextResponse.json({ error: "Webhook not found" }, { status: 404 });
    }

    const allowed = ["name", "webhook_url", "description", "is_active"];
    for (const key of allowed) {
      if (body[key] !== undefined) webhook[key] = body[key];
    }

    await webhook.save();
    return NextResponse.json({ success: true, webhook });
  } catch (error) {
    console.error("Admin update webhook error:", error);
    return NextResponse.json(
      { error: "Failed to update webhook" },
      { status: 500 },
    );
  }
}

// DELETE - Delete webhook
export async function DELETE(request, { params }) {
  try {
    const admin = await verifyAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    const { id } = await params;

    // Check if any users use this webhook
    const usersUsing = await User.countDocuments({ webhook_model_id: id });
    if (usersUsing > 0) {
      return NextResponse.json(
        { error: `Cannot delete: ${usersUsing} users are using this webhook` },
        { status: 400 },
      );
    }

    const webhook = await WebhookModel.findByIdAndDelete(id);
    if (!webhook) {
      return NextResponse.json({ error: "Webhook not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: "Webhook deleted",
    });
  } catch (error) {
    console.error("Admin delete webhook error:", error);
    return NextResponse.json(
      { error: "Failed to delete webhook" },
      { status: 500 },
    );
  }
}