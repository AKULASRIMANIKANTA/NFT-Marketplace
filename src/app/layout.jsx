import { Inter } from "next/font/google"
import "./globals.css"
import { Providers } from "../components/Providers"
import { NavBar } from "../components/NavBar"
import PageTransition from "../components/PageTransition"

const inter = Inter({ subsets: ["latin"] })

export const metadata = {
  title: "NFT Marketplace",
  description: "Web3 NFT Marketplace",
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${inter.className} 
                   min-h-screen 
                   bg-gradient-to-br 
                   from-[#020617] via-[#0f172a] to-black`}>
        <Providers>
          <NavBar />
          <PageTransition>
            {children}
          </PageTransition>
        </Providers>
      </body>
    </html>
  )
}