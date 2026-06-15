import { Callbacks, Module, SpotProvider } from '@orbs-network/spot-react'
import { Currency, CurrencyAmount } from '@uniswap/sdk-core'
import { useTokenBalancesQuery } from 'appGraphql/data/apollo/AdaptiveTokenBalancesProvider'
import { ToastRegularSimple } from 'components/Popups/ToastRegularSimple'
import { useAccount } from 'hooks/useAccount'
import { useMemo } from 'react'
import { Check } from 'react-feather'
import { toast } from 'sonner'
import { useIsSupportedChainId } from 'uniswap/src/features/chains/hooks/useSupportedChainId'
import { useTransactionSettingsContext } from 'uniswap/src/features/transactions/components/settings/contexts/TransactionSettingsContext'
import { useUSDCValue } from 'uniswap/src/features/transactions/hooks/useUSDCPrice'
import { useSwapFormContext } from 'uniswap/src/features/transactions/swap/contexts/SwapFormContext'
import { CurrencyField } from 'uniswap/src/types/currency'

import { SpotFormContent, SpotUnsupportedContent } from 'pages/Advanced/spot/components/SpotFormContent'
import { DEFAULT_MIN_CHUNK_SIZE_USD, DEFAULT_PRICE_PROTECTION, SPOT_PARTNER } from 'pages/Advanced/spot/constants'
import { SpotSwapFormStateProvider, useSpotSwapFormState } from 'pages/Advanced/spot/hooks/useSpotSwapFormState'
import { useSpotWalletInteractions } from 'pages/Advanced/spot/hooks/useSpotWalletInteractions'
import { currencyToSpotToken, getSpotConfig, oneTokenAmount } from 'pages/Advanced/spot/utils'

export function SpotOrderForm({ selectedModule }: { selectedModule: Module }) {
  return (
    <SpotSwapFormStateProvider>
      <SpotOrderFormContent selectedModule={selectedModule} />
    </SpotSwapFormStateProvider>
  )
}

function SpotOrderFormContent({ selectedModule }: { selectedModule: Module }) {
  const account = useAccount()
  const chainId = account.chainId
  const { inputBalance, inputCurrency, marketReferencePrice, outputBalance, outputCurrency, typedInputAmount } =
    useSpotSwapFormState()
  const { derivedSwapInfo } = useSwapFormContext()
  const spotConfig = useMemo(() => getSpotConfig(chainId), [chainId])
  const isSupportedChain = useIsSupportedChainId(chainId)
  const { priceProtection = DEFAULT_PRICE_PROTECTION } = useTransactionSettingsContext()
  const { refetch: refetchBalancesQuery } = useTokenBalancesQuery()

  const srcToken = useMemo(() => currencyToSpotToken(inputCurrency), [inputCurrency])
  const dstToken = useMemo(() => currencyToSpotToken(outputCurrency), [outputCurrency])

  const inputUsd1Token = useSpotUsd1Token(
    inputCurrency,
    derivedSwapInfo.currencyAmounts[CurrencyField.INPUT],
    derivedSwapInfo.currencyAmountsUSDValue[CurrencyField.INPUT],
  )
  const outputUsd1Token = useSpotUsd1Token(
    outputCurrency,
    derivedSwapInfo.currencyAmounts[CurrencyField.OUTPUT],
    derivedSwapInfo.currencyAmountsUSDValue[CurrencyField.OUTPUT],
  )
  const walletInteractions = useSpotWalletInteractions()
  const callbacks = useMemo<Callbacks>(
    () => ({
      onCancelOrderSuccess: () => {
        showSpotOrderToast('Order cancelled')
        refetchBalancesQuery()
      },
      onOrderCreated: () => {
        refetchBalancesQuery()
      },
      onOrderFilled: () => {
        showSpotOrderToast('Order filled')
        refetchBalancesQuery()
      },
      onOrdersProgressUpdate: () => refetchBalancesQuery(),
      onWrapSuccess: () => refetchBalancesQuery(),
    }),
    [refetchBalancesQuery],
  )
  const isNetworkSupported = Boolean(chainId && isSupportedChain && spotConfig)

  if (!chainId || !spotConfig) {
    return <SpotUnsupportedContent isNetworkSupported={isNetworkSupported} selectedModule={selectedModule} />
  }

  return (
    <SpotProvider
      key={selectedModule}
      account={account.address}
      callbacks={callbacks}
      chainId={chainId}
      dstBalance={outputBalance?.quotient.toString()}
      dstToken={dstToken}
      dstUsd1Token={outputUsd1Token}
      fees={0.25}
      marketReferencePrice={marketReferencePrice}
      minChunkSizeUsd={DEFAULT_MIN_CHUNK_SIZE_USD}
      module={selectedModule}
      partner={SPOT_PARTNER}
      priceProtection={priceProtection}
      srcBalance={inputBalance?.quotient.toString()}
      srcToken={srcToken}
      srcUsd1Token={inputUsd1Token}
      typedInputAmount={typedInputAmount}
      walletInteractions={walletInteractions}
    >
      <SpotFormContent isNetworkSupported={isNetworkSupported} />
    </SpotProvider>
  )
}

function useSpotUsd1Token(
  currency: Currency | undefined,
  currencyAmount: CurrencyAmount<Currency> | null | undefined,
  usdAmount: CurrencyAmount<Currency> | null | undefined,
) {
  const directUsdValue = useUSDCValue(oneTokenAmount(currency))

  return useMemo(
    () => getCurrencyAmountValue(directUsdValue) ?? getUsdValuePerToken(currencyAmount, usdAmount),
    [currencyAmount, directUsdValue, usdAmount],
  )
}

function getCurrencyAmountValue(amount: CurrencyAmount<Currency> | null | undefined) {
  const value = amount?.toSignificant(18)

  return value && Number(value) > 0 ? value : undefined
}

function showSpotOrderToast(text: string) {
  toast(<ToastRegularSimple icon={<Check size={18} />} text={text} />, { duration: 3_000 })
}

function getUsdValuePerToken(
  currencyAmount: CurrencyAmount<Currency> | null | undefined,
  usdAmount: CurrencyAmount<Currency> | null | undefined,
) {
  const tokenValue = Number(currencyAmount?.toSignificant(18))
  const usdValue = Number(usdAmount?.toSignificant(18))

  if (!Number.isFinite(tokenValue) || !Number.isFinite(usdValue) || tokenValue <= 0 || usdValue <= 0) {
    return undefined
  }

  return String(usdValue / tokenValue)
}
