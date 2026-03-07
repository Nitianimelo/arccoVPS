/**
 * WebContainerContext — singleton para o WebContainer.
 * Uma instância por sessão do browser. Gerencia boot, npm install e vite dev server.
 */

import React, { createContext, useContext, useRef, useState, useCallback, useEffect } from 'react';

export type WCStatus = 'idle' | 'booting' | 'installing' | 'starting' | 'ready' | 'error';

interface WebContainerContextValue {
  status: WCStatus;
  serverUrl: string | null;
  terminalLines: string[];
  error: string | null;
  boot: (files: Record<string, string>) => Promise<void>;
  writeFiles: (files: Record<string, string>) => Promise<void>;
  isReady: boolean;
}

const WebContainerContext = createContext<WebContainerContextValue | null>(null);

export function useWebContainer() {
  const ctx = useContext(WebContainerContext);
  if (!ctx) throw new Error('useWebContainer must be used within WebContainerProvider');
  return ctx;
}

export function WebContainerProvider({ children }: { children: React.ReactNode }) {
  const containerRef = useRef<any>(null);
  const [status, setStatus] = useState<WCStatus>('idle');
  const [serverUrl, setServerUrl] = useState<string | null>(null);
  const [terminalLines, setTerminalLines] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const bootingRef = useRef(false);

  const addLine = useCallback((line: string) => {
    setTerminalLines(prev => [...prev.slice(-200), line]);
  }, []);

  const writeFiles = useCallback(async (files: Record<string, string>) => {
    const wc = containerRef.current;
    if (!wc) return;

    for (const [filePath, content] of Object.entries(files)) {
      // Garante que o diretório existe
      const parts = filePath.split('/');
      if (parts.length > 1) {
        const dir = parts.slice(0, -1).join('/');
        try {
          await wc.fs.mkdir(dir, { recursive: true });
        } catch {
          // já existe
        }
      }
      await wc.fs.writeFile(filePath, content);
    }
  }, []);

  const boot = useCallback(async (files: Record<string, string>) => {
    if (bootingRef.current || containerRef.current) return;
    bootingRef.current = true;

    try {
      setStatus('booting');
      setError(null);
      setTerminalLines([]);
      addLine('⚡ Iniciando ambiente de desenvolvimento...');

      // Import dinâmico para evitar SSR issues
      const { WebContainer } = await import('@webcontainer/api');
      const wc = await WebContainer.boot();
      containerRef.current = wc;

      addLine('📁 Escrevendo arquivos do projeto...');
      await writeFiles(files);

      setStatus('installing');
      addLine('📦 Instalando dependências (pode levar ~30s na primeira vez)...');

      // npm install
      const installProcess = await wc.spawn('npm', ['install']);
      installProcess.output.pipeTo(
        new WritableStream({
          write(data) {
            addLine(data);
          },
        })
      );
      const installExit = await installProcess.exit;
      if (installExit !== 0) {
        throw new Error(`npm install falhou com código ${installExit}`);
      }

      addLine('✅ Dependências instaladas!');
      setStatus('starting');
      addLine('🚀 Iniciando servidor de desenvolvimento Vite...');

      // vite dev
      const devProcess = await wc.spawn('npm', ['run', 'dev']);
      devProcess.output.pipeTo(
        new WritableStream({
          write(data) {
            addLine(data);
          },
        })
      );

      // Aguarda o server-ready event
      wc.on('server-ready', (_port: number, url: string) => {
        addLine(`✅ App rodando em: ${url}`);
        setServerUrl(url);
        setStatus('ready');
      });

    } catch (err: any) {
      const msg = err?.message || String(err);
      setError(msg);
      setStatus('error');
      addLine(`❌ Erro: ${msg}`);
      bootingRef.current = false;
    }
  }, [addLine, writeFiles]);

  return (
    <WebContainerContext.Provider value={{
      status,
      serverUrl,
      terminalLines,
      error,
      boot,
      writeFiles,
      isReady: status === 'ready',
    }}>
      {children}
    </WebContainerContext.Provider>
  );
}
