// app/api/webhooks/route.js
import { NextResponse } from "next/server";
import dbConnect from "@/lib/database/database";
import WebhookModel from "@/lib/models/webhook-model";
import jwt from "jsonwebtoken";

// GET - Fetch all active webhook models for authenticated users
export async function GET(request) {
  try {
    await dbConnect();

    const token = request.headers.get("authorization")?.split(" ")[1];
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify the token is valid
    jwt.verify(token, process.env.JWT_SECRET);

    // Only return ACTIVE webhooks
    const webhooks = await WebhookModel.find({ is_active: true })
      .sort({ createdAt: -1 })
      .lean();

    const enriched = webhooks.map((w) => ({
      id: w._id,
      name: w.name,
      webhook_url: w.webhook_url,
      description: w.description,
    }));

    return NextResponse.json({ success: true, webhooks: enriched });
  } catch (error) {
    console.error("Fetch webhooks error:", error);
    return NextResponse.json(
      { error: "Failed to fetch webhooks" },
      { status: 500 },
    );
  }
}
