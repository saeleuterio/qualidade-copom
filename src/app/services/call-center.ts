import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { DailyRecord, TeamShift } from '../models/team-data';

export const TEAMS = ['Equipe A', 'Equipe B', 'Equipe C', 'Equipe D', 'Equipe E'];
export const SHIFTS: string[] = ['Turno 1 (05:30 – 18:00)', 'Turno 2 (17:30 – 06:00)'];
export const QUALITY_THRESHOLD = 95;

const SCRIPT_URL =
  'https://script.google.com/macros/s/AKfycbx2f4RbvuJ9yPKAfxzkF0CPH4jXZf3sERU772tVcF3w7vcTVFEwkbXhM1EuivqzyHYXJw/exec';

@Injectable({ providedIn: 'root' })
export class CallCenterService {
  private storageKey = 'callCenterData';
  private records$ = new BehaviorSubject<DailyRecord[]>(this.loadLocal());
  loading$ = new BehaviorSubject<boolean>(false);
  error$ = new BehaviorSubject<string>('');

  constructor() {
    this.loadFromSheets().then(() => {
      this.records$.next([...this.records$.getValue()]);
    });
  }

  getRecords() {
    return this.records$.asObservable();
  }
  getSnapshot() {
    return this.records$.getValue();
  }
  getLoading() {
    return this.loading$.asObservable();
  }
  getError() {
    return this.error$.asObservable();
  }

  async loadFromSheets() {
    this.loading$.next(true);
    this.error$.next('');
    try {
      const res = await fetch(SCRIPT_URL, {
        method: 'GET',
        redirect: 'follow',
        headers: { 'Content-Type': 'text/plain' },
      });
      const text = await res.text();
      const json = JSON.parse(text);
      if (json.success && json.records) {
        this.records$.next(json.records);
        localStorage.setItem(this.storageKey, JSON.stringify(json.records));
      }
    } catch (err) {
      this.error$.next('Erro ao carregar dados. Usando dados locais.');
      console.error('Erro:', err);
    } finally {
      this.loading$.next(false);
    }
  }

  async saveRecord(record: DailyRecord) {
    // Salva localmente primeiro
    const all = this.records$.getValue();
    const idx = all.findIndex((r) => r.date === record.date);
    if (idx >= 0) all[idx] = record;
    else all.push(record);
    all.sort((a, b) => a.date.localeCompare(b.date));
    this.records$.next([...all]);
    localStorage.setItem(this.storageKey, JSON.stringify(all));

    // Envia para o Google Sheets
    this.loading$.next(true);
    this.error$.next('');
    try {
      const res = await fetch(SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify({ action: 'save', record }),
      });
      const json = await res.json();
      if (!json.success) {
        this.error$.next('Erro ao salvar no Google Sheets.');
      }
    } catch (err) {
      this.error$.next('Erro de conexão. Dados salvos localmente.');
      console.error(err);
    } finally {
      this.loading$.next(false);
    }
  }

  private loadLocal(): DailyRecord[] {
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
