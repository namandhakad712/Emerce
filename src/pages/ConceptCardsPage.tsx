import React, { useState, useEffect } from 'react';
import { ArrowLeft, Search, BookOpen, FilterIcon, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import ConceptCard from '../components/ConceptCard';
import { useAppContext } from '../context/AppContext';

const categories = [
  { id: 'All', name: 'All' },
  { id: 'Physics', name: 'Physics' },
  { id: 'Chemistry', name: 'Chemistry' },
  { id: 'Biology', name: 'Biology' },
  { id: 'Other', name: 'Other' }
];

const ConceptCardsPage: React.FC = () => {
  const { conceptCards, loadConceptCards, selectedCategory, updateConceptCard, deleteConceptCard } = useAppContext();
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredCards, setFilteredCards] = useState(conceptCards);
  const [showFilters, setShowFilters] = useState(false);
  
  // Filter cards when search query or cards change
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredCards(conceptCards);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = conceptCards.filter(card => 
        card.title.toLowerCase().includes(query) || 
        card.content.toLowerCase().includes(query)
      );
      setFilteredCards(filtered);
    }
  }, [searchQuery, conceptCards]);
  
  // Handle category selection
  const handleCategorySelect = (category: string) => {
    loadConceptCards(category === 'All' ? undefined : category);
  };

  // Clear search query
  const clearSearch = () => {
    setSearchQuery('');
  };
  
  return (
    <div className="min-h-screen bg-gray-50 overflow-x-hidden">
      {/* Background gradient */}
      <div className="absolute top-0 left-0 right-0 h-48 bg-gradient-to-r from-indigo-500 to-purple-600 opacity-90 -z-10"></div>
      <div className="absolute top-0 left-0 right-0 h-48 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-30 -z-5"></div>
      
      {/* Header */}
      <div className="backdrop-blur-sm bg-white/80 shadow-sm z-50 sticky top-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <Link to="/" className="mr-4 p-2 rounded-full hover:bg-white/50 transition-all">
                <ArrowLeft className="h-6 w-6 text-indigo-600" />
              </Link>
              <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">Concept Cards</h1>
            </div>
            <div className="flex items-center space-x-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-indigo-400 h-5 w-5" />
                <input
                  type="text"
                  placeholder="Search concepts..."
                  className="pl-10 pr-10 py-2 border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent shadow-sm hover:shadow transition-all"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button 
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    onClick={clearSearch}
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              <button
                className="p-2 rounded-full bg-white/80 border border-gray-200 shadow-sm hover:shadow transition-all"
                onClick={() => setShowFilters(!showFilters)}
              >
                <FilterIcon className="h-5 w-5 text-indigo-600" />
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Category Bar */}
      <div className={`backdrop-blur-sm bg-white/80 border-b shadow-sm transition-all duration-300 ${showFilters ? 'max-h-20 py-3 opacity-100' : 'max-h-0 opacity-0 overflow-hidden py-0'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-2 overflow-x-auto pb-1 scrollbar-hide">
            {categories.map((category) => (
              <button
                key={category.id}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap border transition-colors ${
                  selectedCategory === category.id
                    ? 'bg-indigo-100 text-indigo-800 border-indigo-200 shadow-sm'
                    : 'text-gray-600 hover:bg-gray-100 border-gray-200'
                }`}
                onClick={() => handleCategorySelect(category.id)}
              >
                {category.name}
              </button>
            ))}
          </div>
        </div>
      </div>
      
      {/* Cards Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {filteredCards.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredCards.map((card) => (
              <ConceptCard key={card.id} card={card} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-gray-200">
            <div className="flex flex-col items-center">
              <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mb-4">
                <BookOpen className="h-10 w-10 text-indigo-500" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No concept cards found</h3>
              <p className="text-gray-500 max-w-md mx-auto">
                {searchQuery
                  ? 'Try a different search term or browse by category'
                  : 'Ask educational questions in the chat to generate concept cards automatically'}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ConceptCardsPage; 