/**
 * WebContainerPreview — preview ao vivo de apps React com WebContainers.
 * Exibe loading animado durante boot, depois serve o app via iframe.
 */

import React, { useEffect, useRef, useState } from 'react';
import { Terminal, RefreshCw, ExternalLink, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { useWebContainer, WCStatus } from './WebContainerContext';

interface WebContainerPreviewProps {
  files: Record<string, string>;
  /** Modo de viewport para responsividade */
  deviceWidth?: string;
}

const STATUS_MESSAGES: Record<WCStatus, string> = {
  idle: 'Aguardando...',
  booting: 'Iniciando ambiente Node.js...',
  installing: 'Instalando dependências (React, Tailwind, shadcn/ui)...',
  starting: 'Iniciando servidor Vite...',
  ready: 'App rodando',
  error: 'Erro ao iniciar',
};

const STATUS_ICONS: Record<WCStatus, React.ReactNode> = {
  idle: <Loader2 className="w-5 h-5 animate-spin text-neutral-400" />,
  booting: <Loader2 className="w-5 h-5 animate-spin text-blue-400" />,
  installing: <Loader2 className="w-5 h-5 animate-spin text-violet-400" />,
  starting: <Loader2 className="w-5 h-5 animate-spin text-emerald-400" />,
  ready: <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />,
  error: <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />,
};

export function WebContainerPreview({ files, deviceWidth = '100%' }: WebContainerPreviewProps) {
  const { status, serverUrl, terminalLines, error, boot, writeFiles, isReady } = useWebContainer();
  const [showTerminal, setShowTerminal] = useState(false);
  const [prevFiles, setPrevFiles] = useState<Record<string, string>>({});
  const terminalRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Boot inicial com os arquivos do template
  useEffect(() => {
    if (status === 'idle' && Object.keys(files).length > 0) {
      boot(files);
      setPrevFiles(files);
    }
  }, [status, files, boot]);

  // Quando arquivos mudam (edição), escreve no container (Vite HMR cuida do reload)
  useEffect(() => {
    if (!isReady || Object.keys(files).length === 0) return;

    const changedFiles: Record<string, string> = {};
    for (const [path, content] of Object.entries(files)) {
      if (prevFiles[path] !== content) {
        changedFiles[path] = content;
      }
    }

    if (Object.keys(changedFiles).length > 0) {
      writeFiles(changedFiles);
      setPrevFiles(files);
    }
  }, [files, isReady, writeFiles, prevFiles]);

  // Auto-scroll do terminal
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [terminalLines]);

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a] rounded-lg overflow-hidden border border-neutral-800">
      {/* Status bar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-neutral-800 bg-[#111] flex-shrink-0">
        <div className="flex items-center gap-2">
          {STATUS_ICONS[status]}
          <span className="text-xs text-neutral-400">{STATUS_MESSAGES[status]}</span>
        </div>

        <div className="flex items-center gap-2">
          {serverUrl && (
            <a
              href={serverUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-neutral-500 hover:text-white transition-colors"
              title="Abrir em nova aba"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
          <button
            onClick={() => setShowTerminal(v => !v)}
            className="flex items-center gap-1 text-xs text-neutral-500 hover:text-white transition-colors"
          >
            <Terminal className="w-3.5 h-3.5" />
            {showTerminal ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {/* Preview area */}
      <div className="flex-1 relative min-h-0">
        {/* Loading screen */}
        {!isReady && status !== 'error' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 bg-[#0a0a0a] z-10">
            <div className="flex flex-col items-center gap-3">
              <div className="relative">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
                  <span className="text-2xl font-bold text-white">A</span>
                </div>
                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full border-2 border-[#0a0a0a] flex items-center justify-center">
                  <Loader2 className="w-3 h-3 text-white animate-spin" />
                </div>
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-white">{STATUS_MESSAGES[status]}</p>
                <p className="text-xs text-neutral-500 mt-1">
                  {status === 'installing' ? 'React · Tailwind · shadcn/ui · Zustand' : 'Arcco Builder'}
                </p>
              </div>
            </div>

            {/* Progress steps */}
            <div className="flex flex-col gap-1.5 w-48">
              {(['booting', 'installing', 'starting'] as WCStatus[]).map((s, i) => {
                const statuses: WCStatus[] = ['booting', 'installing', 'starting', 'ready'];
                const currentIdx = statuses.indexOf(status);
                const stepIdx = statuses.indexOf(s);
                const isDone = stepIdx < currentIdx;
                const isActive = s === status;
                return (
                  <div key={s} className="flex items-center gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isDone ? 'bg-emerald-500' : isActive ? 'bg-violet-500 animate-pulse' : 'bg-neutral-700'}`} />
                    <span className={`text-xs ${isDone ? 'text-emerald-500' : isActive ? 'text-neutral-200' : 'text-neutral-600'}`}>
                      {i === 0 ? 'Ambiente Node.js' : i === 1 ? 'Dependências npm' : 'Servidor Vite'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Error screen */}
        {status === 'error' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#0a0a0a] z-10 p-6">
            <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center">
              <span className="text-2xl">⚠️</span>
            </div>
            <p className="text-sm font-medium text-red-400 text-center">Erro ao iniciar ambiente</p>
            <p className="text-xs text-neutral-500 text-center max-w-xs">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="flex items-center gap-2 px-3 py-1.5 text-xs bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Recarregar página
            </button>
          </div>
        )}

        {/* App iframe */}
        {serverUrl && (
          <div className="absolute inset-0 flex justify-center">
            <iframe
              ref={iframeRef}
              src={serverUrl}
              className="h-full border-none bg-white"
              style={{ width: deviceWidth }}
              title="App Preview"
              allow="cross-origin-isolated"
            />
          </div>
        )}
      </div>

      {/* Terminal panel (collapsible) */}
      {showTerminal && (
        <div
          ref={terminalRef}
          className="h-40 bg-black border-t border-neutral-800 overflow-y-auto p-3 font-mono text-[10px] flex-shrink-0"
        >
          {terminalLines.map((line, i) => (
            <div key={i} className={`leading-relaxed whitespace-pre-wrap ${line.startsWith('❌') ? 'text-red-400' : line.startsWith('✅') || line.startsWith('🚀') ? 'text-emerald-400' : 'text-neutral-400'}`}>
              {line}
            </div>
          ))}
          {terminalLines.length === 0 && (
            <span className="text-neutral-600">Terminal aguardando...</span>
          )}
        </div>
      )}
    </div>
  );
}
