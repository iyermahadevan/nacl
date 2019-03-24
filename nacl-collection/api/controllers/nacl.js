'use strict';
// Include our "db"
var db = require('../../config/db')();
// Exports all the functions to perform on the db
module.exports = {getAll, save, getOne, update, delNacl};

//GET /Nacl operationId
function getAll(req, res, next) {
  res.json({ Nacls: db.find()});
}
//POST /Nacl operationId
function save(req, res, next) {
    res.json({success: db.save(req.body), description: "Nacl added to the list!"});
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
function update(req, res, next) {
    var id = req.swagger.params.id.value; //req.swagger contains the path parameters
    var Nacl = req.body;
    if(db.update(id, Nacl)){
        res.json({success: 1, description: "Nacl updated!"});
    }else{
        res.status(204).send();
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