import { clampUnit } from './modelMotion';

export function createModelTouch() {
  let start: { id: number; x: number; y: number } | undefined;
  return {
    begin(id: number, x: number, y: number, primary: boolean) {
      if (!primary || start) return false;
      start = { id, x, y };
      return true;
    },
    move(id: number, x: number, y: number, width: number, height: number) {
      if (!start || start.id !== id || width <= 0 || height <= 0) return undefined;
      return { x: clampUnit((x - start.x) / width * 3), y: clampUnit((y - start.y) / height * 2) };
    },
    end(id: number) {
      if (start?.id !== id) return false;
      start = undefined;
      return true;
    },
    reset() { start = undefined; },
    active() { return Boolean(start); },
  };
}
