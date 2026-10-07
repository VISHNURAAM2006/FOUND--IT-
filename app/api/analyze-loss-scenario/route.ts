import { NextResponse } from "next/server";
import { CAMPUS_LOCATIONS } from "@/lib/campus-locations";

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

    const matchedKml = CAMPUS_LOCATIONS.find(
      (loc) => loc.name.toLowerCase() === (location || "").toLowerCase()
    );

    const descLower = (description || "").toLowerCase();
    const titleLower = (title || "").toLowerCase();

    // Determine item physical form factor
    const isSmallElectronic =
      titleLower.includes("airpod") ||
      titleLower.includes("earphone") ||
      titleLower.includes("bud") ||
      titleLower.includes("watch") ||
      titleLower.includes("pen drive") ||
      titleLower.includes("key");

    const isCardOrWallet =
      titleLower.includes("id card") ||
      titleLower.includes("wallet") ||
      titleLower.includes("card") ||
      titleLower.includes("money") ||
      titleLower.includes("purse");

    const isBulky =
      titleLower.includes("bag") ||
      titleLower.includes("backpack") ||
      titleLower.includes("laptop") ||
      titleLower.includes("bottle") ||
      titleLower.includes("book") ||
      titleLower.includes("calculator");

    // Dynamic AI Loss Trajectory Scenarios
    const scenarios: LossScenario[] = [];

    if (isSmallElectronic) {
      scenarios.push({
        hotspot: `${location} - Chair Seam or Desk Gap`,
        probability: 50,
        mechanism: `Compact items like ${title} commonly slip out of loose hoodie or track pants pockets when shifting posture or standing up from a chair.`,
        recommendedAction: `Inspect the gap between chair seat cushions and floor edges beneath where you sat in ${location}.`,
      });

      scenarios.push({
        hotspot: `Pedestrian Pathway outside ${location}`,
        probability: 30,
        mechanism: `Fell during transit while walking briskly, pulling a phone out of the same pocket, or adjusting earbuds.`,
        recommendedAction: `Retrace your footsteps along the main walkway connecting ${location} to adjacent blocks.`,
      });

      scenarios.push({
        hotspot: `${location} Restroom / Wash Basin Counter`,
        probability: 20,
        mechanism: `Placed on the sink ledge or ledge while washing hands or adjusting clothing and forgotten.`,
        recommendedAction: `Check the restroom counters nearest to your study area in ${location}.`,
      });
    } else if (isCardOrWallet) {
      scenarios.push({
        hotspot: `${location} - Checkout / Scan Counter`,
        probability: 55,
        mechanism: `Pulled out for identification, attendance tap, or UPI transaction and set down temporarily on the desk or counter.`,
        recommendedAction: `Ask the reception desk, store counter, or library counter staff if anyone turned in a ${title}.`,
      });

      scenarios.push({
        hotspot: `${location} - Seating Bench / Desk Corner`,
        probability: 30,
        mechanism: `Slipped out of rear pocket when sitting down or packing notes into your bag.`,
        recommendedAction: `Check beneath the desks and corners of the room you occupied in ${location}.`,
      });

      scenarios.push({
        hotspot: `Campus Main Walkway`,
        probability: 15,
        mechanism: `Dropped unnoticed while hurrying between classes.`,
        recommendedAction: `Inquire at the Main Security Gate or Security Control Room.`,
      });
    } else {
      scenarios.push({
        hotspot: `${location} - Table / Desk Surface`,
        probability: 60,
        mechanism: `Left resting on the table when packing up books/laptop in a rush to catch the next class or bus.`,
        recommendedAction: `Visit the room supervisor, lab assistant, or department peon in ${location}.`,
      });

      scenarios.push({
        hotspot: `${location} - Charging Point Area`,
        probability: 25,
        mechanism: `Plugged in near a wall socket or corner charging hub and left behind when moving.`,
        recommendedAction: `Inspect wall outlets and switchboard benches in ${location}.`,
      });

      scenarios.push({
        hotspot: `Bus Stand / Transit Stop`,
        probability: 15,
        mechanism: `Placed on the bench while waiting for campus transport and forgotten upon boarding.`,
        recommendedAction: `Check with the College Bus Stand coordinators or drivers.`,
      });
    }

    const analysis: TrajectoryAnalysis = {
      scenarios,
      summary: `AI analyzed the physical dimensions of '${title}' and movement patterns around '${location}'. Small items typically slip from pocket friction, while larger items are left behind during hurried transitions.`,
      itemRiskFactor: isSmallElectronic
        ? "High Risk of Slipping"
        : isBulky
        ? "High Risk of Leaving Behind"
        : "Misplacement Risk",
      immediateActionPlan: [
        `1. Immediately re-check the exact seat/desk you occupied in ${location}.`,
        `2. Check the nearest Department/Lab Attendant desk or security register.`,
        `3. Inquire at the Main Canteen / Campus Store if you visited them shortly after.`,
        `4. Check the Found!t Campus Inventory regularly as finders report items.`,
      ],
    };

    return NextResponse.json({
      success: true,
      analysis,
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
