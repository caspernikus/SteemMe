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
