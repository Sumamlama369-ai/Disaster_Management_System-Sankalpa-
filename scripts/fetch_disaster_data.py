"""
Manual script to fetch disaster data from Reddit
Run this from root: python scripts/fetch_disaster_data.py
"""
import sys
import os
from pathlib import Path

# Add parent directory to path and set working directory
script_dir = Path(__file__).parent
root_dir = script_dir.parent
os.chdir(root_dir)
sys.path.insert(0, str(root_dir))

# Load environment variables
from dotenv import load_dotenv
load_dotenv()

from app.database.database import SessionLocal
from app.services.reddit_service import reddit_monitor

def main():
    print("🌍 Starting disaster data collection...")
    print("=" * 50)
    
    db = SessionLocal()
    
    try:
        # Collect and process data
        print("📡 Fetching posts from Reddit...")
        reddit_monitor.process_and_store_posts(db)
        
        print("\n✅ Data collection completed!")
        print("=" * 50)
        
        # Show summary
        from app.models.disaster import DisasterPost, DisasterInsight
        
        post_count = db.query(DisasterPost).count()
        insight_count = db.query(DisasterInsight).count()
        
        print(f"\n📊 Database Summary:")
        print(f"Total posts: {post_count}")
        print(f"Total insights: {insight_count}")
        
        if insight_count > 0:
            print("\n🔍 Recent insights:")
            recent = db.query(DisasterInsight).order_by(
                DisasterInsight.created_at.desc()
            ).limit(5).all()
            
            for insight in recent:
                print(f"  - {insight.disaster_type.upper()}: {insight.location or 'Unknown'} ({insight.urgency_level})")
        else:
            print("\n⚠️ No disaster insights found.")
            print("This could mean:")
            print("  1. No disaster-related posts found in monitored subreddits")
            print("  2. Reddit API rate limiting")
            print("  3. Network issues")
        
    except Exception as e:
        print(f"\n❌ Error occurred: {e}")
        print("\nFull traceback:")
        import traceback
        traceback.print_exc()
    
    finally:
        db.close()

if __name__ == "__main__":
    main()