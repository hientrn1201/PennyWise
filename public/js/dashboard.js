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
  transactions.sort(function(item1, item2) {
    return new Date(item1.date) - new Date(item2.date);
  })
  
  let tArray = [];
  let categoryMap = {};
  let balance = 5000;
  let i = 0;
  tArray.push([i, balance]);

  
  
  transactions.forEach((transaction) => {
    const category = transaction.category;
    const amount = transaction.amount;
    i += 1;
    balance -= amount;
    if (!(category in categoryMap)) {
      categoryMap[category] = parseFloat(amount);
    } else {
      categoryMap[category] += parseFloat(amount);
    }
    tArray.push([i, balance]);
  });

  let positive = [['Categories', 'Percentage']];
  let negative = [['Categories', 'Percentage']];
  for (let k in categoryMap) {
    if (categoryMap[k] < 0) {
      positive.push([k, categoryMap[k]*-1]);
    } else {
      negative.push([k, categoryMap[k]]);
    }
  }
    
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

  var data1 = google.visualization.arrayToDataTable(positive);


  var options = {
    title: 'Income',
    width: 250,
    height: 250,
    colors: ['green']
  };

  var chart1 = new google.visualization.PieChart(document.getElementById('positive_div'));

  chart1.draw(data1, options);

  var data2 = google.visualization.arrayToDataTable(negative);


  var options = {
    title: 'Expense',
    width: 250,
    height: 250,
    colors: ['red']
  };

  var chart2 = new google.visualization.PieChart(document.getElementById('negative_div'));

  chart2.draw(data2, options);


}

getTransactions();