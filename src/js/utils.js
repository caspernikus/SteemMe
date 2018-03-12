function bytesToSize(bytes) {
   var sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
   if (bytes == 0) return '0 Byte';
   var i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
   return (bytes / Math.pow(1024, i)).toFixed(2) + ' ' + sizes[i];
};

function getSteemPrice(coinName, currency) {
    var xhr = new XMLHttpRequest();

    xhr.open("GET", "https://api.coinmarketcap.com/v1/ticker/"+ coinName +"/?convert="+ currency, false);
    xhr.send();

    var result = JSON.parse(xhr.responseText);

    return result[0]["price_" + currency];
}

function getCurrencySymbol(currency) {
    switch (currency) {
        case 'eur':
            return '\u20AC';
        case 'cad':
            return 'CAD';
        case 'gbp':
            return '&#163';
        case 'aud':
            return 'AUD';
        default:
            return '$'
    }
}

function getLastWeekDates() {
    const today = new Date();
    const emptyToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0);
    var returnObject = {};

    returnObject[new Date(emptyToday.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]] = [];
    returnObject[new Date(emptyToday.getTime() - 4 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]] = [];
    returnObject[new Date(emptyToday.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]] = [];
    returnObject[new Date(emptyToday.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]] = [];
    returnObject[new Date(emptyToday.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]] = [];
    returnObject[new Date(emptyToday.getTime()).toISOString().split('T')[0]] = [];
    returnObject[today.toISOString().split('T')[0]] = [];

    return returnObject;
}

function getGraphData(data) {
    var newData = [];

    Object.keys(data).forEach((key) => {
        var dayValues = data[key];
        var dayValue = 0;

        dayValues.forEach((value) => {
            const amount = Number(value[1].sbd_payout.split(' ')[0]);

            dayValue += amount;
        });

        newData.push(dayValue);
    });

    return newData;
}

function isOlderThanOneWeek(date) {
    const today = new Date();
    const emptyToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0);
    const previousWeek = new Date(emptyToday.getTime() - 6 * 24 * 60 * 60 * 1000);

    return (previousWeek.getTime() > date.getTime()) && (date.getTime() < emptyToday.getTime());
}
