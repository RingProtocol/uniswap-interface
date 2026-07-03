import { MarketReferencePrice } from '@orbs-network/spot-react'
import { Currency } from '@uniswap/sdk-core'
import { useAccount } from 'hooks/useAccount'
import { ReactNode, createContext, useCallback, useContext, useEffect, useMemo } from 'react'
import { nativeOnChain } from 'uniswap/src/constants/tokens'
import { getChainInfo } from 'uniswap/src/features/chains/chainInfo'
import { useIsSupportedChainId } from 'uniswap/src/features/chains/hooks/useSupportedChainId'
import { useSwapFormContext } from 'uniswap/src/features/transactions/swap/contexts/SwapFormContext'
import { useOnSelectCurrency } from 'uniswap/src/features/transactions/swap/form/hooks/useOnSelectCurrency'
import { CurrencyField } from 'uniswap/src/types/currency'

import { currencyAmountFromRawAmount } from 'pages/Advanced/spot/utils'

type FiatValue = { data?: number; isLoading: boolean }

const SpotSwapFormStateContext = createContext<SpotSwapFormState | undefined>(undefined)

function useSpotSwapFormStateValue() {
  const { derivedSwapInfo, exactAmountToken, input, output, updateSwapForm } = useSwapFormContext()
  const onSelectSwapCurrency = useOnSelectCurrency({})
  const inputCurrency = derivedSwapInfo.currencies[CurrencyField.INPUT]?.currency
  const outputCurrency = derivedSwapInfo.currencies[CurrencyField.OUTPUT]?.currency
  const chainId = useAccount().chainId
  const isSupportedChain = useIsSupportedChainId(chainId)

  const onSelectCurrency = useCallback(
    (field: CurrencyField, currency: Currency) => {
      onSelectSwapCurrency({
        currency,
        field,
        forceIsBridgePair: false,
        isPreselectedAsset: false,
      })
    },
    [onSelectSwapCurrency],
  )

  const setTypedInputAmount = useCallback(
    (value: string) => {
      updateSwapForm({
        exactAmountFiat: undefined,
        exactAmountToken: value,
        exactCurrencyField: CurrencyField.INPUT,
        focusOnCurrencyField: CurrencyField.INPUT,
        isFiatMode: false,
        presetPercentage: undefined,
      })
    },
    [updateSwapForm],
  )

  const onSwitchCurrencies = useCallback(() => {
    updateSwapForm({
      exactAmountFiat: undefined,
      exactCurrencyField: CurrencyField.INPUT,
      focusOnCurrencyField: CurrencyField.INPUT,
      input: output,
      output: input,
    })
  }, [input, output, updateSwapForm])

  useEffect(() => {
    if (!outputCurrency && isSupportedChain && chainId && inputCurrency) {
      const stablecoinCurrency = getChainInfo(chainId).spotPriceStablecoinAmount.currency
      onSelectCurrency(
        CurrencyField.OUTPUT,
        inputCurrency.equals(stablecoinCurrency) ? nativeOnChain(chainId) : stablecoinCurrency,
      )
    }
  }, [chainId, inputCurrency, isSupportedChain, onSelectCurrency, outputCurrency])

  const typedInputAmount = exactAmountToken ?? ''

  const marketReferencePrice = useMemo<MarketReferencePrice>(() => {
    const quotedInputAmount = derivedSwapInfo.exactAmountToken ?? ''
    const isQuoteStale = typedInputAmount !== quotedInputAmount
    const trade = derivedSwapInfo.trade.trade ?? derivedSwapInfo.trade.indicativeTrade
    const outputAmount = isQuoteStale ? undefined : trade?.quoteOutputAmount ?? trade?.outputAmount
    const isLoading =
      Boolean(typedInputAmount && inputCurrency && outputCurrency) &&
      (isQuoteStale ||
        (!outputAmount &&
          (derivedSwapInfo.trade.isLoading ||
            derivedSwapInfo.trade.isFetching ||
            derivedSwapInfo.trade.isIndicativeLoading)))

    return {
      value: outputAmount?.quotient.toString(),
      isLoading,
      noLiquidity: Boolean(typedInputAmount && inputCurrency && outputCurrency && !isLoading && !outputAmount),
    }
  }, [
    derivedSwapInfo.exactAmountToken,
    derivedSwapInfo.trade.indicativeTrade,
    derivedSwapInfo.trade.isFetching,
    derivedSwapInfo.trade.isIndicativeLoading,
    derivedSwapInfo.trade.isLoading,
    derivedSwapInfo.trade.trade,
    inputCurrency,
    outputCurrency,
    typedInputAmount,
  ])

  const inputFiatValue = useMemo<FiatValue>(
    () => ({
      data: derivedSwapInfo.currencyAmountsUSDValue[CurrencyField.INPUT]
        ? Number(derivedSwapInfo.currencyAmountsUSDValue[CurrencyField.INPUT]?.toSignificant())
        : undefined,
      isLoading: derivedSwapInfo.trade.isLoading || Boolean(derivedSwapInfo.trade.isFetching),
    }),
    [derivedSwapInfo.currencyAmountsUSDValue, derivedSwapInfo.trade.isFetching, derivedSwapInfo.trade.isLoading],
  )

  const inputBalance = derivedSwapInfo.currencyBalances[CurrencyField.INPUT] ?? undefined
  const outputBalance = derivedSwapInfo.currencyBalances[CurrencyField.OUTPUT] ?? undefined
  return useMemo(
    () => ({
      inputBalance,
      inputCurrency,
      inputFiatValue,
      marketReferencePrice,
      onSelectCurrency,
      onSwitchCurrencies,
      outputBalance,
      outputCurrency,
      setTypedInputAmount,
      typedInputAmount,
    }),
    [
      inputBalance,
      inputCurrency,
      inputFiatValue,
      marketReferencePrice,
      onSelectCurrency,
      onSwitchCurrencies,
      outputBalance,
      outputCurrency,
      setTypedInputAmount,
      typedInputAmount,
    ],
  )
}

type SpotSwapFormState = ReturnType<typeof useSpotSwapFormStateValue>

export function SpotSwapFormStateProvider({ children }: { children: ReactNode }) {
  const value = useSpotSwapFormStateValue()

  return <SpotSwapFormStateContext.Provider value={value}>{children}</SpotSwapFormStateContext.Provider>
}

export function useSpotSwapFormState() {
  const context = useContext(SpotSwapFormStateContext)

  if (!context) {
    throw new Error('useSpotSwapFormState must be used within SpotSwapFormStateProvider')
  }

  return context
}

export function useCurrencyAmountFromRawAmount(currency?: Currency, rawAmount?: string) {
  return useMemo(() => currencyAmountFromRawAmount(currency, rawAmount), [currency, rawAmount])
}
