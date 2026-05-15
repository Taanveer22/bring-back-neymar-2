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

    // Step 1: Check empty fields
    if (!name || !email) {
      return res.status(400).send({
        success: false,
        message: 'Name and email are required',
      });
    }

    // Step 2: Connect and check duplicate
    const collection = await connectDB();
    const existingUser = await collection.findOne({ email });

    if (existingUser) {
      return res.status(400).send({
        success: false,
        message: 'You already signed the petition',
      });
    }

    // Step 3: Save to database just name, email and creation time
    const newPetition = {
      name,
      email,
      createdAt: new Date(),
    };

    const result = await collection.insertOne(newPetition);
    const totalPetitions = await collection.countDocuments();

    // Step 4: Build auto-reply email to the signer
    const autoReplyToPetitioner = {
      from: `"Bring Back Neymar" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: '✅ You just signed the petition!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 24px; border: 1px solid #eee; border-radius: 8px;">
          
          <h2 style="color: #1e3a5f;">Hey ${name}, thank you for signing! 🙌</h2>
          
          <p style="color: #555; font-size: 15px;">
            Your signature has been recorded. You are now part of the movement to bring Neymar back!
          </p>

          <div style="background: #f9f9f9; border-left: 4px solid #f5c518; padding: 12px 16px; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 0; color: #333; font-size: 14px;">
              📋 <strong>Total Signatures So Far:</strong> ${totalPetitions}
            </p>
          </div>

          <p style="color: #555; font-size: 15px;">
            Share this campaign with your friends and help us grow the movement!
          </p>

          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />

          <p style="color: #999; font-size: 12px;">
            This is an automated confirmation email. Please do not reply to this email.
          </p>
        </div>
      `,
    };

    // Step 5: Send the auto-reply email
    await transporter.sendMail(autoReplyToPetitioner);

    // Step 6: Send success response to frontend
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
  // Step 1: Get the data from the form
  const name = req.body.name;
  const email = req.body.email;
  const message = req.body.message;

  // Step 2: Check if any field is empty
  if (!name || !email || !message) {
    res.status(400).send({
      success: false,
      message: 'Please fill all input fields',
    });
    return;
  }

  // Step 3: Check if the email is valid
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const isEmailValid = emailRegex.test(email);

  if (!isEmailValid) {
    res.status(400).send({
      success: false,
      message: 'Invalid email address',
    });
    return;
  }

  // Step 4: Clean the inputs (remove dangerous characters)
  const safeName = name.replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const safeMessage = message.replace(/</g, '&lt;').replace(/>/g, '&gt;');

  // Step 5: Build the email that goes to YOU (the site owner)
  const emailToOwner = {
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

  // Step 6: Build the auto-reply email that goes to the USER
  const emailToUser = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Thanks for reaching out! 👋',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 24px; border: 1px solid #eee; border-radius: 8px;">
        <h2 style="color: #333;">Hey ${safeName}, thanks for your message!</h2>
        <p style="color: #555; font-size: 15px;">
          I have received your message and will get back to you as soon as possible — usually within 24 hours.
        </p>
        <hr style="border: none; border-top: 1px solid #eee;" />
        <p style="color: #999; font-size: 13px;">
          This is an automated reply. Please do not reply to this email.
        </p>
      </div>
    `,
  };

  // Step 7: Try to send both emails
  try {
    // Send email to owner
    await transporter.sendMail(emailToOwner);

    // Send auto-reply to user
    await transporter.sendMail(emailToUser);

    // Step 8: Tell the frontend everything worked
    res.send({
      success: true,
      message: 'Email sent successfully',
    });
  } catch (error) {
    // Step 9: If something went wrong, tell the frontend
    console.log('Email error:', error);
    res.status(500).send({
      success: false,
      message: 'Email failed to send',
    });
  }
});

// Vercel export
module.exports = app;
