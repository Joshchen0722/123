import { AppState, ValidationIssue, ShiftType, Role } from '../types';
import { SHIFTS } from '../constants';

export const getDaysInMonth = (year: number, month: number) => {
  return new Date(year, month, 0).getDate();
};

export const formatDateKey = (year: number, month: number, day: number) => {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};

export const isWeekend = (year: number, month: number, day: number) => {
  const date = new Date(year, month - 1, day);
  const dayOfWeek = date.getDay(); // 0 is Sunday, 6 is Saturday
  return dayOfWeek === 0 || dayOfWeek === 6 || dayOfWeek === 5; // Fri, Sat, Sun definition for this hotel logic
};

export const getShiftDuration = (shift: ShiftType) => {
  if (shift === 'OFF') return 0;
  return SHIFTS[shift].end - SHIFTS[shift].start;
};

// Calculate Statistics for Report
export const calculateStats = (state: AppState) => {
  const { staffList, schedule } = state;
  const stats: Record<string, { M: number; E: number; N: number; OFF: number; Weekend: number; Total: number }> = {};

  staffList.forEach(staff => {
    stats[staff.id] = { M: 0, E: 0, N: 0, OFF: 0, Weekend: 0, Total: 0 };
  });

  const [yearStr, monthStr] = schedule.month.split('-');
  const year = parseInt(yearStr);
  const month = parseInt(monthStr);
  const daysInMonth = getDaysInMonth(year, month);

  for (let day = 1; day <= daysInMonth; day++) {
    const dateKey = formatDateKey(year, month, day);
    const dayOfWeek = new Date(year, month - 1, day).getDay();
    const isWknd = dayOfWeek === 0 || dayOfWeek === 6 || dayOfWeek === 5; // Fri, Sat, Sun

    staffList.forEach(staff => {
      const shift = (schedule.assignments[dateKey] || {})[staff.id] || 'OFF';
      if (stats[staff.id][shift] !== undefined) {
        stats[staff.id][shift]++;
      }
      if (shift !== 'OFF') {
        stats[staff.id].Total++;
        if (isWknd) {
          stats[staff.id].Weekend++;
        }
      }
    });
  }
  return stats;
};

// Core Validation Logic
export const validateSchedule = (state: AppState): ValidationIssue[] => {
  const issues: ValidationIssue[] = [];
  const [yearStr, monthStr] = state.schedule.month.split('-');
  const year = parseInt(yearStr);
  const month = parseInt(monthStr);
  const daysInMonth = getDaysInMonth(year, month);
  const { rules, staffList, schedule } = state;

  // Track stats for Fairness (Yellow)
  const weekendWorkCounts: Record<string, number> = {};
  staffList.forEach(s => weekendWorkCounts[s.id] = 0);

  for (let day = 1; day <= daysInMonth; day++) {
    const dateKey = formatDateKey(year, month, day);
    const dateObj = new Date(year, month - 1, day);
    const dayOfWeek = dateObj.getDay(); // 0=Sun, 6=Sat
    const isFriSatSun = dayOfWeek === 0 || dayOfWeek === 6 || dayOfWeek === 5;
    
    // 1. Daily Requirement Check (Red)
    let mCount = 0, eCount = 0, nCount = 0;
    const staffOnDay = schedule.assignments[dateKey] || {};

    Object.values(staffOnDay).forEach(shift => {
      if (shift === 'M') mCount++;
      if (shift === 'E') eCount++;
      if (shift === 'N') nCount++;
    });

    const reqM = isFriSatSun ? rules.requirements.morningWeekend : rules.requirements.morningWeekday;
    const reqE = rules.requirements.evening;
    const reqN = rules.requirements.night;

    if (mCount !== reqM) {
      issues.push({
        id: `req-m-${dateKey}`,
        severity: 'error',
        date: dateKey,
        message: `早班人數錯誤：需求 ${reqM} 人，實際 ${mCount} 人`,
        suggestion: mCount < reqM ? '增加早班人員' : '減少早班人員'
      });
    }
    if (eCount !== reqE) {
      issues.push({
        id: `req-e-${dateKey}`,
        severity: 'error',
        date: dateKey,
        message: `晚班人數錯誤：需求 ${reqE} 人，實際 ${eCount} 人`,
        suggestion: eCount < reqE ? '增加晚班人員' : '減少晚班人員'
      });
    }
    if (nCount !== reqN) {
      issues.push({
        id: `req-n-${dateKey}`,
        severity: 'error',
        date: dateKey,
        message: `夜櫃人數錯誤：需求 ${reqN} 人，實際 ${nCount} 人`,
        suggestion: nCount < reqN ? '增加夜櫃人員' : '減少夜櫃人員'
      });
    }

    // Per Staff Checks
    staffList.forEach(staff => {
      const shift = staffOnDay[staff.id] || 'OFF';
      
      // 2. Designated Days Off (Red)
      if (staff.designatedDaysOff.includes(day) && shift !== 'OFF') {
        issues.push({
          id: `des-off-${dateKey}-${staff.id}`,
          severity: 'error',
          date: dateKey,
          staffName: staff.name,
          message: `違反指定休假（${day}號）`,
          suggestion: '改為 OFF'
        });
      }

      // Count Weekend Work
      if (isFriSatSun && shift !== 'OFF') {
        weekendWorkCounts[staff.id]++;
      }

      // 3. Min Rest & Forbidden Patterns (Red)
      if (day > 1) {
        const prevDateKey = formatDateKey(year, month, day - 1);
        const prevShift = (schedule.assignments[prevDateKey] || {})[staff.id] || 'OFF';

        if (prevShift !== 'OFF' && shift !== 'OFF') {
           // E -> M Rule
           if (rules.blockEveningToMorning && prevShift === 'E' && shift === 'M') {
             issues.push({
                id: `rule-e-m-${dateKey}-${staff.id}`,
                severity: 'error',
                date: dateKey,
                staffName: staff.name,
                message: '違反「晚接早」禁止規則',
                suggestion: '調整其中一天的班別'
             });
           }

           // Min Rest Calculation
           // If previous shift was Night, it ends the next day (the current day) at 07:30 (typically).
           let hoursRest = 0;
           if (prevShift === 'N') {
              // Ends at 7.5 (31.5 - 24) on current day
              const endHourNextDay = SHIFTS[prevShift].end - 24;
              hoursRest = SHIFTS[shift].start - endHourNextDay;
           } else {
              // Ends on previous day
              hoursRest = (24 - SHIFTS[prevShift].end) + SHIFTS[shift].start;
           }

           // Check strict inequality: must be >= minRestHours
           if (hoursRest < rules.minRestHours) {
              issues.push({
                id: `rest-${dateKey}-${staff.id}`,
                severity: 'error',
                date: dateKey,
                staffName: staff.name,
                message: `休息不足 ${rules.minRestHours} 小時 (僅 ${hoursRest.toFixed(1)}h)`,
                suggestion: '調整班別以增加間隔'
              });
           }
        }
      }
    });
  }

  // 4. Fairness Check (Yellow)
  const values = Object.values(weekendWorkCounts);
  const avgWeekend = values.reduce((a, b) => a + b, 0) / (values.length || 1);
  
  staffList.forEach(staff => {
    if (weekendWorkCounts[staff.id] >= avgWeekend + 2) {
      issues.push({
        id: `fair-${staff.id}`,
        severity: 'warning',
        staffName: staff.name,
        message: `週末班過多：${weekendWorkCounts[staff.id]} 天 (平均 ${avgWeekend.toFixed(1)})`,
        suggestion: '嘗試分配給其他人員'
      });
    }
  });

  return issues;
};

// Generate CSV
export const generateCSV = (state: AppState) => {
  const [yearStr, monthStr] = state.schedule.month.split('-');
  const year = parseInt(yearStr);
  const month = parseInt(monthStr);
  const daysInMonth = getDaysInMonth(year, month);

  // Header
  const header = ['人員', ...Array.from({ length: daysInMonth }, (_, i) => `${i + 1}號`)];
  const rows = [header.join(',')];

  state.staffList.forEach(staff => {
    const row = [staff.name];
    for (let day = 1; day <= daysInMonth; day++) {
      const dateKey = formatDateKey(year, month, day);
      const shift = (state.schedule.assignments[dateKey] || {})[staff.id] || 'OFF';
      row.push(shift);
    }
    rows.push(row.join(','));
  });

  return "\ufeff" + rows.join('\n'); // Add BOM for Excel compatibility
};