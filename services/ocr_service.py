import os
import base64
import asyncio
from concurrent.futures import ThreadPoolExecutor
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

executor = ThreadPoolExecutor(max_workers=2)

class OCRService:
    def __init__(self, api_key=None):
        self.api_key = api_key or os.environ.get("GROQ_API_KEY")
        self.client = Groq(api_key=self.api_key)

    def _sync_extract(self, image_bytes: bytes) -> str:
        # Better MIME detection
        if image_bytes.startswith(b'\x89PNG'):
            mime = "image/png"
        elif image_bytes.startswith(b'\xff\xd8'):
            mime = "image/jpeg"
        elif image_bytes.startswith(b'GIF87a') or image_bytes.startswith(b'GIF89a'):
            mime = "image/gif"
        elif image_bytes.startswith(b'RIFF') and image_bytes[8:12] == b'WEBP':
            mime = "image/webp"
        else:
            mime = "image/jpeg" # Fallback
        
        b64 = base64.b64encode(image_bytes).decode('utf-8')
        
        try:
            # First attempt: Try Llama 3.2 Vision (More common on Groq)
            try:
                response = self.client.chat.completions.create(
                    model="llama-3.2-11b-vision-preview",
                    messages=[{
                        "role": "user",
                        "content": [
                            {"type": "text", "text": "Extract ALL text from this image exactly as written. Return ONLY the text."},
                            {"type": "image_url", "image_url": {"url": f"data:{mime};base64,{b64}"}}
                        ]
                    }],
                    max_tokens=1024,
                    temperature=0.0
                )
                return response.choices[0].message.content.strip()
            except Exception as e:
                print(f"DEBUG: Llama 3.2 Vision failed, trying fallback: {e}")
                # Fallback to Llama 4 Scout if 3.2 is not available
                response = self.client.chat.completions.create(
                    model="meta-llama/llama-4-scout-17b-16e-instruct",
                    messages=[{
                        "role": "user",
                        "content": [
                            {"type": "text", "text": "Extract ALL text from this image. Return ONLY the text."},
                            {"type": "image_url", "image_url": {"url": f"data:{mime};base64,{b64}"}}
                        ]
                    }],
                    max_tokens=1024,
                    temperature=0.0
                )
                return response.choices[0].message.content.strip()
        except Exception as groq_err:
            print(f"DEBUG: Groq Vision API Error: {groq_err}")
            raise groq_err

    async def extract_text_from_image(self, image_bytes: bytes) -> str:
        try:
            print("DEBUG: Starting OCR...")
            loop = asyncio.get_event_loop()
            result = await loop.run_in_executor(executor, self._sync_extract, image_bytes)
            print(f"DEBUG: OCR result: {result[:100]}")
            
            # If result is suspiciously short or just common OCR error messages
            if not result or len(result.strip()) < 5:
                return "OCR could not find readable text in the image. Please ensure the image is clear."
                
            return result
        except Exception as e:
            print(f"ERROR OCR: {e}")
            return f"OCR failed to process image. Technical detail: {str(e)}"
