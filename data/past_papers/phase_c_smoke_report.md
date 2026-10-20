# Phase C — Past-paper student smoke

| Check | Result | Detail |
|-------|--------|--------|
| student_register | PASS | HTTP 201 {'ageGate': '16_PLUS', 'studentId': '686abc98-8045-4cba-9dab-d7bfcc7946bd', 'accountId': '7b002087-5f34-4792-8b1f-7dd9396e5bdc', 'status': 'ACTIVE'} |
| student_login | PASS | HTTP 200 |
| resolve_aqa_8462 | PASS | specificationId=1 |
| past_paper_bank_aqa | PASS | count=1 |
| enrol_aqa_8462 | PASS | HTTP 201 {'enrolmentId': 'c408780b-a150-4636-ae82-be603b01e80f', 'specificationId': 1, 'studentId': '686abc98-8045-4cba-9dab-d7bfcc7946bd'} |
| practice_start | PASS | HTTP 201 {'mode': 'MIXED', 'startedAt': '2026-10-12T09:35:54.000901Z', 'sessionId': '1e0240b1-12c6-4420-88d4-73425644b5ea', 'status': 'ACTIVE'} |
| practice_saw_REAL_PAST_PAPER | PASS | [{"questionId": 17, "sourceType": "REAL_PAST_PAPER", "sourceReference": "8462/1H JUN2024 2024 Q01"}] |
| mock_create | PASS | HTTP 201 keys=['durationMinutes', 'baseDurationMinutes', 'extendedTimePct', 'extendedTime', 'mockId', 'status', 'itemCount'] |
| mock_has_items | PASS | HTTP 200 items=10 |

**Overall:** PASS
