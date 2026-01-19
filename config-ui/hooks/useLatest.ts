import { useRef, useLayoutEffect } from "react";

/**
 * Returns a ref that always points to the latest value.
 * Useful for accessing the latest value in event handlers without
 * causing effect re-subscriptions when the value changes.
 */
export function useLatest<T>(value: T) {
  const ref = useRef(value);

  useLayoutEffect(() => {
    ref.current = value;
  });

  return ref;
}
