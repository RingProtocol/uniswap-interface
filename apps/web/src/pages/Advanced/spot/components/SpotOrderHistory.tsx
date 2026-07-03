import {
  Order,
  OrderStatus,
  OrderType,
  Token as SpotToken,
  isNativeAddress,
  useCancelOrder,
  useDerivedHistoryOrder,
  useSpot,
} from '@orbs-network/spot-react'
import CurrencyLogo from 'components/Logo/CurrencyLogo'
import { ToastRegularSimple } from 'components/Popups/ToastRegularSimple'
import { useAccount } from 'hooks/useAccount'
import useCopyClipboard from 'hooks/useCopyClipboard'
import styled, { DefaultTheme } from 'lib/styled-components'
import { ReactNode, useEffect, useMemo, useState } from 'react'
import { ArrowLeft, ArrowRight, Check, Clock, Copy, X } from 'react-feather'
import { FixedSizeList, ListChildComponentProps } from 'react-window'
import { toast } from 'sonner'
import { Anchor, Button, Flex, Select, Text } from 'ui/src'
import { RotatableChevron } from 'ui/src/components/icons/RotatableChevron'
import { iconSizes } from 'ui/src/theme'
import { Modal } from 'uniswap/src/components/modals/Modal'
import { getNativeAddress } from 'uniswap/src/constants/addresses'
import { UniverseChainId } from 'uniswap/src/features/chains/types'
import { useCurrencyInfo } from 'uniswap/src/features/tokens/useCurrencyInfo'
import { buildCurrencyId } from 'uniswap/src/utils/currencyId'
import { ExplorerDataType, getExplorerLink } from 'uniswap/src/utils/linking'
import { shortenAddress } from 'utilities/src/addresses'

import { LIMIT_ORDER_MODAL_NAME } from 'pages/Advanced/spot/constants'
import { useCurrencyAmountFromRawAmount } from 'pages/Advanced/spot/hooks/useSpotSwapFormState'
import { spotTokenToCurrency } from 'pages/Advanced/spot/utils'
import { zeroAddress } from 'viem'

type HistoryFilter = 'all' | 'open' | 'cancelled' | 'completed' | 'expired'
type HistoryView = { type: 'list' } | { type: 'details'; orderId: string } | { type: 'fills'; orderId: string }
type OrderHistoryListData = { orders: Order[]; onSelectOrder: (order: Order) => void }

type DerivedHistoryOrder = NonNullable<ReturnType<typeof useDerivedHistoryOrder>>
type OrderFillListData = { chainId: number; fills: DerivedHistoryOrder['fills'] }

const ORDER_HISTORY_ROW_GAP = 6
const ORDER_HISTORY_ROW_HEIGHT = 118
const ORDER_FILL_ROW_GAP = 8
const ORDER_FILL_ROW_HEIGHT = 144
const ORDER_FILL_LIST_MAX_HEIGHT = 420

const FILTER_OPTIONS: { value: HistoryFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'open', label: 'Open' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'completed', label: 'Completed' },
  { value: 'expired', label: 'Expired' },
]

const STATUS_TEXT: Record<OrderStatus, string> = {
  [OrderStatus.Open]: 'Open',
  [OrderStatus.Cancelled]: 'Cancelled',
  [OrderStatus.Completed]: 'Completed',
  [OrderStatus.Expired]: 'Expired',
}

const ORDER_TYPE_TEXT: Record<OrderType, string> = {
  [OrderType.LIMIT]: 'Limit',
  [OrderType.TWAP_LIMIT]: 'TWAP Limit',
  [OrderType.TWAP_MARKET]: 'TWAP Market',
  [OrderType.TAKE_PROFIT_MARKET]: 'Take Profit Market',
  [OrderType.TAKE_PROFIT_LIMIT]: 'Take Profit Limit',
  [OrderType.STOP_LOSS_LIMIT]: 'Stop Loss Limit',
  [OrderType.STOP_LOSS_MARKET]: 'Stop Loss Market',
}

function getStatusColor(theme: DefaultTheme, status: OrderStatus) {
  switch (status) {
    case OrderStatus.Completed:
      return theme.success
    case OrderStatus.Cancelled:
      return theme.critical
    case OrderStatus.Open:
      return theme.warning
    case OrderStatus.Expired:
    default:
      return theme.neutral2
  }
}

const HistoryModalShell = styled.div<{ $isListView: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
  min-height: ${({ $isListView }) => ($isListView ? '680px' : '0')};
  max-height: ${({ $isListView }) => ($isListView ? 'min(840px, calc(100vh - 40px))' : 'calc(100vh - 40px)')};
  overflow-y: ${({ $isListView }) => ($isListView ? 'hidden' : 'auto')};
  padding: 24px;
  color: ${({ theme }) => theme.neutral1};
  background: ${({ theme }) => theme.surface1};
  border: 1px solid ${({ theme }) => theme.surface3};
  border-radius: 8px;
`

const HistoryHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
`

const HeaderTitleGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
`

const IconButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  width: 36px;
  height: 36px;
  padding: 0;
  color: ${({ theme }) => theme.neutral1};
  background: transparent;
  border: 0;
  border-radius: 8px;
  cursor: pointer;

  &:hover {
    background: ${({ theme }) => theme.surface2};
  }
`

const BackButton = styled(IconButton)`
  border: 1px solid ${({ theme }) => theme.surface3};
  background: ${({ theme }) => theme.surface2};
`

const HistoryListFrame = styled.div`
  flex: 1;
  min-height: 0;
  width: 100%;

  .spot-order-history-list {
    scrollbar-color: ${({ theme }) => theme.surface3} transparent;
  }

  .spot-order-history-list::-webkit-scrollbar {
    width: 8px;
  }

  .spot-order-history-list::-webkit-scrollbar-track {
    background: transparent;
  }

  .spot-order-history-list::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.surface3};
    border-radius: 999px;
  }
`

const VirtualHistoryRow = styled.div`
  box-sizing: border-box;
  padding-bottom: ${ORDER_HISTORY_ROW_GAP}px;
`

const OrderCard = styled.button`
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
  height: 100%;
  padding: 12px 10px;
  color: ${({ theme }) => theme.neutral1};
  text-align: left;
  background: ${({ theme }) => theme.surface2};
  border: 0;
  border-radius: 8px;
  cursor: pointer;

  &:hover {
    background: ${({ theme }) => theme.surface2Hovered};
  }
`

const OrderCardHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
`

const StatusText = styled.span<{ $status: OrderStatus }>`
  flex-shrink: 0;
  color: ${({ $status, theme }) => getStatusColor(theme, $status)};
  font-size: 12px;
  font-weight: 500;
  line-height: 16px;
  text-transform: uppercase;
`

const ProgressRow = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
`

const ProgressTrack = styled.div`
  height: 5px;
  overflow: hidden;
  background: ${({ theme }) => theme.surface3};
  border-radius: 999px;
`

const ProgressBar = styled.div<{ $progress: number; $status: OrderStatus }>`
  width: ${({ $progress }) => `${$progress}%`};
  height: 100%;
  background: ${({ $status, theme }) => ($status === OrderStatus.Completed ? theme.accent1 : theme.neutral3)};
  border-radius: inherit;
`

const TokenPairRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
`

const TokenPill = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  color: ${({ theme }) => theme.neutral1};
  font-size: 14px;
  font-weight: 600;
  line-height: 20px;
`

const DetailHero = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: start;
  row-gap: 26px;
  column-gap: 16px;
`

const DetailTokenBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
`

const HistoryPanelStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`

const PanelButton = styled.button<{ $isOpen?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  min-height: 44px;
  padding: 12px;
  color: ${({ theme }) => theme.neutral1};
  text-align: left;
  background: ${({ theme }) => theme.surface2};
  border: 0;
  border-radius: 8px;
  cursor: pointer;

  &:hover {
    background: ${({ theme }) => theme.surface2Hovered};
  }

  ${({ $isOpen, theme }) =>
    $isOpen &&
    `
      &:hover {
        background: ${theme.surface2};
      }
    `}
`

const PanelBody = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: -6px;
  padding: 0 12px 14px;
  background: ${({ theme }) => theme.surface2};
  border-bottom-right-radius: 8px;
  border-bottom-left-radius: 8px;
`

const InfoRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  color: ${({ theme }) => theme.neutral1};
  font-size: 14px;
  line-height: 18px;
`

const InfoValue = styled.span`
  min-width: 0;
  color: ${({ theme }) => theme.neutral1};
  text-align: right;
  overflow-wrap: anywhere;
`

const FillsCard = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  height: 100%;
  padding: 12px;
  background: ${({ theme }) => theme.surface2};
  border: 1px solid ${({ theme }) => theme.surface3};
  border-radius: 8px;
`

const FillsListFrame = styled.div`
  width: 100%;

  .spot-order-fills-list {
    scrollbar-color: ${({ theme }) => theme.surface3} transparent;
  }

  .spot-order-fills-list::-webkit-scrollbar {
    width: 8px;
  }

  .spot-order-fills-list::-webkit-scrollbar-track {
    background: transparent;
  }

  .spot-order-fills-list::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.surface3};
    border-radius: 999px;
  }
`

const VirtualFillRow = styled.div`
  box-sizing: border-box;
  padding-bottom: ${ORDER_FILL_ROW_GAP}px;
`

export function SpotOrderHistory() {
  const account = useAccount()
  const [isModalOpen, setIsModalOpen] = useState(false)

  if (!account.address) {
    return null
  }

  return (
    <>
      <Button size="large" emphasis="secondary" fill={false} icon={<Clock />} onPress={() => setIsModalOpen(true)}>
        Order history
      </Button>
      <Modal
        name={LIMIT_ORDER_MODAL_NAME}
        isModalOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        maxWidth={512}
        padding={0}
      >
        <SpotOrderHistoryContent closeModal={() => setIsModalOpen(false)} />
      </Modal>
    </>
  )
}

function SpotOrderHistoryContent({ closeModal }: { closeModal: () => void }) {
  const [view, setView] = useState<HistoryView>({ type: 'list' })

  return (
    <HistoryModalShell $isListView={view.type === 'list'}>
      {view.type === 'list' && (
        <SpotOrderHistoryList
          closeModal={closeModal}
          onSelectOrder={(order) => setView({ type: 'details', orderId: getOrderHistoryId(order) })}
        />
      )}
      {view.type === 'details' && (
        <SpotOrderDetails
          orderId={view.orderId}
          closeModal={closeModal}
          onBack={() => setView({ type: 'list' })}
          onOpenFills={() => setView({ type: 'fills', orderId: view.orderId })}
        />
      )}
      {view.type === 'fills' && (
        <SpotOrderFills
          orderId={view.orderId}
          closeModal={closeModal}
          onBack={() => setView({ type: 'details', orderId: view.orderId })}
        />
      )}
    </HistoryModalShell>
  )
}

function SpotOrderHistoryList({
  closeModal,
  onSelectOrder,
}: {
  closeModal: () => void
  onSelectOrder: (order: Order) => void
}) {
  const spot = useSpot()
  const [filter, setFilter] = useState<HistoryFilter>('all')
  const [listElement, setListElement] = useState<HTMLDivElement | null>(null)
  const { isLoading, orders } = spot.orderHistoryPanel
  const filteredOrders = orders[filter]
  const listHeight = useElementHeight(listElement)
  const listData = useMemo<OrderHistoryListData>(
    () => ({ orders: filteredOrders, onSelectOrder }),
    [filteredOrders, onSelectOrder],
  )

  return (
    <>
      <HistoryHeader>
        <Text variant="subheading1" color="$neutral1">
          Orders ({orders.all.length})
        </Text>
        <IconButton aria-label="Close order history" onClick={closeModal}>
          <X size={20} />
        </IconButton>
      </HistoryHeader>
      <SpotOrderFilterSelect value={filter} onChange={setFilter} />
      {isLoading ? (
        <Text variant="body3" color="$neutral2">
          Loading orders...
        </Text>
      ) : filteredOrders.length ? (
        <HistoryListFrame ref={setListElement}>
          {listHeight > 0 && (
            <FixedSizeList
              className="spot-order-history-list"
              height={listHeight}
              itemCount={filteredOrders.length}
              itemData={listData}
              itemKey={getOrderHistoryItemKey}
              itemSize={ORDER_HISTORY_ROW_HEIGHT}
              key={filter}
              overscanCount={4}
              width="100%"
            >
              {SpotOrderHistoryVirtualRow}
            </FixedSizeList>
          )}
        </HistoryListFrame>
      ) : (
        <Text variant="body3" color="$neutral2">
          No orders
        </Text>
      )}
    </>
  )
}

function SpotOrderHistoryVirtualRow({ data, index, style }: ListChildComponentProps) {
  const { onSelectOrder, orders } = data as OrderHistoryListData
  const order = orders[index]

  if (!order) {
    return null
  }

  return (
    <VirtualHistoryRow style={style}>
      <SpotOrderHistoryRow order={order} onPress={() => onSelectOrder(order)} />
    </VirtualHistoryRow>
  )
}

function getOrderHistoryItemKey(index: number, data: unknown) {
  const order = (data as OrderHistoryListData).orders[index]

  return order ? getOrderHistoryId(order) : index
}

function SpotOrderFilterSelect({
  value,
  onChange,
}: {
  value: HistoryFilter
  onChange: (filter: HistoryFilter) => void
}) {
  const selectedOption = FILTER_OPTIONS.find((option) => option.value === value) ?? FILTER_OPTIONS[0]

  return (
    <Select value={value} onValueChange={(nextValue) => onChange(nextValue as HistoryFilter)}>
      <Select.Trigger
        aria-label="Order status filter"
        backgroundColor="$surface2"
        borderColor="$surface3"
        borderRadius="$rounded8"
        borderWidth="$spacing1"
        height={36}
        width={180}
        px="$spacing12"
        py="$spacing8"
      >
        <Select.Value placeholder={selectedOption.label} />
        <Select.Icon>
          <RotatableChevron color="$neutral2" direction="down" height={16} width={16} />
        </Select.Icon>
      </Select.Trigger>
      <Select.Content zIndex={100_000}>
        <Select.Viewport
          backgroundColor="$surface1"
          borderColor="$surface3"
          borderRadius="$rounded8"
          borderWidth="$spacing1"
          width={180}
          p="$spacing4"
        >
          <Select.Group>
            {FILTER_OPTIONS.map((option, index) => (
              <Select.Item
                key={option.value}
                index={index}
                value={option.value}
                borderRadius="$rounded8"
                px="$spacing8"
                py="$spacing8"
              >
                <Select.ItemText>{option.label}</Select.ItemText>
                <Select.ItemIndicator marginLeft="auto">
                  <Check size={16} />
                </Select.ItemIndicator>
              </Select.Item>
            ))}
          </Select.Group>
        </Select.Viewport>
      </Select.Content>
    </Select>
  )
}

function SpotOrderHistoryRow({ order, onPress }: { order: Order; onPress: () => void }) {
  const derivedOrder = useOrderDerivedHistory(order)
  const progress = getOrderProgress(order, derivedOrder)

  return (
    <OrderCard type="button" onClick={onPress}>
      <OrderCardHeader>
        <Text variant="body3" color="$neutral1" numberOfLines={1}>
          {getOrderTypeLabel(order.type)} ({formatHistoryDate(derivedOrder?.createdAt ?? order.createdAt)})
        </Text>
        <StatusText $status={order.status}>{STATUS_TEXT[order.status]}</StatusText>
      </OrderCardHeader>
      <ProgressRow>
        <ProgressTrack>
          <ProgressBar $progress={progress} $status={order.status} />
        </ProgressTrack>
        <Text variant="body3" color="$neutral2">
          {progress}%
        </Text>
      </ProgressRow>
      <OrderTokenPair order={order} derivedOrder={derivedOrder} logoSize={18} />
    </OrderCard>
  )
}

function SpotOrderDetails({
  orderId,
  closeModal,
  onBack,
  onOpenFills,
}: {
  orderId: string
  closeModal: () => void
  onBack: () => void
  onOpenFills: () => void
}) {
  const order = useSpotHistoryOrder(orderId)

  if (!order) {
    return <SpotOrderNotFound closeModal={closeModal} onBack={onBack} />
  }

  return <SpotOrderDetailsContent order={order} closeModal={closeModal} onBack={onBack} onOpenFills={onOpenFills} />
}

function SpotOrderDetailsContent({
  order,
  closeModal,
  onBack,
  onOpenFills,
}: {
  order: Order
  closeModal: () => void
  onBack: () => void
  onOpenFills: () => void
}) {
  const derivedOrder = useOrderDerivedHistory(order)
  const [openPanel, setOpenPanel] = useState<'summary' | 'info'>('summary')
  const title = getOrderTypeLabel(order.type)

  return (
    <>
      <SpotHistoryViewHeader title={title} closeModal={closeModal} onBack={onBack} />
      {derivedOrder && (
        <>
          <SpotOrderDetailHero order={order} derivedOrder={derivedOrder} />
          <HistoryPanelStack>
            <SpotHistoryPanel
              title="Execution summary"
              isOpen={openPanel === 'summary'}
              onToggle={() => setOpenPanel(openPanel === 'summary' ? 'info' : 'summary')}
            >
              <SpotExecutionSummary order={order} derivedOrder={derivedOrder} />
            </SpotHistoryPanel>
            <SpotHistoryPanel
              title="Order info"
              isOpen={openPanel === 'info'}
              onToggle={() => setOpenPanel(openPanel === 'info' ? 'summary' : 'info')}
            >
              <SpotOrderInfo order={order} derivedOrder={derivedOrder} />
            </SpotHistoryPanel>
            <PanelButton type="button" onClick={onOpenFills}>
              <Text variant="body2" color="$neutral1">
                Order fills ({derivedOrder.fills.length})
              </Text>
              <RotatableChevron color="$neutral1" direction="down" height={iconSizes.icon20} width={iconSizes.icon20} />
            </PanelButton>
            {order.status === OrderStatus.Open && <SpotCancelOrderButton order={order} />}
          </HistoryPanelStack>
        </>
      )}
    </>
  )
}

function SpotCancelOrderButton({ order }: { order: Order }) {
  const { cancelOrder, error, isLoading, isSuccess } = useCancelOrder(order)

  return (
    <Flex gap="$spacing6">
      <Button
        size="medium"
        variant="critical"
        emphasis="secondary"
        fill={false}
        width="100%"
        loading={isLoading}
        isDisabled={isSuccess}
        onPress={() => void cancelOrder()}
      >
        Cancel order
      </Button>
      {isSuccess && (
        <Text variant="body4" color="$statusSuccess">
          Cancellation submitted
        </Text>
      )}
      {error && (
        <Text variant="body4" color="$statusCritical">
          {error}
        </Text>
      )}
    </Flex>
  )
}

function SpotOrderFills({
  orderId,
  closeModal,
  onBack,
}: {
  orderId: string
  closeModal: () => void
  onBack: () => void
}) {
  const order = useSpotHistoryOrder(orderId)

  if (!order) {
    return <SpotOrderNotFound closeModal={closeModal} onBack={onBack} />
  }

  return <SpotOrderFillsContent order={order} closeModal={closeModal} onBack={onBack} />
}

function SpotOrderFillsContent({
  order,
  closeModal,
  onBack,
}: {
  order: Order
  closeModal: () => void
  onBack: () => void
}) {
  const derivedOrder = useOrderDerivedHistory(order)
  const fillListData = useMemo<OrderFillListData | undefined>(
    () => (derivedOrder ? { chainId: order.chainId, fills: derivedOrder.fills } : undefined),
    [derivedOrder, order.chainId],
  )
  const fillListHeight = derivedOrder
    ? Math.min(derivedOrder.fills.length * ORDER_FILL_ROW_HEIGHT, ORDER_FILL_LIST_MAX_HEIGHT)
    : 0

  return (
    <>
      <SpotHistoryViewHeader
        title={`${getOrderTypeLabel(order.type)} order fills`}
        closeModal={closeModal}
        onBack={onBack}
      />
      {derivedOrder && (
        <>
          <OrderTokenPair order={order} derivedOrder={derivedOrder} logoSize={24} />
          {derivedOrder.fills.length > 0 && fillListData ? (
            <FillsListFrame>
              <FixedSizeList
                className="spot-order-fills-list"
                height={fillListHeight}
                itemCount={derivedOrder.fills.length}
                itemData={fillListData}
                itemKey={getOrderFillItemKey}
                itemSize={ORDER_FILL_ROW_HEIGHT}
                overscanCount={3}
                width="100%"
              >
                {SpotOrderFillVirtualRow}
              </FixedSizeList>
            </FillsListFrame>
          ) : (
            <Text variant="body3" color="$neutral2">
              No fills
            </Text>
          )}
        </>
      )}
    </>
  )
}

function SpotOrderFillVirtualRow({ data, index, style }: ListChildComponentProps) {
  const { chainId, fills } = data as OrderFillListData
  const fill = fills[index]

  if (!fill) {
    return null
  }

  return (
    <VirtualFillRow style={style}>
      <SpotOrderFillCard fill={fill} chainId={chainId} />
    </VirtualFillRow>
  )
}

function getOrderFillItemKey(index: number, data: unknown) {
  const fill = (data as OrderFillListData).fills[index]

  return fill ? `${fill.txHash}-${fill.timestamp}-${index}` : index
}

function SpotOrderNotFound({ closeModal, onBack }: { closeModal: () => void; onBack: () => void }) {
  return (
    <>
      <SpotHistoryViewHeader title="Order" closeModal={closeModal} onBack={onBack} />
      <Text variant="body3" color="$neutral2">
        Order not found
      </Text>
    </>
  )
}

function SpotHistoryViewHeader({
  title,
  closeModal,
  onBack,
}: {
  title: string
  closeModal: () => void
  onBack: () => void
}) {
  return (
    <HistoryHeader>
      <HeaderTitleGroup>
        <BackButton aria-label="Back to orders" onClick={onBack}>
          <ArrowLeft size={18} />
        </BackButton>
        <Text variant="subheading1" color="$neutral1" numberOfLines={1}>
          {title}
        </Text>
      </HeaderTitleGroup>
      <IconButton aria-label="Close order history" onClick={closeModal}>
        <X size={20} />
      </IconButton>
    </HistoryHeader>
  )
}

function SpotOrderDetailHero({ order, derivedOrder }: { order: Order; derivedOrder: DerivedHistoryOrder }) {
  return (
    <DetailHero>
      <DetailTokenBlock>
        <Text variant="body3" color="$neutral2">
          From
        </Text>
        <Text variant="subheading1" color="$neutral1">
          {derivedOrder.srcToken?.symbol ?? '--'}
        </Text>
      </DetailTokenBlock>
      <SpotTokenLogo order={order} token={derivedOrder.srcToken} size={40} />
      <DetailTokenBlock>
        <Text variant="body3" color="$neutral2">
          To
        </Text>
        <Text variant="subheading1" color="$neutral1">
          {derivedOrder.dstToken?.symbol ?? '--'}
        </Text>
      </DetailTokenBlock>
      <SpotTokenLogo order={order} token={derivedOrder.dstToken} size={40} />
    </DetailHero>
  )
}

function SpotHistoryPanel({
  title,
  isOpen,
  onToggle,
  children,
}: {
  title: string
  isOpen: boolean
  onToggle: () => void
  children: ReactNode
}) {
  return (
    <Flex>
      <PanelButton type="button" $isOpen={isOpen} onClick={onToggle}>
        <Text variant="body2" color="$neutral1">
          {title}
        </Text>
        <RotatableChevron
          color="$neutral1"
          direction={isOpen ? 'up' : 'down'}
          height={iconSizes.icon20}
          width={iconSizes.icon20}
        />
      </PanelButton>
      {isOpen && <PanelBody>{children}</PanelBody>}
    </Flex>
  )
}

function SpotExecutionSummary({ order, derivedOrder }: { order: Order; derivedOrder: DerivedHistoryOrder }) {
  const srcAmount = useHistoryAmount(
    derivedOrder.srcToken,
    order.chainId,
    derivedOrder.amountInFilled || derivedOrder.srcAmount,
  )
  const dstAmount = useHistoryAmount(
    derivedOrder.dstToken,
    order.chainId,
    derivedOrder.amountOutFilled || derivedOrder.dstMinAmount,
  )
  const executionPrice = useHistoryAmount(derivedOrder.dstToken, order.chainId, derivedOrder.executionPrice)

  return (
    <>
      <InfoRow>
        <span>Status</span>
        <InfoValue>{STATUS_TEXT[order.status]}</InfoValue>
      </InfoRow>
      <InfoRow>
        <span>Amount out</span>
        <InfoValue>{formatAmountWithSymbol(srcAmount, derivedOrder.srcToken)}</InfoValue>
      </InfoRow>
      <InfoRow>
        <span>Amount received</span>
        <InfoValue>{formatAmountWithSymbol(dstAmount, derivedOrder.dstToken)}</InfoValue>
      </InfoRow>
      <InfoRow>
        <span>Progress</span>
        <InfoValue>{getOrderProgress(order, derivedOrder)}%</InfoValue>
      </InfoRow>
      <InfoRow>
        <span>Final execution price</span>
        <InfoValue>{formatExecutionPrice(derivedOrder, executionPrice)}</InfoValue>
      </InfoRow>
    </>
  )
}

function SpotOrderInfo({ order, derivedOrder }: { order: Order; derivedOrder: DerivedHistoryOrder }) {
  const [, copy] = useCopyClipboard()
  const id = derivedOrder.id || order.hash || order.id
  const srcAmount = useHistoryAmount(derivedOrder.srcToken, order.chainId, derivedOrder.srcAmount)

  return (
    <>
      <InfoRow>
        <span>ID</span>
        <InfoValue>
          {shortenHash(id)}
          <IconButton
            aria-label="Copy order id"
            onClick={() => {
              copy(id)
              showCopiedToast()
            }}
            style={{ width: 18, height: 18, marginLeft: 4, verticalAlign: 'middle' }}
          >
            <Copy size={14} />
          </IconButton>
        </InfoValue>
      </InfoRow>
      <InfoRow>
        <span>Created at</span>
        <InfoValue>{formatHistoryDate(derivedOrder.createdAt)}</InfoValue>
      </InfoRow>
      <InfoRow>
        <span>Expiration</span>
        <InfoValue>{formatHistoryDate(derivedOrder.deadline)}</InfoValue>
      </InfoRow>
      <InfoRow>
        <span>Amount out</span>
        <InfoValue>{formatAmountWithSymbol(srcAmount, derivedOrder.srcToken)}</InfoValue>
      </InfoRow>
      <InfoRow>
        <span>Recipient</span>
        <InfoValue>
          <ExplorerAddressLink address={derivedOrder.recipient} chainId={order.chainId} />
        </InfoValue>
      </InfoRow>
    </>
  )
}

function SpotOrderFillCard({ fill, chainId }: { fill: DerivedHistoryOrder['fills'][number]; chainId: number }) {
  const srcAmount = useHistoryAmount(fill.srcToken, chainId, fill.rawFill.inAmount)
  const dstAmount = useHistoryAmount(fill.dstToken, chainId, fill.rawFill.outAmount)

  return (
    <FillsCard>
      <InfoRow>
        <span>Timestamp</span>
        <InfoValue>{formatHistoryDate(fill.timestamp)}</InfoValue>
      </InfoRow>
      <InfoRow>
        <span>Amount out</span>
        <InfoValue>{formatAmountWithSymbol(srcAmount, fill.srcToken)}</InfoValue>
      </InfoRow>
      <InfoRow>
        <span>Amount received</span>
        <InfoValue>{formatAmountWithSymbol(dstAmount, fill.dstToken)}</InfoValue>
      </InfoRow>
      <InfoRow>
        <span>Transaction hash</span>
        <InfoValue>
          {fill.explorerUrl ? (
            <Anchor href={fill.explorerUrl} target="_blank" textDecorationLine="none">
              <Text variant="body3" color="$neutral1">
                {shortenHash(fill.txHash)}
              </Text>
            </Anchor>
          ) : (
            shortenHash(fill.txHash)
          )}
        </InfoValue>
      </InfoRow>
    </FillsCard>
  )
}

function OrderTokenPair({
  order,
  derivedOrder,
  logoSize,
}: {
  order: Order
  derivedOrder?: DerivedHistoryOrder
  logoSize: number
}) {
  return (
    <TokenPairRow>
      <TokenPill>
        <SpotTokenLogo order={order} token={derivedOrder?.srcToken} size={logoSize} />
        {derivedOrder?.srcToken?.symbol ?? '--'}
      </TokenPill>
      <ArrowRight size={16} />
      <TokenPill>
        <SpotTokenLogo order={order} token={derivedOrder?.dstToken} size={logoSize} />
        {derivedOrder?.dstToken?.symbol ?? '--'}
      </TokenPill>
    </TokenPairRow>
  )
}

function SpotTokenLogo({ order, token, size }: { order: Order; token?: SpotToken; size: number }) {
  const currency = useMemo(() => spotTokenToCurrency(token, order.chainId), [order.chainId, token])

  return <CurrencyLogo currency={currency} size={size} />
}

function ExplorerAddressLink({ address, chainId }: { address?: string; chainId: number }) {
  if (!address) {
    return <span>--</span>
  }

  return (
    <Anchor
      href={getExplorerLink(chainId as UniverseChainId, address, ExplorerDataType.ADDRESS)}
      target="_blank"
      textDecorationLine="none"
    >
      <Text variant="body3" color="$accent1">
        {shortenAddress(address)}
      </Text>
    </Anchor>
  )
}

function useElementHeight(element: HTMLElement | null) {
  const [height, setHeight] = useState(0)

  useEffect(() => {
    if (!element) {
      return undefined
    }

    const updateHeight = () => setHeight(element.getBoundingClientRect().height)
    updateHeight()

    const resizeObserver = new ResizeObserver(updateHeight)
    resizeObserver.observe(element)

    return () => resizeObserver.disconnect()
  }, [element])

  return height
}

function useSpotHistoryOrder(orderId: string) {
  const spot = useSpot()
  const orders = spot.orderHistoryPanel.orders.all

  return useMemo(() => orders.find((order) => getOrderHistoryId(order) === orderId), [orderId, orders])
}

function useOrderDerivedHistory(order: Order) {
  const { srcToken, dstToken } = useOrderHistoryTokens(order)

  return useDerivedHistoryOrder(order, srcToken, dstToken)
}

function useOrderHistoryTokens(order: Order) {
  const srcCurrencyInfo = useCurrencyInfo(getOrderCurrencyId(order.chainId, order.srcTokenAddress), { refetch: true })
  const dstCurrencyInfo = useCurrencyInfo(getOrderCurrencyId(order.chainId, order.dstTokenAddress), { refetch: true })

  return useMemo(
    () => ({
      srcToken: {
        address: srcCurrencyInfo?.currency.isToken ? srcCurrencyInfo?.currency.address : zeroAddress,
        symbol: srcCurrencyInfo?.currency.symbol ?? '',
        decimals: srcCurrencyInfo?.currency.decimals ?? 0,
        logoUrl: srcCurrencyInfo?.logoUrl ?? '',
      },
      dstToken: {
        address: dstCurrencyInfo?.currency.isToken ? dstCurrencyInfo?.currency.address : zeroAddress,
        symbol: dstCurrencyInfo?.currency.symbol ?? '',
        decimals: dstCurrencyInfo?.currency.decimals ?? 0,
        logoUrl: dstCurrencyInfo?.logoUrl ?? '',
      },
    }),
    [dstCurrencyInfo, srcCurrencyInfo],
  )
}

function getOrderCurrencyId(chainId: number, address?: string) {
  if (!address) {
    return undefined
  }

  const currencyAddress = isNativeAddress(address) ? getNativeAddress(chainId as UniverseChainId) : address
  return buildCurrencyId(chainId as UniverseChainId, currencyAddress)
}

function getOrderHistoryId(order: Order) {
  return order.id
}

function useHistoryAmount(token: SpotToken | undefined, chainId: number, rawAmount?: string) {
  const currency = useMemo(() => spotTokenToCurrency(token, chainId), [chainId, token])

  return useCurrencyAmountFromRawAmount(currency, rawAmount)
}

function getOrderTypeLabel(orderType: OrderType) {
  return ORDER_TYPE_TEXT[orderType] ?? orderType
}

function getOrderProgress(order: Order, derivedOrder?: DerivedHistoryOrder) {
  return Math.max(0, Math.min(100, Math.round(derivedOrder?.progress ?? order.progress ?? 0)))
}

function formatAmountWithSymbol(amount: ReturnType<typeof useCurrencyAmountFromRawAmount>, token?: SpotToken) {
  return amount ? `${amount.toSignificant()} ${token?.symbol ?? amount.currency.symbol ?? ''}` : '--'
}

function formatExecutionPrice(
  derivedOrder: DerivedHistoryOrder,
  executionPrice: ReturnType<typeof useCurrencyAmountFromRawAmount>,
) {
  const executionPriceValue = executionPrice?.toSignificant() ?? derivedOrder.executionPriceUI

  if (!executionPriceValue || !derivedOrder.srcToken || !derivedOrder.dstToken) {
    return '--'
  }

  return `1 ${derivedOrder.srcToken.symbol} = ${executionPriceValue} ${derivedOrder.dstToken.symbol}`
}

function showCopiedToast() {
  toast(<ToastRegularSimple icon={<Check size={18} />} text="Copied" />, { duration: 2_000 })
}

function formatHistoryDate(timestamp?: number) {
  const milliseconds = timestamp ? (timestamp > 1_000_000_000_000 ? timestamp : timestamp * 1000) : undefined

  if (!milliseconds) {
    return '--'
  }

  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
    .format(new Date(milliseconds))
    .replace(',', '')
}

function shortenHash(value?: string) {
  if (!value) {
    return '--'
  }

  return value.length > 14 ? `${value.slice(0, 6)}...${value.slice(-5)}` : value
}
