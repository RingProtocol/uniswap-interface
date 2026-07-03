import { ToastRegularSimple } from 'components/Popups/ToastRegularSimple'
import { AlertCircle } from 'react-feather'
import { toast } from 'sonner'

export const ORDER_REJECTED_MESSAGE = 'Order rejected'

export function showSpotOrderRejectedToast() {
  toast(<ToastRegularSimple icon={<AlertCircle size={18} />} text={ORDER_REJECTED_MESSAGE} />, { duration: 3_000 })
}
