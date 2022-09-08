const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const app = express();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const port = process.env.PORT || 4000;


app.use(cors());
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.rrjseia.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run() {
    try {
        await client.connect();
        const productCollection = client.db('sk_saw').collection('products');
        const reviewCollection = client.db('sk_saw').collection('reviews');
        const orderCollection = client.db('sk_saw').collection('orders');
        const userCollection = client.db('sk_saw').collection('users');

        // to add a new user
        app.put('/user/:email', async (req, res) => {
            const email = req.params.email;
            const user = req.body;
            const filter = { email: email };
            const options = { upsert: true };
            const updateDoc = {
                $set: user,
            };
            const result = await userCollection.updateOne(filter, updateDoc, options);
            res.send(result)
        });

        app.get('/product', async (req, res) => {
            const query = {};
            const product = await productCollection.find(query).toArray();
            res.send(product);
        });

        app.get('/product/:id', async (req, res) => {
            const id = req.params;
            const query = { _id: ObjectId(id) };
            const result = await productCollection.findOne(query);
            res.send(result);
        });

        app.get('/review', async (req, res) => {
            const review = await reviewCollection.find().toArray();
            res.send(review);
        });
        app.post('/review', async (req, res) => {
            const review = req.body;
            const result = await reviewCollection.insertOne(review);
            res.send({ success: true, result });
        });

        app.post('/order', async (req, res) => {
            const order = req.body;
            const result = await orderCollection.insertOne(order);
            res.send({ success: true, result });
        });

        app.get('/order', async (req, res) => {
            const result = await orderCollection.find().toArray();
            res.send(result);
        });

        app.delete('/order/:id', async (req, res) => {
            const id = req.params;
            const query = { _id: ObjectId(id) }
            const result = await orderCollection.deleteOne(query);
            res.send(result);
        });

    }
    finally {

    }
}

run().catch(console.dir);



app.get('/', (req, res) => {
    res.send('Wellcome to SK Saw Hub');
});

app.listen(port, () => {
    console.log(`Connected To SK Saw Hub ${port}`);
});