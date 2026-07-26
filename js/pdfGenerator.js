/**
 * PDF GENERATOR MODULE (HTML2PDF INTEGRATION)
 * Gera relatórios profissionais em PDF para gastos Semanais e Mensais
 */

function parseDateSafely(dateStr) {
  if (!dateStr) return new Date();
  if (dateStr instanceof Date) return dateStr;
  const cleanStr = String(dateStr).split('T')[0];
  const parts = cleanStr.split('-');
  if (parts.length === 3) {
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    if (!isNaN(y) && !isNaN(m) && !isNaN(d)) return new Date(y, m, d);
  }
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? new Date() : d;
}

class PDFReportGenerator {
  generateReport(periodType, transactions, categories) {
    const today = new Date();
    let startDate = new Date();
    let periodTitle = '';

    if (periodType === 'weekly') {
      startDate.setDate(today.getDate() - 7);
      periodTitle = 'Relatório Semanal de Finanças (Últimos 7 Dias)';
    } else {
      startDate.setDate(today.getDate() - 30);
      periodTitle = 'Relatório Mensal de Finanças (Últimos 30 Dias)';
    }

    const startStr = startDate.toISOString().split('T')[0];

    // Filtra transações do período
    const filteredTx = transactions.filter(t => t.date >= startStr);

    // Totais
    const totalIncome = filteredTx
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + parseFloat(t.amount), 0);

    const totalExpense = filteredTx
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + parseFloat(t.amount), 0);

    const netSavings = totalIncome - totalExpense;

    // Cálculo das porcentagens por categoria para o relatório
    const categoryTotals = {};
    filteredTx
      .filter(t => t.type === 'expense')
      .forEach(t => {
        categoryTotals[t.category_id] = (categoryTotals[t.category_id] || 0) + parseFloat(t.amount);
      });

    const categoryPercentRows = Object.keys(categoryTotals).map(catId => {
      const catObj = categories.find(c => c.id === catId) || { name: 'Sem Categoria' };
      const amount = categoryTotals[catId];
      const percent = totalExpense > 0 ? ((amount / totalExpense) * 100).toFixed(1) : '0.0';
      return `
        <tr>
          <td><strong>${catObj.name}</strong></td>
          <td>R$ ${amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
          <td><span style="background: #e0e7ff; color: #4338ca; padding: 2px 8px; border-radius: 12px; font-weight: bold;">${percent}%</span></td>
        </tr>
      `;
    }).join('');

    // Linhas da tabela de transações
    const txTableRows = filteredTx.map(t => {
      const catObj = categories.find(c => c.id === t.category_id) || { name: 'Geral' };
      const dateFormatted = parseDateSafely(t.date).toLocaleDateString('pt-BR');
      const isIncome = t.type === 'income';
      return `
        <tr>
          <td>${dateFormatted}</td>
          <td><strong>${t.description}</strong></td>
          <td>${catObj.name}</td>
          <td>${t.payment_method || 'Pix'}</td>
          <td style="color: ${isIncome ? '#10b981' : '#ef4444'}; font-weight: bold;">
            ${isIncome ? '+' : '-'} R$ ${parseFloat(t.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </td>
        </tr>
      `;
    }).join('');

    // Monta o template HTML para impressão/PDF
    const pdfContainer = document.createElement('div');
    pdfContainer.className = 'pdf-document';
    pdfContainer.innerHTML = `
      <div class="pdf-header">
        <div class="pdf-header-title">
          <h2>${periodTitle}</h2>
          <p>Emitido em: ${today.toLocaleDateString('pt-BR')} às ${today.toLocaleTimeString('pt-BR')}</p>
        </div>
        <div style="font-weight: 800; font-size: 1.2rem; color: #6366f1;">NovoControle</div>
      </div>

      <div class="pdf-summary-cards">
        <div class="pdf-box">
          <div class="pdf-box-title">Total de Receitas</div>
          <div class="pdf-box-val" style="color: #10b981;">R$ ${totalIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
        </div>
        <div class="pdf-box">
          <div class="pdf-box-title">Total de Despesas</div>
          <div class="pdf-box-val" style="color: #ef4444;">R$ ${totalExpense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
        </div>
        <div class="pdf-box">
          <div class="pdf-box-title">Saldo do Período</div>
          <div class="pdf-box-val" style="color: ${netSavings >= 0 ? '#10b981' : '#ef4444'};">
            R$ ${netSavings.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      <h3 style="margin-top: 24px; margin-bottom: 12px; font-size: 1.1rem; color: #1e293b;">Porcentagem de Gastos por Categoria</h3>
      <table class="pdf-table" style="margin-bottom: 24px;">
        <thead>
          <tr>
            <th>Categoria</th>
            <th>Valor Gasto</th>
            <th>% do Total de Despesas</th>
          </tr>
        </thead>
        <tbody>
          ${categoryPercentRows || '<tr><td colspan="3" style="text-align: center;">Nenhuma despesa no período.</td></tr>'}
        </tbody>
      </table>

      <h3 style="margin-top: 24px; margin-bottom: 12px; font-size: 1.1rem; color: #1e293b;">Extrato Detalhado de Lançamentos</h3>
      <table class="pdf-table">
        <thead>
          <tr>
            <th>Data</th>
            <th>Descrição</th>
            <th>Categoria</th>
            <th>Pagamento</th>
            <th>Valor</th>
          </tr>
        </thead>
        <tbody>
          ${txTableRows || '<tr><td colspan="5" style="text-align: center;">Nenhuma transação registrada.</td></tr>'}
        </tbody>
      </table>
    `;

    // Opções do html2pdf
    const options = {
      margin: 10,
      filename: `Relatorio_Financas_${periodType}_${today.toISOString().split('T')[0]}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    // Renderiza e inicia download
    if (window.html2pdf) {
      window.html2pdf().set(options).from(pdfContainer).save();
    } else {
      alert('Biblioteca de PDF carregando... Tente novamente em alguns segundos.');
    }
  }
}

window.pdfReportGenerator = new PDFReportGenerator();
