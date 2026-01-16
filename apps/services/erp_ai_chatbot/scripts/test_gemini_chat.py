from __future__ import annotations

import os
import sys
from pathlib import Path

from dotenv import load_dotenv
from google import genai


def _load_env() -> Path | None:
    # Prefer a nearby .env so running from different dirs still works.
    here = Path(__file__).resolve()
    for base in (here.parent, here.parent.parent, here.parent.parent.parent):
        env_path = base / ".env"
        if env_path.exists():
            load_dotenv(env_path)
            return env_path
    load_dotenv()
    return None


def main() -> int:
    env_path = _load_env()
    api_key = os.getenv("GOOGLE_API_KEY")
    model = os.getenv("GEMINI_MODEL", "gemini-2.5-pro")
    if not api_key:
        print("Missing GOOGLE_API_KEY in .env", file=sys.stderr)
        return 1

    prompt = " ".join(sys.argv[1:]).strip() or "Xin chao! Ban co the lam gi?"
    client = genai.Client(api_key=api_key)
    resp = client.models.generate_content(
        model=model,
        contents=prompt,
    )

    print(f"env={env_path}" if env_path else "env=.env (default)")
    print(f"model={model}")
    print(resp.text or "")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
