// server.js
// where your node app starts

// init project
var express = require('express');
var app = express();
var mongodb = require("mongodb")
var ObjectId = require('mongodb').ObjectID;
var MongoClient = mongodb.MongoClient;
var url = process.env.DB_URL;
var bodyParser = require('body-parser');
var cookies = require('cookie-session');
var passport = require('passport')
  , TwitterStrategy = require('passport-twitter').Strategy;
var session = require('express-session');
var mongoose = require('mongoose');
var path = require('path');
// we've started you off with Express, 
// but feel free to use whatever libs or frameworks you'd like through `package.json`.

mongoose.connect(url);

var findOrCreate = require('mongoose-findorcreate')
var Schema = mongoose.Schema;
var UserSchema = new Schema({ twitterId: Number});
UserSchema.plugin(findOrCreate);
var User = mongoose.model('User', UserSchema);

var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {
  console.log("we're connected!")
});

// Authentication configuration
app.use(session({
  resave: false,
  saveUninitialized: false,
  secret: 'bla bla bla' 
}));
app.use(passport.initialize());
app.use(passport.session());
passport.use(new TwitterStrategy({
    consumerKey: process.env.TWITTER_CONSUMER_KEY,
    consumerSecret: process.env.TWITTER_CONSUMER_SECRET,
    callbackURL: "http://cultured-numeric.glitch.me/auth/twitter/callback"
},
  function(token, tokenSecret, profile, cb) {
    User.findOrCreate({ twitterId: profile.id }, function (err, user) {
      console.log('A new uxer from "%s" was inserted', user.twitterId);
      return cb(err, user);
    });
  }));
passport.serializeUser(function(user, done) {
  done(null, user);
});
passport.deserializeUser(function(user, done) {
  done(null, user);
});
app.get('/auth/twitter', passport.authenticate('twitter'));
app.get('/auth/twitter/callback',
  passport.authenticate('twitter', { successRedirect: '/',
                                     failureRedirect: '/login'}));
// http://expressjs.com/en/starter/static-files.html
app.use(express.static('views'));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

app.use(cookies({
  name: 'session',

  keys: ['key1', 'key2'],
  // Cookie Options
  maxAge: 24 * 60 * 60 * 1000 // 24 hours
}));

// http://expresjs.com/en/starter/basic-routing.html

app.set('view engine', 'jade');

app.get("/", function(request,response){
  response.redirect("/allpins")
})

app.get("/addpin", function (request, response) {
  if(request.session.user){
    response.sendFile((__dirname + '/views/addpin.html'))
  } else {
    response.redirect("/")
  }
});

app.post("/addpin", function (request, response) {
  console.log(request.body)
  var pin = {
    user: request.session.user,
    url: request.body.url,
    title: request.body.title
  }
  MongoClient.connect(url, function(err, db){
    if (db){
        db.collection("pinbored_pins").insert(pin)
      }
    
    if (err) {
     console.log("did not connect to " + url)
    }
  })
  response.redirect("/")
});

app.get("/mypins", function(request,response){
  console.log("ayy" + JSON.stringify(request.session))
  //var added_books = [];
  MongoClient.connect(url, function(err, db){
    if (db){
        db.collection("pinbored_pins").find({user: request.session.user}).toArray().then(pins => {
              console.log(pins)
              //response.setHeader('Set-Cookie',JSON.stringify(request.session))
              response.render('mypins', { pins : JSON.stringify(pins) });
        })
      }
    
    if (err) {
     console.log("did not connect to " + url)
    }
  })
})

app.post("/mypins", function(request,response){
  console.log(JSON.stringify(request.body))
    MongoClient.connect(url, function(err, db){
    if (db){
        db.collection("pinbored_pins").remove({"_id": ObjectId(request.body.id)})
      }
    
    if (err) {
     console.log("did not connect to " + url)
    }
  })
  response.redirect("/mypins")
})

app.get("/allpins", function(request,response){
  console.log("ayy" + JSON.stringify(request.session))
  //var added_books = [];
  MongoClient.connect(url, function(err, db){
    if (db){
        db.collection("pinbored_pins").find({}).toArray().then(pins => {
          console.log("asdasdasdasd"  + pins.length)
          
          var pinswithupvotes = []
          pins.forEach(function(element){
            db.collection("pinbored_upvotes").find({}).toArray().then(upvote => {
                var pin = {}
                
                var upvotes = 0
              upvote.forEach(function(match){
                if(match.pin_id == element._id){
                  upvotes += 1
                }
              })
                
                pin = {
                  _id: element._id,
                  upvotes: upvotes,
                  url: element.url,
                  title: element.title,
                  user: element.user
                }
                pinswithupvotes.push(pin)
                if (pinswithupvotes.length == pins.length) {
                  console.log(pinswithupvotes)
                  response.setHeader('Set-Cookie',JSON.stringify(request.session))
                  response.render('allpins', { pins : JSON.stringify(pinswithupvotes) });
                }
            })
          })
              /*
              var pinswithupvotes = []
              pins.forEach(function(element){
                //console.log(element._id)
                var pin = {}
                var upvotes = 0
                db.collection("pinbored_upvotes").find({}).toArray().then(upvote => {
                  upvote.forEach(function(match){
                    if(match.pin_id == element._id){
                      upvotes += 1
                    }
                  })
                  console.log(element._id + " " + upvotes)
                  //upvote.forEach(function(match){
                    //console.log("qweqwe" + JSON.stringify(match.pin_id))
                  //})
                  //upvotes += 1
                  pin = {
                    _id: element._id,
                    upvotes: upvotes,
                    url: element.url,
                    title: element.title,
                    user: element.user
                  }
                  pinswithupvotes.push(pin)
                })
              })
              */
              //response.render('allpins', { pins : JSON.stringify(pinswithupvotes) });
              //response.setHeader('Set-Cookie',JSON.stringify(request.session))
          
        })
      }
    
    if (err) {
     console.log("did not connect to " + url)
    }
  })
})

app.post("/allpins", function(request,response){
    var upvote = {
      user: request.session.user,
      pin_id: request.body.id
    }
    console.log(JSON.stringify(upvote))
    MongoClient.connect(url, function(err, db){
    if (db){
        db.collection("pinbored_upvotes").find({user: request.session.user, pin_id: request.body.id}).toArray().then(vote => {
          
          //console.log(JSON.stringify(vote) == [])
          //console.log("HAHAHA "  + vote[0])
          
          
          if (vote[0] == undefined) {
            db.collection("pinbored_upvotes").insert(upvote)
          } else {
            db.collection("pinbored_upvotes").remove(upvote)
          }
          
        })
        //db.collection("pinbored_upvotes").insert(upvote)
      }
    
    if (err) {
     console.log("did not connect to " + url)
    }
  })
  response.redirect("/")
})

app.get("/signin", function (request, response) {
  if(request.session.user){
    response.redirect("/")
  }else{
    //response.setHeader('Set-Cookie',JSON.stringify(request.session))
    response.sendFile((__dirname + '/views/signin.html'))//, {headers: {'Set-Cookie': JSON.stringify(request.session)}});
  }
});

app.post("/signin", function (request, response) {
  MongoClient.connect(url, function(err, db){
    if (db){
        console.log("connected to " + url);
        db.collection("pinbored_users").find({'username' : request.body.username}).toArray().then(element => {
        if (element == "") {
          response.send("user not found")
        } else {
          db.collection("pinbored_users").find({'password' : request.body.password}).toArray().then(element => {
            if (element == "") {
              response.send("wrong password")
            } else {
              //response.send("logged in")
              var user = {
                user: request.body.username
              }
              request.session = user
              response.setHeader('Set-Cookie',JSON.stringify(request.session))
              //request.cookies = {user: request.body.username}
              //request.session.save(
                console.log("zxc" + JSON.stringify(request.session))
                response.redirect("/allpins")
              //)
            }
          })
        }
      })
    }
    if (err) {
     console.log("did not connect to " + url)
    }
  })
});


app.get("/signup", function (request, response) {
  if(request.session.user){
    response.redirect("/")
  }else{
    response.sendFile(__dirname + '/views/signup.html');
  }
});

app.post("/signup", function (request, response) {
  console.log(request.body)
  MongoClient.connect(url, function(err, db){
    if (db){
          console.log("connected to " + url);
          db.collection("pinbored_users").find({'username' : request.body.username}).toArray().then(element => {
        if (element == "") {
          var user = {
            username: request.body.username,
            password: request.body.password
          }
          db.collection("pinbored_users").insert(user);
          response.redirect("/signin");
        } else {
          response.send("username already taken")
        }
      })
    }
    if (err) {
     console.log("did not connect to " + url)
    }
  })
});

app.get("/signout", function (request, response) {
  request.session = null
  console.log(request.session)
  response.setHeader('Set-Cookie',JSON.stringify(request.session))
  response.redirect("/")
})

app.get("/asd", function(request, response){
  response.send('asd');
})

app.get("/:user", function (request, response) {
  MongoClient.connect(url, function(err, db){
    if (db){
        db.collection("pinbored_pins").find({user: request.params.user}).toArray().then(pins => {
          if(pins.length > 0){
            console.log("asdasdasdasd"  + pins.length)

            var pinswithupvotes = []
            pins.forEach(function(element){
              db.collection("pinbored_upvotes").find({}).toArray().then(upvote => {
                  var pin = {}

                  var upvotes = 0
                upvote.forEach(function(match){
                  if(match.pin_id == element._id){
                    upvotes += 1
                  }
                })

                  pin = {
                    _id: element._id,
                    upvotes: upvotes,
                    url: element.url,
                    title: element.title,
                    user: element.user
                  }
                  pinswithupvotes.push(pin)
                  if (pinswithupvotes.length == pins.length) {
                    console.log(pinswithupvotes)
                    response.setHeader('Set-Cookie',JSON.stringify(request.session))
                    response.render('userpins', { pins : JSON.stringify(pinswithupvotes) });
                  }
              })
            })
          } else {
            response.send("user not found")
          }
        })
      }
    
    if (err) {
     console.log("did not connect to " + url)
    }
  })
  
})

app.get("/asd", function (request, response) {
  response.send("asd")
})

// listen for requests :)
var listener = app.listen(process.env.PORT, function () {
  console.log('Your app is listening on port ' + listener.address().port);
});

