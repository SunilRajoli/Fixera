import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { ErrorMessage } from '@/components/shared/ErrorMessage'
import { format } from 'date-fns'

interface CustomerRow {
  id: string
  name: string
  phone: string
  createdAt: string
  role: string
}

export default function AdminCustomerList() {
  const { data: listData, isLoading, error, refetch } = useQuery({
    queryKey: ['admin', 'customers'],
    queryFn: async () => {
      const res = await api.get<{ data: { customers?: CustomerRow[] } }>('/api/admin/customers')
      return res.data.data
    },
  })

  if (isLoading) return <LoadingSpinner className="min-h-[40vh]" message="Loading customers..." />
  if (error) return <ErrorMessage message={(error as Error).message} onRetry={() => refetch()} />

  const list = listData?.customers ?? []

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Customers</h1>
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="p-2 text-left">Name</th>
              <th className="p-2 text-left">Phone</th>
              <th className="p-2 text-left">Joined</th>
            </tr>
          </thead>
          <tbody>
            {list.map((u) => (
              <tr key={u.id} className="border-b">
                <td className="p-2 font-medium">{u.name}</td>
                <td className="p-2">{u.phone}</td>
                <td className="p-2">{format(new Date(u.createdAt), 'dd MMM yyyy')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
