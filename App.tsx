import React, { useState, useEffect } from 'react';
import { AppState, ValidationIssue } from './types';
import { INITIAL_STATE } from './constants';
import { validateSchedule } from './utils/helpers';
import Layout from './components/Layout';
import SchedulePage from './pages/SchedulePage';
import StaffPage from './pages/StaffPage';
import RulesPage from './pages/RulesPage';
import { Save, Upload } from 'lucide-react';

const STORAGE_KEY = 'hotel_scheduler_v1';

function App() {
  const [page, setPage] = useState<'schedule' | 'staff' | 'rules'>('schedule');
  const [state, setState] = useState<AppState>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : INITIAL_STATE;
  });

  // Persist State
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  // Check for critical errors to show in Layout header
  const errors = validateSchedule(state).filter(i => i.severity === 'error');

  // JSON Import/Export Handlers (Global)
  const handleExportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `scheduler_backup_${state.schedule.month}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const parsed = JSON.parse(evt.target?.result as string);
        if (parsed && parsed.staffList && parsed.schedule) {
          if(confirm('匯入將覆蓋當前所有資料，確定嗎？')) {
            setState(parsed);
          }
        } else {
          alert('檔案格式錯誤');
        }
      } catch (err) {
        alert('解析失敗');
      }
    };
    reader.readAsText(file);
    // Reset input
    e.target.value = '';
  };

  return (
    <div className="text-slate-900">
      <Layout currentPage={page} setPage={setPage} hasErrors={errors.length > 0}>
        {page === 'schedule' && <SchedulePage state={state} setState={setState} />}
        {page === 'staff' && <StaffPage state={state} setState={setState} />}
        {page === 'rules' && <RulesPage state={state} setState={setState} />}
      </Layout>

      {/* Footer / Global Actions */}
      <footer className="max-w-7xl mx-auto px-4 py-8 border-t border-slate-200 mt-12 flex justify-between items-center text-sm text-slate-500">
         <div>
           &copy; 2026 Hotel Desk MVP
         </div>
         <div className="flex gap-4">
            <label className="cursor-pointer hover:text-brand-600 flex items-center gap-1">
              <Upload className="w-4 h-4" /> 匯入備份
              <input type="file" accept=".json" onChange={handleImportJSON} className="hidden" />
            </label>
            <button onClick={handleExportJSON} className="hover:text-brand-600 flex items-center gap-1">
              <Save className="w-4 h-4" /> 保存專案 (JSON)
            </button>
         </div>
      </footer>
    </div>
  );
}

export default App;
