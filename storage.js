// storage.js
const STORAGE_KEYS = {
    WORKERS: 'primel_workers',
    SCHEDULES: 'primel_schedules',
    CURRENT_SCHEDULE: 'primel_current_schedule',
    CURRENT_WEEK_SCHEDULE: 'primel_current_week_schedule',
    NEXT_WEEK_SCHEDULE: 'primel_next_week_schedule'
};

// Worker functions
function getWorkers() {
    try {
        const workers = localStorage.getItem(STORAGE_KEYS.WORKERS);
        return workers ? JSON.parse(workers) : [];
    } catch (e) {
        console.error('Error loading workers:', e);
        return [];
    }
}

function saveWorkers(workers) {
    try {
        localStorage.setItem(STORAGE_KEYS.WORKERS, JSON.stringify(workers));
        return true;
    } catch (e) {
        console.error('Error saving workers:', e);
        return false;
    }
}

function addWorker(worker) {
    const workers = getWorkers();
    worker.id = Date.now().toString();
    workers.push(worker);
    saveWorkers(workers);
    return worker;
}

function deleteWorker(workerId) {
    let workers = getWorkers();
    workers = workers.filter(w => w.id !== workerId);
    saveWorkers(workers);
}

// Schedule functions
function getSchedules() {
    try {
        const schedules = localStorage.getItem(STORAGE_KEYS.SCHEDULES);
        return schedules ? JSON.parse(schedules) : {};
    } catch (e) {
        console.error('Error loading schedules:', e);
        return {};
    }
}

function saveSchedule(name, scheduleData) {
    try {
        const schedules = getSchedules();
        schedules[name] = scheduleData;
        localStorage.setItem(STORAGE_KEYS.SCHEDULES, JSON.stringify(schedules));
        localStorage.setItem(STORAGE_KEYS.CURRENT_SCHEDULE, name);
        return schedules;
    } catch (e) {
        console.error('Error saving schedule:', e);
        return {};
    }
}

function saveScheduleWithName(name, scheduleData) {
    try {
        const schedules = getSchedules();
        schedules[name] = scheduleData;
        localStorage.setItem(STORAGE_KEYS.SCHEDULES, JSON.stringify(schedules));
        return schedules;
    } catch (e) {
        console.error('Error saving schedule:', e);
        return {};
    }
}

function getCurrentScheduleName() {
    return localStorage.getItem(STORAGE_KEYS.CURRENT_SCHEDULE) || '';
}

function setCurrentScheduleName(name) {
    localStorage.setItem(STORAGE_KEYS.CURRENT_SCHEDULE, name);
}

function getScheduleData(name) {
    const schedules = getSchedules();
    return schedules[name] || null;
}

function getLatestSchedule() {
    const schedules = getSchedules();
    const currentName = getCurrentScheduleName();
    
    if (currentName && schedules[currentName]) {
        return { name: currentName, data: schedules[currentName] };
    }
    
    const names = Object.keys(schedules);
    if (names.length > 0) {
        return { name: names[names.length - 1], data: schedules[names[names.length - 1]] };
    }
    
    return null;
}

// Week assignment functions
function setCurrentWeekSchedule(scheduleName) {
    localStorage.setItem(STORAGE_KEYS.CURRENT_WEEK_SCHEDULE, scheduleName);
}

function getCurrentWeekSchedule() {
    return localStorage.getItem(STORAGE_KEYS.CURRENT_WEEK_SCHEDULE) || null;
}

function setNextWeekSchedule(scheduleName) {
    localStorage.setItem(STORAGE_KEYS.NEXT_WEEK_SCHEDULE, scheduleName);
}

function getNextWeekSchedule() {
    return localStorage.getItem(STORAGE_KEYS.NEXT_WEEK_SCHEDULE) || null;
}

// Date functions
function getCurrentWeekNumber() {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 1);
    const days = Math.floor((now - start) / (24 * 60 * 60 * 1000));
    return Math.ceil((days + start.getDay() + 1) / 7);
}

function getFormattedWeekInfo(offsetWeeks = 0) {
    const now = new Date();
    const targetDate = new Date(now);
    targetDate.setDate(now.getDate() + (offsetWeeks * 7));
    
    const weekNumber = getWeekNumberForDate(targetDate);
    const month = targetDate.toLocaleString('de-DE', { month: 'long' });
    const year = targetDate.getFullYear();
    
    return `KW ${weekNumber} ${month} ${year}`;
}

function getWeekNumberForDate(date) {
    const start = new Date(date.getFullYear(), 0, 1);
    const days = Math.floor((date - start) / (24 * 60 * 60 * 1000));
    return Math.ceil((days + start.getDay() + 1) / 7);
}

function getEmptySchedule() {
    const days = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];
    const hours = [];
    for (let i = 10; i <= 19; i++) {
        hours.push(`${i}:00 - ${i+1}:00`);
    }
    
    const schedule = {};
    days.forEach(day => {
        schedule[day] = {};
        hours.forEach(hour => {
            schedule[day][hour] = [];
        });
    });
    return schedule;
}
