import { createContext, useContext } from 'react';
import { type User } from './api';

export const Auth = createContext<{
  user: User | null;
  setUser: (u: User | null) => void;
  ready: boolean;
}>({ user: null, setUser: () => {}, ready: false });

export const useAuth = () => useContext(Auth);
