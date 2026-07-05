import re
import datetime
from sqlalchemy.orm import Session
from app.core.config import settings
from app.models.models import Machine, Alert, MaintenanceTask, InventoryItem
from app.services.ml_pipeline import run_inference, MACHINE_PROFILES

# Optional external LLM clients
gemini_client = None
if settings.GEMINI_API_KEY:
    try:
        import google.generativeai as genai
        genai.configure(api_key=settings.GEMINI_API_KEY)
        gemini_client = genai.GenerativeModel('gemini-1.5-flash')
    except Exception as e:
        print(f"Failed to load Google Generative AI SDK: {e}")

openai_client = None
if settings.OPENAI_API_KEY:
    try:
        from openai import OpenAI
        openai_client = OpenAI(api_key=settings.OPENAI_API_KEY)
    except Exception as e:
        print(f"Failed to load OpenAI SDK: {e}")

def get_chat_response(query: str, db: Session) -> str:
    """
    Intelligent Local RAG chat handler.
    Analyzes query keywords, matches context against active machines, sensor readings,
    alarms, and inventory levels, and formats an analytical response.
    If external API Keys are present, routes through LLM with matched context as prompt.
    """
    query_lower = query.lower()
    
    # 1. Fetch entire system state for context matching
    machines = db.query(Machine).all()
    active_alerts = db.query(Alert).filter(Alert.acknowledged == False).all()
    pending_tasks = db.query(MaintenanceTask).filter(MaintenanceTask.status.in_(["scheduled", "in_progress"])).all()
    low_stock_items = db.query(InventoryItem).filter(InventoryItem.stock_level < InventoryItem.minimum_stock).all()
    
    # 2. Try to identify which machine the user is talking about
    matched_machine = None
    for m in machines:
        # Match name or type
        name_parts = re.split(r'\s+|-', m.name.lower())
        # Check if the query contains the machine name, or ID
        if m.name.lower() in query_lower or f"machine {m.id}" in query_lower or f"id {m.id}" in query_lower:
            matched_machine = m
            break
        # Check if query matches specific keywords like CNC, Pump, or Robotic Arm
        elif m.type in query_lower and m.name.lower() in query_lower:
            matched_machine = m
            break
            
    # If no exact match but a machine ID was explicitly requested (e.g., "Machine 3")
    if not matched_machine:
        id_match = re.search(r'machine\s*(\d+)', query_lower)
        if id_match:
            m_id = int(id_match.group(1))
            matched_machine = db.query(Machine).filter(Machine.id == m_id).first()

    # 3. Compile context text
    context_parts = []
    
    # Add matched machine details
    if matched_machine:
        recent_reading = matched_machine.sensor_readings[-1] if matched_machine.sensor_readings else None
        m_alerts = [a for a in active_alerts if a.machine_id == matched_machine.id]
        m_tasks = [t for t in pending_tasks if t.machine_id == matched_machine.id]
        
        m_context = (
            f"MACHINE CONTEXT:\n"
            f"- Name: {matched_machine.name} (ID: {matched_machine.id})\n"
            f"- Type: {matched_machine.type}\n"
            f"- Status: {matched_machine.status.upper()}\n"
            f"- Health Score: {matched_machine.health_score}%\n"
            f"- OEE: {matched_machine.oee}%\n"
            f"- Remaining Useful Life (RUL): {matched_machine.rul_hours} operating hours\n"
        )
        
        if recent_reading:
            m_context += (
                f"- Telemetry Sensors: Temp={recent_reading.temperature}°C, Pressure={recent_reading.pressure}bar, "
                f"RPM={recent_reading.rpm}, Vibration={recent_reading.vibration}mm/s, "
                f"Current={recent_reading.current}A, Voltage={recent_reading.voltage}V, "
                f"Humidity={recent_reading.humidity}%\n"
                f"- Failure Probability: {round(recent_reading.failure_probability * 100, 2)}%\n"
                f"- Anomaly Label: {'Anomaly Present' if recent_reading.anomaly_label else 'Normal'}\n"
                f"- Anomaly Reason: {recent_reading.anomaly_reason or 'None'}\n"
            )
            
        if m_alerts:
            m_context += f"- Active Alerts: {'; '.join([a.message for a in m_alerts])}\n"
        if m_tasks:
            m_context += f"- Scheduled Tasks: {'; '.join([f'{t.title} assigned to {t.assigned_engineer} status {t.status}' for t in m_tasks])}\n"
            
        context_parts.append(m_context)
    else:
        # Generic factory context
        fac_context = (
            f"FACTORY CONTEXT:\n"
            f"- Total Machines: {len(machines)}\n"
            f"- Healthy Machines: {len([m for m in machines if m.status == 'healthy'])}\n"
            f"- Warning/Critical Machines: {len([m for m in machines if m.status in ['warning', 'critical']])}\n"
            f"- Critical Alerts: {len(active_alerts)}\n"
            f"- Scheduled Tasks: {len(pending_tasks)}\n"
            f"- Low Stock Parts: {', '.join([item.name for item in low_stock_items]) if low_stock_items else 'None'}\n"
        )
        context_parts.append(fac_context)
        
    full_context = "\n".join(context_parts)

    # 4. Route to LLM if keys are available, otherwise use local rule-based system
    if gemini_client:
        prompt = (
            f"You are the Predictive Maintenance Intelligent Agent. An industry-grade assistant "
            f"for smart manufacturing operators and engineers. Keep answers professional, concise, "
            f"and safety-focused.\n\n"
            f"Use this live Factory Context:\n{full_context}\n\n"
            f"User Question: {query}\n\n"
            f"Answer:"
        )
        try:
            response = gemini_client.generate_content(prompt)
            return response.text.strip()
        except Exception as e:
            print(f"Gemini API execution error: {e}. Falling back to local reasoning.")

    if openai_client:
        prompt = (
            f"You are the Predictive Maintenance Intelligent Agent. An industry-grade assistant "
            f"for smart manufacturing operators and engineers. Keep answers professional, concise, "
            f"and safety-focused.\n\n"
            f"Use this live Factory Context:\n{full_context}\n\n"
            f"User Question: {query}"
        )
        try:
            response = openai_client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[{"role": "user", "content": prompt}],
                max_tokens=250,
                temperature=0.3
            )
            return response.choices[0].message.content.strip()
        except Exception as e:
            print(f"OpenAI API execution error: {e}. Falling back to local reasoning.")

    # 5. Local Rule-Based Reasoning Engine (Smart Backup)
    return run_local_reasoning(query_lower, matched_machine, active_alerts, pending_tasks, low_stock_items)

def run_local_reasoning(query: str, machine: Machine, active_alerts: list, pending_tasks: list, low_stock_items: list) -> str:
    """Local NLP parsing & response synthesis."""
    
    # Question matching rules
    is_why = "why" in query or "reason" in query or "failing" in query or "risk" in query
    is_maint = "maintenance" in query or "recommend" in query or "schedule" in query or "task" in query or "engineer" in query
    is_urgent = "urgent" in query or "critical" in query or "attention" in query or "alert" in query
    is_inventory = "inventory" in query or "parts" in query or "stock" in query or "item" in query
    is_explain = "explain" in query or "anomaly" in query

    # Context: A specific machine was matched
    if machine:
        recent_reading = machine.sensor_readings[-1] if machine.sensor_readings else None
        
        if is_why:
            if machine.status == "healthy":
                return (
                    f"**{machine.name}** is currently operating within healthy parameters. "
                    f"Health score: **{machine.health_score}%**. Remaining Useful Life (RUL) is estimated at "
                    f"**{machine.rul_hours} operating hours**. There are no anomalies detected in the sensor streams."
                )
            
            # Machine is in warning or critical status
            reason_str = "normal conditions"
            if recent_reading and recent_reading.anomaly_reason:
                reason_str = recent_reading.anomaly_reason
            
            reco = ""
            if machine.type == "cnc":
                reco = "Recommended action: Verify spindle vibration thresholds, lubricate ball screw shaft, and check tool holder clamp force."
            elif machine.type == "robotic_arm":
                reco = "Recommended action: Run backlash joint test, inspect wiring harness for voltage drop, and grease actuator joints."
            else:
                reco = "Recommended action: Check hydraulic pressure line connections, examine pump filter screens for metal debris, and inspect casing seals."
                
            return (
                f"**{machine.name}** is in **{machine.status.upper()}** status due to: **{reason_str}**. "
                f"Its health score is currently **{machine.health_score}%**, with a failure probability of "
                f"**{round((recent_reading.failure_probability if recent_reading else 0.5) * 100, 1)}%**. "
                f"The estimated Remaining Useful Life (RUL) has decreased to **{machine.rul_hours} operating hours**. "
                f"{reco}"
            )
            
        elif is_maint:
            tasks = [t for t in pending_tasks if t.machine_id == machine.id]
            if tasks:
                t = tasks[0]
                return (
                    f"Maintenance is already scheduled for **{machine.name}**:\n"
                    f"- **Task**: {t.title}\n"
                    f"- **Priority**: {t.priority.upper()}\n"
                    f"- **Technician**: {t.assigned_engineer}\n"
                    f"- **Downtime**: {t.estimated_downtime_hours} hours\n"
                    f"- **Scheduled Date**: {t.scheduled_date.strftime('%Y-%m-%d %H:%M')}\n"
                    f"- **Status**: {t.status.upper()}"
                )
            else:
                return (
                    f"No active maintenance tasks are scheduled for **{machine.name}**. "
                    f"However, since its status is **{machine.status.upper()}**, it is highly recommended to "
                    f"schedule a technician to perform diagnostics. Predictive RUL: **{machine.rul_hours} hrs**."
                )
                
        elif is_explain:
            if recent_reading and recent_reading.anomaly_label:
                return (
                    f"**Anomaly Explanation for {machine.name}:**\n"
                    f"The AI Isolation Forest flagged a pattern: **{recent_reading.anomaly_reason}**.\n"
                    f"Sensor telemetry values at anomaly event:\n"
                    f"- Temperature: {recent_reading.temperature}°C (Typical range: {MACHINE_PROFILES[machine.type]['temp_range']})\n"
                    f"- Vibration: {recent_reading.vibration} mm/s (Typical range: {MACHINE_PROFILES[machine.type]['vib_range']})\n"
                    f"- Current: {recent_reading.current} A\n"
                    f"This correlation deviates from standard operating behaviors, suggesting localized mechanical friction or electrical loading."
                )
            else:
                return f"No active anomalies detected on **{machine.name}**. Sensor measurements match typical profiles."
                
        # Default machine query handler
        return (
            f"Status report for **{machine.name}**:\n"
            f"- Health Score: **{machine.health_score}%** ({machine.status.upper()})\n"
            f"- OEE: **{machine.oee}%**\n"
            f"- Estimated RUL: **{machine.rul_hours} hours**\n"
            f"- Latest Temperature: {recent_reading.temperature if recent_reading else 'N/A'}°C\n"
            f"- Latest Vibration: {recent_reading.vibration if recent_reading else 'N/A'} mm/s\n"
            f"How can I assist you further with this machine?"
        )

    # General / Factory-wide queries
    if is_urgent:
        unacknowledged = [a for a in active_alerts if not a.acknowledged]
        if not unacknowledged:
            return "All operations are currently running within limits. There are no active unacknowledged critical alerts."
        
        lines = ["The following machines require immediate attention:"]
        for alert in unacknowledged[:5]:
            lines.append(f"- **{alert.machine.name}** (Severity: {alert.severity.upper()}): {alert.message}")
        return "\n".join(lines)
        
    elif is_maint:
        if not pending_tasks:
            return "No maintenance tasks are currently scheduled for today."
        lines = ["Upcoming scheduled maintenance tasks:"]
        for task in pending_tasks[:5]:
            lines.append(f"- **{task.machine.name}**: {task.title} (Tech: {task.assigned_engineer}, Date: {task.scheduled_date.strftime('%Y-%m-%d')})")
        return "\n".join(lines)
        
    elif is_inventory:
        if not low_stock_items:
            return "Spare-parts inventory is fully stocked. All critical components are above minimum safety thresholds."
        lines = ["**Critical Spare-parts Restocking Required:**"]
        for item in low_stock_items:
            lines.append(f"- **{item.name}** ({item.part_number}): Stock at **{item.stock_level}** (Min threshold: {item.minimum_stock}). Lead time: {item.lead_time_days} days. Cost: ${item.unit_cost}")
        return "\n".join(lines)
        
    # Standard greeting / generic prompt
    return (
        "Hello! I am your AI Predictive Maintenance Chat Assistant. I can help you monitor plant health, "
        "analyze machine anomalies, review scheduled maintenance, and check parts inventory.\n\n"
        "Try asking me:\n"
        "- *'Why is Machine 1 failing?'*\n"
        "- *'Which machine needs urgent attention?'*\n"
        "- *'What maintenance is scheduled?'*\n"
        "- *'Check spare-parts stock.'*"
    )
