# 🔷 J.A.R.V.I.S. Portfolio System

ระบบ Portfolio ธีม Iron Man JARVIS พร้อม Admin Panel สำหรับจัดการข้อมูล

![JARVIS UI](https://img.shields.io/badge/Theme-JARVIS%20UI-00d4ff)
![Azure](https://img.shields.io/badge/Cloud-Azure-0078d4)
![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL-336791)

## 📁 โครงสร้างโปรเจกต์

```
jarvis-portfolio/
├── frontend/           # หน้าเว็บ Portfolio (Public)
│   ├── index.html
│   └── staticwebapp.config.json
├── admin/              # หน้า Admin Panel (Private)
│   ├── index.html
│   └── staticwebapp.config.json
├── backend/            # API Server (Node.js + Express)
│   ├── server.js
│   ├── package.json
│   └── .env.example
└── .github/
    └── workflows/
        └── deploy.yml  # CI/CD Pipeline
```

## 🚀 ขั้นตอนการ Deploy บน Azure

### 1️⃣ สร้าง Azure Resources

#### 1.1 สร้าง Resource Group
```bash
az group create --name rg-jarvis-portfolio --location southeastasia
```

#### 1.2 สร้าง PostgreSQL Database
```bash
# สร้าง PostgreSQL Flexible Server
az postgres flexible-server create \
  --resource-group rg-jarvis-portfolio \
  --name jarvis-postgres \
  --location southeastasia \
  --admin-user jarvisadmin \
  --admin-password <YOUR_STRONG_PASSWORD> \
  --sku-name Standard_B1ms \
  --tier Burstable \
  --storage-size 32

# สร้าง Database
az postgres flexible-server db create \
  --resource-group rg-jarvis-portfolio \
  --server-name jarvis-postgres \
  --database-name jarvis_portfolio

# เปิด Firewall (Allow Azure Services)
az postgres flexible-server firewall-rule create \
  --resource-group rg-jarvis-portfolio \
  --name jarvis-postgres \
  --rule-name AllowAzure \
  --start-ip-address 0.0.0.0 \
  --end-ip-address 0.0.0.0
```

#### 1.3 สร้าง Azure Storage Account (สำหรับเก็บรูปภาพ)
```bash
az storage account create \
  --name jarvisportfoliostorage \
  --resource-group rg-jarvis-portfolio \
  --location southeastasia \
  --sku Standard_LRS

# เก็บ Connection String
az storage account show-connection-string \
  --name jarvisportfoliostorage \
  --resource-group rg-jarvis-portfolio \
  --query connectionString -o tsv
```

#### 1.4 สร้าง Azure App Service (Backend API)
```bash
# สร้าง App Service Plan
az appservice plan create \
  --name jarvis-api-plan \
  --resource-group rg-jarvis-portfolio \
  --sku B1 \
  --is-linux

# สร้าง Web App
az webapp create \
  --resource-group rg-jarvis-portfolio \
  --plan jarvis-api-plan \
  --name jarvis-portfolio-api \
  --runtime "NODE|18-lts"

# ตั้งค่า Environment Variables
az webapp config appsettings set \
  --resource-group rg-jarvis-portfolio \
  --name jarvis-portfolio-api \
  --settings \
    DATABASE_URL="postgresql://jarvisadmin:<PASSWORD>@jarvis-postgres.postgres.database.azure.com:5432/jarvis_portfolio?sslmode=require" \
    AZURE_STORAGE_CONNECTION_STRING="<STORAGE_CONNECTION_STRING>" \
    JWT_SECRET="<YOUR_JWT_SECRET>" \
    NODE_ENV="production" \
    FRONTEND_URL="https://<YOUR_FRONTEND_URL>.azurestaticapps.net"
```

#### 1.5 สร้าง Azure Static Web Apps (Frontend & Admin)
```bash
# Frontend
az staticwebapp create \
  --name jarvis-portfolio-frontend \
  --resource-group rg-jarvis-portfolio \
  --location southeastasia

# Admin
az staticwebapp create \
  --name jarvis-portfolio-admin \
  --resource-group rg-jarvis-portfolio \
  --location southeastasia
```

### 2️⃣ ตั้งค่า GitHub Secrets

เข้าไปที่ Repository Settings → Secrets and variables → Actions แล้วเพิ่ม:

| Secret Name | Description |
|-------------|-------------|
| `AZURE_WEBAPP_PUBLISH_PROFILE` | Download จาก Azure App Service → Get publish profile |
| `AZURE_STATIC_WEB_APPS_API_TOKEN_FRONTEND` | จาก Azure Static Web App (Frontend) → Manage deployment token |
| `AZURE_STATIC_WEB_APPS_API_TOKEN_ADMIN` | จาก Azure Static Web App (Admin) → Manage deployment token |

### 3️⃣ Push ไป GitHub

```bash
# Initialize git
cd jarvis-portfolio
git init
git add .
git commit -m "Initial commit - JARVIS Portfolio System"

# สร้าง repo บน GitHub แล้ว push
git remote add origin https://github.com/<YOUR_USERNAME>/jarvis-portfolio.git
git branch -M main
git push -u origin main
```

### 4️⃣ ตรวจสอบ Deployment

- GitHub Actions จะ trigger อัตโนมัติ
- ดู progress ที่ tab Actions
- เมื่อเสร็จแล้วจะได้ URLs:
  - **Frontend**: `https://jarvis-portfolio-frontend.azurestaticapps.net`
  - **Admin**: `https://jarvis-portfolio-admin.azurestaticapps.net`
  - **API**: `https://jarvis-portfolio-api.azurewebsites.net`

## 🔐 การเข้าใช้งาน Admin Panel

```
URL: https://jarvis-portfolio-admin.azurestaticapps.net
Username: admin
Password: jarvis2024 (เปลี่ยนหลัง login ครั้งแรก!)
```

## 📊 Features

### Frontend (Public)
- ✅ หน้า Portfolio แบบ JARVIS UI
- ✅ Responsive (Mobile/Tablet/Desktop)
- ✅ Project Gallery + Lightbox
- ✅ Skills Matrix
- ✅ Experience Timeline
- ✅ Certifications
- ✅ Animations & Sound Effects

### Admin Panel (Private)
- ✅ Dashboard Overview
- ✅ Profile Management
- ✅ Experience CRUD
- ✅ Projects CRUD
- ✅ Skills CRUD
- ✅ Certifications CRUD
- ✅ Image Upload (Azure Blob Storage)
- ✅ Activity Log
- ✅ Password Management

### Backend API
- ✅ RESTful API
- ✅ JWT Authentication
- ✅ PostgreSQL Database
- ✅ Azure Blob Storage Integration
- ✅ Auto Database Migration

## 🔧 Local Development

```bash
# Backend
cd backend
cp .env.example .env
# แก้ไข .env ใส่ค่าที่ถูกต้อง
npm install
npm run dev

# Frontend - เปิด index.html ใน browser
# หรือใช้ Live Server extension ใน VS Code

# Admin - เปิด admin/index.html ใน browser
```

## 📝 API Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/portfolio` | Get all data | No |
| GET | `/api/profile` | Get profile | No |
| PUT | `/api/profile` | Update profile | Yes |
| GET | `/api/experiences` | List experiences | No |
| POST | `/api/experiences` | Add experience | Yes |
| PUT | `/api/experiences/:id` | Update experience | Yes |
| DELETE | `/api/experiences/:id` | Delete experience | Yes |
| GET | `/api/projects` | List projects | No |
| POST | `/api/projects` | Add project | Yes |
| PUT | `/api/projects/:id` | Update project | Yes |
| DELETE | `/api/projects/:id` | Delete project | Yes |
| POST | `/api/upload` | Upload image | Yes |
| GET | `/api/skills` | List skills | No |
| POST | `/api/skills` | Add skill | Yes |
| GET | `/api/certifications` | List certs | No |
| POST | `/api/certifications` | Add cert | Yes |
| POST | `/api/auth/login` | Login | No |
| POST | `/api/auth/change-password` | Change password | Yes |

## 💰 Azure Cost Estimate (ต่อเดือน)

| Service | SKU | Est. Cost |
|---------|-----|-----------|
| PostgreSQL Flexible | Standard_B1ms | ~$15 |
| App Service | B1 | ~$13 |
| Static Web Apps x2 | Free | $0 |
| Storage Account | Standard_LRS | ~$1 |
| **Total** | | **~$29/month** |

## 🛡️ Security Checklist

- [ ] เปลี่ยน Admin Password หลัง deploy
- [ ] ใช้ Strong JWT Secret
- [ ] เปิด HTTPS Only
- [ ] ตั้งค่า CORS ให้ถูกต้อง
- [ ] Enable Azure Defender (optional)
- [ ] Setup Backup Policy สำหรับ PostgreSQL

## 📞 Support

หากมีปัญหาหรือข้อสงสัย สามารถสร้าง Issue ได้ที่ GitHub Repository

---

**Built with 💙 by Autthapol Saiyat | Powered by Azure**
