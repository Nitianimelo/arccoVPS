import React, { useEffect, useState } from 'react';
import { useToast } from '../../components/Toast';
import {
  Table,
  Plus,
  Trash2,
  Download,
  Upload,
  MoreVertical,
  Edit3,
  Copy,
  X,
  FileSpreadsheet,
  Sparkles,
  Save,
  Loader2
} from 'lucide-react';
import { Spreadsheet, ViewState } from '../../types';
import { spreadsheetService } from '../../lib/supabase';

interface SpreadsheetPageProps {
  onNavigate: (view: ViewState) => void;
}

interface SpreadsheetData {
  id: string;
  name: string;
  headers: string[];
  rows: string[][];
  createdAt: string;
}

export const SpreadsheetPage: React.FC<SpreadsheetPageProps> = ({ onNavigate }) => {
  const { showToast } = useToast();
  const [spreadsheets, setSpreadsheets] = useState<SpreadsheetData[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<SpreadsheetData | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newSheetName, setNewSheetName] = useState('');
  const [editingCell, setEditingCell] = useState<{ row: number; col: number } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const normalizeHeaders = (headers?: string[] | string): string[] => {
    if (!headers) return ['Coluna 1', 'Coluna 2', 'Coluna 3'];
    if (Array.isArray(headers)) return headers;
    try {
      const parsed = JSON.parse(headers);
      return Array.isArray(parsed) ? parsed : ['Coluna 1', 'Coluna 2', 'Coluna 3'];
    } catch {
      return ['Coluna 1', 'Coluna 2', 'Coluna 3'];
    }
  };

  const normalizeRows = (rows?: unknown, headers?: string[]): string[][] => {
    if (!rows) return [];
    if (Array.isArray(rows)) {
      return rows.map((row) => {
        if (Array.isArray(row)) {
          return row.map((cell) => (cell?.value ?? cell ?? '').toString());
        }
        if (row && typeof row === 'object') {
          const rowValues = headers?.map((key) => (row as Record<string, unknown>)[key]) ?? [];
          return rowValues.map((cell) => (cell ?? '').toString());
        }
        return [String(row)];
      });
    }
    if (typeof rows === 'string') {
      try {
        const parsed = JSON.parse(rows);
        return normalizeRows(parsed, headers);
      } catch {
        return [];
      }
    }
    return [];
  };

  useEffect(() => {
    const fetchSpreadsheets = async () => {
      setIsLoading(true);
      const userEmail = localStorage.getItem('arcco_user_email') || undefined;

      const { data, error } = await spreadsheetService.getSpreadsheetsByUser(userEmail);
      if (error) {
        console.error('Erro ao carregar planilhas:', error);
        setIsLoading(false);
        return;
      }

      const mapped = (data ?? []).map((record) => {
        const headers = normalizeHeaders(record.headers);
        return {
          id: record.id ? String(record.id) : `${Date.now()}-${Math.random()}`,
          name: record.name || record.nome || 'Planilha sem nome',
          headers,
          rows: normalizeRows(record.rows, headers),
          createdAt: record.created_at || new Date().toISOString()
        };
      });
      setSpreadsheets(mapped);
      setSelectedSheet(mapped[0] ?? null);
      setIsLoading(false);
    };

    fetchSpreadsheets();
  }, []);

  const handleCreateSheet = async () => {
    if (!newSheetName.trim()) return;

    const userEmail = localStorage.getItem('arcco_user_email') || undefined;
    const headers = ['Coluna 1', 'Coluna 2', 'Coluna 3'];
    const rows = [['', '', '']];

    try {
      const { data, error } = await spreadsheetService.createSpreadsheet({
        name: newSheetName,
        headers,
        rows,
        userEmail
      });

      if (error) {
        console.error('Erro ao criar planilha:', error);
        showToast(`Erro ao criar planilha: ${error.message}`, 'error');
        return;
      }

      if (!data) {
        console.error('Erro ao criar planilha: nenhum dado retornado');
        showToast('Erro ao criar planilha: nenhum dado retornado do servidor.', 'error');
        return;
      }

      const newSheet: SpreadsheetData = {
        id: data.id ? String(data.id) : Date.now().toString(),
        name: data.name || data.nome || newSheetName,
        headers,
        rows,
        createdAt: data.created_at || new Date().toISOString()
      };

      setSpreadsheets([newSheet, ...spreadsheets]);
      setSelectedSheet(newSheet);
      setShowCreateModal(false);
      setNewSheetName('');
    } catch (err: any) {
      console.error('Erro inesperado ao criar planilha:', err);
      showToast(`Erro inesperado: ${err?.message || 'Falha ao criar planilha'}`, 'error');
    }
  };

  const handleDeleteSheet = async (id: string) => {
    const { error } = await spreadsheetService.deleteSpreadsheet(id);
    if (error) {
      console.error('Erro ao excluir planilha:', error);
      return;
    }

    setSpreadsheets(spreadsheets.filter((s) => s.id !== id));
    if (selectedSheet?.id === id) {
      setSelectedSheet(null);
    }
  };

  const handleSaveSheet = async () => {
    if (!selectedSheet) return;
    setIsSaving(true);
    try {
      // Map rows to ensure they are string[][]
      const rows = selectedSheet.rows.map(row => row.map(cell => String(cell)));

      const { data, error } = await spreadsheetService.updateSpreadsheet(selectedSheet.id, {
        name: selectedSheet.name,
        headers: selectedSheet.headers,
        rows: rows
      });

      if (error) throw error;

      // Update the list with the saved version (to confirm consistency)
      // Actually we just keep local state as master since it matches
      showToast('Planilha salva com sucesso!', 'success');
    } catch (err) {
      console.error('Erro ao salvar planilha:', err);
      showToast('Erro ao salvar planilha.', 'error');
    } finally {
      setIsSaving(false);
    }
  };



  const handleCellChange = (rowIndex: number, colIndex: number, value: string) => {
    if (!selectedSheet) return;

    const updatedRows = selectedSheet.rows.map(row => [...row]);
    updatedRows[rowIndex][colIndex] = value;

    const updatedSheet = { ...selectedSheet, rows: updatedRows };
    setSelectedSheet(updatedSheet);
    setSpreadsheets(spreadsheets.map((s) => (s.id === selectedSheet.id ? updatedSheet : s)));
  };

  const handleHeaderChange = (colIndex: number, value: string) => {
    if (!selectedSheet) return;

    const updatedHeaders = [...selectedSheet.headers];
    updatedHeaders[colIndex] = value;

    const updatedSheet = { ...selectedSheet, headers: updatedHeaders };
    setSelectedSheet(updatedSheet);
    setSpreadsheets(spreadsheets.map((s) => (s.id === selectedSheet.id ? updatedSheet : s)));
  };

  const handleAddRow = () => {
    if (!selectedSheet) return;

    const newRow = new Array(selectedSheet.headers.length).fill('');
    const updatedSheet = {
      ...selectedSheet,
      rows: [...selectedSheet.rows, newRow]
    };
    setSelectedSheet(updatedSheet);
    setSpreadsheets(spreadsheets.map((s) => (s.id === selectedSheet.id ? updatedSheet : s)));
  };

  const handleAddColumn = () => {
    if (!selectedSheet) return;

    const updatedHeaders = [...selectedSheet.headers, `Coluna ${selectedSheet.headers.length + 1}`];
    const updatedRows = selectedSheet.rows.map((row) => [...row, '']);

    const updatedSheet = {
      ...selectedSheet,
      headers: updatedHeaders,
      rows: updatedRows
    };
    setSelectedSheet(updatedSheet);
    setSpreadsheets(spreadsheets.map((s) => (s.id === selectedSheet.id ? updatedSheet : s)));
  };

  const handleDeleteRow = (rowIndex: number) => {
    if (!selectedSheet || selectedSheet.rows.length <= 1) return;

    const updatedRows = selectedSheet.rows.filter((_, index) => index !== rowIndex);
    const updatedSheet = { ...selectedSheet, rows: updatedRows };
    setSelectedSheet(updatedSheet);
    setSpreadsheets(spreadsheets.map((s) => (s.id === selectedSheet.id ? updatedSheet : s)));
  };

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">Planilhas</h1>
            <p className="text-neutral-400">
              Crie e gerencie dados que seu agente pode consultar
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl transition-colors flex items-center gap-2 shadow-lg shadow-indigo-600/20"
          >
            <Plus size={18} />
            Nova Planilha
          </button>
        </div>

        <div className="flex gap-6">
          {/* Spreadsheets List */}
          <div className="w-64 shrink-0">
            <div className="bg-[#0A0A0A] border border-[#1a1a1a] rounded-xl p-4">
              <h3 className="font-semibold text-white mb-3 text-sm">Suas Planilhas</h3>

              {isLoading ? (
                <p className="text-sm text-neutral-500 text-center py-4">
                  Carregando planilhas...
                </p>
              ) : spreadsheets.length > 0 ? (
                <div className="space-y-2">
                  {spreadsheets.map((sheet) => (
                    <button
                      key={sheet.id}
                      onClick={() => setSelectedSheet(sheet)}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left ${selectedSheet?.id === sheet.id
                        ? 'bg-indigo-600/10 border border-indigo-500/30'
                        : 'hover:bg-neutral-800 border border-transparent'
                        }`}
                    >
                      <div className="w-8 h-8 rounded-lg bg-neutral-800 flex items-center justify-center shrink-0">
                        <FileSpreadsheet size={16} className="text-neutral-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{sheet.name}</p>
                        <p className="text-xs text-neutral-500">
                          {sheet.rows.length} linhas
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-neutral-500 text-center py-4">
                  Nenhuma planilha criada
                </p>
              )}
            </div>
          </div>

          {/* Spreadsheet Editor */}
          <div className="flex-1">
            {selectedSheet ? (
              <div className="bg-[#0A0A0A] border border-[#1a1a1a] rounded-xl overflow-hidden">
                {/* Sheet Header */}
                <div className="p-4 border-b border-[#1a1a1a] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-900/30 flex items-center justify-center">
                      <Table size={20} className="text-indigo-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">{selectedSheet.name}</h3>
                      <p className="text-xs text-neutral-500">
                        {selectedSheet.headers.length} colunas, {selectedSheet.rows.length} linhas
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleSaveSheet}
                      disabled={isSaving}
                      className="flex items-center gap-2 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                      Salvar Alterações
                    </button>
                    <button
                      onClick={handleAddColumn}
                      className="px-3 py-1.5 text-xs text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors"
                    >
                      + Coluna
                    </button>
                    <button
                      onClick={handleAddRow}
                      className="px-3 py-1.5 text-xs text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors"
                    >
                      + Linha
                    </button>
                    <button
                      onClick={() => handleDeleteSheet(selectedSheet.id)}
                      className="p-2 text-neutral-400 hover:text-red-400 hover:bg-red-950/30 rounded-lg transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-[#0F0F0F]">
                        <th className="w-10 px-2 py-3 text-xs text-neutral-600 font-medium">#</th>
                        {selectedSheet.headers.map((header, colIndex) => (
                          <th
                            key={colIndex}
                            className="px-2 py-2 text-left min-w-[150px]"
                          >
                            <input
                              type="text"
                              value={header}
                              onChange={(e) => handleHeaderChange(colIndex, e.target.value)}
                              className="w-full bg-transparent border-none text-sm font-semibold text-white focus:outline-none focus:bg-neutral-800 rounded px-2 py-1"
                            />
                          </th>
                        ))}
                        <th className="w-10"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedSheet.rows.map((row, rowIndex) => (
                        <tr
                          key={rowIndex}
                          className="border-t border-[#1a1a1a] hover:bg-[#0F0F0F]"
                        >
                          <td className="px-2 py-2 text-center text-xs text-neutral-600">
                            {rowIndex + 1}
                          </td>
                          {row.map((cell, colIndex) => (
                            <td key={colIndex} className="px-2 py-1">
                              <input
                                type="text"
                                value={cell}
                                onChange={(e) =>
                                  handleCellChange(rowIndex, colIndex, e.target.value)
                                }
                                className="w-full bg-transparent border border-transparent text-sm text-neutral-300 focus:outline-none focus:border-indigo-500 focus:bg-[#141414] rounded px-2 py-2 transition-all"
                                placeholder="..."
                              />
                            </td>
                          ))}
                          <td className="px-2 py-2">
                            <button
                              onClick={() => handleDeleteRow(rowIndex)}
                              className="p-1 text-neutral-600 hover:text-red-400 rounded transition-colors opacity-0 group-hover:opacity-100"
                              style={{ opacity: selectedSheet.rows.length > 1 ? undefined : 0 }}
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-[#1a1a1a] bg-[#0F0F0F]">
                  <div className="flex items-start gap-3">
                    <Sparkles size={16} className="text-indigo-400 shrink-0 mt-0.5" />
                    <p className="text-xs text-neutral-500">
                      Seu agente pode consultar esses dados durante as conversas para fornecer
                      informações precisas sobre preços, produtos, FAQs e muito mais.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              /* Empty State */
              <div className="bg-[#0A0A0A] border border-[#1a1a1a] rounded-xl p-12 text-center">
                <div className="w-20 h-20 rounded-2xl bg-[#0F0F0F] border border-[#1a1a1a] flex items-center justify-center mx-auto mb-6">
                  <Table size={40} className="text-neutral-600" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">
                  Selecione uma planilha
                </h3>
                <p className="text-neutral-500 mb-6 max-w-md mx-auto">
                  Escolha uma planilha existente ou crie uma nova para começar a adicionar dados
                </p>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl transition-colors"
                >
                  <Plus size={18} />
                  Criar Planilha
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Create Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-[#0F0F0F] border border-[#262626] rounded-2xl w-full max-w-sm overflow-hidden">
              <div className="p-6 border-b border-[#262626] flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">Nova Planilha</h2>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="p-2 hover:bg-neutral-800 rounded-lg transition-colors"
                >
                  <X size={20} className="text-neutral-400" />
                </button>
              </div>

              <div className="p-6">
                <label className="block text-sm font-medium text-neutral-300 mb-2">
                  Nome da Planilha
                </label>
                <input
                  type="text"
                  value={newSheetName}
                  onChange={(e) => setNewSheetName(e.target.value)}
                  placeholder="Ex: Lista de Preços"
                  className="w-full bg-[#141414] border border-[#262626] rounded-xl px-4 py-3 text-white placeholder-neutral-600 focus:outline-none focus:border-indigo-500"
                  autoFocus
                />
              </div>

              <div className="p-6 border-t border-[#262626] flex justify-end gap-3">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-neutral-400 hover:text-white transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCreateSheet}
                  disabled={!newSheetName.trim()}
                  type="button"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-neutral-800 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-colors"
                >
                  Criar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div >
  );
};
