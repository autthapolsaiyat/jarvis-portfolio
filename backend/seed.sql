-- JARVIS Portfolio System - Seed Data
-- Run this after initial deployment to populate default data

-- Insert default profile
INSERT INTO profile (name, name_th, role, location, experience, company, email, bio)
VALUES (
    'Autthapol Saiyat',
    'อรรถพล ไสญาติ',
    'Team Lead Developer & Forensic Tech Specialist',
    'Bangkok, Thailand',
    '16+ Years Experience',
    'Sangwit Science Co., Ltd.',
    'contact@example.com',
    'ผู้นำทีมพัฒนาระบบเทคโนโลยีนิติวิทยาศาสตร์และฐานข้อมูลสำหรับสำนักงานตำรวจแห่งชาติ ออกแบบและพัฒนาระบบวิเคราะห์หลักฐาน ระบบจัดเก็บฐานข้อมูลลายนิ้วมือ DNA อาวุธปืน และระบบ Cybersecurity'
) ON CONFLICT DO NOTHING;

-- Insert experiences
INSERT INTO experiences (title, company, start_date, end_date, is_current, description, highlights, tech_stack, sort_order) VALUES
('Team Lead Developer & System Architect', 'Sangwit Science Co., Ltd.', '2009-01-01', NULL, TRUE, 
 'ผู้นำทีมพัฒนาระบบเทคโนโลยีนิติวิทยาศาสตร์และฐานข้อมูลสำหรับสำนักงานตำรวจแห่งชาติ ควบคุมทีม Server, Code (PHP/JS/.NET), API, Cybersecurity และ Pentest',
 ARRAY['FIDS Database System', 'Cybersecurity', 'Mobile Apps', 'Ballistics Analysis', 'DNA Database'],
 ARRAY['PHP', 'JavaScript', '.NET', 'PostgreSQL', 'Azure', 'API Development'],
 1),
('Lead Systems Developer', 'Royal Thai Police - Forensic Science Division', '2020-01-01', NULL, TRUE,
 'ดูแลระบบฐานข้อมูลนิติวิทยาศาสตร์ทั้งหมดของสำนักงานตำรวจแห่งชาติ',
 ARRAY['FIDS Crime Scene', 'App FIDS CSI', 'App CaseWatch', 'App PDMS'],
 ARRAY['PHP', 'JavaScript', 'PostgreSQL', 'Mobile Development'],
 2);

-- Insert projects
INSERT INTO projects (name, description, category, is_featured, sort_order) VALUES
('FIDS Crime Scene System', 'ระบบฐานข้อมูลนิติวิทยาศาสตร์ จัดเก็บข้อมูลสถานที่เกิดเหตุ ผลตรวจทางคดี และระบบรายงานผล', 'web', TRUE, 1),
('App FIDS CSI', 'Mobile Application สำหรับเจ้าหน้าที่ตรวจสถานที่เกิดเหตุ บันทึกหลักฐานภาคสนาม', 'mobile', TRUE, 2),
('PDMS - DNA Link Analysis', 'ระบบวิเคราะห์ความเชื่อมโยง DNA ลายนิ้วมือ แสดงผังเชื่อมโยงอัตโนมัติเพื่อสนับสนุนงานพนักงานสอบสวน', 'database', TRUE, 3),
('Ballistics Database (ABIS Arsenal)', 'ระบบจัดเก็บฐานข้อมูลปลอกกระสุนปืนและลูกกระสุนปืน', 'database', FALSE, 4),
('FIDS Cybersecurity', 'ระบบรักษาความปลอดภัยข้อมูลนิติวิทยาศาสตร์ และการตรวจสอบหลักฐานดิจิทัล', 'security', FALSE, 5),
('CaseWatch App', 'แอพติดตามความคืบหน้าคดีและผลการตรวจพิสูจน์หลักฐาน', 'mobile', FALSE, 6),
('Fingerprint Database System', 'ระบบจัดเก็บและวิเคราะห์ลายนิ้วมือ', 'database', FALSE, 7),
('Document Analysis System', 'ระบบตรวจสอบเอกสารปลอม รอยขูดลบ', 'web', FALSE, 8);

-- Insert skills
INSERT INTO skills (name, percent, category, sort_order) VALUES
('Database Development', 95, 'Backend', 1),
('Backend Development (PHP/.NET)', 90, 'Backend', 2),
('API Design & Integration', 88, 'Backend', 3),
('System Architecture', 85, 'Architecture', 4),
('Mobile App Development', 80, 'Mobile', 5),
('Cybersecurity', 78, 'Security', 6),
('Azure Cloud Services', 75, 'Cloud', 7),
('Team Leadership', 90, 'Management', 8),
('PostgreSQL', 92, 'Database', 9),
('JavaScript/Node.js', 85, 'Frontend', 10);

-- Insert tech stack
INSERT INTO tech_stack (name, icon, sort_order) VALUES
('PHP', '🐘', 1),
('.NET', '📱', 2),
('JavaScript', '🟨', 3),
('Python', '🐍', 4),
('PostgreSQL', '🐘', 5),
('Azure', '☁️', 6),
('REST API', '🔌', 7),
('Security', '🔒', 8),
('Analytics', '📊', 9),
('Server Admin', '🖥️', 10),
('Mobile Dev', '📱', 11),
('Pentest', '🧪', 12);

-- Insert certifications
INSERT INTO certifications (name, issuer, year, sort_order) VALUES
('UFED Ultimate Certification', 'Cellebrite - Digital Forensics (โปรแกรมตรวจสอบข้อมูลจากอุปกรณ์อิเล็กทรอนิกส์)', '2555', 1),
('Leeds Forensic Systems', 'Ballistics Analysis - เครื่องตรวจเปรียบเทียบลูกกระสุนปืนและปลอกกระสุนปืน', '2558', 2),
('ABIS Arsenal Maintenance & Support', 'Papillon AO - ระบบจัดเก็บฐานข้อมูลปลอกกระสุนปืนและลูกกระสุนปืน', '2559', 3),
('AFP Fingerprint Chemical Development Course', 'Australian Federal Police - Specialist Operations', '2560', 4),
('LX5500 Certificate', 'Polygraph Examination (เครื่องจับเท็จ)', '2560', 5),
('Hirox Digital Microscope Technical Service', 'Hirox Co., Ltd. - กล้องกำลังขยายสูง', '2561', 6),
('VSC Regula 4308 Certification', 'Video Spectral Comparator - เครื่องสแกนรอยขูดลบเลขทะเบียนปืน', '2563', 7);

-- Insert default admin user (password: jarvis2024)
INSERT INTO users (username, password, role)
VALUES ('admin', '$2a$10$rOzJqQZQnqZKqQnqZKqQnOzJqQZQnqZKqQnqZKqQnqZKqQnqZKqQnq', 'admin')
ON CONFLICT (username) DO NOTHING;

SELECT 'Seed data inserted successfully!' as status;
