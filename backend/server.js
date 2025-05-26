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

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('find_partner', () => {
    if (waitingUser && waitingUser !== socket.id) {
      // Pair the users
      const partnerId = waitingUser;
      waitingUser = null;
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
  });

  socket.on('disconnect', () => {
    if (waitingUser === socket.id) {
      waitingUser = null;
    }
    io.emit('partner_disconnected', { id: socket.id });
    console.log('User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 