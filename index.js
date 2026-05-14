// ======================================
// REQUIRE PACKAGES
// ======================================
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion } = require('mongodb');

// ======================================
// EXPRESS APP
// ======================================

const app = express();
const port = process.env.PORT || 5000;

// ======================================
// MIDDLEWARE
// ======================================

// Allow frontend requests
app.use(cors());
// Read JSON data from frontend
app.use(express.json());

// ======================================
// MONGODB CONNECTION
// ======================================

// MongoDB URI
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.89rnkti.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create MongoDB client
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// ======================================
// MAIN FUNCTION
// ======================================

async function run() {
  try {
    // Connect MongoDB
    // await client.connect();

    // Ping MongoDB
    // await client.db('admin').command({
    //   ping: 1,
    // });

    console.log('MongoDB Connected Successfully');

    // ======================================
    // DATABASE + COLLECTION
    // ======================================

    // Database name
    const database = client.db('neymarDB');

    // Collection name
    const petitionsCollection = database.collection('petitionsColl');

    // ======================================
    // TEST ROUTE
    // ======================================

    app.get('/', (req, res) => {
      res.send('Server Running');
    });

    // ======================================
    // CREATE PETITION
    // ======================================

    app.post('/api/petitions', async (req, res) => {
      try {
        // Get frontend data
        const { name, email } = req.body;

        // ======================================
        // VALIDATION
        // ======================================

        // Check empty fields
        if (!name || !email) {
          return res.status(400).send({
            success: false,

            message: 'Name and email are required',
          });
        }

        // ======================================
        // CHECK DUPLICATE EMAIL
        // ======================================

        const existingUser = await petitionsCollection.findOne({
          email,
        });

        if (existingUser) {
          return res.status(400).send({
            success: false,

            message: 'You already signed the petition',
          });
        }

        // ======================================
        // CREATE PETITION OBJECT
        // ======================================

        const newPetition = {
          name,

          email,

          createdAt: new Date(),
        };

        // ======================================
        // SAVE TO DATABASE
        // ======================================

        const result = await petitionsCollection.insertOne(newPetition);

        // ======================================
        // COUNT TOTAL PETITIONS
        // ======================================

        const totalPetitions = await petitionsCollection.countDocuments();

        // ======================================
        // SEND RESPONSE
        // ======================================

        res.status(201).send({
          success: true,

          message: 'Petition signed successfully',

          insertedId: result.insertedId,

          totalPetitions,
        });
      } catch (error) {
        console.log(error);

        res.status(500).send({
          success: false,

          message: 'Internal Server Error',
        });
      }
    });

    // ======================================
    // GET PETITION COUNT
    // ======================================

    app.get('/api/petitions/count', async (req, res) => {
      try {
        // Count total petitions
        const totalPetitions = await petitionsCollection.countDocuments();

        // Send count
        res.send({
          success: true,

          totalPetitions,
        });
      } catch (error) {
        console.log(error);

        res.status(500).send({
          success: false,

          message: 'Internal Server Error',
        });
      }
    });
  } catch (error) {
    console.log(error);
  }
}

// ======================================
// RUN MONGODB
// ======================================

run().catch(console.dir);

// ======================================
// START SERVER
// ======================================

// app.listen(port, () => {
//   console.log(`Server running on port ${port}`);
// });

module.exports = app;
