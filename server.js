const express    = require("express");
const bodyParser = require("body-parser");
const path       = require("path");
const jwt        = require("jsonwebtoken");
const mongoose   = require("mongoose");
const bcrypt     = require("bcrypt");
const PORT       = process.env.PORT || 3001;
// Environment variables.
require("dotenv").config();
// Express.
const app = express();
//MongoDB database config.
const db = require("./models");
mongoose.Promise = Promise;
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost/coffeeRatings";
mongoose.connect(MONGODB_URI);
mongoose.connection.on("error", console.error.bind(console, "connection error:"));

// Serve up static assets (usually on heroku)
if (process.env.NODE_ENV === "production") {
  app.use(express.static("client/build"));
}

// Handles data parsing.
app.use(bodyParser.urlencoded({
  extended: false
}));
app.use(bodyParser.json());

function getToken(req, res, next) {
  const bearerHeader = req.headers['Authorization'];
  if(bearerHeader){
    const bearer = bearerHeader.split(" ");
    const token = bearer[1];
    req.token = token;
    next();
  } else{
      res.sendStatus(403);
  }
}

app.post("/api/post", getToken, (req, res) => {

  jwt.verify(req.token, process.env.SECRET_KEY,
      {expiresIn: '4h'}, (err, data) => {
    if(err){
      res.sendStatus(403);
    } else{
      res.json({
          message: "Post created.",
          data: data
      });
    }
  });
});

app.post("/api/login", (req, res) => {

  db.User.findOne({email: req.body.email})
  .then( (user) => {

    if(!user){
      res.status(401).send({ message: "User not found." });
    } else if(user){

      if(!bcrypt.compareSync(req.body.password, user.password)){
        res.status(401).send({ message: "Password is incorrect." });
      } else{
        jwt.sign({
          _id: user._id,
          firstName: user.firstName,
          lastName: user.lastName
        }, process.env.SECRET_KEY, (err, token) => {
          if(err){
            console.log("error: "+err);
            res.status(401).send({ message: "Authentication error." });
          } else{
            res.json({ token: token });
          }
        });
      }
    }
  })
  .catch( (err) => {
    console.log("error: "+err);
    res.status(401).send({ message: "Error." });
  });
  
});

app.post("/api/signup", (req, res) => {

  db.User.findOne({email: req.body.email})
  .then( (user) => {
    
    if(user){
      res.status(401).json({ message: "User already exists." });
    } else if(!user){

      let newUser = req.body;
      newUser.password = bcrypt.hashSync(req.body.password, 10);

      //Create the user record.
      db.User.create(newUser)
      .then( (result) => {

        jwt.sign({
          _id: result._id,
          firstName: result.firstName,
          lastName: result.lastName
        }, process.env.SECRET_KEY, (err, token) => {
          res.json({ token: token });
        });
      })
      .catch( (err) => {
        console.log("error: "+err);
        res.status(401).send({ message: err });  
      });
    }
  })
  .catch( (err) => {
    console.log("error: "+err);
    res.status(401).json({ message: "Error." });
  });
});

// Send every request to the React app
// Define any API routes before this runs
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "./client/build/index.html"));
});

app.listen(PORT, () => {
  console.log(`🌎 ==> Server now on port ${PORT}!`);
});
