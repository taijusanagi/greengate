import { Inter } from "next/font/google";
import { FaSpinner } from "react-icons/fa";

import { useEffect, useState } from "react";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useDebug } from "@/hooks/useDebug";
import { useToast } from "@/hooks/useToast";

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
  const { debug, isDebugStarted, logTitle, logs } = useDebug();
  const { toast, showToast } = useToast();

  const [network, setNetwork] = useState("");
  const [nftAddress, setNFTAddress] = useState("");
  const [nftData, setNftData] = useState<NFT[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [migrationResultURL, setMigrationResultURL] = useState("");

  const handleClickFetchNFTData = async () => {
    try {
      debug.start("handleClickFetchNFTData");
      const data = await fetchNFTData(nftAddress);
      await new Promise((resolve) => setTimeout(resolve, 3000));
      debug.log("Done!");
      setNftData(data);
    } catch (e: any) {
      showToast({ message: e.message });
    } finally {
      debug.end();
    }
  };

  const handleMigrate = async () => {
    try {
      debug.start("handleMigrate");
      await new Promise((resolve) => setTimeout(resolve, 3000));
      const url = "http://example.com/migration-result";
      setMigrationResultURL(url);
      setIsModalOpen(true);
      debug.log("Done!");
    } catch (e: any) {
      showToast({ message: e.message });
    } finally {
      debug.end();
    }
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
        <span key={match.index} className="bg-yellow-200">
          {matchedText}
        </span>,
      );

      lastIndex = match.index + matchedText.length;
    }
    jsx.push(<span key={lastIndex}>{jsonString.substring(lastIndex)}</span>);

    return jsx;
  }

  useEffect(() => {
    if (isDebugStarted || isModalOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto"; // or 'visible' if you want
    }
    return () => {
      document.body.style.overflow = "auto"; // reset on unmount
    };
  }, [isDebugStarted, isModalOpen]);

  return (
    <main
      className={`${inter.className} min-h-screen flex flex-col bg-gradient-to-br from-yellow-200 to-green-400 p-5`}
    >
      {isDebugStarted && (
        <div className="fixed top-0 left-0 w-full h-screen bg-black bg-opacity-50 flex flex-col items-center justify-center z-50">
          <div className="max-w-lg w-full bg-black p-4 rounded-lg shadow-2xl break-all">
            <div className="flex justify-between items-center text-white text-sm align-left mb-2">
              {logTitle ? `Logs for ${logTitle}` : "Logs"} <FaSpinner className="text-white text-sm animate-spin" />
            </div>
            {logs.map((log, i) => {
              return (
                <p key={`log_${i}`} className="text-green-600 text-xs align-left">
                  {`>> ${log}`}
                </p>
              );
            })}
          </div>
        </div>
      )}
      {toast && (
        <div
          className={`fixed bottom-4 right-4 w-80 bg-red-400 text-white p-4 rounded-lg shadow-2xl z-50 text-xs break-all`}
        >
          {toast.message.length > 200 ? toast.message.substring(0, 200) : toast.message}
        </div>
      )}
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
            <div className="w-full bg-black p-4 rounded-lg shadow-2xl break-all">
              <div className="flex justify-between items-center text-white text-sm align-left mb-2">
                {logTitle ? `Logs for ${logTitle}` : "Logs"}{" "}
              </div>
              {logs.map((log, i) => {
                return (
                  <p key={`log_${i}`} className="text-green-600 text-xs align-left">
                    {`>> ${log}`}
                  </p>
                );
              })}
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
