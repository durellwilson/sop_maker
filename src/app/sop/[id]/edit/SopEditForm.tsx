"use client";

import React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { db, storage } from '@/utils/firebase';
import { doc, updateDoc, collection, writeBatch, deleteDoc } from 'firebase/firestore'; 
import { ref, deleteObject } from 'firebase/storage';
import { SopWithId, Step } from '@/types/sop';
import StepEditor from './StepEditor';
import { debounce } from 'lodash';
import { toast } from 'react-hot-toast';
import { GripVertical, Plus, Save, Trash2, ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { v4 as uuidv4 } from 'uuid';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragOverlay } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { restrictToVerticalAxis, restrictToParentElement } from '@dnd-kit/modifiers';
import { CSS } from '@dnd-kit/utilities';

interface SopEditFormProps {
  sop: SopWithId;
  initialSteps: Step[];
}

export default function SopEditForm({ sop, initialSteps }: SopEditFormProps) {
  const [title, setTitle] = useState(sop.title || "");
  const [description, setDescription] = useState(sop.description || "");
  const [steps, setSteps] = useState<Step[]>(initialSteps || []);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [activeStep, setActiveStep] = useState<Step | null>(null);
  const [expandedSteps, setExpandedSteps] = useState<Record<string, boolean>>({});

  const router = useRouter();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor)
  );

  // Initialize all steps as expanded if there are only a few
  useEffect(() => {
    if (initialSteps.length <= 3) {
      const expanded: Record<string, boolean> = {};
      initialSteps.forEach(step => {
        expanded[step.id] = true;
      });
      setExpandedSteps(expanded);
    } else {
      // Only expand the first step
      const expanded: Record<string, boolean> = {};
      if (initialSteps.length > 0) {
        expanded[initialSteps[0].id] = true;
      }
      setExpandedSteps(expanded);
    }
  }, [initialSteps]);

  const toggleStepExpansion = (stepId: string) => {
    setExpandedSteps(prev => ({
      ...prev,
      [stepId]: !prev[stepId]
    }));
  };

  // Create a debounced save function for metadata updates
  const debouncedSaveMetadata = useCallback(
    debounce(async (title: string, description: string) => {
      try {
        const sopRef = doc(db, "sops", sop.id);
        await updateDoc(sopRef, {
          title,
          description,
          updated_at: new Date().toISOString()
        });
        toast.success("SOP updated", { id: "sop-update" });
      } catch (error) {
        console.error("Error updating SOP:", error);
        toast.error("Failed to update SOP", { id: "sop-update-error" });
      }
    }, 1000),
    [sop.id]
  );

  // Save metadata when title or description changes
  useEffect(() => {
    if (title !== sop.title || description !== sop.description) {
      toast.loading("Saving changes...", { id: "sop-update" });
      debouncedSaveMetadata(title, description);
    }
  }, [title, description, sop.title, sop.description, debouncedSaveMetadata]);

  // Save all steps to Firestore (batch write)
  const saveSteps = async (updatedSteps: Step[]) => {
    setSaving(true);
    try {
      const batch = writeBatch(db);
      
      // Update the organized document with all steps
      const organizedRef = doc(collection(db, "sops", sop.id, "steps"), "organized");
      batch.set(organizedRef, { steps: updatedSteps });
      
      // Update the SOP's updated_at time
      const sopRef = doc(db, "sops", sop.id);
      batch.update(sopRef, { updated_at: new Date().toISOString() });
      
      await batch.commit();
      console.log("Saved all steps");
      toast.success("Steps saved successfully");
    } catch (error) {
      console.error("Error saving steps:", error);
      toast.error("Failed to save steps");
    } finally {
      setSaving(false);
    }
  };

  // Add a new step
  const addStep = () => {
    const newOrder = steps.length > 0 
      ? Math.max(...steps.map(s => s.order_index)) + 1 
      : 0;
    
    const newStep: Step = {
      id: uuidv4(),
      order_index: newOrder,
      instruction: "",
      media: []
    };
    
    const updatedSteps = [...steps, newStep];
    setSteps(updatedSteps);
    
    // Expand the newly added step
    setExpandedSteps(prev => ({
      ...prev,
      [newStep.id]: true
    }));
    
    // Save the updated steps to Firestore
    saveSteps(updatedSteps);
  };

  // Update a step
  const updateStep = (updatedStep: Step) => {
    const updatedSteps = steps.map(step => 
      step.id === updatedStep.id ? updatedStep : step
    );
    setSteps(updatedSteps);
    
    // No need to save here as StepEditor already saves the individual step
  };

  // Delete a step
  const deleteStep = (stepId: string) => {
    // Find the step to delete to get its order_index
    const stepToDelete = steps.find(s => s.id === stepId);
    if (!stepToDelete) return;
    
    // Remove the step
    const updatedSteps = steps.filter(step => step.id !== stepId);
    
    // Reorder the steps after deletion
    const reorderedSteps = updatedSteps.map(step => {
      if (step.order_index > stepToDelete.order_index) {
        return { ...step, order_index: step.order_index - 1 };
      }
      return step;
    });
    
    setSteps(reorderedSteps);
    
    // Remove from expanded steps
    const newExpandedSteps = { ...expandedSteps };
    delete newExpandedSteps[stepId];
    setExpandedSteps(newExpandedSteps);
    
    // Save the updated steps
    saveSteps(reorderedSteps);
  };

  // Handle drag start
  const handleDragStart = (event: any) => {
    const { active } = event;
    setActiveId(active.id);
    const draggedStep = steps.find(step => step.id === active.id);
    if (draggedStep) {
      setActiveStep(draggedStep);
    }
  };

  // Handle drag end
  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      setSteps(steps => {
        // Find the indices of the dragged item and the target position
        const oldIndex = steps.findIndex(s => s.id === active.id);
        const newIndex = steps.findIndex(s => s.id === over.id);
        
        // Move the item in the array
        const newOrder = arrayMove(steps, oldIndex, newIndex);
        
        // Update order_index values for all items
        const updatedSteps = newOrder.map((step, index) => ({
          ...step,
          order_index: index
        }));
        
        // Save the new order to Firestore
        saveSteps(updatedSteps);
        
        return updatedSteps;
      });
    }
    
    setActiveId(null);
    setActiveStep(null);
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <Link 
          href={`/sop/${sop.id}`}
          className="inline-flex items-center text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 font-medium transition-colors"
        >
          <ChevronLeft className="w-5 h-5 mr-1" />
          Back to SOP
        </Link>
        
        <button
          onClick={() => saveSteps(steps)}
          disabled={saving}
          className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-md 
                    text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 
                    disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-colors duration-150"
        >
          <Save className="w-4 h-4 mr-2" />
          {saving ? "Saving..." : "Save All Changes"}
        </button>
      </div>

      <div className="glass-card dark:glass-card-dark rounded-xl shadow-md p-6">
        <div className="space-y-4">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Title
            </label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2 text-lg font-medium text-slate-900 dark:text-white
                        border border-slate-300 dark:border-slate-600 
                        rounded-md bg-white dark:bg-slate-800
                        focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400
                        focus:border-indigo-500 dark:focus:border-indigo-400 transition-colors"
              placeholder="SOP Title"
            />
          </div>
          
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Description
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-4 py-2 text-slate-900 dark:text-white
                        border border-slate-300 dark:border-slate-600 
                        rounded-md bg-white dark:bg-slate-800
                        focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400
                        focus:border-indigo-500 dark:focus:border-indigo-400 transition-colors"
              placeholder="Describe what this SOP is about"
            />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Steps</h2>
          <button
            onClick={addStep}
            className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md 
                      text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 
                      shadow-sm transition-colors duration-150"
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Step
          </button>
        </div>
        
        {steps.length === 0 ? (
          <div className="glass-card dark:glass-card-dark rounded-xl shadow-md p-8 text-center">
            <p className="text-slate-600 dark:text-slate-400 mb-4">No steps yet. Add your first step to get started.</p>
            <button
              onClick={addStep}
              className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-md 
                        text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 
                        shadow-sm transition-colors duration-150"
            >
              <Plus className="w-4 h-4 mr-1" />
              Add First Step
            </button>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            modifiers={[restrictToVerticalAxis, restrictToParentElement]}
          >
            <SortableContext items={steps.map(step => step.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-4">
                {steps.map((step, index) => (
                  <SortableStep
                    key={step.id}
                    step={step}
                    isExpanded={!!expandedSteps[step.id]}
                    toggleExpand={() => toggleStepExpansion(step.id)}
                    onUpdate={updateStep}
                    onDelete={deleteStep}
                    isFirst={index === 0}
                    isLast={index === steps.length - 1}
                    onMoveStep={(direction) => {
                      const newIndex = direction === 'up' ? index - 1 : index + 1;
                      if (newIndex >= 0 && newIndex < steps.length) {
                        const newSteps = arrayMove(steps, index, newIndex);
                        const reorderedSteps = newSteps.map((s, i) => ({
                          ...s,
                          order_index: i
                        }));
                        setSteps(reorderedSteps);
                        saveSteps(reorderedSteps);
                      }
                    }}
                    totalSteps={steps.length}
                  />
                ))}
              </div>
            </SortableContext>
            
            <DragOverlay>
              {activeId && activeStep ? (
                <div className="bg-white dark:bg-slate-800 border-2 border-indigo-500 dark:border-indigo-400 rounded-xl shadow-lg opacity-80">
                  <div className="p-4 flex items-center">
                    <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-indigo-600 text-white font-bold text-sm mr-3">
                      {activeStep.order_index + 1}
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white truncate">
                      {activeStep.title}
                    </h3>
                  </div>
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        )}
      </div>
    </div>
  );
}

// Sortable Step Component
function SortableStep({
  step,
  isExpanded,
  toggleExpand,
  onUpdate,
  onDelete,
  isFirst,
  isLast,
  onMoveStep,
  totalSteps
}: {
  step: Step;
  isExpanded: boolean;
  toggleExpand: () => void;
  onUpdate: (step: Step) => void;
  onDelete: (id: string) => void;
  isFirst: boolean;
  isLast: boolean;
  onMoveStep: (direction: 'up' | 'down') => void;
  totalSteps: number;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: step.id });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
    opacity: isDragging ? 0.8 : 1,
  };
  
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`glass-card dark:glass-card-dark rounded-xl shadow-md overflow-hidden transition-all duration-200 ${
        isDragging ? 'border-2 border-indigo-500' : ''
      }`}
    >
      {/* Header row with step number, expand toggle and drag handle */}
      <div className="px-6 py-3 border-b border-slate-200 dark:border-slate-700 flex items-center bg-slate-50 dark:bg-slate-800">
        <div className="flex-1 flex items-center">
          <div 
            className="flex items-center justify-center w-9 h-9 rounded-full bg-indigo-600 dark:bg-indigo-500 text-white font-bold text-sm mr-3 shadow-sm"
            title={`Step ${step.order_index + 1}`}
          >
            {step.order_index + 1}
          </div>
          
          <button
            onClick={toggleExpand}
            className="text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 font-medium flex items-center transition-colors"
          >
            {isExpanded ? (
              <ChevronUp className="w-5 h-5 mr-1" />
            ) : (
              <ChevronDown className="w-5 h-5 mr-1" />
            )}
            {isExpanded ? "Collapse" : "Expand"} Step {step.order_index + 1}
          </button>
        </div>
        
        <div className="flex items-center space-x-2">
          {/* Up/Down buttons */}
          <div className="flex">
            <button
              onClick={() => onMoveStep('up')}
              disabled={isFirst}
              className="p-1 text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="Move up"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            </button>
            <button
              onClick={() => onMoveStep('down')}
              disabled={isLast}
              className="p-1 text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="Move down"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
          
          {/* Delete button */}
          <button
            onClick={() => onDelete(step.id)}
            className="p-1 text-rose-500 hover:text-rose-600 dark:text-rose-400 dark:hover:text-rose-300 transition-colors"
            title="Delete step"
          >
            <Trash2 className="h-5 w-5" />
          </button>
          
          {/* Drag handle */}
          <div
            {...attributes}
            {...listeners}
            className="p-1 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300 cursor-grab active:cursor-grabbing transition-colors"
            title="Drag to reorder"
          >
            <Grip className="h-5 w-5" />
          </div>
        </div>
      </div>
      
      {/* Step content (expanded/collapsed) */}
      {isExpanded && (
        <div className="p-6">
          <StepEditor
            step={step}
            onUpdateStep={onUpdate}
            onDeleteStep={onDelete}
            isFirst={isFirst}
            isLast={isLast}
            onMoveStep={onMoveStep}
            totalSteps={totalSteps}
          />
        </div>
      )}
    </div>
  );
} 