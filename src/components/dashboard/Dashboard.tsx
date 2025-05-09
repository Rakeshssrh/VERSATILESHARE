import { useState, useEffect, useCallback, useRef } from 'react';
import { BarChart2, Book, X } from 'lucide-react';
import { UserBanner } from '../user/UserBanner';
import { AnalyticsCard } from '../analytics/AnalyticsCard';
import { QuickAccess } from '../resources/QuickAccess';
import { ActivityFeed } from '../user/ActivityFeed';
import { useAuth } from '../../hooks/useAuth';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { LocalSearch } from '../search/LocalSearch';
import { FacultyResource } from '../../types/faculty';
import { useNavigate } from 'react-router-dom';
import { useOutsideClick } from '../../hooks/useOutsideClick';

export const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalResources: 0,
    totalViews: 0
  });
  const [resources, setResources] = useState<FacultyResource[]>([]);
  const [searchResults, setSearchResults] = useState<FacultyResource[]>([]);
  const [searchPerformed, setSearchPerformed] = useState(false);
  const searchResultsRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLDivElement>(null);

  // Use outside click hook to close search results
  useOutsideClick(searchResultsRef, () => {
    if (searchPerformed) {
      setSearchPerformed(false);
    }
  }, [searchInputRef]);

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      if (user?.semester) {
        // Fetch resources and stats for the user's semester
        const response = await api.get(`/api/resources/stats?semester=${user.semester}`);
        
        // Calculate total views from all resources of the current semester
        let semesterTotalViews = 0;
        
        // If we have resources array with stats data for the semester
        if (typeof window !== 'undefined' && window.sharedResources && Array.isArray(window.sharedResources)) {
          // Set the resources for local search (include all resources, not just semester-specific)
          setResources(window.sharedResources);
          
          // Filter resources for user's semester for stats calculation
          const semesterResources = window.sharedResources.filter(
            resource => resource.semester === user.semester
          );
          
          // Sum up views from all semester resources
          semesterTotalViews = semesterResources.reduce(
            (sum, resource) => sum + (resource.stats?.views || 0), 
            0
          );
        } else {
          // Fallback: fetch all resources for search
          try {
            const allResourcesResponse = await api.get('/api/resources');
            if (allResourcesResponse.data && Array.isArray(allResourcesResponse.data.resources)) {
              setResources(allResourcesResponse.data.resources);
            }
          } catch (err) {
            console.error('Failed to fetch all resources:', err);
          }
        }
        
        setStats({
          totalResources: response.data.totalResources || 0,
          totalViews: semesterTotalViews || (
            response.data.dailyStats ? 
              response.data.dailyStats.reduce((sum: number, day: any) => sum + day.views, 0) : 0
          )
        });
      }
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, [user]);
  
  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user, fetchDashboardData]);

  // Handle search results
  const handleSearchResults = (results: FacultyResource[], hasSearched: boolean) => {
    setSearchResults(results);
    setSearchPerformed(hasSearched);
  };

  // Handle resource click - track view and navigate to resource based on its type
  const handleResourceClick = async (resource: FacultyResource) => {
    try {
      // Track view if resource has an ID
      if (resource.id || resource._id) {
        const resourceId = resource.id || resource._id;
        await api.post(`/api/resources/${resourceId}/view`);
      }
      
      // Determine the correct path to navigate
      if (resource.subject && resource.category !== 'placement') {
        // For study materials, navigate to subject page
        console.log(`Navigating to subject: /study/${resource.subject}`);
        navigate(`/study/${resource.subject}`);
      } else if (resource.category === 'placement') {
        // For placement resources, navigate to placement page
        console.log('Navigating to placement resources');
        navigate('/placement');
      } else if (resource.id || resource._id) {
        // Default: view the specific resource
        console.log(`Viewing resource directly: ${resource.id || resource._id}`);
        navigate(`/resources/${resource.id || resource._id}`);
      }
      
      // Close search results after navigating
      setSearchPerformed(false);
    } catch (err) {
      console.error('Failed to track view or navigate:', err);
      toast.error('Failed to open resource');
    }
  };

  // Close search results - fixed to properly reset the state
  const handleCloseSearchResults = () => {
    setSearchPerformed(false);
  };

  return (
    <div className="p-6 bg-gray-50 dark:bg-gray-900 max-w-full">
      <div className="mb-6 max-w-6xl mx-auto" ref={searchInputRef}>
        <LocalSearch 
          resources={resources} 
          onSearchResults={handleSearchResults} 
          placeholder="Search through all your resources..."
        />
      </div>
      
      {/* Search results with fixed positioning and proper close button */}
      {searchPerformed && (
        <div 
          ref={searchResultsRef}
          className="mb-6 fixed z-50 top-24 max-w-3xl w-full md:w-3/4 lg:w-2/3 bg-white dark:bg-gray-800 shadow-lg rounded-lg border border-gray-200 dark:border-gray-700 max-h-[70vh] overflow-y-auto"
          style={{ left: "58%", top:"20%", transform: "translateX(-50%)", maxWidth: "calc(100% - 32px)" }}
        >
          <div className="p-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Search Results</h2>
              <button
                onClick={handleCloseSearchResults}
                className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                aria-label="Close search results"
                type="button"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {searchResults.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {searchResults.map((resource) => (
                  <div 
                    key={resource.id || resource._id}
                    className="bg-white dark:bg-gray-700 p-4 rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => handleResourceClick(resource)}
                  >
                    <h3 className="font-medium text-indigo-600 dark:text-indigo-400">{resource.title}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-300 mt-1">{resource.description}</p>
                    <div className="flex items-center mt-2 text-xs text-gray-500 dark:text-gray-400">
                      <span className="mr-3 capitalize">{resource.type}</span>
                      <span className="mr-3">{resource.subject}</span>
                      {resource.category === 'placement' ? (
                        <span>Placement Resource</span>
                      ) : (
                        <span>Semester {resource.semester}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-700 p-6 rounded-lg shadow text-center">
                <p className="text-gray-600 dark:text-gray-300">No resources found matching your search.</p>
              </div>
            )}
          </div>
        </div>
      )}
      
      <div className={`mt-8 ${searchPerformed ? 'opacity-20 pointer-events-none' : ''}`}>
        <UserBanner />
      </div>

      <div className={searchPerformed ? 'opacity-20 pointer-events-none' : ''}>
        <QuickAccess />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <AnalyticsCard
            title="Total Resources"
            value={stats.totalResources.toString()}
            change={loading ? "loading..." : ""}
            icon={<Book className="h-6 w-6 text-indigo-600" />}
          />
          <AnalyticsCard
            title="Total Views"
            value={stats.totalViews.toString()}
            change={loading ? "loading..." : ""}
            icon={<BarChart2 className="h-6 w-6 text-indigo-600" />}
          />
        </div>

        <div className="w-full">
          <ActivityFeed limit={3} showTitle={true} autoRefresh={true} />
        </div>
      </div>
    </div>
  );
};
