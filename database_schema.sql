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
  email character varying UNIQUE,
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