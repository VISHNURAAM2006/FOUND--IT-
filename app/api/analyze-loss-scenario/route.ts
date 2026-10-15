import { NextResponse } from "next/server";
import { CAMPUS_LOCATIONS, COLLEGE_CAMPUS_SPATIAL_GRAPH, CampusDepartmentInfo } from "@/lib/campus-locations";

interface LossScenario {
  hotspot: string;
  probability: number; // 0 to 100
  mechanism: string;
  recommendedAction: string;
}

interface TrajectoryAnalysis {
  scenarios: LossScenario[];
  summary: string;
  itemRiskFactor: "High Risk of Slipping" | "High Risk of Leaving Behind" | "Misplacement Risk";
  immediateActionPlan: string[];
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, category, location, description } = body;

    if (!title || !location) {
      return NextResponse.json(
        { success: false, error: "Title and location are required." },
        { status: 400 }
      );
    }

    const locNorm = (location || "").toLowerCase().trim();
    const descLower = (description || "").toLowerCase();
    const titleLower = (title || "").toLowerCase();

    // 1. Check if location matches a specific department or building in College Campus Spatial Graph
    const deptMatch: CampusDepartmentInfo | undefined = COLLEGE_CAMPUS_SPATIAL_GRAPH.find(
      (dept) =>
        dept.aliases.some((alias) => locNorm.includes(alias) || alias.includes(locNorm)) ||
        dept.name.toLowerCase().includes(locNorm) ||
        dept.labs.some((l) => locNorm.includes(l.toLowerCase()) || l.toLowerCase().includes(locNorm))
    );

    const matchedKml = CAMPUS_LOCATIONS.find(
      (loc) => loc.name.toLowerCase().includes(locNorm) || locNorm.includes(loc.name.toLowerCase())
    );

    // 2. Classify item form factor
    const isSmallElectronic =
      titleLower.includes("airpod") ||
      titleLower.includes("earphone") ||
      titleLower.includes("bud") ||
      titleLower.includes("watch") ||
      titleLower.includes("pen drive") ||
      titleLower.includes("usb") ||
      titleLower.includes("phone") ||
      titleLower.includes("mobile") ||
      titleLower.includes("key");

    const isCardOrWallet =
      titleLower.includes("id card") ||
      titleLower.includes("wallet") ||
      titleLower.includes("card") ||
      titleLower.includes("money") ||
      titleLower.includes("purse") ||
      titleLower.includes("license");

    const isBulky =
      titleLower.includes("bag") ||
      titleLower.includes("backpack") ||
      titleLower.includes("laptop") ||
      titleLower.includes("bottle") ||
      titleLower.includes("book") ||
      titleLower.includes("calculator");

    // 3. Generate Campus-Grounded Loss Trajectory Scenarios
    const scenarios: LossScenario[] = [];

    if (deptMatch) {
      // Pick top relevant laboratory / room from the matched department
      const primaryLab = deptMatch.labs[0] || `${deptMatch.blockName} Main Hall`;
      const secondaryLab = deptMatch.labs[1] || `${deptMatch.blockName} Corridor`;

      // Build adjacent transit hotspots from spatial adjacency graph
      const adjacentPaths: string[] = [];
      if (deptMatch.leftSide) adjacentPaths.push(`Left walkway connecting to ${deptMatch.leftSide}`);
      if (deptMatch.rightSide) adjacentPaths.push(`Right corridor heading to ${deptMatch.rightSide}`);
      if (deptMatch.opposite) adjacentPaths.push(`Front pathway towards ${deptMatch.opposite}`);
      if (deptMatch.backSide) adjacentPaths.push(`Rear path leading to ${deptMatch.backSide}`);

      const transitHotspot = adjacentPaths[0] || `${deptMatch.blockName} Pedestrian Walkway`;

      if (isSmallElectronic) {
        scenarios.push({
          hotspot: `${deptMatch.name} - ${primaryLab} (Bench/Chair Seam)`,
          probability: 50,
          mechanism: `Small items like "${title}" easily slip out of pockets while adjusting posture or packing belongings in ${primaryLab}.`,
          recommendedAction: `Inspect the floor edges and cushion crevices beneath the desks in ${primaryLab}.`,
        });

        scenarios.push({
          hotspot: `${transitHotspot}`,
          probability: 30,
          mechanism: `Dropped during fast transit while walking past adjacent departments (${deptMatch.leftSide || deptMatch.rightSide || "connecting blocks"}).`,
          recommendedAction: `Trace the walkway between ${deptMatch.blockName} and ${deptMatch.leftSide || deptMatch.rightSide || "the main pathway"}.`,
        });

        scenarios.push({
          hotspot: `${deptMatch.name} - Restroom / Charging Outlet Station`,
          probability: 20,
          mechanism: `Placed on a ledge while washing hands or plugging in a charger and left behind.`,
          recommendedAction: `Check the department restroom counters and wall socket benches nearest ${secondaryLab}.`,
        });
      } else if (isCardOrWallet) {
        scenarios.push({
          hotspot: `${deptMatch.name} - Attendance/Lab Desk in ${primaryLab}`,
          probability: 50,
          mechanism: `Pulled out for ID verification, attendance entry, or registration and set down on the laboratory counter.`,
          recommendedAction: `Ask the lab assistant or staff in charge of ${primaryLab} if your ${title} was turned in.`,
        });

        scenarios.push({
          hotspot: `Student Amenities Centre / Canteen Foyer (TMB ATM Counter)`,
          probability: 30,
          mechanism: `Set down during payment, canteen food token purchase, or ATM withdrawal.`,
          recommendedAction: `Check the Canteen counter and TMB ATM office security desk.`,
        });

        scenarios.push({
          hotspot: `${deptMatch.name} - Ground Floor Notice Board / Bench Area`,
          probability: 20,
          mechanism: `Slid out of back pocket while resting on ground-floor waiting benches.`,
          recommendedAction: `Inspect the benches near the ground-floor entrance of ${deptMatch.blockName}.`,
        });
      } else {
        scenarios.push({
          hotspot: `${deptMatch.name} - ${primaryLab} (Workstation Table)`,
          probability: 55,
          mechanism: `Left resting on the table/workbench when packing up in a rush for the next lecture or bus.`,
          recommendedAction: `Check with the lab-in-charge or peon in ${primaryLab} before the room is locked.`,
        });

        scenarios.push({
          hotspot: `${deptMatch.name} - ${secondaryLab} / Seminar Hall`,
          probability: 25,
          mechanism: `Placed on side seating or charging dock during class or team discussion.`,
          recommendedAction: `Inspect power-strip tables and side racks in ${secondaryLab}.`,
        });

        scenarios.push({
          hotspot: `${transitHotspot}`,
          probability: 20,
          mechanism: `Left resting on pathway seating or bus waiting shelters while heading towards campus transport.`,
          recommendedAction: `Inquire with the Security Staff at MCC Entry Gate or the College Bus Stand.`,
        });
      }
    } else {
      // General Campus Location Fallback
      if (isSmallElectronic) {
        scenarios.push({
          hotspot: `${location} - Chair Seam or Desk Gap`,
          probability: 50,
          mechanism: `Compact items like "${title}" commonly slip out of loose hoodie or track pants pockets when shifting posture.`,
          recommendedAction: `Inspect the gap between chair seat cushions and floor edges beneath where you sat in ${location}.`,
        });
        scenarios.push({
          hotspot: `Pedestrian Pathway outside ${location}`,
          probability: 30,
          mechanism: `Fell during transit while walking briskly or pulling items from pocket.`,
          recommendedAction: `Retrace your footsteps along the main walkway connecting ${location} to adjacent blocks.`,
        });
        scenarios.push({
          hotspot: `${location} - Restroom / Wash Basin Counter`,
          probability: 20,
          mechanism: `Placed on the sink ledge while washing hands and forgotten.`,
          recommendedAction: `Check the restroom counters nearest to your area in ${location}.`,
        });
      } else if (isCardOrWallet) {
        scenarios.push({
          hotspot: `${location} - Scan / Counter Area`,
          probability: 55,
          mechanism: `Pulled out for ID verification or payment and set down temporarily.`,
          recommendedAction: `Ask the reception desk, store counter, or library counter staff if anyone turned in a ${title}.`,
        });
        scenarios.push({
          hotspot: `${location} - Seating Bench / Desk Corner`,
          probability: 30,
          mechanism: `Slipped out of rear pocket when sitting down or packing notes into bag.`,
          recommendedAction: `Check beneath the desks and corners of the room in ${location}.`,
        });
        scenarios.push({
          hotspot: `Central Campus Main Walkway`,
          probability: 15,
          mechanism: `Dropped unnoticed while moving between buildings.`,
          recommendedAction: `Inquire at the MCC Security Gate or Security Control Room.`,
        });
      } else {
        scenarios.push({
          hotspot: `${location} - Table / Desk Surface`,
          probability: 60,
          mechanism: `Left resting on the table when packing up books/laptop in a rush.`,
          recommendedAction: `Visit the room supervisor, lab assistant, or department peon in ${location}.`,
        });
        scenarios.push({
          hotspot: `${location} - Charging Point Area`,
          probability: 25,
          mechanism: `Plugged in near a wall socket or corner charging hub and left behind.`,
          recommendedAction: `Inspect wall outlets and switchboard benches in ${location}.`,
        });
        scenarios.push({
          hotspot: `College Bus Stand / Transit Stop`,
          probability: 15,
          mechanism: `Placed on the bench while waiting for college transport and forgotten.`,
          recommendedAction: `Check with the College Bus Stand coordinators or drivers.`,
        });
      }
    }

    const deptContext = deptMatch
      ? `Spatial Analysis for ${deptMatch.name}: Adjacencies mapped (Opposite: ${deptMatch.opposite || "N/A"}, Left: ${deptMatch.leftSide || "N/A"}, Right: ${deptMatch.rightSide || "N/A"}). Specific laboratories and transit corridors evaluated.`
      : `Campus trajectory mapped across ${location}.`;

    const analysis: TrajectoryAnalysis = {
      scenarios,
      summary: `AI analyzed the physical attributes of '${title}' and spatial campus layout of '${location}'. ${deptContext}`,
      itemRiskFactor: isSmallElectronic
        ? "High Risk of Slipping"
        : isBulky
        ? "High Risk of Leaving Behind"
        : "Misplacement Risk",
      immediateActionPlan: [
        `1. Re-check the exact laboratory / desk you occupied in ${deptMatch?.name || location}.`,
        `2. Check with the Department Attendant or Lab Assistant in charge of the block.`,
        `3. Inquire at Canteen Student Amenities Centre / TMB ATM Office if you visited during break.`,
        `4. Check MCC Entry Gate Security Office or the Found!t Campus Inventory for real-time matches.`,
      ],
    };

    return NextResponse.json({
      success: true,
      analysis,
      departmentInfo: deptMatch || null,
      locationDetails: matchedKml || null,
    });
  } catch (error: any) {
    console.error("Error analyzing loss scenario:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to analyze loss scenario" },
      { status: 500 }
    );
  }
}

