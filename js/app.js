// Polyfill de smooth scroll para Safari iOS < 15.4
// iOS não suportava behavior:'smooth' antes da versão 15.4 do Safari
if (!('scrollBehavior' in document.documentElement.style)) {
  window._smoothScrollTo = function(element, top) {
    if (element === window) {
      window.scrollTo(0, top || 0);
    } else if (element) {
      element.scrollTop = top || 0;
    }
  };
} else {
  window._smoothScrollTo = null; // nativo disponível
}

function safeSmoothScrollTo(top) {
  if (window._smoothScrollTo !== null && window._smoothScrollTo !== undefined) {
    window._smoothScrollTo(window, top);
  } else {
    window.scrollTo({ top: top || 0, behavior: 'smooth' });
  }
}

function safeSmoothScrollIntoView(element) {
  if (!element) return;
  if (window._smoothScrollTo !== null && window._smoothScrollTo !== undefined) {
    var rect = element.getBoundingClientRect();
    window.scrollTo(0, rect.top + window.pageYOffset - 80);
  } else {
    element.scrollIntoView({ behavior: 'smooth' });
  }
}

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

function safeGetItem(key) {
  try { return localStorage.getItem(key); } catch (e) { return null; }
}

function safeSetItem(key, val) {
  try { localStorage.setItem(key, val); } catch (e) {}
// Função Global à Prova de Falhas para Seleção de Tipo no Modal (Despesa / Receita)
window.setTxTypeGlobal = function(type) {
  try {
    const hiddenType = document.getElementById('tx-type');
    const btnExpense = document.getElementById('btn-type-expense');
    const btnIncome = document.getElementById('btn-type-income');
    if (hiddenType) hiddenType.value = type;
    if (type === 'income') {
      if (btnExpense) btnExpense.classList.remove('active');
      if (btnIncome) btnIncome.classList.add('active');
    } else {
      if (btnIncome) btnIncome.classList.remove('active');
      if (btnExpense) btnExpense.classList.add('active');
    }
  } catch (e) {
    console.error('Erro ao definir tipo:', e);
  }
};

// Função Global à Prova de Falhas para Abertura do Modal de Transação
window.openTxModalWithType = function(defaultType = 'expense') {
  try {
    const modal = document.getElementById('modal-transaction');
    const form = document.getElementById('form-transaction');
    const txEditId = document.getElementById('tx-edit-id');
    const txDate = document.getElementById('tx-date');
    const modalTitle = document.getElementById('modal-tx-title');
    const submitBtn = document.getElementById('btn-submit-tx');

    if (txEditId) txEditId.value = '';
    if (form) form.reset();
    if (txDate) txDate.value = new Date().toISOString().split('T')[0];
    
    if (window.setTxTypeGlobal) window.setTxTypeGlobal(defaultType);
    if (modalTitle) modalTitle.textContent = 'Adicionar Transação';
    if (submitBtn) submitBtn.textContent = 'Salvar Transação';

    // Força a exibição do modal com máxima especificidade
    if (modal) {
      modal.classList.add('active');
      modal.style.opacity = '1';
      modal.style.visibility = 'visible';
      modal.style.display = 'flex';
    }
  } catch (e) {
    console.error('Erro ao abrir modal:', e);
  }
};

document.addEventListener('DOMContentLoaded', async () => {
  // Estado da Aplicação
  const state = {
    categories: [],
    transactions: [],
    filterTimeframe: 'all', // 'all', 'weekly', 'monthly'
    filterType: 'all',      // 'all', 'expense', 'income'
    filterCategory: 'all',
    searchQuery: '',
    currentTheme: safeGetItem('novo_controle_theme') || 'dark',
    hideValues: safeGetItem('novo_controle_hide_values') === 'true'
  };

  // Aplica tema salvo
  function updateThemeUI() {
    document.documentElement.setAttribute('data-theme', state.currentTheme);
    safeSetItem('novo_controle_theme', state.currentTheme);
    const themeIcon = document.getElementById('theme-icon');
    if (themeIcon) {
      if (state.currentTheme === 'light') {
        themeIcon.className = 'fas fa-sun';
      } else {
        themeIcon.className = 'fas fa-moon';
      }
    }
  }

  // Aplica olho mágico (privacidade de valores)
  function updatePrivacyUI() {
    safeSetItem('novo_controle_hide_values', state.hideValues);
    const privacyIcon = document.getElementById('privacy-icon');
    if (privacyIcon) {
      if (state.hideValues) {
        privacyIcon.className = 'fas fa-eye-slash';
        privacyIcon.parentElement.setAttribute('title', 'Mostrar Valores');
      } else {
        privacyIcon.className = 'fas fa-eye';
        privacyIcon.parentElement.setAttribute('title', 'Ocultar Valores');
      }
    }
  }

  updateThemeUI();
  updatePrivacyUI();

  // Elementos do DOM
  const elements = {
    totalBalance: document.getElementById('total-balance'),
    totalIncome: document.getElementById('total-income'),
    totalExpense: document.getElementById('total-expense'),
    savingsRatio: document.getElementById('savings-ratio'),
    categoryBreakdownList: document.getElementById('category-breakdown-list'),
    transactionsTableBody: document.getElementById('transactions-table-body'),
    supabaseStatusBtn: document.getElementById('supabase-status-btn'),
    supabaseStatusDot: document.getElementById('supabase-status-dot'),
    supabaseStatusText: document.getElementById('supabase-status-text'),
    
    // Modais
    modalTransaction: document.getElementById('modal-transaction'),
    modalCategory: document.getElementById('modal-category'),
    modalSupabase: document.getElementById('modal-supabase'),
    modalPdf: document.getElementById('modal-pdf'),
    modalAuth: document.getElementById('modal-auth'),
    
    // Formulários
    formTransaction: document.getElementById('form-transaction'),
    formCategory: document.getElementById('form-category'),
    formSupabase: document.getElementById('form-supabase'),
    formLogin: document.getElementById('form-login'),
    formRegister: document.getElementById('form-register'),

    // Selects
    txCategorySelect: document.getElementById('tx-category'),
    filterCategorySelect: document.getElementById('filter-category'),

    // Elementos de Autenticação
    btnOpenAuthModal: document.getElementById('btn-open-auth-modal'),
    btnLogout: document.getElementById('btn-logout'),
    userInfoLogged: document.getElementById('user-info-logged'),
    userEmailDisplay: document.getElementById('user-email-display'),
    userAvatarInitials: document.getElementById('user-avatar-initials'),
    tabLogin: document.getElementById('tab-login'),
    tabRegister: document.getElementById('tab-register'),
    authAlertLogin: document.getElementById('auth-alert-login'),
    authAlertRegister: document.getElementById('auth-alert-register'),
    btnGuestMode: document.getElementById('btn-guest-mode')
  };

  // 1. CARREGAMENTO INICIAL DE DADOS
  async function loadData() {
    updateSupabaseStatusUI();
    const isAuthenticated = await checkAuthState();

    if (isAuthenticated) {
      state.categories = await window.financeService.getCategories();
      state.transactions = await window.financeService.getTransactions();
      populateCategoryDropdowns();
      renderApp();
    }
  }

  // Verifica estado de autenticação do usuário
  async function checkAuthState() {
    const appLayout = document.getElementById('app-layout');
    const user = await window.financeService.getCurrentUser();

    if (user && user.email) {
      // Usuário Autenticado: libera a interface e esconde modal de auth
      if (appLayout) appLayout.classList.remove('auth-hidden');
      if (elements.modalAuth) {
        elements.modalAuth.classList.remove('active', 'forced-auth');
      }
      if (elements.btnOpenAuthModal) elements.btnOpenAuthModal.style.display = 'none';
      if (elements.userInfoLogged) elements.userInfoLogged.style.display = 'flex';
      if (elements.userEmailDisplay) elements.userEmailDisplay.textContent = user.email;
      if (elements.userAvatarInitials) elements.userAvatarInitials.textContent = user.email.charAt(0).toUpperCase();
      return true;
    } else {
      // Usuário NÃO Autenticado: oculta o app e força a modal de login/cadastro
      if (appLayout) appLayout.classList.add('auth-hidden');
      if (elements.userInfoLogged) elements.userInfoLogged.style.display = 'none';
      if (elements.btnOpenAuthModal) elements.btnOpenAuthModal.style.display = 'flex';
      if (elements.modalAuth) {
        elements.modalAuth.classList.add('active', 'forced-auth');
      }
      return false;
    }
  }

  // Atualiza indicador visual do Supabase no sidebar
  function updateSupabaseStatusUI() {
    const isConnected = window.financeService.isSupabaseConnected;
    if (isConnected) {
      elements.supabaseStatusDot.className = 'status-dot';
      elements.supabaseStatusText.textContent = 'Conectado';
    } else {
      elements.supabaseStatusDot.className = 'status-dot offline';
      elements.supabaseStatusText.textContent = 'Modo Local (Demo)';
    }
  }

  // Preenche opções de categorias nos seletores do formulário e filtros
  function populateCategoryDropdowns() {
    if (!elements.txCategorySelect) return;
    
    const catOptions = state.categories.map(c => 
      `<option value="${c.id}">${c.name} (${c.type === 'income' ? 'Receita' : 'Despesa'})</option>`
    ).join('');

    elements.txCategorySelect.innerHTML = `<option value="">Selecione uma Categoria...</option>` + catOptions;
    
    if (elements.filterCategorySelect) {
      elements.filterCategorySelect.innerHTML = `<option value="all">Todas as Categorias</option>` + catOptions;
    }
  }

  // 2. RENDERIZAÇÃO DA INTERFACE & CÁLCULOS
  function renderApp() {
    const filteredTx = getFilteredTransactions();

    // Cálculos Gerais
    const totalIncome = filteredTx
      .filter(t => t.type === 'income')
      .reduce((acc, t) => acc + parseFloat(t.amount), 0);

    const totalExpense = filteredTx
      .filter(t => t.type === 'expense')
      .reduce((acc, t) => acc + parseFloat(t.amount), 0);

    const balance = totalIncome - totalExpense;
    const savingsRatioVal = totalIncome > 0 ? (((totalIncome - totalExpense) / totalIncome) * 100).toFixed(1) : '0.0';

    // Atualiza Cartões de Métricas
    elements.totalBalance.textContent = formatCurrency(balance);
    elements.totalIncome.textContent = formatCurrency(totalIncome);
    elements.totalExpense.textContent = formatCurrency(totalExpense);
    elements.savingsRatio.textContent = state.hideValues ? '•••• guardado' : `${savingsRatioVal}% guardado`;

    // Renderiza lista com PORCENTAGEM DE GASTOS POR CATEGORIA
    renderCategoryPercentages(totalExpense, filteredTx);

    // Renderiza tabela de transações
    renderTransactionsTable(filteredTx);

    // Renderiza gráficos interativos
    if (window.financeCharts) {
      const categoryData = getCategoryBreakdownData(totalExpense, filteredTx);
      window.financeCharts.renderCategoryPercentageChart('chart-categories', categoryData);
      window.financeCharts.renderTrendChart('chart-trend', state.transactions);
    }

    // Atualiza o painel "Onde Mais Gastei Nesta Semana"
    updateWeeklyHighlights();
  }

  // Filtra transações por período, tipo, categoria e busca
  function getFilteredTransactions() {
    const now = new Date();
    return state.transactions.filter(t => {
      const tDate = parseDateSafely(t.date);
      
      // Filtro de Tempo
      if (state.filterTimeframe === 'weekly') {
        const pastWeek = new Date();
        pastWeek.setDate(now.getDate() - 7);
        if (tDate < pastWeek) return false;
      } else if (state.filterTimeframe === 'monthly') {
        const pastMonth = new Date();
        pastMonth.setDate(now.getDate() - 30);
        if (tDate < pastMonth) return false;
      }

      // Filtro por Tipo
      if (state.filterType !== 'all' && t.type !== state.filterType) return false;

      // Filtro por Categoria
      if (state.filterCategory !== 'all' && t.category_id !== state.filterCategory) return false;

      // Filtro por Texto de Pesquisa
      if (state.searchQuery) {
        const q = state.searchQuery.toLowerCase();
        const desc = t.description.toLowerCase();
        if (!desc.includes(q)) return false;
      }

      return true;
    });
  }

  // Calcula e Estrutura o detalhamento das Categorias com Porcentagem
  function getCategoryBreakdownData(totalExpense, filteredTx) {
    const expenseTx = filteredTx.filter(t => t.type === 'expense');
    const totals = {};

    expenseTx.forEach(t => {
      totals[t.category_id] = (totals[t.category_id] || 0) + parseFloat(t.amount);
    });

    return Object.keys(totals).map(catId => {
      const catObj = state.categories.find(c => c.id === catId) || {
        name: 'Outros',
        color: '#64748b',
        budget_limit: 0
      };
      const total = totals[catId];
      const percentage = totalExpense > 0 ? ((total / totalExpense) * 100).toFixed(1) : '0.0';
      return {
        id: catId,
        name: catObj.name,
        color: catObj.color || '#6366f1',
        total: total,
        percentage: parseFloat(percentage),
        budget_limit: catObj.budget_limit || 0
      };
    }).sort((a, b) => b.total - a.total);
  }

  // Renderiza a Lista Visual de Categorias com Barra de Progresso & %
  function renderCategoryPercentages(totalExpense, filteredTx) {
    const categoryData = getCategoryBreakdownData(totalExpense, filteredTx);

    if (categoryData.length === 0) {
      elements.categoryBreakdownList.innerHTML = `
        <div style="text-align: center; padding: 24px; color: var(--text-muted);">
          Nenhuma despesa registrada para calcular porcentagens.
        </div>
      `;
      return;
    }

    elements.categoryBreakdownList.innerHTML = categoryData.map(cat => `
      <div class="category-item">
        <div class="category-item-header">
          <div class="category-info">
            <span class="category-color-dot" style="background: ${cat.color};"></span>
            <span>${cat.name}</span>
          </div>
          <div class="category-values">
            <span class="category-amount">${formatCurrency(cat.total)}</span>
            <span class="category-percent">${cat.percentage}% do total</span>
          </div>
        </div>
        <div class="progress-bar-bg">
          <div class="progress-bar-fill" style="width: ${cat.percentage}%; background: ${cat.color};"></div>
        </div>
      </div>
    `).join('');
  }

  // Renderiza Tabela de Transações
  function renderTransactionsTable(transactions) {
    if (transactions.length === 0) {
      elements.transactionsTableBody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; padding: 28px; color: var(--text-muted);">
            Nenhuma transação encontrada para os filtros selecionados.
          </td>
        </tr>
      `;
      return;
    }

    elements.transactionsTableBody.innerHTML = transactions.map(t => {
      const catObj = state.categories.find(c => c.id === t.category_id) || { name: 'Sem Categoria', color: '#64748b' };
      const formattedDate = parseDateSafely(t.date).toLocaleDateString('pt-BR');
      const isIncome = t.type === 'income';

      return `
        <tr>
          <td>${formattedDate}</td>
          <td><strong>${escapeHtml(t.description)}</strong></td>
          <td>
            <span style="display: inline-flex; align-items: center; gap: 6px; font-weight: 600;">
              <span style="width: 8px; height: 8px; border-radius: 50%; background: ${catObj.color};"></span>
              ${catObj.name}
            </span>
          </td>
          <td>${t.payment_method || 'Pix'}</td>
          <td>
            <span class="type-pill ${isIncome ? 'income' : 'expense'}">
              ${isIncome ? 'Receita' : 'Despesa'}
            </span>
          </td>
          <td style="font-weight: 700; color: ${isIncome ? 'var(--accent-green)' : 'var(--accent-red)'}">
            ${isIncome ? '+' : '-'} ${formatCurrency(t.amount)}
          </td>
          <td>
            <div class="action-btn-group">
              <button class="action-btn edit edit-tx-btn" data-id="${t.id}" title="Editar Transação">
                <i class="fas fa-edit"></i>
              </button>
              <button class="action-btn delete delete-tx-btn" data-id="${t.id}" title="Excluir Transação">
                <i class="fas fa-trash"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    // Listener para botões de editar transação
    document.querySelectorAll('.edit-tx-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        const t = state.transactions.find(item => item.id === id);
        if (!t) return;

        document.getElementById('tx-edit-id').value = t.id;
        document.getElementById('tx-desc').value = t.description || '';
        document.getElementById('tx-amount').value = t.amount || '';
        setTxType(t.type || 'expense');
        document.getElementById('tx-category').value = t.category_id || (state.categories[0] ? state.categories[0].id : '');
        document.getElementById('tx-date').value = t.date ? t.date.split('T')[0] : new Date().toISOString().split('T')[0];
        document.getElementById('tx-payment').value = t.payment_method || 'Pix';

        const modalTitle = document.getElementById('modal-tx-title');
        const submitBtn = document.getElementById('btn-submit-tx');
        if (modalTitle) modalTitle.textContent = 'Editar Transação';
        if (submitBtn) submitBtn.textContent = 'Salvar Alterações';

        openModal(elements.modalTransaction);
      });
    });

    // Listener para botões de excluir transação
    document.querySelectorAll('.delete-tx-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        if (confirm('Tem certeza que deseja excluir esta transação?')) {
          await window.financeService.deleteTransaction(id);
          await loadData();
        }
      });
    });
  }

  // 3. GERENCIAMENTO DE CATEGORIAS E MODAIS
  const modalCategoriesList = document.getElementById('modal-categories-list');
  const categoriesTableBody = document.getElementById('categories-table-body');
  const btnCreateNewCat = document.getElementById('btn-create-new-cat');

  function renderCategoriesTable() {
    if (!categoriesTableBody) return;
    if (state.categories.length === 0) {
      categoriesTableBody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align: center; color: var(--text-muted); padding: 20px;">
            Nenhuma categoria cadastrada.
          </td>
        </tr>
      `;
      return;
    }

    categoriesTableBody.innerHTML = state.categories.map(c => `
      <tr>
        <td>
          <span style="display: inline-block; width: 14px; height: 14px; border-radius: 50%; background: ${c.color || '#6366f1'};"></span>
        </td>
        <td><strong>${escapeHtml(c.name)}</strong></td>
        <td>
          <span class="type-pill ${c.type === 'income' ? 'income' : 'expense'}">
            ${c.type === 'income' ? 'Receita' : 'Despesa'}
          </span>
        </td>
        <td>${c.budget_limit ? formatCurrency(c.budget_limit) : 'Sem limite'}</td>
        <td style="text-align: right;">
          <div class="action-btn-group" style="justify-content: flex-end;">
            <button class="action-btn edit edit-cat-btn" data-id="${c.id}" title="Editar Categoria">
              <i class="fas fa-edit"></i>
            </button>
            <button class="action-btn delete delete-cat-btn" data-id="${c.id}" title="Excluir Categoria">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </td>
      </tr>
    `).join('');

    // Listener para editar categoria
    document.querySelectorAll('.edit-cat-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.dataset.id;
        const cat = state.categories.find(item => item.id === id);
        if (!cat) return;

        document.getElementById('cat-edit-id').value = cat.id;
        document.getElementById('cat-name').value = cat.name || '';
        document.getElementById('cat-type').value = cat.type || 'expense';
        document.getElementById('cat-color').value = cat.color || '#6366f1';
        document.getElementById('cat-budget').value = cat.budget_limit || '';

        const modalTitle = document.getElementById('modal-cat-title');
        const submitBtn = document.getElementById('btn-submit-cat');
        if (modalTitle) modalTitle.textContent = 'Editar Categoria';
        if (submitBtn) submitBtn.textContent = 'Salvar Alterações';

        closeModal(modalCategoriesList);
        openModal(elements.modalCategory);
      });
    });

    // Listener para excluir categoria
    document.querySelectorAll('.delete-cat-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.currentTarget.dataset.id;
        if (confirm('Tem certeza que deseja excluir esta categoria? As transações associadas passarão a ser exibidas como "Sem Categoria".')) {
          await window.financeService.deleteCategory(id);
          await loadData();
          renderCategoriesTable();
        }
      });
    });
  }

  if (btnCreateNewCat) {
    btnCreateNewCat.addEventListener('click', () => {
      document.getElementById('cat-edit-id').value = '';
      elements.formCategory.reset();
      const modalTitle = document.getElementById('modal-cat-title');
      const submitBtn = document.getElementById('btn-submit-cat');
      if (modalTitle) modalTitle.textContent = 'Criar Nova Categoria';
      if (submitBtn) submitBtn.textContent = 'Salvar Categoria';
      closeModal(modalCategoriesList);
      openModal(elements.modalCategory);
    });
  }

  // -------------------------------------------------------
  // SELETOR DE TIPO: DESPESA / RECEITA
  // -------------------------------------------------------
  function setTxType(type) {
    const hiddenInput = document.getElementById('tx-type');
    const btnExpense  = document.getElementById('btn-type-expense');
    const btnIncome   = document.getElementById('btn-type-income');
    if (!hiddenInput || !btnExpense || !btnIncome) return;
    hiddenInput.value = type;
    if (type === 'income') {
      btnExpense.classList.remove('active');
      btnIncome.classList.add('active');
    } else {
      btnIncome.classList.remove('active');
      btnExpense.classList.add('active');
    }
  }

  const btnTypeExpense = document.getElementById('btn-type-expense');
  const btnTypeIncome  = document.getElementById('btn-type-income');
  if (btnTypeExpense) btnTypeExpense.addEventListener('click', () => setTxType('expense'));
  if (btnTypeIncome)  btnTypeIncome.addEventListener('click',  () => setTxType('income'));

  // Submissão do Formulário de Transação (Criar / Editar)
  elements.formTransaction.addEventListener('submit', async (e) => {
    e.preventDefault();
    const editId = document.getElementById('tx-edit-id').value;
    const desc = document.getElementById('tx-desc').value;
    const amount = document.getElementById('tx-amount').value;
    const type = document.getElementById('tx-type').value;
    const category_id = document.getElementById('tx-category').value;
    const date = document.getElementById('tx-date').value;
    const payment_method = document.getElementById('tx-payment').value;

    if (!desc || !amount || !category_id) {
      alert('Por favor, preencha os campos obrigatórios.');
      return;
    }

    const payload = {
      description: desc,
      amount: amount,
      type: type,
      category_id: category_id,
      date: date || new Date().toISOString().split('T')[0],
      payment_method: payment_method
    };

    if (editId) {
      payload.id = editId;
      await window.financeService.updateTransaction(payload);
    } else {
      await window.financeService.addTransaction(payload);
    }

    elements.formTransaction.reset();
    document.getElementById('tx-edit-id').value = '';
    setTxType('expense');
    closeModal(elements.modalTransaction);
    await loadData();
  });

  // Submissão do Formulário de Categoria (Criar / Editar)
  elements.formCategory.addEventListener('submit', async (e) => {
    e.preventDefault();
    const editId = document.getElementById('cat-edit-id').value;
    const name = document.getElementById('cat-name').value;
    const type = document.getElementById('cat-type').value;
    const color = document.getElementById('cat-color').value;
    const budget = document.getElementById('cat-budget').value;

    if (!name) return;

    const payload = {
      name: name,
      type: type,
      color: color,
      budget_limit: budget
    };

    if (editId) {
      payload.id = editId;
      await window.financeService.updateCategory(payload);
    } else {
      await window.financeService.addCategory(payload);
    }

    elements.formCategory.reset();
    document.getElementById('cat-edit-id').value = '';
    closeModal(elements.modalCategory);
    await loadData();
    if (modalCategoriesList && modalCategoriesList.classList.contains('active')) {
      renderCategoriesTable();
    }
  });

  // Configuração do Supabase
  elements.formSupabase.addEventListener('submit', (e) => {
    e.preventDefault();
    const url = document.getElementById('sp-url').value;
    const key = document.getElementById('sp-key').value;

    const success = window.financeService.saveCredentials(url, key);
    if (success) {
      alert('Credenciais salvas com sucesso! Conectado.');
    } else {
      alert('Modo Local (Demo) ativado.');
    }
    closeModal(elements.modalSupabase);
    loadData();
  });

  // Alternância de Tema (Claro / Escuro)
  const btnThemeToggle = document.getElementById('btn-theme-toggle');
  if (btnThemeToggle) {
    btnThemeToggle.addEventListener('click', () => {
      state.currentTheme = state.currentTheme === 'dark' ? 'light' : 'dark';
      updateThemeUI();
      renderApp();
    });
  }

  // Eventos de Seleção de Filtro por Período (Todos, Semanal, Mensal)
  document.querySelectorAll('.timeframe-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.timeframe-btn').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      state.filterTimeframe = e.target.getAttribute('data-time');
      renderApp();
    });
  });

  // Busca textual de transações
  document.getElementById('search-input').addEventListener('input', (e) => {
    state.searchQuery = e.target.value;
    renderApp();
  });

  // Filtro por categoria
  if (elements.filterCategorySelect) {
    elements.filterCategorySelect.addEventListener('change', (e) => {
      state.filterCategory = e.target.value;
      renderApp();
    });
  }

  // Geração de PDF (Semanal e Mensal)
  document.getElementById('btn-export-weekly-pdf').addEventListener('click', () => {
    window.pdfReportGenerator.generateReport('weekly', state.transactions, state.categories);
    closeModal(elements.modalPdf);
  });

  document.getElementById('btn-export-monthly-pdf').addEventListener('click', () => {
    window.pdfReportGenerator.generateReport('monthly', state.transactions, state.categories);
    closeModal(elements.modalPdf);
  });

  // Alternância do Olho Mágico (Ocultar / Mostrar Valores)
  const btnPrivacyToggle = document.getElementById('btn-privacy-toggle');
  if (btnPrivacyToggle) {
    btnPrivacyToggle.addEventListener('click', () => {
      state.hideValues = !state.hideValues;
      updatePrivacyUI();
      renderApp();
    });
  }

  // --- AUTENTICAÇÃO: MANIPULADORES DE EVENTOS ---
  if (elements.btnOpenAuthModal) {
    elements.btnOpenAuthModal.addEventListener('click', () => {
      openModal(elements.modalAuth);
    });
  }

  // Alternância de Abas (Entrar vs Criar Conta)
  if (elements.tabLogin && elements.tabRegister) {
    elements.tabLogin.addEventListener('click', () => {
      elements.tabLogin.classList.add('active');
      elements.tabRegister.classList.remove('active');
      elements.formLogin.style.display = 'flex';
      elements.formRegister.style.display = 'none';
      if (elements.authAlertLogin) elements.authAlertLogin.style.display = 'none';
    });

    elements.tabRegister.addEventListener('click', () => {
      elements.tabRegister.classList.add('active');
      elements.tabLogin.classList.remove('active');
      elements.formRegister.style.display = 'flex';
      elements.formLogin.style.display = 'none';
      if (elements.authAlertRegister) elements.authAlertRegister.style.display = 'none';
    });
  }

  // Submissão de Formulário de Login
  if (elements.formLogin) {
    elements.formLogin.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('login-email').value;
      const password = document.getElementById('login-password').value;
      const submitBtn = document.getElementById('btn-submit-login');

      try {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Autenticando...';
        elements.authAlertLogin.style.display = 'none';

        await window.financeService.signIn(email, password);
        closeModal(elements.modalAuth);
        elements.formLogin.reset();
        await loadData();
      } catch (err) {
        console.error('Erro ao realizar login:', err);
        elements.authAlertLogin.className = 'auth-alert error';

        let errorMessage = err.message || 'Falha ao realizar login. Verifique seu e-mail e senha.';
        if (errorMessage.includes('Invalid login credentials')) {
          errorMessage = 'E-mail ou senha incorretos. Se você acabou de criar sua conta, verifique se confirmou o e-mail na sua caixa de entrada (ou desative a confirmação de e-mail no painel do Supabase).';
        } else if (errorMessage.includes('Email not confirmed')) {
          errorMessage = 'Seu e-mail ainda não foi confirmado. Acesse sua caixa de entrada e clique no link de confirmação enviado pelo Supabase.';
        }

        elements.authAlertLogin.textContent = errorMessage;
        elements.authAlertLogin.style.display = 'block';
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> <span>Acessar Conta</span>';
      }
    });
  }

  // Submissão de Formulário de Cadastro
  if (elements.formRegister) {
    elements.formRegister.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('register-email').value;
      const password = document.getElementById('register-password').value;
      const confirmPassword = document.getElementById('register-confirm-password').value;
      const submitBtn = document.getElementById('btn-submit-register');

      if (password !== confirmPassword) {
        elements.authAlertRegister.className = 'auth-alert error';
        elements.authAlertRegister.textContent = 'As senhas não coincidem. Digite a mesma senha nos dois campos.';
        elements.authAlertRegister.style.display = 'block';
        return;
      }

      try {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Criando conta...';
        elements.authAlertRegister.style.display = 'none';

        const data = await window.financeService.signUp(email, password);
        elements.authAlertRegister.className = 'auth-alert success';
        if (data.session) {
          elements.authAlertRegister.textContent = 'Conta criada e autenticada com sucesso!';
          setTimeout(async () => {
            closeModal(elements.modalAuth);
            elements.formRegister.reset();
            await loadData();
          }, 1200);
        } else {
          elements.authAlertRegister.textContent = 'Conta criada com sucesso! Um e-mail de confirmação foi enviado. Verifique sua caixa de entrada (e SPAM) para confirmar a conta antes de fazer login.';
          const loginEmailInput = document.getElementById('login-email');
          if (loginEmailInput) loginEmailInput.value = email;
          setTimeout(() => {
            elements.tabLogin.click();
          }, 3500);
        }
        elements.authAlertRegister.style.display = 'block';
      } catch (err) {
        console.error('Erro ao cadastrar usuário:', err);
        elements.authAlertRegister.className = 'auth-alert error';

        let errorMessage = err.message || 'Erro ao criar conta no Supabase.';
        if (errorMessage.includes('email rate limit exceeded')) {
          errorMessage = 'Limite de envio de e-mails do Supabase excedido. Por favor, aguarde alguns minutos ou desative a opção "Confirm email" no painel do Supabase.';
        } else if (errorMessage.includes('User already registered')) {
          errorMessage = 'Este e-mail já está cadastrado no sistema. Tente fazer login ou use a opção de redefinição.';
        } else if (errorMessage.includes('Password should be at least')) {
          errorMessage = 'A senha deve conter no mínimo 6 caracteres.';
        }

        elements.authAlertRegister.textContent = errorMessage;
        elements.authAlertRegister.style.display = 'block';
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-user-plus"></i> <span>Criar Conta</span>';
      }
    });
  }

  // Alternância de Visibilidade da Senha (Olho Mágico)
  document.querySelectorAll('.btn-toggle-password').forEach(btn => {
    btn.addEventListener('click', () => {
      const input = btn.parentElement ? btn.parentElement.querySelector('input') : null;
      const icon = btn.querySelector('i');
      if (input) {
        if (input.type === 'password') {
          input.type = 'text';
          if (icon) icon.className = 'fas fa-eye-slash';
        } else {
          input.type = 'password';
          if (icon) icon.className = 'fas fa-eye';
        }
      }
    });
  });

  // Logout de Usuário
  if (elements.btnLogout) {
    elements.btnLogout.addEventListener('click', async () => {
      if (confirm('Deseja realmente sair da sua conta?')) {
        await window.financeService.signOut();
        await loadData();
      }
    });
  }

  // Listener de Auth State Change do Supabase
  if (window.financeService && window.financeService.onAuthStateChange) {
    window.financeService.onAuthStateChange(async (event, session) => {
      console.log('🔄 Auth State Event:', event);
      await checkAuthState();
    });
  }

  // Abertura/Fechamento de Modais (verificações seguras contra null)
  const legacyTxBtn = document.getElementById('btn-open-tx-modal');
  if (legacyTxBtn) {
    legacyTxBtn.addEventListener('click', () => {
      document.getElementById('tx-date').value = new Date().toISOString().split('T')[0];
      openModal(elements.modalTransaction);
    });
  }

  const legacyCatBtn = document.getElementById('btn-open-cat-modal');
  if (legacyCatBtn) {
    legacyCatBtn.addEventListener('click', () => {
      openModal(elements.modalCategory);
    });
  }

  const legacyPdfBtn = document.getElementById('btn-open-pdf-modal');
  if (legacyPdfBtn) {
    legacyPdfBtn.addEventListener('click', () => {
      openModal(elements.modalPdf);
    });
  }

  // ==========================================================================
  // CÁLCULO & EXIBIÇÃO: ONDE MAIS GASTEI NESTA SEMANA (ÚLTIMOS 7 DIAS)
  // ==========================================================================
  function updateWeeklyHighlights() {
    const weeklySingleAmount = document.getElementById('weekly-top-single-amount');
    const weeklySingleDesc = document.getElementById('weekly-top-single-desc');
    const weeklySingleTag = document.getElementById('weekly-top-single-tag');

    const weeklyCatAmount = document.getElementById('weekly-top-cat-amount');
    const weeklyCatName = document.getElementById('weekly-top-cat-name');
    const weeklyCatPercent = document.getElementById('weekly-top-cat-percent');

    const weeklyDayName = document.getElementById('weekly-top-day-name');
    const weeklyDayAmount = document.getElementById('weekly-top-day-amount');
    const weeklyDayBadge = document.getElementById('weekly-top-day-badge');

    const rankingContainer = document.getElementById('weekly-top-ranking-list');

    // Transações de despesas nos últimos 7 dias
    const today = new Date();
    const past7Days = new Date();
    past7Days.setDate(today.getDate() - 7);

    const weeklyExpenses = state.transactions.filter(t => {
      if (t.type !== 'expense') return false;
      const tDate = parseDateSafely(t.date);
      return tDate >= past7Days && tDate <= today;
    });

    const totalWeeklyExpenseSum = weeklyExpenses.reduce((sum, t) => sum + parseFloat(t.amount), 0);

    if (weeklyExpenses.length === 0) {
      if (weeklySingleAmount) weeklySingleAmount.textContent = formatCurrency(0);
      if (weeklySingleDesc) weeklySingleDesc.textContent = 'Nenhum gasto nos últimos 7 dias';
      if (weeklySingleTag) weeklySingleTag.textContent = 'Sem registros';

      if (weeklyCatAmount) weeklyCatAmount.textContent = formatCurrency(0);
      if (weeklyCatName) weeklyCatName.textContent = 'Nenhuma categoria';
      if (weeklyCatPercent) weeklyCatPercent.textContent = '0% dos gastos da semana';

      if (weeklyDayName) weeklyDayName.textContent = '--';
      if (weeklyDayAmount) weeklyDayAmount.textContent = 'Total: R$ 0,00';
      if (weeklyDayBadge) weeklyDayBadge.textContent = 'Sem pico registrado';

      if (rankingContainer) {
        rankingContainer.innerHTML = `
          <div style="text-align: center; color: var(--text-muted); padding: 18px; font-size: 0.88rem; background: rgba(255, 255, 255, 0.02); border-radius: 8px;">
            <i class="fas fa-info-circle" style="color: var(--accent-primary); margin-right: 6px;"></i>
            Nenhuma despesa encontrada nos últimos 7 dias. Importe seu extrato bancário para visualizar os maiores gastos!
          </div>`;
      }
      return;
    }

    // 1. Maior Gasto Individual da Semana
    const sortedByAmount = [...weeklyExpenses].sort((a, b) => parseFloat(b.amount) - parseFloat(a.amount));
    const topSingle = sortedByAmount[0];
    const topSingleCat = state.categories.find(c => c.id === topSingle.category_id);

    if (weeklySingleAmount) weeklySingleAmount.textContent = formatCurrency(parseFloat(topSingle.amount));
    if (weeklySingleDesc) weeklySingleDesc.textContent = topSingle.description;
    if (weeklySingleTag) weeklySingleTag.textContent = `${topSingleCat ? topSingleCat.name : 'Despesa'} • ${formatDateBR(topSingle.date)}`;

    // 2. Categoria Campeã da Semana
    const categorySums = {};
    weeklyExpenses.forEach(t => {
      categorySums[t.category_id] = (categorySums[t.category_id] || 0) + parseFloat(t.amount);
    });

    let topCatId = null;
    let topCatMax = 0;
    Object.keys(categorySums).forEach(catId => {
      if (categorySums[catId] > topCatMax) {
        topCatMax = categorySums[catId];
        topCatId = catId;
      }
    });

    const topCatObj = state.categories.find(c => c.id === topCatId) || { name: 'Compras', color: '#6366f1' };
    const topCatPercent = totalWeeklyExpenseSum > 0 ? ((topCatMax / totalWeeklyExpenseSum) * 100).toFixed(1) : '0';

    if (weeklyCatAmount) weeklyCatAmount.textContent = formatCurrency(topCatMax);
    if (weeklyCatName) weeklyCatName.textContent = topCatObj.name;
    if (weeklyCatPercent) weeklyCatPercent.textContent = `${topCatPercent}% de todos os gastos da semana`;

    // 3. Dia de Maior Pico de Despesas
    const daySums = {};
    weeklyExpenses.forEach(t => {
      daySums[t.date] = (daySums[t.date] || 0) + parseFloat(t.amount);
    });

    let topDayDate = null;
    let topDayMax = 0;
    Object.keys(daySums).forEach(d => {
      if (daySums[d] > topDayMax) {
        topDayMax = daySums[d];
        topDayDate = d;
      }
    });

    if (topDayDate) {
      const dObj = parseDateSafely(topDayDate);
      const dayNameFormatted = dObj.toLocaleDateString('pt-BR', { weekday: 'long' });
      const dayCapitalized = dayNameFormatted.charAt(0).toUpperCase() + dayNameFormatted.slice(1);

      if (weeklyDayName) weeklyDayName.textContent = dayCapitalized;
      if (weeklyDayAmount) weeklyDayAmount.textContent = `Total no dia: ${formatCurrency(topDayMax)}`;
      if (weeklyDayBadge) weeklyDayBadge.textContent = `${formatDateBR(topDayDate)} (Pico Semanal)`;
    }

    // 4. Ranking Top 5 Gastos da Semana
    const top5 = sortedByAmount.slice(0, 5);
    const maxValForBar = parseFloat(top5[0].amount) || 1;

    if (rankingContainer) {
      rankingContainer.innerHTML = top5.map((item, index) => {
        const cat = state.categories.find(c => c.id === item.category_id);
        const percentBar = ((parseFloat(item.amount) / maxValForBar) * 100).toFixed(1);
        const catName = cat ? cat.name : 'Outros';
        const rankClass = index === 0 ? 'top-1' : '';

        return `
          <div class="weekly-ranking-item">
            <div class="weekly-ranking-rank ${rankClass}">#${index + 1}</div>
            <div class="weekly-ranking-info">
              <div class="weekly-ranking-title-row">
                <span class="weekly-ranking-title" title="${escapeHtml(item.description)}">${escapeHtml(item.description)} <small style="color: var(--text-muted); font-weight: normal;">(${catName} • ${formatDateBR(item.date)})</small></span>
                <span class="weekly-ranking-amount">${formatCurrency(parseFloat(item.amount))}</span>
              </div>
              <div class="weekly-ranking-bar-bg">
                <div class="weekly-ranking-bar-fill" style="width: ${percentBar}%;"></div>
              </div>
            </div>
          </div>
        `;
      }).join('');
    }
  }

  function formatDateBR(dateStr) {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}`;
    return dateStr;
  }

  // ==========================================================================
  // EVENTOS & CONTROLADORES DA MODAL DE BANCO E IMPORTAÇÃO (SOMENTE LEITURA)
  // ==========================================================================
  let parsedBankTransactions = [];

  const btnOpenBankModal = document.getElementById('btn-open-bank-modal');
  const navBankSync = document.getElementById('nav-bank-sync');
  const modalBankImport = document.getElementById('modal-bank-import');
  const tabBankFile = document.getElementById('tab-bank-file');
  const tabBankOpenfinance = document.getElementById('tab-bank-openfinance');
  const panelBankFile = document.getElementById('panel-bank-file');
  const panelBankOpenfinance = document.getElementById('panel-bank-openfinance');
  const bankFileInput = document.getElementById('bank-file-input');
  const importDropzone = document.getElementById('import-dropzone');
  const bankPasteInput = document.getElementById('bank-paste-input');
  const btnParsePaste = document.getElementById('btn-parse-paste');
  const importPreviewContainer = document.getElementById('import-preview-container');
  const importPreviewBody = document.getElementById('import-preview-body');
  const importCount = document.getElementById('import-count');
  const checkAllImports = document.getElementById('check-all-imports');
  const btnSaveImports = document.getElementById('btn-save-imports');

  // Abrir Modal de Banco
  if (btnOpenBankModal) {
    btnOpenBankModal.addEventListener('click', () => openModal(modalBankImport));
  }
  if (navBankSync) {
    navBankSync.addEventListener('click', () => openModal(modalBankImport));
  }

  // Alternar Abas na Modal de Banco
  if (tabBankFile && tabBankOpenfinance) {
    tabBankFile.addEventListener('click', () => {
      tabBankFile.classList.add('active');
      tabBankOpenfinance.classList.remove('active');
      panelBankFile.style.display = 'block';
      panelBankOpenfinance.style.display = 'none';
    });

    tabBankOpenfinance.addEventListener('click', () => {
      tabBankOpenfinance.classList.add('active');
      tabBankFile.classList.remove('active');
      panelBankOpenfinance.style.display = 'block';
      panelBankFile.style.display = 'none';
    });
  }

  // Upload de Arquivos OFX / CSV
  if (bankFileInput) {
    bankFileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) processBankFile(file);
    });
  }

  // Botão "Selecionar Arquivo" — listener via JS (onclick inline removido para compatibilidade com Safari CSP)
  var btnSelectBankFile = document.getElementById('btn-select-bank-file');
  if (btnSelectBankFile && bankFileInput) {
    btnSelectBankFile.addEventListener('click', function() {
      bankFileInput.click();
    });
  }

  // Drag & Drop no Dropzone
  if (importDropzone) {
    importDropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      importDropzone.style.borderColor = 'var(--accent-primary)';
    });

    importDropzone.addEventListener('dragleave', () => {
      importDropzone.style.borderColor = 'rgba(99, 102, 241, 0.4)';
    });

    importDropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      importDropzone.style.borderColor = 'rgba(99, 102, 241, 0.4)';
      const file = e.dataTransfer.files[0];
      if (file) processBankFile(file);
    });
  }

  function processBankFile(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target.result;
      const fileName = file.name.toLowerCase();

      if (fileName.endsWith('.ofx')) {
        parsedBankTransactions = window.bankService.parseOFX(content, state.categories);
      } else if (fileName.endsWith('.csv') || fileName.endsWith('.txt')) {
        parsedBankTransactions = window.bankService.parseCSV(content, state.categories);
      } else {
        parsedBankTransactions = window.bankService.parsePastedText(content, state.categories);
      }

      renderImportPreview();
    };
    reader.readAsText(file);
  }

  // Processar Texto Colado do Extrato
  if (btnParsePaste && bankPasteInput) {
    btnParsePaste.addEventListener('click', () => {
      const text = bankPasteInput.value.trim();
      if (!text) {
        alert('Cole o texto do extrato ou fatura bancária no campo para processar.');
        return;
      }
      parsedBankTransactions = window.bankService.parsePastedText(text, state.categories);
      renderImportPreview();
    });
  }

  // Sincronizar via Open Finance (Seleção de Bancos)
  document.querySelectorAll('.bank-select-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const bankId = btn.dataset.bank;
      
      const originalText = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i><span>Consultando...</span>`;

      try {
        parsedBankTransactions = await window.bankService.fetchOpenFinanceTransactions(bankId, state.categories);
        renderImportPreview();
      } catch (err) {
        alert('Erro ao consultar Open Finance: ' + err.message);
      } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
      }
    });
  });

  // Renderizar Tabela de Preview dos Lançamentos Encontrados
  function renderImportPreview() {
    if (!importPreviewContainer || !importPreviewBody) return;

    if (parsedBankTransactions.length === 0) {
      alert('Nenhuma transação foi identificada no arquivo/texto informado. Verifique o formato e tente novamente.');
      importPreviewContainer.style.display = 'none';
      return;
    }

    importCount.textContent = parsedBankTransactions.length;
    importPreviewContainer.style.display = 'block';

    importPreviewBody.innerHTML = parsedBankTransactions.map((tx, idx) => {
      const isExpense = tx.type === 'expense';
      const amountColor = isExpense ? 'var(--accent-red)' : 'var(--accent-green)';
      const sign = isExpense ? '-' : '+';

      return `
        <tr>
          <td style="text-align: center;">
            <input type="checkbox" class="check-import-item" data-index="${idx}" ${tx.selected ? 'checked' : ''}>
          </td>
          <td>${formatDateBR(tx.date)}</td>
          <td><strong>${escapeHtml(tx.description)}</strong></td>
          <td style="color: ${amountColor}; font-weight: 700;">${sign} ${formatCurrency(tx.amount)}</td>
          <td>
            <select class="form-control select-import-cat" data-index="${idx}" style="padding: 4px 8px; font-size: 0.8rem;">
              ${state.categories.map(c => `<option value="${c.id}" ${c.id === tx.category_id ? 'selected' : ''}>${c.name}</option>`).join('')}
            </select>
          </td>
          <td style="text-align: center;">
            <button type="button" class="action-btn delete btn-remove-import" data-index="${idx}" title="Remover este lançamento">
              <i class="fas fa-trash"></i>
            </button>
          </td>
        </tr>
      `;
    }).join('');

    // Eventos de Checkbox, Categoria e Remoção
    document.querySelectorAll('.check-import-item').forEach(chk => {
      chk.addEventListener('change', (e) => {
        const idx = e.target.dataset.index;
        parsedBankTransactions[idx].selected = e.target.checked;
      });
    });

    document.querySelectorAll('.select-import-cat').forEach(sel => {
      sel.addEventListener('change', (e) => {
        const idx = e.target.dataset.index;
        parsedBankTransactions[idx].category_id = e.target.value;
      });
    });

    document.querySelectorAll('.btn-remove-import').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(e.currentTarget.dataset.index, 10);
        parsedBankTransactions.splice(idx, 1);
        renderImportPreview();
      });
    });
  }

  // Marcar/Desmarcar Todos
  if (checkAllImports) {
    checkAllImports.addEventListener('change', (e) => {
      const isChecked = e.target.checked;
      parsedBankTransactions.forEach(tx => tx.selected = isChecked);
      document.querySelectorAll('.check-import-item').forEach(chk => chk.checked = isChecked);
    });
  }

  // Salvar Transações Selecionadas no Supabase / LocalStorage
  if (btnSaveImports) {
    btnSaveImports.addEventListener('click', async () => {
      const selected = parsedBankTransactions.filter(tx => tx.selected);

      if (selected.length === 0) {
        alert('Selecione pelo menos uma transação para importar.');
        return;
      }

      btnSaveImports.disabled = true;
      btnSaveImports.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Salvando...`;

      try {
        let countSaved = 0;
        for (const tx of selected) {
          const newTxData = {
            description: tx.description,
            amount: parseFloat(tx.amount),
            type: tx.type,
            category_id: tx.category_id,
            date: tx.date,
            payment_method: tx.payment_method || 'Cartão de Débito'
          };

          await window.financeService.addTransaction(newTxData);
          countSaved++;
        }

        alert(`✅ ${countSaved} transações foram importadas e registradas com sucesso!`);
        closeModal(modalBankImport);
        
        // Reseta o estado do modal
        parsedBankTransactions = [];
        importPreviewContainer.style.display = 'none';
        if (bankPasteInput) bankPasteInput.value = '';

        // Recarrega todos os dados
        await loadData();
      } catch (err) {
        console.error('Erro ao importar transações:', err);
        alert('Ocorreu um erro ao salvar as transações: ' + err.message);
      } finally {
        btnSaveImports.disabled = false;
        btnSaveImports.innerHTML = `<i class="fas fa-download"></i> Confirmar Importação`;
      }
    });
  }

  elements.supabaseStatusBtn.addEventListener('click', () => {
    document.getElementById('sp-url').value = safeGetItem('novo_controle_sp_url') || 'https://jmbeyxsdjkibqhqcizcz.supabase.co';
    document.getElementById('sp-key').value = safeGetItem('novo_controle_sp_key') || 'sb_publishable_3dQhzQuU1cPdEzKGi1WYSQ_84NIpVnF';
    openModal(elements.modalSupabase);
  });

  // Botões do Cabeçalho e Navegação Lateral
  function openTxModalWithType(type) {
    document.getElementById('tx-edit-id').value = '';
    elements.formTransaction.reset();
    document.getElementById('tx-date').value = new Date().toISOString().split('T')[0];
    setTxType(type);
    const modalTitle = document.getElementById('modal-tx-title');
    const submitBtn = document.getElementById('btn-submit-tx');
    if (modalTitle) modalTitle.textContent = type === 'income' ? 'Adicionar Receita' : 'Adicionar Despesa';
    if (submitBtn) submitBtn.textContent = 'Salvar';
    openModal(elements.modalTransaction);
  }

  const btnOpenTxModal = document.getElementById('btn-open-tx-modal');
  if (btnOpenTxModal) {
    btnOpenTxModal.addEventListener('click', () => openTxModalWithType('expense'));
  }


  const btnOpenCatModal = document.getElementById('btn-open-cat-modal');
  if (btnOpenCatModal) {
    btnOpenCatModal.addEventListener('click', () => {
      renderCategoriesTable();
      openModal(modalCategoriesList);
    });
  }

  const btnOpenPdfModal = document.getElementById('btn-open-pdf-modal');
  if (btnOpenPdfModal) {
    btnOpenPdfModal.addEventListener('click', () => {
      openModal(elements.modalPdf);
    });
  }

  const navCategories = document.getElementById('nav-categories');
  if (navCategories) {
    navCategories.addEventListener('click', () => {
      renderCategoriesTable();
      openModal(modalCategoriesList);
    });
  }

  const navTransactions = document.getElementById('nav-transactions');
  if (navTransactions) {
    navTransactions.addEventListener('click', function() {
      var txSection = document.querySelector('.transactions-section');
      if (txSection) safeSmoothScrollIntoView(txSection);
    });
  }

  const navDashboard = document.getElementById('nav-dashboard');
  if (navDashboard) {
    navDashboard.addEventListener('click', function() {
      safeSmoothScrollTo(0);
    });
  }

  document.querySelectorAll('.modal-close, .btn-modal-cancel').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const modal = e.target.closest('.modal-overlay');
      closeModal(modal);
    });
  });

  function openModal(modal) {
    if (modal) {
      modal.classList.add('active');
      modal.style.opacity = '1';
      modal.style.visibility = 'visible';
      if (modal.id === 'modal-transaction') {
        modal.style.display = 'flex';
      }
    }
  }

  function closeModal(modal) {
    if (modal === elements.modalAuth && elements.modalAuth.classList.contains('forced-auth')) {
      return; // Impede o fechamento se o usuário não estiver logado
    }
    if (modal) {
      modal.classList.remove('active');
      modal.style.opacity = '';
      modal.style.visibility = '';
      if (modal.id === 'modal-transaction') {
        modal.style.display = '';
      }
    }
  }

  // Funções Auxiliares
  function formatCurrency(val) {
    if (state.hideValues) {
      return 'R$ ••••••';
    }
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  }

  function escapeHtml(str) {
    return str.replace(/[&<>"']/g, function(m) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m];
    });
  }

  // Controladores do Menu Lateral Mobile (Off-Canvas Drawer)
  const sidebar = document.getElementById('sidebar');
  const sidebarOverlay = document.getElementById('sidebar-overlay');
  const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
  const mobileMenuClose = document.getElementById('mobile-menu-close');
  const mobileQuickTxBtn = document.getElementById('mobile-quick-tx-btn');

  function openMobileSidebar() {
    if (sidebar) sidebar.classList.add('mobile-open');
    if (sidebarOverlay) sidebarOverlay.classList.add('active');
  }

  function closeMobileSidebar() {
    if (sidebar) sidebar.classList.remove('mobile-open');
    if (sidebarOverlay) sidebarOverlay.classList.remove('active');
  }

  if (mobileMenuToggle) {
    mobileMenuToggle.addEventListener('click', openMobileSidebar);
  }

  if (mobileMenuClose) {
    mobileMenuClose.addEventListener('click', closeMobileSidebar);
  }

  if (sidebarOverlay) {
    sidebarOverlay.addEventListener('click', closeMobileSidebar);
  }

  // Fechar sidebar ao clicar em qualquer item do menu no mobile
  document.querySelectorAll('.nav-menu button').forEach(navBtn => {
    navBtn.addEventListener('click', () => {
      closeMobileSidebar();
    });
  });

  // Botão rápido de adicionar transação no cabeçalho mobile
  if (mobileQuickTxBtn) {
    mobileQuickTxBtn.addEventListener('click', () => openTxModalWithType('expense'));
  }

  // Registro do Service Worker para suporte PWA
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').catch(err => {
        console.warn('Falha ao registrar Service Worker:', err);
      });
    });
  }

  // Inicializa o app
  await loadData();
});

