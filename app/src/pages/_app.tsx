import "@/styles/globals.css";
import "@rainbow-me/rainbowkit/styles.css";

import type { AppProps } from "next/app";

import { getDefaultWallets, RainbowKitProvider } from "@rainbow-me/rainbowkit";
import { configureChains, createConfig, WagmiConfig } from "wagmi";
import { bscTestnet } from "wagmi/chains";
import { publicProvider } from "wagmi/providers/public";
import { opBNBTestnet, greenFieldMekongTestnet } from "@/lib/network";

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
  return (
    <WagmiConfig config={wagmiConfig}>
      <RainbowKitProvider chains={chains.filter((chain) => chain.id === 5600)}>
        <Component {...pageProps} />
      </RainbowKitProvider>
    </WagmiConfig>
  );
}
