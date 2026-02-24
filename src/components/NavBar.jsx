"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import Link from "next/link";
import { CgProfile } from "react-icons/cg";

export function NavBar() {
  return (
    <nav className="w-full sticky top-0 z-50 
                    backdrop-blur-xl bg-[#020617]/70 
                    border-b border-white/10 shadow-lg">

      <div className="max-w-7xl mx-auto px-6 py-3 flex justify-between items-center">
      <Link href="/">
          <h1 className="text-2xl font-bold tracking-wide 
                         bg-gradient-to-r from-blue-400 to-purple-500 
                         bg-clip-text text-transparent">
            NFT Marketplace
          </h1>
        </Link>
        {/* LEFT LINKS */}
        <div className="flex gap-6 text-sm font-medium text-gray-300">
          <Link href="/" className="hover:text-white transition">
            Home
          </Link>

          <Link href="/create" className="hover:text-white transition">
            Create
          </Link>

          <Link href="/market" className="hover:text-white transition">
            Market
          </Link>

          <Link href="/transfer-history" className="hover:text-white transition">
            Transfers
          </Link>
        </div>

        {/* RIGHT SIDE */}
        <div className="flex items-center gap-4">

          {/* WALLET CONNECT / DISCONNECT */}
          <div className="scale-[0.95]">
            <ConnectButton
              showBalance={true}
              accountStatus={{
                smallScreen: "avatar",
                largeScreen: "full",
              }}
            />
          </div>

          {/* PROFILE ICON */}
          <Link
            href="/profile"
            className="p-2 rounded-full bg-white/5 border border-white/10 
                       hover:bg-white/10 transition text-white"
          >
            <CgProfile size={20} />
          </Link>

        </div>
      </div>

      {/* subtle gradient accent line */}
      <div className="h-[1px] w-full bg-gradient-to-r 
                      from-transparent via-blue-500/40 to-transparent" />
    </nav>
  );
}