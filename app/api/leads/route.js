// app/api/leads/route.js
import { NextResponse } from "next/server";
import dbConnect from "@/lib/database/database";
import Lead from "@/lib/models/lead";
import Product from "@/lib/models/product";
import jwt from "jsonwebtoken";

// GET - Fetch leads for the authenticated user
export async function GET(request) {
  try {
    await dbConnect();

    const token = request.headers.get("authorization")?.split(" ")[1];
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;

    const { searchParams } = new URL(request.url);
    const product_id = searchParams.get("product_id") || "";
    const status = searchParams.get("status") || "";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;

    const query = { user_id: userId };
    if (product_id) query.product_id = product_id;
    if (status) query.status = status;

    const [leads, total] = await Promise.all([
      Lead.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Lead.countDocuments(query),
    ]);

    // Enrich with product names
    const productIds = [...new Set(leads.map((l) => l.product_id))];
    const products = await Product.find({ _id: { $in: productIds } }).select(
      "name",
    );
    const productMap = {};
    products.forEach((p) => (productMap[p._id] = p.name));

    const enriched = leads.map((l) => ({
      id: l._id,
      customer_id: l.customer_id,
      product_id: l.product_id,
      product_name: productMap[l.product_id] || "Unknown",
      extracted_data: l.extracted_data,
      confidence_score: l.confidence_score,
      status: l.status,
      created_at: l.createdAt,
      updated_at: l.updatedAt,
    }));

    return NextResponse.json({
      success: true,
      leads: enriched,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Leads fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch leads" },
      { status: 500 },
    );
  }
}

// PATCH - Update a lead's status
export async function PATCH(request) {
  try {
    await dbConnect();

    const token = request.headers.get("authorization")?.split(" ")[1];
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;

    const body = await request.json();
    const { leadId, status } = body;

    if (!leadId || !status) {
      return NextResponse.json(
        { error: "leadId and status are required" },
        { status: 400 },
      );
    }

    const validStatuses = [
      "new",
      "contacted",
      "qualified",
      "converted",
      "lost",
    ];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    // Ensure the lead belongs to this user
    const lead = await Lead.findOneAndUpdate(
      { _id: leadId, user_id: userId },
      { status },
      { new: true },
    ).lean();

    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, lead });
  } catch (error) {
    console.error("Lead update error:", error);
    return NextResponse.json(
      { error: "Failed to update lead" },
      { status: 500 },
    );
  }
}
