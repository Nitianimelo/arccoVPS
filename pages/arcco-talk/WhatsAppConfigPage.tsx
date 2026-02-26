import React, { useEffect, useMemo, useState } from 'react';
import {
  Smartphone,
  QrCode,
  Check,
  RefreshCw,
  AlertCircle,
  Wifi,
  WifiOff,
  MessageSquare,
  Clock,
  Shield,
  Settings,
  ArrowLeft,
  Copy,
  ExternalLink
} from 'lucide-react';
import { WhatsAppConfig, TalkAgent, ViewState } from '../../types';
import {
  connectEvolutionInstance,
  createEvolutionInstance,
  disconnectEvolutionInstance,
  getActiveEvolutionConfig,
  getEvolutionConnectionState
} from '../../lib/evolution';

interface WhatsAppConfigPageProps {
  agent: TalkAgent | null;
  userEmail: string;
  onNavigate: (view: ViewState) => void;
  onUpdateConfig: (config: WhatsAppConfig) => void;
}

export const WhatsAppConfigPage: React.FC<WhatsAppConfigPageProps> = ({
  agent,
  userEmail,
  onNavigate,
  onUpdateConfig
}) => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [showQRCode, setShowQRCode] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [qrCodeImage, setQrCodeImage] = useState<string | null>(null);
  const [evolutionConfig, setEvolutionConfig] = useState<{ baseUrl: string; apiKey: string } | null>(null);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [autoReply, setAutoReply] = useState(true);
  const [readConfirmation, setReadConfirmation] = useState(true);
  const [typingIndicator, setTypingIndicator] = useState(true);

  const config = agent?.whatsappConfig;
  const isConnected = config?.status === 'connected';
  const instanceName = agent?.id || config?.instanceName;
  // Build sanitized instance name matching evolution.ts logic
  const sanitizedInstanceName = instanceName ? `arcco-${String(instanceName).replace(/[^a-zA-Z0-9-_]/g, '')}` : null;

  const qrImageSrc = useMemo(() => {
    if (!qrCodeImage) return null;
    if (qrCodeImage.startsWith('data:image')) return qrCodeImage;
    if (qrCodeImage.startsWith('http')) return qrCodeImage;
    return `data:image/png;base64,${qrCodeImage}`;
  }, [qrCodeImage]);

  useEffect(() => {
    const loadConfig = async () => {
      setLoadingConfig(true);
      const activeConfig = await getActiveEvolutionConfig();
      setEvolutionConfig(activeConfig);
      setLoadingConfig(false);
    };

    loadConfig();
  }, []);

  // Auto-check connection state when page opens (always verify from Evolution API)
  useEffect(() => {
    const checkExistingConnection = async () => {
      if (!evolutionConfig || !sanitizedInstanceName) return;

      try {
        console.log('[WhatsApp] Checking existing connection for:', sanitizedInstanceName);
        const state = await getEvolutionConnectionState(evolutionConfig, sanitizedInstanceName);
        const reallyConnected = !!state && state.toLowerCase().includes('open');
        console.log('[WhatsApp] Connection state from API:', state, '→ connected:', reallyConnected);

        if (reallyConnected && config?.status !== 'connected') {
          console.log('[WhatsApp] Instance is connected but local status is stale, restoring...');
          onUpdateConfig({
            instanceName: sanitizedInstanceName,
            agentId: agent?.id || sanitizedInstanceName,
            userEmail,
            businessName: config?.businessName || agent?.name || 'WhatsApp Business',
            phoneNumber: config?.phoneNumber,
            status: 'connected',
            connectedAt: config?.connectedAt || new Date().toISOString(),
            lastSyncAt: new Date().toISOString()
          });
        }
      } catch {
        console.log('[WhatsApp] No existing connection found or instance does not exist');
      }
    };

    checkExistingConnection();
  }, [evolutionConfig, sanitizedInstanceName]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;

    if (showQRCode && evolutionConfig && sanitizedInstanceName) {
      interval = setInterval(async () => {
        try {
          const state = await getEvolutionConnectionState(evolutionConfig, sanitizedInstanceName);
          if (state && state.toLowerCase().includes('open')) {
            onUpdateConfig({
              instanceName: sanitizedInstanceName,
              agentId: agent?.id || sanitizedInstanceName,
              userEmail,
              businessName: config?.businessName || agent?.name || 'WhatsApp Business',
              phoneNumber: config?.phoneNumber,
              status: 'connected',
              connectedAt: new Date().toISOString(),
              qrCode: undefined,
              lastSyncAt: new Date().toISOString()
            });
            setShowQRCode(false);
            setQrCodeImage(null);
          }
        } catch (error) {
          console.error('[WhatsApp] Polling status error:', error);
        }
      }, 5000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [showQRCode, evolutionConfig, sanitizedInstanceName, agent, config, onUpdateConfig, userEmail]);

  const handleConnect = async () => {
    if (!agent) {
      setConnectionError('Selecione um agente antes de conectar.');
      return;
    }
    if (!evolutionConfig) {
      setConnectionError('Evolution API não configurada no painel admin.');
      return;
    }

    setIsConnecting(true);
    setConnectionError(null);
    setQrCodeImage(null);

    const sanitized = `arcco-${String(agent.id).replace(/[^a-zA-Z0-9-_]/g, '')}`;

    // STEP 1: Check if instance is already connected
    try {
      console.log('[WhatsApp] Checking if instance is already connected:', sanitized);
      const state = await getEvolutionConnectionState(evolutionConfig, sanitized);
      if (state && state.toLowerCase().includes('open')) {
        console.log('[WhatsApp] Instance is already connected! Restoring status.');
        onUpdateConfig({
          instanceName: sanitized,
          agentId: agent.id,
          userEmail,
          businessName: config?.businessName || agent?.name || 'WhatsApp Business',
          phoneNumber: config?.phoneNumber,
          status: 'connected',
          connectedAt: config?.connectedAt || new Date().toISOString(),
          lastSyncAt: new Date().toISOString()
        });
        setIsConnecting(false);
        return;
      }
    } catch {
      console.log('[WhatsApp] Instance not connected or does not exist, proceeding to create...');
    }

    // STEP 2: Instance not connected — create or reconnect
    setShowQRCode(true);

    try {
      const payload = {
        instanceName: agent.id,
        agentId: agent.id,
        agentName: agent.name,
        userEmail
      };

      console.log('[WhatsApp] Connecting with config:', {
        baseUrl: evolutionConfig.baseUrl,
        instanceName: agent.id,
        sanitizedName: sanitized
      });

      const result = await createEvolutionInstance(evolutionConfig, payload);
      console.log('[WhatsApp] Result:', result);

      const qrCode = result.qrCode;
      console.log('[WhatsApp] Final QR code:', qrCode ? `${qrCode.substring(0, 80)}...` : 'null');

      if (!qrCode) {
        setConnectionError('Não foi possível gerar o QR Code. A instância pode já estar conectada — recarregue a página.');
        setShowQRCode(false);
      } else {
        setQrCodeImage(qrCode);
        onUpdateConfig({
          instanceName: sanitized,
          agentId: agent.id,
          userEmail,
          businessName: config?.businessName || agent?.name || 'WhatsApp Business',
          phoneNumber: config?.phoneNumber,
          status: 'pending',
          qrCode,
          lastSyncAt: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('[WhatsApp] Connection error:', error);
      setConnectionError(`Erro ao conectar: ${(error as Error).message}`);
      setShowQRCode(false);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!config || !evolutionConfig || !sanitizedInstanceName) return;

    try {
      await disconnectEvolutionInstance(evolutionConfig, sanitizedInstanceName);
      onUpdateConfig({
        ...config,
        status: 'disconnected',
        qrCode: undefined
      });
      setQrCodeImage(null);
      setShowQRCode(false);
    } catch (error) {
      console.error('Erro ao desconectar:', error);
      setConnectionError('Não foi possível desconectar a instância.');
    }
  };

  const handleRefreshQR = async () => {
    if (!evolutionConfig || !sanitizedInstanceName) return;
    setIsConnecting(true);
    setConnectionError(null);
    try {
      const result = await connectEvolutionInstance(evolutionConfig, sanitizedInstanceName);
      if (result.qrCode) {
        setQrCodeImage(result.qrCode);
      }
    } catch (error) {
      console.error('Erro ao atualizar QR:', error);
      setConnectionError('Erro ao atualizar o QR Code.');
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => onNavigate('ARCCO_TALK')}
            className="p-2 hover:bg-neutral-800 rounded-lg transition-colors"
          >
            <ArrowLeft size={20} className="text-neutral-400" />
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-white">Configuração do WhatsApp</h1>
            <p className="text-neutral-400">
              {agent ? `Agente: ${agent.name}` : 'Configure a conexão com o WhatsApp Business'}
            </p>
          </div>
        </div>

        {/* Connection Status Card */}
        <div
          className={`bg-[#0A0A0A] border rounded-2xl p-6 mb-6 ${isConnected ? 'border-green-900/50' : 'border-[#1a1a1a]'
            }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div
                className={`w-14 h-14 rounded-xl flex items-center justify-center ${isConnected ? 'bg-green-900/30' : 'bg-neutral-800'
                  }`}
              >
                {isConnected ? (
                  <Wifi size={28} className="text-green-400" />
                ) : (
                  <WifiOff size={28} className="text-neutral-500" />
                )}
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white mb-1">
                  {isConnected ? 'WhatsApp Conectado' : 'WhatsApp Desconectado'}
                </h2>
                {isConnected && config ? (
                  <div className="space-y-1">
                    <p className="text-neutral-400">{config.phoneNumber || 'Número não identificado'}</p>
                    <p className="text-xs text-neutral-500">
                      Conectado desde{' '}
                      {config.connectedAt
                        ? new Date(config.connectedAt).toLocaleDateString('pt-BR')
                        : '--'}
                    </p>
                  </div>
                ) : (
                  <p className="text-neutral-500">
                    Conecte seu WhatsApp Business para começar a receber mensagens
                  </p>
                )}
              </div>
            </div>
            <div>
              {isConnected ? (
                <button
                  onClick={handleDisconnect}
                  className="px-4 py-2 bg-red-950/50 hover:bg-red-900/50 text-red-400 text-sm font-medium rounded-lg transition-colors border border-red-900/50"
                >
                  Desconectar
                </button>
              ) : (
                <button
                  onClick={handleConnect}
                  disabled={isConnecting || loadingConfig || !evolutionConfig}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
                >
                  {isConnecting ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" />
                      Conectando...
                    </>
                  ) : (
                    <>
                      <Smartphone size={16} />
                      Conectar WhatsApp
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
          {!loadingConfig && !evolutionConfig && (
            <div className="mt-4 flex items-center gap-2 text-amber-400 text-sm">
              <AlertCircle size={14} />
              <span>Evolution API não configurada no painel admin.</span>
            </div>
          )}

          {/* Connected Stats */}
          {isConnected && (
            <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-[#1a1a1a]">
              <div className="text-center">
                <p className="text-2xl font-bold text-white">0</p>
                <p className="text-xs text-neutral-500">Mensagens Hoje</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-white">--</p>
                <p className="text-xs text-neutral-500">Tempo Médio Resposta</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-white">100%</p>
                <p className="text-xs text-neutral-500">Uptime</p>
              </div>
            </div>
          )}
        </div>

        {/* QR Code Section */}
        {showQRCode && !isConnected && (
          <div className="bg-[#0F0F0F] border border-[#262626] rounded-2xl p-6 mb-6">
            <div className="flex flex-col items-center">
              <h3 className="text-lg font-semibold text-white mb-2">Escaneie o QR Code</h3>
              <p className="text-sm text-neutral-400 mb-6 text-center max-w-md">
                Abra o WhatsApp Business no seu celular, vá em Configurações &gt; Aparelhos
                conectados &gt; Conectar um aparelho e escaneie o código abaixo.
              </p>

              {/* QR Code Placeholder */}
              <div className="bg-white p-4 rounded-xl mb-4 relative">
                {isConnecting ? (
                  <div className="w-48 h-48 flex items-center justify-center">
                    <RefreshCw size={32} className="text-neutral-400 animate-spin" />
                  </div>
                ) : qrImageSrc ? (
                  <img src={qrImageSrc} alt="QR Code WhatsApp" className="w-48 h-48" />
                ) : (
                  <div className="w-48 h-48 bg-[#0A0A0A] rounded-lg flex items-center justify-center">
                    <QrCode size={120} className="text-neutral-700" />
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleRefreshQR}
                  className="px-4 py-2 text-neutral-400 hover:text-white text-sm transition-colors flex items-center gap-2"
                >
                  <RefreshCw size={14} />
                  Atualizar QR Code
                </button>
              </div>

              {connectionError && (
                <div className="mt-4 flex items-center gap-2 text-red-400 text-sm">
                  <AlertCircle size={14} />
                  <span>{connectionError}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Configuration Options */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Business Profile */}
          <div className="bg-[#0A0A0A] border border-[#1a1a1a] rounded-xl p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-indigo-900/30 flex items-center justify-center">
                <Settings size={18} className="text-indigo-400" />
              </div>
              <div>
                <h3 className="font-semibold text-white">Perfil Comercial</h3>
                <p className="text-xs text-neutral-500">Informações do seu negócio</p>
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-neutral-500 mb-1">Nome do Negócio</label>
                <input
                  type="text"
                  defaultValue={config?.businessName || agent?.name || ''}
                  placeholder="Nome da sua empresa"
                  className="w-full bg-[#141414] border border-[#262626] rounded-lg px-3 py-2 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs text-neutral-500 mb-1">Número de Telefone</label>
                <input
                  type="text"
                  defaultValue={config?.phoneNumber || ''}
                  placeholder="+55 11 99999-9999"
                  disabled
                  className="w-full bg-[#0A0A0A] border border-[#262626] rounded-lg px-3 py-2 text-sm text-neutral-500"
                />
              </div>
            </div>
          </div>

          {/* Message Settings */}
          <div className="bg-[#0A0A0A] border border-[#1a1a1a] rounded-xl p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-purple-900/30 flex items-center justify-center">
                <MessageSquare size={18} className="text-purple-400" />
              </div>
              <div>
                <h3 className="font-semibold text-white">Mensagens</h3>
                <p className="text-xs text-neutral-500">Configurações de mensagens</p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-neutral-300">Resposta automática</span>
                <button
                  onClick={() => setAutoReply(!autoReply)}
                  className={`relative w-10 h-5 rounded-full transition-colors ${autoReply ? 'bg-indigo-600' : 'bg-neutral-700'}`}
                >
                  <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${autoReply ? 'right-0.5' : 'left-0.5'}`} />
                </button>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-neutral-300">Confirmação de leitura</span>
                <button
                  onClick={() => setReadConfirmation(!readConfirmation)}
                  className={`relative w-10 h-5 rounded-full transition-colors ${readConfirmation ? 'bg-indigo-600' : 'bg-neutral-700'}`}
                >
                  <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${readConfirmation ? 'right-0.5' : 'left-0.5'}`} />
                </button>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-neutral-300">Digitando...</span>
                <button
                  onClick={() => setTypingIndicator(!typingIndicator)}
                  className={`relative w-10 h-5 rounded-full transition-colors ${typingIndicator ? 'bg-indigo-600' : 'bg-neutral-700'}`}
                >
                  <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${typingIndicator ? 'right-0.5' : 'left-0.5'}`} />
                </button>
              </div>
            </div>
          </div>

          {/* Operating Hours */}
          <div className="bg-[#0A0A0A] border border-[#1a1a1a] rounded-xl p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-amber-900/30 flex items-center justify-center">
                <Clock size={18} className="text-amber-400" />
              </div>
              <div>
                <h3 className="font-semibold text-white">Horário de Atendimento</h3>
                <p className="text-xs text-neutral-500">Quando o agente está ativo</p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-neutral-400">Segunda - Sexta</span>
                <span className="text-white">09:00 - 18:00</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-neutral-400">Sábado</span>
                <span className="text-white">09:00 - 12:00</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-neutral-400">Domingo</span>
                <span className="text-neutral-500">Fechado</span>
              </div>
              <button className="w-full mt-2 px-3 py-2 text-xs text-indigo-400 hover:bg-indigo-950/30 rounded-lg transition-colors">
                Editar Horários
              </button>
            </div>
          </div>

          {/* Security */}
          <div className="bg-[#0A0A0A] border border-[#1a1a1a] rounded-xl p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-green-900/30 flex items-center justify-center">
                <Shield size={18} className="text-green-400" />
              </div>
              <div>
                <h3 className="font-semibold text-white">Segurança</h3>
                <p className="text-xs text-neutral-500">Proteção e privacidade</p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <Check size={14} className="text-green-500" />
                <span className="text-neutral-300">Criptografia de ponta a ponta</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Check size={14} className="text-green-500" />
                <span className="text-neutral-300">Dados armazenados com segurança</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Check size={14} className="text-green-500" />
                <span className="text-neutral-300">Conformidade com LGPD</span>
              </div>
            </div>
          </div>
        </div>

        {/* Webhook/API Section */}
        <div className="bg-[#0A0A0A] border border-[#1a1a1a] rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-neutral-800 flex items-center justify-center">
                <ExternalLink size={18} className="text-neutral-400" />
              </div>
              <div>
                <h3 className="font-semibold text-white">Webhook URL</h3>
                <p className="text-xs text-neutral-500">Para integrações externas</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value="https://api.arcco.ai/webhook/wa/abc123xyz"
              readOnly
              className="flex-1 bg-[#141414] border border-[#262626] rounded-lg px-3 py-2 text-sm text-neutral-400 font-mono"
            />
            <button className="p-2 bg-neutral-800 hover:bg-neutral-700 rounded-lg transition-colors">
              <Copy size={18} className="text-neutral-400" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
