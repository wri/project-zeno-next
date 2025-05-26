"use client";

import { IconButton, Skeleton, Span } from "@chakra-ui/react";
import { ThemeProvider, useTheme } from "next-themes";
import { useState, useEffect } from "react";

import * as React from "react";
import { Moon, Sun } from "@phosphor-icons/react";

export function ColorModeProvider(props: React.ComponentProps<typeof ThemeProvider>) {
  return (
    <ThemeProvider 
      attribute="class" 
      disableTransitionOnChange 
      enableSystem={false}
      defaultTheme="light"
      {...props} 
    />
  );
}

export function useColorMode() {
  const [mounted, setMounted] = useState(false);
  const { resolvedTheme, setTheme } = useTheme();
  
  // useEffect only runs on the client, so now we can safely show the UI
  useEffect(() => {
    setMounted(true);
  }, []);

  const toggleColorMode = () => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  };

  return {
    colorMode: mounted ? resolvedTheme : undefined,
    setColorMode: setTheme,
    toggleColorMode,
    mounted, // Expose mounted state for components that need it
  };
}

export function useColorModeValue<T>(light: T, dark: T): T | undefined {
  const { colorMode, mounted } = useColorMode();
  
  // Return undefined during SSR and initial client render to prevent hydration mismatch
  if (!mounted) {
    return undefined;
  }
  
  return colorMode === "dark" ? dark : light;
}

export function ColorModeIcon() {
  const { colorMode, mounted } = useColorMode();
  
  // Return a placeholder during SSR/initial render
  if (!mounted) {
    return <Sun />; // Default to sun icon to prevent layout shift
  }
  
  return colorMode === "dark" ? <Moon /> : <Sun />;
}

export const ColorModeButton = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<typeof IconButton>
>(function ColorModeButton(props, ref) {
  const { toggleColorMode, mounted } = useColorMode();
  
  // Show skeleton until mounted to prevent layout shift
  if (!mounted) {
    return (
      <Skeleton 
        boxSize="8" 
        rounded="md"
      />
    );
  }

  return (
    <IconButton
      onClick={toggleColorMode}
      variant="ghost"
      aria-label="Toggle color mode"
      size="sm"
      ref={ref}
      {...props}
      css={{
        _icon: {
          width: "5",
          height: "5",
        },
      }}
    >
      <ColorModeIcon />
    </IconButton>
  );
});

export const LightMode = React.forwardRef(function LightMode(props, ref) {
  return (
    <Span
      color="fg"
      display="contents"
      className="chakra-theme light"
      colorPalette="gray"
      colorScheme="light"
      ref={ref}
      {...props}
    />
  );
});

export const DarkMode = React.forwardRef(function DarkMode(props, ref) {
  return (
    <Span
      color="fg"
      display="contents"
      className="chakra-theme dark"
      colorPalette="gray"
      colorScheme="dark"
      ref={ref}
      {...props}
    />
  );
});

// Safe themed component wrapper that handles hydration properly
export function ThemedComponent({ 
  children, 
  fallback 
}: { 
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const { mounted } = useColorMode();
  
  if (!mounted) {
    return <>{fallback || null}</>;
  }
  
  return <>{children}</>;
}
