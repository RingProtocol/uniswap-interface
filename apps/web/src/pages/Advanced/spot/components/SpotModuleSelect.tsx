import { Module } from '@orbs-network/spot-react'
import { Select } from 'ui/src'
import { Check } from 'ui/src/components/icons/Check'
import { RotatableChevron } from 'ui/src/components/icons/RotatableChevron'

import { SPOT_MODULE_OPTIONS } from 'pages/Advanced/spot/constants'

export function SpotModuleSelect({
  selectedModule,
  onSelectModule,
}: {
  selectedModule?: Module
  onSelectModule: (module: Module) => void
}) {
  const isSelected = Boolean(selectedModule)

  return (
    <Select
      value={selectedModule ? String(selectedModule) : ''}
      onValueChange={(nextValue) => onSelectModule(nextValue as Module)}
    >
      <Select.Trigger
        aria-label="Advanced order type"
        backgroundColor={isSelected ? '$surface3' : '$transparent'}
        borderColor="$transparent"
        borderRadius="$roundedFull"
        borderWidth={0}
        height="$spacing32"
        minWidth={0}
        px="$spacing12"
        py="$none"
        width="auto"
        hoverStyle={{ backgroundColor: isSelected ? '$surface3Hovered' : '$transparent' }}
        pressStyle={{ backgroundColor: isSelected ? '$surface3Hovered' : '$transparent' }}
        focusStyle={{ backgroundColor: isSelected ? '$surface3' : '$transparent' }}
      >
        <Select.Value
          color="$neutral1"
          fontFamily="$button"
          fontSize="$small"
          fontWeight="$medium"
          lineHeight="$small"
          placeholder="Advanced"
        />
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
          minWidth={180}
          p="$spacing4"
        >
          <Select.Group>
            {SPOT_MODULE_OPTIONS.map((option, index) => (
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
