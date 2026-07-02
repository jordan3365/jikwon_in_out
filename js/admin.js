// Configuration
const GAS_URL = 'https://script.google.com/macros/s/AKfycbwDg6__Bb2QmZoli9NKWpXG6qx_QUnQu1XnO3YbVcSJeJjbv6puiTvPGPx4z___pNytzA/exec'; 

// State
let employees = [];
let attendance = [];

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    if (sessionStorage.getItem('admin_logged_in') !== 'true') {
        const overlay = document.getElementById('login-overlay');
        if(overlay) overlay.style.display = 'flex';
    } else {
        const overlay = document.getElementById('login-overlay');
        if(overlay) overlay.style.display = 'none';
        initApp();
    }
});

function initApp() {
    initDefaultDate();
    fetchData();
    setupEventListeners();
    initCustomModal();
}

function checkAdminPassword() {
    const pw = document.getElementById('admin-pw').value;
    if (pw === '1234') { 
        sessionStorage.setItem('admin_logged_in', 'true');
        const overlay = document.getElementById('login-overlay');
        if(overlay) overlay.style.display = 'none';
        initApp();
    } else {
        alert('비밀번호가 일치하지 않습니다.');
    }
}

function initDefaultDate() {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const joinDateInput = document.getElementById('emp-join-date');
    if (joinDateInput) joinDateInput.value = today;
}


// ===== 커스텀 모달 알림/확인창 시스템 =====
function initCustomModal() {
    if (document.getElementById('custom-modal-overlay')) return;
    var overlay = document.createElement('div');
    overlay.id = 'custom-modal-overlay';
    overlay.style.cssText = 'display:none;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:9999;justify-content:center;align-items:center;';
    overlay.innerHTML = `
        <div style="background:#fff;border-radius:1rem;padding:2rem;min-width:320px;max-width:480px;box-shadow:0 20px 40px rgba(0,0,0,0.3);text-align:center;">
            <div id="cm-icon" style="font-size:2.5rem;margin-bottom:1rem;"></div>
            <h3 id="cm-title" style="font-size:1.1rem;font-weight:700;color:#1e293b;margin-bottom:0.5rem;"></h3>
            <p id="cm-message" style="font-size:0.9rem;color:#64748b;margin-bottom:1.5rem;line-height:1.6;"></p>
            <div id="cm-buttons" style="display:flex;gap:10px;justify-content:center;"></div>
        </div>`;
    document.body.appendChild(overlay);
}
function showModal(icon, title, message, buttons) {
    var overlay = document.getElementById('custom-modal-overlay');
    overlay.style.display = 'flex';
    document.getElementById('cm-icon').innerText = icon;
    document.getElementById('cm-title').innerText = title;
    document.getElementById('cm-message').innerText = message;
    var btnsEl = document.getElementById('cm-buttons');
    btnsEl.innerHTML = '';
    buttons.forEach(function(b) {
        var btn = document.createElement('button');
        btn.innerText = b.label;
        btn.style.cssText = 'padding:0.6rem 1.5rem;border-radius:0.5rem;border:none;font-weight:600;cursor:pointer;font-size:0.9rem;' + (b.style || 'background:#4f46e5;color:white;');
        btn.onclick = function() { closeCustomModal(); if (b.action) b.action(); };
        btnsEl.appendChild(btn);
    });
}
function closeCustomModal() {
    var overlay = document.getElementById('custom-modal-overlay');
    if (overlay) overlay.style.display = 'none';
}
function alertModal(message, onOk) {
    showModal('ℹ️', '알림', message, [{ label: '확인', action: onOk, style: 'background:#4f46e5;color:white;' }]);
}
function successModal(message, onOk) {
    showModal('✅', '완료', message, [{ label: '확인', action: onOk, style: 'background:#10b981;color:white;' }]);
}
function errorModal(message) {
    showModal('❌', '오류', message, [{ label: '확인', style: 'background:#f43f5e;color:white;' }]);
}
function confirmModal(message, onYes, onNo) {
    showModal('❓', '확인', message, [
        { label: '예', action: onYes, style: 'background:#4f46e5;color:white;' },
        { label: '아니오', action: onNo, style: 'background:#e2e8f0;color:#1e293b;' }
    ]);
}
// ==========================================

function setupEventListeners() {
    const form = document.getElementById('employee-form');
    const phoneInput = document.getElementById('emp-phone');

    // 연락처 자동 하이픈 추가 로직
    phoneInput.addEventListener('input', (e) => {
        let val = e.target.value.replace(/[^0-9]/g, '');
        if (val.length > 3 && val.length <= 7) {
            val = val.slice(0, 3) + '-' + val.slice(3);
        } else if (val.length > 7) {
            val = val.slice(0, 3) + '-' + val.slice(3, 7) + '-' + val.slice(7, 11);
        }
        e.target.value = val;
    });

    const dateFilter = document.getElementById('attendance-date-filter');
    if (dateFilter) {
        dateFilter.addEventListener('change', updateUI);
        // Set today as default
        const now = new Date();
        const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        dateFilter.value = todayStr;
    }

    form.onsubmit = async (e) => {
        e.preventDefault();
        const editId = form.dataset.editId;
        const submitBtn = form.querySelector('button[type="submit"]');
        
        // 중복 클릭 방지
        if (submitBtn.disabled) return;
        submitBtn.disabled = true;
        submitBtn.innerText = '처리 중...';

        const formData = {
            action: editId ? 'updateEmployee' : 'addEmployee',
            id: editId || null,
            name: document.getElementById('emp-name').value,
            phone: document.getElementById('emp-phone').value,
            type: document.getElementById('emp-type').value,
            rate: Number(document.getElementById('emp-rate').value),
            birthday: document.getElementById('emp-birthday').value,
            bankName: document.getElementById('emp-bank-name').value,
            bankAccount: document.getElementById('emp-bank-account').value,
            workPart: document.getElementById('emp-work-part').value,
            joinDate: document.getElementById('emp-join-date').value,
            startTime: document.getElementById('emp-start-time').value,
            endTime: document.getElementById('emp-end-time').value
        };
        
        try {
            const res = await callGAS(formData);
            if (res.success) {
                successModal(editId ? '정보가 수정되었습니다.' : '직원이 등록되었습니다.');
                form.reset();
                initDefaultDate();
                delete form.dataset.editId;
                submitBtn.innerText = '저장 및 등록';
                submitBtn.style.background = '';
                fetchData(); // 비동기로 호출하여 UI 차단 최소화
            } else {
                errorModal('저장 실패: ' + (res.message || '알 수 없는 오류'));
            }
        } finally {
            submitBtn.disabled = false;
        }
    };
}

async function fetchData() {
    console.log('Fetching data...');
    // 1. 로컬 캐시 우선 로드
    const cachedData = localStorage.getItem('attendflow_admin_cache');
    if (cachedData) {
        try {
            const data = JSON.parse(cachedData);
            if (data && data.employees) {
                employees = data.employees;
                attendance = data.attendance || [];
                updateUI();
            }
        } catch (e) {
            localStorage.removeItem('attendflow_admin_cache');
        }
    }

    try {
        // 2. 서버 데이터 동기화
        const data = await callGAS({ action: 'getAllData' });
        if (data && data.success !== false) {
            employees = data.employees || [];
            attendance = data.attendance || [];
            localStorage.setItem('attendflow_admin_cache', JSON.stringify(data));
            updateUI();
            console.log('Data synced with server.');
        } else {
            console.warn('Server returned empty or error data');
        }
    } catch (err) {
        console.error('Data sync failed:', err);
    }
}

async function handleRefresh() {
    const icon = document.getElementById('refresh-icon');
    const btn = document.getElementById('refresh-btn');
    if (icon) icon.classList.add('spin');
    if (btn) btn.disabled = true;
    
    await fetchData();
    
    if (icon) icon.classList.remove('spin');
    if (btn) btn.disabled = false;
}

function getLocalDateFormat(dateStr) {
    if (!dateStr) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(String(dateStr).trim())) return String(dateStr).trim();
    if (String(dateStr).includes('T')) {
        const d = new Date(dateStr);
        if (!isNaN(d)) return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }
    return String(dateStr).substring(0, 10);
}

function updateUI() {
    document.getElementById('total-employees').innerText = employees.length;
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const todayAttendance = attendance.filter(a => getLocalDateFormat(a.date) === today);
    
    // 오늘 출근 현황 보드에 성함 표기
    const attendeeNames = todayAttendance.map(a => {
        const e = employees.find(emp => emp.id === a.employeeId);
        return e ? e.name : '알수없음';
    }).join(', ');
    
    document.getElementById('today-attendance').innerHTML = `
        <div class="value">${todayAttendance.length}</div>
        <div style="font-size: 0.85rem; color: var(--primary-color); margin-top: 5px;">
            ${attendeeNames || '현재 출근자 없음'}
        </div>
    `;

    const filterEl = document.getElementById('attendance-date-filter');
    const dateFilterVal = filterEl ? filterEl.value : '';
    const rangeStartEl = document.getElementById('att-range-start');
    const rangeEndEl = document.getElementById('att-range-end');
    const rangeStart = rangeStartEl ? rangeStartEl.value : '';
    const rangeEnd = rangeEndEl ? rangeEndEl.value : '';

    let filteredAttendance;
    if (rangeStart && rangeEnd) {
        // 기간 범위 검색 (시작일 ~ 종료일)
        filteredAttendance = attendance.filter(a => {
            const d = getLocalDateFormat(a.date);
            return d >= rangeStart && d <= rangeEnd;
        });
    } else if (rangeStart) {
        // 시작일만 입력된 경우: 시작일 이후
        filteredAttendance = attendance.filter(a => getLocalDateFormat(a.date) >= rangeStart);
    } else if (rangeEnd) {
        // 종료일만 입력된 경우: 종료일 이전
        filteredAttendance = attendance.filter(a => getLocalDateFormat(a.date) <= rangeEnd);
    } else if (dateFilterVal) {
        // 단일 날짜 검색
        filteredAttendance = attendance.filter(a => getLocalDateFormat(a.date) === dateFilterVal);
    } else {
        // 날짜 미지정(전체보기): 이번 달 1일~현재
        const n = new Date();
        const currentMonth = `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}`;
        filteredAttendance = attendance.filter(a => getLocalDateFormat(a.date).startsWith(currentMonth));
    }
    
    const tbody = document.getElementById('attendance-table-body');
    tbody.innerHTML = filteredAttendance.map(att => {
        const emp = employees.find(e => e.id === att.employeeId) || { name: '퇴사자' };
        const hours = calculateWorkHours(att.clockIn, att.clockOut);
        
        // 날짜와 시간을 합쳐서 표시 (YYYY-MM-DD HH:mm:ss)
        const displayDate = getLocalDateFormat(att.date);
        const displayIn = att.clockIn ? `${displayDate} ${att.clockIn}` : '-';
        const displayOut = att.clockOut ? `${displayDate} ${att.clockOut}` : '-';

        return `
            <tr>
                <td style="text-align: center;">
                    <input type="checkbox" class="att-record-check" data-att-id="${att.id}" style="width: 15px; height: 15px; cursor: pointer;">
                </td>
                <td style="font-weight: 700;">${emp.name}</td>
                <td>${displayDate}</td>
                <td style="color: #10b981; font-family: monospace;">${displayIn}</td>
                <td style="color: #f43f5e; font-family: monospace;">${displayOut}</td>
                <td style="font-weight: 600;">${hours}h</td>
                <td style="color: var(--primary-color); font-weight: 700;">₩${calculatePay(att, emp).toLocaleString()}</td>
            </tr>
        `;
    }).reverse().join(''); // 최신순

    // 전체선택 체크박스 초기화
    const selectAllCheckbox = document.getElementById('att-select-all');
    if (selectAllCheckbox) selectAllCheckbox.checked = false;

    // 2. 직원 관리 리스트 (수정/삭제/계약서)
    renderContractList();
    
    lucide.createIcons();
}

function toggleAttSelectAll(checkbox) {
    document.querySelectorAll('.att-record-check').forEach(function(cb) {
        cb.checked = checkbox.checked;
    });
}

async function deleteSelectedAttendance() {
    const checked = document.querySelectorAll('.att-record-check:checked');
    if (checked.length === 0) { alertModal('삭제할 출퇴근 기록을 선택해주세요.'); return; }
    const selectedIds = Array.from(checked).map(cb => cb.dataset.attId);
    
    confirmModal(`${selectedIds.length}개의 출퇴근 기록을 삭제하시겠습니까?`, async function() {
        try {
            var res = await callGAS({ action: 'deleteAttendance', ids: selectedIds });
            if (res && res.success) {
                successModal(res.message || '삭제가 완료되었습니다.', fetchData);
            } else {
                errorModal('오류: ' + (res ? res.message : '알 수 없는 오류'));
            }
        } catch (err) {
            errorModal('통신 오류: ' + err.message);
        }
    });
}

function renderContractList() {
    const contractList = document.getElementById('contract-list');
    contractList.innerHTML = employees.map(emp => `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px; border-bottom: 1px solid var(--glass-border);">
            <div style="display: flex; flex-direction: column;">
                <strong>${emp.name}</strong>
                <span style="font-size: 0.75rem; color: #888;">${emp.workPart || '미정'}</span>
            </div>
            <div style="display: flex; gap: 5px;">
                <button class="btn" style="width: auto; padding: 4px 8px; font-size: 0.7rem; background: #6366f1; color: white;" onclick="editEmployee('${emp.id}')">수정</button>
                <button class="btn" style="width: auto; padding: 4px 8px; font-size: 0.7rem; background: #f43f5e; color: white;" onclick="deleteEmployee('${emp.id}')">삭제</button>
                <button class="btn btn-primary" style="width: auto; padding: 4px 8px; font-size: 0.7rem; background: #10b981;" onclick="openContractModal('${emp.id}')">📄 계약서</button>
            </div>
        </div>
    `).join('');
}

// 급여 정산 모달 열기 — 모달 내 select 초기화 후 테이블 렌더링
function openPayrollModal() {
    // 모달 내부 정산월 select 초기화
    var modalSel = document.getElementById('payroll-modal-month-select');
    if (modalSel && modalSel.options.length === 0) {
        var now = new Date();
        for (var i = 0; i < 13; i++) {
            var d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            var val = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
            var opt = document.createElement('option');
            opt.value = val;
            opt.textContent = val.replace('-', '년 ') + '월';
            if (i === 0) opt.selected = true;
            modalSel.appendChild(opt);
        }
    }

    // 전체선택 초기화
    var selectAll = document.getElementById('payroll-select-all');
    if (selectAll) selectAll.checked = false;
    var countEl = document.getElementById('payroll-selected-count');
    if (countEl) countEl.innerText = '0명 선택됨';

    document.getElementById('payroll-modal').style.display = 'flex';
    renderPayrollTable();
}

// 정산 테이블 렌더링 — 모달 내 select 선택값 기준
function renderPayrollTable() {
    var modalSel = document.getElementById('payroll-modal-month-select');
    var currentMonth = modalSel ? modalSel.value : (() => {
        var now = new Date();
        return now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
    })();

    // 모달 헤더 월 표시 업데이트
    var monthEl = document.getElementById('payroll-modal-month');
    if (monthEl) monthEl.innerText = currentMonth.replace('-', '년 ') + '월 기준 정산 대상 직원 목록';

    // 체크박스 초기화
    var selectAll = document.getElementById('payroll-select-all');
    if (selectAll) selectAll.checked = false;
    var countEl = document.getElementById('payroll-selected-count');
    if (countEl) countEl.innerText = '0명 선택됨';

    var typeLabel = { hourly: '시급제', daily: '일급제', monthly: '월급제' };
    var tbody = document.getElementById('payroll-table-body');

    tbody.innerHTML = employees.map(emp => {
        var monthlyAtt = attendance.filter(a => a.employeeId === emp.id && getLocalDateFormat(a.date).startsWith(currentMonth));
        var totalHours = 0;
        var totalPay = 0;

        monthlyAtt.forEach(att => {
            totalHours += parseFloat(calculateWorkHours(att.clockIn, att.clockOut));
            totalPay += calculatePay(att, emp);
        });

        var phone = emp.phone || '미등록';
        var hasData = monthlyAtt.length > 0;

        return `
            <tr style="opacity: ${hasData ? '1' : '0.45'};">
                <td style="padding: 12px; border-bottom: 1px solid #eee;">
                    <input type="checkbox" class="payroll-emp-check" data-emp-id="${emp.id}"
                        onchange="updatePayrollSelectedCount()"
                        ${!hasData ? 'disabled title="해당 월 출퇴근 기록 없음"' : ''}
                        style="width: 15px; height: 15px; cursor: ${hasData ? 'pointer' : 'not-allowed'};">
                </td>
                <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: left; font-weight: 700;">${emp.name}</td>
                <td style="padding: 12px; border-bottom: 1px solid #eee;">${typeLabel[emp.type] || emp.type}</td>
                <td style="padding: 12px; border-bottom: 1px solid #eee;">${monthlyAtt.length}일</td>
                <td style="padding: 12px; border-bottom: 1px solid #eee;">${totalHours.toFixed(1)}h</td>
                <td style="padding: 12px; border-bottom: 1px solid #eee; font-weight: 700; color: #10b981;">₩${totalPay.toLocaleString()}</td>
                <td style="padding: 12px; border-bottom: 1px solid #eee; font-size: 0.8rem; color: #64748b;">${phone}</td>
                <td style="padding: 12px; border-bottom: 1px solid #eee;">
                    <button class="btn" style="width: auto; padding: 3px 8px; font-size: 0.75rem; background: #0ea5e9; color: white;" onclick="printPayrollSlip('${emp.id}')">
                        <i data-lucide=\"printer\" style=\"width: 12px; height: 12px;\"></i> 명세서
                    </button>
                </td>
            </tr>
        `;
    }).join('');

    lucide.createIcons();
}

// 전체선택/해제
function toggleSelectAll(checkbox) {
    document.querySelectorAll('.payroll-emp-check:not([disabled])').forEach(function(cb) {
        cb.checked = checkbox.checked;
    });
    updatePayrollSelectedCount();
}

// 선택된 직원 수 업데이트
function updatePayrollSelectedCount() {
    const checked = document.querySelectorAll('.payroll-emp-check:checked').length;
    const countEl = document.getElementById('payroll-selected-count');
    if (countEl) countEl.innerText = checked + '명 선택됨';
    // 전체선택 체크박스 상태 동기화
    const total = document.querySelectorAll('.payroll-emp-check:not([disabled])').length;
    const selectAll = document.getElementById('payroll-select-all');
    if (selectAll) selectAll.checked = (total > 0 && checked === total);
}

// 선택된 직원만 정산하기
async function runSelectedPayroll() {
    var checked = document.querySelectorAll('.payroll-emp-check:checked');
    if (checked.length === 0) { alertModal('정산할 직원을 선택해주세요.'); return; }
    var selectedIds = Array.from(checked).map(cb => cb.dataset.empId);
    var modalSel = document.getElementById('payroll-modal-month-select');
    var currentMonth = modalSel ? modalSel.value : (() => { var n = new Date(); return n.getFullYear() + '-' + String(n.getMonth() + 1).padStart(2, '0'); })();
    confirmModal(selectedIds.length + '명의 ' + currentMonth + ' 급여를 정산하시겠습니까?', async function() {
        try {
            var res = await callGAS({ action: 'processPayroll', employeeIds: selectedIds });
            if (res && res.success) {
                successModal(res.message || '정산이 완료되었습니다.');
                renderPayrollTable();
            } else {
                errorModal('오류: ' + (res ? res.message : '알 수 없는 오류'));
            }
        } catch (err) {
            errorModal('통신 오류: ' + err.message);
        }
    });
}

// 선택된 직원에게 카카오 발송
async function sendSelectedKakao() {
    var checked = document.querySelectorAll('.payroll-emp-check:checked');
    if (checked.length === 0) { alertModal('카카오 발송할 직원을 선택해주세요.'); return; }
    var selectedIds = Array.from(checked).map(cb => cb.dataset.empId);
    var modalSel = document.getElementById('payroll-modal-month-select');
    var currentMonth = modalSel ? modalSel.value : (() => { var n = new Date(); return n.getFullYear() + '-' + String(n.getMonth() + 1).padStart(2, '0'); })();
    confirmModal(selectedIds.length + '명에게 ' + currentMonth + ' 급여명세서를 카카오로 발송하시겠습니까?\n(연락처 미등록 직원은 제외됩니다)', async function() {
        try {
            var res = await callGAS({ action: 'sendPayrollKakao', month: currentMonth, employeeIds: selectedIds });
            if (res && res.success) {
                successModal(res.message);
            } else {
                errorModal('발송 오류: ' + (res ? res.message : '알 수 없는 오류'));
            }
        } catch (err) {
            errorModal('통신 오류: ' + err.message);
        }
    });
}

// 선택된 직원에게 문자(SMS) 발송
async function sendSelectedSMS() {
    var checked = document.querySelectorAll('.payroll-emp-check:checked');
    if (checked.length === 0) { alertModal('문자 발송할 직원을 선택해주세요.'); return; }
    var selectedIds = Array.from(checked).map(cb => cb.dataset.empId);
    var modalSel = document.getElementById('payroll-modal-month-select');
    var currentMonth = modalSel ? modalSel.value : (() => { var n = new Date(); return n.getFullYear() + '-' + String(n.getMonth() + 1).padStart(2, '0'); })();
    confirmModal(selectedIds.length + '명에게 ' + currentMonth + ' 급여명세서를 문자로 발송하시겠습니까?\n(연락처 미등록 직원은 제외됩니다)', async function() {
        try {
            var res = await callGAS({ action: 'sendPayrollSMS', month: currentMonth, employeeIds: selectedIds });
            if (res && res.success) {
                successModal(res.message);
            } else {
                errorModal('발송 오류: ' + (res ? res.message : '알 수 없는 오류'));
            }
        } catch (err) {
            errorModal('통신 오류: ' + err.message);
        }
    });
}

function closePayrollModal() {
    document.getElementById('payroll-modal').style.display = 'none';
}


function printPayrollSlip(empId) {
    var emp = employees.find(e => e.id === empId);
    if (!emp) return;

    var modalSel = document.getElementById('payroll-modal-month-select');
    var currentMonth = modalSel ? modalSel.value : (() => { var n = new Date(); return n.getFullYear() + '-' + String(n.getMonth() + 1).padStart(2, '0'); })();
    var monthlyAtt = attendance.filter(a => a.employeeId === emp.id && getLocalDateFormat(a.date).startsWith(currentMonth));
    
    let totalHours = 0;
    let grossTotal = 0;
    
    if (emp.type === 'monthly') {
        grossTotal = Number(emp.rate);
        monthlyAtt.forEach(att => {
            totalHours += parseFloat(calculateWorkHours(att.clockIn, att.clockOut));
        });
    } else {
        monthlyAtt.forEach(att => {
            const h = parseFloat(calculateWorkHours(att.clockIn, att.clockOut));
            totalHours += h;
            grossTotal += calculatePay(att, emp);
        });
    }

    let taxRate = 0.033; 
    let taxName = "사업소득세(3.3%)";
    if (emp.type === 'monthly') {
        taxRate = 0.094; 
        taxName = "4대보험(9.4%)";
    }
    
    const taxAmount = Math.floor(grossTotal * taxRate);
    const netPay = grossTotal - taxAmount;

    document.getElementById('s-name').innerText = emp.name;
    document.getElementById('s-month').innerText = currentMonth;
    document.getElementById('s-days').innerText = `${monthlyAtt.length} 일`;
    document.getElementById('s-hours').innerText = `${totalHours.toFixed(1)} 시간`;
    document.getElementById('s-base-pay').innerText = `₩ ${grossTotal.toLocaleString()}`;
    document.getElementById('s-gross-pay').innerText = `₩ ${grossTotal.toLocaleString()}`;
    document.getElementById('s-tax-name').innerText = taxName;
    document.getElementById('s-tax-amount').innerText = `₩ ${taxAmount.toLocaleString()}`;
    document.getElementById('s-tax-total').innerText = `₩ ${taxAmount.toLocaleString()}`;
    document.getElementById('s-total-pay').innerText = `₩ ${netPay.toLocaleString()}`;
    document.getElementById('s-date').innerText = new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
    document.getElementById('slip-timestamp').innerText = `출력일시: ${new Date().toLocaleString()}`;

    document.getElementById('payroll-slip-modal').style.display = 'flex';
}

function closePayrollSlipModal() {
    document.getElementById('payroll-slip-modal').style.display = 'none';
}

function openContractModal(empId) {
    const emp = employees.find(e => e.id === empId);
    if (!emp) return;

    const todayStr = new Date().toLocaleDateString('ko-KR', { year:'numeric', month:'long', day:'numeric' });
    
    document.getElementById('c-worker').innerText = emp.name;
    document.getElementById('c-worker-name').innerText = emp.name;
    document.getElementById('c-today').innerText = emp.joinDate ? new Date(emp.joinDate).toLocaleDateString('ko-KR', {year:'numeric', month:'long', day:'numeric'}) : todayStr;
    document.getElementById('c-work-part').innerText = emp.workPart || '운영';
    document.getElementById('c-start-time').innerText = emp.startTime || '09:00';
    document.getElementById('c-end-time').innerText = emp.endTime || '18:00';
    document.getElementById('c-phone-num').innerText = emp.phone || '';
    
    if (emp.type === 'hourly') {
        document.getElementById('c-time-pay').innerText = Number(emp.rate).toLocaleString();
        document.getElementById('c-month-pay').innerText = '0';
        document.getElementById('c-classification').innerText = '단기';
    } else {
        document.getElementById('c-time-pay').innerText = '0';
        document.getElementById('c-month-pay').innerText = Number(emp.rate).toLocaleString();
        document.getElementById('c-classification').innerText = '정규';
    }

    document.getElementById('c-worker-bank-name').innerText = emp.bankName || '';
    document.getElementById('c-worker-bank-number').innerText = emp.bankAccount || '';
    document.getElementById('c-worker-num-name').innerText = emp.name;
    document.getElementById('c-write-day').innerText = emp.joinDate ? new Date(emp.joinDate).toLocaleDateString('ko-KR', {year:'numeric', month:'long', day:'numeric'}) : todayStr;
    document.getElementById('c-worker-birthday').innerText = emp.birthday || '';
    document.getElementById('c-worker-sig').innerText = emp.name;

    document.getElementById('print-timestamp-info').innerText = `출력일시: ${new Date().toLocaleString()}`;
    document.getElementById('contract-modal').style.display = 'flex';
}

function closeModal() {
    document.getElementById('contract-modal').style.display = 'none';
}

function calculateWorkHours(inT, outT) {
    if (!inT || !outT || inT === '-' || outT === '-') return "0.0";
    try {
        const parseTime = (t) => {
            const parts = t.split(':');
            if (parts.length < 2) return 0;
            return parseInt(parts[0]) * 60 + parseInt(parts[1]);
        };
        const start = parseTime(inT);
        const end = parseTime(outT);
        const diff = (end - start) / 60;
        return diff > 0 ? diff.toFixed(1) : "0.0";
    } catch (e) {
        return "0.0";
    }
}

function calculatePay(att, emp) {
    const hours = parseFloat(calculateWorkHours(att.clockIn, att.clockOut));
    if (isNaN(hours)) return 0;
    const rate = Number(emp.rate);
    
    if (emp.type === 'hourly') {
        return Math.floor(hours * rate);
    } else if (emp.type === 'daily') {
        return rate;
    } else {
        return 0;
    }
}

async function deleteEmployee(id) {
    confirmModal('해당 직원 정보를 삭제하시겠습니까?', async function() {
        const res = await callGAS({ action: 'deleteEmployee', id: id });
        if (res.success) {
            successModal('삭제되었습니다.', fetchData);
        } else {
            errorModal('삭제 실패: ' + (res.message || ''));
        }
    });
}

function editEmployee(id) {
    const emp = employees.find(e => e.id === id);
    if (!emp) return;
    
    document.getElementById('emp-name').value = emp.name;
    document.getElementById('emp-phone').value = emp.phone;
    document.getElementById('emp-birthday').value = emp.birthday;
    document.getElementById('emp-type').value = emp.type;
    document.getElementById('emp-rate').value = emp.rate;
    document.getElementById('emp-bank-name').value = emp.bankName;
    document.getElementById('emp-bank-account').value = emp.bankAccount;
    document.getElementById('emp-work-part').value = emp.workPart;
    document.getElementById('emp-join-date').value = emp.joinDate || '';
    document.getElementById('emp-start-time').value = emp.startTime || '09:00';
    document.getElementById('emp-end-time').value = emp.endTime || '18:00';

    const submitBtn = document.querySelector('#employee-form button[type="submit"]');
    submitBtn.innerText = '정보 수정 저장';
    submitBtn.style.background = '#f59e0b';
    document.getElementById('employee-form').dataset.editId = id;
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function generatePayroll() {
    // 팝업 열기 — 정산월 select 초기화
    var sel = document.getElementById('generate-payroll-month-select');
    if (sel && sel.options.length === 0) {
        var now = new Date();
        for (var i = 0; i < 13; i++) {
            var d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            var val = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
            var opt = document.createElement('option');
            opt.value = val;
            opt.textContent = val.replace('-', '년 ') + '월';
            if (i === 0) opt.selected = true;
            sel.appendChild(opt);
        }
    }
    document.getElementById('generate-payroll-modal').style.display = 'flex';
    lucide.createIcons();
}

function closeGeneratePayrollModal() {
    document.getElementById('generate-payroll-modal').style.display = 'none';
}

async function runGeneratePayroll() {
    var sel = document.getElementById('generate-payroll-month-select');
    var selectedMonth = sel ? sel.value : (() => { var n = new Date(); return n.getFullYear() + '-' + String(n.getMonth() + 1).padStart(2, '0'); })();

    confirmModal(selectedMonth.replace('-', '년 ') + '월 급여 정산 데이터를 서버에 생성 및 저장하시겠습니까?', async function() {
        closeGeneratePayrollModal();

        var targetBtn = null;
        document.querySelectorAll('button').forEach(function(btn) {
            if (btn.textContent.trim().indexOf('급여정산하기') !== -1) targetBtn = btn;
        });
        var originalHTML = '';
        if (targetBtn) {
            originalHTML = targetBtn.innerHTML;
            targetBtn.innerHTML = '⏳ 처리중...';
            targetBtn.disabled = true;
        }
        try {
            var res = await callGAS({ action: 'processPayroll', month: selectedMonth });
            if (res && res.success) {
                showModal('✅', '급여 정산 완료', res.message || '급여 정산이 완료되었습니다.', [
                    { label: '💬 카카오 급여명세서 발송', action: function() { sendPayrollKakao(selectedMonth); }, style: 'background:#FEE500;color:#1e293b;font-weight:700;' },
                    { label: '닫기', style: 'background:#e2e8f0;color:#1e293b;' }
                ]);
            } else {
                errorModal('오류: ' + (res ? res.message : '알 수 없는 오류'));
            }
        } catch (err) {
            errorModal('통신 오류: ' + err.message);
        } finally {
            if (targetBtn) {
                targetBtn.innerHTML = originalHTML;
                targetBtn.disabled = false;
                lucide.createIcons();
            }
        }
    });
}

async function sendPayrollKakao(month) {
    confirmModal(month + ' 급여명세서를 각 직원 카카오로 발송하시겠습니까?\n(연락처가 등록된 직원에게만 발송됩니다)', async function() {
        try {
            var res = await callGAS({ action: 'sendPayrollKakao', month: month });
            if (res && res.success) {
                successModal(res.message);
            } else {
                errorModal('발송 오류: ' + (res ? res.message : '알 수 없는 오류'));
            }
        } catch (err) {
            errorModal('통신 오류: ' + err.message);
        }
    });
}

// 인쇄 / PDF 저장 - 새 창 방식, 모든 CSS 포함, 이미지 절대경로 주입
let isPrinting = false;
function printTwoCopies(containerId, docType) {
    if (isPrinting) return;
    isPrinting = true;

    var area = document.getElementById(containerId);
    var empName = docType === '근로계약서'
        ? document.getElementById('c-worker').innerText
        : document.getElementById('s-name').innerText;

    var now = new Date();
    var dateStr = now.getFullYear()
        + String(now.getMonth() + 1).padStart(2, '0')
        + String(now.getDate()).padStart(2, '0');

    // 이미지 src를 절대경로로 교체 (인덱스 1:1 매핑 — origImgs[i].src는 브라우저가 절대경로로 보유)
    var tempDiv = document.createElement('div');
    tempDiv.innerHTML = area.innerHTML;
    var origImgs = area.getElementsByTagName('img');
    var copyImgs = tempDiv.getElementsByTagName('img');
    for (var i = 0; i < origImgs.length; i++) {
        if (copyImgs[i] && origImgs[i].src) {
            copyImgs[i].src = origImgs[i].src;
        }
    }
    var contentHTML = tempDiv.innerHTML;

    // 새 창에 필요한 모든 CSS 포함 — A4 꽉 차도록 폰트/여백 확대
    var pageStyle = '<style>'
        + '* { margin: 0; padding: 0; box-sizing: border-box; font-family: "Pretendard", -apple-system, sans-serif; }'
        + 'body { background: white; color: #111; font-size: 11pt; line-height: 1.85; }'
        + '@page { size: A4; margin: 12mm; }'
        + '.contract-body { padding: 8mm 10mm; position: relative; font-size: 11pt; }'
        + 'h1 { font-size: 20pt !important; text-align: center; margin-bottom: 24px; font-weight: 900; letter-spacing: 5px; }'
        + 'h3 { font-size: 13pt !important; font-weight: 800; margin-top: 18px; margin-bottom: 8px; }'
        + 'h4 { font-size: 11pt !important; font-weight: 700; margin-bottom: 6px; }'
        + 'p, div { font-size: 11pt; line-height: 1.85; }'
        + 'strong { font-size: 11pt; }'
        + '.c-table { width: 100%; border-collapse: collapse; margin-bottom: 18px; table-layout: fixed; border: 1px solid #333; }'
        + '.c-table th, .c-table td { border: 1px solid #333; padding: 12px 10px; font-size: 11pt; }'
        + '.sig-box { border: none !important; padding: 12px 0; font-size: 11pt; line-height: 2; }'
        + '.watermark { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-size: 60pt; color: rgba(0,0,0,0.03); font-weight: 900; z-index: 0; white-space: nowrap; pointer-events: none; }'
        + '.watermark::before { content: "착한식판 공식문서"; }'
        + '.print-footer { display: flex; justify-content: space-between; font-size: 9pt; color: #777; border-top: 1px solid #ccc; padding-top: 6px; margin-top: 24px; }'
        + '.print-page { position: relative; page-break-after: always; }'
        + '.print-page:last-child { page-break-after: auto; }'
        + '.print-copy-label { text-align: right; font-size: 9pt; margin-top: 12px; color: #999; }'
        + 'img { print-color-adjust: exact !important; -webkit-print-color-adjust: exact !important; }'
        + '@media print { img { display: block !important; print-color-adjust: exact !important; -webkit-print-color-adjust: exact !important; } }'
        + '</style>';

    var printHTML = '<!DOCTYPE html><html><head>'
        + '<meta charset="UTF-8">'
        + '<title>' + empName + '_' + dateStr + '</title>'
        + pageStyle
        + '</head><body>'
        + '<div class="print-page contract-body">' + contentHTML + '<div class="print-copy-label">[사업주 보관용]</div></div>'
        + '<div class="print-page contract-body">' + contentHTML + '<div class="print-copy-label">[근로자 보관용]</div></div>'
        + '</body></html>';

    var printWin = window.open('', '_blank', 'width=900,height=1100');
    if (!printWin) {
        alert('팝업 차단이 설정되어 있습니다. 팝업을 허용하고 다시 시도해주세요.');
        isPrinting = false;
        return;
    }
    printWin.document.open();
    printWin.document.write(printHTML);
    printWin.document.close();

    // 이미지 로드 완료 후 인쇄 실행
    var hasPrinted = false;
    function doPrint() {
        if (hasPrinted) return;
        hasPrinted = true;
        printWin.focus();
        printWin.print();
        setTimeout(function() {
            printWin.close();
            isPrinting = false;
        }, 1500);
    }

    var popupImgs = printWin.document.getElementsByTagName('img');
    if (popupImgs.length === 0) {
        setTimeout(doPrint, 300);
    } else {
        var loadedCount = 0;
        var totalImgs = popupImgs.length;
        for (var j = 0; j < totalImgs; j++) {
            if (popupImgs[j].complete) {
                loadedCount++;
                if (loadedCount === totalImgs) setTimeout(doPrint, 300);
            } else {
                popupImgs[j].onload = function() {
                    loadedCount++;
                    if (loadedCount === totalImgs) setTimeout(doPrint, 300);
                };
                popupImgs[j].onerror = function() {
                    loadedCount++;
                    if (loadedCount === totalImgs) setTimeout(doPrint, 300);
                };
            }
        }
        setTimeout(doPrint, 3000); // 안전장치
    }
}


async function callGAS(data) {
    try {
        const response = await fetch(GAS_URL, { method: 'POST', body: JSON.stringify(data) });
        return await response.json();
    } catch (err) {
        console.error('GAS Call Error:', err);
        return { success: false, message: '서버 응답 오류' };
    }
}

// 해당월 전체보기 (이번달 1일~오늘) — 기간 필터도 초기화
function showMonthView() {
    const filterEl = document.getElementById('attendance-date-filter');
    if (filterEl) filterEl.value = '';
    const rangeStartEl = document.getElementById('att-range-start');
    const rangeEndEl = document.getElementById('att-range-end');
    if (rangeStartEl) rangeStartEl.value = '';
    if (rangeEndEl) rangeEndEl.value = '';
    updateUI();
}

// 게 관련 이번 달 전체보기 (기간 필터 포함 전체 초기화)
function clearAttendanceFilter() {
    const filterEl = document.getElementById('attendance-date-filter');
    if (filterEl) filterEl.value = '';
    const rangeStartEl = document.getElementById('att-range-start');
    const rangeEndEl = document.getElementById('att-range-end');
    if (rangeStartEl) rangeStartEl.value = '';
    if (rangeEndEl) rangeEndEl.value = '';
    updateUI();
}

// 기간 범위 조건 검색 실행 (단일 날짜 필터는 초기화)
function applyAttendanceRangeFilter() {
    const rangeStartEl = document.getElementById('att-range-start');
    const rangeEndEl = document.getElementById('att-range-end');
    const rangeStart = rangeStartEl ? rangeStartEl.value : '';
    const rangeEnd = rangeEndEl ? rangeEndEl.value : '';

    if (!rangeStart && !rangeEnd) {
        alertModal('시작일 또는 종료일을 입력해주세요.');
        return;
    }
    if (rangeStart && rangeEnd && rangeStart > rangeEnd) {
        alertModal('시작일이 종료일보다 뒤일 수 없습니다.');
        return;
    }
    // 단일 날짜 필터 초기화 (중복 필터 방지)
    const singleEl = document.getElementById('attendance-date-filter');
    if (singleEl) singleEl.value = '';
    updateUI();
}

// 엑셀 다운로드
function downloadExcel() {
    const now = new Date();
    const todayStr = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}`;

    const dateFilterVal = document.getElementById('attendance-date-filter')
        ? document.getElementById('attendance-date-filter').value : '';

    let targetData = attendance;
    if (dateFilterVal) {
        targetData = attendance.filter(a => getLocalDateFormat(a.date) === dateFilterVal);
    } else {
        // 전체보기 상태이면 이번 달 1일~오늘
        const currentMonth = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
        targetData = attendance.filter(a => getLocalDateFormat(a.date).startsWith(currentMonth));
    }

    // CSV 생성시엔 BOM 추가(한글 라벨 필터를 위해)
    let csv = '\uFEFF성명,날짜,출근시간,퇴근시간,근무시간(시간),예상급여(원)\n';
    targetData.forEach(att => {
        const emp = employees.find(e => e.id === att.employeeId) || { name: '퇴사자', rate: 0, type: '' };
        const hours = calculateWorkHours(att.clockIn, att.clockOut);
        const pay = calculatePay(att, emp);
        const displayDate = getLocalDateFormat(att.date);
        csv += `"${emp.name}","${displayDate}","${att.clockIn || '-'}","${att.clockOut || '-'}","${hours}","${pay.toLocaleString()}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `출퇴근기록_${dateFilterVal || todayStr.slice(0,6) + '월'}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
