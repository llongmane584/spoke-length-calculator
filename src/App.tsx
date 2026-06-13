import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Save, Trash2, Languages, FileJson, FileUp, Sun, Moon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useToast } from './hooks/useToast';
import { useTheme } from './hooks/useTheme';
import { ConfirmDialog } from './components/ConfirmDialog';
import { HelpButton } from './components/HelpButton';
import { HelpModal, type HelpTopic } from './components/HelpModal';
import CompareWheels, { type WheelOption } from './components/CompareWheels';

// Dynamic import of preset data
const presetModules = import.meta.glob('./presets/*.json', { eager: true });

// Type definitions
interface Inputs {
  erd: string;
  pitchCircleLeft: string;
  pitchCircleRight: string;
  flangeDistanceLeft: string;
  flangeDistanceRight: string;
  spokeHoleDiameter: string;
  numberOfSpokes: string;
  crossingsLeft: string;
  crossingsRight: string;
}

interface Results {
  left: number;
  right: number;
}

interface SavedCalculation {
  id: number;
  name: string;
  inputs: Inputs;
  results: Results;
  timestamp: string;
}

interface PresetData {
  inputs: Inputs;
  results: Results;
  timestamp: string;
  metadata: {
    calculator: string;
    version: string;
  };
  displayName?: string;
  category?: string;
  description?: string;
}

interface PresetOption {
  id: string;
  name: string;
  data: PresetData;
}

type InputField = keyof Inputs;
type NumericInputField = Exclude<InputField, 'numberOfSpokes' | 'crossingsLeft' | 'crossingsRight'>;
type FieldErrors = Partial<Record<InputField, string>>;
type TouchedFields = Partial<Record<InputField, boolean>>;

interface ParsedInputs {
  erd: number;
  pitchCircleLeft: number;
  pitchCircleRight: number;
  flangeDistanceLeft: number;
  flangeDistanceRight: number;
  spokeHoleDiameter: number;
  numberOfSpokes: number;
  crossingsLeft: number;
  crossingsRight: number;
}

interface CalculationState {
  fieldErrors: FieldErrors;
  results: Results | null;
}

const inputFields = [
  'erd',
  'pitchCircleLeft',
  'pitchCircleRight',
  'flangeDistanceLeft',
  'flangeDistanceRight',
  'spokeHoleDiameter',
  'numberOfSpokes',
  'crossingsLeft',
  'crossingsRight',
] as const satisfies readonly InputField[];

const COMPACT_VIEWPORT_QUERY = '(max-width: 639px)';

const getIsCompactViewport = () =>
  typeof window !== 'undefined' && window.matchMedia(COMPACT_VIEWPORT_QUERY).matches;

const numericFieldRules: Record<NumericInputField, { min: number; max: number; rangeError: string }> = {
  erd: { min: 1, max: 1000, rangeError: 'validation.rangeErd' },
  pitchCircleLeft: { min: 1, max: 100, rangeError: 'validation.rangeStandard' },
  pitchCircleRight: { min: 1, max: 100, rangeError: 'validation.rangeStandard' },
  flangeDistanceLeft: { min: 1, max: 100, rangeError: 'validation.rangeStandard' },
  flangeDistanceRight: { min: 1, max: 100, rangeError: 'validation.rangeStandard' },
  spokeHoleDiameter: { min: 1, max: 3, rangeError: 'validation.rangeSpokeHole' },
};

const decimalPattern = /^(?:\d+|\d+\.\d*|\.\d+)$/;
const spokeCountOptions = ['24', '28', '32', '36'];
const crossingOptions = ['0', '1', '2', '3', '4'];

const createTouchedFields = (value: boolean): TouchedFields => (
  inputFields.reduce<TouchedFields>((acc, field) => {
    acc[field] = value;
    return acc;
  }, {})
);

const isRecord = (value: unknown): value is Record<string, unknown> => (
  typeof value === 'object' && value !== null && !Array.isArray(value)
);

const normalizeInputValue = (value: unknown): string | null => {
  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }

  return null;
};

const normalizeInputs = (value: unknown): Inputs | null => {
  if (!isRecord(value)) {
    return null;
  }

  const normalized: Partial<Inputs> = {};

  for (const field of inputFields) {
    const normalizedValue = normalizeInputValue(value[field]);

    if (normalizedValue === null) {
      return null;
    }

    normalized[field] = normalizedValue;
  }

  return normalized as Inputs;
};

const normalizeResults = (value: unknown): Results | null => {
  if (!isRecord(value)) {
    return null;
  }

  const { left, right } = value;

  if (typeof left !== 'number' || typeof right !== 'number') {
    return null;
  }

  if (!Number.isFinite(left) || !Number.isFinite(right)) {
    return null;
  }

  return { left, right };
};

const parseNumericField = (field: NumericInputField, rawValue: string): { value: number | null; error?: string } => {
  const trimmedValue = rawValue.trim();
  const rule = numericFieldRules[field];

  if (trimmedValue === '') {
    return { value: null, error: 'validation.required' };
  }

  if (!decimalPattern.test(trimmedValue)) {
    return { value: null, error: 'validation.invalidNumber' };
  }

  const value = Number(trimmedValue);

  if (!Number.isFinite(value)) {
    return { value: null, error: 'validation.invalidNumber' };
  }

  if (value < rule.min || value > rule.max) {
    return { value: null, error: rule.rangeError };
  }

  return { value };
};

const parseSelectField = (
  rawValue: string,
  options: readonly string[],
  invalidError: string,
): { value: number | null; error?: string } => {
  const trimmedValue = rawValue.trim();

  if (trimmedValue === '') {
    return { value: null, error: 'validation.selectRequired' };
  }

  if (!options.includes(trimmedValue)) {
    return { value: null, error: invalidError };
  }

  const value = Number(trimmedValue);

  if (!Number.isInteger(value) || !Number.isFinite(value)) {
    return { value: null, error: invalidError };
  }

  return { value };
};

const validateInputs = (inputs: Inputs): { parsed: ParsedInputs | null; fieldErrors: FieldErrors } => {
  const fieldErrors: FieldErrors = {};
  const parsed: Partial<ParsedInputs> = {};

  for (const field of Object.keys(numericFieldRules) as NumericInputField[]) {
    const result = parseNumericField(field, inputs[field]);

    if (result.error !== undefined || result.value === null) {
      fieldErrors[field] = result.error || 'validation.invalidNumber';
      continue;
    }

    parsed[field] = result.value;
  }

  const spokeCount = parseSelectField(inputs.numberOfSpokes, spokeCountOptions, 'validation.selectSpokeCount');
  if (spokeCount.error !== undefined || spokeCount.value === null) {
    fieldErrors.numberOfSpokes = spokeCount.error || 'validation.selectSpokeCount';
  } else {
    parsed.numberOfSpokes = spokeCount.value;
  }

  const crossingsLeft = parseSelectField(inputs.crossingsLeft, crossingOptions, 'validation.selectCrossings');
  if (crossingsLeft.error !== undefined || crossingsLeft.value === null) {
    fieldErrors.crossingsLeft = crossingsLeft.error || 'validation.selectCrossings';
  } else {
    parsed.crossingsLeft = crossingsLeft.value;
  }

  const crossingsRight = parseSelectField(inputs.crossingsRight, crossingOptions, 'validation.selectCrossings');
  if (crossingsRight.error !== undefined || crossingsRight.value === null) {
    fieldErrors.crossingsRight = crossingsRight.error || 'validation.selectCrossings';
  } else {
    parsed.crossingsRight = crossingsRight.value;
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { parsed: null, fieldErrors };
  }

  const completeParsed = parsed as ParsedInputs;

  if (completeParsed.numberOfSpokes <= 0 || completeParsed.numberOfSpokes % 2 !== 0) {
    return {
      parsed: null,
      fieldErrors: {
        numberOfSpokes: 'validation.selectSpokeCount',
      },
    };
  }

  return { parsed: completeParsed, fieldErrors };
};

const calculateSpokeResults = (inputs: ParsedInputs): Results | null => {
  const spokesPerSide = inputs.numberOfSpokes / 2;

  if (!Number.isFinite(spokesPerSide) || spokesPerSide <= 0) {
    return null;
  }

  const calculateLength = (pitchCircle: number, flangeDistance: number, crossings: number): number | null => {
    const flangeRadius = pitchCircle / 2;
    const rimRadius = inputs.erd / 2;
    const theta = (2 * Math.PI * crossings) / spokesPerSide;

    if (!Number.isFinite(theta)) {
      return null;
    }

    const projectedLengthSquared = (
      flangeRadius * flangeRadius
      + rimRadius * rimRadius
      - 2 * flangeRadius * rimRadius * Math.cos(theta)
    );

    if (!Number.isFinite(projectedLengthSquared) || projectedLengthSquared < -1e-9) {
      return null;
    }

    const projectedLength = Math.sqrt(Math.max(0, projectedLengthSquared));
    const length = Math.sqrt(projectedLength * projectedLength + flangeDistance * flangeDistance)
      - inputs.spokeHoleDiameter / 2;
    const roundedLength = Math.floor(length * 10) / 10;

    if (!Number.isFinite(roundedLength) || roundedLength <= 0) {
      return null;
    }

    return roundedLength;
  };

  const left = calculateLength(inputs.pitchCircleLeft, inputs.flangeDistanceLeft, inputs.crossingsLeft);
  const right = calculateLength(inputs.pitchCircleRight, inputs.flangeDistanceRight, inputs.crossingsRight);

  if (left === null || right === null) {
    return null;
  }

  return { left, right };
};

const getCalculationState = (inputs: Inputs): CalculationState => {
  const validation = validateInputs(inputs);

  if (validation.parsed === null) {
    return {
      fieldErrors: validation.fieldErrors,
      results: null,
    };
  }

  const results = calculateSpokeResults(validation.parsed);

  if (results === null) {
    return {
      fieldErrors: {
        erd: 'validation.calculationUnavailable',
      },
      results: null,
    };
  }

  return {
    fieldErrors: {},
    results,
  };
};

const normalizeSavedCalculation = (value: unknown): SavedCalculation | null => {
  if (!isRecord(value)) {
    return null;
  }

  const { id, name, inputs, timestamp } = value;
  const normalizedInputs = normalizeInputs(inputs);

  if (
    typeof id !== 'number'
    || !Number.isFinite(id)
    || typeof name !== 'string'
    || typeof timestamp !== 'string'
    || normalizedInputs === null
  ) {
    return null;
  }

  const calculation = getCalculationState(normalizedInputs);

  if (calculation.results === null) {
    return null;
  }

  return {
    id,
    name,
    inputs: normalizedInputs,
    results: calculation.results,
    timestamp,
  };
};

const getControlClassName = (hasError: boolean, className?: string): string => (
  [
    'w-full px-3 py-2 border rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:border-transparent transition-colors',
    hasError
      ? 'border-red-500 dark:border-red-500 bg-red-50/40 dark:bg-red-950/20 focus:ring-red-500'
      : 'border-slate-300 dark:border-slate-600 focus:ring-blue-500',
    className || '',
  ].join(' ')
);

const FieldError: React.FC<{ id: string; message?: string }> = ({ id, message }) => {
  const hasMessage = message !== undefined;

  return (
    <p
      id={id}
      aria-hidden={!hasMessage}
      aria-live="polite"
      className={[
        'mt-1 h-5 overflow-hidden whitespace-nowrap text-xs leading-5 text-red-600 dark:text-red-400 sm:text-sm',
        hasMessage ? '' : 'invisible',
      ].join(' ')}
    >
      {message}
    </p>
  );
};

// Regular number input component
interface NumberInputProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  step: number;
  min?: number;
  max?: number;
  error?: string;
  placeholder?: string;
  className?: string;
}

const NumberInput: React.FC<NumberInputProps> = ({
  id,
  value,
  onChange,
  onBlur,
  step,
  min,
  max,
  error,
  placeholder,
  className,
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;

    // Allow empty string as is
    if (newValue === '') {
      onChange(newValue);
      return;
    }

    // Allow just decimal point (during input)
    if (newValue === '.') {
      onChange(newValue);
      return;
    }

    // Allow decimal point at the end of number (e.g., "2.")
    if (newValue.endsWith('.') && !isNaN(parseFloat(newValue.slice(0, -1)))) {
      onChange(newValue);
      return;
    }

    const numValue = parseFloat(newValue);

    // Reject changes if not a number
    if (isNaN(numValue)) {
      return;
    }

    onChange(newValue);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const currentValue = e.target.value;
    onBlur?.();

    // Do nothing for empty string or decimal point only
    if (currentValue === '' || currentValue === '.') {
      return;
    }

    const numValue = parseFloat(currentValue);

    // When valid as number and step is 0.1 (for Spoke Hole Diameter)
    if (!isNaN(numValue) && step === 0.1) {
      // Display to 1 decimal place
      onChange(numValue.toFixed(1));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Allow numbers, decimal point, backspace, delete, arrow keys, tab and other control keys
    const allowedKeys = [
      'Backspace', 'Delete', 'Tab', 'Escape', 'Enter',
      'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
      'Home', 'End'
    ];

    if (allowedKeys.includes(e.key)) {
      return;
    }

    // Allow shortcuts like Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
    if (e.ctrlKey || e.metaKey) {
      return;
    }

    // Reject anything other than numbers and decimal point
    if (!/^[0-9.]$/.test(e.key)) {
      e.preventDefault();
      return;
    }

    // Check for duplicate decimal points
    if (e.key === '.' && value.includes('.')) {
      e.preventDefault();
      return;
    }

  };

  return (
    <input
      id={id}
      type="number"
      step={step}
      min={min}
      max={max}
      value={value}
      onChange={handleChange}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      aria-invalid={error !== undefined}
      aria-describedby={error !== undefined ? `${id}-error` : undefined}
      className={getControlClassName(error !== undefined, className)}
      placeholder={placeholder}
    />
  );
};

const SpokeLengthCalculator: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { showToast } = useToast();
  const { theme, toggleTheme } = useTheme();
  const [isCompactViewport, setIsCompactViewport] = useState(getIsCompactViewport);
  const [inputs, setInputs] = useState<Inputs>({
    erd: '',
    pitchCircleLeft: '',
    pitchCircleRight: '',
    flangeDistanceLeft: '',
    flangeDistanceRight: '',
    spokeHoleDiameter: '2.6', // Hope Pro 5 value as default (author's personal preference)
    numberOfSpokes: '32', // Generally 32 spokes is common,
    crossingsLeft: '3', // 3-cross is also typical
    crossingsRight: '3' // 3-cross is also typical
  });

  const [savedCalculations, setSavedCalculations] = useState<SavedCalculation[]>([]);
  const [calculationName, setCalculationName] = useState('');
  const [showJsonOutput, setShowJsonOutput] = useState(false);
  const [jsonData, setJsonData] = useState('');
  const [selectedPreset, setSelectedPreset] = useState<string>('');
  const [presetOptions, setPresetOptions] = useState<PresetOption[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [calculationToDelete, setCalculationToDelete] = useState<number | null>(null);
  const [helpTopic, setHelpTopic] = useState<HelpTopic | null>(null);
  const [touchedFields, setTouchedFields] = useState<TouchedFields>({});
  const savedCalculationsLoadedRef = useRef(false);
  const compareSectionRef = useRef<HTMLDivElement>(null);
  const [showCompare, setShowCompare] = useState(false);
  const [compareA, setCompareA] = useState('');
  const [compareB, setCompareB] = useState('');

  const calculation = useMemo(() => getCalculationState(inputs), [inputs]);
  const currentResults = calculation.results;
  const visibleFieldErrors = useMemo(() => {
    const errors: Partial<Record<InputField, string>> = {};

    for (const field of inputFields) {
      const errorKey = calculation.fieldErrors[field];

      if (errorKey !== undefined && (touchedFields[field] || inputs[field] !== '')) {
        errors[field] = t(errorKey);
      }
    }

    return errors;
  }, [calculation.fieldErrors, inputs, t, touchedFields]);
  const hasValidResults = currentResults !== null;

  const wheelOptions = useMemo((): WheelOption[] => {
    const presetItems: WheelOption[] = presetOptions.map(p => ({
      id: `preset:${p.id}`,
      label: p.name,
      group: 'preset',
      spec: {
        label: p.name,
        leftLength: p.data.results.left,
        rightLength: p.data.results.right,
        spokeCount: parseInt(p.data.inputs.numberOfSpokes, 10) || 32,
      },
    }));
    const savedItems: WheelOption[] = savedCalculations.map(s => ({
      id: `saved:${s.id}`,
      label: s.name,
      group: 'saved',
      spec: {
        label: s.name,
        leftLength: s.results.left,
        rightLength: s.results.right,
        spokeCount: parseInt(s.inputs.numberOfSpokes, 10) || 32,
      },
    }));
    return [...presetItems, ...savedItems];
  }, [presetOptions, savedCalculations]);

  const titleText = t(isCompactViewport ? 'titleShort' : 'title');
  const resultsLeftText = t(isCompactViewport ? 'results.leftShort' : 'results.left');
  const resultsRightText = t(isCompactViewport ? 'results.rightShort' : 'results.right');
  const calculationNamePlaceholder = t(
    isCompactViewport ? 'results.namePlaceholderShort' : 'results.namePlaceholder'
  );

  const markFieldTouched = (field: InputField) => {
    setTouchedFields(prev => ({ ...prev, [field]: true }));
  };

  useEffect(() => {
    if (showCompare) {
      compareSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [showCompare]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const mediaQuery = window.matchMedia(COMPACT_VIEWPORT_QUERY);
    const handleChange = (event: MediaQueryListEvent) => {
      setIsCompactViewport(event.matches);
    };

    setIsCompactViewport(mediaQuery.matches);
    mediaQuery.addEventListener('change', handleChange);

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  // Dynamically load preset data
  useEffect(() => {
    const loadPresets = async () => {
      const presets: PresetOption[] = [];
      let hasError = false;

      for (const [path, module] of Object.entries(presetModules)) {
        try {
          const data = module as PresetData;

          const normalizedInputs = normalizeInputs(data.inputs);
          const normalizedResults = normalizeResults(data.results);

          if (normalizedInputs === null || normalizedResults === null) {
            console.error(`Invalid preset format in ${path}: missing or invalid required fields`);
            hasError = true;
            continue;
          }

          const presetCalculation = getCalculationState(normalizedInputs);

          if (presetCalculation.results === null) {
            console.error(`Invalid preset format in ${path}: preset inputs cannot be calculated`);
            hasError = true;
            continue;
          }

          // Generate ID from filename
          const fileName = path.split('/').pop()?.replace('.json', '') || '';
          
          // Determine display name (use displayName if available, otherwise format filename)
          const displayName = data.displayName || fileName
            .replace(/-/g, ' ')
            .replace(/_/g, ' ')
            .replace(/\b\w/g, char => char.toUpperCase());

          presets.push({
            id: fileName,
            name: displayName,
            data: {
              ...data,
              inputs: normalizedInputs,
              results: presetCalculation.results,
            },
          });
        } catch (error) {
          console.error(`Failed to load preset from ${path}:`, error);
          hasError = true;
        }
      }

      setPresetOptions(presets);
      
      // Show toast notification if there were errors
      if (hasError) {
        showToast(t('alerts.presetLoadError'), 'error');
      }
    };

    loadPresets();
  }, [showToast, t]);

  // Language switch handler
  const handleLanguageChange = (lang: string) => {
    i18n.changeLanguage(lang);
    try {
      localStorage.setItem('preferredLanguage', lang);
    } catch (error) {
      console.error('Failed to save language preference:', error);
    }
    document.documentElement.lang = lang;
  };

  // Keep lang attribute in sync with i18n language
  useEffect(() => {
    document.documentElement.lang = i18n.language;
  }, [i18n.language]);

  // Load saved calculations from local storage
  useEffect(() => {
    if (savedCalculationsLoadedRef.current) {
      return;
    }

    savedCalculationsLoadedRef.current = true;

    try {
      const saved = localStorage.getItem('spokeCalculations');

      if (!saved) {
        return;
      }

      const parsed: unknown = JSON.parse(saved);

      if (!Array.isArray(parsed)) {
        throw new Error('Saved calculations must be an array');
      }

      const normalized = parsed
        .map(normalizeSavedCalculation)
        .filter((calculation): calculation is SavedCalculation => calculation !== null);

      setSavedCalculations(normalized);

      if (normalized.length !== parsed.length) {
        showToast(t('alerts.savedDataLoadFailed'), 'warning');
      }
    } catch (error) {
      console.warn('Failed to load saved calculations:', error);
      setSavedCalculations([]);
      showToast(t('alerts.savedDataLoadFailed'), 'error');
    }
  }, [showToast, t]);

  // Update input values
  const handleInputChange = (field: keyof Inputs, value: string) => {
    setInputs(prev => ({ ...prev, [field]: value }));
    setTouchedFields(prev => ({ ...prev, [field]: true }));
    setSelectedPreset('');
  };

  // Save calculation results
  const saveCalculation = () => {
    if (!calculationName.trim()) {
      showToast(t('alerts.enterCalculationName'), 'warning');
      return;
    }

    if (currentResults === null) {
      showToast(t('alerts.performCalculationFirst'), 'warning');
      return;
    }

    const newCalculation: SavedCalculation = {
      id: Date.now(),
      name: calculationName,
      inputs: { ...inputs },
      results: { ...currentResults },
      timestamp: new Date().toLocaleString('ja-JP')
    };

    const updated = [...savedCalculations, newCalculation];
    try {
      localStorage.setItem('spokeCalculations', JSON.stringify(updated));
    } catch (error) {
      console.error('Failed to save calculation:', error);
      showToast(t('alerts.saveFailed'), 'error');
      return;
    }

    setSavedCalculations(updated);
    setCalculationName('');
    showToast(t('alerts.saved'), 'success');
  };

  // Load saved calculation
  const loadCalculation = (calculation: SavedCalculation) => {
    setInputs(calculation.inputs);
    setTouchedFields(createTouchedFields(true));
    setSelectedPreset('');
  };

  // Load preset
  const loadPreset = (presetId: string) => {
    if (presetId === '') {
      setSelectedPreset('');
      return;
    }
    
    const preset = presetOptions.find(p => p.id === presetId);
    if (preset) {
      setInputs(preset.data.inputs);
      setTouchedFields({});
      setSelectedPreset(presetId);
    }
  };

  // Delete saved calculation
  const deleteCalculation = (id: number) => {
    setCalculationToDelete(id);
    setShowDeleteConfirm(true);
  };

  // Confirm deletion
  const confirmDelete = () => {
    if (calculationToDelete !== null) {
      const updated = savedCalculations.filter(calc => calc.id !== calculationToDelete);
      try {
        localStorage.setItem('spokeCalculations', JSON.stringify(updated));
      } catch (error) {
        console.error('Failed to delete calculation:', error);
        showToast(t('alerts.deleteFailed'), 'error');
        return;
      }

      setSavedCalculations(updated);
      showToast(t('alerts.deleted'), 'success');
    }
    setShowDeleteConfirm(false);
    setCalculationToDelete(null);
  };

  // Cancel deletion
  const cancelDelete = () => {
    setShowDeleteConfirm(false);
    setCalculationToDelete(null);
  };

  // JSON export
  const exportToJSON = () => {
    if (currentResults === null) {
      showToast(t('alerts.performCalculationFirst'), 'warning');
      return;
    }

    const exportData = {
      inputs,
      results: currentResults,
      timestamp: new Date().toISOString(),
      metadata: {
        calculator: 'Bicycle Spoke Length Calculator',
        version: '1.0'
      }
    };

    const jsonString = JSON.stringify(exportData, null, 2);
    setJsonData(jsonString);
    setShowJsonOutput(true);
  };

  // Copy JSON data to clipboard
  const copyToClipboard = () => {
    if (!navigator.clipboard) {
      showToast(t('alerts.copyFailed'), 'error');
      return;
    }

    navigator.clipboard.writeText(jsonData).then(() => {
      showToast(t('alerts.copiedToClipboard'), 'success');
    }).catch(() => {
      showToast(t('alerts.copyFailed'), 'error');
    });
  };

  // Download JSON data as file
  const downloadJSON = () => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `spoke-calculation-${timestamp}.json`;

    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showToast(t('alerts.jsonDownloaded'), 'success');
  };

  // Load from JSON file
  const loadFromJSON = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e: ProgressEvent<FileReader>) => {
      try {
        if (e.target && typeof e.target.result === 'string') {
          const parsed: unknown = JSON.parse(e.target.result);

          if (!isRecord(parsed)) {
            showToast(t('alerts.invalidJsonFormat'), 'error');
            return;
          }

          const normalizedInputs = normalizeInputs(parsed.inputs);

          if (normalizedInputs !== null) {
            setInputs(normalizedInputs);
            setTouchedFields(createTouchedFields(true));
            setSelectedPreset('');

            const importedCalculation = getCalculationState(normalizedInputs);
            showToast(
              importedCalculation.results === null
                ? t('alerts.jsonLoadedWithValidationErrors')
                : t('alerts.jsonLoaded'),
              importedCalculation.results === null ? 'warning' : 'success',
            );
          } else {
            showToast(t('alerts.invalidJsonFormat'), 'error');
          }
        }
      } catch {
        showToast(t('alerts.jsonLoadFailed'), 'error');
      }
    };
    reader.onerror = () => {
      showToast(t('alerts.jsonLoadFailed'), 'error');
    };
    reader.readAsText(file);

    // Reset file selection
    event.target.value = '';
  };

  return (
    <div className="min-h-screen p-4 sm:p-6 md:p-8 dark:bg-slate-900 transition-colors">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-slate-100">
            {titleText}
            <span className="block sm:inline text-base sm:text-lg font-normal text-slate-600 dark:text-slate-400"></span>
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            title={t('theme.toggle')}
          >
            {theme === 'dark' ? (
              <Sun className="w-5 h-5 text-slate-600 dark:text-slate-300" />
            ) : (
              <Moon className="w-5 h-5 text-slate-600 dark:text-slate-300" />
            )}
          </button>
          <div className="flex items-center gap-2">
            <Languages className="w-5 h-5 text-slate-600 dark:text-slate-400" />
            <select
              value={i18n.language}
              onChange={(e) => handleLanguageChange(e.target.value)}
              className="px-3 py-1 border border-slate-300 dark:border-slate-600 rounded-md text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="en">English</option>
              <option value="ja">日本語</option>
            </select>
          </div>
        </div>
      </div>

      {/* Single column vertical layout */}
      <div className="flex flex-col gap-10">
        {/* Input section */}
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-600 pb-2">{t('input.heading')}</h2>

          <div className="space-y-4">
            {/* Preset selection - only show if presets exist */}
            {presetOptions.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">{t('input.preset')}</label>
                <select
                  value={selectedPreset}
                  onChange={(e) => loadPreset(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">{t('input.presetOption')}</option>
                  {presetOptions.map((preset) => (
                    <option key={preset.id} value={preset.id}>
                      {preset.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <div className="flex items-center gap-1 mb-1">
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-400">{t('input.erd')}</label>
                <HelpButton topic="erd" onOpen={setHelpTopic} />
              </div>
              <NumberInput
                id="erd"
                value={inputs.erd}
                onChange={(value) => handleInputChange('erd', value)}
                onBlur={() => markFieldTouched('erd')}
                step={1}
                min={1}
                max={1000}
                error={visibleFieldErrors.erd}
                placeholder={t('input.erdPlaceholder')}
              />
              <FieldError id="erd-error" message={visibleFieldErrors.erd} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <div className="flex items-center gap-1 mb-1">
                  <label className="block text-sm font-medium text-slate-600 dark:text-slate-400">
                    <span className="md:hidden">{t('input.pcdLeft')}</span>
                    <span className="hidden md:block">{t('input.pcdLeft')}</span>
                  </label>
                  <HelpButton topic="pcd" onOpen={setHelpTopic} />
                </div>
                <NumberInput
                  id="pitchCircleLeft"
                  value={inputs.pitchCircleLeft}
                  onChange={(value) => handleInputChange('pitchCircleLeft', value)}
                  onBlur={() => markFieldTouched('pitchCircleLeft')}
                  step={1}
                  min={1}
                  max={100}
                  error={visibleFieldErrors.pitchCircleLeft}
                  placeholder={t('input.flangeLeftPlaceholder')}
                />
                <FieldError id="pitchCircleLeft-error" message={visibleFieldErrors.pitchCircleLeft} />
              </div>
              <div>
                <div className="flex items-center gap-1 mb-1">
                  <label className="block text-sm font-medium text-slate-600 dark:text-slate-400">
                    <span className="md:hidden">{t('input.pcdRight')}</span>
                    <span className="hidden md:block">{t('input.pcdRight')}</span>
                  </label>
                  <HelpButton topic="pcd" onOpen={setHelpTopic} />
                </div>
                <NumberInput
                  id="pitchCircleRight"
                  value={inputs.pitchCircleRight}
                  onChange={(value) => handleInputChange('pitchCircleRight', value)}
                  onBlur={() => markFieldTouched('pitchCircleRight')}
                  step={1}
                  min={1}
                  max={100}
                  error={visibleFieldErrors.pitchCircleRight}
                  placeholder={t('input.flangeRightPlaceholder')}
                />
                <FieldError id="pitchCircleRight-error" message={visibleFieldErrors.pitchCircleRight} />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <div className="flex items-center gap-1 mb-1">
                  <label className="block text-sm font-medium text-slate-600 dark:text-slate-400">{t('input.flangeDistanceLeft')}</label>
                  <HelpButton topic="flangeDistance" onOpen={setHelpTopic} />
                </div>
                <NumberInput
                  id="flangeDistanceLeft"
                  value={inputs.flangeDistanceLeft}
                  onChange={(value) => handleInputChange('flangeDistanceLeft', value)}
                  onBlur={() => markFieldTouched('flangeDistanceLeft')}
                  step={1}
                  min={1}
                  max={100}
                  error={visibleFieldErrors.flangeDistanceLeft}
                  placeholder={t('input.flangeLeftPlaceholder')}
                />
                <FieldError id="flangeDistanceLeft-error" message={visibleFieldErrors.flangeDistanceLeft} />
              </div>
              <div>
                <div className="flex items-center gap-1 mb-1">
                  <label className="block text-sm font-medium text-slate-600 dark:text-slate-400">{t('input.flangeDistanceRight')}</label>
                  <HelpButton topic="flangeDistance" onOpen={setHelpTopic} />
                </div>
                <NumberInput
                  id="flangeDistanceRight"
                  value={inputs.flangeDistanceRight}
                  onChange={(value) => handleInputChange('flangeDistanceRight', value)}
                  onBlur={() => markFieldTouched('flangeDistanceRight')}
                  step={1}
                  min={1}
                  max={100}
                  error={visibleFieldErrors.flangeDistanceRight}
                  placeholder={t('input.flangeRightPlaceholder')}
                />
                <FieldError id="flangeDistanceRight-error" message={visibleFieldErrors.flangeDistanceRight} />
              </div>
            </div>

            <div>
              <div className="flex items-center gap-1 mb-1">
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-400">{t('input.spokeHoleDiameter')}</label>
                <HelpButton topic="spokeHoleDiameter" onOpen={setHelpTopic} />
              </div>
              <NumberInput
                id="spokeHoleDiameter"
                value={inputs.spokeHoleDiameter}
                onChange={(value) => handleInputChange('spokeHoleDiameter', value)}
                onBlur={() => markFieldTouched('spokeHoleDiameter')}
                step={0.1}
                min={1.0}
                max={3.0}
                error={visibleFieldErrors.spokeHoleDiameter}
                placeholder={t('input.spokeHolePlaceholder')}
              />
              <FieldError id="spokeHoleDiameter-error" message={visibleFieldErrors.spokeHoleDiameter} />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">{t('input.numberOfSpokes')}</label>
              <select
                id="numberOfSpokes"
                value={inputs.numberOfSpokes}
                onChange={(e) => handleInputChange('numberOfSpokes', e.target.value)}
                onBlur={() => markFieldTouched('numberOfSpokes')}
                aria-invalid={visibleFieldErrors.numberOfSpokes !== undefined}
                aria-describedby={visibleFieldErrors.numberOfSpokes !== undefined ? 'numberOfSpokes-error' : undefined}
                className={getControlClassName(visibleFieldErrors.numberOfSpokes !== undefined)}
              >
                <option value="">{t('input.selectOption')}</option>
                <option value="24">24</option>
                <option value="28">28</option>
                <option value="32">32</option>
                <option value="36">36</option>
              </select>
              <FieldError id="numberOfSpokes-error" message={visibleFieldErrors.numberOfSpokes} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <div className="flex items-center gap-1 mb-1">
                  <label className="block text-sm font-medium text-slate-600 dark:text-slate-400">{t('input.crossingsLeft')}</label>
                  <HelpButton topic="crossings" onOpen={setHelpTopic} />
                </div>
                <select
                  id="crossingsLeft"
                  value={inputs.crossingsLeft}
                  onChange={(e) => handleInputChange('crossingsLeft', e.target.value)}
                  onBlur={() => markFieldTouched('crossingsLeft')}
                  aria-invalid={visibleFieldErrors.crossingsLeft !== undefined}
                  aria-describedby={visibleFieldErrors.crossingsLeft !== undefined ? 'crossingsLeft-error' : undefined}
                  className={getControlClassName(visibleFieldErrors.crossingsLeft !== undefined)}
                >
                  <option value="">{t('input.selectOption')}</option>
                  <option value="0">{t('input.radialLacing')}</option>
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="3">3</option>
                  <option value="4">4</option>
                </select>
                <FieldError id="crossingsLeft-error" message={visibleFieldErrors.crossingsLeft} />
              </div>
              <div>
                <div className="flex items-center gap-1 mb-1">
                  <label className="block text-sm font-medium text-slate-600 dark:text-slate-400">{t('input.crossingsRight')}</label>
                  <HelpButton topic="crossings" onOpen={setHelpTopic} />
                </div>
                <select
                  id="crossingsRight"
                  value={inputs.crossingsRight}
                  onChange={(e) => handleInputChange('crossingsRight', e.target.value)}
                  onBlur={() => markFieldTouched('crossingsRight')}
                  aria-invalid={visibleFieldErrors.crossingsRight !== undefined}
                  aria-describedby={visibleFieldErrors.crossingsRight !== undefined ? 'crossingsRight-error' : undefined}
                  className={getControlClassName(visibleFieldErrors.crossingsRight !== undefined)}
                >
                  <option value="">{t('input.selectOption')}</option>
                  <option value="0">{t('input.radialLacing')}</option>
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="3">3</option>
                  <option value="4">4</option>
                </select>
                <FieldError id="crossingsRight-error" message={visibleFieldErrors.crossingsRight} />
              </div>
            </div>
          </div>
        </div>

        {/* Results and save section */}
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-600 pb-2">{t('results.heading')}</h2>
          <div
            className={[
              'rounded-lg border p-5 transition-colors sm:p-6',
              currentResults !== null
                ? 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800'
                : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-600',
            ].join(' ')}
          >
            <div className="grid min-h-24 w-full grid-cols-2 items-center gap-3 text-center sm:min-h-20 sm:gap-4">
              {currentResults !== null ? (
                <>
                  <div>
                    <h3 className="text-base font-semibold text-slate-700 dark:text-slate-300 sm:text-lg">{resultsLeftText}</h3>
                    <p className="text-2xl font-bold leading-tight text-blue-800 dark:text-blue-400 sm:text-3xl">
                      {currentResults.left.toFixed(1)} mm
                    </p>
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-slate-700 dark:text-slate-300 sm:text-lg">{resultsRightText}</h3>
                    <p className="text-2xl font-bold leading-tight text-blue-800 dark:text-blue-400 sm:text-3xl">
                      {currentResults.right.toFixed(1)} mm
                    </p>
                  </div>
                </>
              ) : (
                <p className="col-span-2 text-sm text-slate-500 dark:text-slate-400 sm:text-base">
                  {t('results.placeholder')}
                </p>
              )}
            </div>
          </div>

          {/* Save and export */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">{t('results.calculationName')}</label>
              <input
                type="text"
                value={calculationName}
                onChange={(e) => setCalculationName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder={calculationNamePlaceholder}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={saveCalculation}
                disabled={!hasValidResults}
                className="bg-blue-700 dark:bg-blue-800 hover:bg-blue-800 dark:hover:bg-blue-900 disabled:bg-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed dark:disabled:bg-slate-700 dark:disabled:text-slate-400 text-white font-medium py-2 px-4 rounded-md transition-colors duration-200 flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" />
                {t('buttons.save')}
              </button>
              <button
                onClick={exportToJSON}
                disabled={!hasValidResults}
                className="bg-slate-600 dark:bg-slate-700 hover:bg-slate-700 dark:hover:bg-slate-800 disabled:bg-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed dark:disabled:bg-slate-700 dark:disabled:text-slate-400 text-white font-medium py-2 px-4 rounded-md transition-colors duration-200 flex items-center justify-center gap-2"
              >
                <FileJson className="w-4 h-4" />
                <span className="sm:hidden">{t('buttons.jsonShort')}</span>
                <span className="hidden sm:inline">{t('buttons.jsonDisplay')}</span>
              </button>
            </div>
            {/* Load JSON file */}
            <div className="mt-3">
              <label className="block">
                <input
                  type="file"
                  accept=".json"
                  onChange={loadFromJSON}
                  className="hidden"
                />
                <span className="w-full bg-slate-600 dark:bg-slate-700 hover:bg-slate-700 dark:hover:bg-slate-800 text-white font-medium py-2 px-4 rounded-md transition-colors duration-200 flex items-center justify-center gap-2 cursor-pointer">
                  <FileUp className="w-4 h-4" />
                  {t('buttons.loadJson')}
                </span>
              </label>
            </div>
          </div>

          {/* List of saved calculations */}
          {savedCalculations.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-3">{t('results.savedCalculations')}</h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {savedCalculations.map((calc) => (
                  <div key={calc.id} className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3 flex items-center justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-slate-700 dark:text-slate-300">{calc.name}</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">{calc.timestamp}</p>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        {resultsLeftText}: {calc.results.left !== null ? calc.results.left.toFixed(1) : '-'}mm / {resultsRightText}: {calc.results.right !== null ? calc.results.right.toFixed(1) : '-'}mm
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => loadCalculation(calc)}
                        className="text-blue-700 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 text-sm font-medium"
                      >
                        {t('buttons.load')}
                      </button>
                      <button
                        onClick={() => deleteCalculation(calc.id)}
                        className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Wheel compare section */}
      <div ref={compareSectionRef} className="mt-10">
        <button
          onClick={() => setShowCompare(prev => !prev)}
          className="w-full flex items-center justify-between px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-700/50 text-slate-700 dark:text-slate-300 font-medium transition-colors"
        >
          <span>{t('compare.toggle')}</span>
          <span className="text-slate-400 dark:text-slate-500">{showCompare ? '▲' : '▼'}</span>
        </button>
        {showCompare && (
          <div className="mt-4 rounded-lg border border-slate-200 dark:border-slate-600 p-5">
            <h2 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-4">{t('compare.heading')}</h2>
            <CompareWheels
              options={wheelOptions}
              selectedA={compareA}
              selectedB={compareB}
              onChangeA={setCompareA}
              onChangeB={setCompareB}
            />
          </div>
        )}
      </div>

      {/* JSON data display modal */}
      {showJsonOutput && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300">{t('results.jsonOutput')}</h3>
              <button
                onClick={() => setShowJsonOutput(false)}
                className="text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 text-xl leading-none"
              >
                ✕
              </button>
            </div>
            <textarea
              value={jsonData}
              readOnly
              className="w-full flex-1 min-h-64 p-3 border border-slate-300 dark:border-slate-600 rounded-md text-sm font-mono bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 resize-none mb-4"
            />
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={copyToClipboard}
                className="bg-slate-600 dark:bg-slate-700 hover:bg-slate-700 dark:hover:bg-slate-800 text-white py-2 px-4 rounded-md transition-colors duration-200 flex items-center gap-2 w-full sm:w-auto justify-center"
              >
                {t('buttons.copyToClipboard')}
              </button>
              <button
                onClick={downloadJSON}
                className="bg-blue-700 dark:bg-blue-800 hover:bg-blue-800 dark:hover:bg-blue-900 text-white py-2 px-4 rounded-md transition-colors duration-200 flex items-center gap-2 w-full sm:w-auto justify-center"
              >
                <FileJson className="w-4 h-4" />
                {t('buttons.downloadJson')}
              </button>
              <button
                onClick={() => setShowJsonOutput(false)}
                className="bg-slate-500 dark:bg-slate-600 hover:bg-slate-600 dark:hover:bg-slate-700 text-white py-2 px-4 rounded-md transition-colors duration-200 w-full sm:w-auto justify-center"
              >
                {t('buttons.close')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation dialog */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
        title={t('dialog.deleteConfirm.title')}
        message={t('dialog.deleteConfirm.message')}
      />

      {/* Help modal */}
      <HelpModal topic={helpTopic} onClose={() => setHelpTopic(null)} />
    </div>
  );
};

export default SpokeLengthCalculator;
