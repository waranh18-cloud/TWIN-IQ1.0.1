from fastapi import FastAPI, APIRouter, HTTPException, Header, Request
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import re
import json
import logging
import uuid
import httpx
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone, timedelta

from emergentintegrations.llm.chat import LlmChat, UserMessage

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

MONGO_URL = os.environ['MONGO_URL']
DB_NAME = os.environ['DB_NAME']
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY')
GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY')

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

app = FastAPI()
api = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("twiniq")

# AI: Use user's Gemini API key with recommended Gemini 3.1 Pro model
LLM_PROVIDER = "gemini"
LLM_MODEL = "gemini-3-flash-preview"
LLM_KEY = GEMINI_API_KEY or EMERGENT_LLM_KEY


# ---------- Models ----------
class User(BaseModel):
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None
    created_at: datetime
    onboarded: bool = False
    profile: Dict[str, Any] = {}
    xp: int = 0
    level: int = 1
    streak: int = 0
    last_active_date: Optional[str] = None
    productivity_score: int = 0
    focus_score: int = 0
    badges: List[str] = []


class SessionRequest(BaseModel):
    session_id: str


class OnboardingAnswer(BaseModel):
    question_id: str
    question: str
    answer: str


class OnboardingSubmit(BaseModel):
    answers: List[OnboardingAnswer]


class ChatMessageIn(BaseModel):
    message: str
    session_id: Optional[str] = None


class MissionComplete(BaseModel):
    mission_id: str


class DailyCheckinIn(BaseModel):
    mood: int  # 1-5
    productivity: int  # 1-5
    focus: int  # 1-5
    distractions: Optional[str] = ""
    learning: Optional[str] = ""
    completed_tasks_ratio: float = 0.0  # 0-1


# ---------- Auth Helpers ----------
async def get_user_from_token(authorization: Optional[str]) -> Dict[str, Any]:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing token")
    token = authorization.split(" ", 1)[1].strip()
    session = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid session")
    exp = session.get("expires_at")
    if exp and exp.tzinfo is None:
        exp = exp.replace(tzinfo=timezone.utc)
    if exp and exp < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Session expired")
    user = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


# ---------- Auth Endpoints ----------
@api.get("/")
async def root():
    return {"message": "Twin IQ API", "status": "ok"}


@api.post("/auth/session")
async def create_session(payload: SessionRequest):
    """Exchange Emergent session_id for our session_token & user."""
    async with httpx.AsyncClient(timeout=15) as hc:
        r = await hc.get(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": payload.session_id},
        )
        if r.status_code != 200:
            raise HTTPException(status_code=401, detail="Invalid session_id")
        data = r.json()

    email = data["email"]
    name = data.get("name") or email.split("@")[0]
    picture = data.get("picture")
    session_token = data["session_token"]

    existing = await db.users.find_one({"email": email}, {"_id": 0})
    if existing:
        user_id = existing["user_id"]
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {"name": name, "picture": picture}},
        )
    else:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        user_doc = {
            "user_id": user_id,
            "email": email,
            "name": name,
            "picture": picture,
            "created_at": datetime.now(timezone.utc),
            "onboarded": False,
            "profile": {},
            "xp": 0,
            "level": 1,
            "streak": 0,
            "last_active_date": None,
            "productivity_score": 0,
            "focus_score": 0,
            "badges": [],
        }
        await db.users.insert_one(user_doc)

    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    await db.user_sessions.update_one(
        {"session_token": session_token},
        {"$set": {
            "session_token": session_token,
            "user_id": user_id,
            "expires_at": expires_at,
            "created_at": datetime.now(timezone.utc),
        }},
        upsert=True,
    )

    user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    return {"session_token": session_token, "user": user}


@api.get("/auth/me")
async def get_me(authorization: Optional[str] = Header(None)):
    user = await get_user_from_token(authorization)
    return {"user": user}


@api.post("/auth/logout")
async def logout(authorization: Optional[str] = Header(None)):
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ", 1)[1].strip()
        await db.user_sessions.delete_one({"session_token": token})
    return {"success": True}


# ---------- Onboarding ----------
ONBOARDING_QUESTIONS = [
    {"id": "goal", "q": "What's your biggest goal right now?", "chips": ["Ace my exams", "Get into dream college", "Improve grades", "Build discipline"]},
    {"id": "career", "q": "What career or field excites you most?", "chips": ["Engineering", "Medicine", "Business", "Design", "Undecided"]},
    {"id": "university", "q": "Any dream university or college?", "chips": ["IITs", "IIMs", "Ivy League", "Not sure yet"]},
    {"id": "exams", "q": "Which exams are you preparing for?", "chips": ["JEE", "NEET", "SAT", "CUET", "IPMAT", "None"]},
    {"id": "grade", "q": "Which grade or year are you in?", "chips": ["Grade 10", "Grade 11", "Grade 12", "College Y1", "College Y2+"]},
    {"id": "subjects", "q": "Which subjects do you study most?", "chips": ["Math", "Physics", "Chemistry", "Biology", "English", "CS"]},
    {"id": "strengths", "q": "What are you naturally good at?", "chips": ["Problem solving", "Memorization", "Writing", "Focus"]},
    {"id": "weaknesses", "q": "What's the toughest area for you?", "chips": ["Time management", "Consistency", "Concepts", "Anxiety"]},
    {"id": "hours", "q": "How many hours can you study daily?", "chips": ["1-2 hrs", "3-4 hrs", "5-6 hrs", "7+ hrs"]},
    {"id": "distractions", "q": "What distracts you most?", "chips": ["Phone/Social", "Games", "Friends", "Overthinking"]},
    {"id": "wake", "q": "What time do you usually wake up?", "chips": ["Before 6am", "6-7am", "7-9am", "After 9am"]},
    {"id": "sleep", "q": "What time do you sleep?", "chips": ["Before 10pm", "10-11pm", "11pm-12am", "After 12am"]},
    {"id": "exercise", "q": "Do you exercise regularly?", "chips": ["Daily", "3-4x a week", "Rarely", "Never"]},
    {"id": "discipline", "q": "Rate your current discipline (1-10)", "chips": ["1-3", "4-6", "7-8", "9-10"]},
]


@api.get("/onboarding/questions")
async def onboarding_questions():
    return {"questions": ONBOARDING_QUESTIONS}


def _parse_json_from_text(text: str) -> Dict[str, Any]:
    """Extract first JSON object from LLM text output."""
    match = re.search(r"\{[\s\S]*\}", text)
    if not match:
        raise ValueError("No JSON found in LLM output")
    return json.loads(match.group(0))


async def _generate_roadmap(user_id: str, profile: Dict[str, Any]) -> Dict[str, Any]:
    """Generate a full roadmap using Claude Sonnet 4.5."""
    system = (
        "You are Twin IQ, an elite AI success coach for students. "
        "You create highly personalized, motivating, adaptive roadmaps. "
        "Always respond with ONLY valid JSON. No prose, no markdown fences."
    )
    prompt = f"""Given this student's profile, generate an adaptive success roadmap.

Profile:
{json.dumps(profile, indent=2)}

Return this EXACT JSON schema:
{{
  "long_term": {{"title": "12-month vision", "summary": "2-3 sentences on the transformation"}},
  "monthly": [
    {{"month": 1, "focus": "theme", "goals": ["...", "..."]}},
    {{"month": 2, "focus": "theme", "goals": ["...", "..."]}},
    {{"month": 3, "focus": "theme", "goals": ["...", "..."]}}
  ],
  "weekly": {{
    "focus": "this week's theme",
    "milestones": ["...", "...", "..."]
  }},
  "daily_missions": [
    {{"id": "m1", "title": "short action", "category": "study|revision|mock|reading|exercise|habit|break|reflection", "xp": 20, "duration_min": 45, "time_of_day": "morning|afternoon|evening"}},
    {{"id": "m2", "title": "...", "category": "...", "xp": 15, "duration_min": 30, "time_of_day": "..."}},
    {{"id": "m3", "title": "...", "category": "...", "xp": 25, "duration_min": 60, "time_of_day": "..."}},
    {{"id": "m4", "title": "...", "category": "...", "xp": 10, "duration_min": 15, "time_of_day": "..."}},
    {{"id": "m5", "title": "...", "category": "...", "xp": 15, "duration_min": 20, "time_of_day": "..."}}
  ],
  "motivational_message": "1-2 sentence energizing message tailored to them"
}}

Keep missions realistic and specific to their subjects/exams/goals. Return ONLY JSON."""

    chat = LlmChat(
        api_key=LLM_KEY,
        session_id=f"roadmap_{user_id}_{uuid.uuid4().hex[:6]}",
        system_message=system,
    ).with_model(LLM_PROVIDER, LLM_MODEL)

    response = await chat.send_message(UserMessage(text=prompt))
    roadmap = _parse_json_from_text(response)

    today = datetime.now(timezone.utc).date().isoformat()
    doc = {
        "user_id": user_id,
        "generated_at": datetime.now(timezone.utc),
        "date": today,
        **roadmap,
    }
    await db.roadmaps.update_one(
        {"user_id": user_id, "date": today},
        {"$set": doc},
        upsert=True,
    )
    # Seed today's missions
    for m in roadmap.get("daily_missions", []):
        mid = f"{user_id}_{today}_{m['id']}"
        await db.missions.update_one(
            {"mission_id": mid},
            {"$set": {
                "mission_id": mid,
                "user_id": user_id,
                "date": today,
                "title": m.get("title"),
                "category": m.get("category"),
                "xp": int(m.get("xp", 10)),
                "duration_min": int(m.get("duration_min", 30)),
                "time_of_day": m.get("time_of_day", "morning"),
                "completed": False,
                "completed_at": None,
            }},
            upsert=True,
        )
    return roadmap


@api.post("/onboarding/complete")
async def complete_onboarding(payload: OnboardingSubmit, authorization: Optional[str] = Header(None)):
    user = await get_user_from_token(authorization)
    profile = {a.question_id: a.answer for a in payload.answers}
    profile["_questions"] = [{"id": a.question_id, "q": a.question, "a": a.answer} for a in payload.answers]

    await db.users.update_one(
        {"user_id": user["user_id"]},
        {"$set": {"profile": profile, "onboarded": True}},
    )
    try:
        roadmap = await _generate_roadmap(user["user_id"], profile)
    except Exception as e:
        logger.exception("Roadmap generation failed")
        raise HTTPException(status_code=500, detail=f"Roadmap generation failed: {e}")

    updated = await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0})
    return {"user": updated, "roadmap": roadmap}


# ---------- Dashboard / Missions ----------
def _level_from_xp(xp: int) -> int:
    # 100 xp per level, exponential-ish curve
    lvl = 1
    need = 100
    remaining = xp
    while remaining >= need:
        remaining -= need
        lvl += 1
        need = int(need * 1.25)
    return lvl


@api.get("/dashboard")
async def dashboard(authorization: Optional[str] = Header(None)):
    user = await get_user_from_token(authorization)
    today = datetime.now(timezone.utc).date().isoformat()

    roadmap = await db.roadmaps.find_one({"user_id": user["user_id"], "date": today}, {"_id": 0})
    if not roadmap:
        # find latest
        cur = db.roadmaps.find({"user_id": user["user_id"]}, {"_id": 0}).sort("generated_at", -1).limit(1)
        roadmaps = await cur.to_list(1)
        roadmap = roadmaps[0] if roadmaps else None

    missions = await db.missions.find(
        {"user_id": user["user_id"], "date": today}, {"_id": 0}
    ).to_list(50)
    if not missions and roadmap:
        # seed from roadmap if today has none
        for m in roadmap.get("daily_missions", []):
            mid = f"{user['user_id']}_{today}_{m['id']}"
            doc = {
                "mission_id": mid,
                "user_id": user["user_id"],
                "date": today,
                "title": m.get("title"),
                "category": m.get("category"),
                "xp": int(m.get("xp", 10)),
                "duration_min": int(m.get("duration_min", 30)),
                "time_of_day": m.get("time_of_day", "morning"),
                "completed": False,
                "completed_at": None,
            }
            await db.missions.update_one({"mission_id": mid}, {"$set": doc}, upsert=True)
        missions = await db.missions.find(
            {"user_id": user["user_id"], "date": today}, {"_id": 0}
        ).to_list(50)

    completed = sum(1 for m in missions if m.get("completed"))
    total = len(missions)
    completion = round((completed / total) * 100) if total else 0

    return {
        "user": user,
        "today": today,
        "missions": missions,
        "roadmap_summary": {
            "motivational_message": roadmap.get("motivational_message") if roadmap else "Your journey starts today.",
            "weekly": roadmap.get("weekly") if roadmap else None,
            "long_term": roadmap.get("long_term") if roadmap else None,
        },
        "stats": {
            "missions_completed": completed,
            "missions_total": total,
            "completion_pct": completion,
            "xp": user.get("xp", 0),
            "level": user.get("level", 1),
            "streak": user.get("streak", 0),
            "productivity_score": user.get("productivity_score", 0),
            "focus_score": user.get("focus_score", 0),
        },
    }


@api.get("/roadmap")
async def get_roadmap(authorization: Optional[str] = Header(None)):
    user = await get_user_from_token(authorization)
    cur = db.roadmaps.find({"user_id": user["user_id"]}, {"_id": 0}).sort("generated_at", -1).limit(1)
    rs = await cur.to_list(1)
    if not rs:
        return {"roadmap": None}
    return {"roadmap": rs[0]}


@api.post("/roadmap/regenerate")
async def regen_roadmap(authorization: Optional[str] = Header(None)):
    user = await get_user_from_token(authorization)
    profile = user.get("profile", {})
    if not profile:
        raise HTTPException(status_code=400, detail="Complete onboarding first")
    roadmap = await _generate_roadmap(user["user_id"], profile)
    return {"roadmap": roadmap}


@api.post("/missions/complete")
async def complete_mission(payload: MissionComplete, authorization: Optional[str] = Header(None)):
    user = await get_user_from_token(authorization)
    mission = await db.missions.find_one({"mission_id": payload.mission_id, "user_id": user["user_id"]}, {"_id": 0})
    if not mission:
        raise HTTPException(status_code=404, detail="Mission not found")
    if mission.get("completed"):
        return {"user": user, "mission": mission, "already": True}

    xp_gain = int(mission.get("xp", 10))
    await db.missions.update_one(
        {"mission_id": payload.mission_id},
        {"$set": {"completed": True, "completed_at": datetime.now(timezone.utc)}},
    )

    today = datetime.now(timezone.utc).date().isoformat()
    yesterday = (datetime.now(timezone.utc).date() - timedelta(days=1)).isoformat()
    last_active = user.get("last_active_date")
    if last_active == today:
        new_streak = user.get("streak", 0)
    elif last_active == yesterday:
        new_streak = user.get("streak", 0) + 1
    else:
        new_streak = 1

    new_xp = user.get("xp", 0) + xp_gain
    new_level = _level_from_xp(new_xp)

    badges = list(user.get("badges", []))
    if new_streak >= 7 and "week_warrior" not in badges:
        badges.append("week_warrior")
    if new_streak >= 30 and "monthly_master" not in badges:
        badges.append("monthly_master")
    if new_xp >= 500 and "500_xp" not in badges:
        badges.append("500_xp")
    if new_level >= 5 and "level_5" not in badges:
        badges.append("level_5")

    await db.users.update_one(
        {"user_id": user["user_id"]},
        {"$set": {
            "xp": new_xp,
            "level": new_level,
            "streak": new_streak,
            "last_active_date": today,
            "badges": badges,
        }},
    )
    updated = await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0})
    m = await db.missions.find_one({"mission_id": payload.mission_id}, {"_id": 0})
    return {"user": updated, "mission": m, "xp_gained": xp_gain}


# ---------- Daily Check-in ----------
@api.post("/checkin")
async def daily_checkin(payload: DailyCheckinIn, authorization: Optional[str] = Header(None)):
    user = await get_user_from_token(authorization)
    today = datetime.now(timezone.utc).date().isoformat()

    doc = {
        "checkin_id": f"{user['user_id']}_{today}",
        "user_id": user["user_id"],
        "date": today,
        "mood": payload.mood,
        "productivity": payload.productivity,
        "focus": payload.focus,
        "distractions": payload.distractions or "",
        "learning": payload.learning or "",
        "completed_tasks_ratio": payload.completed_tasks_ratio,
        "created_at": datetime.now(timezone.utc),
    }
    await db.checkins.update_one(
        {"checkin_id": doc["checkin_id"]},
        {"$set": doc},
        upsert=True,
    )

    # Update scores
    prod = int(payload.productivity * 20)
    focus = int(payload.focus * 20)
    await db.users.update_one(
        {"user_id": user["user_id"]},
        {"$set": {"productivity_score": prod, "focus_score": focus}},
    )

    # AI analysis
    system = (
        "You are Twin IQ, a warm supportive AI coach. Give a short (2-3 sentence) "
        "insight based on the student's check-in. Encouraging but honest. Plain text."
    )
    prompt = f"""Student check-in:
- Mood: {payload.mood}/5
- Productivity: {payload.productivity}/5
- Focus: {payload.focus}/5
- Distractions: {payload.distractions}
- Learning: {payload.learning}
- Task completion: {int(payload.completed_tasks_ratio*100)}%

Give a warm, insightful reflection with 1 concrete tip for tomorrow."""
    insight = ""
    try:
        chat = LlmChat(
            api_key=LLM_KEY,
            session_id=f"checkin_{user['user_id']}_{today}",
            system_message=system,
        ).with_model(LLM_PROVIDER, LLM_MODEL)
        insight = await chat.send_message(UserMessage(text=prompt))
    except Exception:
        insight = "Great job showing up today. Reflection is what turns effort into progress."

    await db.checkins.update_one(
        {"checkin_id": doc["checkin_id"]},
        {"$set": {"ai_insight": insight}},
    )
    return {"insight": insight, "checkin": {**doc, "ai_insight": insight}}


@api.get("/checkin/today")
async def checkin_today(authorization: Optional[str] = Header(None)):
    user = await get_user_from_token(authorization)
    today = datetime.now(timezone.utc).date().isoformat()
    doc = await db.checkins.find_one(
        {"user_id": user["user_id"], "date": today}, {"_id": 0}
    )
    return {"checkin": doc}


# ---------- AI Coach Chat ----------
@api.get("/coach/history")
async def coach_history(authorization: Optional[str] = Header(None)):
    user = await get_user_from_token(authorization)
    msgs = await db.coach_messages.find(
        {"user_id": user["user_id"]}, {"_id": 0}
    ).sort("created_at", 1).to_list(200)
    return {"messages": msgs}


@api.post("/coach/message")
async def coach_message(payload: ChatMessageIn, authorization: Optional[str] = Header(None)):
    user = await get_user_from_token(authorization)
    session_id = payload.session_id or f"coach_{user['user_id']}"

    # Persist user message
    user_msg = {
        "message_id": f"msg_{uuid.uuid4().hex[:12]}",
        "user_id": user["user_id"],
        "session_id": session_id,
        "role": "user",
        "text": payload.message,
        "created_at": datetime.now(timezone.utc),
    }
    await db.coach_messages.insert_one(dict(user_msg))
    user_msg.pop("_id", None)

    profile = user.get("profile", {})
    stats = f"XP: {user.get('xp',0)}, Level: {user.get('level',1)}, Streak: {user.get('streak',0)}"
    system = (
        "You are Twin IQ, a friendly, supportive AI mentor and success coach for students. "
        "You motivate, explain concepts clearly, detect burnout/procrastination gently, "
        "suggest study techniques, and encourage consistency. Be warm, concise (2-6 sentences), "
        "and mentor-like — never robotic or list-heavy unless asked.\n\n"
        f"Student profile: {json.dumps(profile)}\n"
        f"Current progress: {stats}"
    )

    # Rebuild session by re-sending last N messages via LlmChat's built-in history isn't
    # persistent across processes; simplest reliable approach: single-shot with recent history in prompt.
    recent = await db.coach_messages.find(
        {"user_id": user["user_id"]}, {"_id": 0}
    ).sort("created_at", -1).limit(10).to_list(10)
    recent.reverse()
    convo = "\n".join(f"{m['role'].upper()}: {m['text']}" for m in recent[:-1])

    prompt = (payload.message if not convo else f"Recent conversation:\n{convo}\n\nUSER: {payload.message}")

    chat = LlmChat(
        api_key=LLM_KEY,
        session_id=f"{session_id}_{uuid.uuid4().hex[:6]}",
        system_message=system,
    ).with_model(LLM_PROVIDER, LLM_MODEL)

    try:
        reply = await chat.send_message(UserMessage(text=prompt))
    except Exception as e:
        logger.exception("Coach failure")
        raise HTTPException(status_code=500, detail=f"AI coach error: {e}")

    ai_msg = {
        "message_id": f"msg_{uuid.uuid4().hex[:12]}",
        "user_id": user["user_id"],
        "session_id": session_id,
        "role": "assistant",
        "text": reply,
        "created_at": datetime.now(timezone.utc),
    }
    await db.coach_messages.insert_one(dict(ai_msg))
    ai_msg.pop("_id", None)
    return {"reply": reply, "message": ai_msg}


# ---------- Reports ----------
@api.get("/reports/weekly")
async def weekly_report(authorization: Optional[str] = Header(None)):
    user = await get_user_from_token(authorization)
    today = datetime.now(timezone.utc).date()
    days = [(today - timedelta(days=i)).isoformat() for i in range(6, -1, -1)]

    daily = []
    for d in days:
        ms = await db.missions.find({"user_id": user["user_id"], "date": d}, {"_id": 0}).to_list(100)
        checkin = await db.checkins.find_one({"user_id": user["user_id"], "date": d}, {"_id": 0})
        completed = sum(1 for m in ms if m.get("completed"))
        xp = sum(int(m.get("xp", 0)) for m in ms if m.get("completed"))
        daily.append({
            "date": d,
            "day": datetime.fromisoformat(d).strftime("%a"),
            "missions_completed": completed,
            "missions_total": len(ms),
            "xp": xp,
            "productivity": checkin.get("productivity", 0) if checkin else 0,
            "focus": checkin.get("focus", 0) if checkin else 0,
            "mood": checkin.get("mood", 0) if checkin else 0,
        })

    total_completed = sum(d["missions_completed"] for d in daily)
    total_missions = sum(d["missions_total"] for d in daily)
    total_xp = sum(d["xp"] for d in daily)
    consistency = round((sum(1 for d in daily if d["missions_completed"] > 0) / 7) * 100)

    return {
        "days": daily,
        "totals": {
            "missions_completed": total_completed,
            "missions_total": total_missions,
            "xp": total_xp,
            "consistency_pct": consistency,
        },
        "user": {
            "xp": user.get("xp", 0),
            "level": user.get("level", 1),
            "streak": user.get("streak", 0),
            "badges": user.get("badges", []),
        },
    }


# ---------- Startup ----------
@app.on_event("startup")
async def startup():
    try:
        await db.users.create_index("email", unique=True)
        await db.users.create_index("user_id", unique=True)
        await db.user_sessions.create_index("session_token", unique=True)
        await db.user_sessions.create_index("expires_at", expireAfterSeconds=0)
        await db.missions.create_index("mission_id", unique=True)
        await db.missions.create_index([("user_id", 1), ("date", 1)])
        await db.roadmaps.create_index([("user_id", 1), ("date", 1)])
        await db.checkins.create_index("checkin_id", unique=True)
        await db.coach_messages.create_index([("user_id", 1), ("created_at", 1)])
    except Exception as e:
        logger.warning(f"Index creation warning: {e}")


@app.on_event("shutdown")
async def shutdown():
    client.close()


app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)
