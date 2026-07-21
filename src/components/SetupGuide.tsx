import React, { useState, useEffect } from 'react';
import { 
  Copy, Check, Link2, Link2Off, HardDrive, FileText, Database, ShieldAlert, Sparkles, 
  HelpCircle, Save, CheckCircle2, ChevronRight, FileCode, AlertCircle, Download, 
  Upload, Users, UserPlus, Trash2, Key, Settings, Server, RefreshCw
} from 'lucide-react';
import { APPS_SCRIPT_CODE, SHEET_TEMPLATE_GUIDE } from '../data/appsScriptCode';
import { 
  PHP_DATABASE_SQL, 
  PHP_CONFIG, 
  PHP_INDEX, 
  PHP_LOGIN, 
  PHP_ADD_PORTFOLIO, 
  PHP_LOGOUT 
} from '../data/phpCodeTemplates';
import { AppsScriptConfig, User } from '../types';
import { 
  apiGetDBStatus, 
  apiSetupDB, 
  apiGetUsers, 
  apiAddUser, 
  apiDeleteUser 
} from '../services/portfolioService';

interface SetupGuideProps {
  config: AppsScriptConfig;
  currentUser: User;
  onSaveConfig: (webAppUrl: string) => Promise<boolean>;
  onDisconnect: () => void;
  onSuccess: (msg: string) => void;
  onFailure: (msg: string) => void;
}

export default function SetupGuide({
  config,
  currentUser,
  onSaveConfig,
  onDisconnect,
  onSuccess,
  onFailure
}: SetupGuideProps) {
  
  // Navigation for settings sub-tabs
  const [activeSubTab, setActiveSubTab] = useState<'mysql' | 'users' | 'google' | 'php'>('php');
  const [selectedPhpFile, setSelectedPhpFile] = useState<string>('index.php');
  const [copiedPhpFile, setCopiedPhpFile] = useState<boolean>(false);

  // Apps Script states
  const [webAppUrl, setWebAppUrl] = useState(config.webAppUrl);
  const [isCopied, setIsCopied] = useState(false);
  const [isTestingAppsScript, setIsTestingAppsScript] = useState(false);

  // MySQL states
  const [dbStatus, setDbStatus] = useState<any>({
    isUsingMySQL: false,
    message: 'กำลังโหลดสถานะฐานข้อมูล...',
    config: { host: '', database: '', user: '' }
  });
  const [mysqlHost, setMysqlHost] = useState('');
  const [mysqlPort, setMysqlPort] = useState(3306);
  const [mysqlUser, setMysqlUser] = useState('root');
  const [mysqlPassword, setMysqlPassword] = useState('');
  const [mysqlDatabase, setMysqlDatabase] = useState('school_portfolio');
  const [isSavingMySQL, setIsSavingMySQL] = useState(false);

  // User management states
  const [usersList, setUsersList] = useState<any[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<'admin' | 'teacher'>('teacher');
  const [isAddingUser, setIsAddingUser] = useState(false);

  // Load Database Status and User List
  const loadDatabaseAndUsers = async () => {
    try {
      const status = await apiGetDBStatus();
      setDbStatus(status);
      
      // Auto-fill form with existing config if available
      if (status.config) {
        if (status.config.host && status.config.host !== 'ไม่มี (ใช้ Offline DB ในเครื่อง)') {
          setMysqlHost(status.config.host);
        }
        if (status.config.database) {
          setMysqlDatabase(status.config.database);
        }
        if (status.config.user) {
          setMysqlUser(status.config.user);
        }
      }

      if (currentUser.role === 'admin') {
        setIsLoadingUsers(true);
        const users = await apiGetUsers();
        setUsersList(users);
        setIsLoadingUsers(false);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadDatabaseAndUsers();
  }, [currentUser]);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(APPS_SCRIPT_CODE);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
    onSuccess('คัดลอกโค้ด Google Apps Script ไปยังคลิปบอร์ดแล้ว!');
  };

  // Connect Google Apps Script
  const handleConnectAppsScript = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!webAppUrl.trim()) {
      onFailure('กรุณาระบุ URL ของ Google Apps Script Web App');
      return;
    }
    if (!webAppUrl.startsWith('https://script.google.com/')) {
      onFailure('รูปแบบ URL ไม่ถูกต้อง ต้องเริ่มต้นด้วย https://script.google.com/');
      return;
    }

    setIsTestingAppsScript(true);
    try {
      const isOk = await onSaveConfig(webAppUrl.trim());
      if (isOk) {
        onSuccess('เชื่อมต่อคลังข้อมูล Google Sheets และ Google Drive เรียบร้อยแล้ว!');
      } else {
        onFailure('เชื่อมต่อไม่สำเร็จ กรุณาตรวจสอบว่าตั้งค่าเว็บแอปเป็นแบบ "ทุกคน (Anyone)" แล้วหรือยัง');
      }
    } catch (err) {
      onFailure('เกิดข้อผิดพลาดในการตรวจสอบสิทธิ์การสื่อสารเว็บแอป');
    } finally {
      setIsTestingAppsScript(false);
    }
  };

  // Connect & Install MySQL
  const handleConnectMySQL = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mysqlHost.trim()) {
      onFailure('กรุณาระบุ Host ของฐานข้อมูล MySQL (เช่น localhost หรือ 127.0.0.1)');
      return;
    }

    setIsSavingMySQL(true);
    try {
      const result = await apiSetupDB({
        host: mysqlHost.trim(),
        port: mysqlPort,
        user: mysqlUser.trim(),
        password: mysqlPassword,
        database: mysqlDatabase.trim()
      });

      setDbStatus(result);
      if (result.isUsingMySQL) {
        onSuccess('ติดตั้งและเชื่อมต่อ MySQL Database สำเร็จ! ระบบได้สร้างตารางและอัปเดตสคีมาโดยอัตโนมัติ');
        // Refresh users list
        const users = await apiGetUsers();
        setUsersList(users);
      } else {
        onFailure(result.message || 'เชื่อมต่อ MySQL ไม่สำเร็จ กรุณาตรวจสอบรหัสผ่านหรือสถานะ Port ใน phpMyAdmin ของคุณ');
      }
    } catch (err: any) {
      onFailure(err.message || 'เกิดข้อผิดพลาดในการติดตั้งฐานข้อมูล');
    } finally {
      setIsSavingMySQL(false);
    }
  };

  // Add new user / teacher
  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim() || !newPassword.trim() || !newName.trim()) {
      onFailure('กรุณากรอกข้อมูล Username, Password และชื่อ-นามสกุลให้ครบถ้วน');
      return;
    }

    setIsAddingUser(true);
    try {
      const safeUser = await apiAddUser({
        username: newUsername.trim(),
        password: newPassword,
        name: newName.trim(),
        email: newEmail.trim(),
        role: newRole,
        avatarUrl: newRole === 'admin' 
          ? 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=150'
          : 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150'
      });

      onSuccess(`เพิ่มบัญชีผู้ใช้ "${safeUser.name}" เรียบร้อยแล้ว!`);
      // Reset form
      setNewUsername('');
      setNewPassword('');
      setNewName('');
      setNewEmail('');
      setNewRole('teacher');
      
      // Reload users
      const users = await apiGetUsers();
      setUsersList(users);
    } catch (err: any) {
      onFailure(err.message || 'ไม่สามารถเพิ่มผู้ใช้งานได้');
    } finally {
      setIsAddingUser(false);
    }
  };

  // Delete user
  const handleDeleteUser = async (id: string, name: string) => {
    if (id === currentUser.id || id === 'user-admin') {
      onFailure('คุณไม่สามารถลบบัญชีที่กำลังล็อกอินหรือบัญชีผู้ดูแลระบบหลักได้');
      return;
    }

    if (!confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบบัญชี "${name}" ออกจากระบบ?`)) {
      return;
    }

    try {
      const ok = await apiDeleteUser(id);
      if (ok) {
        onSuccess(`ลบบัญชีผู้ใช้ "${name}" สำเร็จ`);
        setUsersList(prev => prev.filter(u => u.id !== id));
      } else {
        onFailure('ลบไม่สำเร็จ');
      }
    } catch (err) {
      onFailure('เกิดข้อขัดข้องในการลบผู้ใช้งาน');
    }
  };

  const getSelectedPhpContent = (): string => {
    switch (selectedPhpFile) {
      case 'database.sql': return PHP_DATABASE_SQL;
      case 'config.php': return PHP_CONFIG;
      case 'index.php': return PHP_INDEX;
      case 'login.php': return PHP_LOGIN;
      case 'add_portfolio.php': return PHP_ADD_PORTFOLIO;
      case 'logout.php': return PHP_LOGOUT;
      default: return '';
    }
  };

  const handleDownloadFile = (filename: string, content: string) => {
    const element = document.createElement("a");
    const file = new Blob([content], { type: 'text/plain;charset=utf-8' });
    element.href = URL.createObjectURL(file);
    element.download = filename;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    onSuccess(`ดาวน์โหลดไฟล์ ${filename} เรียบร้อยแล้ว!`);
  };

  const handleCopyPhpCode = (content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedPhpFile(true);
    setTimeout(() => setCopiedPhpFile(false), 2000);
    onSuccess('คัดลอกรหัสซอร์สโค้ดเรียบร้อย!');
  };

  return (
    <div className="space-y-8 animate-fade-in text-left max-w-4xl mx-auto">
      
      {/* Settings Navigation Sub-menu */}
      <div className="bg-white rounded-2xl p-2.5 shadow-sm border border-gray-100 flex flex-wrap gap-1">
        <button
          onClick={() => setActiveSubTab('php')}
          className={`flex-1 min-w-[150px] py-3 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeSubTab === 'php'
              ? 'bg-amber-500 text-blue-950 shadow-md font-extrabold'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          <FileCode size={15} />
          <span>เวอร์ชัน PHP & MySQL (ดาวน์โหลด)</span>
        </button>

        <button
          onClick={() => setActiveSubTab('mysql')}
          className={`flex-1 min-w-[150px] py-3 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeSubTab === 'mysql'
              ? 'bg-blue-900 text-white shadow-md'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          <Database size={15} />
          <span>เชื่อมต่อ MySQL (หลังบ้าน)</span>
        </button>

        {currentUser.role === 'admin' && (
          <button
            onClick={() => setActiveSubTab('users')}
            className={`flex-1 min-w-[150px] py-3 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeSubTab === 'users'
                ? 'bg-blue-900 text-white shadow-md'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <Users size={15} />
            <span>จัดการบัญชีคุณครู ({usersList.length})</span>
          </button>
        )}

        <button
          onClick={() => setActiveSubTab('google')}
          className={`flex-1 min-w-[150px] py-3 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeSubTab === 'google'
              ? 'bg-blue-900 text-white shadow-md'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          <Server size={15} />
          <span>คู่มือ Google Apps Script</span>
        </button>
      </div>

      {/* ================= VIEW 0: PHP & MYSQL SOURCE CODE DOWNLOADS ================= */}
      {activeSubTab === 'php' && (
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-amber-500/10 to-blue-900/10 border border-amber-500/20 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row items-start gap-4">
            <div className="p-3 bg-amber-500 text-blue-950 rounded-xl">
              <FileCode size={28} />
            </div>
            <div className="space-y-2 flex-1">
              <h2 className="text-lg font-black text-blue-950">
                ระบบเวอร์ชันภาษา PHP & MySQL สำหรับติดตั้งในโรงเรียน (ระบบ Responsive)
              </h2>
              <p className="text-xs text-gray-600 leading-relaxed">
                ตามที่ท่านต้องการปรับปรุงระบบเป็น <strong className="text-blue-900">ภาษา PHP</strong> เพื่อให้ง่ายต่อการติดตั้งใช้งานในเครื่องเซิร์ฟเวอร์หรือคอมพิวเตอร์ทั่วไปของโรงเรียน (ผ่านโปรแกรม XAMPP หรือ AppServ) ทีมงานได้จัดเตรียมไฟล์ซอร์สโค้ดทั้งหมดที่มี <strong>ความสวยงามระดับพรีเมียม</strong> พร้อมดีไซน์แบบ <strong>Responsive</strong> สามารถแสดงผลและใช้งานบนโทรศัพท์มือถือ แท็บเล็ต และคอมพิวเตอร์ได้อย่างสมบูรณ์แบบ 100%!
              </p>
            </div>
          </div>

          {/* Setup steps guide */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h3 className="font-extrabold text-sm text-gray-800 mb-4 flex items-center gap-2">
              <Settings size={16} className="text-blue-900" />
              <span>ขั้นตอนการติดตั้งใช้งานด้วย XAMPP (ง่ายมากภายใน 3 นาที)</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-900 text-amber-400 font-extrabold text-xs flex items-center justify-center flex-shrink-0">1</div>
                <div className="text-xs text-gray-600">
                  <strong className="text-gray-800">ดาวน์โหลดโปรแกรม XAMPP:</strong> ติดตั้งและเปิดใช้งาน Apache และ MySQL ในคอมพิวเตอร์เซิร์ฟเวอร์โรงเรียน
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-900 text-amber-400 font-extrabold text-xs flex items-center justify-center flex-shrink-0">2</div>
                <div className="text-xs text-gray-600">
                  <strong className="text-gray-800">สร้างฐานข้อมูล:</strong> เข้าสู่ <code className="font-mono text-rose-600 bg-rose-50 px-1 py-0.2 rounded">http://localhost/phpmyadmin</code> จากนั้นสร้างฐานข้อมูลใหม่ชื่อ <code className="font-mono text-blue-900 font-semibold bg-blue-50 px-1 py-0.2 rounded">school_portfolio</code> และนำเข้าไฟล์ <strong className="text-blue-950">database.sql</strong> ด้านล่าง
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-900 text-amber-400 font-extrabold text-xs flex items-center justify-center flex-shrink-0">3</div>
                <div className="text-xs text-gray-600">
                  <strong className="text-gray-800">จัดวางไฟล์:</strong> สร้างโฟลเดอร์ชื่อ <code className="font-mono bg-slate-100 px-1 py-0.2 rounded">portfolio</code> ใน <code className="font-mono text-slate-700 font-semibold">C:/xampp/htdocs/</code> และนำไฟล์ PHP ทั้งหมดไปวางไว้
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-900 text-amber-400 font-extrabold text-xs flex items-center justify-center flex-shrink-0">4</div>
                <div className="text-xs text-gray-600">
                  <strong className="text-gray-800">เริ่มใช้งานทันที:</strong> เปิดบราวเซอร์บนมือถือหรือแท็บเล็ตในเครือข่ายเดียวกันแล้วเปิด <code className="font-mono text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded font-bold">http://[IP-เครื่องเซิร์ฟเวอร์]/portfolio</code> หรือ <code className="font-mono">localhost/portfolio</code> เพื่อเข้าสู่คลังผลงานที่สวยงามได้ทันที!
                </div>
              </div>
            </div>
          </div>

          {/* Code Downloader UI */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Sidebar file selector */}
            <div className="bg-white rounded-2xl p-5 border border-gray-100/80 shadow-sm space-y-4">
              <h3 className="font-extrabold text-xs text-gray-700 uppercase tracking-wider">
                รายการไฟล์ระบบ PHP (เลือกไฟล์ด้านล่าง)
              </h3>
              <div className="flex flex-col gap-1.5">
                {[
                  { name: 'database.sql', desc: 'โครงสร้างตารางฐานข้อมูลและบัญชี Admin', type: 'sql' },
                  { name: 'config.php', desc: 'ไฟล์เชื่อมต่อ MySQL และเซสชั่น', type: 'php' },
                  { name: 'index.php', desc: 'หน้าแรกเว็บไซต์ (สวยงาม & มีระบบกรอง)', type: 'php' },
                  { name: 'login.php', desc: 'หน้าเข้าสู่ระบบครูและผู้ดูแลระบบ', type: 'php' },
                  { name: 'add_portfolio.php', desc: 'ฟอร์มบันทึกผลงานใหม่พร้อมแยกหมวดหมู่', type: 'php' },
                  { name: 'logout.php', desc: 'สคริปต์ล้างข้อมูลออกจากระบบ', type: 'php' },
                ].map((f) => (
                  <button
                    key={f.name}
                    onClick={() => setSelectedPhpFile(f.name)}
                    className={`w-full text-left p-3 rounded-xl border transition-all flex items-center gap-3 cursor-pointer ${
                      selectedPhpFile === f.name
                        ? 'border-amber-500 bg-amber-50/40 shadow-sm'
                        : 'border-gray-100 hover:bg-gray-50'
                    }`}
                  >
                    <div className={`p-1.5 rounded-lg ${
                      f.type === 'sql' ? 'bg-indigo-100 text-indigo-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      <FileCode size={16} />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-xs font-bold text-gray-800 font-mono">{f.name}</p>
                      <p className="text-[10px] text-gray-400 truncate mt-0.5">{f.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Code preview & Action button */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col justify-between">
              <div className="bg-slate-900 p-4 flex items-center justify-between border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <span className="text-xs text-slate-400 font-mono ml-2">{selectedPhpFile}</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleCopyPhpCode(getSelectedPhpContent())}
                    className="flex items-center gap-1 bg-slate-800 text-slate-200 hover:text-white px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer border border-slate-700"
                  >
                    {copiedPhpFile ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                    <span>{copiedPhpFile ? 'คัดลอกสำเร็จ' : 'คัดลอกโค้ด'}</span>
                  </button>
                  <button
                    onClick={() => handleDownloadFile(selectedPhpFile, getSelectedPhpContent())}
                    className="flex items-center gap-1 bg-amber-500 hover:bg-amber-400 text-blue-950 px-3 py-1.5 rounded-lg text-xs font-black cursor-pointer shadow"
                  >
                    <Download size={12} />
                    <span>ดาวน์โหลดไฟล์</span>
                  </button>
                </div>
              </div>

              <div className="bg-slate-950 p-4 font-mono text-[10px] text-amber-100/90 overflow-x-auto overflow-y-auto max-h-[360px] text-left whitespace-pre leading-relaxed">
                {getSelectedPhpContent()}
              </div>

              <div className="bg-slate-50 p-3 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
                <span>⚡ โค้ดถูกเขียนขึ้นตามสถาปัตยกรรมล่าสุด มีประสิทธิภาพและปลอดภัย</span>
                <button
                  onClick={() => {
                    // Download all files sequentially
                    handleDownloadFile('database.sql', PHP_DATABASE_SQL);
                    setTimeout(() => handleDownloadFile('config.php', PHP_CONFIG), 150);
                    setTimeout(() => handleDownloadFile('index.php', PHP_INDEX), 300);
                    setTimeout(() => handleDownloadFile('login.php', PHP_LOGIN), 450);
                    setTimeout(() => handleDownloadFile('add_portfolio.php', PHP_ADD_PORTFOLIO), 600);
                    setTimeout(() => handleDownloadFile('logout.php', PHP_LOGOUT), 750);
                  }}
                  className="text-xs font-bold text-blue-900 bg-blue-50 hover:bg-blue-100 px-3 py-1 rounded cursor-pointer border border-blue-100"
                >
                  🚀 ดาวน์โหลดทุกไฟล์พร้อมกัน
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ================= VIEW 1: MYSQL & PHP_MY_ADMIN DATABASE SETUP ================= */}
      {activeSubTab === 'mysql' && (
        <div className="space-y-6">
          {/* Status Alert */}
          <div className={`rounded-2xl p-5 border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm ${
            dbStatus.isUsingMySQL
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-amber-50 text-amber-800 border-amber-200'
          }`}>
            <div className="flex items-start gap-3 text-left">
              <div className={`p-2 rounded-full mt-0.5 ${
                dbStatus.isUsingMySQL ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
              }`}>
                <Server size={20} />
              </div>
              <div>
                <h3 className="font-bold text-sm">
                  สถานะการติดตั้งระบบสารสนเทศ: {dbStatus.isUsingMySQL ? 'เชื่อมต่อฐานข้อมูล MySQL แล้ว' : 'ทำงานบนระบบจำลองชั่วคราว'}
                </h3>
                <p className="text-xs mt-1 leading-relaxed text-gray-600">
                  {dbStatus.message}
                </p>
                {dbStatus.isUsingMySQL && (
                  <div className="mt-2 text-[10px] font-mono text-emerald-700 flex flex-wrap gap-x-4">
                    <span>• Host: <strong>{dbStatus.config.host}</strong></span>
                    <span>• Database: <strong>{dbStatus.config.database}</strong></span>
                    <span>• User: <strong>{dbStatus.config.user}</strong></span>
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={loadDatabaseAndUsers}
              className="px-3.5 py-1.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer self-start md:self-auto"
            >
              <RefreshCw size={13} />
              <span>ตรวจเช็คใหม่</span>
            </button>
          </div>

          <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-gray-100 space-y-6">
            <div className="text-left">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Database className="text-blue-900" size={22} />
                <span>กำหนดรายละเอียดเชื่อมต่อฐานข้อมูล MySQL (phpMyAdmin)</span>
              </h2>
              <p className="text-xs text-gray-500 mt-1">
                สำหรับคุณครูวิชาคอมพิวเตอร์ / ผู้ดูแลระบบไอทีโรงเรียน นำข้อมูลการติดตั้ง MySQL ใน Server ของคุณหรือจำลองในเครื่องมาเชื่อมต่อเพื่อติดตั้งระบบโดยอัตโนมัติ
              </p>
            </div>

            {/* MySQL Connection Form */}
            <form onSubmit={handleConnectMySQL} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5 text-left">
                <label className="block text-xs font-bold text-gray-700">MySQL Hostname / Server IP</label>
                <input
                  type="text"
                  placeholder="เช่น localhost หรือ 127.0.0.1"
                  value={mysqlHost}
                  onChange={(e) => setMysqlHost(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs focus:bg-white focus:border-blue-500 outline-none"
                  required
                />
              </div>

              <div className="space-y-1.5 text-left">
                <label className="block text-xs font-bold text-gray-700">MySQL Port</label>
                <input
                  type="number"
                  placeholder="3306"
                  value={mysqlPort}
                  onChange={(e) => setMysqlPort(parseInt(e.target.value) || 3306)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs focus:bg-white focus:border-blue-500 outline-none"
                  required
                />
              </div>

              <div className="space-y-1.5 text-left">
                <label className="block text-xs font-bold text-gray-700">MySQL Username</label>
                <input
                  type="text"
                  placeholder="root"
                  value={mysqlUser}
                  onChange={(e) => setMysqlUser(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs focus:bg-white focus:border-blue-500 outline-none"
                  required
                />
              </div>

              <div className="space-y-1.5 text-left">
                <label className="block text-xs font-bold text-gray-700">MySQL Password</label>
                <input
                  type="password"
                  placeholder="เว้นว่างไว้หากไม่มีรหัสผ่าน"
                  value={mysqlPassword}
                  onChange={(e) => setMysqlPassword(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs focus:bg-white focus:border-blue-500 outline-none"
                />
              </div>

              <div className="space-y-1.5 text-left md:col-span-2">
                <label className="block text-xs font-bold text-gray-700">Database Name (ชื่อฐานข้อมูล)</label>
                <input
                  type="text"
                  placeholder="school_portfolio"
                  value={mysqlDatabase}
                  onChange={(e) => setMysqlDatabase(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs focus:bg-white focus:border-blue-500 outline-none"
                  required
                />
                <p className="text-[10px] text-gray-400">
                  * ระบบจะตรวจสอบและทำการ <span className="text-blue-900 font-bold">CREATE DATABASE</span> และสร้างตาราง <code className="bg-gray-100 px-1 py-0.5 rounded text-rose-600 font-mono text-[9px]">users</code>, <code className="bg-gray-100 px-1 py-0.5 rounded text-rose-600 font-mono text-[9px]">portfolios</code> ให้สำเร็จเองทั้งหมดโดยอัตโนมัติเมื่อกดบันทึก
                </p>
              </div>

              <div className="md:col-span-2 pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={isSavingMySQL}
                  className="px-6 py-3 bg-blue-900 hover:bg-blue-800 disabled:bg-blue-900/60 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow transition-colors cursor-pointer"
                >
                  {isSavingMySQL ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-amber-400 rounded-full animate-spin"></div>
                      <span>กำลังติดตั้งตารางและทดสอบเชื่อมต่อ...</span>
                    </>
                  ) : (
                    <>
                      <Save size={15} />
                      <span>บันทึก & ติดตั้ง MySQL อัตโนมัติ</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Database structure details */}
          <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-gray-100 space-y-4">
            <h3 className="font-bold text-sm text-gray-800 flex items-center gap-2">
              <FileCode size={18} className="text-blue-900" />
              <span>พิมพ์เขียวโครงสร้างตารางฐานข้อมูลอัตโนมัติ (Schema Blueprint)</span>
            </h3>
            <p className="text-xs text-gray-500 leading-normal">
              ตารางเหล่านี้จะถูกจัดสร้างและอัพเดตฟังก์ชันต่างๆ ให้เข้ากันได้โดยอัตโนมัติเมื่อระบบตรวจจับความเปลี่ยนแปลง คุณไม่จำเป็นต้อง Import ไฟล์ SQL ด้วยตัวเองใน phpMyAdmin แต่หากคุณต้องการโครงสร้างสำหรับการดีบัก นี่คือโครงสร้างหลัก:
            </p>

            <div className="relative">
              <textarea
                readOnly
                value={`-- 1. ตารางเก็บข้อมูลบัญชีผู้ใช้งาน (ผู้ดูแลระบบ และคุณครู)
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(50) PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100),
  role VARCHAR(20) NOT NULL,
  avatarUrl VARCHAR(255)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. ตารางเก็บผลงานสะสมสารสนเทศ SAR โรงเรียนบ้านหนองหว้า
CREATE TABLE IF NOT EXISTS portfolios (
  id VARCHAR(50) PRIMARY KEY,
  category VARCHAR(20) NOT NULL,          -- 'school' (โรงเรียน), 'teacher' (ครู), 'student' (นักเรียน)
  type VARCHAR(50) NOT NULL,              -- รางวัล, นวัตกรรม, วิจัย, PLC, ฯลฯ
  title VARCHAR(255) NOT NULL,            -- ชื่อผลงาน
  description TEXT,                       -- รายละเอียด
  academicYear VARCHAR(10) NOT NULL,      -- ปีการศึกษา (เช่น 2568, 2569)
  awardDate VARCHAR(20) NOT NULL,         -- วันที่ได้รับผลงาน
  giver VARCHAR(255) NOT NULL,            -- หน่วยงานที่มอบ
  rewardLevel VARCHAR(50) NOT NULL,       -- ระดับ (โรงเรียน, เขตพื้นที่, ประเทศ)
  ownerName VARCHAR(100) NOT NULL,        -- ชื่อเจ้าของผลงาน
  position VARCHAR(100),                  -- ตำแหน่ง
  department VARCHAR(100),                -- กลุ่มสาระการเรียนรู้
  studentClass VARCHAR(100),              -- ชั้นเรียน
  responsiblePerson VARCHAR(100),         -- ผู้กำกับ/ครูที่ปรึกษา
  attachments TEXT,                       -- ลิงก์ไฟล์และพรีวิวภาพถ่าย (เก็บในรูปแบบ JSON)
  approved TINYINT(1) DEFAULT 0,          -- สถานะอนุมัติ (0 = รออนุมัติ, 1 = อนุมัติเข้าคลัง SAR)
  createdAt VARCHAR(50) NOT NULL          -- วันที่สร้างระเบียน
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`}
                rows={12}
                className="w-full bg-gray-900 text-amber-100 font-mono text-[10px] p-4 rounded-xl border border-gray-800 outline-none resize-none leading-relaxed"
              />
            </div>
          </div>
        </div>
      )}

      {/* ================= VIEW 2: TEACHER USER MANAGEMENT (ADMIN ONLY) ================= */}
      {activeSubTab === 'users' && currentUser.role === 'admin' && (
        <div className="space-y-6">
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left: Add user form */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-4 lg:col-span-1 h-fit">
              <h3 className="font-bold text-sm text-gray-900 flex items-center gap-1.5">
                <UserPlus className="text-blue-900" size={18} />
                <span>เพิ่มบัญชีผู้ใช้งานใหม่</span>
              </h3>
              <p className="text-xs text-gray-500 leading-normal">
                สร้างบัญชีสำหรับคุณครูหรือทีมงานในโรงเรียน เพื่อใช้ล็อกอินเข้ามาบันทึกผลงานสะสมตามปีการศึกษา
              </p>

              <form onSubmit={handleAddUser} className="space-y-3 pt-2">
                <div className="space-y-1 text-left">
                  <label className="block text-[10px] font-bold text-gray-500 uppercase">Username (สำหรับ Login)</label>
                  <input
                    type="text"
                    placeholder="เช่น t_peyarm"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs focus:bg-white focus:border-blue-500 outline-none"
                    required
                  />
                </div>

                <div className="space-y-1 text-left">
                  <label className="block text-[10px] font-bold text-gray-500 uppercase">Password (รหัสผ่านเริ่มต้น)</label>
                  <input
                    type="password"
                    placeholder="ป้อนรหัสผ่านครู"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs focus:bg-white focus:border-blue-500 outline-none"
                    required
                  />
                </div>

                <div className="space-y-1 text-left">
                  <label className="block text-[10px] font-bold text-gray-500 uppercase">ชื่อ-นามสกุลคุณครู</label>
                  <input
                    type="text"
                    placeholder="เช่น คุณครูเพียรพรรณ แสนขยัน"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs focus:bg-white focus:border-blue-500 outline-none"
                    required
                  />
                </div>

                <div className="space-y-1 text-left">
                  <label className="block text-[10px] font-bold text-gray-500 uppercase">อีเมลติดต่อ (Email)</label>
                  <input
                    type="email"
                    placeholder="ครู@gmail.com"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs focus:bg-white focus:border-blue-500 outline-none"
                  />
                </div>

                <div className="space-y-1 text-left">
                  <label className="block text-[10px] font-bold text-gray-500 uppercase">สิทธิ์การใช้งาน (Role)</label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as any)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:bg-white outline-none"
                  >
                    <option value="teacher">คุณครูทั่วไป (Teacher)</option>
                    <option value="admin">ผู้ดูแลระบบ/แอดมิน (Admin)</option>
                  </select>
                  <p className="text-[9px] text-gray-400 leading-normal pt-1">
                    * ครูทั่วไปสามารถบันทึกและแก้ไขผลงานส่วนตัวได้ แอดมินสามารถลบ แก้ไข และกดอนุมัติผลงานเข้าสู่สารสนเทศโรงเรียน (SAR)
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={isAddingUser}
                  className="w-full py-2.5 bg-blue-900 hover:bg-blue-800 disabled:bg-blue-900/60 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                >
                  {isAddingUser ? 'กำลังจัดเก็บ...' : 'สร้างบัญชีผู้ใช้นี้'}
                </button>
              </form>
            </div>

            {/* Right: Users list */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-4 lg:col-span-2">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-sm text-gray-900 flex items-center gap-1.5">
                  <Users className="text-blue-900" size={18} />
                  <span>รายชื่อคุณครูและแอดมินในฐานข้อมูลโรงเรียน ({usersList.length})</span>
                </h3>
                <button
                  onClick={loadDatabaseAndUsers}
                  className="p-1 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-50"
                  title="รีเฟรชรายชื่อ"
                >
                  <RefreshCw size={15} />
                </button>
              </div>

              {isLoadingUsers ? (
                <div className="py-12 text-center space-y-2">
                  <div className="w-6 h-6 border-2 border-blue-900 border-t-amber-400 rounded-full animate-spin mx-auto"></div>
                  <p className="text-[11px] text-gray-500">กำลังเชื่อมต่อรายชื่อครูจากฐานข้อมูล...</p>
                </div>
              ) : usersList.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="bg-gray-50 text-gray-500 font-bold border-b border-gray-150 uppercase tracking-wider text-[10px]">
                        <th className="px-4 py-3">ครูผู้สอน</th>
                        <th className="px-4 py-3">Username</th>
                        <th className="px-4 py-3">สิทธิ์</th>
                        <th className="px-4 py-3 text-right">จัดการ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {usersList.map((user) => (
                        <tr key={user.id} className="hover:bg-gray-50/50">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              {user.avatarUrl ? (
                                <img src={user.avatarUrl} alt="" className="w-6 h-6 rounded-full object-cover" />
                              ) : (
                                <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-900 flex items-center justify-center font-bold text-[10px]">
                                  {user.name.charAt(0)}
                                </div>
                              )}
                              <div>
                                <p className="font-bold text-gray-800">{user.name}</p>
                                <p className="text-[10px] text-gray-400">{user.email || 'ไม่มีอีเมล'}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 font-mono text-[11px] font-semibold text-gray-600">{user.username}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold ${
                              user.role === 'admin' 
                                ? 'bg-rose-50 text-rose-700 border border-rose-200' 
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}>
                              {user.role === 'admin' ? 'แอดมิน' : 'คุณครู'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => handleDeleteUser(user.id, user.name)}
                              disabled={user.id === currentUser.id || user.id === 'user-admin'}
                              className="p-1.5 text-gray-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 disabled:opacity-40 transition-colors"
                              title="ลบบัญชีผู้ใช้นี้"
                            >
                              <Trash2 size={13} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-8 text-center bg-gray-50 rounded-xl text-gray-400 text-xs">
                  ไม่พบรายชื่อผู้ใช้ คาดว่าการโหลดฐานข้อมูลทำงานขัดข้อง
                </div>
              )}

            </div>

          </div>

        </div>
      )}

      {/* ================= VIEW 3: GOOGLE APPS SCRIPT MANUALS ================= */}
      {activeSubTab === 'google' && (
        <div className="space-y-6">
          {/* 1. ส่วนตั้งค่าเว็บแอปหลัก (Main Cloud Connection Control) */}
          <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-gray-100 space-y-6">
            <div className="flex flex-col md:flex-row items-start justify-between gap-4 text-left">
              <div>
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Database className="text-blue-900" size={22} />
                  <span>ตั้งค่าการเชื่อมต่อคลังข้อมูล Google Cloud</span>
                </h2>
                <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                  สลับจากระบบจัดเก็บฐานข้อมูลในเครื่อง (MySQL / JSON) ไปใช้งาน Google Sheets เป็นฐานข้อมูลร่วม และบันทึกไฟล์เกียรติบัตรตรงลง Google Drive ของคุณโดยอัตโนมัติ
                </p>
              </div>

              <div className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 ${
                config.isConnected 
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border border-amber-200'
              }`}>
                {config.isConnected ? <CheckCircle2 size={14} /> : <Link2Off size={14} />}
                <span>{config.isConnected ? 'ระบบกำลังเก็บข้อมูลบน Google Cloud' : 'ระบบใช้ Local Server DB'}</span>
              </div>
            </div>

            {/* ฟอร์มกรอกลิงก์ Web App */}
            <form onSubmit={handleConnectAppsScript} className="bg-gray-50 p-5 rounded-2xl border border-gray-100 space-y-4 text-left">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-700">
                  ป้อน URL เว็บแอป Google Apps Script (Web App URL)
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="url"
                    placeholder="https://script.google.com/macros/s/.../exec"
                    value={webAppUrl}
                    onChange={(e) => setWebAppUrl(e.target.value)}
                    disabled={config.isConnected || isTestingAppsScript}
                    className="flex-1 bg-white border border-gray-300 rounded-xl px-4 py-2.5 text-xs font-mono focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none disabled:bg-gray-100 disabled:text-gray-500"
                  />
                  {config.isConnected ? (
                    <button
                      type="button"
                      onClick={onDisconnect}
                      className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Link2Off size={15} />
                      <span>ยกเลิกการเชื่อมต่อ Google</span>
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={isTestingAppsScript}
                      className="px-6 py-2.5 bg-blue-900 hover:bg-blue-800 disabled:bg-blue-900/60 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      {isTestingAppsScript ? 'กำลังเชื่อมต่อ...' : (
                        <>
                          <Link2 size={15} />
                          <span>บันทึก & เชื่อมต่อ Google</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </form>
          </div>

          {/* 2. ขั้นตอนการติดตั้งอย่างเป็นขั้นตอน (Step-by-Step Installation Guide) */}
          <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-gray-100 space-y-6 text-left">
            <div>
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <HelpCircle className="text-blue-900" size={22} />
                <span>คู่มือการติดตั้งระบบคลังหลังบ้าน Google Sheet 5 ขั้นตอน</span>
              </h2>
              <p className="text-xs text-gray-500 mt-1">
                ใช้เวลารวมไม่เกิน 5 นาทีเพื่อเปลี่ยนโรงเรียนของคุณให้เป็นองค์กรดิจิทัล โดยมี Google Workspace เป็นคลังสำรองไฟล์ฟรี
              </p>
            </div>

            {/* Steps Grid */}
            <div className="space-y-4">
              
              {/* Step 1 */}
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-blue-900 text-amber-400 font-extrabold text-sm flex items-center justify-center flex-shrink-0 shadow-md">
                  1
                </div>
                <div className="space-y-1.5">
                  <h3 className="font-bold text-sm text-gray-800">สร้างตารางฐานข้อมูลหลักใน Google Sheet</h3>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    สร้างสเปรดชีต (Google Sheet) ใหม่ 1 ไฟล์ และตั้งชื่อชีตย่อยแผ่นแรกว่า <span className="font-bold text-blue-900">"Portfolios"</span> (ตัวพิมพ์ใหญ่ทั้งหมด) จากนั้นคัดลอกรายชื่อหัวคอลัมน์ต่อไปนี้ไปวางในบรรทัดแรก หรือปล่อยให้สคริปต์ทำงานสร้างระบบตารางให้อัตโนมัติเมื่อกดรันครั้งแรก
                  </p>
                  <pre className="bg-gray-50 p-3 rounded-lg border border-gray-200 text-[10px] text-gray-600 overflow-x-auto leading-relaxed">
                    {SHEET_TEMPLATE_GUIDE}
                  </pre>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-blue-900 text-amber-400 font-extrabold text-sm flex items-center justify-center flex-shrink-0 shadow-md">
                  2
                </div>
                <div className="space-y-1.5 flex-1">
                  <div className="flex justify-between items-center">
                    <h3 className="font-bold text-sm text-gray-800">คัดลอกสคริปต์ควบคุมระบบหลังบ้าน</h3>
                    <button
                      onClick={handleCopyCode}
                      className="flex items-center gap-1 text-[10px] font-bold text-blue-900 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded border border-blue-200 cursor-pointer"
                    >
                      {isCopied ? <CheckCircle2 size={12} className="text-emerald-600" /> : <Copy size={12} />}
                      <span>{isCopied ? 'คัดลอกแล้ว!' : 'คัดลอกโค้ดสคริปต์'}</span>
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    เปิด Google Sheets ที่สร้างขึ้น ไปที่เมนู <span className="font-bold text-gray-800">"ส่วนขยาย" (Extensions) &gt; "Apps Script"</span> ลบโค้ดเริ่มต้นออกให้หมด และกดคัดลอกโค้ดด้านล่างนี้ไปวางทั้งหมดแทนที่
                  </p>
                  <div className="relative">
                    <div className="absolute right-3 top-3 bg-gray-900 text-amber-400 font-bold text-[10px] px-2.5 py-1 rounded-md z-10 flex items-center gap-1 shadow">
                      <FileCode size={12} />
                      <span>Code.gs</span>
                    </div>
                    <textarea
                      readOnly
                      value={APPS_SCRIPT_CODE}
                      rows={6}
                      className="w-full bg-gray-900 text-amber-100 font-mono text-[10px] p-4 rounded-xl border border-gray-800 outline-none resize-none leading-relaxed"
                    />
                  </div>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-blue-900 text-amber-400 font-extrabold text-sm flex items-center justify-center flex-shrink-0 shadow-md">
                  3
                </div>
                <div className="space-y-1">
                  <h3 className="font-bold text-sm text-gray-800">ให้สิทธิ์สร้างคลังโฟลเดอร์โรงเรียนอัตโนมัติ</h3>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    คลิกเลือกฟังก์ชัน <span className="font-bold text-blue-900">"setupDatabase"</span> จากรายการฟังก์ชันด้านบนของ Apps Script จากนั้นคลิกปุ่ม <span className="font-bold text-gray-800">"เรียกใช้" (Run)</span> 
                    และทำตามขั้นตอนการให้สิทธิ์การเข้าถึงบัญชีความปลอดภัยของตัวคุณเอง ระบบจะสร้างโฟลเดอร์หลักชื่อ <span className="font-bold text-blue-900">"School Portfolio"</span> และโฟลเดอร์ย่อย 3 หมวดหมู่ใน Google Drive ของคุณโดยอัติโนมัติทันที!
                  </p>
                </div>
              </div>

              {/* Step 4 */}
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-blue-900 text-amber-400 font-extrabold text-sm flex items-center justify-center flex-shrink-0 shadow-md">
                  4
                </div>
                <div className="space-y-1">
                  <h3 className="font-bold text-sm text-gray-800">Deploy สคริปต์เป็นเว็บแอปเพื่อเปิดใช้งาน API</h3>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    คลิกปุ่มสีน้ำเงิน <span className="font-bold text-blue-900">"ทำให้ใช้งานได้" (Deploy)</span> ที่มุมขวาบนของ Apps Script &gt; เลือก <span className="font-bold text-gray-800">"การจัดการทำให้ใช้งานได้ใหม่" (New deployment)</span>
                  </p>
                  <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100/60 text-xs text-blue-950 space-y-1.5 leading-normal text-left">
                    <p>• เลือกประเภทเป็น <span className="font-bold">เว็บแอป (Web App)</span></p>
                    <p>• ตั้งค่าเรียกใช้ในฐานะ (Execute as): <span className="font-bold">ฉัน (Me - อีเมลผู้จัดทำบัญชีนี้)</span></p>
                    <p>• ตั้งค่าผู้มีสิทธิ์เข้าถึง (Who has access): <span className="font-bold text-rose-700">ทุกคน (Anyone)</span> <span className="text-gray-500">(ขั้นตอนนี้สำคัญที่สุดเพื่อให้แอปพลิเคชันจากเว็บภายนอกสามารถส่งผลงานเข้ามาได้)</span></p>
                  </div>
                </div>
              </div>

              {/* Step 5 */}
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-blue-900 text-amber-400 font-extrabold text-sm flex items-center justify-center flex-shrink-0 shadow-md">
                  5
                </div>
                <div className="space-y-1">
                  <h3 className="font-bold text-sm text-gray-800">คัดลอกลิงก์ Web App URL มาเปิดระบบ</h3>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    เมื่อบันทึกเรียบร้อย คัดลอกรหัส <span className="font-bold text-blue-900">URL เว็บแอป</span> ที่ได้ (ซึ่งจะจบด้วย <code className="font-mono text-rose-600 font-semibold">/exec</code>) 
                    นำมาวางลงในช่องป้อนข้อมูลที่ด้านบนสุดของหน้าจอนี้เพื่อเริ่มต้นความปลอดภัยและประสานการใช้งานทันที!
                  </p>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}
