from __future__ import annotations
import json
import re
from typing import Any

_PLACEHOLDER_RE = re.compile(r"\{\{\s*([a-zA-Z0-9_]+)(?:\.([^\}]+))?\s*\}\}")

def _get_path(obj: Any, path: str) -> Any:
    """Hỗ trợ path dạng data.net_salary, data[0].id, ..."""
    if not path:
        return obj
    cur = obj
    # tách theo dấu . nhưng vẫn cho phép [i]
    parts = path.split(".")
    for p in parts:
        if cur is None:
            return None
        # xử lý a[0]
        m = re.match(r"^([a-zA-Z0-9_]+)\[(\d+)\]$", p)
        if m:
            key = m.group(1)
            idx = int(m.group(2))
            if isinstance(cur, dict):
                cur = cur.get(key)
            else:
                return None
            if isinstance(cur, list) and 0 <= idx < len(cur):
                cur = cur[idx]
            else:
                return None
        else:
            if isinstance(cur, dict):
                cur = cur.get(p)
            elif isinstance(cur, list):
                # nếu p là số
                if p.isdigit():
                    i = int(p)
                    cur = cur[i] if 0 <= i < len(cur) else None
                else:
                    return None
            else:
                return None
    return cur

def render_placeholders(value: Any, store: dict) -> Any:
    """
    - Nếu value là str: replace {{s1.data.xxx}} bằng dữ liệu từ store.
    - Nếu value là dict/list: render đệ quy.
    """
    if value is None:
        return None
    if isinstance(value, dict):
        return {k: render_placeholders(v, store) for k, v in value.items()}
    if isinstance(value, list):
        return [render_placeholders(v, store) for v in value]
    if not isinstance(value, str):
        return value

    def repl(match: re.Match) -> str:
        step_id = match.group(1)
        path = match.group(2) or ""
        obj = store.get(step_id)
        v = _get_path(obj, path)
        if v is None:
            return ""
        if isinstance(v, (dict, list)):
            return json.dumps(v, ensure_ascii=False)
        return str(v)

    return _PLACEHOLDER_RE.sub(repl, value)
