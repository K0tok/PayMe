import { createClient } from '@supabase/supabase-js';
import './style.css';

// Initialize Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase configuration. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables.');
}

const supabase = supabaseUrl && supabaseAnonKey ? 
  createClient(supabaseUrl, supabaseAnonKey) : null;

// Generate or get user ID from localStorage
let userId = localStorage.getItem('user_id');
if (!userId) {
  userId = crypto.randomUUID();
  localStorage.setItem('user_id', userId);
}

// DOM elements
const form = document.getElementById('payment-form');
const addressSelect = document.getElementById('address');
const paymentTypeSelect = document.getElementById('payment-type');
const bankSelect = document.getElementById('bank');
const monthYearInput = document.getElementById('month-year');
const statusMessage = document.getElementById('status-message');

// Toggle visibility of new input fields
document.getElementById('add-address-btn').addEventListener('click', () => {
  const input = document.getElementById('new-address-input');
  input.style.display = input.style.display === 'none' ? 'block' : 'none';
});

document.getElementById('add-payment-type-btn').addEventListener('click', () => {
  const input = document.getElementById('new-payment-type-input');
  input.style.display = input.style.display === 'none' ? 'block' : 'none';
});

document.getElementById('add-bank-btn').addEventListener('click', () => {
  const input = document.getElementById('new-bank-input');
  input.style.display = input.style.display === 'none' ? 'block' : 'none';
});

// Handle new address submission
document.getElementById('new-address-input').addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    const newAddress = e.target.value.trim();
    if (newAddress) {
      addOptionToSelect(addressSelect, newAddress);
      e.target.value = '';
      e.target.style.display = 'none';
    }
  }
});

// Handle new payment type submission
document.getElementById('new-payment-type-input').addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    const newType = e.target.value.trim();
    if (newType) {
      addOptionToSelect(paymentTypeSelect, newType);
      e.target.value = '';
      e.target.style.display = 'none';
    }
  }
});

// Handle new bank submission
document.getElementById('new-bank-input').addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    const newBank = e.target.value.trim();
    if (newBank) {
      addOptionToSelect(bankSelect, newBank);
      e.target.value = '';
      e.target.style.display = 'none';
    }
  }
});

// Add option to select element
function addOptionToSelect(selectElement, value) {
  const option = document.createElement('option');
  option.value = value;
  option.textContent = value;
  selectElement.appendChild(option);
  selectElement.value = value;
}

// Load user data from Supabase on page load
async function loadUserData() {
  try {
    // Set default month to previous month
    const now = new Date();
    const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonthStr = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, '0')}`;
    monthYearInput.value = prevMonthStr;
    
    if (supabase) {
      // Get user metadata
      const { data, error } = await supabase
        .from('user_meta')
        .select('*')
        .eq('user_id', userId)
        .single();
      
      if (error && error.code !== 'PGRST116') { // PGRST116 is "Row not found"
        console.error('Error fetching user meta:', error);
        return;
      }
      
      if (data) {
        // Populate dropdowns with custom values
        populateDropdownWithCustomValues(addressSelect, data.custom_addresses || []);
        populateDropdownWithCustomValues(paymentTypeSelect, data.custom_payment_types || []);
        populateDropdownWithCustomValues(bankSelect, data.custom_banks || []);
        
        // Set last used values as defaults
        if (data.last_address) {
          addressSelect.value = data.last_address;
        }
        if (data.last_payment_type) {
          paymentTypeSelect.value = data.last_payment_type;
        }
        if (data.last_bank) {
          bankSelect.value = data.last_bank;
        }
      }
    }
  } catch (err) {
    console.error('Error loading user data:', err);
  }
}

// Populate dropdown with custom values
function populateDropdownWithCustomValues(selectElement, customValues) {
  customValues.forEach(value => {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = value;
    selectElement.appendChild(option);
  });
}

// Form submission handler
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const formData = new FormData(form);
  const address = formData.get('address');
  const paymentType = formData.get('payment-type');
  const bank = formData.get('bank');
  const monthYear = formData.get('month-year');
  const receiptFile = formData.get('receipt-file');
  
  if (!address || !paymentType || !bank || !monthYear) {
    showMessage('Please fill in all required fields.', 'error');
    return;
  }
  
  try {
    // Upload file if provided
    let fileUrl = null;
    if (receiptFile && receiptFile.size > 0) {
      fileUrl = await uploadFile(receiptFile);
    }
    
    // Save payment to Supabase
    if (supabase) {
      const { error } = await supabase
        .from('payments')
        .insert([{
          user_id: userId,
          address,
          payment_type: paymentType,
          bank,
          month_year: monthYear,
          file_url: fileUrl
        }]);
      
      if (error) {
        throw error;
      }
      
      // Update user metadata with last used values
      await updateUserMetadata({
        last_address: address,
        last_payment_type: paymentType,
        last_bank: bank
      });
      
      // Add new custom values to user metadata if they don't exist yet
      await updateCustomLists(address, paymentType, bank);
    }
    
    // Reset form except for month
    form.reset();
    monthYearInput.value = monthYear; // Keep the same month
    
    showMessage('Payment saved successfully!', 'success');
  } catch (err) {
    console.error('Error saving payment:', err);
    showMessage(`Error saving payment: ${err.message}`, 'error');
  }
});

// Upload file to Supabase storage
async function uploadFile(file) {
  if (!supabase) return null;
  
  try {
    const fileName = `${userId}/${Date.now()}_${file.name}`;
    const { error: uploadError } = await supabase
      .storage
      .from('receipts')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });
    
    if (uploadError) {
      throw uploadError;
    }
    
    // Get public URL
    const { data } = supabase
      .storage
      .from('receipts')
      .getPublicUrl(fileName);
      
    return data.publicUrl;
  } catch (err) {
    console.error('Error uploading file:', err);
    throw err;
  }
}

// Update user metadata
async function updateUserMetadata(updates) {
  if (!supabase) return;
  
  try {
    const { error } = await supabase
      .from('user_meta')
      .upsert([{ user_id: userId, ...updates }], { onConflict: 'user_id' });
    
    if (error) {
      throw error;
    }
  } catch (err) {
    console.error('Error updating user metadata:', err);
  }
}

// Add new custom values to user metadata
async function updateCustomLists(address, paymentType, bank) {
  if (!supabase) return;
  
  try {
    // Get current user meta
    const { data, error } = await supabase
      .from('user_meta')
      .select('custom_addresses, custom_payment_types, custom_banks')
      .eq('user_id', userId)
      .single();
    
    if (error && error.code !== 'PGRST116') {
      throw error;
    }
    
    const currentMeta = data || {};
    const updates = {};
    
    // Add new address if not exists
    if (address && (!currentMeta.custom_addresses || !currentMeta.custom_addresses.includes(address))) {
      updates.custom_addresses = [...(currentMeta.custom_addresses || []), address];
    }
    
    // Add new payment type if not exists
    if (paymentType && (!currentMeta.custom_payment_types || !currentMeta.custom_payment_types.includes(paymentType))) {
      updates.custom_payment_types = [...(currentMeta.custom_payment_types || []), paymentType];
    }
    
    // Add new bank if not exists
    if (bank && (!currentMeta.custom_banks || !currentMeta.custom_banks.includes(bank))) {
      updates.custom_banks = [...(currentMeta.custom_banks || []), bank];
    }
    
    if (Object.keys(updates).length > 0) {
      await updateUserMetadata(updates);
    }
  } catch (err) {
    console.error('Error updating custom lists:', err);
  }
}

// Show status message
function showMessage(message, type) {
  statusMessage.textContent = message;
  statusMessage.className = `status-message ${type}`;
  setTimeout(() => {
    statusMessage.textContent = '';
    statusMessage.className = 'status-message';
  }, 3000);
}

// Initialize the app
loadUserData();

// Page navigation functionality
document.addEventListener('DOMContentLoaded', () => {
  const navLinks = document.querySelectorAll('.nav-link');
  const homeSection = document.getElementById('home-section');
  const historySection = document.getElementById('history-section');
  const paymentHistoryRoot = document.getElementById('payment-history-root');

  // Function to show/hide sections and update active nav link
  function showPage(pageName) {
    // Hide all sections
    homeSection.style.display = 'none';
    historySection.style.display = 'none';
    
    // Remove active class from all links
    navLinks.forEach(link => link.classList.remove('active'));
    
    // Show selected section and highlight nav link
    if (pageName === 'home') {
      homeSection.style.display = 'block';
      document.querySelector('[data-page="home"]').classList.add('active');
    } else if (pageName === 'history') {
      historySection.style.display = 'block';
      document.querySelector('[data-page="history"]').classList.add('active');
      
      // Render PaymentHistory component
      renderPaymentHistory();
    }
  }

  // Add click event listeners to nav links
  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const pageName = link.getAttribute('data-page');
      showPage(pageName);
    });
  });

  // Initial page setup - show home by default
  showPage('home');
});

// Function to render PaymentHistory component
async function renderPaymentHistory() {
  const paymentHistoryRoot = document.getElementById('payment-history-root');
  
  // Clear existing content
  paymentHistoryRoot.innerHTML = '';
  
  // Create a container for the component to mount to
  const historyContainer = document.createElement('div');
  historyContainer.id = 'payment-history-container';
  paymentHistoryRoot.appendChild(historyContainer);
  
  // Dynamically import and initialize the PaymentHistory component
  try {
    const PaymentHistoryModule = await import('./components/PaymentHistory.jsx');
    const PaymentHistoryClass = PaymentHistoryModule.default;
    
    // Create an instance of the PaymentHistory class and initialize it
    const paymentHistory = new PaymentHistory('payment-history-container');
    await paymentHistory.init();
  } catch (error) {
    console.error('Error loading PaymentHistory component:', error);
    paymentHistoryRoot.innerHTML = '<p>Error loading payment history</p>';
  }
}