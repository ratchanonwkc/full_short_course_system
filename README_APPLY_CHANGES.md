# Applicant Registration & Management Refactor — File Drop Guide

Copy each file into your project at the **same relative path** (overwriting
existing files where noted). New files are marked [NEW]; patched/rewritten
existing files are marked [REPLACE].

## 1. Database migration (run first)
- backend/migrations/2026_applicant_workflow_refactor.sql  [NEW — run manually against Supabase]

## 2. Backend
- backend/src/features/public/public.service.js       [REPLACE]
- backend/src/features/public/public.controller.js     [REPLACE]
- backend/src/features/public/public.routes.js         [REPLACE]
- backend/src/features/enrollments/enrollments.service.js     [REPLACE]
- backend/src/features/enrollments/enrollments.controller.js  [REPLACE]
- backend/src/features/enrollments/enrollments.routes.js      [REPLACE]

## 3. Frontend — new shared utilities
- frontend/src/utils/receiptFormat.js                  [NEW]
- frontend/src/components/common/Stepper.jsx            [NEW]

## 4. Frontend — API services
- frontend/src/features/public/services/publicApi.js         [REPLACE]
- frontend/src/features/registrar/services/registrarApi.js   [REPLACE]

## 5. Frontend — Multi-step registration (Requirement #1)
- frontend/src/features/public/components/registration-steps/StepPersonalInfo.jsx      [NEW]
- frontend/src/features/public/components/registration-steps/StepCourseSelection.jsx   [NEW]
- frontend/src/features/public/components/registration-steps/StepPayment.jsx           [NEW]
- frontend/src/features/public/components/registration-steps/StepReview.jsx            [NEW]
- frontend/src/features/public/pages/RegistrationPage.jsx      [REPLACE]
- frontend/src/routes/AppRoutes.jsx                             [REPLACE]

  NOTE: old frontend/src/features/public/components/PaymentStep.jsx is superseded
  by StepPayment.jsx and can be deleted (or left unused).

## 6. Frontend — Applicant Detail Modal (Requirement #2 + #4 Registrar edit)
- frontend/src/features/registrar/components/ApplicantDetailModal.jsx  [REPLACE]

  RegistrarEnrollmentsPage.jsx needs NO changes — it already renders this
  shared modal, so edit permission + print button apply automatically.

## 7. Frontend — Summary card badge + receipt formatting (Requirement #3)
- frontend/src/features/public/components/CourseCard.jsx   [REPLACE]

  formatReceiptCode() from utils/receiptFormat.js is already wired into
  ApplicantDetailModal. Reuse it in FinanceVerificationModal.jsx if you also
  display receipt numbers there.

## 8. Frontend — Self-service correction (Requirement #4)
- frontend/src/features/public/components/StatusCheckModal.jsx  [REPLACE]

## Env / bucket notes
- Uses the existing Supabase Storage bucket "slips" (prefix "idcard" for ID
  card uploads) via uploadToSupabaseStorage — no new bucket required.
