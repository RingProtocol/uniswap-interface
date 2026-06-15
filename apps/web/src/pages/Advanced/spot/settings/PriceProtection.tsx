import { useEffect, useMemo, useRef, useState } from 'react'
import type { LayoutChangeEvent } from 'react-native'
import { Flex, Input, Text } from 'ui/src'
import { useTransactionSettingsContext } from 'uniswap/src/features/transactions/components/settings/contexts/TransactionSettingsContext'
import type { TransactionSettingConfig } from 'uniswap/src/features/transactions/components/settings/types'

import { DEFAULT_PRICE_PROTECTION } from 'pages/Advanced/spot/constants'

const INPUT_MIN_WIDTH = 44
const MAX_PRICE_PROTECTION = 100

export const PriceProtection: TransactionSettingConfig = {
  renderTitle: () => 'Price protection',
  renderTooltip: () =>
    'The protocol uses an oracle price to help protect users from unfavorable executions. If the execution price is worse than the oracle price by more than the allowed percentage, the transaction will not be executed.',
  Control() {
    return <PriceProtectionControl />
  },
}

function PriceProtectionControl() {
  const inputRef = useRef<Input>(null)
  const [inputWidth, setInputWidth] = useState(0)
  const [isEditing, setIsEditing] = useState(false)
  const [isLayoutReady, setIsLayoutReady] = useState(false)
  const { priceProtection, updateTransactionSettings } = useTransactionSettingsContext()

  const currentPriceProtection = priceProtection ?? DEFAULT_PRICE_PROTECTION
  const [inputPriceProtection, setInputPriceProtection] = useState(currentPriceProtection.toFixed(2))
  const isDefault = priceProtection === undefined || priceProtection === DEFAULT_PRICE_PROTECTION
  const inputValue = isEditing ? inputPriceProtection : currentPriceProtection.toFixed(2)

  useEffect(() => {
    if (!isEditing) {
      setInputPriceProtection(currentPriceProtection.toFixed(2))
    }
  }, [currentPriceProtection, isEditing])

  useEffect(() => {
    inputRef.current?.blur()
  }, [isLayoutReady])

  function onInputTextLayout(event: LayoutChangeEvent): void {
    setInputWidth(event.nativeEvent.layout.width)
    setIsLayoutReady(true)
  }

  const backgroundColor = isEditing ? '$surface2' : '$surface1'

  const borderColor = useMemo(() => {
    if (isEditing) {
      return '$accent1'
    }
    return '$surface3'
  }, [isEditing])

  const onPressDefault = (): void => {
    setInputPriceProtection(DEFAULT_PRICE_PROTECTION.toFixed(2))
    updateTransactionSettings({ priceProtection: undefined })
  }

  const onChangePriceProtectionInput = (value: string): void => {
    const nextValue = value.replace(',', '.')

    if (nextValue === '' || nextValue === '.') {
      setInputPriceProtection(nextValue)
      return
    }

    const parsedValue = parseFloat(nextValue)
    const decimalParts = nextValue.split('.')
    const isInvalidNumber = isNaN(parsedValue)
    const overMax = parsedValue > MAX_PRICE_PROTECTION
    const moreThanOneDecimalSymbol = decimalParts.length > 2
    const moreThanTwoDecimals = decimalParts?.[1] && decimalParts?.[1].length > 2

    if (isInvalidNumber || overMax || moreThanOneDecimalSymbol || moreThanTwoDecimals) {
      return
    }

    setInputPriceProtection(nextValue)

    if (parsedValue > 0) {
      updateTransactionSettings({
        priceProtection: parsedValue === DEFAULT_PRICE_PROTECTION ? undefined : parsedValue,
      })
    }
  }

  const onBlurPriceProtectionInput = (): void => {
    setIsEditing(false)

    const parsedValue = parseFloat(inputPriceProtection)
    if (isNaN(parsedValue) || parsedValue <= 0) {
      setInputPriceProtection(currentPriceProtection.toFixed(2))
      return
    }

    const nextValue = parsedValue.toFixed(2)
    setInputPriceProtection(nextValue)
    updateTransactionSettings({
      priceProtection: parsedValue === DEFAULT_PRICE_PROTECTION ? undefined : parsedValue,
    })
  }

  return (
    <Flex row group alignItems="center" justifyContent="space-between" style={{ containerType: 'normal' }}>
      <Flex
        row
        backgroundColor={backgroundColor}
        borderColor={borderColor}
        borderRadius="$rounded16"
        borderWidth="$spacing1"
        gap="$spacing8"
        p="$spacing4"
        pr="$spacing8"
        $group-hover={{
          borderColor: '$surface3Hovered',
          backgroundColor: '$surface1Hovered',
        }}
      >
        <Flex
          centered
          backgroundColor={isDefault ? '$accent2' : '$surface3'}
          borderRadius="$roundedFull"
          px="$spacing8"
          onPress={onPressDefault}
        >
          <Text color={isDefault ? '$accent1' : '$neutral2'} variant="buttonLabel3">
            Default
          </Text>
        </Flex>
        <Flex row alignItems="center" paddingEnd="$spacing12" paddingStart="$spacing4">
          <Flex style={{ position: 'relative' }}>
            <Input
              ref={inputRef}
              keyboardType="decimal-pad"
              backgroundColor={backgroundColor}
              $group-hover={{ backgroundColor: '$surface1Hovered' }}
              color="$neutral1"
              editable={true}
              fontFamily="$subHeading"
              fontSize="$small"
              fontWeight="normal"
              height="100%"
              outlineColor="$transparent"
              p="$none"
              paddingEnd="$spacing4"
              textAlign="right"
              value={inputValue}
              width={inputWidth}
              onBlur={onBlurPriceProtectionInput}
              onChangeText={onChangePriceProtectionInput}
              onPressIn={() => setIsEditing(true)}
            />
            <Text
              minWidth={INPUT_MIN_WIDTH}
              opacity={0}
              px="$spacing4"
              style={{ position: 'absolute' }}
              variant="subheading2"
              zIndex={-1}
              onLayout={onInputTextLayout}
            >
              {inputValue}
            </Text>
          </Flex>
          <Text color="$neutral1" variant="subheading2">
            %
          </Text>
        </Flex>
      </Flex>
    </Flex>
  )
}
