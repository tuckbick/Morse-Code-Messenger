
/**
 * Module dependencies.
 */

var express = require('express'),
    io = require('socket.io');

var app = module.exports = express.createServer();

// Configuration

app.configure(function(){
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(express.compiler({ src: __dirname + '/public', enable: ['sass'] }));
  app.use(app.router);
  app.use(express.static(__dirname + '/public'));
});

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true })); 
});

app.configure('production', function(){
  app.use(express.errorHandler()); 
});

// Routes

app.get('/', function(req, res){
  res.render('index', {
    title: 'Morse Code Messenger'
  });
});


// Socket.io

var socket = io.listen(app),
    nick1 = '', nick2 = '', msg = {};
    
var trim = function(str) {
    return str.replace(/^\s\s*/, '').replace(/\s\s*$/, '');
};

var UserList = (function(){    
    var users = {}, count = 0, temp,
    addUser = function(id, nick) {
        if (nick === null || trim(nick) === '')
            nick = 'user'+(count++);
        users[id] = nick;
        return nick;
    },
    removeUser = function(id) {
        temp = users[id];
        delete users[id];
        return temp;
    },
    getNick = function(id) {
        return users[id];
    },
    getUsers = function() {
        return users;
    };
    return {
        addUser    : addUser,
        removeUser : removeUser,
        setNick    : addUser,
        getNick    : getNick,
        getUsers   : getUsers 
    };
})();

var Buffer = (function(users) {
    var buffer = [],
    add = function(msg) {
        buffer.push(msg);    
        if (buffer.length > 15) buffer.shift();
    },
    get = function() {
        return buffer;
    };
    return {
        add: add,
        get: get
    };
})(UserList);

var Timestamp = (function() {
    var now,
    get = function() {
        now = new Date();
        return (now.getMonth()+1)+'/'+now.getDate()+'/'+now.getFullYear()+' '+now.toLocaleTimeString();
    };
    return {
        get: get
    };
})();

socket.on('connection', function(client){

    client.send({ buffer: Buffer.get() });

    nick1 = UserList.addUser(client.sessionId, null);
    socket.broadcast({
        alert: nick1 + ' connected',
        users: UserList.getUsers()
    });

    client.on('message', function(obj){
        if ('msg' in obj) {
            nick1 = UserList.getNick(client.sessionId);
            msg = {
                nick: nick1,
                text: obj.msg,
                time: Timestamp.get()
            };
            Buffer.add(msg);
            socket.broadcast({ msg: msg });
        }
        if ('nick' in obj) {
            nick1 = UserList.getNick(client.sessionId);
            nick2 = UserList.addUser(client.sessionId, obj.nick);
            socket.broadcast({
                alert: nick1+' is now known as '+nick2,
                users: UserList.getUsers()
            });
        }

    });

    client.on('disconnect', function(){
        nick1 = UserList.removeUser(client.sessionId);
        socket.broadcast({
            alert: nick1 + ' disconnected',
            users: UserList.getUsers()
        });
    });

});


// Only listen on $ node app.js

if (!module.parent) {
  app.listen(3000);
  console.log("Express server listening on port %d", app.address().port);
}
