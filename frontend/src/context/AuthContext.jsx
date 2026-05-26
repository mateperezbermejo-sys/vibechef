import { createContext, useContext, useState } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const token = localStorage.getItem('vibechef_token');
    const email = localStorage.getItem('vibechef_email');
    return token ? { token, email } : null;
  });

  function login(token, email) {
    localStorage.setItem('vibechef_token', token);
    localStorage.setItem('vibechef_email', email);
    setUser({ token, email });
  }

  function logout() {
    localStorage.removeItem('vibechef_token');
    localStorage.removeItem('vibechef_email');
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
