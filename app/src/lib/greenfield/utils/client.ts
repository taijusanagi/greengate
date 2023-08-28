import { Client } from "@bnb-chain/greenfield-js-sdk";

export const client = Client.create(
  String(process.env.NEXT_PUBLIC_GRPC_URL),
  String(process.env.NEXT_PUBLIC_GREEN_CHAIN_ID),
);

export const getSps = async () => {
  const sps = await client.sp.getStorageProviders();
  const finalSps = (sps ?? []).filter((v: any) => v.endpoint.includes("nodereal"));

  return finalSps;
};

export const getAllSps = async () => {
  const sps = await getSps();

  return sps.map((sp) => {
    return {
      address: sp.operatorAddress,
      endpoint: sp.endpoint,
      name: sp.description?.moniker,
    };
  });
};
