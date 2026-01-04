-- ============================================================
-- JARVIS Portfolio - Migration v11.2
-- Add demo_url and github_url to projects table
-- ============================================================

-- Add new columns (safe: won't fail if already exists)
ALTER TABLE projects ADD COLUMN IF NOT EXISTS demo_url TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS github_url TEXT;

-- Add AFP Certification (if not already added)
INSERT INTO certifications (name, issuer, year, sort_order)
SELECT 'AFP — Fingerprint Chemical Development', 'Australian Federal Police (AFP)', '2017', 0
WHERE NOT EXISTS (
    SELECT 1 FROM certifications WHERE name LIKE '%AFP%Fingerprint%'
);

-- Verify changes
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'projects' 
ORDER BY ordinal_position;

-- Show current projects
SELECT id, name, demo_url, github_url FROM projects;

-- ============================================================
-- Example: Update existing projects with URLs
-- ============================================================
-- UPDATE projects SET 
--     demo_url = 'https://your-demo-site.com',
--     github_url = 'https://github.com/yourrepo'
-- WHERE id = 1;

