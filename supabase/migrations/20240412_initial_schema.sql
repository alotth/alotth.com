-- Create proposals table
CREATE TABLE proposals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    content TEXT DEFAULT 'default',
    theme_id TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    share_key TEXT NOT NULL UNIQUE,
    is_active BOOLEAN NOT NULL DEFAULT true
);

-- Enable RLS
ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;

-- Policy for reading proposals (public access for active proposals)
CREATE POLICY "Public can view active proposals"
ON proposals FOR SELECT
USING (is_active = true);

-- Policy for authenticated users to manage proposals
CREATE POLICY "Authenticated users can manage proposals"
ON proposals FOR ALL
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated'); 