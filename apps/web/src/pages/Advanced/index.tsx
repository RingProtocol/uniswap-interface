import { PrefetchBalancesWrapper } from 'appGraphql/data/apollo/AdaptiveTokenBalancesProvider'
import { PageWrapper as SwapPageWrapper } from 'components/swap/styled'
import styled from 'lib/styled-components'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { MultichainContextProvider } from 'state/multichain/MultichainContext'
import { SwapAndLimitContextProvider } from 'state/swap/SwapContext'
import { useInitialCurrencyState } from 'state/swap/hooks'
import { SegmentedControl, SegmentedControlOption, Text } from 'ui/src'
import {
  TransactionModalContextProvider,
  TransactionScreen,
} from 'uniswap/src/features/transactions/components/TransactionModal/TransactionModalContext'
import { TransactionSettingsContextProvider } from 'uniswap/src/features/transactions/components/settings/contexts/TransactionSettingsContext'
import { TransactionSettingKey } from 'uniswap/src/features/transactions/components/settings/slice'
import { SwapFormContextProvider } from 'uniswap/src/features/transactions/swap/contexts/SwapFormContext'
import { useSwapPrefilledState } from 'uniswap/src/features/transactions/swap/form/hooks/useSwapPrefilledState'
import { currencyToAsset } from 'uniswap/src/features/transactions/swap/utils/asset'
import { CurrencyField } from 'uniswap/src/types/currency'
import noop from 'utilities/src/react/noop'

import { SpotModuleSelect } from 'pages/Advanced/spot/components/SpotModuleSelect'
import { SpotOrderForm } from 'pages/Advanced/spot/components/SpotOrderForm'
import { AdvancedRouteTab } from 'pages/Advanced/spot/constants'
import { useSpotRouteModule } from 'pages/Advanced/spot/hooks/useSpotRouteModule'
import { SpotFormSettings } from 'pages/Advanced/spot/settings/SpotFormSettings'

const AdvancedTabsRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  width: 100%;
`

const AdvancedTabsGroup = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  min-width: 0;
`

const AdvancedSettingsGroup = styled.div`
  display: flex;
  align-items: center;
  flex-shrink: 0;
  margin-left: auto;
`

function AdvancedPageContent() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { selectedModule, onSelectModule } = useSpotRouteModule()
  const [screen, setScreen] = useState(TransactionScreen.Form)

  const tabOptions = useMemo<readonly SegmentedControlOption<AdvancedRouteTab>[]>(
    () => [
      {
        value: '/swap',
        display: <Text variant="buttonLabel3">{t('swap.form.header')}</Text>,
      },
      {
        value: '/stock',
        display: <Text variant="buttonLabel3">{t('swap.stock')}</Text>,
      },
    ],
    [t],
  )

  return (
    <SwapPageWrapper gap="$spacing16">
      <AdvancedTabsRow>
        <AdvancedTabsGroup>
          <SegmentedControl
            outlined={false}
            size="large"
            options={tabOptions}
            selectedOption="/advanced"
            onSelectOption={(path) => navigate(path)}
          />
          <SpotModuleSelect selectedModule={selectedModule} onSelectModule={onSelectModule} />
        </AdvancedTabsGroup>
        <AdvancedSettingsGroup>
          <SpotFormSettings />
        </AdvancedSettingsGroup>
      </AdvancedTabsRow>
      <TransactionModalContextProvider bottomSheetViewStyles={{}} onClose={noop} screen={screen} setScreen={setScreen}>
        <SpotOrderForm selectedModule={selectedModule} />
      </TransactionModalContextProvider>
    </SwapPageWrapper>
  )
}

export default function AdvancedPage() {
  const { initialInputCurrency, initialOutputCurrency, initialChainId, initialTypedValue } = useInitialCurrencyState()
  const prefilledState = useSwapPrefilledState({
    input: currencyToAsset(initialInputCurrency),
    output: currencyToAsset(initialOutputCurrency),
    exactAmountToken: initialTypedValue ?? '',
    exactCurrencyField: CurrencyField.INPUT,
  })

  return (
    <MultichainContextProvider initialChainId={initialChainId}>
      <TransactionSettingsContextProvider settingKey={TransactionSettingKey.Swap}>
        <SwapAndLimitContextProvider
          initialInputCurrency={initialInputCurrency}
          initialOutputCurrency={initialOutputCurrency}
        >
          <PrefetchBalancesWrapper>
            <SwapFormContextProvider prefilledState={prefilledState} hideSettings hideFooter>
              <AdvancedPageContent />
            </SwapFormContextProvider>
          </PrefetchBalancesWrapper>
        </SwapAndLimitContextProvider>
      </TransactionSettingsContextProvider>
    </MultichainContextProvider>
  )
}
