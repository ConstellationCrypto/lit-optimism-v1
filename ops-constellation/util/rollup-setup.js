
const { ArgumentParser } = require('argparse')
const { ethers } = require('ethers')
var fs = require('fs');

const parser = new ArgumentParser()
parser.add_argument('--rpc')
parser.add_argument('--config_dir', {
    help: "Location to store configuration files in"
})
args = parser.parse_args()
let provider = new ethers.providers.JsonRpcProvider(args['rpc'])

async function fetch_l1_start_height() {
    const block_number = await provider.getBlockNumber()
    fs.writeFile(`${args['config_dir']}/rollup-config/l1-startHeight`, block_number.toString(), (err) => {
        if (err) throw err
    })
}

async function runSetup() {
    fetch_l1_start_height()
}

runSetup()
