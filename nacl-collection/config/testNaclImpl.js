var NACLImpl = require("./naclImpl")
const request = require('request');

var passed = 0;
var failed = 0;

async function testSleep(interval) {
    console.log('sleeping interval:', interval/1000);
    return new Promise((resolve) => {setTimeout(resolve, interval);});
}

async function addRule(nacl, ruleNumber, port) {
    var rule = { 
        CidrBlock: '0.0.0.0/0',
        Egress: false,
        PortRange: {
            From: port, 
            To: port
        },
        Protocol: '6',
        RuleAction: 'allow',
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
    await addRule(nacl, 101, 80);
    await testSleep(interval);
    await testAccess(ip, [80, 8080, 8081, 8082], [true, false, false, false]);
    await addRule(nacl, 102, 8080);
    await testSleep(interval);
    await testAccess(ip, [80, 8080, 8081, 8082], [true, true, false, false]);
    await addRule(nacl, 201, 8081);
    await testSleep(interval);
    await testAccess(ip, [80, 8080, 8081, 8082], [true, true, true, false]);
    //addRule(nacl, 202, 8082);
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

// test();
var ip = "54.212.76.29";
test(ip);
