from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Literal
import uuid
from datetime import datetime, timezone, timedelta
import jwt
from passlib.context import CryptContext

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET', 'your-secret-key-change-in-production')
JWT_ALGORITHM = 'HS256'
JWT_EXPIRATION_HOURS = 24

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

# Create the main app
app = FastAPI()
api_router = APIRouter(prefix="/api")

# Utility Functions
def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid authentication credentials")
        user = await db.users.find_one({"id": user_id}, {"_id": 0})
        if user is None:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.JWTError:
        raise HTTPException(status_code=401, detail="Could not validate credentials")

# Models
class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    username: str
    role: Literal["admin", "teacher", "student", "parent"]
    full_name: str
    email: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserCreate(BaseModel):
    username: str
    password: str
    role: Literal["admin", "teacher", "student", "parent"]
    full_name: str
    email: Optional[str] = None

class UserLogin(BaseModel):
    username: str
    password: str

class LoginResponse(BaseModel):
    access_token: str
    token_type: str
    user: User

class Student(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    full_name: str
    roll_number: str
    class_name: str
    section: str
    parent_id: Optional[str] = None
    date_of_birth: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class StudentCreate(BaseModel):
    full_name: str
    roll_number: str
    class_name: str
    section: str
    parent_id: Optional[str] = None
    date_of_birth: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None

class Attendance(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    student_id: str
    student_name: str
    date: str
    status: Literal["present", "absent", "late"]
    subject: Optional[str] = None
    marked_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class AttendanceCreate(BaseModel):
    student_id: str
    student_name: str
    date: str
    status: Literal["present", "absent", "late"]
    subject: Optional[str] = None

class Grade(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    student_id: str
    student_name: str
    subject: str
    exam_type: str
    marks: float
    max_marks: float
    date: str
    teacher_id: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class GradeCreate(BaseModel):
    student_id: str
    student_name: str
    subject: str
    exam_type: str
    marks: float
    max_marks: float
    date: str

class Announcement(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    content: str
    author: str
    target_role: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class AnnouncementCreate(BaseModel):
    title: str
    content: str
    target_role: Optional[str] = None

# Authentication Routes
@api_router.post("/auth/register", response_model=User)
async def register(user_data: UserCreate):
    # Check if username exists
    existing_user = await db.users.find_one({"username": user_data.username})
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already exists")
    
    # Hash password and create user
    hashed_password = hash_password(user_data.password)
    user_dict = user_data.model_dump(exclude={"password"})
    user_obj = User(**user_dict)
    
    doc = user_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['password'] = hashed_password
    
    await db.users.insert_one(doc)
    return user_obj

@api_router.post("/auth/login", response_model=LoginResponse)
async def login(login_data: UserLogin):
    user = await db.users.find_one({"username": login_data.username}, {"_id": 0})
    if not user or not verify_password(login_data.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid username or password")
    
    access_token = create_access_token(data={"sub": user["id"], "role": user["role"]})
    user_obj = User(**user)
    
    return LoginResponse(
        access_token=access_token,
        token_type="bearer",
        user=user_obj
    )

@api_router.get("/auth/me", response_model=User)
async def get_me(current_user: dict = Depends(get_current_user)):
    return User(**current_user)

# Student Management Routes
@api_router.post("/students", response_model=Student)
async def create_student(student_data: StudentCreate, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["admin", "teacher"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    student_obj = Student(**student_data.model_dump(), user_id=current_user["id"])
    doc = student_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.students.insert_one(doc)
    return student_obj

@api_router.get("/students", response_model=List[Student])
async def get_students(current_user: dict = Depends(get_current_user)):
    students = await db.students.find({}, {"_id": 0}).to_list(1000)
    for student in students:
        if isinstance(student.get('created_at'), str):
            student['created_at'] = datetime.fromisoformat(student['created_at'])
    return students

@api_router.get("/students/{student_id}", response_model=Student)
async def get_student(student_id: str, current_user: dict = Depends(get_current_user)):
    student = await db.students.find_one({"id": student_id}, {"_id": 0})
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    if isinstance(student.get('created_at'), str):
        student['created_at'] = datetime.fromisoformat(student['created_at'])
    return Student(**student)

@api_router.put("/students/{student_id}", response_model=Student)
async def update_student(student_id: str, student_data: StudentCreate, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["admin", "teacher"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    existing = await db.students.find_one({"id": student_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Student not found")
    
    update_data = student_data.model_dump()
    await db.students.update_one({"id": student_id}, {"$set": update_data})
    
    updated_student = await db.students.find_one({"id": student_id}, {"_id": 0})
    if isinstance(updated_student.get('created_at'), str):
        updated_student['created_at'] = datetime.fromisoformat(updated_student['created_at'])
    return Student(**updated_student)

@api_router.delete("/students/{student_id}")
async def delete_student(student_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    result = await db.students.delete_one({"id": student_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Student not found")
    return {"message": "Student deleted successfully"}

# Attendance Routes
@api_router.post("/attendance", response_model=Attendance)
async def mark_attendance(attendance_data: AttendanceCreate, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["admin", "teacher"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    attendance_obj = Attendance(**attendance_data.model_dump(), marked_by=current_user["id"])
    doc = attendance_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.attendance.insert_one(doc)
    return attendance_obj

@api_router.get("/attendance", response_model=List[Attendance])
async def get_attendance(student_id: Optional[str] = None, date: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    query = {}
    if student_id:
        query["student_id"] = student_id
    if date:
        query["date"] = date
    
    attendance_records = await db.attendance.find(query, {"_id": 0}).to_list(1000)
    for record in attendance_records:
        if isinstance(record.get('created_at'), str):
            record['created_at'] = datetime.fromisoformat(record['created_at'])
    return attendance_records

# Grades Routes
@api_router.post("/grades", response_model=Grade)
async def add_grade(grade_data: GradeCreate, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["admin", "teacher"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    grade_obj = Grade(**grade_data.model_dump(), teacher_id=current_user["id"])
    doc = grade_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.grades.insert_one(doc)
    return grade_obj

@api_router.get("/grades", response_model=List[Grade])
async def get_grades(student_id: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    query = {}
    if student_id:
        query["student_id"] = student_id
    
    grades = await db.grades.find(query, {"_id": 0}).to_list(1000)
    for grade in grades:
        if isinstance(grade.get('created_at'), str):
            grade['created_at'] = datetime.fromisoformat(grade['created_at'])
    return grades

# Communication Routes
@api_router.post("/announcements", response_model=Announcement)
async def create_announcement(announcement_data: AnnouncementCreate, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["admin", "teacher"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    announcement_obj = Announcement(**announcement_data.model_dump(), author=current_user["full_name"])
    doc = announcement_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.announcements.insert_one(doc)
    return announcement_obj

@api_router.get("/announcements", response_model=List[Announcement])
async def get_announcements(current_user: dict = Depends(get_current_user)):
    query = {}
    if current_user["role"] != "admin":
        query["$or"] = [
            {"target_role": None},
            {"target_role": current_user["role"]}
        ]
    
    announcements = await db.announcements.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    for announcement in announcements:
        if isinstance(announcement.get('created_at'), str):
            announcement['created_at'] = datetime.fromisoformat(announcement['created_at'])
    return announcements

# Dashboard Stats
@api_router.get("/dashboard/stats")
async def get_dashboard_stats(current_user: dict = Depends(get_current_user)):
    stats = {}
    
    if current_user["role"] == "admin":
        stats["total_students"] = await db.students.count_documents({})
        stats["total_teachers"] = await db.users.count_documents({"role": "teacher"})
        stats["total_parents"] = await db.users.count_documents({"role": "parent"})
        stats["total_announcements"] = await db.announcements.count_documents({})
        
        # Recent attendance stats
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        stats["today_present"] = await db.attendance.count_documents({"date": today, "status": "present"})
        stats["today_absent"] = await db.attendance.count_documents({"date": today, "status": "absent"})
        
    elif current_user["role"] == "teacher":
        stats["total_students"] = await db.students.count_documents({})
        stats["classes_today"] = 5  # Mock data
        stats["pending_grades"] = 12  # Mock data
        
    elif current_user["role"] == "student":
        # Find student record
        student = await db.students.find_one({"user_id": current_user["id"]})
        if student:
            stats["total_attendance"] = await db.attendance.count_documents({"student_id": student["id"]})
            stats["present_days"] = await db.attendance.count_documents({"student_id": student["id"], "status": "present"})
            stats["total_grades"] = await db.grades.count_documents({"student_id": student["id"]})
    
    elif current_user["role"] == "parent":
        # Count children (students with this parent_id)
        stats["children_count"] = await db.students.count_documents({"parent_id": current_user["id"]})
        stats["announcements_count"] = await db.announcements.count_documents({
            "$or": [{"target_role": None}, {"target_role": "parent"}]
        })
        stats["events_count"] = 3  # Mock data for upcoming events
            
    return stats

# Include router
app.include_router(api_router)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
