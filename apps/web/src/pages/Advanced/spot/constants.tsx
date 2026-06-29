import { Module, Partners, TimeUnit, getPartnerChains } from '@orbs-network/spot-react'
import { ModalName } from 'uniswap/src/features/telemetry/constants'

export type AdvancedRouteTab = '/swap' | '/stock' | '/advanced'
export type SpotModulePath = '/advanced' | '/twap' | '/stop-loss' | '/take-profit'
export type SpotModuleSearchParam = 'twap' | 'limit' | 'stop-loss' | 'take-profit'

export const DEFAULT_PRICE_PROTECTION = 3
export const DEFAULT_MIN_CHUNK_SIZE_USD = 5
export const SPOT_PARTNER = Partners.Ring
export const SPOT_SUPPORTED_CHAIN_IDS = getPartnerChains(SPOT_PARTNER)
export const LIMIT_ORDER_MODAL_NAME = ModalName.Dialog

export const SPOT_MODULE_OPTIONS: readonly { text: string; value: Module }[] = [
  { text: 'TWAP', value: Module.TWAP },
  { text: 'Limit', value: Module.LIMIT },
  { text: 'Stop Loss', value: Module.STOP_LOSS },
  { text: 'Take Profit', value: Module.TAKE_PROFIT },
]

export const MODULE_BY_SEARCH_PARAM: Record<SpotModuleSearchParam, Module> = {
  twap: Module.TWAP,
  limit: Module.LIMIT,
  'stop-loss': Module.STOP_LOSS,
  'take-profit': Module.TAKE_PROFIT,
}

export const MODULE_BY_PATHNAME: Record<SpotModulePath, Module> = {
  '/advanced': Module.LIMIT,
  '/twap': Module.TWAP,
  '/stop-loss': Module.STOP_LOSS,
  '/take-profit': Module.TAKE_PROFIT,
}

export const PATHNAME_BY_MODULE: Record<Module, SpotModulePath> = {
  [Module.TWAP]: '/twap',
  [Module.LIMIT]: '/advanced',
  [Module.STOP_LOSS]: '/stop-loss',
  [Module.TAKE_PROFIT]: '/take-profit',
}

export const TIME_UNIT_OPTIONS: readonly { text: string; value: TimeUnit }[] = [
  { text: 'Minutes', value: TimeUnit.Minutes },
  { text: 'Hours', value: TimeUnit.Hours },
  { text: 'Days', value: TimeUnit.Days },
]

export const DISCLAIMER_DEFAULTS: Record<string, string> = {
  limitOrderDisclaimer:
    "Limit orders may not execute when the token's price is equal or close to the limit price, due to gas and standard swap fees.",
  marketOrderDisclaimer:
    'Each individual trade in this order will be filled at the current market price at the time of execution.',
  triggerMarketPriceDisclaimer:
    'In extreme market movements, slippage may occur and the executed price of the market order may be worse than the specified trigger price.',
}

export const SPOT_FIELD_TOOLTIPS = {
  expiry:
    'This is the time period during which the order will be active. Please note that orders may be completed earlier than this time, partially filled, or remain unfilled based on the specified parameters.',
  limitPrice:
    'Trades will only execute if the available market price is better than the limit price, potentially resulting in partial fills or orders remaining unfilled upon expiration.',
  takeProfitTriggerPrice: 'The trigger price at which your take-profit order will be activated.',
  tradeInterval:
    'The estimated time that will elapse between each trade in your order. Note that as this time includes an allowance of two minutes for bidder auction and block settlement, which cannot be predicted exactly, actual time may vary.',
  tradesAmount:
    'The total number of individual trades that will be scheduled as part of your order. Note that in limit orders, not all trades that are scheduled will be executed.',
  stopLossTriggerPrice: 'The trigger price at which your stop-loss order will be activated.',
} as const
