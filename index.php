<?php
// index.php - หน้าหลักของระบบประกันคุณภาพและคลังสะสมผลงานดิจิทัล โรงเรียนบ้านหนองหว้า
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

// ดึงสถิติรวมสำหรับแผงควบคุมหลัก (Dashboard Panels)
$stat_school = $conn->query("SELECT COUNT(*) as total FROM portfolios WHERE category='school' AND approved=1")->fetch_assoc()['total'];
$stat_teacher = $conn->query("SELECT COUNT(*) as total FROM portfolios WHERE category='teacher' AND approved=1")->fetch_assoc()['total'];
$stat_student = $conn->query("SELECT COUNT(*) as total FROM portfolios WHERE category='student' AND approved=1")->fetch_assoc()['total'];
$stat_pending = $conn->query("SELECT COUNT(*) as total FROM portfolios WHERE approved=0")->fetch_assoc()['total'];

// จัดการอนุมัติผลงาน (เฉพาะ Admin)
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
                <div class="w-12 h-12 bg-white rounded-2xl p-1 shadow-inner flex items-center justify-center flex-shrink-0">
                    <span class="text-blue-950 font-black text-lg">NHW</span>
                </div>
                <div>
                    <h1 class="text-base md:text-lg font-bold text-amber-400">ระบบประกันคุณภาพและคลังสะสมผลงานดิจิทัล</h1>
                    <p class="text-[10px] md:text-xs text-blue-200">โรงเรียนบ้านหนองหว้า (Ban Nong Wa School)</p>
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
            <div class="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-2xl flex items-center gap-2">
                <span>✅</span>
                <span>ทำรายการสำเร็จเรียบร้อยแล้ว!</span>
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
