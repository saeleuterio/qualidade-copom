import { ApplicationConfig } from '@angular/core';
import { provideCharts, withDefaultRegisterables } from 'ng2-charts';
import annotationPlugin from 'chartjs-plugin-annotation';
import { Chart } from 'chart.js';

Chart.register(annotationPlugin);

export const appConfig: ApplicationConfig = {
  providers: [provideCharts(withDefaultRegisterables())],
};
