import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useNavigate } from 'react-router-dom';
import { createExam } from '../services/examService';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';

// Utility component for select inputs
const Select = React.forwardRef(({ label, error, className = '', options, ...props }, ref) => (
  <div className={`flex flex-col space-y-1 ${className}`}>
    <label className="text-sm font-semibold text-secondary-800">{label}</label>
    <select
      ref={ref}
      className={`px-4 py-2 bg-[#F3EDE0] border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 transition-shadow text-secondary-900
        ${error ? 'border-red-400 focus:ring-red-500' : 'border-secondary-200'}
      `}
      {...props}
    >
      {options.map(opt => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
    {error && <span className="text-xs text-red-500">{error.message}</span>}
  </div>
));
Select.displayName = 'Select';

// Validation Schema
const schema = yup.object().shape({
  title: yup.string().required('Title is required'),
  subject: yup.string().required('Subject is required'),
  timerType: yup.string().oneOf(['WHOLE_EXAM', 'PER_QUESTION']).required(),
  durationMinutes: yup.number().typeError('Must be a number').when('timerType', {
    is: 'WHOLE_EXAM',
    then: (s) => s.positive('Must be > 0').integer().required('Duration is required'),
    otherwise: (s) => s.notRequired().nullable()
  }),
  scheduledDate: yup.string().required('Date is required'),
  scheduledTime: yup.string().required('Time is required'),
  gracePeriodMinutes: yup.number().typeError('Must be a number').min(0).integer().required('Grace period is required'),
  easyPercent: yup.number().typeError('Must be a number').min(0).max(100).required(),
  mediumPercent: yup.number().typeError('Must be a number').min(0).max(100).required(),
  hardPercent: yup.number().typeError('Must be a number').min(0).max(100).required(),
  totalQuestions: yup.number().typeError('Must be a number').positive().integer().required('Required'),
  negativeMark: yup.boolean(),
  deviceAccess: yup.string().oneOf(['MOBILE', 'DESKTOP', 'BOTH']).required(),
  easyMark: yup.number().typeError('Required').min(0).required(),
  mediumMark: yup.number().typeError('Required').min(0).required(),
  hardMark: yup.number().typeError('Required').min(0).required(),
  easyNegative: yup.number().typeError('Required').min(0).required(),
  mediumNegative: yup.number().typeError('Required').min(0).required(),
  hardNegative: yup.number().typeError('Required').min(0).required(),
  easySeconds: yup.number().typeError('Required').min(1).required(),
  mediumSeconds: yup.number().typeError('Required').min(1).required(),
  hardSeconds: yup.number().typeError('Required').min(1).required(),
}).test(
  'sum-percents',
  'Difficulty percentages must add up to 100',
  function (value) {
    const sum = (value.easyPercent || 0) + (value.mediumPercent || 0) + (value.hardPercent || 0);
    if (sum !== 100) {
      return this.createError({ path: 'hardPercent', message: 'Percentages must total 100%' });
    }
    return true;
  }
);

const CreateExam = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successModal, setSuccessModal] = useState(null); // { joinCode, examId }
  const navigate = useNavigate();

  const { register, handleSubmit, watch, formState: { errors } } = useForm({
    resolver: yupResolver(schema),
    mode: 'onChange',
    defaultValues: {
      timerType: 'WHOLE_EXAM',
      durationMinutes: 60,
      gracePeriodMinutes: 10,
      easyPercent: 50,
      mediumPercent: 30,
      hardPercent: 20,
      totalQuestions: 20,
      negativeMark: true,
      deviceAccess: 'BOTH',
      easyMark: 1.0,
      mediumMark: 2.0,
      hardMark: 3.0,
      easyNegative: 0.25,
      mediumNegative: 0.50,
      hardNegative: 1.00,
      easySeconds: 30,
      mediumSeconds: 60,
      hardSeconds: 90,
    }
  });

  const timerType = watch('timerType');
  const negativeMarkEnabled = watch('negativeMark');
  
  const easyPct = watch('easyPercent') || 0;
  const medPct = watch('mediumPercent') || 0;
  const hardPct = watch('hardPercent') || 0;
  const pctSum = Number(easyPct) + Number(medPct) + Number(hardPct);

  const onSubmit = async (data) => {
    setIsLoading(true);
    setError('');
    try {
      // Format to "YYYY-MM-DDTHH:mm:ss"
      const scheduledStart = `${data.scheduledDate}T${data.scheduledTime}:00`;

      const payload = {
        title: data.title,
        subject: data.subject,
        scheduledStart: scheduledStart,
        gracePeriodMinutes: Number(data.gracePeriodMinutes),
        timerType: data.timerType,
        durationMinutes: data.timerType === 'WHOLE_EXAM' ? Number(data.durationMinutes) : null,
        totalQuestions: Number(data.totalQuestions),
        easyPercent: Number(data.easyPercent),
        mediumPercent: Number(data.mediumPercent),
        hardPercent: Number(data.hardPercent),
        easyMark: Number(data.easyMark),
        mediumMark: Number(data.mediumMark),
        hardMark: Number(data.hardMark),
        easyNegative: negativeMarkEnabled ? Number(data.easyNegative) : 0,
        mediumNegative: negativeMarkEnabled ? Number(data.mediumNegative) : 0,
        hardNegative: negativeMarkEnabled ? Number(data.hardNegative) : 0,
        easySeconds: Number(data.easySeconds),
        mediumSeconds: Number(data.mediumSeconds),
        hardSeconds: Number(data.hardSeconds),
        negativeMark: Boolean(data.negativeMark),
        deviceAccess: data.deviceAccess
      };

      const response = await createExam(payload);
      
      // Show success modal
      setSuccessModal({
        joinCode: response.data.joinCode,
        examId: response.data.id
      });
      
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to create exam');
    } finally {
      setIsLoading(false);
    }
  };

  const handleContinue = () => {
    if (successModal) {
      localStorage.setItem('currentExamId', successModal.examId);
      navigate('/host/generate-questions');
    }
  };

  return (
    <div className="max-w-4xl mx-auto font-sans relative z-10">
      <div className="w-full">
        
        <button onClick={() => navigate('/host/dashboard')} className="text-secondary-600 hover:text-brand-600 mb-6 flex items-center gap-2 font-bold text-sm transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Dashboard
        </button>

        <div className="bg-white rounded-2xl shadow-xl border border-secondary-200 p-8 md:p-10">
          <h1 className="text-3xl font-extrabold text-secondary-900 mb-2">Create New Exam</h1>
          <p className="text-secondary-600 mb-8 text-base">Configure your assessment details and structure.</p>

          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-6 shadow-sm border border-red-100">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            {/* General Info */}
            <div>
              <h2 className="text-lg font-bold text-secondary-900 border-b border-secondary-200 pb-2 mb-6">General Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input label="Exam Title" placeholder="e.g. Java Basics Quiz" {...register('title')} error={errors.title} />
                <Input label="Subject" placeholder="e.g. Java Programming" {...register('subject')} error={errors.subject} />
              </div>
            </div>

            {/* Timing & Access */}
            <div className="pt-4">
              <h2 className="text-lg font-bold text-secondary-900 border-b border-secondary-200 pb-2 mb-6">Timing & Access</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input type="date" label="Scheduled Date" {...register('scheduledDate')} error={errors.scheduledDate} />
                <Input type="time" label="Scheduled Time" {...register('scheduledTime')} error={errors.scheduledTime} />
                
                <Select 
                  label="Timer Type" 
                  {...register('timerType')} 
                  error={errors.timerType}
                  options={[
                    { value: 'WHOLE_EXAM', label: 'Whole Exam' },
                    { value: 'PER_QUESTION', label: 'Per Question' },
                  ]} 
                />
                
                {timerType === 'WHOLE_EXAM' && (
                  <Input type="number" label="Duration (Minutes)" {...register('durationMinutes')} error={errors.durationMinutes} />
                )}
                
                <Input type="number" label="Grace Period (Minutes)" {...register('gracePeriodMinutes')} error={errors.gracePeriodMinutes} />
                <Select 
                  label="Device Access" 
                  {...register('deviceAccess')} 
                  error={errors.deviceAccess}
                  options={[
                    { value: 'BOTH', label: 'Desktop & Mobile' },
                    { value: 'DESKTOP', label: 'Desktop Only' },
                    { value: 'MOBILE', label: 'Mobile Only' },
                  ]} 
                />
              </div>
            </div>

            {/* Grading & Structure */}
            <div className="pt-4">
              <h2 className="text-lg font-bold text-secondary-900 border-b border-secondary-200 pb-2 mb-6">Structure & Grading</h2>
              
              <div className="mb-4">
                <Input type="number" label="Total Questions" {...register('totalQuestions')} error={errors.totalQuestions} />
              </div>
              
              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-semibold text-secondary-800">Difficulty Percentages</label>
                  <span className={`text-sm font-bold ${pctSum === 100 ? 'text-green-600' : 'text-red-500'}`}>
                    Total: {pctSum}%
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <Input type="number" label="Easy (%)" {...register('easyPercent')} error={errors.easyPercent} />
                  <Input type="number" label="Medium (%)" {...register('mediumPercent')} error={errors.mediumPercent} />
                  <Input type="number" label="Hard (%)" {...register('hardPercent')} error={errors.hardPercent} />
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center p-5 bg-[#F9F2EA] rounded-xl border border-secondary-200 mt-6 mb-6">
                <label className="flex items-center gap-3 cursor-pointer font-bold text-secondary-800">
                  <input type="checkbox" {...register('negativeMark')} className="w-5 h-5 text-brand-600 rounded border-secondary-300 focus:ring-brand-500" />
                  Enable Negative Marking
                </label>
              </div>

              {/* Difficulty Table */}
              <div className="bg-brand-50 border border-brand-200 text-brand-800 px-4 py-3 rounded-xl mt-6 mb-4 text-sm font-medium flex items-start sm:items-center gap-3">
                <svg className="w-5 h-5 text-brand-500 flex-shrink-0 mt-0.5 sm:mt-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Tip: You can customize the marks, negative marking, and time limits for each difficulty level below.
              </div>

              <div className="overflow-x-auto border border-secondary-200 rounded-xl shadow-sm">
                <table className="w-full text-left border-collapse min-w-[500px]">
                  <thead className="bg-[#F3EDE0]">
                    <tr>
                      <th className="p-4 font-semibold text-secondary-800 text-sm border-b border-secondary-200 w-1/4">Difficulty</th>
                      <th className="p-4 font-semibold text-secondary-800 text-sm border-b border-secondary-200">
                        <div className="flex items-center gap-1.5">
                          Marks
                          <svg className="w-3.5 h-3.5 text-secondary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                        </div>
                      </th>
                      {negativeMarkEnabled && (
                        <th className="p-4 font-semibold text-secondary-800 text-sm border-b border-secondary-200">
                          <div className="flex items-center gap-1.5">
                            Negative
                            <svg className="w-3.5 h-3.5 text-secondary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                          </div>
                        </th>
                      )}
                      {timerType === 'PER_QUESTION' && (
                        <th className="p-4 font-semibold text-secondary-800 text-sm border-b border-secondary-200">
                          <div className="flex items-center gap-1.5">
                            Time (sec)
                            <svg className="w-3.5 h-3.5 text-secondary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                          </div>
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="bg-white">
                    <tr className="border-b border-secondary-100 hover:bg-slate-50 transition-colors">
                      <td className="p-4 font-bold text-secondary-700">Easy</td>
                      <td className="p-3"><Input type="number" step="0.1" {...register('easyMark')} error={errors.easyMark} containerClassName="!mb-0" className="py-2.5 px-3 w-full min-w-[80px]" /></td>
                      {negativeMarkEnabled && (
                        <td className="p-3"><Input type="number" step="0.01" {...register('easyNegative')} error={errors.easyNegative} containerClassName="!mb-0" className="py-2.5 px-3 w-full min-w-[80px]" /></td>
                      )}
                      {timerType === 'PER_QUESTION' && (
                        <td className="p-3"><Input type="number" {...register('easySeconds')} error={errors.easySeconds} containerClassName="!mb-0" className="py-2.5 px-3 w-full min-w-[80px]" /></td>
                      )}
                    </tr>
                    <tr className="border-b border-secondary-100 hover:bg-slate-50 transition-colors">
                      <td className="p-4 font-bold text-secondary-700">Medium</td>
                      <td className="p-3"><Input type="number" step="0.1" {...register('mediumMark')} error={errors.mediumMark} containerClassName="!mb-0" className="py-2.5 px-3 w-full min-w-[80px]" /></td>
                      {negativeMarkEnabled && (
                        <td className="p-3"><Input type="number" step="0.01" {...register('mediumNegative')} error={errors.mediumNegative} containerClassName="!mb-0" className="py-2.5 px-3 w-full min-w-[80px]" /></td>
                      )}
                      {timerType === 'PER_QUESTION' && (
                        <td className="p-3"><Input type="number" {...register('mediumSeconds')} error={errors.mediumSeconds} containerClassName="!mb-0" className="py-2.5 px-3 w-full min-w-[80px]" /></td>
                      )}
                    </tr>
                    <tr className="hover:bg-slate-50 transition-colors">
                      <td className="p-4 font-bold text-secondary-700">Hard</td>
                      <td className="p-3"><Input type="number" step="0.1" {...register('hardMark')} error={errors.hardMark} containerClassName="!mb-0" className="py-2.5 px-3 w-full min-w-[80px]" /></td>
                      {negativeMarkEnabled && (
                        <td className="p-3"><Input type="number" step="0.01" {...register('hardNegative')} error={errors.hardNegative} containerClassName="!mb-0" className="py-2.5 px-3 w-full min-w-[80px]" /></td>
                      )}
                      {timerType === 'PER_QUESTION' && (
                        <td className="p-3"><Input type="number" {...register('hardSeconds')} error={errors.hardSeconds} containerClassName="!mb-0" className="py-2.5 px-3 w-full min-w-[80px]" /></td>
                      )}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <Button type="submit" disabled={isLoading || pctSum !== 100} className="w-full md:w-auto px-8 py-3 text-lg">
                {isLoading ? 'Creating...' : 'Create Exam'}
              </Button>
            </div>
          </form>
        </div>
      </div>

      {/* Success Modal */}
      {successModal && (
        <div className="fixed inset-0 bg-secondary-900/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl text-center border border-brand-200">
            <div className="w-16 h-16 bg-brand-100 text-brand-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-2xl font-extrabold text-secondary-900 mb-2">Exam Created!</h3>
            <p className="text-secondary-600 mb-6 font-medium">Share this Join Code with candidates:</p>
            
            <div className="bg-[#F9F2EA] border border-secondary-200 rounded-xl p-6 mb-8">
              <span className="text-4xl font-mono font-extrabold tracking-[0.2em] text-brand-700">
                {successModal.joinCode}
              </span>
            </div>
            
            <Button onClick={handleContinue} className="w-full">
              Continue to Questions
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreateExam;
