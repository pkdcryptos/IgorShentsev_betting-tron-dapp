var serverTime = 0,
    timeSlice = 0,
    currencySymbol = 'TRXUSDT',
    sliceInterval = '',
    intervalID = null,
    prices = {},
    bettingAddress = '',
    curentTx = 0,
    curentTxWithAmount = 0,
    currentAmount = 0,
    upCount = 0,
    downCount = 0;
var utils = '';
var server = 'http://159.65.88.52';
endpoint = '/api/bettings/active';
contracrsEndpoint = '/api/contracts';
var bettingContract;
var tokenContract;
var defaultAddress;
var tokenBalance;
function initTronWeb() {
    if (!!window.tronWeb && window.tronWeb.ready){
        console.log('tronweb ready')
        contractInit();
    } else {
        setTimeout(initTronWeb, 500);
    }
}
async function contractInit() {
    bettingContract = await tronWeb.contract().at('TXTZG67XFLuRYnMPF8JvNvoVGmyZ1Z8EPu');
    tokenContract = await tronWeb.contract().at(await bettingContract.tokenAddress().call());
    defaultAddress = tronWeb.defaultAddress.base58;
    tokenBalance = (await tokenContract.balanceOf(defaultAddress).call({
        shouldPollResponse: true,
        callValue: 0})).balance.toNumber() / 100;
    console.log('address=' + defaultAddress);
    console.log('token balance=' + tokenBalance);
    await rebuildPeoples($('input[name=amount]:checked').val())

}
setTimeout(initTronWeb, 500);

async function rebuildPeoples(value) {
    if (value == 0){ currentAmount = 100 }
    if (value == 1){ currentAmount = 1000 }
    if (value == 2){ currentAmount = 5000 }
    if (value == 3){ currentAmount = 10000 }
    curentTxWithAmount = +curentTx + +value;

    let bets = await bettingContract.getBetters(curentTxWithAmount).call({
            shouldPollResponse: true,
            callValue: 0
    });
    upCount = bets.upCount.toNumber();
    $('#upCount').html(upCount);
    downCount = bets.downCount.toNumber()
    $('#downCount').html(downCount);
    $(".winAmount").collapse('hide');
    $(".thirdPart").collapse('hide');
    $(".increase").removeClass('active');
    $(".fall").removeClass('active');

    console.log('curentTxWithAmount=' + curentTxWithAmount);
}

async function createBet() {
    if (tokenBalance < currentAmount){
        alert('ERROR: Token balance < Current Bet');
        return;
    }

    let direction;
    if ($('.fall.active').length == 0) direction = 1; else direction = 2;
    $('.thirdPart .placeABet').hide(); //show "tanks for bet" label
    $('.thirdPart .betAccepted').show();
    await bettingContract.createBet(curentTxWithAmount, direction).send({
        shouldPollResponse: true,
        callValue: 0});

    $('.thirdPart .placeABet').show();
    $('.thirdPart .betAccepted').hide();
    await rebuildPeoples($('input[name=amount]:checked').val())
}

$(function () {

    timeSlice = +$('[name="time"]:checked').val();
    sliceInterval = getSliceInterval();
    currencySymbol = $('[name="currency"]:checked').val();
    getServerTime();
    getServerCandlestickData(currencySymbol, sliceInterval);
    getPricesData();

    $('#priceBtn').change(function (e) { // show "place a bet" button when click "increase" of "fail" price button
        $(".winAmount").collapse('show');
        $(".thirdPart").collapse('show');
        let sum = (upCount+downCount+1)*currentAmount*0.9;
        let direction = e.target.defaultValue;
        if (direction == 1){
            sum = sum / (upCount+1)
        } else {
            sum = sum / (downCount+1)
        }
        $('#winAmountMood').html(sum);
        //alert(sum);

    });
    $('#termsAccept').change(function (e) { //enable "place a bet" button when checkbox is checked
        if($(this).prop('checked') == true){
            $('#placeABet').prop('disabled', false);
        } else {
            $('#placeABet').prop('disabled', true);
        }
    });
    //override submitting "make a bet" form
    $('#makeABet').submit(function (e) {
        e.preventDefault(); //stop page reload
        $(this).trigger('reset'); //reset form data
        $('#placeABet').prop('disabled', true);

        //alert(1);
        createBet();


    });
    $('#timeline').change(function (e) {
        timeSlice = +$('[name="time"]:checked').val();
        sliceInterval = getSliceInterval();
        getServerTime();
        getServerCandlestickData(currencySymbol,sliceInterval);
        getPricesData();
    });
    $('#currSymbol').change(function (e) {
        currencySymbol = $('[name="currency"]:checked').val();
        getServerCandlestickData(currencySymbol,sliceInterval);
    });
});

function getDateStringFromTimestamp(timestamp) {
    var date = new Date(timestamp),
        year = date.getFullYear() + '',
        month = date.getMonth()+1 + '',
        day = date.getDate() + '',
        hour = date.getHours() + '',
        min = date.getMinutes() + '';
    if((month + '').length == 1){
        month = '0' + month;
    }
    if((day + '').length == 1){
        day = '0' + day;
    }
    if((hour + '').length == 1){
        hour = '0' + hour;
    }
    if((min + '').length == 1){
        min = '0' + min;
    }
    var dateString = year+'-'+month+'-'+day+' '+hour+':'+min;
    return dateString;
}

function getServerTime() {
    $.ajax({
        url:'https://cors.io/?https://api.binance.com/api/v1/time',
        complete: function (response) {
            processServerTime(JSON.parse(response.responseText).serverTime);
        },
        error: function () {
            console.log('Can\'t get server time!');
        },
    });
}

function getServerCandlestickData(symbol, interval) {
    $.ajax({
        url:'https://cors.io/?https://api.binance.com/api/v1/klines?symbol='+symbol+'&interval='+interval+'&limit=20',
        complete: function (response) {
            processCandlestickData(JSON.parse(response.responseText));
        },
        error: function () {
            console.log('Can\'t get server candlestick data!');
        },
    });
}

function getPricesData() {
    $.ajax({
        url:server+endpoint,
        complete: function (response) {
            processPrices(JSON.parse(response.responseText));
        },
        error: function () {
            console.log('Can\'t get server candlestick data!');
        },
    });
}

function getContractsData() {
    $.ajax({
        url:server+contracrsEndpoint,
        complete: function (response) {
            bettingAddress = JSON.parse(response.responseText).bettingAddress;
            utils.setTronWeb(tronWeb);
            console.log(utils.contract);
        },
        error: function () {
            console.log('Can\'t get server candlestick data!');
        },
    });
}

function processPrices(data) {

    if (Array.isArray(data)) {
        data.forEach(function (item, index) {
            prices[item.duration] = {price: item.price, tx: item.tx};
        });
        curentTx = prices[sliceInterval].tx;
        $('.endPrice .timerData .amount').html(Number.parseFloat(prices[sliceInterval].price).toFixed(6));
        rebuildPeoples($('input[name=amount]:checked').val());
        /*let txInput = $('.endPrice .timerData [name="tx"]');
        if (txInput.length > 0) {
            txInput.val(prices[sliceInterval].tx);

        } else {
            $('.endPrice .timerData').append('<input type="hidden" name="tx" value="'+prices[sliceInterval].tx+'">');
        }*/
    }

}

function processServerTime(time) {
    serverTime = time;
    var sliceStamp = timeSlice / 1000;
    var days = Math.floor(sliceStamp / 86400);
    sliceStamp -= days * 86400;
    var hours = Math.floor(sliceStamp / 3600) % 24;
    sliceStamp -= hours * 3600;
    var minutes = Math.floor(sliceStamp / 60) % 60;

    var serverDate = new Date(serverTime), //divide server time for hours minutes and seconds
        hrs = serverDate.getUTCHours(),
        min = serverDate.getUTCMinutes(),
        sec = serverDate.getUTCSeconds(),
        interval = 0;
    if (days > 1) {
        interval += days * 24 * 60 * 60 * 1000;
    }
    if (days > 0) {
        interval += ((23 - hrs) * 60 * 60 * 1000) + ((59 - min) * 60 * 1000) + ((59 - sec) * 1000);
    } else {
        interval += (59 - sec) * 1000;
    }
    if (hours > 0) {
        for (var i = 1; i <= 24 / hours; i++) {
            if (i * hours > hrs) {
                interval += ((i * hours - hrs - 1) * 60 * 60 * 1000) + ((59 - min) * 60 * 1000);
                break;
            }
        }
    }
    if (minutes > 0) {
        for (var i = 1; i <= 60 / minutes; i++) {
            if (i * minutes > min) {
                interval += (i * minutes - min - 1) * 60 * 1000;
                break;
            }
        }
    }
    //the end of the bet timer

    if (intervalID != null) {
        clearInterval(intervalID);
    }
    intervalID = setInterval(function time() { // change counting time every 1 second
        var d = new Date(interval), //divide server time for hours minutes and seconds
            hrs = d.getUTCHours(),
            min = d.getUTCMinutes(),
            sec = d.getUTCSeconds();
        if ((sec + '').length == 1) {
            sec = '0' + sec;
        }
        if ((min + '').length == 1) {
            min = '0' + min;
        }
        if ((hrs + '').length == 1) {
            hrs = '0' + hrs;
        }
        jQuery('.firstPart .timerData .hours').html(hrs); // apply counting time to html
        jQuery('.firstPart .timerData .minutes').html(min);
        jQuery('.firstPart .timerData .seconds').html(sec);
        interval -= 1000; //reduce counting time for 1 second
        if (interval < 1000) {
            getServerTime();
        }
    }, 1000);
}

function processCandlestickData(data) {
    var trace = {
        x: [],
        open: [],
        high: [],
        low: [],
        close: [],
        decreasing: {line: {color: '#EF5350'}},
        increasing: {line: {color: '#26A69A'}},
        line: {color: 'rgba(31,119,180,1)'},
        type: 'candlestick',
        xaxis: 'x',
        yaxis: 'y'
    };
    if (Array.isArray(data)) {
        var startDate = null,
            endDate = null;
        data.forEach(function (item, index) {
            trace.x.push(getDateStringFromTimestamp(item[0]));
            trace.open.push(item[1]);
            trace.high.push(item[2]);
            trace.low.push(item[3]);
            trace.close.push(item[4]);
        });
        data = [trace];
        var layout = {
            dragmode: 'lasso',
            margin: {
                r: 10,
                t: 25,
                b: 50,
                l: 40
            },
            showlegend: false,
            xaxis: {
                autorange: true,
                domain: [0, 1],
                rangeslider: {visible: false},
                type: 'date'
            },
            yaxis: {
                autorange: true,
                domain: [0, 1],
                type: 'linear'
            }
        };
        Plotly.newPlot('plotly-div', data, layout, {displayModeBar: false});
    }
}

function getSliceInterval() {
    var sliceStamp = timeSlice / 1000;
    var days = Math.floor(sliceStamp / 86400);
    sliceStamp -= days * 86400;
    var hours = Math.floor(sliceStamp / 3600) % 24;
    sliceStamp -= hours * 3600;
    var minutes = Math.floor(sliceStamp / 60) % 60;
    if (days > 0) {
        return days + 'd';
    }
    if (hours > 0) {
        return hours + 'h';
    }
    if (minutes > 0) {
        return minutes + 'm';
    }
}
