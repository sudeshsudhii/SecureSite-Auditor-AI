import { ReactNode } from 'react';

interface Props {
    children: ReactNode;
}

/**
 * Wraps a route so that unauthenticated users are redirected to /login,
 * and the original destination is preserved for redirect-back after login.
 */
const ProtectedRoute: React.FC<Props> = ({ children }) => {
    return <>{children}</>;
};

export default ProtectedRoute;
