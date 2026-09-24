import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";

export async function GET(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Chat ID is required." },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db("foundit_db");

    // Filter out robotic system messages
    const messages = await db
      .collection("messages")
      .find({
        chatId: id,
        senderEmail: { $not: /system/i },
      })
      .sort({ createdAt: 1 })
      .toArray();

    return NextResponse.json({ success: true, messages });
  } catch (error: unknown) {
    console.error("Error in GET /api/chats/[id]/messages:", error);
    const errorMessage = error instanceof Error ? error.message : "Database error";
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;
    const body = await request.json();
    const { content, senderEmail, senderName } = body;

    if (!id || !content || !senderEmail) {
      return NextResponse.json(
        { success: false, error: "id, content, and senderEmail are required." },
        { status: 400 }
      );
    }

    const trimmed = content.trim();
    if (!trimmed) {
      return NextResponse.json(
        { success: false, error: "Message content cannot be empty." },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db("foundit_db");

    // Check if chat is closed / item returned for privacy protection
    let chatObjId: ObjectId | null = null;
    try {
      chatObjId = new ObjectId(id);
    } catch {}
    const chatQuery: any = chatObjId
      ? { $or: [{ _id: chatObjId }, { _id: id }] }
      : { _id: id };
    const chat = await db.collection("chats").findOne(chatQuery);

    if (chat?.status === "RETURNED") {
      return NextResponse.json(
        {
          success: false,
          error:
            "This conversation has been closed to protect privacy because the item has been returned.",
        },
        { status: 403 }
      );
    }

    const messageDoc = {
      chatId: id,
      senderEmail,
      senderName: senderName || "User",
      content: trimmed,
      createdAt: new Date(),
    };

    const result = await db.collection("messages").insertOne(messageDoc);

    // Update the parent chat with the last message and timestamp
    try {
      await db.collection("chats").updateOne(
        { _id: new ObjectId(id) } as any,
        {
          $set: {
            lastMessage: trimmed,
            lastMessageAt: new Date(),
            updatedAt: new Date(),
          },
        }
      );
    } catch (e) {
      console.warn("Could not update chat lastMessage with ObjectId:", e);
    }

    return NextResponse.json({
      success: true,
      message: { ...messageDoc, _id: result.insertedId },
    });
  } catch (error: unknown) {
    console.error("Error in POST /api/chats/[id]/messages:", error);
    const errorMessage = error instanceof Error ? error.message : "Database error";
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
