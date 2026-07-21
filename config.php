<?php
// config.php
// ไฟล์กำหนดค่าการเชื่อมต่อฐานข้อมูล MySQL สำหรับ PHP 8.0.30+

define('DB_HOST', 'localhost');
define('DB_USER', 'root');
define('DB_PASS', '');
define('DB_NAME', 'school_portfolio');

$conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);

if ($conn->connect_error) {
    die("เชื่อมต่อฐานข้อมูลล้มเหลว: " . $conn->connect_error);
}
$conn->set_charset("utf8mb4");

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}
?>
