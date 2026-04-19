import { useEffect, useState } from "react";

// Retorna o valor depois de um atraso (delay) de inatividade
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Limpa o timeout se o valor mudar antes do tempo acabar
    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}
