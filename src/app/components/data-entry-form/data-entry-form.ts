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
        <h2>📝 Inserir Dados Diários</h2>
        <div class="date-select">
          <label>Data:</label>
          <input type="date" [(ngModel)]="selectedDate" (change)="loadDate()" />
        </div>
      </div>

      <!-- Totais de Ligações -->
      <div class="section-title">📞 Totais de Ligações do Dia</div>
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
      <div class="section-title">⏱ Qualidade por Turno</div>
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
              [style.background]="entries[i].qualityScore >= threshold ? '#00b894' : '#e74c3c'"
            ></div>
            <div class="bar-labels">
              <span [class.alert-text]="entries[i].qualityScore < threshold">
                {{ entries[i].qualityScore | number: '1.1-1' }}%
              </span>
              <span class="threshold-label">Meta: {{ threshold }}%</span>
            </div>
          </div>

          <div class="quality-status" *ngIf="entries[i].team">
            <span
              class="badge"
              [class.ok]="entries[i].qualityScore >= threshold"
              [class.nok]="entries[i].qualityScore < threshold"
            >
              {{ entries[i].qualityScore >= threshold ? '✅ Dentro da Meta' : '⚠️ Abaixo da Meta' }}
            </span>
          </div>
        </div>
      </div>

      <button class="save-btn" (click)="save()">💾 Salvar Dados do Dia</button>
      <div class="saved-msg" *ngIf="saved">✅ Dados salvos com sucesso!</div>
    </div>
  `,
  styles: [
    `
      .form-container {
        padding: 24px;
        max-width: 900px;
        margin: 0 auto;
      }
      .form-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 24px;
      }
      .form-header h2 {
        color: #e2e8f0;
        margin: 0;
        font-size: 20px;
      }
      .date-select {
        display: flex;
        align-items: center;
        gap: 10px;
        color: #8892a4;
        font-size: 13px;
      }
      .date-select input {
        background: #2d3748;
        border: 1px solid #4a5568;
        color: #e2e8f0;
        padding: 8px 14px;
        border-radius: 8px;
        font-size: 13px;
      }

      .section-title {
        color: #63b3ed;
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 1.5px;
        font-weight: 700;
        margin-bottom: 12px;
      }

      .totals-card {
        background: #1e2736;
        border-radius: 14px;
        padding: 20px;
        border: 1px solid #2d3748;
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
        color: #8892a4;
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 1px;
      }
      .total-field input {
        background: #151d2b;
        border: 2px solid #2d3748;
        color: #e2e8f0;
        padding: 10px 12px;
        border-radius: 10px;
        font-size: 20px;
        font-weight: 700;
        text-align: center;
        width: 100%;
        box-sizing: border-box;
        transition: 0.2s;
      }
      .total-field input:focus {
        outline: none;
        border-color: #00b894;
      }
      .total-field input.readonly {
        opacity: 0.6;
        cursor: not-allowed;
      }

      .shifts-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 20px;
        margin-bottom: 24px;
      }
      .shift-card {
        background: #1e2736;
        border-radius: 14px;
        padding: 24px;
        border: 2px solid #2d3748;
        transition: border-color 0.3s;
      }
      .shift-card.below {
        border-color: #e74c3c;
        box-shadow: 0 0 20px rgba(231, 76, 60, 0.15);
      }
      .shift-header {
        margin-bottom: 20px;
        padding-bottom: 14px;
        border-bottom: 1px solid #2d3748;
      }
      .shift-label {
        color: #63b3ed;
        font-size: 14px;
        font-weight: 700;
      }

      .field-group {
        margin-bottom: 18px;
      }
      .field-group label {
        display: block;
        color: #8892a4;
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 1px;
        margin-bottom: 8px;
      }

      .team-selector {
        display: flex;
        gap: 8px;
      }
      .team-selector button {
        width: 44px;
        height: 44px;
        border-radius: 10px;
        border: 2px solid #2d3748;
        background: #151d2b;
        color: #8892a4;
        font-size: 16px;
        font-weight: 700;
        cursor: pointer;
        transition: 0.2s;
      }
      .team-selector button:hover {
        border-color: #63b3ed;
        color: #63b3ed;
      }
      .team-selector button.selected {
        background: #00b894;
        border-color: #00b894;
        color: #fff;
      }

      .field-group input {
        width: 100%;
        background: #151d2b;
        border: 2px solid #2d3748;
        color: #e2e8f0;
        padding: 10px 14px;
        border-radius: 10px;
        font-size: 22px;
        font-weight: 700;
        text-align: center;
        transition: 0.2s;
        box-sizing: border-box;
      }
      .field-group input:focus {
        outline: none;
        border-color: #00b894;
      }
      .field-group input.alert-field {
        border-color: #e74c3c;
        color: #e74c3c;
      }

      .quality-bar-wrap {
        background: #2d3748;
        border-radius: 20px;
        height: 8px;
        position: relative;
        margin-bottom: 14px;
        overflow: hidden;
      }
      .quality-bar {
        height: 8px;
        border-radius: 20px;
        transition:
          width 0.4s,
          background 0.4s;
      }
      .bar-labels {
        display: flex;
        justify-content: space-between;
        margin-top: 6px;
        font-size: 11px;
      }
      .alert-text {
        color: #e74c3c;
        font-weight: 700;
      }
      .threshold-label {
        color: #4a5568;
      }

      .quality-status {
        text-align: center;
      }
      .badge {
        display: inline-block;
        padding: 6px 16px;
        border-radius: 20px;
        font-size: 12px;
        font-weight: 700;
      }
      .badge.ok {
        background: rgba(0, 184, 148, 0.2);
        color: #00b894;
      }
      .badge.nok {
        background: rgba(231, 76, 60, 0.2);
        color: #e74c3c;
      }

      .save-btn {
        width: 100%;
        padding: 14px;
        background: linear-gradient(135deg, #00b894, #00cec9);
        color: #fff;
        border: none;
        border-radius: 10px;
        font-size: 16px;
        font-weight: 700;
        cursor: pointer;
        transition: 0.2s;
      }
      .save-btn:hover {
        opacity: 0.85;
        transform: translateY(-1px);
      }
      .saved-msg {
        text-align: center;
        color: #00b894;
        margin-top: 12px;
        font-weight: 600;
      }

      @media (max-width: 600px) {
        .shifts-grid {
          grid-template-columns: 1fr;
        }
        .totals-card {
          grid-template-columns: 1fr 1fr;
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

  constructor(private svc: CallCenterService) {}

  ngOnInit() {
    this.loadDate();
  }

  calcTotalLost() {
    this.totalLost = Math.max(0, this.totalOffered - this.totalReceived);
  }

  loadDate() {
    const records = this.svc.getSnapshot();
    const rec = records.find((r) => r.date === this.selectedDate);
    if (rec) {
      this.totalOffered = rec.totalOffered || 0;
      this.totalReceived = rec.totalReceived || 0;
      this.totalLost = rec.totalLost || 0;
      SHIFTS_CONFIG.forEach((shift, i) => {
        const s = rec.shifts.find((s) => s.shift === shift.label);
        if (s) this.entries[i] = { ...s };
        else
          this.entries[i] = {
            team: '',
            qualityScore: 100,
            totalOffered: 0,
            totalReceived: 0,
            totalLost: 0,
            avgAnswerSpeed: 0,
            satisfaction: 5,
          };
      });
    } else {
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
