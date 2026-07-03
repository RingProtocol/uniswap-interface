import { Module, useSpot } from '@orbs-network/spot-react'
import { Flex, Text } from 'ui/src'

import {
  SpotFieldLabel,
  SpotFramedInput,
  SpotPriceInputGroup,
  SpotTimeUnitSelect,
} from 'pages/Advanced/spot/components/SpotInputControls'
import { SPOT_FIELD_TOOLTIPS } from 'pages/Advanced/spot/constants'
import { useCurrencyAmountFromRawAmount, useSpotSwapFormState } from 'pages/Advanced/spot/hooks/useSpotSwapFormState'

export function SpotModuleInputs() {
  const module = useSpot().module

  return module === Module.TWAP ? (
    <Flex gap="$spacing16">
      <SpotTradesSection />
      <SpotFillDelaySection />
    </Flex>
  ) : (
    <SpotDurationSection />
  )
}

function SpotTradesSection() {
  const spot = useSpot()
  const { inputCurrency } = useSpotSwapFormState()
  const amountPerTrade = useCurrencyAmountFromRawAmount(inputCurrency, spot.tradesAmountPanel.amountPerTrade)
  const amountPerTradeSymbol = amountPerTrade?.currency.symbol

  return (
    <Flex gap="$spacing16">
      <SpotFieldLabel label="Over" tooltip={SPOT_FIELD_TOOLTIPS.tradesAmount} />
      <SpotPriceInputGroup>
        <Flex gap="$spacing8" width="100%">
          <SpotFramedInput
            ariaLabel="Number of trades"
            value={spot.tradesAmountPanel.totalTrades.toString()}
            onUserInput={(value) => spot.tradesAmountPanel.onChange(Number(value || 0))}
            error={Boolean(spot.tradesAmountPanel.error)}
            maxDecimals={0}
            inputAlign="left"
            endLabel="Trades"
          />
          {amountPerTrade && (
            <Text variant="body4" color="$neutral2" textAlign="left" width="100%">
              {amountPerTrade.toSignificant()}
              {amountPerTradeSymbol ? ` ${amountPerTradeSymbol}` : ''} per trade
            </Text>
          )}
        </Flex>
      </SpotPriceInputGroup>
    </Flex>
  )
}

function SpotFillDelaySection() {
  const spot = useSpot()

  return (
    <Flex gap="$spacing16">
      <SpotFieldLabel label="Every" tooltip={SPOT_FIELD_TOOLTIPS.tradeInterval} />
      <SpotPriceInputGroup>
        <SpotFramedInput
          ariaLabel="Trade interval"
          value={spot.fillDelayPanel.fillDelay.value?.toString() ?? ''}
          onUserInput={spot.fillDelayPanel.onInputChange}
          error={Boolean(spot.fillDelayPanel.error)}
          inputAlign="left"
        />
        <SpotTimeUnitSelect
          value={spot.fillDelayPanel.fillDelay.unit}
          onChange={spot.fillDelayPanel.onUnitSelect}
          ariaLabel="Trade interval unit"
        />
      </SpotPriceInputGroup>
    </Flex>
  )
}

function SpotDurationSection() {
  const spot = useSpot()

  return (
    <Flex gap="$spacing16">
      <SpotFieldLabel label="Expiry" tooltip={SPOT_FIELD_TOOLTIPS.expiry} />
      <SpotPriceInputGroup>
        <SpotFramedInput
          ariaLabel="Expiry"
          value={spot.durationPanel.duration.value?.toString() ?? ''}
          onUserInput={spot.durationPanel.onInputChange}
          error={Boolean(spot.durationPanel.error)}
          inputAlign="left"
        />
        <SpotTimeUnitSelect
          value={spot.durationPanel.duration.unit}
          onChange={spot.durationPanel.onUnitSelect}
          ariaLabel="Expiry unit"
        />
      </SpotPriceInputGroup>
    </Flex>
  )
}
