function intersectsCircle(r1, pos1, r2, pos2,) {
  return r1 + r2 >= pos2.subtr(pos1).mag()
}

function penetrationResolution(r1, pos1, mass1, r2, pos2, mass2) {
  const dist = pos1.subtr(pos2)
  const depth = r1 + r2 - dist.mag()
  const penetrationRes = dist.unit().multiply(depth / (1 / mass1 + 1 / mass2))
  return pos1.add(penetrationRes.multiply(1 / mass1))
}

function collideResolution(pos1, vel1, ela1, mass1, pos2, vel2, ela2, mass2) {
  const normal = pos1.subtr(pos2).unit()
  const relativeVelocity = vel1.subtr(vel2)
  const separatingVelocity = relativeVelocity.dot(normal)
  const newSepVel = -separatingVelocity * Math.min(ela1, ela2)

  const vsepDiff = newSepVel - separatingVelocity

  const impulse = vsepDiff / (1 / mass1 + mass2)
  const impulseVector = normal.multiply(impulse)

  return vel1.add(impulseVector.multiply(1 / mass1))
}

function collide(source, target) {
  // source is the mover
  if (!intersectsCircle(source.r, source.pos, target.r, target.pos)) return

  source.pos = penetrationResolution(
    source.r, source.pos, source.mass,
    target.r, target.pos, target.mass,
  )
  source.velocity = collideResolution(
    source.pos, source.velocity, source.elasticity, source.mass,
    target.pos, target.velocity, target.elasticity, target.mass,
  )
}

function vector(x, y) {
  return {
    x,
    y,
    add: function(vec) {
      return vector(this.x + vec.x, this.y + vec.y)
    },
    subtr: function(vec) {
      return vector(this.x - vec.x, this.y - vec.y)
    },
    multiply: function(scalar) {
      return vector(this.x * scalar, this.y * scalar)
    },
    dot: function(vec) {
      return this.x * vec.x + this.y * vec.y
    },
    mag: function() {
      return Math.sqrt(this.x ** 2 + this.y ** 2)
    },
    unit: function() {
      const mag = this.mag()
      if (mag === 0) {
        return vector(0, 0)
      }
      return vector(this.x / mag, this.y / mag)
    },
    rotate: function(angle) {
      const cos = Math.cos(angle)
      const sin = Math.sin(angle)
      return vector(this.x * cos - this.y * sin, this.x * sin + this.y * cos)
    }
  }
}

function circle(x, y, radius) {
  return {
    pos: vector(x, y),
    r: radius,
    velocity: vector(0, 0),
    mass: 1,
    elasticity: 1,
    update: function() {
      this.pos = this.pos.add(this.velocity)
    },
  }
}

function shapeManager() {
  const shapes = []
  let highlighted = null

  function add(shape) {
    shapes.push(shape)
  }

  return {
    create: function(x, y, radius) {
      const shape = circle(x, y, radius)
      add(shape)
    },
    update: function() {
      for (let i = 0; i < shapes.length; i++) {
        shapes[i].update()
        for (let j = i + 1; j < shapes.length; j++) {
          collide(shapes[i], shapes[j])
        }
      }
    },
    highlight: function(x, y) {
      const found = shapes.find(s => s.pos.subtr(vector(x, y)).mag() < s.r)

      if (found) {
        highlighted = found
      }
    },
    unhighlight: function() {
      highlighted = null
    },
    move: function(x, y) {
      if (!highlighted) return
      highlighted.pos = vector(x, y)
      const overlapping = shapes.filter(s => s !== highlighted && intersectsCircle(s.r, s.pos, highlighted.r, highlighted.pos))
      overlapping.forEach(s => {
        collide(s, highlighted)
      })
    },
    get: function() {
      return shapes.map(x => {
        return {
          pos: x.pos,
          r: x.r,
          highlighted: x === highlighted,
        }
      })
    },
  }
}

function shapeDrawer(manager, context) {
  return {
    draw: function() {
      context.save()
      context.clearRect(0, 0, context.canvas.width, context.canvas.height)
      // gradient bg
      const gradient = context.createLinearGradient(0, 0, 0, context.canvas.height)
      gradient.addColorStop(0, '#ccc')
      gradient.addColorStop(1, '#99f')
      context.fillStyle = gradient
      context.fillRect(0, 0, context.canvas.width, context.canvas.height)
      // shapes
      context.fillStyle = 'rgba(0,0,0,0)'
      manager.get().forEach(shape => {
        context.strokeStyle = shape.highlighted ? '#0f0' : '#000'
        context.beginPath()
        context.arc(shape.pos.x, shape.pos.y, shape.r, 0, Math.PI * 2)
        context.stroke()
      })
      context.restore()
    },
  }
}

function main() {
  const manager = shapeManager()
  const context = createCanvas({
    onClickCallbacks: [manager.highlight],
    onReleaseCallbacks: [manager.unhighlight],
    onMoveCallbacks: [manager.move],
  })
  const drawer = shapeDrawer(manager, context)

  animate(function() {
    manager.update()
    drawer.draw()
  })

  // initial shapes
  const x = window.innerWidth / 2
  const y = window.innerHeight / 2
  const radius = 10
  const count = 50
  for (let i = 0; i < count; i++) {
    const direction = vector(1, 0).rotate(i * (Math.PI / 10))
    manager.create(
      x + direction.x * (i * 25),
      y + direction.y * (i * 25),
      radius + i,
    )
  }
}

main()

//- application logics

function animate(callback) {
  const tps = 1000 / 60
  let lastTime = 0
  let elapsed = 0

  requestAnimationFrame(function tick(time) {
    const delta = time - lastTime
    lastTime = time
    elapsed += delta

    if (elapsed >= tps) {
      callback()
      elapsed = 0
    }

    requestAnimationFrame(tick)
  })
}

function createCanvas({ onClickCallbacks, onReleaseCallbacks, onMoveCallbacks }) {
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')
  document.body.appendChild(canvas)

  canvas.width = window.innerWidth
  canvas.height = window.innerHeight

  window.addEventListener('resize', function() {
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
  })

  window.addEventListener('mousedown', function(e) {
    onClickCallbacks.forEach(callback => callback(e.clientX, e.clientY))
  })

  window.addEventListener('mouseup', function(e) {
    onReleaseCallbacks.forEach(callback => callback(e.clientX, e.clientY))
  })

  window.addEventListener('mousemove', function(e) {
    onMoveCallbacks.forEach(callback => callback(e.clientX, e.clientY))
  })

  return context
}
