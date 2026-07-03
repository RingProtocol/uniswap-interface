import { DISCLAIMER_URL, useSpot } from '@orbs-network/spot-react'
import { useAccountDrawer } from 'components/AccountDrawer/MiniPortfolio/hooks'
import { SwapSection } from 'components/swap/styled'
import { useAccount } from 'hooks/useAccount'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Anchor, Button, Flex, Text } from 'ui/src'

import { SpotSubmitOrderModal } from 'pages/Advanced/spot/components/SpotReviewModal'
import { DISCLAIMER_DEFAULTS } from 'pages/Advanced/spot/constants'
import { formatInputError, getSpotModuleLabel } from 'pages/Advanced/spot/utils'

export function SpotInputErrorPanel() {
  const spot = useSpot()

  if (!spot.inputError) {
    return null
  }

  return (
    <SwapSection height="unset" backgroundColor="$statusCritical2">
      <Text variant="body3" color="$statusCritical">
        {formatInputError(spot.inputError)}
      </Text>
    </SwapSection>
  )
}

export function SpotDisclaimerPanel() {
  const { t } = useTranslation()
  const spot = useSpot()
  const disclaimer = spot.disclaimerPanel

  if (!disclaimer) {
    return null
  }

  return (
    <SwapSection height="unset" backgroundColor="$surface2">
      <Flex gap="$spacing8">
        <Text variant="body4" color="$neutral2">
          {t(disclaimer, {
            defaultValue: DISCLAIMER_DEFAULTS[disclaimer] ?? disclaimer,
          })}
        </Text>
        <Anchor href={DISCLAIMER_URL} target="_blank" textDecorationLine="none">
          <Text variant="body4" color="$accent1">
            Learn more
          </Text>
        </Anchor>
      </Flex>
    </SwapSection>
  )
}

export function SpotOrderActions({ isNetworkSupported }: { isNetworkSupported: boolean }) {
  const { t } = useTranslation()
  const account = useAccount()
  const accountDrawer = useAccountDrawer()
  const chainId = account.chainId
  const spot = useSpot()
  const module = spot.module
  const [isReviewOpen, setIsReviewOpen] = useState(false)
  const isSpotSupportedChain = Boolean(chainId && spot.supportedChains.includes(chainId))
  const hasDestinationAmount = Boolean(spot.derivedFormData.dstAmount)

  const buttonText = !account.isConnected
    ? t('common.connectWallet.button')
    : !isNetworkSupported || !isSpotSupportedChain
      ? 'Unsupported network'
      : spot.submitOrderButton.loading
        ? hasDestinationAmount
          ? 'Preparing order...'
          : 'Fetching quote...'
        : `Review ${getSpotModuleLabel(module)} order`

  return (
    <Flex gap="$spacing12">
      <Button
        variant="branded"
        size="large"
        fill={false}
        width="100%"
        loading={account.isConnected && spot.submitOrderButton.loading}
        isDisabled={
          account.isConnected && (!isNetworkSupported || !isSpotSupportedChain || spot.submitOrderButton.disabled)
        }
        onPress={!account.isConnected ? accountDrawer.open : () => setIsReviewOpen(true)}
      >
        {buttonText}
      </Button>
      <SpotSubmitOrderModal isOpen={isReviewOpen} onClose={() => setIsReviewOpen(false)} />
    </Flex>
  )
}
