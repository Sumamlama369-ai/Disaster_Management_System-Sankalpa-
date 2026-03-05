"""
Run Disaster Reports Database Migration
Executes the SQL migration file to create all necessary tables
"""
import psycopg2
from psycopg2 import sql
import os
from pathlib import Path

# Database configuration (update these with your actual values)
DB_CONFIG = {
    'host': 'localhost',
    'port': 5432,
    'database': 'Sankalpa',  # Change to your database name
    'user': 'postgres',      # Your PostgreSQL username
    'password': 'sankalpa'  # Your PostgreSQL password
}

def run_migration():
    """Run the disaster reports migration SQL file"""
    
    print("🚀 Starting database migration...")
    print(f"📊 Database: {DB_CONFIG['database']}")
    print(f"👤 User: {DB_CONFIG['user']}")
    print("-" * 60)
    
    # Path to migration file
    migration_file = Path(__file__).parent.parent / 'migrations' / '001_disaster_reports.sql'
    
    if not migration_file.exists():
        print(f"❌ Error: Migration file not found at: {migration_file}")
        print(f"📂 Please create the file at: {migration_file}")
        return False
    
    try:
        # Connect to PostgreSQL
        print("🔌 Connecting to database...")
        conn = psycopg2.connect(**DB_CONFIG)
        conn.autocommit = True
        cursor = conn.cursor()
        
        # Read SQL file
        print(f"📖 Reading migration file: {migration_file.name}")
        with open(migration_file, 'r', encoding='utf-8') as f:
            sql_content = f.read()
        
        # Execute SQL
        print("⚡ Executing migration...")
        cursor.execute(sql_content)
        
        # Verify tables were created
        print("\n✅ Migration completed successfully!")
        print("\n📋 Verifying tables...")
        
        tables_to_check = [
            'disaster_reports',
            'disaster_report_images',
            'disaster_report_status_history',
            'drone_deployments'
        ]
        
        for table_name in tables_to_check:
            cursor.execute(
                "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = %s)",
                (table_name,)
            )
            exists = cursor.fetchone()[0]
            
            if exists:
                # Count rows
                cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
                count = cursor.fetchone()[0]
                print(f"  ✓ {table_name:40s} - {count} rows")
            else:
                print(f"  ✗ {table_name:40s} - NOT FOUND!")
        
        # Close connection
        cursor.close()
        conn.close()
        
        print("\n" + "=" * 60)
        print("🎉 Database migration completed successfully!")
        print("=" * 60)
        print("\n📝 Next steps:")
        print("  1. Copy backend model files to app/models/")
        print("  2. Copy schema files to app/schemas/")
        print("  3. Copy endpoint files to app/api/v1/endpoints/")
        print("  4. Update app/api/v1/api.py to register the router")
        print("  5. Restart your backend server")
        print("\n✨ Your disaster reporting system is ready!")
        
        return True
        
    except psycopg2.Error as e:
        print(f"\n❌ Database error: {e}")
        print(f"\n💡 Troubleshooting:")
        print(f"  1. Check if PostgreSQL is running")
        print(f"  2. Verify database name: {DB_CONFIG['database']}")
        print(f"  3. Verify username: {DB_CONFIG['user']}")
        print(f"  4. Verify password is correct")
        print(f"  5. Check if database exists:")
        print(f"     - Open pgAdmin")
        print(f"     - Look for database: {DB_CONFIG['database']}")
        return False
        
    except FileNotFoundError as e:
        print(f"\n❌ File error: {e}")
        return False
        
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        return False


if __name__ == "__main__":
    print("\n" + "=" * 60)
    print("  DISASTER MANAGEMENT SYSTEM - DATABASE MIGRATION")
    print("=" * 60 + "\n")
    
    # Check if migration directory exists
    migrations_dir = Path(__file__).parent.parent / 'migrations'
    if not migrations_dir.exists():
        print("📁 Creating migrations directory...")
        migrations_dir.mkdir(exist_ok=True)
        print(f"✓ Created: {migrations_dir}")
        print(f"\n⚠️ Please place your SQL file here:")
        print(f"   {migrations_dir / '001_disaster_reports.sql'}")
        input("\nPress Enter when file is ready...")
    
    success = run_migration()
    
    if not success:
        print("\n⚠️ Migration failed. Please fix the errors and try again.")
        exit(1)