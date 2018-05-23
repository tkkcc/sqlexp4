// based on https://github.com/dsernst/data-structures/blob/master/sprint-two/src/bTree.js#L81
class Node {
  constructor() {
    this.value = []
    this.children = []
  }
}
module.exports = class BTree {
  constructor(order = 1, debug = 2) {
    this.head = new Node()
    this.debug = debug
    this.order = order
    this.mid = Math.ceil(this.order / 2) - 1
    if (this.debug === 3)
      this.drawTree = require('asciitree')
  }
  log(...a) {
    if (this.debug === 0) return
    if (this.debug === 1) {
      // a = a.filter(i => ['string', 'number'].includes(typeof i)&& i.length===undefined||i.length<10)
      a = a.filter(i => typeof i === 'string' && i.length < 10 || typeof i === 'number')
    }
    console.log(...a)
  }
  insert(...a) {
    a.forEach(value => {
      if (!this._find(this.head, value))
        this._insert(this.head, value)
      this.log('insert', value, this.print())
    })
  }
  _insert(node, value) {
    const index = this._pickChild(node, value)
    if (typeof index === "number") {
      this._insert(node.children[index], value)
    } else {
      node.value.push(value)
      node.value.sort((a, b) => a - b)
      if (node.value.length === this.order) {
        this._split(node)
      }
    }
  }
  find(...a) {
    a.forEach(value => {
      const result = this._find(this.head, value)
      if (result) {
        this.log('find', value, 'success', result[0]['value'])
        // return result[0]['value']
      } else {
        this.log('find', value, 'failed')
      }
    })
  }
  _find(node, value) {
    if (!node) return
    const index = this._pickChild(node, value)
    if (index === undefined) {
      for (let i = 0; i < node.value.length; ++i) {
        if (node.value[i] === value) return [node, i]
      }
      return
    }
    if (node.value[index] === value) return [node, index]
    else return this._find(node.children[index], value)
  }
  delete(...a) {
    // let that = this
    a.forEach(value => {
      if (value === 10) {
        console.log()
      }
      const result = this._find(this.head, value)
      if (!result) {
        this.log('delete', value, 'not found')
        return
      }
      this._delete(...result)
      this.log('delete', value, this.print())
    })
    // return that
  }
  _delete(node, index, join = false) {
    if (join) {
      if (!node.parent) {
        if (node.children.length === 1) {
          node.children[0].parent = undefined
          this.head = node.children[0]
        }
        node.value.splice(index, 1)
        return
      }
      //  leaf node 
      const value = node.value.splice(index, 1)[0] + 1
      if (node.value.length + 1 > this.mid) return
      const parent = node.parent
      index = this._pickChild(parent, value)
      const l = index - 1 >= 0 ? parent.children[index - 1] : undefined
      const r = parent.children[index + 1]
      if (l && l.value.length > this.mid) {
        node.value.unshift(parent.value[index - 1])
        if (l.children.length > 0) {
          node.children.unshift(l.children[l.children.length - 1])
          node.children[0].parent = node
        }
        parent.value[index - 1] = l.value[l.value.length - 1]
        l.value.pop()
        l.children.pop()
      } else if (r && r.value.length > this.mid) {
        node.value.push(parent.value[index])
        if (r.children.length > 0) {
          node.children.push(r.children[0])
          r.children[0].parent = node
        }
        parent.value[index] = r.value[0]
        r.value.shift()
        r.children.shift()
      } else if (l) {
        l.value = l.value.concat(parent.value[index - 1], node.value)
        l.children = l.children.concat(node.children)
        node.children.forEach(i => i.parent = l)
        parent.children.splice(index, 1)
        this._delete(parent, index - 1, true)
      } else {
        node.value = node.value.concat(parent.value[index], r.value)
        node.children = node.children.concat(r.children)
        r.children.forEach(i => i.parent = node)
        parent.children.splice(index + 1, 1)
        this._delete(parent, index, true)
      }
      return
    }
    // not leaf node,find the most left node in right subtree
    if (node.children.length === 0) {
      this._delete(node, index, true)
      return
    }
    let x = node.children[index + 1]
    while (x.children.length !== 0) x = x.children[0]
    node.value[index] = x.value[0]
    // x.value[0] += 0.5
    this._delete(x, 0, true)
  }

  _split(node) {
    const l = new Node()
    const r = new Node()
    // split l,m,r
    l.value = node.value.splice(0, this.mid)
    const m = node.value.splice(0, 1)[0]
    r.value = node.value.splice(0)
    l.children = node.children.splice(0, l.value.length + 1)
    r.children = node.children.splice(0)
    l.children.forEach(i => { i.parent = l })
    r.children.forEach(i => { i.parent = r })
    // insert l,m,r
    if (node.parent) {
      const parent = node.parent
      l.parent = r.parent = parent
      const index = this._pickChild(parent, l.value[0])
      parent.children.splice(index, 1, l, r)
      this._insert(parent, m)
    } else {
      node.value[0] = m
      node.children = [l, r]
      l.parent = r.parent = node
    }
  }

  _pickChild(node, value) {
    if (!node || node.children.length === 0 || (node.children.length - 1) - node.value.length > 0) return
    let i = 0
    while (i < node.value.length && value > node.value[i])++i
    return i
  }
  levelPrint() {
    const q = [this.head]
    let l = -1
    while (++l < q.length) {
      for (let c of q[l].children) {
        q.push(c)
      }
    }
    return JSON.stringify(q.map(i => i.value))
  }
  _getChild(node) {
    const result = [node.value]
    node.children.forEach(i => result.push(this._getChild(i)))
    return result
  }
  treePrint() {
    return this._getChild(this.head)
  }
  print() {
    if (this.debug === 0) return
    if (this.debug === 3) {
      // console.log(this.treePrint(this))
      return '\n' + this.drawTree(this.treePrint())
    } else {
      return this.levelPrint()
    }
  }
}