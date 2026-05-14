// Configuration
const GAS_URL = 'https://script.google.com/macros/s/AKfycbw4FhxbMZwLqox0sgs-ggxanx6IHjeeH2YAUOL2Kph92haKQjSY0TBHTI4Mw_PzaXiA_w/exec'; // 여기에 구글 앱스 스크립트 배포 URL을 입력하세요.

// State
let employees = [];
let attendance = [];
let isTabletMode = false;

// 전체화면 토글 함수
function toggleFullscreen() {
    if (!document.fullscreenElement && !document.webkitFullscreenElement && !document.msFullscreenElement) {
        // 전체화면 진입
        const docEl = document.documentElement;
        if (docEl.requestFullscreen) docEl.requestFullscreen();
        else if (docEl.webkitRequestFullscreen) docEl.webkitRequestFullscreen();
        else if (docEl.msRequestFullscreen) docEl.msRequestFullscreen();
        document.getElementById('fullscreen-btn').innerHTML = '<i data-lucide="minimize"></i> 화면 축소';
    } else {
        // 전체화면 해제
        if (document.exitFullscreen) document.exitFullscreen();
        else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
        else if (document.msExitFullscreen) document.msExitFullscreen();
        document.getElementById('fullscreen-btn').innerHTML = '<i data-lucide="maximize"></i> 전체화면';
    }
    lucide.createIcons();
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    fetchData();
    setupEventListeners();
    initGeolocation();
    startClock();
});

function setupEventListeners() {
    // 직원 등록 폼
    document.getElementById('employee-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = {
            action: 'addEmployee',
            name: document.getElementById('emp-name').value,
            phone: document.getElementById('emp-phone').value,
            type: document.getElementById('emp-type').value,
            rate: document.getElementById('emp-rate').value,
            birthday: document.getElementById('emp-birthday').value,
            bankName: document.getElementById('emp-bank-name').value,
            bankAccount: document.getElementById('emp-bank-account').value,
            workPart: document.getElementById('emp-work-part').value,
            startTime: document.getElementById('emp-start-time').value,
            endTime: document.getElementById('emp-end-time').value
        };
        
        showLoading(true);
        await callGAS(formData);
        await fetchData();
        e.target.reset();
        showLoading(false);
        alert('직원이 성공적으로 등록되었습니다.');
    });
}

async function fetchData() {
    // 1. 캐시된 데이터가 있으면 즉시 렌더링 (체감 속도 향상)
    const cachedData = localStorage.getItem('attendflow_cache');
    if (cachedData) {
        try {
            const data = JSON.parse(cachedData);
            if (data && Array.isArray(data.employees)) {
                employees = data.employees;
                attendance = data.attendance || [];
                if (typeof updateUI === 'function') updateUI();
            }
        } catch(e) {
            localStorage.removeItem('attendflow_cache');
        }
    }

    try {
        // 2. 백그라운드에서 최신 데이터 동기화
        const data = await callGAS({ action: 'getAllData' });
        if (data && data.success !== false && Array.isArray(data.employees)) {
            employees = data.employees;
            attendance = data.attendance || [];
            localStorage.setItem('attendflow_cache', JSON.stringify(data));
            if (typeof updateUI === 'function') updateUI();
        } else {
            console.warn('Server returned invalid data:', data);
        }
    } catch (err) {
        console.error('Data sync failed:', err);
    }
}

function updateUI() {
    // 직원 선택 셀렉트 박스 업데이트
    const select = document.getElementById('attendance-emp-select');
    select.innerHTML = '<option value="">직원을 선택하세요</option>' + 
        employees.map(emp => `<option value="${emp.id}">${emp.name}</option>`).join('');

    // 통계 업데이트
    document.getElementById('total-employees').innerText = employees.length;
    
    // 태블릿 그리드 업데이트
    updateTabletUI();

    const today = new Date().toISOString().split('T')[0];
    const todayAtt = attendance.filter(a => a.date === today).length;
    document.getElementById('today-attendance').innerText = todayAtt;

    // 테이블 업데이트
    const tbody = document.getElementById('attendance-table-body');
    tbody.innerHTML = attendance.map(att => {
        const emp = employees.find(e => e.id === att.employeeId) || { name: '알수없음' };
        return `
            <tr>
                <td>${emp.name}</td>
                <td>${att.date}</td>
                <td>${att.clockIn || '-'}</td>
                <td>${att.clockOut || '-'}</td>
                <td>${calculateWorkHours(att.clockIn, att.clockOut)}시간</td>
                <td>₩${calculatePay(att, emp).toLocaleString()}</td>
                <td>
                    <div style="display: flex; gap: 0.5rem;">
                        <button class="btn btn-primary" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;" onclick="openContractModal('${emp.id}')">
                            계약서
                        </button>
                        <span class="status-badge ${att.clockOut ? 'completed' : 'ongoing'}">${att.clockOut ? '완료' : '근무중'}</span>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function openContractModal(empId) {
    const emp = employees.find(e => e.id === empId);
    if (!emp) return;

    const todayStr = new Date().toLocaleDateString('ko-KR', { year:'numeric', month:'long', day:'numeric' });

    // 데이터 치환 (사용자 제공 양식 기준)
    document.getElementById('c-classification').innerText = emp.type === 'hourly' ? '단기' : '일반';
    document.getElementById('c-worker').innerText = emp.name;
    document.getElementById('c-worker-name').innerText = emp.name;
    document.getElementById('c-today').innerText = emp.joinDate ? new Date(emp.joinDate).toLocaleDateString() : todayStr;
    document.getElementById('c-work-part').innerText = emp.workPart || '운영';
    document.getElementById('c-details-work').innerText = emp.workDetails || '운영지원 및 제반업무';
    document.getElementById('c-start-time').innerText = emp.startTime || '09:00';
    document.getElementById('c-end-time').innerText = emp.endTime || '18:00';
    document.getElementById('c-work-day').innerText = emp.workDays || '월~금';
    
    if (emp.type === 'hourly') {
        document.getElementById('c-time-pay').innerText = Number(emp.rate).toLocaleString();
        document.getElementById('c-month-pay').innerText = '0';
    } else {
        document.getElementById('c-time-pay').innerText = '0';
        document.getElementById('c-month-pay').innerText = Number(emp.rate).toLocaleString();
    }

    document.getElementById('c-worker-bank-name').innerText = emp.bankName || '';
    document.getElementById('c-worker-bank-number').innerText = emp.bankAccount || '';
    document.getElementById('c-worker-num-name').innerText = emp.name;
    document.getElementById('c-tax-deduction').innerText = emp.taxType || '3.3% 사업소득세';
    document.getElementById('c-write-day').innerText = todayStr;
    document.getElementById('c-worker-birthday').innerText = emp.birthday || '';
    document.getElementById('c-phone-num').innerText = emp.phone;
    
    // 서명 초기화 (텍스트 대체)
    document.getElementById('c-employment-sig').innerText = '황지영';
    document.getElementById('c-worker-sig').innerText = emp.name;

    // 출력 정보 설정
    const now = new Date();
    const timestampStr = now.getFullYear() + '-' + 
                         String(now.getMonth() + 1).padStart(2, '0') + '-' + 
                         String(now.getDate()).padStart(2, '0') + ' ' + 
                         String(now.getHours()).padStart(2, '0') + ':' + 
                         String(now.getMinutes()).padStart(2, '0');
    document.getElementById('print-timestamp').innerText = timestampStr;

    document.getElementById('contract-modal').style.display = 'flex';
}

function closeModal() {
    document.getElementById('contract-modal').style.display = 'none';
}

// AI 음성 안내 기능
function speak(text) {
    const msg = new SpeechSynthesisUtterance();
    msg.text = text;
    msg.lang = 'ko-KR';
    msg.rate = 1.0;
    
    const voices = window.speechSynthesis.getVoices();
    const krVoice = voices.find(v => (v.name.includes('Google') || v.name.includes('Korean')) && v.lang === 'ko-KR') || voices.find(v => v.lang === 'ko-KR');
    if (krVoice) msg.voice = krVoice;
    
    window.speechSynthesis.speak(msg);
}

function startClock() {
    setInterval(() => {
        const now = new Date();
        const timeStr = now.toLocaleTimeString('ko-KR', { hour12: false });
        const clockEl = document.getElementById('digital-clock');
        if (clockEl) clockEl.innerText = timeStr;
    }, 1000);
}

function updateTabletUI() {
    const grid = document.getElementById('tablet-employee-grid');
    if (!grid) return;

    grid.innerHTML = employees.map(emp => `
        <div class="employee-tap-card animate-fade">
            <h2>${emp.name}</h2>
            <div class="tap-actions">
                <button class="btn btn-large" onclick="handleTabletClock('${emp.id}', 'in')" style="background: #10b981;">
                    <i data-lucide="log-in"></i> 출근
                </button>
                <button class="btn btn-large" onclick="handleTabletClock('${emp.id}', 'out')" style="background: #f43f5e;">
                    <i data-lucide="log-out"></i> 퇴근
                </button>
            </div>
        </div>
    `).join('');
    lucide.createIcons();
}

// Tablet Mode Functions
function toggleTabletMode() {
    isTabletMode = !isTabletMode;
    const overlay = document.getElementById('tablet-mode-overlay');
    overlay.style.display = isTabletMode ? 'flex' : 'none';
    if (isTabletMode) {
        updateTabletUI();
        document.documentElement.requestFullscreen().catch(() => {});
    } else {
        if (document.fullscreenElement) document.exitFullscreen();
    }
}

async function handleTabletClock(empId, type) {
    const emp = employees.find(e => e.id === empId);
    if (!confirm(`${emp.name}님, ${type === 'in' ? '출근' : '퇴근'} 처리하시겠습니까?`)) return;

    showLoading(true);
    try {
        const pos = await getCurrentLocation().catch(() => ({ coords: { latitude: 0, longitude: 0 } }));
        const now = new Date();
        const timeStr = now.toLocaleTimeString('ko-KR', { hour12: false });
        
        const res = await callGAS({
            action: type === 'in' ? 'clockIn' : 'clockOut',
            employeeId: empId,
            time: timeStr,
            date: now.toISOString().split('T')[0],
            lat: pos.coords.latitude,
            lon: pos.coords.longitude
        });

        if (res.success) {
            await fetchData();
            const msgText = type === 'in' ? 
                `반갑습니다. ${emp.name}님, 오늘도 좋은 하루 되세요.` : 
                `수고하셨습니다. ${emp.name}님, 조심해서 퇴근하세요.`;
            speak(msgText);
            
            // 시각적 알림
            const msg = document.createElement('div');
            msg.style = 'position:fixed; top:20%; left:50%; transform:translateX(-50%); background:#10b981; color:white; padding:2rem; border-radius:1rem; font-size:2rem; z-index:3000; box-shadow: 0 10px 25px rgba(0,0,0,0.3);';
            msg.innerText = msgText;
            document.body.appendChild(msg);
            setTimeout(() => msg.remove(), 3000);
        } else {
            alert(res.message);
        }
    } finally {
        showLoading(false);
    }
}

async function handleClockAction(type) {
    const empId = document.getElementById('attendance-emp-select').value;
    const emp = employees.find(e => e.id === empId);
    if (!empId) return alert('직원을 선택해주세요.');

    showLoading(true);
    try {
        const pos = await getCurrentLocation().catch(() => ({ coords: { latitude: 0, longitude: 0 } }));
        const now = new Date();
        const res = await callGAS({
            action: type === 'in' ? 'clockIn' : 'clockOut',
            employeeId: empId,
            time: now.toLocaleTimeString('ko-KR', { hour12: false }),
            date: now.toISOString().split('T')[0],
            lat: pos.coords.latitude,
            lon: pos.coords.longitude
        });

        if (res.success) {
            await fetchData();
            const msgText = type === 'in' ? 
                `반갑습니다. ${emp.name}님, 오늘도 좋은 하루 되세요.` : 
                `수고하셨습니다. ${emp.name}님, 조심해서 퇴근하세요.`;
            speak(msgText);
            alert(msgText);
        } else {
            alert(res.message || '처리 중 오류가 발생했습니다.');
        }
    } finally {
        showLoading(false);
    }
}

// Helpers
async function callGAS(data) {
    try {
        const response = await fetch(GAS_URL, { method: 'POST', body: JSON.stringify(data) });
        return await response.json();
    } catch (err) {
        console.error('GAS Call Error:', err);
        return { success: false, message: '서버 응답 오류' };
    }
}

function calculateWorkHours(inTime, outTime) {
    if (!inTime || !outTime || inTime === '-' || outTime === '-') return "0.0";
    const parseTime = (t) => {
        const parts = t.split(':');
        return parseInt(parts[0]) * 60 + parseInt(parts[1]);
    };
    const diff = (parseTime(outTime) - parseTime(inTime)) / 60;
    return diff > 0 ? diff.toFixed(1) : "0.0";
}

function calculatePay(att, emp) {
    const hours = parseFloat(calculateWorkHours(att.clockIn, att.clockOut));
    const rate = Number(emp.rate);
    if (emp.type === 'hourly') {
        return Math.floor(hours * rate);
    } else if (emp.type === 'daily') {
        return rate;
    } else {
        return rate; // 월급제는 일단 정액 표시
    }
}

function getCurrentLocation() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) return reject('Geolocation not supported');
        navigator.geolocation.getCurrentPosition(resolve, reject);
    });
}

function initGeolocation() {
    const status = document.getElementById('location-status');
    navigator.geolocation.getCurrentPosition(
        () => status.innerText = '📍 위치 인증 활성화됨 (근무지 확인 가능)',
        () => status.innerText = '❌ 위치 권한을 허용해주세요.'
    );
}

function showLoading(show) {
    // 로딩 인디케이터 로직 (생략 가능)
}

async function generatePayroll() {
    if (!confirm('익월 1일자로 모든 직원에게 급여 명세서를 카톡으로 발송하시겠습니까?')) return;
    
    const res = await callGAS({ action: 'sendPayroll' });
    if (res.success) {
        alert('발송 예약이 완료되었습니다.');
    }
}
