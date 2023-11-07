"use strict";
exports.__esModule = true;
var chai = require('chai');
var chaiHttp = require('chai-http');
var server = require('../server');
var should = chai.should();
chai.use(chaiHttp);
describe('Faucet api', function () {
    describe('/POST address', function () {
        it('Should POST an address to receive token', function (done) {
            var addy = {
                address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'
            };
            chai.request(server)
                .post('/')
                .send(addy)
                .end(function (err, res) {
                res.body.should.have.property('message').eql('Sent token to 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266');
                done();
            });
        });
        it('Should not POST an invalid address', function (done) {
            var addy = {
                address: '0xabcdefg'
            };
            chai.request(server)
                .post('/')
                .send(addy)
                .end(function (err, res) {
                res.should.have.status(400);
                res.body.should.be.a('object');
                res.body.should.have.property('message').eql('Invalid address');
                done();
            });
        });
    });
});
