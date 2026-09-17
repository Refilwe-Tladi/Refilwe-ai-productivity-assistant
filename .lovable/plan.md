# AI Workplace Productivity Assistant

## Build
- Recreate the selected Kinetic Glass Console as the responsive home workspace, with a collapsible mobile sidebar and clear navigation between all five tools.
- Make each tool usable in-place: structured email drafting, meeting-note summarization, task planning, research briefing, and conversational assistance.
- Connect every tool to Lovable AI, show progress and clear errors, and keep prompts intact if a request fails.
- Render generated results in editable fields with copy and reset actions, plus a persistent responsible-AI notice.

## Technical details
- Use one secure server endpoint for AI requests and select a structured prompt template by tool.
- Use the required `openai/gpt-6-astra` model through Lovable AI's Responses API; keep the API key server-only.
- Preserve the selected Space Grotesk/Inter typography, dark glass composition, semantic design tokens, restrained motion, and mobile layout.
- Add route-specific page metadata and verify the main workflows at desktop and mobile sizes.
