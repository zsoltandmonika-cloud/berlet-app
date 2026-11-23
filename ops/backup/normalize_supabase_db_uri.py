#!/usr/bin/env python3
"""Normalize a user-pasted Supabase Postgres URI safely.

A raw '@' in a password otherwise gets mistaken for the separator before the
host. Read the secret only from the environment. Never print the raw URI.
"""
import os
import sys
from urllib.parse import quote, unquote, urlsplit, urlunsplit


def normalize(uri: str) -> str:
    uri = uri.strip()
    if uri.startswith("postgresql://"):
        rest = uri[len("postgresql://"):]
    elif uri.startswith("postgres://"):
        rest = uri[len("postgres://"):]
    else:
        raise ValueError("Expected postgresql:// URI")
    if "@" not in rest:
        raise ValueError("Missing user/host separator")
    userinfo, hostpart = rest.rsplit("@", 1)
    if ":" not in userinfo:
        raise ValueError("Missing password separator")
    username, password = userinfo.split(":", 1)
    if not username or not password:
        raise ValueError("Empty database user or password")
    if password.startswith("[YOUR-") or "[YOUR-DATABASE-PASSWORD]" in password:
        raise ValueError("Password placeholder has not been replaced")
    parsed = urlsplit("postgresql://" + hostpart)
    host = (parsed.hostname or "").lower()
    if not (host.endswith(".pooler.supabase.com") or
            host == "db.vhsrupphzcjkdrusonzh.supabase.co"):
        raise ValueError("Database host is not an approved Supabase endpoint")
    if parsed.username or parsed.password:
        raise ValueError("Unexpected userinfo in host portion")
    if parsed.port is not None and parsed.port not in (5432, 6543):
        raise ValueError("Unexpected database port")
    if parsed.fragment:
        raise ValueError("Unexpected fragment in database host")
    # Decode previously URL-escaped characters once, then encode all reserved
    # characters, including the raw @ that commonly breaks pasted URLs.
    user = quote(unquote(username), safe=".")
    pwd = quote(unquote(password), safe="")
    path = parsed.path or "/postgres"
    if path != "/postgres":
        raise ValueError("Unexpected database name/path")
    return urlunsplit(("postgresql", user + ":" + pwd + "@" +
                       parsed.netloc, path, parsed.query, ""))


if __name__ == "__main__":
    try:
        print(normalize(os.environ.get("SUPABASE_DB_URL", "")))
    except Exception:
        print("ERROR: Invalid Supabase database URI. No credentials were printed.", file=sys.stderr)
        sys.exit(2)
