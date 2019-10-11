var express = require('express');
const db = require("../Repository/db");
var router = express.Router();
var bodyParser = require('body-parser');
const Joi = require('@hapi/joi');
router.use(bodyParser.urlencoded({ extended: true }));
router.use(bodyParser.json());
let moment = require('moment');
let mongo = require('mongodb');

const usersCollection = "users";

router.post('/mobileSync', (req, res) => {

    let DATA = {};
    let userId = req.query["userId"];



            db.getDB().collection(usersCollection).find({ "_id": new mongo.ObjectID(userId) }, { "deleted": false }).toArray((err, result) => {
                if (err) {
                    console.log("ERROR => cannot find user");
                }
                else {
                    if (!result || result.length <= 0) {
                        console.log('no users in DB');
                        return;
                    }
                    let user = result[0];

                    db.getDB().collection(usersCollection).find({ "_id": new mongo.ObjectID(userId), "deleted": false }).toArray((err, result) => {
                        if (err) {
                            console.log("Error")
                        } else {
                            let User = {};
                            for (let i = 0; i < result.length; i++) {
                                User[result[i]._id] = result[i];
                            }
                            DATA.users = User;
                            res.status(200).json({
                                success: true,
                                document: DATA
                            })
                        }
                    })
                }
            });
});


module.exports = router;
