"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import ImageUpload from "@/components/ImageUpload";

export default function ReportLostPage() {
  const { data: session, status } = useSession();

  const [category, setCategory] = useState("Electronics");
  const [formData, setFormData] = useState({
    title: "",
    brand: "",
    model: "",
    color: "",
    location: "",
    lostDate: new Date().toISOString().split("T")[0],
    contactPhone: "",
    description: "",
  });
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const response = await fetch("/api/reports", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          category,
          type: "LOST",
          imageUrl,
          userEmail: session?.user?.email || "anonymous",
          userName: session?.user?.name || "Found!t User",
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSubmitSuccess(true);
      } else {
        setErrorMessage(data.error || "Failed to submit lost item report. Please try again.");
      }
    } catch (err) {
      console.error(err);
      setErrorMessage("Network or server connection error. Make sure your local MongoDB server is running.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setFormData({
      title: "",
      brand: "",
      model: "",
      color: "",
      location: "",
      lostDate: new Date().toISOString().split("T")[0],
      contactPhone: "",
      description: "",
    });
    setImageUrl(null);
    setSubmitSuccess(false);
    setErrorMessage("");
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-600 font-medium">Checking authentication...</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-md border border-slate-200 text-center">
          <div className="text-4xl mb-3">🔒</div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Login Required</h2>
          <p className="text-slate-600 mb-6">
            Please log in with your college Gmail to file a lost product report.
          </p>
          <Link
            href="/"
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition"
          >
            Go to Login Page
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto">
        {/* Navigation Bar */}
        <div className="flex items-center justify-between mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-slate-900 bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-200 hover:bg-slate-100 transition"
          >
            <span>←</span> Back to Dashboard
          </Link>
          <span className="text-xs bg-blue-100 text-blue-800 font-semibold px-3 py-1 rounded-full">
            Filing as: {session.user?.email}
          </span>
        </div>

        {/* Card Container */}
        <div className="bg-white rounded-2xl shadow-md border border-slate-200 p-6 sm:p-10">
          <div className="border-b border-slate-100 pb-5 mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center text-xl font-bold">
                🔍
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
                  File a Lost Product Report
                </h1>
                <p className="text-sm text-slate-500 mt-1">
                  Submit details of your lost belonging so our campus database and community can locate it.
                </p>
              </div>
            </div>
          </div>

          {/* Success Banner */}
          {submitSuccess && (
            <div className="mb-8 p-6 bg-blue-50 border border-blue-300 rounded-2xl text-center">
              <div className="w-12 h-12 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center mx-auto mb-3 text-2xl font-bold">
                ✓
              </div>
              <h3 className="text-xl font-bold text-blue-900 mb-1">
                Lost Product Report Filed Successfully!
              </h3>
              <p className="text-sm text-blue-700 mb-6">
                Your report is now active in the database. When someone submits a matching found item, you will be notified.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link
                  href="/"
                  className="px-6 py-2.5 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition"
                >
                  Return to Dashboard
                </Link>
                <button
                  onClick={handleReset}
                  className="px-6 py-2.5 bg-white text-blue-700 border border-blue-300 font-semibold rounded-xl hover:bg-blue-50 transition"
                >
                  File Another Report
                </button>
              </div>
            </div>
          )}

          {/* Error Banner */}
          {errorMessage && (
            <div className="mb-6 p-4 bg-red-50 border border-red-300 rounded-xl text-red-800 text-sm">
              <p className="font-semibold mb-1">Submission Failed:</p>
              <p>{errorMessage}</p>
            </div>
          )}

          {!submitSuccess && (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Category */}
              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                  Product Category <span className="text-red-500">*</span>
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
                >
                  <option value="Electronics">Electronics (Phone, Laptop, Headphones, Charger)</option>
                  <option value="Bags/Wallets">Bags, Wallets & Backpacks</option>
                  <option value="Jewelry">Jewelry & Watches</option>
                  <option value="Documents">College ID Cards, Hall Tickets & Passports</option>
                  <option value="Keys/Cards">Keys, ATM Cards & Metro Cards</option>
                  <option value="Books/Notes">Books, Notebooks & Scientific Calculators</option>
                  <option value="Other">Other Items</option>
                </select>
              </div>

              {/* Title */}
              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                  Item Title / Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Space Grey MacBook Air M2, Black Leather Fossil Wallet"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 placeholder-slate-400 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
                />
              </div>

              {/* Brand & Model */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                    Brand / Manufacturer
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Apple, Samsung, Lenovo, Wildcraft"
                    value={formData.brand}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 placeholder-slate-400 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                    Model or Series
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Galaxy S23, ThinkPad T14"
                    value={formData.model}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 placeholder-slate-400 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
                  />
                </div>
              </div>

              {/* Color & Lost Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                    Color & Distinguishing Features
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Midnight Blue with NASA sticker on corner"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 placeholder-slate-400 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                    Date Lost
                  </label>
                  <input
                    type="date"
                    value={formData.lostDate}
                    onChange={(e) => setFormData({ ...formData, lostDate: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
                  />
                </div>
              </div>

              {/* Location Lost */}
              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                  Location Last Seen <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Lecture Hall 402, Basketball Court, Cafeteria"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 placeholder-slate-400 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
                />
              </div>

              {/* Image Upload Feature */}
              <ImageUpload
                label="Provide Image of Lost Product"
                sublabel="Upload a previous photo of your item or a reference picture from the internet showing the exact model."
                value={imageUrl}
                onChange={(url) => setImageUrl(url)}
              />

              {/* Contact Phone */}
              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                  Contact Phone / WhatsApp Number
                </label>
                <input
                  type="tel"
                  placeholder="e.g. +91 98765 43210 (so finder or campus security can reach you)"
                  value={formData.contactPhone}
                  onChange={(e) =>
                    setFormData({ ...formData, contactPhone: e.target.value })
                  }
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 placeholder-slate-400 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                  Detailed Description & Contents
                </label>
                <textarea
                  rows={4}
                  placeholder="Describe any specific contents (e.g. cards inside wallet, keychain attached, marks, scratches, exact circumstances of loss)."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 placeholder-slate-400 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className={`w-full py-3.5 px-6 rounded-xl font-bold text-white shadow-md transition flex items-center justify-center gap-2 ${
                  isSubmitting
                    ? "bg-blue-400 cursor-not-allowed"
                    : "bg-blue-600 hover:bg-blue-700 active:scale-[0.99]"
                }`}
              >
                {isSubmitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Filing Report to Database...</span>
                  </>
                ) : (
                  <span>Submit Lost Item Report</span>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
