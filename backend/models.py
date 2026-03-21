from sqlalchemy import Column, Integer, String, DateTime, Enum, Text, ForeignKey
from sqlalchemy.orm import relationship, backref
import datetime
import enum
from database import Base

class TaskPriority(str, enum.Enum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"

class TaskStatus(str, enum.Enum):
    PENDING = "pending"
    COMPLETED = "completed"

class UserRole(str, enum.Enum):
    ADMIN = "admin"
    USER = "user"
    INDIVIDUAL = "individual"

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    full_name = Column(String)
    hashed_password = Column(String)
    role = Column(Enum(UserRole), default=UserRole.INDIVIDUAL)
    created_at = Column(DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc))

class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    description = Column(Text, nullable=True)
    summary = Column(Text, nullable=True)
    deadline = Column(DateTime, nullable=True)
    priority = Column(Enum(TaskPriority), default=TaskPriority.MEDIUM)
    status = Column(Enum(TaskStatus), default=TaskStatus.PENDING)
    tags = Column(Text, nullable=True) # JSON list of strings
    category = Column(String, default="General") # AI categorized: Academic, Dev, Personal, etc.
    is_personal = Column(Integer, default=1) # 1 for personal, 0 for team
    parent_id = Column(Integer, ForeignKey("tasks.id"), nullable=True)
    source_input_id = Column(Integer, ForeignKey("cognitive_inputs.id"), nullable=True)
    assigned_to_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc), onupdate=lambda: datetime.datetime.now(datetime.timezone.utc))

    # Relationships
    source_input = relationship("CognitiveInput", back_populates="generated_tasks")
    sub_tasks = relationship("Task", backref=backref("parent", remote_side=[id]), cascade="all, delete-orphan")
    assigned_user = relationship("User", backref="tasks")

class CognitiveInput(Base):
    __tablename__ = "cognitive_inputs"

    id = Column(Integer, primary_key=True, index=True)
    input_type = Column(String) # text, paste, pdf, image, voice
    raw_content = Column(Text, nullable=True)
    summary = Column(Text, nullable=True)
    key_insights = Column(Text, nullable=True) # JSON list of strings
    suggested_next_steps = Column(Text, nullable=True) # JSON list of strings
    proactive_automations = Column(Text, nullable=True) # JSON list of objects
    file_path = Column(String, nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    processed_at = Column(DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc))

    # Relationships
    generated_tasks = relationship("Task", back_populates="source_input")
    user = relationship("User", backref="cognitive_inputs")
