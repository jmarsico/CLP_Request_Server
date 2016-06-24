//require/import modules
var http = require('http');
var osc = require('osc-min');
var udp = require('dgram');
var express = require('express');
var bodyParser = require('body-parser');
var auth = require('http-auth');
var path = require('path');
var ua = require('universal-analytics');

//set up the objects
var app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use(express.static(path.join(__dirname,'dist')));
app.set('view engine', 'ejs');
app.set('views', __dirname + '/dist');

//google analytics
var visitor = ua('UA-77526554-2');


//////////////------------- SETUP -----------------------------------
//set up the auth
var basic = auth.basic({
    realm: "Admin User.",
    file: __dirname + "/data/users.htpasswd"
});


var currentStatus;
var frameRate;
var resumeAt;

//udp setup
var oscDestPort = 12345;
var oscInPort = 23456;
sock = udp.createSocket("udp4", function(msg, ringo) {
    var error, error1, message;
    message= osc.fromBuffer(msg);

    //extract the framerate from OSC message
    frameRate = message.args[0].value;

    //extract the status from OSC message (is system sending to lights?)
    var sending = message.args[1].value;

    //extract the amount of pause time remaining
    resumeAt = message.args[2].value;

    //change local status and tell GA
    if(sending == true){
        currentStatus = "ON";
        visitor.event("Heartbeat", "ON", "Framerate", frameRate).send();
    } else if(sending == false){
        currentStatus = "OFF";
        visitor.event("Heartbeat", "OFF", "Framerate", frameRate).send();
    }

    try {
        return console.log(osc.fromBuffer(msg));

    }   catch(error1) {
        error = error1;
        return console.log('invalid OSC packet');
    }
});

sock.bind(oscInPort);

//////////////------------- OSC FUNCTIONS -----------------------------------

//----------------------------------------------------------EXPLODE!!
function send_explode_message(params) {

    if(params.length == 2 || params.length == 3){
        var buf;            //the UDP buffer
        //if we only receive 2 parameters, default size param to 0.5
        if(params.length == 2){
            buf = osc.toBuffer({
                address: "/explode",
                args: [
                    parseInt(params[0]),
                    parseInt(params[1]),
                    50
                ]
            })
        }
        //if we receive all 3 parameters for explode
        else if(params.length == 3){
            buf = osc.toBuffer({
                address: "/explode",
                args: [
                    parseInt(params[0]),
                    parseInt(params[1]),
                    parseInt(params[2])
                ]
            })
        }
        sock.send(buf, 0, buf.length, 12345, "localhost");
        console.log(params);
    }
}

//----------------------------------------------------------SWEEP!!
function send_sweep_params(params) {
    if(params.length == 4 || params.length == 5){
        var buf;


        if(params.length == 4){
            buf = osc.toBuffer({
                address: "/sweep",
                args: [
                    params[0],
                    params[1],
                    params[2],
                    params[3],
                    50
                ]
            })
        }

        else if(params.length == 5){
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
        }
        sock.send(buf, 0, buf.length, 12345, "localhost");
        console.log(params);
    }
}

//----------------------------------------------------------DOTS!!
function send_dots_params(params){
    if(params.length == 2){
        var buf;
        buf = osc.toBuffer({
            address: '/dots',
            args: [
                parseInt(params[0]),
                parseInt(params[1])
            ]
        })
        sock.send(buf, 0, buf.length, 12345, "localhost");
    }
    else if(params.length == 1){
	var buf;
	buf = osc.toBuffer({
		address:'/dots',
		args: [
		   parseInt(params[0]),
		   50
		]
	})
	sock.send(buf, 0, buf.length, 12345, "localhost");
    }

}

//----------------------------------------------------------PAUSE!!
function send_dots_params(params){
    if(params.length == 1){
        var buf;
        buf = osc.toBuffer({
            address: '/pause',
            args: [
                parseInt(params[0])
            ]
        })
        sock.send(buf, 0, buf.length, 12345, "localhost");
    }
}

//////////////------------- REQUEST HANDLERS ------------------------

//--------GET EXPLODE
app.get('/explode', function(req, res){

    var params =[];
    if(req.query.start_x) params.push(parseInt(req.query.start_x));
    if(req.query.start_y) params.push(parseInt(req.query.start_y));
    if(req.query.size) params.push(parseInt(req.query.size));



    if(params.length >= 2){
        send_explode_message(params);
        res.json({
            'start_x': params[0],
            'start_y': req.query.start_y,
            'size': req.query.size
        });
    } else {
        res.json({
            'status': 404
        })
    }
    visitor.event("User Command", "Explode").send();
});

//--------GET SWEEP
app.get('/sweep', function(req,res){

    var params = [];
    if(req.query.start_x) params.push(parseInt(req.query.start_x));
    if(req.query.start_y) params.push(parseInt(req.query.start_y));
    if(req.query.end_x) params.push(parseInt(req.query.end_x));
    if(req.query.end_y) params.push(parseInt(req.query.end_y));
    if(req.query.speed) params.push(parseInt(req.query.speed));

    if(params.length >= 4){
        send_sweep_params(params);
        res.json({
            'start_x': params[0],
            'start_y': req.query.start_y,
            'end_x': req.query.end_x,
            'end_y': req.query.end_y,
            'speed': req.query.speed
        });
    } else {
        res.json({
            'status': 404
        })
        console.log(req.query);

    }
    visitor.event("User Command", "Sweep").send();
});

//--------GET DOTS
app.get('/dots', function(req,res){
    var params =[];
    if(req.query.size) params.push(parseInt(req.query.size));
    if(req.query.duration) params.push(parseInt(req.query.duration));

    if(params.length  >= 1){
        send_dots_params(params);
        res.json({
            'size': req.query.size,
            'duration': req.query.duration
        });
    } else {
        res.json({
            'status': 404
        });
    }
    visitor.event("User Command", "Dots").send();
});



//{ status: 'current status', scene: 'current scene', frame_rate: 'xfps', resume_at: 'time' }
app.get('/status', auth.connect(basic), function(req,res){
    console.log("request status");
    res.json({
        'status': currentStatus,
        'frame_rate': frameRate,
        'resume_at': resumeAt
    });
});

app.get('/pause', auth.connect(basic), function(req,res){

});


//serve the admin.html page with auth
app.get('/admin', auth.connect(basic), function(req,res){
    console.log("auth test");
    res.sendFile(path.join(__dirname + '/dist/admin.html'));
    visitor.pageview("/admin").send();
});

//serve the admin.html page with auth
app.get('/',  function(req,res){
    console.log("new user");
    res.sendFile(path.join(__dirname + '/dist/index.html'));
    visitor.pageview("/").send();
});



// //Lets define a port we want to listen to
const PORT=80;

//Lets start our server
app.listen(PORT, function(){
    //Callback triggered when server is successfully listening. Hurray!
    console.log("Server listening on: http://localhost:%s", PORT);
});
