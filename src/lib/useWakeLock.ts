import { useState, useEffect, useCallback } from 'react';

export function useWakeLock() {
  const [isSupported, setIsSupported] = useState(false);
  const [isAwake, setIsAwake] = useState(false);
  const [wakeLock, setWakeLock] = useState<any>(null);

  useEffect(() => {
    setIsSupported('wakeLock' in navigator);
  }, []);

  const request = useCallback(async () => {
    if (!isSupported) return;
    try {
      const lock = await (navigator as any).wakeLock.request('screen');
      setWakeLock(lock);
      setIsAwake(true);
      lock.addEventListener('release', () => {
        setIsAwake(false);
        setWakeLock(null);
      });
    } catch (err: any) {
      console.error(`${err.name}, ${err.message}`);
    }
  }, [isSupported]);

  const release = useCallback(async () => {
    if (wakeLock) {
      await wakeLock.release();
      setWakeLock(null);
      setIsAwake(false);
    }
  }, [wakeLock]);

  const toggle = useCallback(() => {
    if (isAwake) {
      release();
    } else {
      request();
    }
  }, [isAwake, request, release]);

  return { isSupported, isAwake, toggle };
}
