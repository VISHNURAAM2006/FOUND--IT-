import { NextResponse } from "next/server";
import clientPromise from "../../../../lib/mongodb";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const client = await clientPromise;
    const db = client.db("foundit_db");

    const newReport = await db.collection("reports").insertOne({
      ...body,
      createdAt: new Date(),
      status: "OPEN", // OPEN, MATCHED, or RETURNED
    });

    return NextResponse.json({ success: true, id: newReport.insertedId });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Database error" }, { status: 500 });
  }
}