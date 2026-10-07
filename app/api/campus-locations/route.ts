import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { CAMPUS_LOCATIONS, parseKml, getLocationsGroupedByCategory } from "@/lib/campus-locations";

export async function GET() {
  try {
    const kmlPath = path.join(process.cwd(), "public", "campus.kml");
    let locations = CAMPUS_LOCATIONS;

    if (fs.existsSync(kmlPath)) {
      const kmlContent = fs.readFileSync(kmlPath, "utf-8");
      const parsed = parseKml(kmlContent);
      if (parsed.length > 0) {
        locations = parsed;
      }
    }

    const grouped = getLocationsGroupedByCategory(locations);

    return NextResponse.json({
      success: true,
      campus: "Mepco Schlenk Engineering College",
      totalMarkers: locations.length,
      locations,
      grouped,
    });
  } catch (error) {
    console.error("Error reading campus.kml:", error);
    return NextResponse.json({
      success: true,
      campus: "Mepco Schlenk Engineering College",
      totalMarkers: CAMPUS_LOCATIONS.length,
      locations: CAMPUS_LOCATIONS,
      grouped: getLocationsGroupedByCategory(CAMPUS_LOCATIONS),
    });
  }
}
