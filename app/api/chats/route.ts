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

    // Clean up any legacy robotic system messages
    try {
      await db.collection("messages").deleteMany({
        senderEmail: { $in: ["system@foundit.campus", "system@foundit.edu"] },
      });
    } catch (e) {
      console.warn("Error cleaning up system messages:", e);
    }

    // Retrieve chats where user is either founder or claimant
    const chats = await db
      .collection("chats")
      .find({
        $or: [{ founderEmail: userEmail }, { claimantEmail: userEmail }],
      })
      .sort({ lastMessageAt: -1 })
      .toArray();

    // Enrich chats with the full report details for the side-by-side view
    const enrichedChats = await Promise.all(
      chats.map(async (chat) => {
        try {
          if (chat.reportId) {
            let reportObjId: ObjectId | null = null;
            try {
              reportObjId = new ObjectId(chat.reportId);
            } catch {
              // Ignore invalid ObjectId format
            }

            const query = reportObjId
              ? { $or: [{ _id: reportObjId }, { _id: chat.reportId }] }
              : { _id: chat.reportId };

            const report = await db.collection("reports").findOne(query);
            if (report) {
              return { ...chat, report };
            }
          }
        } catch (err) {
          console.warn("Could not fetch report for chat:", chat._id, err);
        }
        return chat;
      })
    );

    return NextResponse.json({ success: true, chats: enrichedChats });
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

    // Fetch report to attach details
    let reportDoc = null;
    try {
      let rId: ObjectId | null = null;
      try {
        rId = new ObjectId(reportId);
      } catch {}
      const q = rId ? { $or: [{ _id: rId }, { _id: reportId }] } : { _id: reportId };
      reportDoc = await db.collection("reports").findOne(q);
    } catch {}

    // Check if chat already exists for this item and claimant
    const existingChat = await db.collection("chats").findOne({
      reportId: reportId.toString(),
      claimantEmail,
    });

    if (existingChat) {
      return NextResponse.json({
        success: true,
        chat: { ...existingChat, report: reportDoc },
      });
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
      lastMessage: "Chat started",
      lastMessageAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection("chats").insertOne(newChat);

    return NextResponse.json({
      success: true,
      chat: { ...newChat, _id: result.insertedId, report: reportDoc },
    });
  } catch (error: unknown) {
    console.error("Error in POST /api/chats:", error);
    const errorMessage = error instanceof Error ? error.message : "Database error";
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
