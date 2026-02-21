import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardComponent } from './components/dashboard/dashboard';
import { DataEntryFormComponent } from './components/data-entry-form/data-entry-form';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, DashboardComponent, DataEntryFormComponent],
  template: `
    <div class="app">
      <header>
        <div class="logo">📞 Call Center Quality</div>
        <nav>
          <button (click)="tab = 'dashboard'" [class.active]="tab === 'dashboard'">
            📊 Dashboard
          </button>
          <button (click)="tab = 'entry'" [class.active]="tab === 'entry'">📝 Inserir Dados</button>
        </nav>
      </header>
      <main>
        <app-dashboard *ngIf="tab === 'dashboard'"></app-dashboard>
        <app-data-entry-form *ngIf="tab === 'entry'"></app-data-entry-form>
      </main>
    </div>
  `,
  styles: [
    `
      * {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
      }
      .app {
        min-height: 100vh;
        background: #0f1724;
        font-family: 'Segoe UI', sans-serif;
      }
      header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 16px 24px;
        background: #151d2b;
        border-bottom: 1px solid #2d3748;
      }
      .logo {
        color: #00b894;
        font-size: 18px;
        font-weight: 700;
      }
      nav {
        display: flex;
        gap: 8px;
      }
      nav button {
        padding: 8px 20px;
        border: 1px solid #2d3748;
        background: transparent;
        color: #8892a4;
        border-radius: 8px;
        cursor: pointer;
        transition: 0.2s;
      }
      nav button.active {
        background: #00b894;
        color: #fff;
        border-color: #00b894;
      }
      main {
        max-width: 1400px;
        margin: 0 auto;
      }
    `,
  ],
})
export class AppComponent {
  tab = 'dashboard';
}
