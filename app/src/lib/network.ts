export const opBNBTestnet = {
  id: 5611,
  name: "opBNBTestnet",
  network: "testnet",
  nativeCurrency: {
    name: "BNB",
    symbol: "tBNB",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ["https://opbnb-testnet-rpc.bnbchain.org"],
    },
    public: {
      http: ["https://opbnb-testnet-rpc.bnbchain.org"],
    },
  },
  testnet: true,
  blockExplorers: {
    default: {
      name: "opBNB Explorer",
      url: "https://opbnbscan.com/",
    },
  },
  contracts: {
    multicall3: {
      address: "0xca11bde05977b3631167028862be2a173976ca11",
    },
  },
};
