//jshint esversion:6
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const ejs = require('ejs');
const mongoose = require('mongoose');
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const plaid = require('plaid');
const path = require('path');
const { Decimal128 } = require('bson');

const app = express();

app.use(express.static('public'));
//app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({
    extended: true
}));

app.use(session({
    secret: "Secret",
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

// const client = new plaid.Client({
//   clientID: '63e71b0bf971480013f634f0',
//   secret: '8b8b3084cfd6c5018ecd48f84ad841',
//   env: 'sandbox', // Replace with 'production' when you're ready to go live
// });

mongoose.set('strictQuery', false);
//mongoose.set('useCreateIndex', true);
mongoose.connect("mongodb://127.0.0.1:27017/budgetDB", {useNewUrlParser: true});

const userSchema = new mongoose.Schema({
    email: String,
    password: String,
    accessToken: String,
    monthlyBudget: Decimal128,
    monthlySpent: Decimal128,
    goal: Decimal128,
});


userSchema.plugin(passportLocalMongoose);

const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.get('/', (req, res)=>{
  res.sendFile(path.join(__dirname, "home.html"));
})

app.get('/login', (req, res)=>{
  res.sendFile(path.join(__dirname, "login.html"));
})

app.post('/login', (req, res) => {
  const user = new User({
      username: req.body.username,
      password: req.body.passport
  });

  req.login(user, (err) => {
      if (err) {
          console.log(err);
      } else {
          passport.authenticate('local')(req, res, ()=>{
            res.redirect('/dashboard');
          })
      }
  })
});

app.get('/register', (req, res)=>{
  res.sendFile(path.join(__dirname, "register.html"));
});

app.get("/dashboard", (req, res) => {
  if (req.isAuthenticated()) {
    res.render('dashboard');
  } else {
    res.redirect('/login');
  }
})

app.get("/api/userData", async (req, res) => {
  if (req.isAuthenticated()) {
    console.log(req.user.username);
    res.json({username: req.user.username});
  } else {
    res.redirect('login');
  }
})

app.get('/logout', (req, res) => {
  req.logout((err) => {
      if (err) {
          console.log(err);
      }
  });
  res.redirect('/');
})

app.post('/register', (req, res) => {

  User.register({username: req.body.username}, req.body.password, (err, user) => {
      if (err) {
          console.log(err);
          res.redirect('/register');
      } else {
          //the callback function only run if authentication is successful
          passport.authenticate('local')(req, res, function(){
            res.redirect('/dashboard');
          })
      }
  })

})


app.listen(3000, () => {
  console.log("Successfully launched on port 3000");
})