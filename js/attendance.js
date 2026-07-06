// Configuration
const GAS_URL = 'https://script.google.com/macros/s/AKfycbwiTu9zNqDUt6khadLDDAQm9IWvNc5YMV3nYaXZDzYS9E8O0yIQY8jt8BAGqU6xndjDyQ/exec';

// State
let employees = [];
let currentAction = ''; // 'in' or 'out'

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    fetchEmployees();
    initCustomModal();
    // TTS 목소리 미리 로드 (성능 최적화)
    if (window.speechSynthesis) {
        window.speechSynthesis.getVoices();
    }
});

// ===== 커스텀 모달 알림/확인창 시스템 =====
function initCustomModal() {
    if (document.getElementById('custom-modal-overlay')) return;
    var overlay = document.createElement('div');
    overlay.id = 'custom-modal-overlay';
    overlay.style.cssText = 'display:none;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.6);backdrop-filter:blur(5px);z-index:9999;justify-content:center;align-items:center;';
    overlay.innerHTML = `
        <div style="background:#fff;border-radius:1.5rem;padding:2.5rem;min-width:340px;max-width:500px;box-shadow:0 25px 50px rgba(0,0,0,0.4);text-align:center;">
            <div id="cm-icon" style="font-size:3.5rem;margin-bottom:1rem;"></div>
            <h3 id="cm-title" style="font-size:1.5rem;font-weight:800;color:#1e293b;margin-bottom:0.5rem;"></h3>
            <p id="cm-message" style="font-size:1.1rem;color:#64748b;margin-bottom:2rem;line-height:1.6;word-break:keep-all;"></p>
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
    
    if (buttons && buttons.length > 0) {
        buttons.forEach(function(b) {
            var btn = document.createElement('button');
            btn.innerText = b.label;
            btn.style.cssText = 'padding:0.8rem 1.8rem;border-radius:0.8rem;border:none;font-weight:700;cursor:pointer;font-size:1rem;transition:all 0.2s;' + (b.style || 'background:#4f46e5;color:white;');
            btn.onmouseover = function() { btn.style.transform = 'scale(1.05)'; };
            btn.onmouseout = function() { btn.style.transform = 'scale(1)'; };
            btn.onclick = function() { closeCustomModal(); if (b.action) b.action(); };
            btnsEl.appendChild(btn);
        });
    }
}
function closeCustomModal() {
    var overlay = document.getElementById('custom-modal-overlay');
    if (overlay) overlay.style.display = 'none';
}
function alertModal(message, onOk) {
    showModal('ℹ️', '알림', message, [{ label: '확인', action: onOk, style: 'background:#4f46e5;color:white;' }]);
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
function showAutoCloseModal(icon, title, message) {
    showModal(icon, title, message, []); // 버튼 없이 표시
    setTimeout(() => {
        closeCustomModal();
        showMainSelector();
    }, 2000); // 2.5초에서 2초로 단축하여 반응성 향상
}
// ==========================================

async function fetchEmployees() {
    try {
        const data = await callGAS({ action: 'getAllData' });
        if (data && data.success !== false && Array.isArray(data.employees)) {
            employees = data.employees;
        } else {
            console.warn('employees 데이터 수신 실패:', data);
        }
    } catch (e) {
        console.error('fetchEmployees 오류:', e);
    }
}

function showEmployeeSelector(type) {
    currentAction = type;
    document.getElementById('main-selector').style.display = 'none';
    document.getElementById('employee-selector').style.display = 'flex';
    
    const title = type === 'in' ? '출근할 직원을 선택하세요' : '퇴근할 직원을 선택하세요';
    document.getElementById('selection-title').innerText = title;
    
    renderEmployeeGrid();
}

function showMainSelector() {
    document.getElementById('main-selector').style.display = 'grid';
    document.getElementById('employee-selector').style.display = 'none';
    currentAction = '';
}

function renderEmployeeGrid() {
    const grid = document.getElementById('employee-grid');
    grid.innerHTML = employees.map(emp => `
        <div class="emp-card animate-fade" onclick="handleClock('${emp.id}')">
            ${emp.name}
        </div>
    `).join('');
}

async function handleClock(empId) {
    const emp = employees.find(e => e.id === empId);
    
    confirmModal(`${emp.name}님, ${currentAction === 'in' ? '출근' : '퇴근'} 처리하시겠습니까?`, async function() {
        const pos = await getCurrentLocation().catch(() => ({ coords: { latitude: 0, longitude: 0 } }));
        const now = new Date();
        
        const data = {
            action: currentAction === 'in' ? 'clockIn' : 'clockOut',
            employeeId: empId,
            employeeName: emp.name,
            time: now.toLocaleTimeString('ko-KR', { hour12: false }),
            date: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`,
            lat: pos.coords.latitude,
            lon: pos.coords.longitude
        };

        const res = await callGAS(data);
        if (res.success) {
            const msgText = currentAction === 'in' 
                ? `${emp.name}님 출근이 확인 되었습니다.` 
                : `${emp.name}님 퇴근이 확인 되었습니다.`;
                
            speak(msgText); // 출근/퇴근 공통 AI 음성 출력
            showAutoCloseModal('✅', '처리 완료', msgText);
        } else {
            errorModal(res.message);
        }
    });
}

function speak(text) {
    if (!window.speechSynthesis) return;
    
    const startSpeak = () => {
        // 기존 재생 중인 음성 중단
        window.speechSynthesis.cancel();
        
        const utterance = new SpeechSynthesisUtterance(text);
        const voices = window.speechSynthesis.getVoices();
        
        // 브라우저별 최적의 한국어 목소리 선택
        let krVoices = voices.filter(v => v.lang.includes('ko') || v.lang.includes('KO'));
        let selectedVoice = krVoices.find(v => v.name.includes('Google 한국의'))
            || krVoices.find(v => v.name.includes('Google') && v.name.toLowerCase().includes('female'))
            || krVoices.find(v => v.name.includes('Google'))
            || krVoices.find(v => v.name.toLowerCase().includes('female'))
            || krVoices[0];
            
        if (selectedVoice) utterance.voice = selectedVoice;
        utterance.lang = 'ko-KR';
        utterance.rate = 1.05; // 약간 빠르게 설정하여 반응성 향상
        utterance.pitch = 1.0;
        
        // 삼성 브라우저 및 일부 모바일 기기 대응: 약간의 지연 후 실행
        setTimeout(() => {
            window.speechSynthesis.speak(utterance);
        }, 50);
    };

    if (window.speechSynthesis.getVoices().length === 0) {
        window.speechSynthesis.onvoiceschanged = startSpeak;
    } else {
        startSpeak();
    }
}

async function callGAS(data) {
    try {
        const response = await fetch(GAS_URL, {
            method: 'POST',
            body: JSON.stringify(data)
        });
        return await response.json();
    } catch (e) {
        return { success: false, message: '서버 연결 실패' };
    }
}

function getCurrentLocation() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) return reject();
        navigator.geolocation.getCurrentPosition(resolve, reject);
    });
}
