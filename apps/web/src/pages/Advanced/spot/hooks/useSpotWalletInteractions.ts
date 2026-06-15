import { WalletInteractions } from '@orbs-network/spot-react'
import { useAccount } from 'hooks/useAccount'
import { useEthersWeb3Provider } from 'hooks/useEthersProvider'
import { useMemo } from 'react'
import ERC20_ABI from 'uniswap/src/abis/erc20.json'
import WETH_ABI from 'uniswap/src/abis/weth.json'
import { WRAPPED_NATIVE_CURRENCY } from 'uniswap/src/constants/tokens'
import { getContract } from 'utilities/src/contracts/getContract'
import { signTypedData } from 'utils/signing'

import { isSameAddress, typedDataTypesWithoutDomain } from 'pages/Advanced/spot/utils'

export function useSpotWalletInteractions() {
  const account = useAccount()
  const accountAddress = account.address
  const chainId = account.chainId

  const provider = useEthersWeb3Provider({ chainId })

  return useMemo<WalletInteractions>(
    () => ({
      wrapNativeToken: async (amount) => {
        if (!provider || !chainId || !accountAddress) {
          throw new Error('Wallet not connected')
        }

        const wethAddress = WRAPPED_NATIVE_CURRENCY[chainId]?.address
        if (!wethAddress) {
          throw new Error('Wrapped native token is not available on this network')
        }

        const wethContract = getContract(wethAddress, WETH_ABI, provider, accountAddress)
        const tx = await wethContract.deposit({ value: amount })
        await tx.wait()
        return tx.hash as `0x${string}`
      },
      approveToken: async ({ tokenAddress, amount, spenderAddress }) => {
        if (!provider || !accountAddress) {
          throw new Error('Wallet not connected')
        }

        const tokenContract = getContract(tokenAddress, ERC20_ABI, provider, accountAddress)
        const tx = await tokenContract.approve(spenderAddress, amount)
        await tx.wait()
        return tx.hash as `0x${string}`
      },
      cancelOrder: async ({ contractAddress, args, abi }) => {
        if (!provider || !accountAddress) {
          throw new Error('Wallet not connected')
        }

        const contract = getContract(contractAddress, abi, provider, accountAddress)
        const tx = await contract.cancel(...(args as unknown[]))
        await tx.wait()
        return tx.hash as `0x${string}`
      },
      signOrder: async ({ domain, types, message, account: signingAccount }) => {
        const typedDataChainId = domain.chainId === undefined ? undefined : Number(domain.chainId)

        if (!provider || !accountAddress || !chainId) {
          throw new Error('Wallet not connected')
        }

        if (!isSameAddress(signingAccount, accountAddress)) {
          throw new Error('Unexpected signing account')
        }

        if (typedDataChainId !== undefined && typedDataChainId !== chainId) {
          throw new Error('Unexpected signing chain')
        }

        const signer = provider.getSigner(accountAddress)
        return (await signTypedData(
          signer,
          domain as Parameters<typeof signTypedData>[1],
          typedDataTypesWithoutDomain(types),
          message,
        )) as `0x${string}`
      },
      getAllowance: async ({ tokenAddress, spenderAddress }) => {
        if (!provider || !accountAddress) {
          throw new Error('Wallet not connected')
        }

        const tokenContract = getContract(tokenAddress, ERC20_ABI, provider)
        const allowance = await tokenContract.allowance(accountAddress, spenderAddress)
        return allowance.toString()
      },
    }),
    [accountAddress, chainId, provider],
  )
}
