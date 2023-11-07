import { ethers } from "ethers"

const provider = new ethers.providers.JsonRpcProvider()

let privateKey = process.env.FAUCET
console.log(process.env)
console.log(privateKey)
let wallet = new ethers.Wallet(privateKey, provider)

let amountInEther =  ".05"

export async function getBal(address) {
  const balance = await provider.getBalance(address)
  console.log(`${address} has balance of ${balance}`)
  return balance
}

// Send some token to a given address
export async function sendToken(address) {
	console.log("Made it to sendToken")
	let tx = {
    	to: address,
    	value: ethers.utils.parseEther(amountInEther)
	}
	const txHash = await wallet.sendTransaction(tx)
	console.log(`Done waiting in send token, ${txHash.hash}`)
}

export default { sendToken, getBal }