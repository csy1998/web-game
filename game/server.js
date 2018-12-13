/**
 * 你画我猜大作业
 * 服务端
 */

// globel variable
var httpd = require('http').createServer(handler);
var io = require('socket.io').listen(httpd);
var fs = require('fs');
var db = require('./db');
var func = require('./func')
httpd.listen(3000);  // the test page is in 127.0.0.1:3000

var Game = {};
Game.users = func.getUsers();
Game.painters = [];      // all painters is in painters
Game.painter = null;     // painter user, only one painter at one round
Game.paths = [];         // paint paths on the cloth

/**
 * load game index page
 */
function handler(req,res) {
    var url = (req.url==='/') ? 'index.html' : req.url;
    fs.readFile(__dirname+'/static/'+url, function (err,data) {
        if(err) {
            res.writeHead(500);
            return res.end('Fail to load index.html......');
        }
        res.writeHead(200);
        res.end(data);
    });
}

/**
 * build the connection 
 */
io.sockets.on('connection', function (socket) {
    socket.on('login', function (name) {
        // login and get into the room
        this.name = name || "游客";
        this.toPaint = false;    // distinguish the painting user and non-painting user

        this.emit('server msg', '欢迎 ' + this.name + ' 进入游戏!');
        this.broadcast.emit('server msg', '欢迎 '+ this.name + ' 进入游戏!');
        
        this.emit('paint paths', JSON.stringify(Game.paths));

        var painters = Game.painters.map(x=>{return func.getSocket(x)});
        this.emit('reset in users', JSON.stringify(painters));   // show users

        Game.users.set(this.id.substring(2), this.name, 0);
        var json = JSON.stringify(Game.users);
        this.emit('Game.users', json);
        this.broadcast.emit('Game.users', json);
        console.log(json);

        // set down and paint in line
        this.on('in',function () {
            if(this.toPaint) return;
            this.toPaint = Date.now();   // get the time as user's toPaint
            Game.painters.push(this);
            var info = JSON.stringify(func.getSocket(this));
            this.broadcast.emit('new in user', info);
            this.emit('in', info);

            // if users >= 1, game start
            setTimeout(function () {
                if(Game.painter || !Game.painters.length) return;
                Game.newRound = arguments.callee;    // a new round
                
                var painter = Game.painters[0];
                Game.painter = painter;
                painter.time = 60; 
                painter.word = db.randomWord();
                painter.emit('painting time', JSON.stringify({name:painter.name, word:painter.word.word, time:painter.time}));
                painter.broadcast.emit('guessing time', JSON.stringify({name:painter.name, time:painter.time}));
                
                Game.timer = setTimeout(function () {
                    console.log(painter.time, painter.name, painter.word.word);
                    // time is over, start a new round
                    if(painter.time === 0){
                        delete painter.time;
                        delete Game.painter;
                        delete painter.toPaint;
                        Game.paths = [];
                        Game.painters.shift();
                        setTimeout(Game.newRound, 4000);
                        painter.emit('painting time out', painter.id.substring(2));
                        painter.broadcast.emit('guessing time out', JSON.stringify({id:painter.id.substring(2), word:painter.word.word}));
                        painter.emit('clear paint');
                        painter.broadcast.emit('clear paint');
                        return;
                    }
                    painter.time--;
                    var info = {name:painter.name, word:painter.word.word.length+'个字', time:painter.time};
                    if(painter.time <= 30) {
                        info.word = info.word + ',' + painter.word.tip;
                    }
                    info = JSON.stringify(info);
                    painter.emit('update painting time', info);
                    painter.broadcast.emit('update guessing time', info);
                    Game.timer = setTimeout(arguments.callee, 1000);
                }, 1000);
            }, 4000);
        });

        // get up
        this.on('out', function () {
            console.log('before', Game.painters.length);
            Game.painters.splice(Game.painters.findIndex(x=>{x.id===this.id}));
            console.log('after',Game.painters.length);
            this.toPaint = false;
            this.emit('out', this.id.substring(2));
            this.broadcast.emit('user out', this.id.substring(2));
        });

        // send msg
        this.on('client msg', function (msg) {
            if(!func.cmdMsg(msg,this,Game)) {
                msg = func.escapeHTML(msg);
                if(Game.painter && Game.painter.word.word === msg){
                    if(this.prev && this.prev.painter === Game.painter&& this.prev.word === msg){
                        this.emit('server msg',"您已经正确回答过了！");
                        return;
                    }
                    Game.users.set(this.id.substring(2),this.name,Game.users.get(this.id.substring(2)).v+1);
                    this.emit('server msg',"恭喜你回答正确！");
                    this.broadcast.emit('server msg',"恭喜 "+this.name+" 回答正确！");
                    var j = JSON.stringify(Game.users);
                    this.broadcast.emit('Game.users',j);
                    this.emit('Game.users',j);
                    this.prev = {
                        painter:Game.painter,
                        word:msg
                    };
                    return;
                }
                var date = new Date().format('yyyy-MM-dd hh:mm:ss');
                this.emit('server msg',date+'<br>'+ this.name  + ' 说: ' + msg);
                this.broadcast.emit('server msg',date+'<br>'+ this.name  + ' 说: ' + msg);
            }
        });

        // leave the room
        this.on('disconnect', function () {
            if(Game.painter && this.id === Game.painter.id) {
                delete Game.painter;
                Game.paths = [];
                Game.painters.shift();
                if(Game.timer != null) {
                    clearTimeout(Game.timer);
                    setTimeout(Game.newRound,4000);
                }
                this.broadcast.emit('guessing time',JSON.stringify({name:this.name+'(已退出)',time:0}));
                this.broadcast.emit('clear paint');
            }
            if(Game.users.isExists(this.id.substring(2)))
                Game.users.remove(this.id.substring(2));
            var i = Game.painters.indexOf(this);
            if(i != -1)  
                Game.painters.splice(i,1);
            this.broadcast.emit('server msg', '再见, ' + this.name + '。');
            this.broadcast.emit('user out', this.id.substring(2));
            this.broadcast.emit('Game.users', JSON.stringify(Game.users));
        });

        // paint the cloth
        this.on('paint', function (data) {
            if(!Game.painter || Game.painter.id !== this.id) return;
            data = JSON.parse(data);
            var pts = data.data;
            this.broadcast.emit('paint pts', JSON.stringify(pts));
            
            if(data.status === 'end') {
                pts.tag = 'pts';
                Game.paths.push(pts);
            }
            else if(data.status === 'ing') return;

        });

        // repaint the cloth
        this.on('repaint', function () {
            this.emit('paint paths',JSON.stringify(Game.paths));
        })

        // erase the cloth
        this.on('erase', function (x,y,w,h) {
            Game.paths.push({tag:'erase', x:x, y:y, w:w, h:h});
            this.broadcast.emit('erase', x, y, w, h);
        });

        // painter clear paths
        this.on('clear paths', function () {
            if(this === Game.painter) {
                console.log('clear the cloth');
                Game.paths = [];
                this.emit('clear paint');
                this.broadcast.emit('clear paint');
            }
        })
    });
    socket.emit('login');
})

/**
 * override Date function from meizz
 */
Date.prototype.format = function (fmt) {        //author: meizz
    var o = {
        "M+": this.getMonth() + 1,              //月份
        "d+": this.getDate(),                   //日
        "h+": this.getHours(),                  //小时
        "m+": this.getMinutes(),                //分
        "s+": this.getSeconds(),                //秒
        "q+": Math.floor((this.getMonth() + 3) / 3),    //季度
        "S": this.getMilliseconds()                     //毫秒
    };
    if (/(y+)/.test(fmt)) fmt = fmt.replace(RegExp.$1, (this.getFullYear() + "").substr(4 - RegExp.$1.length));
    for (var k in o)
        if (new RegExp("(" + k + ")").test(fmt)) fmt = fmt.replace(RegExp.$1, (RegExp.$1.length == 1) ? (o[k]) : (("00" + o[k]).substr(("" + o[k]).length)));
    return fmt;
}


