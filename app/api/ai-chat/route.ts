import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { COLLEGE_CAMPUS_SPATIAL_GRAPH, CAMPUS_LOCATIONS } from "@/lib/campus-locations";
import { normalizeText } from "@/lib/cosine-similarity";

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { message, history = [], userEmail = "" } = body;

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { success: false, error: "Message is required." },
        { status: 400 }
      );
    }

    const queryNorm = normalizeText(message);
    const client = await clientPromise;
    const db = client.db("foundit_db");

    // 1. Fetch live active found items from MongoDB
    const activeFoundReports = await db
      .collection("reports")
      .find({ type: "FOUND", status: { $ne: "RETURNED" } })
      .sort({ createdAt: -1 })
      .limit(25)
      .toArray();

    // 2. Identify potential product keyword matches in the live inventory
    const matchingProducts = activeFoundReports.filter((item) => {
      const titleNorm = normalizeText(item.title || "");
      const catNorm = normalizeText(item.category || "");
      const descNorm = normalizeText(item.description || "");
      const locNorm = normalizeText(item.location || "");

      // Check if user query mentions item title words, category, or location
      const queryWords = queryNorm.split(/\s+/).filter((w) => w.length > 2);
      return queryWords.some(
        (w) =>
          titleNorm.includes(w) ||
          catNorm.includes(w) ||
          descNorm.includes(w) ||
          locNorm.includes(w)
      );
    });

    // 3. Check for college spatial / location matches
    const matchedDept = COLLEGE_CAMPUS_SPATIAL_GRAPH.find((dept) => {
      const deptNameNorm = normalizeText(dept.name);
      const blockNorm = normalizeText(dept.blockName);
      if (queryNorm.includes(dept.id) || queryNorm.includes(deptNameNorm) || queryNorm.includes(blockNorm)) {
        return true;
      }
      return dept.aliases.some((alias) => queryNorm.includes(normalizeText(alias)));
    });

    // Check for specific laboratory queries
    let matchedLab: { lab: string; deptName: string; floorDetails?: string } | null = null;
    for (const dept of COLLEGE_CAMPUS_SPATIAL_GRAPH) {
      for (const lab of dept.labs) {
        const labNorm = normalizeText(lab);
        const labWords = labNorm.split(/\s+/).filter((w) => w.length > 3);
        const matchCount = labWords.filter((w) => queryNorm.includes(w)).length;
        if (matchCount >= 2 || (labWords.length === 1 && matchCount === 1)) {
          matchedLab = {
            lab,
            deptName: dept.name,
            floorDetails: dept.floorDetails,
          };
          break;
        }
      }
      if (matchedLab) break;
    }

    // 4. Check if an external Google Gemini API Key is configured
    const geminiApiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;

    if (geminiApiKey) {
      try {
        const inventoryContext = activeFoundReports.map((r) => ({
          title: r.title,
          category: r.category,
          location: r.location,
          color: r.color,
          status: r.status,
          date: r.createdAt ? new Date(r.createdAt).toLocaleDateString() : "Recent",
          isLocked: !!r.hiddenQuestion,
        }));

        const collegeContext = COLLEGE_CAMPUS_SPATIAL_GRAPH.map((d) => ({
          name: d.name,
          block: d.blockName,
          opposite: d.opposite || "N/A",
          left: d.leftSide || "N/A",
          right: d.rightSide || "N/A",
          back: d.backSide || "N/A",
          floors: d.floorDetails || "N/A",
          labs: d.labs.slice(0, 5),
        }));

        const systemPrompt = `You are the friendly, helpful AI Campus Recovery Assistant for the "Found!t" platform at Mepco Schlenk Engineering College.
You have direct, real-time access to the campus spatial layout and live lost & found database inventory.

LIVE FOUND ITEMS INVENTORY:
${JSON.stringify(inventoryContext, null, 2)}

CAMPUS SPATIAL KNOWLEDGE & DEPARTMENTS:
${JSON.stringify(collegeContext, null, 2)}

CAMPUS RECOVERY PROTOCOL:
- When a user asks if a specific item is found, check the live inventory above. If found, describe the title, category, location, and date.
- To claim a found product, the owner must click "Answer Question & Unlock" to answer the confidential security question set by the founder. Once unlocked, a side-by-side chat opens with the founder, and physical handover is verified with a single-use 24-hour OTP code.
- If an item is not in the found inventory yet, encourage them to file a Lost Report via the "Report Lost Product" button so AI auto-matching scans all future entries.
- Answer questions about college locations (e.g. labs, departments, floor levels, canteen, library, MCC convention centre) with precise spatial directions.
- Keep your responses friendly, concise, and professional. Format with Markdown.`;

        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [
                {
                  role: "user",
                  parts: [{ text: `${systemPrompt}\n\nUser Question: ${message}` }],
                },
              ],
              generationConfig: {
                temperature: 0.3,
                maxOutputTokens: 600,
              },
            }),
          }
        );

        const geminiData = await geminiRes.json();
        const geminiReply = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;

        if (geminiReply) {
          return NextResponse.json({
            success: true,
            reply: geminiReply,
            source: "gemini",
            suggestedProducts: matchingProducts.slice(0, 4).map((p) => ({
              _id: p._id,
              title: p.title,
              category: p.category,
              location: p.location,
              imageUrl: p.imageUrl,
              isLocked: !!p.hiddenQuestion,
            })),
          });
        }
      } catch (geminiErr) {
        console.warn("Gemini API call failed, falling back to embedded campus inference engine:", geminiErr);
      }
    }

    // 5. Embedded High-Precision Campus AI Inference Engine (Fallback / Zero-Config)
    let reply = "";
    const isGreeting = /^(hi|hello|hey|good morning|good afternoon|good evening|help|sup)/i.test(message.trim());
    const isAskingFound = /found|lost|item|product|wallet|airpod|earbud|phone|laptop|card|watch|bag|bottle|key|calculator/i.test(message);
    const isAskingLocation = /where|location|place|direction|floor|lab|department|block|how to reach|near/i.test(message);
    const isAskingProcedure = /how (to|do i) (claim|unlock|verify|get|take|receive)|otp|secret question/i.test(message);

    if (isAskingProcedure) {
      reply = `### 🔐 How to Claim & Recover a Found Item:

1. **Browse Found Inventory**: Look for matching products in the **Found Inventory** tab on your dashboard.
2. **Answer the Secret Question**: Click **"Answer Question & Unlock"** on the item card. The finder locks distinguishing details behind a question only the genuine owner knows.
3. **Open Live Side-by-Side Chat**: Once answered correctly, direct real-time communication opens with the finder to coordinate a safe on-campus meeting spot.
4. **Single-Use 24h OTP Handover**: When you meet in person, verify ownership and complete the handoff using the 6-digit OTP code to officially record the return.`;
    } else if (isAskingFound && matchingProducts.length > 0) {
      reply = `### 🎁 Matching Items Found in Campus Inventory:

I found **${matchingProducts.length}** item(s) matching your inquiry:

` +
        matchingProducts
          .slice(0, 4)
          .map(
            (p, idx) =>
              `${idx + 1}. **${p.title}** (${p.category})
   - 📍 Location: **${p.location || "Campus"}**
   - 📅 Date: **${p.createdAt ? new Date(p.createdAt).toLocaleDateString() : "Recent"}**
   - 🔒 Status: **${p.hiddenQuestion ? "Protected with Secret Question" : "Available to Claim"}**`
          )
          .join("\n\n") +
        `\n\n👉 *To claim any item, click on its card in the **Found Inventory** tab and verify the secret question.*`;
    } else if (isAskingFound && matchingProducts.length === 0) {
      // ── SMART LOSS SCENARIO INFERENCE (Offline / Zero-Config) ──
      const allFoundCount = activeFoundReports.length;

      // Infer item characteristics
      const isSmallElectronic = /airpod|earbud|bud|watch|phone|mobile|usb|pen drive|charger/i.test(message);
      const isCardOrWallet = /id card|wallet|purse|card|money|license|atm/i.test(message);
      const isStationeryOrStudy = /calculator|book|notebook|record|drawing sheet|instrument|pencil/i.test(message);
      const isBulky = /bag|backpack|laptop|bottle|umbrella/i.test(message);

      // Determine target department / location context from spatial graph
      const targetDept = matchedDept || (matchedLab ? COLLEGE_CAMPUS_SPATIAL_GRAPH.find((d) => d.name === matchedLab?.deptName) : null);
      const targetLab = matchedLab ? matchedLab.lab : (targetDept?.labs[0] || null);

      if (targetDept || targetLab) {
        // Deep campus spatial inference
        const deptName = targetDept?.name || matchedLab?.deptName || "Academic Department";
        const block = targetDept?.blockName || "Department Building";
        const floorInfo = targetDept?.floorDetails ? `(${targetDept.floorDetails})` : "";

        const adjacencies: string[] = [];
        if (targetDept?.opposite) adjacencies.push(`the front path towards ${targetDept.opposite}`);
        if (targetDept?.leftSide) adjacencies.push(`the left walkway near ${targetDept.leftSide}`);
        if (targetDept?.rightSide) adjacencies.push(`the right corridor heading to ${targetDept.rightSide}`);
        if (targetDept?.backSide) adjacencies.push(`the rear pathway towards ${targetDept.backSide}`);
        const transitNotice = adjacencies.length > 0 ? adjacencies.slice(0, 2).join(" or ") : "nearby walkways";

        let riskAnalysis = "Item likely left on a workstation, lab bench, or seating area while gathering belongings.";
        let primaryHotspot = `${targetLab || block} (Desk/Workstation Area)`;
        let searchTip = `Inspect underneath the chairs and workbench shelves in ${targetLab || block}.`;

        if (isSmallElectronic) {
          riskAnalysis = "High probability of sliding out of pockets into chair crevices, sofa seams, or left at an electrical charging station.";
          primaryHotspot = `${targetLab || block} - Seating Crevices & Charging Outlets`;
          searchTip = `Check the floor edges beneath benches and near wall charging outlets in ${targetLab || block}.`;
        } else if (isCardOrWallet) {
          riskAnalysis = "Commonly set down during attendance marking, practical registration, or purchasing snacks.";
          primaryHotspot = `${targetLab || block} - Staff/Attendance Desk or Nearby Amenities Foyer`;
          searchTip = `Ask the lab attendant or check the token desk at the Canteen Amenities Centre.`;
        } else if (isStationeryOrStudy) {
          riskAnalysis = "Frequently left behind on practical tables or drawing boards during session transitions.";
          primaryHotspot = `${targetLab || block} - Practical Workbench / Desk Drawers`;
          searchTip = `Inquire directly with the Lab Technician or Course Faculty in charge before the room is locked.`;
        } else if (isBulky) {
          riskAnalysis = "Placed on side racks, under-desk hooks, or resting benches and forgotten in a rush.";
          primaryHotspot = `${targetLab || block} - Equipment Racks & Waiting Benches`;
          searchTip = `Check the bag shelves at the lab entrance and the ground-floor waiting area.`;
        }

        reply = `### 🕵️ No Direct Match Found — Campus Loss Scenario Analysis:

I scanned our live campus database (**${allFoundCount} active found items logged**), but no found report has been filed for this yet.

However, based on your description and our **College Spatial Map**, here is an instant trajectory assessment:

---

#### 📍 1. High-Probability Search Hotspots:
* **Primary Spot:** **${primaryHotspot}** ${floorInfo}
* **Transit Zone:** Check **${transitNotice}**, especially if you were walking between classes or heading to the Canteen.

#### 🔍 2. Probable Mechanism:
* *${riskAnalysis}*

#### ⚡ 3. Recommended Immediate Action:
1. **${searchTip}**
2. **Contact the Lab Attendant / Peon:** Items picked up by cleaning staff at the end of the day are typically placed on the department attendant's desk before being moved.
3. **File a "Report Lost Product":** Click the **Report Lost** button on your dashboard. Our AI matcher will continuously compare your complaint with all incoming submissions and notify you automatically if there's a match (score ≥ 75%)!`;
      } else {
        reply = `### 🔍 Live Inventory Check & Recovery Guide:

I scanned our live campus database (**${allFoundCount} active found items logged**), and no item matching your exact description has been reported found yet.

#### 💡 Suggested Next Steps:
1. **Specify Your Department / Lab:** Tell me which block or lab you were in (e.g., *Civil CADD Center, EEE Machines Lab, CSE, Mech, Canteen, or Library*) and I will give you the exact floor location, transit hotspots, and recovery contacts.
2. **File a "Report Lost Product":** Submit your complaint with photos and details on the dashboard. Our multimodal AI engine will monitor every new found item 24/7 and alert you the moment a match ≥ 75% is registered!`;
      }
    } else if (isAskingLocation && matchedDept) {
      reply = `### 📍 Campus Directions: ${matchedDept.name}

* **Building Block:** ${matchedDept.blockName}
* **Surrounding Adjacencies:**
  - **Opposite:** ${matchedDept.opposite || "Connecting campus grounds"}
  - **Left Side:** ${matchedDept.leftSide || "Open pathway"}
  - **Right Side:** ${matchedDept.rightSide || "Open pathway"}
  - **Back Side:** ${matchedDept.backSide || "Campus perimeter"}
${matchedDept.floorDetails ? `* **Floor Layout:** ${matchedDept.floorDetails}\n` : ""}
* **Key Laboratories & Facilities:**
${matchedDept.labs.slice(0, 6).map((l) => `  - ${l}`).join("\n")}`;
    } else if (isAskingLocation && matchedLab) {
      reply = `### 🔬 Laboratory Location: ${matchedLab.lab}

* **Department:** ${matchedLab.deptName}
${matchedLab.floorDetails ? `* **Floor Details:** ${matchedLab.floorDetails}` : ""}
* **Recovery Tip:** If you lost an item here, immediately inquire with the Lab Assistant or Department Attendant in charge before the room is locked for the evening.`;
    } else if (isGreeting) {
      reply = `Hello! 👋 I am your **Found!t Campus AI Assistant**.

I am grounded in your college's spatial layout (${COLLEGE_CAMPUS_SPATIAL_GRAPH.length} department blocks & laboratories) and have real-time access to our campus Lost & Found database.

**You can ask me things like:**
* *"Is there any laptop or AirPods found in CSE or Canteen?"*
* *"Where is the Deep Learning Lab or Language Lab located?"*
* *"What items were found on campus recently?"*
* *"How does the Secret Question and OTP handover work?"*`;
    } else {
      reply = `I understand your inquiry. In our college campus system, you can:

1. **Check Found Inventory:** Browse active recoveries reported across all blocks.
2. **File a Complaint:** If you lost something, submit a **Report Lost Product** entry so our multimodal AI compares incoming entries with a strict 75%+ score threshold.
3. **Campus Navigation:** Ask about any department (Civil, EEE, ECE, CSE, Mech, IT, BioTech, AI&DS, S&H, Canteen, MCC, Admin) or specific lab to find its exact floor and location.

Would you like me to check a specific item (e.g. phone, watch, wallet, bottle) or guide you to a department?`;
    }

    return NextResponse.json({
      success: true,
      reply,
      source: "embedded-campus-engine",
      suggestedProducts: matchingProducts.slice(0, 3).map((p) => ({
        _id: p._id,
        title: p.title,
        category: p.category,
        location: p.location,
        imageUrl: p.imageUrl,
        isLocked: !!p.hiddenQuestion,
      })),
    });
  } catch (error: any) {
    console.error("Error in AI Chat API:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to process chat query." },
      { status: 500 }
    );
  }
}
