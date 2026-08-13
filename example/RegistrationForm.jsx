import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {PhoneCall, ArrowLeft, BookOpen, User, MapPin, GraduationCap, FileText, Trash2, CheckCircle } from 'lucide-react';
import axios from 'axios';
import Swal from 'sweetalert2'; // ใช้สำหรับ Alert แจ้งเตือนสไตล์สมูทที่อยู่ในโปรเจกต์เดิม

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function RegistrationForm({ cartSections, setCartSections }) {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [age, setAge] = useState('');

  // 1. ตัวแปร State เก็บข้อมูลฟอร์ม 6 ส่วน (ล้อตามโครงสร้างคอลัมน์ตาราง applicants ใน DB)
  const [formData, setFormData] = useState({
    student_type: 'นักศึกษาใหม่',
    title_name: 'นาย',
    full_name: '',
    gender: 'ชาย',
    birth_date: '',
    marital_status: 'โสด',
    registered_address: '',
    occupation: '',
    citizen_id: '',
    nationality: 'ไทย',
    religion: 'พุทธ',
    highest_education: 'มัธยมศึกษาตอนปลาย (ม.6)',
    previous_school: '',
    school_province: '',
    current_address: '',
    phone: '',
    accepted_terms: false
  });

  // ความปลอดภัยดักหน้าจอ: ถ้าผู้สมัครไม่ได้เลือกวิชาอะไรเลยแต่แอบพิมพ์ URL เข้ามา ให้เด้งกลับหน้าแรก
  useEffect(() => {
    if (cartSections.length === 0) {
      navigate('/');
    }
  }, [cartSections, navigate]);

  // 2. ⚡ ระบบคำนวณอายุอัตโนมัติ (จะทำงานเมื่อมีการเปลี่ยนค่า birth_date)
  useEffect(() => {
    if (!formData.birth_date) {
      setAge('');
      return;
    }
    const today = new Date();
    const birthDate = new Date(formData.birth_date);
    let calculatedAge = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      calculatedAge--;
    }
    setAge(calculatedAge >= 0 ? `${calculatedAge} ปี` : 'วันเกิดไม่ถูกต้อง');
  }, [formData.birth_date]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  // 3. ฟังก์ชันลบวิชาออกจากตะกร้ากลางในหน้านี้
  const handleRemoveCourse = (id) => {
    setCartSections(cartSections.filter(item => item.id !== id));
  };

  // 4. 🚀 ฟังก์ชันกดยืนยันส่งใบสมัคร ยิงตูมเข้า API /api/enroll
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.accepted_terms) {
      Swal.fire('แจ้งเตือน', 'กรุณาติ๊กยอมรับข้อตกลงและระเบียบของวิทยาลัย', 'warning');
      return;
    }

    if (formData.citizen_id.length !== 13) {
      Swal.fire('ข้อมูลไม่ถูกต้อง', 'กรุณากรอกเลขประจำตัวประชาชนให้ครบ 13 หลัก', 'warning');
      return;
    }

    try {
      setSubmitting(true);
      
      // ฟอร์แมตแพ็กเกจข้อมูลให้ตรงสถาปัตยกรรมที่หลังบ้านรอรับ
      const payload = {
        applicant_data: {
          ...formData,
          apply_date: new Date().toISOString().split('T')[0] // แนบวันที่สมัครปัจจุบันลงไป
        },
        section_ids: cartSections.map(item => item.id) // ส่งเป็นอาเรย์ ID [1, 3, 5]
      };

      const response = await axios.post(`${API_BASE}/api/enroll`, payload);

      if (response.status === 201) {
        Swal.fire({
          icon: 'success',
          title: 'ส่งใบสมัครออนไลน์สำเร็จ!',
          text: 'กรุณาติดต่อแผนกงานทะเบียนเพื่อดำเนินการในขั้นตอนถัดไป',
          confirmButtonColor: '#0056D2'
        }).then(() => {
          setCartSections([]); // รีเซ็ตล้างตะกร้าวิชาให้โล่ง
          navigate('/success'); // วิ่งเปลี่ยนหน้าไปหน้าสำเร็จ
        });
      }
    } catch (error) {
      console.error(error);
      Swal.fire('เกิดข้อผิดพลาด', error.response?.data?.error || 'ไม่สามารถส่งใบสมัครได้ โปรดตรวจสอบการเชื่อมต่อ', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const formatMoney = (amount) => new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', minimumFractionDigits: 0 }).format(amount);
  const totalBill = cartSections.reduce((sum, item) => sum + item.total_fee, 0);

  return (
    <div className="min-h-screen bg-slate-100 font-medium text-slate-800">
      
      {/* TOP NAV BAR */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <button 
            onClick={() => navigate('/')} 
            className="inline-flex items-center gap-2 text-slate-600 hover:text-[#0056D2] font-bold transition-colors"
          >
            <ArrowLeft size={20} /> กลับไปหน้าเลือกวิชา
          </button>
          <div className="text-right text-sm font-bold text-slate-500">
            ขั้นตอน: กรอกประวัติและยืนยันข้อมูล
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* ======================================================== */}
          {/* ซีกที่ 1: ตะกร้าสรุปรายวิชาที่เลือกเรียน (LG คุม 4 คอลัมน์) */}
          {/* ======================================================== */}
          <div className="lg:col-span-4 space-y-4 sticky top-20">
            <div className="bg-white rounded-2xl shadow-md border border-slate-200 p-5">
              <h3 className="text-lg font-black text-[#00204E] mb-4 flex items-center gap-2 border-b border-slate-100 pb-3">
                <BookOpen size={20} className="text-[#0056D2]" /> หลักสูตรที่สมัครเรียน
              </h3>
              
              <div className="divide-y divide-slate-100 max-h-[350px] overflow-y-auto pr-1">
                {cartSections.map((item) => (
                  <div key={item.id} className="py-3 flex justify-between items-start gap-2">
                    <div className="space-y-0.5">
                      <div className="font-black text-slate-900 text-sm line-clamp-1">{item.title}</div>
                      <div className="text-xs text-slate-500 font-bold">รหัส {item.course_code} • รอบ{item.session}</div>
                      <div className="text-sm font-bold text-[#0056D2]">{formatMoney(item.total_fee)}</div>
                    </div>
                    <button 
                      onClick={() => handleRemoveCourse(item.id)}
                      className="text-slate-400 hover:text-red-500 p-1 rounded-lg hover:bg-red-50 transition-colors shrink-0"
                      title="ลบวิชานี้"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>

              <div className="border-t border-slate-200 mt-4 pt-4 space-y-2">
                <div className="flex justify-between items-center text-sm font-bold text-slate-500">
                  <span>จำนวนรวม:</span>
                  <span>{cartSections.length} วิชา</span>
                </div>
                <div className="flex justify-between items-center text-xl font-black text-[#00204E]">
                  <span>ยอดชำระทั้งสิ้น:</span>
                  <span>{formatMoney(totalBill)}</span>
                </div>
              </div>

              <button 
                onClick={() => navigate('/')}
                className="w-full mt-4 text-center bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl text-sm transition-colors block border border-slate-200"
              >
                + ค้นหาและเลือกวิชาเพิ่ม
              </button>
            </div>
          </div>

          {/* ======================================================== */}
          {/* ซีกที่ 2: ฟอร์มประวัติละเอียด 6 ส่วน (LG คุม 8 คอลัมน์) */}
          {/* ======================================================== */}
          <form onSubmit={handleSubmit} className="lg:col-span-8 space-y-6">
            
            {/* ส่วนที่ 1: สถานะและประเภทนักศึกษา */}
            <div className="bg-white rounded-2xl shadow-md border border-slate-200 p-6 space-y-4">
              <h3 className="text-lg font-black text-[#00204E] flex items-center gap-2 border-b border-slate-100 pb-3">
                <FileText size={20} className="text-[#0056D2]" /> [ส่วนที่ 1] ข้อมูลการสมัครเบื้องต้น
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-600 mb-1.5">ประเภทนักศึกษาสมัครเรียน *</label>
                  <select name="student_type" value={formData.student_type} onChange={handleInputChange} className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:border-[#0056D2] font-bold">
                    <option value="นักศึกษาใหม่">นักศึกษาใหม่ (ไม่เคยเรียนที่นี่มาก่อน)</option>
                    <option value="นักศึกษาเก่า">นักศึกษาเก่า (มีประวัตินักศึกษาเดิม)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* ส่วนที่ 2: ข้อมูลส่วนตัวพื้นฐาน */}
            <div className="bg-white rounded-2xl shadow-md border border-slate-200 p-6 space-y-4">
              <h3 className="text-lg font-black text-[#00204E] flex items-center gap-2 border-b border-slate-100 pb-3">
                <User size={20} className="text-[#0056D2]" /> [ส่วนที่ 2] ข้อมูลส่วนตัวผู้สมัคร
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-600 mb-1.5">คำนำหน้า *</label>
                  <select name="title_name" value={formData.title_name} onChange={handleInputChange} className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:border-[#0056D2] font-bold">
                    <option value="นาย">นาย</option>
                    <option value="นาง">นาง</option>
                    <option value="นางสาว">นางสาว</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-slate-600 mb-1.5">ชื่อ - นามสกุล *</label>
                  <input type="text" required name="full_name" value={formData.full_name} onChange={handleInputChange} placeholder="กรอกชื่อและนามสกุลจริง" className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:border-[#0056D2]" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-600 mb-1.5">เพศ *</label>
                  <select name="gender" value={formData.gender} onChange={handleInputChange} className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:border-[#0056D2] font-bold">
                    <option value="ชาย">ชาย</option>
                    <option value="หญิง">หญิง</option>
                    <option value="อื่นๆ">อื่นๆ</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-600 mb-1.5">วัน/เดือน/ปีเกิด *</label>
                  <input type="date" required name="birth_date" value={formData.birth_date} onChange={handleInputChange} className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:border-[#0056D2] font-bold" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-600 mb-1.5">อายุ (คำนวณอัตโนมัติ)</label>
                  <input type="text" readOnly value={age} placeholder="เลือกวันเกิดระบบจะคำนวณเอง" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 font-black text-[#0056D2] focus:outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-600 mb-1.5">สถานภาพสมรส *</label>
                  <select name="marital_status" value={formData.marital_status} onChange={handleInputChange} className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:border-[#0056D2]">
                    <option value="โโสด">โสด</option>
                    <option value="สมรส">สมรส</option>
                    <option value="หม้าย">หม้าย</option>
                    <option value="หย่าร้าง">หย่าร้าง</option>
                  </select>
                </div>
              </div>
            </div>

            {/* ส่วนที่ 3: ข้อมูลตามทะเบียนบ้านและอัตลักษณ์ */}
            <div className="bg-white rounded-2xl shadow-md border border-slate-200 p-6 space-y-4">
              <h3 className="text-lg font-black text-[#00204E] flex items-center gap-2 border-b border-slate-100 pb-3">
                <MapPin size={20} className="text-[#0056D2]" /> [ส่วนที่ 3] ข้อมูลตามทะเบียนบ้านและอัตลักษณ์
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-slate-600 mb-1.5">เลขประจำตัวประชาชน (13 หลัก) *</label>
                  <input type="text" required maxLength="13" name="citizen_id" value={formData.citizen_id} onChange={handleInputChange} placeholder="กรอกเลขบัตรประชาชน 13 หลัก" className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:border-[#0056D2] font-mono tracking-widest" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-slate-600 mb-1.5">ที่อยู่ตามทะเบียนบ้าน *</label>
                  <textarea rows="2" required name="registered_address" value={formData.registered_address} onChange={handleInputChange} placeholder="กรอกที่อยู่ตามที่ปรากฏในทะเบียนบ้านอย่างละเอียด" className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:border-[#0056D2] text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-600 mb-1.5">อาชีพปัจจุบัน *</label>
                  <input type="text" required name="occupation" value={formData.occupation} onChange={handleInputChange} placeholder="เช่น นักเรียน, ค้าขาย, พนักงานบริษัท" className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:border-[#0056D2]" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-sm font-bold text-slate-600 mb-1.5">สัญชาติ *</label>
                    <input type="text" required name="nationality" value={formData.nationality} onChange={handleInputChange} className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:border-[#0056D2]" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-600 mb-1.5">ศาสนา *</label>
                    <input type="text" required name="religion" value={formData.religion} onChange={handleInputChange} className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:border-[#0056D2]" />
                  </div>
                </div>
              </div>
            </div>

            {/* ส่วนที่ 4: วุฒิการศึกษาสูงสุด */}
            <div className="bg-white rounded-2xl shadow-md border border-slate-200 p-6 space-y-4">
              <h3 className="text-lg font-black text-[#00204E] flex items-center gap-2 border-b border-slate-100 pb-3">
                <GraduationCap size={20} className="text-[#0056D2]" /> [ส่วนที่ 4] ประวัติการศึกษาสูงสุด
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-600 mb-1.5">ระดับการศึกษา *</label>
                  <select name="highest_education" value={formData.highest_education} onChange={handleInputChange} className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:border-[#0056D2]">
                    <option value="มัธยมศึกษาตอนต้น (ม.3)">มัธยมศึกษาตอนต้น (ม.3)</option>
                    <option value="มัธยมศึกษาตอนปลาย (ม.6)">มัธยมศึกษาตอนปลาย (ม.6)</option>
                    <option value="ประกาศนียบัตรวิชาชีพ (ปวช.)">ประกาศนียบัตรวิชาชีพ (ปวช.)</option>
                    <option value="ประกาศนียบัตรวิชาชีพชั้นสูง (ปวส.)">ประกาศนียบัตรวิชาชีพชั้นสูง (ปวส.)</option>
                    <option value="ปริญญาตรีหรือสูงกว่า">ปริญญาตรีหรือสูงกว่า</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-600 mb-1.5">สำเร็จการศึกษาจากสถานศึกษา *</label>
                  <input type="text" required name="previous_school" value={formData.previous_school} onChange={handleInputChange} placeholder="ชื่อสถานศึกษาเดิม" className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:border-[#0056D2]" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-600 mb-1.5">จังหวัดของสถานศึกษา *</label>
                  <input type="text" required name="school_province" value={formData.school_province} onChange={handleInputChange} placeholder="เช่น อุดรธานี, ขอนแก่น" className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:border-[#0056D2]" />
                </div>
              </div>
            </div>

            {/* ส่วนที่ 5-6: ที่อยู่ปัจจุบัน ช่องทางติดต่อ และข้อตกลง */}
            <div className="bg-white rounded-2xl shadow-md border border-slate-200 p-6 space-y-4">
              <h3 className="text-lg font-black text-[#00204E] flex items-center gap-2 border-b border-slate-100 pb-3">
                <PhoneCall size={20} className="text-[#0056D2]" /> [ส่วนที่ 5-6] ที่อยู่ติดต่อและข้อตกลงวิทยาลัย
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-600 mb-1.5">เบอร์โทรศัพท์ที่ติดต่อได้สะดวก *</label>
                  <input type="tel" required name="phone" value={formData.phone} onChange={handleInputChange} placeholder="กรอกเบอร์โทรศัพท์ 10 หลัก (เช่น 0812345678)" className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:border-[#0056D2] text-lg font-bold tracking-wider" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-600 mb-1.5">ที่อยู่ปัจจุบันที่ติดต่อได้สะดวก *</label>
                  <textarea rows="2" required name="current_address" value={formData.current_address} onChange={handleInputChange} placeholder="กรอกที่อยู่ปัจจุบัน (หากเหมือนที่อยู่ตามทะเบียนบ้านสามารถพิมพ์ว่า 'ตามทะเบียนบ้าน' ได้)" className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:border-[#0056D2] text-sm" />
                </div>
                
                {/* ข้อยอมรับกำกับท้ายฟอร์มตามที่พี่ขอ */}
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl mt-4">
                  <label className="flex items-start gap-3 cursor-pointer select-none">
                    <input 
                      type="checkbox" 
                      name="accepted_terms" 
                      checked={formData.accepted_terms} 
                      onChange={handleInputChange}
                      className="mt-1 h-4 w-4 rounded text-[#0056D2] border-slate-300 focus:ring-[#0056D2]" 
                    />
                    <span className="text-sm font-bold text-slate-700 leading-relaxed">
                      ข้าพเจ้าขอรับรองว่าข้อความดังกล่าวข้างต้นเป็นความจริงทุกประการ และได้รับทราบระเบียบข้อบังคับของวิทยาลัยในการสมัครเข้าศึกษาหลักสูตรระยะสั้นเรียบร้อยแล้ว
                    </span>
                  </label>
                </div>
              </div>
            </div>

            {/* ปุ่มกดยื่นส่งข้อมูลก้อนใหญ่ */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={submitting}
                className={`w-full bg-[#0056D2] hover:bg-[#00204E] text-white font-black py-4 rounded-2xl text-lg shadow-md transition-all transform active:scale-[0.99] flex items-center justify-center gap-2 ${
                  submitting ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {submitting ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                    กำลังบันทึกข้อมูลใบสมัครเข้าสู่ระบบ...
                  </>
                ) : (
                  <>
                    <CheckCircle size={22} /> ยืนยันการส่งใบสมัครออนไลน์
                  </>
                )}
              </button>
            </div>

          </form>

        </div>
      </div>
    </div>
  );
}

export default RegistrationForm;