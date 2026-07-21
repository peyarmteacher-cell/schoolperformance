export type PortfolioCategory = 'school' | 'teacher' | 'student';

export type RewardLevel = 'โรงเรียน' | 'กลุ่มโรงเรียน' | 'เขตพื้นที่' | 'จังหวัด' | 'ภาค' | 'ประเทศ';

export interface Attachment {
  id: string;
  name: string;
  type: string; // 'image/png' | 'image/jpeg' | 'application/pdf'
  url: string; // Google Drive url or base64 data url
  size?: number;
}

export interface PortfolioItem {
  id: string;
  category: PortfolioCategory;
  type: string; // e.g., 'รางวัล', 'นวัตกรรม', 'อบรม', 'วิจัย', 'กิจกรรม', 'Best Practice', 'PLC', 'Active Learning', 'โครงงาน', 'ศิลปะ', 'ลูกเสือ', 'กีฬา'
  title: string;
  description: string;
  academicYear: string; // e.g., '2568', '2569', '2570'
  awardDate: string; // YYYY-MM-DD
  giver: string; // หน่วยงานที่มอบรางวัล
  rewardLevel: RewardLevel;
  ownerName: string; // ชื่อเจ้าของผลงาน
  position: string; // ตำแหน่ง
  department: string; // กลุ่มสาระ
  studentClass: string; // ชั้นเรียน
  responsiblePerson: string; // ผู้รับผิดชอบ
  attachments: Attachment[];
  approved: boolean; // สำหรับระบบอนุมัติของ Admin
  createdAt: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'teacher';
  avatarUrl?: string;
}

export interface AppsScriptConfig {
  webAppUrl: string;
  isConnected: boolean;
}
