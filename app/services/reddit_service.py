"""
Reddit data collection service for disaster monitoring
"""
import praw
from datetime import datetime, timedelta
from typing import List, Dict
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.disaster import DisasterPost, DisasterInsight, DisasterStats
from app.services.nlp_processor import nlp_processor
from app.database.database import SessionLocal
import time


class RedditDisasterMonitor:
    """Monitor Reddit for disaster-related posts"""
    
    def __init__(self):
        # Reddit API credentials
        self.reddit = praw.Reddit(
            client_id='VHX9LpJ314x4BflYHHVBwQ',
            client_secret='gcmZtzix7fjB7f2Cv8G-hLjfVHS8MQ',
            user_agent='DisasterMonitor2025 by u/Popular-Sense8148'
        )
        
        # Subreddits to monitor
        self.subreddits = [
            # NEWS & WORLD
            "news", 
            "worldnews",
            "UpliftingNews",
            "nottheonion",
            "anime_titties",  # Actually serious world news
            
            # DISASTERS & EMERGENCIES
            "environment",
            "naturaldisasters", 
            "emergencymanagement",
            "catastrophicfailure",
            "CatastrophicFailure",
            "TropicalWeather",
            "Wildfire",
            "Earthquakes",
            
            # CLIMATE & WEATHER
            "climate",
            "weather",
            "climatechange",
            "environment",
            
            # HEALTH & PANDEMICS
            "globalhealth",
            "Coronavirus",
            "medicine",
            
            # CONFLICT & VIOLENCE
            "conflict",
            "geopolitics",
            "worldpolitics",
            "syriancivilwar",
            "UkrainianConflict",
            
            # TECHNOLOGY (for cyber disasters)
            "technology",
            "cybersecurity",
            "privacy",
            
            # GENERAL
            "breakingnews",
            "GlobalOffensive",  # Sometimes has disaster news
            
            # REGIONAL (high activity)
            "europe",
            "asia",
            "africa",
            "australia",
            "canada",
            "unitedkingdom",
        ]
        
        self.processing_delay = 2  # seconds between posts
        self.nlp_processor = nlp_processor  # NLP processor instance
    
    def is_disaster_related(self, post):
        """Check if post is disaster-related (RELAXED FILTER)"""
        text = f"{post.title} {post.selftext}".lower()
        
        # EXPANDED disaster keywords
        disaster_keywords = [
            # Natural Disasters
            'disaster', 'emergency', 'crisis', 'catastrophe', 'calamity',
            'earthquake', 'tsunami', 'flood', 'hurricane', 'tornado', 'cyclone', 
            'typhoon', 'storm', 'wildfire', 'fire', 'blaze', 'inferno',
            'volcano', 'eruption', 'drought', 'famine', 'landslide', 'avalanche',
            'heatwave', 'cold snap', 'blizzard', 'ice storm',
            
            # Human-made disasters
            'explosion', 'blast', 'collapse', 'crash', 'accident',
            'leak', 'spill', 'contamination', 'toxic', 'radiation',
            'cyber attack', 'hack', 'breach', 'ransomware',
            
            # Health emergencies
            'pandemic', 'epidemic', 'outbreak', 'virus', 'disease',
            'infection', 'contagion', 'plague',
            
            # Violence & Conflict
            'war', 'conflict', 'attack', 'terrorism', 'bombing',
            'shooting', 'violence', 'riot', 'protest',
            
            # Infrastructure
            'power outage', 'blackout', 'shortage', 'disruption',
            'evacuation', 'rescue', 'casualty', 'victim', 'death toll',
            
            # Weather-related (relaxed)
            'severe weather', 'warning', 'alert', 'watch',
            'damage', 'destruction', 'devastation', 'affected',
            
            # Economic (new)
            'economic crisis', 'recession', 'crash', 'collapse',
            
            # Environmental (new)
            'pollution', 'climate change', 'environmental disaster',
            'oil spill', 'chemical leak', 'nuclear',
        ]
        
        return any(keyword in text for keyword in disaster_keywords)
    
    def fetch_posts(self, time_filter='hour', limit=50):
        """
        Fetch posts from monitored subreddits with aggressive new post fetching
        """
        all_posts = []
        
        for subreddit_name in self.subreddits:
            try:
                subreddit = self.reddit.subreddit(subreddit_name)
                posts = []
                
                # PRIORITIZE NEW POSTS (most likely to be fresh)
                posts.extend(list(subreddit.new(limit=limit // 2)))  # 50% new
                
                # Get hot posts (trending)
                posts.extend(list(subreddit.hot(limit=limit // 4)))  # 25% hot
                
                # Get top posts from time period
                posts.extend(list(subreddit.top(time_filter=time_filter, limit=limit // 4)))  # 25% top
                
                # Remove duplicates
                seen_ids = set()
                unique_posts = []
                for post in posts:
                    if post.id not in seen_ids:
                        seen_ids.add(post.id)
                        unique_posts.append(post)
                
                all_posts.extend(unique_posts)
                
                if len(unique_posts) > 0:
                    print(f"✓ Fetched {len(unique_posts)} posts from r/{subreddit_name}")
                
            except Exception as e:
                error_msg = str(e)
                if "404" in error_msg:
                    print(f"⚠️ r/{subreddit_name}: 404 Not Found")
                elif "Redirect" in error_msg or "private" in error_msg.lower():
                    print(f"⚠️ r/{subreddit_name}: Private or Redirected")
                else:
                    print(f"⚠️ r/{subreddit_name}: {error_msg}")
                continue
            
            # Shorter delay for faster collection
            time.sleep(1)  # Reduced from 2 seconds
        
        return all_posts
    
    def process_and_store_posts(self, db: Session):
        """Fetch, process, and store disaster posts with better duplicate handling"""
        
        print(f"\n{'='*50}")
        print(f"📡 Fetching posts from Reddit...")
        
        # Fetch posts from last hour (fresher content)
        posts = self.fetch_posts(time_filter='hour', limit=30)
        
        # Filter for disaster-related posts
        disaster_posts = [post for post in posts if self.is_disaster_related(post)]
        
        print(f"✓ Fetched {len(disaster_posts)} disaster-related posts")
        
        if not disaster_posts:
            print("⚠️ No disaster-related posts found this cycle")
            return
        
        new_posts_count = 0
        new_insights_count = 0
        updated_posts_count = 0
        
        for post in disaster_posts:
            try:
                # Check if post already exists
                existing_post = db.query(DisasterPost).filter(
                    DisasterPost.id == post.id
                ).first()
                
                if existing_post:
                    # Update existing post's metadata (score, comments may have changed)
                    existing_post.score = post.score
                    existing_post.num_comments = post.num_comments
                    updated_posts_count += 1
                    
                    # Check if insight exists
                    existing_insight = db.query(DisasterInsight).filter(
                        DisasterInsight.post_id == post.id
                    ).first()
                    
                    if existing_insight:
                        # Skip if both post and insight exist
                        continue
                else:
                    # Create new post
                    post_data = DisasterPost(
                        id=post.id,
                        title=post.title,
                        text=post.selftext if post.selftext else post.title,
                        timestamp=datetime.fromtimestamp(post.created_utc),
                        location=None,  # Will be extracted by NLP
                        source_subreddit=post.subreddit.display_name,
                        score=post.score,
                        num_comments=post.num_comments,
                        url=post.url,
                    )
                    
                    db.add(post_data)
                    
                    # Commit post first
                    try:
                        db.commit()
                        new_posts_count += 1
                    except Exception as commit_error:
                        db.rollback()
                        print(f"⚠️ Error committing post {post.id}: {commit_error}")
                        continue
                
                # Process with NLP
                nlp_result = self.nlp_processor.process_post(post.title, post.selftext if post.selftext else '')
                
                # Create insight
                insight = DisasterInsight(
                    post_id=post.id,
                    disaster_type=nlp_result['disaster_type'],
                    severity_score=nlp_result['severity_score'],
                    sentiment=nlp_result['sentiment'],
                    location=nlp_result['location'],
                    urgency_level=nlp_result['urgency_level'],
                    confidence_score=nlp_result['confidence_score'],
                    affected_population=nlp_result.get('affected_population'),
                    damage_estimate=nlp_result.get('damage_estimate'),
                    trending_keywords=', '.join(nlp_result.get('keywords', [])),
                )
                
                db.add(insight)
                
                try:
                    db.commit()
                    new_insights_count += 1
                except Exception as commit_error:
                    db.rollback()
                    print(f"⚠️ Error committing insight for post {post.id}: {commit_error}")
                    continue
                
                # Small delay for processing
                time.sleep(0.5)
                
            except Exception as e:
                print(f"⚠️ Error processing post {post.id}: {e}")
                db.rollback()
                continue
        
        print(f"✓ Stored {new_posts_count} new posts and {new_insights_count} insights")
        if updated_posts_count > 0:
            print(f"✓ Updated {updated_posts_count} existing posts")
        
        if new_posts_count == 0 and updated_posts_count > 0:
            print(f"ℹ️ No new posts, but {updated_posts_count} posts updated (scores/comments changed)")
            print(f"💡 Tip: This is normal during low-activity periods. The system is working correctly.")
        
        # Update statistics
        self.update_statistics(db)
    
    def update_statistics(self, db: Session):
        """Update disaster statistics"""
        try:
            # Get total counts
            total_incidents = db.query(func.count(DisasterInsight.id)).scalar()
            
            # Get urgent incidents (critical + high)
            urgent_incidents = db.query(func.count(DisasterInsight.id)).filter(
                DisasterInsight.urgency_level.in_(['critical', 'high'])
            ).scalar()
            
            # Get average sentiment
            avg_sentiment = db.query(func.avg(DisasterInsight.sentiment)).scalar() or 0.0
            
            # Get top disaster type
            top_disaster = db.query(
                DisasterInsight.disaster_type,
                func.count(DisasterInsight.id).label('count')
            ).group_by(
                DisasterInsight.disaster_type
            ).order_by(
                func.count(DisasterInsight.id).desc()
            ).first()
            
            top_disaster_type = top_disaster[0] if top_disaster else None
            
            # Get top location
            top_location = db.query(
                DisasterInsight.location,
                func.count(DisasterInsight.id).label('count')
            ).filter(
                DisasterInsight.location.isnot(None),
                DisasterInsight.location != '',
                DisasterInsight.location != 'Unknown'
            ).group_by(
                DisasterInsight.location
            ).order_by(
                func.count(DisasterInsight.id).desc()
            ).first()
            
            top_location_name = top_location[0] if top_location else None
            
            # Get hourly count (last hour)
            one_hour_ago = datetime.now() - timedelta(hours=1)
            hourly_count = db.query(func.count(DisasterPost.id)).filter(
                DisasterPost.timestamp >= one_hour_ago
            ).scalar()
            
            # Create or update stats
            stats = DisasterStats(
                timestamp=datetime.now(),
                total_incidents=total_incidents,
                urgent_incidents=urgent_incidents,
                avg_sentiment=float(avg_sentiment),
                top_disaster_type=top_disaster_type,
                top_location=top_location_name,
                hourly_count=hourly_count,
            )
            
            db.add(stats)
            db.commit()
            
            print(f"✓ Updated statistics: {total_incidents} total, {urgent_incidents} urgent")
            
        except Exception as e:
            print(f"⚠️ Error updating statistics: {e}")
            db.rollback()
    
    def cleanup_old_data(self, db: Session, days: int = 50):
        """Delete data older than specified days"""
        try:
            cutoff_date = datetime.now() - timedelta(days=days)
            
            # Delete old insights
            deleted_insights = db.query(DisasterInsight).filter(
                DisasterInsight.created_at < cutoff_date
            ).delete()
            
            # Delete old posts
            deleted_posts = db.query(DisasterPost).filter(
                DisasterPost.created_at < cutoff_date
            ).delete()
            
            # Delete old stats
            deleted_stats = db.query(DisasterStats).filter(
                DisasterStats.timestamp < cutoff_date
            ).delete()
            
            db.commit()
            
            if deleted_insights > 0 or deleted_posts > 0 or deleted_stats > 0:
                print(f"✓ Cleaned up old data: {deleted_posts} posts, {deleted_insights} insights, {deleted_stats} stats")
            
        except Exception as e:
            print(f"Error cleaning up data: {e}")
            db.rollback()


# Create singleton instance
reddit_monitor = RedditDisasterMonitor()