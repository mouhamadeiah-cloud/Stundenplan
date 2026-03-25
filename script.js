// script.js
// Global variables
let currentWorkers = [];
let currentScheduleData = {};
let currentCellCallback = null;

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    initHamburgerMenu();
    
    // Display current week info
    const dateInfoElement = document.getElementById('currentDateInfo');
    if (dateInfoElement) {
        const now = new Date();
        const weekNumber = getCurrentWeekNumber();
        const month = now.toLocaleString('de-DE', { month: 'long' });
        const year = now.getFullYear();
        dateInfoElement.textContent = `Stundenplan für KW ${weekNumber} | ${month} ${year}`;
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

// Index Page
function initIndexPage() {
    const schedules = getSchedules();
    const scheduleNames = Object.keys(schedules);
    
    if (scheduleNames.length === 0) {
        document.getElementById('scheduleTableWrapper').innerHTML = '<div class="loading">Kein Stundenplan vorhanden. Bitte erstellen Sie zuerst einen Stundenplan im Admin-Bereich.</div>';
        document.getElementById('currentScheduleName').textContent = '-';
        return;
    }
    
    let currentName = getCurrentScheduleName();
    let scheduleData = null;
    
    if (!currentName || !schedules[currentName]) {
        currentName = scheduleNames[scheduleNames.length - 1];
        setCurrentScheduleName(currentName);
    }
    
    scheduleData = schedules[currentName];
    
    if (scheduleData) {
        document.getElementById('currentScheduleName').textContent = currentName;
        currentWorkers = getWorkers();
        renderScheduleTableReadOnly(scheduleData);
        initIndexPdfButton();
    } else {
        document.getElementById('scheduleTableWrapper').innerHTML = '<div class="loading">Fehler beim Laden des Stundenplans.</div>';
    }
}

// Initialize PDF button on index page
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

// Export schedule as PDF
// Export schedule as PDF
function exportToPDF() {
    const tableWrapper = document.querySelector('.table-wrapper');
    const scheduleNameElement = document.getElementById('currentScheduleName');
    const scheduleName = scheduleNameElement ? scheduleNameElement.textContent : 'Stundenplan';
    
    // Get current date info
    const dateInfoElement = document.getElementById('currentDateInfo');
    const dateInfo = dateInfoElement ? dateInfoElement.textContent : '';
    
    // Get current week number, month and year
    const now = new Date();
    const weekNumber = getCurrentWeekNumber();
    const month = now.toLocaleString('de-DE', { month: 'long' });
    const year = now.getFullYear();
    const formattedDate = `${month} ${year} | KW ${weekNumber}`;
    
    if (!tableWrapper || tableWrapper.innerHTML.includes('Kein Stundenplan') || tableWrapper.innerHTML.includes('Lade Stundenplan')) {
        alert('Kein Stundenplan zum Exportieren vorhanden.');
        return;
    }
    
    // Create a temporary container for better print layout
    const originalTitle = document.title;
    document.title = `${scheduleName} - Die Primel Eiscafé`;
    
    // Add a temporary style for print
    const style = document.createElement('style');
    style.textContent = `
        @media print {
            .pdf-header {
                display: block !important;
                text-align: center;
                margin-bottom: 20px;
                padding: 10px;
            }
            .pdf-header h1 {
                color: #667eea;
                font-size: 18px;
                margin: 0;
            }
            .pdf-header .pdf-subtitle {
                font-size: 14px;
                color: #666;
                margin: 5px 0;
            }
            .pdf-header .pdf-schedule-name {
                font-size: 16px;
                font-weight: bold;
                margin: 10px 0;
            }
            .pdf-header .pdf-date-info {
                font-size: 12px;
                color: #888;
                margin-top: 5px;
            }
        }
    `;
    document.head.appendChild(style);
    
    // Add header info to the page temporarily for printing
    const mainContent = document.querySelector('.main-content');
    const existingHeader = document.getElementById('pdfPrintHeader');
    if (existingHeader) {
        existingHeader.remove();
    }
    
    const printHeader = document.createElement('div');
    printHeader.id = 'pdfPrintHeader';
    printHeader.className = 'pdf-header';
    printHeader.style.display = 'none';
    printHeader.innerHTML = `
        <h1>Die Primel Eiscafé</h1>
        <div class="pdf-subtitle">Stundenplan</div>
        <div class="pdf-schedule-name">${escapeHtml(scheduleName)}</div>
        <div class="pdf-date-info">${dateInfo || formattedDate}</div>
    `;
    
    // Insert header at the beginning of main content
    mainContent.insertBefore(printHeader, mainContent.firstChild);
    
    // Show header for print
    printHeader.style.display = 'block';
    
    // Print
    window.print();
    
    // Clean up
    setTimeout(() => {
        printHeader.remove();
        style.remove();
        document.title = originalTitle;
    }, 1000);
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

// Render cell content with worker chips
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

// Admin Page
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
        alert('Bitte geben Sie gültige monatliche Stunden ein');
        return;
    }
    
    if (isNaN(hourlyRate) || hourlyRate <= 0) {
        alert('Bitte geben Sie einen gültigen Stundenlohn ein');
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
        alert('Bitte fügen Sie zuerst Mitarbeiter hinzu');
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
        alert('Bitte geben Sie einen Namen für den Stundenplan ein');
        return;
    }
    
    if (!currentScheduleData || Object.keys(currentScheduleData).length === 0) {
        currentScheduleData = getEmptySchedule();
    }
    
    saveSchedule(name, currentScheduleData);
    loadScheduleFilter();
    document.getElementById('saveScheduleName').value = '';
    alert(`Stundenplan "${name}" wurde gespeichert.`);
}

function clearSchedule() {
    if (confirm('Möchten Sie den gesamten Stundenplan leeren?')) {
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
        if (confirm('Möchten Sie einen neuen leeren Stundenplan erstellen?')) {
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