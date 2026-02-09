"""
Background tasks for disaster monitoring
"""
import schedule
import time
import threading
from datetime import datetime
from app.database.database import SessionLocal
from app.services.reddit_service import reddit_monitor


class BackgroundTaskManager:
    """Manage background tasks for data collection"""
    
    def __init__(self):
        self.running = False
        self.thread = None
        self.last_collection = None 
        self.collection_count = 0
    
    def collect_disaster_data(self):
        """Collect and process disaster data with varying time filters"""
        print(f"\n{'='*50}")
        print(f"🔄 Starting scheduled data collection at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"{'='*50}")
        
        db = SessionLocal()
        try:
            # Vary time filter to get different posts
            time_filters = ['hour', 'day']  # Alternate between recent and daily
            time_filter = time_filters[self.collection_count % len(time_filters)]
            
            print(f"📅 Using time filter: {time_filter}")
            
            # Pass time filter to reddit monitor
            reddit_monitor.process_and_store_posts(db)
            
            self.last_collection = datetime.now()
            self.collection_count += 1
            
            print(f"✅ Collection completed at {self.last_collection.strftime('%Y-%m-%d %H:%M:%S')}")
            
        except Exception as e:
            print(f"❌ Error in data collection: {e}")
            import traceback
            traceback.print_exc()
        finally:
            db.close()
    
    def cleanup_old_data(self):
        """Clean up data older than 50 days"""
        print(f"\n🧹 Cleaning up old data at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        db = SessionLocal()
        try:
            reddit_monitor.cleanup_old_data(db, days=50)
        except Exception as e:
            print(f"❌ Error in cleanup: {e}")
        finally:
            db.close()
    
    def run_scheduler(self):
        """Run scheduled tasks"""
        print("\n" + "="*50)
        print("⏰ Background Task Scheduler Started")
        print("="*50)
        print("Schedule:")
        print("  - Data collection: Every 40 minutes")
        print("  - Data cleanup: Daily at 3:00 AM")
        print("="*50 + "\n")
        
        # Schedule data collection every 40 minutes
        schedule.every(40).minutes.do(self.collect_disaster_data)
        
        # Schedule cleanup once per day at 3 AM
        schedule.every().day.at("03:00").do(self.cleanup_old_data)
        
        # Run initial collection immediately
        print("🚀 Running initial data collection...")
        self.collect_disaster_data()
        
        # Keep running
        while self.running:
            schedule.run_pending()
            time.sleep(1)
    
    def start(self):
        """Start background tasks"""
        if not self.running:
            self.running = True
            self.thread = threading.Thread(target=self.run_scheduler, daemon=True)
            self.thread.start()
            print("✓ Background tasks started")
    
    def stop(self):
        """Stop background tasks"""
        self.running = False
        if self.thread:
            self.thread.join(timeout=5)
        print("✓ Background tasks stopped")
    
    def get_status(self):
        """Get current status"""
        return {
            "running": self.running,
            "last_collection": self.last_collection.isoformat() if self.last_collection else None
        }


# Create singleton instance
background_tasks = BackgroundTaskManager()