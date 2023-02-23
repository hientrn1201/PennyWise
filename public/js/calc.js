function getGraphData(transactions) {
  //from all transactions data 
  //create a map mapping categories to amount of spending
  //create a list of balance after each transaction
  let tArray = [];
  let categoryMap = {};
  let balance = 5000;
  let i = 0;
  tArray.push([i, balance]);

  //sort transactions by time
  transactions.sort(function(item1, item2) {
    return new Date(item1.date) - new Date(item2.date);
  })
  
  
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
  return [categoryMap, tArray];
  
}

export default getGraphData;

