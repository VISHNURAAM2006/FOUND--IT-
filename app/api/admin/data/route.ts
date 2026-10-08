import { NextResponse } from "next/server";
import { isAuthenticatedAdmin } from "@/lib/admin-auth";
import clientPromise from "@/lib/mongodb";

export async function GET() {
  try {
    const isAuth = await isAuthenticatedAdmin();
    if (!isAuth) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. Admin session required." },
        { status: 401 }
      );
    }

    const client = await clientPromise;
    const db = client.db("foundit_db");

    // Fetch collections concurrently
    const [
      users,
      reports,
      handovers,
      chats,
      claims,
    ] = await Promise.all([
      db.collection("users").find({}).sort({ createdAt: -1 }).toArray(),
      db.collection("reports").find({}).sort({ createdAt: -1 }).toArray(),
      db.collection("handovers").find({}).sort({ initiatedAt: -1 }).toArray(),
      db.collection("chats").find({}).sort({ updatedAt: -1 }).toArray(),
      db.collection("claims").find({}).sort({ submittedAt: -1 }).toArray(),
    ]);

    // Compute KPI metrics
    const totalStudents = users.length;
    const totalLost = reports.filter((r) => r.type === "LOST").length;
    const totalFound = reports.filter((r) => r.type === "FOUND").length;
    const resolvedReports = reports.filter(
      (r) => r.status === "RESOLVED" || r.status === "RETURNED"
    ).length;
    const activeReports = reports.filter(
      (r) => r.status === "OPEN" || r.status === "MATCHED"
    ).length;
    const completedHandovers = handovers.filter((h) => h.status === "COMPLETED").length;
    const activeChats = chats.filter((c) => c.status !== "CLOSED").length;

    // Enhance users with activity counts
    const enhancedUsers = users.map((u) => {
      const email = u.email;
      const lostCount = reports.filter((r) => r.type === "LOST" && r.userEmail === email).length;
      const foundCount = reports.filter((r) => r.type === "FOUND" && r.userEmail === email).length;
      const chatsCount = chats.filter((c) => c.founderEmail === email || c.claimantEmail === email).length;
      return {
        _id: u._id.toString(),
        name: u.name || "Anonymous Student",
        email: u.email,
        image: u.image || null,
        emailVerified: u.emailVerified || null,
        createdAt: u.createdAt || null,
        lostCount,
        foundCount,
        chatsCount,
      };
    });

    const sanitizedReports = reports.map((r) => {
      const repId = r._id.toString();
      const completedHandover = handovers.find(
        (h) => (h.reportId === repId || String(h.reportId) === repId) && h.status === "COMPLETED"
      );
      const pendingHandover = handovers.find(
        (h) => (h.reportId === repId || String(h.reportId) === repId)
      );

      const receivedByEmail =
        r.returnedToEmail ||
        r.returnedTo ||
        r.receivedBy ||
        r.claimedBy ||
        (completedHandover ? completedHandover.claimantEmail : null) ||
        (r.status === "RESOLVED" || r.status === "RETURNED"
          ? r.returnedTo || r.claimedBy || null
          : null);

      return {
        ...r,
        _id: repId,
        receivedBy: receivedByEmail || null,
        handoverStatus: completedHandover
          ? "COMPLETED"
          : pendingHandover
          ? pendingHandover.status
          : null,
      };
    });

    const sanitizedHandovers = handovers.map((h) => ({
      ...h,
      _id: h._id.toString(),
    }));

    const sanitizedChats = chats.map((c) => ({
      ...c,
      _id: c._id.toString(),
    }));

    const sanitizedClaims = claims.map((cl) => ({
      ...cl,
      _id: cl._id.toString(),
    }));

    return NextResponse.json({
      success: true,
      stats: {
        totalStudents,
        totalLost,
        totalFound,
        totalReports: reports.length,
        activeReports,
        resolvedReports,
        completedHandovers,
        activeChats,
        totalClaims: claims.length,
      },
      users: enhancedUsers,
      reports: sanitizedReports,
      handovers: sanitizedHandovers,
      chats: sanitizedChats,
      claims: sanitizedClaims,
    });
  } catch (err: any) {
    console.error("Admin data fetch error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to load admin data." },
      { status: 500 }
    );
  }
}
