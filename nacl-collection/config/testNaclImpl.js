var NACLImpl = require("./naclImpl")
const request = require('request');

var passed = 0;
var failed = 0;

async function testSleep(interval) {
    console.log('sleeping interval:', interval/1000);
    return new Promise((resolve) => {setTimeout(resolve, interval);});
}


async function addRule(nacl, ruleNumber, port, action) {
    var rule = { 
        CidrBlock: '0.0.0.0/0',
        Egress: false,
        PortRange: {
            From: port, 
            To: port
        },
        Protocol: '6',
        RuleAction: action,
        RuleNumber: ruleNumber
    };
    var createResponse = await nacl.createRule(rule);
    console.log('addRule done:', ruleNumber); 
}

async function testOne(ip, port, result) {
    return request({uri : "http://" + ip + ':' + port.toString(), timeout:1000}, function (err, res, body) {
        var ret = false;
        if (err) { 
            ret = false;
        }
        else {
            ret = true;
        }
        if(result == ret) {
            passed ++;
            console.log('Passed result:', result, ' port:', port);
        }
        else {
            failed ++;
            console.log('Failed result:', result, ' port:', port);
        }
    });    
}

async function testAccess(ip, ports, results) {
    console.log('testAccess ports:', ports);
    for(var i = 0; i < ports.length; i++) {
        await testOne(ip, ports[i], results[i]);
    }
}

async function test(ip) {
    var nacl = new NACLImpl();
    var interval = 2000; // the aws rules take time to take effect

    var rules = await nacl.getRules();
    // console.log('getResponse rules:', rules);


    // Make sure we have servers running on 80, 8080, 8081, 8082
    // Test that none of them are accessible
    await testAccess(ip, [80, 8080, 8081, 8082], [false, false, false, false]);    
    await addRule(nacl, 101, 80, "allow");
    await testSleep(interval);
    await testAccess(ip, [80, 8080, 8081, 8082], [true, false, false, false]);
    await addRule(nacl, 102, 8080, "allow");
    await testSleep(interval);
    await testAccess(ip, [80, 8080, 8081, 8082], [true, true, false, false]);
    await addRule(nacl, 201, 8081, "allow");
    await testSleep(interval);
    await testAccess(ip, [80, 8080, 8081, 8082], [true, true, true, false]);
    //addRule(nacl, 202, 8082, "allow");
    //testAccess(ip, [80, 8080, 8081, 8082], [true, true, true, true]);
    
    // await nacl.deleteRule(202);
    //testAccess(ip, [80, 8080, 8081, 8082], [true, true, true, false]);
    await nacl.deleteRule(201);
    await testSleep(interval);
    await testAccess(ip, [80, 8080, 8081, 8082], [true, true, false, false]);
    await nacl.deleteRule(102);
    await testSleep(interval);
    await testAccess(ip, [80, 8080, 8081, 8082], [true, false, false, false]);
    await nacl.deleteRule(101);
    await testSleep(interval);
    await testAccess(ip, [80, 8080, 8081, 8082], [false, false, false, false]);
    console.log('passed:', passed, ' failed:', failed);
}

function formatRule(cidr, egress, fromPort, toPort, protocol, action, ruleNumber) {
    var rule = { 
        CidrBlock: cidr,
        Egress: egress,
        PortRange: {
            From: fromPort, 
            To: toPort
        },
        Protocol: protocol,
        RuleAction: action,
        RuleNumber: ruleNumber
    };
    return rule;
}
/*
 * Cases to test
 * 1. deny rule in 100s blocks allow rule in 200s
 * 2. deny rule in 200s ignored due to allow rule in 100s
 * 3. allow rule in 100s masks deny rule in 200s
 * 4. allow rule in 200s masked by deny rule in 100s 
 */

async function testCheck(ip) {
    var nacl = new NACLImpl();
    var interval = 2000; // the aws rules take time to take effect

    var rules = await nacl.getRules();
    // await addRule(nacl, 101, 80, "allow");
    // await addRule(nacl, 102, 8080, "allow");
    // await addRule(nacl, 201, 8081, "allow");
    // await testSleep(interval);
    // await testAccess(ip, [80, 8080, 8081, 8082], [true, true, true, false]);
    // console.log('passed:', passed, ' failed:', failed);

    await addRule(nacl, 105, 85, "deny");
    await addRule(nacl, 205, 8085, "deny");
    await testSleep(interval);

    
    // 1. deny rule in 100s blocks allow rule in 200s
    var rule = formatRule("0.0.0.0/0", false, 8081, 8081, '6', "deny", 110);
    console.log('Provider deny rule conflict:', nacl.checkConflict(rule));
    // 2. deny rule in 200s ignored due to allow rule in 100s
    var rule = formatRule("0.0.0.0/0", false, 80, 80, '6', "deny", 210);
    console.log('Tenant deny rule conflict:', nacl.checkConflict(rule));
    // 3. allow rule in 100s masks deny rule in 200s
    var rule = formatRule("0.0.0.0/0", false, 8085, 8085, '6', "allow", 115);
    console.log('Provider allow rule conflict:', nacl.checkConflict(rule));
    // 4. allow rule in 200s masked by deny rule in 100s 
    var rule = formatRule("0.0.0.0/0", false, 85, 85, '6', "allow", 215);
    console.log('Tenant allow rule conflict:', nacl.checkConflict(rule));
}

var ip = "54.212.76.29";
// test(ip);
// testCheck(ip);
