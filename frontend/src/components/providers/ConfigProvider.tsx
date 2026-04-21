"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { fetchConfiguracao, Configuracao } from "@/lib/api";

interface ConfigContextData {
  config: Configuracao | null;
  loading: boolean;
  refreshConfig: () => Promise<void>;
}

const ConfigContext = createContext<ConfigContextData>({
  config: null,
  loading: true,
  refreshConfig: async () => {},
});

export function ConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<Configuracao | null>(null);
  const [loading, setLoading] = useState(true);

  const loadConfig = async () => {
    try {
      const data = await fetchConfiguracao();
      setConfig(data);
    } catch (err) {
      console.error("Erro ao buscar configurações do sistema", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConfig();
  }, []);

  return (
    <ConfigContext.Provider value={{ config, loading, refreshConfig: loadConfig }}>
      {children}
    </ConfigContext.Provider>
  );
}

export function useConfig() {
  return useContext(ConfigContext);
}
