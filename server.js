// server.js
require('dotenv').config();
const express = require('express');
const WebSocket = require('ws');
const cors = require('cors');
const mysql = require('mysql2/promise');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// MySQL bağlantısı
const createConnection = async () => {
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });
        console.log('MySQL bağlantısı başarılı!');
        return connection;
    } catch (error) {
        console.error('MySQL bağlantı hatası:', error);
        return null;
    }
};

// TruckersHub WebSocket bağlantısı (sadece local development)
const connectToTruckersHub = async () => {
    // Vercel'de WebSocket çalışmaz, sadece local'de çalışsın
    if (process.env.NODE_ENV === 'production') {
        console.log('WebSocket bağlantısı Vercel\'de desteklenmiyor');
        return;
    }
    
    try {
        const ws = new WebSocket('wss://gateway.truckershub.in/');
        
        ws.on('open', () => {
            console.log('TruckersHub WebSocket bağlantısı açıldı');
            
            // VTC'ye abone ol
            ws.send(JSON.stringify({
                type: "AUTH",
                data: {
                    subscribe_to: { 
                        to_company: parseInt(process.env.VTC_ID) 
                    },
                    game: "ets2"
                }
            }));
        });
        
        ws.on('message', async (data) => {
            try {
                const message = JSON.parse(data);
                console.log('Gelen veri:', message.type);
                
                // Veriyi database'e kaydet
                await saveToDatabase(message);
            } catch (error) {
                console.error('Veri işleme hatası:', error);
            }
        });
        
        ws.on('error', (error) => {
            console.error('WebSocket hatası:', error);
        });
        
        ws.on('close', () => {
            console.log('WebSocket bağlantısı kapandı, 5 saniye sonra yeniden bağlanılıyor...');
            setTimeout(connectToTruckersHub, 5000);
        });
    } catch (error) {
        console.error('WebSocket bağlantı hatası:', error);
    }
};

// Veriyi database'e kaydet
const saveToDatabase = async (message) => {
    try {
        const connection = await createConnection();
        if (!connection) return;
        
        const timestamp = new Date();
        
        switch (message.type) {
            case 'PLAYER_DATA':
                await connection.execute(
                    'INSERT INTO player_data (driver, game, telemetry, timestamp, message_type) VALUES (?, ?, ?, ?, ?)',
                    [message.data.driver, message.data.game, JSON.stringify(message.data.telemetry), timestamp, message.type]
                );
                break;
                
            case 'PLAYER_ONLINE':
                await connection.execute(
                    'INSERT INTO player_status (driver, game, status, timestamp) VALUES (?, ?, ?, ?)',
                    [message.data.driver, message.data.game, 'online', timestamp]
                );
                break;
                
            case 'PLAYER_OFFLINE':
                await connection.execute(
                    'INSERT INTO player_status (driver, game, status, timestamp) VALUES (?, ?, ?, ?, ?)',
                    [message.data.driver, message.data.game, 'offline', timestamp]
                );
                break;
                
            case 'NEW_EVENT':
                await connection.execute(
                    'INSERT INTO events (type, driver, game, details, timestamp) VALUES (?, ?, ?, ?, ?)',
                    [message.data.type, message.data.driver, message.data.game, JSON.stringify(message.data.details), timestamp]
                );
                break;
        }
        
        await connection.end();
        console.log(`${message.type} verisi kaydedildi`);
    } catch (error) {
        console.error('Database kayıt hatası:', error);
    }
};

// API Endpoint'leri
app.get('/', (req, res) => {
    res.json({ 
        message: 'VTC Backend API çalışıyor!', 
        status: 'OK',
        timestamp: new Date()
    });
});

app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        message: 'VTC Backend çalışıyor!',
        timestamp: new Date()
    });
});

// Sürücü listesi
app.get('/api/drivers', async (req, res) => {
    try {
        const connection = await createConnection();
        if (!connection) {
            return res.status(500).json({ error: 'Database bağlantısı kurulamadı' });
        }
        
        const [rows] = await connection.execute(`
            SELECT 
                driver,
                MAX(timestamp) as last_seen,
                COUNT(*) as total_records,
                MAX(telemetry) as last_telemetry
            FROM player_data 
            GROUP BY driver 
            ORDER BY last_seen DESC
        `);
        
        await connection.end();
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: 'Sürücü listesi alınamadı' });
    }
});

// Teslimat geçmişi
app.get('/api/deliveries', async (req, res) => {
    try {
        const { driver, limit = 50 } = req.query;
        const connection = await createConnection();
        if (!connection) {
            return res.status(500).json({ error: 'Database bağlantısı kurulamadı' });
        }
        
        let query = 'SELECT * FROM player_data WHERE 1=1';
        let params = [];
        
        if (driver) {
            query += ' AND driver = ?';
            params.push(driver);
        }
        
        query += ' ORDER BY timestamp DESC LIMIT ?';
        params.push(parseInt(limit));
        
        const [rows] = await connection.execute(query, params);
        await connection.end();
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: 'Teslimat geçmişi alınamadı' });
    }
});

// Gerçek zamanlı durum
app.get('/api/status', async (req, res) => {
    try {
        const connection = await createConnection();
        if (!connection) {
            return res.status(500).json({ error: 'Database bağlantısı kurulamadı' });
        }
        
        const [rows] = await connection.execute(`
            SELECT * FROM player_status 
            WHERE status = 'online' 
            ORDER BY timestamp DESC 
            LIMIT 100
        `);
        
        await connection.end();
        res.json({ 
            onlineCount: rows.length,
            lastUpdate: new Date(),
            drivers: rows
        });
    } catch (error) {
        res.status(500).json({ error: 'Durum bilgisi alınamadı' });
    }
});

// Vercel için export (serverless functions) - Updated
module.exports = app;

// Local development için server başlat
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`Server ${PORT} portunda çalışıyor`);
        // WebSocket sadece local'de çalışsın
        connectToTruckersHub();
    });
}
