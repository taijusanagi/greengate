import { Inter } from "next/font/google";
import { useState } from "react";

import { ConnectButton } from "@rainbow-me/rainbowkit";

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
    { tokenId: 1, metadata: { name: "NFT 1", image: "ipfs://Qm..." } },
    { tokenId: 2, metadata: { name: "NFT 2", image: "http://localhost:3000" } },
    { tokenId: 3, metadata: { name: "NFT 3", image: "http://localhost:3000" } },
    { tokenId: 4, metadata: { name: "NFT 4", image: "http://localhost:3000" } },
    { tokenId: 5, metadata: { name: "NFT 5", image: "http://localhost:3000" } },
  ]);
};

export default function Home() {
  const [network, setNetwork] = useState("");
  const [nftAddress, setNFTAddress] = useState("");
  const [nftData, setNftData] = useState<NFT[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [migrationResultURL, setMigrationResultURL] = useState("");

  const handleClickFetchNFTData = async () => {
    const data = await fetchNFTData(nftAddress);
    setNftData(data);
  };

  const handleMigrate = () => {
    const url = "http://example.com/migration-result";
    setMigrationResultURL(url);
    setIsModalOpen(true);
  };

  function renderHighlightedJSON(json: Metadata) {
    const jsonString = JSON.stringify(json, null, 2);
    const regex = /(ipfs:\/\/\S+)/g;

    let lastIndex = 0;
    const jsx = [];

    let match;
    while ((match = regex.exec(jsonString)) !== null) {
      const preText = jsonString.substring(lastIndex, match.index);
      const matchedText = match[0];

      jsx.push(<span key={lastIndex}>{preText}</span>);
      jsx.push(
        <span key={match.index} className="bg-yellow-300">
          {matchedText}
        </span>
      );

      lastIndex = match.index + matchedText.length;
    }
    jsx.push(<span key={lastIndex}>{jsonString.substring(lastIndex)}</span>);

    return jsx;
  }

  return (
    <main className={`${inter.className} min-h-screen flex flex-col bg-main p-5`}>
      <header className="flex justify-between items-center mb-8 px-4 py-2 bg-gray-100 rounded-lg shadow-md bg-sub">
        <h1 className="header-logo">GreenGate</h1>
        <ConnectButton accountStatus={"address"} showBalance={false} />
      </header>
      <div className="max-w-2xl w-full mx-auto p-5 bg-gray-100 rounded-lg shadow-md mb-8 bg-sub">
        <div className="flex flex-col space-y-4">
          <div className="space-y-2">
            <label htmlFor="network" className="block font-medium text-gray-600">
              Select Network
            </label>
            <select
              id="network"
              className="bg-gray-200 p-2 w-full rounded-lg border-2 border-gray-300 focus:border-gray-400 outline-none input-form"
              value={network}
              onChange={(e) => setNetwork(e.target.value)}
            >
              <option value="BSC">BSC</option>
              <option value="opBSC">opBSC</option>
            </select>
          </div>
          <div className="space-y-2">
            <label htmlFor="address" className="block font-medium text-gray-600">
              NFT Contract Address
            </label>
            <input
              id="address"
              className="bg-gray-200 p-2 w-full rounded-lg border-2 border-gray-300 focus:border-gray-400 outline-none input-form"
              type="text"
              placeholder="Enter NFT Contract Address"
              value={nftAddress}
              onChange={(e) => setNFTAddress(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <button
              type="submit"
              className="bg-gray-200 text-gray-600 p-2 w-full rounded-lg shadow-md hover:shadow-lg transition btn-main"
              onClick={handleClickFetchNFTData}
              disabled={!nftAddress.length}
            >
              Fetch NFT Data
            </button>
            <button
              className="bg-gray-200 text-gray-600 p-2 w-full rounded-lg mt-2 shadow-md hover:shadow-lg transition btn-main"
              onClick={handleMigrate}
              disabled={nftData.length == 0}
            >
              Migrate
            </button>
          </div>
        </div>
      </div>
      {nftData.length > 0 && (
        <div className="max-w-7xl w-full mx-auto p-5 bg-gray-100 rounded-lg shadow-md bg-sub">
          <table className="w-full mt-5 bg-white rounded-lg shadow-sm">
            <thead>
              <tr>
                <th className="p-2 bg-gray-100 border-b-2 w-1/6 font-medium text-gray-600">Token ID</th>
                <th className="p-2 bg-gray-100 border-b-2 font-medium text-gray-600">Metadata</th>
              </tr>
            </thead>
            <tbody>
              {nftData.map((nft) => (
                <tr key={nft.tokenId}>
                  <td className="p-2 border-b border-gray-200 text-gray-600">{nft.tokenId}</td>
                  <td className="p-2 border-b border-gray-200 whitespace-pre-wrap font-mono text-xs bg-gray-50 text-gray-600">
                    {nft.metadata && renderHighlightedJSON(nft.metadata)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-100 p-5 rounded-lg shadow-lg space-y-4 max-w-lg w-full">
            <div>
              <h2 className="text-lg font-semibold mb-8">Migration Result</h2>
              <p className="mb-2">The NFT data has been migrated.</p>
              <p className="">
                <a className="underline hover:text-gray-600" href={migrationResultURL}>
                  {migrationResultURL}
                </a>
              </p>
            </div>
            <div className="flex justify-end">
              <button
                className="bg-gray-200 text-gray-700 p-2 rounded-lg mt-2 shadow-md hover:shadow-lg transition btn-main"
                onClick={() => {
                  setNftData([]);
                  setNFTAddress("");
                  setIsModalOpen(false);
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
