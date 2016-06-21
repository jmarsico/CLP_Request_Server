//Lets require/import the HTTP module
var http = require('http');
var osc = require('osc-min');
var udp = require('dgram');
var express = require('express');
var bodyParser = require('body-parser');
var winston = require('winston');
var auth = require('http-auth');
var path = require('path');





//http://localhost:8080/api?explode=2%201&force=0.23%200.1&sweep=0.1%200.2%200.4%200.2%200.3&dots=0.1%200.2
var app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
// app.use('/', express.static('dist/admin.html'));
app.use(express.static(path.join(__dirname,'dist')));
app.set('view engine', 'ejs');
app.set('views', __dirname + '/dist');


var basic = auth.basic({
    realm: "Admin User.",
    file: __dirname + "/data/users.htpasswd"
});


var systemStatus = 'running';


//udp setup
var oscDestPort = 12345;
var oscInPort = 23456;
sock = udp.createSocket("udp4", function(msg, ringo) {
    var error, error1, message;
    try {
        return console.log(osc.fromBuffer(msg));
    }   catch(error1) {
        error = error1;
        return console.log('invalid OSC packet');
    }
});

sock.bind(oscInPort);

winston.add(winston.transports.File,{ filename: '/var/log/node.log'});

//----------------------------------------------------------EXPLODE!!
function send_explode_message(explodeParams) {

    if(explodeParams.length == 2 || explodeParams.length == 3){
        var buf;            //the UDP buffer
        //if we only receive 2 parameters, default size param to 0.5
        if(explodeParams.length == 2){
            buf = osc.toBuffer({
                address: "/explode",
                args: [
                    parseFloat(explodeParams[0]),
                    parseFloat(explodeParams[1]),
                    0.5
                ]
            })
        }
        //if we receive all 3 parameters for explode
        else if(explodeParams.length == 3){
            buf = osc.toBuffer({
                address: "/explode",
                args: [
                    parseFloat(explodeParams[0]),
                    parseFloat(explodeParams[1]),
                    parseFloat(explodeParams[2])
                ]
            })
        }
        sock.send(buf, 0, buf.length, 12345, "localhost");
    }
}

//----------------------------------------------------------SWEEP!!
function send_sweep_params(sweepParams) {
    //?sweep=x1 y1 x2 y2 speed
    var params = sweepParams.split(' ');


    if(params.length == 5){
        var buf;
        buf = osc.toBuffer({
            address: "/sweep",
            args: [
                params[0],
                params[1],
                params[2],
                params[3],
                params[4]
            ]
        })
        sock.send(buf, 0, buf.length, 12345, "localhost");
    }
}

//----------------------------------------------------------FORCE!!
function send_force_params(forceParams){
    var params = forceParams.split(' ');
    if(params.length == 2){
        var buf;
        buf = osc.toBuffer({
            address: '/dots',
            args: [
                params[0],
                params[1]
            ]
        })
        sock.send(buf, 0, buf.length, 12345, "localhost");
    }
}

//----------------------------------------------------------DOTS!!
function send_dots_params(dotsParams){
    var params = dotsParams.split(' ');
    if(params.length == 2){
        var buf;
        buf = osc.toBuffer({
            address: '/dots',
            args: [
                parseFloat(params[0]),
                parseFloat(params[1])
            ]
        })
        sock.send(buf, 0, buf.length, 12345, "localhost");
    }

}



//----------------------------------------------------------GET!!
app.get('/api', function(req, res){
    //explode
    var explodeQuery;
    var sweepParams;
    var dotsParams;

    if(req.query.explode !== 'undefined' && req.query.explode){
        explodeQuery = req.query.explode;
        var params = req.query.explode.split(' ');
        send_explode_message(params);
    }
    //force (gravity)
    if(req.query.force !== 'undefined' && req.query.force){
        send_force_params(req.query.force);
    }
    //sweep
    if(req.query.sweep !== 'undefined' && req.query.sweep){
        send_sweep_params(req.query.sweep);
    }
    //dots
    if(req.query.dots !== 'undefined' && req.query.dots){
        send_dots_params(req.query.dots);
    }

    res.json({
        'explode': explodeQuery,
        'force': req.query.force,
        'sweep': req.query.sweep,
        'dots': req.query.dots
    })
});


//----------------------------------------------------------POST!!
app.post('/api/explode', function(req,res){
    var params;
    params.push(req.body.x);
    params.push(req.body.y);
    params.push(req.body.size);
    send_explode_message(req.body);
});



//
// app.get('/', function(req,res){
//   console.log("someone is here");
//
//  res.sendFile(__dirname + '/dist/admin.html');
//
// });

//
app.get('/admin', auth.connect(basic), function(req,res){
    console.log("auth test");
    res.sendFile(path.join(__dirname + '/dist/admin.html'));
});


// //Lets define a port we want to listen to
const PORT=80;

//Lets start our server
app.listen(PORT, function(){
    //Callback triggered when server is successfully listening. Hurray!
    console.log("Server listening on: http://localhost:%s", PORT);
});
