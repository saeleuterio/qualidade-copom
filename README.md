# 📊 COPOM — Dashboard de Qualidade do Serviço

> Sistema de monitoramento de qualidade para o Centro de Operações da Polícia Militar, desenvolvido em Angular com integração ao Google Sheets.

---

## 🖥️ Visão Geral

O **COPOM Dashboard** é uma aplicação web desenvolvida para monitorar e registrar a qualidade do atendimento telefônico do Centro de Operações da Polícia Militar. O sistema permite o acompanhamento diário de 5 equipes (A, B, C, D e E) distribuídas em dois turnos, com persistência de dados no Google Sheets e geração de relatórios em PDF.

### 🔗 Acesso

- **Produção:** [Vercel — URL do projeto]
- **Repositório:** [GitHub — URL do repositório]

---

## ✨ Funcionalidades

### 📝 Registro de Dados

- Seleção de data e equipe por turno
- Registro de pontuação de qualidade (%)
- Registro de total de ligações oferecidas, recebidas e perdidas
- Validação de campos obrigatórios
- Edição de registros existentes (sobrescreve o dia ao salvar novamente)

### 📈 Dashboard

- **4 KPIs mensais:** Total Oferecidas, Total Recebidas, Total Perdidas, Taxa de Abandono
- **Gráfico de barras:** Qualidade média por equipe com linha de meta em 95%
- **Ranking:** Classificação das 5 equipes com medalhas e barra de progresso
- **Resumo mensal:** Tabela com melhor, pior e média de qualidade por equipe
- **Detalhe por dia:** Histórico diário com os dois turnos e suas respectivas qualidades
- **Alertas visuais:** Elementos em vermelho quando a qualidade está abaixo de 95%

### 📄 Exportação PDF

- Relatório mensal completo em PDF
- Header com identidade visual do COPOM
- KPIs, ranking, resumo por equipe e detalhe por dia
- Cores dinâmicas: verde para OK, vermelho para abaixo da meta
- Rodapé com data/hora de geração e número de página

### ☁️ Integração Google Sheets

- Persistência em nuvem via Google Apps Script
- Carregamento automático dos dados ao abrir o sistema
- Fallback em `localStorage` para uso offline
- Deduplicação automática: edições sobrescrevem o registro do dia

---

## 🏗️ Estrutura do Projeto

```
call-center-dashboard/
├── public/
│   └── logo-copom.png              # Logo do COPOM (asset estático)
├── src/
│   └── app/
│       ├── models/
│       │   └── team-data.ts        # Interfaces e tipos de dados
│       ├── services/
│       │   └── call-center.ts      # Serviço principal + integração Sheets
│       ├── components/
│       │   ├── kpi-card/
│       │   │   └── kpi-card.ts     # Componente de card KPI reutilizável
│       │   ├── data-entry-form/
│       │   │   └── data-entry-form.ts  # Formulário de inserção de dados
│       │   └── dashboard/
│       │       └── dashboard.ts    # Dashboard principal com gráficos
│       ├── app.component.ts        # Componente raiz com navegação por abas
│       └── app.config.ts           # Configuração global (Chart.js + plugins)
├── src/
│   └── styles.scss                 # Estilos globais
├── angular.json
├── package.json
└── README.md
```

---

## 🛠️ Tecnologias Utilizadas

| Tecnologia | Versão | Uso |
|---|---|---|
| Angular | 17+ | Framework principal (standalone components) |
| TypeScript | 5+ | Linguagem de desenvolvimento |
| Chart.js | 4+ | Renderização de gráficos |
| ng2-charts | 6+ | Wrapper Angular para Chart.js |
| chartjs-plugin-annotation | 3+ | Linha de meta nos gráficos |
| jsPDF | 2+ | Geração de PDF |
| jspdf-autotable | 3+ | Tabelas no PDF |
| Google Apps Script | — | Backend serverless para Google Sheets |
| Vercel | — | Hospedagem e deploy contínuo |

---

## ⚙️ Instalação e Configuração

### Pré-requisitos

- Node.js 18+
- npm 9+
- Angular CLI **21.1.4+**

> Este projeto foi gerado com [Angular CLI](https://github.com/angular/angular-cli) versão **21.1.4**.

### 1. Clonar o repositório

```bash
git clone https://github.com/seu-usuario/call-center-dashboard.git
cd call-center-dashboard
```

### 2. Instalar dependências

```bash
npm install
```

### 3. Instalar dependências adicionais

```bash
npm install jspdf jspdf-autotable
npm install chartjs-plugin-annotation
```

### 4. Rodar em desenvolvimento

```bash
ng serve
```

Acesse `http://localhost:4200/` — a aplicação recarrega automaticamente ao salvar qualquer arquivo fonte.

### 5. Build para produção

```bash
ng build
```

Os arquivos gerados ficam em `dist/call-center-dashboard/browser/`. O build de produção otimiza automaticamente a aplicação para performance e velocidade.

---

## 🧩 Angular CLI — Geração de Código

O Angular CLI oferece ferramentas poderosas de scaffolding. Para gerar um novo componente:

```bash
ng generate component nome-do-componente
```

Para ver todos os schematics disponíveis (componentes, diretivas, pipes, etc.):

```bash
ng generate --help
```

---

## 🧪 Testes

### Testes unitários

Execute os testes unitários com o runner [Vitest](https://vitest.dev/):

```bash
ng test
```

### Testes end-to-end

Para testes E2E, execute:

```bash
ng e2e
```

> O Angular CLI não inclui um framework de testes E2E por padrão. Você pode escolher o que melhor se adapta às suas necessidades (ex: Playwright, Cypress).

---

## 📚 Recursos Adicionais

- [Angular CLI — Visão Geral e Referência de Comandos](https://angular.dev/tools/cli)
- [Documentação oficial do Angular](https://angular.dev)
- [Chart.js](https://www.chartjs.org/docs/)
- [jsPDF](https://artskydj.github.io/jsPDF/docs/)
- [Google Apps Script](https://developers.google.com/apps-script)

---

## 🔗 Configuração do Google Sheets

### Passo 1 — Criar a planilha

1. Acesse [Google Sheets](https://sheets.google.com) e crie uma nova planilha
2. Renomeie a aba para **`Dados`**
3. O script criará os cabeçalhos automaticamente na primeira execução

### Passo 2 — Criar o Apps Script

1. Na planilha, vá em **Extensões → Apps Script**
2. Apague o código padrão e cole o código abaixo:

```javascript
const SHEET_NAME = 'Dados';

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const sheet = getOrCreateSheet();
    if (data.action === 'save') {
      saveRecord(sheet, data.record);
      return response({ success: true });
    }
  } catch(err) {
    return response({ success: false, error: err.message });
  }
}

function doGet(e) {
  try {
    const sheet = getOrCreateSheet();
    const records = getAllRecords(sheet);
    return response({ success: true, records });
  } catch(err) {
    return response({ success: false, error: err.message });
  }
}

function saveRecord(sheet, record) {
  const recordDate = String(record.date).slice(0, 10);
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    const dates = sheet.getRange(2, 1, lastRow - 1, 1).getDisplayValues();
    for (let i = dates.length - 1; i >= 0; i--) {
      const cellDate = String(dates[i][0]).slice(0, 10);
      if (cellDate === recordDate) sheet.deleteRow(i + 2);
    }
  }
  record.shifts.forEach(shift => {
    sheet.appendRow([recordDate, shift.shift, shift.team, shift.qualityScore,
      record.totalOffered || 0, record.totalReceived || 0, record.totalLost || 0]);
  });
}

function getAllRecords(sheet) {
  const data = sheet.getDataRange().getDisplayValues();
  const records = {};
  for (let i = 1; i < data.length; i++) {
    let [date, shift, team, quality, offered, received, lost] = data[i];
    if (!date || date === 'data') continue;
    date = String(date).trim().slice(0, 10);
    const toNumber = (val) => Number(String(val).replace(',', '.')) || 0;
    if (!records[date]) {
      records[date] = { date, totalOffered: toNumber(offered),
        totalReceived: toNumber(received), totalLost: toNumber(lost), shifts: [] };
    }
    records[date].shifts.push({ shift: String(shift), team: String(team),
      qualityScore: toNumber(quality), totalOffered: 0, totalReceived: 0,
      totalLost: 0, avgAnswerSpeed: 0, satisfaction: 5 });
  }
  return Object.values(records).sort((a, b) => String(a.date).localeCompare(String(b.date)));
}

function getOrCreateSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(['data','turno','equipe','qualidade','totalOferecidas','totalRecebidas','totalPerdidas']);
    sheet.getRange(1,1,1,7).setFontWeight('bold').setBackground('#2d6a4f').setFontColor('#ffffff');
  }
  return sheet;
}

function response(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
```

### Passo 3 — Publicar o Apps Script

1. Clique em **Implantar → Nova implantação**
2. Tipo: **Aplicativo da Web**
3. Executar como: **Eu**
4. Quem tem acesso: **Qualquer pessoa**
5. Clique em **Implantar** e copie a **URL gerada**

### Passo 4 — Configurar a URL no projeto

No arquivo `src/app/services/call-center.ts`, substitua a URL do Apps Script:

```typescript
private sheetsUrl = 'https://script.google.com/macros/s/SUA_URL_AQUI/exec';
```

---

## 📐 Modelo de Dados

### Interface `DailyRecord`

```typescript
interface DailyRecord {
  date: string;          // Formato: 'YYYY-MM-DD'
  totalOffered: number;  // Total de ligações oferecidas no dia
  totalReceived: number; // Total de ligações recebidas no dia
  totalLost: number;     // Total de ligações perdidas no dia
  shifts: ShiftRecord[]; // Array com os dois turnos do dia
}
```

### Interface `ShiftRecord`

```typescript
interface ShiftRecord {
  shift: string;         // 'Turno 1' ou 'Turno 2'
  team: string;          // 'Equipe A' | 'Equipe B' | 'Equipe C' | 'Equipe D' | 'Equipe E'
  qualityScore: number;  // Pontuação de qualidade em % (0-100)
}
```

### Estrutura da planilha Google Sheets

| Coluna | Campo | Tipo | Exemplo |
|---|---|---|---|
| A | data | texto | 2026-03-01 |
| B | turno | texto | Turno 1 |
| C | equipe | texto | Equipe A |
| D | qualidade | número | 95.7 |
| E | totalOferecidas | número | 823 |
| F | totalRecebidas | número | 771 |
| G | totalPerdidas | número | 52 |

---

## 🎯 Regras de Negócio

| Regra | Valor |
|---|---|
| Meta de qualidade | **95%** |
| Meta de taxa de abandono | **abaixo de 5%** |
| Turno 1 | **05:30 – 18:00** |
| Turno 2 | **17:30 – 06:00** |
| Equipes | **A, B, C, D, E** |
| Alerta visual | Vermelho quando qualidade **< 95%** |

---

## 🚀 Deploy no Vercel

### Via interface web

1. Acesse [vercel.com](https://vercel.com) e faça login
2. Clique em **Add New Project**
3. Importe o repositório do GitHub
4. Configure:
   - **Framework Preset:** Angular
   - **Build Command:** `ng build`
   - **Output Directory:** `dist/call-center-dashboard/browser`
5. Clique em **Deploy**

### Via CLI

```bash
npm install -g vercel
vercel login
vercel --prod
```

---

## 🎨 Design System

### Paleta de Cores

| Token | Valor | Uso |
|---|---|---|
| Background | `#0f1724` | Fundo da página |
| Card | `#111827` | Cards e painéis |
| Border | `#1f2937` | Bordas e divisores |
| Success | `#00d4aa` | Qualidade acima da meta |
| Danger | `#ff4757` | Qualidade abaixo da meta |
| Warning | `#f5a623` | Linha de meta / destaque |
| Text | `#ffffff` | Texto principal |
| Text muted | `rgba(255,255,255,.6)` | Texto secundário |
| COPOM Green | `#1a4a2e` | Header / identidade |
| COPOM Gold | `#c8a600` | Título / destaque |

### Tipografia

- **Interface:** Inter (Google Fonts)
- **Números/Códigos:** JetBrains Mono

---

## 🐛 Problemas Conhecidos e Soluções

### Dados não carregam do Google Sheets

- Verifique se a URL do Apps Script está correta em `call-center.ts`
- Confirme que a implantação está como **"Qualquer pessoa"**
- Após editar o script, sempre crie uma **nova implantação** (não reutilize a antiga)

### Qualidade aparece como 0

- O script usa `String(val).replace(',', '.')` para tratar o formato brasileiro de números
- Certifique-se que a planilha não está formatando a coluna D como texto

### Data aparece com mês errado no PDF

- Resolvido com `new Date(year, month - 1, 1)` para evitar problemas de fuso horário

### Linhas duplicadas na planilha

- O script deleta registros do mesmo dia antes de inserir, evitando duplicações

---

## 📁 Scripts Úteis

```bash
# Desenvolvimento local
ng serve

# Build de produção
ng build

# Build com análise de bundle
ng build --stats-json
npx webpack-bundle-analyzer dist/call-center-dashboard/browser/stats.json

# Lint
ng lint

# Testes unitários (Vitest)
ng test

# Testes end-to-end
ng e2e

# Gerar novo componente
ng generate component nome-do-componente

# Ver todos os schematics disponíveis
ng generate --help
```

---

## 📋 Changelog

### v1.3.0

- Exportação de relatório mensal em PDF com identidade visual COPOM
- Correção do mês no PDF (problema de fuso horário)

### v1.2.0

- Todas as fontes e números alterados para branco (#ffffff)
- Melhoria de contraste e legibilidade geral

### v1.1.0

- Integração com Google Sheets via Apps Script
- Persistência dual: localStorage + nuvem
- Correção de formato decimal (vírgula → ponto)

### v1.0.0

- Dashboard inicial com KPIs, gráfico de barras, ranking e tabelas
- Formulário de entrada de dados
- Tema escuro com identidade visual COPOM

---

## 👥 Equipes e Turnos

| Turno | Horário | Equipes |
|---|---|---|
| Turno 1 | 05:30 – 18:00 | A, B, C, D ou E |
| Turno 2 | 17:30 – 06:00 | A, B, C, D ou E |

Cada dia pode ter até **2 registros** (um por turno), com equipes diferentes atuando em cada período.

---

## 📄 Licença

Este projeto é de uso interno do **COPOM — Centro de Operações da Polícia Militar**. Todos os direitos reservados.

---

<div align="center">
  <strong>COPOM — Centro de Operações da Polícia Militar</strong><br>
  Sistema de Qualidade do Serviço v1.3.0
</div>
