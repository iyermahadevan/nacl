'use strict';
// Include our "db"
var db = require('../../config/db')();
// Exports all the functions to perform on the db
module.exports = {getAll, save, getOne, check, delNacl};

//GET /Nacl operationId
function getAll(req, res, next) {
  res.json({ nacls: db.find()});
}
//POST /Nacl operationId
function save(req, res, next) {
    var p = db.save(req.body);
    p.then( 
        result => { 
            res.json({success: 1, description: "Nacl added to the list!"})
        },
        error => { 
            res.json({success: 0, description: error.toString()})
        }                
    );
}
//GET /Nacl/{id} operationId
function getOne(req, res, next) {
    var id = req.swagger.params.id.value; //req.swagger contains the path parameters
    var Nacl = db.find(id);
    if(Nacl) {
        res.json(Nacl);
    }else {
        res.status(204).send();
    }        
}
//PUT /Nacl/{id} operationId
function check(req, res, next) {
    var id = req.swagger.params.id.value; //req.swagger contains the path parameters
    var Nacl = req.body;
    if(db.check(id, Nacl)){
        res.json({success: 1, description: "Nacl check ok!"});
    }else{
        res.json({success: 0, description: "Nacl check failed!"});
    }

}
//DELETE /Nacl/{id} operationId
function delNacl(req, res, next) {
    var id = req.swagger.params.id.value; //req.swagger contains the path parameters
    if(db.remove(id)){
        res.json({success: 1, description: "Nacl deleted!"});
    }else{
        res.status(204).send();
    }

}