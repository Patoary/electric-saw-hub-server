const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const app = express();
const { MongoClient, ServerApiVersion } = require('mongodb');
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


        app.get('/product', async (req, res) => {
            const query = {};
            const product = await productCollection.find(query).toArray();
            res.send(product);
        });

        app.get('/review', async(req, res) => {
            const review = await reviewCollection.find().toArray();
            res.send(review);
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