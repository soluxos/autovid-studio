import React, { createContext, useContext } from "react";
import type { Brand } from "./types";

const Ctx = createContext<Brand | null>(null);

export const BrandProvider: React.FC<{ brand: Brand; children: React.ReactNode }> = ({ brand, children }) =>
  React.createElement(Ctx.Provider, { value: brand }, children);

export const useBrand = (): Brand => {
  const b = useContext(Ctx);
  if (!b) throw new Error("useBrand must be used inside <BrandProvider>");
  return b;
};
export const useTheme = () => useBrand().theme;
