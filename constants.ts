import { AppState, Role, ShiftType } from './types';

export const SHIFTS: Record<ShiftType, { label: string; start: number; end: number; color: string }> = {
  M: { label: '早班', start: 7.0, end: 15.5, color: 'bg-yellow-100 text-yellow-800 border-yellow-300' }, // 07:00 - 15:30
  E: { label: '晚班', start: 15.0, end: 23.5, color: 'bg-blue-100 text-blue-800 border-blue-300' },   // 15:00 - 23:30
  N: { label: '夜櫃', start: 23.0, end: 31.5, color: 'bg-purple-100 text-purple-800 border-purple-300' }, // 23:00 - 07:30 (next day)
  OFF: { label: '休', start: 0, end: 0, color: 'bg-slate-100 text-slate-400 border-slate-200' },
};

export const INITIAL_STATE: AppState = {
  staffList: [
    { id: '1', name: 'Alex (夜神)', role: Role.NIGHT_FIX, maxLeaves: 8, designatedDaysOff: [5, 15, 25], canNight: true },
    { id: '2', name: 'Bob', role: Role.DAY_STAFF, maxLeaves: 8, designatedDaysOff: [], canNight: false },
    { id: '3', name: 'Carol', role: Role.DAY_STAFF, maxLeaves: 8, designatedDaysOff: [1], canNight: false },
    { id: '4', name: 'Dave', role: Role.DAY_STAFF, maxLeaves: 8, designatedDaysOff: [], canNight: false },
    { id: '5', name: 'Eve', role: Role.DAY_STAFF, maxLeaves: 8, designatedDaysOff: [], canNight: true },
    { id: '6', name: 'Frank (替補)', role: Role.SUBSTITUTE, maxLeaves: 8, designatedDaysOff: [], canNight: true },
  ],
  rules: {
    minRestHours: 11,
    blockEveningToMorning: true,
    requirements: {
      morningWeekday: 1,
      morningWeekend: 2,
      evening: 2,
      night: 1,
    },
  },
  schedule: {
    month: '2026-03',
    assignments: {},
  },
};
