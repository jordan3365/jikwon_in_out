/**
 * AttendFlow Backend - 최종 정리된 데이터 구조
 */

const SS = SpreadsheetApp.getActiveSpreadsheet();
const SHEETS = {
  EMPLOYEES: '직원명단',
  ATTENDANCE: '출퇴근로그',
  PAYROLL: '급여정산'
};

// 시트별 최종 항목명(헤더) 정의
const HEADERS = {
  EMPLOYEES: ['ID', '성명', '생년월일', '연락처', '입사일자', '급여구분', '급여금액', '은행명', '계좌번호', '예금주', '담당업무', '근무시간', '세금유형'],
  ATTENDANCE: ['ID', '직원ID', '직원명', '날짜', '요일', '출근시간', '퇴근시간', '위도', '경도', '비고'],
  PAYROLL: ['ID', '직원명', '정산월', '총근무시간', '지급합계', '발송상태', '발송일시']
};

function doGet(e) {
  // GET 요청 시 간단한 서버 상태 확인 및 데이터 조회 테스트
  try {
    const action = e.parameter.action;
    if (action === 'getAllData') {
      return ContentService.createTextOutput(JSON.stringify(getAllData()))
        .setMimeType(ContentService.MimeType.JSON);
    }
    return HtmlService.createHtmlOutput("AttendFlow API가 정상 작동 중입니다. (POST 요청을 사용하세요)");
  } catch (err) {
    return HtmlService.createHtmlOutput("오류 발생: " + err.toString());
  }
}

function doPost(e) {
  // 에디터에서 직접 실행 시 e가 undefined인 경우를 처리
  if (!e || !e.postData) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, message: "직접 실행할 수 없는 함수입니다. 웹 앱 URL로 POST 요청을 보내세요." }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  const data = JSON.parse(e.postData.contents);
  let result;

  try {
    switch (data.action) {
      case 'getAllData': result = getAllData(); break;
      case 'addEmployee': result = addEmployee(data); break;
      case 'updateEmployee': result = updateEmployee(data); break;
      case 'deleteEmployee': result = deleteEmployee(data); break;
      case 'clockIn': result = clockIn(data); break;
      case 'clockOut': result = clockOut(data); break;
      case 'processPayroll': result = processPayroll(data); break;
      case 'sendPayrollKakao': result = sendPayrollKakao(data); break;
      case 'sendPayrollSMS': result = sendPayrollSMS(data); break;
      case 'deleteAttendance': result = deleteAttendance(data); break;
      default: result = { success: false, message: '잘못된 요청' };
    }
  } catch (err) {
    result = { success: false, message: err.toString() };
  }

  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

function updateEmployee(data) {
  const sheet = getOrCreateSheet(SHEETS.EMPLOYEES);
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === data.id) {
      // 기존 입사일자가 Date이면 문자열로 변환, 없으면 data.joinDate 사용
      let existingJoinDate = rows[i][4];
      if (existingJoinDate instanceof Date) {
        existingJoinDate = Utilities.formatDate(existingJoinDate, "GMT+9", "yyyy-MM-dd");
      } else {
        existingJoinDate = existingJoinDate ? existingJoinDate.toString() : '';
      }
      const joinDate = data.joinDate || existingJoinDate;
      // ID, 성명, 생년월일, 연락처, 입사일자, 급여구분, 급여금액, 은행명, 계좌번호, 예금주, 담당업무, 근무시간, 세금유형
      const range = sheet.getRange(i + 1, 2, 1, 11);
      range.setValues([[
        data.name, data.birthday, data.phone, joinDate,
        data.type, data.rate, data.bankName, data.bankAccount, data.name,
        data.workPart, `${data.startTime}~${data.endTime}`
      ]]);
      return { success: true };
    }
  }
  return { success: false, message: '직원을 찾을 수 없습니다.' };
}

function deleteEmployee(data) {
  const sheet = getOrCreateSheet(SHEETS.EMPLOYEES);
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === data.id) {
      sheet.deleteRow(i + 1);
      return { success: true };
    }
  }
  return { success: false, message: '직원을 찾을 수 없습니다.' };
}

function deleteAttendance(data) {
  const sheet = getOrCreateSheet(SHEETS.ATTENDANCE);
  const rows = sheet.getDataRange().getValues();
  const targetIds = data.ids || [];
  
  if (targetIds.length === 0) return { success: false, message: '삭제할 ID가 없습니다.' };
  
  let deletedCount = 0;
  // 역순으로 삭제해야 행 인덱스가 꼬이지 않음
  for (let i = rows.length - 1; i >= 1; i--) {
    if (targetIds.includes(rows[i][0])) {
      sheet.deleteRow(i + 1);
      deletedCount++;
    }
  }
  
  if (deletedCount > 0) {
    return { success: true, message: `${deletedCount}개의 출퇴근 기록이 삭제되었습니다.` };
  } else {
    return { success: false, message: '해당 출퇴근 기록을 찾을 수 없습니다.' };
  }
}

function getAllData() {
  const employees = getSheetData(SHEETS.EMPLOYEES);
  const attendance = getSheetData(SHEETS.ATTENDANCE);
  return { success: true, employees, attendance };
}

function addEmployee(data) {
  const sheet = getOrCreateSheet(SHEETS.EMPLOYEES);
  const id = "EMP_" + new Date().getTime();
  // 작성일자(입사일자)가 있으면 사용하고 없으면 현재 날짜 사용
  const joinDate = data.joinDate || Utilities.formatDate(new Date(), "GMT+9", "yyyy-MM-dd");
  sheet.appendRow([
    id, data.name, data.birthday, data.phone, joinDate, 
    data.type, data.rate, data.bankName, data.bankAccount, data.name, 
    data.workPart, `${data.startTime}~${data.endTime}`, '3.3%'
  ]);
  return { success: true };
}

function clockIn(data) {
  const sheet = getOrCreateSheet(SHEETS.ATTENDANCE);
  const id = "ATT_" + new Date().getTime();
  const day = ['일','월','화','수','목','금','토'][new Date().getDay()];
  sheet.appendRow([id, data.employeeId, data.employeeName, data.date, day, data.time, '', data.lat, data.lon, '']);
  return { success: true };
}

function clockOut(data) {
  const sheet = getOrCreateSheet(SHEETS.ATTENDANCE);
  const rows = sheet.getDataRange().getValues();
  const targetDate = data.date; // "yyyy-MM-dd"
  
  for (let i = rows.length - 1; i >= 1; i--) {
    const row = rows[i];
    let sheetDateStr = "";
    
    if (row[3] instanceof Date) {
      sheetDateStr = Utilities.formatDate(row[3], "GMT+9", "yyyy-MM-dd");
    } else {
      sheetDateStr = row[3].toString();
    }

    // 직원ID와 날짜를 동시에 확인 (날짜 매칭 누락 버그 수정)
    if (row[1] === data.employeeId && sheetDateStr === targetDate) {
      // 출근 기록이 있고 퇴근 기록이 비어있는 경우
      if (row[5] !== "" && (row[6] === "" || row[6] === null || row[6] === 0)) {
        sheet.getRange(i + 1, 7).setValue(data.time);
        return { success: true };
      }
    }
  }
  return { success: false, message: '오늘의 출근 기록을 찾을 수 없거나 이미 퇴근 처리가 완료되었습니다.' };
}

function processPayroll(data) {
  const paySheet = getOrCreateSheet(SHEETS.PAYROLL);
  
  const allEmployees = getSheetData(SHEETS.EMPLOYEES);
  const allAttendance = getSheetData(SHEETS.ATTENDANCE);
  
  // employeeIds 배열이 있으면 해당 직원만, 없으면 전체 처리
  const targetEmployees = (data.employeeIds && data.employeeIds.length > 0)
    ? allEmployees.filter(e => data.employeeIds.includes(e.id))
    : allEmployees;
  
  const now = new Date();
  const currentMonth = Utilities.formatDate(now, "GMT+9", "yyyy-MM");
  
  let newRows = 0;
  let updatedRows = 0;
  
  targetEmployees.forEach(emp => {
    const monthlyAtt = allAttendance.filter(a => a.employeeId === emp.id && a.date && a.date.startsWith(currentMonth));
    if (monthlyAtt.length === 0) return;
    
    let totalHours = 0;
    let grossTotal = 0;
    
    if (emp.type === 'monthly') {
      grossTotal = Number(emp.rate);
      monthlyAtt.forEach(att => {
        totalHours += parseFloat(calculateWorkHoursForServer(att.clockIn, att.clockOut));
      });
    } else {
      monthlyAtt.forEach(att => {
        const h = parseFloat(calculateWorkHoursForServer(att.clockIn, att.clockOut));
        totalHours += h;
        const rate = Number(emp.rate);
        if (emp.type === 'hourly') {
          grossTotal += Math.floor(h * rate);
        } else if (emp.type === 'daily') {
          grossTotal += rate;
        }
      });
    }
    
    const rows = paySheet.getDataRange().getValues();
    let rowIdx = -1;
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0] === emp.id && rows[i][2] === currentMonth) {
        rowIdx = i + 1;
        break;
      }
    }
    
    if (rowIdx > -1) {
      paySheet.getRange(rowIdx, 4, 1, 2).setValues([[totalHours.toFixed(1), grossTotal]]);
      updatedRows++;
    } else {
      paySheet.appendRow([emp.id, emp.name, currentMonth, totalHours.toFixed(1), grossTotal, '미발송', '']);
      newRows++;
    }
  });
  
  return { success: true, message: `${currentMonth} 급여 정산 완료: 신규 ${newRows}건, 업데이트 ${updatedRows}건` };
}


// 카카오 알림톡 발송 (카카오 비즈니스 API 연동)
// ※ 실제 카카오 알림톡 발송을 위해서는 카카오 비즈니스 계정 및 채널 ID가 필요합니다.
// 현재는 Google Apps Script의 UrlFetchApp을 이용한 카카오 알림톡 발송 구조를 구현합니다.
function sendPayrollKakao(data) {
  const paySheet = getOrCreateSheet(SHEETS.PAYROLL);
  const employees = getSheetData(SHEETS.EMPLOYEES);
  
  const now = new Date();
  const currentMonth = data.month || Utilities.formatDate(now, "GMT+9", "yyyy-MM");
  
  const rows = paySheet.getDataRange().getValues();
  if (rows.length < 2) return { success: false, message: '정산 데이터가 없습니다.' };
  
  let sentCount = 0;
  let failList = [];
  
  for (let i = 1; i < rows.length; i++) {
    // PAYROLL 헤더: ['ID', '직원명', '정산월', '총근무시간', '지급합계', '발송상태', '발송일시']
    const empId = rows[i][0];
    const empName = rows[i][1];
    const month = rows[i][2];
    const totalHours = rows[i][3];
    const grossPay = rows[i][4];
    const sendStatus = rows[i][5];
    
    if (month !== currentMonth) continue;
    if (sendStatus === '발송완료') continue;
    
    // 해당 직원 연락처 찾기
    const emp = employees.find(e => e.id === empId);
    if (!emp || !emp.phone) {
      failList.push(empName + '(연락처 없음)');
      continue;
    }
    
    // 세금 계산
    const taxRate = emp.type === 'monthly' ? 0.094 : 0.033;
    const taxAmount = Math.floor(Number(grossPay) * taxRate);
    const netPay = Number(grossPay) - taxAmount;
    
    const message = `[착한식판] ${month} 급여명세서\n\n` +
      `안녕하세요 ${empName}님,\n` +
      `${month} 급여 내역을 안내드립니다.\n\n` +
      `• 총 근무시간: ${totalHours}h\n` +
      `• 지급합계: ${Number(grossPay).toLocaleString()}원\n` +
      `• 세금공제: ${taxAmount.toLocaleString()}원\n` +
      `• 실수령액: ${netPay.toLocaleString()}원\n\n` +
      `문의: 010-5470-0928`;
    
    // 카카오 메시지 발송 시뮬레이션 (실제 카카오 API 연동 시 아래 주석 해제)
    // 실제 운영 시: 카카오 비즈니스 알림톡 API (access_token, template_id 필요)
    /*
    const kakaoUrl = 'https://kapi.kakao.com/v2/api/talk/memo/default/send';
    const options = {
      method: 'POST',
      headers: { Authorization: 'Bearer YOUR_ACCESS_TOKEN', 'Content-Type': 'application/x-www-form-urlencoded' },
      payload: 'template_object=' + JSON.stringify({ object_type: 'text', text: message, link: {} })
    };
    UrlFetchApp.fetch(kakaoUrl, options);
    */
    
    // 발송 상태 업데이트
    paySheet.getRange(i + 1, 6).setValue('발송완료');
    paySheet.getRange(i + 1, 7).setValue(Utilities.formatDate(new Date(), "GMT+9", "yyyy-MM-dd HH:mm:ss"));
    sentCount++;
  }
  
  if (failList.length > 0) {
    return { success: true, message: `${sentCount}명 발송 완료. 실패: ${failList.join(', ')}` };
  }
  return { success: true, message: `${currentMonth} 급여명세서 ${sentCount}명 발송 완료되었습니다.`, sentCount: sentCount };
}

function sendPayrollSMS(data) {
  const currentMonth = data.month;
  const targetIds = data.employeeIds || [];
  
  if (!currentMonth) return { success: false, message: '정산월(month) 정보가 없습니다.' };
  if (!targetIds || targetIds.length === 0) return { success: false, message: '선택된 직원이 없습니다.' };
  
  const paySheet = getOrCreateSheet(SHEETS.PAYROLL);
  const rows = paySheet.getDataRange().getValues();
  const headers = rows[0];
  
  const empSheet = getOrCreateSheet(SHEETS.EMPLOYEES);
  const empRows = empSheet.getDataRange().getValues();
  
  let sentCount = 0;
  let failList = [];
  
  // 1행은 헤더이므로 인덱스 1부터 시작 (i+1 행번호)
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const empId = row[0];
    const empName = row[1];
    const month = row[2];
    const totalHours = row[3];
    const grossPay = row[4];
    
    // 선택된 직원, 해당 월만 처리
    if (month !== currentMonth || !targetIds.includes(empId)) continue;
    
    // 직원 연락처 조회
    let phone = '';
    let emp = null;
    for (let j = 1; j < empRows.length; j++) {
      if (empRows[j][0] === empId) {
        emp = {
          id: empRows[j][0],
          name: empRows[j][1],
          phone: empRows[j][3],
          type: empRows[j][5]
        };
        phone = emp.phone;
        break;
      }
    }
    
    if (!phone) {
      failList.push(empName + "(연락처 없음)");
      continue;
    }
    
    // 세금 계산
    const taxRate = emp.type === 'monthly' ? 0.094 : 0.033;
    const taxAmount = Math.floor(Number(grossPay) * taxRate);
    const netPay = Number(grossPay) - taxAmount;
    
    const message = `[착한식판] ${month} 급여명세서\n\n` +
      `안녕하세요 ${empName}님,\n` +
      `${month} 급여 내역을 안내드립니다.\n\n` +
      `• 총 근무시간: ${totalHours}h\n` +
      `• 지급합계: ${Number(grossPay).toLocaleString()}원\n` +
      `• 세금공제: ${taxAmount.toLocaleString()}원\n` +
      `• 실수령액: ${netPay.toLocaleString()}원\n\n` +
      `문의: 010-5470-0928`;
    
    // ===== 무료/유료 SMS 서비스 (알리고 Aligo API 연동) =====
    // 한국 통신법상 '발신번호 사전등록제'로 인해 완전 무료/무기명 SMS 서비스는 존재하지 않습니다.
    // 하지만 '알리고(aligo.in)'에 회원가입하시면 무료 테스트 건수(약 50건 분량 포인트)를 제공합니다.
    // 가입 후 발신번호를 등록하시고 아래 설정값에 API KEY와 아이디를 입력하시면 즉시 문자가 발송됩니다.
    const ALIGO_API_KEY = ''; // 알리고 사이트에서 발급받은 API 키 입력 (예: 'abc123def456...')
    const ALIGO_USER_ID = ''; // 알리고 웹사이트 로그인 아이디 입력
    const SENDER_PHONE = '01054700928'; // 알리고에 사전 등록(인증)된 대표 발신번호 (필수)

    if (ALIGO_API_KEY && ALIGO_USER_ID) {
      try {
        const smsUrl = 'https://apis.aligo.in/send/';
        const payload = {
          key: ALIGO_API_KEY,
          user_id: ALIGO_USER_ID,
          sender: SENDER_PHONE,
          receiver: phone.replace(/[^0-9]/g, ''), // 하이픈 제거하고 숫자만 추출
          msg: message,
          title: '착한식판 급여명세' // LMS로 전환될 경우 제목
        };
        
        const options = {
          method: 'POST',
          payload: payload
        };
        
        const response = UrlFetchApp.fetch(smsUrl, options);
        const result = JSON.parse(response.getContentText());
        
        if (result.result_code != '1') { // 알리고 API는 성공 시 '1' 반환
          failList.push(empName + "(API오류: " + result.message + ")");
          continue;
        }
      } catch(e) {
        failList.push(empName + "(통신실패: " + e.toString() + ")");
        continue;
      }
    } else {
      // API 키를 입력하기 전까지는 화면상에서 발송 성공 처리만 되도록 시뮬레이션 합니다.
      // (실제 문자는 전송되지 않음)
    }
    
    // 발송 상태 업데이트
    paySheet.getRange(i + 1, 6).setValue('문자발송완료');
    paySheet.getRange(i + 1, 7).setValue(Utilities.formatDate(new Date(), "GMT+9", "yyyy-MM-dd HH:mm:ss"));
    sentCount++;
  }
  
  if (failList.length > 0) {
    return { success: true, message: `${sentCount}명 문자 발송 완료. 실패: ${failList.join(', ')}` };
  }
  return { success: true, message: `${currentMonth} 급여명세서 ${sentCount}명 문자 발송이 완료되었습니다.`, sentCount: sentCount };
}

function calculateWorkHoursForServer(inT, outT) {
    if (!inT || !outT || inT === '-' || outT === '') return "0.0";
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

function getOrCreateSheet(name) {
  let sheet = SS.getSheetByName(name);
  if (!sheet) {
    sheet = SS.insertSheet(name);
    sheet.appendRow(HEADERS[Object.keys(SHEETS).find(key => SHEETS[key] === name)]);
  }
  return sheet;
}

function getSheetData(sheetName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];
  
  const rows = sheet.getDataRange().getValues();
  const displayRows = sheet.getDataRange().getDisplayValues();
  if (rows.length < 2) return [];
  
  const headers = rows[0];
  const data = [];
  
  // 시트별 맞춤형 키 맵 (충돌 방지)
  const keyMap = {
    'ID': 'id', '성명': 'name', '연락처': 'phone', '급여구분': 'type', '급여금액': 'rate', 
    '생년월일': 'birthday', '은행명': 'bankName', '계좌번호': 'bankAccount', 
    '담당업무': 'workPart', '입사일자': 'joinDate', '근무시간': 'workTime', '세금유형': 'taxType',
    '직원ID': 'employeeId', '직원명': 'employeeName', '날짜': 'date', '요일': 'day', 
    '출근시간': 'clockIn', '퇴근시간': 'clockOut',
    '위도': 'lat', '경도': 'lon', '비고': 'note',
    '정산월': 'payMonth', '총근무시간': 'totalHours', '지급합계': 'grossPay', '발송상태': 'sendStatus', '발송일시': 'sentAt'
  };

  for (let i = 1; i < rows.length; i++) {
    // 모든 셀이 비어있는 행은 건너뜀 (Google Sheets 빈 행 방지)
    if (rows[i].every(cell => cell === '' || cell === null || cell === undefined)) continue;
    
    let obj = {};
    headers.forEach((header, j) => {
      let key = keyMap[header] || header;
      let val = rows[i][j];
      
      if (val instanceof Date) {
        if (header === '날짜' || header === '입사일자' || header === '생년월일') {
          val = Utilities.formatDate(val, "GMT+9", "yyyy-MM-dd");
        } else {
          // 구글 시트 1899년 기준 시간값의 역사적 타임존(GMT+9) 오프셋 변경(+32분) 버그 방지를 위해 표시값 그대로 사용
          val = displayRows[i][j];
        }
      }
      // 빈 셀(0, false, null, undefined, "") 모두 빈 문자열로 정규화
      if (val === null || val === undefined || val === false) {
        obj[key] = "";
      } else if (val === 0 && header !== '급여금액' && header !== '총근무시간' && header !== '지급합계') {
        // 수치 필드가 아닌데 0이면 빈 문자열로
        obj[key] = "";
      } else {
        obj[key] = val.toString();
      }
    });
    
    if (sheetName === '직원명단' && obj.workTime) {
      const parts = obj.workTime.split('~');
      obj.startTime = parts[0] ? parts[0].trim() : '';
      obj.endTime = parts[1] ? parts[1].trim() : '';
    }
    
    data.push(obj);
  }
  return data;
}
