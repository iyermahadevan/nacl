var AWS = require('aws-sdk')
AWS.config.loadFromPath('./local/aws.json')
// AWS.config.loadFromPath('./nacl/nacl-collection/local/aws.json')

class NACLImpl {

    constructor() {
        this.ec2 = new AWS.EC2({apiVersion: '2016-11-15'});
        this.networkAclId = null;
        this.vmEntries = null;
        this.customerEntries = null;
        this.entries = null;
    }

    getEntries() {
        return this.entries;
    }

    async refresh() {
        var data = await this.describeRules();
        var entries = (data.NetworkAcls[0]).Entries;
        var networkAclId = (data.NetworkAcls[0]).NetworkAclId;
        this.networkAclId = networkAclId;
        this.vmwEntries = new Map();
        this.customerEntries = new Map();
        this.entries = entries;
        for(var i=0; i < entries.length; i++) {
            var e = entries[i];
            if(e.RuleNumber < 200) {
                this.vmwEntries.set(e.RuleNumber.toString(), e);
            }
            else {
                this.customerEntries.set(e.RuleNumber.toString(), e);
            }
        }    
    }

    async describeRules() {
        return new Promise((resolve, reject) =>  {
            var params = {
                Filters: [
                    {
                        Name: 'tag:Owner',
                        Values: [
                            'vmw1-nacl1'
                        ]
                    }
                ]
            };
            this.ec2.describeNetworkAcls(params, function(err, data) {
                if (err) {
                    console.log('describeNetworkAcls failed:', err);
                    reject(err);
                }
                else {
                    // console.log('describeNetworkAcls done:');
                    resolve(data);
                }    
            })
        })
    }

    async getRules() {
        await this.refresh();
        return this.entries;
    }

    async deleteRule(ruleNumber) {
        await this.refresh();
        var e = this.vmwEntries.get(ruleNumber.toString());
        if(e == null) {
            console.log('Rule not found ruleNumber:', ruleNumber);
            return;
        }
        return new Promise((resolve, reject) => {
                var params = {
                Egress: e.Egress, 
                NetworkAclId: this.networkAclId, 
                RuleNumber: ruleNumber
            };
            var t = this.ec2.deleteNetworkAclEntry(params, function(err, data) {
                if (err) {
                    console.log('deleteNetworkAclEntry failed:', err);
                    reject(err);
                }
                else {
                    // console.log('deleteNetworkAclEntry done:');
                    resolve(data);
                }    
            });
        });
    }

    async createRule(rule) {
        await this.refresh();
        return new Promise((resolve, reject) => {
            var params = {
                CidrBlock: rule.CidrBlock, 
                Egress: rule.Egress, 
                NetworkAclId: this.networkAclId, 
                PortRange: {
                 From: rule.PortRange.From, 
                 To: rule.PortRange.To
                }, 
                Protocol: rule.Protocol, 
                RuleAction: rule.RuleAction, 
                RuleNumber: rule.RuleNumber
            };
            this.ec2.createNetworkAclEntry(params, function(err, data) {
                if (err) {
                    console.log('createRule failed:', err);
                    reject(err);
                }
                else {
                    // console.log('createRule done');
                    resolve(data);
                }
            });
        });
    }
}

async function test() {
    var nacl = new NACLImpl();

    var rules = await nacl.getRules();
    console.log('getResponse rules:', rules);

    ruleNumber = 108;

    var rule = { 
        CidrBlock: '0.0.0.0/0',
        Egress: false,
        PortRange: {
            From: 1443, 
            To: 1443
        },
        Protocol: '6',
        RuleAction: 'allow',
        RuleNumber: ruleNumber
    };

    try {
        var createResponse = await nacl.createRule(rule);
        console.log('createResponse done:', ruleNumber);   
    }
    catch(err) {
        console.log('createResponse err:', err);
    }

    try {
        var deleteResponse = await nacl.deleteRule(ruleNumber);
        console.log('deleteResponse done:', ruleNumber);    
    }
    catch(err) {
        console.log('deleteResponse err:',err);
    }
}

module.exports = NACLImpl;
// test();

