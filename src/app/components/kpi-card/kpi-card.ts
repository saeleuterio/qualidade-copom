import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-kpi-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="kpi-card" [class.alert]="isAlert">
      <span class="kpi-label">{{ label }}</span>
      <span class="kpi-value" [style.color]="isAlert ? '#e74c3c' : '#00b894'">
        {{ value }}{{ suffix }}
      </span>
      <span class="kpi-sub">{{ subtitle }}</span>
    </div>
  `,
  styles: [
    `
      .kpi-card {
        background: #1e2736;
        border: 1px solid #2d3748;
        border-radius: 12px;
        padding: 20px;
        text-align: center;
        transition: border-color 0.3s;
      }
      .kpi-card.alert {
        border-color: #e74c3c;
      }
      .kpi-label {
        display: block;
        color: #8892a4;
        font-size: 13px;
        margin-bottom: 8px;
        text-transform: uppercase;
        letter-spacing: 1px;
      }
      .kpi-value {
        display: block;
        font-size: 36px;
        font-weight: 700;
        font-family: 'Courier New', monospace;
      }
      .kpi-sub {
        display: block;
        color: #8892a4;
        font-size: 11px;
        margin-top: 4px;
      }
    `,
  ],
})
export class KpiCardComponent {
  @Input() label = '';
  @Input() value: number | string | null = 0;
  @Input() suffix = '';
  @Input() subtitle = '';
  @Input() isAlert = false;
}
