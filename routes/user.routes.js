const express = require("express");
const router = express.Router();
const QRCode = require('qrcode');
const os = require('os');
const pool = require('../config/db');
const { renderResultsPage } = require("../controller/admin.controller");

function getLocalIp() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const net of interfaces[name]) {
            if (net.family === 'IPv4' && !net.internal) {
                return net.address;
            }
        }
    }
    return 'localhost';
}

router.get("/", async (req, res) => {
    try {
        const countdownResult = await pool.query('SELECT target_time, duration, countdown_status FROM settings ORDER BY id DESC LIMIT 1');
        const countdown = countdownResult.rows.length > 0 ? countdownResult.rows[0] : { target_time: null, duration: "00:00:00", countdown_status: 'stopped' };

        const ip = getLocalIp();
        const PORT = process.env.PORT || 3000;
        const targetUrl = `http://${ip}:${PORT}/index`; 
        
        const qrDataUrl = await QRCode.toDataURL(targetUrl, {
            width: 250,
            margin: 2,
            color: { dark: '#0066ff', light: '#ffffff' }
        });

        res.render('qr_view', { qrCode: qrDataUrl, countdown });
    } catch (err) {
        console.error("QR Generation Error:", err);
        res.status(500).send('Error generating QR code');
    }
});

router.get("/index", async (req, res) => {
    try {
        const result = await pool.query('SELECT target_time, duration, countdown_status FROM settings ORDER BY id DESC LIMIT 1');
        const countdown = result.rows.length > 0 ? result.rows[0] : { target_time: null, duration: "00:00:00", countdown_status: 'stopped' };
        
        res.render('index', { countdown }); 
    } catch (err) {
        console.error(err);
        res.render('index', { countdown: { target_time: null, duration: "00:00:00", countdown_status: 'stopped' } });
    }
});

router.get("/home", async (req, res) => {
    try {
        const countdownResult = await pool.query('SELECT target_time, duration, countdown_status FROM settings ORDER BY id DESC LIMIT 1');
        const countdown = countdownResult.rows.length > 0 ? countdownResult.rows[0] : { target_time: null, duration: "00:00:00", countdown_status: 'stopped' };
        
        res.render('home', { countdown });
    } catch (err) {
        console.error(err);
        res.render('home', { countdown: { target_time: null, duration: "00:00:00", countdown_status: 'stopped' } });
    }
});

router.get("/api/countdown", async (req, res) => {
    try {
        const result = await pool.query('SELECT target_time, duration, countdown_status FROM settings ORDER BY id DESC LIMIT 1');
        const countdown = result.rows.length > 0 ? result.rows[0] : { 
            target_time: null, 
            duration: "00:00:00", 
            countdown_status: 'stopped' 
        };
        
        res.json(countdown);
    } catch (err) {
        console.error("Error fetching countdown API:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

router.get("/results", renderResultsPage);

module.exports = router;