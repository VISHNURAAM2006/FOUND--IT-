"use client";

import { useEffect, useRef, useState } from "react";
import { CampusLocation } from "@/lib/campus-locations";

interface GoogleCampusMapProps {
  locations: CampusLocation[];
  selectedLocation: CampusLocation | null;
  onSelectLocation: (loc: CampusLocation) => void;
}

// Marker pin colors by category
const CATEGORY_COLORS: Record<string, string> = {
  "Academic & Labs": "#2563eb", // Blue
  "Hostels & Residential": "#7c3aed", // Violet
  "Dining & Amenities": "#d97706", // Amber
  "Sports & Grounds": "#059669", // Emerald
  Other: "#4b5563", // Gray
};

export default function GoogleCampusMap({
  locations,
  selectedLocation,
  onSelectLocation,
}: GoogleCampusMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<Map<string, any>>(new Map());
  const infoWindowRef = useRef<any>(null);

  const [mapLoaded, setMapLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";

  useEffect(() => {
    if (!apiKey) {
      setLoadError("No Google Maps API Key found in environment variables.");
      return;
    }

    // Check if script already injected or window.google exists
    if ((window as any).google && (window as any).google.maps) {
      initializeMap();
      return;
    }

    const scriptId = "google-maps-script";
    const existingScript = document.getElementById(scriptId);

    if (existingScript) {
      existingScript.addEventListener("load", initializeMap);
      return;
    }

    const script = document.createElement("script");
    script.id = scriptId;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=geometry`;
    script.async = true;
    script.defer = true;

    script.onload = () => {
      initializeMap();
    };

    script.onerror = () => {
      setLoadError("Failed to load Google Maps SDK. Please verify your API Key and network.");
    };

    document.head.appendChild(script);

    function initializeMap() {
      if (!mapContainerRef.current || !(window as any).google?.maps) return;

      const centerCoord = selectedLocation
        ? { lat: selectedLocation.lat, lng: selectedLocation.lng }
        : { lat: 9.5252, lng: 77.8550 }; // Mepco Schlenk Campus Center

      try {
        const map = new (window as any).google.maps.Map(mapContainerRef.current, {
          center: centerCoord,
          zoom: 17,
          mapTypeId: "roadmap",
          mapTypeControl: true,
          mapTypeControlOptions: {
            position: (window as any).google.maps.ControlPosition.TOP_LEFT,
          },
          streetViewControl: false,
          fullscreenControl: true,
          zoomControl: true,
          styles: [
            {
              featureType: "poi.school",
              elementType: "geometry",
              stylers: [{ color: "#dbeafe" }],
            },
          ],
        });

        mapInstanceRef.current = map;
        infoWindowRef.current = new (window as any).google.maps.InfoWindow();
        setMapLoaded(true);
      } catch (err: any) {
        console.error("Error creating Google Map:", err);
        setLoadError(err.message || "Could not initialize Google Map.");
      }
    }
  }, [apiKey]);

  // Render markers when map is loaded or locations update
  useEffect(() => {
    if (!mapLoaded || !mapInstanceRef.current || !(window as any).google?.maps) return;

    const map = mapInstanceRef.current;
    const infoWindow = infoWindowRef.current;

    // Clear existing markers
    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current.clear();

    // Plot each campus location from KML
    locations.forEach((loc) => {
      const pinColor = CATEGORY_COLORS[loc.category] || "#2563eb";

      // Custom SVG Pin Icon with category color
      const pinSvg = {
        path: "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z",
        fillColor: pinColor,
        fillOpacity: 1,
        strokeWeight: 1.5,
        strokeColor: "#ffffff",
        scale: 1.5,
        anchor: new (window as any).google.maps.Point(12, 22),
      };

      const marker = new (window as any).google.maps.Marker({
        position: { lat: loc.lat, lng: loc.lng },
        map,
        title: loc.name,
        icon: pinSvg,
        animation: (window as any).google.maps.Animation.DROP,
      });

      // Marker Click -> Show InfoWindow & Allow Selection
      marker.addListener("click", () => {
        const contentString = `
          <div style="font-family: inherit; padding: 6px; max-width: 220px;">
            <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
              <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background-color: ${pinColor};"></span>
              <span style="font-size: 11px; font-weight: 700; color: #475569; text-transform: uppercase;">${loc.category}</span>
            </div>
            <h4 style="font-size: 14px; font-weight: 800; color: #0f172a; margin: 0 0 4px 0;">${loc.name}</h4>
            <p style="font-size: 11px; color: #64748b; margin: 0 0 8px 0;">
              GPS: ${loc.lat.toFixed(5)}, ${loc.lng.toFixed(5)}
            </p>
            <button
              id="select-loc-btn-${loc.id}"
              style="width: 100%; padding: 6px 12px; background-color: #2563eb; color: #ffffff; border: none; border-radius: 8px; font-size: 12px; font-weight: 700; cursor: pointer; transition: background-color 0.2s;"
            >
              ✓ Select this Location
            </button>
          </div>
        `;

        infoWindow.setContent(contentString);
        infoWindow.open(map, marker);

        // Bind button click inside InfoWindow
        setTimeout(() => {
          const btn = document.getElementById(`select-loc-btn-${loc.id}`);
          if (btn) {
            btn.onclick = () => {
              onSelectLocation(loc);
              infoWindow.close();
            };
          }
        }, 100);
      });

      markersRef.current.set(loc.id, marker);
    });
  }, [mapLoaded, locations, onSelectLocation]);

  // Center on selectedLocation if changed from parent
  useEffect(() => {
    if (!mapLoaded || !mapInstanceRef.current || !selectedLocation) return;

    const map = mapInstanceRef.current;
    map.panTo({ lat: selectedLocation.lat, lng: selectedLocation.lng });
    map.setZoom(18);

    const marker = markersRef.current.get(selectedLocation.id);
    if (marker && infoWindowRef.current) {
      new (window as any).google.maps.event.trigger(marker, "click");
    }
  }, [mapLoaded, selectedLocation]);

  return (
    <div className="relative w-full h-80 sm:h-96 rounded-2xl overflow-hidden border border-slate-200 shadow-md bg-slate-100">
      {/* Map Target Div */}
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Loading Overlay */}
      {!mapLoaded && !loadError && (
        <div className="absolute inset-0 bg-slate-100 flex flex-col items-center justify-center gap-3 text-slate-600">
          <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-semibold">Initializing Google Maps with Campus KML...</p>
        </div>
      )}

      {/* Error / Fallback State */}
      {loadError && (
        <div className="absolute inset-0 bg-amber-50/95 p-6 flex flex-col items-center justify-center text-center gap-2">
          <span className="text-3xl">🗺️</span>
          <h4 className="text-sm font-bold text-slate-800">Google Maps Notice</h4>
          <p className="text-xs text-slate-600 max-w-md">{loadError}</p>
          <div className="mt-2 text-[11px] bg-white border border-amber-300 text-amber-800 px-3 py-1 rounded-full">
            Using interactive Campus Markers Grid below
          </div>
        </div>
      )}

      {/* Legend Badge Overlay */}
      {mapLoaded && (
        <div className="absolute bottom-2 left-2 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-2 text-[10px] font-bold text-slate-700 flex-wrap pointer-events-none">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-blue-600" /> Academic
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-purple-600" /> Hostels
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-600" /> Dining
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-600" /> Sports
          </span>
        </div>
      )}
    </div>
  );
}
