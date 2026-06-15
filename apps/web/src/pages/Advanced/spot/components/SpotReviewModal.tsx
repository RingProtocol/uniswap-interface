import {
  DISCLAIMER_URL,
  SwapStatus as SpotSwapStatus,
  Steps,
  isNativeAddress,
  useExplorerLink,
  useNetwork,
  useSpot,
  type ParsedError,
} from '@orbs-network/spot-react'
import { SwapFlow, SwapStatus as SwapFlowStatus, type Step } from '@orbs-network/swap-ui'
import type { Currency, CurrencyAmount } from '@uniswap/sdk-core'
import CurrencyLogo from 'components/Logo/CurrencyLogo'
import styled from 'lib/styled-components'
import { useCallback, useMemo, useState } from 'react'
import { Anchor, Button, Flex, ModalCloseIcon, SpinningLoader, Switch, Text, Tooltip } from 'ui/src'
import { InfoCircleFilled } from 'ui/src/components/icons/InfoCircleFilled'
import { Modal } from 'uniswap/src/components/modals/Modal'
import { shortenAddress } from 'utilities/src/addresses'
import { NumberType, useFormatter } from 'utils/formatNumbers'

import { LIMIT_ORDER_MODAL_NAME, SPOT_FIELD_TOOLTIPS } from 'pages/Advanced/spot/constants'
import { useCurrencyAmountFromRawAmount, useSpotSwapFormState } from 'pages/Advanced/spot/hooks/useSpotSwapFormState'
import {
  formatMillisecondsAsDuration,
  formatTimestamp,
  getSpotModuleLabel,
  getTriggerPriceTooltip,
  isTriggerModule,
} from 'pages/Advanced/spot/utils'

const REVIEW_TOOLTIPS = {
  expiration: SPOT_FIELD_TOOLTIPS.expiry,
  tradeSize:
    'The number of input tokens that will be removed from your balance and swapped for the output token in each individual trade.',
  totalTrades: SPOT_FIELD_TOOLTIPS.tradesAmount,
  minReceived:
    'This is the minimum number of tokens that may be received. NOTE: This minimum only refers to executed trades. Some trades may not be executed if the limit price is higher than the available market prices and your order may only be partially filled.',
  limitPrice: SPOT_FIELD_TOOLTIPS.limitPrice,
  tradeInterval: SPOT_FIELD_TOOLTIPS.tradeInterval,
}

const SWAP_FLOW_TOKEN_LOGO_FRAME_SIZE = 40
const SWAP_FLOW_TOKEN_LOGO_SIZE = 32

const SwapFlowTokenLogoFrame = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 ${SWAP_FLOW_TOKEN_LOGO_FRAME_SIZE}px;
  width: ${SWAP_FLOW_TOKEN_LOGO_FRAME_SIZE}px;
  height: ${SWAP_FLOW_TOKEN_LOGO_FRAME_SIZE}px;

  [data-testid='token-logo'] {
    width: ${SWAP_FLOW_TOKEN_LOGO_SIZE}px !important;
    height: ${SWAP_FLOW_TOKEN_LOGO_SIZE}px !important;
  }
`

export function SpotSubmitOrderModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [accepted, setAccepted] = useState(true)
  const spot = useSpot()
  const { setTypedInputAmount } = useSpotSwapFormState()
  const module = spot.module
  const { confirmButtonLoading, isSuccess, onSubmit, resetCurrentSwap, resetState, status } = spot.orderExecutionPanel
  const isSubmitted = status !== undefined

  const closeModal = useCallback(() => {
    setAccepted(true)
    onClose()

    if (isSuccess) {
      setTypedInputAmount('')
      setTimeout(() => {
        resetState()
      }, 500)
    } else if (isSubmitted) {
      setTimeout(() => {
        resetCurrentSwap()
      }, 500)
    }
  }, [isSubmitted, isSuccess, onClose, resetCurrentSwap, resetState, setTypedInputAmount])

  return (
    <Modal name={LIMIT_ORDER_MODAL_NAME} isModalOpen={isOpen} onClose={closeModal} maxWidth={520} padding={0}>
      <Flex gap="$spacing16" p="$spacing20">
        <SpotSubmitModalHeader
          title={isSubmitted ? undefined : `Review ${getSpotModuleLabel(module)} order`}
          closeModal={closeModal}
        />
        <SpotSubmitSwapFlow />
        {!isSubmitted && (
          <>
            <Flex row alignItems="center" justifyContent="space-between" gap="$spacing12">
              <Flex row alignItems="center" gap="$spacing4" flex={1}>
                <Text variant="body4" color="$neutral2">
                  Accept
                </Text>
                <Anchor href={DISCLAIMER_URL} target="_blank" textDecorationLine="none">
                  <Text variant="body4" color="$accent1">
                    Disclaimer
                  </Text>
                </Anchor>
              </Flex>
              <Switch checked={accepted} onCheckedChange={setAccepted} variant="branded" />
            </Flex>
            <Button
              variant="branded"
              size="large"
              fill={false}
              width="100%"
              loading={Boolean(confirmButtonLoading)}
              isDisabled={!accepted || Boolean(confirmButtonLoading)}
              onPress={onSubmit}
            >
              Create Order
            </Button>
          </>
        )}
      </Flex>
    </Modal>
  )
}

function SpotSubmitModalHeader({ title, closeModal }: { title?: string; closeModal: () => void }) {
  return (
    <Flex row justifyContent={title ? 'space-between' : 'flex-end'} alignItems="center" gap="$spacing12" width="100%">
      {title && <Text variant="body2">{title}</Text>}
      <ModalCloseIcon onClose={closeModal} />
    </Flex>
  )
}

function SpotSubmitSwapFlow() {
  const spot = useSpot()
  const { inputCurrency, outputCurrency } = useSpotSwapFormState()
  const form = spot.derivedFormData
  const { status, stepIndex, totalSteps, parsedError, srcToken, dstToken } = spot.orderExecutionPanel
  const currentStep = useSpotSwapFlowStep()
  const swapStatus = getSwapFlowStatus(status)
  const inputAmount = useCurrencyAmountFromRawAmount(inputCurrency, form.srcAmount)
  const outputAmount = useCurrencyAmountFromRawAmount(outputCurrency, form.dstAmount)
  const inToken = useMemo(
    () => ({
      symbol: srcToken?.symbol ?? form.srcToken?.symbol ?? spot.pricePanel.fromToken?.symbol,
      logoUrl: srcToken?.logoUrl,
    }),
    [form.srcToken?.symbol, spot.pricePanel.fromToken?.symbol, srcToken?.logoUrl, srcToken?.symbol],
  )
  const outToken = useMemo(
    () => ({
      symbol: dstToken?.symbol ?? form.dstToken?.symbol ?? spot.pricePanel.toToken?.symbol,
      logoUrl: dstToken?.logoUrl,
    }),
    [dstToken?.logoUrl, dstToken?.symbol, form.dstToken?.symbol, spot.pricePanel.toToken?.symbol],
  )

  return (
    <SwapFlow
      inAmount={inputAmount?.toSignificant()}
      outAmount={outputAmount?.toSignificant()}
      swapStatus={swapStatus}
      totalSteps={totalSteps}
      currentStep={currentStep}
      currentStepIndex={stepIndex}
      inToken={inToken}
      outToken={outToken}
      components={{
        SrcTokenLogo: inputCurrency ? <SpotSwapFlowCurrencyLogo currency={inputCurrency} /> : undefined,
        DstTokenLogo: outputCurrency ? <SpotSwapFlowCurrencyLogo currency={outputCurrency} /> : undefined,
        Failed: <SpotSubmitFailed error={parsedError} />,
        Success: <SpotSubmitSuccess />,
        Main: <SpotSubmitMain />,
        Loader: <SpinningLoader color="$accent1" size={60} />,
      }}
    />
  )
}

function SpotSwapFlowCurrencyLogo({ currency }: { currency: Currency }) {
  return (
    <SwapFlowTokenLogoFrame>
      <CurrencyLogo currency={currency} size={SWAP_FLOW_TOKEN_LOGO_SIZE} />
    </SwapFlowTokenLogoFrame>
  )
}

function SpotSubmitMain() {
  const spot = useSpot()
  const form = spot.derivedFormData
  const { status } = spot.orderExecutionPanel
  const { formatFiatPrice } = useFormatter()
  const inputUsd = formatUsdAmount(form.srcAmountUsd, formatFiatPrice)
  const outputUsd = formatUsdAmount(form.dstAmountUsd, formatFiatPrice)
  const isSubmitted = status !== undefined

  return (
    <Flex gap="$spacing16" width="100%">
      <SwapFlow.Main
        fromTitle="From"
        toTitle="To"
        inUsd={
          inputUsd ? (
            <Text variant="body4" color="$neutral2">
              {inputUsd}
            </Text>
          ) : undefined
        }
        outUsd={
          outputUsd ? (
            <Text variant="body4" color="$neutral2">
              {outputUsd}
            </Text>
          ) : undefined
        }
      />
      {!isSubmitted && <SpotReviewDetails />}
    </Flex>
  )
}

function SpotSubmitSuccess() {
  const module = useSpot().module

  return (
    <>
      <SwapFlow.Success title={`${getSpotModuleLabel(module)} order created`} />
      <SpotWrapMessage />
    </>
  )
}

function SpotSubmitFailed({ error }: { error?: ParsedError }) {
  return (
    <SwapFlow.Failed
      error={
        <Flex gap="$spacing8">
          <Text variant="subheading2">Transaction failed</Text>
          {error?.message && (
            <Text variant="body3" color="$neutral2">
              {error.message}
            </Text>
          )}
          {error?.code && (
            <Text variant="body4" color="$neutral2">
              Error code: {error.code}
            </Text>
          )}
          <SpotWrapMessage />
        </Flex>
      }
    />
  )
}

function SpotWrapMessage() {
  const { srcToken, wrapTxHash } = useSpot().orderExecutionPanel
  const wrappedSymbol = useNetwork()?.wToken?.symbol

  if (!wrapTxHash) {
    return null
  }

  return (
    <Text variant="body4" color="$neutral2">
      Wrapped {srcToken?.symbol || 'native token'} to {wrappedSymbol || 'wrapped token'} before creating the order.
    </Text>
  )
}

function useSpotSwapFlowStep(): Step | undefined {
  const spot = useSpot()
  const { approveTxHash, status, step, srcToken, wrapTxHash } = spot.orderExecutionPanel
  const network = useNetwork()
  const wrapExplorerUrl = useExplorerLink(wrapTxHash)
  const approveExplorerUrl = useExplorerLink(approveTxHash)
  const isNativeInput = isNativeAddress(srcToken?.address || '')
  const symbol = isNativeInput ? network?.native.symbol || '' : srcToken?.symbol || ''
  const orderTitle = getSpotModuleLabel(spot.module)

  return useMemo((): Step | undefined => {
    if (step === Steps.WRAP) {
      return {
        title: `Wrap ${symbol}`,
        footerLink: wrapExplorerUrl,
        footerText: wrapExplorerUrl ? 'View on explorer' : 'Proceed in wallet',
      }
    }

    if (step === Steps.APPROVE) {
      return {
        title: `Approve ${symbol}`,
        footerLink: approveExplorerUrl,
        footerText: approveExplorerUrl ? 'View on explorer' : 'Proceed in wallet',
      }
    }

    return {
      title: status === SpotSwapStatus.SUCCESS ? `${orderTitle} order created` : `Create ${orderTitle} order`,
      footerText: status === SpotSwapStatus.LOADING ? 'Proceed in wallet' : undefined,
    }
  }, [approveExplorerUrl, orderTitle, status, step, symbol, wrapExplorerUrl])
}

function SpotReviewDetails() {
  const spot = useSpot()
  const { inputCurrency, outputCurrency } = useSpotSwapFormState()
  const form = spot.derivedFormData
  const module = spot.module
  const limitPrice = useCurrencyAmountFromRawAmount(outputCurrency, form.limitPrice)
  const triggerPrice = useCurrencyAmountFromRawAmount(outputCurrency, form.triggerPrice)
  const sizePerTrade = useCurrencyAmountFromRawAmount(inputCurrency, form.sizePerTrade)
  const minReceived = useCurrencyAmountFromRawAmount(outputCurrency, form.minDestAmountPerTrade)
  const feesAmount = useCurrencyAmountFromRawAmount(outputCurrency, form.feesAmount)
  const hasMultipleTrades = form.totalTrades > 1
  const inputSymbol = inputCurrency?.symbol ?? form.srcToken?.symbol ?? ''
  const outputSymbol = outputCurrency?.symbol ?? form.dstToken?.symbol ?? ''

  return (
    <Flex gap="$spacing8">
      <SpotReviewRow
        label="Expiration"
        value={form.deadline ? formatTimestamp(Number(form.deadline)) : '--'}
        tooltip={REVIEW_TOOLTIPS.expiration}
      />
      {isTriggerModule(module) && hasCurrencyAmount(triggerPrice) && (
        <SpotReviewRow
          label="Trigger Price"
          value={`1 ${inputSymbol} = ${triggerPrice.toSignificant()} ${outputSymbol}`}
          tooltip={getTriggerPriceTooltip(module)}
        />
      )}
      {!form.isMarketOrder && hasCurrencyAmount(limitPrice) && (
        <SpotReviewRow
          label="Limit Price"
          value={`1 ${inputSymbol} = ${limitPrice.toSignificant()} ${outputSymbol}`}
          tooltip={REVIEW_TOOLTIPS.limitPrice}
        />
      )}
      {hasCurrencyAmount(minReceived) && (
        <SpotReviewRow
          label={hasMultipleTrades ? 'Min. received per trade' : 'Min. received'}
          value={`${minReceived.toSignificant()} ${outputSymbol}`}
          tooltip={REVIEW_TOOLTIPS.minReceived}
        />
      )}
      {hasMultipleTrades && (
        <SpotReviewRow
          label="Individual trade size"
          value={`${sizePerTrade?.toSignificant() ?? '--'} ${inputSymbol}`}
          tooltip={REVIEW_TOOLTIPS.tradeSize}
        />
      )}
      {hasMultipleTrades && (
        <SpotReviewRow label="No. of trades" value={String(form.totalTrades)} tooltip={REVIEW_TOOLTIPS.totalTrades} />
      )}
      {hasMultipleTrades && (
        <SpotReviewRow
          label="Trade interval"
          value={formatMillisecondsAsDuration(form.tradeInterval)}
          tooltip={REVIEW_TOOLTIPS.tradeInterval}
        />
      )}
      {form.recipient && <SpotReviewRow label="Recipient" value={shortenAddress(form.recipient)} />}
      {hasCurrencyAmount(feesAmount) && form.feesPercentage && (
        <SpotReviewRow label={`Fees ${form.feesPercentage}%`} value={`${feesAmount.toSignificant()} ${outputSymbol}`} />
      )}
    </Flex>
  )
}

function SpotReviewRow({ label, value, tooltip }: { label: string; value: string; tooltip?: string }) {
  return (
    <Flex row justifyContent="space-between" gap="$spacing16">
      <Flex row alignItems="center" gap="$spacing4">
        <Text variant="body3" color="$neutral2">
          {label}
        </Text>
        {tooltip && (
          <Tooltip placement="top">
            <Tooltip.Trigger>
              <InfoCircleFilled color="$neutral3" size={12} />
            </Tooltip.Trigger>
            <Tooltip.Content maxWidth={300}>
              <Tooltip.Arrow />
              <Text variant="body4">{tooltip}</Text>
            </Tooltip.Content>
          </Tooltip>
        )}
      </Flex>
      <Text variant="body3" color="$neutral1" textAlign="right" flex={1}>
        {value}
      </Text>
    </Flex>
  )
}

function hasCurrencyAmount(amount?: CurrencyAmount<Currency>): amount is CurrencyAmount<Currency> {
  return Boolean(amount && amount.quotient.toString() !== '0')
}

function getSwapFlowStatus(status?: SpotSwapStatus) {
  switch (status) {
    case SpotSwapStatus.LOADING:
      return SwapFlowStatus.LOADING
    case SpotSwapStatus.SUCCESS:
      return SwapFlowStatus.SUCCESS
    case SpotSwapStatus.FAILED:
      return SwapFlowStatus.FAILED
    default:
      return undefined
  }
}

function formatUsdAmount(
  value: string,
  formatFiatPrice: ReturnType<typeof useFormatter>['formatFiatPrice'],
): string | undefined {
  if (!value) {
    return undefined
  }

  const parsedValue = Number(value)
  return Number.isFinite(parsedValue)
    ? formatFiatPrice({ price: parsedValue, type: NumberType.FiatTokenPrice })
    : undefined
}
