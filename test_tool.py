import asyncio
from backend.core.config import get_config
from backend.api.chat import execute_tool

async def test():
    config = get_config()
    print("Testing generate_pdf")
    res = await execute_tool("generate_pdf", {"title": "Test", "content": "Hello World", "filename": "test"}, config)
    print("Result:", res)

asyncio.run(test())
