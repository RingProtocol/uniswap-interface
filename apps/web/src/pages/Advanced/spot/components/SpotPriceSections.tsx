import { Module, useSpot } from '@orbs-network/spot-react'
import { Button, Flex, IconButton, Switch, Text } from 'ui/src'
import { ArrowUpDown } from 'ui/src/components/icons/ArrowUpDown'

import { useAccount } from 'hooks/useAccount'
import {
  SpotFieldLabel,
  SpotFramedInput,
  SpotPercentInput,
  SpotPriceInputGroup,
} from 'pages/Advanced/spot/components/SpotInputControls'
import { SPOT_FIELD_TOOLTIPS } from 'pages/Advanced/spot/constants'
import { useCurrencyAmountFromRawAmount } from 'pages/Advanced/spot/hooks/useSpotSwapFormState'
import {
  formatInputError,
  getTriggerPriceTooltip,
  isTriggerModule,
  spotTokenToCurrency,
} from 'pages/Advanced/spot/utils'
import { useMemo } from 'react'

export function SpotPricesSection() {
  const module = useSpot().module

  return (
    <Flex gap="$spacing16">
      <SpotRateHeader />
      {isTriggerModule(module) && <SpotTriggerPriceSection />}
      <SpotLimitPriceSection />
    </Flex>
  )
}

function SpotRateHeader() {
  const spot = useSpot()
  const fromSymbol = spot.pricePanel.fromToken?.symbol ?? 'token'
  const actionLabel = spot.pricePanel.isInverted ? 'Buy' : 'Sell'

  return (
    <Flex row justifyContent="space-between" alignItems="center" gap="$spacing12">
      <Text variant="subheading2" color="$neutral2">
        {actionLabel} {fromSymbol} at {spot.pricePanel.isMarketPrice ? 'best rate' : 'rate'}
      </Text>
      {!spot.pricePanel.isMarketPrice && (
        <IconButton
          size="small"
          emphasis="secondary"
          fill={false}
          onPress={spot.pricePanel.onInvert}
          aria-label="Invert price pair"
          icon={<ArrowUpDown />}
        />
      )}
    </Flex>
  )
}

function SpotLimitPriceSection() {
  const spot = useSpot()
  const module = spot.module
  const hasLimitPriceInput = module === Module.LIMIT || spot.limitPricePanel.isLimitPrice
  const showOptionalLimitToggle = module !== Module.LIMIT
  const chainId = useAccount().chainId

  const currency = useMemo(
    () => spotTokenToCurrency(spot.limitPricePanel.invertedDstToken, chainId),
    [chainId, spot.limitPricePanel.invertedDstToken],
  )

  const limitPrice = useCurrencyAmountFromRawAmount(currency, spot.limitPricePanel.price)
  const limitPriceValue = spot.limitPricePanel.isTypedValue
    ? spot.limitPricePanel.priceUI
    : limitPrice?.toSignificant() ?? ''

  return (
    <Flex gap="$spacing12">
      <Flex row justifyContent="space-between" alignItems="center">
        {showOptionalLimitToggle ? (
          <Flex row alignItems="center" gap="$spacing8" flex={1}>
            <Switch
              checked={spot.limitPricePanel.isLimitPrice}
              onCheckedChange={spot.limitPricePanel.toggleLimitPrice}
              variant="branded"
            />
            <SpotFieldLabel label="Limit Price" tooltip={SPOT_FIELD_TOOLTIPS.limitPrice} />
          </Flex>
        ) : (
          <SpotFieldLabel label="Limit Price" tooltip={SPOT_FIELD_TOOLTIPS.limitPrice} />
        )}
        {hasLimitPriceInput && (
          <Button size="small" emphasis="tertiary" fill={false} onPress={spot.limitPricePanel.onReset}>
            Set to default
          </Button>
        )}
        {!hasLimitPriceInput && (
          <Text variant="body4" color="$neutral2">
            Market order
          </Text>
        )}
      </Flex>
      {hasLimitPriceInput ? (
        <>
          <SpotPriceInputGroup>
            <SpotFramedInput
              ariaLabel="Limit price"
              startLabel={currency?.symbol ?? ''}
              value={limitPriceValue}
              onUserInput={spot.limitPricePanel.onInputChange}
              error={Boolean(spot.limitPricePanel.error)}
              usdValue={spot.limitPricePanel.usd || '0'}
            />
            <SpotPercentInput
              ariaLabel="Limit price percentage"
              value={spot.limitPricePanel.percentage}
              onUserInput={spot.limitPricePanel.onPercentageChange}
              error={Boolean(spot.limitPricePanel.error)}
            />
          </SpotPriceInputGroup>
        </>
      ) : null}
    </Flex>
  )
}

function SpotTriggerPriceSection() {
  const spot = useSpot()
  const chainId = useAccount().chainId
  const priceError = formatInputError(spot.triggerPricePanel.error)
  const currency = useMemo(
    () => spotTokenToCurrency(spot.triggerPricePanel.invertedDstToken, chainId),
    [chainId, spot.triggerPricePanel.invertedDstToken],
  )
  const triggerPrice = useCurrencyAmountFromRawAmount(currency, spot.triggerPricePanel.price)
  const triggerPriceValue = spot.triggerPricePanel.isTypedValue
    ? spot.triggerPricePanel.priceUI
    : triggerPrice?.toSignificant() ?? ''

  return (
    <Flex gap="$spacing12">
      <Flex row justifyContent="space-between" alignItems="center">
        <SpotFieldLabel label="Trigger Price" tooltip={getTriggerPriceTooltip(spot.module)} />
        <Button size="small" emphasis="tertiary" fill={false} onPress={spot.triggerPricePanel.onReset}>
          Set to default
        </Button>
      </Flex>
      <SpotPriceInputGroup>
        <SpotFramedInput
          ariaLabel="Trigger price"
          startLabel={currency?.symbol ?? ''}
          value={triggerPriceValue}
          onUserInput={spot.triggerPricePanel.onInputChange}
          error={Boolean(priceError)}
          usdValue={spot.triggerPricePanel.usd || '0'}
        />
        <SpotPercentInput
          ariaLabel="Trigger price percentage"
          value={spot.triggerPricePanel.percentage}
          onUserInput={spot.triggerPricePanel.onPercentageChange}
          error={Boolean(priceError)}
        />
      </SpotPriceInputGroup>
    </Flex>
  )
}
