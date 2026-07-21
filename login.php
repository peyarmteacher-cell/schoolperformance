<?php
// login.php - หน้าเข้าสู่ระบบสำหรับระบบคลังสะสมผลงานดิจิทัล โรงเรียนบ้านหนองหว้า
require_once 'config.php';

// หากเข้าสู่ระบบไว้แล้ว ให้กระโดดไปหน้าหลักทันที
if (isset($_SESSION['user_id'])) {
    header("Location: index.php");
    exit;
}

$error = '';
if (isset($_POST['login'])) {
    $username = $conn->real_escape_string($_POST['username']);
    $password = $_POST['password']; // ค้นหารหัสผ่านตรงตัวในฐานข้อมูลสำหรับการสาธิต/ทดสอบใช้งาน

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
        $error = "ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง กรุณาตรวจสอบข้อมูลอีกครั้ง";
    }
}
?>
<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>เข้าสู่ระบบ - คลังสะสมผลงานโรงเรียนบ้านหนองหว้า</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
    <style>
        body { font-family: 'Sarabun', sans-serif; }
    </style>
</head>
<body class="bg-gradient-to-br from-slate-50 to-blue-50/50 min-h-screen flex items-center justify-center p-4">
    
    <div class="w-full max-w-md bg-white rounded-3xl shadow-xl border border-gray-100 p-8 space-y-6">
        
        <!-- โลโก้และหัวข้อของโรงเรียน -->
        <div class="text-center space-y-2">
            <div class="w-16 h-16 bg-blue-900 text-amber-400 rounded-3xl flex items-center justify-center text-2xl font-black mx-auto shadow-md">
                NHW
            </div>
            <h1 class="text-xl font-extrabold text-blue-900 mt-3">เข้าสู่ระบบหลังบ้าน</h1>
            <p class="text-xs text-gray-500">สำหรับคุณครูและแอดมิน เพื่อบันทึกและอนุมัติผลงานดิจิทัล</p>
        </div>

        <!-- กล่องแสดงข้อขัดข้อง -->
        <?php if(!empty($error)): ?>
            <div class="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2 text-left leading-relaxed">
                <span>⚠️</span>
                <span><?php echo $error; ?></span>
            </div>
        <?php endif; ?>

        <!-- ฟอร์มกรอกข้อมูลการเข้าสู่ระบบ -->
        <form method="POST" class="space-y-4 text-left">
            <div>
                <label class="text-xs font-bold text-gray-600 block mb-1">ชื่อผู้ใช้งาน (Username)</label>
                <input type="text" name="username" required placeholder="เช่น admin หรือ teacher1" class="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-500 bg-slate-50/50">
            </div>
            <div>
                <label class="text-xs font-bold text-gray-600 block mb-1">รหัสผ่าน (Password)</label>
                <input type="password" name="password" required placeholder="รหัสผ่านเข้าใช้ระบบ" class="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-500 bg-slate-50/50">
            </div>

            <button type="submit" name="login" class="w-full py-3 bg-blue-900 hover:bg-blue-800 text-white font-bold text-sm rounded-xl cursor-pointer shadow-md transition-all hover:scale-[1.01]">
                🔒 เข้าสู่ระบบอย่างปลอดภัย
            </button>
        </form>

        <!-- บัญชีสำหรับการทดสอบและการลงชื่อเข้าใช้เบื้องต้น -->
        <div class="pt-5 border-t border-gray-150 text-left text-[11px] text-gray-400 leading-relaxed bg-slate-50/50 p-4 rounded-xl space-y-1">
            <span class="font-bold text-gray-600 block mb-1">🔑 บัญชีเข้าทดสอบระบบ:</span>
            <p>• <strong class="text-blue-900">ผู้ดูแลระบบ:</strong> username: <code class="font-bold text-gray-700 font-mono">admin</code> / รหัสผ่าน: <code class="font-bold text-gray-700 font-mono">admin1234</code></p>
            <p>• <strong class="text-amber-700">คุณครูผู้สอน:</strong> username: <code class="font-bold text-gray-700 font-mono">teacher1</code> / รหัสผ่าน: <code class="font-bold text-gray-700 font-mono">teacher1234</code></p>
        </div>

        <div class="text-center">
            <a href="index.php" class="text-xs font-bold text-gray-400 hover:text-blue-900 transition-colors">
                ← กลับหน้าหลักเว็บไซต์โรงเรียน
            </a>
        </div>
    </div>

</body>
</html>
