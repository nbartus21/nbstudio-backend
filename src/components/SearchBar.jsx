import React from 'react';
import { Search } from 'lucide-react';

const SearchBar = ({
  isSearchOpen,
  setIsSearchOpen,
  searchTerm,
  setSearchTerm,
  handleSearch,
}) => {
  if (!isSearchOpen) {
    return (
      <button
        onClick={() => setIsSearchOpen(true)}
        className="p-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded-md transition-colors"
        title="Keresés"
      >
        <Search size={20} />
      </button>
    );
  }

  return (
    <div className="bg-gray-800 py-2 px-4 absolute top-16 left-0 right-0 md:relative md:top-0 md:bg-transparent">
      <form onSubmit={handleSearch} className="max-w-3xl mx-auto">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full bg-gray-700 border-0 rounded-md py-2 pl-10 pr-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Keresés funkciók között..."
            autoFocus
          />
        </div>
      </form>
    </div>
  );
};

export default SearchBar; 