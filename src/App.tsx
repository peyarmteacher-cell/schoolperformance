import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import PortfolioList from './components/PortfolioList';
import PortfolioForm from './components/PortfolioForm';
import ReportPanel from './components/ReportPanel';
import SetupGuide from './components/SetupGuide';
import Login from './components/Login';
import { 
  getItems, 
  saveItem, 
  deleteItem, 
  approveItem, 
  uploadFile, 
  getAppsScriptConfig, 
  saveAppsScriptConfig,
  getSessionUser,
  clearSessionUser
} from './services/portfolioService';
import { PortfolioItem, PortfolioCategory, User, AppsScriptConfig, Attachment } from './types';
import { Check, AlertCircle, X, Sparkles, HelpCircle } from 'lucide-react';

export default function App() {
  // 1. ระบบผู้ใช้งานจริง (ดึงจาก active session หรือเริ่มต้นเป็น null เพื่อบังคับเข้าสู่ระบบ)
  const [currentUser, setCurrentUser] = useState<User | null>(getSessionUser());

  // 2. การควบคุมแท็บและข้อมูลหลัก
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [config, setConfig] = useState<AppsScriptConfig>({ webAppUrl: '', isConnected: false });
  
  // 3. ควบคุมโมดูลการแก้ไขและเปิดดูไฟล์
  const [portfolioToEdit, setPortfolioToEdit] = useState<PortfolioItem | null>(null);
  const [viewItemDetail, setViewItemDetail] = useState<PortfolioItem | null>(null);

  // 4. ระบบแจ้งเตือน (Notifications)
  const [notification, setNotification] = useState<{
    show: boolean;
    msg: string;
    type: 'success' | 'error';
  } | null>(null);

  // โหลดพารามิเตอร์การแชร์เพื่อดึงหน้าแสดงผลตาม QR Code (Deep Linking)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const itemId = params.get('item');
    
    const loadInitialData = async () => {
      setIsLoading(true);
      try {
        const gasConfig = getAppsScriptConfig();
        setConfig(gasConfig);

        const allItems = await getItems();
        setItems(allItems);

        // หากมีการเปิดแชร์ลิ้งค์มาทางพารามิเตอร์ เช่น ?item=school-1
        if (itemId) {
          const matched = allItems.find(i => i.id === itemId);
          if (matched) {
            setViewItemDetail(matched);
            setActiveTab('list');
          }
        }
      } catch (err) {
        console.error('Failed to load portfolio items:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadInitialData();
  }, []);

  // ฟังก์ชันแสดงการแจ้งเตือน
  const triggerNotification = (msg: string, type: 'success' | 'error' = 'success') => {
    setNotification({ show: true, msg, type });
    setTimeout(() => {
      setNotification(null);
    }, 4500);
  };

  // ดึงรายการอัพเดตล่าสุด
  const refreshItems = async () => {
    try {
      const allItems = await getItems();
      setItems(allItems);
    } catch (e) {
      console.error(e);
    }
  };

  // จัดการบันทึกหรืออัพเดตผลงาน
  const handleSavePortfolio = async (itemData: Partial<PortfolioItem> & { category: PortfolioCategory }) => {
    const saved = await saveItem(itemData);
    await refreshItems();
    setPortfolioToEdit(null);
    setActiveTab('list');
    return saved;
  };

  // จัดการลบผลงาน (Admin เท่านั้น)
  const handleDeletePortfolio = async (id: string) => {
    try {
      const ok = await deleteItem(id);
      if (ok) {
        setItems(prev => prev.filter(i => i.id !== id));
        triggerNotification('ลบรายการผลงานและหลักฐานสำเร็จเรียบร้อยแล้ว', 'success');
      }
    } catch (err) {
      triggerNotification('ไม่สามารถลบผลงานได้ กรุณาลองใหม่อีกครั้ง', 'error');
    }
  };

  // จัดการอนุมัติผลงานเข้าสู่คลังหลัก
  const handleApprovePortfolio = async (id: string, approved: boolean) => {
    try {
      const ok = await approveItem(id, approved);
      if (ok) {
        setItems(prev => prev.map(i => i.id === id ? { ...i, approved } : i));
        triggerNotification(approved ? 'อนุมัติผลงานเข้าสู่สารสนเทศ SAR แล้ว' : 'ยกเลิกการอนุมัติสำเร็จ', 'success');
      }
    } catch (err) {
      triggerNotification('การเปลี่ยนสถานะอนุมัติไม่สำเร็จ', 'error');
    }
  };

  // จัดการอัพโหลดไฟล์ (รูปภาพ หรือ PDF)
  const handleUploadFile = async (category: PortfolioCategory, file: File): Promise<Attachment> => {
    return await uploadFile(category, file);
  };

  // บันทึกและทดสอบการเชื่อมต่อ Google Apps Script
  const handleSaveAppsScriptConfig = async (webAppUrl: string): Promise<boolean> => {
    try {
      // ทดสอบดึงข้อมูลสั้นๆ จาก Apps Script เพื่อเช็คความถูกต้องและ CORS
      const testUrl = `${webAppUrl}?action=getItems`;
      const res = await fetch(testUrl);
      if (res.ok) {
        const result = await res.json();
        if (result.status === 'success') {
          const newConfig = { webAppUrl, isConnected: true };
          setConfig(newConfig);
          saveAppsScriptConfig(newConfig);
          
          // โหลดข้อมูลล่าสุดจาก Google Sheets มาแสดงแทนข้อมูล Local ทันที
          setItems(result.data);
          triggerNotification('เชื่อมต่อคลังสารสนเทศ Google Cloud สำเร็จ!', 'success');
          return true;
        }
      }
      return false;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  // ยกเลิกการเชื่อมต่อสลับกลับเป็น Local Storage
  const handleDisconnectAppsScript = () => {
    const newConfig = { webAppUrl: '', isConnected: false };
    setConfig(newConfig);
    saveAppsScriptConfig(newConfig);
    refreshItems(); // โหลดข้อมูล Local คืน
    triggerNotification('ยกเลิกการเชื่อมต่อแล้ว สลับมาจัดเก็บข้อมูลในเครื่อง (LocalStorage)', 'success');
  };

  // จัดการออกจากระบบ
  const handleLogout = () => {
    clearSessionUser();
    setCurrentUser(null);
    triggerNotification('ออกจากระบบเรียบร้อยแล้ว', 'success');
  };

  const handleEditPortfolio = (item: PortfolioItem) => {
    setPortfolioToEdit(item);
    setActiveTab('form');
  };

  const handleViewItemDetail = (item: PortfolioItem) => {
    setViewItemDetail(item);
    setActiveTab('list');
  };

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <Dashboard 
            items={items} 
            currentUser={currentUser} 
            onApprove={handleApprovePortfolio} 
            onViewItem={handleViewItemDetail} 
          />
        );
      case 'list':
      case 'list_school':
      case 'list_teacher':
      case 'list_student':
        let cat = 'all';
        if (activeTab === 'list_school') cat = 'school';
        if (activeTab === 'list_teacher') cat = 'teacher';
        if (activeTab === 'list_student') cat = 'student';
        return (
          <PortfolioList
            items={items}
            currentUser={currentUser}
            onEdit={handleEditPortfolio}
            onDelete={handleDeletePortfolio}
            onApprove={handleApprovePortfolio}
            onViewItemDetail={viewItemDetail}
            onClearViewItemDetail={() => setViewItemDetail(null)}
            initialCategory={cat}
          />
        );
      case 'form':
        return (
          <PortfolioForm
            currentUser={currentUser}
            onSave={handleSavePortfolio}
            onUploadFile={handleUploadFile}
            portfolioToEdit={portfolioToEdit}
            onCancel={() => {
              setPortfolioToEdit(null);
              setActiveTab('list');
            }}
            onSuccess={(msg) => triggerNotification(msg, 'success')}
          />
        );
      case 'reports':
        return <ReportPanel items={items} />;
      case 'setup':
        return (
          <SetupGuide
            config={config}
            currentUser={currentUser}
            onSaveConfig={handleSaveAppsScriptConfig}
            onDisconnect={handleDisconnectAppsScript}
            onSuccess={(msg) => triggerNotification(msg, 'success')}
            onFailure={(msg) => triggerNotification(msg, 'error')}
          />
        );
      case 'login':
        return (
          <div className="max-w-md mx-auto py-8">
            <Login 
              onLoginSuccess={(user) => {
                setCurrentUser(user);
                triggerNotification(`เข้าสู่ระบบสำเร็จ! ยินดีต้อนรับ ${user.name}`, 'success');
                setActiveTab('dashboard');
                refreshItems();
              }}
              onFailure={(msg) => triggerNotification(msg, 'error')}
            />
          </div>
        );
      default:
        return <div className="text-center py-10">หน้าแอปพลิเคชันยังไม่พร้อมใช้งาน</div>;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/70 text-slate-900 flex flex-col font-sans relative antialiased pb-12">
      
      {/* 1. ส่วนแบนเนอร์หรือคำต้อนรับเด่นที่เห็นแรกรุ่น PWA */}
      <div className="bg-white border-b border-gray-150 py-3 px-4 text-center sm:text-left print:hidden">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <Sparkles className="text-amber-500 fill-current animate-pulse" size={16} />
            <span className="text-xs font-bold text-gray-700">
              ยินดีต้อนรับสู่แอปพลิเคชันเวอร์ชันก้าวหน้า (PWA) • โรงเรียนบ้านหนองหว้า
            </span>
          </div>
          <p className="text-[11px] text-gray-500">
            * จัดเก็บฐานข้อมูลด้วย MySQL เซิร์ฟเวอร์โรงเรียน คล่องตัว ปลอดภัย สูงสุด
          </p>
        </div>
      </div>

      {/* 2. Headerหลักรวมสัญลักษณ์โรงเรียนและสวิตช์ผู้ใช้ */}
      <Header 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        currentUser={currentUser}
        onLogout={handleLogout}
        config={config}
        onOpenConfig={() => setActiveTab('setup')}
      />

      {/* 3. ส่วนเนื้อหาหลัก (Main Content Section) */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full relative">
        {isLoading ? (
          <div className="h-[50vh] flex flex-col items-center justify-center gap-3">
            <div className="w-10 h-10 border-4 border-blue-900 border-t-amber-400 rounded-full animate-spin"></div>
            <p className="text-xs text-gray-500 font-semibold">กำลังโหลดข้อมูลระบบสารสนเทศประกันคุณภาพโรงเรียน...</p>
          </div>
        ) : (
          renderActiveTab()
        )}
      </main>

      {/* 4. การแจ้งเตือนแบบ Slide-in Float (Notifications Panel) */}
      {notification && (
        <div className="fixed bottom-5 right-5 z-50 bg-white shadow-2xl border border-gray-150 rounded-2xl p-4 flex items-start gap-3 max-w-sm animate-slide-in">
          <div className={`p-1.5 rounded-full ${
            notification.type === 'success' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
          }`}>
            {notification.type === 'success' ? <Check size={18} /> : <AlertCircle size={18} />}
          </div>
          <div className="flex-1 text-left">
            <h4 className="font-bold text-xs text-gray-800">
              {notification.type === 'success' ? 'ทำรายการสำเร็จ' : 'เกิดข้อขัดข้อง'}
            </h4>
            <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">{notification.msg}</p>
          </div>
          <button 
            onClick={() => setNotification(null)}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-50"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* 5. ฟูตเตอร์แอปพลิเคชัน (Footer Credits) */}
      <footer className="mt-auto border-t border-gray-200/60 pt-6 text-center text-[11px] text-gray-400 space-y-1.5 print:hidden">
        <p>© 2026 ระบบประกันคุณภาพและแฟ้มสะสมงานดิจิทัล โรงเรียนบ้านหนองหว้า</p>
        <p className="flex items-center justify-center gap-1">
          <span>ขับเคลื่อนด้วยระบบ</span>
          <span className="font-bold text-gray-600">Google Apps Script + Sheets + Drive API v3</span>
        </p>
      </footer>

    </div>
  );
}
