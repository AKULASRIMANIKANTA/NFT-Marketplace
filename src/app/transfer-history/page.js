import TransferHistory from "../../components/TransferHistory";

export default function page() {
  return (
    <main className="p-6">
      <h1 className="text-3xl font-bold mb-6">Transferred NFTs History</h1>
      <TransferHistory />
    </main>
  );
}