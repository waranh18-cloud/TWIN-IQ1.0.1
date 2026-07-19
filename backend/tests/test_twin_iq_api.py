"""End-to-end backend tests for Twin IQ API.

Tests order-critical because state builds up (onboarding -> missions -> checkin -> coach -> logout).
"""
import time
import pytest


# ---------- Shared state across tests ----------
STATE = {}


# ---------- Health ----------
class TestHealth:
    def test_root_health(self, api_client, base_url):
        r = api_client.get(f"{base_url}/api/")
        assert r.status_code == 200
        assert r.json().get("message") == "Twin IQ API"


# ---------- Auth ----------
class TestAuth:
    def test_auth_me_with_bearer(self, api_client, base_url, auth_headers):
        r = api_client.get(f"{base_url}/api/auth/me", headers=auth_headers)
        assert r.status_code == 200, r.text
        user = r.json().get("user")
        assert user and user["user_id"] == "user_test001"
        assert user["email"] == "test@twiniq.dev"

    def test_auth_me_no_token(self, api_client, base_url):
        r = api_client.get(f"{base_url}/api/auth/me")
        assert r.status_code == 401

    def test_auth_me_bad_token(self, api_client, base_url):
        r = api_client.get(
            f"{base_url}/api/auth/me",
            headers={"Authorization": "Bearer invalid_token_xyz"},
        )
        assert r.status_code == 401


# ---------- Onboarding ----------
class TestOnboarding:
    def test_onboarding_questions(self, api_client, base_url):
        r = api_client.get(f"{base_url}/api/onboarding/questions")
        assert r.status_code == 200
        qs = r.json().get("questions")
        assert isinstance(qs, list)
        assert len(qs) == 14
        for q in qs:
            assert "id" in q and "q" in q and "chips" in q

    def test_onboarding_complete_generates_roadmap(self, api_client, base_url, auth_headers):
        # Fetch questions to build a valid answers payload
        qs_resp = api_client.get(f"{base_url}/api/onboarding/questions")
        questions = qs_resp.json()["questions"]
        answers = [
            {"question_id": q["id"], "question": q["q"], "answer": q["chips"][0]}
            for q in questions
        ]
        r = api_client.post(
            f"{base_url}/api/onboarding/complete",
            json={"answers": answers},
            headers=auth_headers,
            timeout=90,
        )
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["user"]["onboarded"] is True
        rm = body["roadmap"]
        assert "long_term" in rm
        assert "monthly" in rm and isinstance(rm["monthly"], list)
        assert "weekly" in rm
        assert "daily_missions" in rm and len(rm["daily_missions"]) >= 1
        assert "motivational_message" in rm
        STATE["roadmap"] = rm


# ---------- Dashboard ----------
class TestDashboard:
    def test_dashboard(self, api_client, base_url, auth_headers):
        r = api_client.get(f"{base_url}/api/dashboard", headers=auth_headers)
        assert r.status_code == 200, r.text
        d = r.json()
        assert "missions" in d and isinstance(d["missions"], list)
        assert len(d["missions"]) >= 1, "Missions should be seeded after onboarding"
        assert "roadmap_summary" in d
        assert d["roadmap_summary"].get("motivational_message")
        stats = d["stats"]
        for key in ["xp", "level", "streak", "completion_pct", "missions_total", "missions_completed"]:
            assert key in stats
        STATE["mission_id"] = d["missions"][0]["mission_id"]


# ---------- Missions ----------
class TestMissions:
    def test_complete_mission_awards_xp(self, api_client, base_url, auth_headers):
        mid = STATE.get("mission_id")
        assert mid, "mission_id must be set from dashboard test"
        r = api_client.post(
            f"{base_url}/api/missions/complete",
            json={"mission_id": mid},
            headers=auth_headers,
        )
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["user"]["xp"] > 0
        assert body["user"]["streak"] >= 1
        assert body["mission"]["completed"] is True
        assert body.get("xp_gained", 0) > 0

    def test_complete_mission_idempotent(self, api_client, base_url, auth_headers):
        mid = STATE.get("mission_id")
        r = api_client.post(
            f"{base_url}/api/missions/complete",
            json={"mission_id": mid},
            headers=auth_headers,
        )
        assert r.status_code == 200
        assert r.json().get("already") is True

    def test_complete_mission_invalid(self, api_client, base_url, auth_headers):
        r = api_client.post(
            f"{base_url}/api/missions/complete",
            json={"mission_id": "nonexistent_mission"},
            headers=auth_headers,
        )
        assert r.status_code == 404


# ---------- Roadmap ----------
class TestRoadmap:
    def test_get_roadmap(self, api_client, base_url, auth_headers):
        r = api_client.get(f"{base_url}/api/roadmap", headers=auth_headers)
        assert r.status_code == 200
        rm = r.json().get("roadmap")
        assert rm is not None
        assert "long_term" in rm and "monthly" in rm and "daily_missions" in rm


# ---------- Check-in ----------
class TestCheckin:
    def test_checkin_with_ai_insight(self, api_client, base_url, auth_headers):
        payload = {
            "mood": 4,
            "productivity": 4,
            "focus": 3,
            "distractions": "phone",
            "learning": "linear algebra basics",
            "completed_tasks_ratio": 0.75,
        }
        r = api_client.post(
            f"{base_url}/api/checkin",
            json=payload,
            headers=auth_headers,
            timeout=90,
        )
        assert r.status_code == 200, r.text
        body = r.json()
        assert body.get("insight"), "AI insight should be present"
        assert isinstance(body["insight"], str) and len(body["insight"]) > 5
        assert body["checkin"]["mood"] == 4

    def test_checkin_today(self, api_client, base_url, auth_headers):
        r = api_client.get(f"{base_url}/api/checkin/today", headers=auth_headers)
        assert r.status_code == 200
        c = r.json().get("checkin")
        assert c is not None
        assert c["mood"] == 4


# ---------- Coach ----------
class TestCoach:
    def test_coach_message(self, api_client, base_url, auth_headers):
        r = api_client.post(
            f"{base_url}/api/coach/message",
            json={"message": "I'm feeling overwhelmed with JEE prep. Any advice?"},
            headers=auth_headers,
            timeout=90,
        )
        assert r.status_code == 200, r.text
        body = r.json()
        assert body.get("reply") and isinstance(body["reply"], str)
        assert len(body["reply"]) > 5
        assert body["message"]["role"] == "assistant"

    def test_coach_history(self, api_client, base_url, auth_headers):
        r = api_client.get(f"{base_url}/api/coach/history", headers=auth_headers)
        assert r.status_code == 200
        msgs = r.json().get("messages")
        assert isinstance(msgs, list)
        assert len(msgs) >= 2  # user + assistant from prior test
        roles = {m["role"] for m in msgs}
        assert "user" in roles and "assistant" in roles


# ---------- Reports ----------
class TestReports:
    def test_weekly_report(self, api_client, base_url, auth_headers):
        r = api_client.get(f"{base_url}/api/reports/weekly", headers=auth_headers)
        assert r.status_code == 200
        body = r.json()
        assert "days" in body and len(body["days"]) == 7
        for d in body["days"]:
            for k in ["date", "day", "missions_completed", "missions_total", "xp", "productivity", "focus", "mood"]:
                assert k in d
        totals = body["totals"]
        assert totals["missions_completed"] >= 1  # from earlier test
        assert "consistency_pct" in totals


# ---------- Logout (LAST) ----------
class TestLogout:
    def test_logout_invalidates_session(self, api_client, base_url, auth_headers):
        r = api_client.post(f"{base_url}/api/auth/logout", headers=auth_headers)
        assert r.status_code == 200
        assert r.json().get("success") is True

        # Subsequent /me should 401
        r2 = api_client.get(f"{base_url}/api/auth/me", headers=auth_headers)
        assert r2.status_code == 401
