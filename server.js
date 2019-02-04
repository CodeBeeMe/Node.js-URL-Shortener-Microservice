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
db.once('open', () => {
  // we're connected!
  
  //Create a 'Site' Model
  const siteSchema = new mongoose.Schema({
    name: String,
    original_url: String,
    short_url: String
  });
  
  const Site = mongoose.model('Site', siteSchema);
  
  let savedSites = []; //aray holding the documents ready to be posted to the DB
  let count = 0; //count variable used to be assigned as a short_url for every posted url
  
  //getting the last count entry to set it ready for a new entry
  function getLastCount() {
    Site
      .find({name: /^[a-z0-9]/i })
      .sort("-short_url")
      .limit(1)
      .select('-_id -__v')
      .exec((err, doc) => {
      err ? console.log(err) : doc;
      doc[0] === undefined ? count : count = doc[0].short_url;
      console.log(doc[0]);
      console.log(count);
    });
    return count;
  }
  getLastCount();//update the count variable  
  
  //console.log(checkExt);
  
  //Get input from client - using the Route parameters
  app.get('/api/shorturl/:new?', (req, res) => {
    const newUrl = req.params.new;
    //find the document that has the "short_url" property associated with the entered numeric parameter and then redirect the page to the "original_url"
    Site.find({ short_url: newUrl}, (err, doc) => {
      err ? console.log(err) : res.redirect(doc[0].original_url);
    });
  });
  
  
  //Get data from POST
  app.post('/api/shorturl/new', (req, res) => {
    const url = req.body.url;
    console.log(url);
    const checkProtocol = url.match(/^https?:\/\//i); // check for the correct protocol
    const protocol = checkProtocol && checkProtocol[0];
    
    let hostName;    
    protocol ? hostName = new URL(url).hostname : hostName; //getting the full hostname or domain in the format xxx.hostname.xxx
    let checkExt;
    protocol ? checkExt = hostName.match(/\.[a-z0-9]{2,}$/i) : checkExt; //captures the domain extension
    const domainExt = checkExt && checkExt[0];
    const checkDomain = url.match(/\.[a-z]{2,}\./i); //captures the domain name whitout www and extension
    const domainName = checkDomain && checkDomain ? (checkDomain[0][0] === "." ? checkDomain[0].substring(1).slice(0, -1) : null) : hostName.slice(0, -domainExt.length); // getting the domain name strictly
    
    //checking if the hostname points to a valid website
    dns.lookup(hostName, (err) => {
      if (err) {
        res.json("invalid Hostname");
      } else {
        if (protocol) {
          //checking by original_url property to avoid duplicates for the site entries in the DB
          //in case it finds an already added url it returns the document from the DB
          Site.find({ original_url: url }, '-_id -__v', (err, doc) => {
            if (err) {
              console.log(err);
            } else {
              if (doc[0] !== undefined) { //a document matching the original_url property has been found
                res.json(doc[0]); //view the original entry
              } else { //no match so proceed to add new docs
                count++;
                savedSites.push({name: domainName, original_url: url, short_url: count}); // populating the savedSites array with objects for the passing URLs
                res.json({name: domainName, original_url: url, short_url: count});
                console.log(count);
                
                //savind all objects fron the savedSites array as documents in the DB
                Site.create(savedSites,  (err, sites) => {
                  err ? console.log(err) : console.log(sites);
                  savedSites = [];
                });
                console.log(savedSites);
              }
            }
          });
        } else res.json({error: "invalid URL"});
      }
    });
  });
});
