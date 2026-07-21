import React from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { Award, BookOpen, Users, FolderCheck, Calendar, Bookmark, TrendingUp, AlertCircle, Check, Eye } from 'lucide-react';
import { PortfolioItem, User } from '../types';

interface DashboardProps {
  items: PortfolioItem[];
  currentUser: User | null;
  onApprove: (id: string, approved: boolean) => void;
  onViewItem: (item: PortfolioItem) => void;
}

export default function Dashboard({ items, currentUser, onApprove, onViewItem }: DashboardProps) {
  // 1. คำนวณข้อมูลสถิติ
  const totalCount = items.length;
  const schoolCount = items.filter(i => i.category === 'school').length;
  const teacherCount = items.filter(i => i.category === 'teacher').length;
  const studentCount = items.filter(i => i.category === 'student').length;
  const approvedCount = items.filter(i => i.approved).length;
  const pendingCount = totalCount - approvedCount;

  // ผลงานแยกตามปีการศึกษา
  const years = ['2567', '2568', '2569', '2570'];
  const yearData = years.map(yr => ({
    name: `ปี ${yr}`,
    'ผลงานโรงเรียน': items.filter(i => i.academicYear === yr && i.category === 'school').length,
    'ผลงานครู': items.filter(i => i.academicYear === yr && i.category === 'teacher').length,
    'ผลงานนักเรียน': items.filter(i => i.academicYear === yr && i.category === 'student').length,
    'รวมทั้งหมด': items.filter(i => i.academicYear === yr).length,
  }));

  // ผลงานแยกตามหมวดหมู่หลัก (สำหรับ Pie Chart)
  const categoryChartData = [
    { name: 'ผลงานโรงเรียน', value: schoolCount, color: '#1E40AF' }, // Blue
    { name: 'ผลงานครู', value: teacherCount, color: '#D97706' },     // Amber/Gold
    { name: 'ผลงานนักเรียน', value: studentCount, color: '#10B981' }   // Emerald
  ].filter(d => d.value > 0);

  // ผลงานแยกตามประเภทผลงานหลัก
  const typesMap: { [key: string]: number } = {
    'รางวัล': 0,
    'นวัตกรรม': 0,
    'อบรม/สัมมนา': 0,
    'วิจัยในชั้นเรียน': 0,
    'กิจกรรมเด่น': 0
  };

  items.forEach(item => {
    const t = item.type.toLowerCase();
    if (t.includes('รางวัล') || t.includes('ชนะเลิศ') || t.includes('เหรียญ')) {
      typesMap['รางวัล']++;
    } else if (t.includes('นวัตกรรม') || t.includes('best practice')) {
      typesMap['นวัตกรรม']++;
    } else if (t.includes('อบรม') || t.includes('เกียรติบัตรการอบรม') || t.includes('plc')) {
      typesMap['อบรม/สัมมนา']++;
    } else if (t.includes('วิจัย') || t.includes('งานวิจัย')) {
      typesMap['วิจัยในชั้นเรียน']++;
    } else {
      typesMap['กิจกรรมเด่น']++;
    }
  });

  const typeChartData = Object.keys(typesMap).map(key => ({
    name: key,
    'จำนวนผลงาน': typesMap[key]
  }));

  // ระดับรางวัล
  const levels = ['โรงเรียน', 'กลุ่มโรงเรียน', 'เขตพื้นที่', 'จังหวัด', 'ภาค', 'ประเทศ'];
  const levelData = levels.map(lvl => ({
    name: lvl,
    'จำนวน': items.filter(i => i.rewardLevel === lvl).length
  }));

  // รายการรออนุมัติ (สำหรับผู้ดูแลระบบ หรือคุณครูมาดูรายการของตนเอง)
  const pendingItems = items.filter(i => !i.approved).slice(0, 5);

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* 1. สถิติหลักแบบ Card (Overview Cards) */}
      <div>
        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <TrendingUp className="text-blue-900" size={20} />
          <span>สถิติและข้อมูลภาพรวมผลงานเชิงประจักษ์</span>
        </h2>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Total Portfolios Card */}
          <div className="bg-gradient-to-br from-blue-900 to-indigo-800 text-white p-6 rounded-2xl shadow-md border border-blue-800 relative overflow-hidden group">
            <div className="absolute right-3 bottom-1 text-white/5 group-hover:scale-110 transition-transform duration-300">
              <Award size={120} />
            </div>
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-semibold text-blue-200 uppercase tracking-wider">ผลงานทั้งหมดในระบบ</p>
                <h3 className="text-4xl font-extrabold mt-2 text-white">{totalCount}</h3>
                <p className="text-xs text-blue-100 mt-2 flex items-center gap-1.5">
                  <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
                  อนุมัติแล้ว {approvedCount} รายการ
                </p>
              </div>
              <div className="p-3 bg-white/10 rounded-xl">
                <FolderCheck size={24} className="text-amber-400" />
              </div>
            </div>
          </div>

          {/* School Portfolios Card */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between relative overflow-hidden group">
            <div className="absolute right-3 bottom-1 text-gray-100 group-hover:scale-110 transition-transform duration-300">
              <BookOpen size={100} />
            </div>
            <div className="flex justify-between items-start z-10">
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">ผลงานโรงเรียน</p>
                <h3 className="text-4xl font-extrabold mt-2 text-blue-900">{schoolCount}</h3>
                <p className="text-xs text-blue-600 mt-2 hover:underline cursor-pointer font-medium">รางวัล & นวัตกรรมสถานศึกษา</p>
              </div>
              <div className="p-3 bg-blue-50 rounded-xl text-blue-700">
                <BookOpen size={24} />
              </div>
            </div>
          </div>

          {/* Teacher Portfolios Card */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between relative overflow-hidden group">
            <div className="absolute right-3 bottom-1 text-gray-100 group-hover:scale-110 transition-transform duration-300">
              <Users size={100} />
            </div>
            <div className="flex justify-between items-start z-10">
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">ผลงานคุณครู</p>
                <h3 className="text-4xl font-extrabold mt-2 text-amber-500">{teacherCount}</h3>
                <p className="text-xs text-amber-600 mt-2 font-medium">รางวัล วิจัย สื่อนวัตกรรมการสอน</p>
              </div>
              <div className="p-3 bg-amber-50 rounded-xl text-amber-600">
                <Users size={24} />
              </div>
            </div>
          </div>

          {/* Student Portfolios Card */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between relative overflow-hidden group">
            <div className="absolute right-3 bottom-1 text-gray-100 group-hover:scale-110 transition-transform duration-300">
              <Award size={100} />
            </div>
            <div className="flex justify-between items-start z-10">
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">ผลงานนักเรียน</p>
                <h3 className="text-4xl font-extrabold mt-2 text-emerald-500">{studentCount}</h3>
                <p className="text-xs text-emerald-600 mt-2 font-medium">การแข่งขันวิชาการ กีฬา ทักษะอาชีพ</p>
              </div>
              <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600">
                <Award size={24} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. กราฟข้อมูลวิเคราะห์ (Charts Section) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Pie Chart: สัดส่วนผลงานแยกตามหมวดหมู่ */}
        <div className="lg:col-span-5 bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col h-[380px]">
          <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Bookmark className="text-blue-900" size={16} />
            <span>สัดส่วนข้อมูลผลงานแยกตามหมวดหมู่</span>
          </h3>
          <div className="flex-1 min-h-[220px]">
            {categoryChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {categoryChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value} รายการ`, 'จำนวน']} />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400 text-xs">
                ไม่มีข้อมูลแสดงผลงาน
              </div>
            )}
          </div>
        </div>

        {/* Bar Chart: ผลงานรายปีการศึกษา */}
        <div className="lg:col-span-7 bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col h-[380px]">
          <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Calendar className="text-blue-900" size={16} />
            <span>แนวโน้มผลงานจำแนกตามปีการศึกษา</span>
          </h3>
          <div className="flex-1 min-h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={yearData}
                margin={{ top: 10, right: 10, left: -20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend iconType="rect" tick={{ fontSize: 11 }} />
                <Bar dataKey="ผลงานโรงเรียน" stackId="a" fill="#1E40AF" />
                <Bar dataKey="ผลงานครู" stackId="a" fill="#D97706" />
                <Bar dataKey="ผลงานนักเรียน" stackId="a" fill="#10B981" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Horizontal Bar Chart: ผลงานจำแนกตามระดับรางวัล */}
        <div className="lg:col-span-6 bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col h-[380px]">
          <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Award className="text-blue-900" size={16} />
            <span>ระดับผลงานและขอบเขตรางวัลเชิงประจักษ์</span>
          </h3>
          <div className="flex-1 min-h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={levelData}
                margin={{ top: 10, right: 20, left: 10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="จำนวน" fill="#4F46E5" radius={[0, 4, 4, 0]}>
                  {levelData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={
                        index === 5 ? '#EF4444' : // ประเทศ (แดง)
                        index === 4 ? '#F59E0B' : // ภาค (ส้ม)
                        index === 3 ? '#1E40AF' : // จังหวัด (น้ำเงิน)
                        index === 2 ? '#3B82F6' : // เขตพื้นที่
                        index === 1 ? '#6366F1' : // กลุ่มโรงเรียน
                        '#9CA3AF' // โรงเรียน
                      } 
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bar Chart: ผลงานแยกตามประเภท */}
        <div className="lg:col-span-6 bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col h-[380px]">
          <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Bookmark className="text-blue-900" size={16} />
            <span>ประเภทผลงานที่ได้รับการจัดเก็บ</span>
          </h3>
          <div className="flex-1 min-h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={typeChartData}
                margin={{ top: 10, right: 10, left: -20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="จำนวนผลงาน" fill="#0D9488" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* 3. รายการรอการอนุมัติ (สำหรับผู้ดูแลระบบหรือหน้าสลบสิทธิ์) */}
      {pendingItems.length > 0 && (
        <div className="bg-amber-50/50 border border-amber-200/60 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-amber-900 flex items-center gap-2">
              <AlertCircle className="text-amber-600" size={18} />
              <span>รายการผลงานเข้าใหม่ (รออนุมัติหลักฐานเชิงประจักษ์) ({pendingItems.length})</span>
            </h3>
            {(!currentUser || currentUser.role !== 'admin') && (
              <span className="text-xs text-amber-700 bg-amber-100 px-2 py-0.5 rounded">
                สิทธิ์สำหรับผู้ดูแลระบบอนุมัติ
              </span>
            )}
          </div>

          <div className="overflow-x-auto rounded-xl border border-amber-200/40 bg-white">
            <table className="min-w-full divide-y divide-gray-200 text-left">
              <thead className="bg-gray-50 text-gray-700 text-xs font-semibold">
                <tr>
                  <th className="px-4 py-3">ชื่อผลงาน</th>
                  <th className="px-4 py-3">หมวดหมู่</th>
                  <th className="px-4 py-3">ปีการศึกษา</th>
                  <th className="px-4 py-3">เจ้าของผลงาน / ผู้รับผิดชอบ</th>
                  <th className="px-4 py-3 text-right">การจัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {pendingItems.map(item => (
                  <tr key={item.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="px-4 py-3.5 font-medium text-gray-900 max-w-[280px] truncate">{item.title}</td>
                    <td className="px-4 py-3.5 text-xs">
                      <span className={`px-2 py-0.5 rounded font-medium ${
                        item.category === 'school' ? 'bg-blue-50 text-blue-700' :
                        item.category === 'teacher' ? 'bg-amber-50 text-amber-700' :
                        'bg-emerald-50 text-emerald-700'
                      }`}>
                        {item.category === 'school' ? 'โรงเรียน' : item.category === 'teacher' ? 'ครู' : 'นักเรียน'}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-gray-500">ปี {item.academicYear}</td>
                    <td className="px-4 py-3.5 text-gray-600 truncate max-w-[180px]">{item.ownerName || item.responsiblePerson}</td>
                    <td className="px-4 py-3.5 text-right flex justify-end gap-2">
                      <button
                        onClick={() => onViewItem(item)}
                        className="p-1 text-gray-500 hover:text-blue-600 rounded hover:bg-gray-100"
                        title="ดูรายละเอียดผลงาน"
                      >
                        <Eye size={16} />
                      </button>
                      
                      {currentUser && currentUser.role === 'admin' && (
                        <button
                          onClick={() => onApprove(item.id, true)}
                          className="flex items-center gap-1 text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 rounded font-medium transition-colors"
                          title="อนุมัติผลงานเข้าสู่คลังหลัก"
                        >
                          <Check size={14} />
                          <span>อนุมัติ</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}
