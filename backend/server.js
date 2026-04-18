
//  ProConnect — Express Server
//  Run:  node server.js   (or: npm run dev  for nodemon)


const express   = require('express');
const cors      = require('cors');
const http      = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const app    = express();
const server = http.createServer(app);
const io     = new Server(server, {
    cors: { origin: '*', methods: ['GET', 'POST'] }
});

const PORT = process.env.PORT || 3000;

// Allow cross-origin requests
app.use(cors());

// Parse JSON request bodies
app.use(express.json());

// Serve frontend HTML files from the frontend folder
const path = require('path');
app.use(express.static(path.join(__dirname, '../frontend')));

// DB connection check (runs on import)
const db = require('./config/db');

// ---- Phase 2A Routes ----------------------------------------
const profileRoutes     = require('./routes/profiles');
const postRoutes        = require('./routes/posts');
const connectionRoutes  = require('./routes/connections');

app.use('/api/profiles',    profileRoutes);
app.use('/api/posts',       postRoutes);
app.use('/api/connections', connectionRoutes);

// ---- Phase 2B Routes ----------------------------------------
const authRoutes    = require('./routes/auth');
const skillRoutes   = require('./routes/skills');
const messageRoutes = require('./routes/messages');
const adminRoutes   = require('./routes/admin');

app.use('/api/auth',     authRoutes);
app.use('/api/skills',   skillRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/admin',    adminRoutes);

// ---- Health check -------------------------------------------
app.get('/api', (req, res) => {
    res.json({ message: 'ProConnect API is running ✅' });
});

// ---- Socket.io — Real-time chat -----------------------------
// Map userId -> socketId so we can send to specific users
const onlineUsers = new Map(); // userId -> socketId

io.on('connection', (socket) => {
    // Client registers their userId after connecting
    socket.on('register', (userId) => {
        onlineUsers.set(String(userId), socket.id);
        socket.userId = String(userId);
    });

    // Client sends a chat message
    socket.on('chat_message', async ({ to, content, token }) => {
        try {
            // Verify token to get sender id
            const jwt = require('jsonwebtoken');
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'proconnect_secret_key');
            const senderId = decoded.id;

            if (!content || !to) return;
            if (String(senderId) === String(to)) return;

            // Save message to DB
            const [result] = await db.query(
                'INSERT INTO messages (sender_id, receiver_id, content) VALUES (?, ?, ?)',
                [senderId, to, content]
            );

            // Fetch sender name for display
            const [senderRows] = await db.query(
                'SELECT id, name, job_title FROM profiles WHERE id = ?', [senderId]
            );
            const sender = senderRows[0];

            const msgData = {
                id:          result.insertId,
                sender_id:   senderId,
                sender_name: sender.name,
                receiver_id: parseInt(to),
                content,
                sent_at:     new Date().toISOString()
            };

            // Send to receiver if online
            const receiverSocket = onlineUsers.get(String(to));
            if (receiverSocket) {
                io.to(receiverSocket).emit('new_message', msgData);
            }

            // Echo back to sender
            socket.emit('new_message', msgData);

        } catch (err) {
            socket.emit('chat_error', { error: err.message });
        }
    });

    socket.on('disconnect', () => {
        if (socket.userId) {
            onlineUsers.delete(socket.userId);
        }
    });
});

// ---- Start server -------------------------------------------
server.listen(PORT, () => {
    console.log(`🚀  Server running at http://localhost:${PORT}`);
});

module.exports = app;
