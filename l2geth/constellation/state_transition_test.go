package constellation

import (
	"crypto/ecdsa"
	"crypto/rand"
	"math/big"
	"testing"

	"github.com/ethereum-optimism/optimism/l2geth/common"
	"github.com/ethereum-optimism/optimism/l2geth/common/hexutil"
	"github.com/ethereum-optimism/optimism/l2geth/core"
	"github.com/ethereum-optimism/optimism/l2geth/core/rawdb"
	"github.com/ethereum-optimism/optimism/l2geth/core/types"
	"github.com/ethereum-optimism/optimism/l2geth/core/vm"
	"github.com/ethereum-optimism/optimism/l2geth/crypto"
	"github.com/ethereum-optimism/optimism/l2geth/params"
	"github.com/ethereum-optimism/optimism/l2geth/rollup/dump"
	"github.com/ethereum-optimism/optimism/l2geth/rollup/rcfg"
	"github.com/ethereum-optimism/optimism/l2geth/tests"
)

func TestNewStateTransition(t *testing.T) {
	unsignedTx := types.NewTransaction(1, common.HexToAddress("0x00000000000000000000000000000000deadbeef"), new(big.Int), 5000000, big.NewInt(1), []byte{})

	privateKeyECDSA, err := ecdsa.GenerateKey(crypto.S256(), rand.Reader)
	if err != nil {
		t.Fatalf("err %v", err)
	}
	signer := types.NewEIP155Signer(big.NewInt(1))
	tx, err := types.SignTx(unsignedTx, signer, privateKeyECDSA)
	if err != nil {
		t.Fatalf("err %v", err)
	}
	/**
		This comes from one of the test-vectors on the Skinny Create2 - EIP
	    address 0x00000000000000000000000000000000deadbeef
	    salt 0x00000000000000000000000000000000000000000000000000000000cafebabe
	    init_code 0xdeadbeef
	    gas (assuming no mem expansion): 32006
	    result: 0x60f3f640a8508fC6a86d45DF051962668E1e8AC7
	*/
	origin, _ := signer.Sender(tx)
	context := vm.Context{
		CanTransfer: core.CanTransfer,
		Transfer:    core.Transfer,
		Origin:      origin,
		Coinbase:    common.Address{},
		BlockNumber: new(big.Int).SetUint64(8000000),
		Time:        new(big.Int).SetUint64(5),
		Difficulty:  big.NewInt(0x30000),
		GasLimit:    uint64(6000000),
		GasPrice:    big.NewInt(1),
	}
	alloc := core.GenesisAlloc{}

	// The code pushes 'deadbeef' into memory, then the other params, and calls CREATE2, then returns
	// the address
	alloc[common.HexToAddress("0x00000000000000000000000000000000deadbeef")] = core.GenesisAccount{
		Nonce:   1,
		Code:    hexutil.MustDecode("0x63deadbeef60005263cafebabe6004601c6000F560005260206000F3"),
		Balance: big.NewInt(1),
	}
	alloc[origin] = core.GenesisAccount{
		Nonce:   1,
		Code:    []byte{},
		Balance: big.NewInt(500000000000000),
	}
	statedb := tests.MakePreState(rawdb.NewMemoryDatabase(), alloc)

	// Enable OVM
	rcfg.UsingOVM = true

	evm := vm.NewEVM(context, statedb, params.MainnetChainConfig, vm.Config{})
	msg, err := tx.AsMessage(signer)
	if err != nil {
		t.Fatalf("failed to prepare transaction for tracing: %v", err)
	}

	// Set FPE as the fee token
	statedb.SetFPEAsFeeToken()
	priceRatio := big.NewInt(100)
	decimals := big.NewInt(0)
	statedb.SetFPEPriceRatio(priceRatio)
	statedb.SetPriceRatioDecimals(decimals)

	st := core.NewStateTransition(evm, msg, new(core.GasPool).AddGas(tx.Gas()))

	// Insufficient FPE token
	if _, _, _, err = st.TransitionDb(); err == nil {
		t.Fatalf("should not execute transaction")
	}

	// Add suffficient funds for the test account
	addFPEBalance := big.NewInt(500000000000000)
	statedb.AddFPEBalance(msg.From(), addFPEBalance)
	_, gasUsed, _, err := st.TransitionDb()
	if err != nil {
		t.Fatalf("failed to execute transaction: %v", err)
	}

	// Check the FPE balance
	userFPEBalance := statedb.GetFPEBalance(msg.From())
	vaultBalance := statedb.GetFPEBalance(dump.OvmFPEGasPriceOracle)

	if new(big.Int).Mul(big.NewInt(int64(gasUsed)), msg.GasPrice()).Cmp(vaultBalance) != 0 {
		t.Fatal("failed to calculate FPE fee")
	}

	if (new(big.Int).Sub(addFPEBalance, userFPEBalance)).Cmp(vaultBalance) != 0 {
		t.Fatal("failed to charge FPE fee")
	}

	// Add l1 security fee
	preUserFPEBalance := statedb.GetFPEBalance(msg.From())
	preVaultBalance := statedb.GetFPEBalance(dump.OvmFPEGasPriceOracle)

	statedb.SetState(rcfg.L2GasPriceOracleAddress, rcfg.L1GasPriceSlot, common.BigToHash(common.Big1))
	statedb.SetState(rcfg.L2GasPriceOracleAddress, rcfg.OverheadSlot, common.BigToHash(big.NewInt(2750)))
	statedb.SetState(rcfg.L2GasPriceOracleAddress, rcfg.ScalarSlot, common.BigToHash(big.NewInt(1)))
	statedb.SetState(rcfg.L2GasPriceOracleAddress, rcfg.L2GasPriceSlot, common.BigToHash(big.NewInt(1)))
	statedb.SetFPEPriceRatio(big.NewInt(2000))
	statedb.SetPriceRatioDecimals(big.NewInt(3))
	effectivePriceRatio := big.NewInt(2)

	unsignedTx = types.NewTransaction(2, common.HexToAddress("0x00000000000000000000000000000000deadbeef"), new(big.Int), 5000000, big.NewInt(1), []byte{})
	tx, err = types.SignTx(unsignedTx, signer, privateKeyECDSA)
	if err != nil {
		t.Fatalf("err %v", err)
	}
	msg, err = tx.AsMessage(signer)
	if err != nil {
		t.Fatalf("failed to prepare transaction for tracing: %v", err)
	}
	st = core.NewStateTransition(evm, msg, new(core.GasPool).AddGas(tx.Gas()))

	_, gasUsed, _, err = st.TransitionDb()
	if err != nil {
		t.Fatalf("failed to execute transaction: %v", err)
	}
	afterUserFPEBalance := statedb.GetFPEBalance(msg.From())
	afterVaultBalance := statedb.GetFPEBalance(dump.OvmFPEGasPriceOracle)

	userPaidFPEFee := new(big.Int).Sub(preUserFPEBalance, afterUserFPEBalance)
	vaultReceivedFee := new(big.Int).Sub(afterVaultBalance, preVaultBalance)

	if userPaidFPEFee.Cmp(vaultReceivedFee) != 0 {
		t.Fatal("failed to charge FPE fee")
	}

	estimatedCost := new(big.Int).Mul(big.NewInt(int64(gasUsed)), common.Big1)
	estimatedCost = new(big.Int).Add(estimatedCost, new(big.Int).Mul(big.NewInt(4126), effectivePriceRatio))
	if userPaidFPEFee.Cmp(estimatedCost) != 0 {
		t.Log(estimatedCost, userPaidFPEFee)
		t.Fatal("failed to charge l1 security fee")
	}

	if gasUsed > 5000000 {
		t.Fatal("tx.GasUsed() > tx.GasLimit()")
	}

	// Insufficient gas limit
	unsignedTx = types.NewTransaction(1, common.HexToAddress("0x00000000000000000000000000000000deadbeef"), new(big.Int), 20000, big.NewInt(1), []byte{})
	tx, err = types.SignTx(unsignedTx, signer, privateKeyECDSA)
	if err != nil {
		t.Fatalf("err %v", err)
	}

	// Set FPE as the fee token
	preUserFPEBalance = statedb.GetFPEBalance(msg.From())
	preVaultBalance = statedb.GetFPEBalance(dump.OvmFPEGasPriceOracle)

	st = core.NewStateTransition(evm, msg, new(core.GasPool).AddGas(tx.Gas()))
	_, _, _, err = st.TransitionDb()
	if err == nil {
		t.Fatalf("should not execute transaction")
	}

	afterUserFPEBalance = statedb.GetFPEBalance(msg.From())
	afterVaultBalance = statedb.GetFPEBalance(dump.OvmFPEGasPriceOracle)

	if preUserFPEBalance.Cmp(afterUserFPEBalance) != 0 {
		t.Fatal("should not charge fee")
	}
	if afterVaultBalance.Cmp(preVaultBalance) != 0 {
		t.Fatal("should not charge fee")
	}
}
