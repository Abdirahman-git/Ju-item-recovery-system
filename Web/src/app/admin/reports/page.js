import dynamic from 'next/dynamic';
import AdminPageSkeleton from '@/components/admin/AdminPageSkeleton';

const SystemReportsClient = dynamic(
  () => import('@/components/admin/reports/SystemReportsClient'),
  { loading: () => <AdminPageSkeleton /> }
);

export default function SystemReportsPage() {
  return <SystemReportsClient />;
}
