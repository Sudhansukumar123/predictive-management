import React from 'react';
import { api } from '../utils/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { FileText, FileSpreadsheet, Download, Activity, BarChart2 } from 'lucide-react';

export const Reports = () => {
  
  // Custom mock analytics data for report visualization
  const trendData = [
    { name: 'CNC Mills', failures: 4, downtime: 14.5, cost: 2400 },
    { name: 'Robotic Arms', failures: 2, downtime: 8.0, cost: 1750 },
    { name: 'Pumps', failures: 7, downtime: 22.0, cost: 4200 },
  ];

  const colors = ['#0284c7', '#0d9488', '#f59e0b'];

  return (
    <div className="flex-1 min-h-screen bg-industry-950 industrial-grid ml-64 p-8 overflow-y-auto">
      <header className="mb-8">
        <h2 className="text-3xl font-extrabold text-white tracking-tight">Analytics & Reports</h2>
        <p className="text-slate-400 text-sm mt-1">Export diagnostic data sheets and analyze equipment failure/downtime distributions</p>
      </header>

      {/* Download Action Cards */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        {/* PDF Card */}
        <div className="p-6 rounded-2xl glass-panel border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="p-3 bg-sky-950/80 rounded-xl border border-sky-900 w-12 h-12 flex items-center justify-center mb-4 glow-blue">
              <FileText className="h-6 w-6 text-sky-400" />
            </div>
            <h3 className="font-extrabold text-lg text-white mb-2">Executive Summary Report (PDF)</h3>
            <p className="text-slate-400 text-xs leading-relaxed mb-6">
              A comprehensive document summarizing current plant health metrics, OEE values, active critical alarms, and upcoming scheduled maintenance tasks. Ideal for operators and maintenance managers.
            </p>
          </div>
          
          <a
            href={api.getPDFDownloadUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-3 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider text-center flex items-center justify-center space-x-2 glow-blue transition"
          >
            <Download className="h-4 w-4" />
            <span>Download PDF Report</span>
          </a>
        </div>

        {/* Excel Card */}
        <div className="p-6 rounded-2xl glass-panel border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="p-3 bg-teal-950/80 rounded-xl border border-teal-900 w-12 h-12 flex items-center justify-center mb-4 glow-green">
              <FileSpreadsheet className="h-6 w-6 text-teal-400" />
            </div>
            <h3 className="font-extrabold text-lg text-white mb-2">Operations Ledger Spreadsheet (XLSX)</h3>
            <p className="text-slate-400 text-xs leading-relaxed mb-6">
              A multi-sheet Excel spreadsheet containing raw lists of fleet performance indexes, unresolved alerts, maintenance scheduler details, and inventory safety stock calculations. Perfect for analytical reviews.
            </p>
          </div>

          <a
            href={api.getExcelDownloadUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-3 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider text-center flex items-center justify-center space-x-2 glow-green transition"
          >
            <Download className="h-4 w-4" />
            <span>Download Excel Ledger</span>
          </a>
        </div>
      </section>

      {/* Analytics Visualization Panel */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Downtime Hours Bar chart */}
        <div className="p-6 rounded-2xl glass-panel border border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-bold text-base text-white">Monthly Downtime Hours by Machine Type</h4>
            <BarChart2 className="h-5 w-5 text-sky-400" />
          </div>
          
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={9} />
                <YAxis stroke="#64748b" fontSize={9} unit="h" />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc', borderRadius: '12px' }} />
                <Bar dataKey="downtime" fill="#0284c7" radius={[4, 4, 0, 0]} barSize={30}>
                  {trendData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Maintenance Repair Cost Bar chart */}
        <div className="p-6 rounded-2xl glass-panel border border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-bold text-base text-white">Maintenance Cost Distribution ($)</h4>
            <Activity className="h-5 w-5 text-teal-400 animate-pulse" />
          </div>
          
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={9} />
                <YAxis stroke="#64748b" fontSize={9} unit="$" />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc', borderRadius: '12px' }} />
                <Bar dataKey="cost" fill="#0d9488" radius={[4, 4, 0, 0]} barSize={30}>
                  {trendData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </section>
    </div>
  );
};
