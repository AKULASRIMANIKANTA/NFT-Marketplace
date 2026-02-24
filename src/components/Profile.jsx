"use client";

import React, { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { ethers } from "ethers";

import UserNfts from "./UserNfts";
import OwnedListings from "./OwnedListings";

import {
  NftCollection,
  CollectionABI,
  NftMarketPlace,
  MarketABI,
} from "../constants";

export default function Profile() {
  const { address, isConnected } = useAccount();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pendingSales, setPendingSales] = useState([]);
  const [stats, setStats] = useState({
    totalOwned: 0,
    totalListed: 0,
    totalSold: 0,
    earnings: "0",
    transfers: 0,
  });

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!mounted || !address) return;
    loadAnalytics();
  }, [mounted, address]);

  async function loadAnalytics(isRefresh = false) {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const currentBlock = await provider.getBlockNumber();
      const fromBlock = currentBlock > 50000 ? currentBlock - 50000 : 0;
      const collection = new ethers.Contract(NftCollection, CollectionABI, provider);
      const market = new ethers.Contract(NftMarketPlace, MarketABI, signer);

      /* 1. NFTs OWNED */
      let ownedCount = 0;
      try {
        const ownedTokens = await collection.tokensOwned(address);
        ownedCount = ownedTokens.length;
      } catch {
        const balance = await collection.balanceOf(address);
        ownedCount = Number(balance);
      }

      /* 2. LISTINGS (Separating Active from Pending) */
      const allMyListings = await market.getSellerNftListigs();
      const activeItems = allMyListings.filter(l => !l.isSold);
      const pendingItems = allMyListings.filter(l => l.isSold);
      setPendingSales(pendingItems);

      /* 3. SOLD COUNT (Using Indexed Filter) */
      let totalSold = 0;
      try {
        // Use the deployment block 10297947 from your screenshot
        const filter = market.filters.NFTSold(null, address);
        const soldEvents = await market.queryFilter(filter, fromBlock);
        totalSold = soldEvents.length;
      } catch (err) {
        console.log("Sold fetch error:", err);
      }

      /* 4. EARNINGS */
      let earningsWei = 0n;
      try {
        earningsWei = await market.getSellerEarnings(address);
      } catch (err) {
        console.log("Earnings fetch error:", err);
      }

      /* 5. TRANSFERS */
      const sentEvents = await collection.queryFilter(collection.filters.Transfer(address, null));
      const receivedEvents = await collection.queryFilter(collection.filters.Transfer(null, address));
      
      setStats({
        totalOwned: ownedCount,
        totalListed: activeItems.length,
        totalSold: totalSold,
        earnings: earningsWei > 0n ? ethers.formatEther(earningsWei) : "0",
        transfers: sentEvents.length + receivedEvents.length,
      });
    } catch (err) {
      console.error("Profile analytics error:", err);
    }
    setLoading(false);
    setRefreshing(false);
  }

  async function handleFinalize(tokenId) {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const market = new ethers.Contract(NftMarketPlace, MarketABI, signer);

      const tx = await market.finalizeSale(tokenId);
      await tx.wait();
      loadAnalytics(true); 
    } catch (err) {
      console.error("Finalize error:", err);
      alert("Failed to finalize: " + (err.reason || err.message));
    }
  }

  if (loading) return <div className="text-center text-gray-400 py-20 italic">Gathering blockchain data...</div>;
  if (!mounted || !isConnected) return null;

  return (
    <div className="w-full space-y-8 pb-20">
      {/* CONNECTED WALLET & REFRESH */}
      <div className="backdrop-blur-xl bg-white/5 border border-white/10 p-8 rounded-2xl shadow-2xl">
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-2xl font-bold text-white">Connected Wallet</h2>
          <button 
            onClick={() => loadAnalytics(true)}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 transition-all active:scale-95 disabled:opacity-50"
          >
            <span className={`text-lg ${refreshing ? "animate-spin" : ""}`}>↻</span>
            {refreshing ? "Refreshing..." : "Refresh Stats"}
          </button>
        </div>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="text-gray-400 text-sm break-all font-mono">{address}</div>
          <div className="px-4 py-2 rounded-xl bg-green-500/20 text-green-400 border border-green-400/20 text-sm font-semibold">
            Active
          </div>
        </div>
      </div>

      {/* ANALYTICS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card title="NFTs Owned" value={stats.totalOwned} />
        <Card title="Listed NFTs" value={stats.totalListed} />
        <Card title="Sold NFTs" value={stats.totalSold} />
        <Card title="Total Earnings" value={`${parseFloat(stats.earnings).toFixed(4)} ETH`} />
        <Card title="Transfers" value={stats.transfers} />
      </div>

      {/* PENDING FINALIZATION SECTION */}
      {pendingSales.length > 0 && (
        <div className="pt-8">
          <div className="flex items-center gap-3 mb-6">
            <h2 className="text-2xl font-bold text-white">Pending Finalization</h2>
            <span className="bg-orange-500 text-white text-xs px-2 py-1 rounded-full animate-pulse">
              {pendingSales.length} Action Required
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {pendingSales.map((item, i) => (
              <PendingCard key={i} item={item} onFinalize={handleFinalize} />
            ))}
          </div>
        </div>
      )}

      {/* ASSETS SECTION */}
      <div className="pt-8 space-y-12">
        <div>
          <UserNfts />
        </div>
      </div>
    </div>
  );
}

function PendingCard({ item, onFinalize }) {
  const [timeLeft, setTimeLeft] = useState("");
  const [canFinalize, setCanFinalize] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      const now = Math.floor(Date.now() / 1000);
      const unlockTime = Number(item.listingTime) + 86400; // 24 hours in seconds
      const diff = unlockTime - now;

      if (diff <= 0) {
        setTimeLeft("Ready to Finalize");
        setCanFinalize(true);
        clearInterval(timer);
      } else {
        const h = Math.floor(diff / 3600);
        const m = Math.floor((diff % 3600) / 60);
        const s = diff % 60;
        setTimeLeft(`${h}h ${m}m ${s}s`);
        setCanFinalize(false);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [item.listingTime]);

  return (
    <div className="bg-white/5 border border-white/10 backdrop-blur-md p-6 rounded-2xl shadow-xl hover:border-orange-500/50 transition-colors">
      <div className="flex justify-between items-start mb-4">
        <span className="text-orange-400 text-xs font-bold uppercase tracking-wider">Escrow Locked</span>
        <span className="text-white text-sm font-mono">{ethers.formatEther(item.price)} ETH</span>
      </div>
      <h3 className="text-white font-semibold mb-1">Token #{item.tokenId.toString()}</h3>
      <div className="mt-4 mb-6">
        <p className="text-gray-500 text-[10px] uppercase mb-1 tracking-widest">Unlocks In</p>
        <p className={`text-xl font-mono ${canFinalize ? 'text-green-400' : 'text-white'}`}>{timeLeft}</p>
      </div>
      <button
        disabled={!canFinalize}
        onClick={() => onFinalize(item.tokenId)}
        className={`w-full py-3 rounded-xl font-bold transition-all ${
          canFinalize 
          ? "bg-green-600 hover:bg-green-500 text-white shadow-lg shadow-green-900/40" 
          : "bg-gray-800 text-gray-500 cursor-not-allowed"
        }`}
      >
        {canFinalize ? "Finalize & Clear" : "Wait for Dispute Window"}
      </button>
    </div>
  );
}

function Card({ title, value }) {
  return (
    <div className="bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 p-6 rounded-2xl shadow-lg hover:scale-105 transition-all duration-300">
      <h3 className="text-gray-400 text-sm tracking-wide uppercase">{title}</h3>
      <p className="text-3xl font-bold mt-3 text-white">{value}</p>
    </div>
  );
}