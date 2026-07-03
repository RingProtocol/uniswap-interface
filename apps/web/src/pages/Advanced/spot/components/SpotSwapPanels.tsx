import { useTranslation } from 'react-i18next'
import { Flex } from 'ui/src'
import { CurrencyInputPanel } from 'uniswap/src/components/CurrencyInputPanel/CurrencyInputPanel'
import Trace from 'uniswap/src/features/telemetry/Trace'
import { SectionName } from 'uniswap/src/features/telemetry/constants'
import { useSwapFormContext } from 'uniswap/src/features/transactions/swap/contexts/SwapFormContext'
import { SwitchCurrenciesButton } from 'uniswap/src/features/transactions/swap/form/SwapFormScreen/SwitchCurrenciesButton'
import { WalletRestoreButton } from 'uniswap/src/features/transactions/swap/form/SwapFormScreen/WalletRestoreButton'
import { SwapTokenSelector } from 'uniswap/src/features/transactions/swap/form/body/SwapTokenSelector/SwapTokenSelector'
import { useSwapFormScreenState } from 'uniswap/src/features/transactions/swap/form/context/SwapFormScreenContext'
import { SwapFormScreenContextProvider } from 'uniswap/src/features/transactions/swap/form/context/SwapFormScreenContextProvider'
import { usePriceDifference } from 'uniswap/src/features/transactions/swap/hooks/usePriceDifference'
import { CurrencyField } from 'uniswap/src/types/currency'
import { isInterface } from 'utilities/src/platform'

export function SpotSwapPanels() {
  return (
    <SwapFormScreenContextProvider>
      <SpotSwapPanelsContent />
    </SwapFormScreenContextProvider>
  )
}

function SpotSwapPanelsContent() {
  const { t } = useTranslation()
  const { derivedSwapInfo, selectingCurrencyField } = useSwapFormContext()
  const { priceDifferencePercentage } = usePriceDifference(derivedSwapInfo)
  const {
    inputRef,
    outputRef,
    focusOnCurrencyField,
    currencies,
    currencyAmounts,
    currencyBalances,
    isFiatMode,
    exactFieldIsInput,
    exactFieldIsOutput,
    isSwapDataLoading,
    resetSelection,
    currencyAmountsUSDValue,
    exactValue,
    formattedDerivedValue,
    tokenColor,
    walletNeedsRestore,
    trade,
    onFocusInput,
    onInputSelectionChange,
    onSetExactAmountInput,
    onSetPresetValue,
    onShowTokenSelectorInput,
    onToggleIsFiatMode,
    onSwitchCurrencies,
    onFocusOutput,
    onOutputSelectionChange,
    onSetExactAmountOutput,
    onShowTokenSelectorOutput,
    showTemporaryFoTWarning,
    hoverStyles,
  } = useSwapFormScreenState()

  return (
    <>
      <Flex gap="$spacing2">
        <Trace section={SectionName.CurrencyInputPanel}>
          <Flex
            animation="simple"
            borderColor={focusOnCurrencyField === CurrencyField.INPUT ? '$surface3' : '$transparent'}
            borderRadius="$rounded20"
            backgroundColor={focusOnCurrencyField === CurrencyField.INPUT ? '$surface1' : '$surface2'}
            borderWidth="$spacing1"
            overflow="hidden"
            pb={currencies[CurrencyField.INPUT] ? '$spacing4' : '$none'}
            hoverStyle={hoverStyles.input}
          >
            <CurrencyInputPanel
              ref={inputRef}
              headerLabel={isInterface ? t('common.button.sell') : undefined}
              currencyAmount={currencyAmounts[CurrencyField.INPUT]}
              currencyBalance={currencyBalances[CurrencyField.INPUT]}
              currencyField={CurrencyField.INPUT}
              currencyInfo={currencies[CurrencyField.INPUT]}
              focus={selectingCurrencyField ? undefined : focusOnCurrencyField === CurrencyField.INPUT}
              isFiatMode={isFiatMode && exactFieldIsInput}
              isIndicativeLoading={trade.isIndicativeLoading}
              isLoading={!exactFieldIsInput && isSwapDataLoading}
              priceDifferencePercentage={priceDifferencePercentage}
              resetSelection={resetSelection}
              showSoftInputOnFocus={false}
              usdValue={currencyAmountsUSDValue[CurrencyField.INPUT]}
              value={exactFieldIsInput ? exactValue : formattedDerivedValue}
              valueIsIndicative={!exactFieldIsInput && trade.indicativeTrade && !trade.trade}
              tokenColor={tokenColor}
              onPressIn={onFocusInput}
              onSelectionChange={onInputSelectionChange}
              onSetExactAmount={onSetExactAmountInput}
              onSetPresetValue={onSetPresetValue}
              onShowTokenSelector={onShowTokenSelectorInput}
              onToggleIsFiatMode={onToggleIsFiatMode}
            />
          </Flex>
        </Trace>

        <SwitchCurrenciesButton onSwitchCurrencies={onSwitchCurrencies} />

        <Trace section={SectionName.CurrencyOutputPanel}>
          <Flex
            borderRadius="$rounded20"
            borderWidth="$spacing1"
            borderColor={focusOnCurrencyField === CurrencyField.OUTPUT ? '$surface3' : '$transparent'}
            backgroundColor={focusOnCurrencyField === CurrencyField.OUTPUT ? '$surface1' : '$surface2'}
            hoverStyle={hoverStyles.output}
          >
            <CurrencyInputPanel
              ref={outputRef}
              headerLabel={isInterface ? t('common.button.buy') : undefined}
              currencyAmount={currencyAmounts[CurrencyField.OUTPUT]}
              currencyBalance={currencyBalances[CurrencyField.OUTPUT]}
              currencyField={CurrencyField.OUTPUT}
              currencyInfo={currencies[CurrencyField.OUTPUT]}
              disabled
              focus={selectingCurrencyField ? undefined : focusOnCurrencyField === CurrencyField.OUTPUT}
              isFiatMode={isFiatMode && exactFieldIsOutput}
              isLoading={!exactFieldIsOutput && isSwapDataLoading}
              priceDifferencePercentage={priceDifferencePercentage}
              resetSelection={resetSelection}
              showSoftInputOnFocus={false}
              usdValue={currencyAmountsUSDValue[CurrencyField.OUTPUT]}
              value={exactFieldIsOutput ? exactValue : formattedDerivedValue}
              valueIsIndicative={!exactFieldIsOutput && trade.indicativeTrade && !trade.trade}
              tokenColor={tokenColor}
              onPressDisabled={showTemporaryFoTWarning}
              onPressIn={onFocusOutput}
              onSelectionChange={onOutputSelectionChange}
              onSetExactAmount={onSetExactAmountOutput}
              onSetPresetValue={onSetPresetValue}
              onShowTokenSelector={onShowTokenSelectorOutput}
              onToggleIsFiatMode={onToggleIsFiatMode}
            />
            {walletNeedsRestore && <WalletRestoreButton />}
          </Flex>
        </Trace>
      </Flex>
      <SwapTokenSelector isModalOpen={Boolean(selectingCurrencyField)} hideNetworkFilter />
    </>
  )
}
