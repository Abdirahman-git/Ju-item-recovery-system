import { Suspense } from 'react';
import SecureFoundClient from '@/components/admin/secure-found/SecureFoundClient';

export default function Page() {
  return (
    <Suspense fallback={null}>
      <SecureFoundClient />
    </Suspense>
  );
}
