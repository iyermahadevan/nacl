'use strict;'
//Include crypto to generate the nacl id
var crypto = require('crypto');
var NACLImpl = require('./naclImpl.js');

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
         * Save the nacl inside the "db".
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

               var nacl = { title:  rule.RuleNumber.toString(),
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

        save(nacl) {
            nacl.id = crypto.randomBytes(20).toString('hex'); // fast enough for our purpose
            if(typeof nacl.egress != undefined) {
                nacl.egress = false;
            }
            this.naclList.push(nacl);
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
            naclImpl.createRule(rule)
            console.log('naclImpl.createRule rule:', rule)
            return 1;            
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
                    }else {
                        return element.id !== id;
                    }
                });
            console.log('naclImpl.deleteRule ruleNumber:', ruleNumber);
            naclImpl.deleteRule(ruleNumber);
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
                var e = this.naclList[naclIndex];
                e.title = nacl.title;
                e.cidrBlock = nacl.cidrBlock
                e.egress = nacl.egress
                e.fromPort = nacl.fromPort
                e.toPort = nacl.toPort
                e.protocol = nacl.protocol
                e.ruleAction = nacl.ruleAction
                e.ruleNumber = nacl.ruleNumber
                this.save(e)
                return 1;
            }else {
                return 0;
            }
        }        
    }
}; 