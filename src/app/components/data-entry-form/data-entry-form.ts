import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CallCenterService } from '../../services/call-center';
import { DailyRecord, TeamShift } from '../../models/team-data';

export const QUALITY_THRESHOLD = 95;

const SHIFTS_CONFIG = [
  { label: 'Turno 1 (05:30 – 18:00)', key: 'turno1' },
  { label: 'Turno 2 (17:30 – 06:00)', key: 'turno2' },
];

const TEAM_OPTIONS = ['A', 'B', 'C', 'D', 'E'];

interface ShiftEntry {
  team: string;
  qualityScore: number;
  totalOffered: number;
  totalReceived: number;
  totalLost: number;
  avgAnswerSpeed: number;
  satisfaction: number;
}

@Component({
  selector: 'app-data-entry-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="form-container">
      <div class="form-header">
        <h2>✎ INSERIR DADOS DIÁRIOS</h2>
        <div class="date-select">
          <label>DATA</label>
          <input type="date" [(ngModel)]="selectedDate" (change)="loadDate()" />
        </div>
      </div>

      <!-- Totais de Ligações -->
      <div class="section-title">📞 TOTAIS DE LIGAÇÕES DO DIA</div>
      <div class="totals-card">
        <div class="total-field">
          <label>Oferecidas</label>
          <input
            type="number"
            min="0"
            [(ngModel)]="totalOffered"
            (ngModelChange)="calcTotalLost()"
            placeholder="0"
          />
        </div>
        <div class="total-field">
          <label>Recebidas</label>
          <input
            type="number"
            min="0"
            [(ngModel)]="totalReceived"
            (ngModelChange)="calcTotalLost()"
            placeholder="0"
          />
        </div>
        <div class="total-field">
          <label>Perdidas</label>
          <input type="number" min="0" [(ngModel)]="totalLost" readonly class="readonly" />
        </div>
        <div class="total-field">
          <label>Taxa de Abandono</label>
          <input type="text" [value]="abandonRate" readonly class="readonly" />
        </div>
      </div>

      <!-- Turnos -->
      <div class="section-title">⏱ QUALIDADE POR TURNO</div>
      <div class="shifts-grid">
        <div
          class="shift-card"
          *ngFor="let shift of shiftsConfig; let i = index"
          [class.below]="entries[i].qualityScore < threshold && entries[i].team !== ''"
        >
          <div class="shift-header">
            <span class="shift-label">{{ shift.label }}</span>
          </div>

          <div class="field-group">
            <label>Equipe</label>
            <div class="team-selector">
              <button
                *ngFor="let opt of teamOptions"
                [class.selected]="entries[i].team === opt"
                (click)="entries[i].team = opt"
              >
                {{ opt }}
              </button>
            </div>
          </div>

          <div class="field-group" *ngIf="entries[i].team">
            <label>Qualidade do Serviço (%)</label>
            <input
              type="number"
              min="0"
              max="100"
              step="0.1"
              [(ngModel)]="entries[i].qualityScore"
              [class.alert-field]="entries[i].qualityScore < threshold"
              placeholder="Ex: 97.5"
            />
          </div>

          <div class="quality-bar-wrap" *ngIf="entries[i].team">
            <div
              class="quality-bar"
              [style.width.%]="entries[i].qualityScore"
              [style.background]="entries[i].qualityScore >= threshold ? '#00d4aa' : '#ff4757'"
            ></div>
            <div class="bar-labels">
              <span [class.alert-text]="entries[i].qualityScore < threshold">
                {{ entries[i].qualityScore | number: '1.1-1' }}%
              </span>
              <span class="threshold-label">META: {{ threshold }}%</span>
            </div>
          </div>

          <div class="quality-status" *ngIf="entries[i].team">
            <span
              class="badge"
              [class.ok]="entries[i].qualityScore >= threshold"
              [class.nok]="entries[i].qualityScore < threshold"
            >
              {{ entries[i].qualityScore >= threshold ? '✅ DENTRO DA META' : '⚠️ ABAIXO DA META' }}
            </span>
          </div>
        </div>
      </div>

      <button class="save-btn" (click)="save()" [disabled]="loading">
        {{ loading ? '⏳ SALVANDO...' : '💾 SALVAR DADOS DO DIA' }}
      </button>
      <div class="saved-msg" *ngIf="saved">✅ DADOS SALVOS COM SUCESSO!</div>
      <div class="error-msg" *ngIf="errorMsg">⚠️ {{ errorMsg }}</div>
    </div>
  `,
  styles: [
    `
      .form-container {
        padding: 24px;
        max-width: 900px;
        margin: 0 auto;
        font-family: 'Inter', sans-serif;
      }

      .form-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 32px;
      }
      .form-header h2 {
        color: #e2e8f0;
        margin: 0;
        font-size: 16px;
        font-weight: 700;
        letter-spacing: 1.5px;
        text-transform: uppercase;
      }
      .date-select {
        display: flex;
        align-items: center;
        gap: 10px;
        color: #4a5568;
        font-size: 10px;
        font-weight: 700;
        letter-spacing: 1.5px;
      }
      .date-select input {
        background: #111827;
        border: 1px solid #1f2937;
        color: #e2e8f0;
        padding: 8px 14px;
        border-radius: 8px;
        font-size: 13px;
        font-family: 'Inter', sans-serif;
      }
      .date-select input:focus {
        outline: none;
        border-color: #00d4aa;
      }

      .section-title {
        color: #4b5563;
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: 2px;
        font-weight: 700;
        margin-bottom: 12px;
      }

      /* Totais */
      .totals-card {
        background: #111827;
        border-radius: 12px;
        padding: 20px;
        border: 1px solid #1f2937;
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 16px;
        margin-bottom: 28px;
      }
      .total-field {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .total-field label {
        color: #4a5568;
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: 1.5px;
        font-weight: 700;
      }
      .total-field input {
        background: #0d1117;
        border: 1px solid #1f2937;
        color: #e2e8f0;
        padding: 10px 12px;
        border-radius: 8px;
        font-size: 20px;
        font-weight: 700;
        text-align: center;
        width: 100%;
        box-sizing: border-box;
        transition: 0.2s;
        font-family: 'JetBrains Mono', 'Courier New', monospace;
      }
      .total-field input:focus {
        outline: none;
        border-color: #00d4aa;
      }
      .total-field input.readonly {
        opacity: 0.5;
        cursor: not-allowed;
      }

      /* Turnos */
      .shifts-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 20px;
        margin-bottom: 24px;
      }

      .shift-card {
        background: #111827;
        border-radius: 12px;
        padding: 24px;
        border: 1px solid #1f2937;
        transition: border-color 0.3s;
        position: relative;
        overflow: hidden;
      }
      .shift-card::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 2px;
        background: #1f2937;
        transition: 0.3s;
      }
      .shift-card.below {
        border-color: rgba(255, 71, 87, 0.3);
      }
      .shift-card.below::before {
        background: #ff4757;
      }

      .shift-header {
        margin-bottom: 20px;
        padding-bottom: 14px;
        border-bottom: 1px solid #1f2937;
      }
      .shift-label {
        color: #9ca3af;
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 1px;
        text-transform: uppercase;
      }

      .field-group {
        margin-bottom: 18px;
      }
      .field-group label {
        display: block;
        color: #4a5568;
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: 1.5px;
        font-weight: 700;
        margin-bottom: 8px;
      }

      .team-selector {
        display: flex;
        gap: 8px;
      }
      .team-selector button {
        width: 44px;
        height: 44px;
        border-radius: 8px;
        border: 1px solid #1f2937;
        background: #0d1117;
        color: #4b5563;
        font-size: 15px;
        font-weight: 800;
        cursor: pointer;
        transition: 0.2s;
        font-family: 'Inter', sans-serif;
      }
      .team-selector button:hover {
        border-color: #00d4aa;
        color: #00d4aa;
      }
      .team-selector button.selected {
        background: #00d4aa;
        border-color: #00d4aa;
        color: #0d1117;
      }

      .field-group input {
        width: 100%;
        background: #0d1117;
        border: 1px solid #1f2937;
        color: #e2e8f0;
        padding: 10px 14px;
        border-radius: 8px;
        font-size: 24px;
        font-weight: 800;
        text-align: center;
        transition: 0.2s;
        box-sizing: border-box;
        font-family: 'JetBrains Mono', 'Courier New', monospace;
      }
      .field-group input:focus {
        outline: none;
        border-color: #00d4aa;
      }
      .field-group input.alert-field {
        border-color: #ff4757;
        color: #ff4757;
      }

      .quality-bar-wrap {
        background: #1f2937;
        border-radius: 20px;
        height: 6px;
        position: relative;
        margin-bottom: 14px;
        overflow: hidden;
      }
      .quality-bar {
        height: 6px;
        border-radius: 20px;
        transition:
          width 0.4s,
          background 0.4s;
      }
      .bar-labels {
        display: flex;
        justify-content: space-between;
        margin-top: 6px;
        font-size: 10px;
        font-weight: 700;
        letter-spacing: 0.5px;
      }
      .alert-text {
        color: #ff4757;
      }
      .threshold-label {
        color: #374151;
      }

      .quality-status {
        text-align: center;
      }
      .badge {
        display: inline-block;
        padding: 5px 16px;
        border-radius: 4px;
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.8px;
      }
      .badge.ok {
        background: rgba(0, 212, 170, 0.15);
        color: #00d4aa;
      }
      .badge.nok {
        background: rgba(255, 71, 87, 0.15);
        color: #ff4757;
      }

      .save-btn {
        width: 100%;
        padding: 14px;
        background: linear-gradient(135deg, #00d4aa, #00b894);
        color: #0d1117;
        border: none;
        border-radius: 10px;
        font-size: 13px;
        font-weight: 800;
        cursor: pointer;
        transition: 0.2s;
        text-transform: uppercase;
        letter-spacing: 2px;
        font-family: 'Inter', sans-serif;
      }
      .save-btn:hover {
        opacity: 0.85;
        transform: translateY(-1px);
      }
      .save-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
        transform: none;
      }

      .saved-msg {
        text-align: center;
        color: #00d4aa;
        margin-top: 12px;
        font-weight: 700;
        font-size: 12px;
        letter-spacing: 1.5px;
      }
      .error-msg {
        text-align: center;
        color: #ff4757;
        margin-top: 10px;
        font-weight: 600;
        font-size: 12px;
        letter-spacing: 1px;
      }

      @media (max-width: 600px) {
        .shifts-grid {
          grid-template-columns: 1fr;
        }
        .totals-card {
          grid-template-columns: 1fr 1fr;
        }
        .form-header {
          flex-direction: column;
          align-items: flex-start;
          gap: 12px;
        }
      }
    `,
  ],
})
export class DataEntryFormComponent implements OnInit {
  shiftsConfig = SHIFTS_CONFIG;
  teamOptions = TEAM_OPTIONS;
  threshold = QUALITY_THRESHOLD;
  selectedDate = new Date().toISOString().split('T')[0];
  saved = false;
  loading = false;
  errorMsg = '';

  totalOffered = 0;
  totalReceived = 0;
  totalLost = 0;

  get abandonRate(): string {
    if (!this.totalOffered) return '0.0%';
    return ((this.totalLost / this.totalOffered) * 100).toFixed(1) + '%';
  }

  entries: ShiftEntry[] = [
    {
      team: '',
      qualityScore: 100,
      totalOffered: 0,
      totalReceived: 0,
      totalLost: 0,
      avgAnswerSpeed: 0,
      satisfaction: 5,
    },
    {
      team: '',
      qualityScore: 100,
      totalOffered: 0,
      totalReceived: 0,
      totalLost: 0,
      avgAnswerSpeed: 0,
      satisfaction: 5,
    },
  ];

  constructor(private svc: CallCenterService) {
    this.svc.getLoading().subscribe((l) => (this.loading = l));
    this.svc.getError().subscribe((e) => (this.errorMsg = e));
  }

  ngOnInit() {
    this.loadDate();
  }

  calcTotalLost() {
    this.totalLost = Math.max(0, this.totalOffered - this.totalReceived);
  }

  loadDate() {
    const records = this.svc.getSnapshot();
    const rec = records.find((r) => r.date === this.selectedDate);

    this.totalOffered = 0;
    this.totalReceived = 0;
    this.totalLost = 0;
    this.entries = [
      {
        team: '',
        qualityScore: 100,
        totalOffered: 0,
        totalReceived: 0,
        totalLost: 0,
        avgAnswerSpeed: 0,
        satisfaction: 5,
      },
      {
        team: '',
        qualityScore: 100,
        totalOffered: 0,
        totalReceived: 0,
        totalLost: 0,
        avgAnswerSpeed: 0,
        satisfaction: 5,
      },
    ];

    if (rec) {
      this.totalOffered = rec.totalOffered || 0;
      this.totalReceived = rec.totalReceived || 0;
      this.totalLost = rec.totalLost || 0;
      rec.shifts.forEach((s, i) => {
        if (i < 2) {
          this.entries[i] = {
            team: s.team.replace('Equipe ', ''),
            qualityScore: s.qualityScore,
            totalOffered: s.totalOffered || 0,
            totalReceived: s.totalReceived || 0,
            totalLost: s.totalLost || 0,
            avgAnswerSpeed: s.avgAnswerSpeed || 0,
            satisfaction: s.satisfaction || 5,
          };
        }
      });
    }
    this.saved = false;
  }

  save() {
    const shifts: TeamShift[] = this.entries
      .filter((e) => e.team !== '')
      .map((e, i) => ({
        team: `Equipe ${e.team}`,
        shift: SHIFTS_CONFIG[i].label,
        totalOffered: 0,
        totalReceived: 0,
        totalLost: 0,
        qualityScore: e.qualityScore,
        avgAnswerSpeed: 0,
        satisfaction: 5,
      }));

    this.svc.saveRecord({
      date: this.selectedDate,
      shifts,
      totalOffered: this.totalOffered,
      totalReceived: this.totalReceived,
      totalLost: this.totalLost,
    });

    this.saved = true;
    setTimeout(() => (this.saved = false), 3000);
  }
}
