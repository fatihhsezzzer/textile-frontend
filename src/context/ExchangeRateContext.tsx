import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { ExchangeRate } from "../types";
import { exchangeRateService } from "../services/dataService";

interface ExchangeRateContextType {
  rates: ExchangeRate[];
  loading: boolean;
  error: string | null;
  usdRate: number | null;
  eurRate: number | null;
  gbpRate: number | null;
  refreshRates: () => Promise<void>;
  lastUpdated: Date | null;
}

const ExchangeRateContext = createContext<ExchangeRateContextType | undefined>(
  undefined
);

export const ExchangeRateProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [rates, setRates] = useState<ExchangeRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const loadRates = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await exchangeRateService.getLatest();
      setRates(data);
      setLastUpdated(new Date());
    } catch (err: any) {
      console.error("❌ Döviz kurları yüklenemedi:", err);
      setError(err.message || "Döviz kurları yüklenemedi");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRates();

    // Her 1 saatte bir otomatik güncelle
    const interval = setInterval(() => {
      loadRates();
    }, 60 * 60 * 1000); // 1 saat

    return () => clearInterval(interval);
  }, [loadRates]);

  const usdRate =
    rates.find((rate) => rate.currencyCode === "USD")?.banknoteSelling || null;
  const eurRate =
    rates.find((rate) => rate.currencyCode === "EUR")?.banknoteSelling || null;
  const gbpRate =
    rates.find((rate) => rate.currencyCode === "GBP")?.banknoteSelling || null;

  const value: ExchangeRateContextType = {
    rates,
    loading,
    error,
    usdRate,
    eurRate,
    gbpRate,
    refreshRates: loadRates,
    lastUpdated,
  };

  return (
    <ExchangeRateContext.Provider value={value}>
      {children}
    </ExchangeRateContext.Provider>
  );
};

export const useExchangeRates = () => {
  const context = useContext(ExchangeRateContext);
  if (context === undefined) {
    throw new Error(
      "useExchangeRates must be used within an ExchangeRateProvider"
    );
  }
  return context;
};
