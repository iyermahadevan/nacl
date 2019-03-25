const request = require('request');

var passed = 0;
var failed = 0;

async function testOne(ip, port, result) {
    return request({uri : "http://" + ip + ':' + port.toString(), timeout:1000}, function (err, res, body) {
        var ret = false;
        if (err) { 
            ret = false;
        }
        else {
            ret = true;
        }
        console.log(port, ret);
    });    
}

async function testAccess(ip, ports, results) {
    console.log('testAccess ports:', ports);
    for(var i = 0; i < ports.length; i++) {
        await testOne(ip, ports[i], results[i]);
    }
}

var ip = "54.212.76.29";
testAccess(ip, [80, 8080, 8081, 8082], [false, false, false, false]);    
