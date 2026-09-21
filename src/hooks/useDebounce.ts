import { useEffect, useState } from "react";

/**
 * Custom hook to debounce a fast-changing value.
 *
 * @param value The value to debounce.
 * @param delay Debounce delay in milliseconds (default: 350ms).
 * @returns The debounced value.
 */
export function useDebounce<T>(value: T, delay: number = 350): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

