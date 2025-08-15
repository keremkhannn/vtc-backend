# VTC Backend API

TruckersHub API entegrasyonu ile VTC (Virtual Trucking Company) yönetim sistemi backend'i.

## 🚀 Özellikler

- **Real-time veri akışı** - TruckersHub WebSocket API
- **MySQL veritabanı** entegrasyonu
- **RESTful API** endpoint'leri
- **CORS** desteği
- **Vercel** deployment

## 📋 Gereksinimler

- Node.js >= 18.0.0
- MySQL veritabanı
- TruckersHub VTC hesabı

## 🛠️ Kurulum

### 1. Dependencies Kurulumu
```bash
npm install
```

### 2. Environment Variables
`.env` dosyası oluşturun:
```env
DB_HOST=localhost
DB_USER=your_mysql_username
DB_PASSWORD=your_mysql_password
DB_NAME=your_database_name
VTC_ID=your_vtc_id
PORT=3000
```

### 3. Veritabanı Tabloları
MySQL'de aşağıdaki tabloları oluşturun:

```sql
CREATE TABLE player_data (
    id INT AUTO_INCREMENT PRIMARY KEY,
    driver VARCHAR(100),
    game VARCHAR(50),
    telemetry JSON,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    message_type VARCHAR(50)
);

CREATE TABLE player_status (
    id INT AUTO_INCREMENT PRIMARY KEY,
    driver VARCHAR(100),
    game VARCHAR(50),
    status ENUM('online', 'offline'),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE events (
    id INT AUTO_INCREMENT PRIMARY KEY,
    type VARCHAR(100),
    driver VARCHAR(100),
    game VARCHAR(50),
    details JSON,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 4. Uygulamayı Başlatın
```bash
# Development
npm run dev

# Production
npm start
```

## 🔌 API Endpoint'leri

### Health Check
```
GET /
GET /api/health
```

### Sürücü Yönetimi
```
GET /api/drivers
```

### Teslimat Geçmişi
```
GET /api/deliveries?driver=DRIVER_NAME&limit=50
```

### Gerçek Zamanlı Durum
```
GET /api/status
```

## 🚀 Deployment

### Vercel
1. GitHub repository'yi Vercel'e bağlayın
2. Environment variables'ları Vercel'de ayarlayın
3. Deploy edin

## 📊 Veri Yapısı

### Player Data
```json
{
  "driver": "string",
  "game": "string",
  "telemetry": {
    "cargo": "string",
    "source": "string",
    "destination": "string",
    "distance": "number"
  },
  "timestamp": "date",
  "message_type": "string"
}
```

## 🔧 Geliştirme

### Local Development
```bash
npm run dev
```

### Production Build
```bash
npm start
```

## 📝 Lisans

MIT License

## 🤝 Katkıda Bulunma

1. Fork edin
2. Feature branch oluşturun
3. Commit edin
4. Push edin
5. Pull Request oluşturun
