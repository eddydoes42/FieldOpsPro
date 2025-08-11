import { createContext, useContext, useState, ReactNode } from 'react';

interface RoleTestingContextType {
  isRoleTesting: boolean;
  testingRole: string | null;
  originalRole: string | null;
  startRoleTesting: (role: string, originalRole: string) => void;
  stopRoleTesting: () => void;
  getEffectiveRole: () => string | null;
  canPerformAction: (requiredRole: string) => boolean;
}

const RoleTestingContext = createContext<RoleTestingContextType | undefined>(undefined);

export function useRoleTesting() {
  const context = useContext(RoleTestingContext);
  if (context === undefined) {
    throw new Error('useRoleTesting must be used within a RoleTestingProvider');
  }
  return context;
}

export function RoleTestingProvider({ children }: { children: ReactNode }) {
  const [isRoleTesting, setIsRoleTesting] = useState(false);
  const [testingRole, setTestingRole] = useState<string | null>(null);
  const [originalRole, setOriginalRole] = useState<string | null>(null);

  const startRoleTesting = (role: string, original: string) => {
    setIsRoleTesting(true);
    setTestingRole(role);
    setOriginalRole(original);
  };

  const stopRoleTesting = () => {
    setIsRoleTesting(false);
    setTestingRole(null);
    setOriginalRole(null);
  };

  const getEffectiveRole = () => {
    return isRoleTesting ? testingRole : originalRole;
  };

  // Role hierarchy for permission checking
  const roleHierarchy = {
    operations_director: 10,
    administrator: 8,
    manager: 6,
    dispatcher: 4,
    field_agent: 2,
    client: 1
  };

  const canPerformAction = (requiredRole: string) => {
    const effectiveRole = getEffectiveRole();
    if (!effectiveRole) return false;
    
    // Operations Director in god mode can do anything
    if (!isRoleTesting && originalRole === 'operations_director') {
      return true;
    }
    
    // When role testing, restrict to testing role capabilities
    const effectiveLevel = roleHierarchy[effectiveRole as keyof typeof roleHierarchy] || 0;
    const requiredLevel = roleHierarchy[requiredRole as keyof typeof roleHierarchy] || 0;
    
    return effectiveLevel >= requiredLevel;
  };

  return (
    <RoleTestingContext.Provider
      value={{
        isRoleTesting,
        testingRole,
        originalRole,
        startRoleTesting,
        stopRoleTesting,
        getEffectiveRole,
        canPerformAction,
      }}
    >
      {children}
    </RoleTestingContext.Provider>
  );
}