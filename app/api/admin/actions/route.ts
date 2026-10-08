import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { isAuthenticatedAdmin } from "@/lib/admin-auth";
import clientPromise from "@/lib/mongodb";

export async function POST(request: Request) {
  try {
    const isAuth = await isAuthenticatedAdmin();
    if (!isAuth) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. Admin session required." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { action, reportId, chatId, status } = body;

    const client = await clientPromise;
    const db = client.db("foundit_db");

    if (action === "update_report_status") {
      if (!reportId || !status) {
        return NextResponse.json(
          { success: false, error: "reportId and status are required." },
          { status: 400 }
        );
      }

      const res = await db.collection("reports").updateOne(
        { _id: new ObjectId(reportId) },
        { $set: { status, updatedAt: new Date() } }
      );

      if (res.matchedCount === 0) {
        return NextResponse.json({ success: false, error: "Report not found." }, { status: 404 });
      }

      return NextResponse.json({
        success: true,
        message: `Report status updated to ${status}.`,
      });
    }

    if (action === "delete_report") {
      if (!reportId) {
        return NextResponse.json({ success: false, error: "reportId is required." }, { status: 400 });
      }

      const res = await db.collection("reports").deleteOne({ _id: new ObjectId(reportId) });
      if (res.deletedCount === 0) {
        return NextResponse.json({ success: false, error: "Report not found." }, { status: 404 });
      }

      // Also clean up any associated claims
      await db.collection("claims").deleteMany({ reportId });

      return NextResponse.json({
        success: true,
        message: "Report deleted successfully.",
      });
    }

    if (action === "close_chat") {
      if (!chatId) {
        return NextResponse.json({ success: false, error: "chatId is required." }, { status: 400 });
      }

      const res = await db.collection("chats").updateOne(
        { _id: new ObjectId(chatId) },
        { $set: { status: "CLOSED", updatedAt: new Date() } }
      );

      if (res.matchedCount === 0) {
        return NextResponse.json({ success: false, error: "Chat not found." }, { status: 404 });
      }

      return NextResponse.json({
        success: true,
        message: "Chat arbitration closed by admin.",
      });
    }

    return NextResponse.json({ success: false, error: "Invalid action." }, { status: 400 });
  } catch (err: any) {
    console.error("Admin action error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to execute admin action." },
      { status: 500 }
    );
  }
}
