"use client";

import { useEffect, useState } from "react";
import Profile from "../../components/Profile";

export default function ProfilePage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <main className="min-h-screen bg-gradient-to-br from-black via-gray-950 to-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-6 py-10">

        <div className="text-center mb-10">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-purple-400 to-blue-500 bg-clip-text text-transparent">
            My Profile
          </h1>
          <p className="text-gray-400 mt-2">
            Manage your NFTs, listings and transactions
          </p>
        </div>

        <Profile />

      </div>
    </main>
  );
}