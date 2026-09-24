import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";
import { sendHandoverOtpEmail } from "@/lib/email";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const chatId = searchParams.get("chatId");
    const reportId = searchParams.get("reportId");
    const userEmail = searchParams.get("userEmail");

    if (!chatId && !reportId) {
      return NextResponse.json(
        { success: false, error: "chatId or reportId is required." },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db("foundit_db");

    const query: Record<string, unknown> = {};
    if (chatId) query.chatId = chatId;
    if (reportId) query.reportId = reportId;

    // Find latest handover for this chat/report
    const handover = await db
      .collection("handovers")
      .find(query)
      .sort({ initiatedAt: -1 })
      .limit(1)
      .next();

    if (!handover) {
      return NextResponse.json({
        success: true,
        handoverStatus: "NONE",
      });
    }

    const now = new Date();
    const isExpired = handover.expiresAt && new Date(handover.expiresAt) < now;

    // If pending but expired, mark as EXPIRED
    if (handover.status === "PENDING" && isExpired) {
      await db
        .collection("handovers")
        .updateOne({ _id: handover._id }, { $set: { status: "EXPIRED" } });
      handover.status = "EXPIRED";
    }

    const isClaimant = userEmail === handover.claimantEmail;
    const isFounder = userEmail === handover.founderEmail;

    // Sanitize response based on user role
    const responseData: Record<string, unknown> = {
      success: true,
      handoverStatus: handover.status,
      handoverId: handover._id.toString(),
      reportId: handover.reportId,
      chatId: handover.chatId,
      founderEmail: handover.founderEmail,
      founderName: handover.founderName,
      claimantEmail: handover.claimantEmail,
      claimantName: handover.claimantName,
      initiatedAt: handover.initiatedAt,
      expiresAt: handover.expiresAt,
    };

    // The Claimant gets to see their OTP if status is PENDING
    if (isClaimant && handover.status === "PENDING") {
      responseData.otp = handover.otp;
    }

    // If completed, include the official handover audit log
    if (handover.status === "COMPLETED") {
      responseData.completedAt = handover.completedAt;
      responseData.logMessage = handover.logMessage;
      responseData.handoverLog = {
        logMessage: handover.logMessage,
        returnedBy: `${handover.founderName} (${handover.founderEmail})`,
        returnedTo: `${handover.claimantName} (${handover.claimantEmail})`,
        productTitle: handover.productTitle,
        returnedAt: handover.completedAt,
      };
    }

    return NextResponse.json(responseData);
  } catch (error: unknown) {
    console.error("Error in GET /api/handover:", error);
    const errorMessage = error instanceof Error ? error.message : "Database error";
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, chatId, reportId, founderEmail, enteredOtp } = body;

    if (!action || !chatId || !reportId || !founderEmail) {
      return NextResponse.json(
        { success: false, error: "action, chatId, reportId, and founderEmail are required." },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db("foundit_db");

    // Fetch chat
    let chatObjId: ObjectId | null = null;
    try {
      chatObjId = new ObjectId(chatId);
    } catch {}
    const chatQuery: any = chatObjId ? { $or: [{ _id: chatObjId }, { _id: chatId }] } : { _id: chatId };
    const chat = await db.collection("chats").findOne(chatQuery);

    if (!chat) {
      return NextResponse.json({ success: false, error: "Chat not found." }, { status: 404 });
    }

    // Verify requesting user is the founder
    if (chat.founderEmail !== founderEmail) {
      return NextResponse.json(
        { success: false, error: "Only the item founder can manage the handover process." },
        { status: 403 }
      );
    }

    // Fetch report details
    let repObjId: ObjectId | null = null;
    try {
      repObjId = new ObjectId(reportId);
    } catch {}
    const repQuery: any = repObjId ? { $or: [{ _id: repObjId }, { _id: reportId }] } : { _id: reportId };
    const report = await db.collection("reports").findOne(repQuery);

    if (!report) {
      return NextResponse.json({ success: false, error: "Report not found." }, { status: 404 });
    }

    // ────────────────────────────────────────────────────────────────────────
    // ACTION 1: INITIATE HANDOVER -> Generate 24-Hour OTP for Loser
    // ────────────────────────────────────────────────────────────────────────
    if (action === "INITIATE") {
      // Generate 6-digit numeric OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      // Valid for 24 hours
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const initiatedAt = new Date();

      const handoverRecord = {
        chatId: chatId.toString(),
        reportId: reportId.toString(),
        productTitle: report.title,
        productCategory: report.category,
        brand: report.brand || "",
        model: report.model || "",
        color: report.color || "",
        founderEmail: chat.founderEmail,
        founderName: chat.founderName,
        claimantEmail: chat.claimantEmail,
        claimantName: chat.claimantName,
        otp,
        expiresAt,
        initiatedAt,
        status: "PENDING",
      };

      // Save handover in DB
      await db.collection("handovers").insertOne(handoverRecord);

      // Update report status to HANDOVER_PENDING
      await db.collection("reports").updateOne(
        repQuery,
        {
          $set: {
            status: "HANDOVER_PENDING",
            handoverInitiatedAt: initiatedAt,
          },
        }
      );

      // Update chat status
      await db.collection("chats").updateOne(
        chatQuery,
        {
          $set: {
            handoverStatus: "PENDING",
            lastMessage: "Handover initiated - OTP generated for claimant",
            lastMessageAt: initiatedAt,
          },
        }
      );

      // Send OTP to claimant's registered email
      try {
        await sendHandoverOtpEmail({
          toEmail: chat.claimantEmail,
          claimantName: chat.claimantName,
          founderName: chat.founderName,
          productTitle: report.title,
          otp,
          expiresAt,
        });
      } catch (mailErr) {
        console.error("Failed to send handover OTP email:", mailErr);
      }

      // Insert message in chat thread
      await db.collection("messages").insertOne({
        chatId: chatId.toString(),
        senderEmail: "system@foundit.campus",
        senderName: "Handover Protocol",
        content: `📦 Handover process initiated by ${chat.founderName}. A secure 24-hour verification OTP has been sent to ${chat.claimantEmail}. Please meet in person to verify and complete the return.`,
        createdAt: initiatedAt,
      });

      return NextResponse.json({
        success: true,
        message: `Handover initiated successfully. 24-hour OTP sent to ${chat.claimantEmail}.`,
        sentToEmail: chat.claimantEmail,
        expiresAt,
      });
    }

    // ────────────────────────────────────────────────────────────────────────
    // ACTION 2: VERIFY OTP -> Founder validates and returns product
    // ────────────────────────────────────────────────────────────────────────
    if (action === "VERIFY") {
      if (!enteredOtp) {
        return NextResponse.json(
          { success: false, error: "Please enter the 6-digit OTP provided by the claimant." },
          { status: 400 }
        );
      }

      // Find active pending handover
      const handover = await db
        .collection("handovers")
        .find({ chatId: chatId.toString(), reportId: reportId.toString(), status: "PENDING" })
        .sort({ initiatedAt: -1 })
        .limit(1)
        .next();

      if (!handover) {
        return NextResponse.json(
          { success: false, error: "No pending handover found. Please initiate a handover first." },
          { status: 404 }
        );
      }

      // Check expiry (24 hours)
      const now = new Date();
      if (new Date(handover.expiresAt) < now) {
        await db
          .collection("handovers")
          .updateOne({ _id: handover._id }, { $set: { status: "EXPIRED" } });
        return NextResponse.json(
          { success: false, error: "This OTP has expired (24-hour limit). Please initiate a new handover." },
          { status: 400 }
        );
      }

      // Verify OTP
      if (enteredOtp.trim() !== handover.otp) {
        return NextResponse.json(
          { success: false, error: "Invalid OTP. Please check the 6-digit code shown on the claimant's screen." },
          { status: 400 }
        );
      }

      // ── OTP IS VALID! Complete Handover ──
      const completedAt = new Date();
      const logMessage = `${chat.founderName} returned ${report.title} to ${chat.claimantName}`;

      // 1. Update handover record
      await db.collection("handovers").updateOne(
        { _id: handover._id },
        {
          $set: {
            status: "COMPLETED",
            completedAt,
            logMessage,
          },
        }
      );

      // 2. Update report status to RETURNED and save audit log
      await db.collection("reports").updateOne(
        repQuery,
        {
          $set: {
            status: "RETURNED",
            returnedAt: completedAt,
            returnedBy: chat.founderName,
            returnedByEmail: chat.founderEmail,
            returnedTo: chat.claimantName,
            returnedToEmail: chat.claimantEmail,
            handoverLogMessage: logMessage,
          },
        }
      );

      // 3. Update chat status
      await db.collection("chats").updateOne(
        chatQuery,
        {
          $set: {
            status: "RETURNED",
            handoverStatus: "COMPLETED",
            lastMessage: `✅ Item returned to ${chat.claimantName}`,
            lastMessageAt: completedAt,
          },
        }
      );

      // 4. Insert handover completion notice in chat
      await db.collection("messages").insertOne({
        chatId: chatId.toString(),
        senderEmail: "system@foundit.campus",
        senderName: "Handover Protocol",
        content: `🎉 Handover Confirmed! ${chat.founderName} officially returned '${report.title}' to ${chat.claimantName}. Item is now marked as RETURNED.`,
        createdAt: completedAt,
      });

      return NextResponse.json({
        success: true,
        message: "OTP validated successfully! Product officially marked as RETURNED.",
        handoverLog: {
          logMessage,
          returnedBy: `${chat.founderName} (${chat.founderEmail})`,
          returnedTo: `${chat.claimantName} (${chat.claimantEmail})`,
          productTitle: report.title,
          returnedAt: completedAt,
          status: "RETURNED",
        },
      });
    }

    return NextResponse.json(
      { success: false, error: "Invalid action. Supported actions: 'INITIATE' and 'VERIFY'." },
      { status: 400 }
    );
  } catch (error: unknown) {
    console.error("Error in POST /api/handover:", error);
    const errorMessage = error instanceof Error ? error.message : "Database error";
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
