import { useState } from 'react';
import axios from 'axios';
import { AlertTriangle, RefreshCw, X } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AdminPanel = ({ isOpen, onClose }) => {
  const [adminKey, setAdminKey] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleReset = async () => {
    if (!adminKey.trim()) {
      toast.error('Please enter admin key');
      return;
    }

    setIsResetting(true);
    try {
      const response = await axios.post(
        `${API}/admin/reset-season?admin_key=${encodeURIComponent(adminKey)}`
      );
      
      toast.success(`Season reset! ${response.data.deleted_count} games deleted.`);
      setShowConfirm(false);
      setAdminKey('');
      onClose();
      
      // Reload page after 2 seconds
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to reset season');
    } finally {
      setIsResetting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50" data-testid="admin-panel">
      <div className="stat-card max-w-md w-full mx-4 border-red-500/20">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-6 h-6 text-red-500" />
            <h2 className="text-xl font-bold text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              Admin Panel
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
            data-testid="close-admin-panel"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Warning */}
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-6">
          <p className="text-red-400 text-sm">
            <strong>Warning:</strong> Resetting the season will permanently delete all game data, stats, and records. This action cannot be undone.
          </p>
        </div>

        {!showConfirm ? (
          <div className="space-y-4">
            <div>
              <label className="block text-gray-400 text-sm font-medium mb-2">
                Admin Key
              </label>
              <input
                type="password"
                value={adminKey}
                onChange={(e) => setAdminKey(e.target.value)}
                placeholder="Enter admin key"
                className="w-full bg-[#1a1a1b] border border-gray-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-emerald-500"
                data-testid="admin-key-input"
              />
            </div>

            <button
              onClick={() => setShowConfirm(true)}
              disabled={!adminKey.trim()}
              className="w-full bg-red-500 hover:bg-red-600 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition-all flex items-center justify-center space-x-2"
              data-testid="reset-season-button"
            >
              <RefreshCw className="w-5 h-5" />
              <span>Reset Season</span>
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-white text-center">
              Are you absolutely sure you want to reset the season?
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 rounded-lg transition-all"
                data-testid="cancel-reset-button"
              >
                Cancel
              </button>
              <button
                onClick={handleReset}
                disabled={isResetting}
                className="flex-1 bg-red-500 hover:bg-red-600 disabled:bg-red-700 text-white font-semibold py-3 rounded-lg transition-all flex items-center justify-center space-x-2"
                data-testid="confirm-reset-button"
              >
                {isResetting ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>Resetting...</span>
                  </>
                ) : (
                  <span>Yes, Reset Now</span>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPanel;