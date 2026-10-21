-- =============================================================================
-- LOCAL DEMO ONLY — not a Flyway migration. Adds one account per role so every console can be
-- exercised on a developer machine. Password for all: ReviewerDemo!23 (same argon2id hash as the
-- V016/V018 demo reviewer and content admin). MFA is off for these demo logins only.
--
--   infra/scripts/seed_local_demo.sh   (or: docker exec -i studyloop-postgres-1 psql -U studyloop_owner -d studyloop < infra/scripts/seed_local_demo_roles.sql)
-- Safe to run more than once.
-- =============================================================================

DO $$
DECLARE
  v_hash   TEXT := '$argon2id$v=19$m=65536,t=3,p=1$4yyWMxlLn2cnIAfoTEpEAg$odao6/avcWsXS67kDV9vxGybvAHS07rCihqVpH3AvBA';
  v_school UUID;
  v_spec   BIGINT;
  v_class  UUID := 'c4000000-0000-4000-8000-000000000001';
  v_alex   UUID;
  v_id     UUID;
  v_teacher UUID;
  rec      RECORD;
BEGIN
  SELECT school_id INTO v_school FROM school ORDER BY created_at LIMIT 1;
  IF v_school IS NULL THEN
    INSERT INTO school (name, urn, region, email_domain, status, seats_purchased)
    VALUES ('Demo Academy', 'DEMO-0001', 'London', 'demoacademy.sch.uk', 'ACTIVE', 120)
    RETURNING school_id INTO v_school;
  END IF;

  FOR rec IN
    SELECT * FROM (VALUES
      ('b4000000-0000-4000-8000-000000000001'::uuid, 'teacher@studyloop.local',    'Demo Teacher',          'TEACHER',      'TEACHER',           TRUE),
      ('b4000000-0000-4000-8000-000000000002'::uuid, 'schooladmin@studyloop.local','Demo School Admin',     'SCHOOL_ADMIN', 'SCHOOL_ADMIN',      TRUE),
      ('b4000000-0000-4000-8000-000000000003'::uuid, 'ops@studyloop.local',        'Demo Ops Reviewer',     'STAFF',        'OPS_REVIEWER',      FALSE),
      ('b4000000-0000-4000-8000-000000000004'::uuid, 'dsl@studyloop.local',        'Demo Safeguarding Lead','STAFF',        'SAFEGUARDING_LEAD', FALSE),
      ('b4000000-0000-4000-8000-000000000005'::uuid, 'support@studyloop.local',    'Demo Support Agent',    'STAFF',        'SUPPORT',           FALSE),
      ('b4000000-0000-4000-8000-000000000006'::uuid, 'compliance@studyloop.local', 'Demo Compliance',       'STAFF',        'COMPLIANCE',        FALSE),
      ('b4000000-0000-4000-8000-000000000007'::uuid, 'aiengineer@studyloop.local', 'Demo AI Engineer',      'STAFF',        'AI_ENGINEER',       FALSE),
      ('b4000000-0000-4000-8000-000000000008'::uuid, 'owner@studyloop.local',      'Demo Product Owner',    'STAFF',        'PRODUCT_OWNER',     FALSE)
    ) AS t(id, email, name, kind, role, school)
  LOOP
    -- Re-runnable: an existing account with this email (any id) is reused, never duplicated.
    SELECT account_id INTO v_id FROM account WHERE email = rec.email;
    IF v_id IS NULL THEN
      INSERT INTO account (account_id, email, password_hash, display_name, kind, status, mfa_required, email_verified_at, school_id)
      VALUES (rec.id, rec.email, v_hash, rec.name, rec.kind, 'ACTIVE', FALSE, now(), CASE WHEN rec.school THEN v_school END)
      ON CONFLICT (account_id) DO NOTHING;
      v_id := rec.id;
    END IF;
    INSERT INTO account_role (account_id, role) VALUES (v_id, rec.role) ON CONFLICT DO NOTHING;
    IF rec.role = 'TEACHER' THEN
      v_teacher := v_id;
    END IF;
  END LOOP;

  SELECT specification_id INTO v_spec FROM specification WHERE spec_code = '8462' LIMIT 1;
  INSERT INTO school_class (class_id, school_id, name, year_group, specification_id, academic_year)
  VALUES (v_class, v_school, '10C Chemistry', 'Y10', v_spec, '2026/27')
  ON CONFLICT (class_id) DO NOTHING;
  INSERT INTO class_teacher (class_id, account_id, is_owner)
  VALUES (v_class, v_teacher, TRUE)
  ON CONFLICT DO NOTHING;

  SELECT student_id INTO v_alex FROM student_profile WHERE display_name = 'Alex' ORDER BY created_at LIMIT 1;
  IF v_alex IS NOT NULL THEN
    INSERT INTO class_pupil (class_id, student_id) VALUES (v_class, v_alex) ON CONFLICT DO NOTHING;
  END IF;
END $$;
