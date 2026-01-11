import React from 'react';
import { AppState } from '../types';

interface RulesPageProps {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
}

const RulesPage: React.FC<RulesPageProps> = ({ state, setState }) => {
  const { rules } = state;

  const handleChange = (field: string, value: any) => {
    setState(prev => ({
      ...prev,
      rules: {
        ...prev.rules,
        [field]: value
      }
    }));
  };

  const handleReqChange = (field: string, value: number) => {
    setState(prev => ({
      ...prev,
      rules: {
        ...prev.rules,
        requirements: {
          ...prev.rules.requirements,
          [field]: value
        }
      }
    }));
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      
      <section className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <h2 className="text-lg font-bold text-slate-800 mb-4 pb-2 border-b border-slate-100">每日人力需求 (硬性規則)</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           <div className="space-y-4">
              <label className="block">
                <span className="text-sm font-medium text-slate-700">早班 (平日) 人數</span>
                <input 
                  type="number" min="0" 
                  value={rules.requirements.morningWeekday}
                  onChange={(e) => handleReqChange('morningWeekday', parseInt(e.target.value))}
                  className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm p-2 border"
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-slate-700">早班 (週五六日) 人數</span>
                <input 
                  type="number" min="0" 
                  value={rules.requirements.morningWeekend}
                  onChange={(e) => handleReqChange('morningWeekend', parseInt(e.target.value))}
                  className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm p-2 border"
                />
              </label>
           </div>
           <div className="space-y-4">
              <label className="block">
                <span className="text-sm font-medium text-slate-700">晚班 (每日) 人數</span>
                <input 
                  type="number" min="0" 
                  value={rules.requirements.evening}
                  onChange={(e) => handleReqChange('evening', parseInt(e.target.value))}
                  className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm p-2 border"
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-slate-700">夜櫃 (每日) 人數</span>
                <input 
                  type="number" min="0" 
                  value={rules.requirements.night}
                  onChange={(e) => handleReqChange('night', parseInt(e.target.value))}
                  className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm p-2 border"
                />
              </label>
           </div>
        </div>
      </section>

      <section className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <h2 className="text-lg font-bold text-slate-800 mb-4 pb-2 border-b border-slate-100">排班限制</h2>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-slate-900">禁止「晚接早」</div>
              <div className="text-xs text-slate-500">前一日晚班 (23:30 下班) 接 次日早班 (07:00 上班)</div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                checked={rules.blockEveningToMorning}
                onChange={(e) => handleChange('blockEveningToMorning', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-600"></div>
            </label>
          </div>

          <div>
             <label className="block">
                <span className="text-sm font-medium text-slate-700">最小班間休息時數 (小時)</span>
                <div className="flex items-center gap-4 mt-1">
                  <input 
                    type="number" step="0.5" min="0"
                    value={rules.minRestHours}
                    onChange={(e) => handleChange('minRestHours', parseFloat(e.target.value))}
                    className="block w-24 rounded-md border-slate-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm p-2 border"
                  />
                  <span className="text-xs text-slate-500">預設 11 小時</span>
                </div>
              </label>
          </div>
        </div>
      </section>
    </div>
  );
};

export default RulesPage;
