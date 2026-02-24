"use client";
import React, { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { ethers } from "ethers";
import { NftCollection, CollectionABI } from "../constants";

export default function TransferHistory() {
  const { address } = useAccount();

  const [transfers, setTransfers] = useState([]);
  const [filter, setFilter] = useState("all"); // all | sent | received

  useEffect(() => {
    if (!address) return;

    fetchTransferHistory();
    setupRealtimeListener();
  }, [address]);

  /* ---------------- FETCH NFT METADATA ---------------- */
  async function fetchMetadata(tokenId) {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const contract = new ethers.Contract(
      NftCollection,
      CollectionABI,
      provider
    );

    const metadata = await contract.tokenMetadata(tokenId);

    return {
      title: metadata[0],
      description: metadata[1],
      image: metadata[2],
    };
  }

  /* ---------------- FETCH TRANSFER HISTORY ---------------- */
  async function fetchTransferHistory() {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const contract = new ethers.Contract(
        NftCollection,
        CollectionABI,
        provider
      );

      const sentFilter = contract.filters.Transfer(address, null);
      const receivedFilter = contract.filters.Transfer(null, address);

      const sentEvents = await contract.queryFilter(sentFilter);
      const receivedEvents = await contract.queryFilter(receivedFilter);

      const allEvents = [...sentEvents, ...receivedEvents];

      const formatted = await Promise.all(
        allEvents.map(async (event) => {
          const tokenId = event.args.tokenId.toString();

          const meta = await fetchMetadata(tokenId);
          const block = await event.getBlock();

          return {
            from: event.args.from,
            to: event.args.to,
            tokenId,
            txHash: event.transactionHash,
            image: meta.image,
            title: meta.title,
            timestamp: block.timestamp,
          };
        })
      );

      formatted.sort((a, b) => b.timestamp - a.timestamp);
      setTransfers(formatted);
    } catch (err) {
      console.error("Transfer history fetch error:", err);
    }
  }

  /* ---------------- REALTIME TRACKING ---------------- */
  function setupRealtimeListener() {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const contract = new ethers.Contract(
      NftCollection,
      CollectionABI,
      provider
    );

    contract.on("Transfer", () => {
      fetchTransferHistory();
    });

    return () => contract.removeAllListeners("Transfer");
  }

  /* ---------------- FILTER ---------------- */
  const filteredTransfers = transfers.filter((t) => {
    if (filter === "sent")
      return t.from?.toLowerCase() === address?.toLowerCase();
    if (filter === "received")
      return t.to?.toLowerCase() === address?.toLowerCase();
    return true;
  });

  /* ---------------- UI ---------------- */
  return (
  <div className="min-h-screen w-full px-6 py-8 
                  bg-gradient-to-br from-[#020617] via-[#020617] to-black">

    {/* GLASS HEADER */}
    <div className="backdrop-blur-xl bg-white/5 border border-white/10 
                    text-white p-8 rounded-2xl mb-10 shadow-2xl">
      <h1 className="text-4xl font-bold mb-2 tracking-wide">
        Transfer History
      </h1>
      <p className="text-gray-400">
        Track NFTs sent and received from your wallet
      </p>

      {/* FILTER BUTTONS */}
      <div className="flex gap-3 mt-6 flex-wrap">
        {["all", "sent", "received"].map((type) => (
          <button
            key={type}
            onClick={() => setFilter(type)}
            className={`px-4 py-2 rounded-xl font-semibold transition
              ${
                filter === type
                  ? "bg-blue-600 text-white shadow-lg"
                  : "bg-white/5 text-gray-300 border border-white/10 hover:bg-white/10"
              }`}
          >
            {type.toUpperCase()}
          </button>
        ))}
      </div>
    </div>

    {/* EMPTY STATE */}
    {filteredTransfers.length === 0 ? (
      <div className="backdrop-blur-xl bg-white/5 border border-white/10 
                      rounded-2xl text-center py-20 text-gray-400 shadow">
        No transfer history found
      </div>
    ) : (

      /* GRID */
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">

        {filteredTransfers.map((t, index) => (
          <div
            key={index}
            className="group relative backdrop-blur-xl bg-white/5 
                       border border-white/10 rounded-2xl 
                       overflow-hidden shadow-xl transition-all 
                       duration-300 hover:scale-[1.03] hover:shadow-2xl"
          >

            {/* IMAGE */}
            {t.image && (
              <div className="relative h-64 overflow-hidden">
                <img
                  src={t.image}
                  alt="NFT"
                  className="w-full h-full object-cover 
                             transition-transform duration-500 
                             group-hover:scale-110"
                />

                {/* STATUS BADGE */}
                <div className="absolute top-4 left-4">
                  {t.from?.toLowerCase() === address?.toLowerCase() ? (
                    <span className="text-xs bg-red-600/90 px-3 py-1 rounded-full shadow">
                      SENT
                    </span>
                  ) : (
                    <span className="text-xs bg-green-600/90 px-3 py-1 rounded-full shadow">
                      RECEIVED
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* CONTENT */}
            <div className="p-6 text-white flex flex-col gap-2">

              <h3 className="text-lg font-bold tracking-wide">
                Token #{t.tokenId}
              </h3>

              <p className="text-gray-400 text-sm">
                {t.title}
              </p>

              {/* WALLET INFO */}
              <div className="text-xs text-gray-400 mt-3 break-all">
                <p><b>From:</b> {t.from}</p>
                <p><b>To:</b> {t.to}</p>
              </div>

              {/* TIMESTAMP */}
              <p className="text-xs text-gray-500 mt-2">
                {new Date(t.timestamp * 1000).toLocaleString()}
              </p>

              {/* ETHERSCAN */}
              <a
                href={`https://sepolia.etherscan.io/tx/${t.txHash}`}
                target="_blank"
                className="text-blue-400 text-sm mt-3 hover:underline"
              >
                View Transaction →
              </a>

              {/* GRADIENT ACCENT LINE */}
              <div className="h-[2px] w-full bg-gradient-to-r 
                              from-purple-500 via-blue-500 to-cyan-400 
                              rounded-full mt-4 opacity-60" />
            </div>

            {/* SUBTLE GLOW */}
            <div className="absolute inset-0 rounded-2xl 
                            ring-1 ring-white/5 
                            group-hover:ring-blue-400/30 
                            transition pointer-events-none" />
          </div>
        ))}
      </div>
    )}
  </div>
);
}