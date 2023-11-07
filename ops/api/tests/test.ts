import { sendToken, getBal } from '../faucet/functions'
import { expect } from 'chai'
import { isTypedArray } from 'util/types'
import { ethers } from 'ethers'
let chai = require('chai')
let chaiHttp = require('chai-http')
let server = require('../server')
let should = chai.should()

chai.use(chaiHttp)
describe('Faucet api', () =>{
  describe('/POST address', () => {
    it('Should POST an address to receive token', async function() {
        let addy = { // Currently a default hardhat address, can be changed
          address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'
        }
        let beforeBal = await getBal(addy['address'])
      let res = await chai.request(server)
          .post('/')
          .send(addy);
      res.text.should.eql('Sent token to 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266')
      let afterBal = await getBal(addy['address'])
      let preBalReadable = ethers.utils.formatEther(beforeBal)
      let postBalReadable = ethers.utils.formatEther(afterBal)
      postBalReadable.should.eql(String(Number(preBalReadable) + 0.05))
    })
    it('Should not POST an invalid address', (done) => {
      let addy = {
        address: '0xabcdefg'
      }
      chai.request(server)
          .post('/')
          .send(addy)
          .end((err, res) => {
              res.should.have.status(400)
              res.text.should.eql('"Invalid address"')
            done()
          })
    })
  })
})