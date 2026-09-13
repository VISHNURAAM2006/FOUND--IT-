import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userEmail = searchParams.get("userEmail");

    if (!userEmail) {
      return NextResponse.json(
        { success: false, error: "userEmail is required." },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db("foundit_db");

    // Retrieve chats where user is either founder or claimant
    const chats = await db
      .collection("chats")
      .find({
        $or: [{ founderEmail: userEmail }, { claimantEmail: userEmail }],
      })
      .sort({ lastMessageAt: -1 })
      .toArray();

    return NextResponse.json({ success: true, chats });
  } catch (error: unknown) {
    console.error("Error in GET /api/chats:", error);
    const errorMessage = error instanceof Error ? error.message : "Database error";
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      reportId,
      reportTitle,
      reportCategory,
      reportImageUrl,
      founderEmail,
      founderName,
      claimantEmail,
      claimantName,
    } = body;

    if (!reportId || !founderEmail || !claimantEmail) {
      return NextResponse.json(
        { success: false, error: "reportId, founderEmail, and claimantEmail are required." },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db("foundit_db");

    // Check if chat already exists for this item and claimant
    const existingChat = await db.collection("chats").findOne({
      reportId: reportId.toString(),
      claimantEmail,
    });

    if (existingChat) {
      return NextResponse.json({ success: true, chat: existingChat });
    }

    const newChat = {
      reportId: reportId.toString(),
      reportTitle: reportTitle || "Found Item",
      reportCategory: reportCategory || "General",
      reportImageUrl: reportImageUrl || null,
      founderEmail,
      founderName: founderName || "Founder",
      claimantEmail,
      claimantName: claimantName || "Claimant",
      status: "ACTIVE",
      lastMessage: "Chat created after Cosine Similarity verification",
      lastMessageAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection("chats").insertOne(newChat);
    const chatId = result.insertedId.toString();

    // Insert welcome system notification message
    await db.collection("messages").insertOne({
      chatId,
      senderEmail: "system@foundit.campus",
      senderName: "Found!t Campus Security",
      content: `🛡️ Verified Match (>= 80% Cosine Similarity). You are now connected. Please arrange a safe handover during campus hours in public areas (e.g., Central Library, Admin Block, Student Center).`,
      createdAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      chat: { ...newChat, _id: result.insertedId },
    });
  } catch (error: unknown) {
    console.error("Error in POST /api/chats:", error);
    const errorMessage = error instanceof Error ? error.message : "Database error";
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
