import os
import json
import datetime
import asyncio
from concurrent.futures import ThreadPoolExecutor
from groq import Groq
from dotenv import load_dotenv
from typing import Dict, Any, List

load_dotenv()

executor = ThreadPoolExecutor(max_workers=4)

class AIService:
    def __init__(self, api_key: str = None):
        self.api_key = api_key or os.environ.get("GROQ_API_KEY")
        if not self.api_key:
            print("CRITICAL WARNING: GROQ_API_KEY not found in environment variables!")
        self.client = Groq(api_key=self.api_key or "missing_key")

    def _sync_process(self, prompt: str) -> Dict[str, Any]:
        print(f"DEBUG: Sending prompt to Groq (Model: llama-3.3-70b-versatile)...")
        try:
            chat_completion = self.client.chat.completions.create(
                messages=[
                    {
                        "role": "system",
                        "content": "You are a specialized JSON-only AI assistant for NovaMind. Always return valid, structured JSON without any markdown formatting or extra text."
                    },
                    {
                        "role": "user",
                        "content": prompt,
                    }
                ],
                model="llama-3.3-70b-versatile",
                response_format={"type": "json_object"},
                timeout=25.0 # Set a 25-second timeout for the API call
            )

            # Extract JSON from the response text
            text_response = chat_completion.choices[0].message.content
            print(f"DEBUG: Raw response from Groq: {text_response}")
            
            if not text_response or text_response.strip() == "":
                print("DEBUG: Empty response from Groq")
                return self._get_fallback_response("The AI service returned an empty response.")

            try:
                return json.loads(text_response)
            except json.JSONDecodeError:
                # Fallback for manual parsing if JSON mode fails
                start = text_response.find('{')
                end = text_response.rfind('}') + 1
                if start == -1 or end == 0:
                    print("DEBUG: Could not find JSON in AI response")
                    return self._get_fallback_response("The AI response was not in a valid JSON format.")
                    
                json_str = text_response[start:end]
                return json.loads(json_str)
        except Exception as e:
            print(f"DEBUG: Groq API Error: {str(e)}")
            return self._get_fallback_response(f"AI Service Error: {str(e)}")

    def _get_fallback_response(self, message: str) -> Dict[str, Any]:
        return {
            "summary": message,
            "tasks": [],
            "priority": "medium",
            "key_insights": [],
            "suggested_next_steps": [],
            "proactive_automations": [],
            "is_long_doc": False
        }

    async def process_cognitive_input(self, content: str) -> Dict[str, Any]:
        print(f"DEBUG: Processing content in AI Service (length: {len(content)})")
        if not content or content.strip() == "":
            print("DEBUG: Content is empty, returning minimal response")
            return {
                "summary": "No content was provided to analyze.",
                "tasks": [],
                "priority": "low",
                "key_insights": [],
                "suggested_next_steps": [],
                "proactive_automations": []
            }
            
        now = datetime.datetime.now()
        prompt = f"""
        You are NovaMind, a highly advanced cognitive workflow assistant for a Hackathon project.
        Analyze the following input and extract high-level intelligence.
        
        INPUT CONTENT:
        {content}
        
        OUTPUT FORMAT (STRICT JSON ONLY):
        {{
          "summary": "Semantic summarization of the entire content (1-3 detailed sentences).",
          "key_insights": ["Insight 1", "Insight 2", "Insight 3"],
          "suggested_next_steps": ["Action 1", "Action 2"],
          "tasks": [
            {{
              "title": "Clear, actionable title",
              "description": "Short explanation of the task",
              "deadline": "ISO-8601 format string if a deadline is mentioned, else null. Predict the most likely deadline if a time is mentioned.",
              "priority": "high/medium/low",
              "category": "Academic/Dev/Management/Personal/Design/Research",
              "is_personal": 1 or 0 (1 if it seems like a personal task, 0 if it seems like a team/work-related task),
              "tags": ["tag1", "tag2"]
            }}
          ],
          "proactive_automations": [
            {{
              "type": "email/calendar/draft/reminder",
              "action": "Draft email to Prof. X regarding Y",
              "content": "Full text of the draft if applicable"
            }}
          ],
          "priority": "overall high/medium/low",
          "is_long_doc": true/false
        }}

        Intelligence Rules:
        - TODAY IS: {now.strftime("%A, %B %d, %Y %H:%M:%S")}.
        - LANGUAGE SUPPORT: Support Mixed Hindi/English (Hinglish). If the input is in Hindi or Hinglish, extract meaning and convert 'summary' and 'tasks' to formal English.
        - CONTEXT-AWARE DEADLINES: If the input says "in 1 minute", set it to { (now + datetime.timedelta(minutes=1)).strftime("%Y-%m-%dT%H:%M:%S") }.
        - PROACTIVE ACTIONS: Generate specific 'proactive_automations' based on content:
            - If Lecture/Study: Add "Create Study Schedule" action.
            - If Professional/Meeting: Add "Draft Meeting Minutes" action.
            - If Urgent/Deadline: Add "Set Priority Alert" action.
        - ALWAYS provide a 'deadline' field in ISO format if any time is mentioned.
        - Return ONLY JSON.
        """

        try:
            print(f"DEBUG: Starting AI analysis (Context: {now.strftime('%Y-%m-%d')})...")
            loop = asyncio.get_event_loop()
            result = await loop.run_in_executor(executor, self._sync_process, prompt)
            return result
        except Exception as e:
            print(f"DEBUG: Error in AI Service: {e}")
            return {
                "summary": f"Error processing input: {str(e)}",
                "tasks": [],
                "priority": "medium"
            }
