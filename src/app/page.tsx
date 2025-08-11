'use client'

import { useState } from 'react'
import { supabase, Restaurant } from '@/lib/supabase'

export default function Home() {
  const [searchQuery, setSearchQuery] = useState('')
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)

  const handleSearch = async () => {
    if (!searchQuery.trim()) return

    setIsLoading(true)
    setHasSearched(true)

    try {
      const { data, error } = await supabase
        .from('restaurants')
        .select('*')
        .or(`name.ilike.%${searchQuery}%,location.ilike.%${searchQuery}%,aliases.ilike.%${searchQuery}%`)
        .limit(20)

      if (error) {
        console.error('Search error:', error)
        setRestaurants([])
      } else {
        setRestaurants(data || [])
      }
    } catch (error) {
      console.error('Search failed:', error)
      setRestaurants([])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  const getButtonColors = (portal: string) => {
    const portalLower = portal.toLowerCase()
    switch (portalLower) {
      case 'opentable':
        return 'bg-red-600 hover:bg-red-700'
      case 'resy':
        return 'bg-orange-600 hover:bg-orange-800'
      case 'tock':
        return 'bg-blue-600 hover:bg-blue-700'
      case 'direct':
        return 'bg-black hover:bg-gray-800'
      case 'yelp':
        return 'bg-yellow-600 hover:bg-yellow-700'
      case 'google':
        return 'bg-green-600 hover:bg-green-700'
      default:
        return 'bg-gray-600 hover:bg-gray-700'
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            ResFinder
          </h1>
          <p className="text-xl text-gray-600">
            Find a direct link to a restaurant's reservation page
          </p>
        </div>

        {/* Search Bar */}
        <div className="max-w-2xl mx-auto mb-12">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Search by name"
              className="w-full px-6 py-4 text-lg border border-gray-300 rounded-full shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button 
              onClick={handleSearch}
              disabled={isLoading}
              className="absolute right-2 top-2 bg-blue-600 text-white px-6 py-2 rounded-full hover:bg-blue-700 transition-colors disabled:bg-gray-400"
            >
              {isLoading ? 'Searching...' : 'Search'}
            </button>
          </div>
        </div>

        {/* Search Results */}
        {hasSearched && (
          <div className="max-w-4xl mx-auto">
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Searching restaurants...</p>
              </div>
            ) : restaurants.length > 0 ? (
              <div className="space-y-4">
                <h2 className="text-2xl font-semibold text-gray-900 mb-6">
                  Found {restaurants.length} restaurant{restaurants.length !== 1 ? 's' : ''}
                </h2>
                {restaurants.map((restaurant) => (
                  <div key={restaurant.id} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">
                          {restaurant.name}
                        </h3>
                        <p className="text-gray-600 mb-3">{restaurant.location}</p>
                        {/* <div className="flex items-center gap-2">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {restaurant.booking_portal}
                          </span>
                        </div> */}
                      </div>
                                                                    <a
                         href={restaurant.booking_url}
                         target="_blank"
                         rel="noopener noreferrer"
                         className={`${getButtonColors(restaurant.booking_portal)} text-white px-4 py-2 rounded-lg transition-colors font-medium`}
                       >
                         {restaurant.booking_portal}
                       </a>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-600 text-lg">No restaurants found matching your search.</p>
                <p className="text-gray-500 mt-2">Try searching for a different restaurant, location, or cuisine.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
