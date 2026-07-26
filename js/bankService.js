/**
 * BANK SERVICE MODULE (OPEN FINANCE & IMPORTADOR DE EXTRATOS)
 * Suporta leitura de extratos em formato OFX, CSV, texto copiado de apps bancários
 * e simulação de conexão Open Finance estritamente SOMENTE LEITURA (Read-Only).
 */

class BankService {
  constructor() {
    // Regras de categorização automática por palavras-chave
    this.categoryKeywords = [
      { categoryId: 'cat-1', keywords: ['supermercado', 'mercado', 'atacadão', 'assai', 'carrefour', 'pão de açucar', 'extra', 'hortifruti', 'padaria', 'ifood', 'rappi', 'restaurante', 'mcdonalds', 'burguer king', 'snack', 'café', 'almoço', 'jantar'] },
      { categoryId: 'cat-2', keywords: ['aluguel', 'condominio', 'luz', 'energia', 'enel', 'cpfl', 'cemig', 'equatorial', 'água', 'sabesp', 'sanepar', 'copasa', 'gás', 'iptu', 'internet', 'claro', 'vivo', 'tim'] },
      { categoryId: 'cat-3', keywords: ['uber', '99', 'posto', 'shell', 'ipiranga', 'br', 'combustivel', 'gasolina', 'etanol', 'estacionamento', 'pedagio', 'sem parar', 'veloe', 'mecanico', 'oficina', 'ipva'] },
      { categoryId: 'cat-4', keywords: ['netflix', 'spotify', 'prime', 'disney', 'hbomax', 'cinema', 'ingresso', 'steam', 'playstation', 'xbox', 'nintendo', 'show', 'evento', 'bar', 'choperia'] },
      { categoryId: 'cat-5', keywords: ['farmacia', 'drogaria', 'drogasil', 'pague menos', 'panvel', 'raia', 'hospital', 'consulta', 'exame', 'dentista', 'unimed', 'bradesco saude', 'sulamerica', 'laboratorio'] },
      { categoryId: 'cat-6', keywords: ['udemy', 'coursera', 'faculdade', 'escola', 'curso', 'livraria', 'livro', 'ingles', 'idiomas', 'bootcamp'] },
      { categoryId: 'cat-7', keywords: ['amazon', 'mercadolivre', 'shopee', 'shein', 'magalu', 'americanas', 'zara', 'renner', 'riachuelo', 'cea', 'vestuario', 'calcados'] },
      { categoryId: 'cat-8', keywords: ['salario', 'pagamento', 'proventos', 'remuneracao', 'rendimento', 'freelance', 'pix recebido', 'ted recebida'] },
      { categoryId: 'cat-9', keywords: ['rendimento', 'dividendos', 'tesouro', 'cdb', 'xp', 'nuinvest', 'inter investimentos', 'rico', 'btg', 'ações'] }
    ];

    // Bancos suportados para visualização no Open Finance (Somente Leitura)
    this.supportedBanks = [
      { id: 'nubank', name: 'Nubank', color: '#820ad1', logoIcon: 'fa-university' },
      { id: 'itau', name: 'Itaú Unibanco', color: '#ec7000', logoIcon: 'fa-building-columns' },
      { id: 'bb', name: 'Banco do Brasil', color: '#0038a8', logoIcon: 'fa-landmark' },
      { id: 'bradesco', name: 'Bradesco', color: '#cc092f', logoIcon: 'fa-university' },
      { id: 'santander', name: 'Santander', color: '#ec0000', logoIcon: 'fa-building-columns' },
      { id: 'inter', name: 'Banco Inter', color: '#ff7a00', logoIcon: 'fa-mobile-alt' },
      { id: 'c6', name: 'C6 Bank', color: '#242424', logoIcon: 'fa-credit-card' }
    ];
  }

  /**
   * Sugere uma categoria baseada no texto da descrição do lançamento
   */
  suggestCategory(description, defaultCategories = []) {
    if (!description) return defaultCategories[0]?.id || 'cat-7';
    const lowerDesc = description.toLowerCase();

    for (const item of this.categoryKeywords) {
      for (const kw of item.keywords) {
        if (lowerDesc.includes(kw)) {
          // Verifica se a categoria existe na lista atual
          const match = defaultCategories.find(c => c.id === item.categoryId);
          if (match) return match.id;
        }
      }
    }

    // Padrão: Compras Gerais ou primeira de despesa
    const defaultExpense = defaultCategories.find(c => c.type === 'expense');
    return defaultExpense ? defaultExpense.id : (defaultCategories[0]?.id || 'cat-7');
  }

  /**
   * Detecta forma de pagamento a partir do texto do extrato
   */
  detectPaymentMethod(text) {
    const lower = text.toLowerCase();
    if (lower.includes('pix')) return 'Pix';
    if (lower.includes('cartao') || lower.includes('credito') || lower.includes('fatura')) return 'Cartão de Crédito';
    if (lower.includes('debito') || lower.includes('compras deb')) return 'Cartão de Débito';
    if (lower.includes('ted') || lower.includes('doc') || lower.includes('transf')) return 'Transferência';
    return 'Cartão de Débito';
  }

  /**
   * Parser para Conteúdo de Arquivo OFX (Open Financial Exchange)
   */
  parseOFX(ofxContent, availableCategories = []) {
    const transactions = [];
    const stmtTrnRegex = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi;
    let match;

    while ((match = stmtTrnRegex.exec(ofxContent)) !== null) {
      const block = match[1];

      // Extrai Campos do Bloco STMTTRN
      const trntype = this.getOFXTagValue(block, 'TRNTYPE');
      const dtposted = this.getOFXTagValue(block, 'DTPOSTED');
      const trnamt = this.getOFXTagValue(block, 'TRNAMT');
      const fitid = this.getOFXTagValue(block, 'FITID');
      const memo = this.getOFXTagValue(block, 'MEMO') || this.getOFXTagValue(block, 'NAME') || 'Lançamento Bancário';

      if (trnamt && dtposted) {
        const rawAmount = parseFloat(trnamt.replace(',', '.'));
        const isExpense = rawAmount < 0;
        const absAmount = Math.abs(rawAmount);

        // Formata data YYYYMMDD -> YYYY-MM-DD
        let formattedDate = new Date().toISOString().split('T')[0];
        if (dtposted.length >= 8) {
          const year = dtposted.substring(0, 4);
          const month = dtposted.substring(4, 6);
          const day = dtposted.substring(6, 8);
          formattedDate = `${year}-${month}-${day}`;
        }

        const categoryId = this.suggestCategory(memo, availableCategories);
        const paymentMethod = this.detectPaymentMethod(memo);

        transactions.push({
          id: 'ofx-' + (fitid || Math.random().toString(36).substr(2, 9)),
          description: memo.trim(),
          amount: absAmount,
          type: isExpense ? 'expense' : 'income',
          category_id: categoryId,
          date: formattedDate,
          payment_method: paymentMethod,
          selected: true
        });
      }
    }

    return transactions;
  }

  getOFXTagValue(block, tag) {
    const regex = new RegExp(`<${tag}>([^<\\r\\n]+)`, 'i');
    const match = block.match(regex);
    return match ? match[1].trim() : null;
  }

  /**
   * Parser para Arquivos CSV de Extratos Bancários
   */
  parseCSV(csvContent, availableCategories = []) {
    const lines = csvContent.split(/\r?\n/).filter(line => line.trim() !== '');
    const transactions = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Ignorar cabeçalho se houver
      if (i === 0 && (line.toLowerCase().includes('data') || line.toLowerCase().includes('date'))) {
        continue;
      }

      // Separa por vírgula ou ponto e vírgula ou tabulação
      const cols = line.split(/[,;\t]/).map(c => c.trim().replace(/^["']|["']$/g, ''));
      if (cols.length < 3) continue;

      let dateStr = cols[0];
      let desc = cols[1];
      let amountStr = cols[2];

      // Caso a ordem das colunas seja diferente (ex: Descrição, Data, Valor)
      if (isNaN(parseFloat(amountStr.replace('.', '').replace(',', '.'))) && cols.length >= 4) {
        amountStr = cols[3];
      }

      const rawAmount = parseFloat(amountStr.replace('R$', '').replace(/\./g, '').replace(',', '.').trim());
      if (isNaN(rawAmount)) continue;

      let dateFormatted = this.formatDateString(dateStr);
      const isExpense = rawAmount < 0 || line.toLowerCase().includes('débito') || line.toLowerCase().includes('saída');
      const absAmount = Math.abs(rawAmount);

      const categoryId = this.suggestCategory(desc, availableCategories);
      const paymentMethod = this.detectPaymentMethod(desc);

      transactions.push({
        id: 'csv-' + Math.random().toString(36).substr(2, 9),
        description: desc || 'Lançamento CSV',
        amount: absAmount,
        type: isExpense ? 'expense' : 'income',
        category_id: categoryId,
        date: dateFormatted,
        payment_method: paymentMethod,
        selected: true
      });
    }

    return transactions;
  }

  /**
   * Parser Inteligente de Texto Copiado do App Bancário / Fatura
   */
  parsePastedText(text, availableCategories = []) {
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l !== '');
    const transactions = [];
    
    // Regex para extrair data (ex: 22/07, 22/07/2026, 2026-07-22) e valor (R$ 150,00 ou 150.00 ou -150,00)
    const datePattern = /(\d{1,2}[\/\.-]\d{1,2}(?:[\/\.-]\d{2,4})?|\d{4}-\d{2}-\d{2})/;
    const amountPattern = /(-?\s*(?:R\$\s*)?\d{1,3}(?:\.\d{3})*,\d{2}|-?\s*(?:R\$\s*)?\d+(?:\.\d{2})?)/i;

    for (const line of lines) {
      const dateMatch = line.match(datePattern);
      const amountMatch = line.match(amountPattern);

      if (amountMatch) {
        let rawValStr = amountMatch[0].replace('R$', '').replace(/\s/g, '').replace(/\./g, '').replace(',', '.');
        let amountNum = parseFloat(rawValStr);
        if (isNaN(amountNum) || amountNum === 0) continue;

        let dateStr = dateMatch ? dateMatch[0] : new Date().toISOString().split('T')[0];
        let formattedDate = this.formatDateString(dateStr);

        // Remove a data e o valor da linha para obter a descrição limpa
        let desc = line.replace(amountMatch[0], '').replace(dateMatch ? dateMatch[0] : '', '').trim();
        if (!desc || desc.length < 2) desc = 'Gasto Importado do Extrato';

        const isExpense = amountNum < 0 || !line.toLowerCase().includes('recebido') && !line.toLowerCase().includes('depósito') && !line.toLowerCase().includes('salário');
        const absAmount = Math.abs(amountNum);

        const categoryId = this.suggestCategory(desc, availableCategories);
        const paymentMethod = this.detectPaymentMethod(line);

        transactions.push({
          id: 'paste-' + Math.random().toString(36).substr(2, 9),
          description: desc,
          amount: absAmount,
          type: isExpense ? 'expense' : 'income',
          category_id: categoryId,
          date: formattedDate,
          payment_method: paymentMethod,
          selected: true
        });
      }
    }

    return transactions;
  }

  /**
   * Converte strings de data variadas para YYYY-MM-DD
   */
  formatDateString(dateStr) {
    try {
      if (!dateStr) return new Date().toISOString().split('T')[0];
      
      // Já está em YYYY-MM-DD
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;

      // Formato DD/MM/YYYY ou DD/MM
      const parts = dateStr.split(/[\/\.-]/);
      if (parts.length >= 2) {
        const day = parts[0].padStart(2, '0');
        const month = parts[1].padStart(2, '0');
        const currentYear = new Date().getFullYear();
        const year = parts.length >= 3 ? (parts[2].length === 2 ? '20' + parts[2] : parts[2]) : currentYear;
        return `${year}-${month}-${day}`;
      }
    } catch (e) {
      console.warn('Erro ao formatar data:', dateStr);
    }
    return new Date().toISOString().split('T')[0];
  }

  /**
   * Simulação de Conexão Open Finance em Tempo Real (Somente Leitura)
   * Puxa lançamentos recentes da conta bancária conectada do usuário
   */
  async fetchOpenFinanceTransactions(bankId, availableCategories = []) {
    // Simula atraso de rede da API Open Finance
    await new Promise(resolve => setTimeout(resolve, 1200));

    const bank = this.supportedBanks.find(b => b.id === bankId) || this.supportedBanks[0];
    const today = new Date();
    
    // Gera transações reais simuladas dos últimos 7 dias para a semana
    const mockBankData = [
      {
        description: `Supermercado Carrefour (${bank.name})`,
        amount: 342.90,
        type: 'expense',
        daysAgo: 1,
        payment_method: 'Cartão de Crédito'
      },
      {
        description: `Posto Ipiranga Combustível (${bank.name})`,
        amount: 195.00,
        type: 'expense',
        daysAgo: 2,
        payment_method: 'Pix'
      },
      {
        description: `Restaurante Coco Bambu (${bank.name})`,
        amount: 188.50,
        type: 'expense',
        daysAgo: 3,
        payment_method: 'Cartão de Débito'
      },
      {
        description: `Farmácia Drogasil (${bank.name})`,
        amount: 87.40,
        type: 'expense',
        daysAgo: 4,
        payment_method: 'Pix'
      },
      {
        description: `Assinatura Netflix & Spotify (${bank.name})`,
        amount: 76.80,
        type: 'expense',
        daysAgo: 5,
        payment_method: 'Cartão de Crédito'
      }
    ];

    return mockBankData.map((item, idx) => {
      const d = new Date();
      d.setDate(today.getDate() - item.daysAgo);
      const dateStr = d.toISOString().split('T')[0];
      const categoryId = this.suggestCategory(item.description, availableCategories);

      return {
        id: `openfinance-${bankId}-${idx}-${Date.now()}`,
        description: item.description,
        amount: item.amount,
        type: item.type,
        category_id: categoryId,
        date: dateStr,
        payment_method: item.payment_method,
        selected: true
      };
    });
  }
}

// Instância global para acesso pela aplicação
window.bankService = new BankService();
