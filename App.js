const express = require('express');
const bodyParser = require("body-parser");
const path = require('path');
const PORT = process.env.PORT || 3000;

const db = require("./Repository/db");
const app = express();

let UserController = require('./APIs/UserController');

app.use('/users',UserController);

// parses json data sent to us by the user
app.use(bodyParser.json());

// serve static html file to user
app.get('/',(req,res)=>{


});


db.connect((err)=>{
    // If err unable to connect to database
    // End application
    if(err){
        console.log('unable to connect to database');
        process.exit(1);
    }
    // Successfully connected to database
    // Start up our Express Application
    // And listen for Request
    else{
        app.listen(PORT, () => console.log(`connected to database, Listening on ${ PORT }`));
    }
});

