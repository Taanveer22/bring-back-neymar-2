require('dotenv').config();
const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const { MongoClient, ServerApiVersion } = require('mongodb');

const app = express();

// middleware setup
app.use(express.json());
app.use(
  cors({
    origin: ['https://bring-back-neymar.vercel.app'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
);

// nodemailer setup
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});
// mongodb setup
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.89rnkti.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// database collection reference(global)
let petitionsCollection;

// database connection  function(work as middleware)
async function connectDB() {
  if (!petitionsCollection) {
    await client.connect();
    const database = client.db('neymarDB');
    petitionsCollection = database.collection('petitionsColl');
    console.log('MongoDB Connected');
  }
  return petitionsCollection;
}

// 1. check the route
app.get('/', (req, res) => {
  res.send('Server Running');
});

// 2. read petition count root
app.get('/api/petitions/count', async (req, res) => {
  try {
    const collection = await connectDB();
    const totalPetitions = await collection.countDocuments();
    res.send({ success: true, totalPetitions });
  } catch (error) {
    console.error(error);
    res.status(500).send({ success: false, message: 'Internal Server Error' });
  }
});

// 3. create petition route
app.post('/api/petitions', async (req, res) => {
  try {
    const { name, email } = req.body;

    if (!name || !email) {
      return res.status(400).send({
        success: false,
        message: 'Name and email are required',
      });
    }

    const collection = await connectDB();
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

// 4. create contact route
app.post('/api/contact', async (req, res) => {
  try {
    // get data from frontend
    const { name, email, message } = req.body;

    // check empty fields
    if (!name || !email || !message) {
      return res.status(400).send({
        success: false,
        message: 'Please fill all input fields',
      });
    }

    // email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
      return res.status(400).send({
        success: false,
        message: 'Invalid email address',
      });
    }

    // sanitize inputs
    const safeName = name.replace(/</g, '&lt;').replace(/>/g, '&gt;');

    const safeMessage = message.replace(/</g, '&lt;').replace(/>/g, '&gt;');

    // create email data
    const emailOptions = {
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_USER,
      replyTo: email,
      subject: 'New contact message',
      html: `
        <h2>New Message</h2>
        <p><strong>Name:</strong> ${safeName}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Message:</strong> ${safeMessage}</p>
      `,
    };

    // send email
    await transporter.sendMail(emailOptions);

    res.send({
      success: true,
      message: 'Email sent successfully',
    });
  } catch (error) {
    console.log(error);

    res.status(500).send({
      success: false,
      message: 'Email failed to send',
    });
  }
});

// Vercel export
module.exports = app;
