import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

const config: HardhatUserConfig = {
  solidity: "0.8.18",
  networks: {
    bscTestnet: {
      url: "https://data-seed-prebsc-1-s1.binance.org:8545",
      accounts: [process.env.PRIVATE_KEY as string],
    },
    opBNBTestnet: {
      url: "https://opbnb-testnet-rpc.bnbchain.org",
      accounts: [process.env.PRIVATE_KEY as string],
    }
  },
};

export default config;
