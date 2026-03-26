// script.js
// Global variables
let currentWorkers = [];
let currentScheduleData = {};
let currentCellCallback = null;
let currentDisplayMode = 'current'; // 'current' or 'next'

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    initHamburgerMenu();
    
    // Display current week info in header
    const dateInfoElement = document.getElementById('currentDateInfo');
    if (dateInfoElement) {
        const formattedDate = getFormattedWeekInfo(0);
        dateInfoElement.textContent = `Stundenplan fuer ${formattedDate}`;
    }
    
    // Check which page we're on
    if (window.location.pathname.includes('admin.html')) {
        initAdminPage();
    } else {
        initIndexPage();
    }
});

// Hamburger menu functionality
function initHamburgerMenu() {
    const hamburger = document.getElementById('hamburgerBtn');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.createElement('div');
    overlay.className = 'overlay';
    document.body.appendChild(overlay);
    
    if (hamburger) {
        hamburger.addEventListener('click', () => {
            sidebar.classList.toggle('open');
            overlay.classList.toggle('show');
        });
        
        overlay.addEventListener('click', () => {
            sidebar.classList.remove('open');
            overlay.classList.remove('show');
        });
    }
}

// ========== INDEX PAGE ==========
function initIndexPage() {
    // Load current week schedule by default
    loadDisplaySchedule('current');
    initToggleButton();
    initIndexPdfButton();
    initWhatsAppButton();
}

function loadDisplaySchedule(mode) {
    currentDisplayMode = mode;
    let scheduleName = null;
    
    if (mode === 'current') {
        scheduleName = getCurrentWeekSchedule();
    } else {
        scheduleName = getNextWeekSchedule();
    }
    
    if (!scheduleName) {
        document.getElementById('scheduleTableWrapper').innerHTML = '<div class="loading">Kein Stundenplan fuer diese Woche vorhanden. Bitte im Admin-Bereich einen Plan zuweisen.</div>';
        document.getElementById('currentScheduleName').textContent = getFormattedWeekInfo(mode === 'current' ? 0 : 1);
        return;
    }
    
    const scheduleData = getScheduleData(scheduleName);
    
    if (scheduleData) {
        const displayTitle = getFormattedWeekInfo(mode === 'current' ? 0 : 1);
        document.getElementById('currentScheduleName').textContent = displayTitle;
        currentWorkers = getWorkers();
        renderScheduleTableReadOnly(scheduleData);
    } else {
        document.getElementById('scheduleTableWrapper').innerHTML = '<div class="loading">Stundenplan konnte nicht geladen werden.</div>';
        document.getElementById('currentScheduleName').textContent = getFormattedWeekInfo(mode === 'current' ? 0 : 1);
    }
}

function initToggleButton() {
    const toggleBtn = document.getElementById('toggleWeekBtn');
    if (toggleBtn) {
        const newBtn = toggleBtn.cloneNode(true);
        toggleBtn.parentNode.replaceChild(newBtn, toggleBtn);
        newBtn.addEventListener('click', () => {
            if (currentDisplayMode === 'current') {
                loadDisplaySchedule('next');
                newBtn.textContent = '← Aktuelle Woche';
            } else {
                loadDisplaySchedule('current');
                newBtn.textContent = 'Naechste Woche →';
            }
        });
    }
}

function initIndexPdfButton() {
    const pdfBtn = document.getElementById('exportPdfBtn');
    if (pdfBtn) {
        const newBtn = pdfBtn.cloneNode(true);
        pdfBtn.parentNode.replaceChild(newBtn, pdfBtn);
        newBtn.addEventListener('click', function(e) {
            e.preventDefault();
            exportToPDF();
        });
    }
}

function initWhatsAppButton() {
    const whatsappBtn = document.getElementById('whatsappBtn');
    if (whatsappBtn) {
        const newBtn = whatsappBtn.cloneNode(true);
        whatsappBtn.parentNode.replaceChild(newBtn, whatsappBtn);
        newBtn.addEventListener('click', (e) => {
            e.preventDefault();
            sendToWhatsApp();
        });
    }
}

function exportToPDF() {
    const tableWrapper = document.querySelector('.table-wrapper');
    const scheduleName = document.getElementById('currentScheduleName').textContent;
    
    if (!tableWrapper || tableWrapper.innerHTML.includes('Kein Stundenplan') || tableWrapper.innerHTML.includes('Lade Stundenplan')) {
        alert('Kein Stundenplan zum Exportieren vorhanden.');
        return;
    }
    
    const originalTitle = document.title;
    document.title = `${scheduleName} - Die Primel Eiscafé`;
    window.print();
    setTimeout(() => {
        document.title = originalTitle;
    }, 1000);
}

function sendToWhatsApp() {
    // Get current schedule info
    const scheduleName = document.getElementById('currentScheduleName').textContent;
    const cafeName = 'Die Primel Eiscafé';
    
    // Get the table data
    const table = document.querySelector('.schedule-table');
    if (!table) {
        alert('Kein Stundenplan zum Senden vorhanden.');
        return;
    }
    
    // Extract table content
    const rows = table.querySelectorAll('tr');
    let message = `*${cafeName}*\n*${scheduleName}*\n\n`;
    
    rows.forEach((row, rowIndex) => {
        const cells = row.querySelectorAll('th, td');
        const rowData = [];
        cells.forEach(cell => {
            let cellText = cell.innerText.trim();
            // Clean up cell text (remove extra spaces and newlines)
            cellText = cellText.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
            if (cellText === '-') cellText = '—';
            rowData.push(cellText);
        });
        
        if (rowData.length > 0) {
            message += rowData.join(' | ') + '\n';
        }
    });
    
    // Add footer
    message += `\n📅 Erstellt am: ${new Date().toLocaleString('de-DE')}`;
    message += `\n🔗 Die Primel Eiscafé Stundenplan`;
    
    // Encode for WhatsApp
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/?text=${encodedMessage}`;
    
    // Open WhatsApp
    window.open(whatsappUrl, '_blank');
}

// Render schedule table for readonly view
function renderScheduleTableReadOnly(scheduleData) {
    const wrapper = document.getElementById('scheduleTableWrapper');
    if (!wrapper) return;
    
    const days = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];
    const hours = [];
    for (let i = 10; i <= 19; i++) {
        hours.push(`${i}:00 - ${i+1}:00`);
    }
    
    let html = '<table class="schedule-table"><thead><tr><th>Uhrzeit / Tag</th>';
    days.forEach(day => {
        html += `<th>${day}</th>`;
    });
    html += '</tr></thead><tbody>';
    
    hours.forEach(hour => {
        html += `<tr><th>${hour}</th>`;
        days.forEach(day => {
            const workers = scheduleData[day]?.[hour] || [];
            html += `<td>${renderCellContent(workers)}</td>`;
        });
        html += '</tr>';
    });
    
    html += '</tbody></table>';
    wrapper.innerHTML = html;
}

function renderCellContent(workers) {
    if (!workers || workers.length === 0) {
        return '<div class="cell-workers"><span style="color:#999;">-</span></div>';
    }
    
    const workerMap = {};
    currentWorkers.forEach(w => {
        workerMap[w.id] = w;
    });
    
    const chips = workers.map(workerId => {
        const worker = workerMap[workerId];
        if (!worker) return '';
        return `<span class="worker-chip" style="background: ${worker.color}">${escapeHtml(worker.name)}</span>`;
    }).filter(c => c);
    
    return `<div class="cell-workers">${chips.join('')}</div>`;
}

// ========== ADMIN PAGE ==========
function initAdminPage() {
    loadWorkers();
    loadScheduleFilter();
    initScheduleTable();
    
    const addBtn = document.getElementById('addWorkerBtn');
    if (addBtn) addBtn.addEventListener('click', addNewWorker);
    
    const saveBtn = document.getElementById('saveScheduleBtn');
    if (saveBtn) saveBtn.addEventListener('click', saveCurrentSchedule);
    
    const clearBtn = document.getElementById('clearScheduleBtn');
    if (clearBtn) clearBtn.addEventListener('click', clearSchedule);
    
    const loadBtn = document.getElementById('loadScheduleBtn');
    if (loadBtn) loadBtn.addEventListener('click', loadSelectedSchedule);
    
    const setCurrentBtn = document.getElementById('setAsCurrentWeekBtn');
    if (setCurrentBtn) setCurrentBtn.addEventListener('click', setAsCurrentWeek);
    
    const setNextBtn = document.getElementById('setAsNextWeekBtn');
    if (setNextBtn) setNextBtn.addEventListener('click', setAsNextWeek);
    
    const modal = document.getElementById('workerModal');
    if (modal) {
        const closeBtn = modal.querySelector('.modal-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                modal.classList.remove('show');
            });
        }
        const fertigBtn = document.getElementById('modalFertigBtn');
        if (fertigBtn) {
            fertigBtn.addEventListener('click', () => {
                if (currentCellCallback) {
                    const selectedWorkers = getSelectedWorkersFromModal();
                    currentCellCallback(selectedWorkers);
                }
                modal.classList.remove('show');
            });
        }
    }
}

function setAsCurrentWeek() {
    const currentScheduleName = getCurrentScheduleName();
    if (!currentScheduleName) {
        alert('Kein Stundenplan geladen. Bitte laden oder speichern Sie zuerst einen Plan.');
        return;
    }
    setCurrentWeekSchedule(currentScheduleName);
    alert(`"${currentScheduleName}" wurde als aktueller Wochenplan gespeichert.`);
}

function setAsNextWeek() {
    const currentScheduleName = getCurrentScheduleName();
    if (!currentScheduleName) {
        alert('Kein Stundenplan geladen. Bitte laden oder speichern Sie zuerst einen Plan.');
        return;
    }
    setNextWeekSchedule(currentScheduleName);
    alert(`"${currentScheduleName}" wurde als naechster Wochenplan gespeichert.`);
}

function loadWorkers() {
    currentWorkers = getWorkers();
    renderWorkersList();
}

function renderWorkersList() {
    const container = document.getElementById('workersList');
    if (!container) return;
    
    if (currentWorkers.length === 0) {
        container.innerHTML = '<p class="loading">Keine Mitarbeiter vorhanden</p>';
        return;
    }
    
    container.innerHTML = currentWorkers.map(worker => `
        <div class="worker-card" style="border-left-color: ${worker.color}">
            <div class="worker-color" style="background: ${worker.color}"></div>
            <div class="worker-info">
                <div class="worker-name">${escapeHtml(worker.name)}</div>
                <div class="worker-details">
                    Start: ${worker.startDate || '-'} | 
                    Max: ${worker.monthlyHours || 0}h | 
                    Lohn: ${worker.hourlyRate || 0}€
                </div>
            </div>
            <button class="delete-worker" data-id="${worker.id}">×</button>
        </div>
    `).join('');
    
    document.querySelectorAll('.delete-worker').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = btn.dataset.id;
            deleteWorker(id);
            loadWorkers();
            renderScheduleTable(currentScheduleData, false);
        });
    });
}

function addNewWorker() {
    const name = document.getElementById('workerName').value.trim();
    const color = document.getElementById('workerColor').value;
    const startDate = document.getElementById('workerStartDate').value;
    const monthlyHours = parseFloat(document.getElementById('workerMonthlyHours').value);
    const hourlyRate = parseFloat(document.getElementById('workerHourlyRate').value);
    
    if (!name) {
        alert('Bitte geben Sie einen Namen ein');
        return;
    }
    
    if (isNaN(monthlyHours) || monthlyHours <= 0) {
        alert('Bitte geben Sie gueltige monatliche Stunden ein');
        return;
    }
    
    if (isNaN(hourlyRate) || hourlyRate <= 0) {
        alert('Bitte geben Sie einen gueltigen Stundenlohn ein');
        return;
    }
    
    addWorker({
        name: name,
        color: color,
        startDate: startDate,
        monthlyHours: monthlyHours,
        hourlyRate: hourlyRate
    });
    
    document.getElementById('workerName').value = '';
    document.getElementById('workerColor').value = '#4CAF50';
    document.getElementById('workerStartDate').value = '';
    document.getElementById('workerMonthlyHours').value = '';
    document.getElementById('workerHourlyRate').value = '';
    
    loadWorkers();
    renderScheduleTable(currentScheduleData, false);
}

function initScheduleTable() {
    const lastScheduleName = getCurrentScheduleName();
    if (lastScheduleName) {
        const savedData = getScheduleData(lastScheduleName);
        if (savedData) {
            currentScheduleData = savedData;
        } else {
            currentScheduleData = getEmptySchedule();
        }
    } else {
        const latest = getLatestSchedule();
        if (latest && latest.data) {
            currentScheduleData = latest.data;
        } else {
            currentScheduleData = getEmptySchedule();
        }
    }
    renderScheduleTable(currentScheduleData, false);
}

function renderScheduleTable(scheduleData, readonly = false) {
    const wrapper = document.getElementById('scheduleTableWrapper');
    if (!wrapper) return;
    
    const days = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];
    const hours = [];
    for (let i = 10; i <= 19; i++) {
        hours.push(`${i}:00 - ${i+1}:00`);
    }
    
    let html = '<table class="schedule-table"><thead><tr><th>Uhrzeit / Tag</th>';
    days.forEach(day => {
        html += `<th>${day}</th>`;
    });
    html += '</tr></thead><tbody>';
    
    hours.forEach(hour => {
        html += `<tr><th>${hour}</th>`;
        days.forEach(day => {
            const workers = scheduleData[day]?.[hour] || [];
            if (readonly) {
                html += `<td>${renderCellContent(workers)}</td>`;
            } else {
                html += `<td class="editable-cell" data-day="${day}" data-hour="${hour}">${renderCellContent(workers)}</td>`;
            }
        });
        html += '</tr>';
    });
    
    html += '</tbody></table>';
    wrapper.innerHTML = html;
    
    if (!readonly) {
        document.querySelectorAll('.editable-cell').forEach(cell => {
            cell.addEventListener('click', (e) => {
                const day = cell.dataset.day;
                const hour = cell.dataset.hour;
                openWorkerModal(day, hour);
            });
        });
    }
}

function openWorkerModal(day, hour) {
    if (currentWorkers.length === 0) {
        alert('Bitte fuegen Sie zuerst Mitarbeiter hinzu');
        return;
    }
    
    const currentWorkersInCell = currentScheduleData[day]?.[hour] || [];
    
    const modal = document.getElementById('workerModal');
    const checklist = document.getElementById('workerChecklist');
    
    checklist.innerHTML = currentWorkers.map(worker => `
        <label class="worker-checkbox">
            <input type="checkbox" value="${worker.id}" ${currentWorkersInCell.includes(worker.id) ? 'checked' : ''}>
            <div class="worker-color-dot" style="background: ${worker.color}"></div>
            <span class="worker-name">${escapeHtml(worker.name)}</span>
        </label>
    `).join('');
    
    currentCellCallback = (selectedWorkerIds) => {
        if (!currentScheduleData[day]) currentScheduleData[day] = {};
        currentScheduleData[day][hour] = selectedWorkerIds;
        renderScheduleTable(currentScheduleData, false);
    };
    
    modal.classList.add('show');
}

function getSelectedWorkersFromModal() {
    const checkboxes = document.querySelectorAll('#workerChecklist input[type="checkbox"]');
    const selected = [];
    checkboxes.forEach(cb => {
        if (cb.checked) {
            selected.push(cb.value);
        }
    });
    return selected;
}

function saveCurrentSchedule() {
    const name = document.getElementById('saveScheduleName').value.trim();
    if (!name) {
        alert('Bitte geben Sie einen Namen fuer den Stundenplan ein');
        return;
    }
    
    if (!currentScheduleData || Object.keys(currentScheduleData).length === 0) {
        currentScheduleData = getEmptySchedule();
    }
    
    saveScheduleWithName(name, currentScheduleData);
    setCurrentScheduleName(name);
    loadScheduleFilter();
    document.getElementById('scheduleFilter').value = name;
    document.getElementById('saveScheduleName').value = '';
    alert(`Stundenplan "${name}" wurde gespeichert.`);
}

function clearSchedule() {
    if (confirm('Moechten Sie den gesamten Stundenplan leeren?')) {
        currentScheduleData = getEmptySchedule();
        renderScheduleTable(currentScheduleData, false);
    }
}

function loadScheduleFilter() {
    const filter = document.getElementById('scheduleFilter');
    if (!filter) return;
    
    const schedules = getSchedules();
    const scheduleNames = Object.keys(schedules);
    
    filter.innerHTML = '<option value="">-- Neuen Plan erstellen --</option>' + 
        scheduleNames.map(name => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`).join('');
}

function loadSelectedSchedule() {
    const filter = document.getElementById('scheduleFilter');
    const selectedName = filter.value;
    
    if (!selectedName) {
        if (confirm('Moechten Sie einen neuen leeren Stundenplan erstellen?')) {
            currentScheduleData = getEmptySchedule();
            renderScheduleTable(currentScheduleData, false);
            setCurrentScheduleName('');
        }
        return;
    }
    
    const scheduleData = getScheduleData(selectedName);
    if (scheduleData) {
        currentScheduleData = scheduleData;
        renderScheduleTable(currentScheduleData, false);
        setCurrentScheduleName(selectedName);
        document.getElementById('saveScheduleName').value = selectedName;
    } else {
        alert('Stundenplan konnte nicht geladen werden');
    }
}

function escapeHtml(str) {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
