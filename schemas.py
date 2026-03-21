from pydantic import BaseModel
from datetime import datetime
from typing import List, Optional
from enum import Enum

class TaskPriority(str, Enum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"

class TaskStatus(str, Enum):
    PENDING = "pending"
    COMPLETED = "completed"

class TaskBase(BaseModel):
    title: str
    description: Optional[str] = None
    summary: Optional[str] = None
    deadline: Optional[datetime] = None
    priority: TaskPriority = TaskPriority.MEDIUM
    status: TaskStatus = TaskStatus.PENDING
    tags: Optional[str] = None # JSON string of list
    category: Optional[str] = "General"
    is_personal: Optional[int] = 1
    parent_id: Optional[int] = None

class TaskCreate(TaskBase):
    pass

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    summary: Optional[str] = None
    deadline: Optional[datetime] = None
    priority: Optional[TaskPriority] = None
    status: Optional[TaskStatus] = None

class TaskResponse(TaskBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class CognitiveInputBase(BaseModel):
    input_type: str
    raw_content: Optional[str] = None
    summary: Optional[str] = None
    key_insights: Optional[str] = None
    suggested_next_steps: Optional[str] = None
    proactive_automations: Optional[str] = None
    file_path: Optional[str] = None

class CognitiveInputCreate(CognitiveInputBase):
    pass

class CognitiveInput(CognitiveInputBase):
    id: int
    processed_at: datetime

    class Config:
        from_attributes = True

class AgentGoal(BaseModel):
    goal: str
    user_id: Optional[int] = None

class AIProcessedTask(BaseModel):
    title: str
    description: Optional[str] = None
    deadline: Optional[datetime] = None
    priority: Optional[TaskPriority] = TaskPriority.MEDIUM
    category: Optional[str] = "General"
    is_personal: Optional[int] = 1
    tags: Optional[List[str]] = []

class AIProactiveAutomation(BaseModel):
    type: str
    action: str
    content: Optional[str] = None

class AIResponse(BaseModel):
    summary: str
    tasks: List[AIProcessedTask]
    priority: TaskPriority
    key_insights: Optional[List[str]] = []
    suggested_next_steps: Optional[List[str]] = []
    proactive_automations: Optional[List[AIProactiveAutomation]] = []
    is_long_doc: Optional[bool] = False
