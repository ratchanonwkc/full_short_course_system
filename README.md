# ระบบบริหารจัดการหลักสูตรวิชาชีพระยะสั้น (Vocational Short Course ERP)

> **เอกสารส่งมอบงานและคู่มือสถาปัตยกรรมระบบฉบับสมบูรณ์ (Production-Grade Technical Handover Documentation)**  
> พัฒนาขึ้นสำหรับ: งานแผนงานและวิชาการ, งานทะเบียน, งานการเงิน และงานสารสนเทศ วิทยาลัยสารพัดช่าง (เช่น วิทยาลัยสารพัดช่างอุดรธานี / UPTECH Short Course System)

---

## 📑 สารบัญ (Table of Contents)
1. [ภาพรวมระบบและสถาปัตยกรรม (System Overview & Architecture)](#1-ภาพรวมระบบและสถาปัตยกรรม-system-overview--architecture)
2. [ข้อกำหนดเบื้องต้น (Prerequisites)](#2-ข้อกำหนดเบื้องต้น-prerequisites)
3. [การตั้งค่าสภาพแวดล้อม (.env Configuration)](#3-การตั้งค่าสภาพแวดล้อม-env-configuration)
4. [โครงสร้างฐานข้อมูลและการนำเข้าข้อมูล (Database & Data Migration)](#4-โครงสร้างฐานข้อมูลและการนำเข้าข้อมูล-database--data-migration)
5. [การตั้งค่า Supabase Storage Buckets](#5-การตั้งค่า-supabase-storage-buckets)
6. [ขั้นตอนการติดตั้งและรันระบบ (Local Development Setup)](#6-ขั้นตอนการติดตั้งและรันระบบ-local-development-setup)
7. [การทดสอบระบบอัตโนมัติ (Automated E2E Testing with Playwright)](#7-การทดสอบระบบอัตโนมัติ-automated-e2e-testing-with-playwright)
8. [การสร้างเอกสารราชการและระบบการพิมพ์ (Official Document Generation)](#8-การสร้างเอกสารราชการและระบบการพิมพ์-official-document-generation)
9. [การรับมือกับปัญหาที่พบบ่อย (Troubleshooting & FAQs)](#9-การรับมือกับปัญหาที่พบบ่อย-troubleshooting--faqs)

---

## 1. ภาพรวมระบบและสถาปัตยกรรม (System Overview & Architecture)

**ระบบบริหารจัดการหลักสูตรวิชาชีพระยะสั้น (Short Course ERP)** เป็นระบบจัดการข้อมูลแบบบูรณาการระดับองค์กรสำหรับวิทยาลัยสายอาชีวศึกษา รองรับวงจรชีวิต (Lifecycle) ของการเปิดสอนหลักสูตรวิชาชีพระยะสั้น ตั้งแต่การวางแผนโครงสร้างหลักสูตร, การเปิดรุ่น/กลุ่มเรียน, การรับสมัครออนไลน์ผ่าน Public Portal, การตรวจสอบสถานะและเอกสารของผู้สมัคร, การยืนยันยอดเงินและออกใบเสร็จ, จนถึงการพิมพ์เอกสารทางราชการและบันทึกข้อความ

```
                       ┌─────────────────────────────────────────┐
                       │           Public Student Portal         │
                       │  - ดูวิชาที่เปิดรับสมัคร                │
                       │  - สมัครเรียน 3 ขั้นตอน & แนบสลิป/บัตร │
                       │  - ตรวจสอบสถานะการสมัคร & ยื่นแก้ไข     │
                       └────────────────────┬────────────────────┘
                                            │ HTTP / JSON
                                            ▼
┌───────────────────────────┐     ┌───────────────────┐     ┌────────────────────────────┐
│      Back-Office ERP      │     │    Express API    │     │      Supabase Cloud        │
│  - งานแผนงานและวิชาการ     ├────►│     (Node.js)     ├────►│  - PostgreSQL 15+          │
│  - งานทะเบียนวัดผล        │     │  - Port 5000      │     │  - Row Level Security (RLS)│
│  - งานการเงิน             │     │  - RESTful v1     │     │  - Supabase Storage (slips)│
│  - ผู้ดูแลระบบ (Admin)    │     │  - Multer Memory  │     │  - GoTrue Auth             │
└───────────────────────────┘     └───────────────────┘     └────────────────────────────┘
```

### รายละเอียดเทคโนโลยี (Tech Stack Breakdown)

| ส่วนประกอบ | เทคโนโลยีที่ใช้งาน | รายละเอียดและเวอร์ชันจริงในโค้ด |
|---|---|---|
| **Frontend UI** | **React 19 (Vite 8)** | `react@^19.2.7`, `vite@^8.1.1`, React Router v7 (`react-router-dom@^7.18.1`) |
| **Styling & Design** | **Tailwind CSS v4** | `@tailwindcss/vite@^4.3.3`, `tailwindcss@^4.3.3`, `clsx`, `tailwind-merge` |
| **UI Components & Icons** | **Headless UI & Lucide** | `@headlessui/react@^2.2.10`, `lucide-react@^1.25.0`, `sweetalert2@^11.26.25` |
| **Data Grid & Tables** | **AG Grid Community** | `ag-grid-community@^36.0.1`, `ag-grid-react@^36.0.1` |
| **Backend API Server** | **Node.js (Express 5)** | `express@^5.2.1`, ES Modules (`"type": "module"`), `cors@^2.8.6`, `dotenv@^17.4.2` |
| **Database & Auth** | **Supabase / PostgreSQL** | `@supabase/supabase-js@^2.110.7` (Backend) และ `@supabase/supabase-js@^2.48.1` (E2E) |
| **File Storage** | **Supabase Storage** | สตรีมไฟล์ผ่านหน่วยความจำด้วย `multer@^2.2.0` (Memory Storage) เก็บ Path สัมพัทธ์ |
| **Document Generation** | **Word & Print Engine** | `docxtemplater@^3.69.3`, `pizzip@^3.2.0`, `react-to-print@^3.3.0`, ฟอนต์ราชการ TH Sarabun IT๙ |
| **Testing Automation** | **Playwright E2E** | `@playwright/test@^1.50.0`, 12 automated tests ครอบคลุม 11 โมดูล พร้อม Autonomous Teardown |

---

## 2. ข้อกำหนดเบื้องต้น (Prerequisites)

ก่อนเริ่มติดตั้งและรันระบบ นักพัฒนาต้องติดตั้งเครื่องมือดังต่อไปนี้บนเครื่องคอมพิวเตอร์:

- **Node.js**: เวอร์ชัน **20.x หรือ 22.x LTS ขึ้นไป** (แพ็กเกจทั้งระบบใช้ ES Module แบบ Native จำเป็นต้องใช้ Node.js ที่รองรับ)
- **npm**: เวอร์ชัน **10.x ขึ้นไป**
- **Git**: สำหรับการ Clone และจัดเก็บประวัติซอร์สโค้ด
- **Supabase Account / Instance**: โปรเจกต์ Supabase พร้อมสิทธิ์เข้าถึง:
  - Database SQL Editor (สำหรับรัน DDL และ Migrations)
  - Storage Admin (สำหรับเปิด Bucket `slips`)
  - Project API Credentials (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `VITE_SUPABASE_ANON_KEY`)

---

## 3. การตั้งค่าสภาพแวดล้อม (.env Configuration)

ระบบแบ่งตัวแปรสภาพแวดล้อมออกเป็น 2 ส่วนชัดเจนระหว่าง Backend และ Frontend:

### 3.1 Backend Environment (`backend/.env`)

ไฟล์เทมเพลต: [backend/.env.example](file:///c:/work/full_short_course_system/backend/.env.example)

```env
# Server Port (Default: 5000)
PORT=5000

# Supabase Project URL
SUPABASE_URL=https://your-project.supabase.co

# Supabase Service Role Key (CRITICAL: Private Key สำหรับงาน API และ Admin ข้าม RLS)
SUPABASE_SERVICE_ROLE_KEY=eyJh......
```

> [!CAUTION]
> **ความปลอดภัยของ SUPABASE_SERVICE_ROLE_KEY**:  
> คีย์นี้มีสิทธิ์สูงสุดในการอ่าน/เขียน/ลบข้อมูลทั้งหมดใน PostgreSQL โดยไม่ผ่าน Row Level Security (RLS) ห้ามนำคีย์นี้ไปวางในฝั่ง Frontend หรือส่งขึ้น Public Git เด็ดขาด

### 3.2 Frontend Environment (`frontend/.env`)

ไฟล์เทมเพลต: [frontend/.env.example](file:///c:/work/full_short_course_system/frontend/.env.example)

```env
# Backend API Base URL
VITE_API_BASE_URL=http://localhost:5000/api

# Supabase Project URL (จำเป็นสำหรับการ Resolve รูปภาพสลิป/บัตรประชาชน)
VITE_SUPABASE_URL=https://your-project.supabase.co

# Supabase Public Anonymous Key
VITE_SUPABASE_ANON_KEY=eyJh......
```

### 3.3 บทบาทสำคัญของ `VITE_SUPABASE_URL` ในการ Resolve Storage Assets
ระบบนี้ใช้สถาปัตยกรรม **Relative Path Storage**:
- ในฐานข้อมูลฟิลด์ `slip_url`, `id_card_url`, และ `qr_code_url` จะจัดเก็บเฉพาะชื่อ Bucket และ Key เช่น `slips/slip_1726540000000_123456789.png`
- ฟังก์ชัน `resolveStorageUrl()` ใน [frontend/src/utils/storageHelper.js](file:///c:/work/full_short_course_system/frontend/src/utils/storageHelper.js) จะนำ `VITE_SUPABASE_URL` มาต่อเชื่อม ณ เวลา Runtime (`${VITE_SUPABASE_URL}/storage/v1/object/public/${cleanPath}`)
- **ข้อดี**: หากมีการย้าย Supabase Project หรือเปลี่ยนชื่อโดเมน สามารถแก้เพียงค่า `VITE_SUPABASE_URL` ใน `.env` ภาพทั้งหมดจะแสดงผลได้ทันทีโดยไม่ต้องแก้ไขฐานข้อมูลแม้แต่แถวเดียว

---

## 4. โครงสร้างฐานข้อมูลและการนำเข้าข้อมูล (Database & Data Migration)

### 4.1 ขั้นตอนการรัน Schema & Migrations บน Supabase
ให้เปิด **Supabase SQL Editor** และรันสคริปต์ตามลำดับดังต่อไปนี้:

1. **รันโครงสร้างตารางหลัก**:
   รันเนื้อหาจาก [database/database_schema.sql](file:///c:/work/full_short_course_system/database/database_schema.sql)
2. **รัน Migration ปรับปรุงระบบรับสมัครและการปฏิเสธคำขอ**:
   รันเนื้อหาจาก [backend/migrations/2026_applicant_workflow_refactor.sql](file:///c:/work/full_short_course_system/backend/migrations/2026_applicant_workflow_refactor.sql)  
   *(เพิ่มคอลัมน์ `id_card_url`, `email` ใน `applicants` และ `payment_method`, `rejection_reason`, `rejected_at`, `rejected_by_user_id` ใน `enrollments`)*
3. **รัน Migration ระบบผู้ใช้และ Audit Logs**:
   รันเนื้อหาจาก [backend/migrations/2026_setup_users_and_audit.sql](file:///c:/work/full_short_course_system/backend/migrations/2026_setup_users_and_audit.sql)  
   *(สร้างตาราง `public.users`, `public.audit_logs`, ทริกเกอร์ `on_auth_user_created` แบบปลอดภัยไม่เกิดลูป, ฟังก์ชัน `is_admin()`, และนโยบาย RLS)*

### 4.2 ข้อจำกัดสำคัญของฐานข้อมูล (Database Constraints)

- **Unique Registration Constraint**:
  ```sql
  CONSTRAINT enrollments_applicant_group_unique UNIQUE (applicant_id, study_group_id)
  ```
  ป้องกันไม่ให้ผู้สมัครคนเดิมลงทะเบียนซ้ำในกลุ่มเรียนเดียวกัน หากพยายามเพิ่มซ้ำ PostgreSQL จะส่ง Error Code `23505` ซึ่ง Backend มีตัวดักจับเฉพาะทางแปลงเป็นข้อความแจ้งเตือนที่เข้าใจง่าย
- **Foreign Key Sanitization ในรายวิชา (`subjects`)**:
  คอลัมน์ `minor_id` ในตาราง `subjects` **อนุญาตให้มีค่าเป็น NULL ได้** เนื่องจากหลักสูตรวิชาชีพระยะสั้นบางรายวิชาเป็นวิชากลางของแผนกวิชา (`academic_majors`) จึงไม่จำเป็นต้องผูกกับสาขางานย่อย (`academic_minors`)
- **Foreign Key Behavior ของ `audit_logs`**:
  ```sql
  CONSTRAINT audit_logs_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.users(id) ON DELETE SET NULL
  ```
  หากบัญชีผู้ใช้ถูกลบออกจากระบบ ประวัติการปฏิบัติงานใน Audit Log จะไม่ถูกลบตามไปด้วย แต่จะปรับค่า `actor_id` เป็น `NULL` เพื่อคงความสมบูรณ์ของหลักฐานการตรวจสอบ

### 4.3 ลำดับการ Import ข้อมูล CSV (Strict Dependency Tree)

เมื่อต้องการกู้คืนข้อมูลหรือ Import ไฟล์จากไดเรกทอรี `database/backup_data/` เข้าสู่ตาราง **ต้องเรียงตามลำดับความสัมพันธ์ของ Foreign Key อย่างเคร่งครัด** ดังนี้:

```
[ระดับ 1: Master Data อิสระ]
  ├── 1. prefixes_rows.csv (คำนำหน้าชื่อ)
  ├── 2. positions_rows.csv (ตำแหน่ง)
  ├── 3. sub_positions_rows.csv (ตำแหน่งย่อย)
  ├── 4. academic_levels_rows.csv (ระดับการศึกษา)
  ├── 5. subject_types_rows.csv (ประเภทวิชา)
  ├── 6. curriculums_rows.csv (หลักสูตร)
  ├── 7. locations_rows.csv (สถานที่จัดการเรียนการสอน)
  └── 8. time_slots_rows.csv (ช่วงเวลา/รอบเรียน)

[ระดับ 2: บุคลากรและรุ่น]
  ├── 9. teachers_rows.csv (ขึ้นต่อ: prefixes, positions, sub_positions)
  └── 10. batches_rows.csv (ขึ้นต่อ: teachers สำหรับผู้อำนวยการ/หัวหน้างาน)

[ระดับ 3: โครงสร้างวิชาการ]
  ├── 11. academic_majors_rows.csv (ขึ้นต่อ: academic_levels, subject_types, teachers)
  ├── 12. academic_minors_rows.csv (ขึ้นต่อ: academic_majors)
  └── 13. subjects_rows.csv (ขึ้นต่อ: academic_levels, curriculums, subject_types, academic_majors, academic_minors [NULL ได้])

[ระดับ 4: กลุ่มเรียนและรายวิชา]
  ├── 14. study_groups_rows.csv (ขึ้นต่อ: batches, academic_majors, teachers, locations, time_slots)
  └── 15. study_group_subjects_rows.csv (ขึ้นต่อ: study_groups, subjects)

[ระดับ 5: ช่องทางการเงินและผู้เรียน]
  ├── 16. payment_methods_rows.csv (บัญชีธนาคารและ QR รับชำระเงิน)
  ├── 17. applicants_rows.csv (ข้อมูลผู้สมัครและประวัติติดต่อ)
  └── 18. enrollments_rows.csv (ขึ้นต่อ: applicants, study_groups, payment_methods)

[ระดับ 6: ระบบผู้ใช้และประวัติ]
  ├── 19. users_rows.csv (เชื่อมต่อกับ auth.users ผ่าน UUID)
  └── 20. audit_logs_rows.csv (ขึ้นต่อ: users [ON DELETE SET NULL])
```

### 4.4 คำสั่ง SQL รีเซ็ต Identity Sequences หลัง Import CSV
เนื่องจากไฟล์ CSV มีค่า `id` มาด้วย เมื่อ Import เข้าตารางที่ใช้ `GENERATED ALWAYS AS IDENTITY` ตัว Sequence ของ Postgres จะไม่ขยับตาม ให้รันสคริปต์ SQL นี้บน Supabase SQL Editor หลัง Import เสร็จสิ้น:

```sql
-- รีเซ็ตค่า Sequence ของทุกตารางให้ชี้ไปยัง ID สูงสุดปัจจุบัน + 1 ป้องกันปัญหา Duplicate Key ในอนาคต
SELECT setval(pg_get_serial_sequence('public.prefixes', 'id'), COALESCE((SELECT MAX(id) FROM public.prefixes), 1));
SELECT setval(pg_get_serial_sequence('public.positions', 'id'), COALESCE((SELECT MAX(id) FROM public.positions), 1));
SELECT setval(pg_get_serial_sequence('public.sub_positions', 'id'), COALESCE((SELECT MAX(id) FROM public.sub_positions), 1));
SELECT setval(pg_get_serial_sequence('public.teachers', 'id'), COALESCE((SELECT MAX(id) FROM public.teachers), 1));
SELECT setval(pg_get_serial_sequence('public.batches', 'id'), COALESCE((SELECT MAX(id) FROM public.batches), 1));
SELECT setval(pg_get_serial_sequence('public.academic_levels', 'id'), COALESCE((SELECT MAX(id) FROM public.academic_levels), 1));
SELECT setval(pg_get_serial_sequence('public.curriculums', 'id'), COALESCE((SELECT MAX(id) FROM public.curriculums), 1));
SELECT setval(pg_get_serial_sequence('public.locations', 'id'), COALESCE((SELECT MAX(id) FROM public.locations), 1));
SELECT setval(pg_get_serial_sequence('public.time_slots', 'id'), COALESCE((SELECT MAX(id) FROM public.time_slots), 1));
SELECT setval(pg_get_serial_sequence('public.academic_majors', 'id'), COALESCE((SELECT MAX(id) FROM public.academic_majors), 1));
SELECT setval(pg_get_serial_sequence('public.academic_minors', 'id'), COALESCE((SELECT MAX(id) FROM public.academic_minors), 1));
SELECT setval(pg_get_serial_sequence('public.subjects', 'id'), COALESCE((SELECT MAX(id) FROM public.subjects), 1));
SELECT setval(pg_get_serial_sequence('public.study_groups', 'id'), COALESCE((SELECT MAX(id) FROM public.study_groups), 1));
SELECT setval(pg_get_serial_sequence('public.study_group_subjects', 'id'), COALESCE((SELECT MAX(id) FROM public.study_group_subjects), 1));
SELECT setval(pg_get_serial_sequence('public.payment_methods', 'id'), COALESCE((SELECT MAX(id) FROM public.payment_methods), 1));
SELECT setval(pg_get_serial_sequence('public.applicants', 'id'), COALESCE((SELECT MAX(id) FROM public.applicants), 1));
SELECT setval(pg_get_serial_sequence('public.enrollments', 'id'), COALESCE((SELECT MAX(id) FROM public.enrollments), 1));
```

### 4.5 คำสั่งแปลง URL เต็มแบบเก่าเป็น Relative Path (Legacy URL Cleanup)
หากมีการ Import ข้อมูลจากระบบเดิมที่มีการเก็บ URL เต็มแบบระบุ Domain ให้รันคำสั่งนี้เพื่อแปลงเป็น Relative Path สอดคล้องกับมาตรฐานใหม่:

```sql
-- แปลงสลิปโอนเงินในตาราง enrollments
UPDATE public.enrollments
SET slip_url = REGEXP_REPLACE(slip_url, '^https?://[^/]+/storage/v1/object/public/', '')
WHERE slip_url ~ '^https?://';

-- แปลงรูปบัตรประชาชนในตาราง applicants
UPDATE public.applicants
SET id_card_url = REGEXP_REPLACE(id_card_url, '^https?://[^/]+/storage/v1/object/public/', '')
WHERE id_card_url ~ '^https?://';

-- แปลง QR Code ในตาราง payment_methods
UPDATE public.payment_methods
SET qr_code_url = REGEXP_REPLACE(qr_code_url, '^https?://[^/]+/storage/v1/object/public/', '')
WHERE qr_code_url ~ '^https?://';
```

---

## 5. การตั้งค่า Supabase Storage Buckets

### 5.1 รายชื่อ Buckets
1. **`slips` (Active Default Bucket)**:
   โค้ดระบบปัจจุบัน ([backend/src/middlewares/supabaseUpload.middleware.js](file:///c:/work/full_short_course_system/backend/src/middlewares/supabaseUpload.middleware.js)) ใช้งาน Bucket หลักชื่อ `slips` สำหรับจัดเก็บไฟล์อัปโหลดทั้งหมด ได้แก่:
   - สลิปโอนเงิน: prefix `slips/slip_*`
   - ภาพบัตรประชาชน: prefix `slips/idcard_*`
   - QR Code บัญชีธนาคาร: prefix `slips/qr_*`
2. **`payment-slips` และ `id-cards` (ทางเลือกสำหรับการแยก Bucket)**:
   หากในอนาคตต้องการแยก Bucket เพื่อกำหนดสิทธิ์ที่แตกต่างกัน สามารถปรับตัวแปรใน middleware ได้ โดย `resolveStorageUrl()` ฝั่ง Frontend รองรับชื่อ Bucket ใดๆ ก็ตามโดยอัตโนมัติ

### 5.2 สิทธิ์การเข้าถึงและ RLS Policy แนะนำ
- ให้ตั้งค่า Bucket `slips` เป็น **Public Bucket** เพื่อให้สามารถเข้าถึงผ่าน URL สาธารณะได้
- กำหนดสิทธิ์บนตาราง `storage.objects` บน Supabase SQL Editor:

```sql
-- 1. อนุญาตให้ทุกคนสามารถอ่านไฟล์ใน Bucket slips ได้
CREATE POLICY "Public Access for slips bucket"
ON storage.objects FOR SELECT
USING (bucket_id = 'slips');

-- 2. อนุญาตให้อัปโหลดไฟล์เข้า Bucket slips ได้
CREATE POLICY "Allow uploads to slips bucket"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'slips');
```

---

## 6. ขั้นตอนการติดตั้งและรันระบบ (Local Development Setup)

### 6.1 ติดตั้ง Dependencies ทั้งระบบ
เปิด Terminal ในโฟลเดอร์รากของโปรเจกต์:

```bash
# 1. ติดตั้ง Dependencies ที่ root (สำหรับ Playwright E2E)
npm install

# 2. ติดตั้ง Dependencies ฝั่ง Backend
cd backend && npm install && cd ..

# 3. ติดตั้ง Dependencies ฝั่ง Frontend
cd frontend && npm install && cd ..
```

### 6.2 เตรียมไฟล์คอนฟิกสภาพแวดล้อม
คัดลอกไฟล์ `.env.example` ไปเป็น `.env`:

```bash
# สำหรับ Backend
cp backend/.env.example backend/.env

# สำหรับ Frontend
cp frontend/.env.example frontend/.env
```
*(แก้ไขค่า `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, และ `VITE_SUPABASE_ANON_KEY` ให้ตรงกับโปรเจกต์ Supabase)*

### 6.3 สตาร์ทเซอร์เวอร์เพื่อพัฒนา (Development Server)

เปิด 2 หน้าต่าง Terminal:

**Terminal 1 (Backend API - Port 5000):**
```bash
cd backend
npm run dev
# รันผ่าน nodemon บน http://localhost:5000
```

**Terminal 2 (Frontend App - Port 5173):**
```bash
cd frontend
npm run dev
# รันผ่าน Vite บน http://localhost:5173
```

ทดสอบการเข้าถึงระบบ:
- **Public Portal**: `http://localhost:5173/`
- **ระบบ Back-Office / เข้าสู่ระบบ**: `http://localhost:5173/login`
- **API Health Check**: `http://localhost:5000/`

---

## 7. การทดสอบระบบอัตโนมัติ (Automated E2E Testing with Playwright)

โปรเจกต์ติดตั้งชุดทดสอบ End-to-End อัตโนมัติด้วย **Playwright** จำนวน 12 เทสต์ ครอบคลุม 11 โมดูลสำคัญ

### 7.1 โครงสร้างชุดทดสอบ
```
tests/
  ├── .auth/               # เก็บ session การล็อกอินของ Admin (admin.json)
  ├── setup/
  │   └── auth.setup.js    # เข้าสู่ระบบ Admin (badendgg@gmail.com) และบันทึก Token
  ├── helpers/
  │   ├── mock-factory.js  # ตัวสร้างข้อมูลทดสอบ (คำนวณรหัสบัตรประชาชน Modulo-11, เบอร์โทร, อีเมล)
  │   └── teardown.js      # Autonomous Teardown Engine ล้างข้อมูล [TEST- ออกจาก PostgreSQL
  └── e2e/
      ├── suite-part1.spec.js  # Upstream วิชาการ (แผนกวิชา, รายวิชา, ครูผู้สอน, รุ่นการอบรม)
      └── suite-part2.spec.js  # Downstream ปฏิบัติการ (เปิดกลุ่มเรียน, รับสมัคร, รายงาน, การเงิน, ผู้ใช้, Audit Logs)
```

### 7.2 คำสั่งรันการทดสอบ

```bash
# รันการทดสอบทั้งหมดแบบ Headless (คอนฟิก Playwright จะเปิด Web Server ให้อัตโนมัติหากยังไม่รัน)
npm run test:e2e
# หรือ: npx playwright test tests/e2e/

# รันเฉพาะ Part 1 (Upstream Academic Workflow)
npm run test:e2e:part1

# รันผ่าน Interactive UI Dashboard (แนะนำสำหรับ Debug)
npm run test:e2e:ui
# หรือ: npx playwright test --ui

# รันแบบเปิดหน้าต่างเบราว์เซอร์จริง (Headed Mode)
npm run test:e2e:headed

# เปิดดูรายงานผลการทดสอบ HTML ล่าสุด
npx playwright show-report

# สั่งล้างข้อมูลทดสอบออกจากฐานข้อมูลด้วยตัวเอง (Manual Teardown)
npm run test:teardown
```

### 7.3 กลไก Autonomous Teardown Engine
- ทุกเอนทิตีที่ถูกสร้างระหว่างการทดสอบจะได้รับคำนำหน้าเป็น `[TEST-${TEST_SESSION_ID}]`
- ฟังก์ชัน `generateThaiCitizenId()` ใน [mock-factory.js](file:///c:/work/full_short_course_system/tests/helpers/mock-factory.js) สร้างเลขบัตรประชาชน 13 หลักด้วยสูตร **Modulo-11 Checksum** ถูกต้องตามกฎเกณฑ์จริง ไม่ติด Error รูปแบบเลขบัตร
- ใน `test.afterAll()` ของแต่ละ Test Spec จะเรียกใช้ [teardown.js](file:///c:/work/full_short_course_system/tests/helpers/teardown.js) เพื่อล้างข้อมูลตามลำดับ **Reverse Foreign Key (Children -> Parents)** อย่างปลอดภัย:
  1. `audit_logs`
  2. `enrollments`
  3. `applicants`
  4. `payment_methods`
  5. `users` (ยกเว้นแอดมินหลัก `badendgg@gmail.com`)
  6. `study_group_subjects`
  7. `study_groups`
  8. `subjects`
  9. `batches`
  10. `academic_minors`
  11. `academic_majors`
  12. `curriculums`
  13. `teachers`
- **รับประกันความสะอาดของฐานข้อมูล**: ไม่ทิ้งข้อมูลขยะปะปนกับข้อมูลจริง แม้การรันเทสต์จะหยุดชะงัก

---

## 8. การสร้างเอกสารราชการและระบบการพิมพ์ (Official Document Generation)

ระบบ Short Course ERP ออกแบบมาเพื่อให้สอดคล้องกับระเบียบงานสารบรรณของสำนักงานคณะกรรมการการอาชีวศึกษา (สอศ.):

### 8.1 ฟอนต์มาตรฐานราชการไทย (TH Sarabun IT๙)
ไฟล์ฟอนต์มาตรฐานบรรจุอยู่ใน [frontend/public/fonts/](file:///c:/work/full_short_course_system/frontend/public/fonts/):
- `THSARABUNIT๙.TTF` (ปกติ)
- `THSARABUNIT๙ BOLD.TTF` (หนา)
- `THSARABUNIT๙ ITALIC.TTF` (เอียง)
- `THSARABUNIT๙ BOLDITALIC.TTF` (หนาเอียง)

### 8.2 การพิมพ์เอกสารราชการผ่านเบราว์เซอร์ (`react-to-print`)
ระบบมีคอมโพเนนต์สำหรับแสดงผลและสั่งพิมพ์ขนาด A4 ทางราชการพร้อมจัดหน้าและลายน้ำ:
1. **ใบสมัครเรียนวิชาชีพระยะสั้น** ([ApplicationFormPrint.jsx](file:///c:/work/full_short_course_system/frontend/src/components/print/ApplicationFormPrint.jsx)):
   - แสดงข้อมูลผู้สมัครครบถ้วน พร้อมช่องติดรูปถ่ายขนาด 1.5 นิ้ว
   - แสดงตัวอย่างบัตรประจำตัวประชาชนและสลิปหลักฐานการชำระเงินที่แนบมา
2. **ประกาศวิทยาลัย เรื่อง เปิดรับสมัครฯ** ([CollegeAnnouncementPrint.jsx](file:///c:/work/full_short_course_system/frontend/src/components/print/announcements/CollegeAnnouncementPrint.jsx)):
   - แสดงตราครุฑและตารางรายวิชาที่เปิดสอน ค่าธรรมเนียม วัน-เวลาเรียน และเงื่อนไขการรับสมัคร
3. **บันทึกข้อความราชการ** ([OfficialMemoPrint.jsx](file:///c:/work/full_short_course_system/frontend/src/components/print/announcements/OfficialMemoPrint.jsx)):
   - บันทึกข้อความขออนุมัติเปิดสอนหลักสูตรวิชาชีพระยะสั้นและแต่งตั้งผู้สอน เสนอผู้อำนวยการวิทยาลัย
4. **บัญชีรายชื่อผู้สมัครและผู้เรียน** ([RosterSubjectPrint.jsx](file:///c:/work/full_short_course_system/frontend/src/components/print/RosterSubjectPrint.jsx)):
   - บัญชีรายชื่อผู้เรียนประจำกลุ่มเรียน สำหรับครูผู้สอนใช้เช็คชื่อและประเมินผล

### 8.3 การส่งออกไฟล์ Word (.docx) ผ่าน `docxtemplater` & `pizzip`
- ไดเรกทอรีเทมเพลต: `frontend/public/templates/`
- ข้อมูลที่ถูก Inject:
  - ชื่อรุ่นการอบรม, ปีการศึกษา, ภาคเรียน
  - ตารางรายชื่อนักศึกษา `{#students}{no} {title}{name} {phone}{/students}`
  - รายละเอียดผู้สอนและลายมือชื่อผู้บริหาร

---

## 9. การรับมือกับปัญหาที่พบบ่อย (Troubleshooting & FAQs)

### Q1: พบข้อผิดพลาด Error Code `23505` (Duplicate registration attempt)
- **สาเหตุ**: ผู้สมัครพยายามลงทะเบียนซ้ำในกลุ่มเรียนเดิมที่มีประวัติอยู่แล้ว (`enrollments_applicant_group_unique`)
- **วิธีแก้**: ในฝั่งผู้สมัคร ให้ตรวจสอบสถานะการสมัครที่หน้า `/tracking` แทนการสมัครใหม่ หรือให้เจ้าหน้าที่งานทะเบียนตรวจสอบในระบบว่ามีใบสมัครค้างอยู่หรือไม่

### Q2: เพิ่มรายวิชาใหม่ไม่ได้ แจ้งเตือน Foreign Key Violation ใน `minor_id`
- **สาเหตุ**: กรอกรหัสสาขางานย่อย (`minor_id`) ที่ไม่มีอยู่ในระบบ หรือเลือกสาขาวิชาที่ไม่ตรงกัน
- **วิธีแก้**: หากรายวิชานั้นเป็นวิชากลางของแผนกวิชา ไม่จำเป็นต้องระบุสาขางานย่อย สามารถเว้นว่าง (`NULL`) ได้ทันทีตามโครงสร้างของตาราง `subjects`

### Q3: รูปภาพสลิปโอนเงินหรือบัตรประชาชนไม่แสดงผล (Image Broken)
- **วิธีตรวจสอบ**:
  1. ตรวจสอบค่า `VITE_SUPABASE_URL` ใน `frontend/.env` ว่าสะกดถูกต้องและไม่มีเครื่องหมาย `/` ปิดท้ายเกินมา
  2. ตรวจสอบใน Supabase Storage Dashboard ว่ามี Bucket ชื่อ `slips` และตั้งค่าเป็น **Public** หรือไม่
  3. หากเป็นข้อมูลเก่าที่ Import มา ให้ตรวจสอบว่าในคอลัมน์ `slip_url` เป็นแบบ Relative Path (`slips/...`) หรือไม่ หากยังเป็น URL เต็ม ให้รันสคริปต์ [Legacy URL Cleanup](#45-คำสั่งแปลง-url-เต็มแบบเก่าเป็น-relative-path-legacy-url-cleanup)

### Q4: รัน Playwright E2E แล้วติดปัญหา Authentication Timeout
- **สาเหตุ**: บัญชีแอดมินทดสอบ (`badendgg@gmail.com` / `Password123!`) ยังไม่ได้ถูกสร้างขึ้นใน Supabase Auth หรือถูกระงับ
- **วิธีแก้**: สร้างผู้ใช้ `badendgg@gmail.com` ใน Supabase Auth และตรวจสอบว่าในตาราง `public.users` มีบทบาทเป็น `role: 'admin'` และ `status: 'active'`

---

**พัฒนาและดูแลโดย**: ทีมพัฒนาระบบเทคโนโลยีสารสนเทศ วิทยาลัยสารพัดช่าง  
**ลิขสิทธิ์**: สำหรับใช้งานภายในวิทยาลัยสารพัดช่างและสถานศึกษาในสังกัด สอศ.
