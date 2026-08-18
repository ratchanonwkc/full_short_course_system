-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.prefixes (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  short_name character varying NOT NULL,
  full_name character varying NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT prefixes_pkey PRIMARY KEY (id)
);
CREATE TABLE public.positions (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  position_name character varying NOT NULL UNIQUE,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT positions_pkey PRIMARY KEY (id)
);
CREATE TABLE public.sub_positions (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  sub_position_name character varying NOT NULL UNIQUE,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT sub_positions_pkey PRIMARY KEY (id)
);
CREATE TABLE public.teachers (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  citizen_id character varying NOT NULL UNIQUE,
  first_name_th character varying NOT NULL,
  last_name_th text NOT NULL,
  first_name_en character varying,
  last_name_en character varying,
  phone character varying,
  email character varying,
  is_active boolean NOT NULL DEFAULT true,
  prefix_id bigint,
  position_id bigint,
  sub_position_id bigint,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT teachers_pkey PRIMARY KEY (id),
  CONSTRAINT teachers_prefix_id_fkey FOREIGN KEY (prefix_id) REFERENCES public.prefixes(id),
  CONSTRAINT teachers_position_id_fkey FOREIGN KEY (position_id) REFERENCES public.positions(id),
  CONSTRAINT teachers_sub_position_id_fkey FOREIGN KEY (sub_position_id) REFERENCES public.sub_positions(id)
);
CREATE TABLE public.batches (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  academic_year character varying NOT NULL,
  term smallint NOT NULL,
  batch_no smallint NOT NULL,
  batch_name character varying NOT NULL,
  batch_start_date date,
  batch_end_date date,
  admit_open_date date,
  admit_close_date date,
  study_open_date date,
  study_close_date date,
  total_hours integer DEFAULT 0,
  status USER-DEFINED DEFAULT 'planning'::batch_status,
  director_id bigint,
  director_signature_url text,
  deputy_academic_id bigint,
  deputy_resources_id bigint,
  deputy_planning_id bigint,
  deputy_activities_id bigint,
  head_registration_id bigint,
  head_registration_signature_url text,
  head_curriculum_id bigint,
  head_planning_id bigint,
  head_evaluation_id bigint,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT batches_pkey PRIMARY KEY (id),
  CONSTRAINT batches_director_id_fkey FOREIGN KEY (director_id) REFERENCES public.teachers(id),
  CONSTRAINT batches_deputy_academic_id_fkey FOREIGN KEY (deputy_academic_id) REFERENCES public.teachers(id),
  CONSTRAINT batches_deputy_resources_id_fkey FOREIGN KEY (deputy_resources_id) REFERENCES public.teachers(id),
  CONSTRAINT batches_deputy_planning_id_fkey FOREIGN KEY (deputy_planning_id) REFERENCES public.teachers(id),
  CONSTRAINT batches_deputy_activities_id_fkey FOREIGN KEY (deputy_activities_id) REFERENCES public.teachers(id),
  CONSTRAINT batches_head_registration_id_fkey FOREIGN KEY (head_registration_id) REFERENCES public.teachers(id),
  CONSTRAINT batches_head_curriculum_id_fkey FOREIGN KEY (head_curriculum_id) REFERENCES public.teachers(id),
  CONSTRAINT batches_head_planning_id_fkey FOREIGN KEY (head_planning_id) REFERENCES public.teachers(id),
  CONSTRAINT batches_head_evaluation_id_fkey FOREIGN KEY (head_evaluation_id) REFERENCES public.teachers(id)
);
CREATE TABLE public.subject_types (
  id bigint NOT NULL,
  name_th character varying NOT NULL,
  name_en character varying,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT subject_types_pkey PRIMARY KEY (id)
);
CREATE TABLE public.academic_levels (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  level_name character varying NOT NULL UNIQUE,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT academic_levels_pkey PRIMARY KEY (id)
);
CREATE TABLE public.curriculums (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  curriculum_name character varying NOT NULL UNIQUE,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT curriculums_pkey PRIMARY KEY (id)
);
CREATE TABLE public.subjects (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  subject_code character varying NOT NULL UNIQUE,
  name_th character varying NOT NULL,
  name_en character varying,
  theory_hours numeric DEFAULT 0.00,
  practice_hours numeric DEFAULT 0.00,
  credits numeric DEFAULT 0.00,
  total_hours integer DEFAULT 0,
  credit_fee numeric DEFAULT 0.00,
  duration_group character varying,
  level_id bigint,
  curriculum_id bigint,
  subject_type_id bigint,
  major_id bigint,
  minor_id bigint,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT subjects_pkey PRIMARY KEY (id),
  CONSTRAINT subjects_level_id_fkey FOREIGN KEY (level_id) REFERENCES public.academic_levels(id),
  CONSTRAINT subjects_curriculum_id_fkey FOREIGN KEY (curriculum_id) REFERENCES public.curriculums(id),
  CONSTRAINT subjects_subject_type_id_fkey FOREIGN KEY (subject_type_id) REFERENCES public.subject_types(id)
);
CREATE TABLE public.academic_majors (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  level_id bigint NOT NULL,
  subject_type_id bigint NOT NULL,
  department_id character varying NOT NULL,
  name_th character varying NOT NULL,
  name_en character varying,
  short_name_th character varying NOT NULL,
  head_teacher_id bigint,
  full_major_code text DEFAULT (((level_id)::text || (subject_type_id)::text) || (department_id)::text),
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT academic_majors_pkey PRIMARY KEY (id),
  CONSTRAINT academic_majors_level_id_fkey FOREIGN KEY (level_id) REFERENCES public.academic_levels(id),
  CONSTRAINT academic_majors_subject_type_id_fkey FOREIGN KEY (subject_type_id) REFERENCES public.subject_types(id),
  CONSTRAINT academic_majors_head_teacher_id_fkey FOREIGN KEY (head_teacher_id) REFERENCES public.teachers(id)
);
CREATE TABLE public.academic_minors (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  major_id bigint NOT NULL,
  sub_department_id character varying NOT NULL,
  name_th character varying NOT NULL,
  name_en character varying,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT academic_minors_pkey PRIMARY KEY (id),
  CONSTRAINT academic_minors_major_id_fkey FOREIGN KEY (major_id) REFERENCES public.academic_majors(id)
);
CREATE TABLE public.locations (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  name character varying NOT NULL,
  is_default boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  CONSTRAINT locations_pkey PRIMARY KEY (id)
);
CREATE TABLE public.time_slots (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  time_code character varying NOT NULL UNIQUE,
  time_name character varying NOT NULL,
  time_range character varying NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  CONSTRAINT time_slots_pkey PRIMARY KEY (id)
);
CREATE TABLE public.study_groups (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  batch_id bigint NOT NULL,
  major_id bigint NOT NULL,
  group_code character varying NOT NULL,
  room_code character varying,
  group_no smallint DEFAULT 1,
  group_type character varying DEFAULT 'normal'::character varying,
  group_name character varying NOT NULL,
  teacher_id bigint,
  joint_location_id bigint DEFAULT 1,
  max_seats integer DEFAULT 20,
  current_seats integer DEFAULT 0,
  total_hours integer NOT NULL,
  study_dates_description character varying,
  start_date date,
  end_date date,
  education_type character varying DEFAULT 'วิชาชีพระยะสั้น'::character varying,
  student_type character varying DEFAULT 'ประชาชนทั่วไป'::character varying,
  hour_range_category character varying,
  tuition_fee numeric DEFAULT 0.00,
  application_fee numeric DEFAULT 10.00,
  is_waived_fee boolean DEFAULT false,
  is_ac_maintenance_fee boolean DEFAULT false,
  is_closed boolean DEFAULT false,
  is_cancelled boolean DEFAULT false,
  registration_start_date date,
  registration_end_date date,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  status USER-DEFINED NOT NULL DEFAULT 'open'::study_group_status,
  schedule_description text,
  is_free_tuition boolean NOT NULL DEFAULT false,
  CONSTRAINT study_groups_pkey PRIMARY KEY (id),
  CONSTRAINT study_groups_batch_id_fkey FOREIGN KEY (batch_id) REFERENCES public.batches(id),
  CONSTRAINT study_groups_major_id_fkey FOREIGN KEY (major_id) REFERENCES public.academic_majors(id),
  CONSTRAINT study_groups_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES public.teachers(id),
  CONSTRAINT study_groups_joint_location_id_fkey FOREIGN KEY (joint_location_id) REFERENCES public.locations(id)
);
CREATE TABLE public.study_group_subjects (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  study_group_id bigint NOT NULL,
  subject_id bigint NOT NULL,
  moe_code character varying NOT NULL,
  sequence_order smallint DEFAULT 1,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  CONSTRAINT study_group_subjects_pkey PRIMARY KEY (id),
  CONSTRAINT study_group_subjects_study_group_id_fkey FOREIGN KEY (study_group_id) REFERENCES public.study_groups(id),
  CONSTRAINT study_group_subjects_subject_id_fkey FOREIGN KEY (subject_id) REFERENCES public.subjects(id)
);
CREATE TABLE public.payment_methods (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  bank_name character varying NOT NULL,
  account_name character varying NOT NULL,
  account_number character varying NOT NULL,
  qr_code_url text,
  is_active boolean NOT NULL DEFAULT true,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  CONSTRAINT payment_methods_pkey PRIMARY KEY (id)
);
CREATE TABLE public.applicants (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  citizen_id character varying NOT NULL UNIQUE,
  student_type character varying DEFAULT 'นักศึกษาใหม่'::character varying,
  title_name character varying NOT NULL,
  full_name character varying NOT NULL,
  gender character varying NOT NULL,
  birth_date date NOT NULL,
  marital_status character varying DEFAULT 'โสด'::character varying,
  registered_address text NOT NULL,
  occupation character varying,
  nationality character varying DEFAULT 'ไทย'::character varying,
  religion character varying DEFAULT 'พุทธ'::character varying,
  highest_education character varying,
  previous_school character varying,
  school_province character varying,
  current_address text NOT NULL,
  phone character varying NOT NULL,
  postal_code character varying,
  subdistrict character varying,
  district character varying,
  province character varying,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  house_no character varying,
  moo character varying,
  soi character varying,
  road character varying,
  current_house_no character varying,
  current_moo character varying,
  current_soi character varying,
  current_road character varying,
  current_subdistrict character varying,
  current_district character varying,
  current_province character varying,
  current_postal_code character varying,
  is_same_address boolean DEFAULT true,
  email character varying,
  CONSTRAINT applicants_pkey PRIMARY KEY (id)
);
CREATE TABLE public.enrollments (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  applicant_id bigint NOT NULL,
  study_group_id bigint NOT NULL,
  status USER-DEFINED NOT NULL DEFAULT 'pending_payment'::enrollment_status,
  total_amount numeric NOT NULL DEFAULT 0.00,
  payment_method_id bigint,
  slip_url text,
  receipt_number character varying,
  confirmed_by_user_id uuid,
  apply_date timestamp with time zone DEFAULT timezone('utc'::text, now()),
  payment_date timestamp with time zone,
  receipt_date timestamp with time zone,
  receipt_book_no character varying,
  payment_method character varying DEFAULT 'online_transfer'::character varying,
  rejection_reason text,
  rejected_at timestamp with time zone,
  rejected_by_user_id uuid,
  CONSTRAINT enrollments_pkey PRIMARY KEY (id),
  CONSTRAINT enrollments_applicant_id_fkey FOREIGN KEY (applicant_id) REFERENCES public.applicants(id),
  CONSTRAINT enrollments_study_group_id_fkey FOREIGN KEY (study_group_id) REFERENCES public.study_groups(id),
  CONSTRAINT enrollments_payment_method_id_fkey FOREIGN KEY (payment_method_id) REFERENCES public.payment_methods(id)
);