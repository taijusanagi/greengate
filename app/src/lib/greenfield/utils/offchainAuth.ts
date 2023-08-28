import { client, getAllSps } from "./client";

import { IReturnOffChainAuthKeyPairAndUpload } from "@bnb-chain/greenfield-js-sdk";

export const getOffchainAuthKeys = async (address: string, provider: any) => {
  const storageResStr = localStorage.getItem(address);

  if (storageResStr) {
    const storageRes = JSON.parse(storageResStr) as IReturnOffChainAuthKeyPairAndUpload;
    if (storageRes.expirationTime < Date.now()) {
      alert("Your auth key has expired, please generate a new one");
      return;
    }

    return storageRes;
  }

  const allSps = await getAllSps();
  const offchainAuthRes = await client.offchainauth.genOffChainAuthKeyPairAndUpload(
    {
      sps: allSps,
      chainId: Number(process.env.NEXT_PUBLIC_GREEN_CHAIN_ID),
      expirationMs: 5 * 24 * 60 * 60 * 1000,
      domain: window.location.origin,
      address,
    },
    provider,
  );

  const { code, body: offChainData } = offchainAuthRes;
  if (code !== 0 || !offChainData) {
    throw offchainAuthRes;
  }

  localStorage.setItem(address, JSON.stringify(offChainData));
  return offChainData;
};
