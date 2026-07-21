import React, { useState, useEffect, useRef } from 'react';
import { Upload, FileText, X, Check, ArrowLeft, Loader2, AlertCircle, Plus, Info, Users } from 'lucide-react';
import { PortfolioItem, PortfolioCategory, RewardLevel, Attachment, User } from '../types';

interface PortfolioFormProps {
  currentUser: User;
  onSave: (item: Partial<PortfolioItem> & { category: PortfolioCategory }) => Promise<PortfolioItem>;
  onUploadFile: (category: PortfolioCategory, file: File) => Promise<Attachment>;
  portfolioToEdit?: PortfolioItem | null;
  onCancel: () => void;
  onSuccess: (msg: string) => void;
}

export default function PortfolioForm({
  currentUser,
  onSave,
  onUploadFile,
  portfolioToEdit,
  onCancel,
  onSuccess
}: PortfolioFormProps) {
  
  // 1. กำหนด State ของฟอร์ม
  const [category, setCategory] = useState<PortfolioCategory>('school');
  const [type, setType] = useState('รางวัล');
  const [customType, setCustomType] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [academicYear, setAcademicYear] = useState('2568');
  const [awardDate, setAwardDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [giver, setGiver] = useState('');
  const [rewardLevel, setRewardLevel] = useState<RewardLevel>('โรงเรียน');
  
  // ผู้เกี่ยวข้อง
  const [ownerName, setOwnerName] = useState('');
  const [position, setPosition] = useState('');
  const [department, setDepartment] = useState('');
  const [studentClass, setStudentClass] = useState('');
  const [responsiblePerson, setResponsiblePerson] = useState('');
  
  // ไฟล์แนบ
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<{ name: string; progress: number }[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ตัวเลือกประเภทผลงานที่นิยมแยกตามหมวดหมู่
  const typeOptions: Record<PortfolioCategory, string[]> = {
    school: ['รางวัลสถานศึกษา', 'นวัตกรรมสถานศึกษา', 'Best Practice', 'กิจกรรมเด่นของโรงเรียน', 'การแข่งขันระดับเขต/ประเทศ'],
    teacher: ['รางวัลครูดีเด่น', 'ผลงานวิชาการ', 'นวัตกรรมการสอน', 'เกียรติบัตรการอบรม', 'ผลงานวิจัยในชั้นเรียน', 'PLC', 'Active Learning'],
    student: ['รางวัลการแข่งขัน', 'เกียรติบัตร', 'ผลงานโครงงาน', 'ผลงานศิลปะ', 'ผลงานวิชาการ', 'กิจกรรมลูกเสือ', 'กีฬา']
  };

  // โหลดข้อมูลดั้งเดิมกรณีคลิก "แก้ไข"
  useEffect(() => {
    if (portfolioToEdit) {
      setCategory(portfolioToEdit.category);
      setTitle(portfolioToEdit.title);
      setDescription(portfolioToEdit.description);
      setAcademicYear(portfolioToEdit.academicYear);
      setAwardDate(portfolioToEdit.awardDate);
      setGiver(portfolioToEdit.giver);
      setRewardLevel(portfolioToEdit.rewardLevel);
      setOwnerName(portfolioToEdit.ownerName);
      setPosition(portfolioToEdit.position);
      setDepartment(portfolioToEdit.department);
      setStudentClass(portfolioToEdit.studentClass);
      setResponsiblePerson(portfolioToEdit.responsiblePerson);
      setAttachments(portfolioToEdit.attachments);
      
      // ดูประเภทว่าตรงกับลิสต์หลักไหม
      const standardTypes = typeOptions[portfolioToEdit.category];
      if (standardTypes.includes(portfolioToEdit.type)) {
        setType(portfolioToEdit.type);
        setCustomType('');
      } else {
        setType('อื่นๆ');
        setCustomType(portfolioToEdit.type);
      }
    } else {
      // โหมดเพิ่มใหม่: เซ็ตค่าเริ่มต้นตามประเภทแรกในลิสต์
      setType(typeOptions[category][0]);
    }
  }, [portfolioToEdit, category]);

  // จัดการเมื่อเปลี่ยนหมวดหมู่หลัก ให้รีเซ็ตประเภทผลงานเริ่มต้น
  const handleCategoryChange = (cat: PortfolioCategory) => {
    setCategory(cat);
    setType(typeOptions[cat][0]);
    setCustomType('');
  };

  // จัดการการอัพโหลดไฟล์
  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setErrorMsg('');

    const acceptedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
    const selectedFiles = Array.from(files).filter(f => {
      const isValid = acceptedTypes.includes(f.type);
      if (!isValid) {
        setErrorMsg('ระบบรองรับเฉพาะไฟล์รูปภาพ (JPG, PNG) และเอกสาร PDF เท่านั้น');
      }
      return isValid;
    });

    for (const file of selectedFiles) {
      // เพิ่มความน่าสนใจด้วยความก้าวหน้าการอัพโหลดแบบจำลอง
      const newUpload = { name: file.name, progress: 10 };
      setUploadingFiles(prev => [...prev, newUpload]);

      try {
        // อัปเดตความก้าวหน้าจำลอง
        const interval = setInterval(() => {
          setUploadingFiles(prev => 
            prev.map(f => f.name === file.name ? { ...f, progress: Math.min(f.progress + 20, 90) } : f)
          );
        }, 200);

        // ทำการบันทึกไฟล์ (ส่งไปยัง Drive ผ่าน service หรือแปลง base64)
        const uploadedAttachment = await onUploadFile(category, file);
        
        clearInterval(interval);
        setUploadingFiles(prev => prev.filter(f => f.name !== file.name));
        setAttachments(prev => [...prev, uploadedAttachment]);
      } catch (err) {
        setUploadingFiles(prev => prev.filter(f => f.name !== file.name));
        setErrorMsg('เกิดข้อผิดพลาดในการบันทึกหรืออัพโหลดไฟล์แนบ');
        console.error(err);
      }
    }
  };

  const removeAttachment = (id: string) => {
    setAttachments(prev => prev.filter(att => att.id !== id));
  };

  // Drag and Drop Handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
  };

  // จัดการส่งฟอร์มบันทึก
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    // วาลิดเดชันข้อมูลพื้นฐาน
    if (!title.trim()) {
      setErrorMsg('กรุณากรอกชื่อผลงาน');
      return;
    }
    if (!giver.trim()) {
      setErrorMsg('กรุณากรอกหน่วยงานที่มอบรางวัล');
      return;
    }
    
    // กำหนดประเภทผลงานจริง
    const actualType = type === 'อื่นๆ' ? customType.trim() : type;
    if (!actualType) {
      setErrorMsg('กรุณาระบุประเภทผลงาน');
      return;
    }

    setIsSubmitting(true);
    try {
      const itemToSave: Partial<PortfolioItem> & { category: PortfolioCategory } = {
        id: portfolioToEdit?.id,
        category,
        type: actualType,
        title: title.trim(),
        description: description.trim(),
        academicYear,
        awardDate,
        giver: giver.trim(),
        rewardLevel,
        ownerName: ownerName.trim(),
        position: position.trim(),
        department: department.trim(),
        studentClass: studentClass.trim(),
        responsiblePerson: responsiblePerson.trim(),
        attachments,
        approved: portfolioToEdit ? portfolioToEdit.approved : (currentUser.role === 'admin') // แอดมินสร้างอนุมัติทันที ครูสร้างรออนุมัติ
      };

      await onSave(itemToSave);
      
      const successMessage = portfolioToEdit 
        ? 'ปรับปรุงข้อมูลหลักฐานผลงานสำเร็จเรียบร้อยแล้ว' 
        : (currentUser.role === 'admin' 
            ? 'บันทึกข้อมูลผลงานใหม่สำเร็จและพร้อมเผยแพร่แล้ว'
            : 'บันทึกข้อมูลผลงานสำเร็จแล้ว (รอผู้ดูแลระบบอนุมัติเอกสารและหลักฐาน)');
      
      onSuccess(successMessage);
    } catch (err: any) {
      setErrorMsg(err.message || 'บันทึกข้อมูลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden animate-fade-in max-w-4xl mx-auto">
      
      {/* Form Header */}
      <div className="bg-gradient-to-r from-blue-900 to-indigo-950 p-6 text-white flex justify-between items-center">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <FileText size={20} className="text-amber-400" />
            <span>{portfolioToEdit ? 'แก้ไขข้อมูลผลงานและหลักฐานเชิงประจักษ์' : 'ฟอร์มบันทึกข้อมูลผลงานและหลักฐานเชิงประจักษ์'}</span>
          </h2>
          <p className="text-xs text-blue-200 mt-1">
            {portfolioToEdit ? 'แก้ไขรายละเอียดเพื่อปรับปรุงการจัดทำ SAR และประกันคุณภาพการศึกษา' : 'จัดเก็บข้อมูลเพื่อใช้รองรับการประเมินประกันคุณภาพการศึกษาของโรงเรียนบ้านหนองหว้า'}
          </p>
        </div>
        <button
          onClick={onCancel}
          className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors flex items-center gap-1.5 text-xs font-semibold"
        >
          <ArrowLeft size={16} />
          <span>กลับ</span>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-8">
        
        {/* Error Notification */}
        {errorMsg && (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-xl p-4 flex items-start gap-2.5 animate-bounce">
            <AlertCircle size={18} className="text-rose-500 mt-0.5" />
            <div className="text-sm">
              <span className="font-bold">ตรวจสอบข้อมูล: </span>
              {errorMsg}
            </div>
          </div>
        )}

        {/* 1. หมวดหมู่ผลงานหลัก (Category Tabs) */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2.5">
            1. เลือกหมวดหมู่ผลงานหลัก <span className="text-rose-500">*</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { id: 'school', label: 'ผลงานโรงเรียน (สถานศึกษา)', desc: 'รางวัล, นวัตกรรมเด่น และ Best Practice' },
              { id: 'teacher', label: 'ผลงานคุณครู', desc: 'รางวัล, ผลงานวิชาการ, แผน และงานวิจัย' },
              { id: 'student', label: 'ผลงานนักเรียน', desc: 'รางวัลแข่งขัน, ผลงานศิลปะ และโครงงาน' }
            ].map((catOpt) => (
              <button
                key={catOpt.id}
                type="button"
                onClick={() => handleCategoryChange(catOpt.id as PortfolioCategory)}
                className={`p-4 rounded-xl text-left border transition-all ${
                  category === catOpt.id
                    ? 'bg-blue-50 border-blue-600 text-blue-900 shadow-sm ring-2 ring-blue-100'
                    : 'bg-white border-gray-200 hover:border-gray-300 text-gray-700'
                }`}
              >
                <div className="font-bold text-sm">{catOpt.label}</div>
                <div className="text-[11px] text-gray-500 mt-1 leading-relaxed">{catOpt.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* 2. ข้อมูลผลงานพื้นฐาน */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-blue-900 border-b border-gray-100 pb-2 flex items-center gap-1.5">
            <Info size={16} />
            <span>2. รายละเอียดผลงานพื้นฐาน</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            
            {/* ประเภทผลงาน */}
            <div className="md:col-span-4">
              <label className="block text-xs font-bold text-gray-700 mb-1">
                ประเภทผลงาน <span className="text-rose-500">*</span>
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              >
                {typeOptions[category].map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
                <option value="อื่นๆ">อื่นๆ (ระบุเอง)</option>
              </select>
            </div>

            {/* ระบุประเภทผลงานเอง */}
            {type === 'อื่นๆ' && (
              <div className="md:col-span-8">
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  ระบุประเภทผลงานเพิ่มเติม <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="เช่น การพัฒนาคุณธรรม, ทักษะอาชีพ ฯลฯ"
                  value={customType}
                  onChange={(e) => setCustomType(e.target.value)}
                  className="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                />
              </div>
            )}

            {/* ปีการศึกษา */}
            <div className={type === 'อื่นๆ' ? 'md:col-span-4' : 'md:col-span-4'}>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                ปีการศึกษา <span className="text-rose-500">*</span>
              </label>
              <select
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
                className="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              >
                <option value="2567">2567</option>
                <option value="2568">2568</option>
                <option value="2569">2569</option>
                <option value="2570">2570</option>
              </select>
            </div>

            {/* วันที่ได้รับผลงาน */}
            <div className="md:col-span-4">
              <label className="block text-xs font-bold text-gray-700 mb-1">
                วันที่ได้รับรางวัล/ผลงาน <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={awardDate}
                onChange={(e) => setAwardDate(e.target.value)}
                className="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              />
            </div>

            {/* ชื่อผลงาน */}
            <div className="md:col-span-12">
              <label className="block text-xs font-bold text-gray-700 mb-1">
                ชื่อผลงาน / รางวัล / นวัตกรรม <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder="ระบุชื่อผลงานแบบเต็ม เช่น เกียรติบัตรรางวัลเหรียญทองครูผู้สอนดีเด่น กลุ่มสาระภาษาไทย..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              />
            </div>

            {/* หน่วยงานที่มอบ */}
            <div className="md:col-span-8">
              <label className="block text-xs font-bold text-gray-700 mb-1">
                หน่วยงานที่มอบรางวัล / สังกัดผู้จัดทำ <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder="เช่น คุรุสภา, สพฐ, สพป.ประจวบคีรีขันธ์ เขต 1"
                value={giver}
                onChange={(e) => setGiver(e.target.value)}
                className="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              />
            </div>

            {/* ระดับรางวัล */}
            <div className="md:col-span-4">
              <label className="block text-xs font-bold text-gray-700 mb-1">
                ระดับรางวัล / ระดับผลงาน <span className="text-rose-500">*</span>
              </label>
              <select
                value={rewardLevel}
                onChange={(e) => setRewardLevel(e.target.value as RewardLevel)}
                className="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              >
                <option value="โรงเรียน">โรงเรียน</option>
                <option value="กลุ่มโรงเรียน">กลุ่มโรงเรียน</option>
                <option value="เขตพื้นที่">เขตพื้นที่ (สพป./สพม.)</option>
                <option value="จังหวัด">จังหวัด</option>
                <option value="ภาค">ภาค</option>
                <option value="ประเทศ">ประเทศ</option>
              </select>
            </div>

            {/* รายละเอียดเพิ่มเติม */}
            <div className="md:col-span-12">
              <label className="block text-xs font-bold text-gray-700 mb-1">
                รายละเอียดผลงานเชิงสังเขป (สรุปผลที่เกิดขึ้น)
              </label>
              <textarea
                rows={3}
                placeholder="อธิบายกิจกรรมเด่น วิธีการดำเนินงาน ประโยชน์ที่ได้รับ หรือสถิติคะแนนผลสัมฤทธิ์ทางการศึกษาเชิงประจักษ์..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              />
            </div>

          </div>
        </div>

        {/* 3. รายชื่อผู้เกี่ยวข้องและเจ้าของผลงาน */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-blue-900 border-b border-gray-100 pb-2 flex items-center gap-1.5">
            <Users size={16} />
            <span>3. บุคลากรและผู้รับผิดชอบผลงาน</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-4">
            
            {/* ชื่อเจ้าของผลงาน */}
            <div className="md:col-span-5">
              <label className="block text-xs font-bold text-gray-700 mb-1">
                ชื่อเจ้าของผลงาน / ผู้จัดทำหลัก
              </label>
              <input
                type="text"
                placeholder="เช่น นายปัญญา รักดี, ด.ช.มานะ ใฝ่เรียน"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                className="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              />
            </div>

            {/* ตำแหน่ง */}
            <div className="md:col-span-3">
              <label className="block text-xs font-bold text-gray-700 mb-1">
                ตำแหน่ง / สถานะ
              </label>
              <input
                type="text"
                placeholder="เช่น ครูผู้สอน, นักเรียน ป.6, โรงเรียน"
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                className="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              />
            </div>

            {/* กลุ่มสาระการเรียนรู้ */}
            <div className="md:col-span-4">
              <label className="block text-xs font-bold text-gray-700 mb-1">
                กลุ่มสาระการเรียนรู้ / กลุ่มบริหารงาน
              </label>
              <input
                type="text"
                placeholder="เช่น วิทยาศาสตร์, คณิตศาสตร์, ประถมวัย"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              />
            </div>

            {/* ชั้นเรียน (สำหรับกรณีนักเรียน) */}
            <div className="md:col-span-4">
              <label className="block text-xs font-bold text-gray-700 mb-1">
                ชั้นเรียน (กรณีผู้รับรางวัลเป็นนักเรียน)
              </label>
              <input
                type="text"
                placeholder="เช่น ประถมศึกษาปีที่ 6"
                value={studentClass}
                onChange={(e) => setStudentClass(e.target.value)}
                className="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              />
            </div>

            {/* ผู้รับผิดชอบ/ครูที่ปรึกษา */}
            <div className="md:col-span-8">
              <label className="block text-xs font-bold text-gray-700 mb-1">
                ครูผู้สอนผู้รับผิดชอบหลัก / ครูที่ปรึกษาโครงงาน
              </label>
              <input
                type="text"
                placeholder="ชื่อครูผู้คุมทีมหรือดูแลโครงการ เช่น นางสาวเพียรพรรณ แสนขยัน"
                value={responsiblePerson}
                onChange={(e) => setResponsiblePerson(e.target.value)}
                className="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              />
            </div>

          </div>
        </div>

        {/* 4. อัพโหลดไฟล์และหลักฐานเชิงประจักษ์ (Drag & Drop) */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-blue-900 border-b border-gray-100 pb-2 flex items-center gap-1.5">
            <Upload size={16} />
            <span>4. อัปโหลดไฟล์เอกสารและภาพถ่ายเชิงประจักษ์ (JPG, PNG, PDF)</span>
          </h3>

          <div 
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all cursor-pointer ${
              isDragging 
                ? 'border-blue-600 bg-blue-50/50' 
                : 'border-gray-300 hover:border-blue-400 bg-gray-50/40 hover:bg-gray-50/80'
            }`}
            onClick={() => fileInputRef.current?.click()}
          >
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              multiple 
              accept=".jpg,.jpeg,.png,.pdf" 
              onChange={(e) => handleFileSelect(e.target.files)}
            />
            
            <div className="flex flex-col items-center justify-center gap-2">
              <div className="p-3 bg-blue-100 text-blue-700 rounded-full animate-bounce-slow">
                <Upload size={24} />
              </div>
              <p className="text-sm font-bold text-gray-800">
                ลากไฟล์มาวางที่นี่ หรือคลิกเพื่อเลือกไฟล์แนบ
              </p>
              <p className="text-xs text-gray-500">
                อัพโหลดรูปภาพเกียรติบัตร, ภาพถ่ายกิจกรรม หรือไฟล์รายงานสรุป PDF ได้หลายไฟล์ (ขนาดไม่เกิน 10MB ต่อไฟล์)
              </p>
            </div>
          </div>

          {/* อัปโหลดไฟล์ที่กำลังประมวลผล */}
          {uploadingFiles.length > 0 && (
            <div className="space-y-2">
              {uploadingFiles.map((uf, idx) => (
                <div key={idx} className="bg-blue-50 border border-blue-100 rounded-xl p-3 flex items-center justify-between gap-3 animate-pulse">
                  <div className="flex items-center gap-2 text-sm text-blue-800">
                    <Loader2 size={16} className="animate-spin text-blue-600" />
                    <span className="truncate max-w-[200px] font-medium">{uf.name}</span>
                  </div>
                  <div className="flex items-center gap-2 w-1/3">
                    <div className="flex-1 bg-blue-200 rounded-full h-1.5 overflow-hidden">
                      <div className="bg-blue-600 h-1.5 rounded-full" style={{ width: `${uf.progress}%` }}></div>
                    </div>
                    <span className="text-xs font-semibold text-blue-700">{uf.progress}%</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* รายการไฟล์อัพโหลดสำเร็จ */}
          {attachments.length > 0 && (
            <div>
              <p className="text-xs font-bold text-gray-500 mb-2">ไฟล์แนบหลักฐานอัพโหลดเรียบร้อยแล้ว ({attachments.length})</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {attachments.map((file) => (
                  <div key={file.id} className="flex items-center justify-between border border-gray-200 rounded-xl p-3 bg-white hover:border-gray-300 shadow-sm">
                    <div className="flex items-center gap-2.5 truncate">
                      <div className={`p-1.5 rounded-lg ${
                        file.type.includes('pdf') ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'
                      }`}>
                        <FileText size={16} />
                      </div>
                      <div className="truncate text-left">
                        <p className="text-xs font-bold text-gray-800 truncate max-w-[180px]">{file.name}</p>
                        <span className="text-[10px] text-gray-400 capitalize">{file.type.split('/')[1]} File</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeAttachment(file.id)}
                      className="p-1 rounded-full text-gray-400 hover:text-rose-500 hover:bg-rose-50 transition-colors"
                      title="ลบไฟล์หลักฐานนี้"
                    >
                      <X size={15} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Buttons */}
        <div className="border-t border-gray-100 pt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-5 py-2.5 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 text-sm font-semibold transition-colors"
          >
            ยกเลิก
          </button>
          
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2.5 rounded-xl bg-blue-900 hover:bg-blue-800 text-white text-sm font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>กำลังบันทึกข้อมูล...</span>
              </>
            ) : (
              <>
                <Check size={16} />
                <span>{portfolioToEdit ? 'บันทึกการแก้ไข' : 'บันทึกเข้าสู่คลังผลงาน'}</span>
              </>
            )}
          </button>
        </div>

      </form>

    </div>
  );
}
