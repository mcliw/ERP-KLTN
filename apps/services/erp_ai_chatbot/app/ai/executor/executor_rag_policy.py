from __future__ import annotations
import os
import json
from typing import Any, Dict, List
from dotenv import load_dotenv
from google import genai

from app.ai.module_registry import get_tool
from app.ai.routers.router_rag_policy import plan_route_rag_policy
from apps.services.erp_ai_chatbot.app.rag.prompts import RAG_SYSTEM_PROMPT, build_rag_user_prompt

load_dotenv()

_GEMINI_API_KEY = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
_GEMINI_RAG_MODEL = os.getenv("GEMINI_RAG_MODEL", "gemini-2.5-flash")
_client = genai.Client(api_key=_GEMINI_API_KEY) if _GEMINI_API_KEY else genai.Client()

def _compose_answer(question: str, hits: List[Dict[str, Any]]) -> str:
    user_prompt = build_rag_user_prompt(question=question, context_blocks=hits)

    resp = _client.models.generate_content(
        model=_GEMINI_RAG_MODEL,
        contents=user_prompt,
        config={
            "system_instruction": RAG_SYSTEM_PROMPT,
            "temperature": 0.1,
        },
    )
    return (resp.text or "").strip()

def execute_chat_rag_policy(
    module: str,
    user_id,
    role,
    session_id: str | None,
    message: str,
    compose_enabled: bool = True,
    top_k: int = 5,
) -> Dict[str, Any]:
    # 1) plan
    plan = plan_route_rag_policy(module="rag_policy", message=message, auth={"role": role, "user_id": str(user_id) if user_id else None})

    if plan.needs_clarification:
        return {
            "ok": False,
            "module": "rag_policy",
            "answer": plan.clarifying_question,
            "plan": plan.model_dump(),
        }

    # 2) execute tool steps
    store: Dict[str, Any] = {}
    sources: List[Dict[str, Any]] = []

    for step in plan.steps:
        tool = get_tool("rag_policy", step.tool)
        if not tool:
            return {"ok": False, "module": "rag_policy", "answer": f"Không tìm thấy tool: {step.tool}", "plan": plan.model_dump()}

        args = dict(step.args or {})
        if step.tool == "tra_cuu_chinh_sach":
            args["top_k"] = int(top_k)

        tool_res = tool.handler(**args)
        store[step.id] = tool_res

        if step.save_as:
            store[step.save_as] = tool_res

        if step.tool == "tra_cuu_chinh_sach" and tool_res.get("ok"):
            hits = ((tool_res.get("data") or {}).get("hits") or [])
            # sources cho client
            for h in hits:
                m = h.get("meta") or {}
                sources.append(
                    {
                        "source": m.get("source"),
                        "title": m.get("title"),
                        "chunk_id": m.get("chunk_id", h.get("id")),
                        "distance": h.get("distance"),
                    }
                )

    # 3) compose
    hits = (((store.get("rag_hits") or {}).get("data") or {}).get("hits") or [])
    if not compose_enabled:
        return {
            "ok": True,
            "module": "rag_policy",
            "answer": "Đã tra cứu chính sách.",
            "sources": sources,
            "plan": plan.model_dump(),
            "store": store,
        }

    answer = _compose_answer(question=message, hits=hits)

    return {
        "ok": True,
        "module": "rag_policy",
        "answer": answer,
        "sources": sources,
        "plan": plan.model_dump(),
        "store": store,
    }
