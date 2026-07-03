import { Module } from '@orbs-network/spot-react'
import OrbsLogo from 'assets/svg/orbslogo.svg'
import { useAccountDrawer } from 'components/AccountDrawer/MiniPortfolio/hooks'
import { SwapSection } from 'components/swap/styled'
import { useAccount } from 'hooks/useAccount'
import styled from 'lib/styled-components'
import { useTranslation } from 'react-i18next'
import { Button, Text } from 'ui/src'

import { SpotDisclaimerPanel, SpotInputErrorPanel, SpotOrderActions } from 'pages/Advanced/spot/components/SpotActions'
import { SpotModuleInputs } from 'pages/Advanced/spot/components/SpotModuleInputs'
import { SpotOrderHistory } from 'pages/Advanced/spot/components/SpotOrderHistory'
import { SpotPricesSection } from 'pages/Advanced/spot/components/SpotPriceSections'
import { SpotSwapPanels } from 'pages/Advanced/spot/components/SpotSwapPanels'
import { getSpotModuleLabel } from 'pages/Advanced/spot/utils'

type SpotFormContentProps = {
  isNetworkSupported: boolean
}

type SpotUnsupportedContentProps = SpotFormContentProps & {
  selectedModule: Module
}

const SpotFormStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
  width: 100%;

  &,
  *,
  button,
  input,
  textarea,
  select {
    font-family: inherit;
  }
`

const PoweredByOrbsLink = styled.a`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  align-self: center;
  padding: 12px 0 4px;
  color: ${({ theme }) => theme.neutral1};
  font-size: 14px;
  font-weight: 500;
  line-height: 20px;
  text-decoration: none;
  margin-top: 10px;

  &:hover {
    color: ${({ theme }) => theme.neutral2};
  }
`

const OrbsLogoImage = styled.img`
  width: 24px;
  height: 24px;
  flex: 0 0 auto;
`

function PoweredByOrbs() {
  return (
    <PoweredByOrbsLink href="https://www.orbs.com/" target="_blank" rel="noopener noreferrer">
      <span>Powered by Orbs</span>
      <OrbsLogoImage src={OrbsLogo} alt="" aria-hidden="true" />
    </PoweredByOrbsLink>
  )
}

export function SpotFormContent({ isNetworkSupported }: SpotFormContentProps) {
  return (
    <SpotFormStack>
      <SpotSwapPanels />
      <SwapSection height="unset">
        <SpotPricesSection />
      </SwapSection>
      <SwapSection height="unset">
        <SpotModuleInputs />
      </SwapSection>
      <SpotInputErrorPanel />
      <SpotDisclaimerPanel />
      <SpotOrderActions isNetworkSupported={isNetworkSupported} />
      <SpotOrderHistory />
      <PoweredByOrbs />
    </SpotFormStack>
  )
}

export function SpotUnsupportedContent({ isNetworkSupported, selectedModule }: SpotUnsupportedContentProps) {
  const { t } = useTranslation()
  const account = useAccount()
  const accountDrawer = useAccountDrawer()

  return (
    <SpotFormStack>
      <SpotSwapPanels />
      <SwapSection height="unset">
        <Text variant="body3" color="$statusCritical">
          {getSpotModuleLabel(selectedModule)} orders are not available on this network.
        </Text>
      </SwapSection>
      <Button
        variant="branded"
        size="large"
        fill={false}
        width="100%"
        isDisabled={account.isConnected && !isNetworkSupported}
        onPress={!account.isConnected ? accountDrawer.open : undefined}
      >
        {!account.isConnected ? t('common.connectWallet.button') : 'Unsupported network'}
      </Button>
      <PoweredByOrbs />
    </SpotFormStack>
  )
}
