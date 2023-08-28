import { ethers } from "hardhat";

async function main() {
  // Bored Ape Yacht Club NFT's baseURI
  const baseURI = "https://ipfs.io/ipfs/QmeSjSinHpPnmXmspMjwiXyN6zS4E9zccariGR3jxcaWtq/";
  const amount = 10
  const SampleNFT = await ethers.getContractFactory("SampleNFT");
  const sampleNFT = await SampleNFT.deploy(baseURI, amount);
  await sampleNFT.deployed();
  console.log(`Deployed to ${sampleNFT.address}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
