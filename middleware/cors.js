// const cors = require('cors');
// const allowedOrigins = process.env.CORS_ORIGIN 
//   ? process.env.CORS_ORIGIN.split(',')
//   : ['http://localhost:5173', 'http://localhost:5174'];

// const corsOptions = {
//   origin: function (origin, callback) {
//     if (!origin) return callback(null, true);
    
//     if (allowedOrigins.indexOf(origin) !== -1) {
//       callback(null, true);
//     } else {
//       callback(new Error('Not allowed by CORS'));
//     }
//   },
//   credentials: true,
//   optionsSuccessStatus: 200,
//   methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
//   allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
// };

// module.exports = cors(corsOptions);

// middleware/cors.js - CORS Configuration

const cors = require('cors');

const corsOptions = {
  origin: true, // Allow all origins
  credentials: true, // Allow cookies to be sent
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

module.exports = cors(corsOptions);