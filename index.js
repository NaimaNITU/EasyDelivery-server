const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const app = express();
dotenv.config();
const stripe = require("stripe")(process.env.Payment_Secret_Key);

const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.txpmesm.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    //this is about parcel data
    const parcelCollection = client.db("easyDelivery").collection("parcels");
    //to store a user data we need to create a new collection
    const usersCollection = client.db("easyDelivery").collection("users");

    //create a new user
    app.post("/users", async (req, res) => {
      const userEmail = req.body.email;

      const existUser = await usersCollection.findOne({ email: userEmail });
      if (existUser) {
        return res.status(403).send({ message: "User already exist" });
      }

      const user = req.body;
      const result = await usersCollection.insertOne(user);
      res.status(201).send(result);
    });

    //create a new parcel
    app.post("/parcels", async (req, res) => {
      try {
        const parcel = req.body;
        const result = await parcelCollection.insertOne(parcel);
        res.status(201).send(result);
      } catch (error) {
        console.log(error);
        res.status(500).send({ message: error.message });
      }
    });

    //get all parcels data
    app.get("/parcels", async (req, res) => {
      try {
        const result = await parcelCollection.find().toArray();
        res.status(200).send(result);
      } catch (error) {
        console.log(error);
        res.status(500).send({ message: error.message });
      }
    });

    //find logged in user parcel data by email
    app.get("/parcels", async (req, res) => {
      try {
        const userEmail = req.query.email;
        const query = userEmail ? { created_by: userEmail } : {};
        const options = {
          sort: { createdAt: -1 },
        };
        const result = await parcelCollection.find(query, options).toArray();
        res.status(200).send(result);
      } catch (error) {
        console.log(error);
        res.status(500).send({ message: error.message });
      }
    });

    //get a specific user by parcel id
    app.get("/parcels/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await parcelCollection.findOne(query);

        if (!result) {
          return res.status(404).send({ message: "Parcel not found" });
        }
        res.send(result);
      } catch (error) {
        console.log(error);
        res.status(500).send({ message: error.message });
      }
    });

    // Create a PaymentIntent with the order amount and currency
    app.post("/create-payment-intent", async (req, res) => {
      const amountInCents = req.body.amountInCents;
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amountInCents,
        currency: "usd",
        payment_method_types: ["card"],
      });
      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
