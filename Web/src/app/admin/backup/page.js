import dynamic from 'next/dynamic';
import AdminPageSkeleton from '@/components/admin/AdminPageSkeleton';

const BackupRestoreClient = dynamic(
  () => import('@/components/admin/backup/BackupRestoreClient'),
  { loading: () => <AdminPageSkeleton /> }
);

export default function BackupRestorePage() {
  return <BackupRestoreClient />;
}
