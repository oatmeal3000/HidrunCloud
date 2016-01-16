module.exports = {
  host: '127.0.0.1',        // Hostname of IoTgo platform
  db: {                             
    uri: 'mongodb://127.0.0.1/iotgo',   // MongoDB database address
    options: {
      user: 'root',                    // MongoDB database username
      pass: ''                     // MongoDB database password
    }
  },
  jwt: {
    secret: 'jwt_secret'                // Shared secret to encrypt JSON Web Token
  },
  admin:{
    'iotgo@iteadstudio.com': 'password' // Administrator account of IoTgo platform
  },
  page: {
    limit: 50,                          // Default query page limit
    sort: -1                            // Default query sort order
  },
  recaptcha: {
      secret: '',                       // Google reCAPTCHA serect
      url: 'https://www.google.com/recaptcha/api/siteverify'
    },
  pendingRequestTimeout: 3000
};
