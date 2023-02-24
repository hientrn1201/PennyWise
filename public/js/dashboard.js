import getGraphData from "./calc";

google.charts.load('current', {'packages':['line', 'corechart']});
const getTransactions = async function () {
  const response = await fetch("/api/transactions", {
    method: "GET",
  });
  const dataJson = await response.json();
  let transactions = dataJson.transactions;
  let goal = dataJson.goal;
  let progress = dataJson.progress;
  document.getElementById('goal').textContent = "$"+goal + '';
  document.getElementById('progress').textContent = "$"+progress + '';
  document.getElementById('percentage').textContent = Math.round(100*progress/goal)+"%"

  //convert raw data to graph-able data
  const [categoryMap, tArray] = getGraphData(transactions);
    
  var data = new google.visualization.DataTable();
  data.addColumn('number', 'Time');
  data.addColumn('number', 'Account Balance');

  data.addRows(tArray);

  var options = {
    width: 600,
    height: 334,
  };

  var chart = new google.charts.Line(document.getElementById('chart_div'));

  chart.draw(data, google.charts.Line.convertOptions(options));

  var data1 = google.visualization.arrayToDataTable(categoryMap.positive);


  var options = {
    title: 'Income',
    width: 250,
    height: 250,
    colors: ['green']
  };

  var chart1 = new google.visualization.PieChart(document.getElementById('positive_div'));

  chart1.draw(data1, options);

  var data2 = google.visualization.arrayToDataTable(categoryMap.negative);


  var options = {
    title: 'Expense',
    width: 250,
    height: 250,
    colors: ['red']
  };

  var chart2 = new google.visualization.PieChart(document.getElementById('negative_div'));

  chart2.draw(data2, options);

}



// Check whether account is connected
const getStatus = async function () {
  const account = await fetch("/api/is_account_connected");
  const connected = await account.json();
  if (connected.status == true) {
    getTransactions();
  }
};

getStatus();