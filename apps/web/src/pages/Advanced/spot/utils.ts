import {
  InputError,
  InputErrors,
  Module,
  SpotConfig,
  Token as SpotToken,
  eqIgnoreCase,
  getConfig,
  isNativeAddress,
} from '@orbs-network/spot-react'
import { Currency, CurrencyAmount, Token } from '@uniswap/sdk-core'
import { getNativeAddress } from 'uniswap/src/constants/addresses'
import { nativeOnChain } from 'uniswap/src/constants/tokens'
import { signTypedData } from 'utils/signing'

import {
  MODULE_BY_PATHNAME,
  MODULE_BY_SEARCH_PARAM,
  SPOT_FIELD_TOOLTIPS,
  SPOT_PARTNER,
  SPOT_SUPPORTED_CHAIN_IDS,
  SpotModulePath,
  SpotModuleSearchParam,
} from 'pages/Advanced/spot/constants'
import { zeroAddress } from 'viem'

export function currencyToSpotToken(currency?: Currency): SpotToken | undefined {
  if (!currency) {
    return undefined
  }

  return {
    address: currency.isToken ? currency.address : zeroAddress,
    symbol: currency.symbol ?? '',
    decimals: currency.decimals,
    logoUrl: '',
  }
}

export function getSpotConfig(chainId?: number): SpotConfig | undefined {
  if (!chainId || !SPOT_SUPPORTED_CHAIN_IDS.includes(chainId)) {
    return undefined
  }

  try {
    return getConfig(SPOT_PARTNER, chainId)
  } catch {
    return undefined
  }
}

export function isSameAddress(address?: string, expected?: string) {
  return Boolean(address && expected && eqIgnoreCase(address, expected))
}

export function typedDataTypesWithoutDomain(types: Record<string, unknown[]>) {
  const { EIP712Domain: _domain, ...typedDataTypes } = types
  return typedDataTypes as Parameters<typeof signTypedData>[2]
}

function getTimestampMillis(timestamp?: number) {
  if (!timestamp) {
    return undefined
  }

  return timestamp > 1_000_000_000_000 ? timestamp : timestamp * 1000
}

export function formatTimestamp(timestamp?: number) {
  const timestampMillis = getTimestampMillis(timestamp)
  if (!timestampMillis) {
    return '--'
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(timestampMillis))
}

export function formatInputError(error?: InputError) {
  if (!error) {
    return undefined
  }

  const message = INPUT_ERROR_TEXT[error.type]
  const firstArg = getFirstErrorArg(error.args)
  const valueText = formatErrorArg(error.type, firstArg) ?? getDisplayErrorValue(error)

  if (message && valueText !== undefined) {
    return `${message} ${valueText}`
  }

  return message ?? (valueText !== undefined ? `${error.type}: ${valueText}` : error.type)
}

function getFirstErrorArg(args?: Record<string, string>) {
  return args ? Object.values(args)[0] : undefined
}

function formatErrorArg(errorType: InputErrors, value?: string) {
  if (value === undefined) {
    return undefined
  }

  switch (errorType) {
    case InputErrors.MAX_FILL_DELAY:
    case InputErrors.MIN_FILL_DELAY:
    case InputErrors.MAX_ORDER_DURATION:
    case InputErrors.MIN_ORDER_DURATION: {
      const milliseconds = Number(value)
      return Number.isFinite(milliseconds) ? formatMillisecondsAsDuration(milliseconds) : value
    }
    default:
      return value
  }
}

const INPUT_ERROR_TEXT: Record<InputErrors, string> = {
  [InputErrors.EMPTY_LIMIT_PRICE]: 'Enter a limit price',
  [InputErrors.MAX_CHUNKS]: 'Max. trades amount is',
  [InputErrors.MIN_CHUNKS]: 'Min. trades amount is',
  [InputErrors.MIN_TRADE_SIZE]: 'Min. trade size is',
  [InputErrors.MAX_FILL_DELAY]: 'Max. trade interval is',
  [InputErrors.MIN_FILL_DELAY]: 'Min. trade interval is',
  [InputErrors.MAX_ORDER_DURATION]: 'Max duration is',
  [InputErrors.MIN_ORDER_DURATION]: 'Min duration is',
  [InputErrors.MISSING_LIMIT_PRICE]: 'Enter a limit price',
  [InputErrors.STOP_LOSS_TRIGGER_PRICE_GREATER_THAN_MARKET_PRICE]: 'Trigger price must be below market price',
  [InputErrors.TRIGGER_LIMIT_PRICE_GREATER_THAN_TRIGGER_PRICE]: 'Limit price must be less than trigger price',
  [InputErrors.TAKE_PROFIT_TRIGGER_PRICE_LESS_THAN_MARKET_PRICE]: 'Trigger price must be above market price',
  [InputErrors.EMPTY_TRIGGER_PRICE]: 'Enter a trigger price',
  [InputErrors.INSUFFICIENT_BALANCE]: 'Insufficient balance',
  [InputErrors.MAX_ORDER_SIZE]: 'Max order size is',
}

function getDisplayErrorValue(error: InputError) {
  switch (error.type) {
    case InputErrors.MAX_ORDER_SIZE:
    case InputErrors.MIN_TRADE_SIZE_ERROR:
      return error.value ? String(error.value) : undefined
    default:
      return undefined
  }
}

export function getModuleFromSearchParam(moduleParam: string | null) {
  return moduleParam && moduleParam in MODULE_BY_SEARCH_PARAM
    ? MODULE_BY_SEARCH_PARAM[moduleParam as SpotModuleSearchParam]
    : Module.LIMIT
}

export function getModuleFromPathname(pathname: string) {
  return pathname in MODULE_BY_PATHNAME ? MODULE_BY_PATHNAME[pathname as SpotModulePath] : Module.LIMIT
}

export function getSpotModuleLabel(module: Module) {
  switch (module) {
    case Module.TWAP:
      return 'TWAP'
    case Module.STOP_LOSS:
      return 'Stop Loss'
    case Module.TAKE_PROFIT:
      return 'Take Profit'
    case Module.LIMIT:
    default:
      return 'Limit'
  }
}

export function isTriggerModule(module: Module) {
  return module === Module.STOP_LOSS || module === Module.TAKE_PROFIT
}

export function getTriggerPriceTooltip(module: Module) {
  return module === Module.STOP_LOSS
    ? SPOT_FIELD_TOOLTIPS.stopLossTriggerPrice
    : SPOT_FIELD_TOOLTIPS.takeProfitTriggerPrice
}

function formatSecondsAsDuration(seconds?: number) {
  if (!seconds) {
    return '--'
  }

  if (seconds % 86_400 === 0) {
    return `${seconds / 86_400} days`
  }

  if (seconds % 3_600 === 0) {
    return `${seconds / 3_600} hours`
  }

  if (seconds % 60 === 0) {
    return `${seconds / 60} minutes`
  }

  return `${seconds} seconds`
}

export function formatMillisecondsAsDuration(milliseconds?: number) {
  if (!milliseconds) {
    return '--'
  }

  return formatSecondsAsDuration(milliseconds / 1000)
}

export function oneTokenAmount(currency?: Currency) {
  if (!currency) {
    return undefined
  }

  return CurrencyAmount.fromRawAmount(currency, `1${'0'.repeat(currency.decimals)}`)
}

export function currencyAmountFromRawAmount(currency?: Currency, rawAmount?: string) {
  if (!currency || rawAmount === undefined || rawAmount === '') {
    return undefined
  }

  try {
    return CurrencyAmount.fromRawAmount(currency, rawAmount)
  } catch {
    return undefined
  }
}

export function spotTokenToCurrency(token?: SpotToken, chainId?: number): Currency | undefined {
  if (!token || !chainId) {
    return undefined
  }

  if (isNativeAddress(token.address) || isSameAddress(token.address, getNativeAddress(chainId))) {
    return nativeOnChain(chainId)
  }

  return new Token(chainId, token.address, token.decimals, token.symbol)
}
