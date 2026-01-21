import { supabase } from './supabaseClient.js';

// Глобальные переменные
let currentUser = null;
let paymentsData = [];
let userMeta = {};

// DOM элементы
const screens = {
  auth: document.getElementById('auth-screen'),
  form: document.getElementById('payment-form-screen'),
  history: document.getElementById('history-screen')
};

const authForm = document.getElementById('auth-form');
const paymentForm = document.getElementById('payment-form');
const historyTableBody = document.getElementById('history-tbody');

// Элементы формы
const addressSelect = document.getElementById('address');
const newAddressInput = document.getElementById('new-address');
const paymentTypeSelect = document.getElementById('payment-type');
const newPaymentTypeInput = document.getElementById('new-payment-type');
const bankSelect = document.getElementById('bank');
const newBankInput = document.getElementById('new-bank');
const monthYearInput = document.getElementById('month-year');
const receiptFileInput = document.getElementById('receipt-file');

// Элементы истории
const filterPaymentType = document.getElementById('filter-payment-type');
const filterBank = document.getElementById('filter-bank');
const filterAddress = document.getElementById('filter-address');

// Кнопки
const viewHistoryBtn = document.getElementById('view-history-btn');
const backToFormBtn = document.getElementById('back-to-form-btn');
const applyFiltersBtn = document.getElementById('apply-filters-btn');
const resetFiltersBtn = document.getElementById('reset-filters-btn');

// Инициализация приложения
document.addEventListener('DOMContentLoaded', async () => {
  // Установка значения месяца по умолчанию (предыдущий месяц)
  const today = new Date();
  const prevMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const prevMonthStr = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, '0')}`;
  monthYearInput.value = prevMonthStr;

  // Проверка сессии пользователя
  const { data: { session } } = await supabase.auth.getSession();
  
  if (session) {
    currentUser = session.user;
    await loadUserData();
    showScreen('form');
  } else {
    showScreen('auth');
  }

  // Обработка изменения URL для роутинга
  window.addEventListener('hashchange', handleRouteChange);
  handleRouteChange(); // Обработка начального состояния

  // Настройка обработчиков событий
  setupEventListeners();
});

// Настройка обработчиков событий
function setupEventListeners() {
  // Форма авторизации
  authForm.addEventListener('submit', handleAuthSubmit);
  
  // Основная форма
  paymentForm.addEventListener('submit', handlePaymentSubmit);
  
  // Выбор адреса
  addressSelect.addEventListener('change', (e) => {
    if (e.target.value === 'add-new') {
      newAddressInput.style.display = 'block';
      newAddressInput.focus();
    } else {
      newAddressInput.style.display = 'none';
    }
  });
  
  // Выбор типа платежа
  paymentTypeSelect.addEventListener('change', (e) => {
    if (e.target.value === 'add-new') {
      newPaymentTypeInput.style.display = 'block';
      newPaymentTypeInput.focus();
    } else {
      newPaymentTypeInput.style.display = 'none';
    }
  });
  
  // Выбор банка
  bankSelect.addEventListener('change', (e) => {
    if (e.target.value === 'add-new') {
      newBankInput.style.display = 'block';
      newBankInput.focus();
    } else {
      newBankInput.style.display = 'none';
    }
  });
  
  // Кнопки навигации
  viewHistoryBtn.addEventListener('click', () => window.location.hash = '#/history');
  backToFormBtn.addEventListener('click', () => window.location.hash = '#/');
  
  // Фильтры
  applyFiltersBtn.addEventListener('click', applyFilters);
  resetFiltersBtn.addEventListener('click', resetFilters);
}

// Обработка изменения маршрута
function handleRouteChange() {
  const route = window.location.hash.substring(2); // Убираем #/
  
  switch(route) {
    case '/':
    case '':
      showScreen('form');
      break;
    case '/history':
      showScreen('history');
      loadHistoryData();
      break;
    default:
      showScreen('form');
  }
}

// Показать нужный экран
function showScreen(screenName) {
  Object.keys(screens).forEach(key => {
    screens[key].classList.toggle('active', key === screenName);
  });
}

// Обработка отправки формы авторизации
async function handleAuthSubmit(e) {
  e.preventDefault();
  const email = document.getElementById('email').value;
  const messageEl = document.getElementById('auth-message');
  
  try {
    const { error } = await supabase.auth.signInWithOtp({
      email: email,
      options: {
        emailRedirectTo: window.location.origin + '/PayMe/'
      }
    });
    
    if (error) {
      messageEl.textContent = `Ошибка: ${error.message}`;
      messageEl.className = 'error-message';
    } else {
      messageEl.textContent = 'Ссылка для входа отправлена на ваш email!';
      messageEl.className = 'success-message';
      document.getElementById('email').value = '';
    }
  } catch (err) {
    messageEl.textContent = `Ошибка: ${err.message}`;
    messageEl.className = 'error-message';
  }
}

// Обработка смены сессии
supabase.auth.onAuthStateChange(async (event, session) => {
  if (event === 'SIGNED_IN') {
    currentUser = session.user;
    await loadUserData();
    showScreen('form');
    window.location.hash = '#/';
  } else if (event === 'SIGNED_OUT') {
    currentUser = null;
    showScreen('auth');
    window.location.hash = '#/';
  }
});

// Загрузка данных пользователя
async function loadUserData() {
  if (!currentUser) return;
  
  // Загрузка метаданных пользователя
  const { data, error } = await supabase
    .from('user_meta')
    .select('*')
    .eq('user_id', currentUser.id)
    .single();
  
  if (error && error.code !== 'PGRST116') { // PGRST116 означает "Row not found"
    console.error('Ошибка загрузки метаданных:', error);
    return;
  }
  
  userMeta = data || {};
  
  // Заполнение списков из метаданных
  populateDropdowns();
  
  // Установка последних значений по умолчанию
  if (userMeta.last_address) {
    addressSelect.value = userMeta.last_address;
  }
  if (userMeta.last_payment_type) {
    paymentTypeSelect.value = userMeta.last_payment_type;
  }
  if (userMeta.last_bank) {
    bankSelect.value = userMeta.last_bank;
  }
}

// Заполнение выпадающих списков
function populateDropdowns() {
  // Заполнение адресов
  addressSelect.innerHTML = '<option value="">Выберите адрес</option><option value="add-new">+ Добавить новый адрес</option>';
  if (userMeta.custom_addresses && Array.isArray(userMeta.custom_addresses)) {
    userMeta.custom_addresses.forEach(addr => {
      const option = document.createElement('option');
      option.value = addr;
      option.textContent = addr;
      addressSelect.appendChild(option);
    });
  }
  
  // Заполнение типов платежей
  paymentTypeSelect.innerHTML = '<option value="">Выберите тип</option>' +
    '<option value="Газ">Газ</option>' +
    '<option value="Мусор">Мусор</option>' +
    '<option value="Коммуналка — РЦ Урала">Коммуналка — РЦ Урала</option>' +
    '<option value="Коммуналка — Универсал">Коммуналка — Универсал</option>' +
    '<option value="add-new">+ Добавить новый тип</option>';
  if (userMeta.custom_payment_types && Array.isArray(userMeta.custom_payment_types)) {
    userMeta.custom_payment_types.forEach(type => {
      const option = document.createElement('option');
      option.value = type;
      option.textContent = type;
      paymentTypeSelect.appendChild(option);
    });
  }
  
  // Заполнение банков
  bankSelect.innerHTML = '<option value="">Выберите банк</option>' +
    '<option value="Альфа">Альфа</option>' +
    '<option value="Сбер">Сбер</option>' +
    '<option value="Тинькофф">Тинькофф</option>' +
    '<option value="Озон">Озон</option>' +
    '<option value="add-new">+ Добавить новый банк</option>';
  if (userMeta.custom_banks && Array.isArray(userMeta.custom_banks)) {
    userMeta.custom_banks.forEach(bank => {
      const option = document.createElement('option');
      option.value = bank;
      option.textContent = bank;
      bankSelect.appendChild(option);
    });
  }
}

// Обработка отправки формы платежа
async function handlePaymentSubmit(e) {
  e.preventDefault();
  
  // Получение значений формы
  let address = addressSelect.value;
  if (address === 'add-new' && newAddressInput.value.trim()) {
    address = newAddressInput.value.trim();
    await addCustomAddress(address);
  }
  
  let paymentType = paymentTypeSelect.value;
  if (paymentType === 'add-new' && newPaymentTypeInput.value.trim()) {
    paymentType = newPaymentTypeInput.value.trim();
    await addCustomPaymentType(paymentType);
  }
  
  let bank = bankSelect.value;
  if (bank === 'add-new' && newBankInput.value.trim()) {
    bank = newBankInput.value.trim();
    await addCustomBank(bank);
  }
  
  const monthYear = monthYearInput.value;
  const receiptFile = receiptFileInput.files[0];
  
  // Валидация
  if (!address || !paymentType || !bank || !monthYear) {
    alert('Пожалуйста, заполните все обязательные поля');
    return;
  }
  
  try {
    // Загрузка файла если он есть
    let fileUrl = null;
    if (receiptFile) {
      fileUrl = await uploadReceiptFile(receiptFile);
    }
    
    // Сохранение платежа в базе данных
    const { data, error } = await supabase
      .from('payments')
      .insert([{
        user_id: currentUser.id,
        address,
        payment_type: paymentType,
        bank,
        month_year: monthYear,
        file_url: fileUrl
      }]);
    
    if (error) throw error;
    
    // Обновление метаданных пользователя
    await updateUserMeta({ last_address: address, last_payment_type: paymentType, last_bank: bank });
    
    // Сброс формы
    paymentForm.reset();
    newAddressInput.style.display = 'none';
    newPaymentTypeInput.style.display = 'none';
    newBankInput.style.display = 'none';
    
    // Установка значения месяца по умолчанию снова
    const today = new Date();
    const prevMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const prevMonthStr = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, '0')}`;
    monthYearInput.value = prevMonthStr;
    
    alert('Платеж успешно сохранен!');
  } catch (err) {
    console.error('Ошибка сохранения платежа:', err);
    alert(`Ошибка: ${err.message}`);
  }
}

// Загрузка файла чека
async function uploadReceiptFile(file) {
  const fileName = `${currentUser.id}/${Date.now()}_${file.name}`;
  
  const { error } = await supabase.storage
    .from('receipts')
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false
    });
  
  if (error) throw error;
  
  // Получение публичной ссылки на файл
  const { data } = supabase.storage
    .from('receipts')
    .getPublicUrl(fileName);
  
  return data.publicUrl;
}

// Добавление нового адреса
async function addCustomAddress(address) {
  if (!userMeta.custom_addresses) {
    userMeta.custom_addresses = [];
  }
  if (!userMeta.custom_addresses.includes(address)) {
    userMeta.custom_addresses.push(address);
    await updateUserMeta({ custom_addresses: userMeta.custom_addresses });
  }
}

// Добавление нового типа платежа
async function addCustomPaymentType(paymentType) {
  if (!userMeta.custom_payment_types) {
    userMeta.custom_payment_types = [];
  }
  if (!userMeta.custom_payment_types.includes(paymentType)) {
    userMeta.custom_payment_types.push(paymentType);
    await updateUserMeta({ custom_payment_types: userMeta.custom_payment_types });
  }
}

// Добавление нового банка
async function addCustomBank(bank) {
  if (!userMeta.custom_banks) {
    userMeta.custom_banks = [];
  }
  if (!userMeta.custom_banks.includes(bank)) {
    userMeta.custom_banks.push(bank);
    await updateUserMeta({ custom_banks: userMeta.custom_banks });
  }
}

// Обновление метаданных пользователя
async function updateUserMeta(updates) {
  const { error } = await supabase
    .from('user_meta')
    .upsert({
      user_id: currentUser.id,
      ...updates
    });
  
  if (error) {
    console.error('Ошибка обновления метаданных:', error);
  } else {
    // Обновляем локальный объект
    Object.assign(userMeta, updates);
    populateDropdowns();
  }
}

// Загрузка истории платежей
async function loadHistoryData() {
  if (!currentUser) return;
  
  try {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('user_id', currentUser.id)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    paymentsData = data || [];
    renderHistoryTable(paymentsData);
    populateFilterOptions();
  } catch (err) {
    console.error('Ошибка загрузки истории:', err);
    alert(`Ошибка загрузки истории: ${err.message}`);
  }
}

// Отображение таблицы истории
function renderHistoryTable(data) {
  historyTableBody.innerHTML = '';
  
  if (!data || data.length === 0) {
    const row = document.createElement('tr');
    row.innerHTML = '<td colspan="6">Нет данных для отображения</td>';
    historyTableBody.appendChild(row);
    return;
  }
  
  data.forEach(payment => {
    const row = document.createElement('tr');
    
    // Форматирование даты
    const createdAt = new Date(payment.created_at);
    const formattedDate = createdAt.toLocaleDateString('ru-RU');
    
    // Месяц оплаты
    const [year, month] = payment.month_year.split('-');
    const monthNames = [
      'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
      'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
    ];
    const monthName = monthNames[parseInt(month) - 1];
    const monthYearDisplay = `${monthName} ${year}`;
    
    row.innerHTML = `
      <td>${formattedDate}</td>
      <td>${payment.address}</td>
      <td>${payment.payment_type}</td>
      <td>${payment.bank}</td>
      <td>${monthYearDisplay}</td>
      <td>
        ${payment.file_url ? 
          `<a href="${payment.file_url}" target="_blank" download>Скачать</a>` : 
          'Нет файла'}
      </td>
    `;
    
    historyTableBody.appendChild(row);
  });
}

// Заполнение опций фильтров
function populateFilterOptions() {
  // Очистка существующих опций (кроме первой - "Все...")
  while (filterPaymentType.children.length > 1) filterPaymentType.removeChild(filterPaymentType.lastChild);
  while (filterBank.children.length > 1) filterBank.removeChild(filterBank.lastChild);
  while (filterAddress.children.length > 1) filterAddress.removeChild(filterAddress.lastChild);
  
  // Получение уникальных значений
  const paymentTypes = [...new Set(paymentsData.map(p => p.payment_type))];
  const banks = [...new Set(paymentsData.map(p => p.bank))];
  const addresses = [...new Set(paymentsData.map(p => p.address))];
  
  // Заполнение опций
  paymentTypes.forEach(type => {
    const option = document.createElement('option');
    option.value = type;
    option.textContent = type;
    filterPaymentType.appendChild(option);
  });
  
  banks.forEach(bank => {
    const option = document.createElement('option');
    option.value = bank;
    option.textContent = bank;
    filterBank.appendChild(option);
  });
  
  addresses.forEach(addr => {
    const option = document.createElement('option');
    option.value = addr;
    option.textContent = addr;
    filterAddress.appendChild(option);
  });
}

// Применение фильтров
function applyFilters() {
  const startDate = document.getElementById('filter-start-date').value;
  const endDate = document.getElementById('filter-end-date').value;
  const paymentType = filterPaymentType.value;
  const bank = filterBank.value;
  const address = filterAddress.value;
  
  let filteredData = [...paymentsData];
  
  // Фильтрация по дате
  if (startDate) {
    filteredData = filteredData.filter(payment => {
      const paymentDate = new Date(payment.month_year + '-01');
      return paymentDate >= new Date(startDate + '-01');
    });
  }
  
  if (endDate) {
    filteredData = filteredData.filter(payment => {
      const paymentDate = new Date(payment.month_year + '-01');
      return paymentDate <= new Date(endDate + '-01');
    });
  }
  
  // Фильтрация по типу
  if (paymentType) {
    filteredData = filteredData.filter(payment => payment.payment_type === paymentType);
  }
  
  // Фильтрация по банку
  if (bank) {
    filteredData = filteredData.filter(payment => payment.bank === bank);
  }
  
  // Фильтрация по адресу
  if (address) {
    filteredData = filteredData.filter(payment => payment.address === address);
  }
  
  renderHistoryTable(filteredData);
}

// Сброс фильтров
function resetFilters() {
  document.getElementById('filter-start-date').value = '';
  document.getElementById('filter-end-date').value = '';
  filterPaymentType.value = '';
  filterBank.value = '';
  filterAddress.value = '';
  
  renderHistoryTable(paymentsData);
}