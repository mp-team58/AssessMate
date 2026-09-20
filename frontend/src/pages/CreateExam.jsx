import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useNavigate } from 'react-router-dom';
import { createExam } from '../services/examService';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Select from '../components/ui/Select';
import { Code2, HelpCircle } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';

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
  scheduledHour: yup.string().required('Hour is required'),
  scheduledMinute: yup.string().required('Minute is required'),
  gracePeriodMinutes: yup.number().typeError('Must be a number').min(0).integer().required('Grace period is required'),
  easyPercent: yup.number().typeError('Must be a number').min(0).max(100).required(),
  mediumPercent: yup.number().typeError('Must be a number').min(0).max(100).required(),
  hardPercent: yup.number().typeError('Must be a number').min(0).max(100).required(),
  totalQuestions: yup.number().typeError('Must be a number').positive().integer().required('Required'),
  passingPercentage: yup.number().typeError('Must be a number').min(0).max(100).required('Passing percentage is required'),
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
  hasCodingSection: yup.boolean(),
  codingDurationMinutes: yup.number().typeError('Must be a number').when('hasCodingSection', {
    is: true,
    then: (s) => s.positive('Must be > 0').integer().required('Coding duration is required'),
    otherwise: (s) => s.notRequired().nullable()
  }),
  codingQuestionsCount: yup.number().typeError('Must be a number').when('hasCodingSection', {
    is: true,
    then: (s) => s.min(1, 'Must be at least 1 problem').integer().required('Problems per candidate is required'),
    otherwise: (s) => s.notRequired().nullable()
  }),
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
  const [successModal, setSuccessModal] = useState(null); // { joinCode, examId }
  const navigate = useNavigate();
  const { showToast } = useToast();

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm({
    resolver: yupResolver(schema),
    mode: 'onChange',
    defaultValues: {
      scheduledHour: '10',
      scheduledMinute: '00',
      timerType: 'WHOLE_EXAM',
      deviceAccess: 'BOTH',
      negativeMark: false,
      easyPercent: 40,
      mediumPercent: 40,
      hardPercent: 20,
      totalQuestions: 30,
      passingPercentage: 50.0,
      durationMinutes: 90,
      gracePeriodMinutes: 10,
      easyMark: 1.0,
      mediumMark: 2.0,
      hardMark: 3.0,
      easyNegative: 0.25,
      mediumNegative: 0.50,
      hardNegative: 1.00,
      easySeconds: 30,
      mediumSeconds: 60,
      hardSeconds: 90,
      hasCodingSection: false,
      codingDurationMinutes: 45,
      codingQuestionsCount: 2,
    }
  });

  const timerType = watch('timerType');
  const negativeMarkEnabled = watch('negativeMark');
  const hasCodingSection = watch('hasCodingSection');
  
  const easyPct = watch('easyPercent') || 0;
  const medPct = watch('mediumPercent') || 0;
  const hardPct = watch('hardPercent') || 0;
  const pctSum = Number(easyPct) + Number(medPct) + Number(hardPct);

  const onSubmit = async (data) => {
    setIsLoading(true);
    try {
      // Format to "YYYY-MM-DDTHH:mm:ss"
      const scheduledStart = `${data.scheduledDate}T${data.scheduledHour}:${data.scheduledMinute}:00`;

      const payload = {
        title: data.title,
        subject: data.subject,
        scheduledStart: scheduledStart,
        gracePeriodMinutes: Number(data.gracePeriodMinutes),
        timerType: data.timerType,
        durationMinutes: data.timerType === 'WHOLE_EXAM' ? Number(data.durationMinutes) : null,
        totalQuestions: Number(data.totalQuestions),
        passingPercentage: Number(data.passingPercentage),
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
        deviceAccess: data.deviceAccess,
        hasCodingSection: Boolean(data.hasCodingSection),
        codingDurationMinutes: data.hasCodingSection ? Number(data.codingDurationMinutes) : null,
        codingQuestionsCount: data.hasCodingSection ? Number(data.codingQuestionsCount) : null
      };

      const response = await createExam(payload);
      
      // Show success modal
      setSuccessModal({
        joinCode: response.data.joinCode,
        examId: response.data.id
      });
      showToast('Exam created successfully!', 'success');
      
    } catch (err) {
      showToast(err.response?.data?.message || err.message || 'Failed to create exam', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleContinue = () => {
    if (successModal) {
      localStorage.setItem('currentExamId', successModal.examId);
      navigate(`/host/exams/${successModal.examId}/questions`);
    }
  };

  return (
    <div className="w-full h-full font-sans relative z-10 flex flex-col">
      <header className="mb-8">
        <button onClick={() => navigate('/host/dashboard')} className="text-brand-600 hover:text-brand-700 mb-4 flex items-center gap-2 font-bold text-sm transition-colors bg-brand-50 px-3 py-1.5 rounded-lg w-fit hover:bg-brand-100">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Dashboard
        </button>
        <h1 className="text-3xl md:text-4xl font-extrabold text-secondary-800 tracking-tight">Create New Exam</h1>
        <p className="text-secondary-500 mt-2 text-lg">Configure your assessment details and structure.</p>
      </header>

      <div className="bg-white rounded-3xl p-6 lg:p-10 shadow-sm border border-secondary-200/80 w-full flex-1">

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-10">
            {/* General Info */}
            <div className="bg-secondary-50/50 p-6 rounded-2xl border border-secondary-200">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-brand-100 text-brand-600 rounded-lg">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-secondary-800">1. General Information</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pl-12">
                <Input label="Exam Title" placeholder="e.g. Java Basics Quiz" {...register('title')} error={errors.title} />
                <Input label="Subject" placeholder="e.g. Java Programming" {...register('subject')} error={errors.subject} />
                <Input label="Passing Percentage (%)" type="number" step="0.1" min="0" max="100" placeholder="e.g. 50" {...register('passingPercentage')} error={errors.passingPercentage} />
              </div>
            </div>

            {/* Timing & Access */}
            <div className="bg-secondary-50/50 p-6 rounded-2xl border border-secondary-200">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-secondary-800">2. Timing & Access</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pl-12">
                <Input type="date" label="Scheduled Date" {...register('scheduledDate')} error={errors.scheduledDate} />
                
                <div>
                  <label className="block text-[14px] font-semibold text-secondary-800 mb-2">Scheduled Time</label>
                  <div className="flex items-start gap-2">
                    <Select 
                      className="flex-1 !mb-0" 
                      value={watch('scheduledHour')}
                      onChange={(val) => setValue('scheduledHour', val, { shouldValidate: true })}
                      error={errors.scheduledHour}
                      options={Array.from({ length: 24 }, (_, i) => ({ value: i.toString().padStart(2, '0'), label: i.toString().padStart(2, '0') }))} 
                    />
                    <span className="text-xl font-bold text-secondary-400 mt-2">:</span>
                    <Select 
                      className="flex-1 !mb-0" 
                      value={watch('scheduledMinute')}
                      onChange={(val) => setValue('scheduledMinute', val, { shouldValidate: true })}
                      error={errors.scheduledMinute}
                      options={Array.from({ length: 60 }, (_, i) => ({ value: i.toString().padStart(2, '0'), label: i.toString().padStart(2, '0') }))} 
                    />
                  </div>
                </div>
                
                <Select 
                  label="Timer Type" 
                  value={watch('timerType')}
                  onChange={(val) => setValue('timerType', val, { shouldValidate: true })} 
                  error={errors.timerType}
                  options={[
                    { value: 'WHOLE_EXAM', label: 'Whole Exam (Single Timer)' },
                    { value: 'PER_QUESTION', label: 'Per Question (Individual Timers)' },
                  ]} 
                />
                
                {timerType === 'WHOLE_EXAM' && (
                  <Input type="number" label="Duration (Minutes)" {...register('durationMinutes')} error={errors.durationMinutes} />
                )}
                
                <Input type="number" label="Grace Period (Minutes)" {...register('gracePeriodMinutes')} error={errors.gracePeriodMinutes} />
                <Select 
                  label="Device Access" 
                  value={watch('deviceAccess')}
                  onChange={(val) => setValue('deviceAccess', val, { shouldValidate: true })} 
                  error={errors.deviceAccess}
                  options={[
                    { value: 'BOTH', label: 'Desktop & Mobile' },
                    { value: 'DESKTOP', label: 'Desktop Only' },
                    { value: 'MOBILE', label: 'Mobile Only' },
                  ]} 
                />
              </div>
            </div>

            {/* Structure & Grading */}
            <div className="bg-secondary-50/50 p-6 rounded-2xl border border-secondary-200">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-secondary-800">3. Structure & Grading</h2>
              </div>
              
              <div className="pl-12">
                <div className="mb-6 bg-white p-5 rounded-xl border border-secondary-200 shadow-sm">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-secondary-800">Difficulty Distribution (%)</h3>
                    <div className="text-sm font-bold bg-secondary-100 px-3 py-1 rounded-full text-secondary-600">
                      Total: <span className={pctSum === 100 ? 'text-green-600' : 'text-red-500'}>{pctSum}%</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <Input type="number" label="Easy (%)" {...register('easyPercent')} error={errors.easyPercent} />
                    <Input type="number" label="Medium (%)" {...register('mediumPercent')} error={errors.mediumPercent} />
                    <Input type="number" label="Hard (%)" {...register('hardPercent')} error={errors.hardPercent} />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Input type="number" label="Total Questions" {...register('totalQuestions')} error={errors.totalQuestions} />
                  
                  <div className="flex items-center mt-8">
                    <label className="flex items-center cursor-pointer group">
                      <div className="relative">
                        <input type="checkbox" className="sr-only" {...register('negativeMark')} />
                        <div className={`block w-14 h-8 rounded-full transition-colors ${negativeMarkEnabled ? 'bg-brand-500' : 'bg-secondary-300 group-hover:bg-secondary-400'}`}></div>
                        <div className={`absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${negativeMarkEnabled ? 'transform translate-x-6' : ''}`}></div>
                      </div>
                      <span className="ml-3 font-semibold text-secondary-800">Enable Negative Marking</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Coding Section */}
            <div className="bg-secondary-50/50 p-6 rounded-2xl border border-secondary-200">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-brand-100 text-brand-600 rounded-lg">
                  <Code2 className="w-5 h-5" />
                </div>
                <h2 className="text-xl font-bold text-secondary-800">Coding Section</h2>
              </div>
              <div className="pl-12">
                <div className="p-5 bg-white rounded-xl border border-secondary-200 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-3 cursor-pointer font-bold text-secondary-800">
                      <input type="checkbox" {...register('hasCodingSection')} className="w-5 h-5 text-brand-600 rounded border-secondary-300 focus:ring-brand-500" />
                      <div className="flex items-center gap-1.5">
                        <Code2 className="w-4 h-4 text-brand-600" />
                        <span>Enable Coding Section</span>
                      </div>
                    </label>
                  </div>

                  {hasCodingSection && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-secondary-200/80 animate-in fade-in duration-200">
                      <div>
                        <label className="block text-xs font-bold text-secondary-700 mb-1.5">
                          Coding Duration (Minutes)
                        </label>
                        <Input
                          type="number"
                          placeholder="e.g. 45"
                          {...register('codingDurationMinutes')}
                          error={errors.codingDurationMinutes}
                          containerClassName="!mb-0"
                          className="py-2 px-3 text-sm"
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="text-xs font-bold text-secondary-700">
                            Problems per Candidate
                          </label>
                          <div className="group relative cursor-pointer" title="Number of problems randomly assigned to each candidate from your exam pool.">
                            <HelpCircle className="w-3.5 h-3.5 text-secondary-400 hover:text-brand-600 transition-colors" />
                            <div className="absolute right-0 bottom-full mb-1.5 hidden group-hover:block w-52 p-2 bg-secondary-900 text-white text-[11px] rounded-lg shadow-lg z-20 pointer-events-none">
                              Number of problems randomly assigned to each candidate from your exam pool.
                            </div>
                          </div>
                        </div>
                        <Input
                          type="number"
                          min="1"
                          placeholder="e.g. 2"
                          {...register('codingQuestionsCount')}
                          error={errors.codingQuestionsCount}
                          containerClassName="!mb-0"
                          className="py-2 px-3 text-sm"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Per-Question Settings */}
            <div className="bg-secondary-50/50 p-6 rounded-2xl border border-secondary-200">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-amber-100 text-amber-600 rounded-lg">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-secondary-800">4. Per-Question Settings</h2>
              </div>
              
              <div className="pl-12 grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Easy Questions Block */}
                <div className="bg-white p-5 rounded-xl border border-secondary-200 shadow-sm hover:shadow-md hover:border-green-300 transition-all">
                  <h3 className="font-bold text-green-700 mb-4 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-green-500"></span>
                    Easy Questions
                  </h3>
                  <div className="space-y-4">
                    <Input type="number" step="0.1" label="Marks" {...register('easyMark')} error={errors.easyMark} />
                    {negativeMarkEnabled && (
                      <Input type="number" step="0.1" label="Negative Marks" {...register('easyNegative')} error={errors.easyNegative} />
                    )}
                    {timerType === 'PER_QUESTION' && (
                      <Input type="number" label="Time (Seconds)" {...register('easySeconds')} error={errors.easySeconds} />
                    )}
                  </div>
                </div>

                {/* Medium Questions Block */}
                <div className="bg-white p-5 rounded-xl border border-secondary-200 shadow-sm hover:shadow-md hover:border-yellow-300 transition-all">
                  <h3 className="font-bold text-yellow-600 mb-4 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-yellow-400"></span>
                    Medium Questions
                  </h3>
                  <div className="space-y-4">
                    <Input type="number" step="0.1" label="Marks" {...register('mediumMark')} error={errors.mediumMark} />
                    {negativeMarkEnabled && (
                      <Input type="number" step="0.1" label="Negative Marks" {...register('mediumNegative')} error={errors.mediumNegative} />
                    )}
                    {timerType === 'PER_QUESTION' && (
                      <Input type="number" label="Time (Seconds)" {...register('mediumSeconds')} error={errors.mediumSeconds} />
                    )}
                  </div>
                </div>

                {/* Hard Questions Block */}
                <div className="bg-white p-5 rounded-xl border border-secondary-200 shadow-sm hover:shadow-md hover:border-red-300 transition-all">
                  <h3 className="font-bold text-red-600 mb-4 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
                    Hard Questions
                  </h3>
                  <div className="space-y-4">
                    <Input type="number" step="0.1" label="Marks" {...register('hardMark')} error={errors.hardMark} />
                    {negativeMarkEnabled && (
                      <Input type="number" step="0.1" label="Negative Marks" {...register('hardNegative')} error={errors.hardNegative} />
                    )}
                    {timerType === 'PER_QUESTION' && (
                      <Input type="number" label="Time (Seconds)" {...register('hardSeconds')} error={errors.hardSeconds} />
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <Button type="submit" disabled={isLoading || pctSum !== 100} className="w-full md:w-auto px-8 py-3 text-lg">
                {isLoading ? 'Creating...' : 'Create Exam'}
              </Button>
            </div>
          </form>
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
