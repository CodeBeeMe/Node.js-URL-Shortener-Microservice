'use strict';

let express = require('express');
let mongo = require('mongodb');
let mongoose = require('mongoose');
let bodyParser = require('body-parser');
let cors = require('cors');
let dns = require('dns');

let app = express();

// Basic Configuration 
var port = process.env.PORT || 3000;

/** this project needs a db !! **/ 
mongoose.connect(process.env.MONGOLAB_URI);

app.use(cors());

/** this project needs to parse POST bodies **/
// you should mount the body-parser here
app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());

app.use('/public', express.static(process.cwd() + '/public'));

app.get('/', function(req, res){
  res.sendFile(process.cwd() + '/views/index.html');
});

  
// your first API endpoint... 
app.get("/api/hello", function (req, res) {
  res.json({greeting: 'hello API'});
});


app.listen(port, function () {
  console.log('Node.js listening ...');
});

//=========================================

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {
  // we're connected!
  
  //Create a 'Site' Model
  const siteSchema = new mongoose.Schema({
    name: String,
    original_url: String,
    short_url: String
  });
  
  const Site = mongoose.model('Site', siteSchema);
  
  let savedSites = [];  
  let count = 0;
  
  function urlProcessor(url) {    
    
  }  
  
  //Get input from client - Query parameters */
  app.get('/api/shorturl/new', (req, res) => {
    const url = req.query.url;
    res.json(urlProcessor(url));
    //console.log(savedSites);
  });
  
  //Get data from POST  */
  app.post('/api/shorturl/new', (req, res) => {
    const url = req.body.url;
    
    const checkProtocol = url.match(/^https?:\/\//i); // check for the correct protocol
    const protocol = checkProtocol && checkProtocol[0];
    
    let hostName;    
    protocol ? hostName = new URL(url).hostname : hostName;
    let checkExt;
    protocol ? checkExt = hostName.match(/\.[a-z0-9]{2,}$/i) : checkExt;
    const getExt = checkExt && checkExt[0];
    const checkDomain = url.match(/\.[a-z]{2,}\./i); //captures the domain name whitout www and extension
    const domainName = checkDomain && checkDomain ? (checkDomain[0][0] === "." ? checkDomain[0].substring(1).slice(0, -1) : null) : hostName.slice(0, -getExt.length); // getting the domain name strictly
        
    //console.log(checkExt);
    
    //checking if the hostname points to a valid website
    dns.lookup(hostName, (err) => {
      if(err) {
        res.json("invalid Hostname");
      } else {
        if(protocol) {
          count++;
          savedSites.push({name: domainName, original_url: url, short_url: count}); // populating the savedSites array with objects for the passing URLs
          res.json({name: domainName, original_url: url, short_url: count});         
         
          //console.log(count);
          /*Site.create(savedSites,  (err, sites) => {
          err ? console.log(err) : console.log(sites);
          savedSites = [];
          });*/
          
          console.log(savedSites);
        } else res.json({error: "invalid URL"});
      }
    });
  });
});

