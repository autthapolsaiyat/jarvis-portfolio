const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { BlobServiceClient } = require('@azure/storage-blob');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
    origin: process.env.FRONTEND_URL || '*',
    credentials: true
}));
app.use(express.json({ limit: '50mb' }));

// PostgreSQL Connection
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Azure Blob Storage
const blobServiceClient = process.env.AZURE_STORAGE_CONNECTION_STRING 
    ? BlobServiceClient.fromConnectionString(process.env.AZURE_STORAGE_CONNECTION_STRING)
    : null;
const containerName = 'portfolio-images';

// Multer for file uploads
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

// Multer for image uploads only
const uploadImage = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only images allowed'));
        }
    }
});

// JWT Middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) return res.status(401).json({ error: 'Access denied' });
    
    jwt.verify(token, process.env.JWT_SECRET || 'jarvis-secret-key', (err, user) => {
        if (err) return res.status(403).json({ error: 'Invalid token' });
        req.user = user;
        next();
    });
};

// ==================== DATABASE INIT ====================
async function initDatabase() {
    const client = await pool.connect();
    try {
        await client.query(`
            -- Users table for admin
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(50) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                role VARCHAR(20) DEFAULT 'admin',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            -- Profile table
            CREATE TABLE IF NOT EXISTS profile (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                name_th VARCHAR(100),
                role VARCHAR(200),
                location VARCHAR(100),
                experience VARCHAR(100),
                company VARCHAR(200),
                email VARCHAR(100),
                phone VARCHAR(50),
                avatar_url TEXT,
                github_url TEXT,
                linkedin_url TEXT,
                resume_url TEXT,
                bio TEXT,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            -- Experience table
            CREATE TABLE IF NOT EXISTS experiences (
                id SERIAL PRIMARY KEY,
                title VARCHAR(200) NOT NULL,
                company VARCHAR(200) NOT NULL,
                start_date DATE,
                end_date DATE,
                is_current BOOLEAN DEFAULT FALSE,
                description TEXT,
                highlights TEXT[],
                tech_stack TEXT[],
                sort_order INT DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            -- Projects table
            CREATE TABLE IF NOT EXISTS projects (
                id SERIAL PRIMARY KEY,
                name VARCHAR(200) NOT NULL,
                description TEXT,
                category VARCHAR(50),
                thumbnail_url TEXT,
                demo_url TEXT,
                github_url TEXT,
                admin_notes TEXT,
                is_featured BOOLEAN DEFAULT FALSE,
                sort_order INT DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            -- Project images table
            CREATE TABLE IF NOT EXISTS project_images (
                id SERIAL PRIMARY KEY,
                project_id INT REFERENCES projects(id) ON DELETE CASCADE,
                image_url TEXT NOT NULL,
                caption VARCHAR(500),
                sort_order INT DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            -- Skills table
            CREATE TABLE IF NOT EXISTS skills (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                percent INT DEFAULT 0,
                category VARCHAR(50),
                sort_order INT DEFAULT 0
            );

            -- Tech stack table
            CREATE TABLE IF NOT EXISTS tech_stack (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                icon VARCHAR(50),
                sort_order INT DEFAULT 0
            );

            -- Certifications table
            CREATE TABLE IF NOT EXISTS certifications (
                id SERIAL PRIMARY KEY,
                name VARCHAR(300) NOT NULL,
                issuer VARCHAR(300),
                year VARCHAR(10),
                cert_url TEXT,
                sort_order INT DEFAULT 0
            );

            -- Activity log
            CREATE TABLE IF NOT EXISTS activity_log (
                id SERIAL PRIMARY KEY,
                action VARCHAR(100),
                details TEXT,
                user_id INT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            -- Project Deliveries table (งานส่งมอบ)
            CREATE TABLE IF NOT EXISTS deliveries (
                id SERIAL PRIMARY KEY,
                project_name VARCHAR(300) NOT NULL,
                contract_no VARCHAR(100),
                client VARCHAR(300),
                category VARCHAR(100),
                budget DECIMAL(15,2) DEFAULT 0,
                start_date DATE,
                end_date DATE,
                year INT,
                description TEXT,
                status VARCHAR(50) DEFAULT 'completed',
                sort_order INT DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            -- Delivery images table
            CREATE TABLE IF NOT EXISTS delivery_images (
                id SERIAL PRIMARY KEY,
                delivery_id INT REFERENCES deliveries(id) ON DELETE CASCADE,
                image_url TEXT NOT NULL,
                caption VARCHAR(500),
                sort_order INT DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            -- Site settings table
            CREATE TABLE IF NOT EXISTS site_settings (
                id SERIAL PRIMARY KEY,
                setting_key VARCHAR(100) UNIQUE NOT NULL,
                setting_value TEXT,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Insert default admin if not exists
        const adminExists = await client.query("SELECT * FROM users WHERE username = 'admin'");
        if (adminExists.rows.length === 0) {
            const hashedPassword = await bcrypt.hash('jarvis2024', 10);
            await client.query(
                "INSERT INTO users (username, password, role) VALUES ('admin', $1, 'admin')",
                [hashedPassword]
            );
        }

        // Insert default profile if not exists
        const profileExists = await client.query("SELECT * FROM profile LIMIT 1");
        if (profileExists.rows.length === 0) {
            await client.query(`
                INSERT INTO profile (name, name_th, role, location, experience, company, email, bio)
                VALUES (
                    'Autthapol Saiyat',
                    'อรรถพล ไสญาติ',
                    'Team Lead Developer & Forensic Tech Specialist',
                    'Bangkok, Thailand',
                    '16+ Years Experience',
                    'Sangwit Science Co., Ltd.',
                    'contact@example.com',
                    'ผู้นำทีมพัฒนาระบบเทคโนโลยีนิติวิทยาศาสตร์และฐานข้อมูลสำหรับสำนักงานตำรวจแห่งชาติ'
                )
            `);
        }

        // Insert default site settings if not exists
        const settingsExist = await client.query("SELECT * FROM site_settings LIMIT 1");
        if (settingsExist.rows.length === 0) {
            await client.query(`
                INSERT INTO site_settings (setting_key, setting_value) VALUES
                ('show_deliveries', 'true'),
                ('show_certifications', 'true'),
                ('show_skills', 'true'),
                ('show_projects', 'true'),
                ('show_experience', 'true')
            `);
        }

        console.log('Database initialized successfully');
    } catch (err) {
        console.error('Database init error:', err);
    } finally {
        client.release();
    }
}

// ==================== AUTH ROUTES ====================
app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
        
        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const user = result.rows[0];
        const validPassword = await bcrypt.compare(password, user.password);
        
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role },
            process.env.JWT_SECRET || 'jarvis-secret-key',
            { expiresIn: '24h' }
        );

        // Log activity
        await pool.query(
            'INSERT INTO activity_log (action, details, user_id) VALUES ($1, $2, $3)',
            ['LOGIN', 'User logged in', user.id]
        );

        res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/auth/change-password', authenticateToken, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const result = await pool.query('SELECT * FROM users WHERE id = $1', [req.user.id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const validPassword = await bcrypt.compare(currentPassword, result.rows[0].password);
        if (!validPassword) {
            return res.status(401).json({ error: 'Current password is incorrect' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await pool.query('UPDATE users SET password = $1 WHERE id = $2', [hashedPassword, req.user.id]);

        res.json({ message: 'Password changed successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==================== PROFILE ROUTES ====================
app.get('/api/profile', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM profile LIMIT 1');
        res.json(result.rows[0] || {});
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/profile', authenticateToken, async (req, res) => {
    try {
        const { name, name_th, role, location, experience, company, email, phone, bio, github_url, linkedin_url, avatar_url } = req.body;
        
        const result = await pool.query(`
            UPDATE profile SET 
                name = COALESCE($1, name),
                name_th = COALESCE($2, name_th),
                role = COALESCE($3, role),
                location = COALESCE($4, location),
                experience = COALESCE($5, experience),
                company = COALESCE($6, company),
                email = COALESCE($7, email),
                phone = COALESCE($8, phone),
                bio = COALESCE($9, bio),
                github_url = COALESCE($10, github_url),
                linkedin_url = COALESCE($11, linkedin_url),
                avatar_url = COALESCE($12, avatar_url),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = 1
            RETURNING *
        `, [name, name_th, role, location, experience, company, email, phone, bio, github_url, linkedin_url, avatar_url]);

        await pool.query(
            'INSERT INTO activity_log (action, details, user_id) VALUES ($1, $2, $3)',
            ['UPDATE_PROFILE', 'Profile updated', req.user.id]
        );

        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==================== EXPERIENCE ROUTES ====================
app.get('/api/experiences', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM experiences ORDER BY sort_order, start_date DESC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/experiences', authenticateToken, async (req, res) => {
    try {
        const { title, company, start_date, end_date, is_current, description, highlights, tech_stack } = req.body;
        
        const result = await pool.query(`
            INSERT INTO experiences (title, company, start_date, end_date, is_current, description, highlights, tech_stack)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *
        `, [title, company, start_date, end_date, is_current, description, highlights, tech_stack]);

        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/experiences/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { title, company, start_date, end_date, is_current, description, highlights, tech_stack, sort_order } = req.body;
        
        const result = await pool.query(`
            UPDATE experiences SET 
                title = COALESCE($1, title),
                company = COALESCE($2, company),
                start_date = COALESCE($3, start_date),
                end_date = $4,
                is_current = COALESCE($5, is_current),
                description = COALESCE($6, description),
                highlights = COALESCE($7, highlights),
                tech_stack = COALESCE($8, tech_stack),
                sort_order = COALESCE($9, sort_order)
            WHERE id = $10
            RETURNING *
        `, [title, company, start_date, end_date, is_current, description, highlights, tech_stack, sort_order, id]);

        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/experiences/:id', authenticateToken, async (req, res) => {
    try {
        await pool.query('DELETE FROM experiences WHERE id = $1', [req.params.id]);
        res.json({ message: 'Deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==================== PROJECTS ROUTES ====================
app.get('/api/projects', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT p.*, 
                   COALESCE(json_agg(
                       json_build_object('id', pi.id, 'image_url', pi.image_url, 'caption', pi.caption)
                       ORDER BY pi.sort_order
                   ) FILTER (WHERE pi.id IS NOT NULL), '[]') as images
            FROM projects p
            LEFT JOIN project_images pi ON p.id = pi.project_id
            GROUP BY p.id
            ORDER BY p.sort_order, p.created_at DESC
        `);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/projects', authenticateToken, async (req, res) => {
    try {
        const { name, description, category, is_featured, demo_url, github_url, admin_notes } = req.body;
        
        const result = await pool.query(`
            INSERT INTO projects (name, description, category, is_featured, demo_url, github_url, admin_notes)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
        `, [name, description, category, is_featured, demo_url, github_url, admin_notes]);

        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/projects/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, category, is_featured, sort_order, demo_url, github_url, admin_notes } = req.body;
        
        const result = await pool.query(`
            UPDATE projects SET 
                name = COALESCE($1, name),
                description = COALESCE($2, description),
                category = COALESCE($3, category),
                is_featured = COALESCE($4, is_featured),
                sort_order = COALESCE($5, sort_order),
                demo_url = COALESCE($6, demo_url),
                github_url = COALESCE($7, github_url),
                admin_notes = COALESCE($8, admin_notes)
            WHERE id = $9
            RETURNING *
        `, [name, description, category, is_featured, sort_order, demo_url, github_url, admin_notes, id]);

        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/projects/:id', authenticateToken, async (req, res) => {
    try {
        await pool.query('DELETE FROM projects WHERE id = $1', [req.params.id]);
        res.json({ message: 'Deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==================== IMAGE UPLOAD ====================
app.post('/api/upload', authenticateToken, upload.single('image'), async (req, res) => {
    try {
        console.log('Upload request received');
        console.log('File:', req.file ? req.file.originalname : 'No file');
        console.log('Project ID:', req.body.project_id);
        
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        let imageUrl;

        if (blobServiceClient) {
            console.log('Uploading to Azure Blob Storage...');
            // Upload to Azure Blob Storage
            const containerClient = blobServiceClient.getContainerClient(containerName);
            await containerClient.createIfNotExists({ access: 'blob' });

            const blobName = `${Date.now()}-${req.file.originalname}`;
            const blockBlobClient = containerClient.getBlockBlobClient(blobName);

            await blockBlobClient.upload(req.file.buffer, req.file.size, {
                blobHTTPHeaders: { blobContentType: req.file.mimetype }
            });

            imageUrl = blockBlobClient.url;
            console.log('Upload successful:', imageUrl);
        } else {
            console.log('No blob client, using base64');
            // Fallback to base64 for development
            imageUrl = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
        }

        // If project_id is provided, add to project_images
        if (req.body.project_id) {
            console.log('Saving to project_images table...');
            await pool.query(
                'INSERT INTO project_images (project_id, image_url, caption) VALUES ($1, $2, $3)',
                [req.body.project_id, imageUrl, req.body.caption || '']
            );

            // Update project thumbnail if first image
            const project = await pool.query('SELECT thumbnail_url FROM projects WHERE id = $1', [req.body.project_id]);
            if (!project.rows[0]?.thumbnail_url) {
                await pool.query('UPDATE projects SET thumbnail_url = $1 WHERE id = $2', [imageUrl, req.body.project_id]);
            }
            console.log('Database updated');
        }

        res.json({ url: imageUrl });
    } catch (err) {
        console.error('Upload error:', err);
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/images/:id', authenticateToken, async (req, res) => {
    try {
        await pool.query('DELETE FROM project_images WHERE id = $1', [req.params.id]);
        res.json({ message: 'Deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==================== SKILLS ROUTES ====================
app.get('/api/skills', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM skills ORDER BY sort_order, percent DESC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/skills', authenticateToken, async (req, res) => {
    try {
        const { name, percent, category } = req.body;
        const result = await pool.query(
            'INSERT INTO skills (name, percent, category) VALUES ($1, $2, $3) RETURNING *',
            [name, percent, category]
        );
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/skills/:id', authenticateToken, async (req, res) => {
    try {
        const { name, percent, category, sort_order } = req.body;
        const result = await pool.query(`
            UPDATE skills SET 
                name = COALESCE($1, name),
                percent = COALESCE($2, percent),
                category = COALESCE($3, category),
                sort_order = COALESCE($4, sort_order)
            WHERE id = $5
            RETURNING *
        `, [name, percent, category, sort_order, req.params.id]);
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/skills/:id', authenticateToken, async (req, res) => {
    try {
        await pool.query('DELETE FROM skills WHERE id = $1', [req.params.id]);
        res.json({ message: 'Deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==================== TECH STACK ROUTES ====================
app.get('/api/tech-stack', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM tech_stack ORDER BY sort_order');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/tech-stack', authenticateToken, async (req, res) => {
    try {
        const { name, icon } = req.body;
        const result = await pool.query(
            'INSERT INTO tech_stack (name, icon) VALUES ($1, $2) RETURNING *',
            [name, icon]
        );
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/tech-stack/:id', authenticateToken, async (req, res) => {
    try {
        await pool.query('DELETE FROM tech_stack WHERE id = $1', [req.params.id]);
        res.json({ message: 'Deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==================== CERTIFICATIONS ROUTES ====================
app.get('/api/certifications', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM certifications ORDER BY sort_order, year DESC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/certifications', authenticateToken, async (req, res) => {
    try {
        const { name, issuer, year, cert_url } = req.body;
        const result = await pool.query(
            'INSERT INTO certifications (name, issuer, year, cert_url) VALUES ($1, $2, $3, $4) RETURNING *',
            [name, issuer, year, cert_url]
        );
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/certifications/:id', authenticateToken, async (req, res) => {
    try {
        const { name, issuer, year, cert_url, sort_order } = req.body;
        const result = await pool.query(`
            UPDATE certifications SET 
                name = COALESCE($1, name),
                issuer = COALESCE($2, issuer),
                year = COALESCE($3, year),
                cert_url = COALESCE($4, cert_url),
                sort_order = COALESCE($5, sort_order)
            WHERE id = $6
            RETURNING *
        `, [name, issuer, year, cert_url, sort_order, req.params.id]);
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/certifications/:id', authenticateToken, async (req, res) => {
    try {
        await pool.query('DELETE FROM certifications WHERE id = $1', [req.params.id]);
        res.json({ message: 'Deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==================== ACTIVITY LOG ====================
app.get('/api/activity-log', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM activity_log ORDER BY created_at DESC LIMIT 50'
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==================== STATS ====================
app.get('/api/stats', async (req, res) => {
    try {
        const projects = await pool.query('SELECT COUNT(*) FROM projects');
        const skills = await pool.query('SELECT COUNT(*) FROM skills');
        const certs = await pool.query('SELECT COUNT(*) FROM certifications');
        const images = await pool.query('SELECT COUNT(*) FROM project_images');

        res.json({
            projects: parseInt(projects.rows[0].count),
            skills: parseInt(skills.rows[0].count),
            certifications: parseInt(certs.rows[0].count),
            images: parseInt(images.rows[0].count)
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==================== ALL DATA (for frontend) ====================
app.get('/api/portfolio', async (req, res) => {
    try {
        const [profile, experiences, projects, skills, techStack, certifications, deliveries, settingsResult] = await Promise.all([
            pool.query('SELECT * FROM profile LIMIT 1'),
            pool.query('SELECT * FROM experiences ORDER BY sort_order, start_date DESC'),
            pool.query(`
                SELECT p.*, 
                       COALESCE(json_agg(
                           json_build_object('id', pi.id, 'image_url', pi.image_url, 'caption', pi.caption)
                           ORDER BY pi.sort_order
                       ) FILTER (WHERE pi.id IS NOT NULL), '[]') as images
                FROM projects p
                LEFT JOIN project_images pi ON p.id = pi.project_id
                GROUP BY p.id
                ORDER BY p.sort_order, p.created_at DESC
            `),
            pool.query('SELECT * FROM skills ORDER BY sort_order, percent DESC'),
            pool.query('SELECT * FROM tech_stack ORDER BY sort_order'),
            pool.query('SELECT * FROM certifications ORDER BY sort_order, year DESC'),
            pool.query(`
                SELECT d.*, 
                       COALESCE(json_agg(
                           json_build_object('id', di.id, 'image_url', di.image_url, 'caption', di.caption)
                           ORDER BY di.sort_order
                       ) FILTER (WHERE di.id IS NOT NULL), '[]') as images
                FROM deliveries d
                LEFT JOIN delivery_images di ON d.id = di.delivery_id
                GROUP BY d.id
                ORDER BY d.year DESC, d.sort_order
            `),
            pool.query('SELECT setting_key, setting_value FROM site_settings')
        ]);

        // Parse settings
        const settings = {};
        settingsResult.rows.forEach(row => {
            settings[row.setting_key] = row.setting_value === 'true';
        });

        // Calculate delivery stats
        const deliveryStats = {
            totalBudget: deliveries.rows.reduce((sum, d) => sum + parseFloat(d.budget || 0), 0),
            totalProjects: deliveries.rows.length,
            years: deliveries.rows.length > 0 ? {
                min: Math.min(...deliveries.rows.map(d => d.year).filter(y => y)),
                max: Math.max(...deliveries.rows.map(d => d.year).filter(y => y))
            } : null
        };

        res.json({
            profile: profile.rows[0] || {},
            experiences: experiences.rows,
            projects: projects.rows,
            skills: skills.rows,
            techStack: techStack.rows,
            certifications: certifications.rows,
            deliveries: deliveries.rows,
            deliveryStats,
            settings
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==================== CERTIFICATE FILE UPLOAD ====================
app.post('/api/certifications/:id/upload', authenticateToken, upload.single('cert_file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        let fileUrl;

        if (blobServiceClient) {
            // Upload to Azure Blob Storage
            const containerClient = blobServiceClient.getContainerClient('certificates');
            await containerClient.createIfNotExists({ access: 'blob' });

            const blobName = `cert-${Date.now()}-${req.file.originalname}`;
            const blockBlobClient = containerClient.getBlockBlobClient(blobName);

            await blockBlobClient.upload(req.file.buffer, req.file.size, {
                blobHTTPHeaders: { blobContentType: req.file.mimetype }
            });

            fileUrl = blockBlobClient.url;
        } else {
            // Fallback to base64 for development
            fileUrl = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
        }

        // Update certification with file URL
        await pool.query('UPDATE certifications SET cert_url = $1 WHERE id = $2', [fileUrl, req.params.id]);

        // Log activity
        await pool.query(
            'INSERT INTO activity_log (action, details, user_id) VALUES ($1, $2, $3)',
            ['UPLOAD_CERT', `Certificate file uploaded for cert ID: ${req.params.id}`, req.user.id]
        );

        res.json({ url: fileUrl });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==================== DELIVERIES ROUTES ====================
app.get('/api/deliveries', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT d.*, 
                   COALESCE(json_agg(
                       json_build_object('id', di.id, 'image_url', di.image_url, 'caption', di.caption)
                       ORDER BY di.sort_order
                   ) FILTER (WHERE di.id IS NOT NULL), '[]') as images
            FROM deliveries d
            LEFT JOIN delivery_images di ON d.id = di.delivery_id
            GROUP BY d.id
            ORDER BY d.year DESC, d.sort_order
        `);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/deliveries', authenticateToken, async (req, res) => {
    try {
        const { project_name, contract_no, client, category, budget, start_date, end_date, year, description, status, sort_order } = req.body;
        const result = await pool.query(`
            INSERT INTO deliveries (project_name, contract_no, client, category, budget, start_date, end_date, year, description, status, sort_order)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING *
        `, [project_name, contract_no, client, category, budget || 0, start_date, end_date, year, description, status || 'completed', sort_order || 0]);

        await pool.query(
            'INSERT INTO activity_log (action, details, user_id) VALUES ($1, $2, $3)',
            ['CREATE_DELIVERY', `Created delivery: ${project_name}`, req.user.id]
        );

        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/deliveries/:id', authenticateToken, async (req, res) => {
    try {
        const { project_name, contract_no, client, category, budget, start_date, end_date, year, description, status, sort_order } = req.body;
        const result = await pool.query(`
            UPDATE deliveries SET
                project_name = COALESCE($1, project_name),
                contract_no = COALESCE($2, contract_no),
                client = COALESCE($3, client),
                category = COALESCE($4, category),
                budget = COALESCE($5, budget),
                start_date = COALESCE($6, start_date),
                end_date = COALESCE($7, end_date),
                year = COALESCE($8, year),
                description = COALESCE($9, description),
                status = COALESCE($10, status),
                sort_order = COALESCE($11, sort_order)
            WHERE id = $12
            RETURNING *
        `, [project_name, contract_no, client, category, budget, start_date, end_date, year, description, status, sort_order, req.params.id]);

        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/deliveries/:id', authenticateToken, async (req, res) => {
    try {
        await pool.query('DELETE FROM deliveries WHERE id = $1', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Delivery image upload
app.post('/api/deliveries/:id/images', authenticateToken, upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        let imageUrl;

        if (blobServiceClient) {
            const containerClient = blobServiceClient.getContainerClient('delivery-images');
            await containerClient.createIfNotExists({ access: 'blob' });

            const blobName = `delivery-${Date.now()}-${req.file.originalname}`;
            const blockBlobClient = containerClient.getBlockBlobClient(blobName);

            await blockBlobClient.upload(req.file.buffer, req.file.size, {
                blobHTTPHeaders: { blobContentType: req.file.mimetype }
            });

            imageUrl = blockBlobClient.url;
        } else {
            imageUrl = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
        }

        const result = await pool.query(
            'INSERT INTO delivery_images (delivery_id, image_url, caption) VALUES ($1, $2, $3) RETURNING *',
            [req.params.id, imageUrl, req.body.caption || '']
        );

        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/delivery-images/:id', authenticateToken, async (req, res) => {
    try {
        await pool.query('DELETE FROM delivery_images WHERE id = $1', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==================== SITE SETTINGS ====================
app.get('/api/settings', async (req, res) => {
    try {
        const result = await pool.query('SELECT setting_key, setting_value FROM site_settings');
        const settings = {};
        result.rows.forEach(row => {
            settings[row.setting_key] = row.setting_value;
        });
        res.json(settings);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/settings', authenticateToken, async (req, res) => {
    try {
        const settings = req.body;
        
        for (const [key, value] of Object.entries(settings)) {
            await pool.query(`
                INSERT INTO site_settings (setting_key, setting_value, updated_at)
                VALUES ($1, $2, CURRENT_TIMESTAMP)
                ON CONFLICT (setting_key) 
                DO UPDATE SET setting_value = $2, updated_at = CURRENT_TIMESTAMP
            `, [key, value]);
        }
        
        // Log activity
        await pool.query(
            'INSERT INTO activity_log (action, details, user_id) VALUES ($1, $2, $3)',
            ['UPDATE_SETTINGS', `Updated settings: ${Object.keys(settings).join(', ')}`, req.user.id]
        );
        
        res.json({ success: true, settings });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, async () => {
    console.log(`🚀 JARVIS API Server running on port ${PORT}`);
    await initDatabase();
});

module.exports = app;
