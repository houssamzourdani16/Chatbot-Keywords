// app/api/admin/fields/[id]/route.js
import { NextResponse } from "next/server";
import dbConnect from "@/lib/database/database";
import Field from "@/lib/models/field";
import { verifySuperAdmin } from "@/lib/auth/admin";

// PUT - Update a field
export async function PUT(request, { params }) {
  try {
    const admin = await verifySuperAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    const { id } = await params;
    const body = await request.json();

    const field = await Field.findById(id);
    if (!field) {
      return NextResponse.json({ error: "Field not found" }, { status: 404 });
    }

    const allowed = [
      "field_name",
      "field_label",
      "field_type",
      "is_required",
      "is_visible",
      "sort_order",
      "options",
      "default_value",
    ];

    for (const key of allowed) {
      if (body[key] !== undefined) {
        field[key] = body[key];
      }
    }

    await field.save();

    return NextResponse.json({ success: true, field });
  } catch (error) {
    console.error("Admin update field error:", error);
    return NextResponse.json(
      { error: "Failed to update field" },
      { status: 500 },
    );
  }
}

// DELETE - Delete a field
export async function DELETE(request, { params }) {
  try {
    const admin = await verifySuperAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    const { id } = await params;

    const field = await Field.findByIdAndDelete(id);
    if (!field) {
      return NextResponse.json({ error: "Field not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: `Deleted field "${field.field_label}"`,
    });
  } catch (error) {
    console.error("Admin delete field error:", error);
    return NextResponse.json(
      { error: "Failed to delete field" },
      { status: 500 },
    );
  }
}
