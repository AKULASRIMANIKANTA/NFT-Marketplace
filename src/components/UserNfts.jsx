"use client";

import React, { useEffect, useState, useCallback} from "react";
import { useAccount, useContractRead } from "wagmi";
import {
  NftCollection,
  CollectionABI,
  MarketABI,
  NftMarketPlace,
} from "../constants";
import { SellModal } from "./SellModal";
import { TransferModal } from "./TransferModal";
import { ethers } from "ethers";

export default function UserNfts() {
  const { address, isConnected } = useAccount();

  /* ---------------- CLIENT ONLY ---------------- */
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  /* ---------------- STATE ---------------- */
  const [tokenIds, setTokenIds] = useState([]);
  const [metadataList, setMetadataList] = useState([]);
  const [openSellModal, setOpenSellModal] = useState(false);
  const [openTransferModal, setOpenTransferModal] = useState(false);
  const [selectedTokenId, setSelectedTokenId] = useState(null);

  /* clear data when wallet changes */
  useEffect(() => {
    setTokenIds([]);
    setMetadataList([]);
  }, [address]);

  const metadataKeys = {
    title: 0,
    description: 1,
    image: 2,
  };

  /* ---------------- READ CONTRACTS ---------------- */

  useContractRead({
    address: NftCollection,
    abi: CollectionABI,
    functionName: "tokensOwned",
    args: address ? [address] : undefined,
    enabled: !!address,
    onSuccess(data) {
      setTokenIds(data.map((id) => id.toString()));
    },
  });

  const { data: collectionName } = useContractRead({
    address: NftCollection,
    abi: CollectionABI,
    functionName: "name",
    enabled: !!address,
  });

  const { data: isApproved } = useContractRead({
    address: NftCollection,
    abi: CollectionABI,
    functionName: "isApprovedForAll",
    args: address ? [address, NftMarketPlace] : undefined,
    enabled: !!address,
  });

  /* ---------------- ACTIONS ---------------- */

  async function approve() {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const contract = new ethers.Contract(
      NftCollection,
      CollectionABI,
      signer
    );
    const tx = await contract.setApprovalForAll(NftMarketPlace, true);
    await tx.wait();
  }
  const fetchTokenMetadata = useCallback(async (tokenId) => {
  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();
  const contract = new ethers.Contract(NftCollection, CollectionABI, signer);

  const data = await contract.tokenMetadata(tokenId);
  return {
    tokenId,
    title: data[metadataKeys.title],
    description: data[metadataKeys.description],
    image: data[metadataKeys.image],
  };
}, [metadataKeys.title, metadataKeys.description, metadataKeys.image]);

  /* ----------------List Nfts---------------- */
  async function listNft(tokenId, priceInUSD, arbiter) {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      const marketplace = new ethers.Contract(
        NftMarketPlace,
        MarketABI,
        signer
      );

      if (!priceInUSD || Number(priceInUSD) <= 0) {
        alert("Enter valid price");
        return;
      }

      const tx = await marketplace.listNFT(
        Number(tokenId),
        ethers.toBigInt(priceInUSD), // IMPORTANT
        arbiter,
        {
          value: ethers.parseEther("0.01"),
        }
      );

      await tx.wait();
      alert("NFT listed successfully!");
    } catch (err) {
      console.error(err);
      alert("Listing failed");
    }
  }

  /* ---------------- Transfer NFT ---------------- */
  async function transferNft(from, to, tokenId) {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      const contract = new ethers.Contract(
        NftCollection,
        CollectionABI,
        signer
      );

      const tx = await contract.safeTransferFrom(from, to, tokenId);
      await tx.wait();

      alert("NFT transferred successfully!");
    } catch (err) {
      console.error(err);
      alert("Transfer failed");
    }
    window.location.reload();
  }

  /* ---------------- FETCH METADATA ---------------- */

  useEffect(() => {
  if (!mounted || tokenIds.length === 0) return;

  Promise.all(tokenIds.map(fetchTokenMetadata))
    .then(setMetadataList)
    .catch(console.error);
}, [tokenIds, mounted, fetchTokenMetadata]); // Added fetchTokenMetadata here

  /* ---------------- HARD EXIT ---------------- */

  if (!mounted || !isConnected) return null;


  /* ---------------- UI ---------------- */
return (
  <div className="w-full mt-10">
    
    {/* GLASS SECTION HEADER */}
    <div className="backdrop-blur-xl bg-white/5 border border-white/10 
                    text-white p-6 rounded-2xl mb-8 shadow-xl">
      <h2 className="text-2xl font-bold tracking-wide">My NFTs</h2>
      <p className="text-gray-400 text-sm mt-1">
        Assets owned by your connected wallet
      </p>

      {/* APPROVAL STATUS */}
      <div className="mt-4">
        {isApproved === undefined && (
          <p className="text-gray-400 text-sm">
            Checking marketplace approval...
          </p>
        )}

        {isApproved === false && (
          <div className="flex items-center gap-3 mt-2">
            <span className="text-yellow-400 text-sm">
              Wallet not approved for marketplace
            </span>
            <button
              onClick={approve}
              className="bg-blue-600 hover:bg-blue-500 px-4 py-1 rounded-lg text-sm font-semibold shadow"
            >
              Approve
            </button>
          </div>
        )}

        {isApproved === true && (
          <div className="text-green-400 text-sm font-semibold mt-2">
            ✓ Marketplace Approved
          </div>
        )}
      </div>
    </div>

    {/* NFT GRID */}
    {metadataList.length === 0 ? (
        <div className="backdrop-blur-xl bg-white/5 border border-white/10 
                        rounded-2xl text-center py-20 px-6 shadow-xl 
                        flex flex-col items-center justify-center gap-4">

          <div className="text-5xl">🎨</div>

          <h2 className="text-2xl font-semibold text-white">
            No NFTs in your wallet
          </h2>

          <p className="text-gray-400 max-w-md">
            You haven&apos;t minted or received any NFTs yet.  
            Start by creating your first NFT.
          </p>

          <a
            href="/create"
            className="mt-4 bg-blue-600 hover:bg-blue-500 
                      px-6 py-2 rounded-xl text-white font-semibold 
                      shadow-lg transition"
          >
            Mint NFT
          </a>

        </div>
      ) : (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">

        {metadataList.map((nft) => (
          <div
            key={nft.tokenId}
            className="group relative backdrop-blur-xl bg-white/5 
                       border border-white/10 rounded-2xl 
                       overflow-hidden shadow-xl transition-all 
                       duration-300 hover:scale-[1.03] hover:shadow-2xl"
          >

            {/* IMAGE */}
            <div className="relative h-64 overflow-hidden">
              {nft.image && (
                <img
                  src={nft.image}
                  alt="NFT"
                  className="w-full h-full object-cover 
                             transition-transform duration-500 
                             group-hover:scale-110"
                />
              )}

              {/* HOVER OVERLAY */}
              <div className="absolute inset-0 bg-black/50 opacity-0 
                              group-hover:opacity-100 transition 
                              flex items-center justify-center gap-3">

                <button
                  onClick={() => {
                    setSelectedTokenId(nft.tokenId);
                    setOpenSellModal(true);
                  }}
                  className="bg-green-600 hover:bg-green-500 
                             px-4 py-2 rounded-xl text-sm font-semibold shadow-lg"
                >
                  Sell
                </button>

                <button
                  onClick={() => {
                    setSelectedTokenId(nft.tokenId);
                    setOpenTransferModal(true);
                  }}
                  className="bg-purple-600 hover:bg-purple-500 
                             px-4 py-2 rounded-xl text-sm font-semibold shadow-lg"
                >
                  Transfer
                </button>
              </div>
            </div>

            {/* CONTENT */}
            <div className="p-6 text-white flex flex-col gap-2">

              <h3 className="text-lg font-bold tracking-wide">
                {nft.title}
              </h3>

              <p className="text-gray-400 text-sm">
                {collectionName}
              </p>

              {/* GRADIENT ACCENT LINE */}
              <div className="h-[2px] w-full bg-gradient-to-r 
                              from-purple-500 via-blue-500 to-cyan-400 
                              rounded-full mt-3 opacity-60" />
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

    {/* MODALS */}
    <SellModal
      open={openSellModal}
      handleClose={() => setOpenSellModal(false)}
      tokenId={selectedTokenId}
      listNft={listNft}
    />

    <TransferModal
      open={openTransferModal}
      handleClose={() => setOpenTransferModal(false)}
      tokenId={selectedTokenId}
      address={address}
      transferNft={transferNft}
    />
  </div>
);
}
