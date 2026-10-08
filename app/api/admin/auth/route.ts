import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  getExpectedAdminCredentials,
  createAdminToken,
  isAuthenticatedAdmin,
  ADMIN_COOKIE_NAME,
} from "@/lib/admin-auth";

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: "Username and password are required." },
        { status: 400 }
      );
    }

    const expected = getExpectedAdminCredentials();

    if (username.trim() !== expected.username || password !== expected.password) {
      return NextResponse.json(
        { success: false, error: "Invalid admin username or password." },
        { status: 401 }
      );
    }

    const token = createAdminToken(username.trim());
    const cookieStore = await cookies();

    cookieStore.set({
      name: ADMIN_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 24 * 60 * 60, // 24 hours
    });

    return NextResponse.json({
      success: true,
      message: "Admin authenticated successfully.",
      username: expected.username,
    });
  } catch (err: any) {
    console.error("Admin login error:", err);
    return NextResponse.json(
      { success: false, error: "Internal server error during login." },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const authenticated = await isAuthenticatedAdmin();
    return NextResponse.json({
      success: true,
      authenticated,
    });
  } catch (err) {
    return NextResponse.json({ success: true, authenticated: false });
  }
}

export async function DELETE() {
  try {
    const cookieStore = await cookies();
    cookieStore.delete(ADMIN_COOKIE_NAME);
    return NextResponse.json({
      success: true,
      message: "Admin logged out successfully.",
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: "Error logging out." },
      { status: 500 }
    );
  }
}
