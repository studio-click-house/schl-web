'use client';

import React, { createContext, useContext, useState } from 'react';

import type { ValidateEmailResponse as ValidationResult } from '@repo/common/lib/zero-bounce/index';

interface ValidationContextType {
    validationResults: ValidationResult[];
    currentEmailIndex: number;
    setValidationResults: (results: ValidationResult[]) => void;
    setCurrentEmailIndex: (index: number) => void;
    nextEmail: () => void;
    prevEmail: () => void;
    getCurrentEmail: () => ValidationResult | null;
    clearResults: () => void;
}

const ValidationContext = createContext<ValidationContextType | undefined>(
    undefined,
);

export const ValidationProvider: React.FC<{ children: React.ReactNode }> = ({
    children,
}) => {
    const [validationResults, setValidationResults] = useState<
        ValidationResult[]
    >([]);
    const [currentEmailIndex, setCurrentEmailIndex] = useState(0);

    const nextEmail = () => {
        if (currentEmailIndex < validationResults.length - 1) {
            setCurrentEmailIndex(currentEmailIndex + 1);
        }
    };

    const prevEmail = () => {
        if (currentEmailIndex > 0) {
            setCurrentEmailIndex(currentEmailIndex - 1);
        }
    };

    const getCurrentEmail = (): ValidationResult | null => {
        return validationResults[currentEmailIndex] || null;
    };

    const clearResults = () => {
        setValidationResults([]);
        setCurrentEmailIndex(0);
    };

    const value: ValidationContextType = {
        validationResults,
        currentEmailIndex,
        setValidationResults,
        setCurrentEmailIndex,
        nextEmail,
        prevEmail,
        getCurrentEmail,
        clearResults,
    };

    return (
        <ValidationContext.Provider value={value}>
            {children}
        </ValidationContext.Provider>
    );
};

export const useValidation = (): ValidationContextType => {
    const context = useContext(ValidationContext);
    if (!context) {
        throw new Error(
            'useValidation must be used within a ValidationProvider',
        );
    }
    return context;
};
