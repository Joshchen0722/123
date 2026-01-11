import React from 'react';
import { Calendar, Users, Settings, Save, AlertTriangle } from 'lucide-react';

interface LayoutProps {
  currentPage: 'schedule' | 'staff' | 'rules';
  setPage: (p: 'schedule' | 'staff' | 'rules') => void;
  children: React.ReactNode;
  hasErrors: boolean;
}

const Layout: React.FC<LayoutProps> = ({ currentPage, setPage, children, hasErrors }) => {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="bg-brand-600 p-2 rounded-lg">
              <Calendar className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">飯店排班系統 MVP</h1>
          </div>
          
          <nav className="flex space-x-1 bg-slate-100 p-1 rounded-lg">
            <button
              onClick={() => setPage('schedule')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                currentPage === 'schedule' 
                  ? 'bg-white text-brand-700 shadow-sm' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              班表
            </button>
            <button
              onClick={() => setPage('rules')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                currentPage === 'rules' 
                  ? 'bg-white text-brand-700 shadow-sm' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              規則
            </button>
            <button
              onClick={() => setPage('staff')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                currentPage === 'staff' 
                  ? 'bg-white text-brand-700 shadow-sm' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              人員
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6">
        {hasErrors && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 flex items-center text-red-700">
            <AlertTriangle className="w-5 h-5 mr-2" />
            <span className="text-sm font-medium">目前的班表存在嚴重衝突，無法匯出正式版本。請檢查下方報告。</span>
          </div>
        )}
        {children}
      </main>
    </div>
  );
};

export default Layout;
