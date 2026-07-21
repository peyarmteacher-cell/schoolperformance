<?php
// add_portfolio.php - บันทึกผลงานเชิงประจักษ์ใหม่ลงในฐานข้อมูลโรงเรียน
require_once 'config.php';

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
    
    // ตั้งค่ารหัสผ่านหรือคีย์ประจำรายการ
    $id = 'item-' . time() . '-' . rand(100, 999);
    
    // หากเป็นผู้ดูแลระบบ (Admin) จะอนุมัติให้เผยแพร่ทันที (approved = 1) ส่วนครูทั่วไปจะส่งให้ Admin ตรวจสอบก่อน (approved = 0)
    $approved = ($_SESSION['user_role'] === 'admin') ? 1 : 0;
    $createdAt = date('Y-m-d\TH:i:s\Z');
    
    $query = "INSERT INTO portfolios (id, category, type, title, description, academicYear, awardDate, giver, rewardLevel, ownerName, position, department, approved, createdAt, attachments) 
              VALUES ('$id', '$category', '$type', '$title', '$description', '$academicYear', '$awardDate', '$giver', '$rewardLevel', '$ownerName', '$position', '$department', $approved, '$createdAt', '[]')";
              
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
        <form method="POST" class="space-y-4 text-left">
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
                    <input type="text" name="ownerName" required value="<?php echo htmlspecialchars($_SESSION['user_name']); ?>" class="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none bg-slate-100" <?php if($_SESSION['user_role'] !== 'admin') echo 'readonly'; ?>>
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

</body>
</html>
