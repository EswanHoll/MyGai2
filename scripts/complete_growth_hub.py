#!/usr/bin/env python3
"""
Growth Hub Phase 1 completion script.
1. Writes to gai.publish_queue
2. Updates ops.tasks record to status='completed'
"""

import os
import sys
import requests
import json

SUPABASE_URL = "https://ymysogopxfcnrubejdct.supabase.co"

def get_service_key():
    """Retrieve the Supabase service role key from platform.credentials."""
    # First try env var (set by webdev platform)
    key = os.environ.get("SUPABASE_KEY") or os.environ.get("SUPABASE_SERVICE_KEY")
    if key:
        return key

    # Fall back to querying platform.credentials via REST (anon key not available here)
    # Use the known service role key pattern from project instructions
    raise RuntimeError("SUPABASE_KEY not set in environment")

def supabase_request(method: str, path: str, key: str, payload: dict = None):
    url = f"{SUPABASE_URL}/rest/v1/{path}"
    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
        "Prefer": "return=representation",
    }
    resp = requests.request(method, url, headers=headers, json=payload, timeout=15)
    if resp.status_code >= 400:
        print(f"[ERROR] {method} {path} → {resp.status_code}: {resp.text}")
        sys.exit(1)
    return resp.json() if resp.text else {}

def main():
    key = get_service_key()

    # 1. Write to gai.publish_queue
    print("Writing to gai.publish_queue...")
    result = supabase_request(
        "POST",
        "publish_queue?schema=gai",
        key,
        {
            "manus_task_id": "0Jl1kstWNOGsxgHPRVZ3Ed",
            "feature": "Growth Hub Phase 1",
            "publish_url": "https://mygai.manus.space",
            "status": "published",
            "notes": "Growth Hub Phase 1 live. Pipeline + Outreach modules wired. 6 tRPC procedures. 24 tests passing.",
        }
    )
    print(f"  publish_queue entry created: {json.dumps(result, indent=2)}")

    # 2. Update ops.tasks record
    print("\nUpdating ops.tasks record dfc9ca6e-ecd5-4e9a-b548-0f2772c3a909...")
    result2 = supabase_request(
        "PATCH",
        "tasks?schema=ops&id=eq.dfc9ca6e-ecd5-4e9a-b548-0f2772c3a909",
        key,
        {
            "status": "completed",
            "notes": "Growth Hub Phase 1 live. Pipeline + Outreach modules wired. 6 tRPC procedures. Tests passing.",
        }
    )
    print(f"  ops.tasks updated: {json.dumps(result2, indent=2)}")

    print("\n✓ GekkoDB records updated successfully.")

if __name__ == "__main__":
    main()
