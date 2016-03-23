var Accessory = require('../').Accessory;
var Service = require('../').Service;
var Characteristic = require('../').Characteristic;
var uuid = require('../').uuid;

var server="ws://cloudino.io/websocket/user";
var email="<email>";
var password="<password>";
var devices = [
  {
    name:"Luces comedor",
    devid:"563cefe5e4b0c5a0a4b8ddf9",
    manufacturer:"Cloudino",
    model:"uno",
    services:[
      {
        name:"Foco uno",
        type:"Lightbulb", 
        subtype:"uno",
        characteristics:[
          {
            type:"On",
            on:{type:"CloudinoMsgValue", topic:"led", value:0}         
          }
        ],
        optionalCharacteristics:[
          {
            type:"Brightness",
            on:{type:"CloudinoMsgValue", topic:"x", value:0}        
          }          
        ]
      },
      {
        name:"Foco dos",
        type:"Lightbulb", 
        subtype:"dos",
        characteristics:[
          {
            type:"On",
            on:{type:"CloudinoMsgValue", topic:"led2", value:0}         
          }
        ],
        optionalCharacteristics:[
          {
            type:"Brightness",
            on:{type:"CloudinoMsgValue", topic:"x2", value:0}        
          }          
        ]
      }
    ]
  },  
  {
    name:"Luces Cocina",
    devid:"563cefe5e4b0c5a0a4b8ddfa",
    manufacturer:"Cloudino",
    model:"uno",
    services:[
      {
        name:"Foco uno",
        type:"Lightbulb", 
        subtype:"uno",
        characteristics:[
          {
            type:"On",
            on:{type:"CloudinoMsgValue", topic:"led", value:0}         
          }
        ],
        optionalCharacteristics:[
          {
            type:"Brightness",
            on:{type:"CloudinoMsgValue", topic:"x", value:0}        
          }          
        ]
      },
      {
        name:"Foco dos",
        type:"Lightbulb", 
        subtype:"dos",
        characteristics:[
          {
            type:"On",
            on:{type:"CloudinoMsgValue", topic:"led2", value:0}         
          }
        ],
        optionalCharacteristics:[
          {
            type:"Brightness",
            on:{type:"CloudinoMsgValue", topic:"x2", value:0}        
          }          
        ]
      }
    ]
  },    
];

function init(devices)
{
  var onEvents=[];

  var WebSocketClient = require("websocket").client;
  var client = new WebSocketClient();
   
  client.on("connectFailed", function(error) {
      console.log("Connect Error: " + error.toString());
  });
   
  client.on("connect", function(connection) {    
      console.log("WebSocket Client Connected");
      client.connection=connection;
      connection.on("error", function(error) {
          console.log("Connection Error: " + error.toString());
      });
      connection.on("close", function() {
          console.log("echo-protocol Connection Closed");
      });
      connection.on("message", function(message) {
          if (message.type === "utf8") {
              var data=JSON.parse(message.utf8Data);
              //console.log("Received:",data);
              if(data.type)
              {
                for(var x=0;x<onEvents.length;x++)
                {
                  var event=onEvents[x];
                  if(data.device==event.device && data.type==event.type && data.topic==event.characteristic.on.topic)
                  {
                    event.characteristic.on.value=JSON.parse(data.msg);
                    event.characteristic.on.receive=true;
                    event.service.setCharacteristic(Characteristic[event.characteristic.type], event.characteristic.on.value);                            
                    break;
                  }
                }
              }              
          }
      });
      
      function initSession(email,password) {
          connection.sendUTF(JSON.stringify({type:"login",tid:"000001",email:email,password:password}));
      }
      initSession(email,password);
  });   
  client.connect(server);  

  var getCdinoMgsValue=function(device,on)
  {
    var ret={
      "set":function(value, callback) {
        if(value===true)value=1;
        if(value===false)value=0;
        if(on.value==value && on.receive)
        {
          console.log("receive "+on.topic+":",on.value);  
          delete on.receive;
        }else{
          console.log("set "+on.topic+":",value);
          on.value=value;
          client.connection.sendUTF(JSON.stringify({type:"post2Device",tid:"000002",device:device.devid,topic:on.topic,msg:""+value}));          
        }
        callback();
      },
      "get":function(callback) {
        var err = null;       
        console.log("get "+on.topic+":"+on.value);
        callback(err, on.value);
      }
    };
    return ret; 
  };

  var initCharacteristic=function(device, characteristic, chara)
  {
      var on={};
      if(characteristic.on.type=="CloudinoMsgValue")
      {
        on=getCdinoMgsValue(device,characteristic.on);
      }
      Object.keys(on).forEach(function(key) {
        chara.on(key, on[key]);
      });
  };  

  var accessories=[];
  //console.log(devices);

  devices.forEach(function(device) {
    //console.log(device);

    var accessory =  new Accessory(device.name, uuid.generate('cloudino:accessories:'+device.devid));
    accessories.push(accessory);

    // set some basic properties (these values are arbitrary and setting them is optional)
    accessory
      .getService(Service.AccessoryInformation)
      .setCharacteristic(Characteristic.Manufacturer, device.manufacturer)
      .setCharacteristic(Characteristic.Model, device.model)
      .setCharacteristic(Characteristic.SerialNumber, device.devid);

    // listen for the "identify" event for this Accessory
    accessory.on('identify', function(paired, callback) {
      console.log('identify:',paired,callback);
      callback(); // success
    });

    device.services.forEach(function(service) {
      //console.log("service.name:"+service.name);
      var svr=accessory.addService(Service[service.type], service.name, service.subtype);

      service.characteristics.forEach(function(characteristic) {
          //console.log(characteristic);
          var chara=svr.getCharacteristic(Characteristic[characteristic.type]);
          initCharacteristic(device,characteristic,chara);
          onEvents.push({type:"onDevMsg",service:svr,characteristic:characteristic,device:device.devid});
      });

      service.optionalCharacteristics.forEach(function(characteristic) {
          //console.log(characteristic);
          var chara=svr.addCharacteristic(Characteristic[characteristic.type]);
          initCharacteristic(device,characteristic,chara);
          onEvents.push({type:"onDevMsg",service:svr,characteristic:characteristic,device:device.devid});
      });      
    });

  });

  return accessories;
}

module.exports=init(devices);
