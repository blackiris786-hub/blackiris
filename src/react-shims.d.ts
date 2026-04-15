// Temporary shims to satisfy TypeScript when dependencies are missing
// and to provide basic JSX support. These should be removed once
// proper `npm install` is run and type packages are available.

// Temporary shims to satisfy TypeScript when dependencies are missing
// and to provide basic JSX support. These should be removed once
// proper `npm install` is run and type packages are available.

// minimal React declarations
declare module 'react' {
  export function useState<T>(initial: T): [T, (v: T | ((prev: T) => T)) => void];
  export function useEffect(effect: () => void | (() => void), deps?: any[]): void;
  export function useContext<T>(context: any): T;
  export function useCallback<T extends (...args: any[]) => any>(callback: T, deps: any[]): T;
  export function useRef<T>(initial: T): { current: T };
  export function createContext<T>(defaultValue: T): any;
  export type ReactNode = any;
  export const StrictMode: any;
  export class Component<P = any, S = any> {
    constructor(props: P, context?: any);
    props: P;
    state: S;
    context: any;
    refs: any;
    setState<K extends keyof S>(
      state: ((prevState: S, props: P) => Pick<S, K> | S | null) | (Pick<S, K> | S | null),
      callback?: () => void
    ): void;
    forceUpdate(callback?: () => void): void;
  }
  export type PropsWithChildren<P> = P & { children?: ReactNode };
  export interface ErrorInfo {
    componentStack?: string;
  }
  export type FC<P = {}> = any;
  export type ComponentType<P = any> = any;
  export type JSXElementConstructor<P> = any;
  const React: any;
  export default React;
}

declare module 'react-dom/client' {
  export function createRoot(...args: any[]): any;
}

declare module 'react/jsx-runtime' {
  export function jsx(type: any, props: any, key?: any): any;
  export function jsxs(type: any, props: any, key?: any): any;
  export function jsxDEV(type: any, props: any, key?: any): any;
}

// lucide icons used in the project
declare module 'lucide-react' {
  import { ComponentType, SVGProps } from 'react';
  export const Leaf: ComponentType<SVGProps<any>>;
  export const Loader2: ComponentType<SVGProps<any>>;
  export const Plus: ComponentType<SVGProps<any>>;
  export const LogOut: ComponentType<SVGProps<any>>;
  export const Award: ComponentType<SVGProps<any>>;
  export const MessageCircle: ComponentType<SVGProps<any>>;
  export const User: ComponentType<SVGProps<any>>;
  export const Upload: ComponentType<SVGProps<any>>;
  export const X: ComponentType<SVGProps<any>>;
  export const ArrowLeft: ComponentType<SVGProps<any>>;
  export const Send: ComponentType<SVGProps<any>>;
  export const Trash2: ComponentType<SVGProps<any>>;
  export const Heart: ComponentType<SVGProps<any>>;
  export const ChevronDown: ComponentType<SVGProps<any>>;
  export const Check: ComponentType<SVGProps<any>>;
  export const Globe: ComponentType<SVGProps<any>>;
  export const Eye: ComponentType<SVGProps<any>>;
  export const EyeOff: ComponentType<SVGProps<any>>;
  export const Mail: ComponentType<SVGProps<any>>;
  export const Users: ComponentType<SVGProps<any>>;
}

declare module '@vitejs/plugin-react';
declare module 'vite';

declare module '@supabase/supabase-js' {
  export function createClient(...args: any[]): any;
  export type User = any;
  export type Session = any;
  export type RealtimeSubscription = any;
  export interface SupabaseClient {
    auth: any;
    from: any;
    storage: any;
  }
}

interface ImportMeta {
  env: {
    [key: string]: any;
  };
}

declare namespace React {
  type FormEvent = any;
  type ChangeEvent<T = any> = any;
}

declare namespace JSX {
  interface IntrinsicElements {
    [elemName: string]: any;
  }
}
