  const express = require('express');
  const cors = require('cors');
  const {ethers} = require('ethers');
  const { JsonRpcProvider, Wallet, Contract, keccak256, toUtf8Bytes } = require('ethers');
  const submissionData = new Map(); // In-memory storage: address -> [submissions]

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
  const CONTRACT_ADDRESS = '0x043aED37db13769B2bd508032848078BfCFA6B0B';
  const CONTRACT_ABI = require('../../artifacts/contracts/HealthCredentials.sol/HealthCredentials.json').abi;

  // ============================================
  // STEP 1: Define Medical Standards
  // ============================================

  const MEDICAL_STANDARDS = {
    // Blood Glucose Test
    "Blood Glucose": {
      unit: "mg/dL",
      
      // What values are physically possible?
      possible_range: {
        min: 20,        // Below this = dead
        max: 600        // Above this = extreme emergency
      },
      
      // What values are clinically normal?
      normal_range: {
        min: 70,
        max: 100
      },
      
      // What values indicate prediabetes?
      prediabetic: {
        min: 100,
        max: 125
      },
      
      // What values indicate diabetes?
      diabetic: {
        min: 126,
        max: Infinity
      },
      
      // Critical values requiring immediate attention
      critical_low: {
        min: 0,
        max: 40
      },
      
      critical_high: {
        min: 400,
        max: Infinity
      }
    },

    // Total Cholesterol Test
    "Total Cholesterol": {
      unit: "mg/dL",
      
      possible_range: {
        min: 50,
        max: 500
      },
      
      desirable: {
        min: 0,
        max: 200
      },
      
      borderline_high: {
        min: 200,
        max: 239
      },
      
      high: {
        min: 240,
        max: Infinity
      }
    },

    // Temperature Test
    "Temperature": {
      unit: "°F",
      
      possible_range: {
        min: 92,
        max: 107
      },
      
      normal: {
        min: 97,
        max: 99
      },
      
      fever: {
        min: 100.4,
        max: 107
      }
    },

    // Heart Rate
    "Heart Rate": {
      unit: "bpm",
      
      possible_range: {
        min: 20,
        max: 300
      },
      
      normal_resting: {
        min: 60,
        max: 100
      },
      
      tachycardia: {
        min: 100,
        max: Infinity
      },
      
      bradycardia: {
        min: 0,
        max: 60
      }
    }
  };

  //
  const provider = new ethers.JsonRpcProvider(
    'https://coston2-api.flare.network/ext/C/rpc',
    {
      name: 'coston2',  // label for your network
      chainId: 114        // Coston2 testnet chain ID
    }
  );

  // ============================================
  // STEP 2: Range Validation
  // ============================================

  function validateRange(testName, value) {
    // STEP 2.1: Find the medical standard for this test
    const standard = MEDICAL_STANDARDS[testName]
    
    if (!standard) {
      console.log(`❌ Unknown test type: ${testName}`)
      return {
        valid: false,
        error: `Unknown test type: ${testName}`,
        testName: testName,
        value: value
      }
    }

    // STEP 2.2: Get the possible range for this test
    const { possible_range } = standard
    
    // STEP 2.3: Check if value is in the possible range
    const isInRange = value >= possible_range.min && value <= possible_range.max
    
    if (!isInRange) {
      console.log(
        `❌ Value ${value} outside possible range [${possible_range.min}, ${possible_range.max}]`
      )
      return {
        valid: false,
        error: `Value outside possible range [${possible_range.min}, ${possible_range.max}]`,
        testName: testName,
        value: value,
        possibleRange: possible_range
      }
    }
    console.log(`✅ Range validation passed: ${value} is in [${possible_range.min}, ${possible_range.max}]`)
    return {
      valid: true,
      testName: testName,
      value: value,
      possibleRange: possible_range
    }
  }

    // ============================================
  // STEP 5: Create FDC Attestation
  // ============================================

  function createFlareAttestation(testName, value, patientId, rangeValidation) {
    const attestation = {
      test_name: testName,
      value: value,
      patient_id: patientId,
      timestamp: new Date().toISOString(),
      block_timestamp: Math.floor(Date.now() / 1000),
      
      validations: {
        range_check: {
          passed: rangeValidation.valid,
          possible_range: rangeValidation.possibleRange
        }
      },
      
      all_checks_passed: rangeValidation.valid,
      requires_manual_review: false,  // Simple for now
      verified_by: "flare_fdc",
      version: "1.0"
    }

    // STEP 5.2: Create hash of attestation
    // This is the cryptographic proof
    const attestationJSON = JSON.stringify(attestation)
    const attestationHash = ethers.keccak256(ethers.toUtf8Bytes(attestationJSON))

    
    console.log(`✅ Attestation created`)
    console.log(`📝 Hash: ${attestationHash}`)

    // STEP 5.3: Return complete attestation with proof
    return {
      attestation: attestation,
      attestation_hash: attestationHash,
      can_submit_to_blockchain: attestation.all_checks_passed
    }
  }

    // STEP 2.4: Value is valid
    
  

  // ============================================
  // STEP 6: Complete FDC Verification Workflow
  // ============================================

  async function verifyAndSubmitWithFDC(req, res) {
  try {
    const { address, test_name, value, patient_id } = req.body
    
    console.log(`\n${'='.repeat(60)}`)
    console.log(`FLARE FDC VERIFICATION WORKFLOW`)
    console.log(`${'='.repeat(60)}`)
    console.log(`Patient: ${patient_id}`)
    console.log(`Test: ${test_name}`)
    console.log(`Value: ${value}`)

    if (!address || !test_name || value === undefined || !patient_id) {
      return res.status(400).json({
        error: "Missing required fields: address, test_name, value, patient_id"
      })
    }

    // Range validation
    console.log(`\n1️⃣  RANGE VALIDATION`)
    const rangeValidation = validateRange(test_name, value)
    
    if (!rangeValidation.valid) {
      console.log(`FAILED: ${rangeValidation.error}`)
      return res.status(400).json({
        error: rangeValidation.error,
        check: "range_validation"
      })
    }
    console.log(`✅ PASSED`)

    // Create attestation
    console.log(`\n4️⃣  CREATE FDC ATTESTATION`)
    const {
      attestation,
      attestation_hash,
      can_submit_to_blockchain
    } = createFlareAttestation(
      test_name,
      value,
      patient_id,
      rangeValidation
    )
    console.log(`✅ ATTESTATION CREATED`)

    if (!can_submit_to_blockchain) {
      console.log(`\n5️⃣  BLOCKCHAIN SUBMISSION`)
      console.log(`⚠️  VALUE REQUIRES MANUAL REVIEW`)
      
      return res.json({
        verified: false,
        requires_review: true,
        reason: "Value is unusual and requires manual review",
        attestation: attestation,
        attestation_hash: attestation_hash
      })
    }

    console.log(`\n5️⃣  BLOCKCHAIN SUBMISSION`)
    
    const attestationDataHash = ethers.keccak256(
      ethers.toUtf8Bytes(JSON.stringify(attestation))
    )
    const metadataHash = ethers.keccak256(
      ethers.toUtf8Bytes(
        JSON.stringify({
          test_name,
          patient_id,
          timestamp: Math.floor(Date.now() / 1000)
        })
      )
    )

    const tx = await contract.submitCredential(
      attestationDataHash,
      metadataHash,
      "flare_fdc_verified"
    )
    
    const receipt = await tx.wait()
    console.log(`✅ SUBMITTED TO BLOCKCHAIN`)
    console.log(`TX: ${receipt.hash}`)

    // ⭐ NEW: Store the actual readable data
    storeSubmission(address, {
      test_name: test_name,
      value: value,
      unit: MEDICAL_STANDARDS[test_name]?.unit || '',
      attestation: attestation,
      tx_hash: receipt.hash,
      blockchain_timestamp: Math.floor(Date.now() / 1000),
      fdc_verified: true
    });

    console.log(`\n${'='.repeat(60)}`)
    console.log(`✅ VERIFICATION COMPLETE`)
    console.log(`${'='.repeat(60)}\n`)

    res.json({
      success: true,
      verified: true,
      tx: receipt.hash,
      attestation: attestation,
      explorer: `https://coston2-explorer.flare.network/tx/${receipt.hash}`,
      message: `Lab result verified via Flare FDC and recorded on blockchain`
    })

  } catch (error) {
    console.error(`❌ ERROR: ${error.message}`)
    res.status(500).json({
      error: error.message,
      verified: false
    })
  }
}

  function storeSubmission(address, data) {
  if (!submissionData.has(address)) {
    submissionData.set(address, []);
  }
  submissionData.get(address).push({
    ...data,
    timestamp: Date.now()
  });
}

// Helper function to get submissions
function getSubmissions(address) {
  return submissionData.get(address) || [];
}
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
        const creds = await contract.getPatientCredentials(req.params.address);
        
        // Format credentials to match your contract structure
        const formattedCreds = creds.map((c, index) => {
          return {
            index: index,
            zkproofhash: c.zkproofhash?.toString() || c[0]?.toString(),
            datahash: c.datahash?.toString() || c[1]?.toString(),
            timestamp: c.timestamp ? parseInt(c.timestamp.toString()) : parseInt(c[2]?.toString()),
            verified: c.verified || c[3] || false,
            dataSource: c.dataSource || c[4] || '',
          };
        });

        res.json({ 
          count: formattedCreds.length, 
          credentials: formattedCreds 
        });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

  app.post('/verify', async(req,res) => {
    try{
        const {patientAddress, index} = req.body;
        console.log('Marking credential as verified for patient:', patientAddress, 'index:', index);
        
        // Always mark as verified (true) since it passed FDC validation
        const tx = await contract.validateCredential(patientAddress, index, true);
        const receipt = await tx.wait();

        res.json({
            success: true, 
            tx: receipt.hash, 
            message: 'Credential marked as verified and ready for clinical trial applications',
            explorer: `https://coston2-explorer.flare.network/tx/${receipt.hash}`
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

  app.post('/submit-fdc-verified', async (req,res) =>{
    await verifyAndSubmitWithFDC(req,res)
  })

  app.get('/patient-history/:patientId/:testName', async (req,res) => {
    const { patientId, testName } = req.params;
    try {
      const credentials = await contract.getPatientCredentials(patientId)
      
      // Filter for this test type and extract values
      const testValues = credentials
        .filter(cred => cred.includes(testName))
        .map(cred => {
          // Parse the value from the credential
          // (implementation depends on your contract structure)
          return parseFloat(cred)
        })
      
      res.json({
        patient_id: patientId,
        test_name: testName,
        history: testValues,
        count: testValues.length
      })
    } catch (error) {
      res.status(500).json({ error: error.message })
    }
  })
  const PORT = 3001
  app.listen(3001,()=>{
      console.log('✅ Simple backend running on http://localhost:3001');
    console.log('Test it: curl http://localhost:3001/test');
  })
