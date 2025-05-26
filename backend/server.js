const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');

const app = express();
app.use(cors());

// Mock topic of the day
const topicOfTheDay = 'Is AI going to change the world for better or worse?';

app.get('/topic', (req, res) => {
  res.json({ topic: topicOfTheDay });
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Matchmaking queue
let waitingUser = null;
const partners = {}; // socket.id -> partnerId

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('find_partner', () => {
    if (waitingUser && waitingUser !== socket.id) {
      const partnerId = waitingUser;
      waitingUser = null;
      partners[socket.id] = partnerId;
      partners[partnerId] = socket.id;
      socket.emit('partner_found', { partnerId });
      io.to(partnerId).emit('partner_found', { partnerId: socket.id });
    } else {
      waitingUser = socket.id;
    }
  });

  // WebRTC signaling relay
  socket.on('signal', ({ to, data }) => {
    io.to(to).emit('signal', { from: socket.id, data });
  });

  // Handle leave_call event
  socket.on('leave_call', ({ to }) => {
    io.to(to).emit('force_disconnect');
    // Clean up partners mapping
    delete partners[socket.id];
    delete partners[to];
  });

  socket.on('disconnect', () => {
    if (waitingUser === socket.id) {
      waitingUser = null;
    }
    const partnerId = partners[socket.id];
    if (partnerId) {
      io.to(partnerId).emit('partner_disconnected', { id: socket.id });
      delete partners[partnerId];
      delete partners[socket.id];
    }
    console.log('User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 