const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const app = express();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const port = process.env.PORT || 4000;


app.use(cors());
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.rrjseia.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send({ message: 'UnAuthorized Access' });
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: 'Forbidden Access' });
        }
        req.decoded = decoded;
        next();
    });
};

async function run() {
    try {
        await client.connect();
        const productCollection = client.db('sk_saw').collection('products');
        const reviewCollection = client.db('sk_saw').collection('reviews');
        const orderCollection = client.db('sk_saw').collection('orders');
        const userCollection = client.db('sk_saw').collection('users');
        const paymentCollection = client.db('sk_saw').collection('payments');

        // a simple middleware to check admin or not 
        const verifyAdmin = async (req, res, next) => {
            const requester = req.docoded?.email;
            const requseterAccount = await userCollection.findOne({email: requester});
            if(requseterAccount?.role === 'admin'){
                next();
            }else{
                res.status(403).send({message: 'Forbidden'});
            }
        };

        // to check user
        app.get('/admin/:email', async(req, res) =>{
            const email = req.params.email;
            const user = await userCollection.findOne({email: email});
            const isAdmin = user.role === 'admin';
            res.send({admin: isAdmin});   
        });

        // to make a new admin
        app.put('/user/admin/:email',verifyJWT, async(req, res) => {
            const email = req.params.email;
            const filter = {email: email};
            const updateDoc = {
                $set: { role: 'admin'},
            };
            const result = await userCollection.updateOne(filter, updateDoc);
            res.send(result);
        });

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
            const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '6h' })
            res.send({ result, token });
        });

        app.get('/user', verifyJWT, async (req, res) => {
            const result = await userCollection.find().toArray();
            res.send(result);
        });

        app.get('/user-data',verifyJWT, async (req, res) => {
            const email = req.query.email;
            const decodedEmail = req.decoded.email;
            console.log('email:', email, 'decoded:', decodedEmail);
            if (email === decodedEmail) {
                const query = {email: email};
                const result = await userCollection.findOne(query);
                res.send(result);
            }
            else {
                return res.status(403).send({ message: 'Forbidden Access' });
            }

        });

        app.patch('/user/:id',verifyJWT, async(req, res) => {
            const id = req.params.id;
            const updatedProfile = req.body;
            const filter = {_id: ObjectId(id)}
            const options = { upsert: true };
            const updateDoc = {
                $set: updatedProfile
            };
            const update = await userCollection.updateOne(filter, updateDoc, options);
            res.send({ success: true, update });
        });

        app.delete('/user/:id', async (req, res) => {
            const id = req.params;
            const query = { _id: ObjectId(id) };
            const result = await userCollection.deleteOne(query);
            res.send(result);
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

        app.get('/order',verifyJWT, async (req, res) => {
            const email = req.query.email;
            const decodedEmail = req.decoded.email;
            console.log('email:', email, 'decoded:', decodedEmail);
            if (email === decodedEmail) {
                const query = {userEmail: email};
                const result = await orderCollection.find(query).toArray();
                res.send(result);
            }
            else {
                return res.status(403).send({ message: 'Forbidden Access' });
            }

        });

        app.get('/order/:id', async (req, res) => {
            const id = req.params;
            const query = {_id:ObjectId(id)};
            const result = await orderCollection.findOne(query);
            res.send(result);
        });

        app.delete('/order/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) }
            const result = await orderCollection.deleteOne(query);
            res.send(result);
        });

        app.patch('/order/:id',verifyJWT, async(req, res) => {
            const id = req.params.id;
            const payment = req.body;
            const filter = {_id: ObjectId(id)}
            const updateDoc = {
                $set: { 
                    paid: true,
                    transactionId : payment.transactionId,
                },
            };
            const result = await paymentCollection.insertOne(payment);
            const updateOrder = await orderCollection.updateOne(filter, updateDoc);
            res.send(result);
        });
        // for payment
        app.post('/create-payment-intent',verifyJWT, async(req, res) => {
            const service = req.body;
            const price = service.totalPrice;
            const amount = price * 100;
            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: 'usd',
                payment_method_types: ['card']
            });
            res.send({clientSecret: paymentIntent.client_secret});
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