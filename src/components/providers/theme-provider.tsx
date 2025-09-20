"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"
import { type ThemeProviderProps } from "next-themes/dist/types"

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}

// Installation of next-themes would be needed: npm install next-themes
// Since I cannot add dependencies, this is a placeholder implementation.
// If next-themes is not available, a custom implementation using React Context and localStorage would be required.
// For the purpose of this exercise, we'll assume next-themes is installed.
