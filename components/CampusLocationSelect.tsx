"use client";

import { useState, useEffect } from "react";
import { CAMPUS_LOCATIONS, CampusLocation, getLocationsGroupedByCategory } from "@/lib/campus-locations";
import GoogleCampusMap from "./GoogleCampusMap";

interface CampusLocationSelectProps {
  value: string;
  onChange: (location: string, locData?: CampusLocation) => void;
  label?: string;
  required?: boolean;
}

export default function CampusLocationSelect({
  value,
  onChange,
  label = "Campus Location",
  required = true,
}: CampusLocationSelectProps) {
  const [locations, setLocations] = useState<CampusLocation[]>(CAMPUS_LOCATIONS);
  const [groupedLocations, setGroupedLocations] = useState<Record<string, CampusLocation[]>>(
    getLocationsGroupedByCategory(CAMPUS_LOCATIONS)
  );
  const [isOther, setIsOther] = useState(false);
  const [customValue, setCustomValue] = useState("");
  const [showMapModal, setShowMapModal] = useState(false);
  const [selectedMarker, setSelectedMarker] = useState<CampusLocation | null>(null);
  const [searchFilter, setSearchFilter] = useState("");

  // Load latest KML parsed markers from API
  useEffect(() => {
    fetch("/api/campus-locations")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.locations) {
          setLocations(data.locations);
          if (data.grouped) setGroupedLocations(data.grouped);
        }
      })
      .catch((err) => console.warn("Using fallback KML locations:", err));
  }, []);

  // Sync internal state with external value
  useEffect(() => {
    if (!value) {
      setIsOther(false);
      setCustomValue("");
      return;
    }

    const matched = locations.find(
      (loc) => loc.name.toLowerCase() === value.toLowerCase()
    );
    if (matched) {
      setIsOther(false);
      setSelectedMarker(matched);
    } else {
      setIsOther(true);
      setCustomValue(value);
    }
  }, [value, locations]);

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = e.target.value;
    if (selected === "__OTHER__") {
      setIsOther(true);
      onChange(customValue || "Other");
      setSelectedMarker(null);
    } else {
      setIsOther(false);
      const loc = locations.find((l) => l.name === selected);
      setSelectedMarker(loc || null);
      onChange(selected, loc);
    }
  };

  const handleCustomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setCustomValue(val);
    onChange(val);
  };

  const handleMarkerClick = (loc: CampusLocation) => {
    setSelectedMarker(loc);
    setIsOther(false);
    onChange(loc.name, loc);
    setShowMapModal(false);
  };

  const filteredLocations = searchFilter
    ? locations.filter((l) =>
        l.name.toLowerCase().includes(searchFilter.toLowerCase())
      )
    : locations;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-semibold text-slate-800">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
        <button
          type="button"
          onClick={() => setShowMapModal(true)}
          className="text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2.5 py-1 rounded-lg transition flex items-center gap-1.5 cursor-pointer"
        >
          <span>🗺️</span>
          <span>View on College Map</span>
        </button>
      </div>

      <div className="relative">
        <select
          required={required && !isOther}
          value={isOther ? "__OTHER__" : value}
          onChange={handleSelectChange}
          className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-xs"
        >
          <option value="">-- Select Campus Location (From KML Map) --</option>
          {Object.entries(groupedLocations).map(([category, items]) => (
            <optgroup key={category} label={`📍 ${category}`}>
              {items.map((loc) => (
                <option key={loc.id} value={loc.name}>
                  {loc.name}
                </option>
              ))}
            </optgroup>
          ))}
          <option value="__OTHER__">➕ Other Location (Specify below)</option>
        </select>
      </div>

      {/* Custom Location Input when "Other" is selected */}
      {isOther && (
        <div className="mt-2 animate-in fade-in slide-in-from-top-1">
          <input
            type="text"
            required={required}
            placeholder="Please specify exact location (e.g. Near Lawn Bench, Tree opposite Canteen)"
            value={customValue}
            onChange={handleCustomChange}
            className="w-full px-4 py-2.5 rounded-xl border border-amber-300 bg-amber-50/50 text-slate-900 placeholder-slate-400 text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 shadow-xs"
          />
        </div>
      )}

      {selectedMarker && !isOther && (
        <div className="text-[11px] text-slate-500 flex items-center gap-1.5 pt-0.5">
          <span className="text-emerald-500 font-bold">✓</span>
          <span>
            Verified KML Map Coordinates: <strong>{selectedMarker.lat.toFixed(6)}, {selectedMarker.lng.toFixed(6)}</strong>
          </span>
          <span className="text-slate-300">|</span>
          <span className="text-slate-600 font-medium">{selectedMarker.category}</span>
        </div>
      )}

      {/* ── INTERACTIVE COLLEGE MAP MODAL ── */}
      {showMapModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 to-blue-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl">🗺️</span>
                <div>
                  <h3 className="font-extrabold text-base sm:text-lg">
                    Mepco Schlenk Campus Map
                  </h3>
                  <p className="text-xs text-blue-200">
                    {locations.length} KML Location Markers • Click any building to select location
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowMapModal(false)}
                className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center font-bold text-sm transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Search Filter */}
            <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
              <span className="text-slate-400 pl-1">🔍</span>
              <input
                type="text"
                placeholder="Search campus building, hostel, lab, ground..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="w-full bg-transparent text-sm text-slate-900 placeholder-slate-400 outline-none"
              />
              {searchFilter && (
                <button
                  type="button"
                  onClick={() => setSearchFilter("")}
                  className="text-xs text-slate-400 hover:text-slate-600 px-2"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Map Visualizer & Marker Grid */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
              {/* Google Maps Visualizer Centered on Mepco Campus with KML Markers */}
              <GoogleCampusMap
                locations={locations}
                selectedLocation={selectedMarker}
                onSelectLocation={handleMarkerClick}
              />

              {/* KML Markers Grid by Category */}
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 mb-3 flex items-center justify-between">
                  <span>Click A Location to Select It ({filteredLocations.length})</span>
                  {selectedMarker && (
                    <span className="text-blue-600 font-bold normal-case">
                      Selected: {selectedMarker.name}
                    </span>
                  )}
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-60 overflow-y-auto pr-1">
                  {filteredLocations.map((loc) => {
                    const isCurrent = selectedMarker?.id === loc.id;
                    return (
                      <button
                        key={loc.id}
                        type="button"
                        onClick={() => handleMarkerClick(loc)}
                        className={`p-2.5 rounded-xl text-left border transition flex items-center justify-between gap-2 cursor-pointer ${
                          isCurrent
                            ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                            : "bg-white text-slate-800 border-slate-200 hover:border-blue-400 hover:bg-blue-50/50"
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-xs truncate">{loc.name}</p>
                          <p
                            className={`text-[10px] truncate ${
                              isCurrent ? "text-blue-100" : "text-slate-400"
                            }`}
                          >
                            {loc.category}
                          </p>
                        </div>
                        <span
                          className={`text-xs shrink-0 ${
                            isCurrent ? "text-white" : "text-slate-400"
                          }`}
                        >
                          📍
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                {selectedMarker ? (
                  <>
                    Selected: <strong>{selectedMarker.name}</strong>
                  </>
                ) : (
                  "Select a building to apply to your complaint"
                )}
              </span>
              <button
                type="button"
                onClick={() => setShowMapModal(false)}
                className="px-5 py-2 bg-slate-900 text-white font-bold text-xs rounded-xl hover:bg-slate-800 transition"
              >
                Confirm &amp; Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
