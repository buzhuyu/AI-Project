-- Create worldview_entries table
CREATE TABLE IF NOT EXISTS worldview_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    category TEXT NOT NULL, -- 'Character', 'Location', 'Item', 'Other'
    description TEXT,
    status TEXT, -- 'Active', 'Deceased', 'Destroyed', etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add index
CREATE INDEX IF NOT EXISTS idx_worldview_project_id ON worldview_entries(project_id);
