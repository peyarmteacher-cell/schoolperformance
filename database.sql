-- database.sql
-- เลือกฐานข้อมูล schoolos12_nwperformance ใน phpMyAdmin แล้วนำเข้าไฟล์นี้เพื่อสร้างตารางทั้งหมด

-- 1. ตารางผู้ใช้งานระบบ (แอดมิน, ครู)
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(50) PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100),
  role VARCHAR(20) NOT NULL,
  avatarUrl VARCHAR(255)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. ตารางคลังสะสมผลงานและหลักฐานเชิงประจักษ์
CREATE TABLE IF NOT EXISTS portfolios (
  id VARCHAR(50) PRIMARY KEY,
  category VARCHAR(20) NOT NULL, -- school, teacher, student
  type VARCHAR(50) NOT NULL,     -- เช่น Best Practice, เกียรติบัตรดีเด่น
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
  attachments TEXT,               -- เก็บลิ้งค์แนบไฟล์ในรูปแบบ JSON array
  approved TINYINT(1) DEFAULT 0,  -- การอนุมัติ (0 = รออนุมัติ, 1 = อนุมัติแล้ว)
  createdAt VARCHAR(50) NOT NULL,
  certificate_img LONGTEXT,       -- รูปภาพเกียรติบัตร (ไฟล์/Base64)
  award_img LONGTEXT,             -- รูปภาพรับรางวัล (ไฟล์/Base64)
  owner_img LONGTEXT              -- รูปภาพคุณครูหรือนักเรียนผู้รับรางวัล (ไฟล์/Base64)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. ตารางตั้งค่าระบบ (Branding & Credentials)
CREATE TABLE IF NOT EXISTS settings (
  setting_key VARCHAR(50) PRIMARY KEY,
  setting_value LONGTEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- เพิ่มตั้งค่าเริ่มต้นของระบบอัตลักษณ์โรงเรียน
INSERT IGNORE INTO settings (setting_key, setting_value) VALUES 
('school_name', 'โรงเรียนบ้านหนองหว้า'),
('school_logo', ''),
('google_drive_folder_id', ''),
('google_apps_script_url', '');

-- เพิ่มบัญชีผู้ดูแลระบบ (Admin) และบัญชีคุณครูเริ่มต้น
INSERT IGNORE INTO users (id, username, password, name, email, role, avatarUrl)
VALUES 
('user-admin', 'admin', 'admin1234', 'ผู้อำนวยการสมชาย (Admin)', 'director.somchai@nhw.ac.th', 'admin', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=150'),
('user-teacher', 'teacher1', 'teacher1234', 'คุณครูเพียรพรรณ (Teacher)', 'peyarmteacher@gmail.com', 'teacher', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150');

-- ข้อมูลผลงานตัวอย่างโรงเรียน
INSERT IGNORE INTO portfolios (id, category, type, title, description, academicYear, awardDate, giver, rewardLevel, ownerName, position, department, studentClass, responsiblePerson, attachments, approved, createdAt, certificate_img, award_img, owner_img)
VALUES 
('sample-1', 'school', 'Best Practice', 'นวัตกรรมการอ่านออกเขียนได้ 100% ด้วยคลังสื่อ "หนองหว้าโมเดล"', 'พัฒนาระบบคลังสื่อการสอนอิเล็กทรอนิกส์เพื่อแก้ไขปัญหาภาวะถดถอยทางการเรียนรู้ มีผลสัมฤทธิ์ทางการอ่านเพิ่มขึ้นอย่างเป็นรูปธรรม', '2568', '2026-03-15', 'สำนักงานเขตพื้นที่การศึกษาประถมศึกษาประจวบคีรีขันธ์ เขต 1', 'เขตพื้นที่', 'โรงเรียนบ้านหนองหว้า', 'สถานศึกษา', 'กลุ่มสาระการเรียนรู้ภาษาไทย', 'ประถมศึกษาปีที่ 1 - 3', 'นางวิมล แสงสุวรรณ และคณะครูประถมศึกษา', '[]', 1, '2026-03-15T10:00:00Z', '', '', ''),
('sample-2', 'teacher', 'รางวัลครูดีเด่น', 'เกียรติบัตรรางวัลครูผู้สอนดีเด่น (วิทยาศาสตร์และเทคโนโลยี)', 'ได้รับรางวัลยกย่องเชิดชูเกียรติเป็นครูผู้สอนดีเด่น STEM ศึกษา ประจำปีการศึกษา 2568', '2569', '2026-01-16', 'สำนักงานเลขาธิการคุรุสภา', 'จังหวัด', 'นายณัฐพล สมบูรณ์', 'ครู คศ.2', 'กลุ่มสาระการเรียนรู้วิทยาศาสตร์และเทคโนโลยี', 'ประถมศึกษาปีที่ 4 - 6', 'นายณัฐพล สมบูรณ์', '[]', 1, '2026-01-16T09:15:00Z', '', '', '');
