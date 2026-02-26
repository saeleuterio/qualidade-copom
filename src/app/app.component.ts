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
        <div class="header-inner">
          <div class="logo-wrap">
            <img
              src="logo-copom.png"
              alt="COPOM"
              class="logo-img"
              onerror="this.style.display='none'; this.nextElementSibling.style.display='flex'"
            />
            <div class="logo-fallback">
              <span class="logo-icon">⚡</span>
              <span class="logo-text">COPOM</span>
            </div>
          </div>

          <div class="header-center">
            <span class="header-title">QUALIDADE DO SERVIÇO</span>
            <span class="header-subtitle">Central de Operações da Polícia Militar</span>
          </div>

          <div class="logo-wrap">
            <img
              src="logo-copom.png"
              alt="COPOM"
              class="logo-img"
              onerror="this.style.display='none'; this.nextElementSibling.style.display='flex'"
            />
            <div class="logo-fallback">
              <span class="logo-icon">⚡</span>
              <span class="logo-text">COPOM</span>
            </div>
          </div>
        </div>

        <div class="nav-bar">
          <button (click)="tab = 'dashboard'" [class.active]="tab === 'dashboard'">
            <span class="nav-icon">▦</span> Dashboard
          </button>
          <button (click)="tab = 'entry'" [class.active]="tab === 'entry'">
            <span class="nav-icon">✎</span> Inserir Dados
          </button>
        </div>
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
        background: #0a0e1a;
        font-family: 'Inter', sans-serif;
      }

      header {
        background: linear-gradient(135deg, #1a4a2e 0%, #0d3320 50%, #1a4a2e 100%);
        border-bottom: 2px solid #f5a623;
        position: sticky;
        top: 0;
        z-index: 100;
        box-shadow: 0 4px 24px rgba(0, 0, 0, 0.4);
      }

      .header-inner {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 10px 28px;
        border-bottom: 1px solid rgba(245, 166, 35, 0.15);
      }

      .logo-wrap {
        width: 80px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .logo-img {
        height: 56px;
        width: auto;
        object-fit: contain;
        filter: drop-shadow(0 2px 6px rgba(0, 0, 0, 0.4));
      }
      .logo-fallback {
        display: none;
        flex-direction: column;
        align-items: center;
        gap: 2px;
      }
      .logo-icon {
        font-size: 30px;
        line-height: 1;
      }
      .logo-text {
        color: #f5a623;
        font-size: 10px;
        font-weight: 800;
        letter-spacing: 2px;
      }

      .header-center {
        text-align: center;
        flex: 1;
        padding: 0 20px;
      }
      .header-title {
        display: block;
        color: #f5a623;
        font-size: 18px;
        font-weight: 800;
        letter-spacing: 4px;
        text-transform: uppercase;
        font-family: 'Inter', sans-serif;
      }
      .header-subtitle {
        display: block;
        color: rgba(255, 255, 255, 0.5);
        font-size: 10px;
        letter-spacing: 2px;
        margin-top: 3px;
        text-transform: uppercase;
        font-weight: 500;
      }

      .nav-bar {
        display: flex;
        justify-content: center;
        gap: 6px;
        padding: 7px 28px;
        background: rgba(0, 0, 0, 0.25);
      }
      .nav-bar button {
        padding: 6px 22px;
        border: 1px solid rgba(245, 166, 35, 0.25);
        background: transparent;
        color: rgba(255, 255, 255, 0.5);
        border-radius: 6px;
        cursor: pointer;
        font-size: 12px;
        font-weight: 600;
        transition: 0.2s;
        letter-spacing: 0.8px;
        font-family: 'Inter', sans-serif;
        text-transform: uppercase;
      }
      .nav-bar button:hover {
        background: rgba(245, 166, 35, 0.1);
        color: #f5a623;
        border-color: rgba(245, 166, 35, 0.5);
      }
      .nav-bar button.active {
        background: #f5a623;
        color: #0d3320;
        border-color: #f5a623;
        font-weight: 800;
      }
      .nav-icon {
        margin-right: 6px;
      }

      main {
        max-width: 1440px;
        margin: 0 auto;
      }
    `,
  ],
})
export class AppComponent {
  tab = 'dashboard';
}
