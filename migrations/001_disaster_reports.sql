-- ═══════════════════════════════════════════════════════════════
-- Disaster Management System - Disaster Reports Table
-- Migration: Add citizen disaster reporting functionality
-- ═══════════════════════════════════════════════════════════════

-- Create disaster_reports table
CREATE TABLE IF NOT EXISTS disaster_reports (
    id SERIAL PRIMARY KEY,
    
    -- User Information
    user_id INTEGER REFERENCES "user"(id) ON DELETE CASCADE,
    reporter_name VARCHAR(255) DEFAULT 'Anonymous',
    reporter_contact VARCHAR(50),
    
    -- Disaster Details
    disaster_type VARCHAR(100) NOT NULL,  -- fire, flood, earthquake, landslide, storm, other
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    description TEXT NOT NULL,
    
    -- Location Data
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    location_accuracy DECIMAL(10, 2),  -- GPS accuracy in meters
    address TEXT,  -- Reverse geocoded address (optional)
    
    -- Status Tracking
    status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'REVIEWING', 'DISPATCHED', 'RESOLVED', 'REJECTED')),
    priority INTEGER DEFAULT 0,  -- 0-10 scale, auto-calculated based on severity
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP,
    
    -- Officer Assignment
    assigned_officer_id INTEGER REFERENCES "user"(id) ON DELETE SET NULL,
    assigned_at TIMESTAMP,
    
    -- Notes and Updates
    officer_notes TEXT,
    response_notes TEXT
);

-- Create indexes for performance
CREATE INDEX idx_disaster_reports_status ON disaster_reports(status);
CREATE INDEX idx_disaster_reports_severity ON disaster_reports(severity);
CREATE INDEX idx_disaster_reports_created_at ON disaster_reports(created_at DESC);
CREATE INDEX idx_disaster_reports_user_id ON disaster_reports(user_id);
CREATE INDEX idx_disaster_reports_location ON disaster_reports(latitude, longitude);
CREATE INDEX idx_disaster_reports_disaster_type ON disaster_reports(disaster_type);

-- Create function to auto-update updated_at
CREATE OR REPLACE FUNCTION update_disaster_report_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-updating timestamp
CREATE TRIGGER trigger_update_disaster_report_timestamp
    BEFORE UPDATE ON disaster_reports
    FOR EACH ROW
    EXECUTE FUNCTION update_disaster_report_timestamp();

-- Create function to auto-calculate priority
CREATE OR REPLACE FUNCTION calculate_report_priority()
RETURNS TRIGGER AS $$
BEGIN
    -- Priority calculation based on severity
    NEW.priority = CASE NEW.severity
        WHEN 'CRITICAL' THEN 10
        WHEN 'HIGH' THEN 7
        WHEN 'MEDIUM' THEN 4
        WHEN 'LOW' THEN 2
        ELSE 0
    END;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-calculating priority
CREATE TRIGGER trigger_calculate_priority
    BEFORE INSERT OR UPDATE OF severity ON disaster_reports
    FOR EACH ROW
    EXECUTE FUNCTION calculate_report_priority();


-- ═══════════════════════════════════════════════════════════════
-- Disaster Report Images Table (for photo evidence)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS disaster_report_images (
    id SERIAL PRIMARY KEY,
    report_id INTEGER NOT NULL REFERENCES disaster_reports(id) ON DELETE CASCADE,
    
    -- Image Details
    image_path VARCHAR(500) NOT NULL,
    image_url TEXT NOT NULL,
    thumbnail_url TEXT,
    
    -- Metadata
    file_size INTEGER,  -- in bytes
    mime_type VARCHAR(50),
    width INTEGER,
    height INTEGER,
    
    -- Timestamps
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Ordering
    display_order INTEGER DEFAULT 0
);

CREATE INDEX idx_report_images_report_id ON disaster_report_images(report_id);


-- ═══════════════════════════════════════════════════════════════
-- Disaster Report Status History (audit trail)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS disaster_report_status_history (
    id SERIAL PRIMARY KEY,
    report_id INTEGER NOT NULL REFERENCES disaster_reports(id) ON DELETE CASCADE,
    
    -- Status Change
    previous_status VARCHAR(20),
    new_status VARCHAR(20) NOT NULL,
    
    -- Changed By
    changed_by_user_id INTEGER REFERENCES "user"(id) ON DELETE SET NULL,
    changed_by_name VARCHAR(255),
    changed_by_role VARCHAR(50),
    
    -- Notes
    change_notes TEXT,
    
    -- Timestamp
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_status_history_report_id ON disaster_report_status_history(report_id);
CREATE INDEX idx_status_history_changed_at ON disaster_report_status_history(changed_at DESC);


-- ═══════════════════════════════════════════════════════════════
-- Drone Deployment Records (linking to Firebase drone tracking)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS drone_deployments (
    id SERIAL PRIMARY KEY,
    report_id INTEGER NOT NULL REFERENCES disaster_reports(id) ON DELETE CASCADE,
    
    -- Drone Details
    drone_id VARCHAR(100) NOT NULL,  -- Matches Firebase drone ID
    drone_name VARCHAR(255),
    
    -- Deployment Info
    deployed_by_officer_id INTEGER REFERENCES "user"(id) ON DELETE SET NULL,
    deployed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Mission Status
    mission_status VARCHAR(50) DEFAULT 'DEPLOYED' CHECK (mission_status IN ('DEPLOYED', 'EN_ROUTE', 'ON_SITE', 'RETURNING', 'COMPLETED', 'ABORTED')),
    
    -- Location Tracking (synced from Firebase)
    last_known_latitude DECIMAL(10, 8),
    last_known_longitude DECIMAL(11, 8),
    last_sync_at TIMESTAMP,
    
    -- Mission Results
    arrived_at TIMESTAMP,
    completed_at TIMESTAMP,
    mission_notes TEXT,
    
    -- Metrics
    distance_traveled DECIMAL(10, 2),  -- in km
    flight_duration INTEGER  -- in minutes
);

CREATE INDEX idx_drone_deployments_report_id ON drone_deployments(report_id);
CREATE INDEX idx_drone_deployments_drone_id ON drone_deployments(drone_id);
CREATE INDEX idx_drone_deployments_status ON drone_deployments(mission_status);


-- ═══════════════════════════════════════════════════════════════
-- Insert Sample Data (for testing)
-- ═══════════════════════════════════════════════════════════════

-- Sample disaster report
INSERT INTO disaster_reports (
    user_id, reporter_name, reporter_contact,
    disaster_type, severity, description,
    latitude, longitude, location_accuracy,
    status
) VALUES (
    1, 'Ram Kumar Sharma', '+977-9841234567',
    'flood', 'HIGH', 'Severe flooding in residential area. Water level rising rapidly. Multiple families trapped on rooftops. Immediate rescue needed.',
    27.7172, 85.3240, 15.5,
    'PENDING'
);

-- Sample status history
INSERT INTO disaster_report_status_history (
    report_id, previous_status, new_status,
    changed_by_user_id, changed_by_name, changed_by_role,
    change_notes
) VALUES (
    1, NULL, 'PENDING',
    1, 'System', 'system',
    'Initial report submitted by citizen'
);


-- ═══════════════════════════════════════════════════════════════
-- Useful Views
-- ═══════════════════════════════════════════════════════════════

-- View: Active disaster reports with reporter details
CREATE OR REPLACE VIEW active_disaster_reports AS
SELECT 
    dr.*,
    u.email as reporter_email,
    u.role as reporter_role,
    COUNT(dri.id) as image_count,
    ao.name as assigned_officer_name,
    ao.email as assigned_officer_email
FROM disaster_reports dr
LEFT JOIN "user" u ON dr.user_id = u.id
LEFT JOIN disaster_report_images dri ON dr.id = dri.report_id
LEFT JOIN "user" ao ON dr.assigned_officer_id = ao.id
WHERE dr.status IN ('PENDING', 'REVIEWING', 'DISPATCHED')
GROUP BY dr.id, u.email, u.role, ao.name, ao.email
ORDER BY dr.priority DESC, dr.created_at DESC;

-- View: Disaster statistics by type
CREATE OR REPLACE VIEW disaster_statistics AS
SELECT 
    disaster_type,
    COUNT(*) as total_reports,
    COUNT(CASE WHEN status = 'RESOLVED' THEN 1 END) as resolved_count,
    COUNT(CASE WHEN severity = 'CRITICAL' THEN 1 END) as critical_count,
    AVG(
        CASE 
            WHEN resolved_at IS NOT NULL 
            THEN EXTRACT(EPOCH FROM (resolved_at - created_at)) / 3600 
        END
    ) as avg_resolution_hours
FROM disaster_reports
GROUP BY disaster_type
ORDER BY total_reports DESC;


-- ═══════════════════════════════════════════════════════════════
-- Grant Permissions
-- ═══════════════════════════════════════════════════════════════

-- Grant access to application user (adjust username as needed)
-- GRANT ALL PRIVILEGES ON disaster_reports TO your_app_user;
-- GRANT ALL PRIVILEGES ON disaster_report_images TO your_app_user;
-- GRANT ALL PRIVILEGES ON disaster_report_status_history TO your_app_user;
-- GRANT ALL PRIVILEGES ON drone_deployments TO your_app_user;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO your_app_user;


-- ═══════════════════════════════════════════════════════════════
-- END OF MIGRATION
-- ═══════════════════════════════════════════════════════════════