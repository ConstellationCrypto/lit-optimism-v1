import { getBal, sendToken } from './faucet/functions'
import { ethers } from 'ethers'
const express = require('express')
const server = express()
const port = 6000
server.use(express.json())

server.post('/', async (req, res) => {
  var body = req.body

  // Check validity of request format
  var isValid = ('address' in body) ? true : false

  // Incorrect Input
  if (!isValid) {
    return res.status(400).json('Invalid request format')
  }

  // Check validity of address
  var address = body.address
  var validAddress = ethers.utils.isAddress(address) ? true : false

  if (validAddress) {
    await getBal(address)
    await sendToken(address)
    return res.send(`Sent token to ${address}`)
  }

  // Invalid Address
  return res.status(400).json('Invalid address')
})

server.listen(port, () => console.log(`Faucet api listening on port ${port}`))
module.exports = server 