import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import ReportLostClient from '@/components/admin/lost/ReportLostClient';

/** New Found reports closed. Legacy found drafts can still be edited via ?draft= */
export default async function Page({ searchParams }) {
  const params = await searchParams;
  const draftId = params?.draft;
  if (!draftId) {
    redirect('/admin/lost');
  }

  return (
    <Suspense fallback={null}>
      <ReportLostClient mode="found" />
    </Suspense>
  );
}
