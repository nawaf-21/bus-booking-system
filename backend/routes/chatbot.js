const express = require('express');
const router = express.Router();
const chatbotController = require('../controllers/chatbotController');

// Simple limit so nobody can use up the AI key: 20 messages per 10 minutes per address
const WINDOW_MS = 10 * 60 * 1000;
const MAX_MESSAGES = 20;
const recent = new Map();

const limitMessages = (req, res, next) => {
    const now = Date.now();
    const times = (recent.get(req.ip) || []).filter(time => now - time < WINDOW_MS);

    if (times.length >= MAX_MESSAGES) {
        return res.status(429).json({ error: 'Too many messages. Please wait a few minutes and try again.' });
    }

    times.push(now);
    recent.set(req.ip, times);
    next();
};

router.post('/chat', limitMessages, chatbotController.chat);

module.exports = router;
