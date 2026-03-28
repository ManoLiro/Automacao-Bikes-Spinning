from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, Any, List, Optional
import asyncio
import json
import sqlite3
import os
from datetime import datetime
import time
import uuid

from gamification import (
    calculate_gamification_metrics, 
    estimate_ftp_from_weight,
    level_from_xp,
    get_level_title,
    calculate_xp_progress,
    XP_REWARDS,
    calculate_xp_for_class  # Added for class end XP calculation
)

app = FastAPI(title="Bike Dashboard API")

# CORS para permitir requisições do frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ──────────────────────────────────────────────
# SQLite – Banco de dados
# ──────────────────────────────────────────────
DB_PATH = os.path.join(os.path.dirname(__file__), "abitah_bikes.db")

# Personal record types
RECORD_TYPES = {
    "max_power": "Potência Máxima",
    "max_wkg": "W/kg Máximo",
    "max_cadence": "Cadência Máxima",
    "max_speed": "Velocidade Máxima",
    "best_sprint_30s": "Melhor Sprint 30s",
    "best_sprint_60s": "Melhor Sprint 60s",
    "longest_z4_streak": "Maior Tempo em Z4+",
}


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS students (
            cpf TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            weight REAL NOT NULL,
            height REAL NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS bike_assignments (
            device TEXT PRIMARY KEY,
            student_cpf TEXT NOT NULL,
            assigned_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (student_cpf) REFERENCES students(cpf)
        )
    """)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS bikes (
            device TEXT PRIMARY KEY,
            display_name TEXT,
            instant_power REAL DEFAULT 0,
            instant_cadence REAL DEFAULT 0,
            instant_speed REAL DEFAULT 0,
            total_distance REAL DEFAULT 0,
            last_update TEXT,
            last_timestamp REAL DEFAULT 0
        )
    """)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS student_profiles (
            student_cpf TEXT PRIMARY KEY,
            ftp INTEGER DEFAULT NULL,
            ftp_estimated INTEGER DEFAULT 1,
            ftp_updated_at TEXT,
            total_xp INTEGER DEFAULT 0,
            level INTEGER DEFAULT 1,
            total_classes INTEGER DEFAULT 0,
            total_distance_km REAL DEFAULT 0,
            total_time_minutes INTEGER DEFAULT 0,
            show_in_ranking INTEGER DEFAULT 1,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (student_cpf) REFERENCES students(cpf)
        )
    ''')
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS game_state (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            current_session_id TEXT,
            game_mode TEXT DEFAULT 'normal',
            sprint_active INTEGER DEFAULT 0,
            sprint_start_time TEXT,
            sprint_duration INTEGER,
            sprint_number INTEGER DEFAULT 0,
            team_mode TEXT,
            cadence_target INTEGER,
            cadence_challenge_active INTEGER DEFAULT 0,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    cursor.execute('INSERT OR IGNORE INTO game_state (id) VALUES (1)')
    
    # Class sessions table - tracks each class
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS class_sessions (
            id TEXT PRIMARY KEY,
            started_at TEXT NOT NULL,
            ended_at TEXT,
            instructor_name TEXT,
            class_type TEXT DEFAULT 'regular',
            total_participants INTEGER DEFAULT 0,
            is_active INTEGER DEFAULT 1
        )
    ''')
    
    # Class participation table - tracks individual student performance per class
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS class_participation (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            class_session_id TEXT NOT NULL,
            student_cpf TEXT NOT NULL,
            device TEXT NOT NULL,
            
            avg_power REAL DEFAULT 0,
            max_power REAL DEFAULT 0,
            avg_cadence REAL DEFAULT 0,
            max_cadence REAL DEFAULT 0,
            avg_speed REAL DEFAULT 0,
            max_speed REAL DEFAULT 0,
            total_distance_m REAL DEFAULT 0,
            duration_seconds INTEGER DEFAULT 0,
            
            time_z1 INTEGER DEFAULT 0,
            time_z2 INTEGER DEFAULT 0,
            time_z3 INTEGER DEFAULT 0,
            time_z4 INTEGER DEFAULT 0,
            time_z5 INTEGER DEFAULT 0,
            time_z6 INTEGER DEFAULT 0,
            
            xp_earned INTEGER DEFAULT 0,
            
            FOREIGN KEY (class_session_id) REFERENCES class_sessions(id),
            FOREIGN KEY (student_cpf) REFERENCES students(cpf),
            UNIQUE(class_session_id, student_cpf)
        )
    ''')
    
    # Personal records table - tracks all-time bests per student
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS personal_records (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_cpf TEXT NOT NULL,
            record_type TEXT NOT NULL,
            value REAL NOT NULL,
            achieved_at TEXT DEFAULT CURRENT_TIMESTAMP,
            class_session_id TEXT,
            UNIQUE(student_cpf, record_type)
        )
    ''')
    
    # Badges table - tracks available badges
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS badges (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT NOT NULL,
            icon TEXT NOT NULL,
            category TEXT NOT NULL,
            xp_reward INTEGER DEFAULT 0,
            condition_type TEXT NOT NULL,
            condition_value REAL NOT NULL,
            condition_metric TEXT
        )
    ''')
    
    # Student badges table - tracks earned badges
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS student_badges (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_cpf TEXT NOT NULL,
            badge_id TEXT NOT NULL,
            earned_at TEXT DEFAULT CURRENT_TIMESTAMP,
            class_session_id TEXT,
            FOREIGN KEY (student_cpf) REFERENCES students(cpf),
            FOREIGN KEY (badge_id) REFERENCES badges(id),
            UNIQUE(student_cpf, badge_id)
        )
    ''')
    
    # Migration: Add updated_at column to student_profiles if not exists
    try:
        cursor.execute("ALTER TABLE student_profiles ADD COLUMN updated_at TEXT")
    except sqlite3.OperationalError:
        pass  # Column already exists
    
    conn.commit()
    conn.close()


def init_badges():
    """Initialize predefined badges"""
    conn = get_db()
    
    # Check if already populated
    count = conn.execute("SELECT COUNT(*) FROM badges").fetchone()[0]
    if count > 0:
        conn.close()
        return
    
    badges_data = [
        # Frequency
        ("first_ride", "Primeira Pedalada", "Complete sua primeira aula", "🎯", "frequency", 100, "count", 1, "classes"),
        ("week_streak_5", "Semana Perfeita", "5 aulas em 7 dias", "🔥", "frequency", 200, "streak", 5, "classes_per_week"),
        ("month_20", "Mês de Fogo", "20 aulas no mês", "📅", "frequency", 300, "count", 20, "classes_per_month"),
        ("centurion", "Centenário", "100 aulas totais", "💯", "frequency", 1000, "count", 100, "total_classes"),
        ("distance_100km", "100km Percorridos", "Pedalar 100km totais", "🚴", "frequency", 500, "threshold", 100, "total_distance_km"),
        
        # Performance
        ("power_300w", "Raio", "Atingir 300W instantâneos", "⚡", "performance", 150, "threshold", 300, "instant_power"),
        ("z5_2min", "Foguete", "Manter Z5 por 2 minutos", "🚀", "performance", 200, "duration", 120, "time_in_z5"),
        ("wkg_4", "Alpinista", "4.0 W/kg por 1 minuto", "🏔️", "performance", 250, "threshold", 4.0, "wkg_sustained"),
        ("z3_30min", "Consistente", "30 minutos em Z3+", "💪", "performance", 300, "duration", 1800, "time_z3_plus"),
        ("power_400w", "Trovão", "Atingir 400W instantâneos", "⚡⚡", "performance", 300, "threshold", 400, "instant_power"),
        
        # Social/Team
        ("team_battle_5", "Jogador de Equipe", "Vencer 5 batalhas de equipe", "🤝", "social", 250, "count", 5, "team_wins"),
        ("sprint_win_3", "Velocista", "Vencer 3 sprints seguidos", "👑", "social", 300, "streak", 3, "sprint_wins"),
        ("team_mvp", "Capitão", "Maior contribuição em batalha", "🎖️", "social", 200, "rank", 1, "team_contribution"),
        
        # Milestones
        ("level_10", "Dedicado", "Alcançar nível 10", "⭐", "milestone", 500, "threshold", 10, "level"),
        ("level_25", "Atleta", "Alcançar nível 25", "⭐⭐", "milestone", 1000, "threshold", 25, "level"),
        ("ftp_test", "Testado", "Completar teste de FTP", "📊", "milestone", 300, "count", 1, "ftp_tests"),
    ]
    
    for badge in badges_data:
        conn.execute("""
            INSERT OR IGNORE INTO badges 
            (id, name, description, icon, category, xp_reward, condition_type, condition_value, condition_metric)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, badge)
    
    conn.commit()
    conn.close()


# Inicializa banco na startup
init_db()
init_badges()


# ──────────────────────────────────────────
# Modelos Pydantic
# ──────────────────────────────────────────
class BikeReading(BaseModel):
    ts: float
    src: str
    device: str
    reading: Dict[str, Any]


class StudentCreate(BaseModel):
    cpf: str
    name: str
    weight: float
    height: float


class StudentUpdate(BaseModel):
    name: Optional[str] = None
    weight: Optional[float] = None
    height: Optional[float] = None


class BikeAssignment(BaseModel):
    device: str
    student_cpf: str


class BikeDisplayName(BaseModel):
    display_name: str


class ClassConfig(BaseModel):
    instructor_name: Optional[str] = None
    class_type: str = "regular"


class TeamBattleConfig(BaseModel):
    mode: str = "left_right"  # or "random"
    metric: str = "total_power"  # or "avg_wkg"


# ──────────────────────────────────────────
# Estado em memória (apenas conexões WS)
# ──────────────────────────────────────────
active_connections: List[WebSocket] = []

# Sprint state in memory for speed
sprint_state = {
    "active": False,
    "start_time": None,
    "duration": 0,
    "sprint_number": 0,
    "power_samples": {},  # device -> list of (power, weight) tuples
    "task": None,
}

# Class session state in memory for tracking participation
class_session_state = {
    "active": False,
    "session_id": None,
    "started_at": None,
    "instructor_name": None,
    "class_type": "regular",
    # Per-device tracking: device -> { student_cpf, power_samples, cadence_samples, speed_samples, 
    #                                   max_power, max_cadence, max_speed, distance_start, zone_time, last_zone, last_sample_time }
    "participants": {},
}

# Cadence challenge state in memory
cadence_state = {
    "active": False,
    "target_rpm": 90,
    "duration": 120,
    "start_time": None,
    "participants": {},  # device: {"at_target": bool, "current_cadence": float, "student_name": str}
    "task": None,
}

# Team battle state in memory
team_state = {
    "active": False,
    "mode": None,  # "left_right" or "random"
    "metric": "total_power",  # or "avg_wkg"
    "teams": {
        "left": {"name": "Equipe Esquerda", "color": "#3B82F6", "devices": [], "total_power": 0, "total_wkg": 0, "count": 0},
        "right": {"name": "Equipe Direita", "color": "#EF4444", "devices": [], "total_power": 0, "total_wkg": 0, "count": 0}
    },
    "power_samples": {}  # device -> list of power/wkg samples for averaging
}

# FTP Test state in memory
ftp_test_state = {
    "active": False,
    "start_time": None,
    "duration": 1200,  # 20 minutes in seconds
    "participants": {},  # device: {"student_cpf": str, "power_samples": []}
    "task": None,
}


def get_or_create_student_profile(student_cpf: str, weight_kg: float):
    """Gets existing profile or creates one with estimated FTP."""
    conn = get_db()
    row = conn.execute("SELECT * FROM student_profiles WHERE student_cpf = ?", (student_cpf,)).fetchone()
    if row:
        result = dict(row)
        conn.close()
        return result
    estimated_ftp = estimate_ftp_from_weight(weight_kg)
    conn.execute("""
        INSERT INTO student_profiles (student_cpf, ftp, ftp_estimated, ftp_updated_at)
        VALUES (?, ?, 1, datetime('now'))
    """, (student_cpf, estimated_ftp))
    conn.commit()
    conn.close()
    return {
        "student_cpf": student_cpf,
        "ftp": estimated_ftp,
        "ftp_estimated": True,
        "total_xp": 0,
        "level": 1,
        "show_in_ranking": True
    }


def calculate_speed_from_power_and_cadence(power: float, cadence: float) -> float:
    """
    Calcula a velocidade (km/h) baseada na potência (W) e cadência (RPM).
    """
    speed_from_cadence = cadence * 2.1 * 3.5 * 60 / 1000
    power_factor = 0.9 + (power - 80) / (250 - 80) * 0.25
    power_factor = max(0.8, min(1.2, power_factor))
    speed = speed_from_cadence * power_factor
    return round(speed, 1)


def get_all_bikes_from_db() -> Dict[str, Dict[str, Any]]:
    """Retorna todas as bikes do SQLite como dicionário."""
    conn = get_db()
    rows = conn.execute("SELECT * FROM bikes").fetchall()
    conn.close()
    bikes = {}
    for r in rows:
        bikes[r["device"]] = {
            "device": r["device"],
            "display_name": r["display_name"],
            "last_update": r["last_update"],
            "instant_speed": r["instant_speed"],
            "instant_power": r["instant_power"],
            "instant_cadence": r["instant_cadence"],
            "total_distance": int(r["total_distance"]),
        }
    return bikes


async def check_personal_records(student_cpf: str, device: str, metrics: dict):
    """Check if any metrics beat personal records"""
    conn = get_db()
    records_broken = []
    
    # Check each possible record
    checks = [
        ("max_power", metrics.get("instant_power", 0)),
        ("max_wkg", metrics.get("current_wkg", 0)),
        ("max_cadence", metrics.get("instant_cadence", 0)),
        ("max_speed", metrics.get("instant_speed", 0)),
    ]
    
    for record_type, current_value in checks:
        if current_value <= 0:
            continue
            
        existing = conn.execute(
            "SELECT value FROM personal_records WHERE student_cpf = ? AND record_type = ?",
            (student_cpf, record_type)
        ).fetchone()
        
        if not existing or current_value > existing["value"]:
            old_value = existing["value"] if existing else 0
            
            conn.execute("""
                INSERT OR REPLACE INTO personal_records (student_cpf, record_type, value, achieved_at)
                VALUES (?, ?, ?, datetime('now'))
            """, (student_cpf, record_type, current_value))
            
            records_broken.append({
                "type": record_type,
                "name": RECORD_TYPES.get(record_type, record_type),
                "old_value": old_value,
                "new_value": current_value
            })
    
    conn.commit()
    
    # Broadcast record events
    for record in records_broken:
        student = conn.execute("SELECT name FROM students WHERE cpf = ?", (student_cpf,)).fetchone()
        await broadcast(json.dumps({
            "type": "event",
            "event": "personal_record",
            "data": {
                "device": device,
                "student_name": student["name"] if student else "Aluno",
                "student_cpf": student_cpf,
                "record_type": record["type"],
                "record_name": record["name"],
                "old_value": record["old_value"],
                "new_value": record["new_value"]
            }
        }))
    
    conn.close()
    return records_broken


# ──────────────────────────────────────────
# Endpoints – Dados das bikes
# ──────────────────────────────────────────
@app.post("/api/ftms")
async def receive_bike_data(data: BikeReading):
    """
    Recebe dados das bicicletas (ESP32).
    Apenas cadência e potência são recebidos; velocidade e distância são calculados.
    """
    device_name = data.device
    current_time = time.time()

    conn = get_db()
    row = conn.execute("SELECT * FROM bikes WHERE device = ?", (device_name,)).fetchone()

    reading = data.reading
    instant_power = reading.get("instant_power", 0)
    instant_cadence = reading.get("instant_cadence", 0)
    instant_speed = calculate_speed_from_power_and_cadence(instant_power, instant_cadence)

    if row:
        last_timestamp = row["last_timestamp"] or current_time
        total_distance = row["total_distance"] or 0.0
        time_delta = current_time - last_timestamp
        if time_delta > 0:
            distance_increment = (instant_speed * time_delta / 3600) * 1000
            total_distance += distance_increment

        conn.execute("""
            UPDATE bikes SET instant_power = ?, instant_cadence = ?, instant_speed = ?,
                total_distance = ?, last_update = ?, last_timestamp = ?
            WHERE device = ?
        """, (instant_power, instant_cadence, instant_speed,
              total_distance, datetime.now().isoformat(), current_time, device_name))
    else:
        conn.execute("""
            INSERT INTO bikes (device, instant_power, instant_cadence, instant_speed,
                total_distance, last_update, last_timestamp)
            VALUES (?, ?, ?, ?, 0, ?, ?)
        """, (device_name, instant_power, instant_cadence, instant_speed,
              datetime.now().isoformat(), current_time))

    conn.commit()

    # Ler o registro atualizado para broadcast
    updated = conn.execute("SELECT * FROM bikes WHERE device = ?", (device_name,)).fetchone()
    
    # Check if bike has assigned student for gamification
    assignment = conn.execute("""
        SELECT ba.student_cpf, s.name, s.weight, s.height
        FROM bike_assignments ba
        JOIN students s ON ba.student_cpf = s.cpf
        WHERE ba.device = ?
    """, (device_name,)).fetchone()
    conn.close()

    bike_info = {
        "device": updated["device"],
        "display_name": updated["display_name"],
        "last_update": updated["last_update"],
        "instant_speed": updated["instant_speed"],
        "instant_power": updated["instant_power"],
        "instant_cadence": updated["instant_cadence"],
        "total_distance": int(updated["total_distance"]),
    }

    gamification_data = None
    if assignment:
        student_cpf = assignment["student_cpf"]
        student_name = assignment["name"]
        weight_kg = assignment["weight"]
        
        profile = get_or_create_student_profile(student_cpf, weight_kg)
        ftp = profile.get("ftp") if not profile.get("ftp_estimated") else None
        gam = calculate_gamification_metrics(instant_power, weight_kg, ftp)
        
        # Calculate XP progress for display
        xp_progress = calculate_xp_progress(profile.get("total_xp", 0))
        
        gamification_data = {
            "student_name": student_name,
            "student_level": xp_progress["level"],
            "student_title": xp_progress["title"],
            "total_xp": xp_progress["total_xp"],
            "xp_progress": xp_progress["progress"],
            "xp_in_level": xp_progress["xp_in_level"],
            "xp_for_next": xp_progress["xp_for_next"],
            "current_zone": gam.current_zone,
            "zone_color": gam.zone_color,
            "zone_name": gam.zone_name,
            "ftp_percent": gam.ftp_percent,
            "current_wkg": gam.current_wkg,
            "ftp": gam.ftp,
            "ftp_is_estimated": gam.ftp_is_estimated,
            "show_in_ranking": profile.get("show_in_ranking", True)
        }
        
        # Record power sample during sprint
        if sprint_state["active"] and weight_kg > 0:
            if device_name not in sprint_state["power_samples"]:
                sprint_state["power_samples"][device_name] = []
            sprint_state["power_samples"][device_name].append({
                "power": instant_power,
                "weight": weight_kg,
                "wkg": gam.current_wkg,
                "student_name": student_name,
                "student_cpf": student_cpf
            })
        
        # Update team scores during team battle
        if team_state["active"] and weight_kg > 0:
            update_team_scores(device_name, instant_power, gam.current_wkg)
        
        # Track cadence during cadence challenge (2 RPM tolerance)
        if cadence_state["active"]:
            at_target = instant_cadence >= (cadence_state["target_rpm"] - 2)
            cadence_state["participants"][device_name] = {
                "at_target": at_target,
                "current_cadence": instant_cadence,
                "student_name": student_name
            }
        
        # Record power sample during FTP test
        if ftp_test_state["active"]:
            if device_name not in ftp_test_state["participants"]:
                ftp_test_state["participants"][device_name] = {
                    "student_cpf": student_cpf,
                    "student_name": student_name,
                    "weight": weight_kg,
                    "power_samples": []
                }
            ftp_test_state["participants"][device_name]["power_samples"].append(instant_power)
        
        # Track participation during active class session
        if class_session_state["active"]:
            if device_name not in class_session_state["participants"]:
                # Initialize participant tracking
                class_session_state["participants"][device_name] = {
                    "student_cpf": student_cpf,
                    "student_name": student_name,
                    "weight": weight_kg,
                    "power_samples": [],
                    "cadence_samples": [],
                    "speed_samples": [],
                    "max_power": 0,
                    "max_cadence": 0,
                    "max_speed": 0,
                    "distance_start": int(updated["total_distance"]),
                    "zone_time": {1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0},
                    "last_zone": None,
                    "last_sample_time": current_time,
                }
            
            participant = class_session_state["participants"][device_name]
            participant["power_samples"].append(instant_power)
            participant["cadence_samples"].append(instant_cadence)
            participant["speed_samples"].append(instant_speed)
            participant["max_power"] = max(participant["max_power"], instant_power)
            participant["max_cadence"] = max(participant["max_cadence"], instant_cadence)
            participant["max_speed"] = max(participant["max_speed"], instant_speed)
            
            # Track time in each zone
            current_zone = gam.current_zone
            if participant["last_zone"] is not None:
                time_in_zone = current_time - participant["last_sample_time"]
                if time_in_zone < 10:  # Only count if less than 10s gap (avoid disconnection gaps)
                    participant["zone_time"][participant["last_zone"]] += int(time_in_zone)
            participant["last_zone"] = current_zone
            participant["last_sample_time"] = current_time
        
        # Check for personal records
        await check_personal_records(
            student_cpf=student_cpf,
            device=device_name,
            metrics={
                "instant_power": instant_power,
                "instant_cadence": instant_cadence,
                "instant_speed": instant_speed,
                "current_wkg": gam.current_wkg
            }
        )

    if active_connections:
        update_message = {
            "type": "update",
            "device": device_name,
            "data": bike_info,
            "gamification": gamification_data,
        }
        
        # Add class distance if class is active
        if class_session_state["active"] and device_name in class_session_state["participants"]:
            participant_data = class_session_state["participants"][device_name]
            class_distance_m = int(updated["total_distance"]) - participant_data.get("distance_start", 0)
            update_message["data"]["class_distance_m"] = class_distance_m
        
        # Include team battle state if active
        if team_state["active"]:
            update_message["team_battle"] = get_team_battle_state()
        
        message = json.dumps(update_message)
        await broadcast(message)

    return {"status": "ok", "device": device_name}


@app.get("/api/bikes")
async def get_all_bikes():
    return {"bikes": get_all_bikes_from_db()}


@app.put("/api/bikes/{device}/display-name")
async def update_bike_display_name(device: str, body: BikeDisplayName):
    """Atualiza o display name de uma bike."""
    conn = get_db()
    row = conn.execute("SELECT * FROM bikes WHERE device = ?", (device,)).fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Bike não encontrada")
    conn.execute("UPDATE bikes SET display_name = ? WHERE device = ?", (body.display_name, device))
    conn.commit()
    conn.close()

    # Broadcast atualização
    bikes = get_all_bikes_from_db()
    if active_connections:
        await broadcast(json.dumps({"type": "initial", "bikes": bikes, "assignments": await _get_assignments_dict()}))

    return {"status": "ok", "device": device, "display_name": body.display_name}


@app.post("/api/bikes/reset")
async def reset_all_bikes():
    """Remove todas as bikes e seus vínculos. NÃO apaga alunos."""
    conn = get_db()
    conn.execute("DELETE FROM bike_assignments")
    conn.execute("DELETE FROM bikes")
    conn.commit()
    conn.close()

    # Broadcast para clientes
    if active_connections:
        await broadcast(json.dumps({
            "type": "initial",
            "bikes": {},
            "assignments": {},
        }))

    return {"status": "ok", "message": "Todas as bikes foram removidas. Alunos mantidos."}


# ──────────────────────────────────────────
# Endpoints – CRUD de Alunos
# ──────────────────────────────────────────
@app.get("/api/students")
async def list_students():
    conn = get_db()
    rows = conn.execute("SELECT * FROM students ORDER BY name").fetchall()
    conn.close()
    return {"students": [dict(r) for r in rows]}


@app.get("/api/students/{cpf}")
async def get_student(cpf: str):
    conn = get_db()
    row = conn.execute("SELECT * FROM students WHERE cpf = ?", (cpf,)).fetchone()
    conn.close()
    if not row:
        raise HTTPException(status_code=404, detail="Aluno não encontrado")
    return dict(row)


@app.post("/api/students")
async def create_student(student: StudentCreate):
    conn = get_db()
    try:
        conn.execute(
            "INSERT INTO students (cpf, name, weight, height) VALUES (?, ?, ?, ?)",
            (student.cpf, student.name, student.weight, student.height),
        )
        conn.commit()
    except sqlite3.IntegrityError:
        conn.close()
        raise HTTPException(status_code=409, detail="CPF já cadastrado")
    conn.close()
    return {"status": "ok", "cpf": student.cpf}


@app.put("/api/students/{cpf}")
async def update_student(cpf: str, student: StudentUpdate):
    conn = get_db()
    existing = conn.execute("SELECT * FROM students WHERE cpf = ?", (cpf,)).fetchone()
    if not existing:
        conn.close()
        raise HTTPException(status_code=404, detail="Aluno não encontrado")
    updates = {}
    if student.name is not None:
        updates["name"] = student.name
    if student.weight is not None:
        updates["weight"] = student.weight
    if student.height is not None:
        updates["height"] = student.height
    if updates:
        set_clause = ", ".join(f"{k} = ?" for k in updates)
        values = list(updates.values()) + [cpf]
        conn.execute(f"UPDATE students SET {set_clause} WHERE cpf = ?", values)
        conn.commit()
    conn.close()
    return {"status": "ok", "cpf": cpf}


@app.delete("/api/students/{cpf}")
async def delete_student(cpf: str):
    conn = get_db()
    conn.execute("DELETE FROM bike_assignments WHERE student_cpf = ?", (cpf,))
    result = conn.execute("DELETE FROM students WHERE cpf = ?", (cpf,))
    conn.commit()
    if result.rowcount == 0:
        conn.close()
        raise HTTPException(status_code=404, detail="Aluno não encontrado")
    conn.close()

    # Notifica frontend que vínculos mudaram
    await broadcast_assignments()

    return {"status": "ok"}


# ──────────────────────────────────────────
# Endpoints – XP / Levels
# ──────────────────────────────────────────
class AwardXPRequest(BaseModel):
    student_cpf: str
    amount: int
    reason: str = "manual"


@app.get("/api/students/{cpf}/xp")
async def get_student_xp(cpf: str):
    """Get student XP progress and level info."""
    conn = get_db()
    profile = conn.execute(
        "SELECT total_xp, level FROM student_profiles WHERE student_cpf = ?",
        (cpf,)
    ).fetchone()
    
    if not profile:
        # Check if student exists
        student = conn.execute("SELECT * FROM students WHERE cpf = ?", (cpf,)).fetchone()
        conn.close()
        if not student:
            raise HTTPException(status_code=404, detail="Aluno não encontrado")
        # Return default values for student without profile
        return calculate_xp_progress(0)
    
    conn.close()
    return calculate_xp_progress(profile["total_xp"])


@app.post("/api/xp/award")
async def award_xp_endpoint(body: AwardXPRequest):
    """Award XP to a student (instructor action)."""
    result = await award_xp(body.student_cpf, body.amount, body.reason)
    if result is None:
        raise HTTPException(status_code=404, detail="Perfil de aluno não encontrado")
    return {"status": "ok", **result}


@app.get("/api/xp/rewards")
async def get_xp_rewards():
    """Get XP reward values configuration."""
    return {"rewards": XP_REWARDS}


@app.get("/api/students/{cpf}/records")
async def get_student_records(cpf: str):
    """Get all personal records for a student"""
    conn = get_db()
    
    # Check if student exists
    student = conn.execute("SELECT * FROM students WHERE cpf = ?", (cpf,)).fetchone()
    if not student:
        conn.close()
        raise HTTPException(status_code=404, detail="Aluno não encontrado")
    
    # Get all records for this student
    records = conn.execute("""
        SELECT record_type, value, achieved_at, class_session_id
        FROM personal_records
        WHERE student_cpf = ?
        ORDER BY achieved_at DESC
    """, (cpf,)).fetchall()
    conn.close()
    
    result = {}
    for r in records:
        record_type = r["record_type"]
        result[record_type] = {
            "type": record_type,
            "name": RECORD_TYPES.get(record_type, record_type),
            "value": r["value"],
            "achieved_at": r["achieved_at"],
            "class_session_id": r["class_session_id"]
        }
    
    return {
        "student_cpf": cpf,
        "student_name": student["name"],
        "records": result,
        "record_types": RECORD_TYPES
    }


@app.get("/api/badges")
async def get_all_badges():
    """Get all available badges"""
    conn = get_db()
    badges = conn.execute("SELECT * FROM badges ORDER BY category, xp_reward").fetchall()
    conn.close()
    return [dict(b) for b in badges]


@app.get("/api/students/{cpf}/badges")
async def get_student_badges(cpf: str):
    """Get badges earned by student"""
    conn = get_db()
    
    # Check if student exists
    student = conn.execute("SELECT * FROM students WHERE cpf = ?", (cpf,)).fetchone()
    if not student:
        conn.close()
        raise HTTPException(status_code=404, detail="Aluno não encontrado")
    
    badges = conn.execute("""
        SELECT b.*, sb.earned_at, sb.class_session_id
        FROM student_badges sb
        JOIN badges b ON sb.badge_id = b.id
        WHERE sb.student_cpf = ?
        ORDER BY sb.earned_at DESC
    """, (cpf,)).fetchall()
    conn.close()
    
    return {
        "student_cpf": cpf,
        "student_name": student["name"],
        "badges": [dict(b) for b in badges]
    }


@app.get("/api/assignments")
async def list_assignments():
    conn = get_db()
    rows = conn.execute("""
        SELECT ba.device, ba.student_cpf, s.name as student_name, s.weight, s.height
        FROM bike_assignments ba
        JOIN students s ON ba.student_cpf = s.cpf
    """).fetchall()
    conn.close()
    assignments = {r["device"]: dict(r) for r in rows}
    return {"assignments": assignments}


@app.post("/api/assignments")
async def assign_student_to_bike(assignment: BikeAssignment):
    conn = get_db()
    # Verifica se o aluno existe
    student = conn.execute("SELECT * FROM students WHERE cpf = ?", (assignment.student_cpf,)).fetchone()
    if not student:
        conn.close()
        raise HTTPException(status_code=404, detail="Aluno não encontrado")

    # Upsert – substitui se já existe vínculo para esse device
    conn.execute(
        "INSERT OR REPLACE INTO bike_assignments (device, student_cpf) VALUES (?, ?)",
        (assignment.device, assignment.student_cpf),
    )
    conn.commit()
    conn.close()

    await broadcast_assignments()

    return {"status": "ok", "device": assignment.device, "student_cpf": assignment.student_cpf}


@app.delete("/api/assignments/{device}")
async def unassign_bike(device: str):
    conn = get_db()
    conn.execute("DELETE FROM bike_assignments WHERE device = ?", (device,))
    conn.commit()
    conn.close()

    await broadcast_assignments()

    return {"status": "ok"}


@app.post("/api/assignments/reset")
async def reset_all_assignments():
    """Remove todos os vínculos – usado ao trocar de turma."""
    conn = get_db()
    conn.execute("DELETE FROM bike_assignments")
    conn.commit()
    conn.close()

    await broadcast_assignments()

    return {"status": "ok", "message": "Todos os vínculos foram removidos"}


async def _get_assignments_dict() -> Dict[str, Any]:
    """Helper para montar dict de assignments."""
    conn = get_db()
    rows = conn.execute("""
        SELECT ba.device, ba.student_cpf, s.name as student_name, s.weight, s.height
        FROM bike_assignments ba
        JOIN students s ON ba.student_cpf = s.cpf
    """).fetchall()
    conn.close()
    return {r["device"]: dict(r) for r in rows}


async def broadcast_assignments():
    """Envia a lista atualizada de vínculos para todos os clientes WS."""
    assignments = await _get_assignments_dict()
    msg = json.dumps({"type": "assignments", "assignments": assignments})
    await broadcast(msg)


async def check_badges(student_cpf: str, device: str = None, session_id: str = None, conn=None):
    """Check if student earned any new badges"""
    should_close = False
    if conn is None:
        conn = get_db()
        should_close = True
    
    # Get student profile and stats (convert to dict for mutability)
    profile_row = conn.execute("""
        SELECT * FROM student_profiles WHERE student_cpf = ?
    """, (student_cpf,)).fetchone()
    
    if not profile_row:
        if should_close:
            conn.close()
        return []
    
    # Convert Row to dict for easy access and updates
    profile = dict(profile_row)
    
    # Get all badges not yet earned
    earned_badge_ids = [r["badge_id"] for r in conn.execute("""
        SELECT badge_id FROM student_badges WHERE student_cpf = ?
    """, (student_cpf,)).fetchall()]
    
    available_badges = conn.execute("""
        SELECT * FROM badges WHERE id NOT IN ({})
    """.format(','.join(['?'] * len(earned_badge_ids)) if earned_badge_ids else '""'), 
        earned_badge_ids if earned_badge_ids else []).fetchall()
    
    newly_earned = []
    
    for badge in available_badges:
        earned = False
        
        if badge["condition_type"] == "count":
            if badge["condition_metric"] == "classes":
                earned = profile["total_classes"] >= badge["condition_value"]
            elif badge["condition_metric"] == "total_classes":
                earned = profile["total_classes"] >= badge["condition_value"]
        
        elif badge["condition_type"] == "threshold":
            if badge["condition_metric"] == "level":
                earned = profile["level"] >= badge["condition_value"]
            elif badge["condition_metric"] == "total_distance_km":
                earned = profile["total_distance_km"] >= badge["condition_value"]
        
        if earned:
            # Award badge
            conn.execute("""
                INSERT INTO student_badges (student_cpf, badge_id, class_session_id)
                VALUES (?, ?, ?)
            """, (student_cpf, badge["id"], session_id))
            
            # Award XP (inline to avoid nested connections)
            if badge["xp_reward"] > 0:
                old_level = profile["level"]
                new_xp = profile["total_xp"] + badge["xp_reward"]
                new_level = level_from_xp(new_xp)
                
                conn.execute("""
                    UPDATE student_profiles SET total_xp = ?, level = ?, updated_at = datetime('now')
                    WHERE student_cpf = ?
                """, (new_xp, new_level, student_cpf))
                
                # Update profile dict for next iteration
                profile["total_xp"] = new_xp
                profile["level"] = new_level
                
                # Broadcast level up if needed
                if new_level > old_level:
                    if device:
                        await broadcast(json.dumps({
                            "type": "event",
                            "event": "level_up",
                            "data": {
                                "device": device,
                                "student_cpf": student_cpf,
                                "old_level": old_level,
                                "new_level": new_level,
                                "total_xp": new_xp
                            }
                        }))
            
            newly_earned.append(dict(badge))
            
            # Broadcast badge event
            student = conn.execute("SELECT name FROM students WHERE cpf = ?", (student_cpf,)).fetchone()
            if device:
                await broadcast(json.dumps({
                    "type": "event",
                    "event": "badge_earned",
                    "data": {
                        "device": device,
                        "student_name": student["name"] if student else "Aluno",
                        "student_cpf": student_cpf,
                        "badge": {
                            "id": badge["id"],
                            "name": badge["name"],
                            "icon": badge["icon"],
                            "xp_reward": badge["xp_reward"]
                        }
                    }
                }))
    
    if should_close:
        conn.commit()
        conn.close()
    return newly_earned


async def award_xp(student_cpf: str, amount: int, reason: str) -> Optional[Dict[str, Any]]:
    """Award XP to student and check for level up."""
    conn = get_db()
    profile = conn.execute(
        "SELECT total_xp, level FROM student_profiles WHERE student_cpf = ?", 
        (student_cpf,)
    ).fetchone()
    
    if not profile:
        conn.close()
        return None
    
    old_level = profile["level"]
    new_xp = profile["total_xp"] + amount
    new_level = level_from_xp(new_xp)
    
    conn.execute("""
        UPDATE student_profiles SET total_xp = ?, level = ?, updated_at = datetime('now')
        WHERE student_cpf = ?
    """, (new_xp, new_level, student_cpf))
    
    # Broadcast level up event if leveled
    if new_level > old_level:
        # Find device for this student
        assignment = conn.execute(
            "SELECT device FROM bike_assignments WHERE student_cpf = ?", 
            (student_cpf,)
        ).fetchone()
        
        # Get student name for display
        student = conn.execute(
            "SELECT name FROM students WHERE cpf = ?",
            (student_cpf,)
        ).fetchone()
        
        if assignment and active_connections:
            device = assignment["device"]
            await broadcast(json.dumps({
                "type": "event",
                "event": "level_up",
                "data": {
                    "device": device,
                    "student_cpf": student_cpf,
                    "student_name": student["name"] if student else "Aluno",
                    "old_level": old_level,
                    "new_level": new_level,
                    "title": get_level_title(new_level)
                }
            }))
            
            # Check for level milestone badges BEFORE closing connection
            await check_badges(student_cpf, device, conn=conn)
    
    conn.commit()
    conn.close()
    
    return {"new_xp": new_xp, "new_level": new_level, "leveled_up": new_level > old_level}


# ──────────────────────────────────────────
# Endpoints – Gamification / Sprint
# ──────────────────────────────────────────
class SprintStart(BaseModel):
    duration: int = 60  # seconds: 30, 45, 60, or 90


class CadenceConfig(BaseModel):
    target_rpm: int = 90  # Target cadence (60-120 RPM)
    duration: int = 120   # Duration in seconds


class FTPTestConfig(BaseModel):
    duration_minutes: int = 20  # Standard is 20 minutes


def sync_sprint_to_db():
    """Sync sprint state to database."""
    conn = get_db()
    conn.execute("""
        UPDATE game_state SET
            sprint_active = ?,
            sprint_start_time = ?,
            sprint_duration = ?,
            sprint_number = ?,
            updated_at = datetime('now')
        WHERE id = 1
    """, (
        1 if sprint_state["active"] else 0,
        sprint_state["start_time"],
        sprint_state["duration"],
        sprint_state["sprint_number"]
    ))
    conn.commit()
    conn.close()


async def end_sprint():
    """End the sprint and calculate rankings."""
    if not sprint_state["active"]:
        return
    
    # Calculate rankings from power samples
    rankings = []
    for device, samples in sprint_state["power_samples"].items():
        if samples:
            avg_wkg = sum(s["wkg"] for s in samples) / len(samples)
            avg_power = sum(s["power"] for s in samples) / len(samples)
            rankings.append({
                "device": device,
                "student_name": samples[0]["student_name"],
                "student_cpf": samples[0]["student_cpf"],
                "avg_wkg": round(avg_wkg, 2),
                "avg_power": round(avg_power, 1),
                "samples_count": len(samples)
            })
    
    # Sort by avg_wkg descending
    rankings.sort(key=lambda x: x["avg_wkg"], reverse=True)
    
    # Assign positions
    for i, r in enumerate(rankings):
        r["position"] = i + 1
    
    sprint_number = sprint_state["sprint_number"]
    
    # Reset sprint state
    sprint_state["active"] = False
    sprint_state["start_time"] = None
    sprint_state["duration"] = 0
    sprint_state["power_samples"] = {}
    sprint_state["task"] = None
    
    sync_sprint_to_db()
    
    # Broadcast sprint end with rankings
    if active_connections:
        await broadcast(json.dumps({
            "type": "sprint_end",
            "sprint_number": sprint_number,
            "rankings": rankings
        }))


async def sprint_timer(duration: int):
    """Background task to auto-end sprint after duration."""
    await asyncio.sleep(duration)
    await end_sprint()


@app.post("/api/game/sprint/start")
async def start_sprint(body: SprintStart):
    """Start a sprint with configurable duration (30, 45, 60, 90 seconds)."""
    if body.duration not in [30, 45, 60, 90]:
        raise HTTPException(status_code=400, detail="Duration must be 30, 45, 60, or 90 seconds")
    
    if sprint_state["active"]:
        raise HTTPException(status_code=400, detail="Sprint already active")
    
    # Cancel any existing timer task
    if sprint_state["task"] and not sprint_state["task"].done():
        sprint_state["task"].cancel()
    
    sprint_state["active"] = True
    sprint_state["start_time"] = datetime.now().isoformat()
    sprint_state["duration"] = body.duration
    sprint_state["sprint_number"] += 1
    sprint_state["power_samples"] = {}
    sprint_state["task"] = asyncio.create_task(sprint_timer(body.duration))
    
    sync_sprint_to_db()
    
    # Broadcast sprint start
    if active_connections:
        await broadcast(json.dumps({
            "type": "sprint_start",
            "sprint_number": sprint_state["sprint_number"],
            "duration": body.duration,
            "start_time": sprint_state["start_time"]
        }))
    
    return {
        "status": "ok",
        "sprint_number": sprint_state["sprint_number"],
        "duration": body.duration,
        "start_time": sprint_state["start_time"]
    }


@app.post("/api/game/sprint/cancel")
async def cancel_sprint():
    """Cancel active sprint."""
    if not sprint_state["active"]:
        raise HTTPException(status_code=400, detail="No active sprint to cancel")
    
    # Cancel timer task
    if sprint_state["task"] and not sprint_state["task"].done():
        sprint_state["task"].cancel()
    
    sprint_number = sprint_state["sprint_number"]
    
    # Reset sprint state
    sprint_state["active"] = False
    sprint_state["start_time"] = None
    sprint_state["duration"] = 0
    sprint_state["power_samples"] = {}
    sprint_state["task"] = None
    
    sync_sprint_to_db()
    
    # Broadcast sprint cancelled
    if active_connections:
        await broadcast(json.dumps({
            "type": "sprint_cancelled",
            "sprint_number": sprint_number
        }))
    
    return {"status": "ok", "message": f"Sprint {sprint_number} cancelled"}


# ──────────────────────────────────────────
# Endpoints – Cadence Challenge
# ──────────────────────────────────────────
def sync_cadence_to_db():
    """Sync cadence challenge state to database."""
    conn = get_db()
    conn.execute("""
        UPDATE game_state SET
            cadence_challenge_active = ?,
            cadence_target = ?,
            updated_at = datetime('now')
        WHERE id = 1
    """, (
        1 if cadence_state["active"] else 0,
        cadence_state["target_rpm"]
    ))
    conn.commit()
    conn.close()


async def cadence_timer(duration: int):
    """Background task that broadcasts cadence state and auto-ends challenge."""
    start = time.time()
    while cadence_state["active"]:
        elapsed = int(time.time() - start)
        remaining = duration - elapsed
        
        if remaining <= 0:
            break
        
        # Calculate stats
        participants = cadence_state["participants"]
        total = len(participants)
        at_target = sum(1 for p in participants.values() if p["at_target"])
        completion = int((at_target / total) * 100) if total > 0 else 0
        
        # Build participants dict for broadcast
        participants_data = {
            device: {
                "at_target": p["at_target"],
                "cadence": p["current_cadence"],
                "student_name": p["student_name"]
            }
            for device, p in participants.items()
        }
        
        # Broadcast cadence state
        if active_connections:
            await broadcast(json.dumps({
                "type": "game_state",
                "state": {
                    "mode": "cadence_challenge",
                    "cadence": {
                        "active": True,
                        "target_rpm": cadence_state["target_rpm"],
                        "duration": duration,
                        "elapsed": elapsed,
                        "remaining": remaining,
                        "participants_at_target": at_target,
                        "total_participants": total,
                        "completion_percent": completion,
                        "participants": participants_data
                    }
                }
            }))
        
        await asyncio.sleep(1)
    
    # End challenge
    await end_cadence_challenge_internal()


async def end_cadence_challenge_internal():
    """Internal function to end cadence challenge and broadcast results."""
    if not cadence_state["active"]:
        return
    
    # Calculate final stats
    participants = cadence_state["participants"]
    total = len(participants)
    at_target = sum(1 for p in participants.values() if p["at_target"])
    completion = int((at_target / total) * 100) if total > 0 else 0
    
    target_rpm = cadence_state["target_rpm"]
    
    # Build final participants list
    results = [
        {
            "device": device,
            "student_name": p["student_name"],
            "at_target": p["at_target"],
            "cadence": p["current_cadence"]
        }
        for device, p in participants.items()
    ]
    
    # Reset cadence state
    cadence_state["active"] = False
    cadence_state["start_time"] = None
    cadence_state["participants"] = {}
    cadence_state["task"] = None
    
    sync_cadence_to_db()
    
    # Broadcast cadence end
    if active_connections:
        await broadcast(json.dumps({
            "type": "cadence_end",
            "target_rpm": target_rpm,
            "participants_at_target": at_target,
            "total_participants": total,
            "completion_percent": completion,
            "results": results
        }))
        
        # Also clear game_state mode
        await broadcast(json.dumps({
            "type": "game_state",
            "state": {
                "mode": "normal",
                "cadence": {"active": False}
            }
        }))


@app.post("/api/game/cadence/start")
async def start_cadence_challenge(config: CadenceConfig):
    """Start a cadence challenge with configurable target RPM and duration."""
    # Validate target_rpm (60-120 reasonable range)
    if config.target_rpm < 60 or config.target_rpm > 120:
        raise HTTPException(status_code=400, detail="Target RPM must be between 60 and 120")
    
    # Validate duration (30-300 seconds)
    if config.duration < 30 or config.duration > 300:
        raise HTTPException(status_code=400, detail="Duration must be between 30 and 300 seconds")
    
    if cadence_state["active"]:
        raise HTTPException(status_code=400, detail="Cadence challenge already active")
    
    if sprint_state["active"]:
        raise HTTPException(status_code=400, detail="Cannot start cadence challenge during sprint")
    
    # Cancel any existing timer task
    if cadence_state["task"] and not cadence_state["task"].done():
        cadence_state["task"].cancel()
    
    cadence_state["active"] = True
    cadence_state["target_rpm"] = config.target_rpm
    cadence_state["duration"] = config.duration
    cadence_state["start_time"] = datetime.now().isoformat()
    cadence_state["participants"] = {}
    cadence_state["task"] = asyncio.create_task(cadence_timer(config.duration))
    
    sync_cadence_to_db()
    
    # Broadcast cadence start
    if active_connections:
        await broadcast(json.dumps({
            "type": "cadence_start",
            "target_rpm": config.target_rpm,
            "duration": config.duration,
            "start_time": cadence_state["start_time"]
        }))
    
    return {
        "status": "ok",
        "target_rpm": config.target_rpm,
        "duration": config.duration,
        "start_time": cadence_state["start_time"]
    }


@app.post("/api/game/cadence/end")
async def end_cadence_challenge():
    """End active cadence challenge."""
    if not cadence_state["active"]:
        raise HTTPException(status_code=400, detail="No active cadence challenge to end")
    
    # Cancel timer task
    if cadence_state["task"] and not cadence_state["task"].done():
        cadence_state["task"].cancel()
    
    await end_cadence_challenge_internal()
    
    return {"status": "ok", "message": "Cadence challenge ended"}


# ──────────────────────────────────────────
# Endpoints – FTP Test
# ──────────────────────────────────────────
async def auto_end_ftp_test(duration: int):
    """Background task to auto-end FTP test after duration."""
    await asyncio.sleep(duration)
    if ftp_test_state["active"]:
        await end_ftp_test_internal()


async def end_ftp_test_internal():
    """Internal function to end FTP test and calculate results."""
    if not ftp_test_state["active"]:
        return {"status": "error", "message": "No FTP test in progress"}
    
    results = []
    conn = get_db()
    
    for device, data in ftp_test_state["participants"].items():
        if data["power_samples"]:
            avg_power = sum(data["power_samples"]) / len(data["power_samples"])
            calculated_ftp = int(avg_power * 0.95)
            
            # Update student profile with real FTP
            conn.execute("""
                UPDATE student_profiles 
                SET ftp = ?, ftp_estimated = 0, ftp_updated_at = datetime('now')
                WHERE student_cpf = ?
            """, (calculated_ftp, data["student_cpf"]))
            
            results.append({
                "device": device,
                "student_cpf": data["student_cpf"],
                "student_name": data["student_name"],
                "avg_power": round(avg_power, 1),
                "calculated_ftp": calculated_ftp,
                "samples_count": len(data["power_samples"])
            })
    
    conn.commit()
    
    # Reset game mode
    conn.execute("UPDATE game_state SET game_mode = 'normal' WHERE id = 1")
    conn.commit()
    conn.close()
    
    # Reset FTP test state
    ftp_test_state["active"] = False
    ftp_test_state["start_time"] = None
    ftp_test_state["participants"] = {}
    ftp_test_state["task"] = None
    
    # Broadcast results
    if active_connections:
        await broadcast(json.dumps({
            "type": "ftp_test_end",
            "results": results
        }))
    
    return {"status": "completed", "results": results}


@app.post("/api/game/ftp-test/start")
async def start_ftp_test(config: FTPTestConfig):
    """Start FTP test for all assigned bikes."""
    if ftp_test_state["active"]:
        raise HTTPException(status_code=400, detail="FTP test already in progress")
    
    if sprint_state["active"]:
        raise HTTPException(status_code=400, detail="Cannot start FTP test while sprint is active")
    
    # Cancel any existing task
    if ftp_test_state["task"] and not ftp_test_state["task"].done():
        ftp_test_state["task"].cancel()
    
    duration_seconds = config.duration_minutes * 60
    
    ftp_test_state["active"] = True
    ftp_test_state["start_time"] = datetime.now().isoformat()
    ftp_test_state["duration"] = duration_seconds
    ftp_test_state["participants"] = {}
    
    # Update game_state
    conn = get_db()
    conn.execute("""
        UPDATE game_state SET game_mode = 'ftp_test', updated_at = datetime('now')
        WHERE id = 1
    """)
    conn.commit()
    conn.close()
    
    # Broadcast
    if active_connections:
        await broadcast(json.dumps({
            "type": "ftp_test_start",
            "duration": duration_seconds,
            "duration_minutes": config.duration_minutes,
            "start_time": ftp_test_state["start_time"]
        }))
    
    # Schedule auto-end
    ftp_test_state["task"] = asyncio.create_task(auto_end_ftp_test(duration_seconds))
    
    return {"status": "started", "duration_minutes": config.duration_minutes}


@app.post("/api/game/ftp-test/end")
async def end_ftp_test():
    """End FTP test and calculate results."""
    if not ftp_test_state["active"]:
        raise HTTPException(status_code=400, detail="No FTP test in progress")
    
    # Cancel the auto-end task
    if ftp_test_state["task"] and not ftp_test_state["task"].done():
        ftp_test_state["task"].cancel()
    
    return await end_ftp_test_internal()


@app.get("/api/game/ftp-test/status")
async def get_ftp_test_status():
    """Get current FTP test status with participant data."""
    if not ftp_test_state["active"]:
        return {
            "active": False,
            "participants": []
        }
    
    start_time = datetime.fromisoformat(ftp_test_state["start_time"])
    elapsed = (datetime.now() - start_time).total_seconds()
    remaining = max(0, ftp_test_state["duration"] - elapsed)
    
    participants = []
    for device, data in ftp_test_state["participants"].items():
        samples = data["power_samples"]
        if samples:
            avg_power = sum(samples) / len(samples)
            current_power = samples[-1] if samples else 0
        else:
            avg_power = 0
            current_power = 0
        
        participants.append({
            "device": device,
            "student_cpf": data["student_cpf"],
            "student_name": data["student_name"],
            "current_power": current_power,
            "avg_power": round(avg_power, 1),
            "projected_ftp": int(avg_power * 0.95),
            "samples_count": len(samples)
        })
    
    return {
        "active": True,
        "duration": ftp_test_state["duration"],
        "elapsed": int(elapsed),
        "remaining": int(remaining),
        "participants": participants
    }


@app.get("/api/game/state")
async def get_game_state():
    """Get current game state including sprint status."""
    conn = get_db()
    row = conn.execute("SELECT * FROM game_state WHERE id = 1").fetchone()
    conn.close()
    
    # Merge DB state with in-memory sprint state for accuracy
    result = {
        "sprint_active": sprint_state["active"],
        "sprint_start_time": sprint_state["start_time"],
        "sprint_duration": sprint_state["duration"],
        "sprint_number": sprint_state["sprint_number"],
        "game_mode": row["game_mode"] if row else "normal",
        "team_mode": row["team_mode"] if row else None,
        "cadence_target": cadence_state["target_rpm"] if cadence_state["active"] else (row["cadence_target"] if row else None),
        "cadence_challenge_active": cadence_state["active"],
        "team_battle": None,
        "ftp_test": None,
        "cadence": None
    }
    
    # Include cadence state if active
    if cadence_state["active"]:
        start = datetime.fromisoformat(cadence_state["start_time"]) if cadence_state["start_time"] else datetime.now()
        elapsed = (datetime.now() - start).total_seconds()
        remaining = cadence_state["duration"] - elapsed
        participants = cadence_state["participants"]
        total = len(participants)
        at_target = sum(1 for p in participants.values() if p["at_target"])
        
        result["cadence"] = {
            "active": True,
            "target_rpm": cadence_state["target_rpm"],
            "duration": cadence_state["duration"],
            "elapsed": int(elapsed),
            "remaining": int(max(0, remaining)),
            "participants_at_target": at_target,
            "total_participants": total,
            "completion_percent": int((at_target / total) * 100) if total > 0 else 0
        }
    
    # Include team battle state if active
    if team_state["active"]:
        result["team_battle"] = get_team_battle_state()
    
    # Include FTP test state if active
    if ftp_test_state["active"]:
        start_time = datetime.fromisoformat(ftp_test_state["start_time"])
        elapsed = (datetime.now() - start_time).total_seconds()
        remaining = max(0, ftp_test_state["duration"] - elapsed)
        result["ftp_test"] = {
            "active": True,
            "duration": ftp_test_state["duration"],
            "elapsed": int(elapsed),
            "remaining": int(remaining)
        }
    
    return result


# ──────────────────────────────────────────
# Endpoints – Team Battle
# ──────────────────────────────────────────
def get_team_battle_state() -> dict:
    """Get current team battle state formatted for broadcast."""
    if not team_state["active"]:
        return None
    
    left = team_state["teams"]["left"]
    right = team_state["teams"]["right"]
    
    left_avg_wkg = left["total_wkg"] / left["count"] if left["count"] > 0 else 0
    right_avg_wkg = right["total_wkg"] / right["count"] if right["count"] > 0 else 0
    
    return {
        "active": True,
        "mode": team_state["mode"],
        "metric": team_state["metric"],
        "left": {
            "name": left["name"],
            "color": left["color"],
            "total_power": round(left["total_power"]),
            "avg_wkg": round(left_avg_wkg, 2),
            "participants": left["count"],
            "devices": left["devices"]
        },
        "right": {
            "name": right["name"],
            "color": right["color"],
            "total_power": round(right["total_power"]),
            "avg_wkg": round(right_avg_wkg, 2),
            "participants": right["count"],
            "devices": right["devices"]
        }
    }


def update_team_scores(device: str, power: float, wkg: float):
    """Update team scores when receiving bike data during team battle."""
    if not team_state["active"]:
        return
    
    # Find which team this device belongs to
    team = None
    if device in team_state["teams"]["left"]["devices"]:
        team = "left"
    elif device in team_state["teams"]["right"]["devices"]:
        team = "right"
    
    if not team:
        return
    
    # Store sample for averaging
    if device not in team_state["power_samples"]:
        team_state["power_samples"][device] = {"powers": [], "wkgs": []}
    
    samples = team_state["power_samples"][device]
    samples["powers"].append(power)
    samples["wkgs"].append(wkg)
    
    # Keep only last 10 samples for smoothing
    if len(samples["powers"]) > 10:
        samples["powers"] = samples["powers"][-10:]
        samples["wkgs"] = samples["wkgs"][-10:]
    
    # Recalculate team totals from all samples
    recalculate_team_totals()


def recalculate_team_totals():
    """Recalculate team totals from power samples."""
    for team_name in ["left", "right"]:
        team = team_state["teams"][team_name]
        total_power = 0
        total_wkg = 0
        active_count = 0
        
        for device in team["devices"]:
            if device in team_state["power_samples"]:
                samples = team_state["power_samples"][device]
                if samples["powers"]:
                    # Use average of recent samples
                    avg_power = sum(samples["powers"]) / len(samples["powers"])
                    avg_wkg = sum(samples["wkgs"]) / len(samples["wkgs"])
                    total_power += avg_power
                    total_wkg += avg_wkg
                    active_count += 1
        
        team["total_power"] = total_power
        team["total_wkg"] = total_wkg
        team["count"] = active_count


@app.post("/api/game/teams/start")
async def start_team_battle(config: TeamBattleConfig):
    """Start team battle - divides bikes into two teams."""
    import random
    
    if team_state["active"]:
        raise HTTPException(status_code=400, detail="Team battle already active")
    
    if config.mode not in ["left_right", "random"]:
        raise HTTPException(status_code=400, detail="Mode must be 'left_right' or 'random'")
    
    if config.metric not in ["total_power", "avg_wkg"]:
        raise HTTPException(status_code=400, detail="Metric must be 'total_power' or 'avg_wkg'")
    
    # Get all bikes with assignments (active participants)
    conn = get_db()
    rows = conn.execute("""
        SELECT b.device, ba.student_cpf
        FROM bikes b
        JOIN bike_assignments ba ON b.device = ba.device
        ORDER BY b.device
    """).fetchall()
    conn.close()
    
    if len(rows) < 2:
        raise HTTPException(status_code=400, detail="Need at least 2 assigned bikes to start team battle")
    
    devices = [r["device"] for r in rows]
    
    # Divide into teams
    if config.mode == "left_right":
        # Split by device name order (first half left, second half right)
        mid = len(devices) // 2
        left_devices = devices[:mid]
        right_devices = devices[mid:]
    else:  # random
        shuffled = devices.copy()
        random.shuffle(shuffled)
        mid = len(shuffled) // 2
        left_devices = shuffled[:mid]
        right_devices = shuffled[mid:]
    
    # Initialize team state
    team_state["active"] = True
    team_state["mode"] = config.mode
    team_state["metric"] = config.metric
    team_state["teams"]["left"]["devices"] = left_devices
    team_state["teams"]["left"]["total_power"] = 0
    team_state["teams"]["left"]["total_wkg"] = 0
    team_state["teams"]["left"]["count"] = len(left_devices)
    team_state["teams"]["right"]["devices"] = right_devices
    team_state["teams"]["right"]["total_power"] = 0
    team_state["teams"]["right"]["total_wkg"] = 0
    team_state["teams"]["right"]["count"] = len(right_devices)
    team_state["power_samples"] = {}
    
    # Update DB
    conn = get_db()
    conn.execute("UPDATE game_state SET team_mode = ?, game_mode = 'team_battle', updated_at = datetime('now') WHERE id = 1",
                 (config.mode,))
    conn.commit()
    conn.close()
    
    # Broadcast team battle start
    if active_connections:
        await broadcast(json.dumps({
            "type": "game_state",
            "state": {
                "mode": "team_battle",
                "team_battle": get_team_battle_state()
            }
        }))
    
    return {
        "status": "ok",
        "message": "Team battle started",
        "teams": get_team_battle_state()
    }


@app.post("/api/game/teams/end")
async def end_team_battle():
    """End team battle and show results."""
    if not team_state["active"]:
        raise HTTPException(status_code=400, detail="No active team battle")
    
    # Calculate final results
    final_state = get_team_battle_state()
    
    # Determine winner based on metric
    metric = team_state["metric"]
    left = final_state["left"]
    right = final_state["right"]
    
    if metric == "total_power":
        winner = "left" if left["total_power"] > right["total_power"] else "right" if right["total_power"] > left["total_power"] else "tie"
    else:  # avg_wkg
        winner = "left" if left["avg_wkg"] > right["avg_wkg"] else "right" if right["avg_wkg"] > left["avg_wkg"] else "tie"
    
    # Reset team state
    team_state["active"] = False
    team_state["mode"] = None
    team_state["metric"] = "total_power"
    team_state["teams"]["left"]["devices"] = []
    team_state["teams"]["left"]["total_power"] = 0
    team_state["teams"]["left"]["total_wkg"] = 0
    team_state["teams"]["left"]["count"] = 0
    team_state["teams"]["right"]["devices"] = []
    team_state["teams"]["right"]["total_power"] = 0
    team_state["teams"]["right"]["total_wkg"] = 0
    team_state["teams"]["right"]["count"] = 0
    team_state["power_samples"] = {}
    
    # Update DB
    conn = get_db()
    conn.execute("UPDATE game_state SET team_mode = NULL, game_mode = 'normal', updated_at = datetime('now') WHERE id = 1")
    conn.commit()
    conn.close()
    
    # Broadcast team battle end with results
    if active_connections:
        await broadcast(json.dumps({
            "type": "team_battle_end",
            "winner": winner,
            "results": final_state
        }))
        # Also send game state reset
        await broadcast(json.dumps({
            "type": "game_state",
            "state": {
                "mode": "normal",
                "team_battle": None
            }
        }))
    
    return {
        "status": "ok",
        "message": "Team battle ended",
        "winner": winner,
        "results": final_state
    }


@app.get("/api/game/teams/state")
async def get_team_battle_status():
    """Get current team battle state."""
    return {
        "active": team_state["active"],
        "teams": get_team_battle_state()
    }


# ──────────────────────────────────────────
# Endpoints – Class Session Management
# ──────────────────────────────────────────
@app.post("/api/class/start")
async def start_class(config: ClassConfig):
    """Start a new class session."""
    if class_session_state["active"]:
        raise HTTPException(status_code=400, detail="Uma aula já está em andamento")
    
    session_id = str(uuid.uuid4())
    started_at = datetime.now().isoformat()
    
    conn = get_db()
    conn.execute("""
        INSERT INTO class_sessions (id, started_at, instructor_name, class_type, is_active)
        VALUES (?, ?, ?, ?, 1)
    """, (session_id, started_at, config.instructor_name, config.class_type))
    
    # Update game_state with current session
    conn.execute("UPDATE game_state SET current_session_id = ? WHERE id = 1", (session_id,))
    conn.commit()
    conn.close()
    
    # Initialize in-memory state
    class_session_state["active"] = True
    class_session_state["session_id"] = session_id
    class_session_state["started_at"] = started_at
    class_session_state["instructor_name"] = config.instructor_name
    class_session_state["class_type"] = config.class_type
    class_session_state["participants"] = {}
    
    # Broadcast class start
    if active_connections:
        await broadcast(json.dumps({
            "type": "class_start",
            "session_id": session_id,
            "started_at": started_at,
            "instructor_name": config.instructor_name,
            "class_type": config.class_type
        }))
    
    return {
        "session_id": session_id,
        "status": "started",
        "started_at": started_at,
        "instructor_name": config.instructor_name,
        "class_type": config.class_type
    }


def calculate_xp_for_class(participation: dict, duration_minutes: int) -> int:
    """Calculate XP earned for class participation."""
    xp = 0
    
    # Base XP for participation (10 XP per 5 minutes, up to 60 XP)
    xp += min(60, (duration_minutes // 5) * 10)
    
    # XP for distance (5 XP per km, up to 50 XP)
    distance_km = participation.get("total_distance_m", 0) / 1000
    xp += min(50, int(distance_km * 5))
    
    # XP for high intensity zones (Z4-Z6)
    zone_time = participation.get("zone_time", {})
    high_intensity_time = zone_time.get(4, 0) + zone_time.get(5, 0) + zone_time.get(6, 0)
    # 1 XP per 30 seconds in high intensity, up to 40 XP
    xp += min(40, high_intensity_time // 30)
    
    return xp


@app.post("/api/class/end")
async def end_class():
    """End current class session and save all metrics."""
    if not class_session_state["active"]:
        raise HTTPException(status_code=400, detail="Nenhuma aula em andamento")
    
    session_id = class_session_state["session_id"]
    ended_at = datetime.now().isoformat()
    
    # Calculate duration
    started_at = datetime.fromisoformat(class_session_state["started_at"])
    duration_seconds = int((datetime.now() - started_at).total_seconds())
    duration_minutes = duration_seconds // 60
    
    conn = get_db()
    
    # Save each participant's data
    participants_summary = []
    for device, data in class_session_state["participants"].items():
        student_cpf = data["student_cpf"]
        student_name = data["student_name"]
        
        # Calculate averages
        power_samples = data.get("power_samples", [])
        cadence_samples = data.get("cadence_samples", [])
        speed_samples = data.get("speed_samples", [])
        
        avg_power = sum(power_samples) / len(power_samples) if power_samples else 0
        avg_cadence = sum(cadence_samples) / len(cadence_samples) if cadence_samples else 0
        avg_speed = sum(speed_samples) / len(speed_samples) if speed_samples else 0
        
        # Get current distance from DB
        bike_row = conn.execute("SELECT total_distance FROM bikes WHERE device = ?", (device,)).fetchone()
        current_distance = bike_row["total_distance"] if bike_row else 0
        total_distance_m = current_distance - data.get("distance_start", 0)
        
        zone_time = data.get("zone_time", {})
        
        participation_data = {
            "avg_power": avg_power,
            "max_power": data.get("max_power", 0),
            "avg_cadence": avg_cadence,
            "max_cadence": data.get("max_cadence", 0),
            "avg_speed": avg_speed,
            "max_speed": data.get("max_speed", 0),
            "total_distance_m": total_distance_m,
            "zone_time": zone_time
        }
        
        # Calculate XP
        xp_earned = calculate_xp_for_class(participation_data, duration_minutes)
        
        # Insert class participation record
        conn.execute("""
            INSERT OR REPLACE INTO class_participation 
            (class_session_id, student_cpf, device, avg_power, max_power, avg_cadence, max_cadence,
             avg_speed, max_speed, total_distance_m, duration_seconds,
             time_z1, time_z2, time_z3, time_z4, time_z5, time_z6, xp_earned)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            session_id, student_cpf, device,
            round(avg_power, 1), data.get("max_power", 0),
            round(avg_cadence, 1), data.get("max_cadence", 0),
            round(avg_speed, 1), data.get("max_speed", 0),
            round(total_distance_m, 1), duration_seconds,
            zone_time.get(1, 0), zone_time.get(2, 0), zone_time.get(3, 0),
            zone_time.get(4, 0), zone_time.get(5, 0), zone_time.get(6, 0),
            xp_earned
        ))
        
        # Update student_profiles with accumulated stats
        conn.execute("""
            UPDATE student_profiles SET
                total_xp = total_xp + ?,
                total_classes = total_classes + 1,
                total_distance_km = total_distance_km + ?,
                total_time_minutes = total_time_minutes + ?
            WHERE student_cpf = ?
        """, (xp_earned, total_distance_m / 1000, duration_minutes, student_cpf))
        
        # Recalculate level based on new XP
        profile_row = conn.execute("SELECT total_xp FROM student_profiles WHERE student_cpf = ?", (student_cpf,)).fetchone()
        if profile_row:
            new_total_xp = profile_row["total_xp"]
            # Level formula: level = 1 + (total_xp / 500), with minimum of 1
            new_level = max(1, 1 + new_total_xp // 500)
            conn.execute("UPDATE student_profiles SET level = ? WHERE student_cpf = ?", (new_level, student_cpf))
        
        participants_summary.append({
            "student_cpf": student_cpf,
            "student_name": student_name,
            "device": device,
            "avg_power": round(avg_power, 1),
            "max_power": data.get("max_power", 0),
            "avg_cadence": round(avg_cadence, 1),
            "total_distance_km": round(total_distance_m / 1000, 2),
            "duration_minutes": duration_minutes,
            "xp_earned": xp_earned,
            "zone_time": zone_time
        })
    
    # Update class session record
    total_participants = len(class_session_state["participants"])
    conn.execute("""
        UPDATE class_sessions SET
            ended_at = ?,
            total_participants = ?,
            is_active = 0
        WHERE id = ?
    """, (ended_at, total_participants, session_id))
    
    # Clear current session from game_state
    conn.execute("UPDATE game_state SET current_session_id = NULL WHERE id = 1")
    
    # Check badges for all participants BEFORE committing/closing (reuse connection)
    for device, data in class_session_state["participants"].items():
        student_cpf = data["student_cpf"]
        await check_badges(student_cpf, device, session_id, conn=conn)
    
    conn.commit()
    conn.close()
    
    # Build class summary
    class_summary = {
        "session_id": session_id,
        "started_at": class_session_state["started_at"],
        "ended_at": ended_at,
        "duration_minutes": duration_minutes,
        "instructor_name": class_session_state["instructor_name"],
        "class_type": class_session_state["class_type"],
        "total_participants": total_participants,
        "participants": participants_summary
    }
    
    # Reset in-memory state
    class_session_state["active"] = False
    class_session_state["session_id"] = None
    class_session_state["started_at"] = None
    class_session_state["instructor_name"] = None
    class_session_state["class_type"] = "regular"
    class_session_state["participants"] = {}
    
    # Broadcast class end with session_id to trigger summary screen
    if active_connections:
        await broadcast(json.dumps({
            "type": "event",
            "event": "class_ended",
            "data": {"session_id": session_id}
        }))
    
    return {"status": "ended", "session_id": session_id}


@app.get("/api/class/current")
async def get_current_class():
    """Get current class session info."""
    if not class_session_state["active"]:
        return {"active": False}
    
    # Calculate current duration
    started_at = datetime.fromisoformat(class_session_state["started_at"])
    duration_seconds = int((datetime.now() - started_at).total_seconds())
    
    # Build participant list with current stats
    participants = []
    for device, data in class_session_state["participants"].items():
        power_samples = data.get("power_samples", [])
        avg_power = sum(power_samples) / len(power_samples) if power_samples else 0
        participants.append({
            "device": device,
            "student_cpf": data["student_cpf"],
            "student_name": data["student_name"],
            "avg_power": round(avg_power, 1),
            "max_power": data.get("max_power", 0),
            "samples_count": len(power_samples)
        })
    
    return {
        "active": True,
        "session_id": class_session_state["session_id"],
        "started_at": class_session_state["started_at"],
        "duration_seconds": duration_seconds,
        "duration_formatted": f"{duration_seconds // 60}:{duration_seconds % 60:02d}",
        "instructor_name": class_session_state["instructor_name"],
        "class_type": class_session_state["class_type"],
        "participants_count": len(class_session_state["participants"]),
        "participants": participants
    }


@app.get("/api/class/{session_id}/summary")
async def get_class_summary(session_id: str):
    """Get comprehensive class summary"""
    conn = get_db()
    
    # Get class info
    session = conn.execute("""
        SELECT * FROM class_sessions WHERE id = ?
    """, (session_id,)).fetchone()
    
    if not session:
        raise HTTPException(404, "Class session not found")
    
    # Get all participants with their stats
    participants = conn.execute("""
        SELECT 
            cp.*,
            s.name as student_name,
            sp.level as student_level
        FROM class_participation cp
        JOIN students s ON cp.student_cpf = s.cpf
        LEFT JOIN student_profiles sp ON cp.student_cpf = sp.student_cpf
        WHERE cp.class_session_id = ?
        ORDER BY cp.xp_earned DESC
    """, (session_id,)).fetchall()
    
    # Get badges earned during this class
    badges_earned = conn.execute("""
        SELECT 
            sb.student_cpf,
            s.name as student_name,
            b.name as badge_name,
            b.icon as badge_icon
        FROM student_badges sb
        JOIN students s ON sb.student_cpf = s.cpf
        JOIN badges b ON sb.badge_id = b.id
        WHERE sb.class_session_id = ?
    """, (session_id,)).fetchall()
    
    # Get personal records broken during class
    # (Would need to track this - for now return empty)
    records = []
    
    # Calculate class statistics
    if participants:
        total_distance = sum(p["total_distance_m"] for p in participants) / 1000  # km
        avg_power = sum(p["avg_power"] for p in participants) / len(participants)
        max_power = max(p["max_power"] for p in participants)
        total_xp = sum(p["xp_earned"] for p in participants)
    else:
        total_distance = avg_power = max_power = total_xp = 0
    
    conn.close()
    
    return {
        "session": dict(session),
        "participants": [dict(p) for p in participants],
        "badges_earned": [dict(b) for b in badges_earned],
        "records_broken": records,
        "stats": {
            "total_participants": len(participants),
            "total_distance_km": round(total_distance, 2),
            "avg_power": round(avg_power, 1),
            "max_power": round(max_power, 1),
            "total_xp_earned": total_xp
        }
    }


@app.get("/api/students/{cpf}/history")
async def get_student_history(cpf: str, limit: int = 10):
    """Get class history for a student."""
    conn = get_db()
    
    # Verify student exists
    student = conn.execute("SELECT * FROM students WHERE cpf = ?", (cpf,)).fetchone()
    if not student:
        conn.close()
        raise HTTPException(status_code=404, detail="Aluno não encontrado")
    
    history = conn.execute("""
        SELECT 
            cs.id as session_id,
            cs.started_at,
            cs.ended_at,
            cs.instructor_name,
            cs.class_type,
            cs.total_participants,
            cp.device,
            cp.avg_power,
            cp.max_power,
            cp.avg_cadence,
            cp.max_cadence,
            cp.avg_speed,
            cp.max_speed,
            cp.total_distance_m,
            cp.duration_seconds,
            cp.time_z1,
            cp.time_z2,
            cp.time_z3,
            cp.time_z4,
            cp.time_z5,
            cp.time_z6,
            cp.xp_earned
        FROM class_participation cp
        JOIN class_sessions cs ON cp.class_session_id = cs.id
        WHERE cp.student_cpf = ?
        ORDER BY cs.started_at DESC
        LIMIT ?
    """, (cpf, limit)).fetchall()
    
    # Get student profile for summary
    profile = conn.execute("SELECT * FROM student_profiles WHERE student_cpf = ?", (cpf,)).fetchone()
    conn.close()
    
    result = {
        "student": dict(student),
        "profile": dict(profile) if profile else None,
        "classes": [dict(h) for h in history]
    }
    
    return result


@app.get("/api/class/history")
async def get_class_history(limit: int = 20):
    """Get recent class sessions history."""
    conn = get_db()
    
    sessions = conn.execute("""
        SELECT * FROM class_sessions
        WHERE is_active = 0
        ORDER BY started_at DESC
        LIMIT ?
    """, (limit,)).fetchall()
    
    conn.close()
    
    return {"sessions": [dict(s) for s in sessions]}


@app.get("/api/class/{session_id}")
async def get_class_details(session_id: str):
    """Get detailed information about a specific class session."""
    conn = get_db()
    
    session = conn.execute("SELECT * FROM class_sessions WHERE id = ?", (session_id,)).fetchone()
    if not session:
        conn.close()
        raise HTTPException(status_code=404, detail="Sessão não encontrada")
    
    participants = conn.execute("""
        SELECT cp.*, s.name as student_name
        FROM class_participation cp
        JOIN students s ON cp.student_cpf = s.cpf
        WHERE cp.class_session_id = ?
        ORDER BY cp.avg_power DESC
    """, (session_id,)).fetchall()
    
    conn.close()
    
    return {
        "session": dict(session),
        "participants": [dict(p) for p in participants]
    }
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    active_connections.append(websocket)

    # Envia dados iniciais + vínculos
    bikes = get_all_bikes_from_db()
    assignments = await _get_assignments_dict()

    await websocket.send_text(json.dumps({
        "type": "initial",
        "bikes": bikes,
        "assignments": assignments,
    }))

    try:
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text(json.dumps({"type": "pong"}))
    except WebSocketDisconnect:
        active_connections.remove(websocket)
        print(f"Cliente desconectado. Conexões ativas: {len(active_connections)}")


async def broadcast(message: str):
    disconnected = []
    for connection in active_connections:
        try:
            await connection.send_text(message)
        except:
            disconnected.append(connection)
    for connection in disconnected:
        active_connections.remove(connection)


@app.get("/")
async def root():
    bikes = get_all_bikes_from_db()
    return {
        "app": "Bike Dashboard API",
        "status": "running",
        "active_bikes": len(bikes),
        "active_connections": len(active_connections),
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
