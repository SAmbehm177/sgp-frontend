import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { sgpStorage } from '../../services/storage';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { Server, RefreshCw, CheckCircle2, AlertCircle, Database } from 'lucide-react';

interface ApiSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataReset?: () => void;
}

export const ApiSettingsModal: React.FC<ApiSettingsModalProps> = ({
  isOpen,
  onClose,
  onDataReset,
}) => {
  const [baseUrl, setBaseUrl] = useState(sgpStorage.getApiBaseUrl());
  const [useMock, setUseMock] = useState(sgpStorage.isUsingMock());
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const toast = useToast();

  const handleSave = () => {
    sgpStorage.setApiBaseUrl(baseUrl.trim());
    sgpStorage.setUseMock(useMock);
    toast.success('Configuration sauvegardée', `Mode actif : ${useMock ? 'Émulateur local SGP' : 'API Laravel Sanctum'}`);
    onClose();
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await api.testApiConnection(baseUrl);
      setTestResult(res);
      if (res.ok) {
        toast.success('API Laravel joignable', res.message);
      } else {
        toast.warning('API Laravel inaccessible', res.message);
      }
    } catch (err: any) {
      setTestResult({ ok: false, message: err.message || 'Erreur inconnue' });
    } finally {
      setIsTesting(false);
    }
  };

  const handleResetData = () => {
    if (confirm('Voulez-vous réinitialiser toutes les données de test SGP aux valeurs par défaut ?')) {
      sgpStorage.resetToDefaults();
      toast.info('Données réinitialisées', 'La base locale a été restaurée.');
      if (onDataReset) onDataReset();
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Configuration API & Connexion Backend"
      description="Connectez l'interface à votre serveur Laravel 12 (Sanctum) ou utilisez le mode local."
      maxWidth="lg"
    >
      <div className="space-y-5">
        {/* Switch Mode */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-800 uppercase tracking-wider">
                Mode de fonctionnement
              </span>
              <p className="text-xs text-slate-500 mt-0.5">
                {useMock
                  ? 'Émulateur complet SGP avec règles de gestion et persistance locale.'
                  : 'Connexion directe à Laravel Sanctum via le client HTTP.'}
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={useMock}
                onChange={(e) => setUseMock(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-300 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-slate-900"></div>
            </label>
          </div>
          <div className="text-xs text-slate-600 bg-white p-2.5 rounded-lg border border-slate-200 flex items-center justify-between">
            <span className="font-medium">
              Statut :{' '}
              <span className={useMock ? 'text-emerald-700' : 'text-blue-700'}>
                {useMock ? 'Émulateur Local Actif (100% interactif)' : 'API Laravel Sanctum'}
              </span>
            </span>
          </div>
        </div>

        {/* Backend URL Input */}
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            URL de base de l'API Laravel (avec /api)
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Server className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder="http://localhost:8000/api"
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-slate-900 font-mono"
              />
            </div>
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={isTesting}
              className="px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg transition-colors flex items-center gap-1.5 shrink-0"
            >
              {isTesting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
              Tester le ping
            </button>
          </div>

          {testResult && (
            <div
              className={`mt-2 p-2.5 rounded-lg text-xs flex items-start gap-2 ${
                testResult.ok
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}
            >
              {testResult.ok ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              )}
              <span>{testResult.message}</span>
            </div>
          )}
        </div>

        {/* Reset Mock Data */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-800">Données de démonstration</span>
            <p className="text-[11px] text-slate-500">Restaurer les projets, tâches et utilisateurs d'origine.</p>
          </div>
          <button
            type="button"
            onClick={handleResetData}
            className="px-3 py-1.5 text-xs text-slate-700 hover:text-slate-900 border border-slate-300 rounded-lg hover:bg-slate-50 flex items-center gap-1.5 transition-colors"
          >
            <Database className="w-3.5 h-3.5" />
            Réinitialiser
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-2 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors"
          >
            Enregistrer
          </button>
        </div>
      </div>
    </Modal>
  );
};
