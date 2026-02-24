"use client"
import React, { useEffect, useState } from 'react'
import { NftCollection, CollectionABI } from '../constants/index'
import { useAccount } from 'wagmi'
import { ethers } from 'ethers'

export function CreateNft() {
  const { address, isConnected } = useAccount()

  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [media, setMedia] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (!title || !description || !media) {
      alert("Fill all fields")
      return
    }

    setLoading(true)
    try {
      const provider = new ethers.BrowserProvider(window.ethereum)
      const signer = await provider.getSigner()

      const collectionContract = new ethers.Contract(
        NftCollection,
        CollectionABI,
        signer
      )

      const tx = await collectionContract.mint(
        address,
        title,
        description,
        media,
        {
          value: ethers.parseEther("0.01")
        }
      )

      await tx.wait()
      alert("NFT minted successfully 🚀")

      setTitle("")
      setDescription("")
      setMedia("")
    } catch (error) {
      console.error(error)
      alert("Mint failed")
    }

    setLoading(false)
  }

  useEffect(() => {
    console.log(title, description, media, address)
  }, [title, description, media, address])

  return (
    <div className="min-h-screen w-full px-6 py-10 
                    bg-gradient-to-br from-[#020617] via-[#020617] to-black">

      {/* GLASS HEADER */}
      <div className="backdrop-blur-xl bg-white/5 border border-white/10 
                      text-white p-8 rounded-2xl mb-10 shadow-2xl max-w-3xl mx-auto">
        <h1 className="text-4xl font-bold tracking-wide mb-2">
          Mint New NFT
        </h1>
        <p className="text-gray-400">
          Create and publish your digital asset on the blockchain
        </p>
      </div>

      {/* FORM CARD */}
      <div className="max-w-3xl mx-auto 
                      backdrop-blur-xl bg-white/5 border border-white/10 
                      rounded-2xl p-10 shadow-xl text-white">

        <div className="flex flex-col gap-6">

          {/* TITLE */}
          <input
            type="text"
            value={title}
            placeholder="NFT Title"
            onChange={(e) => setTitle(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 
                       focus:outline-none focus:ring-2 focus:ring-blue-500 
                       placeholder:text-gray-400"
          />

          {/* DESCRIPTION */}
          <input
            type="text"
            value={description}
            placeholder="NFT Description"
            onChange={(e) => setDescription(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 
                       focus:outline-none focus:ring-2 focus:ring-blue-500 
                       placeholder:text-gray-400"
          />

          {/* MEDIA URL */}
          <input
            type="text"
            value={media}
            placeholder="Image / IPFS URL"
            onChange={(e) => setMedia(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 
                       focus:outline-none focus:ring-2 focus:ring-blue-500 
                       placeholder:text-gray-400"
          />

          {/* GRADIENT ACCENT */}
          <div className="h-[2px] w-full bg-gradient-to-r 
                          from-purple-500 via-blue-500 to-cyan-400 
                          rounded-full opacity-70" />

          {/* MINT BUTTON */}
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-500 
                       px-6 py-3 rounded-xl font-semibold 
                       shadow-lg transition disabled:opacity-50"
          >
            {loading ? "Minting..." : "Mint NFT"}
          </button>

        </div>
      </div>
    </div>
  )
}