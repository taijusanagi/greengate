export const bscTestnetChainId = 97;
export const bscTestnetRPC = "https://data-seed-prebsc-1-s1.binance.org:8545";

export const opBNBTestnetChainId = 5611;
export const opBNBTestnetRPC = "https://opbnb-testnet-rpc.bnbchain.org";

export const greenFieldMekongTestnetChainId = 5600;
export const greenFieldMekongTestnetRPC = "https://gnfd-testnet-fullnode-tendermint-us.bnbchain.org";

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
      address: "0xca11bde05977b3631167028862be2a173976ca11" as `0x${string}`,
    },
  },
};

export const greenFieldMekongTestnet = {
  id: 5600,
  name: "Greenfield Mekong Testnet",
  network: "testnet",
  nativeCurrency: {
    name: "BNB",
    symbol: "tBNB",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: [greenFieldMekongTestnetRPC],
    },
    public: {
      http: [greenFieldMekongTestnetRPC],
    },
  },
  testnet: true,
  blockExplorers: {
    default: {
      name: "BNB Greenfield Explorer",
      url: "https://greenfieldscan.com/",
    },
  },
};
