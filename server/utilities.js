const express = require('express')
const app = express()
const server = require('http').Server(app)
const path = require('path')

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/index.html'))
})

app.use('/client', express.static(path.join(__dirname, '../client')))

server.listen(2000, () => console.log('Listening on port 2000!'))

const SOCKET_LIST = {}
const PLAYER_LIST = {}

const Player = function (id) {
  const player = {
    x: 250,
    y: 250,
    id: id,
    number: `${Math.floor(10 * Math.random())}`,
    pressingRight: false,
    pressingLeft: false,
    pressingUp: false,
    pressingDown: false,
    maxSpeed: 10
  }
  player.updatePosition = () => {
    player.x += player.maxSpeed && player.pressingRight
    player.x -= player.maxSpeed && player.pressingLeft
    player.y -= player.maxSpeed && player.pressingUp
    player.y += player.maxSpeed && player.pressingDown
  }
  return player
}

const io = require('socket.io')(server, {})

io.sockets.on('connection', (socket) => {
  console.log('connection established')
  socket.id = Math.random()
  SOCKET_LIST[socket.id] = socket

  const player = Player(socket.id)
  PLAYER_LIST[socket.id] = player

  socket.on('disconnect', () => {
    delete SOCKET_LIST[socket.id]
    delete PLAYER_LIST[socket.id]
  })
  socket.on('keyPress', (data) => {
    player.pressingLeft = data.state && data.inputId === 'left'
    player.pressingRight = data.state && data.inputId === 'right'
    player.pressingUp = data.state && data.inputId === 'up'
    player.pressingDown = data.state && data.inputId === 'down'
  })
})

setInterval(() => {
  let pack = []
  for (let i in PLAYER_LIST) {
    const player = PLAYER_LIST[i]
    player.updatePosition()
    pack.push({
      x: player.x,
      y: player.y,
      number: player.number
    })
  }
  for (let i in SOCKET_LIST) {
    const socket = SOCKET_LIST[i]
    console.log('new position')
    socket.emit('newPosition', pack)
  }
}, 1000 / 90)
