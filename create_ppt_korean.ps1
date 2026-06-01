$ErrorActionPreference = "Stop"
try {
    $ppt = New-Object -ComObject PowerPoint.Application
    $presentation = $ppt.Presentations.Add()

    $slide1 = $presentation.Slides.Add(1, 1) # ppLayoutTitle = 1
    $slide1.Shapes.Item(1).TextFrame.TextRange.Text = "착한식판 출퇴근/급여관리 시스템 메뉴얼"
    $slide1.Shapes.Item(2).TextFrame.TextRange.Text = "앱 사용 안내 및 관리자 가이드"

    $slide2 = $presentation.Slides.Add(2, 2) # ppLayoutText = 2
    $slide2.Shapes.Item(1).TextFrame.TextRange.Text = "1. 출퇴근 앱 메인 화면"
    $slide2.Shapes.Item(2).TextFrame.TextRange.Text = "1) 태블릿에서 '출근하기' 및 '퇴근하기' 버튼을 터치합니다.`n2) 이름을 선택하면 서버로 시간이 전송됩니다.`n3) AI 음성(TTS) 알림이 제공됩니다."
    
    $pic1 = $slide2.Shapes.AddPicture("C:\Users\hongwon\.gemini\antigravity\brain\bac4be59-d96a-4c7f-b2d9-84a180be5df4\isolated_galaxy_tablet_mockup_1779958922241.png", $false, $true, 400, 100, 520, 380)
    
    $rect1 = $slide2.Shapes.AddShape(1, 450, 130, 420, 320) # msoShapeRectangle = 1
    $rect1.Fill.ForeColor.RGB = 13158600
    $rect1.Fill.Transparency = 0.3
    $rect1.TextFrame.TextRange.Text = "여기에 실제 앱 캡쳐 화면을 삽입하세요"
    $rect1.TextFrame.TextRange.Font.Size = 18
    $rect1.TextFrame.TextRange.Font.Color.RGB = 0

    $slide3 = $presentation.Slides.Add(3, 2)
    $slide3.Shapes.Item(1).TextFrame.TextRange.Text = "2. 관리자(HR) 대시보드"
    $slide3.Shapes.Item(2).TextFrame.TextRange.Text = "1) 전체 직원의 출퇴근 기록과 실시간 급여를 확인합니다.`n2) 직원 등록, 수정, 근로계약서 2부 자동 출력 기능.`n3) 카카오 알림톡/문자를 통한 명세서 일괄 발송 기능."
    
    $pic2 = $slide3.Shapes.AddPicture("C:\Users\hongwon\.gemini\antigravity\brain\bac4be59-d96a-4c7f-b2d9-84a180be5df4\isolated_galaxy_tablet_mockup_1779958922241.png", $false, $true, 400, 100, 520, 380)
    
    $rect2 = $slide3.Shapes.AddShape(1, 450, 130, 420, 320)
    $rect2.Fill.ForeColor.RGB = 13158600
    $rect2.Fill.Transparency = 0.3
    $rect2.TextFrame.TextRange.Text = "여기에 관리자 페이지 화면을 삽입하세요"
    $rect2.TextFrame.TextRange.Font.Size = 18
    $rect2.TextFrame.TextRange.Font.Color.RGB = 0

    $savePath = "c:\Users\hongwon\Desktop\발주시스템\출퇴근_웹앱\착한식판_출퇴근앱_메뉴얼.pptx"
    if (Test-Path $savePath) { Remove-Item $savePath -Force }
    $presentation.SaveAs($savePath)
    $presentation.Close()
    $ppt.Quit()
    [System.Runtime.Interopservices.Marshal]::ReleaseComObject($ppt) | Out-Null
    Write-Output "PowerPoint creation successful."
} catch {
    Write-Output "Error: $_"
    if ($ppt) { $ppt.Quit(); [System.Runtime.Interopservices.Marshal]::ReleaseComObject($ppt) | Out-Null }
}
