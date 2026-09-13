"use client";

import { useState, useRef } from "react";
import { processImageFile } from "@/lib/image-utils";

interface ImageUploadProps {
  label: string;
  sublabel?: string;
  value: string | null;
  onChange: (dataUrl: string | null) => void;
}

export default function ImageUpload({
  label,
  sublabel,
  value,
  onChange,
}: ImageUploadProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      alert("Please upload a valid image file (PNG, JPG, JPEG, WEBP).");
      return;
    }
    try {
      setIsProcessing(true);
      const dataUrl = await processImageFile(file);
      onChange(dataUrl);
    } catch (err) {
      console.error(err);
      alert("Error processing the image. Please try another image.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-semibold text-slate-800">
        {label}
      </label>
      {sublabel && <p className="text-xs text-slate-500">{sublabel}</p>}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleChange}
        className="hidden"
      />

      {value ? (
        <div className="relative border-2 border-slate-200 rounded-xl p-3 bg-slate-50 flex items-center gap-4">
          <img
            src={value}
            alt="Preview"
            className="w-24 h-24 object-cover rounded-lg border border-slate-300 shadow-sm"
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-800">
              Image Attached Successfully
            </p>
            <p className="text-xs text-emerald-600 font-medium mt-0.5">
              ✓ Ready for upload to database
            </p>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-xs px-3 py-1.5 bg-slate-200 text-slate-800 rounded-md font-medium hover:bg-slate-300 transition"
              >
                Replace Image
              </button>
              <button
                type="button"
                onClick={() => onChange(null)}
                className="text-xs px-3 py-1.5 bg-red-50 text-red-600 rounded-md font-medium hover:bg-red-100 transition"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition flex flex-col items-center justify-center gap-2 ${
            dragActive
              ? "border-blue-500 bg-blue-50/50"
              : "border-slate-300 bg-slate-50 hover:bg-slate-100 hover:border-slate-400"
          }`}
        >
          <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xl">
            📷
          </div>
          <div>
            <span className="text-sm font-semibold text-blue-600 hover:underline">
              Click to browse
            </span>{" "}
            <span className="text-sm text-slate-600">or drag and drop photo</span>
          </div>
          <p className="text-xs text-slate-500">
            Supports JPG, PNG, WEBP (auto-compressed for database storage)
          </p>
          {isProcessing && (
            <p className="text-xs font-semibold text-blue-600 animate-pulse">
              Processing image...
            </p>
          )}
        </div>
      )}
    </div>
  );
}
