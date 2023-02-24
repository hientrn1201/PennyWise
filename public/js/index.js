//import covert JSON to graph-able data
//import getGraphData from "js/trend.js";
// Load the Visualization API and the piechart package.
//google.charts.load('current', {'packages':['line', 'corechart']});


//PLAID API
(async ($) => {
  // Grab a Link token to initialize Link
  const createLinkToken = async () => {
    const res = await fetch("/api/create_link_token");
    const data = await res.json();
    const linkToken = data.link_token;
    localStorage.setItem("link_token", linkToken);
    return linkToken;
  };

  // Initialize Link
  const handler = Plaid.create({
    token: await createLinkToken(),
    onSuccess: async (publicToken, metadata) => {
      await fetch("/api/exchange_public_token", {
        method: "POST",
        body: JSON.stringify({ public_token: publicToken }),
        headers: {
          "Content-Type": "application/json",
        },
      });
    },
    onEvent: (eventName, metadata) => {
      console.log("Event:", eventName);
      console.log("Metadata:", metadata);
    },
    onExit: (error, metadata) => {
      console.log(error, metadata);
    },
  });

  // Start Link when button is clicked
  const linkAccountButton = document.getElementById("link-account");
  linkAccountButton.addEventListener("click", (event) => {
    handler.open();
  });
})(jQuery);

// Retrieves balance information
const getBalance = async function () {
  const response = await fetch("/api/balance", {
    method: "GET",
  });
  const data = await response.json();
  console.log(data);
};

console.log("done the first part");

// Check whether account is connected
const getStatus = async function () {
  const account = await fetch("/api/is_account_connected");
  const connected = await account.json();
  if (connected.status == true) {
    const loadTransactions = await fetch("/api/transactions");
    const loaded = loadTransactions.json();
    console.log("i am loading transactions");
    if (loaded.status == true) {
      window.location = '/dashboard';
    }
  }
};

getStatus();