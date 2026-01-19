import { supabase } from '../supabaseClient';

class PaymentHistory {
  constructor(containerId) {
    this.containerId = containerId;
    this.payments = [];
    this.filteredPayments = [];
    this.uniqueTypes = [];
    this.uniqueBanks = [];
    this.uniqueAddresses = [];
    
    // Фильтры
    this.startDate = '';
    this.endDate = '';
    this.paymentType = '';
    this.bank = '';
    this.address = '';
  }

  async init() {
    this.render();
    await this.fetchPayments();
    this.applyFilters();
    this.attachEventListeners();
  }

  render() {
    const container = document.getElementById(this.containerId);
    if (!container) return;

    container.innerHTML = `
      <div class="payment-history-container">
        <h1 class="text-2xl font-bold mb-6">История платежей</h1>
        
        <!-- Фильтры -->
        <div class="bg-white rounded-lg shadow-md p-4 mb-6">
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 filter-row">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Дата от</label>
              <input
                type="date"
                id="filter-start-date"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Дата до</label>
              <input
                type="date"
                id="filter-end-date"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Тип</label>
              <select
                id="filter-type"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Все типы</option>
              </select>
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Банк</label>
              <select
                id="filter-bank"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Все банки</option>
              </select>
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Адрес</label>
              <select
                id="filter-address"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Все адреса</option>
              </select>
            </div>
          </div>
          
          <div class="mt-4 flex space-x-2">
            <button
              id="apply-filters-btn"
              class="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Применить фильтры
            </button>
            <button
              id="reset-filters-btn"
              class="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              Сбросить фильтры
            </button>
          </div>
        </div>
        
        <!-- Загрузка -->
        <div id="loading-indicator" class="p-4" style="display: none;">Загрузка истории платежей...</div>
        
        <!-- Ошибка -->
        <div id="error-message" class="p-4 text-red-500" style="display: none;"></div>
        
        <!-- Таблица платежей -->
        <div id="payments-table-container" class="bg-white rounded-lg shadow-md overflow-hidden">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Дата</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Тип</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Адрес</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Банк</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Сумма</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Назначение</th>
              </tr>
            </thead>
            <tbody id="payments-tbody" class="bg-white divide-y divide-gray-200">
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  async fetchPayments() {
    const loadingIndicator = document.getElementById('loading-indicator');
    const errorMessage = document.getElementById('error-message');
    
    if (loadingIndicator) loadingIndicator.style.display = 'block';
    if (errorMessage) {
      errorMessage.style.display = 'none';
      errorMessage.textContent = '';
    }

    try {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      this.payments = data || [];
      
      // Получаем уникальные значения для фильтров
      this.uniqueTypes = [...new Set(data.map(p => p.payment_type || p.type).filter(Boolean))];
      this.uniqueBanks = [...new Set(data.map(p => p.bank).filter(Boolean))];
      this.uniqueAddresses = [...new Set(data.map(p => p.address).filter(Boolean))];
      
      this.updateFilterOptions();
    } catch (err) {
      if (errorMessage) {
        errorMessage.style.display = 'block';
        errorMessage.textContent = `Ошибка: ${err.message}`;
      }
      console.error('Error fetching payments:', err);
    } finally {
      if (loadingIndicator) loadingIndicator.style.display = 'none';
    }
  }

  updateFilterOptions() {
    // Обновляем опции для типа платежа
    const typeFilter = document.getElementById('filter-type');
    if (typeFilter) {
      typeFilter.innerHTML = '<option value="">Все типы</option>';
      this.uniqueTypes.forEach(type => {
        const option = document.createElement('option');
        option.value = type;
        option.textContent = type;
        typeFilter.appendChild(option);
      });
    }

    // Обновляем опции для банка
    const bankFilter = document.getElementById('filter-bank');
    if (bankFilter) {
      bankFilter.innerHTML = '<option value="">Все банки</option>';
      this.uniqueBanks.forEach(bank => {
        const option = document.createElement('option');
        option.value = bank;
        option.textContent = bank;
        bankFilter.appendChild(option);
      });
    }

    // Обновляем опции для адреса
    const addressFilter = document.getElementById('filter-address');
    if (addressFilter) {
      addressFilter.innerHTML = '<option value="">Все адреса</option>';
      this.uniqueAddresses.forEach(addr => {
        const option = document.createElement('option');
        option.value = addr;
        option.textContent = addr;
        addressFilter.appendChild(option);
      });
    }
  }

  applyFilters() {
    let result = [...this.payments];

    // Фильтрация по дате
    if (this.startDate) {
      result = result.filter(payment => new Date(payment.created_at) >= new Date(this.startDate));
    }
    if (this.endDate) {
      result = result.filter(payment => new Date(payment.created_at) <= new Date(this.endDate));
    }

    // Фильтрация по типу
    if (this.paymentType) {
      result = result.filter(payment => (payment.payment_type || payment.type) === this.paymentType);
    }

    // Фильтрация по банку
    if (this.bank) {
      result = result.filter(payment => payment.bank === this.bank);
    }

    // Фильтрация по адресу
    if (this.address) {
      result = result.filter(payment => payment.address === this.address);
    }

    this.filteredPayments = result;
    this.renderPaymentsTable();
  }

  renderPaymentsTable() {
    const tbody = document.getElementById('payments-tbody');
    if (!tbody) return;

    if (this.filteredPayments.length > 0) {
      tbody.innerHTML = this.filteredPayments.map(payment => `
        <tr>
          <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
            ${new Date(payment.created_at).toLocaleDateString()}
          </td>
          <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
            ${payment.payment_type || payment.type || '-'}
          </td>
          <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
            ${payment.address || '-'}
          </td>
          <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
            ${payment.bank || '-'}
          </td>
          <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
            ${payment.amount ? `${payment.amount} ₽` : '-'}
          </td>
          <td class="px-6 py-4 text-sm text-gray-500 max-w-xs truncate" title="${payment.purpose || ''}">
            ${payment.purpose || '-'}
          </td>
        </tr>
      `).join('');
    } else {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" class="px-6 py-4 text-center text-sm text-gray-500">
            ${this.payments.length === 0 ? 'Нет записей о платежах' : 'Нет платежей по указанным фильтрам'}
          </td>
        </tr>
      `;
    }
  }

  attachEventListeners() {
    // Обработчики для фильтров
    const startDateFilter = document.getElementById('filter-start-date');
    const endDateFilter = document.getElementById('filter-end-date');
    const typeFilter = document.getElementById('filter-type');
    const bankFilter = document.getElementById('filter-bank');
    const addressFilter = document.getElementById('filter-address');
    const applyBtn = document.getElementById('apply-filters-btn');
    const resetBtn = document.getElementById('reset-filters-btn');

    if (startDateFilter) {
      startDateFilter.addEventListener('change', (e) => {
        this.startDate = e.target.value;
      });
    }

    if (endDateFilter) {
      endDateFilter.addEventListener('change', (e) => {
        this.endDate = e.target.value;
      });
    }

    if (typeFilter) {
      typeFilter.addEventListener('change', (e) => {
        this.paymentType = e.target.value;
      });
    }

    if (bankFilter) {
      bankFilter.addEventListener('change', (e) => {
        this.bank = e.target.value;
      });
    }

    if (addressFilter) {
      addressFilter.addEventListener('change', (e) => {
        this.address = e.target.value;
      });
    }

    if (applyBtn) {
      applyBtn.addEventListener('click', () => {
        this.applyFilters();
      });
    }

    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        this.resetFilters();
      });
    }
  }

  resetFilters() {
    this.startDate = '';
    this.endDate = '';
    this.paymentType = '';
    this.bank = '';
    this.address = '';

    // Сбрасываем значения элементов управления
    const startDateFilter = document.getElementById('filter-start-date');
    const endDateFilter = document.getElementById('filter-end-date');
    const typeFilter = document.getElementById('filter-type');
    const bankFilter = document.getElementById('filter-bank');
    const addressFilter = document.getElementById('filter-address');

    if (startDateFilter) startDateFilter.value = '';
    if (endDateFilter) endDateFilter.value = '';
    if (typeFilter) typeFilter.value = '';
    if (bankFilter) bankFilter.value = '';
    if (addressFilter) addressFilter.value = '';

    this.applyFilters();
  }
}

// Экспортируем класс для использования в других модулях
export default PaymentHistory;