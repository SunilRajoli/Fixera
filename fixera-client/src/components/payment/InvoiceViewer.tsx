import { Button } from '@/components/ui/button'
import { format } from 'date-fns'
import { Printer } from 'lucide-react'
import type { Invoice } from '@/types'

interface InvoiceViewerProps {
  bookingId: string
  invoice: Invoice
  customerName?: string
  address?: string
  serviceName?: string
  technicianName?: string
}

export function InvoiceViewer({
  invoice,
  customerName = 'Customer',
  address = '—',
  serviceName = 'Service',
  technicianName = '—',
}: InvoiceViewerProps) {
  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="space-y-4">
      <div className="invoice-print rounded-lg border bg-card p-6">
        <div className="mb-6 text-center">
          <h2 className="text-xl font-bold">FIXERA</h2>
          <p className="text-sm text-muted-foreground">Tax Invoice</p>
        </div>

        <div className="space-y-4 text-sm">
          <p>
            <span className="text-muted-foreground">Invoice #:</span>{' '}
            {invoice.invoiceNumber}
          </p>
          <p>
            <span className="text-muted-foreground">Date:</span>{' '}
            {format(new Date(invoice.issuedAt), 'dd MMMM yyyy')}
          </p>

          <div className="border-t pt-4">
            <p className="font-medium text-muted-foreground">Bill To:</p>
            <p>{customerName}</p>
            <p className="text-muted-foreground">{address}</p>
          </div>

          <div className="flex justify-between border-t pt-4">
            <p className="text-muted-foreground">Service:</p>
            <p>{serviceName}</p>
          </div>
          <div className="flex justify-between">
            <p className="text-muted-foreground">Technician:</p>
            <p>{technicianName}</p>
          </div>

          <table className="w-full border-collapse border-t text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="py-2 font-medium">Description</th>
                <th className="py-2 text-right font-medium">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <td className="py-2">Service charge</td>
                <td className="py-2 text-right">
                  ₹{Number(invoice.serviceCharge).toLocaleString('en-IN')}
                </td>
              </tr>
              <tr className="border-b">
                <td className="py-2">GST @18%</td>
                <td className="py-2 text-right">
                  ₹{Number(invoice.gstAmount).toLocaleString('en-IN')}
                </td>
              </tr>
              <tr className="border-b font-medium">
                <td className="py-2">Total</td>
                <td className="py-2 text-right">
                  ₹{Number(invoice.totalAmount).toLocaleString('en-IN')}
                </td>
              </tr>
            </tbody>
          </table>

          <div className="border-t pt-4 space-y-1 text-sm">
            <p className="flex justify-between">
              <span className="text-muted-foreground">Platform commission:</span>
              <span>₹{Number(invoice.platformCommission).toLocaleString('en-IN')}</span>
            </p>
            <p className="flex justify-between">
              <span className="text-muted-foreground">Technician payout:</span>
              <span>₹{Number(invoice.technicianPayout).toLocaleString('en-IN')}</span>
            </p>
          </div>
        </div>

        <div className="mt-6 print:hidden">
          <Button variant="outline" className="w-full" onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" />
            Print Invoice
          </Button>
        </div>
      </div>

      <style>{`
        @media print {
          body * { visibility: hidden; }
          .invoice-print, .invoice-print * { visibility: visible; }
          .invoice-print { position: absolute; left: 0; top: 0; width: 100%; }
        }
      `}</style>
    </div>
  )
}
