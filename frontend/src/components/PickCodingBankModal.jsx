import React, { useState, useEffect } from 'react';
import { X, Search, Library, Check, AlertCircle, Code2, Clock, HardDrive, Eye } from 'lucide-react';
import { getCodingBank } from '../services/codingQuestionService';
import Button from './ui/Button';

const PickCodingBankModal = ({
  isOpen,
  onClose,
  onAdd,
  alreadyInPoolIds = [],
  isSubmitting = false
}) => {
  const [bankProblems, setBankProblems] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);

  useEffect(() => {
    if (isOpen) {
      fetchBank();
      setSelectedIds([]);
      setSearchQuery('');
      setError('');
    }
  }, [isOpen]);

  const fetchBank = async () => {
    setIsLoading(true);
    setError('');
    try {
      const res = await getCodingBank();
      const list = res.data || res || [];
      setBankProblems(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error('Failed to load coding bank', err);
      setError('Failed to load problems from Global Coding Bank.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const filteredProblems = bankProblems.filter(p => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.title?.toLowerCase().includes(q) ||
      p.description?.toLowerCase().includes(q)
    );
  });

  const handleToggleSelect = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    const available = filteredProblems.filter(p => !alreadyInPoolIds.includes(p.id));
    if (selectedIds.length === available.length && available.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(available.map(p => p.id));
    }
  };

  const handleConfirm = () => {
    if (selectedIds.length === 0) return;
    onAdd(selectedIds);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col border border-secondary-200 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-secondary-200 bg-secondary-50/50 rounded-t-3xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#362E20] text-amber-300 flex items-center justify-center shadow-sm">
              <Library className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#362E20]">
                Select from Coding Question Bank
              </h2>
              <p className="text-xs text-secondary-600">
                Choose reusable coding problems to import into your exam's question pool.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-secondary-200/60 rounded-full transition-colors text-secondary-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Actions Bar */}
        <div className="p-5 border-b border-secondary-100 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-white">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-400" />
            <input
              type="text"
              placeholder="Search problems by title or keyword..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-secondary-50/50 border border-secondary-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-500 outline-none transition-all text-secondary-900"
            />
          </div>

          <div className="flex items-center gap-3 self-end sm:self-auto">
            <button
              type="button"
              onClick={handleSelectAll}
              className="text-xs font-semibold text-brand-700 hover:text-brand-800 px-3 py-2 rounded-lg hover:bg-brand-50 transition-colors"
            >
              {selectedIds.length > 0 && selectedIds.length === filteredProblems.filter(p => !alreadyInPoolIds.includes(p.id)).length
                ? 'Deselect All'
                : 'Select All Available'}
            </button>
          </div>
        </div>

        {/* Problems List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3 custom-scrollbar">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm font-medium">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 text-secondary-400">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-brand-500 border-t-transparent mb-3"></div>
              <p className="text-sm">Fetching coding problems from bank...</p>
            </div>
          ) : filteredProblems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed border-secondary-200 rounded-2xl bg-secondary-50/30">
              <Code2 className="w-10 h-10 text-secondary-300 mb-2" />
              <p className="text-sm font-semibold text-secondary-700">No coding problems found</p>
              <p className="text-xs text-secondary-500 mt-0.5 max-w-xs">
                {searchQuery ? 'Try changing your search keywords' : 'Your global coding bank does not have any problems yet.'}
              </p>
            </div>
          ) : (
            filteredProblems.map(problem => {
              const isAlreadyAdded = alreadyInPoolIds.includes(problem.id);
              const isSelected = selectedIds.includes(problem.id);

              return (
                <div
                  key={problem.id}
                  onClick={() => !isAlreadyAdded && handleToggleSelect(problem.id)}
                  className={`p-4 rounded-2xl border transition-all flex items-start gap-4 ${
                    isAlreadyAdded
                      ? 'bg-secondary-50/50 border-secondary-200 opacity-60 cursor-not-allowed'
                      : isSelected
                      ? 'bg-amber-50/40 border-amber-400 shadow-sm cursor-pointer ring-1 ring-amber-400'
                      : 'bg-white border-secondary-200 hover:border-brand-300 hover:shadow-sm cursor-pointer'
                  }`}
                >
                  <div className="pt-0.5">
                    <input
                      type="checkbox"
                      checked={isSelected || isAlreadyAdded}
                      disabled={isAlreadyAdded}
                      onChange={() => !isAlreadyAdded && handleToggleSelect(problem.id)}
                      className="w-4 h-4 rounded text-brand-600 border-secondary-300 focus:ring-brand-500 cursor-pointer disabled:cursor-not-allowed"
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-sm font-bold text-[#362E20] truncate">
                        {problem.title}
                      </h4>
                      <div className="flex items-center gap-2 shrink-0">
                        {isAlreadyAdded && (
                          <span className="px-2 py-0.5 text-[10px] font-bold bg-secondary-200 text-secondary-700 rounded-md">
                            Already in Exam
                          </span>
                        )}
                        <span className="px-2.5 py-0.5 text-xs font-bold bg-amber-100 text-amber-900 rounded-md border border-amber-200">
                          {problem.marks || 10} Marks
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-secondary-600 line-clamp-2 mt-1 leading-relaxed">
                      {problem.description}
                    </p>

                    <div className="flex flex-wrap items-center gap-3 mt-3 text-[11px] text-secondary-500">
                      {problem.allowedLanguages && problem.allowedLanguages.length > 0 && (
                        <div className="flex items-center gap-1">
                          <Code2 className="w-3.5 h-3.5 text-secondary-400" />
                          <span>{problem.allowedLanguages.join(', ')}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-secondary-400" />
                        <span>{problem.timeLimitSeconds ?? 2}s</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <HardDrive className="w-3.5 h-3.5 text-secondary-400" />
                        <span>{problem.memoryLimitMb ?? 256}MB</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Eye className="w-3.5 h-3.5 text-secondary-400" />
                        <span>{problem.testCases?.length || 0} Test Cases</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-secondary-200 bg-secondary-50/50 flex justify-between items-center rounded-b-3xl">
          <div className="text-xs font-medium text-secondary-600">
            {selectedIds.length} problem(s) selected
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 font-bold rounded-xl text-xs text-secondary-600 bg-white border border-secondary-200 hover:bg-secondary-50 transition-colors shadow-sm"
            >
              Cancel
            </button>
            <Button
              onClick={handleConfirm}
              disabled={selectedIds.length === 0 || isSubmitting}
              className="px-5 py-2 text-xs flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent"></div>
                  Adding to Exam...
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  Add Selected to Exam
                </>
              )}
            </Button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default PickCodingBankModal;
