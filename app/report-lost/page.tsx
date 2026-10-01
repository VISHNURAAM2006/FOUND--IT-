"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ImageUpload from "@/components/ImageUpload";
import { VisualFeatures, MatchResult } from "@/lib/ai-matcher";
import AiMatchCard from "@/components/AiMatchCard";
import VerificationModal from "@/components/VerificationModal";

export default function ReportLostPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

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
  const [visualFeatures, setVisualFeatures] = useState<VisualFeatures | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [recommendations, setRecommendations] = useState<MatchResult[]>([]);
  const [verifyingReport, setVerifyingReport] = useState<any | null>(null);

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
          visualFeatures,
          userEmail: session?.user?.email || "anonymous",
          userName: session?.user?.name || "Found!t User",
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSubmitSuccess(true);
        if (data.recommendations && Array.isArray(data.recommendations)) {
          setRecommendations(data.recommendations);
        }
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
    setVisualFeatures(null);
    setRecommendations([]);
    setVerifyingReport(null);
    setSubmitSuccess(false);
    setErrorMessage("");
  };

  const handleStartChatWithFounder = async (
    report: any,
    founderEmailOverride?: string,
    founderNameOverride?: string
  ) => {
    if (!session?.user?.email) return;

    const fEmail = founderEmailOverride || report.userEmail;
    const fName = founderNameOverride || report.userName || "Founder";

    try {
      const res = await fetch("/api/chats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportId: report._id,
          reportTitle: report.title,
          reportCategory: report.category,
          reportImageUrl: report.imageUrl || null,
          founderEmail: fEmail,
          founderName: fName,
          claimantEmail: session.user.email,
          claimantName: session.user.name || "Claimant",
        }),
      });

      const data = await res.json();
      if (data.success) {
        setVerifyingReport(null);
        router.push("/");
      } else {
        alert(data.error || "Failed to start chat.");
      }
    } catch (err) {
      console.error("Error creating chat:", err);
      alert("Network error opening chat.");
    }
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
      {/* Verification Challenge Modal if user verifies a recommended found item */}
      {verifyingReport && session.user?.email && (
        <VerificationModal
          report={verifyingReport}
          userEmail={session.user.email}
          userName={session.user.name || "Student"}
          onClose={() => setVerifyingReport(null)}
          onStartChat={(rep, fEmail, fName) =>
            handleStartChatWithFounder(rep, fEmail, fName)
          }
          onUnlocked={(updated) => {
            setRecommendations((prev) =>
              prev.map((m) =>
                m.report._id === updated._id ? { ...m, report: updated } : m
              )
            );
          }}
        />
      )}

      <div className="max-w-4xl mx-auto">
        {/* Navigation Bar */}
        <div className="flex items-center justify-between mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-slate-900 bg-white px-4 py-2 rounded-xl shadow-xs border border-slate-200 hover:bg-slate-100 transition"
          >
            <span>←</span> Back to Dashboard
          </Link>
          <span className="text-xs bg-blue-100 text-blue-800 font-semibold px-3 py-1 rounded-full">
            Filing as: {session.user?.email}
          </span>
        </div>

        {/* Card Container */}
        <div className="bg-white rounded-3xl shadow-md border border-slate-200 p-6 sm:p-10">
          <div className="border-b border-slate-100 pb-5 mb-8">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center text-2xl font-bold">
                🔍
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
                  File a Lost Product Report
                </h1>
                <p className="text-sm text-slate-500 mt-1">
                  Submit details of your lost belonging. Our multi-modal AI engine will instantly scan campus found items.
                </p>
              </div>
            </div>
          </div>

          {/* Success Banner & AI Recommendations */}
          {submitSuccess && (
            <div className="space-y-8 animate-in fade-in duration-300">
              <div className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-3xl text-center">
                <div className="w-12 h-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center mx-auto mb-3 text-2xl font-bold shadow-md shadow-blue-200">
                  ✓
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-1">
                  Lost Product Complaint Filed Successfully!
                </h3>
                <p className="text-sm text-slate-600 mb-6 max-w-lg mx-auto">
                  Your report is now live in the database. Our AI system compared your image and description against all found products.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Link
                    href="/"
                    className="px-6 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition shadow-xs text-sm"
                  >
                    Go to Dashboard
                  </Link>
                  <button
                    onClick={handleReset}
                    className="px-6 py-2.5 bg-white text-slate-700 border border-slate-300 font-semibold rounded-xl hover:bg-slate-50 transition text-sm"
                  >
                    File Another Report
                  </button>
                </div>
              </div>

              {/* AI Recommendation Showcase */}
              <div className="border border-slate-200 rounded-3xl p-6 bg-slate-50/60">
                <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-violet-600 text-white flex items-center justify-center text-xl font-bold shadow-sm shadow-violet-200">
                      🤖
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                        <span>AI Match Recommendations</span>
                        <span className="text-xs bg-violet-100 text-violet-800 font-bold px-2.5 py-0.5 rounded-full border border-violet-200">
                          {recommendations.length} Found
                        </span>
                      </h3>
                      <p className="text-xs text-slate-500">
                        Ranked using Vision Shape/Color Analysis &amp; Semantic Description Matching
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] font-bold text-violet-700 bg-white px-3 py-1 rounded-full border border-violet-200 shadow-2xs">
                    Multi-Modal Vision + NLP
                  </span>
                </div>

                {recommendations.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {recommendations.map((rec, idx) => (
                      <AiMatchCard
                        key={rec.report._id || idx}
                        match={rec}
                        onVerify={(rep) => setVerifyingReport(rep)}
                        onStartChat={(rep) => handleStartChatWithFounder(rep)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="py-10 text-center bg-white rounded-2xl border border-slate-200 p-6">
                    <span className="text-3xl block mb-2">🔍</span>
                    <h4 className="text-sm font-bold text-slate-800 mb-1">
                      No High-Confidence Matches Right Now
                    </h4>
                    <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                      None of the items currently reported found by students closely match your image or description.
                      When a founder reports a matching item, you will be notified on your dashboard!
                    </p>
                  </div>
                )}
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
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-xs"
                >
                  <option value="Electronics">Electronics (Phone, Laptop, Headphones, Charger)</option>
                  <option value="Bags/Wallets">Bags, Wallets &amp; Backpacks</option>
                  <option value="Jewelry">Jewelry &amp; Watches</option>
                  <option value="Documents">College ID Cards, Hall Tickets &amp; Passports</option>
                  <option value="Keys/Cards">Keys, ATM Cards &amp; Metro Cards</option>
                  <option value="Books/Notes">Books, Notebooks &amp; Scientific Calculators</option>
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
                  placeholder="e.g. Space Grey MacBook Air M2, Black Leather Fossil Wallet, White AirPods Pro"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 placeholder-slate-400 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-xs"
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
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 placeholder-slate-400 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-xs"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                    Model or Series
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Galaxy S23, ThinkPad T14, AirPods Pro 2"
                    value={formData.model}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 placeholder-slate-400 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-xs"
                  />
                </div>
              </div>

              {/* Color & Lost Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                    Color &amp; Distinguishing Features
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Midnight Blue, Space Grey, Matte Black"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 placeholder-slate-400 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-xs"
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
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-xs"
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
                  placeholder="e.g. Central Library 2nd Floor, Basketball Court, Cafeteria"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 placeholder-slate-400 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-xs"
                />
              </div>

              {/* Image Upload Feature with AI Visual Embedding */}
              <ImageUpload
                label="Provide Image of Lost Product (AI Visual Matching)"
                sublabel="Upload a previous photo of your item or a reference picture. Our AI compares shape contours and color histograms against found products."
                value={imageUrl}
                onChange={(url, vf) => {
                  setImageUrl(url);
                  setVisualFeatures(vf || null);
                }}
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
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 placeholder-slate-400 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-xs"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                  Detailed Description &amp; Contents
                </label>
                <textarea
                  rows={4}
                  placeholder="Describe unique details (e.g. scratches on left side, case design, stickers, keychain attached, contents inside)."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 placeholder-slate-400 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-xs"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className={`w-full py-3.5 px-6 rounded-2xl font-bold text-white shadow-md transition flex items-center justify-center gap-2 ${
                  isSubmitting
                    ? "bg-blue-400 cursor-not-allowed"
                    : "bg-blue-600 hover:bg-blue-700 active:scale-[0.99]"
                }`}
              >
                {isSubmitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Filing Report &amp; Running AI Multi-Modal Match...</span>
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
