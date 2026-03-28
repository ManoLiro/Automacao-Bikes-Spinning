from typing import Optional, Dict, Any, Tuple
from dataclasses import dataclass

# ──────────────────────────────────────────
# XP Rewards Configuration
# ──────────────────────────────────────────
XP_REWARDS = {
    "class_complete": 100,
    "km_pedaled": 10,       # per km
    "minute_in_z4_plus": 5, # per minute in Z4, Z5, Z6
    "cadence_target_hit": 25,
    "sprint_participation": 50,
    "sprint_win": 100,
    "personal_record": 200,
}

# Level thresholds and titles
LEVEL_TITLES: Dict[Tuple[int, int], str] = {
    (1, 5): "Iniciante",
    (6, 10): "Regular",
    (11, 20): "Dedicado",
    (21, 30): "Atleta",
    (31, 40): "Elite",
    (41, 50): "Lenda",
}


def xp_for_level(level: int) -> int:
    """XP needed to reach a level (cumulative threshold)."""
    if level <= 1:
        return 0
    if level <= 5:
        return (level - 1) * 100
    if level <= 10:
        return 400 + (level - 5) * 300
    if level <= 20:
        return 1900 + (level - 10) * 300
    if level <= 30:
        return 4900 + (level - 20) * 500
    if level <= 40:
        return 9900 + (level - 30) * 1000
    return 19900 + (level - 40) * 2000


def level_from_xp(total_xp: int) -> int:
    """Calculate level from total XP."""
    level = 1
    while level < 50 and total_xp >= xp_for_level(level + 1):
        level += 1
    return level


def get_level_title(level: int) -> str:
    """Get title for level."""
    for (min_lvl, max_lvl), title in LEVEL_TITLES.items():
        if min_lvl <= level <= max_lvl:
            return title
    return "Lenda"


def calculate_xp_progress(total_xp: int) -> Dict[str, Any]:
    """Calculate XP progress for display."""
    level = level_from_xp(total_xp)
    current_level_xp = xp_for_level(level)
    next_level_xp = xp_for_level(level + 1) if level < 50 else total_xp
    
    xp_in_level = total_xp - current_level_xp
    xp_for_next = next_level_xp - current_level_xp
    
    if xp_for_next > 0:
        progress = xp_in_level / xp_for_next
    else:
        progress = 1.0
    
    return {
        "level": level,
        "title": get_level_title(level),
        "total_xp": total_xp,
        "xp_in_level": xp_in_level,
        "xp_for_next": xp_for_next,
        "progress": round(progress, 2)
    }


# ──────────────────────────────────────────
# Power Zones Configuration
# ──────────────────────────────────────────
POWER_ZONES = {
    1: {"name": "Recuperação", "min": 0, "max": 55, "color": "#6B7280"},
    2: {"name": "Endurance", "min": 56, "max": 75, "color": "#3B82F6"},
    3: {"name": "Tempo", "min": 76, "max": 90, "color": "#22C55E"},
    4: {"name": "Threshold", "min": 91, "max": 105, "color": "#EAB308"},
    5: {"name": "VO2max", "min": 106, "max": 120, "color": "#F97316"},
    6: {"name": "Anaeróbico", "min": 121, "max": 999, "color": "#EF4444"},
}

def calculate_wkg(power: float, weight_kg: float) -> float:
    if weight_kg <= 0:
        return 0.0
    return round(power / weight_kg, 2)

def estimate_ftp_from_weight(weight_kg: float) -> int:
    return int(weight_kg * 2.5)

def get_power_zone(power: float, ftp: int) -> Dict[str, Any]:
    if ftp <= 0:
        return {"zone": 1, "ftp_percent": 0, **POWER_ZONES[1]}
    ftp_percent = (power / ftp) * 100
    for zone_num, zone_info in POWER_ZONES.items():
        if zone_info["min"] <= ftp_percent <= zone_info["max"]:
            return {"zone": zone_num, "ftp_percent": round(ftp_percent, 1), **zone_info}
    return {"zone": 6, "ftp_percent": round(ftp_percent, 1), **POWER_ZONES[6]}

@dataclass
class GamificationData:
    current_wkg: float
    current_zone: int
    zone_name: str
    zone_color: str
    ftp_percent: float
    ftp: int
    ftp_is_estimated: bool

def calculate_gamification_metrics(instant_power: float, weight_kg: float, ftp: Optional[int] = None) -> GamificationData:
    current_wkg = calculate_wkg(instant_power, weight_kg)
    ftp_is_estimated = ftp is None
    effective_ftp = ftp if ftp else estimate_ftp_from_weight(weight_kg)
    zone_info = get_power_zone(instant_power, effective_ftp)
    return GamificationData(
        current_wkg=current_wkg,
        current_zone=zone_info["zone"],
        zone_name=zone_info["name"],
        zone_color=zone_info["color"],
        ftp_percent=zone_info.get("ftp_percent", 0),
        ftp=effective_ftp,
        ftp_is_estimated=ftp_is_estimated
    )


def calculate_xp_for_class(participation_data: Dict[str, Any], duration_minutes: int) -> int:
    """
    Calculate XP earned for a class session based on performance.
    
    Args:
        participation_data: Dict containing class metrics (avg_power, total_distance_m, zone_time, etc.)
        duration_minutes: Class duration in minutes
    
    Returns:
        Total XP earned
    """
    xp = 0
    
    # Base XP for completing class
    xp += XP_REWARDS["class_complete"]
    
    # XP for distance (10 XP per km)
    total_distance_km = participation_data.get("total_distance_m", 0) / 1000
    xp += int(total_distance_km * XP_REWARDS["km_pedaled"])
    
    # XP for time in high zones (Z4, Z5, Z6)
    zone_time = participation_data.get("zone_time", {})
    time_z4_plus = zone_time.get(4, 0) + zone_time.get(5, 0) + zone_time.get(6, 0)
    minutes_z4_plus = time_z4_plus // 60
    xp += int(minutes_z4_plus * XP_REWARDS["minute_in_z4_plus"])
    
    return xp
