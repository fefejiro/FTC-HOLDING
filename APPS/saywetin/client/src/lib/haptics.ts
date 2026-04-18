function canVibrate(): boolean {
  return typeof navigator !== 'undefined' && 'vibrate' in navigator;
}

export function hapticTap() {
  if (canVibrate()) navigator.vibrate(10);
}

export function hapticSuccess() {
  if (canVibrate()) navigator.vibrate([10, 50, 10]);
}

export function hapticLight() {
  if (canVibrate()) navigator.vibrate(6);
}
