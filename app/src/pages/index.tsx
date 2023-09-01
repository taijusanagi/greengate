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
import { useEthersSigner } from "@/hooks/useEthers";
import { erc721EnumerableAbi } from "@/lib/abi";

import { createPublicClient, http } from "viem";
import { bscTestnet } from "wagmi/chains";
import { opBNBTestnet } from "@/lib/network";
import { client, getAllSps } from "@/lib/greenfield/utils/client";
import { useAccount } from "wagmi";
import * as Handler from "@bnb-chain/greenfiled-file-handle";
import { getOffchainAuthKeys } from "@/lib/greenfield/utils/offchainAuth";

const inter = Inter({ subsets: ["latin"] });

const greenfieldBaseURL = "https://gnfd-testnet-sp2.nodereal.io/view";

interface NFT {
  tokenId: string;
  metadata?: Metadata;
}

interface Metadata {
  [key: string]: any;
}

export default function Home() {
  const { debug, isDebugStarted, logTitle, logs } = useDebug();
  const { toast, showToast } = useToast();
  const { isConnected } = useIsConnected();
  const { address: userAddress, connector } = useAccount();

  const [chainId, setChainId] = useState(97);
  const [nftAddress, setNFTAddress] = useState(sampleNFTAddress);
  const [nftData, setNftData] = useState<NFT[]>([]);
  const { erc165, erc721Enumerable } = useContract({ chainId, address: nftAddress });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [migrationResultURL, setMigrationResultURL] = useState("");

  const [bucketName, setBucketName] = useState("test");
  const [folderName, setFolderName] = useState("byac");

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
      console.error(e);
      showToast({ message: e.message });
    } finally {
      debug.end();
    }
  };

  const handleMigrate = async () => {
    try {
      debug.start("handleMigrate");
      debug.log("uploadNFTDataToStorage");
      const url = await uploadNFTDataToStorage(nftData);
      if (!url) {
        throw new Error("Failed to upload NFT data to storage");
      }
      debug.log("url", url);
      setMigrationResultURL(url);
      setIsModalOpen(true);
      debug.log("Done!");
    } catch (e: any) {
      console.error(e);
      showToast({ message: e.message });
    } finally {
      debug.end();
    }
  };

  async function blobToUint8Array(blob: Blob): Promise<Uint8Array> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsArrayBuffer(blob);
      reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer));
      reader.onerror = (error) => reject(error);
    });
  }

  const uploadNFTDataToStorage = async (nftData: NFT[]) => {
    if (!userAddress || !connector) {
      throw new Error("Please connect your wallet");
    }
    const ipfsData: string[] = [];
    const mutableNFTData = nftData.map((nft) => ({
      ...nft,
      metadata: nft.metadata ? { ...nft.metadata } : undefined,
    }));
    mutableNFTData.forEach((nft) => {
      if (nft.metadata) {
        for (const key in nft.metadata) {
          const value = nft.metadata[key];
          if (typeof value === "string" && value.startsWith("ipfs://")) {
            ipfsData.push(value);
            const cid = value.split("://")[1];
            nft.metadata[key] = `${greenfieldBaseURL}/${bucketName}/${folderName}/assets/${cid}`;
          }
        }
      }
    });
    const provider = await connector?.getProvider();
    const offChainData = await getOffchainAuthKeys(userAddress, provider);
    if (!offChainData) {
      alert("No offchain, please create offchain pairs first");
      return;
    }
    debug.log("createMainFolderTx for", folderName);
    const createMainFolderTx = await client.object.createFolder(
      {
        bucketName: bucketName,
        objectName: folderName + "/",
        creator: userAddress,
      },
      {
        type: "EDDSA",
        domain: window.location.origin,
        seed: offChainData.seedString,
        address: userAddress,
      },
    );
    debug.log("createAssetFolderTx for", folderName + "/assets");
    const createAssetFolderTx = await client.object.createFolder(
      {
        bucketName: bucketName,
        objectName: folderName + "/" + "assets/",
        creator: userAddress,
      },
      {
        type: "EDDSA",
        domain: window.location.origin,
        seed: offChainData.seedString,
        address: userAddress,
      },
    );
    const DEFAULT_SEGMENT_SIZE = 16 * 1024 * 1024;
    const DEFAULT_DATA_BLOCKS = 4;
    const DEFAULT_PARITY_BLOCKS = 2;
    debug.log("createAssetTxList...");
    const createAssetTxList = [];
    const uploadAssetInfo = [];
    let createAssetTxListIndex = 0;
    for (const ipfsUri of ipfsData) {
      // for faster testing
      if (createAssetTxListIndex > 0) {
        debug.log("Only process 1 record for faster demo");
        break;
      }
      debug.log("process", ipfsUri);
      const cid = ipfsUri.split("://")[1];
      const response = await fetch(`https://ipfs.io/ipfs/${cid}`);
      const fileType = response.headers.get("Content-Type") as string;
      const blob = await response.blob();
      const bytes = await blobToUint8Array(blob);
      const { contentLength, expectCheckSums } = await Handler.getCheckSums(
        bytes,
        DEFAULT_SEGMENT_SIZE,
        DEFAULT_DATA_BLOCKS,
        DEFAULT_PARITY_BLOCKS,
      );
      const objectName = folderName + "/" + "assets/" + cid;
      const createAssetTx = await client.object.createObject(
        {
          bucketName: bucketName,
          objectName,
          creator: userAddress,
          visibility: "VISIBILITY_TYPE_PUBLIC_READ",
          fileType,
          redundancyType: "REDUNDANCY_EC_TYPE",
          contentLength,
          expectCheckSums: JSON.parse(expectCheckSums),
        },
        {
          type: "EDDSA",
          domain: window.location.origin,
          seed: offChainData.seedString,
          address: userAddress,
        },
      );
      createAssetTxList.push(createAssetTx);
      uploadAssetInfo.push({ file: new File([blob], objectName, { type: fileType }), objectName });
      createAssetTxListIndex++;
    }

    debug.log("createEachMetadataTxList...");
    const createEachMetadataTxList = [];
    const uploadEachMetadataInfo = [];
    let createEachMetadataTxIndex = 0;
    for (const nft of mutableNFTData) {
      // for faster testing
      if (createEachMetadataTxIndex > 0) {
        debug.log("Only process 1 record for faster demo");
        break;
      }
      debug.log("process", nft.tokenId);
      const fileType = "application/json";
      let blob = new Blob([JSON.stringify(nft.metadata)], { type: "application/json" });
      const bytes = await blobToUint8Array(blob);
      const { contentLength, expectCheckSums } = await Handler.getCheckSums(
        bytes,
        DEFAULT_SEGMENT_SIZE,
        DEFAULT_DATA_BLOCKS,
        DEFAULT_PARITY_BLOCKS,
      );
      const objectName = folderName + "/" + createEachMetadataTxIndex;
      const createEachMetadataTx = await client.object.createObject(
        {
          bucketName: bucketName,
          objectName,
          creator: userAddress,
          visibility: "VISIBILITY_TYPE_PUBLIC_READ",
          fileType,
          redundancyType: "REDUNDANCY_EC_TYPE",
          contentLength,
          expectCheckSums: JSON.parse(expectCheckSums),
        },
        {
          type: "EDDSA",
          domain: window.location.origin,
          seed: offChainData.seedString,
          address: userAddress,
        },
      );
      createEachMetadataTxList.push(createEachMetadataTx);
      uploadEachMetadataInfo.push({ file: new File([blob], objectName, { type: fileType }), objectName });
      createEachMetadataTxIndex++;
    }

    const multiTx = await client.basic.multiTx([
      createMainFolderTx,
      createAssetFolderTx,
      ...createAssetTxList,
      ...createEachMetadataTxList,
    ]);
    const simulateInfo = await multiTx.simulate({
      denom: "BNB",
    });
    debug.log("simulateInfo.gasFee", simulateInfo.gasFee);
    debug.log("simulateInfo.gasLimit", simulateInfo.gasLimit);
    debug.log("simulateInfo.gasPrice", simulateInfo.gasPrice);
    const multiTxRes = await multiTx.broadcast({
      denom: "BNB",
      gasLimit: Number(simulateInfo?.gasLimit),
      gasPrice: simulateInfo?.gasPrice || "5000000000",
      payer: userAddress,
      granter: "",
    });
    const txnHash = multiTxRes.transactionHash;
    debug.log("txnHash", txnHash);

    for (const info of [...uploadAssetInfo, ...uploadEachMetadataInfo]) {
      debug.log("uploadObject", info.objectName);
      const res = await client.object.uploadObject(
        {
          bucketName: bucketName,
          objectName: info.objectName,
          body: info.file,
          txnHash,
        },
        {
          type: "EDDSA",
          domain: window.location.origin,
          seed: offChainData.seedString,
          address: userAddress,
        },
      );
      console.log("res", res);
    }
    return `${greenfieldBaseURL}/${bucketName}/${folderName}`;
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
        <div className="mb-6 flex justify-end items-center">
          <nav className="flex space-x-4 text-gray-600">
            <button className={"px-4 py-2 text-green-600 font-semibold border-b-2 border-green-600"}>
              NFT Migrator
            </button>
            <button className={"px-4 py-2 text-gray-600 border-b-2 border-gray-600 opacity-25 cursor-not-allowed"}>
              Other Migrator
            </button>
          </nav>
        </div>
        <div className="flex flex-col space-y-8">
          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="network" className="block font-medium text-gray-600">
                NFT Network
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
            </div>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="network" className="block font-medium text-gray-600">
                BNB Greenfield Bucket Name
              </label>
              <input
                id="bucketName"
                className="bg-gray-200 p-2 w-full rounded-lg border-2 border-gray-300 focus:border-gray-400 outline-none input-form"
                type="text"
                placeholder="Enter Bucket Name"
                value={bucketName}
                onChange={(e) => setBucketName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="address" className="block font-medium text-gray-600">
                BNB Greenfield Folder Name
              </label>
              <input
                id="folderName"
                className="bg-gray-200 p-2 w-full rounded-lg border-2 border-gray-300 focus:border-gray-400 outline-none input-form"
                type="text"
                placeholder="Enter Folder Name"
                value={folderName}
                onChange={(e) => setFolderName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <button
                className="bg-gray-200 text-gray-600 p-2 w-full rounded-lg mt-2 shadow-md hover:shadow-lg transition btn-main"
                onClick={handleMigrate}
                disabled={nftData.length == 0 || !bucketName || !folderName}
              >
                Migrate
              </button>
            </div>
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
              <p className="mb-2">Please set the below as baseURI in NFT Contract.</p>
              <p className="">
                <a className="underline hover:text-gray-600" href={migrationResultURL}>
                  {migrationResultURL}/
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
