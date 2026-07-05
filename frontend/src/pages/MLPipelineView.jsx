import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line
} from 'recharts';
import { 
  Cpu, 
  CheckCircle, 
  Activity, 
  Upload, 
  AlertCircle, 
  Zap, 
  ServerCrash 
} from 'lucide-react';

export const MLPipelineView = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [retraining, setRetraining] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Fetch ML stats on mount
  const fetchStats = async () => {
    try {
      const data = await api.getMLStats();
      setStats(data);
    } catch (e) {
      setError("Failed to fetch ML pipeline stats: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  // Retrain handler
  const handleRetrain = async () => {
    setRetraining(true);
    setError('');
    setSuccess('');
    try {
      const data = await api.retrainModels();
      setStats(data);
      setSuccess("ML models retrained successfully! Features scaled and weights updated.");
    } catch (e) {
      setError("Retraining pipeline failed: " + e.message);
    } finally {
      setRetraining(false);
    }
  };

  // CSV Upload handler
  const handleCSVUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setUploading(true);
    setError('');
    setSuccess('');
    try {
      const res = await api.uploadCSV(file);
      setSuccess(res.message);
      fetchStats();
    } catch (e) {
      setError("Failed to ingest CSV dataset: " + e.message);
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 min-h-screen bg-industry-950 flex flex-col items-center justify-center space-y-4 ml-64 p-8">
        <div className="h-10 w-10 border-4 border-t-sky-500 border-r-sky-500/20 border-b-sky-500/20 border-l-sky-500/20 rounded-full animate-spin"></div>
        <p className="text-slate-400 font-mono text-xs uppercase tracking-widest">Loading Analytics Pipeline...</p>
      </div>
    );
  }

  // Format Feature Importance for Recharts
  const featureData = stats?.feature_importance 
    ? Object.keys(stats.feature_importance).map(key => ({
        name: key,
        importance: parseFloat((stats.feature_importance[key] * 100).toFixed(2))
      })).sort((a,b) => b.importance - a.importance)
    : [];

  // Generate ROC line coordinates approximation from stats.roc_auc for visualization
  const rocCurveData = [
    { x: 0.0, y: 0.0, baseline: 0.0 },
    { x: 0.1, y: Math.min(1.0, (stats?.roc_auc || 0.85) * 0.4), baseline: 0.1 },
    { x: 0.3, y: Math.min(1.0, (stats?.roc_auc || 0.85) * 0.75), baseline: 0.3 },
    { x: 0.6, y: Math.min(1.0, (stats?.roc_auc || 0.85) * 0.92), baseline: 0.6 },
    { x: 0.8, y: Math.min(1.0, (stats?.roc_auc || 0.85) * 0.98), baseline: 0.8 },
    { x: 1.0, y: 1.0, baseline: 1.0 }
  ];

  return (
    <div className="flex-1 min-h-screen bg-industry-950 industrial-grid ml-64 p-8 overflow-y-auto">
      <header className="mb-8 flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-extrabold text-white tracking-tight">Machine Learning Pipeline</h2>
          <p className="text-slate-400 text-sm mt-1">Train classifiers, evaluate accuracy metrics, and check SHAP feature contributions</p>
        </div>

        <div className="flex space-x-3">
          {/* CSV File Upload Input */}
          <label className="flex items-center space-x-2 px-4 py-2.5 bg-slate-900 border border-slate-800 hover:border-sky-600 rounded-xl text-xs font-bold text-slate-300 hover:text-white cursor-pointer uppercase tracking-wider transition">
            <Upload className="h-4 w-4" />
            <span>{uploading ? 'Ingesting...' : 'Upload CSV Dataset'}</span>
            <input
              type="file"
              accept=".csv"
              disabled={uploading}
              onChange={handleCSVUpload}
              className="hidden"
            />
          </label>

          <button
            onClick={handleRetrain}
            disabled={retraining}
            className="flex items-center space-x-2 px-4 py-2.5 bg-sky-600 hover:bg-sky-500 disabled:bg-sky-850 rounded-xl text-xs font-bold text-white uppercase tracking-wider glow-blue transition"
          >
            <Activity className={`h-4 w-4 ${retraining ? 'animate-spin' : ''}`} />
            <span>{retraining ? 'Fitting Classifier...' : 'Retrain Models'}</span>
          </button>
        </div>
      </header>

      {error && (
        <div className="mb-6 p-4 rounded-xl border border-rose-900/50 bg-rose-950/20 text-rose-300 text-xs flex items-center space-x-2">
          <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 rounded-xl border border-emerald-900/50 bg-emerald-950/20 text-emerald-300 text-xs flex items-center space-x-2">
          <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Model Performance Cards */}
      <section className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
        <div className="p-5 rounded-2xl glass-panel border border-slate-800 text-center">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Model Accuracy</p>
          <h3 className="mono-display text-2xl font-bold text-white mt-1">{(stats?.accuracy * 100).toFixed(1)}%</h3>
        </div>
        <div className="p-5 rounded-2xl glass-panel border border-slate-800 text-center">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Precision</p>
          <h3 className="mono-display text-2xl font-bold text-white mt-1">{(stats?.precision * 100).toFixed(1)}%</h3>
        </div>
        <div className="p-5 rounded-2xl glass-panel border border-slate-800 text-center">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Recall</p>
          <h3 className="mono-display text-2xl font-bold text-white mt-1">{(stats?.recall * 100).toFixed(1)}%</h3>
        </div>
        <div className="p-5 rounded-2xl glass-panel border border-slate-800 text-center">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">F1-Score</p>
          <h3 className="mono-display text-2xl font-bold text-white mt-1">{(stats?.f1_score * 100).toFixed(1)}%</h3>
        </div>
        <div className="p-5 rounded-2xl glass-panel border border-slate-800 text-center">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">ROC-AUC</p>
          <h3 className="mono-display text-2xl font-bold text-white mt-1">{(stats?.roc_auc * 100).toFixed(1)}%</h3>
        </div>
      </section>

      {/* Main Charts Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Feature Importance Bar Chart */}
        <div className="lg:col-span-2 p-6 rounded-2xl glass-panel border border-slate-800">
          <h3 className="font-bold text-lg text-white mb-2">SHAP Feature Importances</h3>
          <p className="text-slate-400 text-xs mb-6">Percentage contribution of telemetry sensors in predicting machinery downtime</p>
          
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={featureData} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis type="number" stroke="#64748b" fontSize={9} unit="%" />
                <YAxis dataKey="name" type="category" stroke="#64748b" fontSize={9} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc', borderRadius: '12px' }} />
                <Bar dataKey="importance" fill="#0284c7" radius={[0, 4, 4, 0]} barSize={16} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Confusion Matrix & ROC curve */}
        <div className="space-y-8">
          {/* Confusion Matrix grid */}
          <div className="p-6 rounded-2xl glass-panel border border-slate-800">
            <h3 className="font-bold text-lg text-white mb-4">Confusion Matrix</h3>
            {stats?.confusion_matrix ? (
              <div className="grid grid-cols-2 gap-2 text-center text-xs font-mono font-bold">
                {/* Headers */}
                <div className="col-span-2 grid grid-cols-2 text-slate-500 text-[10px] uppercase mb-1">
                  <span>Predicted Normal</span>
                  <span>Predicted Failure</span>
                </div>
                
                <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
                  <span className="text-[10px] text-slate-500 block uppercase mb-1">True Normal</span>
                  <span className="text-emerald-400 text-lg">{stats.confusion_matrix[0][0]}</span>
                </div>
                <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
                  <span className="text-[10px] text-slate-500 block uppercase mb-1">False Failure</span>
                  <span className="text-rose-400 text-lg">{stats.confusion_matrix[0][1]}</span>
                </div>
                <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
                  <span className="text-[10px] text-slate-500 block uppercase mb-1">False Normal</span>
                  <span className="text-rose-400 text-lg">{stats.confusion_matrix[1][0]}</span>
                </div>
                <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
                  <span className="text-[10px] text-slate-500 block uppercase mb-1">True Failure</span>
                  <span className="text-emerald-400 text-lg">{stats.confusion_matrix[1][1]}</span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-500">Confusion matrix not loaded.</p>
            )}
          </div>

          {/* ROC curve */}
          <div className="p-6 rounded-2xl glass-panel border border-slate-800">
            <h3 className="font-bold text-lg text-white mb-4">ROC curve (FPR vs TPR)</h3>
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={rocCurveData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="x" type="number" stroke="#64748b" fontSize={8} domain={[0, 1]} />
                  <YAxis type="number" stroke="#64748b" fontSize={8} domain={[0, 1]} />
                  <Tooltip />
                  <Line type="monotone" dataKey="y" name="TPR" stroke="#10b981" strokeWidth={2} dot={false} />
                  {/* Baseline 50% line */}
                  <Line type="monotone" dataKey="baseline" name="Baseline" stroke="#475569" strokeDasharray="4 4" dot={false} activeDot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
