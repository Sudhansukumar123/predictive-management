import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { Package, ShieldAlert, CheckCircle, Activity, ShoppingCart } from 'lucide-react';

export const Inventory = () => {
  const [inventory, setInventory] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const loadData = async () => {
    try {
      const items = await api.getInventory();
      setInventory(items);
      
      const recs = await api.getInventoryRecommendations();
      setRecommendations(recs);
    } catch (e) {
      console.error(e);
      setError("Failed to fetch inventory stock levels.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOrderPart = async (item) => {
    setError('');
    setSuccess('');
    try {
      // Simulate ordering: increase stock by 10
      const updatedStock = item.stock_level + 10;
      await api.updateInventory(item.id, { stock_level: updatedStock });
      setSuccess(`Replenishment order successful! Added 10 units to ${item.name}.`);
      loadData();
    } catch (err) {
      setError("Order placement failed: " + err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 min-h-screen bg-industry-950 flex flex-col items-center justify-center space-y-4 ml-64 p-8">
        <div className="h-10 w-10 border-4 border-t-sky-500 border-r-sky-500/20 border-b-sky-500/20 border-l-sky-500/20 rounded-full animate-spin"></div>
        <p className="text-slate-400 font-mono text-xs uppercase tracking-widest">Auditing Stock Inventory...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-screen bg-industry-950 industrial-grid ml-64 p-8 overflow-y-auto">
      <header className="mb-8">
        <h2 className="text-3xl font-extrabold text-white tracking-tight">Spare Parts Inventory</h2>
        <p className="text-slate-400 text-sm mt-1">AI-driven spare-parts logistics correlating machine Remaining Useful Life (RUL) with safety stocks</p>
      </header>

      {success && (
        <div className="mb-6 p-4 rounded-xl border border-emerald-900/50 bg-emerald-950/20 text-emerald-300 text-xs flex items-center space-x-2">
          <CheckCircle className="h-4 w-4 text-emerald-400" />
          <span>{success}</span>
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 rounded-xl border border-rose-900/50 bg-rose-950/20 text-rose-300 text-xs flex items-center space-x-2">
          <ShieldAlert className="h-4 w-4 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left 2 Columns: Parts stock list */}
        <div className="lg:col-span-2 p-6 rounded-2xl glass-panel border border-slate-800">
          <h3 className="font-bold text-lg text-white mb-4">Stock Ledger</h3>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-sans text-slate-300 border-collapse">
              <thead>
                <tr className="border-b border-slate-800/80 text-slate-500 uppercase font-bold text-[10px] tracking-wider">
                  <th className="py-3 px-4">Part Details</th>
                  <th className="py-3 px-4">Stock Level</th>
                  <th className="py-3 px-4">Min stock</th>
                  <th className="py-3 px-4">Unit Cost</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {inventory.map((item) => {
                  const isLow = item.stock_level < item.minimum_stock;
                  
                  return (
                    <tr key={item.id} className="hover:bg-slate-900/20 transition duration-150">
                      <td className="py-4 px-4">
                        <div className="font-extrabold text-white text-sm">{item.name}</div>
                        <span className="text-[10px] font-mono text-slate-500 uppercase">{item.part_number} | Location: {item.location || 'Aisle A'}</span>
                      </td>
                      <td className="py-4 px-4 font-mono font-bold">
                        <span className={`px-2.5 py-1 rounded-md ${isLow ? 'bg-rose-950/50 text-rose-400 border border-rose-900 glow-red' : 'text-slate-200'}`}>
                          {item.stock_level} units
                        </span>
                      </td>
                      <td className="py-4 px-4 font-mono text-slate-500">{item.minimum_stock} units</td>
                      <td className="py-4 px-4 font-mono text-sky-400">${item.unit_cost.toFixed(2)}</td>
                      <td className="py-4 px-4 text-right">
                        <button
                          onClick={() => handleOrderPart(item)}
                          className="px-3 py-1.5 bg-slate-900 border border-slate-700 hover:border-sky-500 hover:text-white rounded-lg text-[10px] font-bold uppercase tracking-wider transition flex items-center space-x-1.5 ml-auto"
                        >
                          <ShoppingCart className="h-3 w-3" />
                          <span>Order +10</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right 1 Column: Predictive AI Replenishment Suggestions */}
        <div className="space-y-6">
          <div className="p-6 rounded-2xl glass-panel border border-slate-850 bg-slate-900/10">
            <h3 className="font-extrabold text-sm text-sky-400 uppercase tracking-widest mb-1 flex items-center">
              <Activity className="h-4 w-4 mr-1 text-sky-400 animate-pulse" />
              AI Logistics advisor
            </h3>
            <p className="text-slate-500 text-[10px] uppercase font-bold mb-4">PREDICTIVE SPARE PARTS DISPATCH SUGGESTIONS</p>
            
            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-1">
              {recommendations.length === 0 ? (
                <div className="p-4 rounded-xl border border-emerald-950 bg-emerald-950/10 text-emerald-400 text-xs text-center font-bold">
                  All systems operating within margins. Safety stock level satisfies RUL forecasts.
                </div>
              ) : (
                recommendations.map((rec, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl border border-rose-950 bg-rose-950/15 flex flex-col space-y-2 text-xs"
                  >
                    <div className="flex justify-between items-center pb-2 border-b border-rose-950/40">
                      <span className="font-bold text-rose-400 uppercase tracking-wider text-[10px]">
                        {rec.machine_name} RUL Alert
                      </span>
                      <span className="mono-display text-sky-400 font-bold">RUL: {rec.predicted_rul_hours.toFixed(0)}h</span>
                    </div>
                    
                    <p className="text-slate-300 leading-relaxed">
                      Predicted failure of <b>{rec.part_name}</b> on machine in <b>{rec.estimated_rul_days} days</b>.
                      Current local stock level: <b>{rec.current_stock}</b>. Lead time is <b>{rec.part_lead_time_days} days</b>.
                    </p>

                    <div className="p-2 bg-rose-950/30 border border-rose-900 rounded-lg text-[10px] font-bold text-rose-300 uppercase tracking-wider text-center glow-red">
                      {rec.action_required}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
