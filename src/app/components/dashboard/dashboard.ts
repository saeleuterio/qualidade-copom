import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartData } from 'chart.js';
import { CallCenterService, QUALITY_THRESHOLD } from '../../services/call-center';
import { KpiCardComponent } from '../kpi-card/kpi-card';
import { DailyRecord } from '../../models/team-data';
import { Subscription } from 'rxjs';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const TEAMS = ['Equipe A', 'Equipe B', 'Equipe C', 'Equipe D', 'Equipe E'];

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, BaseChartDirective, DecimalPipe], // KpiCardComponent,-- ESTAVA DANDO ERRO E RETIREI
  template: `
    <div class="dash-wrap">
      <div class="top-bar">
        <div class="month-filter">
          <span class="filter-label">MÊS</span>
          <input type="month" [(ngModel)]="selectedMonth" (change)="refresh()" />
        </div>
        <div class="top-actions">
          <span class="record-count">{{ filtered.length }} DIA(S) REGISTRADO(S)</span>
          <button class="pdf-btn" (click)="exportPDF()" [disabled]="filtered.length === 0">
            📄 EXPORTAR PDF
          </button>
        </div>
      </div>

      <!-- KPIs -->
      <div class="kpi-row">
        <div class="kpi-card">
          <div class="kpi-label">TOTAL DE LIGAÇÕES</div>
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

      <!-- Gráfico barras -->
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
              <th>DIURNO (05:30–18:00)</th>
              <th>QUALIDADE</th>
              <th>NOTURNO (17:30–06:00)</th>
              <th>QUALIDADE</th>
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
                  <strong>{{ t1.qualityScore | number: '1.2-2' }}%</strong>
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
                  <strong>{{ t2.qualityScore | number: '1.2-2' }}%</strong>
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
        color: #ffffff;
        font-size: 10px;
        font-weight: 700;
        letter-spacing: 1.5px;
      }
      .month-filter input {
        background: #111827;
        border: 1px solid #1f2937;
        color: #ffffff;
        padding: 7px 12px;
        border-radius: 6px;
        font-size: 13px;
        font-family: 'Inter', sans-serif;
      }
      .month-filter input:focus {
        outline: none;
        border-color: #00d4aa;
      }

      .top-actions {
        display: flex;
        align-items: center;
        gap: 14px;
      }
      .record-count {
        color: #ffffff;
        font-size: 10px;
        font-weight: 700;
        letter-spacing: 1.5px;
      }
      .pdf-btn {
        padding: 7px 16px;
        background: transparent;
        border: 1px solid rgba(0, 212, 170, 0.4);
        color: #00d4aa;
        border-radius: 6px;
        cursor: pointer;
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 1px;
        font-family: 'Inter', sans-serif;
        transition: 0.2s;
        text-transform: uppercase;
      }
      .pdf-btn:hover {
        background: rgba(0, 212, 170, 0.1);
        border-color: #00d4aa;
      }
      .pdf-btn:disabled {
        opacity: 0.3;
        cursor: not-allowed;
      }

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
        color: #ffffff;
        font-size: 15px;
        font-weight: 700;
        letter-spacing: 1.5px;
        margin-bottom: 10px;
      }
      .kpi-value {
        font-size: 36px;
        font-weight: 800;
        color: #ffffff;
        font-family: 'JetBrains Mono', 'Courier New', monospace;
        line-height: 1;
        margin-bottom: 6px;
      }
      .kpi-sub {
        color: rgba(255, 255, 255, 0.6);
        font-size: 14px;
        font-weight: 500;
      }

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
        margin-bottom: 16px;
        padding-bottom: 10px;
        border-bottom: 1px solid #1f2937;
      }
      .card-title {
        color: #ffffff;
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 1.5px;
      }
      .card-badges {
        display: flex;
        gap: 6px;
      }
      .card-badge {
        background: #1f2937;
        color: #ffffff;
        font-size: 10px;
        font-weight: 600;
        padding: 3px 10px;
        border-radius: 20px;
        letter-spacing: 1px;
        text-transform: uppercase;
        border: 1px solid #2d3748;
      }
      .card-badge.meta {
        background: rgba(245, 166, 35, 0.1);
        color: #f5a623;
        border-color: rgba(245, 166, 35, 0.3);
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

      .bottom-row {
        display: grid;
        grid-template-columns: 360px 1fr;
        gap: 16px;
        margin-bottom: 16px;
        align-items: stretch;
      }

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
        color: #ffffff;
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
        color: #ffffff;
        font-size: 13px;
        font-weight: 700;
      }
      .rank-days {
        color: rgba(255, 255, 255, 0.6);
        font-size: 10px;
        font-weight: 600;
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
        color: rgba(255, 255, 255, 0.4);
        padding: 20px;
        font-size: 12px;
        letter-spacing: 1px;
      }

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
        color: #ffffff;
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: 1.5px;
        font-weight: 700;
        border-bottom: 1px solid #1f2937;
      }
      td {
        padding: 11px 14px;
        border-bottom: 1px solid #1f2937;
        color: #ffffff;
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
        color: rgba(255, 255, 255, 0.7);
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
        .top-bar {
          flex-direction: column;
          align-items: flex-start;
          gap: 10px;
        }
      }
      @media (max-width: 480px) {
        .kpi-row {
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
  ranking: any[] = [];
  private sub!: Subscription;

  barData: ChartData<'bar'> = { labels: [], datasets: [] };
  barOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: true,
    aspectRatio: 2,
    plugins: {
      legend: { display: false },
      annotation: {
        annotations: {
          metaLine: {
            type: 'line',
            yMin: 95,
            yMax: 95,
            borderColor: 'rgba(245,166,35,0.7)',
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
        ticks: { color: '#ffffff', callback: (v) => v + '%', font: { family: 'Inter', size: 11 } },
        grid: { color: '#1f2937' },
      },
      x: {
        ticks: { color: '#ffffff', font: { family: 'Inter', size: 11 } },
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

  exportPDF() {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const [year, month] = this.selectedMonth.split('-').map(Number);
    const monthLabel = new Date(year, month - 1, 1).toLocaleDateString('pt-BR', {
      month: 'long',
      year: 'numeric',
    });
    const W = doc.internal.pageSize.getWidth();

    doc.setFillColor(13, 48, 18);
    doc.rect(0, 0, W, 28, 'F');
    doc.setFillColor(200, 166, 0);
    doc.rect(0, 28, W, 1, 'F');
    doc.setTextColor(200, 166, 0);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('COPOM — QUALIDADE DO SERVIÇO', W / 2, 12, { align: 'center' });
    doc.setTextColor(180, 200, 180);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Centro de Operações da Polícia Militar', W / 2, 19, { align: 'center' });
    doc.setTextColor(150, 170, 150);
    doc.text(`${monthLabel.toUpperCase()}`, W / 2, 25, { align: 'center' });

    let y = 38;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 140, 100);
    doc.text('RESUMO DO MÊS', 14, y);
    y += 6;

    const kpis = [
      { label: 'Total Oferecidas', value: String(this.totals.offered) },
      { label: 'Total Recebidas', value: String(this.totals.received) },
      { label: 'Total Perdidas', value: String(this.totals.lost) },
      { label: 'Taxa de Abandono', value: this.totals.abandonRate.toFixed(1) + '%' },
    ];

    const kpiW = (W - 28) / 4;
    kpis.forEach((k, i) => {
      const x = 14 + i * (kpiW + 2);
      doc.setFillColor(13, 43, 16);
      doc.roundedRect(x, y, kpiW, 18, 2, 2, 'F');
      doc.setDrawColor(26, 61, 30);
      doc.roundedRect(x, y, kpiW, 18, 2, 2, 'S');
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(74, 124, 89);
      doc.text(k.label.toUpperCase(), x + kpiW / 2, y + 5, { align: 'center' });
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(220, 230, 220);
      doc.text(k.value, x + kpiW / 2, y + 13, { align: 'center' });
    });
    y += 26;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 140, 100);
    doc.text('RANKING DE QUALIDADE', 14, y);
    y += 4;

    const medals = ['1º', '2º', '3º', '4º', '5º'];
    this.ranking.forEach((row, i) => {
      const isOk = row.quality >= this.threshold;
      doc.setFillColor(isOk ? 10 : 40, isOk ? 40 : 10, isOk ? 15 : 10);
      doc.roundedRect(14, y, W - 28, 10, 2, 2, 'F');
      doc.setDrawColor(isOk ? 26 : 80, isOk ? 61 : 20, isOk ? 30 : 20);
      doc.roundedRect(14, y, W - 28, 10, 2, 2, 'S');
      doc.setFillColor(isOk ? 76 : 229, isOk ? 175 : 57, isOk ? 80 : 53);
      doc.rect(14, y, 2, 10, 'F');
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(200, 166, 0);
      doc.text(medals[i], 20, y + 6.5);
      doc.setTextColor(220, 230, 220);
      doc.text(row.team, 32, y + 6.5);
      const scoreColor = isOk ? [76, 175, 80] : [229, 57, 53];
      doc.setTextColor(scoreColor[0], scoreColor[1], scoreColor[2]);
      doc.text(row.quality.toFixed(1) + '%', W - 20, y + 6.5, { align: 'right' });
      y += 12;
    });
    y += 4;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 140, 100);
    doc.text('RESUMO MENSAL POR EQUIPE', 14, y);
    y += 2;

    autoTable(doc, {
      startY: y,
      head: [['EQUIPE', 'DIAS', 'MELHOR', 'PIOR', 'MÉDIA', 'STATUS']],
      body: this.teamSummary
        .filter((r) => r.days > 0)
        .map((row) => [
          row.team,
          String(row.days),
          row.best.toFixed(1) + '%',
          row.worst.toFixed(1) + '%',
          row.quality.toFixed(1) + '%',
          row.quality >= this.threshold ? 'OK' : 'ABAIXO',
        ]),
      styles: {
        fontSize: 9,
        font: 'helvetica',
        fillColor: [13, 43, 16],
        textColor: [200, 220, 200],
        lineColor: [26, 61, 30],
        lineWidth: 0.3,
      },
      headStyles: {
        fillColor: [10, 32, 9],
        textColor: [74, 124, 89],
        fontStyle: 'bold',
        fontSize: 8,
      },
      alternateRowStyles: { fillColor: [10, 36, 13] },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 5)
          data.cell.styles.textColor = data.cell.raw === 'OK' ? [76, 175, 80] : [229, 57, 53];
        if (data.section === 'body' && data.column.index === 4) {
          const val = parseFloat(String(data.cell.raw));
          data.cell.styles.textColor = val >= 95 ? [76, 175, 80] : [229, 57, 53];
        }
      },
      margin: { left: 14, right: 14 },
    });

    y = (doc as any).lastAutoTable.finalY + 8;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 140, 100);
    doc.text('DETALHE POR DIA', 14, y);
    y += 2;

    autoTable(doc, {
      startY: y,
      head: [['DATA', 'DIURNO', 'QUALIDADE', 'NOTURNO', 'QUALIDADE']],
      body: this.filtered.map((rec) => {
        const t1 = rec.shifts[0];
        const t2 = rec.shifts[1];
        return [
          new Date(rec.date + 'T12:00:00').toLocaleDateString('pt-BR'),
          t1 ? t1.team : '—',
          t1 ? t1.qualityScore.toFixed(1) + '%' : '—',
          t2 ? t2.team : '—',
          t2 ? t2.qualityScore.toFixed(1) + '%' : '—',
        ];
      }),
      styles: {
        fontSize: 9,
        font: 'helvetica',
        fillColor: [13, 43, 16],
        textColor: [200, 220, 200],
        lineColor: [26, 61, 30],
        lineWidth: 0.3,
      },
      headStyles: {
        fillColor: [10, 32, 9],
        textColor: [74, 124, 89],
        fontStyle: 'bold',
        fontSize: 8,
      },
      alternateRowStyles: { fillColor: [10, 36, 13] },
      didParseCell: (data) => {
        if (data.section === 'body' && (data.column.index === 2 || data.column.index === 4)) {
          const val = parseFloat(String(data.cell.raw));
          if (!isNaN(val)) {
            data.cell.styles.textColor = val >= 95 ? [76, 175, 80] : [229, 57, 53];
            data.cell.styles.fontStyle = 'bold';
          }
        }
      },
      margin: { left: 14, right: 14 },
    });

    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      const pH = doc.internal.pageSize.getHeight();
      doc.setFillColor(13, 48, 18);
      doc.rect(0, pH - 10, W, 10, 'F');
      doc.setFontSize(7);
      doc.setTextColor(74, 124, 89);
      doc.text(`COPOM — Relatório gerado em ${new Date().toLocaleString('pt-BR')}`, 14, pH - 3.5);
      doc.text(`Página ${i} de ${pageCount}`, W - 14, pH - 3.5, { align: 'right' });
    }

    doc.save(`qualidade-copom-${this.selectedMonth}.pdf`);
  }
}
