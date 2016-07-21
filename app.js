//require/import modules
var http = require('http');
var osc = require('osc-min');
var udp = require('dgram');
var express = require('express');
var bodyParser = require('body-parser');
var auth = require('http-auth');
var path = require('path');
var ua = require('universal-analytics');
var exec = require('child_process').exec;

//set up the objects
var app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use(express.static(path.join(__dirname,'dist')));


//google analytics
var visitor = ua('UA-77526554-2');

//////////////////////////////////////////////////////////////////////
//////////////------------- SETUP -----------------------------------
//////////////////////////////////////////////////////////////////////
//set up the auth for admin pages
var basic = auth.basic({
    realm: "Admin User.",
    file: __dirname + "/data/users.htpasswd"
});


//status variables
var currentStatus;
var frameRate;
var resumeAt;

//OSC setup
var oscDestPort = 12345;
var oscInPort = 23456;

//creat socket and listen for incoming messages
sock = udp.createSocket("udp4", function(msg, ringo) {
    var error, error1, message;
    message= osc.fromBuffer(msg);

    //extract the framerate from OSC message
    if(message.args[0].value){
    frameRate = message.args[0].value;
}
//    console.log(frameRate);
    //extract the status from OSC message (is system sending to lights?)
    var sending = message.args[1].value;

    //extract the amount of pause time remaining
    var millisRemaining = message.args[2].value;

    var d = new Date();
    var currentHours = d.getHours();
    var currentMin = d.getMinutes();

    var minRemaining = millisRemaining/(1000*60);
    var futureHours = currentHours + (minRemaining / 60);
    var futureMin = currentMin + (minRemaining % 60);
    currentHours += futureMin % 60;
    resumeAt = (toString(futureHours) + ":" + toString(futureMin));

    //change local status and tell GA
    if(sending == true){
        currentStatus = "ON";
        visitor.event("Heartbeat", "ON", "Framerate", frameRate).send();
    } else if(sending == false){
        currentStatus = "OFF";
        visitor.event("Heartbeat", "OFF", "Framerate", frameRate).send();
    }

    try {
        // return console.log(osc.fromBuffer(msg));
    }   catch(error1) {
        error = error1;
        return console.log('invalid OSC packet');
    }
});

//bind to the port and listen
sock.bind(oscInPort);




function execute(command, callback){
    exec(command, function(error, stdout, stderr) { callback(stdout); });
}



//////////////////////////////////////////////////////////////////////
//////////////------------- OSC SENDERS------- ------------------------
//////////////////////////////////////////////////////////////////////

//----------------------------------------------------------EXPLODE!!
function send_explode_message(params) {

    //if the number of parameters is correct, send OSC messages
    if(params.length == 2 || params.length == 3){
        var buf;            //the UDP buffer
        //if we only receive 2 parameters, default size param to 0.5
        if(params.length == 2){
            //create a buffer to send OSC message
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

        //send the OSC buffer over UDP
        sock.send(buf, 0, buf.length, 12345, "localhost");
        console.log("explode" + params);
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
        console.log("sweep" + params);
    }
}

//----------------------------------------------------------DOTS!!
function send_dots_params(params){

    if(params.length == 1 || params.length == 2){
        var buf;
        if(params.length == 2){
            buf = osc.toBuffer({
                address: '/dots',
                args: [
                    parseInt(params[0]),
                    parseInt(params[1])
                ]
            })
        }
        else if(params.length == 1){
        	buf = osc.toBuffer({
        		address:'/dots',
        		args: [
        		   parseInt(params[0]),
        		   50
        		]
        	})
        }
        sock.send(buf, 0, buf.length, 12345, "localhost");
        console.log("dots" + params);
    }

}

//----------------------------------------------------------PAUSE!!
function send_pause(params){
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


//----------------------------------------------------------PAUSE!!
function send_turnOnOff(bOnOff){
    var buf;
    buf = osc.toBuffer({
        address: '/turnOnOff',
        args: [
            bOnOff
        ]
    })
    sock.send(buf, 0, buf.length, 12345, "localhost");
}



//////////////////////////////////////////////////////////////////////
//////////////------------- REQUEST HANDLERS ------------------------
//////////////////////////////////////////////////////////////////////

//--------GET EXPLODE
app.get('/explode', function(req, res){

    var params =[];
    if(typeof req.query.start_x !=  'undefined') params.push(parseInt(req.query.start_x));
    if(typeof req.query.start_y != 'undefined') params.push(parseInt(req.query.start_y));
    if(typeof req.query.size != 'undefined') params.push(parseInt(req.query.size));

    if(params.length >= 2){
        send_explode_message(params);

        res.json({
            'start_x': params[0],
            'start_y': req.query.start_y,
            'size': req.query.size
        });
    } else {
        res.status(404).send('Not Enough Parameters');
    	console.log("not enough params");
}
    visitor.event("User Command", "Explode").send();
});

//--------GET SWEEP
app.get('/sweep', function(req,res){

    var params = [];
    if(typeof req.query.start_x != 'undefined') params.push(parseInt(req.query.start_x));
    if(typeof req.query.start_y != 'undefined') params.push(parseInt(req.query.start_y));
    if(typeof req.query.end_x != 'undefined') params.push(parseInt(req.query.end_x));
    if(typeof req.query.end_y != 'undefined') params.push(parseInt(req.query.end_y));
    if(typeof req.query.speed != 'undefined') params.push(parseInt(req.query.speed));

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
        res.status(404).send('Not Enough Parameters');
    	console.log("not enough params");
        console.log(req.query);

    }
    visitor.event("User Command", "Sweep").send();
});

//--------GET DOTS
app.get('/dots', function(req,res){
    var params =[];
    if(typeof req.query.size != 'undefined') params.push(parseInt(req.query.size));
    if(typeof req.query.duration != 'undefined') params.push(parseInt(req.query.duration));

    if(params.length  >= 1){
        send_dots_params(params);
        res.json({
            'size': req.query.size,
            'duration': req.query.duration
        });
    } else {
        res.status(404).send('Not Enough Parameters');
    	console.log("not enough params");
    }
    visitor.event("User Command", "Dots").send();
});



//--------------GET STATUS
app.get('/status', auth.connect(basic), function(req,res){
    console.log("request status");
    console.log(frameRate);
    res.json({
        'status': currentStatus,
        'frameRate': frameRate,
        'resumeAt': resumeAt
    });
});


//------------------GET PAUSE
app.get('/pause', auth.connect(basic), function(req,res){
    var params =[];

    if(typeof req.query.minutes != 'undefined') params.push(parseInt(req.query.minutes));
    if(params.length == 1){
        send_pause(params);

        var d = new Date();
        var currentHours = parseInt(d.getHours());
        console.log(currentHours);
        var currentMin = parseInt(d.getMinutes());
        console.log(currentMin);

        var futureHours = parseInt(currentHours + Math.floor(params[0] / 60));
        console.log('fh' + futureHours);
        var futureMin = parseInt(currentMin + (params[0] % 60));
        console.log('fm' + futureMin);
        futureHours += parseInt(futureMin % 60);
        console.log('fh' + futureHours);
        var timeString = (futureHours + ":" + futureMin);
        console.log( timeString);

        res.json({
            'resumeAt': timeString
            'pause': req.query.minutes
        });
    } else {
        res.status(404).send('Not Enough Parameters');
    	console.log("not enough params");
    }

});

app.get('/turnOn', auth.connect(basic), function(req,res){
    send_turnOnOff(true);
    res.json({
        'turnOn': 'hi'
    });

});

app.get('/turnOff', auth.connect(basic), function(req,res){
    send_turnOnOff(false);
    res.json({
        'turnOff': 'hi'
    });
    console.log("turn OFF");
});

app.get('/hardReset', auth.connect(basic), function(req,res){
    res.json({
        'hardReset': 'please wait'
    });

    execute('shutdown -r now', function(callback){
        console.log(callback);
    });

});

//serve the admin.html page with auth
app.get('/admin', auth.connect(basic), function(req,res){
    console.log("auth user");
    res.sendFile(path.join(__dirname + '/dist/admin.html'));
    visitor.pageview("/admin").send();
});


//serve the index.html page with auth
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
