"""
AI-powered weather advisory endpoint using Hugging Face Inference API.
Generates contextual drone flight recommendations based on weather parameters.
"""
import httpx
import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from app.core.config import settings

logger = logging.getLogger(__name__)
router = APIRouter()

HF_API_URL = "https://router.huggingface.co/novita/v3/openai/chat/completions"
HF_MODEL = "deepseek/deepseek-v3-0324"


class WeatherCheck(BaseModel):
    param: str
    value: str
    status: str  # GO, CAUTION, NO_GO
    detail: str
    limit: str


class AdvisoryRequest(BaseModel):
    checks: List[WeatherCheck]
    level: str  # GO, CAUTION, NO_GO
    temperature: Optional[float] = None
    wind_speed: Optional[float] = None
    wind_gusts: Optional[float] = None
    visibility: Optional[float] = None
    precipitation: Optional[float] = None
    cloud_cover: Optional[float] = None
    weather_code: Optional[int] = None
    humidity: Optional[float] = None
    pressure: Optional[float] = None
    uv_index: Optional[float] = None
    context: Optional[str] = None  # e.g. "drone_takeoff" or "disaster_response"
    disaster_type: Optional[str] = None
    location: Optional[str] = None


def build_prompt(req: AdvisoryRequest) -> str:
    checks_summary = "\n".join(
        f"  - {c.param}: {c.value} [{c.status}] (Limit: {c.limit}) — {c.detail}"
        for c in req.checks
    )

    context_line = ""
    if req.context == "drone_takeoff":
        context_line = "This is for DRONE TAKEOFF weather assessment at the drone's current location."
    elif req.disaster_type:
        context_line = f"This is for DISASTER RESPONSE to a '{req.disaster_type}' incident."

    extra_params = []
    if req.humidity is not None:
        extra_params.append(f"Humidity: {req.humidity:.0f}%")
    if req.pressure is not None:
        extra_params.append(f"Pressure: {req.pressure:.1f} hPa")
    if req.uv_index is not None:
        extra_params.append(f"UV Index: {req.uv_index:.1f}")
    extra_line = f"\nAdditional: {', '.join(extra_params)}" if extra_params else ""

    return f"""You are a certified drone flight operations advisor for a disaster management system in Nepal.

Current weather assessment:
  Overall Status: {req.level.replace('_', '-')}
  Location: {req.location or 'Nepal'}
{checks_summary}{extra_line}

{context_line}

Based on ALL the above weather parameters and their threshold statuses, provide a concise operational recommendation in EXACTLY this format (no extra text, no markdown):

RECOMMENDATION: [1-2 sentence actionable recommendation for drone operators]
RISK_LEVEL: [LOW/MODERATE/HIGH/CRITICAL]
KEY_CONCERN: [single most important weather factor to watch]
ACTION: [specific action the operator should take right now]

Be specific and practical. Reference actual values. Consider Nepal's terrain and altitude."""


@router.post("/ai-advisory")
async def get_ai_advisory(req: AdvisoryRequest):
    if not settings.HF_API_TOKEN:
        raise HTTPException(status_code=500, detail="HF API token not configured")

    prompt = build_prompt(req)

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                HF_API_URL,
                headers={
                    "Authorization": f"Bearer {settings.HF_API_TOKEN}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": HF_MODEL,
                    "messages": [
                        {
                            "role": "system",
                            "content": "You are a drone flight safety advisor. Give concise, structured recommendations. No markdown, no extra commentary."
                        },
                        {"role": "user", "content": prompt}
                    ],
                    "max_tokens": 300,
                    "temperature": 0.3,
                },
            )

        if resp.status_code != 200:
            logger.error(f"HF API error {resp.status_code}: {resp.text}")
            raise HTTPException(status_code=502, detail="AI service unavailable")

        data = resp.json()
        content = data["choices"][0]["message"]["content"].strip()

        # Parse structured response
        result = {
            "recommendation": "",
            "risk_level": req.level.replace("_", "-"),
            "key_concern": "",
            "action": "",
            "raw": content,
        }

        for line in content.split("\n"):
            line = line.strip()
            if line.startswith("RECOMMENDATION:"):
                result["recommendation"] = line.replace("RECOMMENDATION:", "").strip()
            elif line.startswith("RISK_LEVEL:"):
                result["risk_level"] = line.replace("RISK_LEVEL:", "").strip()
            elif line.startswith("KEY_CONCERN:"):
                result["key_concern"] = line.replace("KEY_CONCERN:", "").strip()
            elif line.startswith("ACTION:"):
                result["action"] = line.replace("ACTION:", "").strip()

        # Fallback if parsing fails
        if not result["recommendation"]:
            result["recommendation"] = content[:300]

        return result

    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="AI service timed out")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"AI advisory error: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate advisory")


# ─── AI Weather Report Generation ────────────────────────────────────────
class ReportRequest(BaseModel):
    report_type: str  # "district_risk", "seasonal", "drone_readiness", "executive"
    districts: Optional[List[dict]] = None
    season_data: Optional[dict] = None
    date_range: Optional[str] = None
    additional_context: Optional[str] = None


def build_report_prompt(req: ReportRequest) -> str:
    if req.report_type == "district_risk":
        district_summary = ""
        if req.districts:
            for d in req.districts[:20]:
                district_summary += f"  - {d.get('name', 'Unknown')}: Overall={d.get('overall', 'N/A')}, Flood={d.get('flood', 'N/A')}, Landslide={d.get('landslide', 'N/A')}, Storm={d.get('storm', 'N/A')}, Precip={d.get('precip', 0)}mm, Wind={d.get('wind', 0)}km/h, Temp={d.get('temp', '--')}°C\n"
        return f"""You are a disaster risk analyst for Nepal's National Disaster Response Authority.
Generate a professional DISTRICT RISK ASSESSMENT REPORT based on current weather data.

District Data:
{district_summary}
Date Range: {req.date_range or 'Current'}
{req.additional_context or ''}

Write a structured report with these sections:
1. EXECUTIVE SUMMARY — 2-3 sentences overview of the national risk posture
2. CRITICAL ZONES — List districts at critical/high risk with specific threats
3. RISK ANALYSIS — Break down flood, landslide, and storm risks with data
4. REGIONAL PATTERNS — Identify geographical patterns (Terai flooding, hill landslides, etc.)
5. RECOMMENDATIONS — 3-5 specific, actionable recommendations for disaster response teams
6. DRONE DEPLOYMENT — Suggested drone surveillance priorities based on risk levels

Be data-driven. Reference actual values. Format with clear headers. Keep professional tone. No markdown code blocks."""

    elif req.report_type == "seasonal":
        season_info = ""
        if req.season_data:
            for season_id, data in req.season_data.items():
                season_info += f"  {season_id}: AvgTemp={data.get('avgTemp', '--')}°C, TotalPrecip={data.get('totalPrecip', '--')}mm, AvgWind={data.get('avgWind', '--')}km/h, MaxGusts={data.get('avgGusts', '--')}km/h\n"
        return f"""You are a climate analyst for Nepal's disaster management system.
Generate a SEASONAL WEATHER ANALYSIS REPORT.

Seasonal Aggregates:
{season_info}
Period: {req.date_range or 'Current Year'}
{req.additional_context or ''}

Write a structured report:
1. SEASONAL OVERVIEW — Current season conditions vs historical norms
2. KEY TRENDS — Temperature, precipitation, and wind pattern changes
3. MONSOON PREPAREDNESS — Assessment of monsoon risk indicators
4. RESOURCE PLANNING — Season-specific resource allocation guidance
5. FORECAST IMPLICATIONS — What current trends suggest for coming months
6. ACTION ITEMS — Prioritized list of preparation steps

Reference Nepal's specific geography (Terai, Hills, Mountains). Be specific with data."""

    elif req.report_type == "drone_readiness":
        return f"""You are a drone operations commander for Nepal's disaster response drone fleet.
Generate a DRONE FLEET READINESS REPORT for current weather conditions.

Context: {req.additional_context or 'Standard assessment'}
Date: {req.date_range or 'Current'}

Write a structured report:
1. FLEET STATUS OVERVIEW — Overall GO/NO-GO assessment
2. WEATHER IMPACT ON OPERATIONS — How current conditions affect each flight parameter
3. REGIONAL FLIGHT WINDOWS — Which areas are flyable and optimal timing
4. RISK MITIGATION — Specific protocols for elevated weather parameters
5. MISSION PRIORITIES — Suggested surveillance/response missions ranked by urgency
6. EQUIPMENT NOTES — Battery management, payload considerations for current weather

Be operationally focused. Reference specific wind/visibility/precip thresholds."""

    else:  # executive
        district_summary = ""
        if req.districts:
            critical = [d for d in req.districts if d.get('overall') in ('critical', 'high')]
            district_summary = f"  Total Districts: {len(req.districts)}, Critical/High Risk: {len(critical)}\n"
            for d in critical[:10]:
                district_summary += f"  - {d.get('name')}: {d.get('overall')} risk (Precip: {d.get('precip', 0)}mm, Wind: {d.get('wind', 0)}km/h)\n"
        return f"""You are the chief disaster risk officer for Nepal's National Disaster Response Authority.
Generate an EXECUTIVE BRIEFING for senior leadership.

Current Situation:
{district_summary}
Period: {req.date_range or 'Current'}
{req.additional_context or ''}

Write a concise executive briefing:
1. SITUATION SUMMARY — 3-4 sentence national overview
2. KEY RISK INDICATORS — Critical metrics with trend direction
3. PRIORITY ACTIONS — Top 3 decisions needed from leadership
4. RESOURCE STATUS — Assessment of deployment readiness
5. OUTLOOK — 24-48 hour risk trajectory

Keep it concise and decision-focused. Use clear, authoritative tone."""


@router.post("/generate-report")
async def generate_weather_report(req: ReportRequest):
    if not settings.HF_API_TOKEN:
        raise HTTPException(status_code=500, detail="HF API token not configured")

    prompt = build_report_prompt(req)

    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            resp = await client.post(
                HF_API_URL,
                headers={
                    "Authorization": f"Bearer {settings.HF_API_TOKEN}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": HF_MODEL,
                    "messages": [
                        {
                            "role": "system",
                            "content": "You are a professional disaster management report writer. Generate clear, structured, data-driven reports. IMPORTANT: Do NOT use any markdown formatting — no asterisks (*), no bold markers (**), no hash symbols (#), no underscores for emphasis, no code blocks. Write in plain text only. Use numbered sections like '1. SECTION TITLE' with clear line breaks between sections. Use simple dashes (-) for bullet points."
                        },
                        {"role": "user", "content": prompt}
                    ],
                    "max_tokens": 1500,
                    "temperature": 0.4,
                },
            )

        if resp.status_code != 200:
            logger.error(f"HF report API error {resp.status_code}: {resp.text}")
            raise HTTPException(status_code=502, detail="AI report service unavailable")

        data = resp.json()
        content = data["choices"][0]["message"]["content"].strip()

        # Clean up any think tags and markdown symbols
        import re
        content = re.sub(r'<think>.*?</think>', '', content, flags=re.DOTALL).strip()
        # Strip markdown: ***, **, *, ##, #, __, ~~, ```
        content = re.sub(r'```[\s\S]*?```', '', content)  # code blocks
        content = re.sub(r'\*{1,3}([^*]+)\*{1,3}', r'\1', content)  # bold/italic
        content = re.sub(r'_{1,2}([^_]+)_{1,2}', r'\1', content)  # underscores
        content = re.sub(r'~~([^~]+)~~', r'\1', content)  # strikethrough
        content = re.sub(r'^#{1,6}\s+', '', content, flags=re.MULTILINE)  # headings

        return {"report": content, "report_type": req.report_type}

    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Report generation timed out — try again")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Report generation error: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate report")
