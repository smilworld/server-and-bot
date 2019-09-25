const WebSocket = require('ws');
const wss = new WebSocket.Server({port:process.env.PORT})
var users = {}
var players = 0
// https://github.com/lolsuperscratch/smilworld-server
function broadcast(from,data) {
  wss.clients.forEach(function each(client) {
      if (client !== from && client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
  });
}
function serverbroadcast(data) {
  wss.clients.forEach(function each(client) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
  });
}
var blocks = {};
wss.on('connection', function connection(ws) {
  ws.username = "player"
  var oldUsername = ""
  ws.userId = Math.floor(Math.random()*99999999) // generate user id by number.
  players += 1
  broadcast(ws,'join|'+ws.userId) // greetings
  wss.clients.forEach(function each(client) {
      // send join messages that are connected into this server
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        ws.send('join|'+client.userId)
      }
  });
  // get a blocks list and send it to this client.
  for (var i in blocks) {
    ws.send('block|'+blocks[i].id+"|"+blocks[i].x+"|"+blocks[i].y+"|"+blocks[i].type)
  }
  ws.on('message',function incoming(data) {
    var parsed = data.split('|')
    if (parsed[0] == "username") {
      // make the username changed.
      oldUsername = ws.username
      if (users[ws.username]) {
        users[ws.username].member.addRole('626245805229080576','playing smilworld').catch(console.error)
      }
      if (users[oldUsername]) {
        users[oldUsername].member.removeRole('626245805229080576','stopped playing smilworld').catch(console.error)
      }
      ws.username = parsed[1]
    }
    if (parsed[0] == "update") {
      // update client positions and avatar
      broadcast(ws,"update|"+ws.userId+"|"+ws.username+"|"+parsed[1]+"|"+parsed[2]+"|"+parsed[3]+"|"+parsed[4]+"|"+parsed[5])
    }
    if (parsed[0] == "chat") {
      // send a chat message from this client.
      serverbroadcast("chat|"+ws.username+"|"+parsed[1])
    }
    if (parsed[0] == "create") {
      // create a new block.
      var generatedid = Math.floor(Math.random()*99999999)
      blocks[generatedid] = {id:generatedid,x:parsed[1],y:parsed[2],type:parsed[3]}
      serverbroadcast("block|"+generatedid+"|"+parsed[1]+"|"+parsed[2]+"|"+parsed[3])
    }
    if (parsed[0] == "destroy") {
      // destroy a block
      delete blocks[parsed[1]]
      serverbroadcast("destroy|"+parsed[1])
    }
  })
  ws.on('close',function () {
    // player left the server.
    serverbroadcast("left|"+ws.userId)
    if (users[ws.username]) {
      users[ws.username].member.removeRole('626245805229080576','stopped playing smilworld').catch(console.error)
    }
    players -= 1
  })
})
const Discord = require('discord.js');
const client = new Discord.Client();

client.on('ready', () => {
  console.log(`I'm ready`);
  client.setInterval(function () {
    client.user.setActivity(`with ${players} players online!`,{type: 'PLAYING'})
  },1200)
});
var prefix = ">"
client.on('guildMemberRemove',member => {
  for (var i in users) {
    if (users[i].member.id == member.id) {
      delete users[i]
    }
  }
})
client.on('message', msg => {
  if (!msg.guild) return;
  if (msg.author.bot) return; // do not reply to other bots
  if (!msg.content.startsWith(prefix)) return;
  var args = msg.content.split(' ').slice(1);
  var cmd = msg.content.split(' ')[0].slice(1);
  if (cmd == "help") {
    msg.author.send(`
    ${prefix}players - Shows the player list.\n
    ${prefix}user [username] - if you play SmilWorld with your username, you will have the role. non-offical servers will not work.\n
    `).then(function () {
      msg.channel.send("${msg.author}, check your dms!")
    }).catch(function () {
      msg.channel.send("${msg.author}, i can't send you a dm, make sure you allow dm from server members.")
    })
  }
  if (cmd == "players") {
    var playerz = []
    wss.clients.forEach(function each(client) {
      // send join messages that are connected into this server
      if (client.readyState === WebSocket.OPEN) {
        playerz.push(client.username)
      }
    });
      msg.channel.send(`Players Online: ${playerz.join(', ')}`)
  }
  if (cmd == "user") {
    if (!args[0]) return msg.channel.send(`usage: ${prefix}user [username]`)
    users[args[0]] = {member:msg.member}
    msg.channel.send('playing SmilWorld with your username is now listening!')
  }
});

client.login(process.env.BOT_TOKEN);
