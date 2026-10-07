"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import ImageUpload from "@/components/ImageUpload";
import { VisualFeatures } from "@/lib/ai-matcher";
import CampusLocationSelect from "@/components/CampusLocationSelect";
import SpeechRecognitionButton from "@/components/SpeechRecognitionButton";

export default function ReportFoundPage() {
  const { data: session, status } = useSession();

  const [category, setCategory] = useState("Electronics");
  const [formData, setFormData] = useState({
    title: "",
    brand: "",
    model: "",
    color: "",
    location: "",
    foundDate: new Date().toISOString().split("T")[0],
    description: "",
    hiddenQuestion: "",
    hiddenAnswer: "",
  });
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [visualFeatures, setVisualFeatures] = useState<VisualFeatures | null>(null);

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
          type: "FOUND",
          imageUrl,
          visualFeatures,
          userEmail: session?.user?.email || "anonymous",
          userName: session?.user?.name || "Found!t User",
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSubmitSuccess(true);
      } else {
        setErrorMessage(data.error || "Failed to submit report. Please try again.");
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
      foundDate: new Date().toISOString().split("T")[0],
      description: "",
      hiddenQuestion: "",
      hiddenAnswer: "",
    });
    setImageUrl(null);
    setVisualFeatures(null);
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
            Please log in with your college Gmail to report a found product.
          </p>
          <Link
            href="/"
            className="inline-block px-6 py-3 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition"
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
          <span className="text-xs bg-emerald-100 text-emerald-800 font-semibold px-3 py-1 rounded-full">
            Reporting as: {session.user?.email}
          </span>
        </div>

        {/* Card Container */}
        <div className="bg-white rounded-2xl shadow-md border border-slate-200 p-6 sm:p-10">
          <div className="border-b border-slate-100 pb-5 mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center text-xl font-bold">
                🎁
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
                  Report a Found Product
                </h1>
                <p className="text-sm text-slate-500 mt-1">
                  Help return a lost item to its rightful owner on campus.
                </p>
              </div>
            </div>
          </div>

          {/* Success Banner */}
          {submitSuccess && (
            <div className="mb-8 p-6 bg-emerald-50 border border-emerald-300 rounded-2xl text-center">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto mb-3 text-2xl font-bold">
                ✓
              </div>
              <h3 className="text-xl font-bold text-emerald-900 mb-1">
                Found Product Submitted Successfully!
              </h3>
              <p className="text-sm text-emerald-700 mb-6">
                Your report has been saved to the database. When someone files a matching lost report, the campus system will connect you.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link
                  href="/"
                  className="px-6 py-2.5 bg-emerald-600 text-white font-semibold rounded-xl hover:bg-emerald-700 transition"
                >
                  Return to Dashboard
                </Link>
                <button
                  onClick={handleReset}
                  className="px-6 py-2.5 bg-white text-emerald-700 border border-emerald-300 font-semibold rounded-xl hover:bg-emerald-50 transition"
                >
                  Report Another Item
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
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 shadow-sm"
                >
                  <option value="Electronics">Electronics (Phone, Laptop, Charger, Earbuds)</option>
                  <option value="Bags/Wallets">Bags, Wallets & Backpacks</option>
                  <option value="Jewelry">Jewelry & Watches</option>
                  <option value="Documents">College ID Cards, Hall Tickets & Passports</option>
                  <option value="Keys/Cards">Keys, ATM Cards & Metro Cards</option>
                  <option value="Books/Notes">Books, Notebooks & Calculators</option>
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
                  placeholder="e.g. Blue HP Pavilion Laptop with charger"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 placeholder-slate-400 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 shadow-sm"
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
                    placeholder="e.g. Apple, Dell, Titan, Nike"
                    value={formData.brand}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 placeholder-slate-400 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 shadow-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                    Model or Version
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. iPhone 13, Inspiron 15"
                    value={formData.model}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 placeholder-slate-400 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 shadow-sm"
                  />
                </div>
              </div>

              {/* Color & Found Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                    Primary Color / Appearance
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Matte Black with silver trim"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 placeholder-slate-400 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 shadow-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                    Date Found
                  </label>
                  <input
                    type="date"
                    value={formData.foundDate}
                    onChange={(e) => setFormData({ ...formData, foundDate: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 shadow-sm"
                  />
                </div>
              </div>

              {/* Location Found using Campus KML Markers */}
              <CampusLocationSelect
                value={formData.location}
                onChange={(loc) => setFormData({ ...formData, location: loc })}
                label="Location Found on Campus"
                required={true}
              />

              {/* Image Upload Feature */}
              <ImageUpload
                label="Provide Image of Found Product"
                sublabel="Attach a clear photo of the found item. This helps confirm ownership."
                value={imageUrl}
                onChange={(url, vf) => {
                  setImageUrl(url);
                  setVisualFeatures(vf || null);
                }}
              />

              {/* Security Verification Box */}
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 space-y-3">
                <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
                  <span>🛡️</span>
                  <span>Security Verification (Hidden Detail)</span>
                </div>
                <p className="text-xs text-amber-800 leading-relaxed">
                  Only the real owner will know this detail (e.g., lock screen wallpaper, sticker on back, internal card count). The answer remains confidential and will be used to verify the claimant.
                </p>
                <div>
                  <label className="block text-xs font-semibold text-amber-900 mb-1">
                    Secret Question
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. What picture is on the phone wallpaper or laptop sticker?"
                    value={formData.hiddenQuestion}
                    onChange={(e) =>
                      setFormData({ ...formData, hiddenQuestion: e.target.value })
                    }
                    className="w-full px-4 py-2 rounded-xl border border-amber-300 bg-white text-slate-900 placeholder-slate-400 text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 shadow-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-amber-900 mb-1">
                    Correct Secret Answer
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Golden retriever puppy wallpaper"
                    value={formData.hiddenAnswer}
                    onChange={(e) =>
                      setFormData({ ...formData, hiddenAnswer: e.target.value })
                    }
                    className="w-full px-4 py-2 rounded-xl border border-amber-300 bg-white text-slate-900 placeholder-slate-400 text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 shadow-sm"
                  />
                </div>
              </div>

              {/* Description / Additional Notes with Bilingual Voice Recognition */}
              <div>
                <div className="flex items-center justify-between mb-1.5 flex-wrap gap-2">
                  <label className="block text-sm font-semibold text-slate-800">
                    Additional Notes / Details
                  </label>
                  <SpeechRecognitionButton
                    currentText={formData.description}
                    onTranscript={(text) =>
                      setFormData({ ...formData, description: text })
                    }
                  />
                </div>
                <textarea
                  rows={3}
                  placeholder="Any other details about how or where it was found, custody details, etc. Tap the microphone above to speak in English or தமிழ் (Tamil)!"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 placeholder-slate-400 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 shadow-sm"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className={`w-full py-3.5 px-6 rounded-xl font-bold text-white shadow-md transition flex items-center justify-center gap-2 ${
                  isSubmitting
                    ? "bg-emerald-400 cursor-not-allowed"
                    : "bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99]"
                }`}
              >
                {isSubmitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Saving to Database...</span>
                  </>
                ) : (
                  <span>Submit Found Report</span>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}