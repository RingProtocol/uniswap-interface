import { useState } from 'react'
import { Flex, Popover } from 'ui/src'
import { TransactionSettingsModal } from 'uniswap/src/features/transactions/components/settings/TransactionSettingsModal/TransactionSettingsModal'
import { SwapFormSettingsButton } from 'uniswap/src/features/transactions/swap/form/header/SwapFormSettings/SwapFormSettingsButton'
import { dismissNativeKeyboard } from 'utilities/src/device/keyboard/dismissNativeKeyboard'
import { useEvent } from 'utilities/src/react/hooks'

import { PriceProtection } from 'pages/Advanced/spot/settings/PriceProtection'

const SPOT_SETTINGS = [PriceProtection]

export function SpotFormSettings() {
  const [isOpen, setIsOpen] = useState(false)

  const onPressSettings = useEvent(() => {
    setIsOpen((current) => !current)
    dismissNativeKeyboard()
  })

  const onClose = useEvent(() => {
    setIsOpen(false)
  })

  return (
    <Popover placement="bottom-end" open={isOpen} onOpenChange={(open: boolean) => !open && onClose()}>
      <Flex>
        <SwapFormSettingsButton
          shouldShowCustomSlippage={false}
          shouldShowTooltip={false}
          iconColor="$neutral2"
          onPress={onPressSettings}
        />
        <TransactionSettingsModal
          settings={SPOT_SETTINGS}
          defaultTitle="Advanced settings"
          isOpen={isOpen}
          onClose={onClose}
        />
      </Flex>
    </Popover>
  )
}
