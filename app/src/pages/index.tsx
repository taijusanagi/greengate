import { Inter } from "next/font/google";
import { useState } from "react";

const inter = Inter({ subsets: ["latin"] });

interface NFT {
  tokenId: number;
  metadata?: Metadata;
}

interface Metadata {
  name?: string;
  description?: string;
  image?: string;
}

const fetchNFTData = (address: string) => {
  return Promise.resolve([
    { tokenId: 1, metadata: { name: "NFT 1" } },
    { tokenId: 2, metadata: { name: "NFT 2" } },
  ]);
};

export default function Home() {
  const [network, setNetwork] = useState("");
  const [address, setAddress] = useState("");
  const [nftData, setNftData] = useState<NFT[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [migrationResultURL, setMigrationResultURL] = useState("");

  const handleAddressChange = async () => {
    const data = await fetchNFTData(address);
    setNftData(data);
  };

  const handleMigrate = () => {
    const url = "http://example.com/migration-result";
    setMigrationResultURL(url);
    setIsModalOpen(true);
  };

  return (
    <main className={`${inter.className}`}>
      <select value={network} onChange={(e) => setNetwork(e.target.value)}>
        <option value="BSC">BSC</option>
        <option value="opBSC">opBSC</option>
      </select>
      <input
        type="text"
        placeholder="Enter Ethereum Smart Contract Address"
        value={address}
        onChange={(e) => setAddress(e.target.value)}
      />
      <button onClick={handleAddressChange}>Fetch NFT Data</button>
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Name</th>
          </tr>
        </thead>
        <tbody>
          {nftData.map((nft) => (
            <tr key={nft.tokenId}>
              <td>{nft.tokenId}</td>
              <td>{nft.metadata?.name}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <button onClick={handleMigrate}>Migrate</button>
      {isModalOpen && (
        <div>
          <h2>Migration Result</h2>
          <p>
            Your NFT data has been migrated. Check the result <a href={migrationResultURL}>here</a>
          </p>
          <button onClick={() => setIsModalOpen(false)}>Close</button>
        </div>
      )}
    </main>
  );
}
