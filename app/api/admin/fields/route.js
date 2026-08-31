// app/api/admin/fields/route.js
import { NextResponse } from "next/server";
import dbConnect from "@/lib/database/database";
import Field from "@/lib/models/field";
import { verifySuperAdmin } from "@/lib/auth/admin";

// GET - List all field configurations
export async function GET(request) {
  try {
    const admin = await verifySuperAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    const fields = await Field.find({}).sort({ sort_order: 1 }).lean();

    return NextResponse.json({ success: true, fields });
  } catch (error) {
    console.error("Admin fields error:", error);
    return NextResponse.json(
      { error: "Failed to fetch fields" },
      { status: 500 },
    );
  }
}

// POST - Create a new field
export async function POST(request) {
  try {
    const admin = await verifySuperAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    if (!body.field_name || !body.field_label) {
      return NextResponse.json(
        { error: "field_name and field_label are required" },
        { status: 400 },
      );
    }

    await dbConnect();

    // Get max sort_order for new field
    const lastField = await Field.findOne().sort({ sort_order: -1 });
    const sortOrder = lastField ? lastField.sort_order + 1 : 0;

    const field = await Field.create({
      field_name: body.field_name,
      field_label: body.field_label,
      field_type: body.field_type || "text",
      is_required: body.is_required || false,
      is_visible: body.is_visible !== false,
      sort_order: sortOrder,
      options: body.options || [],
      default_value: body.default_value || "",
    });

    return NextResponse.json({ success: true, field }, { status: 201 });
  } catch (error) {
    if (error.code === 11000) {
      return NextResponse.json(
        { error: "Field name already exists" },
        { status: 400 },
      );
    }
    console.error("Admin create field error:", error);
    return NextResponse.json(
      { error: "Failed to create field" },
      { status: 500 },
    );
  }
}
