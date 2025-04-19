import React, { useState, useCallback } from 'react';
import ConditionalDropdown, { 
  DropdownConfig, 
  ConditionalDropdownDataStore, 
  DropdownOption 
} from '@/components/ui/ConditionalDropdown';
import { Link } from 'wouter';
import { ChevronLeft, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Card } from '@/components/ui/card';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';

export default function ConditionalDemo() {
  const { toast } = useToast();
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [dropdownData, setDropdownData] = useState<ConditionalDropdownDataStore | null>(null);
  const [showResetDialog, setShowResetDialog] = useState(false);

  // Initial configuration for the device selection hierarchy
  const dropdownConfig: DropdownConfig[] = [
    {
      id: 'deviceType',
      label: 'Device Type',
      options: [
        { value: 'smartphone', label: 'Smartphone' },
        { value: 'tablet', label: 'Tablet' },
        { value: 'laptop', label: 'Laptop' },
        { value: 'desktop', label: 'Desktop' }
      ],
      creatable: true
    },
    {
      id: 'brand',
      label: 'Brand',
      options: [],
      dependsOn: 'deviceType',
      creatable: true
    },
    {
      id: 'series',
      label: 'Series',
      options: [],
      dependsOn: 'brand',
      creatable: true
    },
    {
      id: 'model',
      label: 'Model',
      options: [],
      dependsOn: 'series',
      creatable: true
    }
  ];

  // Function to show readable selections
  const getReadableSelection = useCallback((key: string, value: string): string => {
    if (!value) return '';

    const dropdown = dropdownConfig.find(d => d.id === key);
    if (!dropdown) return value;

    // For independent dropdowns
    if (!dropdown.dependsOn) {
      const baseOptions = dropdownData?.options[key] || dropdown.options;
      const option = baseOptions.find((opt: DropdownOption) => opt.value === value);
      return option?.label || value;
    }
    
    // For dependent dropdowns
    const parentValue = selections[dropdown.dependsOn];
    if (!parentValue || !dropdownData) return value;
    
    const relation = dropdownData.relations.find(
      r => r.parent === dropdown.dependsOn && 
           r.parentValue === parentValue && 
           r.child === key
    );
    
    if (!relation) return value;
    
    const option = relation.options.find((opt: DropdownOption) => opt.value === value);
    return option?.label || value;
  }, [dropdownData, dropdownConfig, selections]);

  const handleSelectionChange = (newSelections: Record<string, string>) => {
    setSelections(newSelections);
  };

  const handleDataChange = (data: ConditionalDropdownDataStore) => {
    setDropdownData(data);
  };

  const resetAllData = () => {
    // Clear local storage data
    localStorage.removeItem('device-selection-data');
    
    // Reset to initial state
    setDropdownData(null);
    setSelections({});
    setShowResetDialog(false);
    
    toast({
      title: "Data Reset",
      description: "All custom device options have been cleared."
    });
  };

  return (
    <div className="min-h-screen bg-black p-8">
      <div className="container mx-auto">
        <div className="flex items-center mb-6">
          <div className="flex-1">
            <Link href="/">
              <div className="inline-flex justify-center items-center bg-black/50 rounded-full p-2 border border-white/20 shadow-[0_0_5px_rgba(255,255,255,0.2)] hover:border-red-400/50 hover:shadow-[0_0_5px_rgba(248,113,113,0.4)] transition-all cursor-pointer">
                <ChevronLeft className="h-5 w-5 text-white" />
              </div>
            </Link>
          </div>
          <div className="flex-1 flex justify-center">
            <h1 className="text-2xl font-bold text-white">Conditional Dropdowns Demo</h1>
          </div>
          <div className="flex-1 flex justify-end">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowResetDialog(true)}
              className="bg-transparent border-red-900/40 text-red-400 hover:bg-red-900/20 hover:text-red-300"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Reset Data
            </Button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-[#171717] p-6 rounded">
            <ConditionalDropdown 
              config={dropdownConfig} 
              onSelectionChange={handleSelectionChange}
              onDataChange={handleDataChange}
              storeKey="device-selection-data"
            />
          </div>
          
          {/* Display current selections */}
          <div className="p-6 bg-[#171717] rounded flex flex-col">
            <h2 className="text-xl font-semibold text-white mb-4">Current Selection</h2>
            <Card className="bg-black/30 border border-gray-800 p-5 flex-1">
              {Object.keys(selections).length > 0 && Object.values(selections).some(v => v) ? (
                <div className="space-y-4">
                  {/* Device Information */}
                  {selections.deviceType && (
                    <div className="space-y-1">
                      <h3 className="text-lg font-medium text-white border-b border-gray-800 pb-2 mb-2">
                        Device Information
                      </h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-gray-400 text-sm">Device Type</p>
                          <p className="text-white font-medium">{getReadableSelection('deviceType', selections.deviceType)}</p>
                        </div>
                        {selections.brand && (
                          <div>
                            <p className="text-gray-400 text-sm">Brand</p>
                            <p className="text-white font-medium">{getReadableSelection('brand', selections.brand)}</p>
                          </div>
                        )}
                        {selections.series && (
                          <div>
                            <p className="text-gray-400 text-sm">Series</p>
                            <p className="text-white font-medium">{getReadableSelection('series', selections.series)}</p>
                          </div>
                        )}
                        {selections.model && (
                          <div>
                            <p className="text-gray-400 text-sm">Model</p>
                            <p className="text-white font-medium">{getReadableSelection('model', selections.model)}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Full Selection Path */}
                  <div className="mt-6 pt-4 border-t border-gray-800">
                    <h3 className="text-lg font-medium text-white mb-2">Selection Path</h3>
                    <div className="flex items-center">
                      {selections.deviceType && (
                        <div className="text-white bg-red-900/30 px-3 py-1 rounded-md">
                          {getReadableSelection('deviceType', selections.deviceType)}
                        </div>
                      )}
                      
                      {selections.deviceType && selections.brand && (
                        <>
                          <div className="mx-2 text-gray-500">→</div>
                          <div className="text-white bg-red-900/30 px-3 py-1 rounded-md">
                            {getReadableSelection('brand', selections.brand)}
                          </div>
                        </>
                      )}
                      
                      {selections.brand && selections.series && (
                        <>
                          <div className="mx-2 text-gray-500">→</div>
                          <div className="text-white bg-red-900/30 px-3 py-1 rounded-md">
                            {getReadableSelection('series', selections.series)}
                          </div>
                        </>
                      )}
                      
                      {selections.series && selections.model && (
                        <>
                          <div className="mx-2 text-gray-500">→</div>
                          <div className="text-white bg-red-900/30 px-3 py-1 rounded-md">
                            {getReadableSelection('model', selections.model)}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-gray-500 py-10">
                  <p className="text-center italic">Make selections in the dropdowns to see the details here.</p>
                  <p className="text-center text-sm mt-2">Try adding new options with the + buttons!</p>
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>

      {/* Reset Confirmation Dialog */}
      <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <AlertDialogContent className="bg-black border border-gray-700 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Reset All Data?</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              This will clear all custom device types, brands, series, and models you've added. 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-transparent border-gray-700 text-white hover:bg-gray-900 hover:text-white">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={resetAllData}
              className="bg-red-900 hover:bg-red-800 text-white shadow-sm"
            >
              Reset Data
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}