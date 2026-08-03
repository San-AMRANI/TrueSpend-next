'use client';

import { useEffect } from 'react';

const DATA_CHANGE_EVENT = 'truespend:data-changed';
const STORAGE_KEY = 'truespend:data-changed-at';
const CHANNEL_NAME = 'truespend-data-refresh';

export function notifyDataChanged() {
  if (typeof window === 'undefined') return;
  const timestamp = String(Date.now());
  window.dispatchEvent(new Event(DATA_CHANGE_EVENT));
  try {
    window.localStorage.setItem(STORAGE_KEY, timestamp);
  } catch (error) {
    // Ignore storage failures; the in-tab event still works.
  }
  if ('BroadcastChannel' in window) {
    const channel = new BroadcastChannel(CHANNEL_NAME);
    channel.postMessage(timestamp);
    channel.close();
  }
}

export function useDataRefresh(refreshFn) {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handler = () => {
      refreshFn();
    };

    const storageHandler = (event) => {
      if (event.key === STORAGE_KEY) {
        refreshFn();
      }
    };

    let channel = null;
    const channelHandler = () => {
      refreshFn();
    };

    window.addEventListener(DATA_CHANGE_EVENT, handler);
    window.addEventListener('storage', storageHandler);
    if ('BroadcastChannel' in window) {
      channel = new BroadcastChannel(CHANNEL_NAME);
      channel.addEventListener('message', channelHandler);
    }

    return () => {
      window.removeEventListener(DATA_CHANGE_EVENT, handler);
      window.removeEventListener('storage', storageHandler);
      if (channel) {
        channel.removeEventListener('message', channelHandler);
        channel.close();
      }
    };
  }, [refreshFn]);
}