//var mixin = require('utils-merge');
//var debug = require('debug')('email-util');

var nodemailer = require("nodemailer");

//open a smtp connection pool
var smtpTransport = nodemailer.createTransport("SMTP",{
  host: "smtp.exmail.qq.com", 
  secureConnection: true, // SSL
  port: 465, // SMTP 
  auth: {
    user: "service@hidrun.com", // account 
    pass: "oatmeal123" // password 
  }
});

exports.sendMail = function (mailOptions, callback){
  smtpTransport.sendMail(mailOptions, function(error, response){
    if(error){
      console.log(error);
      callback(error);
    }else{
      console.log("Message sent: " + response.message);
      callback(null, response.message);
    }
    smtpTransport.close(); // close connection pool if not use
  });
}

