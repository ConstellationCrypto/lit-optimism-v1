/* eslint-disable */
const chai = require("chai");
// eslint is disabled because I was not able to import chai-spies properly here.
/* eslint-disable */
const spies = require("chai-spies");

// Chai plugins go here.
chai.use(spies);

const should = chai.should();
const expect = chai.expect;
const spy = chai.spy;

export { should, expect, spy };
