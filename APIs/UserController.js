let express = require('express');
const db = require("../Repository/db");
let mongo = require('mongodb');
let router = express.Router();
let bodyParser = require('body-parser');
const Joi = require('@hapi/joi');
router.use(bodyParser.urlencoded({ extended: true }));
router.use(bodyParser.json());
let moment = require('moment');
const nodemailer = require('nodemailer');

const User = require('./User');

const UserCollection = "User";

const testSchema = Joi.object().keys({
    username: Joi.string().alphanum().min(3).max(30).required(),
    password: Joi.string().regex(/^[a-zA-Z0-9]{3,30}$/),
    access_token: [Joi.string(), Joi.number()],
    birthyear: Joi.number().integer().min(1900).max(2013),
    email: Joi.string().email({ minDomainSegments: 2 }).required()
}).with('username', 'birthyear').without('password', 'access_token');

const cuisineSchema = Joi.object().keys({
    cuisineId: Joi.string().required(),
    cuisineName: Joi.string().required(),
    description: Joi.string(),
    deleted : Joi.boolean(),
    _id : Joi.string()
});

const UserSchema = Joi.object().keys({
    name: Joi.string().required(),
    email: Joi.string().required(),
    deviceId: Joi.string().required(),
    gender: Joi.string().required(),
    height: Joi.string().required(),
    weight: Joi.string().required(),
    birthday : Joi.date().iso(),
    deleted : Joi.boolean(),
    _id : Joi.string()
});

router.get('/gps',(req,res)=>{

    console.log("RECIEVED GPS : ");
    console.log("RECIEVED GPS : ", req.query);

    let deviceId = req.query.deviceId;
    let lat = req.query.lat;
    let lon = req.query.lon;
    let weight = req.query.weight;
    console.log("DEVICE ID : ", deviceId);
    console.log("lat : ", lat);
    console.log("lon : ", lon);
    console.log("weight : ", weight);

    return res.status(200).json({
        success : true,
        message : "successful response",
        document : null,
        messageDetails : null
    });
});


//add new user
router.post('/user',(req,res)=>{

    // Payload from the request
    let data = req.body;

    if(!data || !data.deviceId){
        return res.status(400).send({error : true, errorMessage : "cannot insert in to the database"});
    }else {

        Joi.validate(data, UserSchema, function (err, value) {
            if (err) {
                console.log("request data invalid : ", err.details);
                return res.status(400).send({error: true, errorMessage: err.details[0].message});
            } else {
                console.log("request data : ", value);

                let newUser = new User();

                newUser.name = data.name;
                newUser.email = data.email;
                newUser.deviceId = data.deviceId;
                newUser.gender = data.gender;
                newUser.height = data.height;
                newUser.weight = data.weight;
                newUser.birthday = moment().utc(false);
                newUser.timestamp = moment().utc(false);
                newUser.deleted = false;

                //Inserting to DB
                db.getDB().collection(UserCollection).insertOne(newUser, (err, result) => {
                    if (err) {
                        return res.status(500).json({
                            success: false,
                            message: "failed to insert document to DB",
                            document: null,
                            messageDetails: err
                        });
                    }else{
                        return res.status(201).json({
                            success: true,
                            message: "successfully inserted document to DB",
                            document: result.ops[0],
                            messageDetails: "no error"
                        });
                    }
                });

            }
        });
    }
});

router.get('/user',(req,res)=>{

    // Payload from the request
    let userId = req.query["userId"];
    if(!userId){
        return res.status(400).send({error : true, errorMessage : "cannot find user id"});
    }

    db.getDB().collection(UserCollection).find({ "_id" : new mongo.ObjectID(userId)}).toArray((err,result)=>{
        if(err){
            res.status(404).json({
                success : false,
                message : "failed to find document in DB",
                document : null,
                messageDetails : err
            });
        }
        else{
            if(result && result[0]){

                let data = result[0];

                if (data.deleted != true) {
                    res.status(200).json({
                        success : true,
                        message : "successfully retrieved the document from DB",
                        document : result[0],
                        messageDetails : "no error"
                    });
                }else {
                    res.status(404).json({
                        success : false,
                        message : "failed to update. Object is flagged as deleted in DB",
                        document : null,
                        messageDetails : err
                    });
                }

            }else{
                res.status(404).json({
                    success : false,
                    message : "failed to find document in DB",
                    document : null,
                    messageDetails : err
                });
            }


        }
    });
});

router.get('/allusers',(req,res)=>{

    db.getDB().collection(UserCollection).find().toArray((err,result)=>{
        if(err){
            return res.status(404).json({
                success : false,
                message : "failed to find documents in DB",
                document : null,
                messageDetails : err
            });
        }
        else{
            if(result && result.length != 0){

                let courtCategories = result;
                courtCategories = courtCategories.filter( res => {
                    return !res.deleted;
                });

                return res.status(200).json({
                    success : true,
                    message : "successfully retrieved the documents from DB",
                    document : courtCategories,
                    messageDetails : "no error"
                });

            }else{
                return res.status(404).json({
                    success : false,
                    message : "failed to find documents in DB",
                    document : null,
                    messageDetails : err
                });
            }
        }
    });
});

router.post('/userUpdate',(req,res)=>{

    // Payload from the request
    let data = req.body;
    if(!data || !data._id||!data.deviceId){
        return res.status(400).send({error : true, errorMessage : "cannot find device id"});
    }else {

        Joi.validate(data, UserSchema, function (err, value) {
            if (err) {
                console.log("request data invalid : ", err.details);
                return res.status(400).send({error: true, errorMessage: err.details[0].message});
            } else {


                db.getDB().collection(UserCollection).find({"_id": new mongo.ObjectID(data._id)}).toArray((err, result) => {
                    if (err) {
                        res.status(404).json({
                            success: false,
                            message: "failed to find document in DB",
                            document: null,
                            messageDetails: err
                        });
                    }else{
                        if(result){
                            let category = result[0];

                            if (category.deleted == true) {
                                return res.status(400).json({
                                    success: false,
                                    message: "failed to update. Object is flagged as deleted in DB",
                                    document: null,
                                    messageDetails: err
                                });
                            } else {
                                let newCategory = result[0];
                                console.log('ex case 1', newCategory);

                                if (data.name && data.name !== "") {
                                    newCategory.name = data.name;
                                }
                                if (data.email && data.email !== "") {
                                    newCategory.email = data.email;
                                }
                                if (data.gender && data.gender !== "") {
                                    newCategory.gender = data.gender;
                                }
                                if (data.height && data.height !== "") {
                                    newCategory.height = data.height;
                                }
                                if (data.weight && data.weight !== "") {
                                    newCategory.weight = data.weight;
                                }
                                if (data.birthday && data.birthday !== "") {
                                    newCategory.birthday = data.birthday;
                                }

                                newCategory.timestamp = moment().utc(false).toDate();

                                //Inserting to DB
                                db.getDB().collection(UserCollection).updateOne({"_id": new mongo.ObjectID(data._id)}, {$set: newCategory}, {upsert: true}, (err, result) => {
                                    if (err) {
                                        return res.status(500).json({
                                            success: true,
                                            message: "failed to insert document to DB",
                                            document: null,
                                            messageDetails: err
                                        });
                                    }else
                                        return res.status(200).json({
                                            success: true,
                                            message: "successfully updated document in DB",
                                            messageDetails: "no error"
                                        });

                                });
                            }

                        }else{
                            console.log("cannot find existing result ind DB");
                            return res.status(404).json({
                                success: false,
                                message: "failed to find document in DB",
                                document: null,
                                messageDetails: err
                            });
                        }
                    }
                });
                /*db.getDB().collection(usersCollection).find({ "_id" : new mongo.ObjectID(data.userId)}).toArray((err,result)=>{
                    if(err){
                        return res.status(404).json({
                            success : false,
                            message : "failed to find user in DB",
                            document : null,
                            messageDetails : err
                        });
                    }
                    else{

                        if(result && result[0]){
                            let userId = result[0];
                            if(userId.deleted == true){
                                return res.status(400).json({
                                    success : false,
                                    message : "failed to update. user is flagged as deleted in DB",
                                    document : null,
                                    messageDetails : err
                                });
                            }else {
                                db.getDB().collection(clientsCollection).find({ "_id" : new mongo.ObjectID(data.clientId)}).toArray((err, result)=>{
                                    if(err){
                                        return res.status(404).json({
                                            success : false,
                                            message : "failed to find client in DB",
                                            document : null,
                                            messageDetails : err
                                        });
                                    }
                                    else{

                                        if(result && result[0]){

                                            let clientId = result[0];

                                            if(clientId.deleted == true){
                                                return res.status(400).json({
                                                    success : false,
                                                    message : "failed to update. Client is flagged as deleted in DB",
                                                    document : null,
                                                    messageDetails : err
                                                });
                                            }else {
                                                //////////////////////////////////////////////////
                                                db.getDB().collection(courtCategoriesCollection).find({ "_id" : new mongo.ObjectID(data.courtCategoryId)}).toArray((err,result)=>{
                                                    if(err){
                                                        return res.status(404).json({
                                                            success : false,
                                                            message : "failed to find court category in DB",
                                                            document : null,
                                                            messageDetails : err
                                                        });
                                                    }else{
                                                        if(result && result[0]){
                                                            let courtCategories = result[0];
                                                            if(courtCategories.deleted == true){
                                                                return res.status(400).json({
                                                                    success : false,
                                                                    message : "failed to update. Court category is flagged as deleted in DB",
                                                                    document : null,
                                                                    messageDetails : err
                                                                });
                                                            }else{
                                                                db.getDB().collection(courtLocationsCollection).find({ "_id" : new mongo.ObjectID(data.courtLocationId)}).toArray((err, result)=>{
                                                                    if(err){
                                                                        return res.status(404).json({
                                                                            success : false,
                                                                            message : "failed to find court location in DB",
                                                                            document : null,
                                                                            messageDetails : err
                                                                        });
                                                                    }
                                                                    else{
                                                                        if(result && result[0]){
                                                                            let courtLocation = result[0];
                                                                            if(courtLocation.deleted == true){
                                                                                return res.status(400).json({
                                                                                    success : false,
                                                                                    message : "failed to update. Court location is flagged as deleted in DB",
                                                                                    document : null,
                                                                                    messageDetails : err
                                                                                });
                                                                            }else{
                                                                                db.getDB().collection(casesCollection).find({"_id": new mongo.ObjectID(data._id)}).toArray((err, result) => {
                                                                                    if (err) {
                                                                                        res.status(404).json({
                                                                                            success: false,
                                                                                            message: "failed to find document in DB",
                                                                                            document: null,
                                                                                            messageDetails: err
                                                                                        });
                                                                                    }else{
                                                                                        if(result){
                                                                                            let cases = result[0];

                                                                                            if (cases.deleted == true) {
                                                                                                return res.status(400).json({
                                                                                                    success: false,
                                                                                                    message: "failed to update. Object is flagged as deleted in DB",
                                                                                                    document: null,
                                                                                                    messageDetails: err
                                                                                                });
                                                                                            } else {
                                                                                                let newCase = result[0];
                                                                                                console.log('ex case 1', newCase);

                                                                                                if (data.caseNumber && data.caseNumber !== "") {
                                                                                                    newCase.caseNumber = data.caseNumber;
                                                                                                }
                                                                                                if (data.caseTitle && data.caseTitle !== "") {
                                                                                                    newCase.caseTitle = data.caseTitle;
                                                                                                }
                                                                                                if (data.shortDescription && data.shortDescription !== "") {
                                                                                                    newCase.shortDescription = data.shortDescription;
                                                                                                }
                                                                                                if (data.longDescription && data.longDescription !== "") {
                                                                                                    newCase.longDescription = data.longDescription;
                                                                                                }
                                                                                                if (data.courtDate && data.courtDate !== "") {
                                                                                                    newCase.courtDate = moment(data.courtDate.toString()).toDate()
                                                                                                }
                                                                                                if (data.clientId && data.clientId !== "") {
                                                                                                    newCase.clientId = data.clientId;
                                                                                                }
                                                                                                if (data.courtCategoryId && data.courtCategoryId !== "") {
                                                                                                    newCase.courtCategoryId = data.courtCategoryId;
                                                                                                }
                                                                                                if (data.courtLocationId && data.courtLocationId !== "") {
                                                                                                    newCase.courtLocationId = data.courtLocationId;
                                                                                                }

                                                                                                newCase.timestamp = moment().utc(false).toDate();

                                                                                                //Inserting to DB
                                                                                                db.getDB().collection(casesCollection).updateOne({"_id": new mongo.ObjectID(data._id)}, {$set: newCase}, {upsert: true}, (err, result) => {
                                                                                                    if (err) {
                                                                                                        return res.status(500).json({
                                                                                                            success: true,
                                                                                                            message: "failed to insert document to DB",
                                                                                                            document: null,
                                                                                                            messageDetails: err
                                                                                                        });
                                                                                                    }else
                                                                                                        updateDataToFirebase();
                                                                                                    return res.status(200).json({
                                                                                                        success: true,
                                                                                                        message: "successfully updated document in DB",
                                                                                                        messageDetails: "no error"
                                                                                                    });

                                                                                                });
                                                                                            }

                                                                                        }else{
                                                                                            console.log("cannot find existing result ind DB");
                                                                                            return res.status(404).json({
                                                                                                success: false,
                                                                                                message: "failed to find document in DB",
                                                                                                document: null,
                                                                                                messageDetails: err
                                                                                            });
                                                                                        }
                                                                                    }
                                                                                });
                                                                            }

                                                                        }

                                                                    }
                                                                });
                                                            }

                                                        }
                                                    }
                                                });

                                            }
                                        }else{
                                            //console.log("cannot find existing result ind DB");
                                            res.status(404).json({
                                                success : false,
                                                message : "failed to find document in DB",
                                                document : null,
                                                messageDetails : err
                                            });
                                        }
                                    }
                                });
                            }
                        }else {
                            //console.log("cannot find existing result ind DB");
                            res.status(404).json({
                                success : false,
                                message : "failed to find document in DB",
                                document : null,
                                messageDetails : err
                            });
                        }
                    }
                });*/

            }
        });
    }
});

router.post('/userDelete',(req,res)=>{

    // Payload from the request
    let data = req.body;
    if(!data || !data._id){
        return res.status(400).send({error : true, errorMessage : "cannot find user id or delete flag"});
    }


    db.getDB().collection(UserCollection).find({ "_id" : new mongo.ObjectID(data._id)}).toArray((err,result)=>{
        if(err){
            return res.status(404).json({
                success : false,
                message : "failed to find document in DB",
                document : null,
                messageDetails : err
            });
        }
        else{
            if(result){
                //console.log("existing results ", result);
                //console.log("existing result ", result[0]);

                deleteFoodCategory = result[0];
                //console.log('ex case 1', newCase);

                if(typeof(data.deleted )=="boolean" && data.deleted !== ""){
                    deleteFoodCategory.deleted = data.deleted;
                }

                // Inserting into DB
                db.getDB().collection(UserCollection).updateOne({ "_id" : new mongo.ObjectID(data._id)},{$set: deleteFoodCategory},{upsert: true},(err,result)=>{
                    if(err){
                        return res.status(500).json({
                            success : true,
                            message : "failed to flag delete the document in DB",
                            document : null,
                            messageDetails : err
                        });
                    }
                    else
                        return res.status(200).json({
                            success : true,
                            message : "successfully changed the deleted flag of the document in DB",
                            messageDetails : "no error"
                        });
                });

            }else{
                console.log("cannot find existing result ind DB");
                return res.status(404).json({
                    success : false,
                    message : "failed to find document in DB",
                    document : null,
                    messageDetails : err
                });
            }

        }

    });

});

// Get All Users
router.get('/users', (req, res) => {

    db.getDB().collection(UserCollection).find({ "deleted": false }).toArray((err, result) => {
        if (err) {
            res.status(404).json({
                success: false,
                message: "failed to find documents in DB",
                document: null,
                messageDetails: err
            });
        }
        else {
            if (result && result.length != 0) {

                let users = result;
                users = users.filter(res => {
                    return !res.deleted;
                });

                res.status(200).json({
                    success: true,
                    message: "successfully retrieved the documents from DB",
                    document: users,
                    messageDetails: "no error"
                });

            } else {
                res.status(404).json({
                    success: false,
                    message: "failed to find documents in DB",
                    document: null,
                    messageDetails: err
                });
            }
        }
    });
});

function generatePassword() {
    var length = 6,
        charset = "23456789",
        retVal = "";
    for (var i = 0, n = charset.length; i < length; ++i) {
        retVal += charset.charAt(Math.floor(Math.random() * n));
    }
    return retVal;
}

function sendPasswordMail(password, email) {

    let transport = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: "wideshabalakaya1@gmail.com",
            pass: "widesha123"
        }
    });

    const message = {
        from: 'Widesha Balakaya',
        to: email,
        subject: 'Welcome to Widesha balakaya App',
        text: 'Welcome to widesha balakaya app : Your account is being created and the password is : ' + password,
    };

    transport.sendMail(message, function (err, info) {
        if (err) {
            console.log(err)
        } else {
            console.log(info);
        }
    });
}

router.post('/login', (req, res) => {

    console.log("login called..");
    // Payload from the request
    let data = req.body;

    if (!data || !data.user || !data.user.email) {
        return res.status(400).send({ error: true, errorMessage: "not enough data" });
    }

    db.getDB().collection(UserCollection).find({ "email": data.user.email }).toArray((err, result) => {
        if (err) {
            return res.status(404).json({
                success: false,
                message: "failed to find user in the system",
                document: null,
                messageDetails: err
            });
        }
        else {
            if (result && result[0]) {

                if (result[0].password == data.user.password) {


                    console.log("passwords mathch..");
                    let loginAttempt = new LoginAttempt();
                    loginAttempt.uid = result[0]._id;
                    loginAttempt.email = result[0].email;
                    loginAttempt.timestamp = moment().utc();

                    let userObject = result[0];

                    // Inserting into DB
                    db.getDB().collection(loginAttemptsCollection).insertOne(loginAttempt, (err, result) => {
                        if (err) {
                            return res.status(500).json({
                                success: false,
                                message: "failed to login, Please contact system admin",
                                document: null,
                                messageDetails: err
                            });
                        }
                        else {
                            return res.status(201).json({
                                success: true,
                                message: "successfully inserted user login attempt to DB",
                                document: { loginAttempt: result.ops[0], userObject: userObject },
                                messageDetails: "no error"
                            });
                        }
                    });

                } else {
                    return res.status(200).json({
                        success: false,
                        message: "Invalid username password.",
                        document: null,
                        messageDetails: "login error"
                    });
                }
            } else {
                return res.status(200).json({
                    success: false,
                    message: "Invalid username password.",
                    document: null,
                    messageDetails: err
                });
            }
        }

    });
});

module.exports = router;
