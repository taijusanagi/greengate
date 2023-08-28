export const bscTestnetRPC = "https://data-seed-prebsc-1-s1.bnbchain.org:8545";
export const bscTestnetChainId = 97;
export const bstTestnetSampleNFTAddress = "0x0E2487584BE1c002654ccFfE17d6391a88C1e72A";

export const opBNBTestnetRPC = "https://opbnb-testnet-rpc.bnbchain.org";
export const opBNBTestnetChainId = 5611;
export const opBNBTestnetSampleNFTAddress = "0x0E2487584BE1c002654ccFfE17d6391a88C1e72A";

export const opBNBTestnet = {
  id: opBNBTestnetChainId,
  name: "opBNBTestnet",
  network: "testnet",
  nativeCurrency: {
    name: "BNB",
    symbol: "tBNB",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: [opBNBTestnetRPC],
    },
    public: {
      http: [opBNBTestnetRPC],
    },
  },
  testnet: true,
  blockExplorers: {
    default: {
      name: "opBNB Explorer",
      url: "https://opbnbscan.com/",
    },
  },
};
