import {
  createContext,
  type MutableRefObject,
  type ReactNode,
  useContext,
  useRef,
} from "react";

type AuthLayoutContextValue = {
  typingImpulseRef: MutableRefObject<number>;
};

const AuthLayoutContext = createContext<AuthLayoutContextValue | null>(null);

export function AuthLayoutProvider({
  children,
}: Readonly<{ children: ReactNode }>) {
  const typingImpulseRef = useRef(0);
  return (
    <AuthLayoutContext.Provider value={{ typingImpulseRef }}>
      {children}
    </AuthLayoutContext.Provider>
  );
}

export function useAuthTypingImpulse(): MutableRefObject<number> {
  const ctx = useContext(AuthLayoutContext);
  if (!ctx) {
    throw new Error("useAuthTypingImpulse must be used inside the _auth layout");
  }
  return ctx.typingImpulseRef;
}
