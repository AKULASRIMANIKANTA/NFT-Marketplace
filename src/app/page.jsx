import UserNfts from "../components/UserNfts";
import OwnedListings from "../components/OwnedListings";

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br 
                     from-[#020617] via-[#020617] to-black 
                     px-6 py-10">
      <UserNfts />
      <OwnedListings />
    </main>
  );
}
