require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion } = require('mongodb');

const app = express();
const port = process.env.PORT || 5000;

app.use(
  cors({
    origin: 'https://bring-back-neymar.vercel.app',
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

async function run() {
  try {
    await client.connect(); // ✅ uncommented

    console.log('MongoDB Connected Successfully');

    const database = client.db('neymarDB');
    const petitionsCollection = database.collection('petitionsColl');

    app.get('/', (req, res) => {
      res.send('Server Running');
    });

    app.post('/api/petitions', async (req, res) => {
      try {
        const { name, email } = req.body;

        if (!name || !email) {
          return res.status(400).send({
            success: false,
            message: 'Name and email are required',
          });
        }

        const existingUser = await petitionsCollection.findOne({ email });

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

        const result = await petitionsCollection.insertOne(newPetition);
        const totalPetitions = await petitionsCollection.countDocuments();

        res.status(201).send({
          success: true,
          message: 'Petition signed successfully',
          insertedId: result.insertedId,
          totalPetitions,
        });
      } catch (error) {
        console.log(error);
        res.status(500).send({ success: false, message: 'Internal Server Error' });
      }
    });

    app.get('/api/petitions/count', async (req, res) => {
      try {
        const totalPetitions = await petitionsCollection.countDocuments();
        res.send({ success: true, totalPetitions });
      } catch (error) {
        console.log(error);
        res.status(500).send({ success: false, message: 'Internal Server Error' });
      }
    });
  } catch (error) {
    console.log(error);
  }
}

run().catch(console.dir);

module.exports = app;
