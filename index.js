const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const app = express();

const port = process.env.PORT || 4000;


app.use(cors());
app.use(express.json());


app.get('/', (req, res) =>{
    res.send('Wellcome to Electric Saw Hub');
});

app.listen(port, () =>{
    console.log(`Connected To Electric Saw Hub ${port}`);
});