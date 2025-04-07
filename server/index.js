const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const config = require('./config');
const morgan = require('morgan');
const path = require('path');

// Middleware importálása
const auth = require('./middleware/auth');

// Az alkalmazás létrehozása
const app = express();

// Morgan logger beállítása
app.use(morgan('dev'));

// Middleware beállítások
app.use(cors());
app.use(express.json({ extended: false }));

// Útvonalak
app.use('/api/auth', require('./routes/auth'));
app.use('/api/projects', require('./routes/projects'));
app.use('/api/domains', require('./routes/domains'));
app.use('/api/translation', require('./routes/translation'));
app.use('/api/support', require('./routes/support'));
app.use('/api/comments', require('./routes/comments'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/accounting', require('./routes/accounting'));

// Új útvonalak regisztrálása
app.use('/api/calendar', require('./routes/calendar'));
app.use('/api/workflows', require('./routes/workflows'));
app.use('/api/system', require('./routes/system'));

// Statikus fájlok
app.use(express.static('public'));

// Catch-all útvonal a React frontend-hez
app.get('*', (req, res) => {
  res.sendFile(path.resolve(__dirname, '../public', 'index.html'));
});

// MongoDB kapcsolat létrehozása
mongoose
  .connect(config.mongoURI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  })
  .then(() => {
    console.log('MongoDB kapcsolat létrejött');
    
    // Szerver elindítása
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => console.log(`A szerver elindult a ${PORT} porton`));
  })
  .catch(err => {
    console.error('Hiba a MongoDB kapcsolat létrehozásakor:', err.message);
    process.exit(1);
  });

// Expose app for testing
module.exports = app;