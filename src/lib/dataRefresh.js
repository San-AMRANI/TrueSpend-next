'use client';

import { useEffect } from 'react';

const DATA_CHANGE_EVENT = 'truespend:data-changed';

export function notifyDataChanged() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(DATA_CHANGE_EVENT));
}

export function useDataRefresh(refreshFn) {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handler = () => {
      refreshFn();
    };

    window.addEventListener(DATA_CHANGE_EVENT, handler);
    return () => window.removeEventListener(DATA_CHANGE_EVENT, handler);
  }, [refreshFn]);
}