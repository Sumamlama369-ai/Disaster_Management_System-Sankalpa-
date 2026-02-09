"""
NLP Processing for disaster classification and analysis
"""
import spacy
from textblob import TextBlob
import re
from typing import Dict, List, Tuple, Optional
from datetime import datetime


class DisasterNLPProcessor:
    """Process text for disaster insights using NLP"""
    
    def __init__(self):
        try:
            self.nlp = spacy.load("en_core_web_sm")
        except OSError:
            print("⚠️ spaCy model not found. Run: python -m spacy download en_core_web_sm")
            self.nlp = None
        
        # Disaster keywords with severity weights
        self.disaster_keywords = {
            'earthquake': {'keywords': ['earthquake', 'quake', 'tremor', 'seismic'], 'severity': 8},
            'flood': {'keywords': ['flood', 'flooding', 'deluge', 'inundation'], 'severity': 7},
            'fire': {'keywords': ['wildfire', 'fire', 'blaze', 'inferno', 'burning'], 'severity': 7},
            'hurricane': {'keywords': ['hurricane', 'typhoon', 'cyclone', 'storm'], 'severity': 9},
            'tornado': {'keywords': ['tornado', 'twister'], 'severity': 8},
            'tsunami': {'keywords': ['tsunami', 'tidal wave'], 'severity': 10},
            'volcano': {'keywords': ['volcano', 'volcanic', 'eruption', 'lava'], 'severity': 9},
            'drought': {'keywords': ['drought', 'water shortage', 'arid'], 'severity': 6},
            'landslide': {'keywords': ['landslide', 'mudslide', 'avalanche'], 'severity': 7},
            'pandemic': {'keywords': ['pandemic', 'epidemic', 'outbreak', 'disease'], 'severity': 8},
            'conflict': {'keywords': ['war', 'conflict', 'attack', 'bombing', 'violence'], 'severity': 9},
            'explosion': {'keywords': ['explosion', 'blast', 'detonation'], 'severity': 8},
        }
    
    def classify_disaster(self, text: str) -> Tuple[str, int, float]:
        """
        Classify disaster type and calculate confidence
        Returns: (disaster_type, severity_score, confidence)
        """
        text_lower = text.lower()
        matches = []
        
        for disaster_type, data in self.disaster_keywords.items():
            for keyword in data['keywords']:
                if keyword in text_lower:
                    # Calculate confidence based on keyword prominence
                    count = text_lower.count(keyword)
                    confidence = min(count * 0.2 + 0.5, 1.0)
                    matches.append((disaster_type, data['severity'], confidence))
                    break
        
        if matches:
            # Return disaster with highest confidence
            return max(matches, key=lambda x: x[2])
        
        return ('other', 5, 0.3)
    
    def extract_locations(self, text: str) -> List[str]:
        """Extract location entities from text"""
        if not self.nlp:
            return []
        
        doc = self.nlp(text)
        locations = []
        
        for ent in doc.ents:
            if ent.label_ in ["GPE", "LOC", "FAC"]:  # Geopolitical entity, location, facility
                locations.append(ent.text)
        
        return list(set(locations))  # Remove duplicates
    
    def analyze_sentiment(self, text: str) -> float:
        """Analyze sentiment (-1 to 1, negative = bad situation)"""
        blob = TextBlob(text)
        return blob.sentiment.polarity  # type: ignore[attr-defined]
    
    def calculate_urgency(self, text: str, severity: int, sentiment: float) -> str:
        """Calculate urgency level based on multiple factors"""
        text_lower = text.lower()
        
        # Urgency keywords
        critical_words = ['emergency', 'urgent', 'critical', 'immediate', 'help needed', 'sos']
        high_words = ['severe', 'major', 'significant', 'extensive', 'widespread']
        
        # Check for urgency keywords
        critical_count = sum(1 for word in critical_words if word in text_lower)
        high_count = sum(1 for word in high_words if word in text_lower)
        
        # Calculate urgency score
        urgency_score = severity + (critical_count * 3) + (high_count * 1.5)
        
        # Negative sentiment increases urgency
        if sentiment < -0.5:
            urgency_score += 2
        
        # Determine level
        if urgency_score >= 12 or critical_count >= 2:
            return 'critical'
        elif urgency_score >= 9 or high_count >= 2:
            return 'high'
        elif urgency_score >= 6:
            return 'medium'
        else:
            return 'low'
    
    def extract_numbers(self, text: str) -> Dict[str, Optional[str]]:
        """Extract affected population and damage estimates"""
        # Pattern for casualties/affected people
        people_patterns = [
            r'(\d+(?:,\d+)*)\s*(?:people|persons|victims|casualties|affected|injured|dead|killed)',
            r'(?:casualties|victims|deaths):\s*(\d+(?:,\d+)*)',
        ]
        
        # Pattern for damage estimates
        damage_patterns = [
            r'\$(\d+(?:,\d+)*(?:\.\d+)?)\s*(?:million|billion|thousand)?',
            r'(\d+(?:,\d+)*)\s*(?:million|billion)\s*(?:dollars|USD)',
        ]
        
        affected = None
        damage = None
        
        for pattern in people_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                affected = match.group(1)
                break
        
        for pattern in damage_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                damage = f"${match.group(1)}"
                break
        
        return {
            'affected_population': affected,
            'damage_estimate': damage
        }
    
    def extract_keywords(self, text: str, top_n: int = 5) -> List[str]:
        """Extract trending keywords using NLP"""
        if not self.nlp:
            return []
        
        doc = self.nlp(text)
        
        # Extract important nouns and proper nouns
        keywords = []
        for token in doc:
            if token.pos_ in ['NOUN', 'PROPN'] and not token.is_stop and len(token.text) > 3:
                keywords.append(token.text.lower())
        
        # Count frequency and return top N
        from collections import Counter
        keyword_counts = Counter(keywords)
        return [word for word, _ in keyword_counts.most_common(top_n)]
    
    def process_post(self, title: str, text: str = "") -> Dict:
        """
        Complete NLP processing pipeline
        Returns all insights as a dictionary
        """
        combined_text = f"{title} {text}"
        
        # Classify disaster
        disaster_type, severity, confidence = self.classify_disaster(combined_text)
        
        # Extract locations
        locations = self.extract_locations(combined_text)
        location = locations[0] if locations else None
        
        # Analyze sentiment
        sentiment = self.analyze_sentiment(combined_text)
        
        # Calculate urgency
        urgency = self.calculate_urgency(combined_text, severity, sentiment)
        
        # Extract numbers
        numbers = self.extract_numbers(combined_text)
        
        # Extract keywords
        keywords = self.extract_keywords(combined_text)
        
        # Determine if it's a request or offer
        request_offer = None
        if any(word in combined_text.lower() for word in ['need', 'help', 'require', 'looking for']):
            request_offer = 'request'
        elif any(word in combined_text.lower() for word in ['offering', 'provide', 'donate', 'support']):
            request_offer = 'offer'
        
        return {
            'disaster_type': disaster_type,
            'severity_score': severity,
            'sentiment': sentiment,
            'location': location,
            'urgency_level': urgency,
            'confidence_score': confidence,
            'affected_population': numbers['affected_population'],
            'damage_estimate': numbers['damage_estimate'],
            'trending_keywords': ','.join(keywords) if keywords else None,
            'request_offer': request_offer,
        }


# Create singleton instance
nlp_processor = DisasterNLPProcessor()