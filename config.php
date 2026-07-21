<?php
// config.php
// ไฟล์กำหนดค่าการเชื่อมต่อฐานข้อมูล MySQL สำหรับ PHP 8.0.30+

define('DB_HOST', 'localhost');
define('DB_USER', 'schoolos12_nwperformance');
define('DB_PASS', 'N!qbzz!d2r4OvDj3');
define('DB_NAME', 'schoolos12_nwperformance');

$conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);

if ($conn->connect_error) {
    die("เชื่อมต่อฐานข้อมูลล้มเหลว: " . $conn->connect_error);
}
$conn->set_charset("utf8mb4");

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// ระบบอัพเดทโครงสร้างฐานข้อมูลโดยอัตโนมัติ (Auto-Migration / Self-Healing Database)
function auto_migrate_db($conn) {
    // 1. ตารางผู้ใช้งาน
    $conn->query("CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(50) PRIMARY KEY,
      username VARCHAR(50) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(100),
      role VARCHAR(20) NOT NULL,
      avatarUrl VARCHAR(255)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    // 2. ตารางคลังสะสมผลงาน
    $conn->query("CREATE TABLE IF NOT EXISTS portfolios (
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
      certificate_img LONGTEXT,
      award_img LONGTEXT,
      owner_img LONGTEXT,
      approved TINYINT(1) DEFAULT 0,
      createdAt VARCHAR(50) NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    // 3. ตารางสำหรับบันทึกการตั้งค่าระบบ (เช่น ชื่อโรงเรียน, โลโก้, Google Drive ID)
    $conn->query("CREATE TABLE IF NOT EXISTS settings (
      setting_key VARCHAR(50) PRIMARY KEY,
      setting_value LONGTEXT
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    // ตรวจสอบและเพิ่มบัญชีผู้ใช้งานตั้งต้น หากตารางว่างเปล่า
    $check_users = $conn->query("SELECT COUNT(*) as total FROM users");
    if ($check_users && $check_users->fetch_assoc()['total'] == 0) {
        $conn->query("INSERT INTO users (id, username, password, name, email, role, avatarUrl) VALUES 
        ('user-admin', 'admin', 'admin1234', 'ผู้อำนวยการสมชาย (Admin)', 'director.somchai@nhw.ac.th', 'admin', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=150'),
        ('user-teacher', 'teacher1', 'teacher1234', 'คุณครูเพียรพรรณ (Teacher)', 'peyarmteacher@gmail.com', 'teacher', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150')");
    }

    // ตรวจสอบและเพิ่มข้อมูลตั้งค่าตั้งต้น หากตารางตั้งค่าว่างเปล่า
    $check_settings = $conn->query("SELECT COUNT(*) as total FROM settings");
    if ($check_settings && $check_settings->fetch_assoc()['total'] == 0) {
        $conn->query("INSERT INTO settings (setting_key, setting_value) VALUES 
        ('school_name', 'โรงเรียนบ้านหนองหว้า'),
        ('school_logo', ''),
        ('google_drive_folder_id', ''),
        ('google_apps_script_url', '')");
    }

    // ปรับปรุงโครงสร้างคอลัมน์ของ settings ให้เป็น LONGTEXT เสมอเพื่อความมั่นใจ
    $conn->query("ALTER TABLE settings MODIFY COLUMN setting_value LONGTEXT");

    // ตรวจสอบความสมบูรณ์ของฟิลด์เพิ่มเติมในอนาคต (เพื่อความยืดหยุ่น)
    $cols_portfolio = [
        'studentClass' => 'VARCHAR(100) AFTER department', 
        'responsiblePerson' => 'VARCHAR(100) AFTER studentClass',
        'certificate_img' => 'LONGTEXT AFTER attachments',
        'award_img' => 'LONGTEXT AFTER certificate_img',
        'owner_img' => 'LONGTEXT AFTER award_img'
    ];
    foreach ($cols_portfolio as $col_name => $col_def) {
        $check_col = $conn->query("SHOW COLUMNS FROM portfolios LIKE '$col_name'");
        if ($check_col && $check_col->num_rows == 0) {
            $conn->query("ALTER TABLE portfolios ADD COLUMN $col_name $col_def");
        }
    }
}

// เรียกใช้งานฟังก์ชัน Auto-Migration ทันทีเมื่อโหลด config.php
auto_migrate_db($conn);

// ฟังก์ชันดึงค่าตั้งค่าระบบจากฐานข้อมูล
function get_setting($conn, $key, $default = '') {
    $key_esc = $conn->real_escape_string($key);
    $res = $conn->query("SELECT setting_value FROM settings WHERE setting_key = '$key_esc'");
    if ($res && $res->num_rows > 0) {
        $row = $res->fetch_assoc();
        return !empty($row['setting_value']) ? $row['setting_value'] : $default;
    }
    return $default;
}

// ฟังก์ชันบันทึก/แก้ไขค่าตั้งค่าระบบ
function set_setting($conn, $key, $value) {
    $key_esc = $conn->real_escape_string($key);
    $value_esc = $conn->real_escape_string($value);
    $conn->query("INSERT INTO settings (setting_key, setting_value) VALUES ('$key_esc', '$value_esc') 
                  ON DUPLICATE KEY UPDATE setting_value = '$value_esc'");
}

// ฟังก์ชันอัปโหลดรูปภาพเก็บเป็นไฟล์จริง (ถ้าเขียนไฟล์ลง Server สำเร็จ) หรือแปลงเป็น Base64 (ถ้าเขียนไฟล์ไม่ได้)
function save_uploaded_image($file_field, $prefix = 'img') {
    if (!isset($_FILES[$file_field]) || $_FILES[$file_field]['error'] !== UPLOAD_ERR_OK) {
        return '';
    }

    $file_tmp = $_FILES[$file_field]['tmp_name'];
    $file_type = $_FILES[$file_field]['type'];

    if (!str_starts_with($file_type, 'image/')) {
        return '';
    }

    // สร้างโฟลเดอร์ uploads หากไม่มีในระบบ
    $uploads_dir = 'uploads';
    if (!is_dir($uploads_dir)) {
        @mkdir($uploads_dir, 0777, true);
    }

    // ลองย้ายไฟล์ไปเซฟที่เครื่องจริงก่อน
    if (is_writable($uploads_dir)) {
        $ext = pathinfo($_FILES[$file_field]['name'], PATHINFO_EXTENSION);
        if (empty($ext)) {
            $ext = str_replace('image/', '', $file_type);
            if ($ext === 'jpeg') $ext = 'jpg';
        }
        $new_filename = $prefix . '_' . time() . '_' . rand(1000, 9999) . '.' . strtolower($ext);
        $target_path = $uploads_dir . '/' . $new_filename;

        if (@move_uploaded_file($file_tmp, $target_path)) {
            return $target_path; // คืนค่าเป็นพาธไฟล์จริงบนเซิร์ฟเวอร์
        }
    }

    // หากย้ายไฟล์จริงไม่สำเร็จ (ติดสิทธิ์ของ Folder) ให้แปลงเป็น Base64 เพื่อเซฟลงฐานข้อมูลเป็นทางเลือกสำรอง (Fallback)
    $file_data = @file_get_contents($file_tmp);
    if ($file_data !== false) {
        return 'data:' . $file_type . ';base64,' . base64_encode($file_data);
    }

    return '';
}
?>
