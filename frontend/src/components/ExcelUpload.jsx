import React, { useState, useRef } from 'react';
import { Download, Upload, CheckCircle, AlertTriangle, XCircle, FileSpreadsheet } from 'lucide-react';
import Button from './ui/Button';
import { downloadExcelTemplate, uploadExcel } from '../services/excelService';

const ExcelUpload = ({ examId, onUploadSuccess, onClose }) => {
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const handleDownloadTemplate = async () => {
    try {
      await downloadExcelTemplate();
    } catch (err) {
      alert('Failed to download template. Please try again.');
    }
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      if (!selectedFile.name.endsWith('.xlsx') && !selectedFile.name.endsWith('.xls')) {
        setError('Only .xlsx and .xls files are supported');
        setFile(null);
        return;
      }
      setFile(selectedFile);
      setError(null);
      setUploadResult(null); // Reset previous result if selecting a new file
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setIsUploading(true);
    setError(null);

    try {
      const result = await uploadExcel(examId, file);
      setUploadResult(result);
      if (result.savedCount > 0) {
        onUploadSuccess(); // Refresh question list and stats in parent
        setFile(null); // Clear file selection
      }
    } catch (err) {
      setError(err.message || 'Failed to upload Excel file');
      if (err.response?.status === 403) {
        // Handled by apiClient interceptor, but we can catch it here just in case
        console.error('Forbidden/Unauthorized');
      }
    } finally {
      setIsUploading(false);
    }
  };

  const renderResult = () => {
    if (!uploadResult) return null;

    const { totalRows, savedCount, skippedCount, errors } = uploadResult;

    if (savedCount > 0 && skippedCount === 0) {
      return (
        <div className="bg-green-50 border border-green-200 rounded-xl p-6 mt-6">
          <h3 className="text-lg font-bold text-green-800 flex items-center gap-2 mb-4">
            <CheckCircle className="w-5 h-5" /> Upload Successful
          </h3>
          <p className="text-green-700 font-medium mb-1">{savedCount} questions saved successfully</p>
          <p className="text-green-600 text-sm mb-4">{skippedCount} rows skipped</p>
          <Button onClick={onClose} variant="outline" className="border-green-300 text-green-700 hover:bg-green-100">
            View Questions
          </Button>
        </div>
      );
    }

    if (savedCount > 0 && skippedCount > 0) {
      return (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 mt-6">
          <h3 className="text-lg font-bold text-amber-800 flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5" /> Upload Completed with Errors
          </h3>
          <p className="text-amber-800 font-medium mb-1">✅ {savedCount} questions saved successfully</p>
          <p className="text-amber-700 font-medium mb-4">❌ {skippedCount} rows skipped due to errors</p>
          
          <div className="bg-white rounded-lg p-4 border border-amber-100 mb-4 max-h-[150px] overflow-y-auto">
            <p className="text-sm font-semibold text-amber-900 mb-2">Errors found:</p>
            <ul className="list-disc pl-5 text-sm text-amber-800 space-y-1">
              {errors?.map((err, i) => <li key={i}>{err}</li>)}
            </ul>
          </div>
          
          <p className="text-sm text-amber-700 mb-4">Fix these rows in your Excel file and upload again.</p>
          <div className="flex gap-3">
            <Button onClick={handleDownloadTemplate} variant="outline" className="border-amber-300 text-amber-800 hover:bg-amber-100">
              Download Template
            </Button>
            <Button onClick={() => setUploadResult(null)} className="bg-amber-600 hover:bg-amber-700 text-white">
              Upload Again
            </Button>
          </div>
        </div>
      );
    }

    if (savedCount === 0) {
      return (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 mt-6">
          <h3 className="text-lg font-bold text-red-800 flex items-center gap-2 mb-4">
            <XCircle className="w-5 h-5" /> Upload Failed
          </h3>
          <p className="text-red-700 font-medium mb-1">0 questions saved</p>
          <p className="text-red-600 text-sm mb-4">{errors?.length || 0} rows had errors</p>
          
          <div className="bg-white rounded-lg p-4 border border-red-100 mb-4 max-h-[150px] overflow-y-auto">
            <p className="text-sm font-semibold text-red-900 mb-2">Errors:</p>
            <ul className="list-disc pl-5 text-sm text-red-800 space-y-1">
              {errors?.map((err, i) => <li key={i}>{err}</li>)}
            </ul>
          </div>
          
          <p className="text-sm text-red-700 mb-4">Please fix all errors and try again.</p>
          <div className="flex gap-3">
            <Button onClick={handleDownloadTemplate} variant="outline" className="border-red-300 text-red-800 hover:bg-red-100">
              Download Template
            </Button>
            <Button onClick={() => setUploadResult(null)} className="bg-red-600 hover:bg-red-700 text-white">
              Upload Again
            </Button>
          </div>
        </div>
      );
    }
    
    return null;
  };

  return (
    <div className="animate-in fade-in duration-300">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Left Side: Upload Steps */}
        <div>
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-bold text-secondary-500 uppercase tracking-wider mb-3">Step 1: Download the template</h3>
              <Button onClick={handleDownloadTemplate} variant="outline" className="w-full flex justify-center gap-2 border-brand-200 text-brand-700 hover:bg-brand-50">
                <Download className="w-4 h-4" /> Download Template
              </Button>
            </div>

            <div>
              <h3 className="text-sm font-bold text-secondary-500 uppercase tracking-wider mb-3">Step 2: Fill your questions in Excel</h3>
              <p className="text-sm text-secondary-600 bg-secondary-50 p-3 rounded-lg border border-secondary-100">
                Follow the instructions inside the template file. Do not change the column headers.
              </p>
            </div>

            <div>
              <h3 className="text-sm font-bold text-secondary-500 uppercase tracking-wider mb-3">Step 3: Upload your filled file</h3>
              
              <div 
                className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors relative
                  ${file ? 'border-brand-500 bg-brand-50' : 'border-gray-300 hover:border-brand-400 hover:bg-gray-50 cursor-pointer'}`}
                onClick={() => { if (!file) fileInputRef.current?.click(); }}
              >
                {file && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setFile(null);
                      setUploadResult(null);
                      setError(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    className="absolute top-2 right-2 p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                    title="Remove file"
                  >
                    <XCircle className="w-5 h-5" />
                  </button>
                )}
                
                <FileSpreadsheet className={`w-10 h-10 mx-auto mb-3 ${file ? 'text-brand-500' : 'text-gray-400'}`} />
                {file ? (
                  <div>
                    <p className="font-semibold text-brand-700 break-words px-4">Selected: {file.name}</p>
                    <p className="text-xs text-brand-500 mt-1">{(file.size / 1024).toFixed(1)} KB</p>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm font-semibold text-gray-700">Drag and drop your Excel file</p>
                    <p className="text-sm text-gray-500 mt-1">or click to browse</p>
                    <p className="text-xs text-gray-400 mt-2">Supports .xlsx and .xls only (Max 500 rows)</p>
                  </div>
                )}
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileChange}
                  className="hidden"
                  ref={fileInputRef}
                  disabled={isUploading}
                />
              </div>
              
              {error && <p className="text-red-500 text-sm mt-2 font-medium flex items-center gap-1"><AlertTriangle className="w-4 h-4"/> {error}</p>}
            </div>

            <Button 
              onClick={handleUpload} 
              disabled={!file || isUploading} 
              className="w-full flex justify-center gap-2"
              isLoading={isUploading}
            >
              <Upload className="w-4 h-4" /> 
              {isUploading ? 'Saving questions...' : 'Upload and Save Questions'}
            </Button>
          </div>
          
          {renderResult()}
        </div>

        {/* Right Side: Template Instructions */}
        <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
          <h3 className="text-md font-bold text-gray-800 mb-4 flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-gray-500" /> Template Instructions
          </h3>
          
          <div className="space-y-4 text-sm text-gray-700">
            <div>
              <p className="font-semibold text-gray-900 mb-1">Column Headers (Do not change):</p>
              <p className="text-xs font-mono bg-white p-2 rounded border border-gray-200 break-words">
                Question Text | Type | Difficulty | Option A | Option B | Option C | Option D | Correct Answer | Tolerance | Topic | Explanation | Save To Bank
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="font-semibold text-gray-900 mb-1">Type values (exact):</p>
                <ul className="list-disc pl-4 text-xs space-y-1">
                  <li>SINGLE_CHOICE</li>
                  <li>MULTIPLE_SELECT</li>
                  <li>FILL_BLANK</li>
                  <li>NUMERICAL</li>
                </ul>
              </div>
              <div>
                <p className="font-semibold text-gray-900 mb-1">Difficulty values:</p>
                <ul className="list-disc pl-4 text-xs space-y-1">
                  <li>EASY</li>
                  <li>MEDIUM</li>
                  <li>HARD</li>
                </ul>
              </div>
            </div>

            <div>
              <p className="font-semibold text-gray-900 mb-1">Correct Answer format:</p>
              <ul className="list-disc pl-4 text-xs space-y-1">
                <li><span className="font-medium">SINGLE_CHOICE</span> → A or B or C or D</li>
                <li><span className="font-medium">MULTIPLE_SELECT</span> → A,C,D (comma separated)</li>
                <li><span className="font-medium">FILL_BLANK</span> → exact word or phrase</li>
                <li><span className="font-medium">NUMERICAL</span> → a number like 256 or 9.8</li>
              </ul>
            </div>

            <div className="pt-2 border-t border-gray-200">
              <p className="text-xs"><span className="font-semibold text-gray-900">Options:</span> Required for choice types. Leave empty for FILL_BLANK and NUMERICAL.</p>
              <p className="text-xs mt-1"><span className="font-semibold text-gray-900">Tolerance:</span> Only for NUMERICAL. 0 means exact match, 0.5 means ±0.5 accepted.</p>
              <p className="text-xs mt-1"><span className="font-semibold text-gray-900">Save To Bank:</span> TRUE (save globally) or FALSE (save to this exam only).</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default ExcelUpload;
