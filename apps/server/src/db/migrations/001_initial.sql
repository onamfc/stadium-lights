-- Stadium Lights Initial Schema

-- Groups table
CREATE TABLE IF NOT EXISTS groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(32) UNIQUE NOT NULL,
    controller_device_id VARCHAR(128) NOT NULL,
    stadium_bounds JSONB NOT NULL,
    grid_size JSONB NOT NULL,
    is_custom_code BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_activity TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL
);

-- Index for code lookups
CREATE INDEX IF NOT EXISTS idx_groups_code ON groups(code);

-- Index for controller device lookups
CREATE INDEX IF NOT EXISTS idx_groups_controller ON groups(controller_device_id);

-- Index for expiration cleanup
CREATE INDEX IF NOT EXISTS idx_groups_expires_at ON groups(expires_at);

-- Participants table
CREATE TABLE IF NOT EXISTS participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id VARCHAR(128) NOT NULL,
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    display_name VARCHAR(50),
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    zone_id VARCHAR(32),
    last_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(device_id, group_id)
);

-- Index for group lookups
CREATE INDEX IF NOT EXISTS idx_participants_group ON participants(group_id);

-- Index for device lookups
CREATE INDEX IF NOT EXISTS idx_participants_device ON participants(device_id);

-- Function to clean up expired groups (called periodically)
CREATE OR REPLACE FUNCTION cleanup_expired_groups()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM groups WHERE expires_at < NOW();
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;
