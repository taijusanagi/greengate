import { Contract, ethers } from "ethers";
import { useEthersProvider, useEthersSigner } from "@/hooks/useEthers";
import { useEffect, useState } from "react";
import { ERC165Abi, erc721EnumerableAbi } from "@/lib/abi";

interface UseContractOptions {
  address?: string;
}

export const useContract = ({ address }: UseContractOptions = {}) => {
  const provider = useEthersProvider();
  const signer = useEthersSigner();

  const [erc165, setERC165] = useState<Contract>();
  const [erc721Enumerable, setERC721Enumerable] = useState<Contract>();

  useEffect(() => {
    if (!provider || !address) {
      setERC165(undefined);
      setERC721Enumerable(undefined);
      return;
    }
    const erc165 = new ethers.Contract(address, ERC165Abi, signer || provider);
    const erc721Enumerable = new ethers.Contract(address, erc721EnumerableAbi, signer || provider);
    setERC165(erc165);
    setERC721Enumerable(erc721Enumerable);
  }, [provider, signer, address]);

  return {
    erc165,
    erc721Enumerable,
  };
};
