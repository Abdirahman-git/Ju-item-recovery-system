import { Suspense } from 'react';
import OwnershipRequestsClient from '@/components/admin/claims/OwnershipRequestsClient';

export default function Page() {
  return (
    <Suspense fallback={null}>
      <OwnershipRequestsClient />
    </Suspense>
  );
}
