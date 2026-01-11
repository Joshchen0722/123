import React, { useState, useMemo } from 'react';
import { AppState, ShiftType, Role, Staff } from '../types';
import { SHIFTS } from '../constants';
import { getDaysInMonth, formatDateKey, validateSchedule, generateCSV, isWeekend, calculateStats } from '../utils/helpers';
import { Download, Play, RotateCcw, AlertOctagon, Info, CheckCircle, XCircle, Wand2, AlertTriangle } from 'lucide-react';

interface SchedulePageProps {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
}

// Helper: Fisher-Yates Shuffle for fairness
function shuffle<T>(array: T[]): T[] {
  const newArr = [...array];
  for (let i = newArr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
  }
  return newArr;
}

const SchedulePage: React.FC<SchedulePageProps> = ({ state, setState }) => {
  // Validation
  const validationIssues = useMemo(() => validateSchedule(state), [state]);
  const stats = useMemo(() => calculateStats(state), [state]);
  
  const errors = validationIssues.filter(i => i.severity === 'error');
  const warnings = validationIssues.filter(i => i.severity === 'warning');
  const isComplete = errors.length === 0;

  const [yearStr, monthStr] = state.schedule.month.split('-');
  const year = parseInt(yearStr);
  const month = parseInt(monthStr);
  const daysInMonth = getDaysInMonth(year, month);
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // Handlers
  const handleShiftClick = (staffId: string, day: number) => {
    const dateKey = formatDateKey(year, month, day);
    const currentAssignments = state.schedule.assignments[dateKey] || {};
    const currentShift = currentAssignments[staffId] || 'OFF';
    
    // Cycle: OFF -> M -> E -> N -> OFF
    const cycle: ShiftType[] = ['OFF', 'M', 'E', 'N'];
    const nextIndex = (cycle.indexOf(currentShift) + 1) % cycle.length;
    const nextShift = cycle[nextIndex];

    const newAssignments = {
      ...state.schedule.assignments,
      [dateKey]: {
        ...currentAssignments,
        [staffId]: nextShift
      }
    };

    setState(prev => ({
      ...prev,
      schedule: {
        ...prev.schedule,
        assignments: newAssignments
      }
    }));
  };

  const handleAutoGenerate = () => {
    if (!window.confirm("確定要自動生成嗎？這將覆蓋本月現有排班。\n\n注意：生成後請務必檢查右側「紅色錯誤」，系統會自動檢測休息時間與人力缺口。")) return;

    const newAssignments: Record<string, Record<string, ShiftType>> = {};
    const { staffList, rules } = state;

    for (let day = 1; day <= daysInMonth; day++) {
      const dateKey = formatDateKey(year, month, day);
      const isWknd = isWeekend(year, month, day); 
      
      const needsM = isWknd ? rules.requirements.morningWeekend : rules.requirements.morningWeekday;
      const needsE = rules.requirements.evening;
      const needsN = rules.requirements.night;

      const dailyAssign: Record<string, ShiftType> = {};
      const workingStaffIds = new Set<string>();

      // --- Step 1: Force Designated OFF ---
      staffList.forEach(s => {
        if (s.designatedDaysOff.includes(day)) {
          dailyAssign[s.id] = 'OFF';
          workingStaffIds.add(s.id);
        }
      });

      // --- Step 2: Assign Night (N) ---
      // Priority: Night Fixed -> Substitute (if canNight) -> Anyone (if canNight)
      let currentN = 0;
      
      // 2.1 Try Night Fixed
      if (currentN < needsN) {
        const nightFix = staffList.find(s => s.role === Role.NIGHT_FIX && !workingStaffIds.has(s.id));
        if (nightFix) {
          dailyAssign[nightFix.id] = 'N';
          workingStaffIds.add(nightFix.id);
          currentN++;
        }
      }

      // 2.2 Try Substitute
      if (currentN < needsN) {
        const sub = staffList.find(s => s.role === Role.SUBSTITUTE && s.canNight && !workingStaffIds.has(s.id));
        if (sub) {
          dailyAssign[sub.id] = 'N';
          workingStaffIds.add(sub.id);
          currentN++;
        }
      }

      // 2.3 Try Others (Fallback)
      if (currentN < needsN) {
        const others = shuffle<Staff>(staffList.filter(s => s.canNight && !workingStaffIds.has(s.id)));
        for (const s of others) {
          if (currentN < needsN) {
            dailyAssign[s.id] = 'N';
            workingStaffIds.add(s.id);
            currentN++;
          }
        }
      }

      // --- Step 3: Assign Evening (E) ---
      // Priority: Day Staff -> Substitute -> Others
      let currentE = 0;
      
      // Filter potential candidates (not working, not designated off)
      // We categorize them to prioritize Day Staff first
      const availableForE = staffList.filter(s => !workingStaffIds.has(s.id));
      
      const priorityE = shuffle<Staff>(availableForE.filter(s => s.role === Role.DAY_STAFF));
      const secondaryE = shuffle<Staff>(availableForE.filter(s => s.role !== Role.DAY_STAFF)); // Substitute or NightFix (if forced)
      const candidatesE = [...priorityE, ...secondaryE];

      for (const s of candidatesE) {
        if (currentE < needsE) {
          dailyAssign[s.id] = 'E';
          workingStaffIds.add(s.id);
          currentE++;
        }
      }

      // --- Step 4: Assign Morning (M) ---
      let currentM = 0;
      const availableForM = shuffle<Staff>(staffList.filter(s => !workingStaffIds.has(s.id)));

      for (const s of availableForM) {
        if (currentM < needsM) {
          // Check "Block Evening to Morning" Rule
          let blocked = false;
          if (rules.blockEveningToMorning && day > 1) {
            const prevKey = formatDateKey(year, month, day - 1);
            const prevShift = (newAssignments[prevKey] || {})[s.id];
            if (prevShift === 'E') {
              blocked = true;
            }
          }

          if (!blocked) {
            dailyAssign[s.id] = 'M';
            workingStaffIds.add(s.id);
            currentM++;
          }
        }
      }

      newAssignments[dateKey] = dailyAssign;
    }

    setState(prev => ({
      ...prev,
      schedule: { ...prev.schedule, assignments: newAssignments }
    }));
  };

  const handleClear = () => {
    if (confirm('確定清空本月班表？')) {
      setState(prev => ({
        ...prev,
        schedule: { ...prev.schedule, assignments: {} }
      }));
    }
  };

  const handleExportCSV = () => {
    const csvContent = generateCSV(state);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `schedule_${state.schedule.month}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Controls & Status */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-wrap gap-4 items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="text-slate-600 font-medium">月份:</span>
            <input 
              type="month" 
              value={state.schedule.month}
              onChange={(e) => setState(prev => ({ ...prev, schedule: { ...prev.schedule, month: e.target.value } }))}
              className="border border-slate-300 rounded px-2 py-1 text-slate-800"
            />
          </div>

          {/* Status Indicator */}
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-bold border
            ${isComplete ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
            {isComplete ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
            {isComplete ? '排班完成' : '未完成 (有紅色錯誤)'}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={handleClear} className="flex items-center gap-2 px-3 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm transition">
            <RotateCcw className="w-4 h-4" /> 清空
          </button>
          <button onClick={handleAutoGenerate} className="flex items-center gap-2 px-3 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg text-sm font-medium transition shadow-sm border border-indigo-100">
            <Wand2 className="w-4 h-4" /> 一鍵生成 (MVP)
          </button>
          <button 
            onClick={handleExportCSV} 
            disabled={!isComplete}
            title={!isComplete ? "請先修正所有紅色錯誤" : ""}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition shadow-sm
              ${!isComplete ? 'bg-slate-400 cursor-not-allowed' : 'bg-brand-600 hover:bg-brand-700'}
            `}
          >
            <Download className="w-4 h-4" /> 匯出 CSV
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="p-3 text-left font-semibold text-slate-700 sticky left-0 bg-slate-50 z-10 w-32 border-r border-slate-200">
                  人員
                </th>
                {daysArray.map(d => {
                  const dayOfWeek = new Date(year, month - 1, d).getDay();
                  const isWknd = dayOfWeek === 0 || dayOfWeek === 6;
                  return (
                    <th key={d} className={`p-1 min-w-[40px] text-center font-medium border-r border-slate-100 ${isWknd ? 'text-red-500 bg-red-50' : 'text-slate-600'}`}>
                      <div className="flex flex-col">
                        <span>{d}</span>
                        <span className="text-[10px] opacity-75">{['日','一','二','三','四','五','六'][dayOfWeek]}</span>
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {state.staffList.map(staff => (
                <tr key={staff.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                  <td className="p-3 sticky left-0 bg-white border-r border-slate-200 font-medium text-slate-800 z-10 flex flex-col">
                    <span>{staff.name}</span>
                    <span className="text-[10px] text-slate-400 font-normal">{staff.role}</span>
                  </td>
                  {daysArray.map(day => {
                    const dateKey = formatDateKey(year, month, day);
                    const assignment = (state.schedule.assignments[dateKey] || {})[staff.id] || 'OFF';
                    const shiftConfig = SHIFTS[assignment];
                    
                    return (
                      <td key={day} className="p-0 border-r border-slate-100 relative">
                        <button
                          onClick={() => handleShiftClick(staff.id, day)}
                          className={`w-full h-12 flex items-center justify-center font-bold text-xs transition-colors duration-75
                            ${shiftConfig.color}
                            ${staff.designatedDaysOff.includes(day) ? 'opacity-50 ring-2 ring-inset ring-red-100' : ''}
                          `}
                        >
                          {assignment === 'OFF' ? '' : assignment}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reports & Stats */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        
        {/* Validation Column */}
        <div className="space-y-6">
          {/* Errors */}
          <div className={`bg-white p-5 rounded-xl shadow-sm border ${errors.length > 0 ? 'border-red-200' : 'border-slate-200'}`}>
            <div className="flex items-center gap-2 mb-4">
              <AlertOctagon className={`w-5 h-5 ${errors.length > 0 ? 'text-red-500' : 'text-slate-400'}`} />
              <h3 className="font-bold text-slate-800">紅色錯誤 (必要修正)</h3>
              <span className={`text-xs px-2 py-0.5 rounded-full ${errors.length > 0 ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-500'}`}>
                {errors.length}
              </span>
            </div>
            
            {/* Warning Banner for Incomplete Schedule */}
            {errors.length > 0 && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-red-800 text-sm">本次生成未完成，需要手動調整</div>
                  <div className="text-xs text-red-600 mt-1">
                    系統攔截到 {errors.length} 個硬性規則衝突（如休息不足或指定休假），請修正下列項目以解鎖匯出功能。
                  </div>
                </div>
              </div>
            )}

            {errors.length === 0 ? (
              <p className="text-sm text-slate-500 italic">無錯誤，太棒了！</p>
            ) : (
              <ul className="space-y-3 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                {errors.map(err => (
                  <li key={err.id} className="text-sm p-3 bg-red-50 rounded-lg border border-red-100">
                    <div className="flex justify-between font-bold text-red-800 mb-1">
                      <span>{err.date} {err.staffName ? `• ${err.staffName}` : ''}</span>
                    </div>
                    <div className="text-red-700 mb-2">{err.message}</div>
                    {err.suggestion && (
                      <div className="text-xs bg-white/50 p-1.5 rounded text-red-800 flex gap-1 items-center">
                        <Info className="w-3 h-3" />
                        建議：{err.suggestion}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Warnings */}
          <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
            <div className="flex items-center gap-2 mb-4">
              <Info className="w-5 h-5 text-yellow-500" />
              <h3 className="font-bold text-slate-800">黃色提醒 (優化建議)</h3>
              <span className="bg-yellow-100 text-yellow-700 text-xs px-2 py-0.5 rounded-full">{warnings.length}</span>
            </div>
            {warnings.length === 0 ? (
              <p className="text-sm text-slate-500 italic">目前沒有優化建議。</p>
            ) : (
               <ul className="space-y-3 max-h-60 overflow-y-auto pr-2">
                {warnings.map(err => (
                  <li key={err.id} className="text-sm p-3 bg-yellow-50 rounded border border-yellow-100">
                    <div className="font-medium text-yellow-800 mb-1">
                       {err.staffName}
                    </div>
                    <div className="text-yellow-700">{err.message}</div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Stats Column */}
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 h-fit">
           <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
             <div className="w-1 h-5 bg-brand-500 rounded-full"></div>
             班表統計
           </h3>
           <div className="overflow-x-auto">
             <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-500 font-medium">
                  <tr>
                    <th className="p-3">人員</th>
                    <th className="p-3 text-center text-yellow-700 bg-yellow-50">早 (M)</th>
                    <th className="p-3 text-center text-blue-700 bg-blue-50">晚 (E)</th>
                    <th className="p-3 text-center text-purple-700 bg-purple-50">夜 (N)</th>
                    <th className="p-3 text-center">休 (OFF)</th>
                    <th className="p-3 text-center font-bold text-slate-700">總工時(班)</th>
                    <th className="p-3 text-center text-orange-600">週末班</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {state.staffList.map(staff => {
                    const s = stats[staff.id];
                    return (
                      <tr key={staff.id} className="hover:bg-slate-50">
                        <td className="p-3 font-medium text-slate-900">{staff.name}</td>
                        <td className="p-3 text-center font-medium bg-yellow-50/30">{s.M}</td>
                        <td className="p-3 text-center font-medium bg-blue-50/30">{s.E}</td>
                        <td className="p-3 text-center font-medium bg-purple-50/30">{s.N}</td>
                        <td className="p-3 text-center text-slate-400">{s.OFF}</td>
                        <td className="p-3 text-center font-bold">{s.Total}</td>
                        <td className="p-3 text-center text-orange-600 font-medium">{s.Weekend}</td>
                      </tr>
                    );
                  })}
                </tbody>
             </table>
           </div>
           <div className="mt-4 text-xs text-slate-400 text-right">
             * 週末班定義：週五、週六、週日的上班日
           </div>
        </div>

      </div>
    </div>
  );
};

export default SchedulePage;