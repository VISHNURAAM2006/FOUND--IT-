import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      title,
      category,
      brand,
      model,
      color,
      location,
      lostDate,
      foundDate,
      description,
      contactPhone,
      hiddenQuestion,
      hiddenAnswer,
      imageUrl,
      visualFeatures,
      type, // "LOST" or "FOUND"
      userEmail,
      userName,
    } = body;

    // Validation
    if (!title || !category || !type) {
      return NextResponse.json(
        { success: false, error: "Title, category, and report type are required." },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db("foundit_db");

    const reportDoc = {
      title: title.trim(),
      category: category.trim(),
      type: type === "LOST" ? "LOST" : "FOUND",
      brand: brand?.trim() || "",
      model: model?.trim() || "",
      color: color?.trim() || "",
      location: location?.trim() || "",
      lostDate: lostDate || null,
      foundDate: foundDate || null,
      description: description?.trim() || "",
      contactPhone: contactPhone?.trim() || "",
      hiddenQuestion: hiddenQuestion?.trim() || "",
      hiddenAnswer: hiddenAnswer?.trim() || "",
      imageUrl: imageUrl || null,
      visualFeatures: visualFeatures || null,
      userEmail: userEmail || "anonymous",
      userName: userName || "Anonymous User",
      status: "OPEN", // "OPEN", "MATCHED", "RESOLVED"
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection("reports").insertOne(reportDoc);

    // If a LOST complaint was filed, immediately compute AI recommendations from existing FOUND items
    let recommendations: any[] = [];
    if (type === "LOST") {
      try {
        const foundItems = await db
          .collection("reports")
          .find({ type: "FOUND", status: { $ne: "RETURNED" } })
          .toArray();

        const lostObj = {
          _id: result.insertedId,
          ...reportDoc,
        };

        const { rankMatchingFoundReports } = await import("@/lib/ai-matcher");
        const ranked = rankMatchingFoundReports(lostObj, foundItems as any[], 0.35);

        // Sanitize sensitive hidden answer before returning to claimant
        recommendations = ranked.map((match) => {
          const sanitizedReport = { ...match.report };
          delete sanitizedReport.hiddenAnswer;
          // Protect image / full description if secret question is present
          if (sanitizedReport.hiddenQuestion && sanitizedReport.userEmail !== userEmail) {
            sanitizedReport.isLocked = true;
          }
          return {
            ...match,
            report: sanitizedReport,
          };
        });
      } catch (recErr) {
        console.error("Error computing instant recommendations:", recErr);
      }
    }

    return NextResponse.json({
      success: true,
      id: result.insertedId.toString(),
      recommendations,
      message: `${type === "LOST" ? "Lost item complaint" : "Found item report"} submitted successfully!`,
    });
  } catch (error: unknown) {
    console.error("Error saving report to MongoDB:", error);
    const errorMessage = error instanceof Error ? error.message : "Database error";
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id"); // specific report lookup
    const type = searchParams.get("type"); // "LOST" | "FOUND" | null
    const userEmail = searchParams.get("userEmail"); // filter by owner email
    const viewerEmail = searchParams.get("viewerEmail") || userEmail; // who is viewing
    const checkHasLost = searchParams.get("checkHasLost"); // "1" to check if user has active LOST reports

    const client = await clientPromise;
    const db = client.db("foundit_db");

    // Special mode: check active lost cases count (activeCases >= 1)
    if (checkHasLost === "1" && viewerEmail) {
      const activeLostCount = await db.collection("reports").countDocuments({
        type: "LOST",
        userEmail: viewerEmail,
        status: { $nin: ["RETURNED", "RESOLVED"] },
      });
      return NextResponse.json({
        success: true,
        hasLostReport: activeLostCount >= 1,
        activeLostCount,
      });
    }

    // SERVER-SIDE INVENTORY ACCESS GATE:
    // If querying public found inventory (type is FOUND and not the user's own reports),
    // user MUST have active lost complaints >= 1
    if (type?.toUpperCase() === "FOUND" && !userEmail && viewerEmail) {
      const activeLostCount = await db.collection("reports").countDocuments({
        type: "LOST",
        userEmail: viewerEmail,
        status: { $nin: ["RETURNED", "RESOLVED"] },
      });

      if (activeLostCount < 1) {
        return NextResponse.json({
          success: true,
          restricted: true,
          activeLostCount: 0,
          reports: [],
          message:
            "Access restricted: You must have at least 1 active lost item complaint to view the Found Inventory.",
        });
      }
    }

    const filter: Record<string, unknown> = {};
    if (id) {
      try {
        filter._id = new ObjectId(id);
      } catch {
        filter._id = id;
      }
    }
    if (type) filter.type = type.toUpperCase();
    if (userEmail) filter.userEmail = userEmail;

    // Returned items must NOT appear in the public inventory;
    // they are only visible in the user's personal complaints/reports (userEmail provided) or by direct ID
    if (!userEmail && !id) {
      filter.status = { $ne: "RETURNED" };
    }

    const rawReports = await db
      .collection("reports")
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(50)
      .toArray();

    // Check which found reports have already been verified/unlocked by viewerEmail
    let unlockedReportIds = new Set<string>();
    if (viewerEmail) {
      const claims = await db
        .collection("claims")
        .find({ claimantEmail: viewerEmail, passed: true })
        .toArray();
      unlockedReportIds = new Set(claims.map((c) => c.reportId.toString()));
    }

    // Mask sensitive details (hiddenAnswer) for found items unless viewer is the owner
    const reports = rawReports.map((report) => {
      const isOwner = viewerEmail && report.userEmail === viewerEmail;
      const isUnlocked = unlockedReportIds.has(report._id.toString());

      const sanitized = { ...report };

      // Never send hiddenAnswer to non-owners
      if (!isOwner) {
        delete sanitized.hiddenAnswer;
      }

      // If it's a found report, not owned by viewer, and not yet unlocked:
      // mark it as locked and flag it for verification
      if (report.type === "FOUND" && !isOwner && !isUnlocked) {
        sanitized.isLocked = true;
      } else if (report.type === "FOUND") {
        sanitized.isLocked = false;
        sanitized.isUnlocked = true;
      }

      return sanitized;
    });

    return NextResponse.json({
      success: true,
      reports,
    });
  } catch (error: unknown) {
    console.error("Error fetching reports from MongoDB:", error);
    const errorMessage = error instanceof Error ? error.message : "Database error";
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const userEmail = searchParams.get("userEmail");

    if (!id || !userEmail) {
      return NextResponse.json(
        { success: false, error: "Report ID and user email are required." },
        { status: 400 }
      );
    }

    let objectId: ObjectId;
    try {
      objectId = new ObjectId(id);
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid report ID format." },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db("foundit_db");

    // Only allow the report owner to delete their own report
    const result = await db.collection("reports").deleteOne({
      _id: objectId,
      userEmail: userEmail,
    });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Report not found or you are not authorized to delete it.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Report deleted successfully.",
    });
  } catch (error: unknown) {
    console.error("Error deleting report from MongoDB:", error);
    const errorMessage = error instanceof Error ? error.message : "Database error";
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}