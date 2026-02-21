import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { DailyRecord, TeamShift } from '../models/team-data';

export const TEAMS = ['Equipe A', 'Equipe B', 'Equipe C', 'Equipe D', 'Equipe E'];
export const SHIFTS: string[] = ['Turno 1 (05:30 – 18:00)', 'Turno 2 (17:30 – 06:00)'];
export const QUALITY_THRESHOLD = 95;

@Injectable({ providedIn: 'root' })
export class CallCenterService {
  private storageKey = 'callCenterData';
  private records$ = new BehaviorSubject<DailyRecord[]>(this.load());

  getRecords() {
    return this.records$.asObservable();
  }
  getSnapshot() {
    return this.records$.getValue();
  }

  saveRecord(record: DailyRecord) {
    const all = this.records$.getValue();
    const idx = all.findIndex((r) => r.date === record.date);
    if (idx >= 0) all[idx] = record;
    else all.push(record);
    all.sort((a, b) => a.date.localeCompare(b.date));
    this.records$.next([...all]);
    localStorage.setItem(this.storageKey, JSON.stringify(all));
  }

  private load(): DailyRecord[] {
    try {
      return JSON.parse(localStorage.getItem(this.storageKey) || '[]');
    } catch {
      return [];
    }
  }

  blankShifts(): TeamShift[] {
    return TEAMS.flatMap((team) =>
      SHIFTS.map((shift) => ({
        team,
        shift,
        totalOffered: 0,
        totalReceived: 0,
        totalLost: 0,
        qualityScore: 100,
        avgAnswerSpeed: 0,
        satisfaction: 5,
      })),
    );
  }

  getMonthlyTotals(records: DailyRecord[]) {
    const offered = records.reduce((a, r) => a + (r.totalOffered || 0), 0);
    const received = records.reduce((a, r) => a + (r.totalReceived || 0), 0);
    const lost = records.reduce((a, r) => a + (r.totalLost || 0), 0);
    return {
      offered,
      received,
      lost,
      abandonRate: offered ? (lost / offered) * 100 : 0,
    };
  }
}
