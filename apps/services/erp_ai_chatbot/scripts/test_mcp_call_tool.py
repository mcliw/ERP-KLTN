import asyncio
import json
import os

from mcp import ClientSession
from mcp.client.streamable_http import streamable_http_client

MCP_URL = os.getenv("MCP_URL", "http://127.0.0.1:8000/mcp")

def _unwrap_tool_result(res) -> dict:
    """
    res.content thường là list content. Có server trả text(JSON), có server trả object.
    Viết unwrap “chịu đòn” để không phụ thuộc 1 format duy nhất.
    """
    if not getattr(res, "content", None):
        return {"ok": True, "data": None, "thong_diep": "Empty tool result"}

    for c in res.content:
        # content item có thể có .type == "text" và .text
        t = getattr(c, "type", None)
        if t == "text":
            txt = (getattr(c, "text", "") or "").strip()
            if not txt:
                continue
            try:
                return json.loads(txt)
            except Exception:
                return {"ok": True, "data": txt, "thong_diep": "Tool returned plain text"}

        # một số impl trả thẳng dict-like
        if isinstance(c, dict):
            return c

    # fallback
    return {"ok": True, "data": [getattr(x, "__dict__", str(x)) for x in res.content], "thong_diep": "Raw MCP content"}

async def main():
    async with streamable_http_client(MCP_URL) as (read, write, _):
        async with ClientSession(read, write) as session:
            await session.initialize()

            # gọi thử tồn kho
            res = await session.call_tool(
                "tra_ton_kho_theo_tu_khoa",
                {"tu_khoa": "IP15-128"},
            )
            print(_unwrap_tool_result(res))

if __name__ == "__main__":
    asyncio.run(main())
