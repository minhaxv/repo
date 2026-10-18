import React, { useState, useRef, useMemo } from 'react';
import { 
  X, 
  Upload, 
  Download, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertTriangle, 
  AlertCircle, 
  Users, 
  ArrowRight, 
  RefreshCw,
  Info,
  Check,
  Filter,
  FileCheck
} from 'lucide-react';
import { useERP } from '../../context/ERPContext';
import { CUSTOMER_TYPES } from '../../types';

// Helper to parse CSV text handling quoted fields with commas
function parseCSV(text) {
  const lines = text.split(/\r\n|\n/).filter(line => line.trim().length > 0);
  if (lines.length < 2) return { headers: [], rows: [] };

  const parseLine = (line) => {
    const result = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"' || char === "'") {
        if (inQuotes && line[i + 1] === char) {
          cur += char;
          i++; // skip escaped quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(cur.trim());
        cur = '';
      } else {
        cur += char;
      }
    }
    result.push(cur.trim());
    return result.map(c => c.replace(/^["']|["']$/g, '').trim());
  };

  const rawHeaders = parseLine(lines[0]);
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = parseLine(lines[i]);
    // Skip empty lines
    if (cols.some(c => c.length > 0)) {
      rows.push(cols);
    }
  }

  return { headers: rawHeaders, rows };
}

// Normalized header matcher for flexible user templates
function findColumnIndex(headers, possibleNames) {
  const normPossible = possibleNames.map(p => p.toLowerCase().replace(/[^a-z0-9]/g, ''));
  for (let i = 0; i < headers.length; i++) {
    const norm = headers[i].toLowerCase().replace(/[^a-z0-9]/g, '');
    if (normPossible.includes(norm)) return i;
  }
  return -1;
}

export default function BulkCustomerImportModal({ isOpen, onClose, onImportComplete }) {
  const { customers, addCustomersBulk } = useERP();
  const fileInputRef = useRef(null);

  const [file, setFile] = useState(null);
  const [parsedData, setParsedData] = useState([]);
  const [duplicateOption, setDuplicateOption] = useState('skip'); // 'skip' or 'update'
  const [defaultType, setDefaultType] = useState('Regular');
  const [defaultState, setDefaultState] = useState('Kerala');
  const [defaultDistrict, setDefaultDistrict] = useState('Kozhikode');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL', 'READY', 'DUPLICATE', 'ERROR'
  const [isProcessing, setIsProcessing] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [dragActive, setDragActive] = useState(false);

  // Existing customer phone lookup for duplicate detection
  const existingMobiles = useMemo(() => {
    const set = new Set();
    (customers || []).forEach(c => {
      if (c.mobile) set.add(String(c.mobile).trim().replace(/\D/g, ''));
      if (c.additionalMobiles && Array.isArray(c.additionalMobiles)) {
        c.additionalMobiles.forEach(m => set.add(String(m).trim().replace(/\D/g, '')));
      }
    });
    return set;
  }, [customers]);

  if (!isOpen) return null;

  // Generate and download sample CSV template
  const handleDownloadTemplate = () => {
    const headers = [
      'Customer Name*',
      'Mobile Number*',
      'Customer Type',
      'Address',
      'City',
      'District',
      'State',
      'Pincode',
      'GSTIN',
      'Email',
      'Alternate Mobiles',
      'Credit Limit',
      'Opening Balance',
      'Opening Balance Type'
    ];

    const sampleRows = [
      [
        'Calicut Arts & Printers',
        '9876543210',
        'Dealer',
        'Shop 4, SM Street',
        'Kozhikode',
        'Kozhikode',
        'Kerala',
        '673001',
        '32AAAAA0000A1Z5',
        'contact@calicutarts.com',
        '9876543211, 9876543212',
        '50000',
        '12500',
        'Receivable'
      ],
      [
        'Malabar Signage Works',
        '9123456780',
        'Corporate',
        'Door 12/B, Industrial Estate',
        'Kochi',
        'Ernakulam',
        'Kerala',
        '682024',
        '32BBBBB1111B1Z6',
        'malabarsigns@gmail.com',
        '',
        '75000',
        '0',
        'Receivable'
      ],
      [
        'Ramesh Kumar Walkin',
        '9000011111',
        'Regular',
        'Near Civil Station',
        'Kozhikode',
        'Kozhikode',
        'Kerala',
        '673020',
        '',
        '',
        '',
        '10000',
        '0',
        'Receivable'
      ]
    ];

    const csvRows = [headers.join(',')];
    sampleRows.forEach(row => {
      const escaped = row.map(val => `"${String(val).replace(/"/g, '""')}"`);
      csvRows.push(escaped.join(','));
    });

    const csvContent = '\uFEFF' + csvRows.join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `stitch_customers_bulk_template.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Process selected file
  const handleFileProcess = (selectedFile) => {
    if (!selectedFile) return;
    setFile(selectedFile);
    setImportResult(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target.result;
        const { headers, rows } = parseCSV(text);

        if (headers.length === 0 || rows.length === 0) {
          alert('The uploaded file appears to be empty or does not have valid header columns.');
          return;
        }

        // Map column indices
        const nameIdx = findColumnIndex(headers, ['customer name', 'name', 'client name', 'company name', 'customer']);
        const mobileIdx = findColumnIndex(headers, ['mobile number', 'mobile', 'phone', 'contact number', 'phone number', 'contact']);
        const typeIdx = findColumnIndex(headers, ['customer type', 'type', 'category']);
        const addressIdx = findColumnIndex(headers, ['address', 'street', 'location']);
        const cityIdx = findColumnIndex(headers, ['city', 'town']);
        const districtIdx = findColumnIndex(headers, ['district']);
        const stateIdx = findColumnIndex(headers, ['state', 'province']);
        const pincodeIdx = findColumnIndex(headers, ['pincode', 'pin code', 'zip', 'postal code']);
        const gstinIdx = findColumnIndex(headers, ['gstin', 'gst', 'gst number', 'tax id']);
        const emailIdx = findColumnIndex(headers, ['email', 'email address', 'mail']);
        const altMobilesIdx = findColumnIndex(headers, ['alternate mobiles', 'alternate mobile', 'secondary mobile', 'other mobile']);
        const creditLimitIdx = findColumnIndex(headers, ['credit limit', 'limit']);
        const opBalIdx = findColumnIndex(headers, ['opening balance', 'opening bal', 'balance']);
        const opBalTypeIdx = findColumnIndex(headers, ['opening balance type', 'balance type', 'op bal type']);

        const validatedRows = rows.map((row, idx) => {
          const rawName = nameIdx >= 0 ? (row[nameIdx] || '').trim() : '';
          const rawMobile = mobileIdx >= 0 ? (row[mobileIdx] || '').trim() : '';
          const cleanMobile = rawMobile.replace(/\D/g, '');
          const rawType = typeIdx >= 0 ? (row[typeIdx] || '').trim() : '';
          const rawGst = gstinIdx >= 0 ? (row[gstinIdx] || '').trim().toUpperCase() : '';

          let status = 'READY'; // READY, DUPLICATE, ERROR
          let reason = '';

          if (!rawName) {
            status = 'ERROR';
            reason = 'Missing customer name';
          } else if (!rawMobile || cleanMobile.length < 10) {
            status = 'ERROR';
            reason = 'Invalid 10-digit mobile number';
          } else if (existingMobiles.has(cleanMobile)) {
            status = 'DUPLICATE';
            reason = 'Mobile already exists in database';
          }

          return {
            rowId: idx + 1,
            name: rawName,
            mobile: rawMobile,
            cleanMobile,
            type: rawType || defaultType,
            address: addressIdx >= 0 ? (row[addressIdx] || '').trim() : '',
            city: cityIdx >= 0 ? (row[cityIdx] || '').trim() : '',
            district: (districtIdx >= 0 ? (row[districtIdx] || '').trim() : '') || defaultDistrict,
            state: (stateIdx >= 0 ? (row[stateIdx] || '').trim() : '') || defaultState,
            pincode: pincodeIdx >= 0 ? (row[pincodeIdx] || '').trim() : '',
            gstin: rawGst,
            email: emailIdx >= 0 ? (row[emailIdx] || '').trim() : '',
            additionalMobiles: altMobilesIdx >= 0 ? (row[altMobilesIdx] || '').split(/[,;]/).map(m => m.trim()).filter(Boolean) : [],
            creditLimit: creditLimitIdx >= 0 ? (parseFloat(row[creditLimitIdx]) || 10000) : 10000,
            openingBalance: opBalIdx >= 0 ? (parseFloat(row[opBalIdx]) || 0) : 0,
            openingBalanceType: opBalTypeIdx >= 0 ? (row[opBalTypeIdx] || 'Receivable') : 'Receivable',
            status,
            reason
          };
        });

        setParsedData(validatedRows);
      } catch (err) {
        console.error('CSV Parsing Error:', err);
        alert('Failed to parse the file. Please ensure it is a valid CSV file.');
      }
    };
    reader.readAsText(selectedFile);
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileProcess(e.dataTransfer.files[0]);
    }
  };

  // Filter parsed rows for preview
  const filteredRows = useMemo(() => {
    if (statusFilter === 'ALL') return parsedData;
    return parsedData.filter(r => r.status === statusFilter);
  }, [parsedData, statusFilter]);

  const counts = useMemo(() => {
    const total = parsedData.length;
    const ready = parsedData.filter(r => r.status === 'READY').length;
    const duplicates = parsedData.filter(r => r.status === 'DUPLICATE').length;
    const errors = parsedData.filter(r => r.status === 'ERROR').length;
    return { total, ready, duplicates, errors };
  }, [parsedData]);

  // Execute bulk import
  const handleExecuteImport = async () => {
    const toImport = parsedData.filter(r => {
      if (r.status === 'ERROR') return false;
      if (r.status === 'DUPLICATE' && duplicateOption === 'skip') return false;
      return true;
    });

    if (toImport.length === 0) {
      alert('No valid customer records to import with current settings.');
      return;
    }

    try {
      setIsProcessing(true);
      const res = await addCustomersBulk(toImport, { 
        overwriteExisting: duplicateOption === 'update' 
      });

      setImportResult({
        totalProcessed: toImport.length,
        inserted: res.inserted || 0,
        updated: res.updated || 0,
        skipped: counts.total - toImport.length
      });

      if (onImportComplete) {
        onImportComplete();
      }
    } catch (err) {
      console.error('Bulk Import error:', err);
      alert('An error occurred during import: ' + (err.message || 'Unknown error'));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setParsedData([]);
    setImportResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 10050 }}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '960px', width: '95vw', maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}
      >
        {/* Modal Header */}
        <div 
          className="modal-header" 
          style={{ 
            background: 'linear-gradient(135deg, #1e3a8a, #2563eb)', 
            color: '#ffffff', 
            padding: '1rem 1.5rem',
            borderTopLeftRadius: '12px',
            borderTopRightRadius: '12px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <FileSpreadsheet size={24} color="#93c5fd" />
            <div>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#ffffff' }}>
                Bulk Customer Upload & Data Import
              </h3>
              <span style={{ fontSize: '0.78rem', color: '#bfdbfe' }}>
                Import client contacts, dealer accounts, GSTIN, opening balances, and addresses from Excel / CSV
              </span>
            </div>
          </div>
          <button 
            onClick={onClose} 
            disabled={isProcessing}
            style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '1.4rem' }}
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body" style={{ padding: '1.25rem', overflowY: 'auto', flex: 1 }}>
          {/* Success Banner if import complete */}
          {importResult ? (
            <div style={{ padding: '2rem 1.5rem', textAlign: 'center' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem' }}>
                <CheckCircle2 size={36} color="#15803d" />
              </div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.5rem' }}>
                Customer Data Imported Successfully!
              </h2>
              <p style={{ color: '#64748b', fontSize: '0.9rem', maxWidth: '500px', margin: '0 auto 1.5rem' }}>
                Your customer master records have been updated and synchronized with local and cloud storage.
              </p>

              <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap', marginBottom: '2rem' }}>
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '1rem 1.5rem', minWidth: '130px' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>TOTAL PROCESSED</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#2563eb' }}>{importResult.totalProcessed}</div>
                </div>
                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '1rem 1.5rem', minWidth: '130px' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#166534' }}>NEW CUSTOMERS</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#15803d' }}>{importResult.inserted}</div>
                </div>
                {importResult.updated > 0 && (
                  <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '10px', padding: '1rem 1.5rem', minWidth: '130px' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#1e40af' }}>UPDATED</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#2563eb' }}>{importResult.updated}</div>
                  </div>
                )}
                {importResult.skipped > 0 && (
                  <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '10px', padding: '1rem 1.5rem', minWidth: '130px' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#92400e' }}>SKIPPED / DUPLICATES</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#d97706' }}>{importResult.skipped}</div>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem' }}>
                <button onClick={handleReset} className="btn btn-secondary">
                  <Upload size={15} /> Upload Another File
                </button>
                <button onClick={onClose} className="btn btn-primary" style={{ fontWeight: 700 }}>
                  <Check size={16} /> Done & View Customers
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Step 1: Template Download Bar */}
              <div style={{ 
                background: '#f8fafc', 
                border: '1px solid #e2e8f0', 
                borderRadius: '10px', 
                padding: '1rem', 
                marginBottom: '1.25rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '1rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <FileSpreadsheet size={22} color="#2563eb" />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0f172a' }}>
                      Step 1: Download Standard Customer Template
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      Pre-formatted columns: Name, Mobile, Type, Address, City, District, State, Pincode, GSTIN, Opening Balance
                    </div>
                  </div>
                </div>

                <button 
                  type="button" 
                  onClick={handleDownloadTemplate} 
                  className="btn btn-sm btn-secondary"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, color: '#2563eb', borderColor: '#bfdbfe' }}
                >
                  <Download size={14} /> Download Sample CSV
                </button>
              </div>

              {/* Step 2: Upload Drop Zone */}
              {!file ? (
                <div
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  style={{
                    border: dragActive ? '2px dashed #2563eb' : '2px dashed #cbd5e1',
                    background: dragActive ? '#eff6ff' : '#fafafa',
                    borderRadius: '12px',
                    padding: '2.5rem 1.5rem',
                    textAlign: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    marginBottom: '1.25rem'
                  }}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,text/csv"
                    style={{ display: 'none' }}
                    onChange={(e) => handleFileProcess(e.target.files[0])}
                  />
                  <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
                    <Upload size={28} color="#2563eb" />
                  </div>
                  <h4 style={{ margin: '0 0 0.35rem', fontWeight: 800, color: '#0f172a' }}>
                    Choose your CSV file or drag & drop here
                  </h4>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>
                    Supports <strong>.csv</strong> files exported from Excel, Google Sheets, Tally, or other ERP systems
                  </p>
                  <button 
                    type="button" 
                    className="btn btn-sm btn-primary" 
                    style={{ marginTop: '1rem', pointerEvents: 'none' }}
                  >
                    Browse Local File
                  </button>
                </div>
              ) : (
                /* Step 3: File Loaded & Preview Options */
                <div>
                  {/* File status bar & Duplicate controls */}
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    background: '#f1f5f9', 
                    padding: '0.75rem 1rem', 
                    borderRadius: '8px', 
                    marginBottom: '1rem',
                    flexWrap: 'wrap',
                    gap: '0.75rem'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <FileCheck size={18} color="#059669" />
                      <strong style={{ fontSize: '0.88rem', color: '#0f172a' }}>{file.name}</strong>
                      <span style={{ fontSize: '0.75rem', color: '#64748b' }}>({(file.size / 1024).toFixed(1)} KB)</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem' }}>
                        <span style={{ fontWeight: 700, color: '#475569' }}>If duplicate mobile:</span>
                        <select 
                          className="form-control form-control-sm"
                          value={duplicateOption}
                          onChange={(e) => setDuplicateOption(e.target.value)}
                          style={{ padding: '0.2rem 0.5rem', height: '28px', fontSize: '0.8rem' }}
                        >
                          <option value="skip">Skip Duplicate (Keep Existing)</option>
                          <option value="update">Overwrite / Update Existing</option>
                        </select>
                      </div>

                      <button 
                        type="button" 
                        onClick={handleReset} 
                        className="btn btn-sm btn-secondary"
                        style={{ height: '28px', padding: '0 0.6rem', fontSize: '0.75rem' }}
                      >
                        Change File
                      </button>
                    </div>
                  </div>

                  {/* Summary Metric Counters */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
                    <button
                      type="button"
                      onClick={() => setStatusFilter('ALL')}
                      style={{
                        background: statusFilter === 'ALL' ? '#1e293b' : '#fff',
                        color: statusFilter === 'ALL' ? '#fff' : '#0f172a',
                        border: '1px solid #cbd5e1',
                        borderRadius: '8px',
                        padding: '0.65rem',
                        textAlign: 'left',
                        cursor: 'pointer'
                      }}
                    >
                      <div style={{ fontSize: '0.7rem', fontWeight: 700, opacity: 0.8 }}>TOTAL ROWS</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 900 }}>{counts.total}</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setStatusFilter('READY')}
                      style={{
                        background: statusFilter === 'READY' ? '#059669' : '#fff',
                        color: statusFilter === 'READY' ? '#fff' : '#065f46',
                        border: '1px solid #a7f3d0',
                        borderRadius: '8px',
                        padding: '0.65rem',
                        textAlign: 'left',
                        cursor: 'pointer'
                      }}
                    >
                      <div style={{ fontSize: '0.7rem', fontWeight: 700, opacity: 0.8 }}>READY TO IMPORT</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 900 }}>{counts.ready}</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setStatusFilter('DUPLICATE')}
                      style={{
                        background: statusFilter === 'DUPLICATE' ? '#d97706' : '#fff',
                        color: statusFilter === 'DUPLICATE' ? '#fff' : '#92400e',
                        border: '1px solid #fde68a',
                        borderRadius: '8px',
                        padding: '0.65rem',
                        textAlign: 'left',
                        cursor: 'pointer'
                      }}
                    >
                      <div style={{ fontSize: '0.7rem', fontWeight: 700, opacity: 0.8 }}>EXISTING DUPLICATES</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 900 }}>{counts.duplicates}</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setStatusFilter('ERROR')}
                      style={{
                        background: statusFilter === 'ERROR' ? '#e11d48' : '#fff',
                        color: statusFilter === 'ERROR' ? '#fff' : '#9f1239',
                        border: '1px solid #fecdd3',
                        borderRadius: '8px',
                        padding: '0.65rem',
                        textAlign: 'left',
                        cursor: 'pointer'
                      }}
                    >
                      <div style={{ fontSize: '0.7rem', fontWeight: 700, opacity: 0.8 }}>VALIDATION ERRORS</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 900 }}>{counts.errors}</div>
                    </button>
                  </div>

                  {/* Preview Table */}
                  <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden', marginBottom: '1rem' }}>
                    <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                      <table className="erp-table" style={{ margin: 0, fontSize: '0.8rem' }}>
                        <thead style={{ position: 'sticky', top: 0, zIndex: 2, background: '#f8fafc' }}>
                          <tr>
                            <th style={{ width: '40px' }}>#</th>
                            <th>Status</th>
                            <th>Customer Name</th>
                            <th>Mobile</th>
                            <th>Type</th>
                            <th>City / District</th>
                            <th>GSTIN</th>
                            <th>Opening Balance</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredRows.length === 0 ? (
                            <tr>
                              <td colSpan={8} style={{ textAlign: 'center', padding: '1.5rem', color: '#94a3b8' }}>
                                No customer records match this filter.
                              </td>
                            </tr>
                          ) : (
                            filteredRows.map((r) => (
                              <tr key={r.rowId} style={{ background: r.status === 'ERROR' ? '#fff1f2' : r.status === 'DUPLICATE' ? '#fffbeb' : '#fff' }}>
                                <td style={{ color: '#64748b', fontWeight: 700 }}>{r.rowId}</td>
                                <td>
                                  {r.status === 'READY' && (
                                    <span className="badge badge-emerald" style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                      <Check size={11} /> Ready
                                    </span>
                                  )}
                                  {r.status === 'DUPLICATE' && (
                                    <span className="badge badge-amber" title={r.reason} style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                      <AlertTriangle size={11} /> {duplicateOption === 'skip' ? 'Will Skip' : 'Will Update'}
                                    </span>
                                  )}
                                  {r.status === 'ERROR' && (
                                    <span className="badge badge-rose" title={r.reason} style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                      <AlertCircle size={11} /> {r.reason}
                                    </span>
                                  )}
                                </td>
                                <td style={{ fontWeight: 800, color: '#0f172a' }}>{r.name || '—'}</td>
                                <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{r.mobile || '—'}</td>
                                <td><span className="badge badge-sky">{r.type}</span></td>
                                <td>{r.city ? `${r.city}, ${r.district}` : r.district}</td>
                                <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>{r.gstin || '—'}</td>
                                <td>
                                  {r.openingBalance > 0 ? (
                                    <strong style={{ color: r.openingBalanceType === 'Receivable' ? '#16a34a' : '#ea580c' }}>
                                      ₹{r.openingBalance.toLocaleString()} ({r.openingBalanceType === 'Receivable' ? 'Dr' : 'Cr'})
                                    </strong>
                                  ) : '₹0'}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        {!importResult && (
          <div 
            className="modal-footer" 
            style={{ 
              padding: '0.85rem 1.5rem', 
              borderTop: '1px solid #e2e8f0', 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              background: '#f8fafc' 
            }}
          >
            <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
              {parsedData.length > 0 ? (
                <span>
                  Ready to import <strong>{counts.ready + (duplicateOption === 'update' ? counts.duplicates : 0)}</strong> of <strong>{counts.total}</strong> records
                </span>
              ) : (
                <span>Ensure your CSV file contains customer names and 10-digit mobile numbers.</span>
              )}
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button 
                type="button" 
                onClick={onClose} 
                className="btn btn-secondary"
                disabled={isProcessing}
              >
                Cancel
              </button>

              {parsedData.length > 0 && (
                <button
                  type="button"
                  onClick={handleExecuteImport}
                  className="btn btn-primary"
                  disabled={isProcessing || (counts.ready === 0 && (duplicateOption !== 'update' || counts.duplicates === 0))}
                  style={{ fontWeight: 800, minWidth: '150px' }}
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw size={15} className="spin" /> Importing...
                    </>
                  ) : (
                    <>
                      <Upload size={15} /> Import {counts.ready + (duplicateOption === 'update' ? counts.duplicates : 0)} Customers
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
