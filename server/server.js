const express = require('express')
const app = express()
const server = require('http').Server(app)
const path = require('path')

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/public/index.html'))
})

app.use('/client', express.static(path.join(__dirname, '../client/public')))

server.listen(2000, () => console.log('Listening on port 2000!'))

const SOCKET_LIST = {}
/**
 * Entity 'super class' to be used by both the bullet and player classes
 */

const Entity = () => {
  const self = {
    x: 250,
    y: 250,
    spdX: 0,
    spdY: 0,
    id: ''
  }
  self.update = () => {
    self.updatePosition()
  }
  self.updatePosition = () => {
    self.x += self.spdX
    self.y += self.spdY
  }
  return self
}

/**
 * Player Class
 */
const Player = (id) => {
  const self = Entity()
  self.id = id
  self.number = `${Math.floor(10 * Math.random())}`
  self.pressingRight = false
  self.pressingLeft = false
  self.pressingUp = false
  self.pressingDown = false
  self.maxSpd = 10

  const superUpdate = self.update

  self.update = () => {
    self.updateSpd()
    superUpdate()
  }
  self.updateSpd = () => {
    if (self.pressingRight) {
      self.spdX = self.maxSpd
    } else if (self.pressingLeft) {
      self.spdX = -self.maxSpd
    } else {
      self.spdX = 0
    }
    if (self.pressingUp) {
      self.spdY = -self.maxSpd
    } else if (self.pressingDown) {
      self.spdY = self.maxSpd
    } else {
      self.spdY = 0
    }
  }
  Player.list[id] = self
  return self
}

Player.list = {}

Player.onConnect = (socket) => {
  const player = Player(socket.id)
  socket.on('keyPress', (data) => {
    if (data.inputId === 'left') {
      player.pressingLeft = data.state
    }
    // player.pressingLeft = data.state && data.inputId === 'left'
    player.pressingRight = data.state && data.inputId === 'right'
    player.pressingUp = data.state && data.inputId === 'up'
    player.pressingDown = data.state && data.inputId === 'down'
  })
}

Player.onDisconnect = (socket) => {
  delete Player.list[socket.id]
  delete SOCKET_LIST[socket.id]
}

Player.update = () => {
  let pack = []
  for (let i in Player.list) {
    const player = Player.list[i]
    player.update()
    pack.push({
      x: player.x,
      y: player.y,
      number: player.number
    })
  }
  return pack
}

const Bullet = (angle) => {
  const self = Entity()
  self.id = Math.random()
  self.spdX = Math.cos(angle / 180 * Math.PI) * 10
  self.spdY = Math.sin(angle / 180 * Math.PI) * 10

  self.timer = 0
  self.toRemove = false
  const superUpdate = self.update
  self.update = () => {
    if (self.timer++ > 100) {
      self.toRemove = true
    }
    superUpdate()
  }
  Bullet.list[self.id] = self
  return self
}

Bullet.list = {}

Bullet.update = () => {
  if (Math.random() < 0.1) {
    Bullet(Math.random() * 360)
  }

  const pack = []
  for (let i in Bullet.list) {
    const bullet = Bullet.list[i]
    bullet.update()
    pack.push({
      x: bullet.x,
      y: bullet.y
    })
  }
  return pack
}

const io = require('socket.io')(server, {})
io.sockets.on('connection', (socket) => {
  socket.id = Math.random()
  SOCKET_LIST[socket.id] = socket

  Player.onConnect(socket)
  socket.on('disconnect', () => {
    delete SOCKET_LIST[socket.id]
    Player.onDisconnect(socket)
    delete Player.list[socket.id]
  })
})

setInterval(() => {
  const pack = {
    player: Player.update(),
    bullet: Bullet.update()
  }

  for (let i in SOCKET_LIST) {
    const socket = SOCKET_LIST[i]
    socket.emit('newPositions', pack)
  }
}, 1000 / 25)
