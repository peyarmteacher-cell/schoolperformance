import React, { useState } from 'react';
import { FileSpreadsheet, Printer, Download, Filter, FileText, BarChart2, CheckCircle2, Award, Calendar, ChevronRight } from 'lucide-react';
import { PortfolioItem, PortfolioCategory } from '../types';

interface ReportPanelProps {
  items: PortfolioItem[];
}

export default function ReportPanel({ items }: ReportPanelProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedYear, setSelectedYear] = useState<string>('all');

  // รายการปีทั้งหมดในระบบ
  const uniqueYears = Array.from(new Set(items.map(item => item.academicYear))).sort();

  // กรองตามเงื่อนไขเพื่อออกรายงาน
  const filteredItems = items.filter(item => {
    const matchesCat = selectedCategory === 'all' || item.category === selectedCategory;
    const matchesYr = selectedYear === 'all' || item.academicYear === selectedYear;
    return matchesCat && matchesYr;
  });

  // สรุปสถิติรายงาน
  const totalCount = filteredItems.length;
  const approvedCount = filteredItems.filter(i => i.approved).length;
  const pendingCount = totalCount - approvedCount;
  
  // นับจำนวนระดับรางวัล
  const levelsCount = {
    'โรงเรียน': filteredItems.filter(i => i.rewardLevel === 'โรงเรียน').length,
    'กลุ่มโรงเรียน': filteredItems.filter(i => i.rewardLevel === 'กลุ่มโรงเรียน').length,
    'เขตพื้นที่': filteredItems.filter(i => i.rewardLevel === 'เขตพื้นที่').length,
    'จังหวัด': filteredItems.filter(i => i.rewardLevel === 'จังหวัด').length,
    'ภาค': filteredItems.filter(i => i.rewardLevel === 'ภาค').length,
    'ประเทศ': filteredItems.filter(i => i.rewardLevel === 'ประเทศ').length,
  };

  // ฟังก์ชันดาวน์โหลดเป็น Excel (รูปแบบ CSV ที่รองรับอักษรภาษาไทยใน Excel)
  const exportToCSV = () => {
    const headers = [
      'รหัสระบบ', 'หมวดหมู่', 'ประเภทผลงาน', 'ชื่อผลงาน/รางวัล', 
      'ปีการศึกษา', 'วันที่ได้รับ', 'หน่วยงานที่มอบ', 'ระดับรางวัล', 
      'ชื่อผู้รับ/เจ้าของผลงาน', 'ตำแหน่ง', 'กลุ่มสาระ/แผนก', 'ระดับชั้น', 
      'ผู้รับผิดชอบหลัก', 'สถานะการอนุมัติ', 'วันที่บันทึกระบบ'
    ];

    const rows = filteredItems.map(item => [
      item.id,
      item.category === 'school' ? 'ผลงานโรงเรียน' : item.category === 'teacher' ? 'ผลงานคุณครู' : 'ผลงานนักเรียน',
      item.type,
      `"${item.title.replace(/"/g, '""')}"`,
      item.academicYear,
      item.awardDate,
      `"${item.giver.replace(/"/g, '""')}"`,
      item.rewardLevel,
      `"${item.ownerName.replace(/"/g, '""')}"`,
      `"${item.position.replace(/"/g, '""')}"`,
      `"${item.department.replace(/"/g, '""')}"`,
      `"${item.studentClass.replace(/"/g, '""')}"`,
      `"${item.responsiblePerson.replace(/"/g, '""')}"`,
      item.approved ? 'อนุมัติแล้ว' : 'รอการตรวจสอบ',
      item.createdAt
    ]);

    // สร้างเนื้อหา CSV และเติม \uFEFF (UTF-8 BOM) เพื่อไม่ให้อักษรไทยเพี้ยนใน MS Excel
    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    // ตั้งชื่อไฟล์รายงานแยกตามปีการศึกษาและหมวดหมู่
    const catLabel = selectedCategory === 'school' ? 'ผลงานโรงเรียน' : selectedCategory === 'teacher' ? 'ผลงานครู' : selectedCategory === 'student' ? 'ผลงานนักเรียน' : 'ผลงานรวม';
    const yearLabel = selectedYear === 'all' ? 'ทุกปี' : `ปี_${selectedYear}`;
    
    link.setAttribute('href', url);
    link.setAttribute('download', `รายงาน_คลังผลงาน_โรงเรียนบ้านหนองหว้า_${catLabel}_${yearLabel}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ฟังก์ชันพิมพ์หน้าต่างพิมพ์ (Print PDF)
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 animate-fade-in print:p-0 print:bg-white">
      
      {/* ส่วนควบคุมและฟิลเตอร์พิมพ์รายงาน - ซ่อนเมื่อสั่งพิมพ์จริง */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 print:hidden">
        
        {/* ฟิลเตอร์จัดกลุ่ม */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs font-bold text-gray-500">
            <Filter size={14} className="text-blue-900" />
            <span>ตัวกรองออกรายงาน:</span>
          </div>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold text-gray-700 focus:bg-white outline-none"
          >
            <option value="all">ทุกหมวดหมู่ (โรงเรียน/ครู/นักเรียน)</option>
            <option value="school">รายงานเฉพาะ: ผลงานโรงเรียน</option>
            <option value="teacher">รายงานเฉพาะ: ผลงานคุณครู</option>
            <option value="student">รายงานเฉพาะ: ผลงานนักเรียน</option>
          </select>

          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold text-gray-700 focus:bg-white outline-none"
          >
            <option value="all">ทุกปีการศึกษา</option>
            {uniqueYears.map(yr => (
              <option key={yr} value={yr}>ปีการศึกษา {yr}</option>
            ))}
          </select>
        </div>

        {/* ปุ่มส่งออกรายงาน */}
        <div className="flex items-center gap-2">
          {/* พิมพ์ PDF */}
          <button
            onClick={handlePrint}
            className="flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold bg-blue-900 text-white rounded-xl hover:bg-blue-800 transition-colors cursor-pointer shadow-xs"
          >
            <Printer size={15} />
            <span>พิมพ์รายงาน (PDF)</span>
          </button>

          {/* ส่งออก Excel */}
          <button
            onClick={exportToCSV}
            className="flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors cursor-pointer shadow-xs"
          >
            <FileSpreadsheet size={15} />
            <span>ส่งออกเป็น Excel (.CSV)</span>
          </button>
        </div>

      </div>

      {/* สถิติสรุปรายงาน - ซ่อนตอนพิมพ์หรือจัดสวยงามตอนพิมพ์ */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 print:hidden">
        <div className="bg-white p-4 rounded-xl border border-gray-100 flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 text-blue-900 rounded-lg">
            <FileText size={18} />
          </div>
          <div className="text-left">
            <span className="text-[10px] font-bold text-gray-400">จำนวนรายการที่กรอง</span>
            <p className="text-xl font-black text-blue-900">{totalCount} รายการ</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-100 flex items-center gap-3">
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-lg">
            <CheckCircle2 size={18} />
          </div>
          <div className="text-left">
            <span className="text-[10px] font-bold text-gray-400">อนุมัติเป็นหลักฐาน SAR</span>
            <p className="text-xl font-black text-emerald-600">{approvedCount} รายการ</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-100 flex items-center gap-3">
          <div className="p-2.5 bg-amber-50 text-amber-600 rounded-lg">
            <Award size={18} />
          </div>
          <div className="text-left">
            <span className="text-[10px] font-bold text-gray-400">รอรับรองความถูกต้อง</span>
            <p className="text-xl font-black text-amber-500">{pendingCount} รายการ</p>
          </div>
        </div>
      </div>

      {/* ================= PRINT / VIEW REPORT CONTENT ================= */}
      {/* หน้าตาเอกสารรายงานเชิงสถิติที่จะถูกจัดหน้าพิมพ์ PDF อย่างเป็นทางการ */}
      <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 print:shadow-none print:border-none print:p-0 space-y-8 text-left">
        
        {/* หัวกระดาษเอกสารทางการของโรงเรียน */}
        <div className="text-center space-y-2 border-b border-gray-200 pb-5">
          {/* ครุฑจำลองหรือโลโก้สถานศึกษา */}
          <div className="w-16 h-16 bg-blue-900 text-amber-400 rounded-full flex items-center justify-center mx-auto border border-blue-950 p-2 shadow-xs">
            <svg viewBox="0 0 100 100" className="w-full h-full fill-current">
              <path d="M50 15 L25 50 L50 85 L75 50 Z" opacity="0.1" fill="#FFFFFF" />
              <circle cx="50" cy="50" r="30" fill="none" stroke="#F59E0B" strokeWidth="3" />
              <polygon points="50,25 55,40 70,40 58,50 62,65 50,55 38,65 42,50 30,40 45,40" />
            </svg>
          </div>
          <h2 className="text-base font-black text-gray-900">
            เอกสารสรุปรายงานข้อมูลหลักฐานและผลงานเชิงประจักษ์
          </h2>
          <h3 className="text-sm font-bold text-gray-700">
            โรงเรียนบ้านหนองหว้า สังกัดสำนักงานเขตพื้นที่การศึกษาประถมศึกษา
          </h3>
          <p className="text-xs text-gray-500">
            หมวดหมู่: <span className="font-bold text-gray-800">{selectedCategory === 'all' ? 'ทุกหมวดหมู่รวม' : selectedCategory === 'school' ? 'ผลงานและรางวัลสถานศึกษา' : selectedCategory === 'teacher' ? 'ผลงานครูผู้สอน' : 'ผลงานและทักษะนักเรียน'}</span> | 
            ปีการศึกษา: <span className="font-bold text-gray-800">{selectedYear === 'all' ? 'ทุกปีการศึกษาที่จัดเก็บ' : `ปีการศึกษา ${selectedYear}`}</span>
          </p>
          <p className="text-[10px] text-gray-400 print:block hidden">
            วันที่จัดพิมพ์รายงาน: {new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })} น.
          </p>
        </div>

        {/* ย่อรายละเอียดเชิงสรุปตัวเลข (Executive Summary Block) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-gray-50/50 p-4 rounded-xl border border-gray-100 print:bg-white print:border-gray-300">
          <div className="text-center py-2 border-r border-gray-100 last:border-none print:border-gray-200">
            <p className="text-[10px] font-bold text-gray-400">ผลงานและรางวัลรวม</p>
            <p className="text-lg font-extrabold text-blue-900">{totalCount} รายการ</p>
          </div>
          <div className="text-center py-2 border-r border-gray-100 last:border-none print:border-gray-200">
            <p className="text-[10px] font-bold text-gray-400">ระดับประเทศ/ภาค</p>
            <p className="text-lg font-extrabold text-amber-600">{levelsCount['ประเทศ'] + levelsCount['ภาค']} รายการ</p>
          </div>
          <div className="text-center py-2 border-r border-gray-100 last:border-none print:border-gray-200">
            <p className="text-[10px] font-bold text-gray-400">ระดับเขตพื้นที่/จังหวัด</p>
            <p className="text-lg font-extrabold text-indigo-700">{levelsCount['เขตพื้นที่'] + levelsCount['จังหวัด']} รายการ</p>
          </div>
          <div className="text-center py-2 last:border-none">
            <p className="text-[10px] font-bold text-gray-400">ระดับโรงเรียน/กลุ่ม</p>
            <p className="text-lg font-extrabold text-emerald-600">{levelsCount['โรงเรียน'] + levelsCount['กลุ่มโรงเรียน']} รายการ</p>
          </div>
        </div>

        {/* ตารางหลักฐานผลงานแบบเป็นทางการ */}
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white print:border-gray-400">
          <table className="min-w-full divide-y divide-gray-200 text-left print:divide-gray-400">
            <thead className="bg-gray-50 text-gray-700 text-xs font-bold print:bg-gray-100">
              <tr>
                <th className="px-4 py-3 border-b border-gray-200 max-w-[40px] text-center">ที่</th>
                <th className="px-4 py-3 border-b border-gray-200 max-w-[250px]">ชื่อผลงาน / เกียรติบัตร / นวัตกรรม</th>
                <th className="px-4 py-3 border-b border-gray-200 text-center">ปีการศึกษา</th>
                <th className="px-4 py-3 border-b border-gray-200">ระดับ/ขอบเขต</th>
                <th className="px-4 py-3 border-b border-gray-200">เจ้าของผลงาน/ผู้จัดทำ</th>
                <th className="px-4 py-3 border-b border-gray-200">หน่วยงานผู้มอบผลงาน</th>
                <th className="px-4 py-3 border-b border-gray-200 text-center">หลักฐานแนบ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-[11.5px] text-gray-700 print:divide-gray-300">
              {filteredItems.length > 0 ? (
                filteredItems.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-gray-50/50 even:bg-gray-50/10">
                    <td className="px-4 py-3 border-b border-gray-100 text-center font-semibold text-gray-500">{idx + 1}</td>
                    <td className="px-4 py-3 border-b border-gray-100 font-bold text-gray-900 leading-normal max-w-[250px]">{item.title}</td>
                    <td className="px-4 py-3 border-b border-gray-100 text-center text-gray-500">{item.academicYear}</td>
                    <td className="px-4 py-3 border-b border-gray-100 text-purple-800 font-semibold">{item.rewardLevel}</td>
                    <td className="px-4 py-3 border-b border-gray-100 font-medium text-gray-800">{item.ownerName || item.responsiblePerson || 'โรงเรียนบ้านหนองหว้า'}</td>
                    <td className="px-4 py-3 border-b border-gray-100 text-gray-600">{item.giver}</td>
                    <td className="px-4 py-3 border-b border-gray-100 text-center text-gray-500 font-semibold">
                      {item.attachments.length > 0 ? `มีไฟล์ (${item.attachments.length})` : 'ไม่มีไฟล์'}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-400 italic">
                    ไม่มีข้อมูลผลงานที่สอดคล้องกับรายงานสรุปในขณะนี้
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* ช่องเซ็นรับรองเอกสารรายงาน ท้ายรายงานพิมพ์อย่างเป็นทางการ */}
        <div className="pt-16 hidden print:grid grid-cols-2 gap-8 text-center text-xs">
          
          <div className="space-y-16">
            <p className="text-gray-500">ลงชื่อ................................................................ ผู้เสนอรายงาน</p>
            <div className="text-gray-800">
              <p className="font-bold">( นางสาวเพียรพรรณ แสนขยัน )</p>
              <p className="text-gray-500 mt-0.5">ตำแหน่ง ครู คศ.2 ผู้ดูแลสารสนเทศประกันคุณภาพ</p>
            </div>
          </div>

          <div className="space-y-16">
            <p className="text-gray-500">ลงชื่อ................................................................ ผู้อนุมัติข้อมูล</p>
            <div className="text-gray-800">
              <p className="font-bold">( นายสมชาย พลดี )</p>
              <p className="text-gray-500 mt-0.5">ตำแหน่ง ผู้อำนวยการโรงเรียนบ้านหนองหว้า</p>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
