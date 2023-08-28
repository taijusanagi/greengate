import { Inter } from "next/font/google";
import { FaSpinner } from "react-icons/fa";

import { useEffect, useState } from "react";
import { useDebug } from "@/hooks/useDebug";
import { useToast } from "@/hooks/useToast";
import { useContract } from "@/hooks/useContract";
import { useIsConnected } from "@/hooks/useIsConnected";
import { sampleNFTAddress } from "@/lib/contract";
import { ERC721EnumerableInterfaceID } from "@/lib/constant";
import { ethers } from "ethers";
import { ConnectButton } from "@rainbow-me/rainbowkit";

import { erc721EnumerableAbi } from "@/lib/abi";

import { createPublicClient, http } from "viem";
import { bscTestnet } from "wagmi/chains";
import { opBNBTestnet } from "@/lib/network";
import { greenfieldClient } from "@/lib/greenfield";
import { useAccount } from "wagmi";
import { FileHandler } from "@bnb-chain/greenfiled-file-handle";

const inter = Inter({ subsets: ["latin"] });

interface NFT {
  tokenId: string;
  metadata?: Metadata;
}

interface Metadata {
  [key: string]: any;
}

const greenfieldBaseURI = "https://gnfd-sp.4everland.org/view/";

export default function Home() {
  const { debug, isDebugStarted, logTitle, logs } = useDebug();
  const { toast, showToast } = useToast();
  const { isConnected } = useIsConnected();
  const { address: userAddress } = useAccount();

  const [chainId, setChainId] = useState(97);
  const [nftAddress, setNFTAddress] = useState(sampleNFTAddress);
  const [nftData, setNftData] = useState<NFT[]>([]);
  const { erc165, erc721Enumerable } = useContract({ chainId, address: nftAddress });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [migrationResultURL, setMigrationResultURL] = useState("");

  const handleClickFetchNFTData = async () => {
    try {
      debug.start("handleClickFetchNFTData");
      debug.log("chainId", chainId);
      debug.log("nftAddress", nftAddress);
      if (!ethers.utils.isAddress(nftAddress)) {
        throw new Error("Invalid NFT Contract Address");
      }
      if (!isConnected) {
        throw new Error("Please connect your wallet");
      }
      if (!erc165 || !erc721Enumerable) {
        throw new Error("Contract is not defined");
      }
      const isSupportsInterface = await erc165.supportsInterface(ERC721EnumerableInterfaceID).catch(() => {
        throw new Error("Contract does not support ERC721Enumerable");
      });
      debug.log("supportsInterface", ERC721EnumerableInterfaceID, isSupportsInterface);
      const totalSupply = await erc721Enumerable.totalSupply();

      let publicClient;
      if (chainId === 97) {
        publicClient = createPublicClient({
          chain: bscTestnet,
          transport: http(),
        });
      } else if (chainId === 5611) {
        publicClient = createPublicClient({
          chain: opBNBTestnet,
          transport: http(),
        });
      } else {
        throw new Error("Invalid chainId");
      }

      debug.log("totalSupply", totalSupply);
      const tokenByIndexMulticallRes = await publicClient.multicall({
        contracts: Array.from({ length: totalSupply }, (_, i) => i).map((index) => ({
          address: nftAddress as `0x${string}`,
          abi: erc721EnumerableAbi as any,
          functionName: "tokenByIndex",
          args: [index],
        })),
      });
      if (tokenByIndexMulticallRes.some(({ status }) => status === "failure")) {
        throw new Error("Failed to fetch tokenIds");
      }
      const tokenIds = tokenByIndexMulticallRes.map(({ result }: any) => result as ethers.BigNumber);
      debug.log("tokenIds fetched");

      const tokenURIMulticallRes = await publicClient.multicall({
        contracts: tokenIds.map((tokenId) => ({
          address: nftAddress as `0x${string}`,
          abi: erc721EnumerableAbi as any,
          functionName: "tokenURI",
          args: [tokenId],
        })),
      });

      if (tokenURIMulticallRes.some(({ status }) => status === "failure")) {
        throw new Error("Failed to fetch tokenURIs");
      }
      const tokenURIs = tokenURIMulticallRes.map(({ result }: any) => result as string);
      console.log("tokenURIs fetched");

      const metadataList = await Promise.all(
        tokenURIs.map(async (uri) => {
          let fetchURL = uri;
          if (uri.startsWith("ipfs://")) {
            const IPFS_GATEWAY = "https://ipfs.io/ipfs/";
            fetchURL = IPFS_GATEWAY + uri.substring(7);
          }
          const response = await fetch(fetchURL);
          if (!response.ok) {
            throw new Error(`Failed to fetch token data from URI: ${uri}`);
          }
          return await response.json();
        }),
      );
      const nftData = tokenIds.map((tokenId, i) => ({
        tokenId: tokenId.toString(),
        metadata: metadataList[i],
      }));
      debug.log("Done!");
      setNftData(nftData);
    } catch (e: any) {
      showToast({ message: e.message });
    } finally {
      debug.end();
    }
  };

  const handleMigrate = async () => {
    try {
      debug.start("handleMigrate");

      const mutableNFTData = [...nftData];
      const ipfsData: string[] = [];
      mutableNFTData.forEach((nft) => {
        if (nft.metadata) {
          for (const key in nft.metadata) {
            const value = nft.metadata[key];
            if (typeof value === "string" && value.startsWith("ipfs://")) {
              ipfsData.push(value);
            }
          }
        }
      });
      debug.log("ipfsData.length", ipfsData.length);

      const migratedData: string[] = [];
      for (let ipfsUri of ipfsData) {
        const response = await fetch(`https://ipfs.io/ipfs/${ipfsUri.split("://")[1]}`);
        if (!response.ok) {
          console.error(`Failed to fetch from IPFS: ${ipfsUri}`);
          continue; // Move to the next URI
        }
        console.log(response);
        const content = await response.blob();
        const newUri = await uploadBlobToStorage(content);
        if (newUri) {
          migratedData.push(newUri);
        }
      }
      debug.log("migratedData.length", migratedData.length);

      mutableNFTData.forEach((nft) => {
        if (nft.metadata) {
          for (const key in nft.metadata) {
            const value = nft.metadata[key];
            const index = ipfsData.indexOf(value);
            if (index !== -1) {
              nft.metadata[key] = migratedData[index];
            }
          }
        }
      });

      debug.log("uploadNFTDataToStorage");
      const url = await uploadNFTDataToStorage(mutableNFTData);

      debug.log("url", url);
      setMigrationResultURL(url);
      setIsModalOpen(true);
      debug.log("Done!");
    } catch (e: any) {
      showToast({ message: e.message });
    } finally {
      debug.end();
    }
  };

  const uploadBlobToStorage = async (content: Blob) => {
    return "http://localhost:3000";
  };

  const uploadNFTDataToStorage = async (nftData: NFT[]) => {
    if (!userAddress) {
      throw new Error("Please connect your wallet");
    }

    const bucketName = "test-for-create-bucket";
    const objectName = "test";
    let jsonString = '{"name": "John", "age": 30, "city": "New York"}';
    let blob = new Blob([jsonString], { type: "application/json" });
    let file = new File([blob], "test", { type: "application/json" });

    async function fileToUint8Array(file: File): Promise<Uint8Array> {
      return new Promise((resolve, reject) => {
        let reader = new FileReader() as any;
        reader.onload = function () {
          resolve(new Uint8Array(reader.result));
        };
        reader.onerror = function () {
          reject(new Error("Failed to read file"));
        };
        reader.readAsArrayBuffer(file);
      });
    }

    const bytes = await fileToUint8Array(file);
    const { contentLength, expectCheckSums } = await FileHandler.getPieceHashRoots(bytes);
    console.log(result);

    const createObjectTx = await greenfieldClient.object.createObject(
      {
        bucketName: bucketName,
        objectName: objectName,
        creator: userAddress,
        visibility: "VISIBILITY_TYPE_PUBLIC_READ",
        fileType: file.type,
        redundancyType: "REDUNDANCY_EC_TYPE",
        contentLength,
        expectCheckSums: JSON.parse(expectCheckSums),
      },
      // {
      //   type: "EDDSA",
      //   domain: window.location.origin,
      //   seed: offChainData.seedString,
      //   address,
      //   // type: 'ECDSA',
      //   // privateKey: ACCOUNT_PRIVATEKEY,
      // },
    );

    return "http://localhost:3000";
  };

  function renderHighlightedJSON(json: Metadata) {
    const jsonString = JSON.stringify(json, null, 2);
    const regex = /(")(ipfs:\/\/[^",\s]+)(")/g; // Updated regex to capture surrounding quotes

    let lastIndex = 0;
    const jsx = [];

    let match;
    while ((match = regex.exec(jsonString)) !== null) {
      const preText = jsonString.substring(lastIndex, match.index);
      const openingQuote = match[1]; // The opening quote
      const matchedText = match[2]; // The captured IPFS URI
      const closingQuote = match[3]; // The closing quote

      jsx.push(<span key={lastIndex}>{preText}</span>);
      jsx.push(<span key={`opening-${match.index}`}>{openingQuote}</span>); // Render opening quote
      jsx.push(
        <span key={match.index} className="bg-yellow-200">
          {matchedText}
        </span>,
      );
      jsx.push(<span key={`closing-${match.index}`}>{closingQuote}</span>); // Render closing quote

      lastIndex = regex.lastIndex;
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
      className={`${inter.className} min-h-screen flex flex-col bg-gradient-to-br from-yellow-200 to-green-400 p-2`}
    >
      {isDebugStarted && (
        <div className="fixed top-0 left-0 w-full h-screen bg-black bg-opacity-50 flex flex-col items-center justify-center z-50 p-2">
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
        <ConnectButton accountStatus={"address"} showBalance={false} chainStatus={"icon"} />
      </header>
      <div className="max-w-2xl w-full mx-auto p-4 bg-gray-100 rounded-lg shadow-md mb-8 bg-sub">
        <div className="flex flex-col space-y-4">
          <div className="space-y-2">
            <label htmlFor="network" className="block font-medium text-gray-600">
              Select Network
            </label>
            <select
              id="chainId"
              className="bg-gray-200 p-2 w-full rounded-lg border-2 border-gray-300 focus:border-gray-400 outline-none input-form"
              value={chainId}
              onChange={(e) => setChainId(Number(e.target.value))}
            >
              <option value={97}>BSC</option>
              <option value={5611}>opBNB</option>
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2">
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
