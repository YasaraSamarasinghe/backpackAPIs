let express = require('express');
const db = require("../Repository/db");
let mongo = require('mongodb');
let router = express.Router();
let bodyParser = require('body-parser');
const Joi = require('@hapi/joi');
router.use(bodyParser.urlencoded({ extended: true }));
router.use(bodyParser.json());
let moment = require('moment');

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

/*router.post('/caseStageUpdate',(req,res)=>{
    let data = req.body;
    if(!data || !data.caseId ){
        return res.status(400).send({error : true, errorMessage : "cannot find case id"});
    }else {
        Joi.validate(data, caseStageSchema, function (err, value) {
            if (err) {
                console.log("request data invalid : ", err.details);
                return res.status(400).send({error: true, errorMessage: err.details[0].message});
            } else {

                db.getDB().collection(casesCollection).find({ "_id" : new mongo.ObjectID(data.caseId)}).toArray((err,result)=>{
                    if(err){
                        return res.status(404).json({
                            success : false,
                            message : "failed to find case id in DB",
                            document : null,
                            messageDetails : err
                        });
                    }
                    else{

                        if(result && result[0]){
                            let caseObj = result[0];
                            if(caseObj.deleted == true){
                                return res.status(400).json({
                                    success : false,
                                    message : "failed to update. case is flagged as deleted in DB",
                                    document : null,
                                    messageDetails : err
                                });
                            }else {

                                let Case = result[0];
                                let caseStage = new CaseStage();


                                // Cheking for correct date in court
                                if(moment(data.nextCourtDate).isBefore(data.thisCourtDate)){
                                    return res.status(400).json({
                                        success : false,
                                        message : "failed to update. next court date must be greater than this court date ",
                                        document : null,
                                        messageDetails : err
                                    });
                                }


                                // setting up court date
                                if(Case.stages && (Case.stages.length !== 0)){
                                    // we have previous stages
                                    caseStage.thisCourtDate = Case.stages[Case.stages.length -1].nextCourtDate;
                                }else {
                                    // no previous case stages
                                    caseStage.thisCourtDate = Case.courtDate;
                                }
                                caseStage.caseStageNameId = data.caseStageNameId;
                                caseStage.caseStageName = data.caseStageName;
                                caseStage.nextCourtDate = data.nextCourtDate;
                                caseStage.notesOfThisStage = data.notesOfThisStage;
                                caseStage.notesForNextStage = data.notesForNextStage;
                                caseStage.timestamp = moment().utc(false).toDate();
                                Case.courtDate = caseStage.nextCourtDate;
                                //Case.stages.push() = caseStage;
                                // Case.stages[Case.stages ? Case.stages.length : Case.stage.push()] = caseStage;
                                if(Case.stages){
                                    caseStage.stageNo = Case.stages.length +1;
                                    Case.stages[Case.stages.length] = caseStage;

                                }else{
                                    Case.stages = [];
                                    caseStage.stageNo = Case.stages.length +1;
                                    Case.stages.push(caseStage);
                                }


                                db.getDB().collection(casesCollection).updateOne({"_id": new mongo.ObjectID(data.caseId)},{$set:Case},{upsert:true }, (err, result) => {
                                    if (err) {
                                        return res.status(500).json({
                                            success: false,
                                            message: "failed to insert document to DB",
                                            document: null,
                                            messageDetails: err
                                        });
                                    } else
                                        updateDataToFirebase();
                                    console.log(Case);
                                    return res.status(200).json({
                                        success: true,
                                        message: "successfully updated case stage document on DB",
                                        document: result,
                                        messageDetails: "no error"
                                    });

                                });

                            }

                        }else{
                            return res.status(404).json({
                                success: false,
                                message: "failed to find document in DB",
                                document: null,
                                messageDetails: err
                            });
                            // 404 not found
                        }
                    }
                });

            }
        });

    }
});

router.post('/caseDelete',(req,res)=>{

    // Payload from the request
    let data = req.body;
    if(!data || !data._id){
        return res.status(400).send({error : true, errorMessage : "cannot find case id or delete flag"});
    }


    db.getDB().collection(casesCollection).find({ "_id" : new mongo.ObjectID(data._id)}).toArray((err,result)=>{
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

                deleteCase = result[0];
                //console.log('ex case 1', newCase);

                if(typeof(data.deleted )=="boolean" && data.deleted !== ""){
                    deleteCase.deleted = data.deleted;
                }

                // Inserting into DB
                db.getDB().collection(casesCollection).updateOne({ "_id" : new mongo.ObjectID(data._id)},{$set: deleteCase},{upsert: true},(err,result)=>{
                    if(err){
                        return res.status(500).json({
                            success : true,
                            message : "failed to flag delete the document in DB",
                            document : null,
                            messageDetails : err
                        });
                    }
                    else
                        updateDataToFirebase();
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

router.post('/usersList',(req,res)=>{
    data = req.body;

    Joi.validate(data, userListSchema, function (err, value) {
        var dateTimeTofilter = moment().subtract(1, 'year');

        let quary = {
            courtDate: { $gt: new Date('2019-06-01') },
            //courtDate:{ $gte: new Date(dateTimeTofilter.data.courtDate)},
            courtCategoryId:data.courtCategoryId,
            courtLocationId:data.courtLocationId
        }


        db.getDB().collection(casesCollection).find(quary).toArray((err,result)=>{
            if(err){
                res.status(404).json({
                    success : false,
                    message : "failed to find document in DB",
                    document : null,
                    messageDetails : err
                });
            }else{
                if(!result){
                    return   res.status(404).json({
                        success : false,
                        message : "failed to find document in DB",
                        document : null,
                        messageDetails : err
                    });
                }

                let userlist = [];

                result.forEach( res => {
                    if(!userlist.includes(res.userId)){
                        userlist.push(res.userId);
                        //return res.userId;
                    }
                });

                console.log("kkk ",userlist);


                db.getDB().collection(usersCollection).find().toArray((err,result)=>{
                    if(err){
                        res.status(404).json({
                            success : false,
                            message : "failed to find documents in DB",
                            document : null,
                            messageDetails : err
                        });
                    }
                    else{
                        if(result && result.length != 0){

                            //console.log("result", result);

                            let users = result;
                            users = users.filter( res => {
                                console.log("MMMM :", res);
                                let asd = userlist.includes(res._id.toString());
                                console.log("ASD :", asd);

                                //return only name and contact number.


                                return (!res.deleted && asd);
                            });

                            res.status(200).json({
                                success : true,
                                message : "successfully retrieved the users from DB",
                                document : users,
                                messageDetails : "no error"
                            });

                        }else{
                            res.status(404).json({
                                success : false,
                                message : "failed to find documents in DB",
                                document : null,
                                messageDetails : err
                            });
                        }
                    }
                });
            }
        })
    });
});

/!*
async function processArray(userlist) {
    let users = [];
    for (const item of userlist) {
        console.log("userID : ", userlist, item);
        await db.getDB().collection(usersCollection).find({"_id":new mongo.ObjectID(item)}).toArray((err,results)=>{
            if(err){
                res.status(500).json({
                    success : false,
                    message : "failed to find documents in DB",
                    document : null,
                    messageDetails : err
                });
            }else{
                if(results && results[0]){

                    let data = results[0];
                    if(!data.deleted){
                        console.log("pushing the new user");
                        users.push(data);
                        console.log("asdasdasdasd", users);
                    }
                }
            }

        });
        console.log("users : ", users);
    }
    return users;
}

async function getUserList(userlist){

    let users = [];
    for(let i = 0; i < userlist.length; i++){
        //let uid = userlist[i];
      await db.getDB().collection(usersCollection).find({"_id":new mongo.ObjectID(userlist[i])}).toArray((err,results)=>{
            if(err){
                res.status(500).json({
                    success : false,
                    message : "failed to find documents in DB",
                    document : null,
                    messageDetails : err
                });
            }else{
                if(results && results[0]){

                    let data = results[0];
                    if(!data.deleted){
                        console.log("pushing the new user");
                        users.push(data);
                        console.log("asdasdasdasd", users);
                    }
                }
            }

      });

    }

    return users;

}
*!/

router.get('/case',(req,res)=>{

    // Payload from the request
    let caseId = req.query["caseId"];
    if(!caseId){
        return res.status(400).send({error : true, errorMessage : "cannot find case id"});
    }

    db.getDB().collection(casesCollection).find({ "_id" : new mongo.ObjectID(caseId)}).toArray((err,result)=>{
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

router.get('/caseAll',(req,res)=>{

    let userId = req.query["userId"];
    if(!userId){
        return res.status(400).send({error : true, errorMessage : "cannot find user id"});
    }

    db.getDB().collection(casesCollection).find({ "userId" : userId}).toArray((err,result)=>{
        if(err){
            res.status(404).json({
                success : false,
                message : "failed to find documents in DB",
                document : null,
                messageDetails : err
            });
        }
        else{
            if(result && result.length != 0){

                let cases = result;
                cases = cases.filter( res => {
                    return !res.deleted;
                });

                res.status(200).json({
                    success : true,
                    message : "successfully retrieved the documents from DB",
                    document : cases,
                    messageDetails : "no error"
                });

            }else{
                res.status(404).json({
                    success : false,
                    message : "failed to find documents in DB",
                    document : null,
                    messageDetails : err
                });
            }
        }
    });
});*/

module.exports = router;
