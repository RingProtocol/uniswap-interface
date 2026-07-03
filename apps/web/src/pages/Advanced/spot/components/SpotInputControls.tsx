import { TimeUnit } from '@orbs-network/spot-react'
import { Input } from 'components/NumericalInput'
import styled from 'lib/styled-components'
import { Flex, Select, Text, Tooltip } from 'ui/src'
import { Check } from 'ui/src/components/icons/Check'
import { InfoCircle } from 'ui/src/components/icons/InfoCircle'
import { RotatableChevron } from 'ui/src/components/icons/RotatableChevron'
import { NumberType, useFormatter } from 'utils/formatNumbers'

import { TIME_UNIT_OPTIONS } from 'pages/Advanced/spot/constants'

const SpotInputFrame = styled.div<{ $error?: boolean; $inputAlign: 'left' | 'right' }>`
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
  min-height: 44px;
  width: 100%;
  padding: 8px 12px;
  border: 1px solid ${({ theme }) => theme.surface3};
  border-radius: 12px;
  background-color: ${({ theme }) => theme.surface2};

  ${({ $error, theme }) =>
    $error
      ? `
        border-color: ${theme.critical};
      `
      : `
        &:focus-within {
          border-color: ${theme.accent2};
        }
      `}

  input {
    text-align: ${({ $inputAlign }) => $inputAlign};
  }
`

export const SpotPriceInputGroup = styled.div`
  display: flex;
  align-items: stretch;
  gap: 8px;
  width: 100%;
  padding: 8px;
  border-radius: 16px;
  background-color: ${({ theme }) => theme.surface1};
`

const SpotPercentInputFrame = styled.div<{ $error?: boolean }>`
  display: flex;
  align-items: center;
  gap: 4px;
  flex: 0 0 108px;
  min-height: 44px;
  padding: 8px 12px;
  border: 1px solid ${({ theme }) => theme.surface3};
  border-radius: 12px;
  background-color: ${({ theme }) => theme.surface2};

  ${({ $error, theme }) =>
    $error
      ? `
        border-color: ${theme.critical};
      `
      : `
        &:focus-within {
          border-color: ${theme.accent2};
        }
      `}
`

const PercentInput = styled.input<{ $error?: boolean }>`
  flex: 1;
  min-width: 0;
  width: 0;
  padding: 0;
  border: 0;
  outline: none;
  background: transparent;
  color: ${({ $error, theme }) => ($error ? theme.critical : theme.neutral1)};
  font-size: 16px;
  font-weight: 485;
  text-align: right;
`

function isPercentInputValue(value: string) {
  const unsignedValue = value.startsWith('-') ? value.slice(1) : value
  const [wholePart, decimalPart, extraPart] = unsignedValue.split('.')

  if (extraPart !== undefined) {
    return false
  }

  return isDigitString(wholePart) && (decimalPart === undefined || isDigitString(decimalPart))
}

function isDigitString(value: string) {
  return Array.from(value).every((char) => char >= '0' && char <= '9')
}

export function SpotFieldLabel({ label, tooltip }: { label: string; tooltip?: string }) {
  return (
    <Flex row alignItems="center" gap="$spacing8">
      <Text variant="subheading2">{label}</Text>
      {tooltip && (
        <Tooltip placement="top">
          <Tooltip.Trigger>
            <InfoCircle color="$neutral1" size="$icon.18" />
          </Tooltip.Trigger>
          <Tooltip.Content maxWidth={300}>
            <Tooltip.Arrow />
            <Text variant="body4">{tooltip}</Text>
          </Tooltip.Content>
        </Tooltip>
      )}
    </Flex>
  )
}

export function SpotFramedInput({
  value,
  onUserInput,
  error,
  maxDecimals,
  ariaLabel,
  startLabel,
  endLabel,
  usdValue,
  inputAlign = 'right',
}: {
  value: string | number
  onUserInput: (input: string) => void
  error?: boolean
  maxDecimals?: number
  ariaLabel: string
  startLabel?: string
  endLabel?: string
  usdValue?: string
  inputAlign?: 'left' | 'right'
}) {
  const { formatFiatPrice } = useFormatter()
  const parsedUsdValue = usdValue ? Number(usdValue) : undefined
  const formattedUsdValue =
    parsedUsdValue !== undefined && Number.isFinite(parsedUsdValue)
      ? formatFiatPrice({ price: parsedUsdValue, type: NumberType.FiatTokenPrice })
      : undefined

  return (
    <SpotInputFrame $error={error} $inputAlign={inputAlign}>
      {startLabel && (
        <Text variant="subheading2" color="$neutral2" flexShrink={0}>
          {startLabel}
        </Text>
      )}
      <Flex flex={1} minWidth={0} alignItems="flex-end" gap="$spacing2">
        <Input
          aria-label={ariaLabel}
          value={value}
          onUserInput={onUserInput}
          error={error}
          maxDecimals={maxDecimals}
          align={inputAlign}
          fontSize="16px"
          style={{ width: '100%' }}
        />
        {formattedUsdValue && (
          <Text variant="body4" color="$neutral3" textAlign="right">
            {formattedUsdValue}
          </Text>
        )}
      </Flex>
      {endLabel && (
        <Text variant="body3" color="$neutral2" flexShrink={0}>
          {endLabel}
        </Text>
      )}
    </SpotInputFrame>
  )
}

export function SpotPercentInput({
  value,
  onUserInput,
  ariaLabel,
  error,
}: {
  value: string | number
  onUserInput: (input?: string) => void
  ariaLabel: string
  error?: boolean
}) {
  const displayValue = String(value).replace(/%/g, '')

  return (
    <SpotPercentInputFrame $error={error}>
      <PercentInput
        aria-label={ariaLabel}
        value={displayValue}
        placeholder="0.0"
        $error={error}
        onChange={(event) => {
          const nextValue = event.target.value.split(',').join('.').split('%').join('')

          if (isPercentInputValue(nextValue)) {
            onUserInput(nextValue)
          }
        }}
        inputMode="decimal"
        autoComplete="off"
        autoCorrect="off"
        spellCheck="false"
      />
      <Text variant="subheading2" color="$neutral2" flexShrink={0}>
        %
      </Text>
    </SpotPercentInputFrame>
  )
}

export function SpotTimeUnitSelect({
  value,
  onChange,
  ariaLabel,
}: {
  value: TimeUnit
  onChange: (unit: TimeUnit) => void
  ariaLabel: string
}) {
  const selectedOption = TIME_UNIT_OPTIONS.find((option) => option.value === value) ?? TIME_UNIT_OPTIONS[0]

  return (
    <Select value={String(value)} onValueChange={(nextValue) => onChange(Number(nextValue) as TimeUnit)}>
      <Select.Trigger
        aria-label={ariaLabel}
        backgroundColor="$surface2"
        borderColor="$surface3"
        borderRadius="$rounded12"
        borderWidth="$spacing1"
        flexShrink={0}
        height={44}
        width={132}
        px="$spacing12"
        py="$spacing8"
        hoverStyle={{ borderColor: '$surface3Hovered' }}
        focusStyle={{ borderColor: '$accent2' }}
      >
        <Select.Value placeholder={selectedOption.text} />
        <Select.Icon>
          <RotatableChevron color="$neutral2" direction="down" height={16} width={16} />
        </Select.Icon>
      </Select.Trigger>
      <Select.Content zIndex={100_000}>
        <Select.Viewport
          backgroundColor="$surface1"
          borderColor="$surface3"
          borderRadius="$rounded12"
          borderWidth="$spacing1"
          width={132}
          p="$spacing4"
        >
          <Select.Group>
            {TIME_UNIT_OPTIONS.map((option, index) => (
              <Select.Item
                key={option.value}
                index={index}
                value={String(option.value)}
                borderRadius="$rounded8"
                px="$spacing8"
                py="$spacing8"
              >
                <Select.ItemText>{option.text}</Select.ItemText>
                <Select.ItemIndicator marginLeft="auto">
                  <Check color="$accent1" size="$icon.16" />
                </Select.ItemIndicator>
              </Select.Item>
            ))}
          </Select.Group>
        </Select.Viewport>
      </Select.Content>
    </Select>
  )
}
