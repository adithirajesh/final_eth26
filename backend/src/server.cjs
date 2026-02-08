const express = require('express');
const cors = require('cors');
const {ethers} = require('ethers');
const { JsonRpcProvider, Wallet, Contract, keccak256, toUtf8Bytes } = require('ethers');

require('dotenv').config();

// fail-fast logging for unexpected rejections/exceptions
process.on('uncaughtException', (err) => {
  console.error('uncaughtException', err);
  process.exit(1);
});
process.on('unhandledRejection', (err) => {
  console.error('unhandledRejection', err);
  process.exit(1);
});

const app = express();
app.use(cors());
app.use(express.json());

// configure contract
const CONTRACT_ADDRESS = '0x82Df22e78F38fdBa29dEB65E30DF3B36F5ba9836';
const CONTRACT_ABI = require('../../artifacts/contracts/HealthCredentials.sol/HealthCredentials.json').abi;

//
const provider = new ethers.JsonRpcProvider(
  'https://coston2-api.flare.network/ext/C/rpc',
  {
    name: 'coston2',  // label for your network
    chainId: 114        // Coston2 testnet chain ID
  }
);
const signer = new ethers.Wallet('c5ec29eb105ba2f79c7366862870ba5f2dce2a1391d9e768db05a42ee9c5ffc5', provider);
const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

//testing endpoint
app.get('/test', async (req, res) => {
    res.json({ status: 'Backend is working!' });
});

app.post('/submit', async(req,res) => {
    try{
        // removeable, for debug
        console.log("SUBMIT: ", req.body);
        const {address, data} = req.body;
        const hash1 = ethers.keccak256(ethers.toUtf8Bytes(JSON.stringify(data)));
        const hash2 = ethers.keccak256(
          ethers.toUtf8Bytes(JSON.stringify(data) + Date.now().toString())
        );

         const tx = await contract.submitCredential(hash2, hash1, "Test Hospital");
         await tx.wait();
    
    res.json({ success: true, tx: tx.hash });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/get/:address', async (req, res) => {
    try {
        const creds= await contract.getPatientCredentials(req.params.address);
        const credStr = creds.map(c =>c.toString());

        res.json({ count: credStr.length, credentials: credStr });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
app.post('/verify', async(req,res) => {
    try{
        const {patientAddress, index, verified} = req.body;
        console.log('Verifying credential for patient:', patientAddress, 'index:', index, 'verified:', verified);
        const tx = await contract.validateCredential(patientAddress, index, verified);
        const receipt = await tx.wait();

        res.json({success:true, tx: receipt.hash, message:`Credential ${verified ? 'approved' : 'rejected'}`,explorer: `https://coston2-explorer.flare.network/tx/${receipt.hash}`});

    } catch (error) {
        res.status(500).json({ error: error.message });
    }

});

app.listen(3001,()=>{
    console.log('✅ Simple backend running on http://localhost:3001');
  console.log('Test it: curl http://localhost:3001/test');
})
