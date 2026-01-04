-- ============================================================
-- JARVIS Portfolio - Add AFP Certification
-- Run this script to add the new certification to the database
-- ============================================================

-- Insert the AFP Fingerprint Chemical Development certification
INSERT INTO certifications (name, issuer, year, cert_url, sort_order)
VALUES (
    'AFP — Fingerprint Chemical Development',
    'Australian Federal Police (AFP)',
    '2017',
    NULL,  -- Can be updated later via admin panel or with cert file URL
    0      -- sort_order (adjust as needed)
);

-- Verify insertion
SELECT id, name, issuer, year, cert_url, sort_order 
FROM certifications 
WHERE issuer LIKE '%AFP%' OR issuer LIKE '%Australian%'
ORDER BY year DESC;

-- ============================================================
-- USAGE INSTRUCTIONS:
-- ============================================================
-- 
-- Option 1: Run via psql command line
-- psql 'postgresql://jarvisadmin:Jarvis%402024Secure!@jarvis-db-portfolio.postgres.database.azure.com:5432/postgres?sslmode=require' -f add-afp-certification.sql
--
-- Option 2: Run via Azure Portal Query Editor
-- 1. Go to Azure Portal > jarvis-db-portfolio
-- 2. Click "Query editor" in the left menu
-- 3. Login with jarvisadmin credentials
-- 4. Paste and run this script
--
-- Option 3: Add via Admin Panel (after fix deployed)
-- 1. Go to https://ashy-coast-0da3a1300.2.azurestaticapps.net
-- 2. Login with admin / jarvis2024
-- 3. Navigate to Certifications
-- 4. Click "+ Add Certification"
-- 5. Fill in:
--    - Name: AFP — Fingerprint Chemical Development
--    - Issuer: Australian Federal Police (AFP)
--    - Year: 2017
-- 6. Save and optionally upload certificate image
-- ============================================================
