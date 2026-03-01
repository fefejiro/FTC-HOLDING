import { useEffect, useState, useCallback } from 'react';

interface ShakeDetectionOptions {
  threshold?: number;
  timeout?: number;
  onShake?: () => void;
  enabled?: boolean;
}

export function useShakeDetection(options: ShakeDetectionOptions = {}) {
  const { threshold = 15, timeout = 500, onShake, enabled = false } = options;
  const [isShaking, setIsShaking] = useState(false);
  const [lastShakeTime, setLastShakeTime] = useState<number>(0);
  const [permissionState, setPermissionState] = useState<'pending' | 'granted' | 'denied'>('pending');

  const handleShake = useCallback(() => {
    const now = Date.now();
    if (now - lastShakeTime > timeout) {
      setIsShaking(true);
      setLastShakeTime(now);
      onShake?.();
      
      setTimeout(() => setIsShaking(false), 300);
    }
  }, [lastShakeTime, timeout, onShake]);

  const requestPermission = useCallback(async () => {
    if (typeof DeviceMotionEvent !== 'undefined' && 'requestPermission' in DeviceMotionEvent) {
      try {
        const response = await (DeviceMotionEvent as any).requestPermission();
        setPermissionState(response === 'granted' ? 'granted' : 'denied');
        return response === 'granted';
      } catch (error) {
        console.error('Error requesting motion permission:', error);
        setPermissionState('denied');
        return false;
      }
    } else {
      setPermissionState('granted');
      return true;
    }
  }, []);

  useEffect(() => {
    if (!enabled || permissionState !== 'granted') return;

    let lastX = 0;
    let lastY = 0;
    let lastZ = 0;
    let lastTime = Date.now();

    const handleMotion = (event: DeviceMotionEvent) => {
      const acceleration = event.accelerationIncludingGravity;
      if (!acceleration) return;

      const { x, y, z } = acceleration;
      if (x === null || y === null || z === null) return;

      const currentTime = Date.now();
      const timeDiff = currentTime - lastTime;

      if (timeDiff > 100) {
        const deltaX = Math.abs(x - lastX);
        const deltaY = Math.abs(y - lastY);
        const deltaZ = Math.abs(z - lastZ);

        if (deltaX + deltaY + deltaZ > threshold) {
          handleShake();
        }

        lastX = x;
        lastY = y;
        lastZ = z;
        lastTime = currentTime;
      }
    };

    window.addEventListener('devicemotion', handleMotion);

    return () => {
      window.removeEventListener('devicemotion', handleMotion);
    };
  }, [enabled, permissionState, handleShake, threshold]);

  return { isShaking, permissionState, requestPermission };
}
