export const PHP_DATABASE_SQL = `-- database.sql
-- เลือกฐานข้อมูล schoolos12_nwperformance ใน phpMyAdmin แล้วนำเข้าไฟล์นี้เพื่อสร้างตารางทั้งหมด

CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(50) PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100),
  role VARCHAR(20) NOT NULL,
  avatarUrl VARCHAR(255)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS portfolios (
  id VARCHAR(50) PRIMARY KEY,
  category VARCHAR(20) NOT NULL,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  academicYear VARCHAR(10) NOT NULL,
  awardDate VARCHAR(20) NOT NULL,
  giver VARCHAR(255) NOT NULL,
  rewardLevel VARCHAR(50) NOT NULL,
  ownerName VARCHAR(100) NOT NULL,
  position VARCHAR(100),
  department VARCHAR(100),
  studentClass VARCHAR(100),
  responsiblePerson VARCHAR(100),
  attachments TEXT,
  approved TINYINT(1) DEFAULT 0,
  createdAt VARCHAR(50) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- เพิ่มบัญชีผู้ดูแลระบบและบัญชีครูตัวอย่าง
INSERT IGNORE INTO users (id, username, password, name, email, role, avatarUrl)
VALUES 
('user-admin', 'admin', 'admin1234', 'ผู้อำนวยการสมชาย (Admin)', 'director.somchai@nhw.ac.th', 'admin', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=150'),
('user-teacher', 'teacher1', 'teacher1234', 'คุณครูเพียรพรรณ (Teacher)', 'peyarmteacher@gmail.com', 'teacher', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150');

-- ข้อมูลผลงานตัวอย่างโรงเรียน
INSERT IGNORE INTO portfolios (id, category, type, title, description, academicYear, awardDate, giver, rewardLevel, ownerName, position, department, studentClass, responsiblePerson, attachments, approved, createdAt)
VALUES 
('sample-1', 'school', 'Best Practice', 'นวัตกรรมการอ่านออกเขียนได้ 100% ด้วยคลังสื่อ "หนองหว้าโมเดล"', 'พัฒนาระบบคลังสื่อการสอนอิเล็กทรอนิกส์เพื่อแก้ไขปัญหาภาวะถดถอยทางการเรียนรู้', '2568', '2026-03-15', 'สำนักงานเขตพื้นที่การศึกษาประถมศึกษาประจวบคีรีขันธ์ เขต 1', 'เขตพื้นที่', 'โรงเรียนบ้านหนองหว้า', 'สถานศึกษา', 'กลุ่มสาระการเรียนรู้ภาษาไทย', 'ประถมศึกษาปีที่ 1 - 3', 'นางวิมล แสงสุวรรณ และคณะครูประถมศึกษา', '[]', 1, '2026-03-15T10:00:00Z'),
('sample-2', 'teacher', 'รางวัลครูดีเด่น', 'เกียรติบัตรรางวัลครูผู้สอนดีเด่น (วิทยาศาสตร์และเทคโนโลยี)', 'ได้รับรางวัลยกย่องเชิดชูเกียรติเป็นครูผู้สอนดีเด่น STEM ศึกษา', '2569', '2026-01-16', 'สำนักงานเลขาธิการคุรุสภา', 'จังหวัด', 'นายณัฐพล สมบูรณ์', 'ครู คศ.2', 'กลุ่มสาระการเรียนรู้วิทยาศาสตร์และเทคโนโลยี', 'ประถมศึกษาปีที่ 4 - 6', 'นายณัฐพล สมบูรณ์', '[]', 1, '2026-01-16T09:15:00Z');
`;

export const PHP_CONFIG = `<?php
// config.php
// กำหนดค่าการเชื่อมต่อฐานข้อมูล MySQL

$db_host = "localhost";
$db_user = "schoolos12_nwperformance";
$db_pass = "N!qbzz!d2r4OvDj3";
$db_name = "schoolos12_nwperformance";

$conn = new mysqli($db_host, $db_user, $db_pass, $db_name);

if ($conn->connect_error) {
    die("เชื่อมต่อฐานข้อมูลล้มเหลว: " . $conn->connect_error);
}
$conn->set_charset("utf8mb4");

session_start();
?>`;

export const PHP_INDEX = `<?php
// index.php
require_once 'config.php';

// ดึงปีการศึกษาเพื่อทำตัวกรอง
$years_query = "SELECT DISTINCT academicYear FROM portfolios ORDER BY academicYear DESC";
$years_result = $conn->query($years_query);

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
    $where_clauses[] = "(title LIKE '%$search%' OR description LIKE '%$search%' OR ownerName LIKE '%$search%')";
}

// เฉพาะผู้ที่ยังไม่ได้อนุมัติจะแสดงให้ Admin เท่านั้น แขกทั่วไปเห็นเฉพาะที่อนุมัติแล้ว
if (!isset($_SESSION['user_role']) || $_SESSION['user_role'] !== 'admin') {
    $where_clauses[] = "approved = 1";
}

$where_sql = "";
if (count($where_clauses) > 0) {
    $where_sql = "WHERE " . implode(" AND ", $where_clauses);
}

$query = "SELECT * FROM portfolios $where_sql ORDER BY createdAt DESC";
$result = $conn->query($query);

// สถิติสำหรับแผงควบคุม
$stat_school = $conn->query("SELECT COUNT(*) as total FROM portfolios WHERE category='school' AND approved=1")->fetch_assoc()['total'];
$stat_teacher = $conn->query("SELECT COUNT(*) as total FROM portfolios WHERE category='teacher' AND approved=1")->fetch_assoc()['total'];
$stat_student = $conn->query("SELECT COUNT(*) as total FROM portfolios WHERE category='student' AND approved=1")->fetch_assoc()['total'];
$stat_pending = $conn->query("SELECT COUNT(*) as total FROM portfolios WHERE approved=0")->fetch_assoc()['total'];

// จัดการอนุมัติ/ลบ (เฉพาะ Admin)
if (isset($_SESSION['user_role']) && $_SESSION['user_role'] === 'admin') {
    if (isset($_GET['approve_id'])) {
        $approve_id = $conn->real_escape_string($_GET['approve_id']);
        $conn->query("UPDATE portfolios SET approved = 1 WHERE id = '$approve_id'");
        header("Location: index.php");
        exit;
    }
    if (isset($_GET['delete_id'])) {
        $delete_id = $conn->real_escape_string($_GET['delete_id']);
        $conn->query("DELETE FROM portfolios WHERE id = '$delete_id'");
        header("Location: index.php");
        exit;
    }
}
?>
<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ระบบประกันคุณภาพและคลังสะสมผลงานดิจิทัล - โรงเรียนบ้านหนองหว้า</title>
    <!-- Tailwind CSS CDN -->
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Sarabun:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
    <style>
        body { font-family: 'Sarabun', 'Inter', sans-serif; }
    </style>
</head>
<body class="bg-slate-50 text-slate-800 min-h-screen flex flex-col">

    <!-- Header bar -->
    <header class="bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-950 text-white shadow-xl sticky top-0 z-50">
        <div class="max-w-7xl mx-auto px-4 py-4 flex flex-col md:flex-row items-center justify-between gap-4">
            <div class="flex items-center gap-3">
                <div class="w-12 h-12 bg-white rounded-full p-1 flex items-center justify-center">
                    <span class="text-blue-950 font-bold text-xl">NHW</span>
                </div>
                <div>
                    <h1 class="text-lg md:text-xl font-bold text-amber-400">ระบบคลังผลงานและหลักฐานเชิงประจักษ์</h1>
                    <p class="text-xs text-blue-200">โรงเรียนบ้านหนองหว้า (Ban Nong Wa School)</p>
                </div>
            </div>

            <div class="flex items-center gap-3">
                <?php if (isset($_SESSION['user_id'])): ?>
                    <div class="bg-blue-950/60 border border-blue-700/50 rounded-xl px-4 py-2 flex items-center gap-3">
                        <div class="text-right">
                            <p class="text-xs font-bold text-white"><?php echo htmlspecialchars($_SESSION['user_name']); ?></p>
                            <span class="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.2 rounded font-bold uppercase">
                                <?php echo htmlspecialchars($_SESSION['user_role']); ?>
                            </span>
                        </div>
                        <a href="logout.php" class="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-semibold">
                            ออกจากระบบ
                        </a>
                    </div>
                <?php else: ?>
                    <a href="login.php" class="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-blue-950 font-extrabold text-xs rounded-xl shadow-md transition-all">
                        เข้าสู่ระบบครู / แอดมิน
                    </a>
                <?php endif; ?>
            </div>
        </div>
    </header>

    <main class="max-w-7xl mx-auto px-4 py-8 flex-1 w-full space-y-8">
        <!-- Dashboard Statistics Panels -->
        <section class="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div class="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
                <div>
                    <span class="text-xs text-gray-500 font-semibold block">ผลงานโรงเรียน</span>
                    <strong class="text-2xl font-black text-blue-900 mt-1 block"><?php echo $stat_school; ?></strong>
                </div>
                <div class="w-10 h-10 rounded-xl bg-blue-50 text-blue-900 flex items-center justify-center font-bold">🏫</div>
            </div>
            <div class="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
                <div>
                    <span class="text-xs text-gray-500 font-semibold block">ผลงานครู</span>
                    <strong class="text-2xl font-black text-amber-600 mt-1 block"><?php echo $stat_teacher; ?></strong>
                </div>
                <div class="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">👩‍🏫</div>
            </div>
            <div class="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
                <div>
                    <span class="text-xs text-gray-500 font-semibold block">ผลงานนักเรียน</span>
                    <strong class="text-2xl font-black text-emerald-600 mt-1 block"><?php echo $stat_student; ?></strong>
                </div>
                <div class="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">🎓</div>
            </div>
            <div class="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
                <div>
                    <span class="text-xs text-gray-500 font-semibold block">รออนุมัติ</span>
                    <strong class="text-2xl font-black text-rose-600 mt-1 block"><?php echo $stat_pending; ?></strong>
                </div>
                <div class="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">⏳</div>
            </div>
        </section>

        <!-- Filters Section -->
        <section class="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <form method="GET" class="flex flex-col md:flex-row gap-4 items-end">
                <div class="flex-1 min-w-[150px] w-full text-left">
                    <label class="text-xs font-bold text-gray-600 block mb-1.5">ค้นหาผลงาน</label>
                    <input type="text" name="search" value="<?php echo htmlspecialchars($search_query); ?>" placeholder="ชื่อผลงาน, ผู้จัดทำ, คำอธิบาย..." class="w-full text-xs px-4 py-2.5 rounded-xl border border-gray-200 outline-none focus:border-blue-500">
                </div>
                <div class="w-full md:w-48 text-left">
                    <label class="text-xs font-bold text-gray-600 block mb-1.5">หมวดหมู่</label>
                    <select name="category" class="w-full text-xs px-4 py-2.5 rounded-xl border border-gray-200 outline-none focus:border-blue-500">
                        <option value="">ทั้งหมด</option>
                        <option value="school" <?php if($category_filter == 'school') echo 'selected'; ?>>ผลงานโรงเรียน</option>
                        <option value="teacher" <?php if($category_filter == 'teacher') echo 'selected'; ?>>ผลงานคุณครู</option>
                        <option value="student" <?php if($category_filter == 'student') echo 'selected'; ?>>ผลงานนักเรียน</option>
                    </select>
                </div>
                <div class="w-full md:w-40 text-left">
                    <label class="text-xs font-bold text-gray-600 block mb-1.5">ปีการศึกษา</label>
                    <select name="year" class="w-full text-xs px-4 py-2.5 rounded-xl border border-gray-200 outline-none focus:border-blue-500">
                        <option value="">ทั้งหมด</option>
                        <?php while($y_row = $years_result->fetch_assoc()): ?>
                            <option value="<?php echo $y_row['academicYear']; ?>" <?php if($year_filter == $y_row['academicYear']) echo 'selected'; ?>>
                                <?php echo $y_row['academicYear']; ?>
                            </option>
                        <?php endwhile; ?>
                    </select>
                </div>
                <div class="flex gap-2 w-full md:w-auto">
                    <button type="submit" class="flex-1 md:flex-none px-6 py-2.5 bg-blue-900 hover:bg-blue-800 text-white font-bold text-xs rounded-xl shadow cursor-pointer">
                        ค้นหา
                    </button>
                    <a href="index.php" class="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-bold rounded-xl text-center">
                        ล้างค่า
                    </a>
                </div>
            </form>
        </section>

        <!-- Admin Notice -->
        <?php if (isset($_SESSION['user_role']) && $_SESSION['user_role'] === 'admin' && $stat_pending > 0): ?>
            <div class="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-xl text-xs flex items-center justify-between">
                <span>มีผลงานใหม่จำนวน <strong><?php echo $stat_pending; ?> รายการ</strong> ที่รอการตรวจสอบและกดอนุมัติแสดงผลหน้าเว็บ</span>
            </div>
        <?php endif; ?>

        <!-- Portfolios Cards List -->
        <section class="space-y-4">
            <div class="flex justify-between items-center">
                <h2 class="text-sm font-bold text-gray-800">รายการคลังสะสมผลงาน (<?php echo $result->num_rows; ?>)</h2>
                <?php if (isset($_SESSION['user_id'])): ?>
                    <a href="add_portfolio.php" class="px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white text-xs font-bold rounded-xl shadow-md">
                        + บันทึกผลงานใหม่
                    </a>
                <?php endif; ?>
            </div>

            <?php if ($result->num_rows == 0): ?>
                <div class="bg-white p-12 text-center rounded-2xl border border-gray-100 space-y-2">
                    <span class="text-3xl">📂</span>
                    <p class="text-sm font-semibold text-gray-500">ไม่พบข้อมูลคลังผลงานตามที่เลือก</p>
                </div>
            <?php else: ?>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <?php while($row = $result->fetch_assoc()): ?>
                        <div class="bg-white p-6 rounded-2xl border border-gray-150/80 shadow-sm flex flex-col justify-between hover:shadow-md transition-all <?php if(!$row['approved']) echo 'border-amber-200 bg-amber-50/20'; ?>">
                            <div class="space-y-3 text-left">
                                <div class="flex justify-between items-start gap-2">
                                    <span class="text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider <?php 
                                        if($row['category'] == 'school') echo 'bg-blue-50 text-blue-900';
                                        elseif($row['category'] == 'teacher') echo 'bg-amber-50 text-amber-700';
                                        else echo 'bg-emerald-50 text-emerald-700';
                                    ?>">
                                        <?php 
                                            if($row['category'] == 'school') echo 'ผลงานโรงเรียน';
                                            elseif($row['category'] == 'teacher') echo 'ผลงานครู';
                                            else echo 'ผลงานนักเรียน';
                                        ?>
                                    </span>
                                    <span class="text-[10px] font-semibold text-gray-400">ปีการศึกษา <?php echo htmlspecialchars($row['academicYear']); ?></span>
                                </div>

                                <h3 class="font-bold text-sm text-gray-800 leading-snug"><?php echo htmlspecialchars($row['title']); ?></h3>
                                <p class="text-xs text-gray-500 line-clamp-3 leading-relaxed"><?php echo htmlspecialchars($row['description']); ?></p>

                                <div class="pt-2 border-t border-gray-100 space-y-1 text-xs text-gray-600">
                                    <p>🏅 <span class="font-semibold text-gray-700">รางวัล:</span> <?php echo htmlspecialchars($row['type']); ?> (<?php echo htmlspecialchars($row['rewardLevel']); ?>)</p>
                                    <p>ผู้รับการประเมิน: <span class="font-bold text-gray-800"><?php echo htmlspecialchars($row['ownerName']); ?></span></p>
                                    <p>หน่วยงานที่มอบ: <span class="text-gray-500"><?php echo htmlspecialchars($row['giver']); ?></span></p>
                                </div>
                            </div>

                            <div class="mt-5 pt-4 border-t border-gray-100 flex justify-between items-center">
                                <span class="text-[10px] text-gray-400">เมื่อ: <?php echo substr($row['createdAt'], 0, 10); ?></span>
                                
                                <div class="flex items-center gap-1.5">
                                    <?php if (isset($_SESSION['user_role']) && $_SESSION['user_role'] === 'admin'): ?>
                                        <?php if (!$row['approved']): ?>
                                            <a href="index.php?approve_id=<?php echo $row['id']; ?>" class="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] px-3 py-1 rounded-md transition-colors">
                                                อนุมัติ
                                            </a>
                                        <?php endif; ?>
                                        <a href="index.php?delete_id=<?php echo $row['id']; ?>" onclick="return confirm('ยืนยันลบใช่หรือไม่?')" class="bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-[10px] px-3 py-1 rounded-md transition-colors">
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
    </main>

    <footer class="bg-slate-900 text-slate-400 text-xs py-8 mt-12 border-t border-slate-800 text-center">
        <p>© 2026 โรงเรียนบ้านหนองหว้า • พัฒนาด้วย PHP และ MySQL เซิร์ฟเวอร์โรงเรียน</p>
    </footer>
</body>
</html>`;

export const PHP_LOGIN = `<?php
// login.php
require_once 'config.php';

$error = '';
if (isset($_POST['login'])) {
    $username = $conn->real_escape_string($_POST['username']);
    $password = $_POST['password']; // แบบง่ายตรงกับใน SQL (รหัสผ่านแบบข้อความตรงตัว)

    $query = "SELECT * FROM users WHERE username='$username' AND password='$password'";
    $result = $conn->query($query);

    if ($result->num_rows > 0) {
        $user = $result->fetch_assoc();
        $_SESSION['user_id'] = $user['id'];
        $_SESSION['user_name'] = $user['name'];
        $_SESSION['user_role'] = $user['role'];
        header("Location: index.php");
        exit;
    } else {
        $error = "ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง";
    }
}
?>
<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>เข้าสู่ระบบ - ระบบคลังผลงานดิจิทัล</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
    <style>body { font-family: 'Sarabun', sans-serif; }</style>
</head>
<body class="bg-slate-50 flex items-center justify-center min-h-screen p-4">
    <div class="w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-100 p-8 space-y-6">
        <div class="text-center space-y-2">
            <h1 class="text-2xl font-extrabold text-blue-900">เข้าสู่ระบบหลังบ้าน</h1>
            <p class="text-xs text-gray-500">ระบบประกันคุณภาพและคลังสะสมผลงานดิจิทัล</p>
        </div>

        <?php if(!empty($error)): ?>
            <div class="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">
                <?php echo $error; ?>
            </div>
        <?php endif; ?>

        <form method="POST" class="space-y-4 text-left">
            <div>
                <label class="text-xs font-bold text-gray-600 block mb-1">ชื่อผู้ใช้งาน (Username)</label>
                <input type="text" name="username" required placeholder="admin หรือ teacher1" class="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-500">
            </div>
            <div>
                <label class="text-xs font-bold text-gray-600 block mb-1">รหัสผ่าน (Password)</label>
                <input type="password" name="password" required placeholder="กรอกรหัสผ่านเพื่อติดตั้งระบบ" class="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-500">
            </div>

            <button type="submit" name="login" class="w-full py-3 bg-blue-900 hover:bg-blue-800 text-white font-bold text-sm rounded-xl cursor-pointer shadow">
                เข้าสู่ระบบ
            </button>
        </form>

        <div class="pt-4 border-t border-gray-150 text-center text-[10px] text-gray-400">
            <p>บัญชีทดสอบในระบบ:<br>
            • Admin: <strong class="text-gray-600">admin</strong> / รหัสผ่าน: <strong class="text-gray-600">admin1234</strong><br>
            • Teacher: <strong class="text-gray-600">teacher1</strong> / รหัสผ่าน: <strong class="text-gray-600">teacher1234</strong></p>
        </div>
    </div>
</body>
</html>`;

export const PHP_ADD_PORTFOLIO = `<?php
// add_portfolio.php
require_once 'config.php';

if (!isset($_SESSION['user_id'])) {
    header("Location: login.php");
    exit;
}

$error = '';
$success = '';

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
    
    $id = 'item-' . time() . '-' . rand(100, 999);
    $approved = ($_SESSION['user_role'] === 'admin') ? 1 : 0;
    $createdAt = date('Y-m-d H:i:s');
    
    $query = "INSERT INTO portfolios (id, category, type, title, description, academicYear, awardDate, giver, rewardLevel, ownerName, position, department, approved, createdAt) 
              VALUES ('$id', '$category', '$type', '$title', '$description', '$academicYear', '$awardDate', '$giver', '$rewardLevel', '$ownerName', '$position', '$department', $approved, '$createdAt')";
              
    if ($conn->query($query)) {
        header("Location: index.php");
        exit;
    } else {
        $error = "เกิดข้อผิดพลาดในการบันทึกข้อมูล: " . $conn->error;
    }
}
?>
<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>บันทึกผลงานใหม่ - ระบบคลังผลงานดิจิทัล</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
    <style>body { font-family: 'Sarabun', sans-serif; }</style>
</head>
<body class="bg-slate-50 min-h-screen py-8 px-4">
    <div class="max-w-2xl mx-auto bg-white rounded-2xl shadow-xl border border-gray-100 p-8 space-y-6">
        <div class="flex items-center justify-between border-b border-gray-150 pb-4">
            <h1 class="text-xl font-extrabold text-blue-900 text-left">บันทึกผลงานใหม่</h1>
            <a href="index.php" class="text-xs text-gray-500 hover:text-blue-900 font-bold">กลับหน้าหลัก</a>
        </div>

        <?php if(!empty($error)): ?>
            <div class="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">
                <?php echo $error; ?>
            </div>
        <?php endif; ?>

        <form method="POST" class="space-y-4 text-left">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label class="text-xs font-bold text-gray-600 block mb-1">หมวดหมู่</label>
                    <select name="category" required class="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none">
                        <option value="school">ผลงานโรงเรียน</option>
                        <option value="teacher">ผลงานคุณครู</option>
                        <option value="student">ผลงานนักเรียน</option>
                    </select>
                </div>
                <div>
                    <label class="text-xs font-bold text-gray-600 block mb-1">ปีการศึกษา</label>
                    <input type="text" name="academicYear" required placeholder="เช่น 2568" class="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none">
                </div>
            </div>

            <div>
                <label class="text-xs font-bold text-gray-600 block mb-1">ชื่อผลงาน / รางวัล</label>
                <input type="text" name="title" required placeholder="ระบุชื่อเกียรติบัตร รางวัล หรือนวัตกรรม" class="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none">
            </div>

            <div>
                <label class="text-xs font-bold text-gray-600 block mb-1">รายละเอียดและหลักฐานเชิงประจักษ์</label>
                <textarea name="description" rows="3" placeholder="ระบุรายละเอียดเพิ่มเติม..." class="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none resize-none"></textarea>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label class="text-xs font-bold text-gray-600 block mb-1">ประเภทเกียรติบัตร / รางวัล</label>
                    <input type="text" name="type" required placeholder="เช่น รางวัลดีเด่น, Best Practice" class="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none">
                </div>
                <div>
                    <label class="text-xs font-bold text-gray-600 block mb-1">ระดับรางวัล</label>
                    <select name="rewardLevel" required class="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none">
                        <option value="โรงเรียน">ระดับโรงเรียน</option>
                        <option value="เครือข่าย">ระดับเครือข่ายโรงเรียน</option>
                        <option value="เขตพื้นที่">ระดับเขตพื้นที่การศึกษา</option>
                        <option value="จังหวัด">ระดับจังหวัด</option>
                        <option value="ภาค">ระดับภาค</option>
                        <option value="ประเทศ">ระดับประเทศ</option>
                    </select>
                </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label class="text-xs font-bold text-gray-600 block mb-1">ชื่อผู้รับรางวัล / ผู้ดูแล</label>
                    <input type="text" name="ownerName" required value="<?php echo htmlspecialchars($_SESSION['user_name']); ?>" class="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none">
                </div>
                <div>
                    <label class="text-xs font-bold text-gray-600 block mb-1">หน่วยงานที่มอบ</label>
                    <input type="text" name="giver" required placeholder="เช่น สพป. ประจวบคีรีขันธ์ เขต 1" class="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none">
                </div>
            </div>

            <button type="submit" name="submit" class="w-full py-3 bg-blue-900 hover:bg-blue-800 text-white font-bold text-sm rounded-xl cursor-pointer shadow">
                บันทึกผลงาน (<?php echo ($_SESSION['user_role'] === 'admin') ? 'เผยแพร่ทันที' : 'ส่งให้ Admin อนุมัติ'; ?>)
            </button>
        </form>
    </div>
</body>
</html>`;

export const PHP_LOGOUT = `<?php
// logout.php
require_once 'config.php';
session_destroy();
header("Location: index.php");
exit;
?>`;
