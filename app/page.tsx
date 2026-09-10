"use client";
import { signIn, signOut, useSession } from "next-auth/react";

export default function LoginPage() {
  const { data: session } = useSession();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <div className="p-10 bg-white rounded-xl shadow-lg text-center">
        <h1 className="text-3xl font-bold mb-6 text-blue-600">Found!t</h1>
        <p className="text-gray-600 mb-8">College Campus Lost & Found Platform</p>

        {!session ? (
          <button
            onClick={() => signIn("google")}
            className="px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition"
          >
            Sign in with Gmail
          </button>
        ) : (
          <div>
            <p className="mb-4">Welcome, <strong>{session.user?.name}</strong>!</p>
            <button
              onClick={() => signOut()}
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
            >
              Logout
            </button>
          </div>
        )}
      </div>
    </div>
  );
}