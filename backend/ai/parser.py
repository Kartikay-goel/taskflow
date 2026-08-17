import re
from datetime import datetime, timedelta

def get_date_from_phrase(phrase):
    """Calculates the actual YYYY-MM-DD from a natural language phrase."""
    if not phrase: 
        return None
        
    today = datetime.now()
    if "today" in phrase: 
        return today.strftime("%Y-%m-%d")
    if "tomorrow" in phrase: 
        return (today + timedelta(days=1)).strftime("%Y-%m-%d")
    
    weekdays = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
    for i, day in enumerate(weekdays):
        if day in phrase:
            days_ahead = i - today.weekday()
            # If the day has already passed this week, or they explicitly said "next", push to next week
            if days_ahead <= 0 or "next" in phrase:
                days_ahead += 7
            return (today + timedelta(days=days_ahead)).strftime("%Y-%m-%d")
            
    return None

def parse_natural_language_task(description: str):
    lower_text = description.lower()
    
    priority = "medium"
    if "urgent" in lower_text or "asap" in lower_text:
        priority = "high"
    elif "whenever" in lower_text or "low priority" in lower_text:
        priority = "low"
        
    date_phrases = [
        "today", "tomorrow", "next week",
        "next monday", "next tuesday", "next wednesday", "next thursday", "next friday", "next saturday", "next sunday",
        "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"
    ]
    
    due_date_hint = None
    matched_date_phrase = None
    for phrase in date_phrases:
        if phrase in lower_text:
            due_date_hint = phrase
            matched_date_phrase = phrase
            break
            
    # Calculate exact date and append it in brackets for the sort engine
    if due_date_hint:
        calc_date = get_date_from_phrase(due_date_hint)
        if calc_date:
            due_date_hint = f"{due_date_hint} ({calc_date})"
            
    title = description
    keywords_to_strip = ["urgent", "asap", "whenever", "low priority"]
    if matched_date_phrase:
        keywords_to_strip.append(matched_date_phrase)
        
    for kw in keywords_to_strip:
        pattern = re.compile(r'\b' + re.escape(kw) + r'\b', re.IGNORECASE)
        title = pattern.sub('', title)
        
    title = re.sub(r'\s+', ' ', title).strip()
    
    if not title:
        title = "Untitled task"
        
    return {
        "title": title,
        "priority": priority,
        "due_date": due_date_hint,
        "status": "todo"
    }