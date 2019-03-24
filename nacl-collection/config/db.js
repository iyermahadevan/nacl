'use strict;'
//Include crypto to generate the nacl id
var crypto = require('crypto');

module.exports = function() {
    return {
        naclList : [],
        /*
         * Save the nacl inside the "db".
         */
        save(nacl) {
            nacl.id = crypto.randomBytes(20).toString('hex'); // fast enough for our purpose
            this.naclList.push(nacl);
            return 1;            
        },
        /*
         * Retrieve a nacl with a given id or return all the nacls if the id is undefined.
         */
        find(id) {
            if(id) {
                return this.naclList.find(element => {
                        return element.id === id;
                    });    
            }else {
                return this.naclList;
            }
        },
        /*
         * Delete a nacl with the given id.
         */
        remove(id) {
            var found = 0;
            this.naclList = this.naclList.filter(element => {
                    if(element.id === id) {
                        found = 1;
                    }else {
                        return element.id !== id;
                    }
                });
            return found;            
        },
        /*
         * Update a nacl with the given id
         */
        update(id, nacl) {
            var naclIndex = this.naclList.findIndex(element => {
                return element.id === id;
            });
            if(naclIndex !== -1) {
                this.naclList[naclIndex].title = nacl.title;
                this.naclList[naclIndex].cidrBlock = nacl.cidrBlock
                this.naclList[naclIndex].egress = nacl.egress
                this.naclList[naclIndex].fromPort = nacl.fromPort
                this.naclList[naclIndex].toPort = nacl.toPort
                this.naclList[naclIndex].protocol = nacl.protocol
                this.naclList[naclIndex].ruleAction = nacl.uleAction
                this.naclList[naclIndex].ruleNumber = nacl.ruleNumber
          
                return 1;
            }else {
                return 0;
            }
        }        
    }
}; 