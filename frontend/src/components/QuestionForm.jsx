import React, { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import Button from './ui/Button';
import Input from './ui/Input';
import Select from './ui/Select';
import { Upload, X } from 'lucide-react';

const schema = yup.object().shape({
  questionText: yup.string().required('Question text is required'),
  type: yup.string().required('Question type is required'),
  difficulty: yup.string().required('Difficulty is required'),
  topic: yup.string(),
  optionA: yup.string().when('type', {
    is: (val) => val === 'SINGLE_CHOICE' || val === 'MULTIPLE_SELECT',
    then: (schema) => schema.required('Option A is required'),
    otherwise: (schema) => schema.notRequired(),
  }),
  optionB: yup.string().when('type', {
    is: (val) => val === 'SINGLE_CHOICE' || val === 'MULTIPLE_SELECT',
    then: (schema) => schema.required('Option B is required'),
    otherwise: (schema) => schema.notRequired(),
  }),
  optionC: yup.string().when('type', {
    is: (val) => val === 'SINGLE_CHOICE' || val === 'MULTIPLE_SELECT',
    then: (schema) => schema.required('Option C is required'),
    otherwise: (schema) => schema.notRequired(),
  }),
  optionD: yup.string().when('type', {
    is: (val) => val === 'SINGLE_CHOICE' || val === 'MULTIPLE_SELECT',
    then: (schema) => schema.required('Option D is required'),
    otherwise: (schema) => schema.notRequired(),
  }),
  correctAnswerText: yup.string().when('type', {
    is: 'FILL_BLANK',
    then: (schema) => schema.required('Correct answer is required'),
    otherwise: (schema) => schema.notRequired(),
  }),
  correctAnswerNumber: yup.number()
    .nullable()
    .transform((value, originalValue) => String(originalValue).trim() === '' ? null : value)
    .typeError('Must be a number')
    .when('type', {
      is: 'NUMERICAL',
      then: (schema) => schema.required('Correct answer is required'),
      otherwise: (schema) => schema.notRequired(),
    }),
  tolerance: yup.number()
    .nullable()
    .transform((value, originalValue) => String(originalValue).trim() === '' ? null : value)
    .typeError('Must be a number')
    .when('type', {
      is: 'NUMERICAL',
      then: (schema) => schema.default(0),
      otherwise: (schema) => schema.notRequired(),
    }),
  explanation: yup.string(),
});

const QuestionForm = ({ initialData, onSubmit, onCancel, isLoading, isExamContext = false, examId }) => {
  const [imageFile, setImageFile] = useState(null);
  const [existingImageUrl, setExistingImageUrl] = useState(initialData?.imageUrl || null);

  // Custom states for answers that don't map cleanly to simple inputs
  const [singleChoiceAnswer, setSingleChoiceAnswer] = useState(initialData?.correctAnswer || 'A');
  const [multipleChoiceAnswers, setMultipleChoiceAnswers] = useState(
    initialData?.correctAnswer ? initialData.correctAnswer.split(',') : []
  );
  const [saveToBank, setSaveToBank] = useState(initialData?.saveToBank || false);

  const { register, handleSubmit, control, watch, formState: { errors } } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      questionText: initialData?.questionText || '',
      type: initialData?.type || 'SINGLE_CHOICE',
      difficulty: initialData?.difficulty || 'EASY',
      topic: initialData?.topic || '',
      optionA: initialData?.optionA || '',
      optionB: initialData?.optionB || '',
      optionC: initialData?.optionC || '',
      optionD: initialData?.optionD || '',
      correctAnswerText: initialData?.type === 'FILL_BLANK' ? initialData.correctAnswer : '',
      correctAnswerNumber: initialData?.type === 'NUMERICAL' ? Number(initialData.correctAnswer) : '',
      tolerance: initialData?.tolerance || 0,
      explanation: initialData?.explanation || '',
    },
  });

  const questionType = watch('type');

  const handleFormSubmit = (data) => {
    let correctAnswer = '';

    if (questionType === 'SINGLE_CHOICE') {
      correctAnswer = singleChoiceAnswer;
    } else if (questionType === 'MULTIPLE_SELECT') {
      if (multipleChoiceAnswers.length === 0) {
        alert("Please select at least one correct answer.");
        return;
      }
      correctAnswer = multipleChoiceAnswers.sort().join(',');
    } else if (questionType === 'FILL_BLANK') {
      correctAnswer = data.correctAnswerText;
    } else if (questionType === 'NUMERICAL') {
      correctAnswer = String(data.correctAnswerNumber);
    }

    const payload = {
      questionText: data.questionText,
      type: data.type,
      difficulty: data.difficulty,
      topic: data.topic,
      correctAnswer,
      explanation: data.explanation,
    };

    if (questionType === 'SINGLE_CHOICE' || questionType === 'MULTIPLE_SELECT') {
      payload.optionA = data.optionA;
      payload.optionB = data.optionB;
      payload.optionC = data.optionC;
      payload.optionD = data.optionD;
    }

    if (questionType === 'MULTIPLE_SELECT') {
      payload.strictMarking = true;
    }

    if (questionType === 'NUMERICAL') {
      payload.tolerance = data.tolerance;
    }

    if (isExamContext) {
      payload.saveToBank = saveToBank;
    }

    const formData = new FormData();
    
    // Wrap JSON payload in a Blob with type application/json
    const payloadBlob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
    formData.append('data', payloadBlob);
    
    if (imageFile) {
      formData.append('image', imageFile);
    }

    onSubmit(formData);
  };

  const toggleMultipleChoice = (option) => {
    setMultipleChoiceAnswers(prev =>
      prev.includes(option) ? prev.filter(item => item !== option) : [...prev, option]
    );
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">

      <div>
        <label className="block text-[14px] font-semibold text-secondary-800 mb-2">Question Text</label>
        <textarea
          {...register('questionText')}
          className={`w-full px-4 py-3 text-[15px] bg-white border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all shadow-sm ${errors.questionText ? 'border-red-400 focus:ring-red-500' : 'border-secondary-300 hover:border-brand-400'
            }`}
          rows={3}
        />
        {errors.questionText && <p className="mt-1.5 text-[13px] font-medium text-red-500">{errors.questionText.message}</p>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Controller
          name="type"
          control={control}
          render={({ field }) => (
            <Select
              label="Question Type"
              options={[
                { value: 'SINGLE_CHOICE', label: 'Single Choice' },
                { value: 'MULTIPLE_SELECT', label: 'Multiple Select' },
                { value: 'FILL_BLANK', label: 'Fill in the Blank' },
                { value: 'NUMERICAL', label: 'Numerical' },
              ]}
              value={field.value}
              onChange={field.onChange}
              error={errors.type}
            />
          )}
        />

        <Controller
          name="difficulty"
          control={control}
          render={({ field }) => (
            <Select
              label="Difficulty"
              options={[
                { value: 'EASY', label: 'Easy' },
                { value: 'MEDIUM', label: 'Medium' },
                { value: 'HARD', label: 'Hard' },
              ]}
              value={field.value}
              onChange={field.onChange}
              error={errors.difficulty}
            />
          )}
        />
      </div>

      <Input
        label="Topic (Optional)"
        {...register('topic')}
        error={errors.topic}
      />

      {(questionType === 'SINGLE_CHOICE' || questionType === 'MULTIPLE_SELECT') && (
        <div className="space-y-4 border p-4 rounded-xl bg-gray-50 border-gray-200">
          <h4 className="font-semibold text-gray-700">Options</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Option A" {...register('optionA')} error={errors.optionA} />
            <Input label="Option B" {...register('optionB')} error={errors.optionB} />
            <Input label="Option C" {...register('optionC')} error={errors.optionC} />
            <Input label="Option D" {...register('optionD')} error={errors.optionD} />
          </div>

          <div className="mt-4">
            <label className="block text-[14px] font-semibold text-secondary-800 mb-2">Select Correct Answer(s)</label>
            {questionType === 'SINGLE_CHOICE' ? (
              <div className="flex gap-4">
                {['A', 'B', 'C', 'D'].map(opt => (
                  <label key={opt} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="singleChoiceAnswer"
                      value={opt}
                      checked={singleChoiceAnswer === opt}
                      onChange={() => setSingleChoiceAnswer(opt)}
                      className="w-5 h-5 text-brand-600 focus:ring-brand-500"
                    />
                    <span className="font-medium">{opt}</span>
                  </label>
                ))}
              </div>
            ) : (
              <div className="flex gap-4">
                {['A', 'B', 'C', 'D'].map(opt => (
                  <label key={opt} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={multipleChoiceAnswers.includes(opt)}
                      onChange={() => toggleMultipleChoice(opt)}
                      className="w-5 h-5 rounded text-brand-600 focus:ring-brand-500"
                    />
                    <span className="font-medium">{opt}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {questionType === 'FILL_BLANK' && (
        <Input
          label="Correct Answer"
          {...register('correctAnswerText')}
          error={errors.correctAnswerText}
        />
      )}

      {questionType === 'NUMERICAL' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Correct Answer (Number)"
            type="number"
            {...register('correctAnswerNumber')}
            error={errors.correctAnswerNumber}
          />
          <Input
            label="Tolerance (e.g. 0.5)"
            type="number"
            step="0.01"
            {...register('tolerance')}
            error={errors.tolerance}
          />
        </div>
      )}

      <div>
        <label className="block text-[14px] font-semibold text-secondary-800 mb-2">Explanation (Optional)</label>
        <textarea
          {...register('explanation')}
          className="w-full px-4 py-3 text-[15px] bg-white border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 border-secondary-300"
          rows={2}
        />
      </div>

      <div>
        <label className="block text-[14px] font-semibold text-secondary-800 mb-2">Image (Optional)</label>
        
        {imageFile || existingImageUrl ? (
          <div className="relative inline-block w-full h-48 border border-gray-200 rounded-xl overflow-hidden bg-gray-50 group">
            <img 
              src={imageFile ? URL.createObjectURL(imageFile) : (existingImageUrl.startsWith('http') ? existingImageUrl : `https://08k7867x-8080.inc1.devtunnels.ms${existingImageUrl.startsWith('/') ? '' : '/'}${existingImageUrl}`)} 
              alt="Preview" 
              className="w-full h-full object-contain p-2"
            />
            <button
              type="button"
              onClick={() => {
                setImageFile(null);
                setExistingImageUrl(null);
              }}
              className="absolute top-3 right-3 p-1.5 bg-white shadow-sm border border-gray-200 text-red-600 rounded-lg hover:bg-red-50 hover:text-red-700 transition-colors opacity-100 group-hover:opacity-100 z-10"
              title="Remove image"
            >
              <X className="w-4 h-4 font-bold" />
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-center w-full">
            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <Upload className="w-8 h-8 text-gray-400 mb-2" />
                <p className="text-sm text-gray-500">
                  <span className="font-semibold">Click to upload</span> or drag and drop
                </p>
              </div>
              <input
                type="file"
                className="hidden"
                accept="image/*"
                onChange={(e) => {
                  if (e.target.files?.[0]) setImageFile(e.target.files[0]);
                }}
              />
            </label>
          </div>
        )}
      </div>

      {isExamContext && !initialData && (
        <div className="flex items-center gap-2 mt-4 p-3 bg-brand-50 rounded-lg border border-brand-100">
          <input
            type="checkbox"
            id="saveToBank"
            checked={saveToBank}
            onChange={(e) => setSaveToBank(e.target.checked)}
            className="w-5 h-5 text-brand-600 rounded border-brand-300 focus:ring-brand-500"
          />
          <label htmlFor="saveToBank" className="font-medium text-brand-800 cursor-pointer">
            Also save to my global Question Bank
          </label>
        </div>
      )}

      <div className="flex justify-end gap-3 pt-4 border-t">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" isLoading={isLoading}>
          {initialData ? 'Update Question' : 'Save Question'}
        </Button>
      </div>

    </form>
  );
};

export default QuestionForm;
