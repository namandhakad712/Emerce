import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Calendar, Check, Clock, Plus, Trash2, AlertCircle, CheckCircle2, X, Edit2, ChevronUp, ChevronDown } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { Todo } from '../services/supabase';
import { format, isPast, isFuture, isToday } from 'date-fns';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAPAnimations } from '../hooks/useGSAPAnimations';

// Register GSAP plugins
gsap.registerPlugin(ScrollTrigger);

// Priority options with their styles
const PRIORITY_OPTIONS = [
  {
    value: 'low',
    label: 'Low',
    bgColor: 'bg-blue-100',
    textColor: 'text-blue-700',
    hoverBg: 'hover:bg-blue-200',
    gradient: 'from-blue-400 to-blue-500'
  },
  {
    value: 'medium',
    label: 'Medium',
    bgColor: 'bg-yellow-100',
    textColor: 'text-yellow-700',
    hoverBg: 'hover:bg-yellow-200',
    gradient: 'from-yellow-400 to-amber-500'
  },
  {
    value: 'high',
    label: 'High',
    bgColor: 'bg-red-100',
    textColor: 'text-red-700',
    hoverBg: 'hover:bg-red-200',
    gradient: 'from-red-400 to-red-500'
  }
];

const TodoPage: React.FC = () => {
  const { todos, loadTodos, addTodo, updateTodo, deleteTodo } = useAppContext();
  
  const [newTodoTitle, setNewTodoTitle] = useState('');
  const [newTodoPriority, setNewTodoPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [newTodoDueDate, setNewTodoDueDate] = useState<string>('');
  const [isAddingTodo, setIsAddingTodo] = useState(false);
  
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'low' | 'medium' | 'high'>('all');
  
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editPriority, setEditPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [editDueDate, setEditDueDate] = useState<string>('');
  
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [sortBy, setSortBy] = useState<'priority' | 'due_date' | 'created_at'>('created_at');

  // Animation refs
  const headerRef = useRef<HTMLDivElement>(null);
  const filtersRef = useRef<HTMLDivElement>(null);
  const todoListRef = useRef<HTMLDivElement>(null);
  const todoFormRef = useRef<HTMLFormElement>(null);
  const addButtonRef = useRef<HTMLButtonElement>(null);
  
  // Get animation hooks
  const { staggerItems } = useGSAPAnimations();
  
  // Filter and sort todos based on current filters
  const filteredTodos = todos
    .filter(todo => {
      // Status filter
      if (filter === 'active' && todo.completed) return false;
      if (filter === 'completed' && !todo.completed) return false;
      
      // Priority filter
      if (priorityFilter !== 'all' && todo.priority !== priorityFilter) return false;
      
      return true;
    })
    .sort((a, b) => {
      // Sort by selected field
      if (sortBy === 'priority') {
        const priorityValues = { 'low': 1, 'medium': 2, 'high': 3 };
        const aValue = priorityValues[a.priority] || 0;
        const bValue = priorityValues[b.priority] || 0;
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
      } else if (sortBy === 'due_date') {
        const aDate = a.due_date ? new Date(a.due_date).getTime() : 0;
        const bDate = b.due_date ? new Date(b.due_date).getTime() : 0;
        return sortDirection === 'asc' ? aDate - bDate : bDate - aDate;
      } else {
        const aDate = new Date(a.created_at).getTime();
        const bDate = new Date(b.created_at).getTime();
        return sortDirection === 'asc' ? aDate - bDate : bDate - aDate;
      }
    });
  
  useEffect(() => {
    loadTodos();
  }, [loadTodos]);
  
  // Initial page load animations
  useEffect(() => {
    // Header animation
    gsap.fromTo(
      headerRef.current,
      { y: -50, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.8, ease: "power3.out" }
    );
    
    // Filters animation
    gsap.fromTo(
      filtersRef.current,
      { y: -20, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.6, delay: 0.2, ease: "power2.out" }
    );
    
    // Add button animation
    gsap.fromTo(
      addButtonRef.current,
      { scale: 0, opacity: 0 },
      { 
        scale: 1, 
        opacity: 1, 
        duration: 0.5, 
        delay: 0.5, 
        ease: "back.out(1.7)" 
      }
    );
    
    // Animate background gradient
    gsap.fromTo(
      ".bg-gradient",
      { opacity: 0 },
      { opacity: 0.9, duration: 1.2, ease: "power2.out" }
    );
  }, []);
  
  // Animate todo list when it changes
  useEffect(() => {
    if (todoListRef.current) {
      const todoItems = todoListRef.current.querySelectorAll('.todo-item:not(.animated)');
      
      if (todoItems.length > 0) {
        gsap.fromTo(
          todoItems,
          { y: 20, opacity: 0 },
          { 
            y: 0, 
            opacity: 1, 
            duration: 0.4, 
            stagger: 0.05,
            ease: "power2.out",
            onComplete: () => {
              // Mark as animated
              todoItems.forEach(el => el.classList.add('animated'));
            }
          }
        );
      }
    }
  }, [filteredTodos]);
  
  // Animate todo form when adding a new todo
  useEffect(() => {
    if (isAddingTodo && todoFormRef.current) {
      gsap.fromTo(
        todoFormRef.current,
        { y: -20, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.3, ease: "power2.out" }
      );
    }
  }, [isAddingTodo]);
  
  // Handle new todo submission
  const handleAddTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newTodoTitle.trim()) return;
    
    const newTodo = await addTodo({
      title: newTodoTitle.trim(),
      completed: false,
      priority: newTodoPriority,
      due_date: newTodoDueDate ? new Date(newTodoDueDate).toISOString() : null
    });
    
    if (newTodo) {
      setNewTodoTitle('');
      setNewTodoPriority('medium');
      setNewTodoDueDate('');
      setIsAddingTodo(false);
    }
  };
  
  // Handle todo completion toggle with animation
  const handleToggleComplete = async (todoId: string, currentStatus: boolean, element: HTMLElement) => {
    // Add completion animation
    if (!currentStatus) {
      gsap.to(element, {
        backgroundColor: 'rgba(209, 250, 229, 0.3)',
        duration: 0.3,
        onComplete: () => {
          updateTodo(todoId, { completed: !currentStatus });
        }
      });
    } else {
      updateTodo(todoId, { completed: !currentStatus });
    }
  };
  
  // Handle todo deletion with animation
  const handleDeleteTodo = async (todoId: string, element: HTMLElement) => {
    // Animate before deletion
    gsap.to(element, {
      x: 50,
      opacity: 0,
      height: 0,
      marginBottom: 0,
      paddingTop: 0,
      paddingBottom: 0,
      duration: 0.3,
      onComplete: () => {
        deleteTodo(todoId);
      }
    });
  };
  
  // Start editing a todo
  const handleStartEdit = (todo: Todo) => {
    setEditingTodo(todo);
    setEditTitle(todo.title);
    setEditPriority(todo.priority);
    setEditDueDate(todo.due_date ? todo.due_date.slice(0, 10) : '');
  };
  
  // Cancel editing
  const handleCancelEdit = () => {
    setEditingTodo(null);
  };
  
  // Save todo edits
  const handleSaveEdit = async () => {
    if (!editingTodo || !editTitle.trim()) return;
    
    await updateTodo(editingTodo.id, {
      title: editTitle.trim(),
      priority: editPriority,
      due_date: editDueDate ? new Date(editDueDate).toISOString() : null
    });
    
    setEditingTodo(null);
  };
  
  const handleSort = (field: 'priority' | 'due_date' | 'created_at') => {
    if (sortBy === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortDirection('desc');
    }
  };
  
  // Format date for display
  const formatDueDate = (dateString: string | null | undefined) => {
    if (!dateString) return '';
    
    const dueDate = new Date(dateString);
    
    if (isToday(dueDate)) {
      return 'Today';
    } else if (isPast(dueDate)) {
      return `Overdue: ${format(dueDate, 'MMM d')}`;
    } else {
      return format(dueDate, 'MMM d');
    }
  };
  
  // Get styling for priority badge
  const getPriorityStyles = (priority: 'low' | 'medium' | 'high') => {
    const option = PRIORITY_OPTIONS.find(opt => opt.value === priority);
    return {
      bg: option?.bgColor || 'bg-gray-100',
      text: option?.textColor || 'text-gray-700',
      hover: option?.hoverBg || 'hover:bg-gray-200',
      gradient: option?.gradient || 'from-gray-400 to-gray-500'
    };
  };
  
  return (
    <div className="min-h-screen bg-gray-50 overflow-x-hidden">
      {/* Background gradient */}
      <div className="bg-gradient absolute top-0 left-0 right-0 h-48 bg-gradient-to-r from-purple-500 to-indigo-600 opacity-0 -z-10"></div>
      <div className="absolute top-0 left-0 right-0 h-48 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-30 -z-5"></div>
      
      {/* Header */}
      <div ref={headerRef} className="backdrop-blur-sm bg-white/80 shadow-sm z-50 sticky top-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <Link to="/" className="mr-4 p-2 rounded-full hover:bg-white/50 transition-all">
                <ArrowLeft className="h-6 w-6 text-indigo-600" />
              </Link>
              <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">Todo List</h1>
            </div>
          </div>
        </div>
      </div>
      
      {/* Filters */}
      <div ref={filtersRef} className="backdrop-blur-sm bg-white/80 border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap py-3 gap-3">
            <div className="flex space-x-2 px-2 py-1 bg-white/80 rounded-lg border border-gray-200 shadow-sm">
              <button
                className={`px-3 py-1 rounded-md text-sm font-medium transition duration-150 ${
                  filter === 'all' ? 'bg-indigo-100 text-indigo-800 shadow-sm' : 'text-gray-600 hover:bg-gray-100'
                }`}
                onClick={() => setFilter('all')}
              >
                All
              </button>
              <button
                className={`px-3 py-1 rounded-md text-sm font-medium transition duration-150 ${
                  filter === 'active' ? 'bg-indigo-100 text-indigo-800 shadow-sm' : 'text-gray-600 hover:bg-gray-100'
                }`}
                onClick={() => setFilter('active')}
              >
                Active
              </button>
              <button
                className={`px-3 py-1 rounded-md text-sm font-medium transition duration-150 ${
                  filter === 'completed' ? 'bg-indigo-100 text-indigo-800 shadow-sm' : 'text-gray-600 hover:bg-gray-100'
                }`}
                onClick={() => setFilter('completed')}
              >
                Completed
              </button>
            </div>
            
            <div className="flex space-x-2 px-2 py-1 bg-white/80 rounded-lg border border-gray-200 shadow-sm">
              <button
                className={`px-3 py-1 rounded-md text-sm font-medium transition duration-150 ${
                  priorityFilter === 'all' ? 'bg-indigo-100 text-indigo-800 shadow-sm' : 'text-gray-600 hover:bg-gray-100'
                }`}
                onClick={() => setPriorityFilter('all')}
              >
                All Priority
              </button>
              {PRIORITY_OPTIONS.map(option => (
                <button
                  key={option.value}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition duration-150 ${
                    priorityFilter === option.value 
                      ? `${option.bgColor} shadow-sm` 
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                  onClick={() => setPriorityFilter(option.value as 'low' | 'medium' | 'high')}
                >
                  {option.label}
                </button>
              ))}
            </div>
            
            <div className="ml-auto flex space-x-2 px-2 py-1 bg-white/80 rounded-lg border border-gray-200 shadow-sm">
              <button
                className={`px-3 py-1 rounded-md text-sm font-medium flex items-center transition duration-150 ${
                  sortBy === 'priority' ? 'bg-indigo-100 text-indigo-800 shadow-sm' : 'text-gray-600 hover:bg-gray-100'
                }`}
                onClick={() => handleSort('priority')}
              >
                Priority
                {sortBy === 'priority' && (
                  sortDirection === 'asc' ? <ChevronUp className="ml-1 h-3 w-3" /> : <ChevronDown className="ml-1 h-3 w-3" />
                )}
              </button>
              <button
                className={`px-3 py-1 rounded-md text-sm font-medium flex items-center transition duration-150 ${
                  sortBy === 'due_date' ? 'bg-indigo-100 text-indigo-800 shadow-sm' : 'text-gray-600 hover:bg-gray-100'
                }`}
                onClick={() => handleSort('due_date')}
              >
                Due Date
                {sortBy === 'due_date' && (
                  sortDirection === 'asc' ? <ChevronUp className="ml-1 h-3 w-3" /> : <ChevronDown className="ml-1 h-3 w-3" />
                )}
              </button>
              <button
                className={`px-3 py-1 rounded-md text-sm font-medium flex items-center transition duration-150 ${
                  sortBy === 'created_at' ? 'bg-indigo-100 text-indigo-800 shadow-sm' : 'text-gray-600 hover:bg-gray-100'
                }`}
                onClick={() => handleSort('created_at')}
              >
                Created
                {sortBy === 'created_at' && (
                  sortDirection === 'asc' ? <ChevronUp className="ml-1 h-3 w-3" /> : <ChevronDown className="ml-1 h-3 w-3" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Content */}
      <div className="max-w-3xl mx-auto p-4 sm:px-6 lg:p-8">
        {/* Add Todo Button */}
        {!isAddingTodo ? (
          <button
            className="w-full py-3 px-4 bg-white rounded-xl shadow-md border border-gray-200 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-center text-gray-700 font-medium mb-6"
            onClick={() => setIsAddingTodo(true)}
          >
            <Plus className="w-5 h-5 mr-2 text-indigo-600" />
            Add New Todo
          </button>
        ) : (
          <div className="bg-white rounded-xl shadow-md border border-gray-200 p-5 mb-6 transform transition-all">
            <form 
              ref={todoFormRef}
              onSubmit={handleAddTodo}
              className="flex flex-col sm:flex-row gap-3"
            >
              <input
                type="text"
                placeholder="What needs to be done?"
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                value={newTodoTitle}
                onChange={(e) => setNewTodoTitle(e.target.value)}
                autoFocus
              />
              
              <div className="flex space-x-2">
                <select
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  value={newTodoPriority}
                  onChange={(e) => setNewTodoPriority(e.target.value as 'low' | 'medium' | 'high')}
                >
                  {PRIORITY_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                
                <input
                  type="date"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  value={newTodoDueDate}
                  onChange={(e) => setNewTodoDueDate(e.target.value)}
                />
              </div>
              
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                  onClick={() => setIsAddingTodo(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg hover:from-indigo-600 hover:to-purple-700 shadow-sm hover:shadow transition-all"
                  disabled={!newTodoTitle.trim()}
                >
                  Add Todo
                </button>
              </div>
            </form>
          </div>
        )}
        
        {/* Todo List */}
        <div ref={todoListRef} className="space-y-4">
          {filteredTodos.length === 0 ? (
            <div className="bg-white rounded-xl shadow-md border border-gray-200 p-8 text-center text-gray-500">
              {filter === 'all' && priorityFilter === 'all' 
                ? (
                  <div className="flex flex-col items-center">
                    <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mb-4">
                      <Check className="h-10 w-10 text-indigo-500" />
                    </div>
                    <p>You don't have any tasks yet. Add one to get started!</p>
                  </div>
                ) 
                : "No tasks match your filters."}
            </div>
          ) : (
            filteredTodos.map(todo => (
              <div 
                key={todo.id} 
                className={`bg-white rounded-xl shadow-md border-l-4 group hover:shadow-lg transition-all duration-200 ${
                  todo.completed 
                    ? 'border-green-500' 
                    : todo.priority === 'high' 
                      ? 'border-red-500' 
                      : todo.priority === 'medium' 
                        ? 'border-yellow-500' 
                        : 'border-blue-500'
                }`}
              >
                {editingTodo?.id === todo.id ? (
                  <div className="p-5">
                    <input
                      type="text"
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 mb-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      autoFocus
                    />
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Priority
                        </label>
                        <select
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                          value={editPriority}
                          onChange={(e) => setEditPriority(e.target.value as 'low' | 'medium' | 'high')}
                        >
                          {PRIORITY_OPTIONS.map(option => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Due Date (Optional)
                        </label>
                        <input
                          type="date"
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                          value={editDueDate}
                          onChange={(e) => setEditDueDate(e.target.value)}
                        />
                      </div>
                    </div>
                    
                    <div className="flex justify-end space-x-2">
                      <button
                        type="button"
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                        onClick={handleCancelEdit}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg hover:from-indigo-600 hover:to-purple-700 shadow-sm hover:shadow transition-all"
                        onClick={handleSaveEdit}
                        disabled={!editTitle.trim()}
                      >
                        Save Changes
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-5 flex items-start gap-3">
                    <button
                      className={`flex-shrink-0 h-6 w-6 rounded-full border ${
                        todo.completed 
                          ? 'bg-gradient-to-r from-green-400 to-green-500 border-green-500 text-white shadow-sm' 
                          : 'bg-white border-gray-300 hover:border-indigo-500 hover:shadow-sm transition-all'
                      }`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleComplete(todo.id, todo.completed, e.currentTarget);
                      }}
                    >
                      {todo.completed && <Check className="h-5 w-5 mx-auto" />}
                    </button>
                    
                    <div className="flex-grow min-w-0">
                      <div className={`text-gray-900 font-medium break-words ${todo.completed ? 'line-through text-gray-500' : ''}`}>
                        {todo.title}
                      </div>
                      
                      <div className="mt-1 flex flex-wrap gap-2 items-center text-xs text-gray-500">
                        <span className={`px-2 py-1 rounded-full bg-gradient-to-r ${getPriorityStyles(todo.priority).gradient} text-white font-medium shadow-sm`}>
                          {PRIORITY_OPTIONS.find(opt => opt.value === todo.priority)?.label}
                        </span>
                        
                        {todo.due_date && (
                          <span className={`flex items-center px-2 py-1 rounded-full ${
                            isPast(new Date(todo.due_date)) && !todo.completed 
                              ? 'bg-red-100 text-red-700' 
                              : 'bg-gray-100 text-gray-700'
                          }`}>
                            {isPast(new Date(todo.due_date)) && !todo.completed ? (
                              <AlertCircle className="h-3 w-3 mr-1" />
                            ) : (
                              <Calendar className="h-3 w-3 mr-1" />
                            )}
                            {formatDueDate(todo.due_date)}
                          </span>
                        )}
                        
                        <span className="flex items-center">
                          <Clock className="h-3 w-3 mr-1" />
                          Added {format(new Date(todo.created_at), 'MMM d')}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex-shrink-0 flex space-x-1 opacity-70 group-hover:opacity-100 transition-opacity">
                      <button
                        className="p-1 text-gray-400 hover:text-indigo-600 transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStartEdit(todo);
                        }}
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteTodo(todo.id, e.currentTarget);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
        
        {/* Summary */}
        {todos.length > 0 && (
          <div className="mt-6 p-4 bg-white rounded-xl border border-gray-200 shadow-md text-sm text-gray-500 flex justify-between items-center">
            <div>
              <span className="font-medium">{todos.filter(t => !t.completed).length}</span> items left
            </div>
            
            <div className="flex items-center gap-3">
              <span className="text-green-500 flex items-center">
                <CheckCircle2 className="h-4 w-4 inline-block mr-1" />
                <span className="font-medium">{todos.filter(t => t.completed).length}</span> completed
              </span>
              <span className="text-red-500 flex items-center">
                <AlertCircle className="h-4 w-4 inline-block mr-1" />
                <span className="font-medium">{todos.filter(t => !t.completed && t.due_date && isPast(new Date(t.due_date))).length}</span> overdue
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TodoPage; 