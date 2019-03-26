'use strict;'
//Include crypto to generate the nacl id
var crypto = require('crypto');
var NACLImpl = require('./naclImpl.js');

// This will initialize a global rules object once asynchronously
// The rules are used in the refresh method to update the local cache
var naclImpl = new NACLImpl();
var rules = []
var p = naclImpl.getRules();
p.then (
    result => { console.log('updated rules'); rules = result;},
    error => { console.log('getRules error:', error)}
)

module.exports = function() {
    return {
        naclList : [],
        refreshDone : false,

        /*
         * Refresh the local cache with the data from the NACL list
         */
        refresh() {
            if(this.refreshDone)
                return;
            this.refreshDone = true;
            this.naclList = [];
            for(var i = 0; i < rules.length; i++) {
                var rule = rules[i];
                var fromPort = 0;
                var toPort = 0;
                if(typeof rule.PortRange != 'undefined') {
                    fromPort = rule.PortRange.From;
                    toPort = rule.PortRange.To;
                }

               var nacl = { 
                    title:  rule.RuleNumber.toString(),
                    egress: rule.Egress,
                    cidrBlock: rule.CidrBlock,
                    fromPort: fromPort,
                    toPort: toPort,
                    protocol: parseInt(rule.Protocol),
                    ruleAction: rule.RuleAction,
                    ruleNumber: rule.RuleNumber };
                nacl.id = crypto.randomBytes(20).toString('hex'); // fast enough for our purpose
                this.naclList.push(nacl);
            }
        },

        formatRule(nacl) {
            nacl.id = crypto.randomBytes(20).toString('hex'); // fast enough for our purpose
            if(typeof nacl.egress != undefined) {
                nacl.egress = false;
            }
            var rule = { 
                CidrBlock: nacl.cidrBlock,
                Egress: nacl.egress,
                PortRange: {
                    From: nacl.fromPort, 
                    To: nacl.toPort
                },
                Protocol: nacl.protocol.toString(),
                RuleAction: nacl.ruleAction,
                RuleNumber: nacl.ruleNumber
            };
            return rule;
        },

        /*
         * Save the nacl inside the "db".
         */
        save(nacl) {
            this.refresh();
            var rule = this.formatRule(nacl);
            return new Promise( (resolve, reject) => {
                var p2 = naclImpl.createRule(rule);
                p2.then(
                    result => { 
                        console.log('createRule done:', result); 
                        this.naclList.push(nacl);
                        resolve(1);
                    },
                    error => { 
                        console.log('createRule failed:', error); 
                        reject(error);
                    }                
                );    
            });
        },
        /*
         * Retrieve a nacl with a given id or return all the nacls if the id is undefined.
         */
        find(id) {
            this.refresh();
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
            var ruleNumber = -1;
            this.naclList = this.naclList.filter(element => {
                    if(element.id === id) {
                        found = 1;
                        ruleNumber = element.ruleNumber;
                        console.log('naclImpl.deleteRule ruleNumber:', ruleNumber);
                        naclImpl.deleteRule(ruleNumber);            
                    }else {
                        return element.id !== id;
                    }
                });
            return found;            
        },
        /*
         * Check a nacl with the given id
         */
        check(id, nacl) {
            this.refresh();
            var rule = this.formatRule(nacl);
            return naclImpl.checkConflict(rule)
        }        
    }
}; 