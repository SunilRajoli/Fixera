import { Card, CardContent, CardHeader } from '@/components/ui/card'
import type { Booking } from '@/types'

interface RepairEstimateCardProps {
  booking: Booking
}

export function RepairEstimateCard({ booking }: RepairEstimateCardProps) {
  const cost = booking.repairCost ?? 0
  const inspection = Number(booking.inspectionFee ?? 0)
  const gst = cost * 0.18
  const totalWithGst = cost + gst

  return (
    <Card>
      <CardHeader className="pb-2">
        <h3 className="font-medium">Repair estimate</h3>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Inspection fee</span>
          <span>₹{inspection.toLocaleString('en-IN')}</span>
        </div>
        {cost > 0 && (
          <>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Repair cost</span>
              <span>₹{cost.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">GST (18%)</span>
              <span>₹{gst.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between font-medium">
              <span>Total</span>
              <span>₹{(totalWithGst + inspection).toLocaleString('en-IN')}</span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
