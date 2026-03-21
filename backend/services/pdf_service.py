import pypdf
import io
import asyncio
from concurrent.futures import ThreadPoolExecutor
from services.ocr_service import OCRService

executor = ThreadPoolExecutor(max_workers=2)

class PDFService:
    def __init__(self):
        self.ocr_service = OCRService()

    def _sync_extract(self, pdf_bytes: bytes) -> str:
        pdf_file = io.BytesIO(pdf_bytes)
        reader = pypdf.PdfReader(pdf_file)
        text = ""
        
        for page_num, page in enumerate(reader.pages):
            page_text = page.extract_text() or ""
            
            # If text is very short, it might be a scanned page
            if len(page_text.strip()) < 50:
                print(f"DEBUG: Page {page_num} has very little text. Attempting image extraction...")
                # Try to extract images from the page
                for img_count, image in enumerate(page.images):
                    try:
                        # Convert pypdf image to bytes
                        img_bytes = image.data
                        # We need to run OCR sync inside the threadpool
                        ocr_text = self.ocr_service._sync_extract(img_bytes)
                        if ocr_text:
                            page_text += f"\n[OCR from image {img_count}]:\n{ocr_text}\n"
                    except Exception as e:
                        print(f"DEBUG: Failed to extract OCR from image on page {page_num}: {e}")
            
            text += page_text + "\n"
            
        return text.strip()

    async def extract_text_from_pdf(self, pdf_bytes: bytes) -> str:
        try:
            print("DEBUG: Starting PDF extraction (with OCR fallback)...")
            loop = asyncio.get_event_loop()
            result = await loop.run_in_executor(executor, self._sync_extract, pdf_bytes)
            print(f"DEBUG: Extracted {len(result)} characters from PDF.")
            return result
        except Exception as e:
            print(f"Error extracting text from PDF: {e}")
            return f"Could not extract text from PDF. Error: {str(e)}"
