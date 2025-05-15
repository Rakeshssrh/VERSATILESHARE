import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { MongoDBStatusBanner } from '../../components/auth/MongoDBStatusBanner';
import { checkDatabaseConnection } from '../../services/resource.service';
import { motion } from 'framer-motion';
import { Book, BookOpen, Award, Calendar, User, Clock, Bookmark, FileText, Video, Link as LinkIcon, BarChart3, ArrowRight } from 'lucide-react';
import DashboardCard from '../../components/dashboard/DashboardCard';
import { useAuth as useAuthContext } from '../../contexts/AuthContext';
import { CircularProgress } from '../../components/ui/CircularProgress';
import { ActivityCalendar } from '../../components/student/ActivityCalendar';
import { StudentStatsChart } from '../../components/student/StudentStatsChart';
import { ActivityFeed } from '../../components/user/ActivityFeed';
import {activityService}  from '../../services/activity.service';
import api from '../../services/api';

const StudentDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const [streak, setStreak] = useState(0);
  const [todayActivities, setTodayActivities] = useState(0);
  const [weeklyActivity, setWeeklyActivity] = useState<any[]>([]);
  const [bookmarks, setBookmarks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dbStatus, setDbStatus] = useState<any>(null);
  const [isCheckingDb, setIsCheckingDb] = useState(false);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setIsLoading(true);
      try {
        // Get user's current streak - if userId is needed, use user?._id
        const userStreak = await activityService.getUserDailyStreak(user?._id);
        setStreak(userStreak);
        
        // Get today's activities - if userId is needed, use user?._id
        const todayActivityData = await activityService.getTodayActivities(user?._id);
        setTodayActivities(todayActivityData.length || 0);
        
        // Get weekly activities - if userId is needed, use user?._id
        const weekActivity = await activityService.getWeeklyActivities(user?._id);
        setWeeklyActivity(weekActivity);
        
        // Get user's bookmarks
        try {
          const bookmarksResponse = await api.get('/api/user/bookmarks');
          setBookmarks(bookmarksResponse.data.bookmarks || []);
        } catch (error) {
          console.error("Error fetching bookmarks:", error);
          setBookmarks([]);
        }
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchDashboardData();
  }, [user]);
  
  // Function to check database connection
  const checkConnection = async () => {
    setIsCheckingDb(true);
    try {
      const status = await checkDatabaseConnection();
      setDbStatus(status);
      console.log('MongoDB connection status in Student Dashboard:', status);
    } catch (err) {
      console.error('Failed to check DB connection:', err);
    } finally {
      setIsCheckingDb(false);
    }
  };
  
  useEffect(() => {
    checkConnection();
    
    // Check connection status every 30 seconds
    const intervalId = setInterval(checkConnection, 30000);
    
    return () => clearInterval(intervalId);
  }, []);

  const fadeIn = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };
  
  return (
    <div>
      <MongoDBStatusBanner status={dbStatus} onRefresh={checkConnection} />
      <div className="p-6">
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          transition={{ duration: 0.5 }}
          className="mb-6"
        >
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
            Welcome back, {user?.fullName || 'Student'}!
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </motion.div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <motion.div 
            variants={fadeIn} 
            initial="hidden" 
            animate="visible" 
            transition={{ delay: 0.1 }}
          >
            <DashboardCard
              title="Semester"
              value={user?.semester?.toString() || '1'}
              icon={<Calendar className="h-8 w-8 text-blue-500" />}
              color="blue"
              onClick={() => navigate('/study-materials')}
            />
          </motion.div>
          
          <motion.div 
            variants={fadeIn} 
            initial="hidden" 
            animate="visible" 
            transition={{ delay: 0.2 }}
          >
            <DashboardCard
              title="Daily Streak"
              value={streak.toString()}
              icon={<Award className="h-8 w-8 text-yellow-500" />}
              color="yellow"
              description="days in a row"
            />
          </motion.div>
          
          <motion.div 
            variants={fadeIn} 
            initial="hidden" 
            animate="visible" 
            transition={{ delay: 0.3 }}
          >
            <DashboardCard
              title="Activities Today"
              value={todayActivities.toString()}
              icon={<Clock className="h-8 w-8 text-green-500" />}
              color="green"
              description="resources interacted with"
            />
          </motion.div>
          
          <motion.div 
            variants={fadeIn} 
            initial="hidden" 
            animate="visible" 
            transition={{ delay: 0.4 }}
          >
            <DashboardCard
              title="Bookmarks"
              value={bookmarks.length.toString()}
              icon={<Bookmark className="h-8 w-8 text-purple-500" />}
              color="purple"
              onClick={() => navigate('/bookmarks')}
            />
          </motion.div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <motion.div 
            className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm"
            variants={fadeIn}
            initial="hidden"
            animate="visible"
            transition={{ delay: 0.5 }}
          >
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white flex items-center">
                <BarChart3 className="mr-2 h-5 w-5 text-indigo-600" />
                Weekly Activity
              </h2>
              <StudentStatsChart data={weeklyActivity} />
            </div>
          </motion.div>
          
          <motion.div
            variants={fadeIn}
            initial="hidden"
            animate="visible"
            transition={{ delay: 0.6 }}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-sm"
          >
            <ActivityCalendar 
              data={weeklyActivity}
              isLoading={isLoading}
            />
          </motion.div>
        </div>
        
        {/* Make ActivityFeed take full width */}
        <motion.div 
          className="w-full bg-white dark:bg-gray-800 rounded-lg shadow-sm mb-8"
          variants={fadeIn}
          initial="hidden"
          animate="visible"
          transition={{ delay: 0.7 }}
        >
          <ActivityFeed 
            limit={3}
            showTitle={true}
            autoRefresh={true}
          />
        </motion.div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <motion.div 
            className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 lg:col-span-3"
            variants={fadeIn}
            initial="hidden"
            animate="visible"
            transition={{ delay: 0.7 }}
          >
            <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white flex items-center">
              <Book className="mr-2 h-5 w-5 text-indigo-600" />
              Latest Study Materials
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {isLoading ? (
                Array(3).fill(0).map((_, index) => (
                  <div key={index} className="bg-gray-100 dark:bg-gray-700 rounded-lg h-32 animate-pulse"></div>
                ))
              ) : (
                <>
                  <div 
                    className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer flex flex-col"
                    onClick={() => navigate('/study-materials')}
                  >
                    <div className="bg-blue-100 dark:bg-blue-900 p-2 rounded-lg w-10 h-10 flex items-center justify-center mb-3">
                      <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <h3 className="font-medium text-gray-800 dark:text-gray-200">Documents</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Lecture notes, materials</p>
                    <div className="mt-auto pt-2">
                      <button className="text-indigo-600 dark:text-indigo-400 text-sm flex items-center">
                        Browse <ArrowRight className="ml-1 h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  
                  <div 
                    className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer flex flex-col"
                    onClick={() => navigate('/study-materials')}
                  >
                    <div className="bg-red-100 dark:bg-red-900 p-2 rounded-lg w-10 h-10 flex items-center justify-center mb-3">
                      <Video className="h-5 w-5 text-red-600 dark:text-red-400" />
                    </div>
                    <h3 className="font-medium text-gray-800 dark:text-gray-200">Videos</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Tutorial videos, lectures</p>
                    <div className="mt-auto pt-2">
                      <button className="text-indigo-600 dark:text-indigo-400 text-sm flex items-center">
                        Browse <ArrowRight className="ml-1 h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  
                  <div 
                    className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer flex flex-col"
                    onClick={() => navigate('/placement-resources')}
                  >
                    <div className="bg-green-100 dark:bg-green-900 p-2 rounded-lg w-10 h-10 flex items-center justify-center mb-3">
                      <LinkIcon className="h-5 w-5 text-green-600 dark:text-green-400" />
                    </div>
                    <h3 className="font-medium text-gray-800 dark:text-gray-200">Placement</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Interview prep, resources</p>
                    <div className="mt-auto pt-2">
                      <button className="text-indigo-600 dark:text-indigo-400 text-sm flex items-center">
                        Browse <ArrowRight className="ml-1 h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;
