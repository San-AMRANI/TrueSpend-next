'use client';

import { useRouter } from 'next/navigation';
import { useDataRefresh } from '@/lib/dataRefresh';

export default function RefreshOnDataChange() {
  const router = useRouter();

  useDataRefresh(() => {
    router.refresh();
  });

  return null;
}