const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

// Conectar a la base de datos MongoDB
mongoose.connect(process.env.MONGODB_URI);

// Esquema y modelo de usuario
const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
});

const User = mongoose.model('User', userSchema);

// Esquema y modelo de actividad
const activitySchema = new mongoose.Schema({
  description: String,
  duration: Number,
  date: String, // Guardar como cadena en formato dateString
  username: String,
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});

const Activity = mongoose.model('Activity', activitySchema);

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cors());
app.use(express.static('public'));

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html');
});

// Ruta para agregar un usuario
app.post('/api/users', async (req, res) => {
  const { username } = req.body;
  if (!username) {
    return res.status(400).json({ error: "Username is required" });
  }

  const newUser = new User({ username });
  await newUser.save();
  
  res.json(newUser);
});

// Ruta para agregar una actividad a un usuario
app.post('/api/users/:id/exercises', async (req, res) => {
  const { description, duration, date } = req.body;
  const userId = req.params.id;

  const user = await User.findById(userId);
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  const newActivity = new Activity({
    description,
    duration: parseInt(duration),
    date: date ? new Date(date).toDateString() : new Date().toDateString(),
    username: user.username,
    userId: user._id
  });

  await newActivity.save();

  // Devolviendo el objeto del usuario con los campos de ejercicio añadidos
  res.json({
    username: user.username,
    description: newActivity.description,
    duration: newActivity.duration,
    date: newActivity.date,
    _id: user._id
  });
});

// Ruta para obtener todos los usuarios
app.get('/api/users', async (req, res) => {
  const users = await User.find();
  res.json(users);
});

// Ruta para obtener el log de actividades de un usuario
app.get('/api/users/:id/logs', async (req, res) => {
  const userId = req.params.id;
  const user = await User.findById(userId);

  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  // Obtener parámetros opcionales: from, to, limit
  const { from, to, limit } = req.query;

  // Filtrar las actividades que pertenecen a este usuario
  let userActivities = await Activity.find({ userId: user._id });

  // Convertir fechas de 'from' y 'to' a objetos Date si existen
  let fromDate = from ? new Date(from) : null;
  let toDate = to ? new Date(to) : null;

  // Filtrar por rango de fechas si 'from' o 'to' están presentes
  if (fromDate) {
    userActivities = userActivities.filter(activity => new Date(activity.date) >= fromDate);
  }
  if (toDate) {
    userActivities = userActivities.filter(activity => new Date(activity.date) <= toDate);
  }

  // Limitar el número de actividades devueltas si se proporciona 'limit'
  if (limit) {
    userActivities = userActivities.slice(0, parseInt(limit));
  }


  // Respuesta con el usuario y el log de actividades
  res.json({
    _id: user._id,
    username: user.username,
    count: userActivities.length,
    log: userActivities.map(activity => ({
      description: activity.description,
      duration: activity.duration,
      date: activity.date
    }))
  });
});

// Iniciar el servidor
const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port);
});
