import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";
import { computeAnswerSimilarity } from "@/lib/cosine-similarity";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { reportId, userAnswer, userEmail, userName } = body;

    if (!reportId || !userAnswer || !userEmail) {
      return NextResponse.json(
        { success: false, error: "Report ID, user answer, and user email are required." },
        { status: 400 }
      );
    }

    let objectId: ObjectId;
    try {
      objectId = new ObjectId(reportId);
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid report ID format." },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db("foundit_db");

    // 1. Verify user has filed at least one lost report
    const hasLost = await db
      .collection("reports")
      .findOne({ type: "LOST", userEmail });

    if (!hasLost) {
      return NextResponse.json(
        {
          success: false,
          error: "Access Denied: You must file at least one Lost Item Complaint before you can verify or claim found items.",
        },
        { status: 403 }
      );
    }

    // 2. Retrieve found report
    const report = await db.collection("reports").findOne({ _id: objectId });
    if (!report) {
      return NextResponse.json(
        { success: false, error: "Found report not found." },
        { status: 404 }
      );
    }

    // 3. Evaluate answer using ML Cosine Similarity
    const targetAnswer = report.hiddenAnswer || "";
    const similarity = computeAnswerSimilarity(userAnswer, targetAnswer);

    // 4. Log claim attempt in MongoDB claims collection
    await db.collection("claims").insertOne({
      reportId: report._id.toString(),
      reportTitle: report.title,
      claimantEmail: userEmail,
      claimantName: userName || "Student",
      userAnswer,
      similarityScore: similarity.score,
      similarityPercentage: similarity.percentage,
      passed: similarity.passed,
      createdAt: new Date(),
    });

    if (!similarity.passed) {
      return NextResponse.json({
        success: false,
        score: similarity.score,
        percentage: similarity.percentage,
        passed: false,
        message: `Cosine Similarity Match: ${similarity.percentage}%. Accuracy must be at least 80% to unlock details. Please try again with more specific details.`,
      });
    }

    // If passed (>= 80%), return unlocked report details and founder details
    return NextResponse.json({
      success: true,
      score: similarity.score,
      percentage: similarity.percentage,
      passed: true,
      message: `Verification Passed! Cosine Similarity Match: ${similarity.percentage}% (>= 80% required). Full product details unlocked!`,
      report: {
        ...report,
        isLocked: false,
        isUnlocked: true,
      },
      founderEmail: report.userEmail,
      founderName: report.userName,
    });
  } catch (error: unknown) {
    console.error("Error in /api/reports/verify:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
