/**
 * SUPABASE CLIENT & LOCAL STORAGE FALLBACK MODULE
 * Suporta sincronização com Supabase (PostgreSQL) e armazenamento LocalStorage
 */

const STORAGE_KEYS = {
  SUPABASE_URL: 'novo_controle_sp_url',
  SUPABASE_KEY: 'novo_controle_sp_key',
  TRANSACTIONS: 'novo_controle_transactions_v1',
  CATEGORIES: 'novo_controle_categories_v1'
};

// Safe Storage Wrapper com fallback em memória para iOS Safari (Navegação Privada / Restrições Iframe)
const memoryStorage = {};
const safeStorage = {
  getItem(key) {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      console.warn('⚠️ LocalStorage inacessível (Safari Privado):', e);
      return memoryStorage[key] || null;
    }
  },
  setItem(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      console.warn('⚠️ LocalStorage não pôde ser gravado, salvando em memória:', e);
      memoryStorage[key] = value;
    }
  },
  removeItem(key) {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      delete memoryStorage[key];
    }
  }
};

// Categorias iniciais padrão caso rode em modo local
const DEFAULT_CATEGORIES = [
  { id: 'cat-1', name: 'Alimentação', type: 'expense', color: '#ef4444', icon: 'utensils', budget_limit: 1500 },
  { id: 'cat-2', name: 'Moradia', type: 'expense', color: '#3b82f6', icon: 'home', budget_limit: 2500 },
  { id: 'cat-3', name: 'Transporte', type: 'expense', color: '#f59e0b', icon: 'car', budget_limit: 800 },
  { id: 'cat-4', name: 'Lazer & Entretenimento', type: 'expense', color: '#ec4899', icon: 'film', budget_limit: 500 },
  { id: 'cat-5', name: 'Saúde & Cuidados', type: 'expense', color: '#10b981', icon: 'activity', budget_limit: 600 },
  { id: 'cat-6', name: 'Educação', type: 'expense', color: '#8b5cf6', icon: 'book', budget_limit: 700 },
  { id: 'cat-7', name: 'Compras Gerais', type: 'expense', color: '#64748b', icon: 'shopping-bag', budget_limit: 600 },
  { id: 'cat-8', name: 'Salário & Rendimentos', type: 'income', color: '#10b981', icon: 'dollar-sign', budget_limit: 0 },
  { id: 'cat-9', name: 'Investimentos', type: 'income', color: '#06b6d4', icon: 'trending-up', budget_limit: 0 }
];

// Dados iniciais de demonstração (transações para testar porcentagens imediatamente)
const DEFAULT_TRANSACTIONS = [
  {
    id: 'tx-1',
    description: 'Supermercado Mensal',
    amount: 850.50,
    type: 'expense',
    category_id: 'cat-1',
    date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    payment_method: 'Cartão de Crédito'
  },
  {
    id: 'tx-2',
    description: 'Aluguel do Apê',
    amount: 1800.00,
    type: 'expense',
    category_id: 'cat-2',
    date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    payment_method: 'Pix'
  },
  {
    id: 'tx-3',
    description: 'Combustível Posto Shell',
    amount: 220.00,
    type: 'expense',
    category_id: 'cat-3',
    date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    payment_method: 'Débito'
  },
  {
    id: 'tx-4',
    description: 'Cinema & Jantar',
    amount: 140.00,
    type: 'expense',
    category_id: 'cat-4',
    date: new Date().toISOString().split('T')[0],
    payment_method: 'Pix'
  },
  {
    id: 'tx-5',
    description: 'Salário Empresa XYZ',
    amount: 5500.00,
    type: 'income',
    category_id: 'cat-8',
    date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    payment_method: 'Depósito'
  }
];

const DEFAULT_SUPABASE_URL = 'https://jmbeyxsdjkibqhqcizcz.supabase.co';
const DEFAULT_SUPABASE_KEY = 'sb_publishable_3dQhzQuU1cPdEzKGi1WYSQ_84NIpVnF';

function isUUID(str) {
  return typeof str === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

class FinanceService {
  constructor() {
    this.supabase = null;
    this.isSupabaseConnected = false;
    this.initSupabaseClient();
  }

  initSupabaseClient() {
    let url = safeStorage.getItem(STORAGE_KEYS.SUPABASE_URL);
    let key = safeStorage.getItem(STORAGE_KEYS.SUPABASE_KEY);

    // Se as chaves não estiverem no storage ou forem inválidas, garante o uso das chaves padrão do projeto
    if (!url || !url.startsWith('http') || !key || key === 'undefined' || key === 'null') {
      url = DEFAULT_SUPABASE_URL;
      key = DEFAULT_SUPABASE_KEY;
      safeStorage.setItem(STORAGE_KEYS.SUPABASE_URL, url);
      safeStorage.setItem(STORAGE_KEYS.SUPABASE_KEY, key);
    }

    if (url && key && window.supabase) {
      try {
        this.supabase = window.supabase.createClient(url, key);
        this.isSupabaseConnected = true;
        console.log('✅ Supabase conectado com sucesso!');
      } catch (err) {
        console.warn('⚠️ Falha ao inicializar Supabase, usando chaves padrão:', err);
        try {
          this.supabase = window.supabase.createClient(DEFAULT_SUPABASE_URL, DEFAULT_SUPABASE_KEY);
          this.isSupabaseConnected = true;
          safeStorage.setItem(STORAGE_KEYS.SUPABASE_URL, DEFAULT_SUPABASE_URL);
          safeStorage.setItem(STORAGE_KEYS.SUPABASE_KEY, DEFAULT_SUPABASE_KEY);
        } catch (e) {
          this.isSupabaseConnected = false;
        }
      }
    } else {
      this.isSupabaseConnected = false;
    }
  }

  ensureConnected() {
    if (!this.isSupabaseConnected && window.supabase) {
      this.initSupabaseClient();
    }
    return this.isSupabaseConnected;
  }

  saveCredentials(url, key) {
    if (!url || !key) return false;
    safeStorage.setItem(STORAGE_KEYS.SUPABASE_URL, url.trim());
    safeStorage.setItem(STORAGE_KEYS.SUPABASE_KEY, key.trim());
    this.initSupabaseClient();
    return this.isSupabaseConnected;
  }

  // --- AUTENTICAÇÃO SUPABASE ---
  async signUp(email, password) {
    this.ensureConnected();
    if (!this.isSupabaseConnected) {
      throw new Error('Supabase não está conectado.');
    }
    const { data, error } = await this.supabase.auth.signUp({
      email: email.trim(),
      password: password
    });
    if (error) throw error;
    return data;
  }

  async signIn(email, password) {
    this.ensureConnected();
    if (!this.isSupabaseConnected) {
      throw new Error('Supabase não está conectado.');
    }
    const { data, error } = await this.supabase.auth.signInWithPassword({
      email: email.trim(),
      password: password
    });
    if (error) throw error;
    return data;
  }

  async signOut() {
    this.ensureConnected();
    if (!this.isSupabaseConnected) return;
    const { error } = await this.supabase.auth.signOut();
    if (error) console.error('Erro no logout:', error);
  }

  async getCurrentUser() {
    this.ensureConnected();
    if (!this.isSupabaseConnected) return null;
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      return user || null;
    } catch (e) {
      return null;
    }
  }

  async getSession() {
    this.ensureConnected();
    if (!this.isSupabaseConnected) return null;
    try {
      const { data: { session } } = await this.supabase.auth.getSession();
      return session || null;
    } catch (e) {
      return null;
    }
  }

  onAuthStateChange(callback) {
    this.ensureConnected();
    if (!this.isSupabaseConnected) return null;
    return this.supabase.auth.onAuthStateChange((event, session) => {
      callback(event, session);
    });
  }

  // --- CATEGORIAS ---
  async getCategories() {
    this.ensureConnected();
    if (this.isSupabaseConnected) {
      const { data, error } = await this.supabase
        .from('categories')
        .select('*')
        .order('name');
      if (error) {
        console.error('❌ Erro Supabase ao buscar categorias:', error);
      } else if (data && data.length > 0) {
        return data;
      } else if (data && data.length === 0) {
        console.log('ℹ️ Tabela de categorias vazia no Supabase. Semeando categorias padrão...');
        const user = await this.getCurrentUser();
        const seedData = DEFAULT_CATEGORIES.map(({ id, ...rest }) => ({
          ...rest,
          ...(user ? { user_id: user.id } : {})
        }));
        const { data: seeded, error: seedErr } = await this.supabase
          .from('categories')
          .insert(seedData)
          .select();
        if (!seedErr && seeded && seeded.length > 0) {
          return seeded;
        }
      }
    }

    // Fallback LocalStorage
    const local = safeStorage.getItem(STORAGE_KEYS.CATEGORIES);
    if (!local) {
      safeStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(DEFAULT_CATEGORIES));
      return DEFAULT_CATEGORIES;
    }
    return JSON.parse(local);
  }

  async addCategory(category) {
    this.ensureConnected();
    if (this.isSupabaseConnected) {
      const user = await this.getCurrentUser();
      const payload = {
        name: category.name,
        type: category.type,
        color: category.color || '#6366f1',
        icon: category.icon || 'folder',
        budget_limit: parseFloat(category.budget_limit) || 0
      };
      if (user) {
        payload.user_id = user.id;
      }
      if (isUUID(category.id)) {
        payload.id = category.id;
      }

      const { data, error } = await this.supabase
        .from('categories')
        .insert([payload])
        .select();

      if (error) {
        console.error('❌ Erro Supabase ao criar categoria:', error);
      } else if (data && data.length > 0) {
        console.log('✅ Categoria inserida no Supabase:', data[0]);
        return data[0];
      }
    }

    // LocalStorage Fallback
    const newCat = {
      id: category.id || `cat-${Date.now()}`,
      name: category.name,
      type: category.type,
      color: category.color || '#6366f1',
      icon: category.icon || 'folder',
      budget_limit: parseFloat(category.budget_limit) || 0
    };
    const categories = await this.getCategories();
    categories.push(newCat);
    safeStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(categories));
    return newCat;
  }

  async updateCategory(category) {
    this.ensureConnected();
    if (this.isSupabaseConnected && isUUID(category.id)) {
      const payload = {
        name: category.name,
        type: category.type,
        color: category.color || '#6366f1',
        budget_limit: parseFloat(category.budget_limit) || 0
      };
      const { data, error } = await this.supabase
        .from('categories')
        .update(payload)
        .eq('id', category.id)
        .select();

      if (error) {
        console.error('❌ Erro Supabase ao atualizar categoria:', error);
      } else if (data && data.length > 0) {
        console.log('✅ Categoria atualizada no Supabase:', data[0]);
        return data[0];
      }
    }

    // LocalStorage Fallback
    const categories = await this.getCategories();
    const index = categories.findIndex(c => c.id === category.id);
    if (index !== -1) {
      categories[index] = {
        ...categories[index],
        name: category.name,
        type: category.type,
        color: category.color || '#6366f1',
        budget_limit: parseFloat(category.budget_limit) || 0
      };
      safeStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(categories));
      return categories[index];
    }
    return category;
  }

  async deleteCategory(id) {
    this.ensureConnected();
    if (this.isSupabaseConnected && isUUID(id)) {
      const { error } = await this.supabase
        .from('categories')
        .delete()
        .eq('id', id);
      if (error) {
        console.error('❌ Erro Supabase ao deletar categoria:', error);
      } else {
        return true;
      }
    }

    // LocalStorage Fallback
    let categories = await this.getCategories();
    categories = categories.filter(c => c.id !== id);
    safeStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(categories));
    return true;
  }

  // --- TRANSAÇÕES ---
  async getTransactions() {
    this.ensureConnected();
    if (this.isSupabaseConnected) {
      const { data, error } = await this.supabase
        .from('transactions')
        .select('*, categories(*)')
        .order('date', { ascending: false });
      if (error) {
        console.error('❌ Erro Supabase ao buscar transações:', error);
      } else if (data) {
        return data;
      }
    }

    // LocalStorage Fallback
    const local = safeStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
    if (!local) {
      safeStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(DEFAULT_TRANSACTIONS));
      return DEFAULT_TRANSACTIONS;
    }
    return JSON.parse(local);
  }

  async addTransaction(transaction) {
    this.ensureConnected();
    if (this.isSupabaseConnected) {
      const user = await this.getCurrentUser();
      const payload = {
        description: transaction.description,
        amount: parseFloat(transaction.amount),
        type: transaction.type,
        date: transaction.date || new Date().toISOString().split('T')[0],
        payment_method: transaction.payment_method || 'Pix',
        notes: transaction.notes || ''
      };

      if (user) {
        payload.user_id = user.id;
      }

      if (isUUID(transaction.id)) {
        payload.id = transaction.id;
      }
      if (isUUID(transaction.category_id)) {
        payload.category_id = transaction.category_id;
      }

      const { data, error } = await this.supabase
        .from('transactions')
        .insert([payload])
        .select('*, categories(*)');

      if (error) {
        console.error('❌ Erro Supabase ao inserir transação:', error.message || error.details || error.code || JSON.stringify(error));
        alert('Aviso Supabase: ' + (error.message || 'Falha ao salvar no banco. Verifique se o schema.sql foi executado no SQL Editor do Supabase.'));
      } else if (data && data.length > 0) {
        console.log('✅ Transação inserida com sucesso no Supabase:', data[0]);
        return data[0];
      }
    }

    // LocalStorage Fallback
    const newTx = {
      id: transaction.id || `tx-${Date.now()}`,
      description: transaction.description,
      amount: parseFloat(transaction.amount),
      type: transaction.type,
      category_id: transaction.category_id,
      date: transaction.date || new Date().toISOString().split('T')[0],
      payment_method: transaction.payment_method || 'Pix',
      notes: transaction.notes || ''
    };

    const txs = await this.getTransactions();
    txs.unshift(newTx);
    safeStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(txs));
    return newTx;
  }

  async updateTransaction(transaction) {
    this.ensureConnected();
    if (this.isSupabaseConnected && isUUID(transaction.id)) {
      const payload = {
        description: transaction.description,
        amount: parseFloat(transaction.amount),
        type: transaction.type,
        date: transaction.date || new Date().toISOString().split('T')[0],
        payment_method: transaction.payment_method || 'Pix',
        notes: transaction.notes || ''
      };

      if (isUUID(transaction.category_id)) {
        payload.category_id = transaction.category_id;
      } else {
        payload.category_id = null;
      }

      const { data, error } = await this.supabase
        .from('transactions')
        .update(payload)
        .eq('id', transaction.id)
        .select('*, categories(*)');

      if (error) {
        console.error('❌ Erro Supabase ao atualizar transação:', error);
        alert('Erro ao atualizar transação no Supabase: ' + error.message);
      } else if (data && data.length > 0) {
        console.log('✅ Transação atualizada no Supabase:', data[0]);
        return data[0];
      }
    }

    // LocalStorage Fallback
    const txs = await this.getTransactions();
    const index = txs.findIndex(t => t.id === transaction.id);
    if (index !== -1) {
      txs[index] = {
        ...txs[index],
        description: transaction.description,
        amount: parseFloat(transaction.amount),
        type: transaction.type,
        category_id: transaction.category_id,
        date: transaction.date || new Date().toISOString().split('T')[0],
        payment_method: transaction.payment_method || 'Pix',
        notes: transaction.notes || ''
      };
      safeStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(txs));
      return txs[index];
    }
    return transaction;
  }

  async deleteTransaction(id) {
    this.ensureConnected();
    if (this.isSupabaseConnected) {
      if (isUUID(id)) {
        const { error } = await this.supabase
          .from('transactions')
          .delete()
          .eq('id', id);
        if (error) {
          console.error('❌ Erro Supabase ao deletar transação:', error);
        } else {
          return true;
        }
      }
    }

    // LocalStorage Fallback
    let txs = await this.getTransactions();
    txs = txs.filter(t => t.id !== id);
    safeStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(txs));
    return true;
  }
}

window.financeService = new FinanceService();
