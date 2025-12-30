import { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';

/**
 * Custom render function that wraps components with necessary providers
 * Add your app's providers (e.g., Router, Theme, etc.) here
 */
function customRender(ui: ReactElement, options?: Omit<RenderOptions, 'wrapper'>) {
  // Create a wrapper component with all necessary providers
  // const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  //   return (
  //     <ThemeProvider>
  //       {children}
  //     </ThemeProvider>
  //   );
  // };

  return render(ui, { ...options });
}

// Re-export everything
export * from '@testing-library/react';
export { customRender as render };

