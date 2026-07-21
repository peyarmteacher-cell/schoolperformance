<?php
// index.php - หน้าหลักของระบบประกันคุณภาพและคลังสะสมผลงานดิจิทัล โรงเรียนบ้านหนองหว้า
require_once 'config.php';

// ดึงแท็บปัจจุบัน (ค่าเริ่มต้นคือ หน้าหลัก / แดชบอร์ด)
$active_tab = isset($_GET['tab']) ? $_GET['tab'] : 'dashboard';
if ($active_tab === 'reports') {
    $active_tab = 'dashboard';
}

// ดึงการตั้งค่าโรงเรียนและ Google Drive
$school_name = get_setting($conn, 'school_name', 'โรงเรียนบ้านหนองหว้า');
$school_logo = get_setting($conn, 'school_logo', '');
$google_drive_folder_id = get_setting($conn, 'google_drive_folder_id', '');
$google_apps_script_url = get_setting($conn, 'google_apps_script_url', '');
$header_title = get_setting($conn, 'header_title', 'ระบบคลังผลงานและหลักฐานเชิงประจักษ์');
$header_subtitle = get_setting($conn, 'header_subtitle', 'เพื่อการประกันคุณภาพและการประเมินสถานศึกษา');

// ดึงปีการศึกษาเพื่อทำตัวกรอง (บันทึกไว้ในอาร์เรย์เพื่อป้องกัน pointer หมดอายุจากการคิวรีหลายครั้ง)
$years_query = "SELECT DISTINCT academicYear FROM portfolios ORDER BY academicYear DESC";
$years_result = $conn->query($years_query);
$academic_years = [];
if ($years_result) {
    while ($y_row = $years_result->fetch_assoc()) {
        $academic_years[] = $y_row['academicYear'];
    }
}

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
                <li>ตรวจสอบว่าคุณได้ <strong>นำเข้าตารางข้อมูลจากไฟล์ <code>database.sql</code></strong> เรียบร้อยแล้วหรือยัง</li>
                <li>ตรวจสอบการกำหนดสิทธิ์ของบัญชีผู้ใช้งาน <code>" . htmlspecialchars(DB_USER) . "</code> ว่าถูกต้อง</li>
            </ul>
        </div>
    </div>
    ");
}

// การอนุมัติและการลบผลงาน และการตั้งค่าต่าง ๆ (เฉพาะ Admin)
if (isset($_SESSION['user_role']) && $_SESSION['user_role'] === 'admin') {
    if (isset($_GET['approve_id'])) {
        $approve_id = $conn->real_escape_string($_GET['approve_id']);
        $conn->query("UPDATE portfolios SET approved = 1 WHERE id = '$approve_id'");
        header("Location: index.php?tab=" . urlencode($active_tab) . "&msg=approved");
        exit;
    }
    if (isset($_GET['delete_id'])) {
        $delete_id = $conn->real_escape_string($_GET['delete_id']);
        $conn->query("DELETE FROM portfolios WHERE id = '$delete_id'");
        header("Location: index.php?tab=" . urlencode($active_tab) . "&msg=deleted");
        exit;
    }
    
    // บันทึกระบบ Google Drive
    if (isset($_POST['save_general_settings'])) {
        $google_drive_folder_id = $_POST['google_drive_folder_id'];
        $google_apps_script_url = $_POST['google_apps_script_url'];

        set_setting($conn, 'google_drive_folder_id', $google_drive_folder_id);
        set_setting($conn, 'google_apps_script_url', $google_apps_script_url);

        header("Location: index.php?tab=setup&subtab=general&msg=settings_updated");
        exit;
    }

    // บันทึกระบบอัตลักษณ์โรงเรียน (Branding) พร้อมอัปโหลดโลโก้โดยตรงเก็บใน MySQL
    if (isset($_POST['save_branding_settings'])) {
        $school_name = $_POST['school_name'];
        $school_logo = $_POST['school_logo']; // หากป้อนเป็น URL เดิม
        $header_title = isset($_POST['header_title']) ? $_POST['header_title'] : 'ระบบคลังผลงานและหลักฐานเชิงประจักษ์';
        $header_subtitle = isset($_POST['header_subtitle']) ? $_POST['header_subtitle'] : 'เพื่อการประกันคุณภาพและการประเมินสถานศึกษา';

        if (isset($_FILES['school_logo_file']) && $_FILES['school_logo_file']['error'] === UPLOAD_ERR_OK) {
            $uploaded_logo = save_uploaded_image('school_logo_file', 'school_logo');
            if (!empty($uploaded_logo)) {
                $school_logo = $uploaded_logo;
            }
        }

        set_setting($conn, 'school_name', $school_name);
        set_setting($conn, 'school_logo', $school_logo);
        set_setting($conn, 'header_title', $header_title);
        set_setting($conn, 'header_subtitle', $header_subtitle);

        header("Location: index.php?tab=setup&subtab=branding&msg=settings_updated");
        exit;
    }

    // เพิ่มรายชื่อคุณครูผู้ใช้ระบบ
    if (isset($_POST['add_user'])) {
        $new_username = $conn->real_escape_string($_POST['new_username']);
        $new_password = $conn->real_escape_string($_POST['new_password']);
        $new_name = $conn->real_escape_string($_POST['new_name']);
        $new_email = $conn->real_escape_string($_POST['new_email']);
        $new_role = $conn->real_escape_string($_POST['new_role']);
        
        $check = $conn->query("SELECT id FROM users WHERE username = '$new_username'");
        if ($check && $check->num_rows > 0) {
            header("Location: index.php?tab=setup&subtab=users&err=username_exists");
            exit;
        } else {
            $new_id = 'user-' . time();
            $conn->query("INSERT INTO users (id, username, password, name, email, role, avatarUrl) VALUES 
                ('$new_id', '$new_username', '$new_password', '$new_name', '$new_email', '$new_role', 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150')");
            header("Location: index.php?tab=setup&subtab=users&msg=user_added");
            exit;
        }
    }

    // ลบสิทธิ์ผู้ใช้ระบบ
    if (isset($_GET['delete_user_id'])) {
        $delete_user_id = $conn->real_escape_string($_GET['delete_user_id']);
        if ($delete_user_id === $_SESSION['user_id']) {
            header("Location: index.php?tab=setup&subtab=users&err=self_delete");
            exit;
        }
        $conn->query("DELETE FROM users WHERE id = '$delete_user_id'");
        header("Location: index.php?tab=setup&subtab=users&msg=user_deleted");
        exit;
    }
}

// กำหนดเงื่อนไขฟิลเตอร์ตามแท็บที่ถูกเลือก
if ($active_tab === 'list_school') {
    $category_filter = 'school';
} elseif ($active_tab === 'list_teacher') {
    $category_filter = 'teacher';
} elseif ($active_tab === 'list_student') {
    $category_filter = 'student';
} else {
    $category_filter = isset($_GET['category']) ? $_GET['category'] : '';
}

$year_filter = isset($_GET['year']) ? $_GET['year'] : '';
$search_query = isset($_GET['search']) ? $_GET['search'] : '';
$teacher_filter = isset($_GET['teacher_name']) ? $_GET['teacher_name'] : '';

// ดึงรายชื่อคุณครูทั้งหมดเพื่อใช้ในตัวกรองคุณครูผู้รับผิดชอบผลงาน
$all_teachers_res = $conn->query("SELECT id, name, avatarUrl FROM users WHERE role = 'teacher' ORDER BY name ASC");
$teachers_array = [];
$user_avatars = [];

// โหลดรูปโปรไฟล์ของทุกคนในระบบ (ครูและแอดมิน)
$all_users_res = $conn->query("SELECT name, avatarUrl FROM users");
if ($all_users_res) {
    while ($u_row = $all_users_res->fetch_assoc()) {
        $user_avatars[$u_row['name']] = $u_row['avatarUrl'];
    }
}

if ($all_teachers_res) {
    while ($t_row = $all_teachers_res->fetch_assoc()) {
        $teachers_array[] = $t_row;
    }
}

// สร้างเงื่อนไขในการดึงข้อมูลหลัก
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
if (!empty($teacher_filter)) {
    $where_clauses[] = "ownerName = '" . $conn->real_escape_string($teacher_filter) . "'";
}

// ผู้เยี่ยมชมทั่วไปเห็นเฉพาะข้อมูลที่อนุมัติแล้ว ส่วนครู/แอดมินเห็นทั้งหมดหรือของตนเองตามความสิทธิ์
if (!isset($_SESSION['user_role'])) {
    $where_clauses[] = "approved = 1";
} elseif ($_SESSION['user_role'] !== 'admin') {
    $user_name_esc = $conn->real_escape_string($_SESSION['user_name']);
    $where_clauses[] = "(approved = 1 OR ownerName = '$user_name_esc')";
}

$where_sql = "";
if (count($where_clauses) > 0) {
    $where_sql = "WHERE " . implode(" AND ", $where_clauses);
}

// 1. คิวรีหลักสำหรับหน้าแสดงผลงาน
$query = "SELECT * FROM portfolios $where_sql ORDER BY academicYear DESC, createdAt DESC";
$result = $conn->query($query);

// 2. ดึงสถิติตัวเลขแสดงในแดชบอร์ด
$res_school = $conn->query("SELECT COUNT(*) as total FROM portfolios WHERE category='school' AND approved=1");
$stat_school = ($res_school) ? $res_school->fetch_assoc()['total'] : 0;

$res_teacher = $conn->query("SELECT COUNT(*) as total FROM portfolios WHERE category='teacher' AND approved=1");
$stat_teacher = ($res_teacher) ? $res_teacher->fetch_assoc()['total'] : 0;

$res_student = $conn->query("SELECT COUNT(*) as total FROM portfolios WHERE category='student' AND approved=1");
$stat_student = ($res_student) ? $res_student->fetch_assoc()['total'] : 0;

$res_pending = $conn->query("SELECT COUNT(*) as total FROM portfolios WHERE approved=0");
$stat_pending = ($res_pending) ? $res_pending->fetch_assoc()['total'] : 0;

$stat_total_approved = $stat_school + $stat_teacher + $stat_student;

// 3. ดึงสถิติระดับรางวัลแยกตามระดับผลงาน (สำหรับ Dashboard และรายงาน SAR)
$levels_stats = [
    'โรงเรียน' => 0,
    'กลุ่มโรงเรียน' => 0,
    'เขตพื้นที่' => 0,
    'จังหวัด' => 0,
    'ภาค' => 0,
    'ประเทศ' => 0
];
$lvl_res = $conn->query("SELECT rewardLevel, COUNT(*) as cnt FROM portfolios WHERE approved=1 GROUP BY rewardLevel");
if ($lvl_res) {
    while ($l_row = $lvl_res->fetch_assoc()) {
        $lvl_name = $l_row['rewardLevel'];
        if (array_key_exists($lvl_name, $levels_stats)) {
            $levels_stats[$lvl_name] = (int)$l_row['cnt'];
        }
    }
}

// 4. ดึงข้อมูล 4 ผลงานล่าสุดที่อนุมัติแล้ว สำหรับหน้าแดชบอร์ดหลัก
$latest_res = $conn->query("SELECT * FROM portfolios WHERE approved=1 ORDER BY createdAt DESC LIMIT 4");
?>
<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ระบบคลังผลงานและหลักฐานเชิงประจักษ์ - <?php echo htmlspecialchars($school_name); ?></title>
    <!-- นำเข้า Tailwind CSS และฟอนต์ภาษาไทย -->
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700;800&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
        body { font-family: 'Sarabun', 'Inter', sans-serif; }
        .tab-active {
            background-color: #F59E0B !important;
            color: #030712 !important;
            font-weight: 700 !important;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
        }
        @media print {
            .print-hidden { display: none !important; }
            body { background: white !important; color: black !important; }
            .print-card { border: 1px solid #cbd5e1 !important; box-shadow: none !important; }
        }
    </style>
</head>
<body class="bg-slate-50/70 text-slate-800 min-h-screen flex flex-col antialiased">

    <!-- ส่วนหัวด้านบนสุด (Header & Banner) ที่เหมือนกับระบบใน AI Studio 100% -->
    <header class="bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-950 text-white shadow-xl sticky top-0 z-50 print-hidden">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div class="flex flex-col md:flex-row items-center justify-between gap-4">
                
                <!-- โลโก้และข้อมูลโรงเรียน -->
                <div class="flex items-center gap-4 text-center md:text-left">
                    <div class="relative w-16 h-16 bg-white rounded-full p-1.5 shadow-md flex-shrink-0 flex items-center justify-center overflow-hidden">
                        <?php if (!empty($school_logo)): ?>
                            <img src="<?php echo htmlspecialchars($school_logo); ?>" alt="School Logo" class="w-full h-full object-contain">
                        <?php else: ?>
                            <!-- แสดงตราโรงเรียนสีทองอันหรูหราที่ใช้บน AI Studio -->
                            <svg viewBox="0 0 100 100" class="w-full h-full text-blue-900">
                                <circle cx="50" cy="50" r="46" fill="none" stroke="#F59E0B" stroke-width="4" />
                                <circle cx="50" cy="50" r="41" fill="#1E3A8A" />
                                <path d="M25 65 L50 78 L75 65 L75 35 L50 48 L25 35 Z" fill="#F59E0B" opacity="0.9" />
                                <path d="M50 20 C45 30 55 35 50 45 C48 35 46 30 50 20 Z" fill="#EF4444" />
                                <path d="M50 25 C48 30 52 32 50 38 C49 32 48 30 50 25 Z" fill="#F59E0B" />
                                <polygon points="50,11 53,16 58,16 54,19 56,24 50,21 44,24 46,19 42,16 47,16" fill="#F59E0B" />
                            </svg>
                        <?php endif; ?>
                    </div>

                    <div>
                        <h1 class="text-xl md:text-2xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-amber-200 to-white">
                            <?php echo htmlspecialchars($header_title); ?>
                        </h1>
                        <div class="flex items-center gap-2 mt-0.5 justify-center md:justify-start">
                            <span class="text-xs font-semibold bg-amber-500 text-blue-950 px-2 py-0.5 rounded-full uppercase tracking-wider">
                                <?php echo htmlspecialchars($school_name); ?>
                            </span>
                            <span class="text-xs text-blue-200 hidden sm:inline">
                                | <?php echo htmlspecialchars($header_subtitle); ?>
                            </span>
                        </div>
                    </div>
                </div>

                <!-- การล็อกอินและสถานะการเชื่อมต่อฐานข้อมูล -->
                <div class="flex flex-wrap items-center justify-center gap-3">
                    <div class="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                        <span class="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                        <span>MySQL Server Active</span>
                    </div>

                    <?php if (isset($_SESSION['user_id'])): ?>
                        <div class="flex items-center bg-blue-950/60 border border-blue-700/50 rounded-xl p-1.5 pl-3 gap-3 shadow-inner">
                            <div class="text-right">
                                <p class="text-xs font-semibold text-white truncate max-w-[130px]"><?php echo htmlspecialchars($_SESSION['user_name']); ?></p>
                                <span class="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-bold <?php echo ($_SESSION['user_role'] === 'admin') ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'; ?>">
                                    <?php echo ($_SESSION['user_role'] === 'admin') ? 'ผู้ดูแลระบบ (Admin)' : 'คุณครูผู้สอน'; ?>
                                </span>
                            </div>
                            <a href="logout.php" class="p-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/30 text-rose-300 hover:text-white transition-colors flex items-center justify-center cursor-pointer" title="ออกจากระบบ">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" class="w-3.5 h-3.5">
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                </svg>
                            </a>
                        </div>
                    <?php else: ?>
                        <a href="login.php" class="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-blue-950 font-bold text-xs shadow-md transition-all cursor-pointer hover:scale-[1.03] active:scale-[0.98]">
                            🔒 เข้าสู่ระบบครู / แอดมิน
                        </a>
                    <?php endif; ?>
                </div>
            </div>
        </div>

        <!-- แถบเมนูนำทาง Navigation Bar เมนูหลัก / ผลงานต่างๆ / รายงาน / ตั้งค่า เหมือนใน AI Studio -->
        <div class="bg-blue-950/40 border-t border-blue-800/40 backdrop-blur-sm">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="flex items-center justify-between h-12">
                    
                    <!-- เมนูสำหรับหน้าจอเดสก์ท็อป -->
                    <nav class="hidden md:flex space-x-1">
                        <a href="index.php?tab=dashboard" class="px-4 py-2 rounded-lg text-sm font-medium text-blue-100 hover:text-white hover:bg-blue-800/60 transition-all duration-200 <?php if($active_tab === 'dashboard') echo 'tab-active'; ?>">🏠 หน้าหลัก</a>
                        <a href="index.php?tab=list_school" class="px-4 py-2 rounded-lg text-sm font-medium text-blue-100 hover:text-white hover:bg-blue-800/60 transition-all duration-200 <?php if($active_tab === 'list_school') echo 'tab-active'; ?>">🏫 ผลงานโรงเรียน</a>
                        <a href="index.php?tab=list_teacher" class="px-4 py-2 rounded-lg text-sm font-medium text-blue-100 hover:text-white hover:bg-blue-800/60 transition-all duration-200 <?php if($active_tab === 'list_teacher') echo 'tab-active'; ?>">👩‍🏫 ผลงานคุณครู</a>
                        <a href="index.php?tab=list_student" class="px-4 py-2 rounded-lg text-sm font-medium text-blue-100 hover:text-white hover:bg-blue-800/60 transition-all duration-200 <?php if($active_tab === 'list_student') echo 'tab-active'; ?>">🎓 ผลงานนักเรียน</a>
                        <a href="index.php?tab=list" class="px-4 py-2 rounded-lg text-sm font-medium text-blue-100 hover:text-white hover:bg-blue-800/60 transition-all duration-200 <?php if($active_tab === 'list') echo 'tab-active'; ?>">📁 คลังหลักฐานทั้งหมด</a>
                        
                        <?php if (isset($_SESSION['user_role']) && $_SESSION['user_role'] === 'admin'): ?>
                            <a href="index.php?tab=setup" class="px-4 py-2 rounded-lg text-sm font-medium text-blue-100 hover:text-white hover:bg-blue-800/60 transition-all duration-200 <?php if($active_tab === 'setup') echo 'tab-active'; ?>">⚙️ ตั้งค่า & โค้ด Apps Script</a>
                        <?php endif; ?>
                    </nav>

                    <!-- ปุ่มควบคุมในหน้าจอมือถือ -->
                    <div class="flex md:hidden w-full justify-between items-center py-2">
                        <span class="text-xs font-semibold text-blue-200">เมนูระบบประกันคุณภาพ:</span>
                        <button onclick="document.getElementById('mobile-menu').classList.toggle('hidden')" class="p-2 rounded-lg bg-blue-900 text-blue-200 hover:text-white hover:bg-blue-800 transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" class="w-5 h-5">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                        </button>
                    </div>

                </div>
            </div>
        </div>

        <!-- รายการเมนูดึงลงสำหรับหน้าจอมือถือ -->
        <div id="mobile-menu" class="hidden md:hidden bg-blue-950 border-t border-blue-800 px-4 py-2 space-y-1 shadow-inner print-hidden">
            <a href="index.php?tab=dashboard" class="block px-4 py-3 rounded-lg text-sm font-medium text-blue-100 hover:bg-blue-900/60 <?php if($active_tab === 'dashboard') echo 'bg-amber-500 text-blue-950 font-semibold'; ?>">🏠 หน้าหลัก</a>
            <a href="index.php?tab=list_school" class="block px-4 py-3 rounded-lg text-sm font-medium text-blue-100 hover:bg-blue-900/60 <?php if($active_tab === 'list_school') echo 'bg-amber-500 text-blue-950 font-semibold'; ?>">🏫 ผลงานโรงเรียน</a>
            <a href="index.php?tab=list_teacher" class="block px-4 py-3 rounded-lg text-sm font-medium text-blue-100 hover:bg-blue-900/60 <?php if($active_tab === 'list_teacher') echo 'bg-amber-500 text-blue-950 font-semibold'; ?>">👩‍🏫 ผลงานคุณครู</a>
            <a href="index.php?tab=list_student" class="block px-4 py-3 rounded-lg text-sm font-medium text-blue-100 hover:bg-blue-900/60 <?php if($active_tab === 'list_student') echo 'bg-amber-500 text-blue-950 font-semibold'; ?>">🎓 ผลงานนักเรียน</a>
            <a href="index.php?tab=list" class="block px-4 py-3 rounded-lg text-sm font-medium text-blue-100 hover:bg-blue-900/60 <?php if($active_tab === 'list') echo 'bg-amber-500 text-blue-950 font-semibold'; ?>">📁 คลังหลักฐานทั้งหมด</a>
            <?php if (isset($_SESSION['user_role']) && $_SESSION['user_role'] === 'admin'): ?>
                <a href="index.php?tab=setup" class="block px-4 py-3 rounded-lg text-sm font-medium text-blue-100 hover:bg-blue-900/60 <?php if($active_tab === 'setup') echo 'bg-amber-500 text-blue-950 font-semibold'; ?>">⚙️ ตั้งค่า & โค้ด Apps Script</a>
            <?php endif; ?>
        </div>
    </header>

    <!-- เนื้อหาการทำงานหลัก (Main Content Section) -->
    <main class="max-w-7xl mx-auto px-4 py-8 flex-1 w-full space-y-8">
        
        <!-- แถบแสดงข้อความแจ้งเตือน (Notifications) -->
        <?php if(isset($_GET['msg'])): ?>
            <div class="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-2xl flex items-center gap-2 shadow-sm print-hidden text-left">
                <span class="text-base">✅</span>
                <span class="font-bold">
                    <?php 
                        if ($_GET['msg'] === 'settings_updated') {
                            echo 'บันทึกการตั้งค่าระบบเรียบร้อยแล้ว!';
                        } elseif ($_GET['msg'] === 'approved') {
                            echo 'อนุมัติเผยแพร่ผลงานที่เลือกเรียบร้อยแล้ว!';
                        } elseif ($_GET['msg'] === 'deleted') {
                            echo 'ลบข้อมูลผลงานออกจากระบบเรียบร้อยแล้ว!';
                        } elseif ($_GET['msg'] === 'user_added') {
                            echo 'ลงทะเบียนผู้ใช้งาน/บัญชีคุณครูเรียบร้อยแล้ว!';
                        } elseif ($_GET['msg'] === 'user_deleted') {
                            echo 'ลบข้อมูลผู้ใช้งานออกจากระบบเรียบร้อยแล้ว!';
                        } else {
                            echo 'ทำรายการสำเร็จเรียบร้อยแล้ว!';
                        }
                    ?>
                </span>
            </div>
        <?php endif; ?>

        <?php if(isset($_GET['err'])): ?>
            <div class="p-4 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-2xl flex items-center gap-2 shadow-sm print-hidden text-left">
                <span class="text-base">⚠️</span>
                <span class="font-bold">
                    <?php 
                        if ($_GET['err'] === 'username_exists') {
                            echo 'ชื่อผู้ใช้งานนี้มีอยู่ในระบบแล้ว กรุณาใช้ชื่ออื่น!';
                        } elseif ($_GET['err'] === 'self_delete') {
                            echo 'คุณไม่สามารถลบบัญชีของตนเองที่กำลังใช้งานอยู่ได้!';
                        } else {
                            echo 'เกิดข้อผิดพลาดในการทำรายการ!';
                        }
                    ?>
                </span>
            </div>
        <?php endif; ?>

        <!-- ==============================================
             CASE 1: หน้าหลัก / แดชบอร์ดหลัก (DASHBOARD TAB)
             ============================================== -->
        <?php if ($active_tab === 'dashboard'): ?>
            
            <!-- ยินดีต้อนรับแบนเนอร์ -->
            <section class="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 p-8 rounded-3xl text-white text-left relative overflow-hidden shadow-xl border border-blue-800">
                <div class="relative z-10 space-y-3">
                    <div class="inline-flex items-center gap-1 bg-amber-400 text-blue-950 px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-widest">
                        ✨ ประกันคุณภาพการศึกษายุคใหม่
                    </div>
                    <h2 class="text-xl md:text-3xl font-black">ยินดีต้อนรับเข้าสู่ระบบคลังผลงานดิจิทัล โรงเรียนบ้านหนองหว้า</h2>
                    <p class="text-xs md:text-sm text-blue-100 max-w-2xl leading-relaxed">
                        ระบบจัดเก็บและรวบรวมหลักฐานเชิงประจักษ์แบบเรียลไทม์ เพื่อรองรับการประเมินตนเอง (SAR), ข้อตกลงในการพัฒนางาน (PA) และการตรวจประกันคุณภาพสถานศึกษาด้วยการใช้เทคโนโลยีฐานข้อมูลขั้นสูงอย่างเต็มรูปแบบ
                    </p>
                    <div class="flex gap-3 pt-2">
                        <a href="index.php?tab=list" class="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-blue-950 text-xs font-bold rounded-xl shadow-lg transition-all">
                            📁 สำรวจผลงานทั้งหมด
                        </a>
                        <?php if (isset($_SESSION['user_id'])): ?>
                            <a href="add_portfolio.php" class="px-5 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl border border-white/20 transition-all">
                                ➕ บันทึกผลงานใหม่
                            </a>
                        <?php endif; ?>
                    </div>
                </div>
                <div class="absolute right-0 bottom-0 top-0 w-1/3 opacity-15 hidden md:block select-none pointer-events-none">
                    <svg viewBox="0 0 100 100" class="w-full h-full text-white">
                        <polygon points="50,15 65,35 90,35 70,55 80,85 50,70 20,85 30,55 10,35 35,35" fill="currentColor" />
                    </svg>
                </div>
            </section>

            <!-- แผงสถิติรวม (Dashboard Panels) -->
            <section class="grid grid-cols-2 lg:grid-cols-4 gap-5">
                <a href="index.php?tab=list_school" class="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 flex items-center justify-between transition-all hover:shadow-md hover:scale-[1.01]">
                    <div>
                        <span class="text-xs text-gray-400 font-extrabold block">🏫 ผลงานโรงเรียน</span>
                        <strong class="text-3xl font-black text-blue-900 mt-1 block"><?php echo $stat_school; ?></strong>
                        <span class="text-[10px] text-blue-600 font-bold mt-1 inline-block">ดูคลังสื่อโรงเรียน →</span>
                    </div>
                    <div class="w-12 h-12 rounded-2xl bg-blue-50 text-blue-950 flex items-center justify-center text-xl shadow-sm font-bold">🏫</div>
                </a>
                
                <a href="index.php?tab=list_teacher" class="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 flex items-center justify-between transition-all hover:shadow-md hover:scale-[1.01]">
                    <div>
                        <span class="text-xs text-gray-400 font-extrabold block">👩‍🏫 ผลงานคุณครู</span>
                        <strong class="text-3xl font-black text-amber-600 mt-1 block"><?php echo $stat_teacher; ?></strong>
                        <span class="text-[10px] text-amber-600 font-bold mt-1 inline-block">ดูคลังสื่อคุณครู →</span>
                    </div>
                    <div class="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center text-xl shadow-sm font-bold">👩‍🏫</div>
                </a>

                <a href="index.php?tab=list_student" class="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 flex items-center justify-between transition-all hover:shadow-md hover:scale-[1.01]">
                    <div>
                        <span class="text-xs text-gray-400 font-extrabold block">🎓 ผลงานนักเรียน</span>
                        <strong class="text-3xl font-black text-emerald-600 mt-1 block"><?php echo $stat_student; ?></strong>
                        <span class="text-[10px] text-emerald-600 font-bold mt-1 inline-block">ดูคลังสื่อนักเรียน →</span>
                    </div>
                    <div class="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-xl shadow-sm font-bold">🎓</div>
                </a>

                <div class="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 flex items-center justify-between transition-all">
                    <div>
                        <span class="text-xs text-gray-400 font-extrabold block">⏳ รายการรออนุมัติ</span>
                        <strong class="text-3xl font-black text-rose-600 mt-1 block"><?php echo $stat_pending; ?></strong>
                        <span class="text-[10px] text-slate-400 mt-1 inline-block">สิทธิ์แอดมินในการประเมิน</span>
                    </div>
                    <div class="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center text-xl shadow-sm font-bold">⏳</div>
                </div>
            </section>

            <!-- แผนภูมิแบบแท่งและสถิติแยกตามระดับรางวัลด้านล่างบอร์ด -->
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                <!-- ระดับความรางวัลที่โรงเรียนและคุณครูได้รับ -->
                <div class="lg:col-span-2 bg-white p-6 rounded-3xl shadow-sm border border-slate-100 text-left space-y-4">
                    <div>
                        <h3 class="font-black text-sm text-slate-800">📊 แผนภูมิระดับรางวัลแยกตามระดับผลงานเชิงประจักษ์</h3>
                        <p class="text-[10px] text-slate-400">สถิติสะสมจากรายการที่เผยแพร่สำเร็จในฐานข้อมูล (จำนวน <?php echo $stat_total_approved; ?> รายการ)</p>
                    </div>
                    
                    <div class="space-y-3 pt-2 text-xs">
                        <?php 
                        foreach ($levels_stats as $level => $cnt): 
                            $percentage = $stat_total_approved > 0 ? ($cnt / $stat_total_approved) * 100 : 0;
                            // สีแถบตามระดับ
                            $bar_color = 'bg-blue-600';
                            if ($level === 'ประเทศ') $bar_color = 'bg-amber-500';
                            elseif ($level === 'ภาค') $bar_color = 'bg-purple-600';
                            elseif ($level === 'จังหวัด') $bar_color = 'bg-rose-500';
                            elseif ($level === 'เขตพื้นที่') $bar_color = 'bg-emerald-600';
                        ?>
                            <div class="space-y-1">
                                <div class="flex justify-between font-bold text-slate-700">
                                    <span>🏅 ระดับ<?php echo $level; ?></span>
                                    <span><?php echo $cnt; ?> รายการ (<?php echo round($percentage, 1); ?>%)</span>
                                </div>
                                <div class="w-full bg-slate-100 rounded-full h-3.5 overflow-hidden">
                                    <div class="<?php echo $bar_color; ?> h-full rounded-full transition-all duration-1000" style="width: <?php echo max($percentage, 1.5); ?>%"></div>
                                </div>
                            </div>
                        <?php endforeach; ?>
                    </div>
                </div>

                <!-- การนำทางด่วนและแนะนำการบันทึกผลงาน -->
                <div class="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 text-left flex flex-col justify-between">
                    <div class="space-y-4">
                        <div class="pb-2 border-b">
                            <h3 class="font-black text-sm text-slate-800">💡 การประเมินคุณภาพและ SAR คืออะไร?</h3>
                            <p class="text-[10px] text-slate-400">แนวปฏิบัติในการเขียนรายงานประเมินตนเอง</p>
                        </div>
                        <div class="text-xs text-slate-600 space-y-3.5">
                            <p class="leading-relaxed">
                                <strong>SAR (Self-Assessment Report)</strong> เป็นเอกสารสะท้อนคุณภาพที่รวมรวมสถิติ ตัวบ่งชี้ และผลงานเชิงประจักษ์ของครูและโรงเรียนในรอบปีการศึกษา เพื่อรายงานต่อต้นสังกัดและผู้เกี่ยวข้อง
                            </p>
                            <p class="leading-relaxed">
                                ระบบคลังนี้ช่วยให้ครูและแอดมินค้นหา สรุปสถิติผลงาน และดึงลิงก์หลักฐานแนบไปใช้เขียน SAR ได้โดยตรง สะดวก ไม่สูญหาย และอ้างอิงได้อย่างถูกต้อง
                            </p>
                        </div>
                    </div>
                    
                    <div class="pt-4 border-t mt-4">
                        <a href="index.php?tab=reports" class="w-full inline-flex items-center justify-center gap-1 py-2.5 bg-blue-900 hover:bg-blue-800 text-white font-extrabold text-xs rounded-xl shadow transition-all">
                            📈 เข้าสู่ออกรายงานแบบรายงาน SAR
                        </a>
                    </div>
                </div>

            </div>

            <!-- Feed ข้อมูลล่าสุด 4 รายการที่เพิ่งอนุมัติใหม่ล่าสุด -->
            <section class="space-y-4 text-left">
                <div class="flex justify-between items-center px-1">
                    <div>
                        <h3 class="text-sm font-extrabold text-slate-800 uppercase tracking-wider">🆕 ผลงานที่เผยแพร่ล่าสุดในระบบ</h3>
                        <p class="text-[10px] text-gray-400">รายการคัดสรรผ่านการประกันและรับรองมาตรฐานอย่างเป็นทางการ</p>
                    </div>
                    <a href="index.php?tab=list" class="text-xs font-bold text-blue-900 hover:underline">ดูคลังทั้งหมด →</a>
                </div>

                <?php if ($latest_res && $latest_res->num_rows > 0): ?>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <?php while($row = $latest_res->fetch_assoc()): ?>
                            <div class="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between hover:shadow-md transition-all">
                                <div class="space-y-3 text-left">
                                    <div class="flex justify-between items-start gap-2">
                                        <span class="text-[9px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider <?php 
                                            if($row['category'] == 'school') echo 'bg-blue-50 text-blue-900';
                                            elseif($row['category'] == 'teacher') echo 'bg-amber-50 text-amber-700';
                                            else echo 'bg-emerald-50 text-emerald-700';
                                        ?>">
                                            <?php 
                                                if($row['category'] == 'school') echo '🏫 ผลงานโรงเรียน';
                                                elseif($row['category'] == 'teacher') echo '👩‍🏫 ผลงานคุณครู';
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
                                            <span class="text-blue-950 font-bold"><?php echo htmlspecialchars($row['type']); ?> (<?php echo htmlspecialchars($row['rewardLevel']); ?>)</span>
                                        </p>
                                        
                                        <!-- ส่วนแสดงโปรไฟล์ผู้รับรางวัล/เจ้าของผลงานเชิงประจักษ์แบบหรูหรา -->
                                        <div class="flex items-center gap-2 bg-white p-2 rounded-xl border border-slate-100 my-1 shadow-xs">
                                            <?php
                                                $owner_avatar = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150'; // Default
                                                if (!empty($row['owner_img'])) {
                                                    $owner_avatar = $row['owner_img'];
                                                }
                                            ?>
                                            <img src="<?php echo htmlspecialchars($owner_avatar); ?>" class="w-7 h-7 rounded-full object-cover border border-slate-200 shadow-xs flex-shrink-0" alt="Owner Profile">
                                            <div class="text-left leading-tight">
                                                <span class="text-[8px] text-gray-400 font-bold block">ผู้รับรางวัล / เจ้าของ</span>
                                                <strong class="text-gray-800 text-[10px] font-extrabold block"><?php echo htmlspecialchars($row['ownerName']); ?></strong>
                                            </div>
                                        </div>
                                    </div>

                                    <!-- รูปประกอบผลงานเชิงประจักษ์ (เกียรติบัตร & รูปรับรางวัล) ที่อัปโหลดตรง -->
                                    <?php if (!empty($row['certificate_img']) || !empty($row['award_img'])): ?>
                                        <div class="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-slate-100">
                                            <?php if (!empty($row['certificate_img'])): ?>
                                                <div class="space-y-1">
                                                    <span class="text-[9px] font-extrabold text-slate-400 block">📜 ภาพหลักฐานเกียรติบัตร:</span>
                                                    <a href="<?php echo htmlspecialchars($row['certificate_img']); ?>" target="_blank" class="block rounded-xl overflow-hidden border border-slate-200 shadow-xs hover:border-blue-500 transition-all bg-slate-50 relative group">
                                                        <img src="<?php echo htmlspecialchars($row['certificate_img']); ?>" class="w-full h-20 object-cover group-hover:scale-105 transition-transform duration-300" alt="เกียรติบัตร">
                                                        <div class="absolute inset-0 bg-black/0 group-hover:bg-black/10 flex items-center justify-center transition-all">
                                                            <span class="text-white text-[9px] bg-black/50 px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity">🔍 ดูภาพ</span>
                                                        </div>
                                                    </a>
                                                </div>
                                            <?php endif; ?>
                                            <?php if (!empty($row['award_img'])): ?>
                                                <div class="space-y-1">
                                                    <span class="text-[9px] font-extrabold text-slate-400 block">🏆 ภาพกิจกรรม / รับรางวัล:</span>
                                                    <a href="<?php echo htmlspecialchars($row['award_img']); ?>" target="_blank" class="block rounded-xl overflow-hidden border border-slate-200 shadow-xs hover:border-blue-500 transition-all bg-slate-50 relative group">
                                                        <img src="<?php echo htmlspecialchars($row['award_img']); ?>" class="w-full h-20 object-cover group-hover:scale-105 transition-transform duration-300" alt="ภาพรับรางวัล">
                                                        <div class="absolute inset-0 bg-black/0 group-hover:bg-black/10 flex items-center justify-center transition-all">
                                                            <span class="text-white text-[9px] bg-black/50 px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity">🔍 ดูภาพ</span>
                                                        </div>
                                                    </a>
                                                </div>
                                            <?php endif; ?>
                                        </div>
                                    <?php endif; ?>
                                </div>

                                <div class="mt-4 pt-3 border-t border-gray-100 flex justify-between items-center">
                                    <span class="text-[9px] font-semibold text-gray-400">วันที่ได้รับรางวัล: <?php echo htmlspecialchars($row['awardDate']); ?></span>
                                    
                                    <div class="flex items-center gap-1.5">
                                        <?php if (!empty($row['attachmentUrl'])): ?>
                                            <a href="<?php echo htmlspecialchars($row['attachmentUrl']); ?>" target="_blank" class="px-3 py-1 bg-blue-50 text-blue-900 text-[10px] font-extrabold rounded-lg hover:bg-blue-100 transition-all">
                                                🔗 เปิดลิงก์หลักฐาน
                                            </a>
                                        <?php endif; ?>
                                    </div>
                                </div>
                            </div>
                        <?php endwhile; ?>
                    </div>
                <?php else: ?>
                    <div class="bg-white p-8 text-center rounded-2xl border border-slate-100 text-xs text-slate-400">ไม่พบรายการผลงานเผยแพร่ล่าสุดขณะนี้</div>
                <?php endif; ?>
            </section>

        <!-- ==============================================
             CASE 2: รายการคลังผลงานแยกแต่ละหมวดหมู่ (PORTFOLIOS LIST TAB)
             ============================================== -->
        <?php elseif (in_array($active_tab, ['list_school', 'list_teacher', 'list_student', 'list'])): ?>
            
            <!-- แผงตัวกรองและค้นหาผลงาน -->
            <section class="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 print-hidden">
                <form method="GET" class="flex flex-col md:flex-row gap-4 items-end text-xs">
                    <!-- ล็อคพารามิเตอร์ tab ไว้เพื่อให้เปลี่ยนหน้าแล้วผลลัพธ์ยังกรองได้ -->
                    <input type="hidden" name="tab" value="<?php echo htmlspecialchars($active_tab); ?>">

                    <div class="flex-1 w-full text-left">
                        <label class="text-xs font-bold text-gray-600 block mb-1.5">🔍 ค้นหาคลังผลงาน</label>
                        <input type="text" name="search" value="<?php echo htmlspecialchars($search_query); ?>" placeholder="พิมพ์คำสำคัญ เช่น ชื่อรางวัล, ผู้จัดทำ, หน่วยงาน, หรือระดับชั้น..." class="w-full text-xs px-4 py-3 rounded-xl border border-gray-200 outline-none focus:border-blue-500 transition-all bg-slate-50/50">
                    </div>
                    
                    <?php if ($active_tab === 'list'): ?>
                        <div class="w-full md:w-52 text-left">
                            <label class="text-xs font-bold text-gray-600 block mb-1.5">📂 หมวดหมู่ผลงาน</label>
                            <select name="category" class="w-full text-xs px-4 py-3 rounded-xl border border-gray-200 outline-none focus:border-blue-500 bg-white">
                                <option value="">หมวดหมู่ทั้งหมด</option>
                                <option value="school" <?php if($category_filter == 'school') echo 'selected'; ?>>🏫 ผลงานโรงเรียน</option>
                                <option value="teacher" <?php if($category_filter == 'teacher') echo 'selected'; ?>>👩‍🏫 ผลงานคุณครู</option>
                                <option value="student" <?php if($category_filter == 'student') echo 'selected'; ?>>🎓 ผลงานนักเรียน</option>
                            </select>
                        </div>
                    <?php endif; ?>

                    <?php if ($active_tab === 'list_teacher' || $active_tab === 'list'): ?>
                        <div class="w-full md:w-52 text-left">
                            <label class="text-xs font-bold text-gray-600 block mb-1.5">👩‍🏫 เลือกคุณครูผู้จัดทำ</label>
                            <select name="teacher_name" class="w-full text-xs px-4 py-3 rounded-xl border border-gray-200 outline-none focus:border-blue-500 bg-white">
                                <option value="">คุณครูทั้งหมด</option>
                                <?php foreach($teachers_array as $teacher): ?>
                                    <option value="<?php echo htmlspecialchars($teacher['name']); ?>" <?php if($teacher_filter === $teacher['name']) echo 'selected'; ?>>
                                        <?php echo htmlspecialchars($teacher['name']); ?>
                                    </option>
                                <?php endforeach; ?>
                            </select>
                        </div>
                    <?php endif; ?>

                    <div class="w-full md:w-44 text-left">
                        <label class="text-xs font-bold text-gray-600 block mb-1.5">📅 ปีการศึกษา</label>
                        <select name="year" class="w-full text-xs px-4 py-3 rounded-xl border border-gray-200 outline-none focus:border-blue-500 bg-white">
                            <option value="">ปีการศึกษาทั้งหมด</option>
                            <?php foreach($academic_years as $yr): ?>
                                <option value="<?php echo $yr; ?>" <?php if($year_filter == $yr) echo 'selected'; ?>>
                                    ปีการศึกษา <?php echo $yr; ?>
                                </option>
                            <?php endforeach; ?>
                        </select>
                    </div>

                    <div class="flex gap-2 w-full md:w-auto">
                        <button type="submit" class="flex-1 md:flex-none px-6 py-3 bg-blue-900 hover:bg-blue-800 text-white font-extrabold text-xs rounded-xl shadow cursor-pointer transition-all">
                            ค้นหาด่วน
                        </button>
                        <a href="index.php?tab=<?php echo $active_tab; ?>" class="px-5 py-3 bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-bold rounded-xl text-center transition-all">
                            ล้างค่า
                        </a>
                    </div>
                </form>
            </section>

            <!-- รายการแสดงผลงานหลัก -->
            <section class="space-y-4">
                <div class="flex justify-between items-center px-1">
                    <div class="text-left">
                        <h2 class="text-sm font-extrabold text-gray-800 uppercase tracking-wider">
                            <?php 
                                if($active_tab == 'list_school') echo '🏫 คลังผลงานโรงเรียน';
                                elseif($active_tab == 'list_teacher') echo '👩‍🏫 คลังผลงานคุณครู';
                                elseif($active_tab == 'list_student') echo '🎓 คลังผลงานนักเรียน';
                                else echo '📁 คลังหลักฐานและผลงานเชิงประจักษ์ทั้งหมด';
                            ?>
                        </h2>
                        <p class="text-[10px] text-gray-400">พบผลงานทั้งหมด <?php echo $result->num_rows; ?> รายการในเงื่อนไขการค้นหา</p>
                    </div>
                    <?php if (isset($_SESSION['user_id'])): ?>
                        <a href="add_portfolio.php" class="px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white text-xs font-bold rounded-xl shadow-lg flex items-center gap-1.5 transition-all">
                            <span>➕ บันทึกผลงานใหม่</span>
                        </a>
                    <?php endif; ?>
                </div>

                <?php if ($result->num_rows == 0): ?>
                    <div class="bg-white p-16 text-center rounded-3xl border border-slate-100 shadow-sm space-y-2">
                        <span class="text-5xl block">📂</span>
                        <p class="text-sm font-bold text-gray-500">ไม่พบข้อมูลผลงานในหมวดหมู่นี้ขณะนี้</p>
                        <p class="text-xs text-gray-400">กรุณาลงชื่อเข้าใช้งานผู้สอนเพื่อเริ่มบันทึกผลงานเชิงประจักษ์ชิ้นใหม่ลงฐานข้อมูล</p>
                    </div>
                <?php else: ?>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <?php while($row = $result->fetch_assoc()): ?>
                            <div class="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between hover:shadow-md transition-all text-left relative <?php if(!$row['approved']) echo 'border-amber-300 bg-amber-50/10'; ?>">
                                <?php
                                    $attachments = [];
                                    if (!empty($row['attachments'])) {
                                        $attachments = json_decode($row['attachments'], true);
                                    }
                                    $cover_image = '';
                                    if (is_array($attachments)) {
                                        foreach ($attachments as $att) {
                                            $name_lower = isset($att['name']) ? strtolower($att['name']) : '';
                                            $type_lower = isset($att['type']) ? strtolower($att['type']) : '';
                                            $url = isset($att['url']) ? $att['url'] : '';
                                            if (str_starts_with($type_lower, 'image/') || 
                                                str_ends_with($name_lower, '.jpg') || 
                                                str_ends_with($name_lower, '.jpeg') || 
                                                str_ends_with($name_lower, '.png') ||
                                                str_ends_with($name_lower, '.gif') ||
                                                str_ends_with($name_lower, '.webp') ||
                                                str_contains(strtolower($url), '.jpg') ||
                                                str_contains(strtolower($url), '.jpeg') ||
                                                str_contains(strtolower($url), '.png')) {
                                                
                                                // Convert google drive url if applicable
                                                if (str_contains($url, 'drive.google.com') && (str_contains($url, '/file/d/') || str_contains($url, 'id='))) {
                                                    $file_id = '';
                                                    if (preg_match('/\/file\/d\/([a-zA-Z0-9-_]+)/', $url, $matches)) {
                                                        $file_id = $matches[1];
                                                    } elseif (preg_match('/id=([a-zA-Z0-9-_]+)/', $url, $matches)) {
                                                        $file_id = $matches[1];
                                                    }
                                                    if (!empty($file_id)) {
                                                        $url = "https://drive.google.com/uc?export=view&id=" . $file_id;
                                                    }
                                                }
                                                $cover_image = $url;
                                                break;
                                            }
                                        }
                                    }
                                    if (empty($cover_image)) {
                                        if (!empty($row['certificate_img'])) {
                                            $cover_image = $row['certificate_img'];
                                        } elseif (!empty($row['award_img'])) {
                                            $cover_image = $row['award_img'];
                                        } else {
                                            if ($row['category'] === 'school') {
                                                $cover_image = 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&q=80&w=600';
                                            } else if ($row['category'] === 'teacher') {
                                                $cover_image = 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&q=80&w=600';
                                            } else {
                                                $cover_image = 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&q=80&w=600';
                                            }
                                        }
                                    }
                                ?>
                                
                                <!-- Cover Image & Category Label -->
                                <div class="relative h-48 overflow-hidden rounded-t-2xl bg-slate-100 -mx-6 -mt-6 mb-4">
                                    <img 
                                      src="<?php echo htmlspecialchars($cover_image); ?>" 
                                      alt="<?php echo htmlspecialchars($row['title']); ?>" 
                                      class="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                                      referrerpolicy="no-referrer"
                                    />
                                    <div class="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent"></div>
                                    
                                    <!-- Category & Year pill bottom bar -->
                                    <div class="absolute bottom-3 left-3 right-3 flex justify-between items-center">
                                        <span class="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-md border <?php 
                                            if($row['category'] == 'school') echo 'bg-blue-100 text-blue-900 border-blue-200';
                                            elseif($row['category'] == 'teacher') echo 'bg-amber-100 text-amber-900 border-amber-200';
                                            else echo 'bg-emerald-100 text-emerald-900 border-emerald-200';
                                        ?>">
                                            <?php 
                                                if($row['category'] == 'school') echo 'ผลงานโรงเรียน';
                                                elseif($row['category'] == 'teacher') echo 'ผลงานคุณครู';
                                                else echo 'ผลงานนักเรียน';
                                            ?>
                                        </span>
                                        <span class="text-[10px] font-semibold text-white bg-black/40 backdrop-blur-xs px-2.5 py-0.5 rounded-md">
                                            ปีการศึกษา <?php echo htmlspecialchars($row['academicYear']); ?>
                                        </span>
                                    </div>
                                </div>

                                <div class="space-y-3 text-left">
                                    <div class="flex justify-between items-center">
                                        <span class="text-[10px] font-bold text-gray-400">หมวดหมู่: <?php echo $row['category'] === 'school' ? 'โรงเรียน' : ($row['category'] === 'teacher' ? 'คุณครู' : 'นักเรียน'); ?></span>
                                        <?php if(!$row['approved']): ?>
                                            <span class="text-[9px] bg-amber-100 text-amber-800 font-extrabold px-2 py-0.5 rounded">รออนุมัติ</span>
                                        <?php endif; ?>
                                    </div>

                                    <h3 class="font-extrabold text-sm text-gray-800 leading-snug"><?php echo htmlspecialchars($row['title']); ?></h3>
                                    <p class="text-xs text-gray-500 leading-relaxed"><?php echo htmlspecialchars($row['description']); ?></p>

                                    <!-- ข้อมูลรายละเอียดผลงาน -->
                                    <div class="pt-3 border-t border-gray-100 space-y-1.5 text-xs text-gray-600 bg-slate-50/50 p-3 rounded-2xl">
                                        <p class="flex items-center gap-1.5">
                                            <span class="text-sm">🏅</span>
                                            <span class="font-bold text-gray-700">รางวัล/ประเภท:</span> 
                                            <span class="text-blue-900 font-bold"><?php echo htmlspecialchars($row['type']); ?> (ระดับ<?php echo htmlspecialchars($row['rewardLevel']); ?>)</span>
                                        </p>
                                        
                                        <!-- ส่วนแสดงโปรไฟล์ผู้รับรางวัล/เจ้าของผลงานเชิงประจักษ์แบบหรูหรา -->
                                        <div class="flex items-center gap-2.5 bg-white p-2 rounded-xl border border-slate-100 my-1 shadow-xs">
                                            <?php
                                                $owner_avatar = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150'; // Default
                                                if (!empty($row['owner_img'])) {
                                                    $owner_avatar = $row['owner_img'];
                                                } elseif (isset($user_avatars[$row['ownerName']]) && !empty($user_avatars[$row['ownerName']])) {
                                                    $owner_avatar = $user_avatars[$row['ownerName']];
                                                }
                                            ?>
                                            <img src="<?php echo htmlspecialchars($owner_avatar); ?>" class="w-8 h-8 rounded-full object-cover border border-slate-200 shadow-xs flex-shrink-0" alt="Owner Profile">
                                            <div class="text-left leading-tight">
                                                <span class="text-[9px] text-gray-400 font-bold block">ผู้รับรางวัล / เจ้าของ</span>
                                                <strong class="text-gray-800 text-[11px] font-extrabold block"><?php echo htmlspecialchars($row['ownerName']); ?></strong>
                                                <?php if(!empty($row['position'])): ?>
                                                    <span class="text-[9px] text-gray-500 font-medium"><?php echo htmlspecialchars($row['position']); ?></span>
                                                <?php endif; ?>
                                            </div>
                                        </div>

                                        <p class="flex items-center gap-1.5">
                                            <span class="text-sm">🏢</span>
                                            <span class="font-bold text-gray-700">หน่วยงานผู้มอบ:</span> 
                                            <span class="text-gray-500 font-medium"><?php echo htmlspecialchars($row['giver']); ?></span>
                                        </p>
                                        <?php if(!empty($row['studentClass'])): ?>
                                            <p class="flex items-center gap-1.5">
                                                <span class="text-sm">🎓</span>
                                                <span class="font-bold text-gray-700">ชั้นเรียนที่จัดทำ:</span> 
                                                <span class="text-gray-500 font-medium"><?php echo htmlspecialchars($row['studentClass']); ?></span>
                                            </p>
                                        <?php endif; ?>
                                    </div>

                                    <!-- รูปประกอบผลงานเชิงประจักษ์ (เกียรติบัตร & รูปรับรางวัล) ที่อัปโหลดตรง -->
                                    <?php if (!empty($row['certificate_img']) || !empty($row['award_img'])): ?>
                                        <div class="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-slate-100">
                                            <?php if (!empty($row['certificate_img'])): ?>
                                                <div class="space-y-1">
                                                    <span class="text-[9px] font-extrabold text-slate-400 block">📜 ภาพหลักฐานเกียรติบัตร:</span>
                                                    <a href="<?php echo htmlspecialchars($row['certificate_img']); ?>" target="_blank" class="block rounded-xl overflow-hidden border border-slate-200 shadow-xs hover:border-blue-500 transition-all bg-slate-50 relative group">
                                                        <img src="<?php echo htmlspecialchars($row['certificate_img']); ?>" class="w-full h-24 object-cover group-hover:scale-105 transition-transform duration-300" alt="เกียรติบัตร">
                                                        <div class="absolute inset-0 bg-black/0 group-hover:bg-black/10 flex items-center justify-center transition-all">
                                                            <span class="text-white text-[10px] bg-black/50 px-2 py-0.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity">🔍 ขยาย</span>
                                                        </div>
                                                    </a>
                                                </div>
                                            <?php endif; ?>
                                            <?php if (!empty($row['award_img'])): ?>
                                                <div class="space-y-1">
                                                    <span class="text-[9px] font-extrabold text-slate-400 block">🏆 ภาพกิจกรรม / รับรางวัล:</span>
                                                    <a href="<?php echo htmlspecialchars($row['award_img']); ?>" target="_blank" class="block rounded-xl overflow-hidden border border-slate-200 shadow-xs hover:border-blue-500 transition-all bg-slate-50 relative group">
                                                        <img src="<?php echo htmlspecialchars($row['award_img']); ?>" class="w-full h-24 object-cover group-hover:scale-105 transition-transform duration-300" alt="ภาพรับรางวัล">
                                                        <div class="absolute inset-0 bg-black/0 group-hover:bg-black/10 flex items-center justify-center transition-all">
                                                            <span class="text-white text-[10px] bg-black/50 px-2 py-0.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity">🔍 ขยาย</span>
                                                        </div>
                                                    </a>
                                                </div>
                                            <?php endif; ?>
                                        </div>
                                    <?php endif; ?>
                                </div>

                                <div class="mt-5 pt-4 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[10px] text-gray-400">
                                    <span class="font-medium">🏆 วันที่บันทึก: <?php echo substr($row['createdAt'], 0, 10); ?></span>
                                    
                                    <div class="flex items-center gap-2">
                                        <?php if (!empty($row['attachmentUrl'])): ?>
                                            <a href="<?php echo htmlspecialchars($row['attachmentUrl']); ?>" target="_blank" class="px-3.5 py-1.5 bg-blue-900 hover:bg-blue-800 text-white font-bold rounded-lg transition-all shadow-sm">
                                                🔗 ลิงก์ไฟล์แนบ
                                            </a>
                                        <?php endif; ?>

                                        <?php if (isset($_SESSION['user_role']) && $_SESSION['user_role'] === 'admin'): ?>
                                            <?php if (!$row['approved']): ?>
                                                <a href="index.php?tab=<?php echo $active_tab; ?>&approve_id=<?php echo $row['id']; ?>" class="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-3 py-1.5 rounded-lg shadow-sm transition-all">
                                                    อนุมัติ
                                                </a>
                                            <?php endif; ?>
                                            <a href="index.php?tab=<?php echo $active_tab; ?>&delete_id=<?php echo $row['id']; ?>" onclick="return confirm('ยืนยันลบผลงานนี้ออกจากคลังข้อมูลถาวร?')" class="bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold px-3 py-1.5 rounded-lg transition-all">
                                                ลบ
                                            </a>
                                        <?php endif; ?>
                                    </div>
                                </div>

                            </div>
                        <?php endwhile; ?>
                    </div>
                <?php endif; ?>
            </section>

        <!-- ==============================================
             CASE 3: หน้าออกรายงานประเมินและสถิติสะสม (REPORTS TAB)
             ============================================== -->
        <?php elseif (false && $active_tab === 'reports'): ?>
            <section class="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 text-left space-y-6">
                <div class="border-b border-slate-100 pb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                        <h2 class="text-xl font-black text-slate-800">📈 รายงานสรุปข้อมูลสถิติประกันคุณภาพการศึกษา (SAR)</h2>
                        <p class="text-xs text-slate-400">ข้อมูลรวมและประเมินผลงานครูและนักเรียน โรงเรียนบ้านหนองหว้า</p>
                    </div>
                    <div class="flex gap-2 print-hidden">
                        <button onclick="window.print()" class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer transition-all">
                            <span>🖨️ พิมพ์รายงาน / PDF</span>
                        </button>
                        <button onclick="exportReportsToCSV()" class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer transition-all">
                            <span>📥 ดาวน์โหลด Excel (.CSV)</span>
                        </button>
                    </div>
                </div>

                <!-- ส่วนตัวเลือกคัดกรองรายงานเฉพาะจุด (ซ่อนเมื่อพิมพ์รายงาน) -->
                <div class="bg-slate-50/50 p-5 rounded-2xl border border-slate-150 flex flex-wrap gap-4 items-end text-xs print-hidden">
                    <div class="w-full sm:w-64 text-left space-y-1">
                        <span class="font-bold text-slate-600 block">📂 หมวดหมู่ผลงานเพื่อจัดกลุ่ม</span>
                        <select id="report-cat-select" onchange="filterReportRows()" class="w-full text-xs px-3 py-2 rounded-xl border border-gray-200 outline-none focus:border-blue-500 bg-white">
                            <option value="all">ทั้งหมด (ทุกหมวดหมู่)</option>
                            <option value="school">🏫 ผลงานโรงเรียน (School)</option>
                            <option value="teacher">👩‍🏫 ผลงานคุณครู (Teacher)</option>
                            <option value="student">🎓 ผลงานนักเรียน (Student)</option>
                        </select>
                    </div>
                    <div class="w-full sm:w-52 text-left space-y-1">
                        <span class="font-bold text-slate-600 block">📅 ปีการศึกษา</span>
                        <select id="report-year-select" onchange="filterReportRows()" class="w-full text-xs px-3 py-2 rounded-xl border border-gray-200 outline-none focus:border-blue-500 bg-white">
                            <option value="all">ทั้งหมด (ทุกปีการศึกษา)</option>
                            <?php foreach($academic_years as $yr): ?>
                                <option value="<?php echo $yr; ?>">ปีการศึกษา <?php echo $yr; ?></option>
                            <?php endforeach; ?>
                        </select>
                    </div>
                    <div class="text-[11px] text-slate-400 pb-2">
                        * ปรับตัวเลือกด้านบน ระบบจะคำนวณสถิติและตารางข้อมูลใหม่โดยอัตโนมัติ
                    </div>
                </div>

                <!-- การ์ดตัวชี้วัด (Dashboard metrics for Report) -->
                <div class="grid grid-cols-3 gap-4">
                    <div class="bg-blue-50/60 p-4 rounded-2xl border border-blue-100">
                        <span class="text-[10px] font-bold text-blue-900 block uppercase">จำนวนผลงานเชิงประจักษ์รวม</span>
                        <strong id="report-total-cnt" class="text-2xl font-black text-blue-950 block mt-0.5"><?php echo $stat_total_approved; ?></strong>
                    </div>
                    <div class="bg-amber-50/60 p-4 rounded-2xl border border-amber-100">
                        <span class="text-[10px] font-bold text-amber-800 block uppercase">รอการตรวจสอบสิทธิ์</span>
                        <strong id="report-pending-cnt" class="text-2xl font-black text-amber-950 block mt-0.5"><?php echo $stat_pending; ?></strong>
                    </div>
                    <div class="bg-emerald-50/60 p-4 rounded-2xl border border-emerald-100">
                        <span class="text-[10px] font-bold text-emerald-800 block uppercase">รายการที่ได้รับการยืนยัน</span>
                        <strong id="report-approved-cnt" class="text-2xl font-black text-emerald-950 block mt-0.5"><?php echo $stat_total_approved; ?></strong>
                    </div>
                </div>

                <!-- สรุปผลการประเมินระดับรางวัล -->
                <div class="space-y-3">
                    <h3 class="font-black text-xs text-slate-700">📊 ตารางสรุปสัดส่วนระดับผลงานเชิงคุณภาพเพื่อเขียนเล่มรายงาน SAR</h3>
                    
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
                        <div class="border rounded-2xl p-4 bg-slate-50/20 space-y-2.5">
                            <p class="font-extrabold text-slate-600 border-b pb-1.5">ระดับภายในจังหวัดและภูมิภาค</p>
                            <div class="flex justify-between">
                                <span>🏫 ระดับโรงเรียน / สถาบัน:</span>
                                <strong id="cnt-lvl-school" class="font-black text-blue-900"><?php echo $levels_stats['โรงเรียน']; ?> รายการ</strong>
                            </div>
                            <div class="flex justify-between">
                                <span>🏫 ระดับกลุ่มโรงเรียน / ตำบล:</span>
                                <strong id="cnt-lvl-group" class="font-black text-blue-900"><?php echo $levels_stats['กลุ่มโรงเรียน']; ?> รายการ</strong>
                            </div>
                            <div class="flex justify-between">
                                <span>🏅 ระดับเขตพื้นที่การศึกษา:</span>
                                <strong id="cnt-lvl-area" class="font-black text-blue-900"><?php echo $levels_stats['เขตพื้นที่']; ?> รายการ</strong>
                            </div>
                        </div>

                        <div class="border rounded-2xl p-4 bg-slate-50/20 space-y-2.5">
                            <p class="font-extrabold text-slate-600 border-b pb-1.5">ระดับภูมิภาคและระดับชาติ</p>
                            <div class="flex justify-between">
                                <span>🎖️ ระดับจังหวัด:</span>
                                <strong id="cnt-lvl-province" class="font-black text-blue-900"><?php echo $levels_stats['จังหวัด']; ?> รายการ</strong>
                            </div>
                            <div class="flex justify-between">
                                <span>🏆 ระดับภาค / ตรวจราชการ:</span>
                                <strong id="cnt-lvl-region" class="font-black text-blue-900"><?php echo $levels_stats['ภาค']; ?> รายการ</strong>
                            </div>
                            <div class="flex justify-between">
                                <span>👑 ระดับประเทศ / นานาชาติ:</span>
                                <strong id="cnt-lvl-national" class="font-black text-blue-900"><?php echo $levels_stats['ประเทศ']; ?> รายการ</strong>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- ตารางสรุปรายชิ้นงาน -->
                <div class="space-y-3 pt-4">
                    <h3 class="font-black text-xs text-slate-700">📑 ตารางแสดงรายละเอียดรายงานหลักฐานเชิงประจักษ์ (Portfolio List)</h3>
                    <div class="overflow-x-auto border border-slate-150 rounded-2xl shadow-sm">
                        <table class="w-full text-left border-collapse text-[11px] bg-white">
                            <thead>
                                <tr class="bg-blue-900 text-white font-extrabold">
                                    <th class="p-3 border-r border-blue-800">หมวดหมู่</th>
                                    <th class="p-3 border-r border-blue-800">ปีการศึกษา</th>
                                    <th class="p-3 border-r border-blue-800">ชื่อผลงาน / รางวัลที่ได้รับ</th>
                                    <th class="p-3 border-r border-blue-800">ระดับผลงาน</th>
                                    <th class="p-3 border-r border-blue-800">ชื่อผู้มีส่วนรับผิดชอบ</th>
                                    <th class="p-3 border-r border-blue-800">หน่วยงานมอบ</th>
                                    <th class="p-3">ลิงก์หลักฐาน</th>
                                </tr>
                            </thead>
                            <tbody id="report-table-body">
                                <?php 
                                    // โหลดผลงานทั้งหมดที่อนุมัติแล้วมาเตรียมพิมพ์ในตาราง
                                    $all_approved_res = $conn->query("SELECT * FROM portfolios WHERE approved=1 ORDER BY academicYear DESC, createdAt DESC");
                                    if ($all_approved_res && $all_approved_res->num_rows > 0):
                                        while($r = $all_approved_res->fetch_assoc()):
                                ?>
                                    <tr class="report-row hover:bg-slate-50/50 border-b border-slate-100 transition-colors" 
                                        data-category="<?php echo htmlspecialchars($r['category']); ?>"
                                        data-year="<?php echo htmlspecialchars($r['academicYear']); ?>"
                                        data-title="<?php echo htmlspecialchars($r['title']); ?>"
                                        data-level="<?php echo htmlspecialchars($r['rewardLevel']); ?>"
                                        data-owner="<?php echo htmlspecialchars($r['ownerName']); ?>"
                                        data-giver="<?php echo htmlspecialchars($r['giver']); ?>"
                                        data-date="<?php echo htmlspecialchars($r['awardDate']); ?>"
                                        data-type="<?php echo htmlspecialchars($r['type']); ?>">
                                        <td class="p-3 font-semibold border-r border-slate-100">
                                            <?php 
                                                if($r['category'] === 'school') echo 'ผลงานโรงเรียน';
                                                elseif($r['category'] === 'teacher') echo 'ผลงานคุณครู';
                                                else echo 'ผลงานนักเรียน';
                                            ?>
                                        </td>
                                        <td class="p-3 border-r border-slate-100 font-bold"><?php echo htmlspecialchars($r['academicYear']); ?></td>
                                        <td class="p-3 border-r border-slate-100 font-bold text-slate-800"><?php echo htmlspecialchars($r['title']); ?></td>
                                        <td class="p-3 border-r border-slate-100 font-semibold text-blue-900"><?php echo htmlspecialchars($r['rewardLevel']); ?></td>
                                        <td class="p-3 border-r border-slate-100 text-slate-700"><?php echo htmlspecialchars($r['ownerName']); ?></td>
                                        <td class="p-3 border-r border-slate-100 text-slate-500"><?php echo htmlspecialchars($r['giver']); ?></td>
                                        <td class="p-3 font-bold text-blue-600">
                                            <?php if(!empty($r['attachmentUrl'])): ?>
                                                <a href="<?php echo htmlspecialchars($r['attachmentUrl']); ?>" target="_blank" class="hover:underline">🔗 เปิดดูเอกสาร</a>
                                            <?php else: ?>
                                                <span class="text-slate-400 font-medium">ไม่มีไฟล์แนบ</span>
                                            <?php endif; ?>
                                        </td>
                                    </tr>
                                <?php 
                                        endwhile;
                                    else:
                                ?>
                                    <tr>
                                        <td colspan="7" class="p-6 text-center text-slate-400">ไม่มีข้อมูลบันทึกในฐานข้อมูลในขณะนี้</td>
                                    </tr>
                                <?php endif; ?>
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>

            <!-- สคริปต์กรองตารางรายงานสด (SAR Instant Client Filter) ด้วย Javascript ดึงข้อมูลรวดเร็วไม่ต้อง reload -->
            <script>
                function filterReportRows() {
                    const cat = document.getElementById('report-cat-select').value;
                    const year = document.getElementById('report-year-select').value;
                    const rows = document.querySelectorAll('.report-row');
                    
                    let count_total = 0;
                    let lvl_school = 0;
                    let lvl_group = 0;
                    let lvl_area = 0;
                    let lvl_province = 0;
                    let lvl_region = 0;
                    let lvl_national = 0;

                    rows.forEach(row => {
                        const rowCat = row.getAttribute('data-category');
                        const rowYr = row.getAttribute('data-year');
                        const rowLvl = row.getAttribute('data-level');

                        const catMatch = (cat === 'all' || rowCat === cat);
                        const yrMatch = (year === 'all' || rowYr === year);

                        if (catMatch && yrMatch) {
                            row.style.display = '';
                            count_total++;

                            // คำนวณสถิติ
                            if (rowLvl === 'โรงเรียน') lvl_school++;
                            else if (rowLvl === 'กลุ่มโรงเรียน') lvl_group++;
                            else if (rowLvl === 'เขตพื้นที่') lvl_area++;
                            else if (rowLvl === 'จังหวัด') lvl_province++;
                            else if (rowLvl === 'ภาค') lvl_region++;
                            else if (rowLvl === 'ประเทศ') lvl_national++;
                        } else {
                            row.style.display = 'none';
                        }
                    });

                    // อัปเดตยอดตัวเลขหน้าจอแบบ Realtime
                    document.getElementById('report-total-cnt').innerText = count_total;
                    document.getElementById('report-approved-cnt').innerText = count_total;
                    
                    document.getElementById('cnt-lvl-school').innerText = lvl_school + " รายการ";
                    document.getElementById('cnt-lvl-group').innerText = lvl_group + " รายการ";
                    document.getElementById('cnt-lvl-area').innerText = lvl_area + " รายการ";
                    document.getElementById('cnt-lvl-province').innerText = lvl_province + " รายการ";
                    document.getElementById('cnt-lvl-region').innerText = lvl_region + " รายการ";
                    document.getElementById('cnt-lvl-national').innerText = lvl_national + " รายการ";
                }

                // สคริปต์ส่งออกเป็นไฟล์ CSV รองรับภาษาไทยใน Microsoft Excel สมบูรณ์แบบ
                function exportReportsToCSV() {
                    const cat = document.getElementById('report-cat-select').value;
                    const year = document.getElementById('report-year-select').value;
                    const rows = document.querySelectorAll('.report-row');

                    const headers = [
                        'หมวดหมู่', 'ปีการศึกษา', 'ชื่อผลงาน/รางวัล', 
                        'ระดับรางวัล', 'ชื่อผู้รับผลงาน', 'หน่วยงานมอบ', 'วันที่ได้รับ', 'ประเภทรางวัล'
                    ];

                    const csvRows = [];
                    csvRows.push(headers.join(','));

                    rows.forEach(row => {
                        if (row.style.display !== 'none') {
                            const rowCat = row.getAttribute('data-category') === 'school' ? 'ผลงานโรงเรียน' : row.getAttribute('data-category') === 'teacher' ? 'ผลงานคุณครู' : 'ผลงานนักเรียน';
                            const rowYr = row.getAttribute('data-year');
                            const rowTitle = `"${row.getAttribute('data-title').replace(/"/g, '""')}"`;
                            const rowLvl = row.getAttribute('data-level');
                            const rowOwner = `"${row.getAttribute('data-owner').replace(/"/g, '""')}"`;
                            const rowGiver = `"${row.getAttribute('data-giver').replace(/"/g, '""')}"`;
                            const rowDate = row.getAttribute('data-date');
                            const rowType = `"${row.getAttribute('data-type').replace(/"/g, '""')}"`;

                            csvRows.push([rowCat, rowYr, rowTitle, rowLvl, rowOwner, rowGiver, rowDate, rowType].join(','));
                        }
                    });

                    // เติม UTF-8 BOM (\uFEFF) ป้องกันไม่ให้ภาษาไทยเพี้ยนใน MS Excel
                    const csvContent = '\uFEFF' + csvRows.join('\n');
                    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                    const url = URL.createObjectURL(blob);
                    
                    const link = document.createElement('a');
                    link.setAttribute('href', url);
                    link.setAttribute('download', `รายงาน_คลังผลงาน_โรงเรียนบ้านหนองหว้า_คัดกรอง_หมวดหมู่_${cat}_ปี_${year}.csv`);
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                }
            </script>

        <!-- ==============================================
             CASE 4: หน้าการตั้งค่าและจัดการผู้ใช้ (SETUP TAB)
             ============================================== -->
        <?php 
        elseif ($active_tab === 'setup' && isset($_SESSION['user_role']) && $_SESSION['user_role'] === 'admin'): 
            $sub_tab = isset($_GET['subtab']) ? $_GET['subtab'] : 'general';
        ?>
            <section class="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 text-left space-y-6">
                <div class="border-b border-slate-100 pb-3">
                    <h2 class="text-xl font-black text-slate-800">⚙️ แผงจัดการระบบประกันคุณภาพและการตั้งค่าระบบ</h2>
                    <p class="text-xs text-slate-400">สำหรับผู้ดูแลระบบ (Admin) ในการจัดการบัญชีครู อัตลักษณ์โรงเรียน และสัญญาสิทธิ์ Google Drive</p>
                </div>

                <!-- แถบเมนูย่อย Sub-Tabs -->
                <div class="flex border-b border-slate-200 mb-6 print-hidden text-xs font-bold">
                    <a href="index.php?tab=setup&subtab=general" class="py-2.5 px-4 transition-all border-b-2 <?php echo $sub_tab === 'general' ? 'border-blue-900 text-blue-950 font-black' : 'border-transparent text-slate-500 hover:text-slate-800'; ?>">
                        📁 เชื่อมต่อ Google Drive
                    </a>
                    <a href="index.php?tab=setup&subtab=branding" class="py-2.5 px-4 transition-all border-b-2 <?php echo $sub_tab === 'branding' ? 'border-blue-900 text-blue-950 font-black' : 'border-transparent text-slate-500 hover:text-slate-800'; ?>">
                        🏫 ตราสัญลักษณ์ & อัตลักษณ์โรงเรียน
                    </a>
                    <a href="index.php?tab=setup&subtab=users" class="py-2.5 px-4 transition-all border-b-2 <?php echo $sub_tab === 'users' ? 'border-blue-900 text-blue-950 font-black' : 'border-transparent text-slate-500 hover:text-slate-800'; ?>">
                        👥 จัดการบัญชีรายชื่อคุณครู
                    </a>
                </div>

                <!-- SUB TAB 1: General & Google Drive Connection -->
                <?php if ($sub_tab === 'general'): ?>
                    <form method="POST" class="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs font-bold text-slate-700">
                        <div>
                            <label class="block mb-1">📁 รหัสโฟลเดอร์เก็บไฟล์บน Google Drive (Folder ID)</label>
                            <input type="text" name="google_drive_folder_id" value="<?php echo htmlspecialchars($google_drive_folder_id); ?>" placeholder="ป้อน ID เช่น 1aBcD-eFgHiJkLm..." class="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:border-blue-500 bg-slate-50/50 text-xs font-medium text-slate-800">
                            <p class="text-[9px] text-slate-400 font-medium mt-1">💡 คัดลอกจากส่วนท้ายสุดของ URL โฟลเดอร์ใน Google Drive ของท่านที่ได้แชร์เป็น 'ทุกคนที่มีลิงก์มีสิทธิ์อ่าน'</p>
                        </div>
                        <div>
                            <label class="block mb-1">⚡ ลิงก์ระบบส่งข้อมูล Google Apps Script Web App URL</label>
                            <input type="url" name="google_apps_script_url" value="<?php echo htmlspecialchars($google_apps_script_url); ?>" placeholder="เช่น https://script.google.com/macros/s/.../exec" class="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:border-blue-500 bg-slate-50/50 text-xs font-medium text-slate-800">
                            <p class="text-[9px] text-slate-400 font-medium mt-1">💡 ลิงก์เว็บแอปที่ได้จากการกดปรับใช้ (Deploy) ตัวสคริปต์ Google Apps Script</p>
                        </div>

                        <div class="md:col-span-2 pt-4 border-t border-slate-100 flex flex-col md:flex-row gap-4 items-center justify-between">
                            <div class="text-[10px] text-slate-400 font-medium">
                                * โปรดตรวจสอบสัญญาสิทธิ์โฟลเดอร์ในไดรฟ์ของท่านให้แน่ใจว่าได้เปิดเป็นสาธารณะ (คนมีลิงก์มีสิทธิ์อ่าน) ก่อนเริ่มทำการส่งไฟล์
                            </div>
                            <button type="submit" name="save_general_settings" class="px-6 py-3 bg-blue-900 hover:bg-blue-800 text-white font-extrabold text-xs rounded-xl shadow-md cursor-pointer transition-all">
                                💾 บันทึกระบบเชื่อมต่อคลาวด์
                            </button>
                        </div>
                    </form>

                    <!-- คู่มือการคัดลอกโค้ด Google Apps Script ไปใช้งานจริง -->
                    <div class="pt-6 border-t border-slate-100 space-y-4">
                        <div>
                            <h3 class="font-black text-sm text-slate-800 flex items-center gap-2">
                                <span>📋</span>
                                <span>โค้ดและวิธีติดตั้ง Google Apps Script สำหรับผู้ดูแลระบบ</span>
                            </h3>
                            <p class="text-xs text-slate-400">ทำตามขั้นตอนต่อไปนี้เพื่อเชื่อมต่อระบบจัดเก็บเอกสารและไฟล์ภาพเข้ากับ Google Drive ของโรงเรียนแบบถาวร</p>
                        </div>

                        <div class="text-xs text-slate-600 bg-blue-50/30 border border-blue-100/50 p-5 rounded-2xl space-y-2.5 font-sans">
                            <p class="font-bold text-blue-900 text-sm">💡 ขั้นตอนการเชื่อมต่อและคัดลอกโค้ดใช้งาน:</p>
                            <ol class="list-decimal pl-5 space-y-1.5 leading-relaxed">
                                <li>ล็อกอินเข้าไปที่บัญชี Google Drive ของโรงเรียน และสร้างโฟลเดอร์สำหรับเก็บผลงาน ครู/นักเรียน พร้อมคัดลอก Folder ID มาใส่ด้านบน</li>
                                <li>เข้าเว็บไซต์ <a href="https://script.google.com/" target="_blank" class="text-blue-600 underline font-extrabold">Google Apps Script Dashboard</a> แล้วกดปุ่ม <strong>"โครงการใหม่" (New Project)</strong></li>
                                <li>ล้างข้อมูลโค้ดชุดเดิมออกให้หมด แล้วคัดลอกโค้ดในกล่องด้านล่างนี้ไปวางแทนที่ทั้งหมด</li>
                                <li>กดเซฟโครงการ แล้วคลิกปุ่ม <strong>"การปรับใช้" (Deploy) > "การปรับใช้ใหม่" (New Deployment)</strong> ทางด้านบน</li>
                                <li>คลิกรูปฟันเฟือง เลือกประเภทเป็น <strong>"เว็บแอป" (Web App)</strong></li>
                                <li>ตั้งค่า: กำหนดช่อง "ผู้ดูแลและควบคุมสิทธิ์เว็บแอป" เป็นชื่อคุณเอง และกำหนดช่อง "ผู้มีสิทธิ์เข้าใช้งาน" ให้เป็น <strong>"ทุกคน" (Anyone)</strong></li>
                                <li>กด "ปรับใช้" (Deploy) และอนุมัติสิทธิ์ความปลอดภัย (Authorize) จากนั้นคัดลอกลิงก์ <strong>"URL เว็บแอป" (Web App URL)</strong> มาป้อนในฟอร์มการตั้งค่าด้านบน เป็นอันเสร็จสิ้น!</li>
                            </ol>
                        </div>

                        <div class="space-y-2">
                            <div class="flex justify-between items-center">
                                <span class="text-xs font-extrabold text-slate-600">📦 รหัสคำสั่งโค้ด Google Apps Script (GS)</span>
                                <button onclick="copyGasScriptCode()" class="px-3 py-1.5 bg-blue-100 hover:bg-blue-200 text-blue-900 text-[10px] font-extrabold rounded-lg cursor-pointer transition-all">
                                    📋 คัดลอกโค้ดทั้งหมด
                                </button>
                            </div>
                            <div class="overflow-x-auto bg-slate-900 text-slate-200 p-5 rounded-2xl font-mono text-[11px] leading-relaxed relative max-h-[350px]">
                                <pre id="gasCodeText" class="whitespace-pre text-left">function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var base64Data = data.file;
    var fileName = data.filename;
    var folderId = data.folderId; // รหัสโฟลเดอร์ปลายทางที่ใช้จัดเก็บ
    
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
                        </div>
                    </div>

                    <script>
                        function copyGasScriptCode() {
                            const code = document.getElementById('gasCodeText').innerText;
                            navigator.clipboard.writeText(code).then(() => {
                                alert('คัดลอกรหัสคำสั่ง Google Apps Script เรียบร้อยแล้ว! นำไปวางใน Google Script ได้ทันที');
                            }).catch(err => {
                                alert('ไม่สามารถคัดลอกได้อัตโนมัติ กรุณาลากคลุมโค้ดแล้วกดปุ่มคัดลอก');
                            });
                        }
                    </script>

                <!-- SUB TAB 2: Branding & Direct File Upload -->
                <?php elseif ($sub_tab === 'branding'): ?>
                    <form method="POST" enctype="multipart/form-data" class="space-y-6">
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-8 text-xs font-bold text-slate-700">
                            <div class="space-y-5">
                                <div>
                                    <label class="block mb-1">🏫 ชื่อสถาบัน / โรงเรียน</label>
                                    <input type="text" name="school_name" value="<?php echo htmlspecialchars($school_name); ?>" required class="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:border-blue-500 bg-slate-50/50 text-xs font-medium text-slate-800">
                                </div>
                                <div>
                                    <label class="block mb-1">📝 ข้อความหัวข้อหลักบนเฮดเดอร์เว็บ (Header Title)</label>
                                    <input type="text" name="header_title" value="<?php echo htmlspecialchars($header_title); ?>" required placeholder="เช่น ระบบคลังผลงานและหลักฐานเชิงประจักษ์" class="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:border-blue-500 bg-slate-50/50 text-xs font-medium text-slate-800">
                                    <p class="text-[9px] text-slate-400 font-medium mt-1">💡 กำหนดข้อความส่วนหัวบนสุดของระบบ (ด้านบนชื่อโรงเรียน)</p>
                                </div>
                                <div>
                                    <label class="block mb-1">💬 ข้อความคำอธิบายย่อยบนเฮดเดอร์เว็บ (Header Subtitle)</label>
                                    <input type="text" name="header_subtitle" value="<?php echo htmlspecialchars($header_subtitle); ?>" required placeholder="เช่น เพื่อการประกันคุณภาพและการประเมินสถานศึกษา" class="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:border-blue-500 bg-slate-50/50 text-xs font-medium text-slate-800">
                                    <p class="text-[9px] text-slate-400 font-medium mt-1">💡 กำหนดข้อความเสริมที่จะแสดงอยู่ถัดจากป้ายชื่อโรงเรียนของท่าน</p>
                                </div>
                                <div>
                                    <label class="block mb-1">🔗 ที่อยู่ไฟล์ลิงก์โลโก้โรงเรียน (School Logo URL)</label>
                                    <input type="text" name="school_logo" id="school_logo_url_field" value="<?php echo htmlspecialchars($school_logo); ?>" placeholder="เช่น https://example.com/logo.png" class="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:border-blue-500 bg-slate-50/50 text-xs font-medium text-slate-800">
                                    <p class="text-[9px] text-slate-400 font-medium mt-1">💡 หากทำการอัปโหลดไฟล์ภาพโดยตรง ระบบจะแปลงไฟล์และอัปเดตข้อมูลลิงก์ที่อยู่ด้านขวานี้โดยอัตโนมัติครับ</p>
                                </div>
                            </div>

                            <div class="space-y-3">
                                <label class="block mb-1">📤 อัปโหลดตราสัญลักษณ์และโลโก้โรงเรียนใหม่ (เก็บในระบบงานของเราโดยตรง)</label>
                                <div class="border-2 border-dashed border-slate-200 hover:border-blue-500 rounded-3xl p-6 text-center transition-all cursor-pointer bg-slate-50/40 relative flex flex-col items-center justify-center min-h-[160px]" onclick="document.getElementById('logo_file_selector').click()">
                                    <input type="file" id="logo_file_selector" name="school_logo_file" accept="image/*" class="hidden" onchange="previewBrandingLogo(this)">
                                    
                                    <div id="branding-logo-preview-box" class="mb-2 <?php echo empty($school_logo) ? 'hidden' : ''; ?>">
                                        <img id="branding-logo-preview-image" src="<?php echo htmlspecialchars($school_logo); ?>" alt="School Logo" class="max-h-24 object-contain mx-auto rounded-lg shadow-sm border bg-white p-2">
                                        <p class="text-[9px] text-slate-400 font-medium mt-1.5">ตัวอย่างการแสดงผลโลโก้โรงเรียนของท่าน</p>
                                    </div>

                                    <div id="branding-logo-placeholder" class="<?php echo !empty($school_logo) ? 'hidden' : ''; ?> space-y-1">
                                        <span class="text-3xl block">🎨</span>
                                        <p class="text-[11px] font-extrabold text-slate-700">คลิกที่นี่เพื่อเลือกอัปโหลดไฟล์รูปภาพโลโก้</p>
                                        <p class="text-[9px] text-slate-400 font-medium">รองรับนามสกุลไฟล์ PNG, JPEG, WEBP และ GIF</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="pt-5 border-t border-slate-100 flex flex-col md:flex-row gap-4 items-center justify-between">
                            <div class="text-[10px] text-slate-400 font-medium">
                                * ไฟล์ตราสัญลักษณ์โรงเรียนจะถูกเข้ารหัสเพื่อเก็บบันทึกลงในระบบคลังโดยสมบูรณ์ ไม่เสี่ยงต่อการถูกลบจากภายนอก
                            </div>
                            <button type="submit" name="save_branding_settings" class="px-6 py-3 bg-blue-900 hover:bg-blue-800 text-white font-extrabold text-xs rounded-xl shadow-md cursor-pointer transition-all">
                                💾 บันทึกสัญญลักษณ์อัตลักษณ์และโลโก้
                            </button>
                        </div>
                    </form>

                    <script>
                        function previewBrandingLogo(input) {
                            if (input.files && input.files[0]) {
                                const reader = new FileReader();
                                reader.onload = function(e) {
                                    document.getElementById('branding-logo-preview-image').src = e.target.result;
                                    document.getElementById('branding-logo-preview-box').classList.remove('hidden');
                                    document.getElementById('branding-logo-placeholder').classList.add('hidden');
                                    document.getElementById('school_logo_url_field').value = e.target.result;
                                };
                                reader.readAsDataURL(input.files[0]);
                            }
                        }
                    </script>

                <!-- SUB TAB 3: User/Teacher Accounts Management CRUD -->
                <?php elseif ($sub_tab === 'users'): ?>
                    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        
                        <!-- ฝั่งซ้าย: ฟอร์มลงทะเบียนเพิ่มผู้ใช้รายบุคคล -->
                        <div class="bg-slate-50 p-6 rounded-2xl border border-slate-200 text-left space-y-4">
                            <div>
                                <h3 class="font-extrabold text-xs text-blue-900">👥 ลงทะเบียนผู้ใช้งานระบบใหม่ (ครู / แอดมิน)</h3>
                                <p class="text-[10px] text-slate-400 font-medium">บัญชีที่เพิ่มจะสามารถใช้รหัสนี้เข้าระบบส่งผลงานและจัดทำรายงานได้ทันที</p>
                            </div>
                            
                            <form method="POST" class="space-y-3.5 text-xs">
                                <div>
                                    <label class="block mb-1 font-bold text-slate-700">👤 ชื่อ-นามสกุลจริง</label>
                                    <input type="text" name="new_name" required placeholder="เช่น คุณครูเพียรพรรณ ใจดี" class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-blue-500 bg-white text-xs font-medium text-slate-800">
                                </div>
                                <div>
                                    <label class="block mb-1 font-bold text-slate-700">🔑 ชื่อผู้ใช้งานสำหรับเข้าสู่ระบบ (Username)</label>
                                    <input type="text" name="new_username" required placeholder="ใช้ตัวอักษรภาษาอังกฤษและตัวเลขเท่านั้น" pattern="[a-zA-Z0-9_]+" class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-blue-500 bg-white text-xs font-medium text-slate-800">
                                </div>
                                <div>
                                    <label class="block mb-1 font-bold text-slate-700">🔒 รหัสผ่านเข้าใช้งาน (Password)</label>
                                    <input type="text" name="new_password" required placeholder="รหัสผ่านตามใจชอบ" class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-blue-500 bg-white text-xs font-medium text-slate-800">
                                </div>
                                <div>
                                    <label class="block mb-1 font-bold text-slate-700">📧 อีเมลติดต่อคุณครู (Email)</label>
                                    <input type="email" name="new_email" placeholder="เช่น teacher@school.ac.th" class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-blue-500 bg-white text-xs font-medium text-slate-800">
                                </div>
                                <div>
                                    <label class="block mb-1 font-bold text-slate-700">🎖️ สิทธิ์และระดับการใช้ประโยชน์ (Role)</label>
                                    <select name="new_role" required class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-blue-500 bg-white text-xs text-slate-800">
                                        <option value="teacher">คุณครูผู้สอน (Teacher - จัดทำคลังตนเอง)</option>
                                        <option value="admin">ผู้ดูแลระบบ (Admin - ตรวจสอบและแก้ไขทุกส่วน)</option>
                                    </select>
                                </div>
                                <div class="pt-2">
                                    <button type="submit" name="add_user" class="w-full py-2.5 bg-blue-900 hover:bg-blue-800 text-white font-extrabold text-xs rounded-xl shadow-md cursor-pointer transition-all">
                                        ➕ ลงทะเบียนและบันทึกผู้ใช้
                                    </button>
                                </div>
                            </form>
                        </div>

                        <!-- ฝั่งขวา: รายชื่อคุณครูผู้ใช้ระบบที่มีอยู่ทั้งหมดใน MySQL -->
                        <div class="lg:col-span-2 space-y-4 text-left">
                            <div>
                                <h3 class="font-extrabold text-sm text-slate-800">📋 ทะเบียนบัญชีคุณครูและบุคลากรในโรงเรียนขณะนี้</h3>
                                <p class="text-[10px] text-slate-400">แสดงรายชื่อคุณครูผู้สอนทั้งหมดที่มีสิทธิ์นำผลงานเข้าสู่คลังประกันคุณภาพการศึกษา</p>
                            </div>

                            <div class="overflow-x-auto border border-slate-200 rounded-2xl shadow-sm bg-white">
                                <table class="w-full text-left border-collapse text-[11px]">
                                    <thead>
                                        <tr class="bg-slate-50 text-slate-700 font-extrabold border-b">
                                            <th class="p-3">ชื่อ-นามสกุลคุณครู</th>
                                            <th class="p-3">Username</th>
                                            <th class="p-3">รหัสผ่าน</th>
                                            <th class="p-3">อีเมลติดต่อ</th>
                                            <th class="p-3">ระดับสิทธิ์</th>
                                            <th class="p-3 text-center">จัดการสิทธิ์</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <?php 
                                            $users_res = $conn->query("SELECT * FROM users ORDER BY role ASC, name ASC");
                                            if ($users_res && $users_res->num_rows > 0):
                                                while($u = $users_res->fetch_assoc()):
                                        ?>
                                            <tr class="border-b hover:bg-slate-50/40">
                                                <td class="p-3 font-bold text-slate-800 flex items-center gap-2">
                                                    <img src="<?php echo htmlspecialchars($u['avatarUrl'] ?: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150'); ?>" class="w-6 h-6 rounded-full object-cover border border-slate-200">
                                                    <span><?php echo htmlspecialchars($u['name']); ?></span>
                                                </td>
                                                <td class="p-3 text-slate-600 font-semibold"><?php echo htmlspecialchars($u['username']); ?></td>
                                                <td class="p-3 text-slate-400 font-mono"><?php echo htmlspecialchars($u['password']); ?></td>
                                                <td class="p-3 text-slate-500"><?php echo htmlspecialchars($u['email'] ?: '-'); ?></td>
                                                <td class="p-3">
                                                    <span class="inline-flex px-2 py-0.5 rounded text-[9px] font-bold <?php echo $u['role'] === 'admin' ? 'bg-rose-50 text-rose-700 border border-rose-100' : 'bg-blue-50 text-blue-700 border border-blue-100'; ?>">
                                                        <?php echo $u['role'] === 'admin' ? 'Admin' : 'Teacher'; ?>
                                                    </span>
                                                </td>
                                                <td class="p-3 text-center font-bold">
                                                    <?php if ($u['id'] !== $_SESSION['user_id']): ?>
                                                        <a href="index.php?tab=setup&subtab=users&delete_user_id=<?php echo $u['id']; ?>" onclick="return confirm('คุณต้องการลบสิทธิ์บัญชีคุณครูและยกเลิกการเข้าใช้งานระบบของ <?php echo htmlspecialchars($u['name']); ?> หรือไม่?')" class="text-rose-600 hover:text-rose-900 hover:underline">
                                                            ลบบัญชี
                                                        </a>
                                                    <?php else: ?>
                                                        <span class="text-slate-400 font-medium">บัญชีปัจจุบันของคุณ</span>
                                                    <?php endif; ?>
                                                </td>
                                            </tr>
                                        <?php 
                                                endwhile;
                                            else:
                                        ?>
                                            <tr>
                                                <td colspan="6" class="p-6 text-center text-slate-400">ไม่พบข้อมูลรายชื่อใดๆ ในระบบประกันประกันคุณภาพขณะนี้</td>
                                            </tr>
                                        <?php endif; ?>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                    </div>
                <?php endif; ?>

            </section>
        <?php endif; ?>

    </main>

    <!-- ส่วนท้ายด้านล่างสุดของระบบคลังสารสนเทศ (Footer) ที่สวยงามสมบูรณ์แบบ -->
    <footer class="bg-slate-900 text-slate-400 text-xs py-8 mt-12 border-t border-slate-800 text-center print-hidden">
        <div class="max-w-7xl mx-auto px-4 space-y-3">
            <p class="font-bold text-slate-200 text-sm">ระบบประกันคุณภาพและคลังหลักฐานเชิงประจักษ์ดิจิทัล</p>
            <p class="text-[11px] text-slate-500"><?php echo htmlspecialchars($school_name); ?> • สังกัดสำนักงานคณะกรรมการการศึกษาขั้นพื้นฐาน</p>
            <div class="pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between text-[10px] text-slate-600 gap-2">
                <p>© 2026 Ban Nong Wa School. All Rights Reserved. • ระบบประสานงานคลังข้อมูลอัตโนมัติบน Google Apps Script</p>
                <p>ขับเคลื่อนรวดเร็วด้วยสถาปัตยกรรม PHP 8.0 & MySQL ฐานข้อมูลโรงเรียน</p>
            </div>
        </div>
    </footer>

</body>
</html>
