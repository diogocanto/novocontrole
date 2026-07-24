/**
 * MAIN APP CONTROLLER
 * Gerenciador principal de estado, eventos da interface e cálculos de finanças
 */

document.addEventListener('DOMContentLoaded', async () => {
  // Estado da Aplicação
  const state = {
    categories: [],
    transactions: [],
    filterTimeframe: 'all', // 'all', 'weekly', 'monthly'
    filterType: 'all',      // 'all', 'expense', 'income'
    filterCategory: 'all',
    searchQuery: '',
    currentTheme: localStorage.getItem('novo_controle_theme') || 'dark',
    hideValues: localStorage.getItem('novo_controle_hide_values') === 'true'
  };

  // Aplica tema salvo
  function updateThemeUI() {
    document.documentElement.setAttribute('data-theme', state.currentTheme);
    localStorage.setItem('novo_controle_theme', state.currentTheme);
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
    localStorage.setItem('novo_controle_hide_values', state.hideValues);
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
    state.categories = await window.financeService.getCategories();
    state.transactions = await window.financeService.getTransactions();
    
    updateSupabaseStatusUI();
    await checkAuthState();
    populateCategoryDropdowns();
    renderApp();
  }

  // Verifica estado de autenticação do usuário
  async function checkAuthState() {
    const user = await window.financeService.getCurrentUser();
    if (user && user.email) {
      if (elements.btnOpenAuthModal) elements.btnOpenAuthModal.style.display = 'none';
      if (elements.userInfoLogged) elements.userInfoLogged.style.display = 'flex';
      if (elements.userEmailDisplay) elements.userEmailDisplay.textContent = user.email;
      if (elements.userAvatarInitials) elements.userAvatarInitials.textContent = user.email.charAt(0).toUpperCase();
    } else {
      if (elements.btnOpenAuthModal) elements.btnOpenAuthModal.style.display = 'flex';
      if (elements.userInfoLogged) elements.userInfoLogged.style.display = 'none';
    }
  }

  // Atualiza indicador visual do Supabase no sidebar
  function updateSupabaseStatusUI() {
    const isConnected = window.financeService.isSupabaseConnected;
    if (isConnected) {
      elements.supabaseStatusDot.className = 'status-dot';
      elements.supabaseStatusText.textContent = 'Supabase Conectado';
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
  }

  // Filtra transações por período, tipo, categoria e busca
  function getFilteredTransactions() {
    const now = new Date();
    return state.transactions.filter(t => {
      const tDate = new Date(t.date + 'T00:00:00');
      
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
          <td colspan="6" style="text-align: center; padding: 28px; color: var(--text-muted);">
            Nenhuma transação encontrada para os filtros selecionados.
          </td>
        </tr>
      `;
      return;
    }

    elements.transactionsTableBody.innerHTML = transactions.map(t => {
      const catObj = state.categories.find(c => c.id === t.category_id) || { name: 'Sem Categoria', color: '#64748b' };
      const formattedDate = new Date(t.date + 'T00:00:00').toLocaleDateString('pt-BR');
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
              <button class="action-btn delete" data-id="${t.id}" title="Excluir">
                <i class="fas fa-trash"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    // Listener para botões de excluir
    document.querySelectorAll('.action-btn.delete').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        if (confirm('Tem certeza que deseja excluir esta transação?')) {
          await window.financeService.deleteTransaction(id);
          await loadData();
        }
      });
    });
  }

  // 3. EVENT LISTENERS E GERENCIAMENTO DE MODAIS
  // Submissão do Formulário de Nova Transação
  elements.formTransaction.addEventListener('submit', async (e) => {
    e.preventDefault();
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

    await window.financeService.addTransaction({
      description: desc,
      amount: amount,
      type: type,
      category_id: category_id,
      date: date || new Date().toISOString().split('T')[0],
      payment_method: payment_method
    });

    elements.formTransaction.reset();
    closeModal(elements.modalTransaction);
    await loadData();
  });

  // Submissão do Formulário de Nova Categoria
  elements.formCategory.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('cat-name').value;
    const type = document.getElementById('cat-type').value;
    const color = document.getElementById('cat-color').value;
    const budget = document.getElementById('cat-budget').value;

    if (!name) return;

    await window.financeService.addCategory({
      name: name,
      type: type,
      color: color,
      budget_limit: budget
    });

    elements.formCategory.reset();
    closeModal(elements.modalCategory);
    await loadData();
  });

  // Configuração do Supabase
  elements.formSupabase.addEventListener('submit', (e) => {
    e.preventDefault();
    const url = document.getElementById('sp-url').value;
    const key = document.getElementById('sp-key').value;

    const success = window.financeService.saveCredentials(url, key);
    if (success) {
      alert('Credenciais salvas com sucesso! Supabase Conectado.');
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

  if (elements.btnGuestMode) {
    elements.btnGuestMode.addEventListener('click', () => {
      closeModal(elements.modalAuth);
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
        elements.authAlertLogin.textContent = err.message || 'Falha ao realizar login. Verifique seu e-mail e senha.';
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
          elements.authAlertRegister.textContent = 'Conta criada com sucesso! Caso o Supabase exija confirmação de e-mail, verifique sua caixa de entrada antes de fazer login.';
          setTimeout(() => {
            elements.tabLogin.click();
          }, 2500);
        }
        elements.authAlertRegister.style.display = 'block';
      } catch (err) {
        console.error('Erro ao cadastrar usuário:', err);
        elements.authAlertRegister.className = 'auth-alert error';
        elements.authAlertRegister.textContent = err.message || 'Erro ao criar conta no Supabase.';
        elements.authAlertRegister.style.display = 'block';
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-user-plus"></i> <span>Criar Conta no Supabase</span>';
      }
    });
  }

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

  // Abertura/Fechamento de Modais
  document.getElementById('btn-open-tx-modal').addEventListener('click', () => {
    document.getElementById('tx-date').value = new Date().toISOString().split('T')[0];
    openModal(elements.modalTransaction);
  });

  document.getElementById('btn-open-cat-modal').addEventListener('click', () => {
    openModal(elements.modalCategory);
  });

  document.getElementById('btn-open-pdf-modal').addEventListener('click', () => {
    openModal(elements.modalPdf);
  });

  elements.supabaseStatusBtn.addEventListener('click', () => {
    document.getElementById('sp-url').value = localStorage.getItem('novo_controle_sp_url') || 'https://jmbeyxsdjkibqhqcizcz.supabase.co';
    document.getElementById('sp-key').value = localStorage.getItem('novo_controle_sp_key') || 'sb_publishable_3dQhzQuU1cPdEzKGi1WYSQ_84NIpVnF';
    openModal(elements.modalSupabase);
  });

  document.querySelectorAll('.modal-close, .btn-modal-cancel').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const modal = e.target.closest('.modal-overlay');
      closeModal(modal);
    });
  });

  function openModal(modal) {
    if (modal) modal.classList.add('active');
  }

  function closeModal(modal) {
    if (modal) modal.classList.remove('active');
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
    mobileQuickTxBtn.addEventListener('click', () => {
      document.getElementById('tx-date').value = new Date().toISOString().split('T')[0];
      openModal(elements.modalTransaction);
    });
  }

  // Inicializa o app
  await loadData();
});

