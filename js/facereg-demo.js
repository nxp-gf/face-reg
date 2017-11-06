/*
Copyright 2015-2016 Carnegie Mellon University

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

navigator.getUserMedia = navigator.getUserMedia ||
    navigator.webkitGetUserMedia ||
    (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) ?
        function(c, os, oe) {
            navigator.mediaDevices.getUserMedia(c).then(os,oe);
        } : null ||
    navigator.msGetUserMedia;

window.URL = window.URL ||
    window.webkitURL ||
    window.msURL ||
    window.mozURL;

// http://stackoverflow.com/questions/6524288
$.fn.pressEnter = function(fn) {

    return this.each(function() {
        $(this).bind('enterPress', fn);
        $(this).keyup(function(e){
            if(e.keyCode == 13)
            {
              $(this).trigger("enterPress");
            }
        })
    });
 };

function registerHbarsHelpers() {
    // http://stackoverflow.com/questions/8853396
    Handlebars.registerHelper('ifEq', function(v1, v2, options) {
        if(v1 === v2) {
            return options.fn(this);
        }
        return options.inverse(this);
    });
}

function drawPeopleName(cc,rect,name)
{

    cc.lineWidth=2;
    cc.strokeStyle="red";
    cc.beginPath();
    cc.rect(rect[0], rect[1], rect[2], rect[3]);
    cc.closePath();
    cc.font="25px Arial";
    cc.fillText(name, rect[0], rect[1]);
    cc.stroke();
}

function processFrameLoop() {

//    console.log("Start sendFrameLoop");
//    if (tok > 0) {
/*
        var canvas = document.createElement('canvas');
        canvas.width = vid.width;
        canvas.height = vid.height;
        var cc = canvas.getContext('2d');
        cc.translate(canvas.width, 0);
        cc.scale(-1, 1);
*/
        cc.drawImage(vid, 0, 0, vid.width, vid.height);
        var tmp = regRet;
        for (var key in tmp) {
<<<<<<< HEAD
            drawPeopleName(cc, tmp[key], " ");
            //drawPeopleName(cc, tmp[key]["pos"], tmp[key]["name"]);
=======
            drawPeopleName(cc, tmp[key], key);
>>>>>>> parent of 9f73294... fix bugs
        }
　　    //context.fillStyle = "#000000";
/*
        var apx = cc.getImageData(0, 0, vid.width, vid.height);

        var dataURL = canvas.toDataURL('image/jpeg', 0.6)

        var msg = {
            'type': 'FRAME',
            'dataURL': dataURL,
            'identity': defaultPerson
        };
        socket.send(JSON.stringify(msg));
*/
//        tok--;
//    }
//    console.log("End sendFrameLoop");
    setTimeout(function() {requestAnimFrame(processFrameLoop)}, 0);
}
function sendFrame() {
    if (socket == null || socket.readyState != socket.OPEN ||
        !vidReady || numNulls != defaultNumNulls) {
        return;
    }
    var apx = cc.getImageData(0, 0, vid.width, vid.height);

    var dataURL = ctx.toDataURL('image/jpeg', 0.6)

    var msg = {
        'type': 'FRAME',
        'dataURL': dataURL,
        'identity': defaultPerson
    };
    socket.send(JSON.stringify(msg));
<<<<<<< HEAD
    console.log("End sendFrame");
    setTimeout("sendFrame()", 30);
=======
>>>>>>> parent of 9f73294... fix bugs
}

function redrawPeople() {
   document.getElementById("identity").value=people;
}

function getDataURLFromRGB(rgb) {
    var rgbLen = rgb.length;

    var canvas = $('<canvas/>').width(96).height(96)[0];
    var ctx = canvas.getContext("2d");
    var imageData = ctx.createImageData(96, 96);
    var data = imageData.data;
    var dLen = data.length;
    var i = 0, t = 0;

    for (; i < dLen; i +=4) {
        data[i] = rgb[t+2];
        data[i+1] = rgb[t+1];
        data[i+2] = rgb[t];
        data[i+3] = 255;
        t += 3;
    }
    ctx.putImageData(imageData, 0, 0);

    return canvas.toDataURL("image/png");
}

function updateRTT() {
    var diffs = [];
    for (var i = 5; i < defaultNumNulls; i++) {
        diffs.push(receivedTimes[i] - sentTimes[i]);
    }
    $("#rtt-"+socketName).html(
        jStat.mean(diffs).toFixed(2) + " ms (σ = " +
            jStat.stdev(diffs).toFixed(2) + ")"
    );
}

function sendIndentityReq() {
    var msg = {
        'type': 'IDENTITY_REQ',
        'training': training
    };
    socket.send(JSON.stringify(msg));
}

function createSocket(address, name) {
    socket = new WebSocket(address);
    socketName = name;
    socket.binaryType = "arraybuffer";
    socket.onopen = function() {
        $("#serverStatus").html("Connected to " + name);
        sentTimes = [];
        receivedTimes = [];
        tok = defaultTok;
        numNulls = 0

        socket.send(JSON.stringify({'type': 'NULL'}));
        sentTimes.push(new Date());
    }
    socket.onmessage = function(e) {
//        console.log(e);
        j = JSON.parse(e.data)
        if (j.type == "NULL") {
            receivedTimes.push(new Date());
            numNulls++;
            if (numNulls == defaultNumNulls) {
                updateRTT();
                sendIndentityReq();
                sendFrame();
            } else {
                socket.send(JSON.stringify({'type': 'NULL'}));
                sentTimes.push(new Date());
            }
        } else if (j.type == "PROCESSED") {
            tok++;
            //sendFrame();
        } else if (j.type == "IDENTITY_RESP") {
            people = j['content'];
            redrawPeople();
        } else if (j.type == "ANNOTATED") {
/*
            $("#detectedFaces").html(
                "<img src='" + j['content'] + "' width='800px'></img>"
            )
*/
            regRet = j['content'];
        } else if (j.type == "TSNE_DATA") {
            BootstrapDialog.show({
                message: "<img src='" + j['content'] + "' width='100%'></img>"
            });
        } else {
            console.log("Unrecognized message type: " + j.type);
        }
    }
    socket.onerror = function(e) {
        console.log("Error creating WebSocket connection to " + address);
        console.log(e);
    }
    socket.onclose = function(e) {
        if (e.target == socket) {
            $("#serverStatus").html("Disconnected.");
        }
    }
}

function umSuccess(stream) {
    console.log("in umSuccess");
    if (vid.mozCaptureStream) {
        vid.mozSrcObject = stream;
    } else {
        vid.src = (window.URL && window.URL.createObjectURL(stream)) ||
            stream;
    }
    vid.play();
    vidReady = true;
    processFrameLoop();
    sendFrame();
}

function trainingChkCallback() {
    console.log("in trainingChkCallback");
    training = $("#trainingChk").prop('checked');
    

    if (training) {
        var newPerson = $("#addPersonTxt").val();

        if(document.getElementById("addPersonTxt").value=='')
        { alert("Please input your name!"); return; }

        if (socket != null) {
            var msg = {
                'type': 'TRAINING_START',
                'val': newPerson
            };
            socket.send(JSON.stringify(msg));
        }
        makeTabActive("tab-preview");
    } else {
        if (socket != null) {
            var msg = {
                'type': 'TRAINING_FINISH',
                'val': ""
            };
            socket.send(JSON.stringify(msg));
        }
        makeTabActive("tab-annotated");
    }
}

function changeServerCallback() {
    $(this).addClass("active").siblings().removeClass("active");
    switch ($(this).html()) {
    case "Local":
        socket.close();
        createSocket("wss:" + window.location.hostname + ":9000", "Local");
        break;
    case "CMU":
        socket.close();
        createSocket("wss://facerec.cmusatyalab.org:9000", "CMU");
        break;
    case "AWS East":
        socket.close();
        createSocket("wss://54.159.128.49:9000", "AWS-East");
        break;
    case "AWS West":
        socket.close();
        createSocket("wss://54.188.234.61:9000", "AWS-West");
        break;
    default:
        alert("Unrecognized server: " + $(this.html()));
    }
}
