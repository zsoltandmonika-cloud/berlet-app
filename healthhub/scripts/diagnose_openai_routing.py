#!/usr/bin/env python3
"""Minimal on-demand OpenAI auth/routing probe. Logs no keys, prompts or response bodies."""
import json
import os
import sys
import urllib.error
import urllib.request

URL = "https://api.openai.com/v1/responses"
key = os.environ.get("OPENAI_API_KEY", "").strip()
org = os.environ.get("OPENAI_ORG_ID", "").strip()
project = os.environ.get("OPENAI_PROJECT_ID", "").strip()
model = os.environ.get("HEALTHHUB_AI_MODEL", "gpt-4.1-mini").strip() or "gpt-4.1-mini"

if not key:
    sys.exit("PROBE: OPENAI_API_KEY missing; no API call made")

payload = json.dumps({
    "model": model, "store": False,
    "input": "Reply exactly with: OK",
    "max_output_tokens": 32
}).encode("utf-8")
allow_codes = {
    "credit_balance_exhausted", "insufficient_quota", "rate_limit_exceeded",
    "invalid_api_key", "invalid_project", "invalid_organization",
    "invalid_authentication", "permission_denied", "model_not_found",
    "organization_not_found", "project_not_found", "billing_hard_limit_reached",
    "organization_spend_limit_exceeded", "project_spend_limit_exceeded",
    "invalid_request_error"
}

def test(label, extra):
    headers = {"Authorization": "Bearer " + key, "Content-Type": "application/json"}
    headers.update(extra)
    req = urllib.request.Request(URL, data=payload, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=45) as response:
            result = json.loads(response.read(100000))
            status = str(result.get("status") or "unknown")
            print("PROBE", label, "HTTP", response.status, "api_status", status,
                  "request_id", str(response.headers.get("x-request-id") or "unavailable")[:100])
            return response.status == 200 and status == "completed"
    except urllib.error.HTTPError as error:
        try:
            info = json.loads(error.read(8192)).get("error", {})
            code = str(info.get("code") or "")
        except (ValueError, TypeError):
            code = ""
        code = code if code in allow_codes else "other"
        print("PROBE", label, "HTTP", error.code, "error_code", code,
              "request_id", str(error.headers.get("x-request-id") or "unavailable")[:100])
        return False
    except Exception as error:
        print("PROBE", label, "transport_error_type", type(error).__name__)
        return False

cases = []
if org and project:
    cases.append(("explicit_org_project", {"OpenAI-Organization": org, "OpenAI-Project": project}))
if org:
    cases.append(("explicit_org_only", {"OpenAI-Organization": org}))
cases.append(("key_default_routing", {}))

any_ok = False
for name, headers in cases:
    if test(name, headers):
        print("PROBE RESULT: API auth and billing work in routing mode", name)
        any_ok = True
        break

if not any_ok:
    sys.exit("PROBE RESULT: no routing mode succeeded")
