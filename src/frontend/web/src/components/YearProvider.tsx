"use client";

import { createContext, useContext, useState, ReactNode } from "react";

type YearContextType = {
  selectedYear: number;
  setSelectedYear: (year: number) => void;
  yearStart: string; // YYYY-01-01
  yearEnd: string;   // YYYY-12-31
};

const YearContext = createContext<YearContextType | null>(null);

export function YearProvider({ children }: { children: ReactNode }) {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const yearStart = `${selectedYear}-01-01`;
  const yearEnd = `${selectedYear}-12-31`;

  return (
    <YearContext.Provider value={{ selectedYear, setSelectedYear, yearStart, yearEnd }}>
      {children}
    </YearContext.Provider>
  );
}

export function useYear() {
  const ctx = useContext(YearContext);
  if (!ctx) throw new Error("useYear must be used within YearProvider");
  return ctx;
}
