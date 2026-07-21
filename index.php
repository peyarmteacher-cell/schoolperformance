<?php
// index.php - หน้าหลักของระบบประกันคุณภาพและคลังสะสมผลงานดิจิทัล โรงเรียนบ้านหนองหว้า
require_once 'config.php';

// ดึงการตั้งค่าโรงเรียนและ Google Drive
$school_name = get_setting($conn, 'school_name', 'โรงเรียนบ้านหนองหว้า');
$school_logo = get_setting($conn, 'school_logo', '');
$google_drive_folder_id = get_setting($conn, 'google_drive_folder_id', '');
$google_apps_script_url = get_setting($conn, 'google_apps_script_url', '');

// ดึงปีการศึกษาเพื่อทำตัวกรอง
$years_query = "SELECT DISTINCT academicYear FROM portfolios ORDER BY academicYear DESC";
$years_result = $conn->query($years_query);

if (!$years_result) {
    die("
    <div style='font-family: sans-serif; padding: 30px; border: 1px solid #f5c6cb; background-color: #fff5f5; color: #721c24; border-radius: 16px; max-width: 650px; margin: 80px auto; box-shadow: 0 10px 25px rgba(0,0,0,0.05);'>
        <div style='display: flex; align-items: center; gap: 15px; margin-bottom: 20px;'>
            <span style='font-size: 40px;'>⚠️</span>
            <div>
                <h3 style='margin: 0; font-size: 18px; color: #b71c1c;'>เกิดข้อผิดพลาดในการเชื่อมต่อหรือคิวรีฐานข้อมูล!</h3>
                <p style='margin: 5px 0 0; font-size: 13px; color: #5a6a85;'>ไม่พบตารางในฐานข้อมูล หรือข้อมูลเชื่อมต่อไม่ถูกต้อง</p>
            </div>
        </div>
        <div style='background-color: #f1f5f9; padding: 15px; border-radius: 10px; font-family: monospace; font-size: 12px; color: #334155; border-left: 4px solid #cbd5e1; margin-bottom: 20px; overflow-x: auto;'>
            MySQL Error: " . htmlspecialchars($conn->error) . "
        </div>
        <div style='font-size: 13px; color: #475569; line-height: 1.6;'>
            💡 <strong>คำแนะนำในการแก้ไข:</strong>
            <ul style='margin-top: 5px; padding-left: 20px;'>
                <li>ตรวจสอบว่าคุณได้ <strong>นำเข้าตารางข้อมูลจากไฟล์ <code>database.sql</code></strong> เข้าไปที่ระบบฐานข้อมูล <code>" . htmlspecialchars(DB_NAME) . "</code> ใน phpMyAdmin เรียบร้อยแล้วหรือยัง</li>
                <li>ตรวจสอบการกำหนดสิทธิ์ของบัญชีผู้ใช้งาน <code>" . htmlspecialchars(DB_USER) . "</code> ว่ามีสิทธิ์คิวรี/จัดการตารางหรือไม่</li>
                <li>หากยังเชื่อมต่อไม่ได้ กรุณาปรับเปลี่ยนข้อมูล Host, User, Pass และ Name ในไฟล์ <code>config.php</code> ให้ตรงกับที่เซิร์ฟเวอร์จริงกำหนด</li>
            </ul>
        </div>
        <div style='margin-top: 25px; text-align: center;'>
            <a href='index.php' style='display: inline-block; padding: 10px 20px; background-color: #1e3a8a; color: white; border-radius: 10px; text-decoration: none; font-size: 13px; font-weight: bold;'>🔄 รีเฟรชหน้าเว็บ</a>
        </div>
    </div>
    ");
}

// เงื่อนไขการกรอง
$category_filter = isset($_GET['category']) ? $_GET['category'] : '';
$year_filter = isset($_GET['year']) ? $_GET['year'] : '';
$search_query = isset($_GET['search']) ? $_GET['search'] : '';

$where_clauses = [];
if (!empty($category_filter)) {
    $where_clauses[] = "category = '" . $conn->real_escape_string($category_filter) . "'";
}
if (!empty($year_filter)) {
    $where_clauses[] = "academicYear = '" . $conn->real_escape_string($year_filter) . "'";
}
if (!empty($search_query)) {
    $search = $conn->real_escape_string($search_query);
    $where_clauses[] = "(title LIKE '%$search%' OR description LIKE '%$search%' OR ownerName LIKE '%$search%' OR giver LIKE '%$search%' OR type LIKE '%$search%')";
}

// แขกทั่วไปจะเห็นเฉพาะข้อมูลที่ได้รับอนุมัติแล้ว (approved = 1) ส่วนแอดมินหรือครูที่ล็อกอินจะเห็นข้อมูลทั้งหมด
if (!isset($_SESSION['user_role'])) {
    $where_clauses[] = "approved = 1";
} elseif ($_SESSION['user_role'] !== 'admin') {
    // ครูเห็นข้อมูลของทุกคนที่อนุมัติแล้ว + ข้อมูลของตัวเองที่รออนุมัติด้วย
    $user_name_esc = $conn->real_escape_string($_SESSION['user_name']);
    $where_clauses[] = "(approved = 1 OR ownerName = '$user_name_esc')";
}

$where_sql = "";
if (count($where_clauses) > 0) {
    $where_sql = "WHERE " . implode(" AND ", $where_clauses);
}

$query = "SELECT * FROM portfolios $where_sql ORDER BY academicYear DESC, createdAt DESC";
$result = $conn->query($query);

// ดึงสถิติรวมสำหรับแผงควบคุมหลัก (Dashboard Panels) โดยคำนึงถึงความปลอดภัยของผลลัพธ์คิวรี
$res_school = $conn->query("SELECT COUNT(*) as total FROM portfolios WHERE category='school' AND approved=1");
$stat_school = ($res_school) ? $res_school->fetch_assoc()['total'] : 0;

$res_teacher = $conn->query("SELECT COUNT(*) as total FROM portfolios WHERE category='teacher' AND approved=1");
$stat_teacher = ($res_teacher) ? $res_teacher->fetch_assoc()['total'] : 0;

$res_student = $conn->query("SELECT COUNT(*) as total FROM portfolios WHERE category='student' AND approved=1");
$stat_student = ($res_student) ? $res_student->fetch_assoc()['total'] : 0;

$res_pending = $conn->query("SELECT COUNT(*) as total FROM portfolios WHERE approved=0");
$stat_pending = ($res_pending) ? $res_pending->fetch_assoc()['total'] : 0;

// จัดการบันทึกการตั้งค่า และอนุมัติผลงาน (เฉพาะ Admin)
if (isset($_SESSION['user_role']) && $_SESSION['user_role'] === 'admin') {
    if (isset($_GET['approve_id'])) {
        $approve_id = $conn->real_escape_string($_GET['approve_id']);
        $conn->query("UPDATE portfolios SET approved = 1 WHERE id = '$approve_id'");
        header("Location: index.php?msg=approved");
        exit;
    }
    if (isset($_GET['delete_id'])) {
        $delete_id = $conn->real_escape_string($_GET['delete_id']);
        $conn->query("DELETE FROM portfolios WHERE id = '$delete_id'");
        header("Location: index.php?msg=deleted");
        exit;
    }
    if (isset($_POST['save_settings'])) {
        $school_name = $_POST['school_name'];
        $school_logo = $_POST['school_logo'];
        $google_drive_folder_id = $_POST['google_drive_folder_id'];
        $google_apps_script_url = $_POST['google_apps_script_url'];

        set_setting($conn, 'school_name', $school_name);
        set_setting($conn, 'school_logo', $school_logo);
        set_setting($conn, 'google_drive_folder_id', $google_drive_folder_id);
        set_setting($conn, 'google_apps_script_url', $google_apps_script_url);

        header("Location: index.php?msg=settings_updated");
        exit;
    }
}
?>
<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>คลังสะสมผลงานดิจิทัล - โรงเรียนบ้านหนองหว้า</title>
    <!-- นำเข้า Tailwind CSS เพื่อความสวยงามขั้นสุดและ Responsive -->
    <script src="https://cdn.tailwindcss.com"></script>
    <!-- นำเข้าฟอนต์ภาษาไทย "Sarabun" และ "Inter" เพื่อความทันสมัย -->
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Sarabun:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
    <style>
        body { font-family: 'Sarabun', 'Inter', sans-serif; }
    </style>
</head>
<body class="bg-slate-50/70 text-slate-800 min-h-screen flex flex-col antialiased">

    <!-- Header bar แถบเมนูด้านบนที่ดูดี มีการไล่สีหรูหรา และรองรับการแสดงผลบนสมาร์ทโฟน -->
    <header class="bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-950 text-white shadow-xl sticky top-0 z-50 print:hidden">
        <div class="max-w-7xl mx-auto px-4 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div class="flex items-center gap-3 text-center sm:text-left">
                <div class="w-12 h-12 bg-white rounded-2xl p-1 shadow-inner flex items-center justify-center flex-shrink-0 overflow-hidden">
                    <?php if (!empty($school_logo)): ?>
                        <img src="<?php echo htmlspecialchars($school_logo); ?>" alt="School Logo" class="w-full h-full object-contain">
                    <?php else: ?>
                        <span class="text-blue-950 font-black text-lg">NHW</span>
                    <?php endif; ?>
                </div>
                <div>
                    <h1 class="text-base md:text-lg font-bold text-amber-400">ระบบประกันคุณภาพและคลังสะสมผลงานดิจิทัล</h1>
                    <p class="text-[10px] md:text-xs text-blue-200"><?php echo htmlspecialchars($school_name); ?></p>
                </div>
            </div>

            <div class="flex items-center gap-3">
                <?php if (isset($_SESSION['user_id'])): ?>
                    <div class="bg-blue-950/60 border border-blue-700/50 rounded-xl px-4 py-1.5 flex items-center gap-3">
                        <div class="text-right">
                            <p class="text-xs font-bold text-white"><?php echo htmlspecialchars($_SESSION['user_name']); ?></p>
                            <span class="text-[9px] bg-amber-400/20 text-amber-300 px-1.5 py-0.2 rounded font-extrabold uppercase">
                                <?php echo ($_SESSION['user_role'] === 'admin') ? 'ผู้ดูแลระบบ (Admin)' : 'คุณครูผู้สอน'; ?>
                            </span>
                        </div>
                        <a href="logout.php" class="py-1 px-3 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-semibold border border-rose-500/20 transition-all">
                            ออกจากระบบ
                        </a>
                    </div>
                <?php else: ?>
                    <a href="login.php" class="px-5 py-2 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-blue-950 font-extrabold text-xs rounded-xl shadow-lg transition-all transform hover:scale-[1.02] cursor-pointer">
                        🔒 เข้าสู่ระบบครู / แอดมิน
                    </a>
                <?php endif; ?>
            </div>
        </div>
    </header>

    <!-- ข้อมูลแผงสถิติและเนื้อหาหลัก -->
    <main class="max-w-7xl mx-auto px-4 py-8 flex-1 w-full space-y-8">
        
        <!-- แจ้งเตือนเมื่อทำรายการสำเร็จ -->
        <?php if(isset($_GET['msg'])): ?>
            <div class="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-2xl flex items-center gap-2 shadow-sm">
                <span>✅</span>
                <span>
                    <?php 
                        if ($_GET['msg'] === 'settings_updated') {
                            echo 'บันทึกการตั้งค่าโรงเรียนและเชื่อมต่อระบบ Google Drive สำเร็จเรียบร้อยแล้ว!';
                        } elseif ($_GET['msg'] === 'approved') {
                            echo 'อนุมัติเผยแพร่ผลงานเรียบร้อยแล้ว!';
                        } elseif ($_GET['msg'] === 'deleted') {
                            echo 'ลบผลงานออกจากระบบเรียบร้อยแล้ว!';
                        } else {
                            echo 'ทำรายการสำเร็จเรียบร้อยแล้ว!';
                        }
                    ?>
                </span>
            </div>
        <?php endif; ?>

        <?php if (isset($_SESSION['user_role']) && $_SESSION['user_role'] === 'admin'): ?>
            <!-- แผงตั้งค่าผู้ดูแลระบบและรหัสเชื่อมโยง Google Drive (Admin Settings) -->
            <section class="bg-white p-6 rounded-3xl shadow-sm border border-blue-100 text-left">
                <div class="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                    <div class="flex items-center gap-2.5">
                        <span class="text-xl">⚙️</span>
                        <div>
                            <h2 class="text-sm font-extrabold text-slate-800">แผงควบคุมตั้งค่าโรงเรียนและระบบเชื่อมโยงคลังข้อมูล Google Drive</h2>
                            <p class="text-[10px] text-gray-400">สำหรับผู้ดูแลระบบ (Admin) เท่านั้น เพื่อเชื่อมต่อสื่อ/เอกสารแนบกับ Google Drive ได้โดยตรง</p>
                        </div>
                    </div>
                </div>

                <form method="POST" class="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
                    <div class="space-y-4">
                        <div>
                            <label class="block font-bold text-gray-700 mb-1">🏫 ชื่อโรงเรียน / สถาบัน</label>
                            <input type="text" name="school_name" value="<?php echo htmlspecialchars($school_name); ?>" required class="w-full px-3 py-2.5 rounded-xl border border-gray-200 outline-none focus:border-blue-500 bg-slate-50/50">
                        </div>
                        <div>
                            <label class="block font-bold text-gray-700 mb-1">🎨 ลิงก์โลโก้โรงเรียน (Image URL)</label>
                            <input type="url" name="school_logo" value="<?php echo htmlspecialchars($school_logo); ?>" placeholder="https://example.com/logo.png" class="w-full px-3 py-2.5 rounded-xl border border-gray-200 outline-none focus:border-blue-500 bg-slate-50/50">
                            <p class="text-[9px] text-gray-400 mt-1">💡 ป้อนลิงก์ที่อยู่ไฟล์รูปภาพโลโก้ของคุณ เพื่อนำไปแสดงในแถบเมนูด้านบน</p>
                        </div>
                    </div>

                    <div class="space-y-4">
                        <div>
                            <label class="block font-bold text-gray-700 mb-1">📁 Google Drive Folder ID</label>
                            <input type="text" name="google_drive_folder_id" value="<?php echo htmlspecialchars($google_drive_folder_id); ?>" placeholder="1aBcD-eFgHiJkLmNoPqRsTuVwXyZ" class="w-full px-3 py-2.5 rounded-xl border border-gray-200 outline-none focus:border-blue-500 bg-slate-50/50">
                            <p class="text-[9px] text-gray-400 mt-1">💡 คัดลอก ID จาก URL โฟลเดอร์ใน Google Drive ของคุณที่ต้องการใช้จัดเก็บไฟล์</p>
                        </div>
                        <div>
                            <label class="block font-bold text-gray-700 mb-1">⚡ Google Apps Script Web App URL</label>
                            <input type="url" name="google_apps_script_url" value="<?php echo htmlspecialchars($google_apps_script_url); ?>" placeholder="https://script.google.com/macros/s/.../exec" class="w-full px-3 py-2.5 rounded-xl border border-gray-200 outline-none focus:border-blue-500 bg-slate-50/50">
                            <p class="text-[9px] text-gray-400 mt-1">💡 ป้อนลิงก์ Web App ที่เผยแพร่จาก Google Apps Script เพื่อใช้ส่งไฟล์อัปโหลดเข้า Drive</p>
                        </div>
                    </div>

                    <div class="md:col-span-2 pt-2 border-t border-slate-100 flex flex-col md:flex-row gap-4 items-center justify-between">
                        <button type="button" onclick="document.getElementById('gas-script-modal').classList.toggle('hidden')" class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg cursor-pointer transition-all flex items-center gap-1.5">
                            <span>📋 ดูโค้ด Google Apps Script</span>
                        </button>
                        <button type="submit" name="save_settings" class="w-full md:w-auto px-6 py-2.5 bg-blue-900 hover:bg-blue-800 text-white font-extrabold rounded-xl shadow-md transition-all cursor-pointer">
                            💾 บันทึกการตั้งค่าทั้งหมด
                        </button>
                    </div>
                </form>
            </section>

            <!-- Modal สำหรับดูโค้ด Google Apps Script -->
            <div id="gas-script-modal" class="hidden fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div class="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-4 text-left flex flex-col max-h-[85vh]">
                    <div class="flex justify-between items-center pb-2 border-b">
                        <div class="flex items-center gap-2">
                            <span class="text-lg">📋</span>
                            <h3 class="font-bold text-sm text-slate-800">โค้ดสำหรับสร้าง Google Apps Script เพื่อเชื่อมต่อกับ Google Drive</h3>
                        </div>
                        <button onclick="document.getElementById('gas-script-modal').classList.add('hidden')" class="text-gray-400 hover:text-gray-600 font-extrabold text-sm p-1">❌ ปิด</button>
                    </div>
                    
                    <div class="text-xs text-slate-500 space-y-2">
                        <p class="font-semibold text-blue-900">💡 วิธีการนำไปใช้งาน:</p>
                        <ol class="list-decimal pl-5 space-y-1">
                            <li>เปิดเว็บ <a href="https://script.google.com/" target="_blank" class="text-blue-600 underline">Google Apps Script</a> แล้วกด "โครงการใหม่" (New Project)</li>
                            <li>คัดลอกโค้ดด้านล่างทั้งหมดไปใส่แทนที่โค้ดเดิมทั้งหมดในไฟล์โครงการ</li>
                            <li>กดเซฟ แล้วเลือก <strong>"การใช้งานได้จริง" (Deploy) > "การจัดการการปรับใช้ใหม่" (New Deployment)</strong></li>
                            <li>เลือกประเภทเป็น <strong>"เว็บแอป" (Web App)</strong></li>
                            <li>ตั้งค่า: ผู้มีสิทธิ์เข้าถึง (Who has access) ให้เลือกเป็น <strong>"ทุกคน" (Anyone)</strong> เพื่ออนุญาตให้ฟอร์มส่งอัปโหลดได้</li>
                            <li>กดปรับใช้ (Deploy) แล้วคัดลอก **URL เว็บแอป (Web App URL)** มาวางในช่องตั้งค่าด้านบนของเว็บนี้ได้เลย!</li>
                        </ol>
                    </div>

                    <div class="flex-1 overflow-y-auto bg-slate-900 text-slate-200 p-4 rounded-xl font-mono text-[11px] leading-relaxed relative">
                        <pre id="gasCodeText" class="whitespace-pre-wrap select-all">function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var base64Data = data.file;
    var fileName = data.filename;
    var folderId = data.folderId; // โฟลเดอร์ปลายทาง
    
    var decoded = Utilities.base64Decode(base64Data);
    var blob = Utilities.newBlob(decoded, data.mimeType, fileName);
    
    var folder;
    if (folderId) {
      folder = DriveApp.getFolderById(folderId);
    } else {
      folder = DriveApp.getRootFolder();
    }
    
    var file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    
    var result = {
      status: "success",
      url: file.getUrl(),
      id: file.getId()
    };
    
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch(err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}</pre>
                    </div>
                    
                    <div class="flex justify-end gap-2 pt-2 border-t">
                        <button onclick="navigator.clipboard.writeText(document.getElementById(&#39;gasCodeText&#39;).innerText); alert(&#39;คัดลอกโค้ดเรียบร้อยแล้ว!&#39;);" class="px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white text-xs font-bold rounded-lg cursor-pointer">
                            📋 คัดลอกโค้ดไปยังคลิปบอร์ด
                        </button>
                        <button onclick="document.getElementById(&#39;gas-script-modal&#39;).classList.add(&#39;hidden&#39;)" class="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-slate-700 text-xs font-bold rounded-lg cursor-pointer">
                            ปิดหน้าต่าง
                        </button>
                    </div>
                </div>
            </div>
        <?php endif; ?>

        <!-- แผงสถิติสวยงาม (Dashboard Panels) ในรูปแบบ Responsive (1-4 คอลัมน์) -->
        <section class="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div class="bg-white p-5 rounded-2xl shadow-sm border border-gray-150/80 flex items-center justify-between transition-all hover:shadow-md">
                <div>
                    <span class="text-xs text-gray-500 font-bold block">🏫 ผลงานสถานศึกษา</span>
                    <strong class="text-2xl font-black text-blue-900 mt-1 block"><?php echo $stat_school; ?></strong>
                </div>
                <div class="w-10 h-10 rounded-xl bg-blue-50 text-blue-900 flex items-center justify-center text-lg font-bold">🏫</div>
            </div>
            
            <div class="bg-white p-5 rounded-2xl shadow-sm border border-gray-150/80 flex items-center justify-between transition-all hover:shadow-md">
                <div>
                    <span class="text-xs text-gray-500 font-bold block">👩‍🏫 ผลงานคุณครู</span>
                    <strong class="text-2xl font-black text-amber-600 mt-1 block"><?php echo $stat_teacher; ?></strong>
                </div>
                <div class="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center text-lg font-bold">👩‍🏫</div>
            </div>

            <div class="bg-white p-5 rounded-2xl shadow-sm border border-gray-150/80 flex items-center justify-between transition-all hover:shadow-md">
                <div>
                    <span class="text-xs text-gray-500 font-bold block">🎓 ผลงานนักเรียน</span>
                    <strong class="text-2xl font-black text-emerald-600 mt-1 block"><?php echo $stat_student; ?></strong>
                </div>
                <div class="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-lg font-bold">🎓</div>
            </div>

            <div class="bg-white p-5 rounded-2xl shadow-sm border border-gray-150/80 flex items-center justify-between transition-all hover:shadow-md">
                <div>
                    <span class="text-xs text-gray-500 font-bold block">⏳ รายการรออนุมัติ</span>
                    <strong class="text-2xl font-black text-rose-600 mt-1 block"><?php echo $stat_pending; ?></strong>
                </div>
                <div class="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center text-lg font-bold">⏳</div>
            </div>
        </section>

        <!-- แผงกรองข้อมูล (Filters) และช่องค้นหาที่มีความสวยงาม ใช้งานง่ายทั้งแท็บเล็ตและโทรศัพท์มือถือ -->
        <section class="bg-white p-6 rounded-3xl shadow-sm border border-gray-150">
            <form method="GET" class="flex flex-col md:flex-row gap-4 items-end">
                <div class="flex-1 w-full text-left">
                    <label class="text-xs font-bold text-gray-600 block mb-1.5">🔍 ค้นหาผลงาน</label>
                    <input type="text" name="search" value="<?php echo htmlspecialchars($search_query); ?>" placeholder="พิมพ์คำสำคัญ เช่น ชื่อรางวัล, ผู้จัดทำ, หน่วยงาน..." class="w-full text-xs px-4 py-3 rounded-xl border border-gray-200 outline-none focus:border-blue-500 transition-all bg-slate-50/50">
                </div>
                
                <div class="w-full md:w-52 text-left">
                    <label class="text-xs font-bold text-gray-600 block mb-1.5">📂 หมวดหมู่ผลงาน</label>
                    <select name="category" class="w-full text-xs px-4 py-3 rounded-xl border border-gray-200 outline-none focus:border-blue-500 bg-white">
                        <option value="">ทั้งหมด</option>
                        <option value="school" <?php if($category_filter == 'school') echo 'selected'; ?>>ผลงานโรงเรียน (School)</option>
                        <option value="teacher" <?php if($category_filter == 'teacher') echo 'selected'; ?>>ผลงานคุณครู (Teacher)</option>
                        <option value="student" <?php if($category_filter == 'student') echo 'selected'; ?>>ผลงานนักเรียน (Student)</option>
                    </select>
                </div>

                <div class="w-full md:w-44 text-left">
                    <label class="text-xs font-bold text-gray-600 block mb-1.5">📅 ปีการศึกษา</label>
                    <select name="year" class="w-full text-xs px-4 py-3 rounded-xl border border-gray-200 outline-none focus:border-blue-500 bg-white">
                        <option value="">ทั้งหมด</option>
                        <?php while($y_row = $years_result->fetch_assoc()): ?>
                            <option value="<?php echo $y_row['academicYear']; ?>" <?php if($year_filter == $y_row['academicYear']) echo 'selected'; ?>>
                                ปีการศึกษา <?php echo $y_row['academicYear']; ?>
                            </option>
                        <?php endwhile; ?>
                    </select>
                </div>

                <div class="flex gap-2 w-full md:w-auto">
                    <button type="submit" class="flex-1 md:flex-none px-6 py-3 bg-blue-900 hover:bg-blue-800 text-white font-extrabold text-xs rounded-xl shadow cursor-pointer transition-all">
                        ค้นหาด่วน
                    </button>
                    <a href="index.php" class="px-5 py-3 bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-bold rounded-xl text-center transition-all">
                        ล้างค่า
                    </a>
                </div>
            </form>
        </section>

        <!-- รายการคลังสะสมผลงานการประเมินสถานศึกษาและคุณครู -->
        <section class="space-y-4">
            <div class="flex justify-between items-center px-1">
                <div>
                    <h2 class="text-sm font-extrabold text-gray-800 uppercase tracking-wider">รายการคลังผลงานเชิงประจักษ์</h2>
                    <p class="text-[10px] text-gray-400">พบทัังหมด <?php echo $result->num_rows; ?> ผลงานที่ผ่านการคัดสรร</p>
                </div>
                <?php if (isset($_SESSION['user_id'])): ?>
                    <a href="add_portfolio.php" class="px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white text-xs font-bold rounded-xl shadow-lg flex items-center gap-1.5 transition-all">
                        <span>➕ บันทึกผลงานใหม่</span>
                    </a>
                <?php endif; ?>
            </div>

            <?php if ($result->num_rows == 0): ?>
                <div class="bg-white p-12 text-center rounded-3xl border border-gray-150 shadow-sm space-y-2">
                    <span class="text-4xl block">📂</span>
                    <p class="text-sm font-bold text-gray-500">ไม่พบรายการผลงานในระบบคลังสะสมดิจิทัลขณะนี้</p>
                    <p class="text-xs text-gray-400">กรุณาปรับปรุงตัวกรองหรือเข้าสู่ระบบเพื่อบันทึกผลงานใหม่</p>
                </div>
            <?php else: ?>
                <!-- แสดงผลแบบบอร์ดสไตล์ Card สวยงาม (Responsive 1 คอลัมน์บนมือถือ, 2 คอลัมน์บนแท็บเล็ต/คอมพิวเตอร์) -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <?php while($row = $result->fetch_assoc()): ?>
                        <div class="bg-white p-6 rounded-2xl border border-gray-150/80 shadow-sm flex flex-col justify-between hover:shadow-md transition-all <?php if(!$row['approved']) echo 'border-amber-300 bg-amber-50/20'; ?>">
                            <div class="space-y-3.5 text-left">
                                <div class="flex justify-between items-start gap-2">
                                    <span class="text-[9px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider <?php 
                                        if($row['category'] == 'school') echo 'bg-blue-50 text-blue-900';
                                        elseif($row['category'] == 'teacher') echo 'bg-amber-50 text-amber-700';
                                        else echo 'bg-emerald-50 text-emerald-700';
                                    ?>">
                                        <?php 
                                            if($row['category'] == 'school') echo '🏫 ผลงานสถานศึกษา';
                                            elseif($row['category'] == 'teacher') echo '👩‍🏫 ผลงานครู';
                                            else echo '🎓 ผลงานนักเรียน';
                                        ?>
                                    </span>
                                    <span class="text-[10px] font-bold text-gray-400">ปีการศึกษา <?php echo htmlspecialchars($row['academicYear']); ?></span>
                                </div>

                                <h3 class="font-extrabold text-sm text-gray-800 leading-snug"><?php echo htmlspecialchars($row['title']); ?></h3>
                                <p class="text-xs text-gray-500 line-clamp-3 leading-relaxed"><?php echo htmlspecialchars($row['description']); ?></p>

                                <div class="pt-3 border-t border-gray-100 space-y-1.5 text-xs text-gray-600 bg-slate-50/50 p-3 rounded-xl">
                                    <p class="flex items-center gap-1.5">
                                        <span>🏅</span>
                                        <span class="font-semibold text-gray-700">รางวัล/ประเภท:</span> 
                                        <span class="text-blue-900 font-bold"><?php echo htmlspecialchars($row['type']); ?> (<?php echo htmlspecialchars($row['rewardLevel']); ?>)</span>
                                    </p>
                                    <p class="flex items-center gap-1.5">
                                        <span>👤</span>
                                        <span class="font-semibold text-gray-700">ผู้รับรางวัล:</span> 
                                        <strong class="text-gray-800"><?php echo htmlspecialchars($row['ownerName']); ?></strong>
                                    </p>
                                    <p class="flex items-center gap-1.5">
                                        <span>🏢</span>
                                        <span class="font-semibold text-gray-700">หน่วยงานผู้มอบ:</span> 
                                        <span class="text-gray-500 font-medium"><?php echo htmlspecialchars($row['giver']); ?></span>
                                    </p>
                                </div>
                            </div>

                            <div class="mt-5 pt-4 border-t border-gray-100 flex justify-between items-center">
                                <span class="text-[9px] font-semibold text-gray-400">บันทึกเมื่อ: <?php echo substr($row['createdAt'], 0, 10); ?></span>
                                
                                <div class="flex items-center gap-2">
                                    <?php if (isset($_SESSION['user_role']) && $_SESSION['user_role'] === 'admin'): ?>
                                        <?php if (!$row['approved']): ?>
                                            <a href="index.php?approve_id=<?php echo $row['id']; ?>" class="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[10px] px-3.5 py-1.5 rounded-lg shadow-sm transition-all cursor-pointer">
                                                ✅ อนุมัติเผยแพร่
                                            </a>
                                        <?php endif; ?>
                                        <a href="index.php?delete_id=<?php echo $row['id']; ?>" onclick="return confirm('ยืนยันความต้องการลบผลงานชิ้นนี้ออกจากคลังหรือไม่?')" class="bg-rose-50 hover:bg-rose-100 text-rose-600 font-extrabold text-[10px] px-3.5 py-1.5 rounded-lg transition-all cursor-pointer">
                                            🗑️ ลบ
                                        </a>
                                    <?php endif; ?>
                                </div>
                            </div>
                        </div>
                    <?php endwhile; ?>
                </div>
            <?php endif; ?>
        </section>
    </main>

    <!-- Footer ส่วนล่างสุดของเว็บไซต์โรงเรียน -->
    <footer class="bg-slate-900 text-slate-400 text-xs py-8 mt-12 border-t border-slate-800 text-center print:hidden">
        <p class="font-bold text-slate-200">ระบบประกันคุณภาพและคลังสะสมผลงานดิจิทัล โรงเรียนบ้านหนองหว้า</p>
        <p class="mt-2 text-[11px] text-slate-500">สำนักงานเขตพื้นที่การศึกษาประถมศึกษาประจวบคีรีขันธ์ เขต 1</p>
        <p class="mt-4 text-[10px] text-slate-600">© 2026 Ban Nong Wa School. All Rights Reserved. • ขับเคลื่อนด้วยระบบ PHP 8.0 & MySQL ฐานข้อมูลโรงเรียน</p>
    </footer>
</body>
</html>
