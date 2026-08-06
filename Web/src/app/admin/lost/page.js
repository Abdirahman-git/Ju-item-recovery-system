import { Suspense } from 'react';
import ReportLostClient from '@/components/admin/lost/ReportLostClient';

export default function Page() {
  return (
    <Suspense fallback={null}>
      <ReportLostClient />
    </Suspense>
  );
}
