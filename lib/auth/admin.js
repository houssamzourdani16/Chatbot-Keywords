// lib/auth/admin.js
import "server-only";
import dbConnect from "@/lib/database/database";
import User from "@/lib/models/user";
import jwt from "jsonwebtoken";

/**
 * Verify that the request is from an authenticated ADMIN user.
 * Returns the admin user object, or null if not authorized.
 */
export async function verifyAdmin(request) {
  try {
    await dbConnect();

    const authHeader = request.headers.get("authorization");
    const token = authHeader?.split(" ")[1];

    if (!token) return null;

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.userId).select(
      "-password -refreshToken",
    );

    if (!user || (user.role !== "admin" && user.role !== "super_admin"))
      return null;

    return user;
  } catch (error) {
    return null;
  }
}

/**
 * Verify that the request is from an authenticated SUPER ADMIN user.
 * Returns the super admin user object, or null if not authorized.
 */
export async function verifySuperAdmin(request) {
  try {
    await dbConnect();

    const authHeader = request.headers.get("authorization");
    const token = authHeader?.split(" ")[1];

    if (!token) return null;

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.userId).select(
      "-password -refreshToken",
    );

    if (!user || user.role !== "super_admin") return null;

    return user;
  } catch (error) {
    return null;
  }
}
