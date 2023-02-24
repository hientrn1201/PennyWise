//jshint esversion:6
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const ejs = require('ejs');
const mongoose = require('mongoose');
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const path = require('path');
const { Configuration, PlaidApi, PlaidEnvironments } = require("plaid");
const e = require('express');
const { transcode } = require('buffer');

const app = express();

app.use(express.static('public'));
app.use(bodyParser.json());
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


mongoose.set('strictQuery', false);
//mongoose.set('useCreateIndex', true);
mongoose.connect("mongodb://127.0.0.1:27017/budgetDB", {useNewUrlParser: true});

const transactionSchema = {
  transactionId: String,
  category: String,
  amount: Number,
  date: String,
  merchant: String
};

//const Transaction = new mongoose.model("Transaction", transactionSchema);

const userSchema = new mongoose.Schema({
    email: String,
    password: String,
    accessToken: String,
    accountId: String,
    balance: Number,
    goal: Number,
    progress: Number,
    nextCursor: String,
    transactions: [{type: transactionSchema}]
});

userSchema.plugin(passportLocalMongoose);

const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.get('/', (req, res)=>{
  res.sendFile(path.join(__dirname, "views/home.html"));
})

app.get('/login', (req, res)=>{
  res.sendFile(path.join(__dirname, "views/login.html"));
})

app.post('/login', (req, res) => {
  const user = new User({
      username: req.body.username,
      password: req.body.passport
  });

  req.login(user, (err) => {
      if (err) {
          res.redirect('/register')
      } else {
          passport.authenticate('local')(req, res, ()=>{
            if (user.accessToken == undefined) {
              res.redirect('/link');    
            } else {
              console.log("have accessToken");
              res.redirect('/dashboard');
            }
            
          })
      }
  })
});

app.get('/register', (req, res)=>{
  res.sendFile(path.join(__dirname, "views/register.html"));
});

app.get("/link", (req, res) => {
  if (req.isAuthenticated()) {
    res.sendFile(path.join(__dirname, "views/link.html"));
  } else {
    res.redirect('/login');
  }
})

app.get("/dashboard", (req, res) => {
  if (req.isAuthenticated()) {
    if (req.user.accessToken == undefined) {
      res.redirect('/link');    
    } else {
      console.log("have accessToken");
      res.sendFile(path.join(__dirname, "views/dashboard.html"));
    }
  } else {
    res.redirect('/login');
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
          passport.authenticate('local')(req, res, ()=>{
            if (user.accessToken == undefined) {
              res.redirect('/link');    
            } else {
              console.log("have accessToken");
              res.redirect('/dashboard');
            }
            
          })
      }
  })

})

// Configuration for the Plaid client
const config = new Configuration({
  basePath: PlaidEnvironments.sandbox,
  baseOptions: {
    headers: {
      "PLAID-CLIENT-ID": process.env.PLAID_CLIENT_ID,
      "PLAID-SECRET": process.env.PLAID_SECRET,
      "Plaid-Version": "2020-09-14",
    },
  },
});

const client = new PlaidApi(config);

//Creates a Link token and return it
app.get("/api/create_link_token", async (req, res, next) => {
  const tokenResponse = await client.linkTokenCreate({
    user: { client_user_id: req.sessionID },
    client_name: "PennyWise",
    language: "en",
    products: ["auth"],
    country_codes: ["US"],
    redirect_uri: process.env.PLAID_SANDBOX_REDIRECT_URI,
  });
  res.json(tokenResponse.data);
});

// Exchanges the public token from Plaid Link for an access token
// At the same time, retrieve initial balance and transactions
app.post("/api/exchange_public_token", async (req, res, next) => {
  const exchangeResponse = await client.itemPublicTokenExchange({
    public_token: req.body.public_token,
  });

  const access_token = exchangeResponse.data.access_token;
  //update access_token to the user
  User.updateOne({_id: req.user._id}, {accessToken: exchangeResponse.data.access_token}, (e) => {
    if (e) {
      console.log(e);
    }
  });
  const balanceResponse = await client.accountsBalanceGet({ access_token });
  const balance = balanceResponse.data.accounts[0].balances.current;
  const accountId = balanceResponse.data.accounts[0].account_id;

  User.updateOne({_id: req.user._id}, {balance: balance, accountId: accountId, goal: 200000, progress: 50000}, (e) => {
    if (e) {
      console.log(e);
    }
  });
  // let start_date = "2022-01-01";
  // let end_date = '2022-01-31'
  // const transactionsResponse = await client.transactionsSync({
  //   client_id: process.env.PLAID_CLIENT_ID,
  //   secret: process.env.PLAID_SECRET,
  //   access_token: access_token,
  //   count: 100
  // });

  // const transactionsList = transactionsResponse.data.added;
  // const nextCursor = transactionsResponse.data.next_cursor;


  // transactionsList.forEach((transaction) => {
  //   if (transaction.account_id == req.user.accountId) {
  //     const newTransaction = {
  //       transactionId: transaction.transaction_id,
  //       category: transaction.category[0],
  //       date: transaction.date,
  //       amount: transaction.amount,
  //       merchant: transaction.merchant_name
  //     }

  //     User.updateOne({_id: req.user._id}, { $addToSet : {transactions: newTransaction}}, (e) => {
  //       if (e) {
  //         console.log(e);
  //       }
  //     });
  //   }

  // });

  res.json(true);
});


app.get("/api/transactions", async (req, res, next) => {
  // const yourDate = new Date();
  // const offset = yourDate.getTimezoneOffset();
  // const date = new Date(yourDate.getTime() - (offset*60*1000))
  // const end_date = date.toISOString().split('T')[0];
  // let month =  date.getMonth()+1;
  // if (month < 10) { month = '0' + month; }
  // const year = date.getFullYear();
  // const start_date = year+'-'+month+"-01";
  let start_date = "2022-01-01";
  let end_date = '2022-02-01'

  const access_token = req.user.accessToken;
  const transactionsResponse = await client.transactionsGet({
    access_token: access_token,
    start_date: start_date,
    end_date: end_date,
    options: {
      account_ids:[req.user.accountId]
    }
  });
  const transactionsList = transactionsResponse.data.transactions;

  transactionsList.forEach((transaction) => {
    const newTransaction = {
      transactionId: transaction.transaction_id,
      category: transaction.category[0],
      date: transaction.date,
      amount: transaction.amount,
      merchant: transaction.merchant_name
    }


    User.updateOne({_id: req.user._id}, { $addToSet : {transactions: [newTransaction]}}, (e) => {
      if (e) {
        console.log(e);
      }
    });
  });
  res.join({ status: true });
  //res.json({transactions: shortList, goal: req.user.goal, progress: req.user.progress});
})


// Checks whether the user's account is connected, called
// in index.html when redirected from oauth.html
app.get("/api/is_account_connected", async (req, res, next) => {
  return (req.user.accessToken ? res.json({ status: true }) : res.json({ status: false}));
});


app.listen(3000, () => {
  console.log("Successfully launched on port 3000");
})