/**
 * Dependencies
 */
var Server = require('ws').Server;
var protocol = require('../protocol/index');
var mixin = require('utils-merge');

/**
 * Private variables and functions
 */

var devices = {}; // { deviceid: [ws, ws, ws] }
var apps = {};  // { deviceid: [ws, ws, ws] }

var clean = function (ws) {
  ws.devices.forEach(function (deviceid) {
    if (Array.isArray(devices[deviceid]) && devices[deviceid][0] === ws) {
      delete devices[deviceid];
      protocol.postMessage({
        type: 'device.online',
        deviceid: deviceid,
        online: false
      });
    }

    var pos, wsList = apps[deviceid];
    if (wsList && (pos = wsList.indexOf(ws)) !== -1) {
      wsList.splice(pos, 1);
      if (wsList.length === 0)  delete apps[deviceid];
    }
  });
};

var Types = {
  'REQUEST': 1,
  'RESPONSE': 2,
  'COMMAND': 3,
  'UNKNOWN': 0
};
var getType = function (msg) {
  if (msg.action && msg.deviceid && msg.apikey) return Types.REQUEST;

  if (msg.command && msg.deviceid && msg.apikey) return Types.COMMAND;

  if (typeof msg.error === 'number') return Types.RESPONSE;

  return Types.UNKNOWN;
};

var postRequest = function (ws, req) {
  if (req.ws && req.ws === ws) {
    return;
  }
  ws.send(JSON.stringify(req, function (key, value) {
    if (key === 'ws') {
      // exclude property ws from resulting JSON string
      return undefined;
    }
    return value;
  }));
};

var postResponse = function (ws, req) {
  if (req.ws && req.ws != ws) {
    return;
  }
  
  res = {"error":0,"apikey":req.api.key,"deviceid":req.deviceid}

  ws.send(JSON.stringify(res, function (key, value) {
    if (key === 'ws') {
      // exclude property ws from resulting JSON string
      return undefined;
    }
    return value;
  }));
};

var postRequestToApps = function (req) {
  apps[req.deviceid] && apps[req.deviceid].forEach(function (ws) {
    postRequest(ws, req);
  });
    
};
//sunkailiang 20151003
var postImageToApps = function (req) {
  apps[req.deviceid] && apps[req.deviceid].forEach(function (ws) {
    postRequest(ws, req);
  });
    
};

/* sunkailiang 20150923 */
var postCommand = function (ws, req) {
  ws.send(JSON.stringify(req, function (key, value) {
    if (key === 'ws') {
      // exclude property ws from resulting JSON string
      return undefined;
    }
    return value;
  }));
};

protocol.on('device.update', function (req) {
  postRequestToApps(req);
});

protocol.on('device.online', function (req) {
  postRequestToApps(req);
});

// sunkailiang 20151002
protocol.on('device.display', function (req) {
  postImageToApps(req);
});


protocol.on('app.update', function (req) {
  devices[req.deviceid] && devices[req.deviceid].forEach(function (ws) {
    postRequest(ws, protocol.utils.transformRequest(req));
  }); 
});

protocol.on('app.command', function (req) {  //sunkailiang 20150925
    postCommand(req.ws, req);
});

/**
 * Exports
 */

module.exports = function (httpServer) {
  var server = new Server({
    server: httpServer,
    path: '/api/ws'
  });

  server.on('connection', function (ws) {
    ws.devices = [];

    ws.on('message', function (msg) {
      try {
        msg = JSON.parse(msg);
      }
      catch (err) {
        // Ignore non-JSON message
        return;
      }

      switch (getType(msg)) {
        case Types.UNKNOWN:
          return;

        case Types.RESPONSE:
          protocol.postResponse(msg);
          return;

        case Types.REQUEST:
          if (protocol.utils.fromDevice(msg)) {   // sunkailiang 20150925
            protocol.postRequest(msg, function (res) {
              res = protocol.utils.transformResponse(res);
              ws.send(JSON.stringify(res));

              if (res.error) return;
              devices[msg.deviceid] = devices[msg.deviceid] || [];
              if (devices[msg.deviceid][0] === ws) return;

              devices[msg.deviceid] = [ws];
              ws.devices.push(msg.deviceid);
              protocol.postMessage({
                type: 'device.online',
                deviceid: msg.deviceid,
                online: true
              });
              return;
            });

          }
          else{
              msg.ws = ws;
            
              protocol.postRequest(msg, function (res){
                ws.send(JSON.stringify(res));
                if (res.error) return;
              
                apps[msg.deviceid] = apps[msg.deviceid] || [];
                if (apps[msg.deviceid].indexOf(ws) !== -1) return;
                apps[msg.deviceid].push(ws);
                ws.devices.push(msg.deviceid);  
              });        
                        
          }
          return;
        case Types.COMMAND:    //sunkailiang 2010924
          msg.ws = devices[msg.deviceid][0];
          protocol.postCommand(msg, function (res) {
            ws.send(JSON.stringify(res));

            if (res.error) return;

            apps[msg.deviceid] = apps[msg.deviceid] || [];
            if (apps[msg.deviceid].indexOf(ws) !== -1) return;

            apps[msg.deviceid].push(ws);
            ws.devices.push(msg.deviceid);  
          });
         return;


      }
    });

    ws.on('close', function () {
      clean(ws);
    });

    ws.on('error', function () {
      clean(ws);
    });
  });

};

