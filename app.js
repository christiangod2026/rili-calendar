// 排班日历 - 核心逻辑

// 状态
let currentDate = new Date();
let settings = {
    workDays: 5,
    restDays: 2,
    startDate: null,
    startStatus: 'work'
};
let manualOverrides = {};  // { 'YYYY-MM-DD': 'work' | 'rest' }
let editingDate = null;

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    loadSettings();
    loadOverrides();
    renderCalendar();
    
    const today = new Date();
    document.getElementById('startDate').value = formatDateForInput(today);
});

// ========== 工具函数 ==========

function formatDateForInput(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function formatDateDisplay(date) {
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
}

function getWeekDayName(date) {
    const names = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    return names[date.getDay()];
}

// ========== 设置管理 ==========

function loadSettings() {
    const saved = localStorage.getItem('scheduleSettings');
    if (saved) {
        settings = JSON.parse(saved);
        document.getElementById('workDays').value = settings.workDays;
        document.getElementById('restDays').value = settings.restDays;
        document.getElementById('startDate').value = settings.startDate;
        if (settings.startStatus === 'rest') {
            document.getElementById('startRest').classList.add('active');
            document.getElementById('startWork').classList.remove('active');
        }
    } else {
        settings.startDate = formatDateForInput(new Date());
        document.getElementById('startDate').value = settings.startDate;
    }
    updatePreview();
}

function saveSettings() {
    settings.workDays = parseInt(document.getElementById('workDays').value) || 5;
    settings.restDays = parseInt(document.getElementById('restDays').value) || 2;
    settings.startDate = document.getElementById('startDate').value;
    
    if (!settings.startDate) {
        alert('请选择起始日期');
        return;
    }
    
    localStorage.setItem('scheduleSettings', JSON.stringify(settings));
    toggleSettings();
    renderCalendar();
}

function updatePreview() {
    const work = document.getElementById('workDays').value || 5;
    const rest = document.getElementById('restDays').value || 2;
    document.getElementById('cyclePreview').textContent = `上 ${work} 天，休 ${rest} 天`;
}

function adjustWork(delta) {
    const input = document.getElementById('workDays');
    let value = parseInt(input.value) || 5;
    value = Math.max(1, Math.min(30, value + delta));
    input.value = value;
    updatePreview();
}

function adjustRest(delta) {
    const input = document.getElementById('restDays');
    let value = parseInt(input.value) || 2;
    value = Math.max(1, Math.min(30, value + delta));
    input.value = value;
    updatePreview();
}

function setStartStatus(status) {
    settings.startStatus = status;
    document.getElementById('startWork').classList.toggle('active', status === 'work');
    document.getElementById('startRest').classList.toggle('active', status === 'rest');
}

function toggleSettings() {
    const panel = document.getElementById('settingsPanel');
    panel.classList.toggle('show');
}

// ========== 手动修改管理 ==========

function loadOverrides() {
    const saved = localStorage.getItem('scheduleOverrides');
    if (saved) {
        manualOverrides = JSON.parse(saved);
    }
}

function saveOverrides() {
    localStorage.setItem('scheduleOverrides', JSON.stringify(manualOverrides));
}

// ========== 排班计算 ==========

function getDayStatus(date) {
    const dateKey = formatDateForInput(date);
    
    // 手动修改优先
    if (manualOverrides[dateKey]) {
        return manualOverrides[dateKey];
    }
    
    if (!settings.startDate) return null;
    
    const start = new Date(settings.startDate);
    const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    start.setHours(0, 0, 0, 0);
    target.setHours(0, 0, 0, 0);
    
    if (target < start) return null;
    
    const diffDays = Math.floor((target - start) / (1000 * 60 * 60 * 24));
    const cycleLength = settings.workDays + settings.restDays;
    const dayInCycle = diffDays % cycleLength;
    
    if (settings.startStatus === 'work') {
        return dayInCycle < settings.workDays ? 'work' : 'rest';
    } else {
        return dayInCycle < settings.restDays ? 'rest' : 'work';
    }
}

// ========== 日历渲染 ==========

function renderCalendar() {
    const grid = document.getElementById('calendarGrid');
    const monthTitle = document.getElementById('currentMonth');
    
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    monthTitle.textContent = `${year}年${month + 1}月`;
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startWeekday = firstDay.getDay();
    const totalDays = lastDay.getDate();
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let html = '';
    let workCount = 0;
    let restCount = 0;
    
    // 填充前面的空白
    for (let i = 0; i < startWeekday; i++) {
        html += '<div class="day-cell empty"></div>';
    }
    
    for (let day = 1; day <= totalDays; day++) {
        const date = new Date(year, month, day);
        const status = getDayStatus(date);
        const isToday = date.getTime() === today.getTime();
        const dateKey = formatDateForInput(date);
        const isOverridden = !!manualOverrides[dateKey];
        
        if (status === 'work') workCount++;
        if (status === 'rest') restCount++;
        
        let classes = 'day-cell';
        if (status) classes += ` ${status}`;
        if (isToday) classes += ' today';
        if (isOverridden) classes += ' overridden';
        
        html += `<div class="${classes}" onclick="openEditPanel(${year}, ${month}, ${day})">
            <span class="day-number">${day}</span>
        </div>`;
    }
    
    grid.innerHTML = html;
    
    // 更新统计
    updateStats(workCount, restCount, totalDays);
}

function updateStats(workCount, restCount, totalDays) {
    let statsBar = document.getElementById('statsBar');
    if (!statsBar) {
        // 首次创建
        const toolbar = document.querySelector('.toolbar');
        statsBar = document.createElement('div');
        statsBar.id = 'statsBar';
        statsBar.className = 'stats-bar';
        toolbar.parentNode.insertBefore(statsBar, toolbar);
    }
    
    const unsetCount = totalDays - workCount - restCount;
    let html = `
        <div class="stat-item">
            <div class="stat-number work-num">${workCount}</div>
            <div class="stat-label">上班</div>
        </div>
        <div class="stat-item">
            <div class="stat-number rest-num">${restCount}</div>
            <div class="stat-label">休息</div>
        </div>`;
    if (unsetCount > 0) {
        html += `
        <div class="stat-item">
            <div class="stat-number" style="color:var(--text-secondary)">${unsetCount}</div>
            <div class="stat-label">未设置</div>
        </div>`;
    }
    html += `
        <div class="stat-item">
            <div class="stat-number" style="color:var(--text-primary)">${totalDays}</div>
            <div class="stat-label">总计</div>
        </div>`;
    
    statsBar.innerHTML = html;
}

// ========== 单天编辑 ==========

function openEditPanel(year, month, day) {
    const date = new Date(year, month, day);
    const dateKey = formatDateForInput(date);
    editingDate = dateKey;
    
    document.getElementById('editDate').textContent = 
        `${formatDateDisplay(date)} ${getWeekDayName(date)}`;
    
    document.getElementById('editPanel').classList.add('show');
}

function closeEditPanel() {
    document.getElementById('editPanel').classList.remove('show');
    editingDate = null;
}

function setDayStatus(status) {
    if (!editingDate) return;
    manualOverrides[editingDate] = status;
    saveOverrides();
    closeEditPanel();
    renderCalendar();
}

function resetDayStatus() {
    if (!editingDate) return;
    delete manualOverrides[editingDate];
    saveOverrides();
    closeEditPanel();
    renderCalendar();
}

// ========== 导航 ==========

function prevMonth() {
    currentDate.setMonth(currentDate.getMonth() - 1);
    renderCalendar();
}

function nextMonth() {
    currentDate.setMonth(currentDate.getMonth() + 1);
    renderCalendar();
}

function goToday() {
    currentDate = new Date();
    renderCalendar();
}

function showMonthPicker() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;
    const input = prompt(`请输入年月（如 2026-3）:`, `${year}-${month}`);
    if (input) {
        const parts = input.split('-');
        if (parts.length === 2) {
            const y = parseInt(parts[0]);
            const m = parseInt(parts[1]) - 1;
            if (y >= 2000 && y <= 2100 && m >= 0 && m <= 11) {
                currentDate = new Date(y, m, 1);
                renderCalendar();
            }
        }
    }
}

// ========== 事件监听 ==========

document.getElementById('workDays').addEventListener('input', updatePreview);
document.getElementById('restDays').addEventListener('input', updatePreview);

// 点击遮罩关闭面板
document.getElementById('settingsPanel').addEventListener('click', function(e) {
    if (e.target === this) toggleSettings();
});
document.getElementById('editPanel').addEventListener('click', function(e) {
    if (e.target === this) closeEditPanel();
});

// ========== 滑动切换月份 ==========

let touchStartX = 0;
let touchStartY = 0;
let isSwiping = false;

const container = document.querySelector('.container');

container.addEventListener('touchstart', function(e) {
    // 不在面板打开时触发
    if (document.getElementById('settingsPanel').classList.contains('show')) return;
    if (document.getElementById('editPanel').classList.contains('show')) return;
    
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
    isSwiping = true;
}, { passive: true });

container.addEventListener('touchend', function(e) {
    if (!isSwiping) return;
    isSwiping = false;
    
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    
    const diffX = touchEndX - touchStartX;
    const diffY = touchEndY - touchStartY;
    
    // 水平滑动距离 > 50px 且 > 垂直距离
    if (Math.abs(diffX) > 50 && Math.abs(diffX) > Math.abs(diffY) * 1.5) {
        if (diffX > 0) {
            prevMonth();
        } else {
            nextMonth();
        }
    }
}, { passive: true });
