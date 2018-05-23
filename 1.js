const fs = require('fs')
const ee = require('events')
const btree = require('./btree')
const total = 10 ** 6
const limit = 10 ** 6
// key length must be 4 bytes
const len = 16
const path = total + 'record'
const makeData = (num = 2) => {
    const w = fs.createWriteStream(path)
    for (let i = 0; i < num; ++i) {
        // 0 - 2**32-2
        const a = Math.floor(Math.random() * (2 ** 32 - 1))
        const b = Buffer.alloc(len)
        b.writeUInt32LE(a)
        b.write(a.toString().padStart(len - 4, '0'), 4)
        w.write(b)
    }
    w.end()
    console.log('make data finish')

}
const test = () => new Promise(resolve => {
    const r = fs.createReadStream(path + '2')
    let pre = -1, i = 0
    r.on('readable', () => {
        let chunk
        while (chunk = r.read(len)) {
            i++
            const now = chunk.readUInt32LE(0)
            if (pre > now) resolve([])
            pre = now
        }
    })
    r.on('end', () => {
        resolve([true, i])
    })
})
const step1 = () => new Promise(resolve => {
    const r = fs.createReadStream(path)
    const w = fs.createWriteStream(path + '1')
    r.on('readable', () => {
        // 16 times, 1M each, async
        let chunk
        while (null !== (chunk = r.read(limit))) {
            const a = []
            for (let i = 0; i < limit; i += len) {
                a.push(chunk.slice(i, i + len))
            }
            a.sort((a, b) => a.readUInt32LE(0) - b.readUInt32LE(0))
            w.write(Buffer.concat(a))
        }
    })
    r.on('end', resolve)
})
class PQ extends ee {
    constructor(len = 0, small = (a, b) => a < b) {
        super()
        this.h = [...Array(len + 1)]
        this.len = len
        this.size = 0
        this.small = small
    }

    push(n) {
        if (this.size === this.len) return
        this.size++
        let i = this.size, j = Math.floor(i / 2)
        while (this.h[j] && this.small(n, this.h[j])) {
            this.h[i] = this.h[j]
            i = j
            j = Math.floor(i / 2)
        }
        this.h[i] = n
        if (this.size === this.len) {
            this.emit('full')
        }
    }

    pop() {
        if (this.size === 0) return
        if (this.size === 1) return this.h[this.size--]
        const pop = this.h[1]
        const n = this.h[this.size]
        this.size--
        let l = 2, r = 3
        while (l <= this.size && this.small(this.h[l], n) || r <= this.size && this.small(this.h[r], n)) {
            if (r <= this.size && this.small(this.h[r], this.h[l])) {
                this.h[Math.floor(r / 2)] = this.h[r]
                l = r * 2
                r = l + 1
            } else {
                this.h[Math.floor(l / 2)] = this.h[l]
                l = l * 2
                r = l + 1
            }
        }
        this.h[Math.floor(l / 2)] = n
        return pop
    }
}
const step2 = () => new Promise(resolve => {
    const p = new PQ(len, (a, b) => a.data.readUInt32LE(0) < b.data.readUInt32LE(0))
    const r = []
    const w = fs.createWriteStream(path + '2')
    const push = (r, i, p) => {
        let chunk
        if ((chunk = r.read(len)) && chunk.byteLength === len) {
            p.push({ data: chunk, index: i })
        } else {
            r.once('readable', () => {
                push(r, i, p)
            })
        }
    }
    for (let i = 0; i < len; ++i) {
        const f = fs.createReadStream(path + '1', {
            start: i * limit,
            end: (i + 1) * limit
        }).once('readable', () => {
            push(f, i, p)
        }).on('end', () => {
            const buf = Buffer.alloc(4)
            buf.writeUInt32LE(2 ** 32 - 1)
            p.push({ data: buf, index: i })
        })
        r.push(f)
    }
    let i = 0
    p.on('full', () => {
        const { data, index } = p.pop()
        // finish
        if (data.readUInt32LE(0) === 2 ** 32 - 1) {
            resolve()
            return
        }
        w.write(data)
        process.nextTick(() => {
            push(r[index], index, p)
        })
    })
})

const sort = async () => {
    await step1()
    console.log('step1 finish')
    await step2()
    console.log('step2 finish')
    const result = await test()
    if (result[0] === true) {
        console.log('sorted', result[1])
    } else {
        console.log('not sorted', ...result.slice(1))
    }
}
const bt = () => {
    let b = new btree(4, 3)
    b.insert(32, 27, 1, 5, 6, 2, 1, 2, 7, 9, 10, 8, 200, 90, 30)
    b.find(1, 2, 3, 4, 5, 32, 27)
    b.delete(1, 5, 27, 32, 8, 120, 10, 90, 200, 9, 6, 7, 2, 30, 4)
    b.insert(3)
    console.log('============')
    // return
    b = new btree(25, 0)
    const r = fs.readFileSync(path)
    let j = 0
    for (let i = 0; i < total * len; i += len) {
        b.insert(r.slice(i, i + len).readUInt32LE(0))
    }
    console.log('insert finish')
    b.debug = 1
    b.find(2495087571, 3002405297, 2405297)
    b.delete(2495087571, 3002405297, 2405297)
    // order,debuglevel

    // b.insert(1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24)
    // b.delete(5,2,20,1,3,7,10,9,8,22,15,17)
};
const main = async () => {
    makeData(total)
    await sort()
    console.log('=======');
    bt()
}
main()


