import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import api from '@/lib/api'
import { useSocket } from '@/hooks/useSocket'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { ErrorMessage } from '@/components/shared/ErrorMessage'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { useToastStore } from '@/store/toast.store'
import { format } from 'date-fns'
import type { Transaction } from '@/types'
import { ArrowUpCircle, ArrowDownCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface BalanceData {
  balance: number
  lockedBalance: number
  totalEarned: number
  totalWithdrawn: number
  pendingWithdrawal: boolean
}

export default function EarningsPage() {
  const queryClient = useQueryClient()
  const toast = useToastStore()
  const { socket } = useSocket()
  const [withdrawOpen, setWithdrawOpen] = useState(false)

  const { data: balance, isLoading, error, refetch } = useQuery({
    queryKey: ['wallet', 'balance'],
    queryFn: async () => {
      const res = await api.get<{ data: BalanceData }>('/api/wallet/balance')
      return res.data.data
    },
  })

  const { data: txData } = useQuery({
    queryKey: ['wallet', 'transactions'],
    queryFn: async () => {
      const res = await api.get<{ data: { transactions: Transaction[]; total: number; pages: number } }>('/api/wallet/transactions', { params: { page: 1, limit: 20 } })
      return res.data.data
    },
  })

  useEffect(() => {
    if (!socket) return
    socket.on('wallet:updated', () => refetch())
    return () => { socket.off('wallet:updated') }
  }, [socket, refetch])

  const withdrawMutation = useMutation({
    mutationFn: () => api.post('/api/wallet/withdraw'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wallet'] })
      setWithdrawOpen(false)
      toast.add('Withdrawal requested. Transfers in 1–3 business days.', 'success')
    },
    onError: (e: Error & { response?: { data?: { message?: string } } }) => {
      toast.add(e.response?.data?.message ?? 'Withdrawal failed', 'error')
    },
  })

  if (isLoading || !balance) return <LoadingSpinner className="min-h-[40vh]" message="Loading..." />
  if (error) return <ErrorMessage className="min-h-[40vh]" message={(error as Error).message} onRetry={() => refetch()} />

  const transactions = txData?.transactions ?? []

  return (
    <div className="space-y-6 p-4">
      <h1 className="text-xl font-semibold">Earnings</h1>

      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">Available</p>
          <p className="text-3xl font-bold text-green-600">
            ₹{Number(balance.balance).toLocaleString('en-IN')}
          </p>
          <p className="mt-2 text-sm text-orange-600">
            Locked: ₹{Number(balance.lockedBalance).toLocaleString('en-IN')}
            <span className="ml-1 text-muted-foreground">(within 72h dispute window)</span>
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Total earned: ₹{Number(balance.totalEarned).toLocaleString('en-IN')}
          </p>
          <Button
            className="mt-4 w-full"
            disabled={Number(balance.balance) <= 0 || balance.pendingWithdrawal}
            onClick={() => setWithdrawOpen(true)}
          >
            Withdraw
          </Button>
        </CardContent>
      </Card>

      <section>
        <h2 className="mb-3 font-medium">Transactions</h2>
        {transactions.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground">No transactions yet.</p>
        ) : (
          <div className="space-y-2">
            {transactions.map((tx) => (
              <Card key={tx.id}>
                <CardContent className="flex items-center gap-4 py-3">
                  {tx.type === 'CREDIT' || tx.type === 'RELEASE' ? (
                    <ArrowUpCircle className="h-8 w-8 text-green-500" />
                  ) : (
                    <ArrowDownCircle className="h-8 w-8 text-red-500" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{tx.type}</p>
                    <p className="text-xs text-muted-foreground">{tx.note ?? tx.createdAt ? format(new Date(tx.createdAt), 'dd MMM yyyy') : ''}</p>
                  </div>
                  <span className={cn('font-medium', (tx.type === 'CREDIT' || tx.type === 'RELEASE') ? 'text-green-600' : 'text-red-600')}>
                    {(tx.type === 'CREDIT' || tx.type === 'RELEASE') ? '+' : '-'}₹{Number(tx.amount).toLocaleString('en-IN')}
                  </span>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs">{tx.status}</span>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      <Dialog open={withdrawOpen} onOpenChange={setWithdrawOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Withdraw</DialogTitle>
          </DialogHeader>
          <p className="text-sm">
            Amount: ₹{Number(balance.balance).toLocaleString('en-IN')}
          </p>
          <p className="text-sm text-muted-foreground">Transfers in 1–3 business days.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWithdrawOpen(false)}>Cancel</Button>
            <Button onClick={() => withdrawMutation.mutate()} disabled={withdrawMutation.isPending}>
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
