"use client";

import {
  IconButton,
  Skeleton,
  Span,
  Menu,
  Portal,
  Button,
} from "@chakra-ui/react";
import { ThemeProvider, useTheme } from "next-themes";
import { useState, useEffect } from "react";

import * as React from "react";
import { MoonIcon, DesktopIcon, SunIcon } from "@phosphor-icons/react";

export function ColorModeProvider(
  props: React.ComponentProps<typeof ThemeProvider>
) {
  return (
    <ThemeProvider
      attribute="class"
      disableTransitionOnChange
      enableSystem={true}
      defaultTheme="system"
      {...props}
    />
  );
}

export function useColorMode() {
  const [mounted, setMounted] = useState(false);
  const { resolvedTheme, setTheme, theme } = useTheme();

  // useEffect only runs on the client, so now we can safely show the UI
  useEffect(() => {
    setMounted(true);
  }, []);

  const toggleColorMode = () => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  };

  return {
    colorMode: mounted ? resolvedTheme : undefined,
    theme: mounted ? theme : undefined,
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
    return <SunIcon />; // Default to sun icon to prevent layout shift
  }

  return colorMode === "dark" ? <MoonIcon /> : <SunIcon />;
}

export const ColorModeButton = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<typeof IconButton>
>(function ColorModeButton(props, ref) {
  const { toggleColorMode, mounted } = useColorMode();

  // Show skeleton until mounted to prevent layout shift
  if (!mounted) {
    return <Skeleton boxSize="8" rounded="md" />;
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

export function ThemedComponent({
  children,
  fallback,
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

export const ColorModeDropdown = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<typeof Button>
>(function ColorModeDropdown(props, ref) {
  const { setColorMode, theme, mounted } = useColorMode();

  const options = [
    { value: "light", label: "Light", icon: <SunIcon /> },
    { value: "dark", label: "Dark", icon: <MoonIcon /> },
    { value: "system", label: "System", icon: <DesktopIcon /> },
  ];

  const currentOption =
    options.find((option) => option.value === theme) || options[2];

  if (!mounted) {
    return <Skeleton height="8" width="20" rounded="md" />;
  }

  return (
    <Menu.Root positioning={{ placement: "bottom-end" }}>
      <Menu.Trigger asChild>
        <IconButton
          variant="solid"
          colorPalette="primary"
          _hover={{ bg: "primary.fg" }}
          size="sm"
          ref={ref}
          {...props}
        >
          {currentOption.icon}
        </IconButton>
      </Menu.Trigger>
      <Portal>
        <Menu.Positioner>
          <Menu.Content>
            <Menu.RadioItemGroup
              value={theme}
              onValueChange={(e) => setColorMode(e.value)}
            >
              {options.map(({ icon, label, value }) => (
                <Menu.RadioItem
                  key={value}
                  value={value}
                  fontWeight={theme === value ? "semibold" : "normal"}
                  color={theme === value ? "primary.solid" : "fg"}
                >
                  {icon}
                  {label}
                </Menu.RadioItem>
              ))}
            </Menu.RadioItemGroup>
          </Menu.Content>
        </Menu.Positioner>
      </Portal>
    </Menu.Root>
  );
});
