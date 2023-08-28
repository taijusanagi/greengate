import { Client } from "@bnb-chain/greenfield-js-sdk";

export const greenfieldClient = Client.create(
  String(process.env.NEXT_PUBLIC_GRPC_URL),
  String(process.env.NEXT_PUBLIC_GREEN_CHAIN_ID),
);
