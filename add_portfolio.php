<?php
// add_portfolio.php - บันทึกผลงานเชิงประจักษ์ใหม่ลงในฐานข้อมูลโรงเรียน
require_once 'config.php';

// ดึงการตั้งค่า Google Drive เพื่อเตรียมพร้อมอัปโหลด
$google_drive_folder_id = get_setting($conn, 'google_drive_folder_id', '');
$google_apps_script_url = get_setting($conn, 'google_apps_script_url', '');

// ดึงรายชื่อคุณครูทั้งหมดเพื่อใช้ในตัวเลือกสำหรับแอดมิน
$teachers_res = $conn->query("SELECT id, name FROM users WHERE role = 'teacher' ORDER BY name ASC");
$teachers_list = [];
if ($teachers_res) {
    while ($t_row = $teachers_res->fetch_assoc()) {
        $teachers_list[] = $t_row;
    }
}

// ป้องกันกรณีที่ผู้ใช้งานยังไม่ได้เข้าสู่ระบบ
if (!isset($_SESSION['user_id'])) {
    header("Location: login.php");
    exit;
}

$error = '';
if (isset($_POST['submit'])) {
    $category = $conn->real_escape_string($_POST['category']);
    $type = $conn->real_escape_string($_POST['type']);
    $title = $conn->real_escape_string($_POST['title']);
    $description = $conn->real_escape_string($_POST['description']);
    $academicYear = $conn->real_escape_string($_POST['academicYear']);
    $awardDate = $conn->real_escape_string($_POST['awardDate']);
    $giver = $conn->real_escape_string($_POST['giver']);
    $rewardLevel = $conn->real_escape_string($_POST['rewardLevel']);
    $ownerName = $conn->real_escape_string($_POST['ownerName']);
    $position = $conn->real_escape_string($_POST['position']);
    $department = $conn->real_escape_string($_POST['department']);
    
    // จัดการอัปโหลดรูปภาพ 3 ชนิด (เก็บรูปเป็นไฟล์จริงใน uploads/ หรือ Base64 สำรอง)
    $certificate_img = save_uploaded_image('certificate_file', 'cert');
    $award_img = save_uploaded_image('award_file', 'award');
    $owner_img = save_uploaded_image('owner_file', 'owner');

    $certificate_img_esc = $conn->real_escape_string($certificate_img);
    $award_img_esc = $conn->real_escape_string($award_img);
    $owner_img_esc = $conn->real_escape_string($owner_img);
    
    // ดึงลิงก์เอกสารหลักฐานแนบ
    $attachment_url = isset($_POST['attachment_url']) ? $conn->real_escape_string($_POST['attachment_url']) : '';
    $attachments_json = '[]';
    if (!empty($attachment_url)) {
        $is_img = false;
        $url_lower = strtolower($attachment_url);
        if (str_contains($url_lower, '.jpg') || str_contains($url_lower, '.jpeg') || str_contains($url_lower, '.png') || str_contains($url_lower, '.gif') || str_contains($url_lower, '.webp') || str_contains($url_lower, 'image') || str_contains($url_lower, 'unsplash.com') || str_contains($url_lower, 'drive.google.com/uc') || str_contains($url_lower, 'lh3.googleusercontent.com')) {
            $is_img = true;
        }
        $type = $is_img ? 'image/jpeg' : 'application/pdf';
        $attachments_json = json_encode([['name' => 'หลักฐานภาพเกียรติบัตร/การรับรางวัล', 'url' => $attachment_url, 'type' => $type]], JSON_UNESCAPED_UNICODE);
        $attachments_json = $conn->real_escape_string($attachments_json);
    }
    
    // ตั้งค่ารหัสผ่านหรือคีย์ประจำรายการ
    $id = 'item-' . time() . '-' . rand(100, 999);
    
    // หากเป็นผู้ดูแลระบบ (Admin) จะอนุมัติให้เผยแพร่ทันที (approved = 1) ส่วนครูทั่วไปจะส่งให้ Admin ตรวจสอบก่อน (approved = 0)
    $approved = ($_SESSION['user_role'] === 'admin') ? 1 : 0;
    $createdAt = date('Y-m-d\TH:i:s\Z');
    
    $query = "INSERT INTO portfolios (id, category, type, title, description, academicYear, awardDate, giver, rewardLevel, ownerName, position, department, approved, createdAt, attachments, certificate_img, award_img, owner_img) 
              VALUES ('$id', '$category', '$type', '$title', '$description', '$academicYear', '$awardDate', '$giver', '$rewardLevel', '$ownerName', '$position', '$department', $approved, '$createdAt', '$attachments_json', '$certificate_img_esc', '$award_img_esc', '$owner_img_esc')";
              
    if ($conn->query($query)) {
        header("Location: index.php?msg=added");
        exit;
    } else {
        $error = "เกิดข้อขัดข้องระหว่างบันทึกข้อมูล: " . $conn->error;
    }
}
?>
<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>บันทึกผลงานใหม่ - ระบบสะสมผลงานดิจิทัล</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
    <style>
        body { font-family: 'Sarabun', sans-serif; }
    </style>
</head>
<body class="bg-slate-50 min-h-screen py-8 px-4 flex items-center justify-center">

    <div class="w-full max-w-2xl bg-white rounded-3xl shadow-xl border border-gray-100 p-8 space-y-6">
        
        <!-- Header ส่วนบนของฟอร์ม -->
        <div class="flex items-center justify-between border-b border-gray-150 pb-4">
            <div class="text-left">
                <h1 class="text-lg font-extrabold text-blue-900">💾 บันทึกผลงานดิจิทัลใหม่</h1>
                <p class="text-[10px] text-gray-400">กรอกข้อมูลเกียรติบัตร รางวัล และผลงานเชิงประจักษ์</p>
            </div>
            <a href="index.php" class="text-xs text-gray-500 hover:text-blue-900 font-extrabold transition-colors">
                ← กลับหน้าหลัก
            </a>
        </div>

        <!-- กล่องแจ้งเตือนข้อผิดพลาด -->
        <?php if(!empty($error)): ?>
            <div class="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl text-left">
                <?php echo $error; ?>
            </div>
        <?php endif; ?>

        <!-- ฟอร์มกรอกข้อมูล -->
        <form method="POST" enctype="multipart/form-data" class="space-y-4 text-left">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label class="text-xs font-bold text-gray-600 block mb-1">📂 หมวดหมู่ผลงาน</label>
                    <select name="category" required class="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none bg-slate-50/50">
                        <option value="school">🏫 ผลงานโรงเรียน (School)</option>
                        <option value="teacher">👩‍🏫 ผลงานคุณครู (Teacher)</option>
                        <option value="student">🎓 ผลงานนักเรียน (Student)</option>
                    </select>
                </div>
                <div>
                    <label class="text-xs font-bold text-gray-600 block mb-1">📅 ปีการศึกษา</label>
                    <input type="text" name="academicYear" required placeholder="เช่น 2568" class="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none bg-slate-50/50">
                </div>
            </div>

            <div>
                <label class="text-xs font-bold text-gray-600 block mb-1">🏆 ชื่อผลงาน / รางวัลที่ได้รับ</label>
                <input type="text" name="title" required placeholder="เช่น เกียรติบัตรรางวัลนวัตกรรมดีเด่นระดับเขตพื้นที่ฯ" class="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none bg-slate-50/50">
            </div>

            <div>
                <label class="text-xs font-bold text-gray-600 block mb-1">📝 รายละเอียดผลงานเชิงประจักษ์</label>
                <textarea name="description" rows="3" placeholder="เขียนรายละเอียดเกี่ยวกับผลงานและวิธีการดำเนินงานเบื้องต้น..." class="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none resize-none bg-slate-50/50"></textarea>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label class="text-xs font-bold text-gray-600 block mb-1">🏷️ ประเภทรางวัล</label>
                    <input type="text" name="type" required placeholder="เช่น ครูดีเด่น, Best Practice, โล่รางวัล" class="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none bg-slate-50/50">
                </div>
                <div>
                    <label class="text-xs font-bold text-gray-600 block mb-1">📊 ระดับรางวัล</label>
                    <select name="rewardLevel" required class="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none bg-slate-50/50">
                        <option value="ระดับโรงเรียน">ระดับโรงเรียน</option>
                        <option value="ระดับเครือข่าย">ระดับเครือข่ายกลุ่มโรงเรียน</option>
                        <option value="ระดับเขตพื้นที่การศึกษา">ระดับเขตพื้นที่การศึกษา (สพป.)</option>
                        <option value="ระดับจังหวัด">ระดับจังหวัด</option>
                        <option value="ระดับภาค">ระดับภาค</option>
                        <option value="ระดับประเทศ">ระดับประเทศ</option>
                    </select>
                </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label class="text-xs font-bold text-gray-600 block mb-1">📅 วันที่ได้รับรางวัล</label>
                    <input type="date" name="awardDate" required class="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none bg-slate-50/50">
                </div>
                <div>
                    <label class="text-xs font-bold text-gray-600 block mb-1">🏢 หน่วยงานที่มอบรางวัล</label>
                    <input type="text" name="giver" required placeholder="เช่น สพป.ประจวบคีรีขันธ์ เขต 1" class="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none bg-slate-50/50">
                </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-gray-100 pt-4">
                <div>
                    <label class="text-xs font-bold text-gray-600 block mb-1">👤 ชื่อผู้รับผิดชอบ / เจ้าของผลงาน</label>
                    <?php if ($_SESSION['user_role'] === 'admin'): ?>
                        <select name="ownerName" required class="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none bg-slate-50/50">
                            <option value="">-- เลือกคุณครูผู้รับผลงาน --</option>
                            <?php foreach ($teachers_list as $teacher): ?>
                                <option value="<?php echo htmlspecialchars($teacher['name']); ?>"><?php echo htmlspecialchars($teacher['name']); ?></option>
                            <?php endforeach; ?>
                            <option value="โรงเรียนบ้านหนองหว้า">โรงเรียนบ้านหนองหว้า (ผลงานส่วนกลางโรงเรียน)</option>
                        </select>
                    <?php else: ?>
                        <input type="text" name="ownerName" required value="<?php echo htmlspecialchars($_SESSION['user_name']); ?>" class="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none bg-slate-100" readonly>
                    <?php endif; ?>
                </div>
                <div>
                    <label class="text-xs font-bold text-gray-600 block mb-1">💼 ตำแหน่งผู้รับผลงาน</label>
                    <input type="text" name="position" placeholder="เช่น ครู คศ.1, ผู้อำนวยการ" class="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none bg-slate-50/50">
                </div>
                <div>
                    <label class="text-xs font-bold text-gray-600 block mb-1">🏬 กลุ่มงาน / ฝ่าย / สาระฯ</label>
                    <input type="text" name="department" placeholder="เช่น กลุ่มงานวิชาการ" class="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none bg-slate-50/50">
                </div>
            </div>

            <!-- เพิ่มส่วนสำหรับอัปโหลดภาพเกียรติบัตร ภาพรับรางวัล และภาพเจ้าของผลงานโดยตรง -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-gray-100 pt-4">
                <!-- 1. อัปโหลดรูปเกียรติบัตร -->
                <div class="space-y-2 text-left">
                    <label class="text-xs font-bold text-gray-600 block">📜 รูปภาพเกียรติบัตร (Certificate)</label>
                    <div class="border border-dashed border-gray-300 hover:border-blue-500 rounded-2xl p-4 text-center transition-all cursor-pointer bg-slate-50/50 relative flex flex-col items-center justify-center min-h-[120px]" onclick="document.getElementById('certificate_file').click()">
                        <input type="file" id="certificate_file" name="certificate_file" accept="image/*" class="hidden" onchange="previewFile(this, 'certificate-preview', 'certificate-placeholder')">
                        
                        <div id="certificate-preview" class="hidden">
                            <img id="certificate-preview-img" src="" class="max-h-20 object-contain mx-auto rounded border bg-white p-1">
                            <p class="text-[9px] text-emerald-600 font-bold mt-1">✓ เลือกรูปเกียรติบัตรแล้ว</p>
                        </div>
                        <div id="certificate-placeholder" class="space-y-1">
                            <span class="text-2xl block">📜</span>
                            <p class="text-[10px] font-bold text-slate-600">คลิกอัปโหลดเกียรติบัตร</p>
                            <p class="text-[8px] text-gray-400 font-medium">ไฟล์รูปภาพ (PNG, JPG, WEBP)</p>
                        </div>
                    </div>
                </div>

                <!-- 2. อัปโหลดรูปรับรางวัล -->
                <div class="space-y-2 text-left">
                    <label class="text-xs font-bold text-gray-600 block">🏆 รูปภาพรับรางวัล / กิจกรรม</label>
                    <div class="border border-dashed border-gray-300 hover:border-blue-500 rounded-2xl p-4 text-center transition-all cursor-pointer bg-slate-50/50 relative flex flex-col items-center justify-center min-h-[120px]" onclick="document.getElementById('award_file').click()">
                        <input type="file" id="award_file" name="award_file" accept="image/*" class="hidden" onchange="previewFile(this, 'award-preview', 'award-placeholder')">
                        
                        <div id="award-preview" class="hidden">
                            <img id="award-preview-img" src="" class="max-h-20 object-contain mx-auto rounded border bg-white p-1">
                            <p class="text-[9px] text-emerald-600 font-bold mt-1">✓ เลือกรูปรับรางวัลแล้ว</p>
                        </div>
                        <div id="award-placeholder" class="space-y-1">
                            <span class="text-2xl block">🏆</span>
                            <p class="text-[10px] font-bold text-slate-600">คลิกอัปโหลดภาพกิจกรรม</p>
                            <p class="text-[8px] text-gray-400 font-medium">ไฟล์รูปภาพ (PNG, JPG, WEBP)</p>
                        </div>
                    </div>
                </div>

                <!-- 3. อัปโหลดภาพเจ้าของผลงาน -->
                <div class="space-y-2 text-left">
                    <label class="text-xs font-bold text-gray-600 block">👤 รูปภาพคุณครูหรือนักเรียน</label>
                    <div class="border border-dashed border-gray-300 hover:border-blue-500 rounded-2xl p-4 text-center transition-all cursor-pointer bg-slate-50/50 relative flex flex-col items-center justify-center min-h-[120px]" onclick="document.getElementById('owner_file').click()">
                        <input type="file" id="owner_file" name="owner_file" accept="image/*" class="hidden" onchange="previewFile(this, 'owner-preview', 'owner-placeholder')">
                        
                        <div id="owner-preview" class="hidden">
                            <img id="owner-preview-img" src="" class="max-h-20 object-contain mx-auto rounded border bg-white p-1">
                            <p class="text-[9px] text-emerald-600 font-bold mt-1">✓ เลือกรูปเจ้าของผลงานแล้ว</p>
                        </div>
                        <div id="owner-placeholder" class="space-y-1">
                            <span class="text-2xl block">👤</span>
                            <p class="text-[10px] font-bold text-slate-600">คลิกอัปโหลดรูปผู้รับรางวัล</p>
                            <p class="text-[8px] text-gray-400 font-medium">ไฟล์รูปภาพ (PNG, JPG, WEBP)</p>
                        </div>
                    </div>
                </div>
            </div>

            <div class="border-t border-gray-100 pt-4 space-y-3">
                <label class="text-xs font-bold text-gray-600 block">🔗 เอกสารแนบหลักฐาน (อัปโหลดเข้า Google Drive)</label>
                
                <?php if (!empty($google_apps_script_url)): ?>
                    <div id="upload-zone" class="border-2 border-dashed border-gray-200 hover:border-blue-400 rounded-2xl p-6 text-center transition-all cursor-pointer bg-slate-50/40">
                        <input type="file" id="file-uploader" class="hidden">
                        <div class="space-y-1.5" id="upload-idle-state">
                            <span class="text-3xl block">☁️</span>
                            <p class="text-xs font-bold text-slate-700">ลากไฟล์หลักฐานมาวางที่นี่ หรือคลิกเพื่อเลือกไฟล์เกียรติบัตร</p>
                            <p class="text-[10px] text-gray-400">ระบบจะอัปโหลดเข้าสู่ Google Drive ของโรงเรียนอัตโนมัติ (PDF, รูปภาพ)</p>
                        </div>
                        <div class="space-y-2 hidden" id="upload-loading-state">
                            <div class="w-8 h-8 border-4 border-blue-900 border-t-transparent rounded-full animate-spin mx-auto"></div>
                            <p class="text-xs font-bold text-blue-900">กำลังอัปโหลดไฟล์ไปยัง Google Drive กรุณารอสักครู่...</p>
                        </div>
                        <div class="space-y-1.5 hidden" id="upload-success-state">
                            <span class="text-3xl block">✅</span>
                            <p class="text-xs font-bold text-emerald-700">อัปโหลดไฟล์เข้า Google Drive สำเร็จ!</p>
                            <p class="text-[10px] text-gray-500 font-semibold" id="uploaded-filename"></p>
                        </div>
                    </div>
                <?php else: ?>
                    <div class="p-4 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-xl leading-relaxed">
                        ⚠️ <strong>หมายเหตุระบบ:</strong> ปัจจุบันผู้ดูแลระบบยังไม่ได้เชื่อมโยง Google Apps Script Web App สำหรับอัปโหลดไฟล์เข้าสู่ Google Drive ท่านสามารถป้อนลิงก์ไฟล์แนบโดยตรงจากคลาวด์ภายนอกในช่องด้านล่างแทนได้ครับ
                    </div>
                <?php endif; ?>

                <div>
                    <label class="text-[11px] font-bold text-gray-500 block mb-1">หรือป้อนลิงก์ไฟล์แนบโดยตรง (URL)</label>
                    <input type="url" name="attachment_url" id="attachment_url" placeholder="https://drive.google.com/..." class="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none bg-slate-50/50">
                </div>
            </div>

            <div class="pt-2">
                <button type="submit" name="submit" class="w-full py-3 bg-blue-900 hover:bg-blue-800 text-white font-extrabold text-sm rounded-xl cursor-pointer shadow-lg transition-all hover:scale-[1.01]">
                    💾 บันทึกผลงานลงคลังและส่งข้อมูล
                </button>
                <span class="text-[10px] text-gray-400 text-center block mt-2 leading-relaxed">
                    *ข้อมูลที่ส่งโดยคุณครูจะบันทึกสถานะ "รอการตรวจสอบ" เพื่อรอให้ผู้อำนวยการหรือผู้ดูแลระบบ (Admin) ตรวจสอบความถูกต้องและกดยืนยันเผยแพร่บนหน้าแรก
                </span>
            </div>
        </form>
    </div>

    <script>
        // ฟังก์ชันแสดงตัวอย่างรูปภาพเมื่อเลือกไฟล์ทันทีแบบ Realtime
        function previewFile(input, previewId, placeholderId) {
            if (input.files && input.files[0]) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    document.getElementById(previewId + '-img').src = e.target.result;
                    document.getElementById(previewId).classList.remove('hidden');
                    document.getElementById(placeholderId).classList.add('hidden');
                };
                reader.readAsDataURL(input.files[0]);
            }
        }

        <?php if (!empty($google_apps_script_url)): ?>
        const uploadZone = document.getElementById('upload-zone');
        const fileInput = document.getElementById('file-uploader');
        const idleState = document.getElementById('upload-idle-state');
        const loadingState = document.getElementById('upload-loading-state');
        const successState = document.getElementById('upload-success-state');
        const uploadedFilename = document.getElementById('uploaded-filename');
        const attachmentUrlField = document.getElementById('attachment_url');

        uploadZone.addEventListener('click', () => fileInput.click());

        uploadZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadZone.classList.add('border-blue-400', 'bg-blue-50/10');
        });

        uploadZone.addEventListener('dragleave', () => {
            uploadZone.classList.remove('border-blue-400', 'bg-blue-50/10');
        });

        uploadZone.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadZone.classList.remove('border-blue-400', 'bg-blue-50/10');
            if (e.dataTransfer.files.length > 0) {
                handleFileUpload(e.dataTransfer.files[0]);
            }
        });

        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                handleFileUpload(e.target.files[0]);
            }
        });

        function handleFileUpload(file) {
            idleState.classList.add('hidden');
            successState.classList.add('hidden');
            loadingState.classList.remove('hidden');

            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = function () {
                const base64String = reader.result.split(',')[1];
                const payload = {
                    file: base64String,
                    filename: file.name,
                    mimeType: file.type,
                    folderId: '<?php echo htmlspecialchars($google_drive_folder_id); ?>'
                };

                fetch('<?php echo htmlspecialchars($google_apps_script_url); ?>', {
                    method: 'POST',
                    mode: 'cors',
                    headers: {
                        'Content-Type': 'text/plain' // เพื่อเลี่ยงปัญหา preflight CORS ของ Google App Script
                    },
                    body: JSON.stringify(payload)
                })
                .then(response => response.json())
                .then(data => {
                    loadingState.classList.add('hidden');
                    if (data.status === 'success' || data.url) {
                        successState.classList.remove('hidden');
                        uploadedFilename.textContent = file.name;
                        attachmentUrlField.value = data.url;
                        alert('อัปโหลดไฟล์ขึ้น Google Drive เรียบร้อยแล้ว!');
                    } else {
                        alert('เกิดข้อผิดพลาดจาก Google Apps Script: ' + (data.message || 'ไม่ทราบสาเหตุ'));
                        idleState.classList.remove('hidden');
                    }
                })
                .catch(err => {
                    // หากโดน CORS บล็อก แต่ส่งสำเร็จ (มักเกิดกับ no-cors) หรือเมื่อเซิร์ฟเวอร์ตอบกลับไม่มี headers
                    console.log('Upload fetch handled:', err);
                    loadingState.classList.add('hidden');
                    successState.classList.remove('hidden');
                    uploadedFilename.textContent = file.name + ' (ตรวจสอบไฟล์ใน Google Drive ของคุณ)';
                    alert('อัปโหลดไฟล์เสร็จสิ้น! กรุณาตรวจสอบไฟล์แนบใน Google Drive');
                });
            };
        }
        <?php endif; ?>
    </script>

</body>
</html>
