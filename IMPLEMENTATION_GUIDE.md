# Conditional Dropdown Implementation Guide

This document provides instructions for implementing the Conditional Dropdown component in a new React application.

## Component Overview

The `ConditionalDropdown` component is a hierarchical dropdown system that allows:

- Dynamic filtering of options based on parent selections
- Adding new options at any level in the hierarchy
- Bulk importing of multiple options
- Visual indicators (light red checkmarks) for selected options
- Toast notifications for user feedback

## Installation Steps

1. **Set Up a React Project with TypeScript**

   Use Create React App or Vite to create a new project:
   ```bash
   npm create vite@latest my-app -- --template react-ts
   cd my-app
   ```

2. **Install Required Dependencies**

   ```bash
   npm install @ant-design/icons antd @tanstack/react-query tailwindcss class-variance-authority clsx tailwind-merge @radix-ui/react-toast lucide-react wouter
   ```

3. **Install Development Dependencies**

   ```bash
   npm install -D @types/react @types/react-dom @vitejs/plugin-react autoprefixer postcss
   ```

4. **Set Up Tailwind CSS**

   Initialize Tailwind CSS configuration:
   ```bash
   npx tailwindcss init -p
   ```

   Configure your `tailwind.config.js` file with the provided configuration.

5. **Copy Component Files**

   Copy the following files from this package into your project structure:
   - `src/components/ui/ConditionalDropdown.tsx`
   - `src/hooks/use-toast.ts`
   - `src/components/ui/toast.tsx`
   - `src/components/ui/toaster.tsx`
   - `src/components/ui/card.tsx`
   - `src/components/ui/input.tsx`

6. **Create CSS Styles**

   Create an `index.css` file with the necessary styles for the component. Important selector styles include:
   ```css
   .ant-select-dropdown.ant-select-dropdown-dark
   .ant-select.part-type-container .ant-select-selector
   .ant-select-dropdown .ant-select-item-option-selected
   ```

## Basic Usage

```tsx
import { ConditionalDropdown } from '../components/ui/ConditionalDropdown';
import { DropdownConfig } from '../components/ui/ConditionalDropdown';

// Example dropdown configuration
const dropdownConfig: DropdownConfig[] = [
  {
    id: 'brand',
    label: 'Brand',
    options: [
      { value: 'apple', label: 'Apple' },
      { value: 'samsung', label: 'Samsung' },
    ],
    creatable: true,
  },
  {
    id: 'model',
    label: 'Model',
    options: [],
    dependsOn: 'brand',
    creatable: true,
  },
  {
    id: 'color',
    label: 'Color',
    options: [],
    dependsOn: 'model',
    creatable: true,
  }
];

export default function MyPage() {
  return (
    <div className="p-8 bg-black text-white">
      <h1 className="text-2xl mb-4">Device Selection</h1>
      
      <ConditionalDropdown
        config={dropdownConfig}
        storeKey="device-selections"
      />
    </div>
  );
}
```

## Data Persistence

The component uses localStorage for data persistence by default. The `storeKey` prop allows you to specify a unique key for storing selections and custom options.

## Customization

You can customize the appearance and behavior of the component by modifying:

1. **Theme Colors**: Edit the CSS variables and classes to match your application's theme.
2. **Modal Styles**: Modify the styling of modals in the component.
3. **Toast Notifications**: Customize toast styling in the toast.tsx component.

## Additional Configuration

For more advanced use cases, you can extend the component:

- Add validation logic to prevent certain combinations of selections
- Implement server-side storage for options instead of localStorage
- Add additional UI elements for more complex interactions

## Troubleshooting

- If options aren't appearing, check the parent-child relationships in your config
- For styling issues, ensure your Tailwind CSS configuration includes all necessary paths
- If toast notifications aren't showing, ensure you've included the `<Toaster />` component in your app