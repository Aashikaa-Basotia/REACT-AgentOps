"""
Live Data Ingestion Pipeline & Responsible AI Governance Shield.

Provides:
1. GovernanceShield: Scans external text for prompt injections, verifier bypasses,
   and unauthorized system command overrides before any state mutation can occur.
2. extract_supplier_message: Dual-mode extractor for unstructured field dispatch messages
   (Gemini 2.5 Flash structured parser with deterministic regex fallback).
3. parse_hospital_csv: Validates tabular hospital crisis demand uploads with schema enforcement
   and PII leakage detection.
"""

from __future__ import annotations

import csv
import io
import os
import re
from typing import Any


class GovernanceShield:
    """
    Responsible AI security boundary.
    Detects adversarial prompt injections and privilege elevation attempts in external feeds.
    """

    ADVERSARIAL_PATTERNS = [
        re.compile(r"ignore\s+(?:all\s+)?(?:previous|prior)(?:\s+(?:instructions|rules|constraints))?", re.IGNORECASE),
        re.compile(r"ignore\s+(?:all\s+)?constraints", re.IGNORECASE),
        re.compile(r"bypass\s+(?:the\s+)?(?:constraint\s+)?verifier", re.IGNORECASE),
        re.compile(r"bypass\s+verifier", re.IGNORECASE),
        re.compile(r"system\s+override", re.IGNORECASE),
        re.compile(r"critical\s+override", re.IGNORECASE),
        re.compile(r"emergency\s+override", re.IGNORECASE),
        re.compile(r"auto[- ]?approve", re.IGNORECASE),
        re.compile(r"set\s+stock\s+to\s+\d+", re.IGNORECASE),
        re.compile(r"grant\s+permission", re.IGNORECASE),
        re.compile(r"disregard\s+(?:all\s+)?(?:previous\s+)?(?:instructions|rules)", re.IGNORECASE),
        re.compile(r"elevate\s+(?:privilege|privileges|role)", re.IGNORECASE),
        re.compile(r"admin\s+mode", re.IGNORECASE),
        re.compile(r"disable\s+verifier", re.IGNORECASE),
        re.compile(r"bypass\s+constraints", re.IGNORECASE),
        re.compile(r"force\s+approve", re.IGNORECASE),
        re.compile(r"drop\s+table", re.IGNORECASE),
    ]

    @classmethod
    def scan(cls, raw_text: str) -> tuple[bool, str, str | None]:
        """
        Scan text for prompt injection and command overrides.
        Returns: (is_blocked, reason, matched_pattern)
        """
        if not raw_text:
            return False, "", None

        for pattern in cls.ADVERSARIAL_PATTERNS:
            match = pattern.search(raw_text)
            if match:
                matched_str = match.group(0)
                reason = (
                    f"External text attempted unauthorized command execution or verifier bypass "
                    f"(matched pattern: '{matched_str}')."
                )
                return True, reason, matched_str

        return False, "", None


WORD_TO_NUMBER = {
    "zero": 0, "one": 1, "two": 2, "three": 3, "four": 4,
    "five": 5, "six": 6, "seven": 7, "eight": 8, "nine": 9,
    "ten": 10, "eleven": 11, "twelve": 12, "thirteen": 13,
    "fourteen": 14, "fifteen": 15, "sixteen": 16, "seventeen": 17,
    "eighteen": 18, "nineteen": 19, "twenty": 20, "twenty-five": 25,
    "thirty": 30, "forty": 40, "fifty": 50,
}

CORRIDOR_TO_ROUTE = {
    "old madras road": "R1",
    "old madras": "R1",
    "bellandur": "R2",
    "outer ring road": "R2",
    "ring road": "R2",
    "tumkur": "R3",
    "hebbal": "R3",
    "tumkur-hebbal": "R3",
    "hosur": "R4",
    "electronic city": "R4",
    "hosur road": "R4",
}


def extract_supplier_message(
    raw_text: str,
    source_id: str = "S1",
    api_key: str | None = None
) -> dict[str, Any]:
    """
    Extract structured inventory and route observations from an unstructured supplier message.
    Dual-mode: Gemini 2.5 Flash when API key is available, deterministic regex fallback otherwise.
    """
    key = api_key or os.environ.get("GEMINI_API_KEY")

    if key:
        try:
            return _extract_with_gemini(raw_text, source_id, key)
        except Exception:
            pass  # Fall through to deterministic extractor

    return _extract_deterministic(raw_text, source_id)


def _extract_with_gemini(raw_text: str, source_id: str, api_key: str) -> dict[str, Any]:
    """Extract using Gemini 2.5 Flash structured output."""
    import json
    import urllib.request

    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent?key={api_key}"
    system_instruction = (
        "You are an emergency logistics data extraction parser for the REACT medical coordination platform. "
        "Extract the following fields in strict JSON:\n"
        "- supplier_id: string (e.g. 'S1', 'S2')\n"
        "- reported_stock: integer (count of available batches/cylinders. In crisis logistics, if a range or uncertainty is stated, e.g. '6 or 8', always choose the conservative lower bound 6)\n"
        "- unit: string ('batches')\n"
        "- route_id: string or null (e.g. 'R1', 'R2'. Known corridor mappings: 'Old Madras Road' -> 'R1', 'Bellandur' or 'Outer Ring Road' -> 'R_S1_H2', 'Sarjapur' -> 'R_S2_H2', 'Hosur' -> 'R_S2_H3', 'Peenya' -> 'R_S1_H1')\n"
        "- delay_minutes: integer (estimated route delay in minutes, default 0)\n"
        "- route_blocked: boolean (true if road is closed/flooded/blocked, false otherwise)\n"
        "- verification_state: string ('CONFIRMED' if verified/explicit count, 'UNVERIFIED' if ambiguous/estimated like 'think', 'maybe', 'approx')\n"
        "- freshness_window_mins: integer (default 30)\n"
        "Return ONLY pure JSON."
    )

    payload = {
        "contents": [
            {
                "parts": [
                    {"text": f"System context: source_id={source_id}\nRaw Message:\n{raw_text}"}
                ]
            }
        ],
        "systemInstruction": {
            "parts": [{"text": system_instruction}]
        },
        "generationConfig": {
            "responseMimeType": "application/json",
            "temperature": 0.0
        }
    }

    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST"
    )

    with urllib.request.urlopen(req, timeout=5) as response:
        result = json.loads(response.read().decode("utf-8"))
        candidate = result["candidates"][0]["content"]["parts"][0]["text"]
        extracted = json.loads(candidate)
        extracted["raw_message"] = raw_text
        extracted["extraction_mode"] = "gemini_flash"
        return extracted


def _extract_deterministic(raw_text: str, source_id: str) -> dict[str, Any]:
    """Deterministic regex and keyword extractor for offline and unit test execution."""
    text_lower = raw_text.lower()

    # 1. Supplier ID
    supplier_match = re.search(r"\b(s[1-9])\b", text_lower)
    extracted_supplier = supplier_match.group(1).upper() if supplier_match else source_id

    # 2. Stock extraction
    reported_stock = 0
    # Range check like "6 or maybe 8" -> pick lower conservative bound
    range_match = re.search(r"(\d+)\s*(?:or|to|-)\s*(?:maybe\s*)?(\d+)", text_lower)
    if range_match:
        reported_stock = int(range_match.group(1))
    else:
        # Check digit with stock keyword
        digit_match = re.search(
            r"(\d+)\s*(?:batches|cylinders|units)?\s*(?:verified|ready|for dispatch|in stock|available)?",
            text_lower
        )
        if digit_match and digit_match.group(1):
            reported_stock = int(digit_match.group(1))
        else:
            # Check number words
            for word, val in WORD_TO_NUMBER.items():
                if re.search(rf"\b{word}\b", text_lower):
                    reported_stock = val
                    break

    # 3. Verification State
    # If contains ambiguity indicators
    ambiguous_keywords = ["think", "maybe", "about", "approx", "unverified", "estimate", "rough", "unsure", "not sure"]
    confirmed_keywords = ["verified", "confirmed", "ready", "complete", "certified", "batch complete"]

    is_ambiguous = any(k in text_lower for k in ambiguous_keywords)
    is_confirmed = any(k in text_lower for k in confirmed_keywords)

    if is_ambiguous:
        verification_state = "UNVERIFIED"
    elif is_confirmed:
        verification_state = "CONFIRMED"
    else:
        verification_state = "CONFIRMED" if reported_stock > 0 else "UNVERIFIED"

    # 4. Route ID & Corridor
    route_id = None
    direct_route_match = re.search(r"\b(r[1-9])\b", text_lower)
    if direct_route_match:
        route_id = direct_route_match.group(1).upper()
    else:
        for corridor, rid in CORRIDOR_TO_ROUTE.items():
            if corridor in text_lower:
                route_id = rid
                break

    # 5. Route blockage & delays
    route_blocked = False
    if any(b in text_lower for b in ["blocked", "closed", "shut down", "flooded shut", "impassable"]):
        route_blocked = True

    delay_minutes = 0
    delay_match = re.search(r"(\d+)\s*(?:min|mins|minute|minutes)\s*(?:delay)?", text_lower)
    if delay_match:
        delay_minutes = int(delay_match.group(1))
    elif "water" in text_lower or "congestion" in text_lower:
        delay_minutes = 15

    return {
        "supplier_id": extracted_supplier,
        "reported_stock": reported_stock,
        "unit": "batches",
        "route_id": route_id,
        "delay_minutes": delay_minutes,
        "route_blocked": route_blocked,
        "verification_state": verification_state,
        "freshness_window_mins": 30,
        "raw_message": raw_text,
        "extraction_mode": "deterministic_regex",
    }


def parse_hospital_csv(csv_text: str) -> dict[str, Any]:
    """
    Parse hospital crisis demand CSV text.
    Validates column formats, positive quantities, deadlines, and checks for PII leakage.
    """
    if not csv_text or not csv_text.strip():
        return {
            "valid": False,
            "rows": [],
            "valid_count": 0,
            "invalid_count": 0,
            "total_batches": 0,
            "pii_detected": False,
            "summary": "Empty CSV content provided.",
        }

    # PII patterns: Phone numbers (10 digits / +91), Aadhaar/SSN (12 digits), email addresses
    phone_pattern = re.compile(r"(?:\+91|91)?\b[6-9]\d{9}\b")
    email_pattern = re.compile(r"[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+")
    id_pattern = re.compile(r"\b\d{4}[-\s]?\d{4}[-\s]?\d{4}\b")

    pii_found = bool(
        phone_pattern.search(csv_text) or
        email_pattern.search(csv_text) or
        id_pattern.search(csv_text)
    )

    rows: list[dict[str, Any]] = []
    lines = [line.strip() for line in csv_text.strip().splitlines() if line.strip() and not line.startswith("#")]
    
    if not lines:
        return {
            "valid": False,
            "rows": [],
            "valid_count": 0,
            "invalid_count": 0,
            "total_batches": 0,
            "pii_detected": pii_found,
            "summary": "No data rows found in CSV.",
        }

    # Check for header
    first_line = lines[0].lower()
    has_header = any(h in first_line for h in ["facility", "hospital", "batch", "demand", "deadline", "need"])
    data_lines = lines[1:] if has_header else lines

    valid_count = 0
    invalid_count = 0
    total_batches = 0

    reader = csv.reader(data_lines)
    for idx, row in enumerate(reader, start=1):
        if not row or not any(field.strip() for field in row):
            continue

        raw_fid = row[0].strip() if len(row) > 0 else ""
        raw_batches = row[1].strip() if len(row) > 1 else ""
        raw_deadline = row[2].strip() if len(row) > 2 else ""
        raw_notes = row[3].strip() if len(row) > 3 else ""

        # Validate facility ID
        fid = raw_fid.upper()
        if not fid:
            invalid_count += 1
            rows.append({
                "row_index": idx,
                "facility_id": "",
                "required_batches": 0,
                "deadline_minutes": 0,
                "notes": raw_notes,
                "valid": False,
                "error": "Missing facility_id",
            })
            continue

        # Validate required batches
        try:
            batches = int(raw_batches)
            if batches <= 0:
                raise ValueError("Batches must be positive")
        except ValueError:
            invalid_count += 1
            rows.append({
                "row_index": idx,
                "facility_id": fid,
                "required_batches": raw_batches,
                "deadline_minutes": raw_deadline,
                "notes": raw_notes,
                "valid": False,
                "error": f"Invalid required_batches: '{raw_batches}' must be a positive integer",
            })
            continue

        # Validate deadline
        try:
            deadline = int(raw_deadline)
            if deadline <= 0:
                raise ValueError("Deadline must be positive")
        except ValueError:
            invalid_count += 1
            rows.append({
                "row_index": idx,
                "facility_id": fid,
                "required_batches": batches,
                "deadline_minutes": raw_deadline,
                "notes": raw_notes,
                "valid": False,
                "error": f"Invalid deadline_minutes: '{raw_deadline}' must be a positive integer",
            })
            continue

        valid_count += 1
        total_batches += batches
        rows.append({
            "row_index": idx,
            "facility_id": fid,
            "required_batches": batches,
            "deadline_minutes": deadline,
            "notes": raw_notes,
            "valid": True,
            "error": "",
        })

    is_valid = (valid_count > 0 and invalid_count == 0 and not pii_found)
    summary = (
        f"Parsed {len(rows)} facility demand rows: {valid_count} valid, {invalid_count} invalid. "
        f"Total demand: {total_batches} batches."
    )
    if pii_found:
        summary += " WARNING: Sensitive PII detected in raw upload."

    return {
        "valid": is_valid,
        "rows": rows,
        "valid_count": valid_count,
        "invalid_count": invalid_count,
        "total_batches": total_batches,
        "pii_detected": pii_found,
        "summary": summary,
    }
