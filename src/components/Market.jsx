"use client"
import React, { useEffect, useState } from 'react'
import { useAccount, useContractRead } from 'wagmi'
import { NftCollection, CollectionABI, NftMarketPlace, MarketABI } from '../constants'
import { readContract } from 'wagmi/actions'
import { HiMenu } from 'react-icons/hi'
import { MdOutlineSell, MdOutlineBackspace } from "react-icons/md";
import { ethers } from 'ethers'

export function Market() {
  const { address } = useAccount()
  const [mounted, setMounted] = useState(false);
  const [tokenIds, setTokenIds] = useState([])
  const [metadataList, setMetadataList] = useState([])
  const [menuOpen, setMenuOpen] = useState(null);
  const [loadingMetadata, setLoadingMetadata] = useState(false);

  useEffect(() => setMounted(true), []);

  // 1. Fetch all listings from the contract
  const { data: rawListings, refetch } = useContractRead({
    address: NftMarketPlace,
    abi: MarketABI,
    functionName: "getNftListigs",
    watch: true, 
    onSuccess(data) {
      if (data) {
        // FILTER: Only show items that are actively for sale (isSold must be false)
        const activeListings = data.filter(listing => !listing.isSold);
        
        const tokenIDs = activeListings.map(token => token.tokenId.toString());
        setTokenIds(tokenIDs);
      }
    }
  });

  const { data: listingFee } = useContractRead({
    address: NftMarketPlace,
    abi: MarketABI,
    functionName: "listingFee",
  });

  const toggleMenu = (index) => {
    setMenuOpen(menuOpen === index ? null : index);
  };

  async function buyNft(tokenId, price) {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum)
      const signer = await provider.getSigner()
      const marketPlaceContract = new ethers.Contract(NftMarketPlace, MarketABI, signer)

      // Execute buyNFT transaction
      const tx = await marketPlaceContract.buyNFT(tokenId, {
        value: price, 
      });
      await tx.wait();
      refetch(); 
    } catch (error) {
      console.error('Purchase failed:', error);
      window.alert("Transaction failed. Check console for details.");
    }
  }

  async function revertListing(tokenId) {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum)
      const signer = await provider.getSigner()
      const marketPlaceContract = new ethers.Contract(NftMarketPlace, MarketABI, signer)

      const tx = await marketPlaceContract.revertListing(tokenId); //
      await tx.wait();
      refetch(); 
    } catch (error) {
      console.error('Revert failed:', error);
    }
  }

  const fetchTokenMetadata = async (tokenId) => {
    try {
      const tokenMetadata = await readContract({
        address: NftCollection,
        abi: CollectionABI,
        functionName: 'tokenMetadata',
        args: [tokenId],
      });
      return {
        tokenId,
        title: tokenMetadata.title,
        description: tokenMetadata.description,
        image: tokenMetadata.image,
      };
    } catch (err) {
      console.error("Metadata fetch error for ID", tokenId, err);
      return null;
    }
  }

  // 2. Combine Blockchain Data with Metadata
  useEffect(() => {
    if (tokenIds.length > 0 && rawListings) {
      const fetchMetadata = async () => {
        setLoadingMetadata(true);
        const metadataPromises = tokenIds.map((id) => fetchTokenMetadata(id));
        const metadataArray = await Promise.all(metadataPromises);
        
        const combinedData = metadataArray
          .filter(m => m !== null)
          .map((metadata) => {
            const listedNft = rawListings.find(
              (listed) => listed.tokenId.toString() === metadata.tokenId.toString()
            );
            return { ...metadata, ...listedNft };
          });
          
        setMetadataList(combinedData);
        setLoadingMetadata(false);
      }
      fetchMetadata();
    } else {
      setMetadataList([]);
    }
  }, [tokenIds, rawListings]);

  if (!mounted) return null;

  return (
    <div className="min-h-screen w-full px-6 py-8 bg-gradient-to-br from-[#0f172a] via-[#111827] to-black pb-20">
      
      {/* HEADER SECTION */}
      <div className="backdrop-blur-xl bg-white/5 border border-white/10 text-white p-8 rounded-2xl mb-10 shadow-2xl">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold mb-2 tracking-wide">NFT Marketplace</h1>
            <p className="text-gray-400">Discover and trade unique digital assets</p>
          </div>
          <button 
            onClick={() => refetch()} 
            className="p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all active:scale-95"
          >
            ↻ Refresh Market
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8">
          <StatCard title="Active Listings" value={metadataList.length} />
          <StatCard title="Listing Fee" value={listingFee ? `${ethers.formatEther(listingFee)} ETH` : "--"} />
          <StatCard title="My Wallet" value={address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "Disconnected"} />
        </div>
      </div>

      {/* NFT GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
        {metadataList.length === 0 && !loadingMetadata && (
          <div className="col-span-full py-20 text-center backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl">
            <div className="text-5xl mb-4">🧊</div>
            <h2 className="text-2xl font-semibold text-white">No NFTs listed yet</h2>
            <p className="text-gray-400 mt-2">Check back later or mint your own!</p>
          </div>
        )}

        {metadataList.map((nft, index) => (
          <div key={index} className="relative backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl overflow-hidden shadow-xl hover:scale-[1.02] transition-all duration-300 group">
            
            <div className="relative h-64 bg-gray-800">
              <img src={nft.image} alt={nft.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
              
              <div className="absolute top-4 right-4 flex gap-2">
                {nft.seller?.toLowerCase() !== address?.toLowerCase() && (
                  <button 
                    onClick={() => buyNft(nft.tokenId.toString(), nft.price)}
                    className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-lg"
                  >
                    Buy Now
                  </button>
                )}

                <button onClick={(e) => { e.stopPropagation(); toggleMenu(index); }} className="bg-black/60 backdrop-blur-md p-2 rounded-xl text-white">
                  <HiMenu size={20} />
                </button>

                {menuOpen === index && (
                  <div className="absolute right-0 top-12 bg-gray-900 border border-white/10 rounded-xl shadow-2xl w-48 z-30 overflow-hidden">
                    {nft.seller?.toLowerCase() === address?.toLowerCase() ? (
                      <button onClick={() => revertListing(nft.tokenId.toString())} className="flex items-center gap-2 w-full px-4 py-3 hover:bg-red-500/20 text-red-400 text-sm">
                        <MdOutlineBackspace /> Remove Listing
                      </button>
                    ) : (
                      <button onClick={() => buyNft(nft.tokenId.toString(), nft.price)} className="flex items-center gap-2 w-full px-4 py-3 hover:bg-blue-500/20 text-white text-sm">
                        <MdOutlineSell /> Buy NFT
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 text-white">
              <h3 className="text-xl font-bold truncate">{nft.title || `Token #${nft.tokenId}`}</h3>
              <div className="flex justify-between items-center mt-4 pt-4 border-t border-white/5">
                <span className="text-gray-400 text-sm font-medium uppercase tracking-wider">Price</span>
                <span className="text-lg font-bold text-green-400">
                  {nft.price ? ethers.formatEther(nft.price) : "0"} ETH
                </span>
              </div>
              {nft.seller?.toLowerCase() === address?.toLowerCase() && (
                <div className="mt-3 text-[10px] bg-blue-500/20 text-blue-400 px-2 py-1 rounded-full w-fit font-bold uppercase tracking-tighter">
                  Owned by you
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatCard({ title, value }) {
  return (
    <div className="bg-white/5 border border-white/5 p-4 rounded-xl text-white">
      <p className="text-gray-400 text-xs uppercase tracking-widest">{title}</p>
      <p className="text-xl font-bold mt-1 truncate">{value}</p>
    </div>
  );
}