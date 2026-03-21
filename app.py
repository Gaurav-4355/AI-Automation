from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List, Optional
import os
import shutil
import uuid
import datetime
import json
import asyncio
from passlib.context import CryptContext
from fastapi import Header

import models, schemas, database
from services.ai_service import AIService
from services.ocr_service import OCRService
from services.pdf_service import PDFService

# Dependency for DB Session
def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Security Setup
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_password_hash(password):
    return pwd_context.hash(password)

def verify_password(plain_password, hashed_password):
    # FALLBACK FOR HACKATHON: Handle both hashed and plain text
    try:
        # Check if it's a valid bcrypt hash
        if hashed_password.startswith("$2b$") or hashed_password.startswith("$2a$"):
            return pwd_context.verify(plain_password, hashed_password)
    except Exception:
        pass
    
    # If not a hash or error occurs, do direct comparison (fallback)
    return plain_password == hashed_password

# Dependency to get user from Header (Hackathon security)
async def get_current_user(x_user_id: Optional[str] = Header(None), db: Session = Depends(get_db)):
    # Fallback: If no header, try to get the first user for testing
    if not x_user_id:
        user = db.query(models.User).first()
        if user:
            print(f"DEBUG: No X-User-ID header, falling back to first user: {user.full_name}")
            return user
        raise HTTPException(status_code=401, detail="X-User-ID header missing and no users in DB")
    
    try:
        user_id = int(x_user_id)
        user = db.query(models.User).filter(models.User.id == user_id).first()
        if not user:
            # Another fallback: If ID doesn't exist, use first user
            user = db.query(models.User).first()
            if user:
                return user
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except (ValueError, TypeError):
        # Fallback for invalid ID
        user = db.query(models.User).first()
        if user:
            return user
        raise HTTPException(status_code=401, detail="Invalid User ID format")

# Create database tables
models.Base.metadata.create_all(bind=database.engine)

# Run manual migrations for new columns
try:
    from migrate_db import migrate
    migrate()
except Exception as e:
    print(f"Migration skip/error: {e}")

app = FastAPI(title="NovaMind API")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Service Instances
ai_service = AIService()
ocr_service = OCRService()
pdf_service = PDFService()

@app.get("/api/")
async def api_root():
    return {"status": "NovaMind API is healthy", "version": "1.0.0"}

@app.get("/")
async def root():
    return {"message": "NovaMind API is running"}

# --- AUTH & TEAM ENDPOINTS ---

@app.post("/api/auth/signup")
async def signup(user_data: dict, db: Session = Depends(get_db)):
    # Basic signup for demo
    existing_user = db.query(models.User).filter(models.User.email == user_data['email']).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Map lowercase roles to Enum names
    role_map = {
        "admin": models.UserRole.ADMIN,
        "user": models.UserRole.USER,
        "individual": models.UserRole.INDIVIDUAL
    }
    role_str = user_data.get('role', 'individual').lower()
    db_role = role_map.get(role_str, models.UserRole.INDIVIDUAL)

    new_user = models.User(
        email=user_data['email'],
        full_name=user_data.get('full_name', ''),
        hashed_password=get_password_hash(user_data['password']), # SECURE: Hashed password
        role=db_role
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    role_val = new_user.role.value if hasattr(new_user.role, 'value') else str(new_user.role).lower()
    return {"id": new_user.id, "email": new_user.email, "role": role_val, "full_name": new_user.full_name}

@app.post("/api/auth/login")
async def login(login_data: dict, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == login_data['email']).first()
    if not user or not verify_password(login_data['password'], user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Ensure role is lowercase for frontend consistency
    role_val = user.role.value if hasattr(user.role, 'value') else str(user.role).lower()
    
    return {
        "id": user.id, 
        "email": user.email, 
        "role": role_val, 
        "full_name": user.full_name
    }

@app.get("/api/admin/users", response_model=List[dict])
async def get_all_users(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role != models.UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    users = db.query(models.User).all()
    return [{"id": u.id, "full_name": u.full_name, "email": u.email, "role": u.role} for u in users]

@app.get("/api/admin/efficiency")
async def get_team_efficiency(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role != models.UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    users = db.query(models.User).filter(models.User.role == models.UserRole.USER).all()
    efficiency_data = []
    
    for user in users:
        # Only count TEAM tasks for efficiency analysis
        team_tasks = db.query(models.Task).filter(
            models.Task.assigned_to_id == user.id, 
            models.Task.is_personal == 0
        ).all()
        
        total = len(team_tasks)
        done = sum(1 for t in team_tasks if t.status == models.TaskStatus.COMPLETED)
        
        # Category breakdown for the graph
        categories = {}
        for t in team_tasks:
            cat = t.category or "General"
            categories[cat] = categories.get(cat, 0) + 1

        efficiency_data.append({
            "id": user.id,
            "user": user.full_name,
            "total_tasks": total,
            "completed": done,
            "percentage": (done / total * 100) if total > 0 else 0,
            "categories": categories,
            "focus_area": max(categories, key=categories.get) if categories else "N/A"
        })
    
    return efficiency_data

@app.post("/api/admin/broadcast")
async def ai_broadcast(data: dict, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role != models.UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    message = data.get('message')
    if not message:
        raise HTTPException(status_code=400, detail="Message is required")
    
    # AI-powered Broadcast: Refine the message for the team
    prompt = f"You are a professional team leader. Refine this rough announcement into a clear, encouraging broadcast message for the team: {message}"
    ai_result = await ai_service.process_cognitive_input(prompt)
    refined_message = ai_result.get("summary", message)
    
    # In a real app, this would send notifications. For now, we return the refined message.
    print(f"BROADCAST SENT: {refined_message}")
    return {"message": "Broadcast sent successfully", "refined_message": refined_message}

@app.post("/api/admin/nudge")
async def nudge_user(data: dict, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role != models.UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    user_id = data.get('user_id')
    message = data.get('message')
    
    if user_id:
        user = db.query(models.User).filter(models.User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        print(f"DEBUG: Nudging user {user.full_name}: {message}")
        return {"message": f"Nudge sent to {user.full_name}"}
    
    raise HTTPException(status_code=400, detail="Invalid nudge request")

# --- INPUT HUB ENDPOINTS ---

@app.post("/api/input/process", response_model=schemas.AIResponse)
async def process_input(
    input_type: str = Form(...),
    raw_content: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        user_id = current_user.id
        print(f"DEBUG: Received request - type: {input_type}, user_id: {user_id}")
        content_to_process = ""
        
        # 1. Handle different input types
        if input_type == "text" or input_type == "paste" or input_type == "voice":
            content_to_process = raw_content or ""
        elif input_type == "image" and file:
            print(f"DEBUG: Processing image: {file.filename}")
            try:
                image_bytes = await file.read()
                content_to_process = await ocr_service.extract_text_from_image(image_bytes)
            except Exception as e:
                print(f"ERROR reading image file: {e}")
                raise HTTPException(status_code=500, detail=f"Could not read image file: {str(e)}")
        elif input_type == "pdf" and file:
            print(f"DEBUG: Processing PDF: {file.filename}")
            try:
                pdf_bytes = await file.read()
                content_to_process = await pdf_service.extract_text_from_pdf(pdf_bytes)
            except Exception as e:
                print(f"ERROR reading PDF file: {e}")
                raise HTTPException(status_code=500, detail=f"Could not read PDF file: {str(e)}")
        else:
            print(f"DEBUG: Invalid input combination - type: {input_type}, file: {file is not None}")
            raise HTTPException(status_code=400, detail="Invalid input type or missing content")

        if not content_to_process:
            raise HTTPException(status_code=400, detail="No content extracted from input")

        # 2. Process with AI
        print("DEBUG: Sending to Groq AI...")
        try:
            # Set a timeout for the entire AI processing step
            ai_result = await asyncio.wait_for(ai_service.process_cognitive_input(content_to_process), timeout=30.0)
        except asyncio.TimeoutError:
            print("ERROR: AI processing timed out")
            ai_result = {
                "summary": "AI processing took too long. The input was recorded, but tasks couldn't be automatically extracted.",
                "tasks": [],
                "priority": "medium",
                "key_insights": ["Processing timeout occurred"],
                "suggested_next_steps": ["Try with a shorter input", "Add tasks manually"],
                "proactive_automations": []
            }
        
        print(f"DEBUG: AI response: {ai_result}")

        # Ensure required fields exist for AIResponse schema
        if "summary" not in ai_result:
            ai_result["summary"] = content_to_process[:100] + "..."
        if "tasks" not in ai_result:
            ai_result["tasks"] = []
        if "priority" not in ai_result:
            ai_result["priority"] = "medium"
        if "key_insights" not in ai_result:
            ai_result["key_insights"] = []
        if "suggested_next_steps" not in ai_result:
            ai_result["suggested_next_steps"] = []
        if "proactive_automations" not in ai_result:
            ai_result["proactive_automations"] = []

        # 3. Store the cognitive input record
        summary_text = ai_result.get("summary", "No summary provided.")
        cognitive_input = models.CognitiveInput(
            input_type=input_type,
            raw_content=content_to_process,
            summary=summary_text,
            key_insights=json.dumps(ai_result.get("key_insights", [])),
            suggested_next_steps=json.dumps(ai_result.get("suggested_next_steps", [])),
            proactive_automations=json.dumps(ai_result.get("proactive_automations", [])),
            file_path=file.filename if file else None,
            user_id=user_id
        )
        db.add(cognitive_input)
        db.commit()
        db.refresh(cognitive_input)

        # 4. Extract and create tasks
        tasks_data = ai_result.get("tasks", [])
        if not isinstance(tasks_data, list):
            tasks_data = []
            
        for task_data in tasks_data:
            if not isinstance(task_data, dict):
                continue
                
            title = task_data.get("title", "Untitled Task")
            if not title:
                continue
            
            # Predict deadline if context suggests it
            deadline_val = None
            deadline_str = task_data.get("deadline")
            if deadline_str:
                try:
                    # Handle common ISO formats
                    if isinstance(deadline_str, str):
                        deadline_val = datetime.datetime.fromisoformat(deadline_str.replace('Z', '+00:00'))
                except (ValueError, TypeError):
                    deadline_val = None
            
            priority_val = str(task_data.get("priority", "medium")).lower()
            if priority_val not in ["high", "medium", "low"]:
                priority_val = "medium"
            
            # AI-suggested values
            category_val = task_data.get("category", "General")
            is_personal_val = int(task_data.get("is_personal", 1))

            # Privacy Overrides:
            # 1. If user is role 'INDIVIDUAL', EVERYTHING is personal.
            # 2. If user is role 'USER' or 'ADMIN', follow AI suggestion.
            if current_user.role == models.UserRole.INDIVIDUAL:
                is_personal_val = 1

            new_task = models.Task(
                title=title,
                description=task_data.get("description"),
                summary=summary_text,
                deadline=deadline_val,
                priority=priority_val,
                category=category_val,
                is_personal=is_personal_val,
                tags=json.dumps(task_data.get("tags", [])),
                source_input_id=cognitive_input.id,
                assigned_to_id=user_id
            )
            db.add(new_task)
        
        db.commit()
        return ai_result

    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        print(f"CRITICAL ERROR in process_input: {str(e)}")
        print(f"TRACEBACK: {error_trace}")
        # If it's already an HTTPException, re-raise it
        if isinstance(e, HTTPException):
            raise e
        # Otherwise return a 500 with details
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")

# --- AI AGENT ENDPOINT ---

@app.post("/api/agent/automate")
async def agent_automate(goal: schemas.AgentGoal, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        user_id = current_user.id
        print(f"DEBUG: Agent starting automation for goal: {goal.goal}, user_id: {user_id}")
        
        prompt = f"""
        You are NovaMind AI Agent. Break down the following high-level goal into 3-5 small, actionable sub-tasks.
        GOAL: {goal.goal}
        
        OUTPUT FORMAT (STRICT JSON ONLY):
        {{
          "summary": "Brief explanation of how the goal will be achieved.",
          "tasks": [
            {{
              "title": "Sub-task title",
              "description": "Brief instruction",
              "priority": "high/medium/low"
            }}
          ]
        }}
        """
        
        ai_result = await ai_service.process_cognitive_input(prompt)
        summary_text = ai_result.get("summary", "")
        
        # 1. Check if a task with this title (or similar) already exists for THIS user
        query = db.query(models.Task).filter(
            (models.Task.title.ilike(f"%{goal.goal}%")) | 
            (models.Task.title.ilike(f"%{goal.goal.replace('Goal: ', '')}%"))
        )
        
        if goal.user_id:
            query = query.filter(models.Task.assigned_to_id == goal.user_id)
            
        existing_task = query.first()

        if existing_task and not existing_task.parent_id:
            print(f"DEBUG: Found existing task '{existing_task.title}', using as parent.")
            parent_task = existing_task
            # Update its description with AI summary if it was empty
            if not parent_task.description:
                parent_task.description = summary_text
        else:
            print(f"DEBUG: No matching task found, creating new parent.")
            # Create the Parent Task first
            parent_task = models.Task(
                title=f"Goal: {goal.goal}",
                description=summary_text,
                priority="high",
                status="pending",
                category="Management",
                is_personal=1 if current_user.role == models.UserRole.INDIVIDUAL else 0,
                assigned_to_id=goal.user_id
            )
            db.add(parent_task)
            db.commit()
            db.refresh(parent_task)
        
        # 2. Create sub-tasks linked to the parent
        created_tasks = []
        for task_data in ai_result.get("tasks", []):
            new_task = models.Task(
                title=task_data.get("title"),
                description=task_data.get("description"),
                priority=task_data.get("priority", "medium").lower(),
                category=task_data.get("category", "General"),
                is_personal=int(task_data.get("is_personal", 1)),
                parent_id=parent_task.id,
                assigned_to_id=goal.user_id
            )
            # Override for Individual users
            if current_user.role == models.UserRole.INDIVIDUAL:
                new_task.is_personal = 1

            db.add(new_task)
            created_tasks.append(new_task)
            
        db.commit()
        return {"message": f"Goal broken into {len(created_tasks)} sub-tasks", "parent_id": parent_task.id}
    except Exception as e:
        print(f"ERROR in agent automate: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# --- TASK ENDPOINTS ---

@app.get("/api/tasks")
async def get_tasks(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    query = db.query(models.Task)
    user_id = current_user.id
    
    # 1. Privacy Logic: Separate Individual from Team
    if current_user.role == models.UserRole.INDIVIDUAL:
        # Individual users ONLY see their own tasks
        query = query.filter(models.Task.assigned_to_id == user_id)
    elif current_user.role == models.UserRole.USER:
        # Team Users see tasks assigned to them
        query = query.filter(models.Task.assigned_to_id == user_id)
    elif current_user.role == models.UserRole.ADMIN:
        # Admins see:
        # - Their own tasks (personal and team)
        # - Team tasks (is_personal=0) of members (role=USER)
        # - They do NOT see personal tasks (is_personal=1) of others
        team_user_ids = [u.id for u in db.query(models.User.id).filter(models.User.role == models.UserRole.USER).all()]
        query = query.filter(
            (models.Task.assigned_to_id == user_id) | 
            ((models.Task.assigned_to_id.in_(team_user_ids)) & (models.Task.is_personal == 0))
        )
    
    all_tasks = query.order_by(models.Task.created_at.desc()).all()
    
    result = []
    for task in all_tasks:
        task_dict = {
            "id": task.id,
            "title": task.title,
            "description": task.description,
            "summary": task.summary,
            "deadline": task.deadline,
            "priority": task.priority.value if hasattr(task.priority, 'value') else task.priority,
            "status": task.status.value if hasattr(task.status, 'value') else task.status,
            "tags": task.tags,
            "category": task.category,
            "is_personal": task.is_personal,
            "parent_id": task.parent_id,
            "source_type": task.source_input.input_type if task.source_input else "Direct",
            "assigned_to_id": task.assigned_to_id,
            "created_at": task.created_at
        }
        result.append(task_dict)
    return result

@app.post("/api/tasks", response_model=schemas.TaskResponse)
async def create_task(task: schemas.TaskCreate, db: Session = Depends(get_db)):
    db_task = models.Task(**task.dict())
    db.add(db_task)
    db.commit()
    db.refresh(db_task)
    return db_task

@app.post("/api/admin/assign")
async def assign_task(assignment: dict, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role != models.UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Only admins can assign tasks")
    
    db_task = db.query(models.Task).filter(models.Task.id == assignment['task_id']).first()
    if not db_task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # Ensure admin isn't assigning an INDIVIDUAL task
    assigned_user = db.query(models.User).filter(models.User.id == assignment['user_id']).first()
    if assigned_user.role == models.UserRole.INDIVIDUAL:
        raise HTTPException(status_code=400, detail="Cannot assign tasks to Individual accounts")

    db_task.assigned_to_id = assignment['user_id']
    db.commit()
    return {"message": "Task assigned successfully"}

@app.put("/api/tasks/{task_id}")
async def update_task(task_id: int, task_update: schemas.TaskUpdate, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    db_task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if not db_task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # Ownership Check: Only assigned user or Admin can update
    is_admin = current_user.role == models.UserRole.ADMIN
    if db_task.assigned_to_id != current_user.id and not is_admin:
        raise HTTPException(status_code=403, detail="Not authorized to update this task")
    
    # Update fields
    for key, value in task_update.dict(exclude_unset=True).items():
        setattr(db_task, key, value)
    
    # 1. CASCADING LOGIC: Parent -> Children
    if task_update.status == models.TaskStatus.COMPLETED:
        db.query(models.Task).filter(models.Task.parent_id == task_id).update({"status": models.TaskStatus.COMPLETED})
    elif task_update.status == models.TaskStatus.PENDING:
        db.query(models.Task).filter(models.Task.parent_id == task_id).update({"status": models.TaskStatus.PENDING})
    
    db.commit()
    db.refresh(db_task)
    return db_task

@app.delete("/api/tasks/{task_id}")
async def delete_task(task_id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    db_task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if not db_task:
        raise HTTPException(status_code=404, detail="Task not found")

    # Ownership Check: Only Admin or the assigned user (if not role 'user') can delete
    # Team Users should not delete tasks assigned by admin
    if current_user.role == models.UserRole.USER:
         raise HTTPException(status_code=403, detail="Team members cannot delete tasks")
    
    if db_task.assigned_to_id != current_user.id and current_user.role != models.UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Not authorized to delete this task")

    db.delete(db_task)
    db.commit()
    return {"message": "Task deleted"}

# --- DASHBOARD ENDPOINTS ---

@app.get("/api/dashboard/insights")
async def get_dashboard_insights(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Get last 5 cognitive inputs with summaries and insights
    query = db.query(models.CognitiveInput)
    user_id = current_user.id
    
    if current_user.role == models.UserRole.ADMIN:
        # Admins see insights from themselves and their 'USER' role members
        team_user_ids = [u.id for u in db.query(models.User.id).filter(models.User.role == models.UserRole.USER).all()]
        query = query.filter(
            (models.CognitiveInput.user_id == user_id) | 
            (models.CognitiveInput.user_id.in_(team_user_ids))
        )
    else:
        # Others only see their own
        query = query.filter(models.CognitiveInput.user_id == user_id)
        
    recent_inputs = query.order_by(models.CognitiveInput.processed_at.desc()).limit(5).all()

    def safe_json_loads(data):
        if not data:
            return []
        try:
            return json.loads(data)
        except (json.JSONDecodeError, TypeError):
            return []

    return [
        {
            "id": item.id,
            "type": item.input_type,
            "summary": item.summary,
            "key_insights": safe_json_loads(item.key_insights),
            "suggested_next_steps": safe_json_loads(item.suggested_next_steps),
            "proactive_automations": safe_json_loads(item.proactive_automations),
            "timestamp": item.processed_at
        } for item in recent_inputs
    ]

@app.get("/api/dashboard/stats")
async def get_dashboard_stats(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    task_query = db.query(models.Task)
    user_id = current_user.id

    if current_user.role == models.UserRole.ADMIN:
        # Admins see stats for themselves and their 'USER' role members
        team_user_ids = [u.id for u in db.query(models.User.id).filter(models.User.role == models.UserRole.USER).all()]
        task_query = task_query.filter(
            (models.Task.assigned_to_id == user_id) | 
            (models.Task.assigned_to_id.in_(team_user_ids))
        )
    else:
        # Others only see their own
        task_query = task_query.filter(models.Task.assigned_to_id == user_id)

    total_tasks = task_query.count()
    completed_tasks = task_query.filter(models.Task.status == models.TaskStatus.COMPLETED).count()
    
    # Handle priority based on whether it's an Enum or string
    try:
        high_priority = task_query.filter(models.Task.priority == models.TaskPriority.HIGH).count()
    except AttributeError:
        # Fallback for string-based priority comparison
        high_priority = task_query.filter(models.Task.priority == "high").count()

    # Get recent summaries (unique to avoid duplicates from multiple tasks from same input)
    recent_summaries_tasks = task_query.filter(models.Task.summary != None).order_by(models.Task.created_at.desc()).all()
    
    unique_summaries = []
    seen_summaries = set()
    for t in recent_summaries_tasks:
        if t.summary and t.summary not in seen_summaries:
            unique_summaries.append(t.summary)
            seen_summaries.add(t.summary)
            if len(unique_summaries) >= 5:
                break

    return {
        "total_tasks": total_tasks,
        "completed_tasks": completed_tasks,
        "high_priority_tasks": high_priority,
        "recent_summaries": unique_summaries
    }
