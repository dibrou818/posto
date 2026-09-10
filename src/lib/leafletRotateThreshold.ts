import L from "leaflet";

// leaflet-rotate's two-finger handler (L.Map.TouchGestures._onTouchMove)
// computes the cumulative angle between the two touches since the gesture
// started and calls setBearing() the instant that angle is non-zero — so
// even a hand tremor during a plain pinch-to-zoom rotates the map. Google
// Maps (and most map apps) require a deliberate twist past a small angle
// before rotation kicks in; below that, two fingers only zoom. There's no
// built-in option for this in the plugin, so this wraps its touchmove
// handler to add one.
const ROTATE_THRESHOLD_DEG = 15;

type TouchGesturesHandler = {
  _map: L.Map;
  _rotating: boolean;
  _startTheta: number;
};

type PatchedTouchGesturesProto = {
  _onTouchMove?: ((this: TouchGesturesHandler, e: TouchEvent) => void) & {
    __postoThresholdApplied?: boolean;
  };
};

export function applyTouchRotateThreshold(): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const TouchGestures = (L as any).Map?.TouchGestures;
  const proto: PatchedTouchGesturesProto | undefined = TouchGestures?.prototype;
  if (!proto?._onTouchMove || proto._onTouchMove.__postoThresholdApplied) return;

  const original = proto._onTouchMove;

  const patched = function (this: TouchGesturesHandler, e: TouchEvent) {
    if (this._rotating && e.touches && e.touches.length === 2) {
      const map = this._map;
      const p1 = map.mouseEventToContainerPoint(e.touches[0] as unknown as MouseEvent);
      const p2 = map.mouseEventToContainerPoint(e.touches[1] as unknown as MouseEvent);
      const diff = p1.subtract(p2);
      let angleDeg = (Math.atan(diff.x / diff.y) - this._startTheta) * L.DomUtil.RAD_TO_DEG;
      if (diff.y < 0) angleDeg += 180;

      if (Math.abs(angleDeg) < ROTATE_THRESHOLD_DEG) {
        // Under the threshold: run the original handler with rotation
        // briefly disabled, so it still updates zoom/pan (unaffected by
        // this) but skips its setBearing call for this frame.
        this._rotating = false;
        original.call(this, e);
        this._rotating = true;
        return;
      }
    }
    original.call(this, e);
  };
  patched.__postoThresholdApplied = true;
  proto._onTouchMove = patched;
}
