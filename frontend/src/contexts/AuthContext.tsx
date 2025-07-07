import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, UserLogin, UserCreate, Token, AuthContextType } from '../types';
import { authAPI } from '../services/api';
import toast from 'react-hot-toast';

// Create auth context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Auth provider props
interface AuthProviderProps {
  children: ReactNode;
}

// Auth provider component
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check if user is authenticated
  const isAuthenticated = !!user && !!token;

  // Initialize auth state from localStorage
  useEffect(() => {
    const initAuth = async () => {
      try {
        const storedToken = localStorage.getItem('token');
        const storedUser = localStorage.getItem('user');

        if (storedToken && storedUser) {
          setToken(storedToken);
          try {
            // Verify token is still valid by fetching user profile
            const currentUser = await authAPI.getProfile();
            setUser(currentUser);
            // Update stored user data
            localStorage.setItem('user', JSON.stringify(currentUser));
          } catch (error) {
            // Token is invalid, clear storage
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            setToken(null);
            setUser(null);
          }
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  // Direct login with user and token
  const login = (user: User, token: string): void => {
    setUser(user);
    setToken(token);
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
  };

  // Login function with credentials
  const loginWithCredentials = async (credentials: UserLogin): Promise<void> => {
    try {
      setIsLoading(true);
      
      // Get token from API
      const tokenResponse = await authAPI.login(credentials);
      
      // Store token
      setToken(tokenResponse.token);
      localStorage.setItem('token', tokenResponse.token);
      
      // Get user profile
      const userProfile = tokenResponse.user;
      setUser(userProfile);
      localStorage.setItem('user', JSON.stringify(userProfile));
      
      toast.success(`Welcome back, ${userProfile.first_name}!`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred';
      toast.error(`Login failed: ${errorMessage}`);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Register function
  const register = async (userData: UserCreate): Promise<void> => {
    try {
      setIsLoading(true);
      
      // Create user
      const newUser = await authAPI.register(userData);
      
      // Auto-login after successful registration
      await loginWithCredentials({
        username: userData.username,
        password: userData.password,
      });
      
      toast.success(`Welcome, ${newUser.first_name}! Your account has been created.`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred';
      toast.error(`Registration failed: ${errorMessage}`);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Logout function
  const logout = (): void => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    toast.success('Logged out successfully');
  };

  // Update user profile
  const updateProfile = async (userData: Partial<User>): Promise<void> => {
    try {
      const updatedUser = await authAPI.updateProfile(userData);
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
      toast.success('Profile updated successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred';
      toast.error(`Profile update failed: ${errorMessage}`);
      throw error;
    }
  };

  // Context value
  const value: AuthContextType = {
    user,
    token,
    login,
    loginWithCredentials,
    register,
    logout,
    isLoading,
    isAuthenticated,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use auth context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Higher-order component for protected routes
export const withAuth = <P extends object>(
  Component: React.ComponentType<P>
): React.FC<P> => {
  const AuthenticatedComponent: React.FC<P> = (props) => {
    const { isAuthenticated, isLoading } = useAuth();

    if (isLoading) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      );
    }

    if (!isAuthenticated) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Authentication Required
            </h2>
            <p className="text-gray-600 mb-4">
              You need to be logged in to access this page.
            </p>
            <a
              href="/login"
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition duration-200"
            >
              Go to Login
            </a>
          </div>
        </div>
      );
    }

    return <Component {...props} />;
  };

  return AuthenticatedComponent;
};

// Hook for admin-only access
export const useAdminAuth = (): AuthContextType => {
  const auth = useAuth();
  
  if (!auth.isAuthenticated) {
    throw new Error('User is not authenticated');
  }
  
  if (auth.user?.role !== 'admin') {
    throw new Error('Admin access required');
  }
  
  return auth;
};

// Export context for direct usage if needed
export { AuthContext }; 