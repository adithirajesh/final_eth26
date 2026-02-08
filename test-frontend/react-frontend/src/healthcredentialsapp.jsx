import React, { useState, useEffect, useCallback } from 'react';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import { 
  Shield, Plus, CheckCircle, AlertCircle, Loader, Copy, 
  LogOut, Menu, X, Check, Wallet, Upload, FileText, Trash2, ChevronDown
} from 'lucide-react';
import './HealthCredentials.css';

// Setup PDF.js worker
GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

const BACKEND_URL = 'http://localhost:3001';
const OPENAI_API_KEY = process.env.REACT_APP_OPENAI_API_KEY;

export default function HealthCredentialsApp() {
  // UI State
  const [theme, setTheme] = useState('dark');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState('submit');
  const [copied, setCopied] = useState(null);
  const [expandedExtracted, setExpandedExtracted] = useState(null);

  // Wallet State
  const [walletAddress, setWalletAddress] = useState(null);
  const [walletConnecting, setWalletConnecting] = useState(false);
  const [walletError, setWalletError] = useState('');
  const [metamaskInstalled, setMetamaskInstalled] = useState(false);

  // Form State
  const [age, setAge] = useState('');
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState([]);
  
  // AI Extraction State
  const [extracting, setExtracting] = useState(false);
  const [extractionError, setExtractionError] = useState('');

  // Submit State
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');

  // Data State
  const [credentials, setCredentials] = useState([]);
  const [credentialsLoading, setCredentialsLoading] = useState(false);
  const [selectedCredential, setSelectedCredential] = useState(null);
  const [backendHealth, setBackendHealth] = useState(null);

  // Clinical Trials State
  const [clinicalTrials, setClinicalTrials] = useState([]);
  const [trialsLoading, setTrialsLoading] = useState(false);

  const applyToTrial = async (trialId) => {
  try {
    showMessage(`✅ Applied to trial #${trialId}`);
    // Optionally call your backend API:
    // await fetch(`${BACKEND_URL}/apply-trial`, { method: 'POST', body: JSON.stringify({ address: walletAddress, trialId }) });
  } catch (error) {
    showMessage(`❌ Failed to apply: ${error.message}`, 'error');
  }
};

  // Apply theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Load credentials with useCallback to avoid dependency issues
  const [submissionData, setSubmissionData] = useState([]);

const loadCredentials = useCallback(async (address) => {
  if (!address) return;

  try {
    setCredentialsLoading(true);
    
    // Load blockchain hashes (for verification)
    const resBlockchain = await fetch(`${BACKEND_URL}/get/${address}`);
    if (!resBlockchain.ok) {
      const error = await resBlockchain.json();
      throw new Error(error.error || 'Failed to fetch credentials');
    }
    const blockchainData = await resBlockchain.json();
    setCredentials(blockchainData.credentials || []);

    // ⭐ NEW: Load readable submission data
    const resSubmissions = await fetch(`${BACKEND_URL}/get/${address}`);
    if (resSubmissions.ok) {
      const submissionsData = await resSubmissions.json();
      setSubmissionData(submissionsData.submissions || []);
    }

    setSelectedCredential(null);
    if (blockchainData.count > 0) {
      showMessage(`✅ Loaded ${blockchainData.count} credential(s)`);
    }
  } catch (error) {
    console.error('Error loading credentials:', error);
    setCredentials([]);
    setSubmissionData([]);
  } finally {
    setCredentialsLoading(false);
  }
}, []);

const verifyCredential = async (index, verified) => {
  try {
    setLoading(true);
    const res = await fetch(`${BACKEND_URL}/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        patientAddress: walletAddress,
        index,
        verified,
      }),
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.error || 'Verification failed');
    }

    const data = await res.json();
    showMessage(`✅ ${data.message}`);
    await loadCredentials(walletAddress);
  } catch (error) {
    showMessage(`❌ ${error.message}`, 'error');
  } finally {
    setLoading(false);
  }
};

function renderClinicalTrials() {
  return (
    <section className="content-section">
      <div className="section-card">
        <div className="card-header">
          <h2>Available Clinical Trials</h2>
          <p className="card-subtitle">Explore trials you can participate in</p>
        </div>

        {trialsLoading ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <Loader size={32} className="spin" />
            <p style={{ marginTop: '1rem', color: 'var(--text-muted)' }}>Loading trials...</p>
          </div>
        ) : clinicalTrials.length > 0 ? (
          <div className="trials-list">
            {clinicalTrials.map((trial) => (
              <div key={trial.id} className="trial-card">
                <div className="trial-header">
                  <h4>{trial.name}</h4>
                  <span>{trial.phase}</span>
                </div>
                <p>{trial.description}</p>
                <p><strong>Location:</strong> {trial.location}</p>
                <button 
                  className="btn btn-primary"
                  onClick={() => applyToTrial(trial.id)}
                >
                  Apply
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <AlertCircle size={48} />
            <h3>No Clinical Trials Found</h3>
            <p>Check back later or refresh</p>
          </div>
        )}
      </div>
    </section>
  );
}
  const loadClinicalTrials = async () => {
  try {
    setTrialsLoading(true);
    // Example: Fetch from backend API if you have one
    // const res = await fetch(`${BACKEND_URL}/clinical-trials`);
    // const data = await res.json();

    // For now, hardcoded sample trials
    const data = [
      { id: 1, name: 'COVID Vaccine Study', location: 'London, UK', phase: 'Phase 3', description: 'Testing efficacy of new vaccine' },
      { id: 2, name: 'Diabetes Drug Trial', location: 'Manchester, UK', phase: 'Phase 2', description: 'Testing new insulin delivery system' },
      { id: 3, name: 'Eye Health Study', location: 'Cambridge, UK', phase: 'Phase 1', description: 'Investigating treatments for myopia' },
    ];

    setClinicalTrials(data);
  } catch (error) {
    console.error('Error loading trials:', error);
    showMessage('Failed to load clinical trials', 'error');
  } finally {
    setTrialsLoading(false);
  }
};
useEffect(() => {
  if (activeTab === 'trials') {
    loadClinicalTrials();
  }
}, [activeTab]);


  // Check MetaMask on mount
  useEffect(() => {
    const checkMetaMask = () => {
      if (typeof window !== 'undefined' && window.ethereum) {
        setMetamaskInstalled(true);
        window.ethereum.request({ method: 'eth_accounts' })
          .then(accounts => {
            if (accounts.length > 0) {
              setWalletAddress(accounts[0]);
              loadCredentials(accounts[0]);
            }
          })
          .catch(error => console.error('Error checking accounts:', error));
      } else {
        setMetamaskInstalled(false);
      }
    };

    setTimeout(checkMetaMask, 100);
  }, [loadCredentials]);

  const showMessage = (text, type = 'success') => {
    setMessage(text);
    setMessageType(type);
    setTimeout(() => setMessage(''), 4000);
  };

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  // METAMASK CONNECTION
  const connectMetaMask = async () => {
    if (!window.ethereum) {
      setWalletError('MetaMask is not installed. Please install it first.');
      showMessage('❌ MetaMask not found', 'error');
      return;
    }

    try {
      setWalletConnecting(true);
      setWalletError('');

      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      });

      if (accounts && accounts.length > 0) {
        const address = accounts[0];
        setWalletAddress(address);
        setWalletError('');
        showMessage(`✅ Connected: ${address.slice(0, 6)}...${address.slice(-4)}`);

        setTimeout(() => loadCredentials(address), 500);
      }
    } catch (error) {
      console.error('MetaMask error:', error);

      let errorMsg = 'Failed to connect MetaMask';

      if (error.code === 4001) {
        errorMsg = 'You rejected the connection request.';
      } else if (error.code === -32002) {
        errorMsg = 'MetaMask connection request already pending. Check your MetaMask popup.';
      } else if (error.message) {
        errorMsg = error.message;
      }

      setWalletError(errorMsg);
      showMessage(`❌ ${errorMsg}`, 'error');
    } finally {
      setWalletConnecting(false);
    }
  };

  const disconnectWallet = () => {
    setWalletAddress(null);
    setCredentials([]);
    setAge('');
    setWeight('');
    setHeight('');
    setUploadedFiles([]);
    setWalletError('');
    showMessage('✅ Wallet disconnected');
  };

  const testBackend = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${BACKEND_URL}/test`);
      if (!res.ok) throw new Error('Backend not responding');
      const testData = await res.json();
      setBackendHealth('connected');
      showMessage('✅ Backend is running');
    } catch (error) {
      setBackendHealth('disconnected');
      showMessage('❌ Backend connection failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  // PDF TO BASE64 CONVERSION
  const convertPdfToBase64 = async (file) => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const loadingTask = getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;
      const page = await pdf.getPage(1);
      const viewport = page.getViewport({ scale: 1.5 });
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      await page.render({ canvasContext: context, viewport: viewport }).promise;
      return canvas.toDataURL('image/png');
    } catch (e) {
      console.error("PDF Processing Error:", e);
      throw new Error("Could not process PDF. Try a JPG/PNG instead.");
    }
  };

  // EXTRACT DATA FROM PDF USING OPENAI
  const extractDataFromPdf = async (file) => {
    if (!OPENAI_API_KEY) {
      setExtractionError('Missing OpenAI API key. Add REACT_APP_OPENAI_API_KEY to .env');
      showMessage('❌ OpenAI API key not configured', 'error');
      return null;
    }

    try {
      setExtracting(true);
      setExtractionError('');

      // Convert PDF to base64 image
      let base64Image = '';
      if (file.type === 'application/pdf') {
        base64Image = await convertPdfToBase64(file);
      } else if (file.type.startsWith('image/')) {
        base64Image = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
        });
      } else {
        throw new Error('Only PDFs and images supported');
      }

      // Call OpenAI API
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: `Extract medical information from this document. Return ONLY valid JSON with these fields (include all that are found):
{
  "document_type": "eye_checkup|health_checkup|lab_test|vaccination|other",
  "date": "YYYY-MM-DD or null",
  "patient_name": "name or null",
  "findings": "key findings or diagnosis",
  "measurements": {
    "blood_pressure": "sys/dia or null",
    "blood_oxygen": "percentage or null",
    "temperature": "celsius or null",
    "blood_sugar": "mg/dL or null"
  },
  "vision": {
    "left_eye": "power or null",
    "right_eye": "power or null",
    "color_blind": "yes/no or null"
  },
  "tests": ["test1", "test2"],
  "prescriptions": ["med1", "med2"],
  "notes": "any other important info"
}

Return ONLY the JSON, no other text.`
                },
                {
                  type: "image_url",
                  image_url: { url: base64Image }
                }
              ]
            }
          ],
          max_tokens: 800
        })
      });

      const responseData = await response.json();

      if (responseData.error) {
        throw new Error(responseData.error.message || 'OpenAI API error');
      }

      let jsonText = responseData.choices[0].message.content;
      jsonText = jsonText.replace(/```json/g, '').replace(/```/g, '').trim();

      const extracted = JSON.parse(jsonText);
      return extracted;
    } catch (error) {
      console.error('Extraction error:', error);
      setExtractionError(error.message);
      showMessage(`❌ ${error.message}`, 'error');
      return null;
    } finally {
      setExtracting(false);
    }
  };

  // HANDLE FILE UPLOAD
  const handleFileUpload = async (e) => {
  const files = Array.from(e.target.files);
  console.log('📁 Files selected:', files.length);
  
  for (const file of files) {
    console.log('📄 Processing file:', file.name, 'Type:', file.type);
    const extracted = await extractDataFromPdf(file);
    
    console.log('📊 Extraction result:', extracted);
    
    if (extracted) {
      setUploadedFiles(prev => [...prev, {
        name: file.name,
        data: extracted,
        id: Date.now() + Math.random()
      }]);
      showMessage(`✅ Extracted data from ${file.name}`);
    } else {
      console.log('❌ No data extracted from', file.name);
    }
  }

  // Reset input
  e.target.value = '';
};

  // MERGE ALL DATA AND SUBMIT
  const submitAllData = async () => {
  // Validate basic info
  if (!age || !weight || !height) {
    showMessage('Please fill in age, weight, and height', 'error');
    return;
  }

  try {
    setLoading(true);
    
    // ⭐ TEMPORARY: Hardcode a test submission to verify the flow works
    console.log('🧪 Testing with hardcoded blood glucose value...');
    
    const res = await fetch(`${BACKEND_URL}/submit-fdc-verified`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        address: walletAddress,
        test_name: "Blood Glucose",
        value: 95,  // Hardcoded test value
        patient_id: walletAddress
      }),
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.error || 'Validation failed');
    }

    const result = await res.json();
    console.log('✅ FDC submission result:', result);
    showMessage(`✅ Test submission successful!`);

    // Reload credentials
    setTimeout(() => loadCredentials(walletAddress), 1500);
  } catch (error) {
    console.error('❌ Error:', error);
    showMessage(`❌ ${error.message}`, 'error');
  } finally {
    setLoading(false);
  }
  }
  // ===== LOGIN SCREEN =====
  if (!walletAddress) {
    return (
      <div className="app-container">
        <div className="login-screen">
          <div className="login-card">
            <div className="login-header">
              <Shield size={64} className="login-icon" />
              <h1>HealthChain</h1>
              <p>Secure Health Credentials on Blockchain</p>
            </div>

            {!metamaskInstalled && (
              <div className="alert alert-error">
                <AlertCircle size={20} />
                <span>
                  MetaMask is not installed. <a href="https://metamask.io" target="_blank" rel="noopener noreferrer">Install it here</a>
                </span>
              </div>
            )}

            {walletError && metamaskInstalled && (
              <div className="alert alert-error">
                <AlertCircle size={20} />
                <span>{walletError}</span>
              </div>
            )}

            <button 
              onClick={connectMetaMask}
              disabled={walletConnecting || !metamaskInstalled}
              className="btn btn-primary btn-lg login-btn"
            >
              {walletConnecting ? (
                <>
                  <Loader size={20} className="spin" />
                  Connecting...
                </>
              ) : !metamaskInstalled ? (
                <>
                  <Wallet size={20} />
                  Install MetaMask
                </>
              ) : (
                <>
                  <Wallet size={20} />
                  Connect MetaMask Wallet
                </>
              )}
            </button>

            {!metamaskInstalled && (
              <p className="login-help">
                <a href="https://metamask.io" target="_blank" rel="noopener noreferrer">
                  Download MetaMask →
                </a>
              </p>
            )}

            <div className="login-footer">
              <button 
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="theme-toggle"
                title="Toggle theme"
              >
                {theme === 'dark' ? '☀️' : '🌙'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ===== MAIN APP =====
  return (
    <div className="app-container">
      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <div className="logo">
            <Shield className="logo-icon" size={28} />
            <span className="logo-text">HealthChain</span>
          </div>
          <button className="sidebar-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        <nav className="sidebar-nav">
          <NavItem 
            icon={<Plus size={20} />} 
            label="Submit" 
            active={activeTab === 'submit'}
            onClick={() => setActiveTab('submit')}
          />
          <NavItem 
            icon={<CheckCircle size={20} />} 
            label="My Records" 
            active={activeTab === 'records'}
            onClick={() => setActiveTab('records')}
          />
          <NavItem 
            icon={<AlertCircle size={20} />} 
            label="Verify" 
            active={activeTab === 'verify'}
            onClick={() => setActiveTab('verify')}
          />
          <NavItem 
  icon={<FileText size={20} />} 
  label="Clinical Trials" 
  active={activeTab === 'trials'}
  onClick={() => setActiveTab('trials')}
/>
        </nav>

        <div className="sidebar-footer">
          <button className="connection-btn" onClick={testBackend} disabled={loading}>
            <span className={`status-dot ${backendHealth}`}></span>
            {backendHealth ? 'Backend OK' : 'Test'}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        {/* Header */}
        <header className="content-header">
          <div>
            <h1>Your Health Credentials</h1>
            <p className="subtitle">Secure, blockchain-verified medical records</p>
          </div>
          <div className="header-actions">
            <div className="wallet-display">
              <Wallet size={16} />
              <span className="wallet-address" title={walletAddress}>
                {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
              </span>
              <button 
                onClick={() => copyToClipboard(walletAddress, 'wallet')}
                className="copy-btn"
              >
                {copied === 'wallet' ? <Check size={14} /> : <Copy size={14} />}
              </button>
            </div>
            <button 
              className="theme-toggle"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              title="Toggle theme"
            >
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
            <button 
              className="btn btn-danger"
              onClick={disconnectWallet}
              title="Disconnect Wallet"
            >
              <LogOut size={16} />
              Disconnect
            </button>
          </div>
        </header>

        {/* Alert */}
        {message && (
          <div className={`alert alert-${messageType}`}>
            <div className="alert-content">
              {messageType === 'success' ? (
                <CheckCircle size={20} />
              ) : (
                <AlertCircle size={20} />
              )}
              <span>{message}</span>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="content-wrapper">
  {activeTab === 'submit' && renderSubmit()}
  {activeTab === 'records' && renderRecords()}
  {activeTab === 'verify' && renderVerify()}
  {activeTab === 'trials' && renderClinicalTrials()} {/* New tab */}
</div>
      </main>
    </div>
  );

  // ===== RENDER SUBMIT =====
  function renderSubmit() {
    return (
      <section className="content-section">
        <div className="section-card">
          <div className="card-header">
            <h2>Submit Your Health Information</h2>
            <p className="card-subtitle">Enter basic info and upload your medical documents</p>
          </div>

          <form className="form" onSubmit={(e) => { e.preventDefault(); submitAllData(); }}>
            {/* Basic Info */}
            <div className="form-group">
              <label>Age</label>
              <input
                type="number"
                placeholder="e.g., 25"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                className="form-input"
                min="1"
                max="150"
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Weight (kg)</label>
                <input
                  type="number"
                  placeholder="e.g., 70"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  className="form-input"
                  step="0.1"
                  min="0"
                />
              </div>
              <div className="form-group">
                <label>Height (cm)</label>
                <input
                  type="number"
                  placeholder="e.g., 180"
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                  className="form-input"
                  step="0.1"
                  min="0"
                />
              </div>
            </div>

            {/* File Upload */}
            <div className="form-group">
              <label>Medical Documents (PDF or Image)</label>
              <div className="file-upload-area">
                <input
                  type="file"
                  multiple
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={handleFileUpload}
                  disabled={extracting}
                  className="file-input"
                  id="file-input"
                />
                <label htmlFor="file-input" className="file-upload-label">
                  {extracting ? (
                    <>
                      <Loader size={32} className="spin" />
                      <span>Processing documents...</span>
                    </>
                  ) : (
                    <>
                      <Upload size={32} />
                      <span>Upload eye checkup, health checkup PDFs</span>
                      <small>or drag and drop</small>
                    </>
                  )}
                </label>
              </div>
              <small>Supported: PDF, JPG, PNG. We'll automatically extract the data.</small>
            </div>

            {/* Uploaded Files List */}
            {uploadedFiles.length > 0 && (
              <div className="uploaded-files">
                <h4>Uploaded Documents ({uploadedFiles.length})</h4>
                <div className="files-list">
                  {uploadedFiles.map((file) => (
                    <div key={file.id} className="file-item">
                      <FileText size={18} />
                      <div className="file-info">
                        <span className="file-name">{file.name}</span>
                        <span className="file-status">✅ Data extracted</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setUploadedFiles(uploadedFiles.filter(f => f.id !== file.id))}
                        className="file-delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Display Extracted Data */}
                <div className="extracted-data-section">
                  <h4>📋 Extracted Medical Data</h4>
                  <div className="extracted-data-container">
                    {uploadedFiles.map((file) => (
                      <div key={file.id} className="extracted-data-item">
                        <button
                          className="extracted-data-header"
                          onClick={() => setExpandedExtracted(expandedExtracted === file.id ? null : file.id)}
                        >
                          <span>{file.name}</span>
                          <ChevronDown 
                            size={18} 
                            style={{ transform: expandedExtracted === file.id ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
                          />
                        </button>
                        {expandedExtracted === file.id && (
                          <div className="extracted-data-content">
                            <pre>{JSON.stringify(file.data, null, 2)}</pre>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {extractionError && (
              <div className="alert alert-error">
                <AlertCircle size={20} />
                <span>{extractionError}</span>
              </div>
            )}

            <button 
              type="submit" 
              className="btn btn-primary btn-lg"
              disabled={loading || extracting || (!age || !weight || !height)}
            >
              {loading ? (
                <>
                  <Loader size={18} className="spin" />
                  Submitting to Blockchain...
                </>
              ) : (
                <>
                  <Plus size={18} />
                  Submit All Information
                </>
              )}
            </button>
          </form>

          <div className="form-help">
            <h4>📋 What we extract:</h4>
            <ul>
              <li>✅ Document type (eye checkup, health checkup, etc.)</li>
              <li>✅ Date of examination</li>
              <li>✅ Key findings and measurements</li>
              <li>✅ Vision/Blood pressure/Temperature data</li>
              <li>✅ Any prescriptions or tests</li>
            </ul>
          </div>
        </div>
      </section>
    );
  }

  // ===== RENDER RECORDS =====
  function renderRecords() {
  return (
    <section className="content-section">
      <div className="section-card">
        <div className="card-header">
          <h2>Your Health Records</h2>
          <p className="card-subtitle">FDC-verified medical data</p>
        </div>

        {credentialsLoading ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <Loader size={32} className="spin" style={{ margin: '0 auto', color: 'var(--primary)' }} />
            <p style={{ marginTop: '1rem', color: 'var(--text-muted)' }}>Loading records...</p>
          </div>
        ) : submissionData.length > 0 ? (
          <div className="credentials-grid">
            <div className="grid-info">
              <h3>📋 {submissionData.length} FDC-Verified Record(s)</h3>
            </div>

            <div className="credentials-list">
              {submissionData.map((submission, index) => (
                <div
                  key={index}
                  className={`credential-card ${selectedCredential === index ? 'selected' : ''}`}
                  onClick={() => setSelectedCredential(selectedCredential === index ? null : index)}
                >
                  <div className="credential-header">
                    <div className="credential-number">#{index + 1}</div>
                    <span className="credential-badge">
                      {submission.fdc_verified ? '✅ FDC Verified' : '📄 Submitted'}
                    </span>
                    <span className="credential-time">
                      {new Date(submission.timestamp || submission.blockchain_timestamp * 1000).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="credential-summary">
                    <div className="summary-item">
                      <strong>{submission.test_name}:</strong> 
                      <span style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--primary)', marginLeft: '10px' }}>
                        {submission.value} {submission.unit}
                      </span>
                    </div>
                  </div>

                  {selectedCredential === index && (
                    <div className="credential-details">
                      <div className="detail-row">
                        <span className="detail-label">Test Name:</span>
                        <span className="detail-value">{submission.test_name}</span>
                      </div>
                      <div className="detail-row">
                        <span className="detail-label">Result:</span>
                        <span className="detail-value" style={{ fontSize: '18px', fontWeight: 'bold' }}>
                          {submission.value} {submission.unit}
                        </span>
                      </div>
                      <div className="detail-row">
                        <span className="detail-label">FDC Validation:</span>
                        <span className="detail-value">
                          {submission.attestation?.validations?.range_check?.passed ? 
                            '✅ Passed Range Check' : 
                            '❌ Failed Validation'
                          }
                        </span>
                      </div>
                      <div className="detail-row">
                        <span className="detail-label">Possible Range:</span>
                        <span className="detail-value">
                          {submission.attestation?.validations?.range_check?.possible_range?.min} - {submission.attestation?.validations?.range_check?.possible_range?.max} {submission.unit}
                        </span>
                      </div>
                      <div className="detail-row">
                        <span className="detail-label">Transaction:</span>
                        <a 
                          href={`https://coston2-explorer.flare.network/tx/${submission.tx_hash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="detail-value"
                          style={{ color: 'var(--primary)', textDecoration: 'underline' }}
                        >
                          View on Explorer →
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="empty-state">
            <AlertCircle size={48} />
            <h3>No Verified Records Yet</h3>
            <p>Submit your health information in the "Submit" tab</p>
            <p className="text-muted">Only FDC-verified data will appear here</p>
          </div>
        )}
      </div>
    </section>
  );
}

  // ===== RENDER VERIFY =====
function renderVerify() {
  return (
    <section className="content-section">
      <div className="section-card">
        <div className="card-header">
          <h2>Mark Records as Verified</h2>
          <p className="card-subtitle">Verify your credentials for clinical trial applications</p>
        </div>

        {credentials.length === 0 ? (
          <div className="empty-state">
            <AlertCircle size={48} />
            <h3>No Records to Verify</h3>
            <p>Submit health information first in the "Submit" tab</p>
          </div>
        ) : (
          <div className="verify-list">
            {credentials.map((cred, index) => (
              <div key={index} className="verify-card">
                <div className="verify-header">
                  <h4>Record #{index + 1}</h4>
                  <span className="verify-date">
                    {typeof cred.timestamp === 'number'
                      ? new Date(cred.timestamp * 1000).toLocaleDateString()
                      : 'N/A'}
                  </span>
                </div>
                <p className="verify-data">{String(cred).slice(0, 100)}...</p>
                <div className="verify-actions">
                  <button 
                    onClick={() => verifyCredential(index, true)}  // Always verify (true)
                    className="btn btn-success btn-lg"
                    disabled={loading}
                  >
                    <CheckCircle size={16} />
                    Mark as Verified for Clinical Trials
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
}


function NavItem({ icon, label, active, onClick }) {
  return (
    <button 
      className={`nav-item ${active ? 'active' : ''}`}
      onClick={onClick}
      title={label}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}