// About ±17° vertically and ±39° horizontally, around the default viewing angle.
export const MAX_PITCH = 0.30;
export const MAX_YAW = 0.68;
export const clampUnit = (value: number) => Math.max(-1, Math.min(1, value));

export function pointerRotation(x: number, y: number) {
  return { pitch: clampUnit(y) * MAX_PITCH, yaw: clampUnit(x) * MAX_YAW };
}

export function approachAngle(current: number, target: number, seconds: number) {
  const next = current + (target - current) * (1 - Math.exp(-8 * Math.min(seconds, 0.05)));
  return Math.abs(next - target) < 0.0001 ? target : next;
}
