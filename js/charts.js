/**
 * CHARTS ENGINE (CHART.JS INTEGRATION)
 * Renderiza gráficos interativos de porcentagens e tendências financeiras
 */

class FinanceCharts {
  constructor() {
    this.categoryChart = null;
    this.trendChart = null;
  }

  // Renderiza Gráfico Donut de Porcentagem de Gastos por Categoria
  renderCategoryPercentageChart(containerId, categoryBreakdown) {
    const ctx = document.getElementById(containerId);
    if (!ctx) return;

    if (this.categoryChart) {
      this.categoryChart.destroy();
    }

    if (categoryBreakdown.length === 0) {
      ctx.getContext('2d').clearRect(0, 0, ctx.width, ctx.height);
      return;
    }

    const labels = categoryBreakdown.map(c => c.name);
    const data = categoryBreakdown.map(c => c.total);
    const colors = categoryBreakdown.map(c => c.color);

    this.categoryChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: data,
          backgroundColor: colors,
          borderWidth: 2,
          borderColor: '#111827',
          hoverOffset: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                const value = context.raw || 0;
                const total = context.chart._metasets[0].total || 1;
                const percentage = ((value / total) * 100).toFixed(1);
                return ` R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (${percentage}%)`;
              }
            }
          }
        },
        cutout: '72%'
      }
    });
  }

  // Renderiza Gráfico de Barras para Comparativo Semanal / Mensal
  renderTrendChart(containerId, transactions) {
    const ctx = document.getElementById(containerId);
    if (!ctx) return;

    if (this.trendChart) {
      this.trendChart.destroy();
    }

    // Agrupa transações nos últimos 7 dias / 4 semanas
    const last7Days = [];
    const incomeData = [];
    const expenseData = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayLabel = d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit' });

      last7Days.push(dayLabel);

      const dayIncomes = transactions
        .filter(t => t.type === 'income' && t.date === dateStr)
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);

      const dayExpenses = transactions
        .filter(t => t.type === 'expense' && t.date === dateStr)
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);

      incomeData.push(dayIncomes);
      expenseData.push(dayExpenses);
    }

    const isLight = document.documentElement.getAttribute('data-theme') === 'light';
    const textColor = isLight ? '#475569' : '#94a3b8';
    const gridColor = isLight ? 'rgba(0, 0, 0, 0.06)' : 'rgba(255, 255, 255, 0.05)';

    this.trendChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: last7Days,
        datasets: [
          {
            label: 'Receitas',
            data: incomeData,
            backgroundColor: '#10b981',
            borderRadius: 6
          },
          {
            label: 'Despesas',
            data: expenseData,
            backgroundColor: '#ef4444',
            borderRadius: 6
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            labels: {
              color: textColor,
              font: { family: 'Plus Jakarta Sans', size: 12 }
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: textColor }
          },
          y: {
            grid: { color: gridColor },
            ticks: { color: textColor }
          }
        }
      }
    });
  }
}

window.financeCharts = new FinanceCharts();
