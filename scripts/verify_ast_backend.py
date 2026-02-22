
import asyncio
import json
from unittest.mock import AsyncMock, patch
import sys
import os

# Add project root to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from backend.api.builder import builder_stream

# Mock data
MOCK_AST_RESPONSE = {
    "ast_actions": [
        {
            "action": "add_section",
            "section_type": "Hero",
            "props": {
                "title": "Verified Hero",
                "subtitle": "AST Generation Works"
            },
            "index": 0
        }
    ],
    "explanation": "Created a verified hero section."
}

async def verify_backend_ast_generation():
    print("🚀 Starting Backend AST Verification...")
    
    # Mock LLM call
    with patch('backend.api.builder.call_openrouter', new_callable=AsyncMock) as mock_llm:
        # Configure mock to return our AST response
        mock_llm.return_value = {
            "choices": [{
                "message": {
                    "content": json.dumps(MOCK_AST_RESPONSE),
                    "tool_calls": None
                }
            }]
        }

        # Run the stream
        messages = [{"role": "user", "content": "Create a hero section"}]
        files = []
        agent_mode = "creation"
        render_mode = "ast"
        page_state = None
        model = "gpt-4o"

        print("⚡ Invoking builder_stream with render_mode='ast'...")
        
        async for event in builder_stream(messages, files, agent_mode, render_mode, page_state, model):
            print(f"📥 Received event raw: {repr(event)}")
            
            if "actions" in event and "type" in event: # Simple check to identify the right event
                # Format is: data: {"type": "actions", "content": "..."}\n\n
                clean_event = event.strip()
                if clean_event.startswith("data: "):
                     json_part = clean_event[6:] # Remove "data: "
                else:
                     json_part = clean_event

                print(f"🕵️ Parsing JSON part: {repr(json_part)}")
                try:
                    data = json.loads(json_part)
                    
                    if data["type"] == "actions":
                        print("Found actions event type...")
                        content = json.loads(data["content"])
                        if "ast_actions" in content:
                            print("✅ SUCCESS: Received 'ast_actions' in response!")
                            print(json.dumps(content, indent=2))
                            # Keep running to see if anything else happens, or break
                            return
                        else:
                             print("❌ FAILURE: Received 'actions' but missing 'ast_actions'. dictionary keys:", content.keys())
                except json.JSONDecodeError as e:
                    print(f"❌ JSON Decode Error: {e}")
                    pass


    print("⚠️ Warning: Stream finished without 'actions' event (or error occurred).")

if __name__ == "__main__":
    asyncio.run(verify_backend_ast_generation())
