-- W2 pilot: promo, school seed, safeguarding SLA config, boundary attestation seed window
-- Forward-only; does not edit V001–V014.

INSERT INTO promo_code (code, percent_off, months, max_redemptions, redeemed_count, valid_until)
VALUES ('PILOT10', 10.00, 1, 1000, 0, CURRENT_DATE + INTERVAL '365 days')
ON CONFLICT (code) DO NOTHING;

INSERT INTO app_config (config_key, value_json, description) VALUES
 ('safeguarding.sla_immediate_minutes', '15', 'DSL SLA IMMEDIATE'),
 ('safeguarding.sla_same_day_hours', '4', 'DSL SLA SAME_DAY'),
 ('safeguarding.sla_routine_hours', '24', 'DSL SLA ROUTINE'),
 ('billing.sibling_discount_pct', '10', 'Sibling discount percent (placeholder)'),
 ('billing.vat_pct', '20', 'UK VAT percent for previews'),
 ('pen_test.status', '"SCHEDULED"', 'External pen-test schedule status for W2 gate'),
 ('pen_test.scope_pack', '"docs/waves/W2_gate_report.md#pen-test"', 'Pen-test scope reference')
ON CONFLICT (config_key) DO NOTHING;

-- Pilot school (deterministic UUID for demo scripts)
INSERT INTO school (school_id, name, urn, status, seats_purchased, created_at)
SELECT 'a1000000-0000-4000-8000-000000000001'::uuid, 'Pilot Academy', '999001', 'ACTIVE', 120, now()
WHERE NOT EXISTS (SELECT 1 FROM school WHERE school_id = 'a1000000-0000-4000-8000-000000000001'::uuid);

INSERT INTO school_dpa_status (school_id, status, template_version, sent_at)
VALUES ('a1000000-0000-4000-8000-000000000001'::uuid, 'SENT', 'dpa-v1', now())
ON CONFLICT (school_id) DO NOTHING;

-- Seed 14 clean boundary attestation days for gate harness (not a live 14-day wait)
INSERT INTO boundary_attestation (attestation_id, day, checks_json, passed, created_at)
SELECT gen_random_uuid(), (CURRENT_DATE - (g || ' days')::interval)::date,
       jsonb_build_object('canary_identities_found', 0, 'payloads_scanned', 10 + g, 'source', 'w2_seed'),
       TRUE, now()
FROM generate_series(0, 13) AS g
ON CONFLICT (day) DO NOTHING;
