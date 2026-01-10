import asyncio
from mcp import ClientSession
from mcp.client.streamable_http import streamable_http_client

MCP_URL = "http://127.0.0.1:8000/mcp"

async def main():
    async with streamable_http_client(MCP_URL) as (read, write, _):
        async with ClientSession(read, write) as session:
            await session.initialize()
            tools = await session.list_tools()
            print([t.name for t in tools.tools])

asyncio.run(main())
