require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion } = require('mongodb');

const app = express();

// CORS কনফিগারেশন
app.use(
  cors({
    origin: ['https://bring-back-neymar-2.vercel.app'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
);

app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.89rnkti.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// ডাটাবেজ কালেকশন রেফারেন্স গ্লোবাল রাখা হলো
let petitionsCollection;

// ডাটাবেজ কানেকশন ফাংশন (Middleware হিসেবে কাজ করবে)
async function connectDB() {
  if (!petitionsCollection) {
    await client.connect();
    const database = client.db('neymarDB');
    petitionsCollection = database.collection('petitionsColl');
    console.log('MongoDB Connected');
  }
  return petitionsCollection;
}

// ১. রুট চেক করার জন্য
app.get('/', (req, res) => {
  res.send('Server Running');
});

// ২. পিটিশন কাউন্ট রুট
app.get('/api/petitions/count', async (req, res) => {
  try {
    const collection = await connectDB(); // কানেকশন নিশ্চিত করা
    const totalPetitions = await collection.countDocuments();
    res.send({ success: true, totalPetitions });
  } catch (error) {
    console.error(error);
    res.status(500).send({ success: false, message: 'Internal Server Error' });
  }
});

// ৩. নতুন পিটিশন সাবমিট রুট
app.post('/api/petitions', async (req, res) => {
  try {
    const { name, email } = req.body;

    if (!name || !email) {
      return res.status(400).send({
        success: false,
        message: 'Name and email are required',
      });
    }

    const collection = await connectDB(); // কানেকশন নিশ্চিত করা
    const existingUser = await collection.findOne({ email });

    if (existingUser) {
      return res.status(400).send({
        success: false,
        message: 'You already signed the petition',
      });
    }

    const newPetition = {
      name,
      email,
      createdAt: new Date(),
    };

    const result = await collection.insertOne(newPetition);
    const totalPetitions = await collection.countDocuments();

    res.status(201).send({
      success: true,
      message: 'Petition signed successfully',
      insertedId: result.insertedId,
      totalPetitions,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send({ success: false, message: 'Internal Server Error' });
  }
});

// Vercel এর জন্য এক্সপোর্ট
module.exports = app;
