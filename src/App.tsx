import React, { useState, useEffect } from 'react';
import { Save, Trash2, Calculator, Languages, FileJson, FileUp, Sun, Moon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useToast } from './hooks/useToast';
import { useTheme } from './hooks/useTheme';
import { ConfirmDialog } from './components/ConfirmDialog';

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
  left: number | null;
  right: number | null;
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

// Regular number input component
interface NumberInputProps {
  value: string;
  onChange: (value: string) => void;
  step: number;
  min?: number;
  max?: number;
  placeholder?: string;
  className?: string;
}

const NumberInput: React.FC<NumberInputProps> = ({ value, onChange, step, min, max, placeholder, className }) => {
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

    // Apply min/max limits (but allow during input)
    if (min !== undefined && numValue < min) {
      // Apply limit only if not in the middle of input
      if (!newValue.endsWith('.') && newValue.length > 1) {
        onChange(min.toString());
        return;
      }
    }

    if (max !== undefined && numValue > max) {
      // Apply limit only if not in the middle of input
      if (!newValue.endsWith('.') && newValue.length > 1) {
        onChange(max.toString());
        return;
      }
    }

    onChange(newValue);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const currentValue = e.target.value;

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
      type="number"
      step={step}
      min={min}
      max={max}
      value={value}
      onChange={handleChange}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      className={`w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500 focus:border-transparent ${className || ''}`}
      placeholder={placeholder}
    />
  );
};

const SpokeLengthCalculator: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { showToast } = useToast();
  const { theme, toggleTheme } = useTheme();
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

  const [results, setResults] = useState<Results>({ left: null, right: null });
  const [savedCalculations, setSavedCalculations] = useState<SavedCalculation[]>([]);
  const [calculationName, setCalculationName] = useState('');
  const [showJsonOutput, setShowJsonOutput] = useState(false);
  const [jsonData, setJsonData] = useState('');
  const [selectedPreset, setSelectedPreset] = useState<string>('');
  const [presetOptions, setPresetOptions] = useState<PresetOption[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [calculationToDelete, setCalculationToDelete] = useState<number | null>(null);

  // Dynamically load preset data
  useEffect(() => {
    const loadPresets = async () => {
      const presets: PresetOption[] = [];
      let hasError = false;

      for (const [path, module] of Object.entries(presetModules)) {
        try {
          const data = module as PresetData;
          
          // Validate required fields
          if (!data.inputs || !data.results) {
            console.error(`Invalid preset format in ${path}: missing required fields`);
            hasError = true;
            continue;
          }

          // Detailed validation of input data
          const requiredInputs = ['erd', 'pitchCircleLeft', 'pitchCircleRight', 
                                  'flangeDistanceLeft', 'flangeDistanceRight', 
                                  'spokeHoleDiameter', 'numberOfSpokes', 
                                  'crossingsLeft', 'crossingsRight'];
          
          const missingFields = requiredInputs.filter(field => !data.inputs[field as keyof Inputs]);
          if (missingFields.length > 0) {
            console.error(`Invalid preset format in ${path}: missing input fields: ${missingFields.join(', ')}`);
            hasError = true;
            continue;
          }

          // Validate result data
          if (typeof data.results.left !== 'number' || typeof data.results.right !== 'number') {
            console.error(`Invalid preset format in ${path}: results must contain numeric left and right values`);
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
            data: data
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
    localStorage.setItem('preferredLanguage', lang);
  };

  // Load saved calculations from local storage
  useEffect(() => {
    const saved = localStorage.getItem('spokeCalculations');
    if (saved) {
      setSavedCalculations(JSON.parse(saved));
    }
  }, []);

  // Update input values
  const handleInputChange = (field: keyof Inputs, value: string) => {
    setInputs(prev => ({ ...prev, [field]: value }));
  };

  // Spoke length calculation (industry standard formula)
  const calculateSpokeLength = () => {
    const {
      erd, pitchCircleLeft, pitchCircleRight, flangeDistanceLeft, flangeDistanceRight,
      spokeHoleDiameter, numberOfSpokes, crossingsLeft, crossingsRight
    } = inputs;

    // Check if all values are entered
    if (!erd || !pitchCircleLeft || !pitchCircleRight || !flangeDistanceLeft ||
      !flangeDistanceRight || !spokeHoleDiameter || !numberOfSpokes ||
      !crossingsLeft || !crossingsRight) {
      showToast(t('alerts.fillAllFields'), 'warning');
      return;
    }

    const erdNum = parseFloat(erd);
    const pclNum = parseFloat(pitchCircleLeft);
    const pcrNum = parseFloat(pitchCircleRight);
    const fdlNum = parseFloat(flangeDistanceLeft);
    const fdrNum = parseFloat(flangeDistanceRight);
    const shdNum = parseFloat(spokeHoleDiameter);
    const spokesNum = parseInt(numberOfSpokes);
    const intlNum = parseInt(crossingsLeft);
    const intrNum = parseInt(crossingsRight);

    // Calculate spoke length in 2D + 3D
    const calculateLength = (pitchCircle: number, flangeDistance: number, crossings: number) => {
      // Step 1: Calculate third side using cosine theorem (2D)
      const A = pitchCircle / 2; // Flange radius from spoke hole
      const B = erdNum / 2; // Rim radius
      const spokesPerSide = spokesNum / 2;
      const theta = (2 * Math.PI * crossings) / spokesPerSide; // Radians

      // Cosine theorem: C = √(A² + B² - 2AB cos θ)
      const C = Math.sqrt(A * A + B * B - 2 * A * B * Math.cos(theta));

      // Step 2: Calculate spoke length using Pythagorean theorem (3D)
      // L = √(C² + w²) - d/2
      // Flange distance
      const w = flangeDistance;
      // Spoke hole diameter
      const d = shdNum;

      const length = Math.sqrt(C * C + w * w) - d / 2;

      // Round down to 0.1mm
      return Math.floor(length * 10) / 10;
    };

    const leftLength = calculateLength(pclNum, fdlNum, intlNum);
    const rightLength = calculateLength(pcrNum, fdrNum, intrNum);

    setResults({ left: leftLength, right: rightLength });
  };

  // Save calculation results
  const saveCalculation = () => {
    if (!calculationName.trim()) {
      showToast(t('alerts.enterCalculationName'), 'warning');
      return;
    }

    if (results.left === null || results.right === null) {
      showToast(t('alerts.performCalculationFirst'), 'warning');
      return;
    }

    const newCalculation: SavedCalculation = {
      id: Date.now(),
      name: calculationName,
      inputs: { ...inputs },
      results: { ...results },
      timestamp: new Date().toLocaleString('ja-JP')
    };

    const updated = [...savedCalculations, newCalculation];
    setSavedCalculations(updated);
    localStorage.setItem('spokeCalculations', JSON.stringify(updated));
    setCalculationName('');
    showToast(t('alerts.saved'), 'success');
  };

  // Load saved calculation
  const loadCalculation = (calculation: SavedCalculation) => {
    setInputs(calculation.inputs);
    setResults(calculation.results);
  };

  // Load preset
  const loadPreset = (presetId: string) => {
    if (presetId === '') {
      // Do nothing if preset selection is cleared
      return;
    }
    
    const preset = presetOptions.find(p => p.id === presetId);
    if (preset) {
      setInputs(preset.data.inputs);
      setResults(preset.data.results);
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
      setSavedCalculations(updated);
      localStorage.setItem('spokeCalculations', JSON.stringify(updated));
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
    if (results.left === null || results.right === null) {
      showToast(t('alerts.performCalculationFirst'), 'warning');
      return;
    }

    const exportData = {
      inputs,
      results,
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
          const jsonData = JSON.parse(e.target.result);
          // Check JSON data format
          if (jsonData.inputs && jsonData.results) {
            setInputs(jsonData.inputs);
            setResults(jsonData.results);
            showToast(t('alerts.jsonLoaded'), 'success');
          } else {
            showToast(t('alerts.invalidJsonFormat'), 'error');
          }
        }
      } catch {
        showToast(t('alerts.jsonLoadFailed'), 'error');
      }
    };
    reader.readAsText(file);

    // Reset file selection
    event.target.value = '';
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-slate-100 dark:bg-slate-900 min-h-screen transition-colors">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <Calculator className="w-8 h-8 text-slate-700 dark:text-slate-300" />
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-slate-100">
              {t('title')}
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
                className="px-3 py-1 border border-slate-300 dark:border-slate-600 rounded-md text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500 focus:border-transparent"
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
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500 focus:border-transparent"
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
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">{t('input.erd')}</label>
                <NumberInput
                  value={inputs.erd}
                  onChange={(value) => handleInputChange('erd', value)}
                  step={1}
                  min={1}
                  max={1000}
                  placeholder={t('input.erdPlaceholder')}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
                    <span className="md:hidden">{t('input.pcdLeft')}</span>
                    <span className="hidden md:block">{t('input.pcdLeft')}</span>
                  </label>
                  <NumberInput
                    value={inputs.pitchCircleLeft}
                    onChange={(value) => handleInputChange('pitchCircleLeft', value)}
                    step={1}
                    min={1}
                    max={100}
                    placeholder={t('input.flangeLeftPlaceholder')}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
                    <span className="md:hidden">{t('input.pcdRight')}</span>
                    <span className="hidden md:block">{t('input.pcdRight')}</span>
                  </label>
                  <NumberInput
                    value={inputs.pitchCircleRight}
                    onChange={(value) => handleInputChange('pitchCircleRight', value)}
                    step={1}
                    min={1}
                    max={100}
                    placeholder={t('input.flangeRightPlaceholder')}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">{t('input.flangeDistanceLeft')}</label>
                  <NumberInput
                    value={inputs.flangeDistanceLeft}
                    onChange={(value) => handleInputChange('flangeDistanceLeft', value)}
                    step={1}
                    min={1}
                    max={100}
                    placeholder={t('input.flangeLeftPlaceholder')}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">{t('input.flangeDistanceRight')}</label>
                  <NumberInput
                    value={inputs.flangeDistanceRight}
                    onChange={(value) => handleInputChange('flangeDistanceRight', value)}
                    step={1}
                    min={1}
                    max={100}
                    placeholder={t('input.flangeRightPlaceholder')}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">{t('input.spokeHoleDiameter')}</label>
                <NumberInput
                  value={inputs.spokeHoleDiameter !== '' && !isNaN(parseFloat(inputs.spokeHoleDiameter))
                    ? parseFloat(inputs.spokeHoleDiameter).toFixed(1)
                    : inputs.spokeHoleDiameter}
                  onChange={(value) => handleInputChange('spokeHoleDiameter', value)}
                  step={0.1}
                  min={1.0}
                  max={3.0}
                  placeholder={t('input.spokeHolePlaceholder')}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">{t('input.numberOfSpokes')}</label>
                <select
                  value={inputs.numberOfSpokes}
                  onChange={(e) => handleInputChange('numberOfSpokes', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                >
                  <option value="">{t('input.selectOption')}</option>
                  <option value="24">24</option>
                  <option value="28">28</option>
                  <option value="32">32</option>
                  <option value="36">36</option>
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">{t('input.crossingsLeft')}</label>
                  <select
                    value={inputs.crossingsLeft}
                    onChange={(e) => handleInputChange('crossingsLeft', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  >
                    <option value="">{t('input.selectOption')}</option>
                    <option value="0">{t('input.radialLacing')}</option>
                    <option value="1">1</option>
                    <option value="2">2</option>
                    <option value="3">3</option>
                    <option value="4">4</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">{t('input.crossingsRight')}</label>
                  <select
                    value={inputs.crossingsRight}
                    onChange={(e) => handleInputChange('crossingsRight', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  >
                    <option value="">{t('input.selectOption')}</option>
                    <option value="0">{t('input.radialLacing')}</option>
                    <option value="1">1</option>
                    <option value="2">2</option>
                    <option value="3">3</option>
                    <option value="4">4</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex justify-center pt-4">
              <button
                onClick={calculateSpokeLength}
                className="w-full bg-slate-700 dark:bg-slate-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-slate-800 dark:hover:bg-slate-700 transition-colors duration-300 flex items-center justify-center gap-2"
              >
                <Calculator className="w-5 h-5" />
                {t('buttons.calculate')}
              </button>
            </div>
          </div>

          {/* Results and save section */}
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-600 pb-2">{t('results.heading')}</h2>
            {results.left !== null && results.right !== null ? (
              <div className="bg-teal-50 dark:bg-teal-900/30 border border-teal-200 dark:border-teal-700 rounded-lg p-6">
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300">{t('results.left')}</h3>
                    <p className="text-3xl font-bold text-teal-700 dark:text-teal-400">{results.left.toFixed(1)} mm</p>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300">{t('results.right')}</h3>
                    <p className="text-3xl font-bold text-teal-700 dark:text-teal-400">{results.right.toFixed(1)} mm</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-600 rounded-lg p-6 text-center text-slate-500 dark:text-slate-400">
                {t('results.placeholder')}
              </div>
            )}

            {/* Save and export */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">{t('results.calculationName')}</label>
                <input
                  type="text"
                  value={calculationName}
                  onChange={(e) => setCalculationName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  placeholder={t('results.namePlaceholder')}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={saveCalculation}
                  className="bg-teal-600 dark:bg-teal-700 hover:bg-teal-700 dark:hover:bg-teal-800 text-white font-medium py-2 px-4 rounded-md transition-colors duration-200 flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {t('buttons.save')}
                </button>
                <button
                  onClick={exportToJSON}
                  className="bg-slate-600 dark:bg-slate-700 hover:bg-slate-700 dark:hover:bg-slate-800 text-white font-medium py-2 px-4 rounded-md transition-colors duration-200 flex items-center justify-center gap-2"
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
                          {t('results.left')}: {calc.results.left !== null ? calc.results.left.toFixed(1) : '-'}mm / {t('results.right')}: {calc.results.right !== null ? calc.results.right.toFixed(1) : '-'}mm
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => loadCalculation(calc)}
                          className="text-teal-600 dark:text-teal-400 hover:text-teal-800 dark:hover:text-teal-300 text-sm font-medium"
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
                  className="bg-teal-600 dark:bg-teal-700 hover:bg-teal-700 dark:hover:bg-teal-800 text-white py-2 px-4 rounded-md transition-colors duration-200 flex items-center gap-2 w-full sm:w-auto justify-center"
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
      </div>
    </div>
  );
};

export default SpokeLengthCalculator;
