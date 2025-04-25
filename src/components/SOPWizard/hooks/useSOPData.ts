import { useState, useEffect } from 'react';
import { SOPData, Step, Equipment } from '../types';

export function useSOPData() {
  // Initialize SOP data state with empty values
  const [sopData, setSopData] = useState<SOPData>({
    title: '',
    description: '',
    category: '',
    stakeholders: '',
    definitions: '',
  });
  
  // Initialize steps as an empty array
  const [steps, setSteps] = useState<Partial<Step>[]>([]);
  
  // Initialize equipment as an empty array
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  
  // Load data from localStorage on initial mount
  useEffect(() => {
    try {
      const storedData = localStorage.getItem('sopWizardData');
      if (storedData) {
        const parsedData = JSON.parse(storedData);
        
        // Restore SOP data if available
        if (parsedData.sopData) {
          setSopData(parsedData.sopData);
        }
        
        // Restore steps if available
        if (parsedData.steps && Array.isArray(parsedData.steps)) {
          setSteps(parsedData.steps);
        }
        
        // Restore equipment if available
        if (parsedData.equipment && Array.isArray(parsedData.equipment)) {
          setEquipment(parsedData.equipment);
        }
      }
    } catch (error) {
      console.error('Error loading SOP data from localStorage:', error);
    }
  }, []);
  
  // Save data to localStorage when it changes
  useEffect(() => {
    try {
      localStorage.setItem('sopWizardData', JSON.stringify({
        sopData,
        steps,
        equipment,
        timestamp: new Date().toISOString()
      }));
    } catch (error) {
      console.error('Error saving SOP data to localStorage:', error);
    }
  }, [sopData, steps, equipment]);
  
  // Function to add or update a step
  const saveStep = (stepIndex: number, stepData: Partial<Step>) => {
    setSteps(prevSteps => {
      const updatedSteps = [...prevSteps];
      
      // Check if the step already exists
      const existingStepIndex = updatedSteps.findIndex(
        step => step.order_index === stepIndex
      );
      
      if (existingStepIndex >= 0) {
        // Update existing step
        updatedSteps[existingStepIndex] = {
          ...updatedSteps[existingStepIndex],
          ...stepData
        };
      } else {
        // Add new step
        updatedSteps.push({
          order_index: stepIndex,
          ...stepData
        });
      }
      
      // Sort steps by order_index
      return updatedSteps.sort((a, b) => 
        (a.order_index || 0) - (b.order_index || 0)
      );
    });
  };
  
  // Function to add equipment
  const addEquipment = (equipmentData: Equipment) => {
    setEquipment(prev => [...prev, equipmentData]);
  };
  
  // Function to update equipment
  const updateEquipment = (index: number, equipmentData: Partial<Equipment>) => {
    setEquipment(prevEquipment => {
      const updatedEquipment = [...prevEquipment];
      if (index >= 0 && index < updatedEquipment.length) {
        updatedEquipment[index] = {
          ...updatedEquipment[index],
          ...equipmentData
        };
      }
      return updatedEquipment;
    });
  };
  
  // Function to remove equipment
  const removeEquipment = (index: number) => {
    setEquipment(prev => prev.filter((_, i) => i !== index));
  };
  
  return {
    sopData,
    setSopData,
    steps,
    setSteps,
    saveStep,
    equipment,
    setEquipment,
    addEquipment,
    updateEquipment,
    removeEquipment
  };
}
