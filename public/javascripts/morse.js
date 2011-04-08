(function($,io){
    
    var countdown = (function($) {
        
        var $countdown       = $('#countdown'),
            initWidth        = 300,
            unit             = 'px',
            initBorder1Width = '300px',
            initBorder2Width = '0px',
            border1Color     = '#999999',
            border2Color     = '#CCCCCC',
            
            lborder, rborder,
            
            setBorderWidth = function(lwidth, rwidth) {
                $countdown.css({
                   'border-left-width' : lwidth+unit,
                   'border-right-width': rwidth+unit
                });
            },
            
            set1stCountdown = function(percent) {
                lborder = percent * initWidth;
                rborder = (initWidth - lborder);
                setBorderWidth(lborder, rborder)
            },
            
            set2ndCountdown = function(percent) {
                lborder = '0';
                rborder = (initWidth * percent);
                setBorderWidth(lborder, rborder)
            },
            
            resetCountdowns = function() {
                lborder = initWidth;
                rborder = '0';
                setBorderWidth(lborder, rborder)
            }
        
        return {
            set1stCountdown : set1stCountdown,
            set2ndCountdown : set2ndCountdown,
            resetCountdowns : resetCountdowns
        }
        
    })($);
    
    var $convo = $('#convo'),
        $charCountdown = $('#charCountdown'),
        $msgCountdown  = $('#msgCountdown'),
        $buffer        = $('#buffer'),
        $transmission  = $('#transmission'),
        $nick          = $('#nick'),
        $userlist      = $('#userlist'),
        keyDownTime = 0,
        keyUpTime = 0,
        diff = 0,
        charEndDiff = 0,
        startCharTime = 0,
        charReady = true,
        isCountingDownChar = false,
        isCountingDownMsg = false,
        charThreshold = 300,
        msgThreshold = 700,
        charCountdownPercent = 0,
        msgCountdownPercent = 0,
        stopMsgCountdown = false,
        stopCharCountdown = false,
        dot =  '0',
        dash = '1',
        code = {
            '0'     : 'e',
            '00'    : 'i',
            '000'   : 's',
            '001'   : 'u',
            '0010'  : 'f',
            '001100': '?',
            '001101': '_',
            '00111' : '2',
            '0000'  : 'h',
            '0001'  : 'v',
            '00011' : '3',
            '00000' : '5',
            '00001' : '4',
            '01'    : 'a',
            '010'   : 'r',
            '0100'  : 'l',
            '010010': '"',
            '01010' : '+',
            '010101': '.',
            '011'   : 'w',
            '0110'  : 'p',
            '011010': '@',
            '0111'  : 'j',
            '01111' : '1',
            '011110': "'",
            '1'     : 't',
            '10'    : 'n',
            '100'   : 'd',
            '1000'  : 'b',
            '10000' : '6',
            '100001': '-',
            '10001' : '=',
            '1001'  : 'x',
            '10010' : '/',
            '101'   : 'k',
            '1010'  : 'c',
            '101010': ';',
            '101011': '!',
            '1011'  : 'y',
            '10110' : '(',
            '101101': ')',
            '11'    : 'm',
            '110'   : 'g',
            '1100'  : 'z',
            '11000' : '7',
            '110011': ',',
            '1101'  : 'q',
            '111'   : 'o',
            '11100' : '8',
            '111000': ':',
            '11110' : '9',
            '11111' : '0'
        },
        buffer = [],
        i = 0,
        morseMsg = '',
        strMsg = '',
        symbol = null,
        charTime = 0,
        charEndTime = 0,
        clearTransmission = true,
        
    updateUserList = function(users) {
        var list = '';
        for (id in users) {
            list += '<li id="id'+id+'">'+users[id]+'</li>';
        }
        $userlist.html(list);
    },
    
    putText = function($li) {
        $convo.append($li)
            .scrollTop($convo[0].scrollHeight);
    },

    putMsg = function(msg) {
        $msg = $('<li class="text msg"></li>');
        $msg.text(msg.nick+': '+msg.text);
        $msg.prepend($('<span class="time">'+msg.time+'</span>'));
        putText($msg);
    },

    putAlert = function(alert) {
        $alert = $('<li class="text alert"></li>');
        $alert.text(alert);
        putText($alert)
    },
    
    getChar = function() {
        morseMsg = '';
        for (i = 0; i < buffer.length; i++) {
            morseMsg += buffer[i];
        }
        buffer.length = 0;
        if ( code.hasOwnProperty(morseMsg) ) {
            return code[morseMsg];
        }    
        $transmission.append('invalid character');
        clearTransmission = true;
        return false;
    },
    
    transmission = function(down, up) {
        if (clearTransmission) {
            $transmission.text('');
            clearTransmission = false;
        }
        diff = up-down;
        if (diff < charThreshold) {
            buffer.push(dot);
            $transmission.append('· ');
        } else {
            buffer.push(dash);
            $transmission.append('– ');
        }
    },

    writeCharBuffer = function() {
        symbol = getChar();
        if (symbol!==false) {
            strMsg += symbol;
            $buffer.text(strMsg);
            $transmission.text('');
        }    
        clearTransmission = true;
    },
    
    sendMsg = function() {
        if (strMsg != null && strMsg > '') {
            socket.send({ msg: strMsg });
            strMsg = '';
            $buffer.text('');
        }    
        $transmission.text('');
    },
    
    msgCountdown = function() {
        if (!stopMsgCountdown) {
            isCountingDownMsg = true;
            msgEndDiff = msgEndTime - new Date().getTime();
            if (msgEndDiff <= 0) {
                isCountingDownMsg = false;
                sendMsg();
                countdown.resetCountdowns();
                return;
            }
            msgCountdownPercent = (msgEndDiff / msgThreshold);
            countdown.set2ndCountdown(msgCountdownPercent);
            if (msgEndDiff < 10)
                setTimeout(msgCountdown, msgEndDiff);
            else
                setTimeout(msgCountdown, 10);
        } else {
            countdown.resetCountdowns();
            isCountingDownMsg = false;
            clearTransmission = true;
        }
    },
    
    waitForMsgEnd = function() {
        msgEndTime = new Date().getTime() + msgThreshold;
        stopMsgCountdown = false;
        if (!isCountingDownMsg)
            msgCountdown();
    },
    
    charCountdown = function() {
        if (!stopCharCountdown) {
            isCountingDownChar = true;
            charEndDiff = charEndTime - new Date().getTime();
            if (charEndDiff <= 0) {
                isCountingDownChar = false;
                countdown.set1stCountdown(0);
                writeCharBuffer();
                waitForMsgEnd();
                return;
            }    
            charCountdownPercent = (charEndDiff / charThreshold);
            countdown.set1stCountdown(charCountdownPercent);
            if (charEndDiff < 10)
                setTimeout(charCountdown, charEndDiff);
            else
                setTimeout(charCountdown, 10);
        } else {
            countdown.resetCountdowns();
            isCountingDownChar = false;
        }
    },
    
    waitForCharEnd = function() {
        charEndTime = new Date().getTime() + charThreshold;
        stopCharCountdown = false;
        if (!isCountingDownChar)
            charCountdown();
    },

    socket = new io(null, {port: 3000});

    socket.on('message', function(obj) {
        if ('buffer' in obj) 
            for (var i in obj.buffer) {
                putMsg(obj.buffer[i]);
            }
        if ('alert' in obj)
            putAlert(obj.alert);
        if ('users' in obj)
            updateUserList(obj.users);
        if ('msg' in obj)
            putMsg(obj.msg);
    });
    
    socket.connect();
    
    $(document).keypress(function(e) {
        if (charReady == true && e.which == 46) {
            charReady = false;
            msgReady = false;
            e.preventDefault();
            keyDownTime = e.timeStamp;
            stopMsgCountdown = true;
            stopCharCountdown = true;
        }
    }).keyup(function(e) {
        if (charReady == false && e.which == 190) {
            e.preventDefault();
            keyUpTime = e.timeStamp;
            transmission(keyDownTime, keyUpTime);
            charReady = true;
            waitForCharEnd();
        }
    });
    
    $nick.change(function(e) {
        e.preventDefault();
        socket.send({ nick: $nick.val() });
    });
    
    
    
})(jQuery, io.Socket);
