#!/usr/bin/env python
#
# Copyright 2015-2016 Carnegie Mellon University
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

import os
import sys
fileDir = os.path.dirname(os.path.realpath(__file__))
sys.path.append(os.path.join(fileDir, "..", ".."))

import txaio
txaio.use_twisted()

from autobahn.twisted.websocket import WebSocketServerProtocol, \
    WebSocketServerFactory
from twisted.internet import task, defer
from twisted.internet.ssl import DefaultOpenSSLContextFactory

from twisted.python import log

import argparse
import cv2
#import imagehash
import json
from PIL import Image
import numpy as np
import os,time
import StringIO
import urllib
import base64
import threading, Queue

import facerecogniton.face_reg as face_reg

# For TLS connections
tls_crt = os.path.join(fileDir, 'tls', 'server.crt')
tls_key = os.path.join(fileDir, 'tls', 'server.key')

parser = argparse.ArgumentParser()
parser.add_argument('--port', type=int, default=9000,
                    help='WebSocket Port')

args = parser.parse_args()


class OpenFaceServerProtocol(WebSocketServerProtocol):
    def __init__(self):
        super(OpenFaceServerProtocol, self).__init__()
        self.training = False
        self.new_person = None
        face_reg.recog_engine_init(serverip='120.27.21.223')
        #face_reg.recog_engine_init(serverip='ec2-54-202-53-170.us-west-2.compute.amazonaws.com')
        #face_reg.recog_engine_init()
        #face_reg.recog_engine_init(serverip='47.95.202.40')
        self.peoples = face_reg.get_person_names()
        self.img_queue = Queue.Queue(maxsize = 3)
        self.res_queue = Queue.Queue(maxsize = 3)
        #self.t = threading.Thread(target=self.recogThread, args=())
        #self.t.start()

    def onConnect(self, request):
        print("Client connecting: {0}".format(request.peer))

    def onOpen(self):
        print("WebSocket connection open.")

    def onMessage(self, payload, isBinary):
        raw = payload.decode('utf8')
        msg = json.loads(raw)
        try:
            if msg['type'] == "IDENTITY_REQ":
                self.loadIdentity()
            elif msg['type'] == "TRAINING_START":
                print "TRAINING_START"
                name = msg['val'].encode('ascii', 'ignore')
                self.training = True
                self.new_person = face_reg.training_start(name)
                print self.new_person
            elif msg['type'] == "TRAINING_FINISH":
                print "TRAINING_END"
                if self.training == True:
                    self.training = False
                    face_reg.training_finish(self.new_person, self.onTrainFinish)
                    self.new_person = None
            elif msg['type'] == "FRAME":
                self.sendMessage('{"type": "PROCESSED"}')
                self.processFrame(msg['dataURL'], msg['identity'])
            elif msg['type'] == "NULL":
                self.sendMessage('{"type": "NULL"}')
        except Exception,e:
            self.sendMessage('{"type": "PROCESSED"}')
            print e

    def onTrainFinish(self, name, feature):
        self.loadIdentity()
        
    def loadIdentity(self):
        self.peoples = face_reg.get_person_names()
        msg = {
            "type": "IDENTITY_RESP",
            "content": ",".join(self.peoples)
        }
        self.sendMessage(json.dumps(msg))

    def processFrame(self, dataURL, identity):
        #if (self.img_queue.full()):
        #    self.img_queue.get()
        #self.img_queue.put(dataURL)
        #if (self.res_queue.empty() != True):
        #    rets = self.res_queue.get()
        #    
        #    msg = {
        #        "type": "ANNOTATED",
        #        "content": rets
        #    }
        #    self.sendMessage(json.dumps(msg))
        #return


        head = "data:image/jpeg;base64,"
        assert(dataURL.startswith(head))
        imgdata = base64.b64decode(dataURL[len(head):])

        pilImage = Image.open(StringIO.StringIO(imgdata))
        inFrame = np.array(pilImage)

        if self.training:
            face_reg.training_proframe(self.new_person, StringIO.StringIO(imgdata))
#            outFrame = inFrame
        else:
#            outFrame = face_reg.recog_process_frame(inFrame)
            rets = face_reg.recog_process_frame(inFrame)

#        imgdata = StringIO.StringIO()
#        pi = Image.fromarray(outFrame)
#        pi.save(imgdata, format = "jpeg")
#        imgdata.seek(0)
#        content = 'data:image/jpeg;base64,' + \
#            urllib.quote(base64.b64encode(imgdata.buf))
        msg = {
            "type": "ANNOTATED",
            "content": rets
        }
        self.sendMessage(json.dumps(msg))

    def recogThread(self):
        while (1):
            dataURL = self.img_queue.get()
            head = "data:image/jpeg;base64,"
            assert(dataURL.startswith(head))
            imgdata = base64.b64decode(dataURL[len(head):])

            pilImage = Image.open(StringIO.StringIO(imgdata))
            inFrame = np.array(pilImage)

            if self.training:
                face_reg.training_proframe(self.new_person, StringIO.StringIO(imgdata))
            else:
                rets = face_reg.recog_process_frame(inFrame)

           # msg = {
           #     "type": "ANNOTATED",
           #     "content": rets
           # }
           # self.sendMessage(json.dumps(msg))
            self.res_queue.put(rets)



def main(reactor):
    log.startLogging(sys.stdout)
    factory = WebSocketServerFactory()
    factory.protocol = OpenFaceServerProtocol
    ctx_factory = DefaultOpenSSLContextFactory(tls_key, tls_crt)
    reactor.listenSSL(args.port, factory, ctx_factory)
    return defer.Deferred()

if __name__ == '__main__':
    task.react(main)
