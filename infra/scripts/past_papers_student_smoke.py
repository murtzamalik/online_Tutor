#!/usr/bin/env python3
"""Phase C smoke: student enrol → practice → mock using REAL_PAST_PAPER bank items."""

from __future__ import annotations

import json
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

BASE = "http://127.0.0.1:8081/api/v1"
REPORT = Path(__file__).resolve().parents[2] / "data" / "past_papers" / "phase_c_smoke_report.md"


def http(method: str, path: str, token: str | None = None, body: dict | None = None):
    data = None if body is None else json.dumps(body).encode("utf-8")
    headers = {"Content-Type": "application/json", "Accept": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(f"{BASE}{path}", data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            raw = resp.read().decode("utf-8")
            if not raw:
                return resp.status, {}
            try:
                return resp.status, json.loads(raw)
            except json.JSONDecodeError:
                return resp.status, raw
    except urllib.error.HTTPError as e:
        raw = e.read().decode("utf-8", errors="replace")
        try:
            return e.code, json.loads(raw)
        except Exception:
            return e.code, raw


def write_report(checks: list[tuple[str, bool, str]]) -> None:
    lines = [
        "# Phase C — Past-paper student smoke",
        "",
        "| Check | Result | Detail |",
        "|-------|--------|--------|",
    ]
    for name, ok, detail in checks:
        lines.append(f"| {name} | {'PASS' if ok else 'FAIL'} | {detail.replace('|', '/')} |")
    overall = all(ok for _, ok, _ in checks)
    lines += ["", f"**Overall:** {'PASS' if overall else 'FAIL'}", ""]
    REPORT.write_text("\n".join(lines), encoding="utf-8")
    print(f"Wrote {REPORT}")


def main() -> int:
    checks: list[tuple[str, bool, str]] = []

    email = f"pastpaper.student.{int(time.time())}@studyloop.local"
    password = "StudentDemo!234"
    code, reg = http(
        "POST",
        "/auth/student/register",
        None,
        {
            "email": email,
            "password": password,
            "displayName": "Past Paper Student",
            "ageYears": 16,
            "acceptTerms": True,
        },
    )
    ok = code in (200, 201) and isinstance(reg, dict) and "studentId" in reg
    checks.append(("student_register", ok, f"HTTP {code} {reg}"))
    if not ok:
        write_report(checks)
        return 1
    student_id = reg["studentId"]

    code, login = http("POST", "/auth/login", None, {"email": email, "password": password})
    token = login.get("accessToken") if isinstance(login, dict) else None
    ok = code == 200 and bool(token)
    checks.append(("student_login", ok, f"HTTP {code}"))
    if not ok:
        write_report(checks)
        return 1

    code, clogin = http(
        "POST",
        "/auth/login",
        None,
        {"email": "content@studyloop.local", "password": "ReviewerDemo!23"},
    )
    ctoken = clogin.get("accessToken") if isinstance(clogin, dict) else None
    code, specs = http("GET", "/internal/specs", ctoken)
    spec_id = None
    if isinstance(specs, dict):
        for it in specs.get("items") or []:
            if it.get("specCode") == "8462":
                spec_id = it.get("specificationId")
                break
    checks.append(("resolve_aqa_8462", spec_id is not None, f"specificationId={spec_id}"))
    if spec_id is None:
        write_report(checks)
        return 1

    # Confirm past-paper bank for this spec
    code, qs = http("GET", "/internal/questions?status=APPROVED", ctoken)
    past_bank = []
    if isinstance(qs, dict):
        past_bank = [
            x
            for x in (qs.get("items") or [])
            if x.get("sourceType") == "REAL_PAST_PAPER"
            and int(x.get("specificationId", -1)) == int(spec_id)
        ]
    checks.append(("past_paper_bank_aqa", len(past_bank) >= 1, f"count={len(past_bank)}"))

    code, enr = http(
        "POST",
        f"/students/{student_id}/enrolments",
        token,
        {"specificationId": spec_id, "tier": "HIGHER"},
    )
    enrolment_id = None
    if isinstance(enr, dict):
        enrolment_id = enr.get("enrolmentId") or enr.get("enrolment_id")
    ok = code in (200, 201) and enrolment_id
    checks.append(("enrol_aqa_8462", bool(ok), f"HTTP {code} {enr}"))
    if not ok:
        write_report(checks)
        return 1

    code, session = http(
        "POST",
        "/practice/sessions",
        token,
        {"enrolmentId": enrolment_id, "mode": "MIXED"},
    )
    session_id = session.get("sessionId") if isinstance(session, dict) else None
    checks.append(("practice_start", code in (200, 201) and bool(session_id), f"HTTP {code} {session}"))
    if not session_id:
        write_report(checks)
        return 1

    saw_past = False
    seen = []
    qid = None
    for _ in range(15):
        code, nxt = http("GET", f"/practice/sessions/{session_id}/next", token)
        if not isinstance(nxt, dict):
            break
        if nxt.get("done"):
            break
        question = nxt.get("question") if isinstance(nxt.get("question"), dict) else nxt
        source_type = question.get("sourceType") or question.get("source_type")
        source_ref = question.get("sourceReference") or question.get("source_reference")
        qid = question.get("questionId") or question.get("question_id")
        if qid:
            seen.append({"questionId": qid, "sourceType": source_type, "sourceReference": source_ref})
        if source_type == "REAL_PAST_PAPER":
            saw_past = True
            # submit a typed answer to complete a practice step
            http(
                "POST",
                f"/practice/sessions/{session_id}/answers",
                token,
                {"questionId": qid, "answer": {"text": "smoke answer"}, "timeSpentMs": 500},
            )
            break
        if qid:
            http(
                "POST",
                f"/practice/sessions/{session_id}/answers",
                token,
                {"questionId": qid, "answer": {"text": "smoke"}, "timeSpentMs": 200},
            )

    checks.append(("practice_saw_REAL_PAST_PAPER", saw_past, json.dumps(seen[:10])))

    code, mock = http(
        "POST",
        "/mock-papers",
        token,
        {"enrolmentId": enrolment_id, "durationMinutes": 45, "sourceKind": "GENERATED"},
    )
    mock_id = mock.get("mockId") if isinstance(mock, dict) else None
    checks.append(("mock_create", code in (200, 201) and bool(mock_id), f"HTTP {code} keys={list(mock) if isinstance(mock, dict) else mock}"))

    mock_item_count = 0
    if mock_id:
        code, detail = http("GET", f"/mock-papers/{mock_id}", token)
        items = detail.get("items") if isinstance(detail, dict) else None
        if items is None and isinstance(detail, dict):
            items = detail.get("questions") or []
        mock_item_count = len(items or [])
        checks.append(("mock_has_items", mock_item_count >= 1, f"HTTP {code} items={mock_item_count}"))

    write_report(checks)
    failed = [c for c in checks if not c[1]]
    print(json.dumps({"email": email, "checks": checks, "failed": len(failed)}, indent=2, default=str))
    return 1 if failed else 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as e:
        print(f"ERROR: {e}", file=sys.stderr)
        raise SystemExit(1)
