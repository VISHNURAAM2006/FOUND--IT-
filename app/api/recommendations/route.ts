import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";
import { rankMatchingFoundReports, ReportLike } from "@/lib/ai-matcher";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const lostReportId = searchParams.get("lostReportId");
    const userEmail = searchParams.get("userEmail");

    if (!lostReportId) {
      return NextResponse.json(
        { success: false, error: "lostReportId query parameter is required." },
        { status: 400 }
      );
    }

    let objectId: ObjectId;
    try {
      objectId = new ObjectId(lostReportId);
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid lostReportId format." },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db("foundit_db");

    // Retrieve the target lost report
    const lostReport = await db.collection("reports").findOne({ _id: objectId });
    if (!lostReport) {
      return NextResponse.json(
        { success: false, error: "Lost report not found." },
        { status: 404 }
      );
    }

    // Retrieve all active found items
    const foundReports = await db
      .collection("reports")
      .find({ type: "FOUND", status: { $ne: "RETURNED" } })
      .toArray();

    const ranked = rankMatchingFoundReports(
      lostReport as ReportLike,
      foundReports as ReportLike[],
      0.30
    );

    // Sanitize sensitive answer
    const sanitized = ranked.map((match) => {
      const sanitizedReport = { ...match.report };
      delete sanitizedReport.hiddenAnswer;
      if (sanitizedReport.hiddenQuestion && sanitizedReport.userEmail !== userEmail) {
        sanitizedReport.isLocked = true;
      }
      return {
        ...match,
        report: sanitizedReport,
      };
    });

    return NextResponse.json({
      success: true,
      lostReportTitle: lostReport.title,
      matches: sanitized,
    });
  } catch (error: unknown) {
    console.error("Error in GET /api/recommendations:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

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
      description,
      imageUrl,
      visualFeatures,
      userEmail,
    } = body;

    const lostObj: ReportLike = {
      title: title || "",
      category: category || "",
      brand: brand || "",
      model: model || "",
      color: color || "",
      location: location || "",
      description: description || "",
      imageUrl: imageUrl || null,
      visualFeatures: visualFeatures || null,
    };

    const client = await clientPromise;
    const db = client.db("foundit_db");

    const foundReports = await db
      .collection("reports")
      .find({ type: "FOUND", status: { $ne: "RETURNED" } })
      .toArray();

    const ranked = rankMatchingFoundReports(
      lostObj,
      foundReports as ReportLike[],
      0.30
    );

    const sanitized = ranked.map((match) => {
      const sanitizedReport = { ...match.report };
      delete sanitizedReport.hiddenAnswer;
      if (sanitizedReport.hiddenQuestion && sanitizedReport.userEmail !== userEmail) {
        sanitizedReport.isLocked = true;
      }
      return {
        ...match,
        report: sanitizedReport,
      };
    });

    return NextResponse.json({
      success: true,
      matches: sanitized,
    });
  } catch (error: unknown) {
    console.error("Error in POST /api/recommendations:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
