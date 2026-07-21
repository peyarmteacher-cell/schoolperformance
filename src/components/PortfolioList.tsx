import React, { useState } from 'react';
import { Search, Filter, Eye, Edit2, Trash2, CheckCircle2, AlertTriangle, Share2, Download, FileText, Calendar, MapPin, Award, User, RefreshCw, X, QrCode, ExternalLink, ShieldCheck } from 'lucide-react';
import { PortfolioItem, PortfolioCategory, RewardLevel, User as AppUser, Attachment } from '../types';

interface PortfolioListProps {
  items: PortfolioItem[];
  currentUser: AppUser | null;
  onEdit: (item: PortfolioItem) => void;
  onDelete: (id: string) => void;
  onApprove: (id: string, approved: boolean) => void;
  onViewItemDetail?: PortfolioItem | null;
  onClearViewItemDetail?: () => void;
  initialCategory?: string;
}

export default function PortfolioList({
  items,
  currentUser,
  onEdit,
  onDelete,
  onApprove,
  onViewItemDetail,
  onClearViewItemDetail,
  initialCategory = 'all'
}: PortfolioListProps) {
  
  // 1. ฟิลเตอร์ค้นหาหลัก
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory);
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedLevel, setSelectedLevel] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedApproval, setSelectedApproval] = useState<string>('all');

  // Modals / Lightbox State
  const [activeDetailItem, setActiveDetailItem] = useState<PortfolioItem | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [pdfViewerUrl, setPdfViewerUrl] = useState<string | null>(null);
  const [pdfViewerName, setPdfViewerName] = useState<string | null>(null);
  const [qrCodeItem, setQrCodeItem] = useState<PortfolioItem | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Sync category selection when initialCategory prop changes
  React.useEffect(() => {
    if (initialCategory) {
      setSelectedCategory(initialCategory);
    }
  }, [initialCategory]);

  // รองรับการรับพารามิเตอร์เพื่อเปิดหน้าแสดงผลทันที (เช่น ตอนกดจาก dashboard)
  React.useEffect(() => {
    if (onViewItemDetail) {
      setActiveDetailItem(onViewItemDetail);
    }
  }, [onViewItemDetail]);

  const closeDetailModal = () => {
    setActiveDetailItem(null);
    if (onClearViewItemDetail) onClearViewItemDetail();
  };

  // ดึงรายการประเภทผลงานทั้งหมดที่มีในระบบเพื่อใช้เป็นตัวกรอง
  const uniqueTypes = Array.from(new Set(items.map(item => item.type)));
  const uniqueYears = Array.from(new Set(items.map(item => item.academicYear))).sort();

  // จัดการการกรองข้อมูล
  const filteredItems = items.filter((item) => {
    const matchesSearch = 
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.ownerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.responsiblePerson.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.giver.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.department.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    const matchesYear = selectedYear === 'all' || item.academicYear === selectedYear;
    const matchesLevel = selectedLevel === 'all' || item.rewardLevel === selectedLevel;
    const matchesType = selectedType === 'all' || item.type === selectedType;
    
    let matchesApproval = true;
    if (selectedApproval === 'approved') matchesApproval = item.approved;
    else if (selectedApproval === 'pending') matchesApproval = !item.approved;

    return matchesSearch && matchesCategory && matchesYear && matchesLevel && matchesType && matchesApproval;
  });

  const getCategoryColor = (cat: PortfolioCategory) => {
    switch (cat) {
      case 'school': return 'bg-blue-100 text-blue-900 border-blue-200';
      case 'teacher': return 'bg-amber-100 text-amber-900 border-amber-200';
      case 'student': return 'bg-emerald-100 text-emerald-900 border-emerald-200';
    }
  };

  const getCategoryLabel = (cat: PortfolioCategory) => {
    switch (cat) {
      case 'school': return 'ผลงานโรงเรียน';
      case 'teacher': return 'ผลงานคุณครู';
      case 'student': return 'ผลงานนักเรียน';
    }
  };

  const getCoverImage = (item: PortfolioItem) => {
    // ดึงไฟล์รูปแรกที่มี
    const imgAttach = item.attachments.find(a => a.type.startsWith('image/'));
    if (imgAttach) return imgAttach.url;

    // Default Images จาก Unsplash ที่สวยงามแยกตามประเภท
    if (item.category === 'school') {
      return 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&q=80&w=600';
    } else if (item.category === 'teacher') {
      return 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&q=80&w=600';
    } else {
      return 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&q=80&w=600';
    }
  };

  const resetFilters = () => {
    setSearchTerm('');
    setSelectedCategory('all');
    setSelectedYear('all');
    setSelectedLevel('all');
    setSelectedType('all');
    setSelectedApproval('all');
  };

  const getShareUrl = (item: PortfolioItem) => {
    return `${window.location.origin}?item=${item.id}`;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* 1. คอนโทรลบาร์: ระบบค้นหาขั้นสูงและตัวกรอง */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          
          {/* ช่องค้นหาคำสำคัญ */}
          <div className="flex-1 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="ค้นหาชื่อผลงาน, ครูผู้สอน, นักเรียน, กลุ่มสาระ, หรือหน่วยงานผู้มอบ..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-gray-50/60 border border-gray-200 rounded-xl pl-11 pr-4 py-2.5 text-sm outline-none focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={resetFilters}
              className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
              title="ล้างตัวกรองทั้งหมด"
            >
              <RefreshCw size={14} />
              <span>ล้างตัวกรอง</span>
            </button>
          </div>
        </div>

        {/* ตัวกรองดรอปดาวน์ */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 pt-2">
          
          {/* 1. หมวดหมู่ */}
          <div>
            <label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase tracking-wider">หมวดหมู่ผลงาน</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:bg-white outline-none"
            >
              <option value="all">ทั้งหมด</option>
              <option value="school">ผลงานโรงเรียน</option>
              <option value="teacher">ผลงานคุณครู</option>
              <option value="student">ผลงานนักเรียน</option>
            </select>
          </div>

          {/* 2. ปีการศึกษา */}
          <div>
            <label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase tracking-wider">ปีการศึกษา</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:bg-white outline-none"
            >
              <option value="all">ทุกปีการศึกษา</option>
              {uniqueYears.map(yr => (
                <option key={yr} value={yr}>ปี {yr}</option>
              ))}
            </select>
          </div>

          {/* 3. ระดับรางวัล */}
          <div>
            <label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase tracking-wider">ขอบเขต/ระดับรางวัล</label>
            <select
              value={selectedLevel}
              onChange={(e) => setSelectedLevel(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:bg-white outline-none"
            >
              <option value="all">ทุกระดับรางวัล</option>
              <option value="โรงเรียน">ระดับโรงเรียน</option>
              <option value="กลุ่มโรงเรียน">ระดับกลุ่มโรงเรียน</option>
              <option value="เขตพื้นที่">ระดับเขตพื้นที่</option>
              <option value="จังหวัด">ระดับจังหวัด</option>
              <option value="ภาค">ระดับภาค</option>
              <option value="ประเทศ">ระดับประเทศ</option>
            </select>
          </div>

          {/* 4. ประเภทกิจกรรมเด่น */}
          <div>
            <label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase tracking-wider">ประเภทผลงาน</label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:bg-white outline-none truncate"
            >
              <option value="all">ทุกประเภท</option>
              {uniqueTypes.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {/* 5. สถานะการอนุมัติ (แอดมินหรือทั่วไป) */}
          <div className="col-span-2 sm:col-span-1">
            <label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase tracking-wider">สถานะอนุมัติ</label>
            <select
              value={selectedApproval}
              onChange={(e) => setSelectedApproval(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:bg-white outline-none"
            >
              <option value="all">แสดงผลทั้งหมด</option>
              <option value="approved">อนุมัติแล้ว (คลังหลัก)</option>
              <option value="pending">รอการอนุมัติ</option>
            </select>
          </div>

        </div>
      </div>

      {/* 2. สรุปจำนวนการค้นพบ */}
      <div className="flex justify-between items-center px-2">
        <p className="text-xs text-gray-500">
          ค้นพบผลงานเชิงประจักษ์ทั้งหมด <span className="font-bold text-blue-900">{filteredItems.length}</span> จาก {items.length} รายการ
        </p>
      </div>

      {/* 3. การแสดงผลแบบ Grid Cards */}
      {filteredItems.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((item) => (
            <div 
              key={item.id} 
              className={`bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 border border-gray-100 flex flex-col justify-between group relative ${
                !item.approved ? 'bg-amber-50/20 border-amber-200/50' : ''
              }`}
            >
              {/* สถานะรออนุมัติริบบอน */}
              {!item.approved && (
                <div className="absolute top-3 left-3 bg-amber-500 text-blue-950 font-bold text-[10px] px-2.5 py-1 rounded-full shadow-md z-10 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-blue-950 rounded-full animate-ping"></span>
                  <span>รอคุณครูแอดมินอนุมัติ</span>
                </div>
              )}

              {/* อนุมัติแล้ว ตราแอดมินรับรอง */}
              {item.approved && (
                <div className="absolute top-3 left-3 bg-blue-900/90 backdrop-blur-sm text-amber-300 font-bold text-[9px] px-2.5 py-1 rounded-full shadow border border-amber-500/30 z-10 flex items-center gap-1">
                  <ShieldCheck size={11} className="text-amber-400" />
                  <span>สารสนเทศ SAR</span>
                </div>
              )}

              {/* Cover Image & Category Label */}
              <div className="relative h-48 overflow-hidden bg-gray-100">
                <img 
                  src={getCoverImage(item)} 
                  alt={item.title} 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent"></div>
                
                {/* Category & Year pill bottom bar */}
                <div className="absolute bottom-3 left-3 right-3 flex justify-between items-center">
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${getCategoryColor(item.category)}`}>
                    {getCategoryLabel(item.category)}
                  </span>
                  <span className="text-[10px] font-semibold text-white bg-black/40 backdrop-blur-xs px-2 py-0.5 rounded-md">
                    ปีการศึกษา {item.academicYear}
                  </span>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                
                <div className="space-y-2 text-left">
                  {/* Type and Reward level */}
                  <div className="flex flex-wrap gap-1.5 text-[10px] font-bold text-gray-500">
                    <span className="text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                      {item.type}
                    </span>
                    <span className="bg-purple-50 text-purple-700 px-2 py-0.5 rounded flex items-center gap-0.5">
                      <MapPin size={9} />
                      <span>ระดับ {item.rewardLevel}</span>
                    </span>
                  </div>

                  {/* Portfolio Title */}
                  <h3 className="text-sm font-bold text-gray-900 line-clamp-2 leading-relaxed min-h-[40px] group-hover:text-blue-900 transition-colors">
                    {item.title}
                  </h3>
                  
                  {/* Portfolio Description */}
                  <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
                    {item.description || 'ไม่มีคำอธิบายผลงานเชิงรายละเอียดเพิ่มเติม'}
                  </p>
                </div>

                {/* Sub-info: Responsible / Owner */}
                <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-gray-600 text-[11px]">
                  <div className="flex items-center gap-1.5 truncate max-w-[70%]">
                    <User size={13} className="text-gray-400 flex-shrink-0" />
                    <span className="truncate font-medium">{item.ownerName || item.responsiblePerson || 'โรงเรียนบ้านหนองหว้า'}</span>
                  </div>
                  <div className="flex items-center gap-1 text-gray-400">
                    <Calendar size={13} />
                    <span>{item.awardDate.split('-')[0]}</span>
                  </div>
                </div>

              </div>

              {/* Card Footer Actions */}
              <div className="px-5 py-3.5 bg-gray-50/70 border-t border-gray-100 flex items-center justify-between gap-1.5 rounded-b-2xl">
                <div className="flex items-center gap-1.5">
                  {/* View Details */}
                  <button
                    onClick={() => setActiveDetailItem(item)}
                    className="p-1.5 text-gray-600 hover:text-blue-900 hover:bg-white rounded-lg border border-gray-200/60 bg-white/40 shadow-sm transition-all"
                    title="ดูรายละเอียดผลงานเชิงประจักษ์"
                  >
                    <Eye size={14} />
                  </button>

                  {/* Share QR Code */}
                  <button
                    onClick={() => setQrCodeItem(item)}
                    className="p-1.5 text-gray-600 hover:text-amber-600 hover:bg-white rounded-lg border border-gray-200/60 bg-white/40 shadow-sm transition-all"
                    title="สแกน QR Code เพื่อแชร์"
                  >
                    <QrCode size={14} />
                  </button>

                  {/* Edit: เจ้าของผลงานหรือแอดมิน */}
                  {currentUser && (currentUser.role === 'admin' || currentUser.name.includes(item.ownerName) || currentUser.email === 'peyarmteacher@gmail.com') && (
                    <button
                      onClick={() => onEdit(item)}
                      className="p-1.5 text-gray-600 hover:text-indigo-600 hover:bg-white rounded-lg border border-gray-200/60 bg-white/40 shadow-sm transition-all"
                      title="แก้ไขผลงานนี้"
                    >
                      <Edit2 size={13} />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  {/* Admin Approve Button */}
                  {currentUser && currentUser.role === 'admin' && !item.approved && (
                    <button
                      onClick={() => onApprove(item.id, true)}
                      className="text-[10px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 rounded-md transition-colors"
                    >
                      อนุมัติ
                    </button>
                  )}

                  {/* Delete Button */}
                  {currentUser && currentUser.role === 'admin' && (
                    <button
                      onClick={() => setDeleteConfirmId(item.id)}
                      className="p-1.5 text-gray-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                      title="ลบข้อมูลผลงาน"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>

            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl p-12 text-center border border-gray-100 max-w-md mx-auto space-y-4">
          <div className="w-16 h-16 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center mx-auto">
            <Filter size={24} />
          </div>
          <div>
            <h3 className="font-bold text-gray-800 text-sm">ไม่พบข้อมูลผลงานที่ต้องการ</h3>
            <p className="text-xs text-gray-500 mt-1">ไม่มีข้อมูลผลงานที่สอดคล้องกับตัวกรองหรือคำสำคัญที่คุณระบุ กรุณาลองปรับเปลี่ยนตัวกรองใหม่อีกครั้ง</p>
          </div>
          <button
            onClick={resetFilters}
            className="text-xs font-semibold text-blue-900 bg-blue-50 px-4 py-2 rounded-xl hover:bg-blue-100 transition-colors"
          >
            ล้างตัวกรองและแสดงผลทั้งหมด
          </button>
        </div>
      )}

      {/* ================= MODALS AND LIGHTBOXES ================= */}

      {/* 1. Modal รายละเอียดผลงานเดี่ยว */}
      {activeDetailItem && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-900 to-indigo-950 p-5 text-white flex justify-between items-center">
              <div>
                <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${getCategoryColor(activeDetailItem.category)}`}>
                  {getCategoryLabel(activeDetailItem.category)} (ปี {activeDetailItem.academicYear})
                </span>
                <h3 className="text-sm font-bold mt-1.5 truncate max-w-[450px]">{activeDetailItem.title}</h3>
              </div>
              <button 
                onClick={closeDetailModal}
                className="p-1 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 text-left flex-1">
              
              {/* รายละเอียด */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-blue-900 uppercase tracking-wider flex items-center gap-1">
                  <Award size={14} />
                  <span>รายละเอียดและคำอธิบายผลงานเชิงประจักษ์</span>
                </h4>
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap bg-gray-50/80 p-4 rounded-xl border border-gray-100">
                  {activeDetailItem.description || 'ไม่มีคำอธิบายผลงานเพิ่มเติม'}
                </p>
              </div>

              {/* ข้อมูลทั่วไปเชิงตาราง */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                <div className="border border-gray-100 rounded-xl p-3 bg-gray-50/30">
                  <span className="text-[10px] font-semibold text-gray-400">ระดับผลงาน / ขอบเขตรางวัล</span>
                  <p className="text-sm font-bold text-gray-800 mt-0.5">ระดับ{activeDetailItem.rewardLevel}</p>
                </div>

                <div className="border border-gray-100 rounded-xl p-3 bg-gray-50/30">
                  <span className="text-[10px] font-semibold text-gray-400">หน่วยงานผู้มอบผลงาน</span>
                  <p className="text-sm font-bold text-gray-800 mt-0.5 truncate" title={activeDetailItem.giver}>{activeDetailItem.giver}</p>
                </div>

                <div className="border border-gray-100 rounded-xl p-3 bg-gray-50/30">
                  <span className="text-[10px] font-semibold text-gray-400">เจ้าของผลงาน / ผู้ร่วมจัดทำ</span>
                  <p className="text-sm font-bold text-gray-800 mt-0.5">{activeDetailItem.ownerName || 'โรงเรียนบ้านหนองหว้า'}</p>
                </div>

                <div className="border border-gray-100 rounded-xl p-3 bg-gray-50/30">
                  <span className="text-[10px] font-semibold text-gray-400">ผู้รับผิดชอบระบบ / ครูที่ปรึกษา</span>
                  <p className="text-sm font-bold text-gray-800 mt-0.5">{activeDetailItem.responsiblePerson || 'นางสาวเพียรพรรณ แสนขยัน'}</p>
                </div>

                <div className="border border-gray-100 rounded-xl p-3 bg-gray-50/30">
                  <span className="text-[10px] font-semibold text-gray-400">ตำแหน่ง / วิทยฐานะ</span>
                  <p className="text-sm font-bold text-gray-800 mt-0.5">{activeDetailItem.position || '-'}</p>
                </div>

                <div className="border border-gray-100 rounded-xl p-3 bg-gray-50/30">
                  <span className="text-[10px] font-semibold text-gray-400">กลุ่มสาระการเรียนรู้ / แผนงาน</span>
                  <p className="text-sm font-bold text-gray-800 mt-0.5">{activeDetailItem.department || '-'}</p>
                </div>

                <div className="border border-gray-100 rounded-xl p-3 bg-gray-50/30 sm:col-span-2">
                  <span className="text-[10px] font-semibold text-gray-400">วันที่ได้รับเกียรติบัตร / วันที่จัดโครงการ</span>
                  <p className="text-sm font-bold text-gray-800 mt-0.5">
                    {new Date(activeDetailItem.awardDate).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </p>
                </div>

              </div>

              {/* ไฟล์เอกสารและภาพถ่ายเชิงประจักษ์ */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-blue-900 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText size={15} />
                  <span>หลักฐานเชิงประจักษ์ & ไฟล์แนบระบบ ({activeDetailItem.attachments.length})</span>
                </h4>

                {activeDetailItem.attachments.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {activeDetailItem.attachments.map((file) => {
                      const isImage = file.type.startsWith('image/') || file.name.endsWith('.jpg') || file.name.endsWith('.jpeg') || file.name.endsWith('.png');
                      const isPdf = file.type === 'application/pdf' || file.name.endsWith('.pdf');
                      
                      return (
                        <div key={file.id} className="flex flex-col border border-gray-200 rounded-xl p-3 bg-white hover:border-gray-300 shadow-sm transition-all relative group">
                          <div className="flex items-center gap-2.5 truncate">
                            <div className={`p-2 rounded-lg ${
                              isPdf ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'
                            }`}>
                              <FileText size={18} />
                            </div>
                            <div className="truncate text-left">
                              <p className="text-xs font-bold text-gray-800 truncate" title={file.name}>{file.name}</p>
                              <span className="text-[9px] text-gray-400">{isImage ? 'ไฟล์ภาพถ่าย' : 'เอกสาร PDF'}</span>
                            </div>
                          </div>

                          {/* พรีวิวภาพย่อถ้าเป็นรูปภาพ */}
                          {isImage && file.url && file.url !== '#' && (
                            <div className="mt-2 h-20 rounded-lg overflow-hidden border border-gray-100">
                              <img src={file.url} alt={file.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            </div>
                          )}

                          {/* คอนโทรลปุ่มไฟล์แนบ */}
                          <div className="mt-2.5 pt-2 border-t border-gray-100 flex items-center justify-end gap-2">
                            {isImage && file.url && file.url !== '#' && (
                              <button
                                onClick={() => setLightboxImage(file.url)}
                                className="flex items-center gap-1 text-[10px] font-bold text-blue-900 hover:bg-blue-50 px-2 py-1 rounded"
                              >
                                <Eye size={12} />
                                <span>พรีวิวรูปภาพ</span>
                              </button>
                            )}

                            {isPdf && (
                              <button
                                onClick={() => {
                                  setPdfViewerUrl(file.url);
                                  setPdfViewerName(file.name);
                                }}
                                className="flex items-center gap-1 text-[10px] font-bold text-red-700 hover:bg-red-50 px-2 py-1 rounded"
                              >
                                <Eye size={12} />
                                <span>เปิด PDF ทันที</span>
                              </button>
                            )}

                            {file.url && file.url !== '#' && (
                              <a
                                href={file.url}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-1 text-[10px] font-bold text-gray-600 hover:bg-gray-100 px-2 py-1 rounded"
                              >
                                <Download size={12} />
                                <span>ดาวน์โหลด</span>
                              </a>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 bg-gray-50 p-4 rounded-xl border border-dashed border-gray-200">
                    ไม่มีไฟล์หลักฐานแนบไว้ในข้อมูลชุดนี้ (สามารถสแกนลิงก์แชร์เพื่อดูในเว็บได้)
                  </p>
                )}
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-between items-center rounded-b-2xl">
              <span className="text-[10px] text-gray-400">บันทึกเมื่อ: {new Date(activeDetailItem.createdAt).toLocaleDateString('th-TH')}</span>
              <button
                onClick={closeDetailModal}
                className="px-4 py-2 bg-blue-900 text-white text-xs font-bold rounded-lg hover:bg-blue-800 transition-colors"
              >
                ปิดรายละเอียด
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 2. Lightbox แสดงพรีวิวรูปเกียรติบัตร / กิจกรรม */}
      {lightboxImage && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xs flex items-center justify-center p-4">
          <button 
            onClick={() => setLightboxImage(null)}
            className="absolute top-5 right-5 p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all"
            title="ปิดหน้าต่างพรีวิว"
          >
            <X size={24} />
          </button>
          <img 
            src={lightboxImage} 
            alt="เกียรติบัตรเชิงประจักษ์" 
            className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
            referrerPolicy="no-referrer"
          />
        </div>
      )}

      {/* 3. Modal ดูเอกสาร PDF (หรือจำลองการดูไฟล์ PDF) */}
      {pdfViewerUrl && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 max-w-4xl w-full h-[85vh] overflow-hidden flex flex-col">
            
            <div className="bg-gradient-to-r from-red-700 to-red-950 p-4 text-white flex justify-between items-center">
              <div className="flex items-center gap-2">
                <FileText size={18} className="text-red-300" />
                <span className="text-xs font-bold truncate max-w-[500px]">{pdfViewerName}</span>
              </div>
              <button 
                onClick={() => {
                  setPdfViewerUrl(null);
                  setPdfViewerName(null);
                }}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* ส่วนแสดงพรีวิว PDF */}
            <div className="flex-1 bg-gray-100 p-2 relative flex items-center justify-center">
              {pdfViewerUrl === '#' ? (
                // กรณีเป็นโมเดลจำลองที่ไม่มีลิงก์จริง จะแสดงหน้ารายงานจำลองเก๋ๆ
                <div className="max-w-md bg-white p-8 rounded-xl shadow-md border border-gray-200 text-center space-y-4 m-4">
                  <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto">
                    <FileText size={28} />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-800 text-sm">การจำลองเอกสารรายงานเชิงประจักษ์ PDF</h4>
                    <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                      เนื่องจากนี่คือระบบทดลอง ไฟล์เอกสารต้นฉบับจะถูกอัพโหลดและสร้าง URL จริงลงใน Google Drive เมื่อเปิดใช้งานการเชื่อมต่อ Google Apps Script
                    </p>
                  </div>
                  <div className="border border-dashed border-gray-200 rounded-lg p-3 bg-gray-50 text-[11px] text-gray-600 text-left space-y-1">
                    <p className="font-semibold text-gray-700">🔍 ข้อดีของการต่อ Google Drive:</p>
                    <p>• เก็บเอกสารงานวิจัย คู๋มือ หรือ Best Practice แยกตามหมวดหมู่</p>
                    <p>• หน้าแสดงผลนี้จะโหลด PDF ของจริงแสดงใน iframe ทันที</p>
                    <p>• พิมพ์หรือลงลายมือชื่อดิจิทัลได้อย่างรวดเร็ว</p>
                  </div>
                  <button
                    onClick={() => {
                      setPdfViewerUrl(null);
                      setPdfViewerName(null);
                    }}
                    className="w-full py-2 bg-red-700 hover:bg-red-800 text-white text-xs font-bold rounded-lg transition-colors"
                  >
                    เข้าใจแล้ว ปิดการจำลอง
                  </button>
                </div>
              ) : (
                // PDF Viewer จริงสำหรับ Google Drive Link หรือ Data URL
                <iframe 
                  src={pdfViewerUrl.includes('drive.google.com') ? pdfViewerUrl.replace('/view', '/preview') : pdfViewerUrl} 
                  className="w-full h-full border-0 rounded-lg"
                  title="PDF Viewer"
                ></iframe>
              )}
            </div>

          </div>
        </div>
      )}

      {/* 4. Modal QR Code สำหรับแชร์ผลงาน */}
      {qrCodeItem && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 max-w-sm w-full p-6 text-center space-y-6 relative">
            
            <button 
              onClick={() => setQrCodeItem(null)}
              className="absolute top-4 right-4 p-1 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all"
            >
              <X size={18} />
            </button>

            <div className="space-y-1 text-center">
              <h3 className="font-bold text-gray-800 text-sm">QR Code แชร์หลักฐานเชิงประจักษ์</h3>
              <p className="text-xs text-gray-500">สแกนด้วยสมาร์ทโฟนเพื่อเปิดดูเอกสารและรายละเอียดผลงานนี้ทันที</p>
            </div>

            {/* QR Code Canvas / Image */}
            <div className="bg-gray-50 rounded-xl p-4 inline-block border border-gray-100">
              <img 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(getShareUrl(qrCodeItem))}`}
                alt="QR Code"
                className="w-44 h-44 mx-auto bg-white p-2 rounded shadow-sm border border-gray-200"
              />
            </div>

            <div className="space-y-2">
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-2.5 text-left text-xs text-blue-900 truncate flex items-center justify-between gap-1">
                <span className="truncate">{getShareUrl(qrCodeItem)}</span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(getShareUrl(qrCodeItem));
                    alert('คัดลอกลิงก์ผลงานไปยังคลิปบอร์ดแล้ว!');
                  }}
                  className="text-[10px] font-bold text-blue-700 bg-white border border-blue-200 px-2 py-1 rounded shadow-xs cursor-pointer flex-shrink-0 hover:bg-blue-50"
                >
                  คัดลอก
                </button>
              </div>
              <p className="text-[10px] text-gray-400 leading-relaxed">
                * มีประโยชน์อย่างยิ่งสำหรับการพิมพ์ใส่แผ่นพับสรุปผลงานวิชาการ เพื่อให้กรรมการสแกนตรวจสอบเอกสารเชิงประจักษ์ในแฟ้มสะสมผลงานจริง
              </p>
            </div>

            <button
              onClick={() => setQrCodeItem(null)}
              className="w-full py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-lg transition-colors"
            >
              ปิดการแชร์
            </button>

          </div>
        </div>
      )}

      {/* 5. ยืนยันการลบผลงาน */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 max-w-sm w-full p-6 text-center space-y-4">
            
            <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto">
              <AlertTriangle size={24} />
            </div>

            <div className="space-y-1">
              <h4 className="font-bold text-gray-800 text-sm">ยืนยันการลบข้อมูลผลงาน?</h4>
              <p className="text-xs text-gray-500 leading-relaxed">
                คุณแน่ใจหรือไม่ว่าต้องการลบข้อมูลผลงานชุดนี้รวมถึงไฟล์หลักฐานที่เชื่อมโยงใน Google Drive? การกระทำนี้ไม่สามารถย้อนกลับได้
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-lg transition-colors"
              >
                ยกเลิก
              </button>
              <button
                onClick={() => {
                  onDelete(deleteConfirmId);
                  setDeleteConfirmId(null);
                }}
                className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg transition-colors"
              >
                ยืนยันการลบข้อมูล
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
