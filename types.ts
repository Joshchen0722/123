export type ShiftType = 'M' | 'E' | 'N' | 'OFF';

export enum Role {
  NIGHT_FIX = 'Night Fixed',
  DAY_STAFF = 'Day Staff',
  SUBSTITUTE = 'Substitute',
}

export interface Staff {
  id: string;
  name: string;
  role: Role;
  maxLeaves: number;
  designatedDaysOff: number[]; // Array of day numbers (1-31)
  canNight: boolean;
}

export interface ShiftRules {
  minRestHours: number;
  blockEveningToMorning: boolean; // Red Rule 1
  requirements: {
    morningWeekday: number;
    morningWeekend: number;
    evening: number;
    night: number;
  };
}

export interface ScheduleData {
  month: string; // YYYY-MM
  assignments: Record<string, Record<string, ShiftType>>; // dateKey (YYYY-MM-DD) -> staffId -> ShiftType
}

export interface AppState {
  staffList: Staff[];
  rules: ShiftRules;
  schedule: ScheduleData;
}

export type Severity = 'error' | 'warning';

export interface ValidationIssue {
  id: string;
  severity: Severity;
  date?: string;
  staffName?: string;
  message: string;
  suggestion?: string;
}
