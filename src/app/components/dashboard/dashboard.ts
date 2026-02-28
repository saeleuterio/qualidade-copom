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
      <div class="top-bar">
        <div class="month-filter">
          <span class="filter-label">MÊS</span>
          <input type="month" [(ngModel)]="selectedMonth" (change)="refresh()" />
        </div>
        <span class="record-count">{{ filtered.length }} DIA(S) REGISTRADO(S)</span>
      </div>

      <!-- KPIs -->
      <div class="kpi-row">
        <div class="kpi-card">
          <div class="kpi-label">TOTAL OFERECIDAS</div>
          <div class="kpi-value">{{ totals.offered }}</div>
          <div class="kpi-sub">ligações no mês</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">TOTAL RECEBIDAS</div>
          <div class="kpi-value green">{{ totals.received }}</div>
          <div class="kpi-sub">ligações atendidas</div>
        </div>
        <div class="kpi-card" [class.alert]="totals.lost > 0">
          <div class="kpi-label">TOTAL PERDIDAS</div>
          <div class="kpi-value" [class.red]="totals.lost > 0">{{ totals.lost }}</div>
          <div class="kpi-sub">ligações abandonadas</div>
        </div>
        <div class="kpi-card" [class.alert]="totals.abandonRate > 5">
          <div class="kpi-label">TAXA DE ABANDONO</div>
          <div
            class="kpi-value"
            [class.red]="totals.abandonRate > 5"
            [class.green]="totals.abandonRate <= 5"
          >
            {{ totals.abandonRate | number: '1.1-1' }}%
          </div>
          <div class="kpi-sub">meta: abaixo de 5%</div>
        </div>
      </div>

      <!-- Gráfico barras centralizado com linha de meta -->
      <div class="chart-card">
        <div class="card-header">
          <span class="card-title">QUALIDADE MÉDIA POR EQUIPE</span>
          <div class="card-badges">
            <span class="card-badge meta">META: 95%</span>
            <span class="card-badge">% qualidade</span>
          </div>
        </div>
        <div class="bar-center">
          <div class="bar-inner">
            <canvas baseChart [data]="barData" [options]="barOptions" type="bar"></canvas>
          </div>
        </div>
      </div>

      <!-- Gráfico linha -->
      <div class="chart-card">
        <div class="card-header">
          <span class="card-title">EVOLUÇÃO DIÁRIA DE QUALIDADE</span>
          <span class="card-badge">por turno</span>
        </div>
        <canvas baseChart [data]="lineData" [options]="lineOptions" type="line"></canvas>
      </div>

      <!-- Ranking + Resumo -->
      <div class="bottom-row">
        <div class="ranking-card">
          <div class="card-header">
            <span class="card-title">🏆 RANKING DE QUALIDADE</span>
          </div>
          <div class="ranking-list">
            <div
              class="ranking-item"
              *ngFor="let row of ranking; let i = index"
              [class.first]="i === 0"
              [class.second]="i === 1"
              [class.third]="i === 2"
              [class.fourth]="i === 3"
              [class.fifth]="i === 4"
              [class.below]="row.quality < threshold"
            >
              <div class="rank-pos">
                <span *ngIf="i === 0">🥇</span>
                <span *ngIf="i === 1">🥈</span>
                <span *ngIf="i === 2">🥉</span>
                <span class="rank-num" *ngIf="i === 3">4º</span>
                <span class="rank-num" *ngIf="i === 4">5º</span>
              </div>

              <div class="rank-info">
                <div class="rank-top">
                  <span class="rank-team">{{ row.team }}</span>
                  <span class="rank-days">{{ row.days }} turno(s)</span>
                </div>
                <div class="rank-bar-bg">
                  <div
                    class="rank-bar-fill"
                    [style.width.%]="row.quality"
                    [style.background]="row.quality >= threshold ? '#00d4aa' : '#ff4757'"
                  ></div>
                  <div class="rank-line"></div>
                </div>
              </div>

              <div class="rank-score-col">
                <span
                  class="rank-score"
                  [class.green]="row.quality >= threshold"
                  [class.red]="row.quality < threshold"
                >
                  {{ row.quality | number: '1.1-1' }}%
                </span>
                <span
                  class="rank-dot"
                  [class.green-dot]="row.quality >= threshold"
                  [class.red-dot]="row.quality < threshold"
                  >●</span
                >
              </div>
            </div>

            <div class="no-data" *ngIf="ranking.length === 0">
              Nenhum dado registrado neste mês.
            </div>
          </div>
        </div>

        <div class="table-card">
          <div class="card-header">
            <span class="card-title">RESUMO MENSAL POR EQUIPE</span>
          </div>
          <table>
            <thead>
              <tr>
                <th>EQUIPE</th>
                <th>DIAS</th>
                <th>MELHOR</th>
                <th>PIOR</th>
                <th>MÉDIA</th>
                <th>STATUS</th>
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
                    {{ row.quality >= threshold ? '✅ OK' : '⚠️ ABAIXO' }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Detalhe diário -->
      <div class="table-card detail" *ngIf="filtered.length > 0">
        <div class="card-header">
          <span class="card-title">DETALHE POR DIA</span>
        </div>
        <table>
          <thead>
            <tr>
              <th>DATA</th>
              <th>TURNO 1 (05:30–18:00)</th>
              <th>QUALIDADE T1</th>
              <th>TURNO 2 (17:30–06:00)</th>
              <th>QUALIDADE T2</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let rec of filtered">
              <td class="mono-date">{{ rec.date | date: 'dd/MM/yyyy' : 'UTC' }}</td>
              <ng-container *ngIf="rec.shifts[0] as t1">
                <td>{{ t1.team }}</td>
                <td
                  [class.red]="t1.qualityScore < threshold"
                  [class.green]="t1.qualityScore >= threshold"
                >
                  <strong>{{ t1.qualityScore | number: '1.1-1' }}%</strong>
                </td>
              </ng-container>
              <ng-container *ngIf="!rec.shifts[0]"
                ><td>—</td>
                <td>—</td></ng-container
              >
              <ng-container *ngIf="rec.shifts[1] as t2">
                <td>{{ t2.team }}</td>
                <td
                  [class.red]="t2.qualityScore < threshold"
                  [class.green]="t2.qualityScore >= threshold"
                >
                  <strong>{{ t2.qualityScore | number: '1.1-1' }}%</strong>
                </td>
              </ng-container>
              <ng-container *ngIf="!rec.shifts[1]"
                ><td>—</td>
                <td>—</td></ng-container
              >
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
        font-family: 'Inter', sans-serif;
      }

      .top-bar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 20px;
      }
      .month-filter {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .filter-label {
        color: #4a5568;
        font-size: 10px;
        font-weight: 700;
        letter-spacing: 1.5px;
      }
      .month-filter input {
        background: #111827;
        border: 1px solid #1f2937;
        color: #e2e8f0;
        padding: 7px 12px;
        border-radius: 6px;
        font-size: 13px;
        font-family: 'Inter', sans-serif;
      }
      .record-count {
        color: #374151;
        font-size: 10px;
        font-weight: 700;
        letter-spacing: 1.5px;
      }

      /* KPI */
      .kpi-row {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 14px;
        margin-bottom: 20px;
      }
      .kpi-card {
        background: #111827;
        border: 1px solid #1f2937;
        border-radius: 12px;
        padding: 20px 18px;
        transition: 0.3s;
        position: relative;
        overflow: hidden;
      }
      .kpi-card::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 2px;
        background: #1f2937;
        transition: 0.3s;
      }
      .kpi-card.alert::before {
        background: #ff4757;
      }
      .kpi-label {
        color: #4a5568;
        font-size: 15px;
        font-weight: 700;
        letter-spacing: 1.5px;
        margin-bottom: 10px;
      }
      .kpi-value {
        font-size: 36px;
        font-weight: 800;
        color: #e2e8f0;
        font-family: 'JetBrains Mono', 'Courier New', monospace;
        line-height: 1;
        margin-bottom: 6px;
      }
      .kpi-sub {
        color: #374151;
        font-size: 16px;
        font-weight: 500;
      }

      /* Cards */
      .chart-card {
        background: #111827;
        border: 1px solid #1f2937;
        border-radius: 12px;
        padding: 20px;
        margin-bottom: 16px;
      }
      .card-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 18px;
      }
      .card-title {
        color: #9ca3af;
        font-size: 16px;
        font-weight: 700;
        letter-spacing: 1.5px;
      }
      .card-badges {
        display: flex;
        gap: 6px;
        align-items: center;
      }
      .card-badge {
        background: #1f2937;
        color: #4b5563;
        font-size: 10px;
        font-weight: 600;
        padding: 3px 10px;
        border-radius: 20px;
        letter-spacing: 1px;
        text-transform: uppercase;
      }
      .card-badge.meta {
        background: rgba(245, 166, 35, 0.15);
        color: #f5a623;
      }

      .bar-center {
        display: flex;
        justify-content: center;
        width: 100%;
      }
      .bar-inner {
        width: 60%;
        min-width: 300px;
        max-width: 800px;
      }

      /* Bottom row */
      .bottom-row {
        display: grid;
        grid-template-columns: 360px 1fr;
        gap: 16px;
        margin-bottom: 16px;
        align-items: stretch;
      }

      /* Ranking */
      .ranking-card {
        background: #111827;
        border: 1px solid #1f2937;
        border-radius: 12px;
        padding: 20px;
        box-sizing: border-box;
      }
      .ranking-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .ranking-item {
        display: flex;
        align-items: center;
        gap: 12px;
        background: #0d1117;
        border-radius: 10px;
        padding: 12px 14px;
        border: 1px solid #1f2937;
        transition: 0.3s;
        position: relative;
        overflow: hidden;
      }
      .ranking-item::before {
        content: '';
        position: absolute;
        left: 0;
        top: 0;
        bottom: 0;
        width: 3px;
        background: #1f2937;
      }
      .ranking-item.first {
        border-color: rgba(255, 215, 0, 0.2);
      }
      .ranking-item.first::before {
        background: #ffd700;
      }
      .ranking-item.second {
        border-color: rgba(156, 163, 175, 0.2);
      }
      .ranking-item.second::before {
        background: #9ca3af;
      }
      .ranking-item.third {
        border-color: rgba(205, 127, 50, 0.2);
      }
      .ranking-item.third::before {
        background: #cd7f32;
      }
      .ranking-item.below {
        border-color: rgba(255, 71, 87, 0.2);
      }

      .rank-pos {
        width: 32px;
        text-align: center;
        flex-shrink: 0;
        font-size: 22px;
      }
      .rank-num {
        color: #4b5563;
        font-size: 16px;
        font-weight: 800;
      }

      .rank-info {
        flex: 1;
        min-width: 0;
      }
      .rank-top {
        display: flex;
        justify-content: space-between;
        margin-bottom: 6px;
      }
      .rank-team {
        color: #e2e8f0;
        font-size: 13px;
        font-weight: 700;
      }
      .rank-days {
        color: #374151;
        font-size: 10px;
        font-weight: 600;
        letter-spacing: 0.5px;
      }

      .rank-bar-bg {
        background: #1f2937;
        border-radius: 20px;
        height: 5px;
        position: relative;
        overflow: hidden;
      }
      .rank-bar-fill {
        height: 5px;
        border-radius: 20px;
        transition: width 0.6s;
      }
      .rank-line {
        position: absolute;
        top: 0;
        bottom: 0;
        left: 95%;
        width: 2px;
        background: rgba(255, 255, 255, 0.1);
      }

      .rank-score-col {
        text-align: center;
        flex-shrink: 0;
      }
      .rank-score {
        display: block;
        font-size: 17px;
        font-weight: 800;
        font-family: 'JetBrains Mono', 'Courier New', monospace;
      }
      .rank-dot {
        font-size: 9px;
      }
      .green-dot {
        color: #00d4aa;
      }
      .red-dot {
        color: #ff4757;
      }
      .no-data {
        text-align: center;
        color: #374151;
        padding: 20px;
        font-size: 12px;
        letter-spacing: 1px;
      }

      /* Tabela */
      .table-card {
        background: #111827;
        border: 1px solid #1f2937;
        border-radius: 12px;
        padding: 20px;
        overflow-x: auto;
        box-sizing: border-box;
      }
      .table-card.detail {
        margin-bottom: 20px;
      }
      table {
        width: 100%;
        border-collapse: collapse;
      }
      thead tr {
        background: #0d1117;
      }
      th {
        padding: 10px 14px;
        text-align: left;
        color: #374151;
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: 1.5px;
        font-weight: 700;
      }
      td {
        padding: 11px 14px;
        border-bottom: 1px solid #1f2937;
        color: #d1d5db;
        font-size: 13px;
        font-weight: 500;
      }
      tbody tr:hover {
        background: rgba(255, 255, 255, 0.02);
      }
      .alert-row {
        background: rgba(255, 71, 87, 0.04);
      }
      .mono-date {
        font-family: 'JetBrains Mono', 'Courier New', monospace;
        font-size: 12px;
        color: #6b7280;
      }

      .red {
        color: #ff4757 !important;
      }
      .green {
        color: #00d4aa !important;
      }

      .badge {
        display: inline-block;
        padding: 3px 10px;
        border-radius: 4px;
        font-size: 10px;
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

      @media (max-width: 1024px) {
        .bottom-row {
          grid-template-columns: 1fr;
        }
      }
      @media (max-width: 768px) {
        .kpi-row {
          grid-template-columns: 1fr 1fr;
        }
        .bar-inner {
          width: 100%;
        }
        .dash-wrap {
          padding: 12px;
        }
        .kpi-value {
          font-size: 28px;
        }
      }
      @media (max-width: 480px) {
        .kpi-row {
          grid-template-columns: 1fr;
        }
        .top-bar {
          flex-direction: column;
          align-items: flex-start;
          gap: 8px;
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
  ranking: any[] = [];
  private sub!: Subscription;

  barData: ChartData<'bar'> = { labels: [], datasets: [] };
  barOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: true,
    aspectRatio: 1,
    plugins: {
      legend: { display: false },
      annotation: {
        annotations: {
          metaLine: {
            type: 'line',
            yMin: 95,
            yMax: 95,
            borderColor: 'rgba(245,166,35,0.6)',
            borderWidth: 2,
            borderDash: [6, 4],
            label: {
              display: true,
              content: 'Meta 95%',
              color: '#f5a623',
              font: { size: 11, family: 'Inter' },
              position: 'end',
              backgroundColor: 'rgba(245,166,35,0.15)',
            },
          },
        },
      },
    },
    scales: {
      y: {
        min: 0,
        max: 100,
        ticks: { color: '#374151', callback: (v) => v + '%', font: { family: 'Inter', size: 11 } },
        grid: { color: '#1f2937' },
      },
      x: {
        ticks: { color: '#374151', font: { family: 'Inter', size: 11 } },
        grid: { color: '#1f2937' },
      },
    },
  };

  lineData: ChartData<'line'> = { labels: [], datasets: [] };
  lineOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: true,
    aspectRatio: 2,
    plugins: {
      legend: { labels: { color: '#4b5563', boxWidth: 10, font: { family: 'Inter', size: 11 } } },
      annotation: {
        annotations: {
          metaLine: {
            type: 'line',
            yMin: 95,
            yMax: 95,
            borderColor: 'rgba(245,166,35,0.4)',
            borderWidth: 1.5,
            borderDash: [6, 4],
          },
        },
      },
    },
    scales: {
      y: {
        min: 0,
        max: 100,
        ticks: { color: '#374151', callback: (v) => v + '%', font: { family: 'Inter', size: 11 } },
        grid: { color: '#1f2937' },
      },
      x: {
        ticks: { color: '#374151', maxTicksLimit: 15, font: { family: 'Inter', size: 11 } },
        grid: { color: '#1f2937' },
      },
    },
  };

  constructor(private svc: CallCenterService) {}

  ngOnInit() {
    this.sub = this.svc.getRecords().subscribe(() => this.refresh());
    this.svc.loadFromSheets();
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
  }

  refresh() {
    const all = this.svc.getSnapshot();
    this.filtered = all.filter((r) => r.date.startsWith(this.selectedMonth));
    this.totals = this.svc.getMonthlyTotals(this.filtered) as any;
    this.buildTeamSummary();
    this.buildRanking();
    this.buildBarChart();
    this.buildLineChart();
  }

  buildTeamSummary() {
    this.teamSummary = TEAMS.map((team) => {
      const shifts = this.filtered.flatMap((r) => r.shifts.filter((s) => s.team === team));
      if (!shifts.length) return { team, days: 0, quality: 0, best: 0, worst: 0 };
      const qualities = shifts.map((s) => s.qualityScore);
      return {
        team,
        days: shifts.length,
        quality: qualities.reduce((a, b) => a + b, 0) / qualities.length,
        best: Math.max(...qualities),
        worst: Math.min(...qualities),
      };
    });
  }

  buildRanking() {
    this.ranking = [...this.teamSummary]
      .filter((t) => t.days > 0)
      .sort((a, b) => b.quality - a.quality);
  }

  buildBarChart() {
    const values = this.teamSummary.map((t) => t.quality);
    const colors = values.map((v) => (v >= QUALITY_THRESHOLD ? '#00d4aa' : '#ff4757'));
    this.barData = {
      labels: TEAMS,
      datasets: [{ data: values, backgroundColor: colors, borderRadius: 6, maxBarThickness: 60 }],
    };
  }

  buildLineChart() {
    const labels = this.filtered.map((r) => r.date.slice(8) + '/' + r.date.slice(5, 7));
    const palette = ['#00d4aa', '#3b82f6', '#f59e0b', '#f97316', '#8b5cf6'];
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
            v !== null && v < QUALITY_THRESHOLD ? '#ff4757' : palette[i],
          ),
          tension: 0.4,
          pointRadius: 4,
          borderWidth: 2,
          spanGaps: true,
        };
      }),
    };
  }
}
