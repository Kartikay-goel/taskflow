import re

def parse_natural_language_task(description: str):
    lower_text = description.lower()
    
    # Rule b: Priority Check (Strict Order)
    priority = "medium"
    if "urgent" in lower_text or "asap" in lower_text:
        priority = "high"
    elif "whenever" in lower_text or "low priority" in lower_text:
        priority = "low"
        
    # Rule c: Due Date Hint (Strict Monday-Sunday Order)
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
            
    # Rule d: Title Stripping
    title = description
    keywords_to_strip = ["urgent", "asap", "whenever", "low priority"]
    if matched_date_phrase:
        keywords_to_strip.append(matched_date_phrase)
        
    # Remove every occurrence case-insensitively using word boundaries
    for kw in keywords_to_strip:
        pattern = re.compile(r'\b' + re.escape(kw) + r'\b', re.IGNORECASE)
        title = pattern.sub('', title)
        
    # Clean double spaces and trim
    title = re.sub(r'\s+', ' ', title).strip()
    
    # Fallback if empty
    if not title:
        title = "Untitled task"
        
    return {
        "title": title,
        "priority": priority,
        "due_date": due_date_hint,
        "status": "todo"
    }