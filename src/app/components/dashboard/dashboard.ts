import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartData } from 'chart.js';
import { CallCenterService, QUALITY_THRESHOLD } from '../../services/call-center';
import { KpiCardComponent } from '../kpi-card/kpi-card';
import { DailyRecord } from '../../models/team-data';
import { Subscription } from 'rxjs';

const TEAMS = ['Equipe A', 'Equipe B', 'Equipe C', 'Equipe D', 'Equipe E'];

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, BaseChartDirective, KpiCardComponent, DecimalPipe],
  template: `
    <div class="dash-wrap">
      <div class="month-filter">
        <label>Mês:</label>
        <input type="month" [(ngModel)]="selectedMonth" (change)="refresh()" />
        <span class="record-count">{{ filtered.length }} dia(s) registrado(s)</span>
      </div>

      <!-- KPIs -->
      <div class="kpi-row">
        <app-kpi-card label="Total Oferecidas" [value]="totals.offered" subtitle="ligações no mês">
        </app-kpi-card>
        <app-kpi-card
          label="Total Recebidas"
          [value]="totals.received"
          subtitle="ligações atendidas"
        >
        </app-kpi-card>
        <app-kpi-card
          label="Total Perdidas"
          [value]="totals.lost"
          subtitle="ligações abandonadas"
          [isAlert]="totals.lost > 0"
        >
        </app-kpi-card>
        <app-kpi-card
          label="Taxa de Abandono"
          [value]="totals.abandonRate | number: '1.1-1'"
          suffix="%"
          subtitle="meta: abaixo de 5%"
          [isAlert]="totals.abandonRate > 5"
        >
        </app-kpi-card>
      </div>

      <!-- Gráficos -->
      <div class="charts-row">
        <div class="chart-card">
          <h3>📊 Qualidade Média por Equipe</h3>
          <canvas baseChart [data]="barData" [options]="barOptions" type="bar"> </canvas>
        </div>
        <div class="chart-card">
          <h3>📈 Evolução Diária de Qualidade</h3>
          <canvas baseChart [data]="lineData" [options]="lineOptions" type="line"> </canvas>
        </div>
      </div>

      <!-- Tabela resumo -->
      <div class="table-card">
        <h3>📋 Resumo Mensal por Equipe</h3>
        <table>
          <thead>
            <tr>
              <th>Equipe</th>
              <th>Dias Registrados</th>
              <th>Melhor Qualidade</th>
              <th>Pior Qualidade</th>
              <th>Qualidade Média</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let row of teamSummary" [class.alert-row]="row.quality < threshold">
              <td>
                <strong>{{ row.team }}</strong>
              </td>
              <td>{{ row.days }}</td>
              <td class="green">{{ row.best | number: '1.1-1' }}%</td>
              <td [class.red]="row.worst < threshold">{{ row.worst | number: '1.1-1' }}%</td>
              <td [class.red]="row.quality < threshold" [class.green]="row.quality >= threshold">
                <strong>{{ row.quality | number: '1.1-1' }}%</strong>
              </td>
              <td>
                <span
                  class="badge"
                  [class.ok]="row.quality >= threshold"
                  [class.nok]="row.quality < threshold"
                >
                  {{ row.quality >= threshold ? '✅ OK' : '⚠️ Abaixo' }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Detalhe diário -->
      <div class="table-card" *ngIf="filtered.length > 0">
        <h3>📅 Detalhe por Dia</h3>
        <table>
          <thead>
            <tr>
              <th>Data</th>
              <th>Diurno (05:30–18:00)</th>
              <th>Qualidade</th>
              <th>Noturno (17:30–06:00)</th>
              <th>Qualidade</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let rec of filtered">
              <td>{{ rec.date | date: 'dd/MM/yyyy' : 'UTC' }}</td>
              <ng-container *ngIf="rec.shifts[0] as t1">
                <td>{{ t1.team }}</td>
                <td
                  [class.red]="t1.qualityScore < threshold"
                  [class.green]="t1.qualityScore >= threshold"
                >
                  {{ t1.qualityScore | number: '1.1-1' }}%
                </td>
              </ng-container>
              <ng-container *ngIf="!rec.shifts[0]">
                <td>—</td>
                <td>—</td>
              </ng-container>
              <ng-container *ngIf="rec.shifts[1] as t2">
                <td>{{ t2.team }}</td>
                <td
                  [class.red]="t2.qualityScore < threshold"
                  [class.green]="t2.qualityScore >= threshold"
                >
                  {{ t2.qualityScore | number: '1.1-1' }}%
                </td>
              </ng-container>
              <ng-container *ngIf="!rec.shifts[1]">
                <td>—</td>
                <td>—</td>
              </ng-container>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `,
  styles: [
    `
      .dash-wrap {
        padding: 20px;
      }

      .month-filter {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 20px;
        color: #8892a4;
      }
      .month-filter label {
        font-size: 13px;
      }
      .month-filter input {
        background: #2d3748;
        border: 1px solid #4a5568;
        color: #e2e8f0;
        padding: 8px 12px;
        border-radius: 8px;
        font-size: 13px;
      }
      .record-count {
        font-size: 12px;
        color: #4a5568;
      }

      .kpi-row {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 16px;
        margin-bottom: 24px;
      }

      .charts-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 16px;
        margin-bottom: 24px;
      }
      .chart-card {
        background: #1e2736;
        border: 1px solid #2d3748;
        border-radius: 14px;
        padding: 20px;
      }
      .chart-card h3 {
        color: #e2e8f0;
        margin: 0 0 16px;
        font-size: 14px;
        font-weight: 600;
      }

      .table-card {
        background: #1e2736;
        border: 1px solid #2d3748;
        border-radius: 14px;
        padding: 20px;
        margin-bottom: 20px;
        overflow-x: auto;
      }
      .table-card h3 {
        color: #e2e8f0;
        margin: 0 0 16px;
        font-size: 14px;
        font-weight: 600;
      }

      table {
        width: 100%;
        border-collapse: collapse;
      }
      thead tr {
        background: #151d2b;
      }
      th {
        padding: 11px 14px;
        text-align: left;
        color: #718096;
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        font-weight: 600;
      }
      td {
        padding: 11px 14px;
        border-bottom: 1px solid #2d3748;
        color: #e2e8f0;
        font-size: 13px;
      }
      tbody tr:hover {
        background: rgba(255, 255, 255, 0.02);
      }
      .alert-row {
        background: rgba(231, 76, 60, 0.06);
      }

      .red {
        color: #e74c3c !important;
      }
      .green {
        color: #00b894 !important;
      }

      .badge {
        display: inline-block;
        padding: 4px 12px;
        border-radius: 20px;
        font-size: 11px;
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

      @media (max-width: 900px) {
        .kpi-row {
          grid-template-columns: 1fr 1fr;
        }
        .charts-row {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class DashboardComponent implements OnInit, OnDestroy {
  threshold = QUALITY_THRESHOLD;
  selectedMonth = new Date().toISOString().slice(0, 7);
  filtered: DailyRecord[] = [];
  totals = { offered: 0, received: 0, lost: 0, abandonRate: 0 };
  teamSummary: any[] = [];
  private sub!: Subscription;

  barData: ChartData<'bar'> = { labels: [], datasets: [] };
  barOptions: ChartConfiguration['options'] = {
    responsive: true,
    plugins: { legend: { display: false } },
    scales: {
      y: {
        min: 0,
        max: 100,
        ticks: { color: '#8892a4', callback: (v) => v + '%' },
        grid: { color: '#2d3748' },
      },
      x: { ticks: { color: '#8892a4' }, grid: { color: '#2d3748' } },
    },
  };

  lineData: ChartData<'line'> = { labels: [], datasets: [] };
  lineOptions: ChartConfiguration['options'] = {
    responsive: true,
    plugins: { legend: { labels: { color: '#8892a4', boxWidth: 12 } } },
    scales: {
      y: {
        min: 0,
        max: 100,
        ticks: { color: '#8892a4', callback: (v) => v + '%' },
        grid: { color: '#2d3748' },
      },
      x: { ticks: { color: '#8892a4', maxTicksLimit: 15 }, grid: { color: '#2d3748' } },
    },
  };

  constructor(private svc: CallCenterService) {}

  ngOnInit() {
    this.sub = this.svc.getRecords().subscribe(() => this.refresh());
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
  }

  refresh() {
    const all = this.svc.getSnapshot();
    this.filtered = all.filter((r) => r.date.startsWith(this.selectedMonth));
    this.totals = this.svc.getMonthlyTotals(this.filtered) as any;
    this.buildTeamSummary();
    this.buildBarChart();
    this.buildLineChart();
  }

  buildTeamSummary() {
    this.teamSummary = TEAMS.map((team) => {
      const shifts = this.filtered.flatMap((r) => r.shifts.filter((s) => s.team === team));
      if (!shifts.length) return { team, days: 0, quality: 0, best: 0, worst: 0 };
      const qualities = shifts.map((s) => s.qualityScore);
      const avg = qualities.reduce((a, b) => a + b, 0) / qualities.length;
      return {
        team,
        days: shifts.length,
        quality: avg,
        best: Math.max(...qualities),
        worst: Math.min(...qualities),
      };
    });
  }

  buildBarChart() {
    const values = this.teamSummary.map((t) => t.quality);
    const colors = values.map((v) => (v >= QUALITY_THRESHOLD ? '#00b894' : '#e74c3c'));
    this.barData = {
      labels: TEAMS,
      datasets: [{ data: values, backgroundColor: colors, borderRadius: 8 }],
    };
  }

  buildLineChart() {
    const labels = this.filtered.map((r) => r.date.slice(8) + '/' + r.date.slice(5, 7));
    const palette = ['#00b894', '#0984e3', '#fdcb6e', '#e17055', '#a29bfe'];
    this.lineData = {
      labels,
      datasets: TEAMS.map((team, i) => {
        const data = this.filtered.map((r) => {
          const shifts = r.shifts.filter((s) => s.team === team);
          return shifts.length
            ? shifts.reduce((a, s) => a + s.qualityScore, 0) / shifts.length
            : null;
        });
        return {
          label: team,
          data: data as number[],
          borderColor: palette[i],
          backgroundColor: 'transparent',
          pointBackgroundColor: (data as number[]).map((v) =>
            v !== null && v < QUALITY_THRESHOLD ? '#e74c3c' : palette[i],
          ),
          tension: 0.3,
          pointRadius: 4,
          spanGaps: true,
        };
      }),
    };
  }
}
