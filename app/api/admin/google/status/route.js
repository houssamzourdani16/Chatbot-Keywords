// app/api/admin/google/status/route.js
import { NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/auth/admin";
import {
  getConnections,
  getConnection,
  disconnectGoogle,
} from "@/lib/services/google-drive.service";

// GET - Check the Google connection status (all accounts)
export async function GET(request) {
  try {
    const admin = await verifyAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const connections = await getConnections(admin._id.toString());

    if (connections.length === 0) {
      return NextResponse.json({
        success: true,
        connected: false,
        accounts: [],
      });
    }

    const accounts = connections.map((c) => ({
      id: c._id,
      email: c.email,
      name: c.name,
      picture: c.picture,
    }));

    return NextResponse.json({
      success: true,
      connected: true,
      accounts,
      // Backwards compatible: primary account
      email: accounts[0]?.email,
      name: accounts[0]?.name,
      picture: accounts[0]?.picture,
    });
  } catch (error) {
    console.error("Google status error:", error);
    return NextResponse.json(
      { error: "Failed to check connection" },
      { status: 500 },
    );
  }
}

// DELETE - Disconnect a Google account (optionally by id)
export async function DELETE(request) {
  try {
    const admin = await verifyAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const connectionId = url.searchParams.get("id") || "";

    await disconnectGoogle(admin._id.toString(), connectionId);

    return NextResponse.json({ success: true, connected: false });
  } catch (error) {
    console.error("Google disconnect error:", error);
    return NextResponse.json(
      { error: "Failed to disconnect" },
      { status: 500 },
    );
  }
}
