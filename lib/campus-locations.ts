export interface CampusLocation {
  id: string;
  name: string;
  category: "Academic & Labs" | "Hostels & Residential" | "Sports & Grounds" | "Dining & Amenities" | "Other";
  lat: number;
  lng: number;
  altitude?: number;
}

// Function to classify location based on its name
function classifyCategory(name: string): CampusLocation["category"] {
  const lower = name.toLowerCase();
  if (
    lower.includes("hostel") ||
    lower.includes("quarters") ||
    lower.includes("guest house")
  ) {
    return "Hostels & Residential";
  }
  if (
    lower.includes("ground") ||
    lower.includes("court") ||
    lower.includes("field") ||
    lower.includes("club") ||
    lower.includes("gallery")
  ) {
    return "Sports & Grounds";
  }
  if (
    lower.includes("canteen") ||
    lower.includes("store") ||
    lower.includes("dispensary") ||
    lower.includes("bus stand") ||
    lower.includes("temple")
  ) {
    return "Dining & Amenities";
  }
  if (
    lower.includes("dept") ||
    lower.includes("department") ||
    lower.includes("block") ||
    lower.includes("library") ||
    lower.includes("centre") ||
    lower.includes("center") ||
    lower.includes("workshop") ||
    lower.includes("college")
  ) {
    return "Academic & Labs";
  }
  return "Other";
}

// Parse KML text into CampusLocation objects
export function parseKml(kmlContent: string): CampusLocation[] {
  const locations: CampusLocation[] = [];
  const placemarkRegex = /<Placemark[\s\S]*?<\/Placemark>/gi;
  const placemarkMatches = kmlContent.match(placemarkRegex) || [];

  for (const p of placemarkMatches) {
    // Only extract point markers (skip polygon/linestring boundary lines like 'Line 3')
    if (!p.includes("<Point>")) continue;

    const nameMatch = p.match(/<name>([\s\S]*?)<\/name>/i);
    const coordsMatch = p.match(/<coordinates>([\s\S]*?)<\/coordinates>/i);

    if (nameMatch && coordsMatch) {
      const rawName = nameMatch[1]
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .trim();

      const rawCoords = coordsMatch[1].trim().split(",");
      if (rawCoords.length >= 2) {
        const lng = parseFloat(rawCoords[0]);
        const lat = parseFloat(rawCoords[1]);
        const altitude = rawCoords[2] ? parseFloat(rawCoords[2]) : undefined;

        if (!isNaN(lat) && !isNaN(lng)) {
          // Skip generic boundary names
          if (rawName.toLowerCase().startsWith("line")) continue;

          locations.push({
            id: rawName.toLowerCase().replace(/[^a-z0-9]/g, "-"),
            name: rawName,
            category: classifyCategory(rawName),
            lat,
            lng,
            altitude,
          });
        }
      }
    }
  }

  return locations;
}

// Pre-parsed locations fallback from public/campus.kml
export const CAMPUS_LOCATIONS: CampusLocation[] = [
  // Academic & Labs
  { id: "ai-ds-department", name: "AI & DS Department", category: "Academic & Labs", lat: 9.527257, lng: 77.854996 },
  { id: "cse-it-dept", name: "CSE / IT Dept", category: "Academic & Labs", lat: 9.526634, lng: 77.855141 },
  { id: "ece-block", name: "ECE Block", category: "Academic & Labs", lat: 9.525436, lng: 77.85549 },
  { id: "eee-block", name: "EEE Block", category: "Academic & Labs", lat: 9.525351, lng: 77.854781 },
  { id: "mechanical-dept", name: "Mechanical Dept", category: "Academic & Labs", lat: 9.526591, lng: 77.856136 },
  { id: "civil-dept", name: "Civil Dept", category: "Academic & Labs", lat: 9.525344, lng: 77.854255 },
  { id: "biotech-dept", name: "BioTech Dept", category: "Academic & Labs", lat: 9.523483, lng: 77.859344 },
  { id: "architecture-department", name: "Architecture Department", category: "Academic & Labs", lat: 9.523362, lng: 77.858265 },
  { id: "mba-dept", name: "MBA Dept", category: "Academic & Labs", lat: 9.522354, lng: 77.8585 },
  { id: "science-humanities-block", name: "Science & Humanities Block", category: "Academic & Labs", lat: 9.524708, lng: 77.854384 },
  { id: "aj-block", name: "AJ Block", category: "Academic & Labs", lat: 9.525291, lng: 77.853536 },
  { id: "library", name: "Central Library", category: "Academic & Labs", lat: 9.526399, lng: 77.854263 },
  { id: "mepco-convention-centre", name: "Mepco Convention Centre", category: "Academic & Labs", lat: 9.526275, lng: 77.853281 },
  { id: "workshop", name: "Workshop", category: "Academic & Labs", lat: 9.524849, lng: 77.85568 },
  { id: "tifac-safety-block", name: "TIFAC Safety Block", category: "Academic & Labs", lat: 9.525596, lng: 77.856288 },
  { id: "mepco-schlenk-college", name: "Mepco Schlenk Engineering College Main Admin", category: "Academic & Labs", lat: 9.525292, lng: 77.853436 },

  // Hostels & Residential
  { id: "narmadha-hostel", name: "Narmadha Hostel", category: "Hostels & Residential", lat: 9.526704, lng: 77.858907 },
  { id: "kaveri-hostel", name: "Kaveri Hostel", category: "Hostels & Residential", lat: 9.525731, lng: 77.858386 },
  { id: "bramhaputra-hostel", name: "Bramhaputra Hostel", category: "Hostels & Residential", lat: 9.525603, lng: 77.857058 },
  { id: "krishna-hostel", name: "Krishna Hostel", category: "Hostels & Residential", lat: 9.524934, lng: 77.857133 },
  { id: "gidhavari-hostel", name: "Gidhavari Hostel", category: "Hostels & Residential", lat: 9.525059, lng: 77.858367 },
  { id: "mahanathi-hostel", name: "Mahanathi Hostel", category: "Hostels & Residential", lat: 9.522197, lng: 77.854807 },
  { id: "thamirabharani-hostel", name: "Thamirabharani Hostel", category: "Hostels & Residential", lat: 9.521579, lng: 77.854539 },
  { id: "sindhu-hostel", name: "Sindhu Hostel", category: "Hostels & Residential", lat: 9.522243, lng: 77.853562 },
  { id: "yamuna-hostel", name: "Yamuna Hostel", category: "Hostels & Residential", lat: 9.523795, lng: 77.853538 },
  { id: "ganga-hostel", name: "Ganga Hostel", category: "Hostels & Residential", lat: 9.523694, lng: 77.854483 },
  { id: "staff-quarters", name: "Staff Quarters", category: "Hostels & Residential", lat: 9.522631, lng: 77.854267 },
  { id: "principal-quarters", name: "Principal Quarters", category: "Hostels & Residential", lat: 9.524046, lng: 77.854925 },
  { id: "guest-house-1", name: "Guest House 1", category: "Hostels & Residential", lat: 9.526433, lng: 77.857163 },
  { id: "guest-house-2", name: "Guest House 2", category: "Hostels & Residential", lat: 9.526269, lng: 77.857676 },

  // Dining & Amenities
  { id: "canteen", name: "Main Canteen", category: "Dining & Amenities", lat: 9.524996, lng: 77.855003 },
  { id: "store", name: "Campus Store", category: "Dining & Amenities", lat: 9.524994, lng: 77.855299 },
  { id: "dispensary", name: "Dispensary / Health Centre", category: "Dining & Amenities", lat: 9.524691, lng: 77.85502 },
  { id: "bus-stand", name: "College Bus Stand", category: "Dining & Amenities", lat: 9.524044, lng: 77.85547 },
  { id: "vinayagar-temple", name: "Shri Vinayagar Temple", category: "Dining & Amenities", lat: 9.525335, lng: 77.852724 },

  // Sports & Grounds
  { id: "mepco-play-ground", name: "Mepco Play Ground", category: "Sports & Grounds", lat: 9.522956, lng: 77.856418 },
  { id: "gallery", name: "Sports Gallery", category: "Sports & Grounds", lat: 9.52306, lng: 77.85576 },
  { id: "basket-ball", name: "Basket Ball Court", category: "Sports & Grounds", lat: 9.522113, lng: 77.855701 },
  { id: "tennis-court", name: "Tennis Court", category: "Sports & Grounds", lat: 9.523313, lng: 77.855543 },
  { id: "volley-ball-court", name: "Volley Ball Court", category: "Sports & Grounds", lat: 9.524951, lng: 77.856151 },
  { id: "badminton-court", name: "Badminton Court", category: "Sports & Grounds", lat: 9.524004, lng: 77.856435 },
  { id: "hockey-field", name: "Hockey Field", category: "Sports & Grounds", lat: 9.521468, lng: 77.856401 },
  { id: "yoga-rifle-club", name: "Yoga & Rifle Club", category: "Sports & Grounds", lat: 9.524076, lng: 77.856925 },
];

// Helper to get locations grouped by category
export function getLocationsGroupedByCategory(locations = CAMPUS_LOCATIONS) {
  const grouped: Record<string, CampusLocation[]> = {};
  for (const loc of locations) {
    if (!grouped[loc.category]) {
      grouped[loc.category] = [];
    }
    grouped[loc.category].push(loc);
  }
  return grouped;
}
