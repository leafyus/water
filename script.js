// Debug helper to check if script is loading
console.log("Script loaded");

// Global state management
const state = {
  entries: {},
  settings: {
    waterGoal: 3000,
    proteinGoal: 160
  },
  currentDate: new Date(),
  selectedDate: new Date(),
  currentMonth: new Date(),
  selectedMonth: new Date().toISOString().slice(0, 7) // YYYY-MM format
};

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
  console.log("DOM fully loaded");
  
  // Initialize Firebase Auth listener
  initAuthUI();
  
  // Utility functions
  function formatDate(date) {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  
  function formatDisplayDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  }
  
  function showToast(message, isError = false) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('show');
    
    if (isError) {
      toast.classList.add('error');
    } else {
      toast.classList.remove('error');
    }
    
    setTimeout(() => {
      toast.classList.remove('show');
    }, 3000);
  }
  
  function showLoading() {
    document.getElementById('loading-overlay').classList.add('active');
  }
  
  function hideLoading() {
    document.getElementById('loading-overlay').classList.remove('active');
  }
  
  // Firebase specific functions
  function initAuthUI() {
    // Handle login form
    document.getElementById('login-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const email = document.getElementById('login-email').value;
      const password = document.getElementById('login-password').value;
      
      showLoading();
      
      try {
        await auth.signInWithEmailAndPassword(email, password);
        document.getElementById('login-form').reset();
        showToast('Login successful!');
      } catch (error) {
        console.error('Login error:', error);
        showToast(`Login failed: ${error.message}`, true);
      } finally {
        hideLoading();
      }
    });
    
    // Handle registration form
    document.getElementById('register-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const email = document.getElementById('register-email').value;
      const password = document.getElementById('register-password').value;
      const confirm = document.getElementById('register-confirm').value;
      
      if (password !== confirm) {
        showToast('Passwords do not match', true);
        return;
      }
      
      showLoading();
      
      try {
        await auth.createUserWithEmailAndPassword(email, password);
        document.getElementById('register-form').reset();
        showToast('Registration successful!');
      } catch (error) {
        console.error('Registration error:', error);
        showToast(`Registration failed: ${error.message}`, true);
      } finally {
        hideLoading();
      }
    });
    
    // Toggle between login and registration forms
    document.getElementById('show-register').addEventListener('click', (e) => {
      e.preventDefault();
      document.getElementById('login-section').style.display = 'none';
      document.getElementById('register-section').style.display = 'block';
    });
    
    document.getElementById('show-login').addEventListener('click', (e) => {
      e.preventDefault();
      document.getElementById('login-section').style.display = 'block';
      document.getElementById('register-section').style.display = 'none';
    });
    
    // Logout button
    document.getElementById('logout-btn').addEventListener('click', async () => {
      showLoading();
      try {
        await auth.signOut();
        showToast('Logged out successfully');
      } catch (error) {
        console.error('Logout error:', error);
        showToast('Logout failed', true);
      } finally {
        hideLoading();
      }
    });
    
    // Listen for auth state changes
    auth.onAuthStateChanged(user => {
      hideLoading();
      if (user) {
        // User is signed in
        console.log('User logged in:', user.email);
        document.getElementById('auth-container').style.display = 'none';
        document.getElementById('app-container').style.display = 'block';
        
        // Set up user data reference
        userDataRef = database.ref(`users/${user.uid}`);
        
        // Initialize app when user is logged in
        initApp();
      } else {
        // User is signed out
        console.log('User logged out');
        document.getElementById('auth-container').style.display = 'block';
        document.getElementById('app-container').style.display = 'none';
      }
    });
  }
  
  async function fetchUserSettings() {
    try {
      const snapshot = await userDataRef.child('settings').once('value');
      const userSettings = snapshot.val();
      
      if (userSettings) {
        state.settings = userSettings;
        console.log('Fetched user settings:', state.settings);
      } else {
        // If no settings found, initialize default settings
        await saveUserSettings();
      }
    } catch (error) {
      console.error('Error fetching user settings:', error);
      showToast('Failed to load settings', true);
    }
  }
  
  async function saveUserSettings() {
    try {
      await userDataRef.child('settings').set(state.settings);
      console.log('Settings saved to Firebase:', state.settings);
    } catch (error) {
      console.error('Error saving settings:', error);
      showToast('Failed to save settings', true);
    }
  }
  
  async function fetchUserEntries() {
    try {
      const snapshot = await userDataRef.child('entries').once('value');
      const entries = snapshot.val() || {};
      
      state.entries = entries;
      console.log('Fetched user entries:', Object.keys(state.entries).length);
      
      updateUI();
    } catch (error) {
      console.error('Error fetching entries:', error);
      showToast('Failed to load your data', true);
    }
  }
  
  function listenForEntryChanges() {
    // Set up real-time listener for entry changes
    userDataRef.child('entries').on('value', (snapshot) => {
      const entries = snapshot.val() || {};
      
      // Only update if the data has changed
      if (JSON.stringify(entries) !== JSON.stringify(state.entries)) {
        console.log('Entries updated from Firebase');
        state.entries = entries;
        updateUI();
      }
    });
  }
  
  function getEntryForDate(date) {
    const dateKey = typeof date === 'string' ? date : formatDate(date);
    return state.entries[dateKey] || { water: 0, protein: 0, notes: '' };
  }
  
  async function updateEntry(date, data) {
    const dateKey = typeof date === 'string' ? date : formatDate(date);
    
    try {
      // Update local state
      state.entries[dateKey] = {
        ...getEntryForDate(dateKey),
        ...data
      };
      
      // Update Firebase
      await userDataRef.child(`entries/${dateKey}`).update(state.entries[dateKey]);
      console.log(`Updated entry for ${dateKey}:`, state.entries[dateKey]);
      
      // We don't need to call updateUI() here as the Firebase listener will trigger that
    } catch (error) {
      console.error('Error updating entry:', error);
      showToast('Failed to save data', true);
    }
  }
  
  // Check if a date is today
  function isToday(dateStr) {
    const today = formatDate(new Date());
    return dateStr === today;
  }
  
  // Enable or disable form based on date
  function updateFormEditability() {
    const dateInput = document.getElementById('log-date');
    const waterInput = document.getElementById('water-intake');
    const proteinInput = document.getElementById('protein-intake');
    const notesInput = document.getElementById('notes');
    const submitButton = document.getElementById('save-entry');
    
    if (!dateInput || !waterInput || !proteinInput || !notesInput || !submitButton) {
      console.error("Form elements not found");
      return;
    }
    
    const selectedDate = dateInput.value;
    const isCurrentDay = isToday(selectedDate);
    
    // Enable/disable form elements
    waterInput.disabled = !isCurrentDay;
    proteinInput.disabled = !isCurrentDay;
    notesInput.disabled = !isCurrentDay;
    submitButton.disabled = !isCurrentDay;
    
    // Visual feedback
    if (isCurrentDay) {
      submitButton.classList.remove('disabled');
      submitButton.textContent = 'Save Entry';
    } else {
      submitButton.classList.add('disabled');
      submitButton.textContent = 'Editing past/future entries not allowed';
    }
  }
  
  // UI Management
  function updateUI() {
    console.log("Updating UI");
    updateDashboard();
    updateCalendar();
    updateHistory();
    updateTrends();
  }
  
  function createWaterGlassVisual() {
    const container = document.getElementById('water-glass-container');
    if (!container) return;
    
    // Clear previous content
    container.innerHTML = '';
    
    // Create SVG element
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'water-glass');
    svg.setAttribute('viewBox', '0 0 100 160');
    
    // Glass outline (slightly tapered glass)
    const glassOutline = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    glassOutline.setAttribute('class', 'glass-outline');
    glassOutline.setAttribute('d', 'M25,10 L20,150 C20,155 80,155 80,150 L75,10 Z');
    
    // Water level (will be updated dynamically)
    const waterLevel = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    waterLevel.setAttribute('class', 'water-level');
    waterLevel.setAttribute('id', 'water-level');
    
    // Add elements to SVG
    svg.appendChild(glassOutline);
    svg.appendChild(waterLevel);
    
    // Add SVG to container
    container.appendChild(svg);
    
    return waterLevel;
  }
  
  function createProteinVisual() {
    const container = document.getElementById('protein-visual-container');
    if (!container) return;
    
    // Clear previous content
    container.innerHTML = '';
    
    // Create SVG element
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'protein-visual');
    svg.setAttribute('viewBox', '0 0 100 160');
    
    // Steak outline
    const steakOutline = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    steakOutline.setAttribute('class', 'protein-outline');
    steakOutline.setAttribute('d', 'M20,40 C20,20 40,15 50,15 C60,15 80,20 80,40 C90,60 90,80 80,100 C60,130 40,130 20,100 C10,80 10,60 20,40 Z');
    
    // Protein fill (will be updated dynamically)
    const proteinFill = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    proteinFill.setAttribute('class', 'protein-fill');
    proteinFill.setAttribute('id', 'protein-fill');
    
    // Add elements to SVG
    svg.appendChild(steakOutline);
    svg.appendChild(proteinFill);
    
    // Add SVG to container
    container.appendChild(svg);
    
    return proteinFill;
  }
  
  function updateDashboard() {
    console.log("Updating dashboard");
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
    
    // Update visual representations
    
    // 1. Water glass
    const waterLevel = document.getElementById('water-level');
    if (waterLevel) {
      // Calculate level height based on percentage (max height around 140)
      const levelHeight = 140 * (waterPercent / 100);
      const yPos = 150 - levelHeight;
      
      // Draw water level
      waterLevel.setAttribute('d', `M20,${yPos} L80,${yPos} L80,150 C80,155 20,155 20,150 Z`);
    } else {
      createWaterGlassVisual();
    }
    
    // 2. Protein visual
    const proteinFill = document.getElementById('protein-fill');
    if (proteinFill) {
      if (proteinPercent === 0) {
        proteinFill.setAttribute('d', '');
      } else {
        // Calculate what portion of the steak to fill based on percentage
        const yPos = 130 - (proteinPercent / 100 * 115);
        proteinFill.setAttribute('d', `M20,${yPos} C20,${yPos} 40,${yPos} 50,${yPos} C60,${yPos} 80,${yPos} 80,${yPos} C90,${Math.min(yPos + 20, 100)} 90,80 80,100 C60,130 40,130 20,100 C10,80 10,${Math.min(yPos + 20, 80)} 20,${yPos} Z`);
      }
    } else {
      createProteinVisual();
    }
    
    // Calculate weekly averages
    let waterTotal = 0;
    let proteinTotal = 0;
    let dayCount = 0;
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(state.currentDate);
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
    console.log("Updating calendar");
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
        console.log(`Selected date: ${dateStr}`);
        // Update selected date
        state.selectedDate = new Date(dateStr);
        
        // Update form date
        document.getElementById('log-date').value = dateStr;
        
        // Switch to tracker tab
        switchTab('tracker');
        
        // Update form editability
        updateFormEditability();
        
        // Update calendar
        updateCalendar();
      });
      
      calendar.appendChild(dayElement);
    }
  }
  
  function updateHistory() {
    console.log("Updating history");
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
        console.log(`Editing entry for ${dateStr}`);
        document.getElementById('log-date').value = dateStr;
        document.getElementById('water-intake').value = entry.water;
        document.getElementById('protein-intake').value = entry.protein;
        document.getElementById('notes').value = entry.notes || '';
        
        switchTab('tracker');
        updateFormEditability();
      });
      
      actionsCell.appendChild(editButton);
      row.appendChild(actionsCell);
      
      historyBody.appendChild(row);
    });
  }
  
  function updateTrends() {
    console.log("Updating trends");
    try {
      // Get the last 30 days of data
      const dates = [];
      const waterData = [];
      const proteinData = [];
      
      for (let i = 29; i >= 0; i--) {
        const date = new Date(state.currentDate);
        date.setDate(date.getDate() - i);
        const dateStr = formatDate(date);
        const entry = getEntryForDate(dateStr);
        
        dates.push(dateStr);
        waterData.push(entry.water);
        proteinData.push(entry.protein);
      }
      
      // Create water chart
      const waterCtx = document.getElementById('water-chart');
      if (waterCtx) {
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
      } else {
        console.error("Water chart canvas not found");
      }
      
      // Create protein chart
      const proteinCtx = document.getElementById('protein-chart');
      if (proteinCtx) {
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
      } else {
        console.error("Protein chart canvas not found");
      }
    } catch (error) {
      console.error("Error updating trends:", error);
    }
  }
  
  // Event handlers
  function switchTab(tabId) {
    console.log(`Switching to tab: ${tabId}`);
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
  
  // Initialize app after login
  async function initApp() {
    console.log("Initializing app");
    showLoading();
    
    try {
      // Load settings and entries from Firebase
      await fetchUserSettings();
      await fetchUserEntries();
      
      // Set up real-time data sync
      listenForEntryChanges();
      
      // Create visual elements
      createWaterGlassVisual();
      createProteinVisual();
      
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
      
      // Add dashboard quick-add handlers
      const dashboardAddWater = document.getElementById('dashboard-add-water');
      if (dashboardAddWater) {
        dashboardAddWater.onclick = function() {
          const amount = parseInt(document.getElementById('dashboard-water').value) || 0;
          if (amount > 0) {
            const today = formatDate(state.currentDate);
            const currentEntry = getEntryForDate(today);
            
            updateEntry(today, {
              water: currentEntry.water + amount
            });
            
            showToast(`Added ${amount}ml of water!`);
            document.getElementById('dashboard-water').value = '';
          }
        };
      }
      
      const dashboardAddProtein = document.getElementById('dashboard-add-protein');
      if (dashboardAddProtein) {
        dashboardAddProtein.onclick = function() {
          const amount = parseInt(document.getElementById('dashboard-protein').value) || 0;
          if (amount > 0) {
            const today = formatDate(state.currentDate);
            const currentEntry = getEntryForDate(today);
            
            updateEntry(today, {
              protein: currentEntry.protein + amount
            });
            
            showToast(`Added ${amount}g of protein!`);
            document.getElementById('dashboard-protein').value = '';
          }
        };
      }
      
      // Quick add buttons with direct click handlers
      const addWaterBtn = document.getElementById('add-water');
      if (addWaterBtn) {
        addWaterBtn.onclick = function() {
          console.log("Add water button clicked");
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
        };
      } else {
        console.error("Add water button not found");
      }
      
      const addProteinBtn = document.getElementById('add-protein');
      if (addProteinBtn) {
        addProteinBtn.onclick = function() {
          console.log("Add protein button clicked");
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
        };
      } else {
        console.error("Add protein button not found");
      }
      
      // Date change handler to restrict editing
      const dateInput = document.getElementById('log-date');
      if (dateInput) {
        dateInput.addEventListener('change', updateFormEditability);
      }
      
      // Add event listener for log form submission
      const logForm = document.getElementById('log-form');
      if (logForm) {
        logForm.addEventListener('submit', function(e) {
          e.preventDefault();
          console.log("Log form submitted");
          
          const date = document.getElementById('log-date').value;
          
          // Only allow editing today's entry
          if (!isToday(date)) {
            showToast('Only today\'s entries can be edited', true);
            return;
          }
          
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
      } else {
        console.error("Log form not found");
      }
      
      // Calendar navigation
      const prevMonthBtn = document.getElementById('prev-month');
      if (prevMonthBtn) {
        prevMonthBtn.onclick = function() {
          console.log("Previous month button clicked");
          state.currentMonth.setMonth(state.currentMonth.getMonth() - 1);
          updateCalendar();
        };
      } else {
        console.error("Previous month button not found");
      }
      
      const nextMonthBtn = document.getElementById('next-month');
      if (nextMonthBtn) {
        nextMonthBtn.onclick = function() {
          console.log("Next month button clicked");
          state.currentMonth.setMonth(state.currentMonth.getMonth() + 1);
          updateCalendar();
        };
      } else {
        console.error("Next month button not found");
      }
      
      // History month selection
      const historyMonth = document.getElementById('history-month');
      if (historyMonth) {
        historyMonth.onchange = function() {
          console.log("History month changed:", this.value);
          state.selectedMonth = this.value;
          updateHistory();
        };
      } else {
        console.error("History month select not found");
      }
      
      // Settings modal
      const settingsBtn = document.getElementById('settings-btn');
      if (settingsBtn) {
        settingsBtn.onclick = function() {
          console.log("Settings button clicked");
          document.getElementById('settings-modal').classList.add('active');
        };
      } else {
        console.error("Settings button not found");
      }
      
      const closeSettingsBtn = document.getElementById('close-settings');
      if (closeSettingsBtn) {
        closeSettingsBtn.onclick = function() {
          console.log("Close settings button clicked");
          document.getElementById('settings-modal').classList.remove('active');
        };
      } else {
        console.error("Close settings button not found");
      }
      
      const settingsForm = document.getElementById('settings-form');
      if (settingsForm) {
        settingsForm.onsubmit = function(e) {
          e.preventDefault();
          console.log("Settings form submitted");
          
          const waterGoal = parseInt(document.getElementById('water-goal').value) || 3000;
          const proteinGoal = parseInt(document.getElementById('protein-goal').value) || 160;
          
          state.settings = {
            waterGoal,
            proteinGoal
          };
          
          saveUserSettings();
          updateUI();
          
          document.getElementById('settings-modal').classList.remove('active');
          showToast('Settings saved successfully!');
        };
      } else {
        console.error("Settings form not found");
      }
      
      // Check initial form editability
      updateFormEditability();
      
      console.log("App initialization complete");
    } catch (error) {
      console.error("Error initializing app:", error);
      showToast("Error loading application data", true);
    } finally {
      hideLoading();
    }
  }
});
