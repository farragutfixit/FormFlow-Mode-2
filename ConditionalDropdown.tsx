import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Select, Card, Modal, Spin, Button, Input, Typography, Space } from 'antd';
import { 
  InfoCircleOutlined, 
  PlusOutlined, 
  LoadingOutlined, 
  ExclamationCircleOutlined 
} from '@ant-design/icons';
import { useToast } from '@/hooks/use-toast';

const { Text, Title } = Typography;
const { Option } = Select;
const antIcon = <LoadingOutlined style={{ fontSize: 16, color: '#f56565' }} spin />;

export interface DropdownOption {
  value: string;
  label: string;
}

export interface DropdownConfig {
  id: string;
  label: string;
  options: DropdownOption[];
  dependsOn?: string;
  creatable?: boolean;
}

export interface DropdownRelation {
  parent: string;
  parentValue: string;
  child: string;
  options: DropdownOption[];
}

export interface ConditionalDropdownDataStore {
  options: Record<string, DropdownOption[]>;
  relations: DropdownRelation[];
}

interface ConditionalDropdownProps {
  config: DropdownConfig[];
  initialData?: ConditionalDropdownDataStore;
  onSelectionChange?: (selections: Record<string, string>) => void;
  onDataChange?: (data: ConditionalDropdownDataStore) => void;
  className?: string;
  storeKey?: string;
}

/**
 * A completely rewritten conditional dropdown component to eliminate capitalization glitches
 * and prevent infinite render loops.
 */
const ConditionalDropdown: React.FC<ConditionalDropdownProps> = ({
  config,
  initialData,
  onSelectionChange,
  onDataChange,
  className = '',
  storeKey = 'conditional-dropdown-data'
}) => {
  const { toast } = useToast();
  
  // Component lifecycle ref
  const mountedRef = useRef(false);
  
  // UI state
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [addOptionModalOpen, setAddOptionModalOpen] = useState(false);
  const [initialMenuOpen, setInitialMenuOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [newOptionName, setNewOptionName] = useState('');
  const [importText, setImportText] = useState('');
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState<Record<string, boolean>>({});
  
  // Data state - initialize from localStorage or props
  const [dropdownData, setDropdownData] = useState<ConditionalDropdownDataStore>(() => {
    if (initialData) {
      return initialData;
    }
    
    // Try to load from localStorage
    try {
      const savedData = localStorage.getItem(storeKey);
      if (savedData) {
        const parsedData = JSON.parse(savedData);
        return parsedData;
      }
    } catch (e) {
      console.error('Failed to load dropdown data from localStorage', e);
    }
    
    // Create default structure with options from config
    const defaultData: ConditionalDropdownDataStore = {
      options: {},
      relations: []
    };
    
    // Initialize with base options from config
    config.forEach(dropdown => {
      if (dropdown.options && dropdown.options.length > 0) {
        defaultData.options[dropdown.id] = [...dropdown.options];
      } else {
        defaultData.options[dropdown.id] = [];
      }
    });
    
    return defaultData;
  });
  
  // Track if the component has been initialized with default selections
  const initializedRef = useRef(false);
  
  // Initialize selections
  const [selections, setSelections] = useState<Record<string, string>>({});
  
  // Set component as mounted
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);
  
  // Save data to localStorage when it changes
  useEffect(() => {
    if (!mountedRef.current) return;
    
    try {
      localStorage.setItem(storeKey, JSON.stringify(dropdownData));
      
      if (onDataChange) {
        onDataChange(dropdownData);
      }
    } catch (e) {
      console.error('Failed to save dropdown data to localStorage', e);
    }
  }, [dropdownData, storeKey, onDataChange]);
  
  // Initialize default selections for top-level dropdowns
  useEffect(() => {
    if (!mountedRef.current || initializedRef.current) return;
    
    // Skip if we already have selections
    if (Object.keys(selections).length > 0) {
      initializedRef.current = true;
      return;
    }
    
    const initialSelections: Record<string, string> = {};
    
    // Set default values for base dropdowns (those without dependencies)
    config.forEach(dropdown => {
      if (!dropdown.dependsOn) {
        const options = dropdownData.options[dropdown.id] || dropdown.options;
        if (options && options.length > 0) {
          initialSelections[dropdown.id] = options[0].value;
        }
      }
    });
    
    if (Object.keys(initialSelections).length > 0) {
      setSelections(initialSelections);
      initializedRef.current = true;
      
      if (onSelectionChange) {
        onSelectionChange(initialSelections);
      }
    }
  }, [config, dropdownData, onSelectionChange, selections]);
  
  // Find all dropdown ids that depend on a given parent
  const findDependentDropdowns = (parentId: string): string[] => {
    // Get direct children
    const directChildren = config
      .filter(dropdown => dropdown.dependsOn === parentId)
      .map(dropdown => dropdown.id);
    
    // Get all descendants recursively
    const allChildren = [...directChildren];
    
    directChildren.forEach(childId => {
      allChildren.push(...findDependentDropdowns(childId));
    });
    
    return allChildren;
  };
  
  // Get options for a dropdown based on its configuration and parent selection
  const getDropdownOptions = useMemo(() => {
    return (dropdown: DropdownConfig): DropdownOption[] => {
      // No dropdown data yet
      if (!dropdownData || !dropdown) {
        return dropdown?.options || [];
      }
      
      // Independent dropdown (no parent)
      if (!dropdown.dependsOn) {
        return dropdownData.options[dropdown.id] || dropdown.options || [];
      }
      
      // Get parent selection
      const parentValue = selections[dropdown.dependsOn];
      if (!parentValue) {
        return []; // Parent not selected, no options available
      }
      
      // Find relation that matches this parent-child combination
      const relation = dropdownData.relations.find(
        r => r.parent === dropdown.dependsOn && 
             r.parentValue === parentValue && 
             r.child === dropdown.id
      );
      
      return relation ? relation.options : [];
    };
  }, [dropdownData, selections]);
  
  // Generate a selection path string to show the current hierarchy
  const getSelectionPath = (dropdownId: string): string => {
    // Find the current dropdown's position in the hierarchy
    const dropdown = config.find(d => d.id === dropdownId);
    if (!dropdown) return '';
    
    // If it's a top-level dropdown, no path to show
    if (!dropdown.dependsOn) return '';
    
    // Build the path from parent selections
    const pathLabels: string[] = [];
    
    // Start with the direct parent
    let parentId = dropdown.dependsOn;
    while (parentId) {
      const parentDropdown = config.find(d => d.id === parentId);
      if (!parentDropdown) break;
      
      const parentValue = selections[parentId];
      if (!parentValue) break;
      
      // Get the display label for this selection
      let displayLabel = parentValue;
      
      // For top-level dropdowns
      if (!parentDropdown.dependsOn) {
        const option = (dropdownData.options[parentId] || [])
          .find(opt => opt.value === parentValue);
        if (option) displayLabel = option.label;
      } else {
        // For dependent dropdowns
        const grandparentId = parentDropdown.dependsOn;
        if (grandparentId) {
          const grandparentValue = selections[grandparentId];
          if (grandparentValue) {
            const relation = dropdownData.relations.find(
              r => r.parent === grandparentId && 
                  r.parentValue === grandparentValue && 
                  r.child === parentId
            );
            
            if (relation) {
              const option = relation.options.find(opt => opt.value === parentValue);
              if (option) displayLabel = option.label;
            }
          }
        }
      }
      
      // Add to path (at the beginning)
      pathLabels.unshift(displayLabel);
      
      // Move up the hierarchy - get the parent's parent or end the loop
      parentId = parentDropdown.dependsOn ?? '';
    }
    
    // Format the path for display
    return pathLabels.length > 0 ? ` for ${pathLabels.join(' → ')}` : '';
  };
  
  // Handle selection change in a dropdown
  const handleSelection = async (dropdownId: string, value: string) => {
    // Check if this is the "Add New Option" special value
    if (value === '__add_new__') {
      setActiveDropdownId(dropdownId);
      setNewOptionName('');
      setInitialMenuOpen(true);
      return;
    }
    
    // Show loading indicator
    setRefreshing(prev => ({ ...prev, [dropdownId]: true }));
    
    // Small delay for UX
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // Create new selections state
    const newSelections = { ...selections, [dropdownId]: value };
    
    // When a dropdown changes, clear all dependent dropdown selections
    const dependentDropdowns = findDependentDropdowns(dropdownId);
    dependentDropdowns.forEach(depId => {
      newSelections[depId] = '';
    });
    
    // Update state
    setSelections(newSelections);
    setRefreshing(prev => ({ ...prev, [dropdownId]: false }));
    
    // Notify parent
    if (onSelectionChange) {
      onSelectionChange(newSelections);
    }
  };
  
  // Open initial menu modal
  const handleAddOption = (dropdownId: string) => {
    setActiveDropdownId(dropdownId);
    setNewOptionName('');
    setInitialMenuOpen(true);
  };
  
  // Open the single option add modal
  const handleAddSingleOption = () => {
    setInitialMenuOpen(false);
    setAddOptionModalOpen(true);
  };
  
  // Open the import options modal
  const handleOpenImportModal = () => {
    setInitialMenuOpen(false);
    setImportText('');
    setImportModalOpen(true);
  };
  
  // Process and import options from text
  const handleImportOptions = () => {
    if (!activeDropdownId || !importText.trim()) return;
    
    const activeDropdown = config.find(d => d.id === activeDropdownId);
    if (!activeDropdown) return;
    
    // Split by newlines and filter out empty lines
    const lines = importText.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
    
    // If no valid lines, show error
    if (lines.length === 0) {
      toast({
        variant: "destructive",
        title: "No options to import",
        description: "Please enter at least one option, with each option on a new line."
      });
      return;
    }
    
    // Create a deep copy of dropdown data
    const newData = JSON.parse(JSON.stringify(dropdownData)) as ConditionalDropdownDataStore;
    
    // Process each line as a new option
    const existingOptions = getDropdownOptions(activeDropdown);
    const addedOptions: string[] = [];
    const duplicateOptions: string[] = [];
    
    lines.forEach(line => {
      // Clean and format the option
      const label = line.trim();
      
      // Create a consistent value with no spaces
      const value = label.replace(/\s+/g, '-');
      
      // Check if option already exists (case-insensitive check)
      const exists = existingOptions.some(
        opt => opt.value.toLowerCase() === value.toLowerCase() || 
               opt.label.toLowerCase() === label.toLowerCase()
      );
      
      if (exists) {
        duplicateOptions.push(label);
        return; // Skip this option
      }
      
      const newOption: DropdownOption = {
        value,
        label
      };
      
      // Add option to the right collection
      if (!activeDropdown.dependsOn) {
        // Add to base options for this dropdown
        if (!newData.options[activeDropdownId]) {
          newData.options[activeDropdownId] = [];
        }
        
        newData.options[activeDropdownId].push(newOption);
      } else {
        // Add to relation for this dropdown with its parent
        const parentValue = selections[activeDropdown.dependsOn];
        if (!parentValue) return;
        
        // Find existing relation or create new one
        const relationIndex = newData.relations.findIndex(
          r => r.parent === activeDropdown.dependsOn && 
               r.parentValue === parentValue && 
               r.child === activeDropdownId
        );
        
        if (relationIndex >= 0) {
          // Add to existing relation
          newData.relations[relationIndex].options.push(newOption);
        } else {
          // Create new relation
          newData.relations.push({
            parent: activeDropdown.dependsOn,
            parentValue,
            child: activeDropdownId,
            options: [newOption]
          });
        }
      }
      
      // Create empty relations for all child dropdowns
      const childDropdowns = config.filter(d => d.dependsOn === activeDropdownId);
      childDropdowns.forEach(child => {
        newData.relations.push({
          parent: activeDropdownId,
          parentValue: value,
          child: child.id,
          options: []
        });
      });
      
      addedOptions.push(label);
    });
    
    // Close modal regardless of success
    setImportModalOpen(false);
    
    // If no options were added, just show error message
    if (addedOptions.length === 0) {
      toast({
        variant: "destructive",
        title: "No new options added",
        description: duplicateOptions.length > 0 
          ? `All options already exist: ${duplicateOptions.slice(0, 3).join(', ')}${duplicateOptions.length > 3 ? '...' : ''}`
          : "No valid options found to add."
      });
      return;
    }
    
    // Update data state
    setDropdownData(newData);
    
    // Show success message
    const dropdownConfig = config.find(d => d.id === activeDropdownId);
    const pathDisplay = dropdownConfig?.dependsOn ? 
      `Path: ${getSelectionPath(activeDropdownId).replace(' for ', '')}` : '';
    
    toast({
      title: "Options Imported",
      description: `Added ${addedOptions.length} new "${activeDropdownId && config.find(d => d.id === activeDropdownId)?.label}" options${duplicateOptions.length > 0 ? ` (${duplicateOptions.length} duplicates skipped)` : ''}.${pathDisplay ? `\n${pathDisplay}` : ''}`
    });
  };
  
  // Add a new option to a dropdown
  const saveNewOption = () => {
    if (!activeDropdownId || !newOptionName.trim()) return;
    
    const dropdown = config.find(d => d.id === activeDropdownId);
    if (!dropdown) return;
    
    // Clean and format the new option
    const label = newOptionName.trim();
    
    // Create a consistent value (keep case) with no spaces
    const value = label.replace(/\s+/g, '-');
    
    const newOption: DropdownOption = {
      value,
      label
    };
    
    // Check if option already exists (case-insensitive check)
    const existingOptions = getDropdownOptions(dropdown);
    const exists = existingOptions.some(
      opt => opt.value.toLowerCase() === value.toLowerCase()
    );
    
    if (exists) {
      toast({
        variant: "destructive",
        title: "Option already exists",
        description: `"${label}" already exists in this dropdown.`
      });
      return;
    }
    
    // Create a deep copy of dropdown data
    const newData = JSON.parse(JSON.stringify(dropdownData)) as ConditionalDropdownDataStore;
    
    // Add option to the right collection
    if (!dropdown.dependsOn) {
      // Add to base options for this dropdown
      if (!newData.options[activeDropdownId]) {
        newData.options[activeDropdownId] = [];
      }
      
      newData.options[activeDropdownId] = [
        ...newData.options[activeDropdownId], 
        newOption
      ];
    } else {
      // Add to relation for this dropdown with its parent
      const parentValue = selections[dropdown.dependsOn];
      if (!parentValue) return;
      
      // Find existing relation or create new one
      const relationIndex = newData.relations.findIndex(
        r => r.parent === dropdown.dependsOn && 
             r.parentValue === parentValue && 
             r.child === activeDropdownId
      );
      
      if (relationIndex >= 0) {
        // Add to existing relation
        newData.relations[relationIndex].options.push(newOption);
      } else {
        // Create new relation
        newData.relations.push({
          parent: dropdown.dependsOn,
          parentValue,
          child: activeDropdownId,
          options: [newOption]
        });
      }
    }
    
    // Create empty relations for all child dropdowns
    const childDropdowns = config.filter(d => d.dependsOn === activeDropdownId);
    childDropdowns.forEach(child => {
      newData.relations.push({
        parent: activeDropdownId,
        parentValue: value,
        child: child.id,
        options: []
      });
    });
    
    // Close modal
    setAddOptionModalOpen(false);
    
    // Update data state
    setDropdownData(newData);
    
    // Wait for data update to complete before updating selection
    setTimeout(() => {
      // Select the new option
      const newSelections = { ...selections, [activeDropdownId]: value };
      
      // Clear dependent selections
      const dependentDropdowns = findDependentDropdowns(activeDropdownId);
      dependentDropdowns.forEach(depId => {
        newSelections[depId] = '';
      });
      
      // Update selections
      setSelections(newSelections);
      
      // Notify parent
      if (onSelectionChange) {
        onSelectionChange(newSelections);
      }
      
      // Show success message
      const pathDisplay = dropdown.dependsOn ? 
        `Path: ${getSelectionPath(activeDropdownId).replace(' for ', '')}` : '';
      
      toast({
        title: "Option Added",
        description: `"${label}" has been added to "${dropdown.label}" options.${pathDisplay ? `\n${pathDisplay}` : ''}`
      });
    }, 100);
  };
  
  // Render the component
  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex justify-between items-center mb-4">
        <Title level={4} style={{ color: 'white', margin: 0 }}>Device Selection</Title>
        <Button 
          type="text" 
          icon={<InfoCircleOutlined />} 
          onClick={() => setShowInfoModal(true)}
          style={{ color: '#9CA3AF' }}
        />
      </div>
      
      <Card className="bg-[#171717] border-gray-800 p-5" variant="borderless">
        {config.map(dropdown => {
          const options = getDropdownOptions(dropdown);
          const isDisabled = dropdown.dependsOn ? !selections[dropdown.dependsOn] : false;
          const isRefreshing = refreshing[dropdown.id];
          
          return (
            <div key={dropdown.id} className="space-y-3 mb-5">
              <div className="flex justify-start items-center">
                <Text style={{ color: 'white' }}>{dropdown.label}</Text>
              </div>
              <div className="relative">
                <Select
                  id={dropdown.id}
                  className="w-full part-type-container"
                  value={selections[dropdown.id] || undefined}
                  onChange={(value) => handleSelection(dropdown.id, value as string)}
                  disabled={isDisabled}
                  loading={isRefreshing}
                  placeholder={isDisabled 
                    ? `Select ${config.find(d => d.id === dropdown.dependsOn)?.label} First` 
                    : `Select ${dropdown.label}`
                  }
                  style={{ width: '100%' }}
                  popupMatchSelectWidth={true}
                  dropdownStyle={{ 
                    backgroundColor: '#1F1F1F', 
                    borderColor: '#374151',
                    minWidth: '100%'
                  }}
                  popupClassName="part-type-dropdown ant-select-dropdown-dark"
                  getPopupContainer={(triggerNode) => triggerNode.parentNode as HTMLElement}
                  suffixIcon={isRefreshing ? <Spin indicator={antIcon} /> : undefined}
                  optionLabelProp="label"
                >
                  {/* "Add New Option" entry at the top of dropdown if creatable */}
                  {dropdown.creatable && !isDisabled && (
                    <Option 
                      key="__add_new__" 
                      value="__add_new__" 
                      label={`Add New ${dropdown.label}${getSelectionPath(dropdown.id)}`}
                      style={{ 
                        borderBottom: '1px solid #374151',
                        color: '#9CA3AF',
                        fontStyle: 'italic',
                        display: 'flex',
                        alignItems: 'center'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <PlusOutlined style={{ color: '#FF5555', marginRight: '8px' }} />
                        <span>Add New {dropdown.label}{getSelectionPath(dropdown.id)}</span>
                      </div>
                    </Option>
                  )}
                  
                  {/* Regular dropdown options */}
                  {options.map(option => (
                    <Option 
                      key={option.value} 
                      value={option.value}
                      label={option.label}
                    >
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        {selections[dropdown.id] === option.value && (
                          <span style={{ 
                            color: '#FF7777', 
                            marginRight: '8px',
                            fontWeight: 'bold'
                          }}>✓</span>
                        )}
                        <span style={{ 
                          marginLeft: selections[dropdown.id] === option.value ? '0' : '16px',
                          transition: 'margin-left 0.2s'
                        }}>
                          {option.label}
                        </span>
                      </div>
                    </Option>
                  ))}
                </Select>
              </div>
            </div>
          );
        })}
      </Card>
      
      {/* Information Modal */}
      <Modal
        title={
          <Space>
            <ExclamationCircleOutlined style={{ color: '#f56565' }} />
            <span>About Device Selection</span>
          </Space>
        }
        open={showInfoModal}
        onCancel={() => setShowInfoModal(false)}
        footer={[
          <Button 
            key="close" 
            onClick={() => setShowInfoModal(false)}
            style={{ backgroundColor: '#7F1D1D', borderColor: '#7F1D1D', color: 'white' }}
          >
            Close
          </Button>
        ]}
        styles={{
          header: { backgroundColor: '#000', borderBottom: '1px solid #374151' },
          content: { backgroundColor: '#000', border: '1px solid #374151' },
          body: { backgroundColor: '#000', color: '#D1D5DB' },
          footer: { backgroundColor: '#000', borderTop: '1px solid #374151' },
        }}
      >
        <div style={{ color: '#D1D5DB' }}>
          <p>This is a hierarchical device selection system where each dropdown depends on the one above it.</p>
          <div style={{ marginTop: 16 }}>
            <Text strong style={{ color: 'white', display: 'block', marginBottom: 8 }}>Key features:</Text>
            <ul style={{ paddingLeft: 20, marginBottom: 8 }}>
              <li>Each selection filters options in the dropdowns below</li>
              <li>Add new options by selecting "Add New Option" at the top of any dropdown</li>
              <li>Your custom options are saved automatically</li>
              <li>New options are only available in their proper context</li>
            </ul>
          </div>
        </div>
      </Modal>
      
      {/* Initial Menu Modal */}
      <Modal
        title={
          <>
            <div className="flex flex-col items-center text-center">
              <PlusOutlined 
                style={{ 
                  color: '#FF4D4D', 
                  backgroundColor: 'rgba(255, 77, 77, 0.2)', 
                  borderRadius: '50%',
                  padding: '6px',
                  fontSize: '12px',
                  marginBottom: '8px'
                }} 
              />
              <div>
                <div style={{ fontSize: '16px', fontWeight: 'bold', color: 'white' }}>
                  Add {activeDropdownId && config.find(d => d.id === activeDropdownId)?.label} Options
                </div>
                {activeDropdownId && config.find(d => d.id === activeDropdownId)?.dependsOn && (
                  <div style={{ fontSize: '13px', color: '#9CA3AF', marginTop: '2px' }}>
                    Path: {activeDropdownId && getSelectionPath(activeDropdownId).replace(' for ', '')}
                  </div>
                )}
              </div>
            </div>
          </>
        }
        open={initialMenuOpen}
        onCancel={() => setInitialMenuOpen(false)}
        footer={null}
        width={420}
        centered
        closeIcon={<span style={{ color: '#9CA3AF', fontSize: '24px' }}>&times;</span>}
        styles={{
          header: { 
            backgroundColor: '#000000', 
            borderBottom: 'none', 
            padding: '20px 20px 0 20px',
            borderTopLeftRadius: '8px',
            borderTopRightRadius: '8px'
          },
          content: { 
            backgroundColor: '#000000', 
            border: '1px solid #222',
            borderRadius: '8px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)'
          },
          body: { 
            backgroundColor: '#000000', 
            color: '#D1D5DB',
            padding: '5px 20px 20px 20px' 
          },
          footer: { 
            backgroundColor: '#000000', 
            borderTop: 'none',
            padding: '0 20px 20px 20px',
            borderBottomLeftRadius: '8px',
            borderBottomRightRadius: '8px'
          },
        }}
      >
        <div style={{ marginTop: 8 }}>
          <Text style={{ 
            color: 'white', 
            display: 'block', 
            marginBottom: 16,
            fontSize: '14px',
            lineHeight: '1.5',
            textAlign: 'center'
          }}>
            Choose how you want to add new "{activeDropdownId && config.find(d => d.id === activeDropdownId)?.label}" options
          </Text>
          
          <div className="flex flex-col gap-3 mt-4">
            <Button
              onClick={handleAddSingleOption}
              style={{
                backgroundColor: 'rgba(255, 77, 77, 0.15)',
                borderColor: '#CC3232',
                color: 'white',
                height: '50px',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '15px'
              }}
            >
              <PlusOutlined style={{ marginRight: 8 }} />
              Add Single Option
            </Button>
            
            <Button
              onClick={handleOpenImportModal}
              style={{
                backgroundColor: "rgba(49, 46, 129, 0.3)",
                borderColor: "#6366F1",
                color: 'white',
                height: '50px',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '15px'
              }}
            >
              <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 8 }}>
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="17 8 12 3 7 8"></polyline>
                <line x1="12" y1="3" x2="12" y2="15"></line>
              </svg>
              Import Multiple Options
            </Button>
          </div>
        </div>
      </Modal>
      
      {/* Add New Option Modal */}
      <Modal
        title={
          <>
            <div style={{ position: 'relative' }}>
              <div 
                className="inline-flex justify-center items-center bg-black/50 rounded-full p-2 border border-white/20 shadow-[0_0_5px_rgba(255,255,255,0.2)] hover:border-red-400/50 hover:shadow-[0_0_5px_rgba(248,113,113,0.4)] transition-all cursor-pointer"
                style={{ 
                  position: 'absolute', 
                  left: '-10px', 
                  top: '-10px',
                }}
                onClick={() => {
                  setAddOptionModalOpen(false);
                  setInitialMenuOpen(true);
                }}
              >
                <svg viewBox="0 0 24 24" width="20" height="20" stroke="#FFFFFF" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6"></polyline>
                </svg>
              </div>
              <div className="flex flex-col items-center text-center">
                <PlusOutlined 
                  style={{ 
                    color: '#FF4D4D', 
                    backgroundColor: 'rgba(255, 77, 77, 0.2)', 
                    borderRadius: '50%',
                    padding: '6px',
                    fontSize: '12px',
                    marginBottom: '8px'
                  }} 
                />
                <div>
                  <div style={{ fontSize: '16px', fontWeight: 'bold', color: 'white' }}>
                    Add New "{activeDropdownId && config.find(d => d.id === activeDropdownId)?.label}"
                  </div>
                  {activeDropdownId && config.find(d => d.id === activeDropdownId)?.dependsOn && (
                    <div style={{ fontSize: '13px', color: '#9CA3AF', marginTop: '2px' }}>
                      Path: {activeDropdownId && getSelectionPath(activeDropdownId).replace(' for ', '')}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        }
        open={addOptionModalOpen}
        onCancel={() => setAddOptionModalOpen(false)}
        onOk={saveNewOption}
        okText="OK"
        okButtonProps={{ 
          disabled: !newOptionName.trim(),
          style: { 
            backgroundColor: '#CC3232', 
            borderColor: '#CC3232',
            boxShadow: 'none',
            fontWeight: 'bold',
            borderRadius: '4px',
            height: '38px',
            minWidth: '100px',
            color: 'white'
          }
        }}
        cancelText="Cancel"
        cancelButtonProps={{
          style: { 
            backgroundColor: 'transparent', 
            borderColor: '#999',
            color: 'white',
            borderRadius: '4px',
            height: '38px',
            minWidth: '80px'
          },
          onMouseEnter: (e) => {
            const target = e.currentTarget as HTMLElement;
            target.style.borderColor = '#D05353';
          },
          onMouseLeave: (e) => {
            const target = e.currentTarget as HTMLElement;
            target.style.borderColor = '#999';
          }
        }}
        width={420}
        centered
        closeIcon={<span style={{ color: '#9CA3AF', fontSize: '24px' }}>&times;</span>}
        styles={{
          header: { 
            backgroundColor: '#000000', 
            borderBottom: 'none', 
            padding: '20px 20px 0 20px',
            borderTopLeftRadius: '8px',
            borderTopRightRadius: '8px'
          },
          content: { 
            backgroundColor: '#000000', 
            border: '1px solid #222',
            borderRadius: '8px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)'
          },
          body: { 
            backgroundColor: '#000000', 
            color: '#D1D5DB',
            padding: '5px 20px 20px 20px'
          },
          footer: { 
            backgroundColor: '#000000', 
            borderTop: 'none',
            padding: '0 20px 20px 20px',
            borderBottomLeftRadius: '8px',
            borderBottomRightRadius: '8px'
          },
        }}
      >
        <div style={{ marginTop: 8 }}>
          <Text style={{ 
            color: 'white', 
            display: 'block', 
            marginBottom: 16,
            fontSize: '14px',
            lineHeight: '1.5',
            textAlign: 'center'
          }}>
            Enter a name for the new option. This will be added to the dropdown and will be available for future use.
          </Text>
          
          <div style={{ 
            marginTop: 8,
            backgroundColor: '#000000',
            padding: '16px',
            borderRadius: '6px',
            border: 'none'
          }}>
            <Text style={{ 
              color: 'white', 
              display: 'block', 
              marginBottom: 8,
              fontSize: '13px',
              fontWeight: 'bold',
              textAlign: 'center'
            }}>
              Option Name
            </Text>
            <Input
              placeholder={`Enter New "${activeDropdownId && config.find(d => d.id === activeDropdownId)?.label}" Name`}
              value={newOptionName}
              onChange={(e) => setNewOptionName(e.target.value)}
              autoFocus
              style={{ 
                backgroundColor: "#151515",
                borderColor: '#374151', 
                color: 'white',
                padding: '8px 12px',
                height: '40px',
                borderRadius: '4px',
                fontSize: '0.8em'
              }}
            />
          </div>
        </div>
      </Modal>

      {/* Import Options Modal */}
      <Modal
        title={
          <>
            <div style={{ position: 'relative' }}>
              <div 
                className="inline-flex justify-center items-center bg-black/50 rounded-full p-2 border border-white/20 shadow-[0_0_5px_rgba(255,255,255,0.2)] hover:border-red-400/50 hover:shadow-[0_0_5px_rgba(248,113,113,0.4)] transition-all cursor-pointer"
                style={{ 
                  position: 'absolute', 
                  left: '-10px', 
                  top: '-10px',
                }}
                onClick={() => {
                  setImportModalOpen(false);
                  setInitialMenuOpen(true);
                }}
              >
                <svg viewBox="0 0 24 24" width="20" height="20" stroke="#FFFFFF" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6"></polyline>
                </svg>
              </div>
              <div className="flex flex-col items-center text-center">
                <svg 
                  viewBox="0 0 24 24" 
                  width="20" 
                  height="20" 
                  stroke="#FF4D4D" 
                  strokeWidth="2" 
                  fill="none" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                  style={{
                    backgroundColor: 'rgba(255, 77, 77, 0.2)',
                    borderRadius: '50%',
                    padding: '6px',
                    width: '32px',
                    height: '32px',
                    marginBottom: '8px'
                  }}
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="17 8 12 3 7 8"></polyline>
                  <line x1="12" y1="3" x2="12" y2="15"></line>
                </svg>
                <div>
                  <div style={{ fontSize: '16px', fontWeight: 'bold', color: 'white' }}>
                    Import "{activeDropdownId && config.find(d => d.id === activeDropdownId)?.label}" Options
                  </div>
                  {activeDropdownId && config.find(d => d.id === activeDropdownId)?.dependsOn && (
                    <div style={{ fontSize: '13px', color: '#9CA3AF', marginTop: '2px' }}>
                      Path: {activeDropdownId && getSelectionPath(activeDropdownId).replace(' for ', '')}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        }
        open={importModalOpen}
        onCancel={() => setImportModalOpen(false)}
        onOk={handleImportOptions}
        okText="Import"
        okButtonProps={{ 
          disabled: !importText.trim(),
          style: { 
            backgroundColor: '#CC3232', 
            borderColor: '#CC3232',
            boxShadow: 'none',
            fontWeight: 'bold',
            borderRadius: '4px',
            height: '38px',
            minWidth: '100px',
            color: 'white'
          }
        }}
        cancelText="Cancel"
        cancelButtonProps={{
          style: { 
            backgroundColor: 'transparent', 
            borderColor: '#999',
            color: 'white',
            borderRadius: '4px',
            height: '38px',
            minWidth: '80px'
          },
          onMouseEnter: (e) => {
            const target = e.currentTarget as HTMLElement;
            target.style.borderColor = '#D05353';
          },
          onMouseLeave: (e) => {
            const target = e.currentTarget as HTMLElement;
            target.style.borderColor = '#999';
          }
        }}
        width={480}
        centered
        closeIcon={<span style={{ color: '#9CA3AF', fontSize: '24px' }}>&times;</span>}
        styles={{
          header: { 
            backgroundColor: '#000000', 
            borderBottom: 'none', 
            padding: '20px 20px 0 20px',
            borderTopLeftRadius: '8px',
            borderTopRightRadius: '8px'
          },
          content: { 
            backgroundColor: '#000000', 
            border: '1px solid #222',
            borderRadius: '8px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)'
          },
          body: { 
            backgroundColor: '#000000', 
            color: '#D1D5DB',
            padding: '5px 20px 20px 20px'
          },
          footer: { 
            backgroundColor: '#000000', 
            borderTop: 'none',
            padding: '0 20px 20px 20px',
            borderBottomLeftRadius: '8px',
            borderBottomRightRadius: '8px'
          },
        }}
      >
        <div style={{ marginTop: 8 }}>
          <Text style={{ 
            color: 'white', 
            display: 'block', 
            marginBottom: 16,
            fontSize: '14px',
            lineHeight: '1.5',
            textAlign: 'center'
          }}>
            Enter multiple options below, with each option on a new line.
            All options will be added to the dropdown and available for future use.
          </Text>
          
          <div style={{ 
            marginTop: 8,
            backgroundColor: "#000000",
            padding: '16px',
            borderRadius: '6px',
            border: "none",
          }}>
            <Text style={{ 
              color: 'white', 
              display: 'block', 
              marginBottom: 8,
              fontSize: '13px',
              fontWeight: 'bold',
              textAlign: 'center'
            }}>
              Options (One Per Line)
            </Text>
            <Input.TextArea
              placeholder={`Enter each "${activeDropdownId && config.find(d => d.id === activeDropdownId)?.label}" option on a new line\nExample:\nOption 1\nOption 2\nOption 3`}
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              autoFocus
              rows={8}
              style={{ 
                backgroundColor: "#151515",
                borderColor: '#374151', 
                color: 'white',
                padding: '8px 12px',
                borderRadius: '4px',
                resize: 'vertical',
                fontSize: '0.8em'
              }}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ConditionalDropdown;