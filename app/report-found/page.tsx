"use client";
import { useState } from "react";
import { useSession } from "next-auth/react";

export default function ReportFound() {
  const { data: session } = useSession();
  const [category, setCategory] = useState("Electronics");

  // Basic Form States
  const [formData, setFormData] = useState({
    title: "",
    brand: "",
    model: "",
    color: "",
    location: "",
    hiddenQuestion: "", // The user security question
    hiddenAnswer: "",   // The answer they expect
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const response = await fetch("/api/reports", {
      method: "POST",
      body: JSON.stringify({ ...formData, category, type: "FOUND", userEmail: session?.user?.email }),
    });
    if (response.ok) alert("Reported successfully!");
  };

  if (!session) return <p className="p-10 text-center">Please login first.</p>;

  return (
    <div className="max-w-2xl mx-auto p-8 bg-white shadow-md mt-10 rounded-lg">
      <h1 className="text-2xl font-bold mb-6 text-green-700">Report a Found Product</h1>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Category Selector */}
        <div>
          <label className="block font-semibold">Category</label>
          <select 
            value={category} 
            onChange={(e) => setCategory(e.target.value)}
            className="w-full p-2 border rounded"
          >
            <option>Electronics</option>
            <option>Jewelry</option>
            <option>Bags/Wallets</option>
            <option>Documents</option>
          </select>
        </div>

        <input type="text" placeholder="Title (e.g. Blue HP Laptop)" className="w-full p-2 border rounded" required 
          onChange={(e) => setFormData({...formData, title: e.target.value})} />

        <div className="grid grid-cols-2 gap-4">
          <input type="text" placeholder="Brand" className="w-full p-2 border rounded" 
            onChange={(e) => setFormData({...formData, brand: e.target.value})} />
          <input type="text" placeholder="Model" className="w-full p-2 border rounded" 
            onChange={(e) => setFormData({...formData, model: e.target.value})} />
        </div>

        <input type="text" placeholder="Color" className="w-full p-2 border rounded" 
          onChange={(e) => setFormData({...formData, color: e.target.value})} />

        <input type="text" placeholder="Location Found (e.g. Library 2nd Floor)" className="w-full p-2 border rounded" 
          onChange={(e) => setFormData({...formData, location: e.target.value})} />

        {/* SECURE FEATURE: HIDDEN DETAIL */}
        <div className="bg-yellow-50 p-4 border border-yellow-200 rounded">
          <h2 className="font-bold text-yellow-800 mb-2">Security Verification (Hidden Detail)</h2>
          <p className="text-xs text-yellow-700 mb-2">This will be hidden from everyone until a matching lost report is found.</p>
          <input type="text" placeholder="Question: e.g. What is the wallpaper on the phone?" 
            className="w-full p-2 border rounded mb-2" 
            onChange={(e) => setFormData({...formData, hiddenQuestion: e.target.value})} />
          <input type="text" placeholder="Correct Answer" 
            className="w-full p-2 border rounded" 
            onChange={(e) => setFormData({...formData, hiddenAnswer: e.target.value})} />
        </div>

        <button type="submit" className="w-full bg-green-600 text-white p-3 rounded font-bold hover:bg-green-700">
          Submit Found Report
        </button>
      </form>
    </div>
  );
}