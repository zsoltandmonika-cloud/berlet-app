#!/usr/bin/env python3
"""Select 30 daily + 12 monthly SHO recovery points. Planning only: never deletes."""
import re
from collections import defaultdict

RUN = re.compile(r'^(?P<date>[0-9]{8})T[0-9]{6}Z-[0-9]+$')


def keep_sets(verified_ids):
    ids = sorted(set(i for i in verified_ids if RUN.fullmatch(i)))
    by_day = {}
    by_month = {}
    for backup_id in ids:
        date = backup_id[:8]
        by_day[date] = backup_id     # latest verified run on each day
        by_month[date[:6]] = backup_id
    daily = [by_day[k] for k in sorted(by_day, reverse=True)[:30]]
    monthly = [by_month[k] for k in sorted(by_month, reverse=True)[:12]]
    keep = set(daily) | set(monthly)
    return {
        'daily_keep': daily,
        'monthly_keep': monthly,
        'keep': sorted(keep),
        'eligible_after_manual_restore_approval': [i for i in ids if i not in keep],
    }


if __name__ == '__main__':
    import json
    import sys
    print(json.dumps(keep_sets(json.load(sys.stdin)['verified_ids']), indent=2))
