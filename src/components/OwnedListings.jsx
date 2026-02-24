"use client"
import React, { useEffect, useState } from "react"
import { useAccount, useContractRead } from "wagmi"
import { readContract } from "wagmi/actions"
import { ethers } from "ethers"
import { HiMenu } from "react-icons/hi"
import { MdOutlineBackspace } from "react-icons/md"

import {
  NftCollection,
  CollectionABI,
  NftMarketPlace,
  MarketABI,
} from "../constants"

export default function OwnedListings() {

  const { address, isConnected } = useAccount()

  const [listedNFTs, setListedNFTs] = useState([])
  const [metadataList, setMetadataList] = useState([])
  const [menuOpen, setMenuOpen] = useState(null)

  const toggleMenu = (index) => {
    setMenuOpen(menuOpen === index ? null : index)
  }

  /* ================================
     READ: Seller Listings (Marketplace)
  ================================= */
  const { data: sellerListings } = useContractRead({
    address: NftMarketPlace,
    abi: MarketABI,
    functionName: "getSellerNftListigs",
    enabled: isConnected,
    watch: true,
  })

  /* ================================
     READ: Collection Name
  ================================= */
  const { data: collectionName } = useContractRead({
    address: NftCollection,
    abi: CollectionABI,
    functionName: "name",
  })

  /* ================================
     FETCH METADATA
  ================================= */
  const fetchTokenMetadata = async (tokenId) => {
    const metadata = await readContract({
      address: NftCollection,
      abi: CollectionABI,
      functionName: "tokenMetadata",
      args: [tokenId],
    })

    return {
      tokenId,
      ...metadata,
    }
  }

  /* ================================
     EFFECT: Process Listings
  ================================= */
  useEffect(() => {
    if (!sellerListings || sellerListings.length === 0) {
      setListedNFTs([])
      setMetadataList([])
      return
    }

    setListedNFTs(sellerListings)

    const loadMetadata = async () => {
      const results = await Promise.all(
        sellerListings.map(async (listing) => {
          const meta = await fetchTokenMetadata(listing.tokenId)
          return {
            ...meta,
            ...listing,
          }
        })
      )
      setMetadataList(results)
    }

    loadMetadata()
  }, [sellerListings])

  /* ================================
     ACTION: Revert Listing
  ================================= */
  const revertListing = async (tokenId) => {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum)
      const signer = await provider.getSigner()

      const marketplace = new ethers.Contract(
        NftMarketPlace,
        MarketABI,
        signer
      )

      const tx = await marketplace.revertListing(tokenId)
      await tx.wait()
    } catch (err) {
      console.error(err)
      alert("Failed to remove listing")
    }
  }

  /* ================================
     RENDER
  ================================= */
  return (
    <div className="w-full mt-12">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-6">
        {metadataList.map((nft, index) => (
          <div
            key={index}
            className="bg-gray-900 text-white rounded-lg overflow-hidden shadow-lg"
          >
            <div className="relative">
              {nft.image && (
                <img
                  src={nft.image}
                  alt="NFT"
                  className="w-full h-60 object-cover"
                />
              )}

              <button
                onClick={() => toggleMenu(index)}
                className="absolute top-2 right-2 bg-black p-2 rounded"
              >
                <HiMenu />
              </button>

              {menuOpen === index && (
                <div className="absolute right-2 top-12 bg-black rounded shadow-md">
                  <button
                    onClick={() => revertListing(nft.tokenId)}
                    className="flex items-center gap-2 px-4 py-2 hover:bg-gray-800 w-full"
                  >
                    <MdOutlineBackspace />
                    Remove Listing
                  </button>
                </div>
              )}
            </div>

            <div className="p-4">
              <h2 className="font-bold text-lg">{nft.title}</h2>
              <p className="text-sm text-gray-400">{collectionName}</p>
              <p className="text-xs text-gray-500 mt-1">
                Listed by you
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
