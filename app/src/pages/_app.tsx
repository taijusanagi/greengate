import "@/styles/globals.css";
import "@rainbow-me/rainbowkit/styles.css";

import type { AppProps } from "next/app";

import { getDefaultWallets, RainbowKitProvider } from "@rainbow-me/rainbowkit";
import { configureChains, createConfig, WagmiConfig } from "wagmi";
import { bscTestnet } from "wagmi/chains";
import { publicProvider } from "wagmi/providers/public";
import { opBNBTestnet, greenFieldMekongTestnet } from "@/lib/network";

import { getEddsaCompressedPublicKey } from "@bnb-chain/greenfield-zk-crypto";
import { useEffect } from "react";

const { chains, publicClient } = configureChains(
  [bscTestnet, opBNBTestnet, greenFieldMekongTestnet],
  [publicProvider()],
);

const { connectors } = getDefaultWallets({
  appName: "GreenGate",
  projectId: "GreenGate",
  chains,
});

const wagmiConfig = createConfig({
  autoConnect: true,
  connectors,
  publicClient,
});

export default function App({ Component, pageProps }: AppProps) {
  useEffect(() => {
    (window as any).__PUBLIC_ZKCRYPTO_WASM_PATH__ =
      "https://cdn.jsdelivr.net/npm/@bnb-chain/greenfield-zk-crypto/dist/node/zk-crypto.wasm";
    (window as any).getEddsaCompressedPublicKey = getEddsaCompressedPublicKey;
  }, []);

  return (
    <WagmiConfig config={wagmiConfig}>
      <RainbowKitProvider chains={chains.filter((chain) => chain.id === 5600)}>
        <Component {...pageProps} />
      </RainbowKitProvider>
    </WagmiConfig>
  );
}
