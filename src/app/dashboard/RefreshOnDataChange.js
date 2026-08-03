'use client';

import { useDataRefresh } from '@/lib/dataRefresh';

export default function RefreshOnDataChange() {
  useDataRefresh(() => {
    window.location.reload();
  });

  return null;
}