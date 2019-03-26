var AWS = require('aws-sdk')
AWS.config.loadFromPath('./local/aws.json')
// AWS.config.loadFromPath('./nacl/nacl-collection/local/aws.json')
const cidrOverlap = require('cidr-overlap');
 

class NACLImpl {

    constructor() {
        this.ec2 = new AWS.EC2({apiVersion: '2016-11-15', region: 'us-west-2'});
        this.networkAclId = null;
        this.providerEntries = null;
        this.tenantEntries = null;
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
        this.providerEntries = new Map();
        this.tenantEntries = new Map();
        this.entries = entries;
        for(var i=0; i < entries.length; i++) {
            var e = entries[i];
            if(e.RuleNumber < 200) {
                this.providerEntries.set(e.RuleNumber.toString(), e);
            }
            else {
                this.tenantEntries.set(e.RuleNumber.toString(), e);
            }
        }    
    }

    async describeRules() {
        return new Promise((resolve, reject) =>  {
            var params = {
                Filters: [
                    {
                        Name: 'tag:vmwtag',
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
        var e = null;
        if(ruleNumber < 200) {
            e = this.providerEntries.get(ruleNumber.toString());
        }
        else {
            e = this.tenantEntries.get(ruleNumber.toString());
        }
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

    // returns true if there is an overlapping port range
    // The effective width is less than the sum of the widths
    matchesPortRange(range1, range2) {
        var minFrom = Math.min(range1.From, range2.From);
        var maxTo = Math.max(range1.To, range2.To);
        var w1 = range1.To - range1.From;
        var w2 = range2.To - range2.From;
        return ((maxTo - minFrom) <= (w1 + w2));
    }

    // returns true if the port ranges overlap
    matchesCidr(cidr1, cidr2) {
        return cidrOverlap([cidr1, cidr2]);
    }

    // returns true if there is an entry in list that has matching portRange
    matchesRule(map, ruleAction, rule) {
        for(var key of map.keys()) {
            var r = map.get(key);
            if(r.RuleAction != ruleAction)
                continue;
            if( (r.Egress != rule.Egress) || (r.Protocol != rule.Protocol))
                continue;
            if(!this.matchesCidr(r.CidrBlock, rule.CidrBlock))
                continue;
            if(!this.matchesPortRange(r.PortRange, rule.PortRange))
                continue;
            return true;
        }
        return false;
    }
    /* Check the following conditions
    * 1. deny rule in 100s blocks allow rule in 200s
    * 2. allow rule in 100s masks deny rule in 200s
    * 3. deny rule in 200s ignored due to allow rule in 100s
    * 4. allow rule in 200s masked by deny rule in 100s 
    */
    checkConflict(rule) {
        var conflict = false;
        if(rule.RuleNumber < 200) { // Provider rule
            if(rule.RuleAction == "deny") { // Case #1
                conflict = this.matchesRule(this.tenantEntries, "allow", rule);
            }
            else { // Case #2
                conflict = this.matchesRule(this.tenantEntries, "deny", rule);
            }
        }
        else { // Tenant Rule
            if(rule.RuleAction == "deny") { // Case #3
                conflict = this.matchesRule(this.providerEntries, "allow", rule);
            }
            else { // Case #4
                conflict = this.matchesRule(this.providerEntries, "deny", rule);
            }
        }
        return conflict;
    }
}

module.exports = NACLImpl;

