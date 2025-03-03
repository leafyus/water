document.addEventListener('DOMContentLoaded', function() {
  // State management
  const state = {
    entries: JSON.parse(localStorage.getItem('nutrientTrackerData')) || {},
    settings: JSON.parse(localStorage.getItem('nutrientTrackerSettings')) || {
      waterGoal: 3000,  // Updated to 3000 ml
      proteinGoal: 160  // Updated to 160 g
    },
    currentDate: new Date(),
    selectedDate: new Date(),
    currentMonth: new Date(),
    selectedMonth: new Date().toISOString().slice(0, 7) // YYYY-MM format
  };
  
  // Utility functions
  function formatDate(date) {
    return date.toISOString().split('T')[0]; // YYYY-MM-DD
  }
  
  function formatDisplayDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  }
  
  function saveData() {
    localStorage.setItem('nutrientTrackerData', JSON.stringify(state.entries));
  }
  
  function saveSettings() {
    localStorage.setItem('nutrientTrackerSettings', JSON.stringify(state.settings));
  }
  
  function getEntryForDate(date) {
    const dateKey = typeof date === 'string' ? date : formatDate(date);
    return state.entries[dateKey] || { water: 0, protein: 0, notes: '' };
  }
  
  function updateEntry(date, data) {
    const dateKey = typeof date === 'string' ? date : formatDate(date);
    state.entries[dateKey] = {
      ...getEntryForDate(dateKey),
      ...data
    };
    saveData();
    updateUI();
  }

  function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('show');
    
    setTimeout(() => {
      toast.classList.remove('show');
    }, 3000);
  }
  
  // UI Management
  function updateUI() {
    updateDashboard();
    updateCalendar();
    updateHistory();
    updateTrends();
  }
  
  function updateDashboard() {
    const today = formatDate(state.currentDate);
    const todayEntry = getEntryForDate(today);
    
    // Update today's values
    document.getElementById('today-water').textContent = `${todayEntry.water}ml`;
    document.getElementById('today-protein').textContent = `${todayEntry.protein}g`;
    
    // Update progress bars
    const waterPercent = Math.min(100, (todayEntry.water / state.settings.waterGoal) * 100);
    const proteinPercent = Math.min(100, (todayEntry.protein / state.settings.proteinGoal) * 100);
    
    document.getElementById('water-progress-bar').style.width = `${waterPercent}%`;
    document.getElementById('water-progress-text').textContent = `${todayEntry.water}/${state.settings.waterGoal} ml`;
    
    document.getElementById('protein-progress-bar').style.width = `${proteinPercent}%`;
    document.getElementById('protein-progress-text').textContent = `${todayEntry.protein}/${state.settings.proteinGoal} g`;
    
    // Calculate weekly averages
    const today = new Date();
    let waterTotal = 0;
    let proteinTotal = 0;
    let dayCount = 0;
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const entry = getEntryForDate(formatDate(date));
      
      if (entry.water > 0 || entry.protein > 0) {
        waterTotal += entry.water;
        proteinTotal += entry.protein;
        dayCount++;
      }
    }
    
    const avgWater = dayCount > 0 ? Math.round(waterTotal / dayCount) : 0;
    const avgProtein = dayCount > 0 ? Math.round(proteinTotal / dayCount) : 0;
    
    document.getElementById('avg-water').textContent = `${avgWater}ml`;
    document.getElementById('avg-protein').textContent = `${avgProtein}g`;
  }
  
  function updateCalendar() {
    const year = state.currentMonth.getFullYear();
    const month = state.currentMonth.getMonth();
    
    // Update calendar month title
    document.getElementById('calendar-month').textContent = new Date(year, month, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    
    // Clear previous calendar days
    const calendar = document.getElementById('calendar');
    const dayElements = document.querySelectorAll('.day');
    dayElements.forEach(day => day.remove());
    
    // Get first day of month and total days
    const firstDay = new Date(year, month, 1).getDay();
    const lastDate = new Date(year, month + 1, 0).getDate();
    
    // Add empty placeholder days
    for (let i = 0; i < firstDay; i++) {
      const emptyDay = document.createElement('div');
      calendar.appendChild(emptyDay);
    }
    
    // Add calendar days
    for (let day = 1; day <= lastDate; day++) {
      const dateObj = new Date(year, month, day);
      const dateStr = formatDate(dateObj);
      const entry = getEntryForDate(dateStr);
      
      const dayElement = document.createElement('div');
      dayElement.className = 'day';
      dayElement.dataset.date = dateStr;
      
      // Check if this day is today
      if (dateStr === formatDate(state.currentDate)) {
        dayElement.classList.add('today');
      }
      
      // Check if this day is selected
      if (dateStr === formatDate(state.selectedDate)) {
        dayElement.classList.add('selected');
      }
      
      const dayNumber = document.createElement('div');
      dayNumber.className = 'day-number';
      dayNumber.textContent = day;
      dayElement.appendChild(dayNumber);
      
      // Add indicators for logged data
      if (entry.water > 0 || entry.protein > 0) {
        const indicatorContainer = document.createElement('div');
        indicatorContainer.className = 'day-indicator';
        
        if (entry.water > 0) {
          const waterIndicator = document.createElement('div');
          waterIndicator.className = 'indicator water-indicator';
          indicatorContainer.appendChild(waterIndicator);
        }
        
        if (entry.protein > 0) {
          const proteinIndicator = document.createElement('div');
          proteinIndicator.className = 'indicator protein-indicator';
          indicatorContainer.appendChild(proteinIndicator);
        }
        
        dayElement.appendChild(indicatorContainer);
      }
      
      dayElement.addEventListener('click', () => {
        // Update selected date
        state.selectedDate = new Date(dateStr);
        
        // Update form date
        document.getElementById('log-date').value = dateStr;
        
        // Switch to tracker tab
        switchTab('tracker');
        
        // Update calendar
        updateCalendar();
      });
      
      calendar.appendChild(dayElement);
    }
  }
  
  function updateHistory() {
    // Populate months dropdown
    const monthSelect = document.getElementById('history-month');
    monthSelect.innerHTML = '';
    
    const months = {};
    Object.keys(state.entries).forEach(dateStr => {
      const yearMonth = dateStr.substring(0, 7);
      months[yearMonth] = true;
    });
    
    // Add current month if no entries exist
    const currentYearMonth = formatDate(state.currentDate).substring(0, 7);
    months[currentYearMonth] = true;
    
    // Sort months in descending order
    const sortedMonths = Object.keys(months).sort((a, b) => b.localeCompare(a));
    
    sortedMonths.forEach(yearMonth => {
      const option = document.createElement('option');
      option.value = yearMonth;
      
      const date = new Date(yearMonth + '-01');
      option.textContent = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      
      if (yearMonth === state.selectedMonth) {
        option.selected = true;
      }
      
      monthSelect.appendChild(option);
    });
    
    // Populate history table
    const historyBody = document.getElementById('history-body');
    historyBody.innerHTML = '';
    
    const yearMonth = state.selectedMonth;
    const entriesForMonth = Object.keys(state.entries)
      .filter(dateStr => dateStr.startsWith(yearMonth))
      .sort((a, b) => b.localeCompare(a));
    
    entriesForMonth.forEach(dateStr => {
      const entry = state.entries[dateStr];
      
      const row = document.createElement('tr');
      
      const dateCell = document.createElement('td');
      dateCell.textContent = formatDisplayDate(dateStr);
      row.appendChild(dateCell);
      
      const waterCell = document.createElement('td');
      waterCell.textContent = `${entry.water} ml`;
      row.appendChild(waterCell);
      
      const proteinCell = document.createElement('td');
      proteinCell.textContent = `${entry.protein} g`;
      row.appendChild(proteinCell);
      
      const notesCell = document.createElement('td');
      notesCell.textContent = entry.notes || '-';
      row.appendChild(notesCell);
      
      const actionsCell = document.createElement('td');
      const editButton = document.createElement('button');
      editButton.textContent = 'Edit';
      editButton.style.padding = '0.25rem 0.5rem';
      editButton.style.fontSize = '0.875rem';
      
      editButton.addEventListener('click', () => {
        document.getElementById('log-date').value = dateStr;
        document.getElementById('water-intake').value = entry.water;
        document.getElementById('protein-intake').value = entry.protein;
        document.getElementById('notes').value = entry.notes || '';
        
        switchTab('tracker');
      });
      
      actionsCell.appendChild(editButton);
      row.appendChild(actionsCell);
      
      historyBody.appendChild(row);
    });
  }
  
  function updateTrends() {
    // Get the last 30 days of data
    const today = new Date();
    const dates = [];
    const waterData = [];
    const proteinData = [];
    
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = formatDate(date);
      const entry = getEntryForDate(dateStr);
      
      dates.push(dateStr);
      waterData.push(entry.water);
      proteinData.push(entry.protein);
    }
    
    // Create water chart
    const waterCtx = document.getElementById('water-chart').getContext('2d');
    if (window.waterChart) {
      window.waterChart.destroy();
    }
    window.waterChart = new Chart(waterCtx, {
      type: 'line',
      data: {
        labels: dates.map(date => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
        datasets: [{
          label: 'Water Intake (ml)',
          data: waterData,
          backgroundColor: 'rgba(59, 130, 246, 0.2)',
          borderColor: 'rgba(59, 130, 246, 1)',
          borderWidth: 2,
          tension: 0.4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Water (ml)'
            }
          },
          x: {
            title: {
              display: true,
              text: 'Date'
            }
          }
        }
      }
    });
    
    // Create protein chart
    const proteinCtx = document.getElementById('protein-chart').getContext('2d');
    if (window.proteinChart) {
      window.proteinChart.destroy();
    }
    window.proteinChart = new Chart(proteinCtx, {
      type: 'line',
      data: {
        labels: dates.map(date => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
        datasets: [{
          label: 'Protein Intake (g)',
          data: proteinData,
          backgroundColor: 'rgba(16, 185, 129, 0.2)',
          borderColor: 'rgba(16, 185, 129, 1)',
          borderWidth: 2,
          tension: 0.4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Protein (g)'
            }
          },
          x: {
            title: {
              display: true,
              text: 'Date'
            }
          }
        }
      }
    });
  }
  
  // Event handlers
  function switchTab(tabId) {
    // Remove active class from all tabs and panels
    document.querySelectorAll('.tab').forEach(tab => {
      tab.classList.remove('active');
    });
    
    document.querySelectorAll('.panel').forEach(panel => {
      panel.classList.remove('active');
    });
    
    // Add active class to selected tab and panel
    document.querySelector(`.tab[data-tab="${tabId}"]`).classList.add('active');
    document.getElementById(tabId).classList.add('active');
  }
  
  // Initialize app
  function initApp() {
    // Set default date to today
    document.getElementById('log-date').value = formatDate(state.currentDate);
    
    // Set settings values
    document.getElementById('water-goal').value = state.settings.waterGoal;
    document.getElementById('protein-goal').value = state.settings.proteinGoal;
    
    // Add tab switching event listeners
    document.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', () => {
        switchTab(tab.dataset.tab);
      });
    });
    
    // Add event listener for log form
    document.getElementById('log-form').addEventListener('submit', function(e) {
      e.preventDefault();
      
      const date = document.getElementById('log-date').value;
      const water = parseInt(document.getElementById('water-intake').value) || 0;
      const protein = parseInt(document.getElementById('protein-intake').value) || 0;
      const notes = document.getElementById('notes').value;
      
      updateEntry(date, {
        water,
        protein,
        notes
      });
      
      showToast('Entry saved successfully!');
      
      // Reset form
      document.getElementById('water-intake').value = '';
      document.getElementById('protein-intake').value = '';
      document.getElementById('notes').value = '';
      
      // Switch to dashboard
      switchTab('dashboard');
    });
    
    // Quick add buttons
    document.getElementById('add-water').addEventListener('click', function() {
      const amount = parseInt(document.getElementById('quick-water').value) || 0;
      if (amount > 0) {
        const today = formatDate(state.currentDate);
        const currentEntry = getEntryForDate(today);
        
        updateEntry(today, {
          water: currentEntry.water + amount
        });
        
        showToast(`Added ${amount}ml of water!`);
        document.getElementById('quick-water').value = '';
      }
    });
    
    document.getElementById('add-protein').addEventListener('click', function() {
      const amount = parseInt(document.getElementById('quick-protein').value) || 0;
      if (amount > 0) {
        const today = formatDate(state.currentDate);
        const currentEntry = getEntryForDate(today);
        
        updateEntry(today, {
          protein: currentEntry.protein + amount
        });
        
        showToast(`Added ${amount}g of protein!`);
        document.getElementById('quick-protein').value = '';
      }
    });
    
    // Calendar navigation
    document.getElementById('prev-month').addEventListener('click', function() {
      state.currentMonth.setMonth(state.currentMonth.getMonth() - 1);
      updateCalendar();
    });
    
    document.getElementById('next-month').addEventListener('click', function() {
      state.currentMonth.setMonth(state.currentMonth.getMonth() + 1);
      updateCalendar();
    });
    
    // History month selection
    document.getElementById('history-month').addEventListener('change', function() {
      state.selectedMonth = this.value;
      updateHistory();
    });
    
    // Settings modal
    document.getElementById('settings-btn').addEventListener('click', function() {
      document.getElementById('settings-modal').classList.add('active');
    });
    
    document.getElementById('close-settings').addEventListener('click', function() {
      document.getElementById('settings-modal').classList.remove('active');
    });
    
    document.getElementById('settings-form').addEventListener('submit', function(e) {
      e.preventDefault();
      
      const waterGoal = parseInt(document.getElementById('water-goal').value) || 3000;
      const proteinGoal = parseInt(document.getElementById('protein-goal').value) || 160;
      
      state.settings = {
        waterGoal,
        proteinGoal
      };
      
      saveSettings();
      updateUI();
      
      document.getElementById('settings-modal').classList.remove('active');
      showToast('Settings saved successfully!');
    });
    
    // Initialize UI
    updateUI();
  }
  
  // Initialize the app
  initApp();
});
